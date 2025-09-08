let transactions = []; // All transactions will be stored here
  let settings = {};   
/*
  LedgerMate single-file app skeleton.
  Implements: IndexedDB storage, charts, transactions CRUD, budgets, reminders, full export/import (JSON + CSV),
  set data folder via File System Access API, auto-backup, configurable dropdowns, basic notifications UI,
  placeholders/hooks for OCR/Voice/AI/Cloud/Encryption. Keep minimal dependencies: Tailwind + Chart.js.
*/

// ----------------------------
// Utilities
// ----------------------------
const fmtINR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);
const nowISO = () => new Date().toISOString().slice(0,10);
const uid = (prefix='id') => prefix + '_' + Math.random().toString(36).slice(2,9);

// CSV parser (robustish)
function parseCSV(text){
  const rows = [];
  let cur = '', inQuotes=false, row=[];
  for (let i=0;i<text.length;i++){
    const ch = text[i];
    if (inQuotes){
      if (ch==='"'){
        if (text[i+1]==='"') { cur+='"'; i++; }
        else { inQuotes=false; }
      } else cur+=ch;
    } else {
      if (ch==='"'){ inQuotes=true; }
      else if (ch===','){ row.push(cur); cur=''; }
      else if (ch==='\n' || ch==='\r'){
        if (cur!=='' || row.length){ row.push(cur); rows.push(row); row=[]; cur=''; }
        // handle \r\n
        if (ch==='\r' && text[i+1]==='\n') i++;
      } else cur+=ch;
    }
  }
  if (cur!=='' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
function arrayToCSV(rows){
  return rows.map(r => r.map(cell => {
    if (cell==null) return '';
    const s = String(cell);
    if (/[,"\n]/.test(s)) return '"'+s.replace(/"/g,'""')+'"';
    return s;
  }).join(',')).join('\n');
}

// IndexedDB wrapper
let db = null;
async function openDB() {
    return new Promise((resolve, reject) => {
        const DB_NAME = "ledgermate_db";
        const DB_VERSION = 5; // bump this when schema changes

        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onerror = (e) => {
            console.error("❌ IndexedDB error:", e.target.error);
            showToast(`❌ DB error: ${e.target.error}`, "error");
            reject(e.target.error);
        };

        req.onsuccess = (e) => {
            db = e.target.result;
           // console.log("✅ IndexedDB connected");
            showToast("✅ IndexedDB connected!", "success");

            // Handle future errors
            db.onerror = (err) => {
                console.error("DB runtime error:", err.target.error);
            };

            resolve(db);
        };

        req.onupgradeneeded = (e) => {
            const d = e.target.result;
            console.log("⚙️ Upgrading DB schema...");
            showToast("⚙️ Upgrading database schema...", "info");

            // Helper: create store if missing
            const ensureStore = (name, options, indexes = []) => {
                let store;
                if (!d.objectStoreNames.contains(name)) {
                    store = d.createObjectStore(name, options);
                    console.log(`🆕 Created store: ${name}`);
                } else {
                    store = e.currentTarget.transaction.objectStore(name);
                }
                indexes.forEach((idx) => {
                    if (!store.indexNames.contains(idx)) {
                        store.createIndex(idx, idx);
                        console.log(`📌 Added index '${idx}' in ${name}`);
                    }
                });
                return store;
            };

            // Stores
            ensureStore("transactions", { keyPath: "id", autoIncrement: true }, ["date", "profile"]);
            ensureStore("budgets", { keyPath: "id", autoIncrement: true }, ["profile"]);
            ensureStore("loans", { keyPath: "id", autoIncrement: true }, ["profile", "dueDate"]);
            ensureStore("reminders", { keyPath: "id", autoIncrement: true }, ["profile", "date"]);
            ensureStore("dropdowns", { keyPath: "id", autoIncrement: true });
            ensureStore("settings", { keyPath: "key" });
            ensureStore("users", { keyPath: "id", autoIncrement: true });
            ensureStore("savings", { keyPath: "id", autoIncrement: true }, ["profile"]);
            ensureStore("investments", { keyPath: "id", autoIncrement: true }, ["profile"]);
            ensureStore("recurringTransactions", { keyPath: "id", autoIncrement: true }, ["profile"]);
            ensureStore("auditLog", { keyPath: "id", autoIncrement: true }, ["profile", "timestamp"]);

            console.log("✅ DB schema upgrade complete");
        };
    });
}

function tx(store, mode='readonly'){
  return db.transaction(store, mode).objectStore(store);
}
async function getAll(storeName){
  return new Promise((res,rej)=>{
    const store = tx(storeName);
    const req = store.getAll();
    req.onsuccess = ()=>res(req.result||[]);
    req.onerror = ()=>rej(req.error);
  });
}
async function put(storeName, obj){
  return new Promise((res,rej)=>{
    const t = db.transaction(storeName,'readwrite');
    const s = t.objectStore(storeName);
    const req = s.put(obj);
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}
async function del(storeName, key){
  return new Promise((res,rej)=>{
    const t = db.transaction(storeName,'readwrite');
    const s = t.objectStore(storeName);
    const req = s.delete(key);
    req.onsuccess = ()=>res();
    req.onerror = ()=>rej(req.error);
  });
}

// ----------------------------
// App State
// ----------------------------
let state = {
  transactions: [],
  budgets: [],
  loans: [],
  reminders: [],
  dropdowns: [],
  settings: {},
  users: [],
  savings: [],
  investments: [],
  dataFolderHandle: null,
};

// Charts
let cashflowChart=null, doughnutChart=null, budgetChart=null;

// ----------------------------
// Init
// ----------------------------
async function init(){
  await openDB();
  await seedDefaults();
  await loadAllFromDB();
  bindUI();
  renderAll();
  tryAutoLoadFolder();
  checkAllNotifications();  
  setInterval(checkAllNotifications, 60 * 60 * 1000);// Repeat every hour
  //processRecurringTransactions();
  setInterval(processRecurringTransactions, 60 * 60 * 1000); // check every hour

}

async function seedDefaults(){
  // ensure dropdowns exist
  const ds = await getAll('dropdowns');
  if (ds.length===0){
    const defaultDropdowns = {
      id:'main',
      accounts:['Cash','Bank'],
      categories:['Food','Transport','Bills','Shopping','Salary','Other'],
      persons:[],
      reminderTypes:['Bill','Loan','Other'],
      recurrences:['None','Daily','Weekly','Monthly','Yearly'] 
    };
    await put('dropdowns', defaultDropdowns);
  }
  // settings defaults
  const s = await tx('settings').get('meta');
  s.onsuccess || 1;
  // put default settings if missing
  const settingsAll = await getAll('settings');
  const hasMeta = settingsAll.find(x=>x.key==='meta');
  if (!hasMeta) await put('settings',{key:'meta', value:{theme:'dark', kpiRange:30}});
}

async function loadAllFromDB(){
  state.transactions = await getAll('transactions');
  state.budgets = await getAll('budgets');
  state.loans = await getAll('loans');
  state.reminders = await getAll('reminders');
  const dd = await getAll('dropdowns'); state.dropdowns = dd.length?dd[0]:{id:'main',accounts:[],categories:[],persons:[],reminderTypes:[],recurrences:[]};
  const settingsAll = await getAll('settings'); state.settings = (settingsAll.find(x=>x.key==='meta')||{value:{}}).value;
  state.users = await getAll('users');
  state.savings = await getAll('savings');
  state.investments = await getAll('investments');
  // restore folder handle if present
  const fh = settingsAll.find(x=>x.key==='dataFolderHandle');
  if (fh) state.dataFolderHandle = fh.value;
}

// ----------------------------
// UI Bindings
// ----------------------------
function bindUI(){
  document.getElementById('btnSetFolder').onclick = setDataFolder;
  document.getElementById('btnFullExport').onclick = fullExport;
  document.getElementById('btnImport').onclick = ()=>document.getElementById('fileImport')?.click();
  document.getElementById('kpiRange').onchange = onKpiRangeChange;
  //document.getElementById('btnQuickAdd').onclick = () => openAddTransactionModal();
  document.getElementById('fabAddTx').onclick = () => openAddTransactionModal();
  //document.getElementById('btnQuickAdd1').onclick = () => openAddTransactionModal();
   
  document.getElementById('searchTx').oninput = refreshRecentList;
  document.getElementById('notifBell').onclick = ()=>toggleNotifPanel();
  //document.getElementById('btnToggleTheme').onclick = toggleTheme;
  // Add handlers for Quick Actions

  //document.getElementById('openTransactions').onclick = showTransactionsModal;
  document.getElementById('openBudgets').onclick = showBudgetsModal;
  document.getElementById('openLoans').onclick = showLoansModal;
  document.getElementById('openGoals').onclick = showGoalsModal;
  document.getElementById('openRemainders').onclick = showRemindersModal;
  document.getElementById('accountFilter').onchange = refreshRecentList;
  document.getElementById('clearData').addEventListener('click', clearAllData);
  // file import input
  const fi = document.createElement('input'); fi.type='file'; fi.accept='.csv,.json'; fi.id='fileImport'; fi.style.display='none';
  fi.onchange = async(e)=>{ const f = e.target.files[0]; if (!f) return; const txt = await f.text(); if (f.name.endsWith('.csv')) await importCSVText(txt); else await fullImportJSONText(txt); }
  document.body.appendChild(fi);
}
 
// --- Modal implementations --- for Quick Actions
function showTransactionsModal() {
  const txs = state.transactions.slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
  const rows = txs.map(t =>
    `<tr>
      <td class="p-1">${t.date}</td>
      <td class="p-1">${t.category}</td>
      <td class="p-1">${t.account}</td>
      <td class="p-1">${t.type==='in'?'+':''}${fmtINR(t.amount)}</td>
      <td class="p-1">${t.note||''}</td>
    </tr>`
  ).join('');
  showSimpleModal('All Transactions', `<table class="w-full text-xs"><tr><th>Date</th><th>Category</th><th>Account</th><th>Amount</th><th>Note</th></tr>${rows||'<tr><td colspan=5>No transactions</td></tr>'}</table>`);
}

function showBudgetsModal() {
  const month = new Date().toISOString().slice(0, 7);

  const rows = state.budgets
    .filter(b => b.month === month)
    .map(b => `
      <div class="flex justify-between items-center  rounded-lg p-3 mb-2 shadow-sm">
        <div>
          <div class="text-sm font-semibold ">${b.category}</div>
          <div class="text-xs text-muted">
            Limit: ${fmtINR(b.limit)} • Alert at ${Math.round((b.alertThreshold || 0.8) * 100)}%
          </div>
        </div>
        <button 
          class="px-3 py-1 rounded-md bg-rose-500 hover:bg-rose-600  text-xs delBudget" 
          data-id="${b.id}">
          🗑️ Delete
        </button>
      </div>
    `).join('');

  // Add form for unused categories
  const unusedCats = state.dropdowns.categories
    .filter(cat => !state.budgets.some(b => b.category === cat && b.month === month));

  let addForm = '';
  if (unusedCats.length) {
    addForm = `
      <form id="addBudgetForm" class="mt-4 space-y-2">
        <div class="flex gap-2">
          <select id="budgetCat" class="flex-1 p-2 rounded-lg glass border  ">
            ${unusedCats.map(c => `<option>${c}</option>`).join('')}
          </select>
          <input 
            id="budgetLimit" type="number" min="1" 
            placeholder="Limit ₹" 
            class="flex-1 p-2 rounded-lg glass border  " 
            required 
          />
        </div>
        <button 
          class="w-full py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 transition" 
          type="submit">
          ➕ Add Budget
        </button>
      </form>
    `;
  }

  showSimpleModal(
    '📊 Budgets (This Month)',
    `
      <div class="space-y-3">
        ${rows || `<div class="text-center text-muted text-sm">No budgets set</div>`}
        ${addForm}
      </div>
    `
  );

  // Add new budget handler
  if (addForm) {
    document.getElementById('addBudgetForm').onsubmit = async (e) => {
      e.preventDefault();
      const cat = document.getElementById('budgetCat').value;
      const limit = document.getElementById('budgetLimit').value;
      try {
        await setBudgetForMonth(cat, month, limit);
        showBudgetsModal();
        showToast('Budget added!', 'success');
      } catch {
        showToast('Failed to add budget', 'error');
      }
    };
  }

  // Delete budget handler
  document.querySelectorAll('.delBudget').forEach(btn => 
    btn.onclick = async () => {
      const id = btn.dataset.id;
       if (!confirm('Are you sure you want to delete this budget?')) return;
      try {
        await del('budgets', id);
        state.budgets = state.budgets.filter(b => b.id !== id);
        showBudgetsModal();
        autoBackup();
        showToast('Budget deleted!', 'success');
      } catch {
        showToast('Failed to delete budget', 'error');
      }
    }
  );
}
// ---------- Recurring / series helpers ----------

// Create a canonical key to prevent duplicates
function loanKey(l) {
  return `${l.person}__${l.type}__${l.dueDate}__${Number(l.amount)}__${(l.category||'Loan')}__${l.recurrence||''}`;
}

// Roll forward a date by recurrence
function advanceDate(dateStr, recurrence) {
  const d = new Date(dateStr);
  switch ((recurrence || '').toLowerCase()) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break;
    default: return null;
  }
  return d.toISOString().split('T')[0];
}

// Ensure array exists in dropdowns
function ensureDropdownKey(key) {
  state.dropdowns = state.dropdowns || {};
  if (!Array.isArray(state.dropdowns[key])) state.dropdowns[key] = [];
}

// ---------- Transaction sync (uses loan.category) ----------
async function handleLoanTransaction(loan, shouldAdd) {
  // canonical note to find transaction
  const transactionNote = `Loan ${loan.type === 'given' ? 'from' : 'to'} ${loan.person}${loan.note ? `: ${loan.note}` : ''}`;

  if (shouldAdd) {
    const transaction = {
      id: uid('tx'),
      date: nowISO1().split('T')[0],
      type: loan.type === 'given' ? 'in' : 'out', // collected -> money in if they give you money, etc.
      amount: loan.amount,
      account: loan.loanAccount ,
      category: loan.category || 'Loan',
      recurrence: '',
      note: transactionNote,
      createdAt: nowISO1()
    };
    await put('transactions', transaction);
    state.transactions.push(transaction);
  } else {
    const idx = state.transactions.findIndex(t =>
      t.note === transactionNote &&
      Number(t.amount) === Number(loan.amount) &&
      (t.category || 'Loan') === (loan.category || 'Loan')
    );
    if (idx !== -1) {
      const id = state.transactions[idx].id;
      await del('transactions', id);
      state.transactions.splice(idx, 1);
    }
  }

  refreshRecentList();
  renderAll();
}

async function handleLoanTransaction_V1(loan, shouldAdd) {
  // canonical note to find transaction
  const transactionNote = `Loan ${loan.type === 'given' ? 'from' : 'to'} ${loan.person}${loan.note ? `: ${loan.note}` : ''}`;

  if (shouldAdd) {
    const transaction = {
      id: uid('tx'),
      date: nowISO1().split('T')[0],
      type: loan.type === 'given' ? 'out' : 'in',  
      amount: loan.amount,
      account: loan.loanAccount ,
      category: loan.category || 'Loan',
      recurrence: '',
      note: transactionNote,
      createdAt: nowISO1()
    };
    await put('transactions', transaction);
    state.transactions.push(transaction);
  } else {
    const idx = state.transactions.findIndex(t =>
      t.note === transactionNote &&
      Number(t.amount) === Number(loan.amount) &&
      (t.category || 'Loan') === (loan.category || 'Loan')
    );
    if (idx !== -1) {
      const id = state.transactions[idx].id;
      await del('transactions', id);
      state.transactions.splice(idx, 1);
    }
  } 
  refreshRecentList();
  renderAll();
}

// ---------- Reminder helper (remove loan reminders matching loan) ----------
async function removeLoanReminders({ person, dueDate, amount }) {
  state.reminders = state.reminders || [];
  const toRemove = state.reminders.filter(r =>
    r.title && r.title.includes(person) && r.dueDate === dueDate &&
    (r.note || '').includes(fmtINR(amount))
  );
  for (const r of toRemove) {
    await del('reminders', r.id);
    state.reminders = state.reminders.filter(x => x.id !== r.id);
  }
}

// ---------- Recurring/backfill generator ----------
async function handleRecurringLoans() {
  // Walk through loans that have recurrence and ensure missing instances exist
  const today = new Date().toISOString().split('T')[0];
  // Use a snapshot array because we'll push to state.loans while iterating
  const loansSnapshot = (state.loans || []).slice();

  for (const baseLoan of loansSnapshot) {
    if (!baseLoan.recurrence || baseLoan.recurrence === 'None' || !baseLoan.dueDate) continue;

    // ensure seriesId exists on the base loan
    if (!baseLoan.seriesId) {
      baseLoan.seriesId = uid('series');
      await put('loans', baseLoan);
      // update state.loans item (baseLoan is reference so it's updated)
    }

    // Start from the loan's dueDate and advance until >= today
    let lastDue = new Date(baseLoan.dueDate);
    // If lastDue is in the future, we still want to ensure there are not missing earlier ones only when needed.
    // We'll generate successive instances up to and including today (backfill), and one future instance optionally.
    // Loop limit to prevent infinite loop
    let loopGuard = 0;
    while (new Date(lastDue.toISOString().split('T')[0]) <= new Date(today) && loopGuard < 3650) {
      loopGuard++;
      // compute next occurrence
      const nextDateStr = advanceDate(lastDue.toISOString().split('T')[0], baseLoan.recurrence);
      if (!nextDateStr) break;
      // Build candidate loan for nextDate
      const candidateKey = `${baseLoan.person}__${baseLoan.type}__${nextDateStr}__${Number(baseLoan.amount)}__${(baseLoan.category||'Loan')}__${baseLoan.recurrence||''}`;
      const exists = (state.loans || []).some(l => loanKey(l) === candidateKey);
      if (!exists) {
        const newLoan = {
          id: uid('loan'),
          seriesId: baseLoan.seriesId,
          person: baseLoan.person,
          type: baseLoan.type,
          amount: baseLoan.amount,
          category: baseLoan.category || 'Loan',
          dueDate: nextDateStr,
          note: baseLoan.note || '',
          recurrence: baseLoan.recurrence,
          collected: false,
          createdAt: nowISO1()
        };
        await put('loans', newLoan);
        state.loans.push(newLoan);

        // If original series/items had a reminder for each instance, create one too
        const hasReminder = state.reminders && state.reminders.some(r =>
          r.title && r.title.includes(baseLoan.person) && r.dueDate === baseLoan.dueDate
        );
        if (hasReminder) {
          const rem = {
            id: uid('rem'),
            title: `Loan due: ${newLoan.person}`,
            dueDate: newLoan.dueDate,
            note: `Loan of ${fmtINR(newLoan.amount)} due for ${newLoan.person}`,
            completed: false
          };
          await put('reminders', rem);
          state.reminders.push(rem);
        }
      }
      // advance lastDue to nextDate for next loop iteration
      lastDue = new Date(nextDateStr);
      // continue until we've caught up with today
    }
    // optionally, ensure one future instance exists (next after today)
    const afterToday = advanceDate(today, baseLoan.recurrence);
    if (afterToday) {
      const futureKey = `${baseLoan.person}__${baseLoan.type}__${afterToday}__${Number(baseLoan.amount)}__${(baseLoan.category||'Loan')}__${baseLoan.recurrence||''}`;
      const futureExists = (state.loans || []).some(l => loanKey(l) === futureKey);
      if (!futureExists) {
        const futureLoan = {
          id: uid('loan'),
          seriesId: baseLoan.seriesId,
          person: baseLoan.person,
          type: baseLoan.type,
          amount: baseLoan.amount,
          category: baseLoan.category || 'Loan',
          dueDate: afterToday,
          note: baseLoan.note || '',
          recurrence: baseLoan.recurrence,
          collected: false,
          createdAt: nowISO1()
        };
        await put('loans', futureLoan);
        state.loans.push(futureLoan);
      }
    }
  }
  // After modifications, refresh UI/state upstream
  autoBackup();
  renderNotifications();
}

// ---------- Edit-apply helper: scope = 'this' | 'future' | 'all' ----------
async function applyLoanEdit(loan, updates, scope = 'this') {
  if (scope === 'this' || !loan.seriesId) {
    Object.assign(loan, updates);
    await put('loans', loan);
  } else if (scope === 'future') {
    const baseDate = new Date(loan.dueDate);
    const futureLoans = state.loans.filter(l => l.seriesId === loan.seriesId && new Date(l.dueDate) >= baseDate);
    for (const l of futureLoans) {
      Object.assign(l, updates);
      await put('loans', l);
    }
  } else if (scope === 'all') {
    const allLoans = state.loans.filter(l => l.seriesId === loan.seriesId);
    for (const l of allLoans) {
      Object.assign(l, updates);
      await put('loans', l);
    }
  }

  // If collected state changed, ensure transaction sync
  if (updates.hasOwnProperty('collected')) {
    // For the scope above, re-sync transactions per loan
    const affected = scope === 'this' || !loan.seriesId ? [loan] : state.loans.filter(l => l.seriesId === loan.seriesId && (scope === 'all' || new Date(l.dueDate) >= new Date(loan.dueDate)));
    for (const a of affected) {
      // remove duplicates then add if collected
      if (a.collected) {
        await handleLoanTransaction(a, true);
      } else {
        await handleLoanTransaction(a, false);
      }
    }
  }

  await autoBackup();
  showToast('Loan(s) updated!', 'success');
  showLoansModal();
}
// ---------- Full UI: showLoansModal (Add/Edit/Delete/Mark + recurrence display) ----------
function showLoansModal(prefill = {}) {
  // ensure dropdown keys exist
  ensureDropdownKey('persons');
  ensureDropdownKey('categories');
  ensureDropdownKey('recurrences');
  ensureDropdownKey('loanCategories'); // optional extra

  // Build grouped UI (reuse earlier logic)
 /* const grouped = {};
  (state.loans || []).forEach(l => {
    const key = `${l.person}__${l.type}`;
    if (!grouped[key]) grouped[key] = { person: l.person, type: l.type, loans: [], total: 0 };
    grouped[key].loans.push(l);
    grouped[key].total += (l.type === 'given' ? -1 : 1) * Number(l.amount);
  });*/
  const grouped = {};
(state.loans || []).forEach(l => {
  const key = `${l.person}__${l.type}`;
  if (!grouped[key]) {
    grouped[key] = { 
      person: l.person, 
      type: l.type, 
      loans: [], 
      total: 0,
      pendingTotal: 0,   // new
      collectedTotal: 0  // new
    };
  }
  grouped[key].loans.push(l);

  const signedAmount = (l.type === 'given' ? -1 : 1) * Number(l.amount);

  // overall total
  grouped[key].total += signedAmount;

  // separate pending vs collected
  if (l.collected) {
    grouped[key].collectedTotal += signedAmount;
  } else {
    grouped[key].pendingTotal += signedAmount;
  }
});


  let totalGiven = 0, totalTaken = 0, totalOutstanding = 0;
  Object.values(grouped).forEach(group => {
    if (group.type === 'given') {
      totalGiven += Math.abs(group.total);
      totalOutstanding += group.total;
    } else {
      totalTaken += Math.abs(group.total);
      totalOutstanding += group.total;
    }
  });

  const sortedGroups = Object.values(grouped).sort((a, b) => {
    const aPending = a.loans.filter(l => !l.collected);
    const bPending = b.loans.filter(l => !l.collected);
    const aDate = aPending.length ? new Date(aPending[0].dueDate || '2100-01-01') : new Date('2100-01-01');
    const bDate = bPending.length ? new Date(bPending[0].dueDate || '2100-01-01') : new Date('2100-01-01');
    if (aPending.length && !bPending.length) return -1;
    if (!aPending.length && bPending.length) return 1;
    return aDate - bDate;
  });

  // Build rows HTML
  const rows = sortedGroups.map(group => {
    const typeLabel = group.type === 'given' ? '💸 Given' : '📥 Taken';
    const totalColor = group.type === 'given' ? 'text-rose-400' : 'text-emerald-400';
    const totalSign = group.type === 'given' ? '-' : '+';
    const loansHtml = group.loans
      .slice()
      .sort((a, b) => {
        if (a.collected !== b.collected) return a.collected ? 1 : -1;
        return new Date(a.dueDate || '2100-01-01') - new Date(b.dueDate || '2100-01-01');
      })
      .map(l => {
        const collectedBtnClass = l.collected ? 'bg-emerald-500 hover:bg-emerald-600 ' : 'bg-yellow-500 hover:bg-yellow-600 text-black';
        const collectedBtnText = l.collected ? '✅' : '⏳';
        const loanAmountColor = l.type === 'given' ? 'text-rose-400' : 'text-emerald-400';
        const loanSign = l.type === 'given' ? '-' : '+';
        const recurrenceLabel = l.recurrence && l.recurrence !== 'None' ? `🔁 ${l.recurrence}` : '';
        const isOverdue = !l.collected && l.dueDate && new Date(l.dueDate) < new Date();
        const overdueClass = isOverdue ? 'border alert-red' : '';
        const lastDone = (l.completedLog && l.completedLog.length) ? `Last done: ${l.completedLog[l.completedLog.length-1].time}` : '';
        return `
          <div class="flex justify-between items-center glass/60 rounded p-2 shadow-sm ${overdueClass}">
            <div>
              <div class="text-xs text-muted">
                Due: ${l.dueDate || 'N/A'} ${l.collected ? '• Collected: ' + (l.collectedAt ? new Date(l.collectedAt).toLocaleString() : '') : ''} ${l.createdAt ? '• ' + new Date(l.createdAt).toLocaleString() : ''}
                ${recurrenceLabel}
              </div>
              <div class="text-sm ${loanAmountColor}">${loanSign}${fmtINR(l.amount)} <span class="text-xs text-muted">${l.note || ''}</span></div>
              ${l.category ? `<div class="text-xs text-slate-500">🏷️ ${l.category} ${lastDone ? ' • ' + lastDone : ''}</div>` : ''}
            </div>
            <div class="flex gap-1">
              <button class="editLoan px-2 py-1 rounded bg-sky-500 hover:bg-sky-600  text-xs" data-id="${l.id}">✏️</button>
              <button class="markCollected px-2 py-1 rounded ${collectedBtnClass} text-xs" data-id="${l.id}">${collectedBtnText}</button>
              <button class="delLoan px-2 py-1 rounded bg-rose-500 hover:bg-rose-600  text-xs" data-id="${l.id}">🗑️</button>
            </div>
          </div>
        `;
      }).join('');
   return `
  <div class="mb-3 p-3 rounded-xl  glass   shadow">
    <div class="flex justify-between items-center mb-2">
      <div>
        <span class="font-semibold ">${group.person || 'Unknown'}</span>
		<div class="text-xs text-muted font-semibold ">P: ${fmtINR(Math.abs(group.pendingTotal))} | C: ${fmtINR(Math.abs(group.collectedTotal))}
		  <span class="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-700 ">${typeLabel}</span>
        </div>
        
        
      </div>
      <button 
        class="delLoanGroup px-2 py-1 rounded bg-rose-500 hover:bg-rose-600  text-xs" 
        data-person="${group.person}" 
        data-type="${group.type}">
        🗑️
      </button>
    </div>
    <div class="space-y-2">${loansHtml}</div>
  </div>
`; 
  }).join('') || `<div class="text-center text-muted">No loans added</div>`;

  // Summary + Add form (categories/recurrences from dropdown manager)
  const summaryHtml = `
    <div class="mb-4 p-3 rounded-xl  glass shadow">
      <h3 class="text-md font-semibold  mb-2">💰 Loan Summary</h3>
      <div class="flex justify-between"><span class="text-sm ">Total Given:</span><span class="font-bold text-rose-400">-${fmtINR(totalGiven)}</span></div>
      <div class="flex justify-between"><span class="text-sm ">Total Taken:</span><span class="font-bold text-emerald-400">+${fmtINR(totalTaken)}</span></div>
      <div class="flex justify-between border-t  pt-2"><span class="text-sm ${totalOutstanding>=0?'text-emerald-300':'text-rose-300'}">${totalOutstanding>=0?'Net Owed to You:':'Net You Owe:'}</span><span class="text-lg font-bold ${totalOutstanding>=0?'text-emerald-400':'text-rose-400'}">${totalOutstanding>=0?'+':''}${fmtINR(totalOutstanding)}</span></div>
    </div>`;

  const persons = state.dropdowns.persons || [];
  const categories = state.dropdowns.categories || [];
  const loanAccount = state.dropdowns.accounts || [];
  const recurrences = state.dropdowns.recurrences && state.dropdowns.recurrences.length ? state.dropdowns.recurrences : ['None','daily','weekly','monthly','yearly'];

  const addForm = `
    <form id="addLoanForm" class="mt-4 space-y-2">
      <select id="loanType" class="w-full p-2 rounded glass border  ">
        <option value="given">💸 Given</option>
        <option value="taken">📥 Taken</option>
      </select>
      <div id="loanPersonCheckboxes" class="space-y-1 p-2 rounded glass border  max-h-40 overflow-y-auto">
        ${persons.map(p=>`<label class="flex items-center"><input type="checkbox" value="${p}" class="personCheckbox"><span class="ml-2 text-sm ">${p}</span></label>`).join('')}
      </div>
	   <select id="loanAccount" class="w-full p-2 rounded glass border  ">
        ${loanAccount.map(a=>`<option value="${(a||'').toString()}">${a}</option>`).join('')}
      </select>
      <input id="loanAmount" type="number" min="1" placeholder="Amount ₹" class="w-full p-2 rounded glass border  " required />
      <input id="loanDueDate" type="date" class="w-full p-2 rounded glass border  " required />
      <input id="loanNote" placeholder="Note" class="w-full p-2 rounded glass border  " />
      <select id="loanCategory" class="w-full p-2 rounded glass border  ">
        ${categories.map(c=>`<option value="${c}">${c}</option>`).join('')}
      </select>
      <select id="loanRecurrence" class="w-full p-2 rounded glass border  ">
        ${recurrences.map(r=>`<option value="${(r||'').toString().toLowerCase()}">${r}</option>`).join('')}
      </select>
      <label class="flex items-center p-2 rounded glass border ">
        <input type="checkbox" id="addReminder" class="mr-2" />
        <span class="text-sm ">Add reminder notification</span>
      </label>
      <button class="w-full py-2 rounded bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400" type="submit">➕ Add Loan</button>
    </form>`;

  showSimpleModal('💰 Loans', `${summaryHtml}<div id="loanList" class="space-y-3">${rows}${addForm}</div>`);

  // Attach Add handler
  document.getElementById('addLoanForm').onsubmit = async (e) => {
    e.preventDefault();
    const type = document.getElementById('loanType').value;
    const selectedPersons = Array.from(document.querySelectorAll('#loanPersonCheckboxes .personCheckbox:checked')).map(cb => cb.value);
    const amount = Number(document.getElementById('loanAmount').value);
    const dueDate = document.getElementById('loanDueDate').value;
    const note = document.getElementById('loanNote').value.trim();
    const category = document.getElementById('loanCategory').value || 'Loan';
	const loanAccount = document.getElementById('loanAccount').value || 'Cash';
    const recurrence = document.getElementById('loanRecurrence').value || 'None';
    const addReminder = document.getElementById('addReminder').checked;
	

    if (!selectedPersons.length || !amount || !dueDate) { showToast('Select person(s), amount and due date','error'); return; }

    const splitAmount = Number((amount / selectedPersons.length).toFixed(2));

    for (const person of selectedPersons) {
      const candidate = {
        person, type, amount: splitAmount, dueDate, note, category, recurrence,loanAccount
      };
      const key = loanKey(candidate);
      const exists = (state.loans || []).some(l => loanKey(l) === key);
      if (exists) continue;

      const newLoan = {
        id: uid('loan'),
        seriesId: recurrence && recurrence !== 'None' ? uid('series') : null,
        ...candidate,
        collected: false,
        createdAt: nowISO1(),
        completedLog: []
      };
      await put('loans', newLoan);
      state.loans.push(newLoan);
	 await handleLoanTransaction_V1(newLoan, true);
      if (addReminder) {
        const rem = { id: uid('rem'), title: `Loan due: ${person}`, dueDate, note: `Loan of ${fmtINR(splitAmount)} due for ${person}`, recurrence, completed: false, completedLog: []};
        await put('reminders', rem);
        state.reminders.push(rem);
      }
    }

    // Generate missing recurring instances & one future instance
    await handleRecurringLoans();

    autoBackup();
    showToast('Loan(s) added!','success');
    showLoansModal();
  };

  // Delegated handlers: delete / mark collected / edit
  // Because showSimpleModal put content into DOM, query current modal
  document.getElementById('loanList').onclick = async (e) => {
   const btn = e.target.closest('button'); // ✅ ensure it's the button
  if (!btn) return;
  const id = btn.dataset.id;
  const loan = id ? state.loans.find(l => String(l.id) === String(id)) : null;

    // Delete
    if (btn.classList.contains('delLoan')) {
      if (!confirm('Are you sure you want to delete this loan?')) return;
      const loan = state.loans.find(l => l.id === id);
      await del('loans', id);
      state.loans = state.loans.filter(l => l.id !== id);

      // remove related reminder(s)
      state.reminders = state.reminders.filter(r => !(r.title && r.title.includes(loan.person) && r.dueDate === loan.dueDate));
      // persist reminders
      for (const r of state.reminders) await put('reminders', r);

      // remove transaction if collected
      //if (loan && loan.collected) 
		  await handleLoanTransaction(loan, false);

      autoBackup();
      showToast('Loan deleted!', 'success');
      showLoansModal();
      return;
    }

    // Mark collected toggle
    if (btn.classList.contains('markCollected')) {
      const loan = state.loans.find(l => l.id === id);
      if (!loan) return;
      const wasCollected = loan.collected;
      loan.collected = !loan.collected;
      loan.collectedAt = loan.collected ? nowISO1() : null;
      await put('loans', loan);
      if (loan.collected && !wasCollected) {
        await handleLoanTransaction(loan, true);
      } else if (!loan.collected && wasCollected) {
        await handleLoanTransaction(loan, false);
      }
      autoBackup();
      renderNotifications();
      showToast(loan.collected ? 'Marked as collected ✅' : 'Marked as pending ⏳', 'info');
      showLoansModal();
      return;
    }

    // Edit loan
    if (btn.classList.contains('editLoan')) {
      const loan = state.loans.find(l => l.id === id);
      if (!loan) return;
      const persons = state.dropdowns.persons || [];
      const categories = state.dropdowns.categories || [];
	  const loanAccounts = state.dropdowns.accounts || [];
      const recurrences = state.dropdowns.recurrences && state.dropdowns.recurrences.length ? state.dropdowns.recurrences : ['None','daily','weekly','monthly','yearly'];

      const editHtml = `
        <form id="editLoanForm" class="space-y-2">
          <select id="editLoanType" class="w-full p-2 rounded glass border  ">
            <option value="given" ${loan.type==='given'?'selected':''}>💸 Given</option>
            <option value="taken" ${loan.type==='taken'?'selected':''}>📥 Taken</option>
          </select>
          <select id="editLoanPerson" class="w-full p-2 rounded glass border  ">
            ${persons.map(p=>`<option value="${p}" ${loan.person===p?'selected':''}>${p}</option>`).join('')}
          </select>
		   <select id="editloanAccount" class="w-full p-2 rounded glass border  ">
        ${loanAccounts.map(a=>`<option value="${a}" ${loan.loanAccount===a?'selected':''}>${a}</option>`).join('')}
      </select>
          <input id="editLoanAmount" type="number" value="${loan.amount}" class="w-full p-2 rounded glass border  " />
          <input id="editLoanDueDate" type="date" value="${loan.dueDate}" class="w-full p-2 rounded glass border  " />
          <input id="editLoanNote" value="${loan.note||''}" class="w-full p-2 rounded glass border  " />
          <select id="editLoanCategory" class="w-full p-2 rounded glass border  ">
            ${categories.map(c=>`<option value="${c}" ${loan.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
          <select id="editLoanRecurrence" class="w-full p-2 rounded glass border  ">
            ${recurrences.map(r=>`<option value="${(r||'').toString().toLowerCase()}" ${loan.recurrence=== (r||'').toString().toLowerCase() ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
          ${loan.recurrence && loan.recurrence !== 'None' ? `
            <select id="editScope" class="w-full p-2 rounded glass border  ">
              <option value="this">Only This Loan</option>
              <option value="future">This and Future Loans</option>
              <option value="all">All Loans in Series</option>
            </select>
          ` : ''}
          <label class="flex items-center space-x-2">
            <input type="checkbox" id="editLoanCollected" ${loan.collected ? 'checked' : ''} />
            <span class="">Collected</span>
          </label>
          <button class="w-full py-2 rounded bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400" type="submit">💾 Save</button>
        </form>
      `;

      showSimpleModal('✏️ Edit Loan', editHtml);

      document.getElementById('editLoanForm').onsubmit = async (ev) => {
        ev.preventDefault();
        const oldLoanSnapshot = {...loan};
        const updates = {
          type: document.getElementById('editLoanType').value,
          person: document.getElementById('editLoanPerson').value,
          amount: Number(document.getElementById('editLoanAmount').value),
          dueDate: document.getElementById('editLoanDueDate').value,
          note: document.getElementById('editLoanNote').value,
          category: document.getElementById('editLoanCategory').value || 'Loan',
          recurrence: document.getElementById('editLoanRecurrence').value || 'None',
          collected: document.getElementById('editLoanCollected').checked,
		  Modified: nowISO1(),
		  loanAccount : document.getElementById('editloanAccount').value || 'Cash'
        };
        const scope = document.getElementById('editScope') ? document.getElementById('editScope').value : 'this';

        // if recurrence changed and was previously part of a series, create/assign seriesId appropriately
        if (loan.recurrence !== updates.recurrence) {
          if (updates.recurrence && updates.recurrence !== 'None' && !loan.seriesId) loan.seriesId = uid('series');
          if (!updates.recurrence || updates.recurrence === 'None') loan.seriesId = null;
        }

        // If collected changed for this loan only, let applyLoanEdit handle transaction sync
        await applyLoanEdit(loan, updates, scope);

        // If dueDate or amount changed and reminders flagged, update reminders (remove old ones)
        // (We don't force-create reminders here; if user wants reminders they can add them explicitly.)
      };

      return;
    }
    // Group delete
if (btn.classList.contains('delLoanGroup')) {
  const person = btn.dataset.person;
  const type = btn.dataset.type;
  if (!confirm(`Delete ALL ${type} loans for ${person}?`)) return;

  const loansToDelete = state.loans.filter(l => l.person === person && l.type === type);
  for (const loan of loansToDelete) {
    await del('loans', loan.id);

    // remove related reminders
    state.reminders = state.reminders.filter(r => !(r.title && r.title.includes(loan.person) && r.dueDate === loan.dueDate));
    await removeLoanReminders(loan);

    // remove transaction if collected
//    if (loan.collected)
		await handleLoanTransaction(loan, false);
  }

  state.loans = state.loans.filter(l => !(l.person === person && l.type === type));

  autoBackup();
  showToast(`All ${type} loans for ${person} deleted!`, 'success');
  showLoansModal();
  return;
}

  };

  // Ensure recurring items exist after modal is shown (backfill)
  handleRecurringLoans().catch(err => console.error('recurring error', err));
}
/*
function showLoansModal(prefill = {}) {
  // Group all loans by person and type
   const grouped = {};
  (state.loans || []).forEach(l => {
    const key = `${l.person}__${l.type}`;
    if (!grouped[key]) grouped[key] = { person: l.person, type: l.type, loans: [], total: 0 };
    grouped[key].loans.push(l);
    
    // FIXED: Given loans are negative (money out), Taken loans are positive (money in)
    grouped[key].total += (l.type === 'given' ? -1 : 1) * Number(l.amount);
  });

  // Calculate overall summary
  let totalGiven = 0;
  let totalTaken = 0;
  let totalOutstanding = 0;
  
  Object.values(grouped).forEach(group => {
    if (group.type === 'given') {
      totalGiven += Math.abs(group.total); // Store as positive for display
      totalOutstanding += group.total; // This will be negative
    } else {
      totalTaken += Math.abs(group.total); // Store as positive for display
      totalOutstanding += group.total; // This will be positive
    }
  });
const sortedGroups = Object.values(grouped).sort((a, b) => {
  // Find earliest pending due date in each group
  const aPending = a.loans.filter(l => !l.collected);
  const bPending = b.loans.filter(l => !l.collected);

  const aDate = aPending.length ? new Date(aPending[0].dueDate || '2100-01-01') : new Date('2100-01-01');
  const bDate = bPending.length ? new Date(bPending[0].dueDate || '2100-01-01') : new Date('2100-01-01');

  // Groups with pending loans come first
  if (aPending.length && !bPending.length) return -1;
  if (!aPending.length && bPending.length) return 1;

  // If both have pending → compare earliest due date
  return aDate - bDate;
});

  // Build UI for each group
 // const rows = Object.values(grouped).map(group => {
    const rows = sortedGroups.map(group => {
    const typeLabel = group.type === 'given' ? '💸 Given' : '📥 Taken';
    
    // FIXED: Given loans (negative) in red, Taken loans (positive) in green
    const totalColor = group.type === 'given' ? 'text-rose-400' : 'text-emerald-400';
    const totalSign = group.type === 'given' ? '-' : '+';

    return `
      <div class="mb-3 p-3 rounded-xl glass/70 shadow">
        <div class="flex justify-between items-center mb-2">
          <div>
            <span class="font-semibold ">${group.person || 'Unknown'}</span>
            <span class="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-700 ">${typeLabel}</span>
          </div>
          <div class="text-lg font-bold ${totalColor}">
            ${totalSign}${fmtINR(Math.abs(group.total))}
          </div>
        </div>
        <div class="space-y-2">
          ${group.loans.sort((a, b) => {
      // 1️⃣ Pending first
      if (a.collected !== b.collected) return a.collected ? 1 : -1;
      // 2️⃣ Earliest due date first
      return new Date(a.dueDate || '2100-01-01') - new Date(b.dueDate || '2100-01-01');
    }).map(l => {
            const collectedBtnClass = l.collected
              ? 'bg-emerald-500 hover:bg-emerald-600 '
              : 'bg-yellow-500 hover:bg-yellow-600 text-black';
            const collectedBtnText = l.collected ? '✅' : '⏳';
            
            // FIXED: Individual loan amounts - given in red, taken in green
            const loanAmountColor = l.type === 'given' ? 'text-rose-400' : 'text-emerald-400';
            const loanSign = l.type === 'given' ? '-' : '+';
            const today = new Date();
  const isOverdue = !l.collected && l.dueDate && new Date(l.dueDate) < today;
  const overdueClass = isOverdue ? 'border border-rose-500 bg-rose-900/30' : '';
            return `
              <div class="flex justify-between items-center glass/60 rounded p-2 shadow-sm ${overdueClass}">
                <div>
                  <div class="text-xs text-muted">Due: ${l.dueDate || 'N/A'} ${l.collected ? '✅' + (l.collectedAt ? new Date(l.collectedAt).toLocaleString() : '') : ''} ${l.createdAt ? 'Added: ' + new Date(l.createdAt).toLocaleString() : ''}</div>
                  <div class="text-sm ${loanAmountColor}">${loanSign}${fmtINR(l.amount)} <span class="text-xs text-muted">${l.note || ''}</span></div>
                </div>
                <div class="flex gap-1">
                  <button class="editLoan px-2 py-1 rounded bg-sky-500 hover:bg-sky-600  text-xs" data-id="${l.id}">✏️</button>
                  <button class="markCollected px-2 py-1 rounded ${collectedBtnClass} text-xs" data-id="${l.id}">${collectedBtnText}</button>
                  <button class="delLoan px-2 py-1 rounded bg-rose-500 hover:bg-rose-600  text-xs" data-id="${l.id}">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('') || `<div class="text-center text-muted">No loans added</div>`;

  // Add summary section (more compact)
  const summaryHtml = `
    <div class="mb-4 p-3 rounded-xl glass/70 shadow">
      <h3 class="text-md font-semibold  mb-2">💰 Loan Summary</h3>
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm ">Total Given:</span>
        <span class="text-md font-bold text-rose-400">-${fmtINR(totalGiven)}</span>
      </div>
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm ">Total Taken:</span>
        <span class="text-md font-bold text-emerald-400">+${fmtINR(totalTaken)}</span>
      </div>
      <div class="flex justify-between items-center pt-2 border-t ">
        <span class="text-sm ${totalOutstanding >= 0 ? 'text-emerald-300' : 'text-rose-300'}">
          ${totalOutstanding >= 0 ? 'Net Owed to You:' : 'Net You Owe:'}
        </span>
        <span class="text-lg font-bold ${totalOutstanding >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
          ${totalOutstanding >= 0 ? '+' : ''}${fmtINR(totalOutstanding)}
        </span>
      </div>
    </div>
  `;

   // Persons multi-select
  const persons = (state.dropdowns.persons || []); 
  //const personOptions = persons.map(p => `<option value="${p}">${p}</option>`).join('');
  const addForm = `
    <form id="addLoanForm" class="mt-4 space-y-2">
      <select id="loanType" class="w-full p-2 rounded-lg glass border  ">
        <option value="given">💸 Given</option>
        <option value="taken">📥 Taken</option>
      </select>
      <div id="loanPersonCheckboxes" class="space-y-1 p-2 rounded-lg glass border  max-h-40 overflow-y-auto">
  ${persons.map(p => `
    <label class="flex items-center space-x-2">
      <input type="checkbox" value="${p}" class="personCheckbox">
      <span class="text-sm ">${p}</span>
    </label>
  `).join('')}
</div>
<p class="text-xs text-muted">Tap to select one or more people</p>

      <input id="loanAmount" type="number" min="1" placeholder="Amount ₹" class="w-full p-2 rounded-lg glass border  " required />
      <input id="loanDueDate" type="date" class="w-full p-2 rounded-lg glass border  " required />
      <input id="loanNote" placeholder="Note" class="w-full p-2 rounded-lg glass border  " />
      <select id="loanCategory" class="w-full p-2 rounded-lg glass border  ">
        ${state.dropdowns.categories.map(c => `<option ${c === prefill.category ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <select id="loanRecurrence" class="w-full p-2 rounded-lg glass border  ">
        ${state.dropdowns.recurrences.map(r => `<option ${r === prefill.recurrence ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
      <label class="flex items-center space-x-2 p-2 rounded-lg glass border ">
        <input type="checkbox" id="addReminder" class="rounded bg-slate-700 border-slate-600 text-emerald-400 focus:ring-emerald-400"  />
        <span class="text-sm ">Add reminder notification</span>
      </label>
      <button class="w-full py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 transition" type="submit">
        ➕ Add Loan
      </button>
    </form>
  `;

  showSimpleModal('💰 Loans', `${summaryHtml}<div id="loanList" class="space-y-3">${rows}${addForm}</div>`);

  // Helper function to create or remove loan transactions
  const handleLoanTransaction = async (loan, shouldAdd) => {
    const transactionNote = `Loan ${loan.type === 'given' ? 'from' : 'to'} ${loan.person}${loan.note ? `: ${loan.note}` : ''}`;
    
    if (shouldAdd) {
      // Create a transaction for the collected loan
      const transaction = {
        id: uid('tx'),
        date: nowISO().split('T')[0],
        type: loan.type === 'given' ? 'in' : 'out', // Money comes in when given loan is collected
        amount: loan.amount,
        account: state.dropdowns.accounts[0] || 'Bank',
        category: loan.category || 'Loan',
        recurrence: '',
        note: transactionNote,
        createdAt: nowISO1()
      };
      
      await put('transactions', transaction);
      state.transactions.push(transaction);
    } else {
      // Remove transaction if loan is marked as pending
      const transactionIndex = state.transactions.findIndex(t => 
        t.note === transactionNote && 
        t.amount === loan.amount &&
        t.category === loan.category 
      );
      
      if (transactionIndex !== -1) {
        const transactionId = state.transactions[transactionIndex].id;
        await del('transactions', transactionId);
        state.transactions.splice(transactionIndex, 1);
      }
    }
    refreshRecentList();
    renderAll();
  };

  // Add Loan with splitting
  document.getElementById('addLoanForm').onsubmit = async (e) => {
    e.preventDefault();
    const type = document.getElementById('loanType').value;
    //const selectedPersons = Array.from(document.getElementById('loanPerson').selectedOptions).map(o => o.value);
    const selectedPersons = Array.from(document.querySelectorAll('#loanPersonCheckboxes .personCheckbox:checked')).map(cb => cb.value);
    if (!selectedPersons.length) { showToast('Select at least one person', 'error'); return; }
    const amount = Number(document.getElementById('loanAmount').value);
    const dueDate = document.getElementById('loanDueDate').value;
    const note = document.getElementById('loanNote').value.trim();
    const addReminder = document.getElementById('addReminder').checked;
    const category = document.getElementById('loanCategory').value || 'Loan';
    const recurrence = document.getElementById('loanRecurrence').value || 'None';
    if (!selectedPersons.length || !amount || !dueDate) return;

    const splitAmount = amount / selectedPersons.length;

     for (const person of selectedPersons) {
      const loanKey = `${person}_${type}_${dueDate}_${splitAmount}_${category}_${recurrence}`;

      // 🔒 Prevent duplicates
      const exists = (state.loans || []).some(l =>
        `${l.person}_${l.type}_${l.dueDate}_${l.amount}_${l.category || 'Loan'}_${l.recurrence || ''}` === loanKey
      );
      if (exists) continue;

      const loan = {
        id: uid('loan'),
        seriesId: recurrence ? (loan?.seriesId || uid('series')) : null, 
        type,
        person,
        category,
        amount: splitAmount,
        dueDate,
        note,
        collected: false,
        createdAt: nowISO1(),
        recurrence
      };  
      await put('loans', loan);
      state.loans.push(loan);

      // If reminder checked
      if (addReminder) {
        const reminder = {
          id: uid('rem'),
          title: `Loan due: ${person}`,
          dueDate,
          note: `Loan of ${fmtINR(splitAmount)} due for ${person}`,
          completed: false
        };
        await put('reminders', reminder);
        state.reminders.push(reminder);
      }

    }
    handleRecurringLoans();
    showLoansModal();
    autoBackup();
    showToast('Loans added!', 'success');
    renderNotifications();
    refreshRecentList();
    renderAll();
  };
  // Event Delegation for Edit/Delete/Mark
  document.getElementById('loanList').onclick = async (e) => {
    const btn = e.target;
    const id = btn.dataset.id;
    const loan = state.loans.find(l => String(l.id) === String(id));
    if (!loan) return;

    // Delete Loan
    if (btn.classList.contains('delLoan')) {
      if (!confirm('Are you sure you want to delete this loan?')) return;
      await del('loans', id);
      state.loans = state.loans.filter(l => l.id !== id);
      
      // Remove related reminder
      state.reminders = state.reminders.filter(r => !(r.title && r.title.startsWith('Loan due:') && r.dueDate === loan.dueDate && r.title.includes(loan.person)));
      
      // Save updated reminders
      for (const reminder of state.reminders) {
        await put('reminders', reminder);
      }
      
      // Remove related transaction if loan was collected
      if (loan.collected) {
        await handleLoanTransaction(loan, false);
      }
      
      showLoansModal();
      autoBackup();
      showToast('Loan deleted!', 'success');
      renderNotifications();
      //refreshRecentList(); 
    }

    // Mark as Collected/Pending
    if (btn.classList.contains('markCollected')) {
      const wasCollected = loan.collected;
      loan.collected = !loan.collected; // Toggle collected status
      loan.collectedAt = loan.collected ? nowISO1() : null;
      // Add or remove transaction based on collection status
      if (loan.collected && !wasCollected) {
        // Loan marked as collected - add transaction
        await handleLoanTransaction(loan, true);
      } else if (!loan.collected && wasCollected) {
        // Loan marked as pending - remove transaction
        await handleLoanTransaction(loan, false);
      }
      
      await put('loans', loan);
      showLoansModal();
      autoBackup();
      showToast(
        loan.collected ? 'Marked as Collected ✅' : 'Marked as Pending ⏳',
        loan.collected ? 'success' : 'info'
      );
      renderNotifications();
      //refreshRecentList();
      //renderAll();
    }
const persons = state.dropdowns.persons || [];
  const categories = state.dropdowns.categories || [];
  const recurrence = state.dropdowns.recurrences || [];
    // Edit Loan
    if (btn.classList.contains('editLoan')) {
      showSimpleModal('✏️ Edit Loan', `
        <form id="editLoanForm" class="space-y-2">
          <select id="editLoanType" class="w-full p-2 rounded-lg glass border  ">
            <option value="given" ${loan.type === 'given' ? 'selected' : ''}>💸 Given</option>
            <option value="taken" ${loan.type === 'taken' ? 'selected' : ''}>📥 Taken</option>
          </select>
          <select id="editLoanPerson" class="w-full p-2 rounded-lg glass border  ">
            ${persons.map(p => `<option value="${p}" ${p === loan.person ? 'selected' : ''}>${p}</option>`).join('')}
          </select> 
      <select id="editLoanCategory" class="w-full p-2 rounded-lg glass border  ">
        ${categories.map(c => `<option value="${c}" ${c === loan.category ? 'selected' : ''}>${c}</option>`).join('')}
      </select> 
          <input id="editLoanAmount" type="number" value="${loan.amount}" class="w-full p-2 rounded-lg glass border  " />
          <input id="editLoanDueDate" type="date" value="${loan.dueDate}" class="w-full p-2 rounded-lg glass border  " />
          <input id="editLoanNote" value="${loan.note || ''}" class="w-full p-2 rounded-lg glass border  " />
          <select id="editLoanRecurrence" class="w-full p-2 rounded-lg glass border  ">
         ${recurrence.map(d => `<option value="${d}" ${d === loan.recurrence ? 'selected' : ''}>${d}</option>`).join('')}
      </select> 
          ${loan.recurrence ? `
      <select id="editScope" class="w-full p-2 rounded-lg glass border  ">
        <option value="this">Only This Loan</option>
        <option value="future">This and Future Loans</option>
        <option value="all">All Loans in Series</option>
      </select>
    ` : ''} 
         
          <label class="flex items-center space-x-2 p-2 rounded-lg glass border ">
            <input type="checkbox" id="editAddReminder" class="rounded bg-slate-700 border-slate-600 text-emerald-400 focus:ring-emerald-400" />
            <span class="text-sm ">Add/Update reminder notification</span>
          </label>
          <label class="flex items-center space-x-2">
            <input type="checkbox" id="editLoanCollected" ${loan.collected ? 'checked' : ''} />
            <span class="">Collected</span>
          </label>
          <button class="w-full py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400" type="submit">💾 Save</button>
        </form>
      `);

      document.getElementById('editLoanForm').onsubmit = async (e) => {
        e.preventDefault();
        const oldType = loan.type;
        const oldPerson = loan.person;
        const oldAmount = loan.amount;
         const oldDueDate = loan.dueDate;
        const oldCollected = loan.collected;
        const oldNote = loan.note;
        const oldRecurrence = loan.recurrence;
        const category = document.getElementById('editLoanCategory').value || 'Loan';
        // If changing category, just update this loan
        const scope = document.getElementById('editScope') ? document.getElementById('editScope').value : 'this';
        // If changing series, reset seriesId 
        if (document.getElementById('editLoanRecurrence').value !== loan.recurrence) {
          loan.seriesId = document.getElementById('editLoanRecurrence').value ? uid('series') : null;
        }

        const addReminder = document.getElementById('editAddReminder').checked;
        
        loan.type = document.getElementById('editLoanType').value;
        loan.person = document.getElementById('editLoanPerson').value;
        loan.amount = Number(document.getElementById('editLoanAmount').value);
        loan.dueDate = document.getElementById('editLoanDueDate').value;
        loan.note = document.getElementById('editLoanNote').value;
        loan.collected = document.getElementById('editLoanCollected').checked;
        loan.recurrence = document.getElementById('editLoanRecurrence').value || 'None';
        loan.category = category;
        
        // Validate required fields

        if (!loan.person || !loan.amount || !loan.dueDate   || !loan.recurrence|| !loan.category) { showToast('Person, Amount and Due Date are required', 'error'); return; }
        // If changing person, amount, dueDate, type - just update this loan to avoid

        // Update related transaction if loan was collected
        if (oldCollected) {
          // First remove the old transaction
          const oldTransactionNote = `Loan ${oldType === 'given' ? 'from' : 'to'} ${oldPerson}${oldNote ? `: ${oldNote}` : ''}`;
          const transactionIndex = state.transactions.findIndex(t => 
            t.note === oldTransactionNote && 
            t.amount === oldAmount &&
            t.category === 'Loan'
          );
          
          if (transactionIndex !== -1) {
            const transactionId = state.transactions[transactionIndex].id;
            await del('transactions', transactionId);
            state.transactions.splice(transactionIndex, 1);
          }
          
          // Add new transaction if still collected
          if (loan.collected) {
            await handleLoanTransaction(loan, true);
          }
        } else if (loan.collected && !oldCollected) {
          // Loan was marked as collected during edit
          await handleLoanTransaction(loan, true);
        }
        
        await put('loans', loan);
         // Update reminder if due date or amount changed AND reminder checkbox is checked
        if (addReminder && (oldDueDate !== loan.dueDate || oldAmount !== loan.amount || oldPerson !== loan.person)) {
          await removeLoanReminders({ person: oldPerson, dueDate: oldDueDate, amount: oldAmount });
          
          const reminder = {
            id: uid('rem'),
            title: `Loan due: ${loan.person}`,
            dueDate: loan.dueDate,
            note: `Loan of ${fmtINR(loan.amount)} due for ${loan.person}`,
            completed: false
          };
          await put('reminders', reminder);
          state.reminders.push(reminder);
        }
        showLoansModal();
        autoBackup();
        showToast('Loan updated!', 'success');
        //refreshRecentList();
        //renderAll();
      };
    }
  };
} 
*/
/*
 function checkAllNotifications() {
  const today = new Date();
  const notifications = [];

  // Helper: Due soon logic
  const isDueSoon = (dueDate) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  };

  // 🔔 Collect Loan Notifications
  (state.loans || []).forEach((loan) => {
    if (!loan.collected && loan.dueDate && isDueSoon(loan.dueDate)) {
      const msg = `⚠️ Loan ${loan.type === 'given' ? 'to Collect' : 'to Pay'}: ${fmtINR(loan.amount)} ${loan.type === 'given' ? 'from' : 'to'} ${loan.person} (Due: ${loan.dueDate})`;
      notifications.push({ title: 'Loan Due Soon!', message: msg, type: 'error' });
    }
  });

  // 🔔 Collect Reminder Notifications
  (state.reminders || []).forEach((rem) => {
    if (rem.completed === true || !rem.dueDate) return;
    const due = new Date(rem.dueDate);
    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    let notify = false;

    if (rem.recurrence === 'daily') notify = true;
    else if (rem.recurrence === 'weekly' && today.getDay() === due.getDay()) notify = true;
    else if (rem.recurrence === 'monthly' && today.getDate() === due.getDate()) notify = true;
    else if (diffDays <= 3) notify = true;

    if (notify) {
      const msg = `🔔 Reminder: ${rem.title || '(No Title)'} (Due: ${rem.dueDate})`;
      notifications.push({ title: 'Reminder Due Soon!', message: msg, type: 'warning' });
    }
  });

  // 🔥 Process notifications in batches of 2
  function processNotifications() {
    const batch = notifications.splice(0, 2); // Take 2 at a time
    batch.forEach((n) => {
      showToast(n.message, n.type);
      enableNotifications();
      sendBrowserNotification(n.title, n.message);
    });
    if (notifications.length > 0) {
      setTimeout(processNotifications, 3500); // Wait 3.5s before next batch
    }
  }

  if (notifications.length > 0) processNotifications();
}
*/
function checkAllNotifications() {
  const today = new Date();
  const notifications = [];

  // Helper: Due soon logic
  const isDueSoon = (dueDate) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 3; // due within 3 days
  };

  // 🔔 Collect Loan Notifications (Group by person + date)
  const loanGroups = {};
  (state.loans || []).forEach((loan) => {
    if (!loan.collected && loan.dueDate && isDueSoon(loan.dueDate)) {
      const key = `${loan.person}__${loan.type}__${loan.dueDate}`;
      if (!loanGroups[key]) {
        loanGroups[key] = {
          person: loan.person,
          type: loan.type,
          dueDate: loan.dueDate,
          total: 0,
        };
      }
      loanGroups[key].total += Number(loan.amount);
    }
  });

  Object.values(loanGroups).forEach((g) => {
    const msg = `⚠️ Loan ${g.type === 'given' ? 'to Collect' : 'to Pay'}: ${fmtINR(g.total)} ${g.type === 'given' ? 'from' : 'to'} ${g.person} (Due: ${g.dueDate})`;
    notifications.push({ title: 'Loan Due Soon!', message: msg, type: 'error' });
  });

  // 🔔 Collect Reminder Notifications (unchanged)
  /*(state.reminders || []).forEach((rem) => {
    if (rem.completed === true || !rem.dueDate) return;
    const due = new Date(rem.dueDate);
    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    let notify = false;

    if (rem.recurrence === 'daily') notify = true;
    else if (rem.recurrence === 'weekly' && today.getDay() === due.getDay()) notify = true;
    else if (rem.recurrence === 'monthly' && today.getDate() === due.getDate()) notify = true;
    else if (diffDays <= 3) notify = true;

    if (notify) {
      const msg = `🔔 Reminder: ${rem.title || '(No Title)'} (Due: ${rem.dueDate})`;
      notifications.push({ title: 'Reminder Due Soon!', message: msg, type: 'warning' });
    }
  });*/
  function rollForward(rem) {
    let due = new Date(rem.dueDate);
    while (due < today) {
      if (rem.recurrence === 'daily') due.setDate(due.getDate() + 1);
      else if (rem.recurrence === 'weekly') due.setDate(due.getDate() + 7);
      else if (rem.recurrence === 'monthly') due.setMonth(due.getMonth() + 1);
      else break;
    }
    rem.dueDate = due.toISOString().split('T')[0];
    rem.completed = false; // reset for new cycle
    return rem;
  }

  (state.reminders || []).forEach(rem => {
    // roll forward if recurring and date passed
    if (rem.recurrence && rem.dueDate) {
      const oldDue = new Date(rem.dueDate);
      if (oldDue < today) {
        rollForward(rem);
        put('reminders', rem); // save updated date & reset
      }
    }

    if (rem.completed === true || !rem.dueDate) return;

    const due = new Date(rem.dueDate);
    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    let notify = false;

    if (rem.recurrence === 'daily') notify = true;
    else if (rem.recurrence === 'weekly' && today.getDay() === due.getDay()) notify = true;
    else if (rem.recurrence === 'monthly' && today.getDate() === due.getDate()) notify = true;
    else if (diffDays >= 0 && diffDays <= 3) notify = true;

    if (notify) {
      const msg = `🔔 Reminder: ${rem.title || '(No Title)'} (Due: ${rem.dueDate}${rem.dueTime ? ' ' + rem.dueTime : ''})`;
      notifications.push({ title: 'Reminder Due Soon!', message: msg, type: 'warning' });
    }
  });

  // 🔥 Show notifications in batches of 2
  function processNotifications() {
     enableNotifications();
    const batch = notifications.splice(0, 2);
    batch.forEach((n) => {
      showToast(n.message, n.type); 
      sendBrowserNotification(n.title, n.message);
    });
    if (notifications.length > 0) {
      setTimeout(processNotifications, 3500);
    }
  }

  if (notifications.length > 0) processNotifications();
}

//  Helper for browser notifications
function sendBrowserNotification(title, message) {
  if (Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        body: message,
        icon: 'icons/icon-512.png'
      });
    });
  }
}
//  Ask for permission once
function enableNotifications() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        console.log('Notifications enabled.');
      }
    });
  }
}
 

function showGoalsModal() {
  const rows = (state.savings || []).map(g => `
    <div class="flex justify-between items-center  rounded-lg p-3 mb-2 shadow-sm">
      <div>
        <div class="text-sm font-semibold ">${g.name || 'Goal'}</div>
        <div class="text-xs text-muted">Target: ₹${fmtINR(g.target)} | Saved: ₹${fmtINR(g.current)}</div>
      </div>
      <button 
        class="px-3 py-1 rounded-md bg-rose-500 hover:bg-rose-600  text-xs delGoal" 
        data-id="${g.id}">
        🗑️ Delete
      </button>
    </div>
  `).join('');

  const addForm = `
    <form id="addGoalForm" class="mt-4 space-y-2">
      <input id="goalName" placeholder="Goal Name" class="w-full p-2 rounded-lg glass border  " required />
      <input id="goalTarget" type="number" min="1" placeholder="Target ₹" class="w-full p-2 rounded-lg glass border  " required />
      <button class="w-full py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 transition" type="submit">
        ➕ Add Goal
      </button>
    </form>
  `;

  showSimpleModal(
    '🎯 Savings Goals',
    `<div class="space-y-3">${rows || `<div class="text-center text-muted">No goals added</div>`}${addForm}</div>`
  );

  document.getElementById('addGoalForm').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('goalName').value.trim();
    const target = Number(document.getElementById('goalTarget').value);
    if (!name || !target) return;

    if (!(state.savings || []).some(g => g.name === name)) {
      const goal = { id: uid('goal'), name, target, current: 0 };
      await put('savings', goal);
      state.savings.push(goal);
      showGoalsModal();
      autoBackup();
      showToast('Goal added!', 'success');
    } else {
     // alert('Goal already exists!');
      showToast('Goal already exists!', 'error');
    }
  };

  document.querySelectorAll('.delGoal').forEach(btn => btn.onclick = async (e) => {
    const id = btn.dataset.id;
    if (!confirm('Are you sure you want to delete this goal?')) return;
    await del('savings', id);
    state.savings = state.savings.filter(g => g.id !== id);
    showGoalsModal();
    autoBackup();
    showToast('Goal deleted!', 'success');
  });
}
/*
function showRemindersModal() {
  const rows = (state.reminders || []).map(r => `
    <div class="flex justify-between items-center  rounded-lg p-3 mb-2 shadow-sm">
      <div>
        <div class="text-sm font-semibold ">${r.title}</div>
        <div class="text-xs text-muted">
          📅 ${r.dueDate || 'N/A'} ${r.dueTime || ''} • 🔁 ${r.recurrence || 'None'} • 
          ${r.completed ? '✅ Completed' : '⏳ Pending'}
        </div>
      </div>
      <button 
        class="px-3 py-1 rounded-md bg-rose-500 hover:bg-rose-600  text-xs delRem" 
        data-id="${r.id}">
        🗑️ Delete
      </button>
    </div>
  `).join('');

  const addForm = `
    <form id="addReminderForm" class="mt-4 space-y-2">
      <input id="reminderTitle" placeholder="Title" class="w-full p-2 rounded-lg glass border  " required />
      <input id="reminderDate" type="date" class="w-full p-2 rounded-lg glass border  " required />
      <input id="reminderTime" type="time" class="w-full p-2 rounded-lg glass border  " />
      <select id="reminderRecurrence" class="w-full p-2 rounded-lg glass border  ">
        <option value="">None</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
      <button class="w-full py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 transition" type="submit">
        ➕ Add Reminder
      </button>
    </form>
  `;

  showSimpleModal(
    '🔔 Reminders',
    `<div class="space-y-3">${rows || `<div class="text-center text-muted">No reminders</div>`}${addForm}</div>`
  );

  document.getElementById('addReminderForm').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('reminderTitle').value.trim();
    const dueDate = document.getElementById('reminderDate').value;
    const dueTime = document.getElementById('reminderTime').value;
    const recurrence = document.getElementById('reminderRecurrence').value;
    if (!title || !dueDate) return;

    const exists = (state.reminders || []).some(r => r.title === title && r.dueDate === dueDate && r.dueTime === dueTime && r.recurrence === recurrence);
    if (!exists) {
      const reminder = { id: uid('rem'), title, dueDate, dueTime, recurrence, completed: false };
      await put('reminders', reminder);
      state.reminders.push(reminder);
      showRemindersModal();
      autoBackup();
      showToast('Reminder added!', 'success');
      renderNotifications();
    } else {
      showToast('Reminder already exists!', 'error');
    }
  };

  document.querySelectorAll('.delRem').forEach(btn => btn.onclick = async (e) => {
    const id = btn.dataset.id;
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    await del('reminders', id);
    state.reminders = state.reminders.filter(r => r.id !== id);
    showRemindersModal();
    autoBackup();
    showToast('Reminder deleted!', 'success');
    renderNotifications();
  });
}
*/
function showRemindersModal() {
  const rows = (state.reminders || []).map(r => {
    // Format completion log
  const logHtml = (r.completedLog || [])
      .map(l => `<div class="text-xs text-slate-500">${l.time} — ${l.status}</div>`)
      .join('');

    return `
      <div class="flex flex-col  rounded-lg p-3 mb-2 shadow-sm">
        <div class="flex justify-between items-center">
          <div>
            <div class="text-sm font-semibold ">${r.title}</div>
            <div class="text-xs text-muted">
              📅 ${r.dueDate || 'N/A'} ${r.dueTime || ''} • 🔁 ${r.recurrence || 'None'} • 
              ${r.completed ? '✅ Completed' : '⏳ Pending'}
            </div>
          </div>
          <div class="flex gap-2">
            <button 
              class="px-2 py-1 rounded-md ${r.completed ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-emerald-500 hover:bg-emerald-600'}  text-xs toggleRem" 
              data-id="${r.id}">
              ${r.completed ? '↩️' : '✅'}
            </button>
            <button 
              class="px-2 py-1 rounded-md bg-rose-500 hover:bg-rose-600  text-xs delRem" 
              data-id="${r.id}">
              🗑️
            </button>
          </div>
        </div>
        ${logHtml ? `<div class="mt-2 space-y-1">${logHtml}</div>` : ''}
      </div>
    `;
  }).join('');

  const addForm = `
    <form id="addReminderForm" class="mt-4 space-y-2">
      <input id="reminderTitle" placeholder="Title" class="w-full p-2 rounded-lg glass border  " required />
      <input id="reminderDate" type="date" class="w-full p-2 rounded-lg glass border  " required />
      <input id="reminderTime" type="time" class="w-full p-2 rounded-lg glass border  " />
      <select id="reminderRecurrence" class="w-full p-2 rounded-lg glass border  ">
        <option value="">None</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
      </select>
      <button class="w-full py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 transition" type="submit">
        ➕ Add Reminder
      </button>
    </form>
  `;

  showSimpleModal(
    '🔔 Reminders',
    `<div class="space-y-3">${rows || `<div class="text-center text-muted">No reminders</div>`}${addForm}</div>`
  );

  // Add Reminder
  document.getElementById('addReminderForm').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('reminderTitle').value.trim();
    const dueDate = document.getElementById('reminderDate').value;
    const dueTime = document.getElementById('reminderTime').value;
    const recurrence = document.getElementById('reminderRecurrence').value;
    if (!title || !dueDate) return;

    const exists = (state.reminders || []).some(r => 
      r.title === title && r.dueDate === dueDate && r.dueTime === dueTime && r.recurrence === recurrence
    );
    if (!exists) {
      const reminder = { 
        id: uid('rem'), 
        title, 
        dueDate, 
        dueTime, 
        recurrence, 
        completed: false, 
        completedLog: [] 
      };
      await put('reminders', reminder);
      state.reminders.push(reminder);
      showRemindersModal();
      autoBackup();
      showToast('Reminder added!', 'success');
      renderNotifications();
    } else {
      showToast('Reminder already exists!', 'error');
    }
  };

  // Delete Reminder
  document.querySelectorAll('.delRem').forEach(btn => btn.onclick = async (e) => {
    const id = btn.dataset.id;
    if (!confirm('Are you sure you want to delete this reminder?')) return;
    await del('reminders', id);
    state.reminders = state.reminders.filter(r => r.id !== id);
    showRemindersModal();
    autoBackup();
    showToast('Reminder deleted!', 'success');
    renderNotifications();
  });

  // Toggle Complete / Unmark
  document.querySelectorAll('.toggleRem').forEach(btn => btn.onclick = async (e) => {
    const id = btn.dataset.id;
    const reminder = state.reminders.find(r => r.id === id);
    if (!reminder) return;

   reminder.completed = !reminder.completed;
    if (!reminder.completedLog) reminder.completedLog = [];
    reminder.completedLog.push({
      time: new Date().toLocaleString(),
      status: reminder.completed ? 'Done' : 'Undone'
    }); 
    await put('reminders', reminder);
    showRemindersModal();
    autoBackup();
    showToast(reminder.completed ? 'Reminder marked as completed ✅' : 'Reminder set to pending ⏳', 'info');
    renderNotifications();
  });
}

// Simple modal utility
function showSimpleModal(title, html) {
  const modals = document.getElementById('modals');
  modals.innerHTML = `
    <div class='fixed inset-0 flex items-center justify-center z-50'>
      <div class='absolute inset-0 bg-black/50' onclick="document.getElementById('modals').innerHTML=''"></div>
      <div class='glass rounded-2xl p-4 w-11/12 max-w-2xl z-50'>
        <div class="flex justify-between items-center mb-2">
          <h3 class='font-semibold'>${title}</h3>
          <button onclick="document.getElementById('modals').innerHTML=''" class="text-muted hover:">&times;</button>
        </div>
        <div class='overflow-auto max-h-[60vh]'>${html}</div>
      </div>
    </div>
  `;
}

// ----------------------------
// Renderers
// ----------------------------
function renderAll(){
  renderDropdowns();
  renderKPIs();
  renderCharts();
  refreshRecentList();
  renderDropdownManager();
  renderHeatmap();
  checkBudgetAlerts();
  renderNotifications();
  processRecurringTransactions();
}

function renderDropdowns(){
  const sel = document.getElementById('accountFilter');
  sel.innerHTML = '<option value="all">All Accounts</option>' + state.dropdowns.accounts.map(a=>`<option value="${a}">${a}</option>`).join('');
}

function renderKPIs(){
  const range = parseKpiRange();
  const end = new Date();
  const start = new Date(); start.setDate(end.getDate()-range+1);
  const txs = state.transactions.filter(t => new Date(t.date) >= start && new Date(t.date) <= end);
  const income = txs.filter(t=>t.type==='in').reduce((s,t)=>s+Number(t.amount),0);
  const expense = txs.filter(t=>t.type==='out').reduce((s,t)=>s+Number(t.amount),0);
  const balance = state.transactions.reduce((s,t)=> s + (t.type==='in'?Number(t.amount):-Number(t.amount)), 0);
  document.getElementById('kpiIncome').innerText = fmtINR(income);
  document.getElementById('kpiExpense').innerText = fmtINR(expense);
  document.getElementById('kpiPL').innerText = fmtINR(income-expense);
  document.getElementById('kpiBalance').innerText = fmtINR(balance);
  document.getElementById('kpiRangeLabel').innerText = range+'d';
  document.getElementById('kpiRangeLabel2').innerText = range+'d';
}

function parseKpiRange(){
  const v = document.getElementById('kpiRange').value;
  if (v==='custom'){
    const from = document.getElementById('customFrom').value;
    const to = document.getElementById('customTo').value;
    if (!from||!to) return 30;
    const diff = (new Date(to)-new Date(from))/(24*3600*1000)+1; return Math.max(1,Math.floor(diff));
  }
  return Number(v);
}

function renderCharts(){
  renderCashflow();
  renderDoughnut();
  renderBudgetChart();
}

function renderCashflow(){
  const days = 90;
  const labels = [];
  const data = [];
  let running = 0;
  for (let i=days-1;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    labels.push(d.toLocaleDateString('en-IN',{month:'short',day:'numeric'}));
    const dayTx = state.transactions.filter(t=> new Date(t.date).toDateString()===d.toDateString());
    dayTx.forEach(t=> running += (t.type==='in'?Number(t.amount):-Number(t.amount)));
    data.push(running);
  }
  const ctx = document.getElementById('cashflowChart').getContext('2d');
  if (cashflowChart instanceof Chart) cashflowChart.destroy();
  cashflowChart = new Chart(ctx, {
    type:'line', data:{labels, datasets:[{label:'Balance', data, borderColor:'#6366f1', backgroundColor:'rgba(99,102,241,0.08)', tension:0.3, fill:true}]},
    options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}}
  });
}

function renderDoughnut(){
  const thisMonth = new Date().getMonth();
  const byCat = {};
  state.transactions.forEach(t=>{
    const d = new Date(t.date); 
    if (d.getMonth()===thisMonth)
    { byCat[t.category] = (byCat[t.category]||0) + (t.type==='out'?Number(t.amount):0);
      
     }
  });
  const labels = Object.keys(byCat); const data = labels.map(l=>byCat[l]);
  const ctx = document.getElementById('categoryDoughnut').getContext('2d');
  if (doughnutChart instanceof Chart) doughnutChart.destroy();
  doughnutChart = new Chart(ctx, {type:'doughnut', data:{labels, datasets:[{data, backgroundColor: labels.map((_,i)=>`hsl(${i*40%360} 70% 50%)`)}]}, options:{plugins:{legend:{position:'bottom'}}}});
}

function renderBudgetChart(){
  // simple: for this month, per-category limit vs actual
  const month = new Date().toISOString().slice(0,7);
  const limits = {}; state.budgets.filter(b=>b.month===month).forEach(b=> limits[b.category]=b.limit);
  const actual = {};
  state.transactions.forEach(t=>{ if (t.date.startsWith(month) && t.type==='out') actual[t.category] = (actual[t.category]||0) + Number(t.amount); });
  const cats = Array.from(new Set([...Object.keys(limits), ...Object.keys(actual)]));
  const dataLimit = cats.map(c=>limits[c]||0); const dataActual = cats.map(c=>actual[c]||0);
  const ctx = document.getElementById('budgetChart').getContext('2d');
  if (budgetChart instanceof Chart) budgetChart.destroy();
  budgetChart = new Chart(ctx, {type:'bar', data:{labels:cats, datasets:[{label:'Limit', data:dataLimit, backgroundColor:'rgba(99,102,241,0.25)'},{label:'Actual', data:dataActual, backgroundColor:'rgba(99,102,241,0.9)'}]}, options:{responsive:true, maintainAspectRatio:false}});
}

function renderHeatmap(){
  const grid = document.getElementById('heatmap'); grid.innerHTML='';
  const days=30; const today = new Date();
  for (let i=days-1;i>=0;i--){
    const d = new Date(); d.setDate(today.getDate()-i);
    const total = state.transactions.filter(t=>new Date(t.date).toDateString()===d.toDateString()).reduce((s,t)=>s+Number(t.amount),0);
    const intensity = Math.min(1, total/1000);
    const bg = `rgba(99,102,241,${0.05+intensity*0.8})`;
    const el = document.createElement('div'); el.className='p-2 rounded'; el.style.background=bg; el.title=`${d.toLocaleDateString()}: ₹${total}`; el.innerText = d.getDate(); grid.appendChild(el);
  }
}

// ----------------------------
// Recent transactions list
// ----------------------------
function refreshRecentList() {
  const q = document.getElementById('searchTx').value.toLowerCase().trim();
  const list = document.getElementById('recentList');
  list.innerHTML = '';
  const acc = document.getElementById('accountFilter').value;
const today = new Date();
  const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isSameDay = (d1, d2) => startOfDay(d1).getTime() === startOfDay(d2).getTime();
  const getWeekStart = d => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() || 7) + 1);
  };
  
  //  Split into tokens (space-separated)
  const tokens = q ? q.split(/\s+/) : [];

  const items = state.transactions
    .slice()
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
    .filter((t) => {
      if (acc !== 'all' && acc && acc !== t.account) return false;

      let match = true;

      for (const token of tokens) {
        if (!token) continue;

        //  Amount filters
        const amountMatch = token.match(/^amount([<>]=?|=)(\d+(?:\.\d+)?)$/);
        if (amountMatch) {
          const [, operator, valueStr] = amountMatch;
          const value = parseFloat(valueStr);
          if (operator === '>' && !(t.amount > value)) match = false;
          if (operator === '>=' && !(t.amount >= value)) match = false;
          if (operator === '<' && !(t.amount < value)) match = false;
          if (operator === '<=' && !(t.amount <= value)) match = false;
          if (operator === '=' && !(t.amount === value)) match = false;
          continue;
        }

        //  Category filter
        const categoryMatch = token.match(/^category:(.+)$/);
        if (categoryMatch) {
          if (!(t.category || '').toLowerCase().includes(categoryMatch[1].trim())) match = false;
          continue;
        }

        //  Account filter
        const accountMatch = token.match(/^account:(.+)$/);
        if (accountMatch) {
          if (!(t.account || '').toLowerCase().includes(accountMatch[1].trim())) match = false;
          continue;
        }

        //  Smart date filters
        if (token === 'today') {
          if (!isSameDay(new Date(t.date), today)) match = false;
          continue;
        }

        if (token === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          if (!isSameDay(new Date(t.date), yesterday)) match = false;
          continue;
        }

        if (token === 'this' || token === 'last') {
          // Handle multi-word "this week", "last month", etc.
          continue; // handled in combo
        }

        if (token === 'week' || token === 'month') {
          const idx = tokens.indexOf(token);
          const prev = tokens[idx - 1];

          if (prev === 'this' && token === 'week') {
            const weekStart = startOfDay(getWeekStart(new Date(today)));
            if (!(new Date(t.date) >= weekStart)) match = false;
          }

          if (prev === 'last' && token === 'week') {
            const thisWeekStart = startOfDay(getWeekStart(new Date(today)));
            const lastWeekStart = new Date(thisWeekStart);
            lastWeekStart.setDate(lastWeekStart.getDate() - 7);
            const lastWeekEnd = new Date(thisWeekStart);
            if (!(new Date(t.date) >= lastWeekStart && new Date(t.date) < lastWeekEnd)) match = false;
          }

          if (prev === 'this' && token === 'month') {
            if (!(new Date(t.date).getMonth() === today.getMonth() &&
                  new Date(t.date).getFullYear() === today.getFullYear())) {
              match = false;
            }
          }

          if (prev === 'last' && token === 'month') {
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            if (!(new Date(t.date).getMonth() === lastMonth.getMonth() &&
                  new Date(t.date).getFullYear() === lastMonth.getFullYear())) {
              match = false;
            }
          }
          continue;
        }

        //  Free text fallback
        const searchText = [
          t.note || '',
          t.category || '',
          t.account || '',
          String(t.amount || ''),
          t.type === 'in' ? 'income' : 'expense',
          t.date || '',
          t.createdAt ? new Date(t.createdAt).toLocaleString() : ''
        ].join(' ').toLowerCase();

        if (!searchText.includes(token)) match = false;
      }

      return match;
    });


    if (items.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-4">No transactions found</div>';
        return;
    }

  items.forEach((t) => {
    const row = document.createElement('div');
    row.className = `
      flex items-center justify-between p-3 mb-2 rounded-xl shadow 
      glass/50 backdrop-blur-md transition hover:scale-[1.02] hover:glass cursor-pointer
    `;
    const amountColor = t.type === 'in' ? 'text-emerald-400' : 'text-rose-400';
    const sign = t.type === 'in' ? '+' : '-';
    // Recurrence badge
    let recurrenceBadge = '';
    if (t.recurrence) {
      recurrenceBadge = `<span class="ml-2 px-2 py-0.5 rounded-full bg-amber-600 text-xs ">${t.recurrence.charAt(0).toUpperCase() + t.recurrence.slice(1)}</span>`;
    }
    // Auto-generated badge
    let autoBadge = '';
    if (t.recurringOrigin) {
      autoBadge = `<span class="ml-2 px-2 py-0.5 rounded-full bg-sky-700 text-xs " title="Auto">⟳</span>`;
    }

    row.innerHTML = `
      <div class="flex flex-col">
        <div class="flex items-center space-x-2">
          <span class="text-xs px-2 py-0.5 rounded-full bg-slate-500 ">${t.category}</span>
          <span class="text-sm text-muted">${t.date} </span>
          ${recurrenceBadge}
          ${autoBadge}
        </div>
        <div class="text-base font-semibold ">${t.note || '(No Note)'}</div>
        <div class="text-xs text-muted">${t.account} <span class="text-xs text-slate-500">${t.createdAt ? new Date(t.createdAt).toLocaleString() : '(no timestamp)'}</span></div>
      </div>
      <div class="flex flex-col items-end">
        <div class="text-lg font-bold ${amountColor}">${sign}${fmtINR(t.amount)}</div>
        <div class="flex space-x-2 mt-1">
          <button data-id="${t.id}" class="editTx text-sky-400 hover:text-sky-300" title="Edit">
            ✏️
          </button>
          <button data-id="${t.id}" class="delTx text-rose-400 hover:text-rose-300" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    `;
    list.appendChild(row);
  });

  document.querySelectorAll('.delTx').forEach((btn) =>
    btn.onclick = async (e) => {
      const id = e.target.dataset.id;
        if (!confirm('Are you sure you want to delete this transaction?')) return;
      try {
        await del('transactions', id);
        state.transactions = state.transactions.filter((x) => x.id !== id);
        renderAll();
        autoBackup();
        showToast('Transaction deleted!', 'success');
      } catch (err) {
        showToast('Failed to delete transaction', 'error');
      }
    }
  );
  document.querySelectorAll('.editTx').forEach((btn) =>
    btn.onclick = (e) => openEditTransactionModal(e.target.dataset.id)
  );
}
function openEditTransactionModal(id) {
  const t = state.transactions.find(x => x.id === id);
  if (!t) return;

  const html = `
    <div class="fixed inset-0 flex items-center justify-center z-50">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" id="closeModal"></div>
      <!-- Modal Box -->
      <div class="glass rounded-2xl p-6 w-11/12 max-w-md z-50 shadow-lg transition-all animate-scaleIn">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold ">✏️ Edit Transaction</h3>
          <button id="closeModalBtn" class="text-muted hover: text-2xl">&times;</button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-muted mb-1">Date</label>
            <input id="tx_date" type="date"
              class="w-full p-3 rounded-lg glass border  "
              value="${t.date}" />
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Type</label>
            <select id="tx_type"
              class="w-full p-3 rounded-lg glass border  ">
              <option value="out" ${t.type === 'out' ? 'selected' : ''}>Expense</option>
              <option value="in" ${t.type === 'in' ? 'selected' : ''}>Income</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Amount</label>
            <input id="tx_amount" type="number" step="0.01"
              class="w-full p-3 rounded-lg glass border  "
              value="${t.amount}" placeholder="Enter amount" />
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Account</label>
            <select id="tx_account"
              class="w-full p-3 rounded-lg glass border  ">
              ${state.dropdowns.accounts.map(a => `<option ${a===t.account?'selected':''}>${a}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Category</label>
            <select id="tx_category"
              class="w-full p-3 rounded-lg glass border  ">
              ${state.dropdowns.categories.map(c => `<option ${c===t.category?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Recurrence</label>
            <select id="tx_recurrence"
              class="w-full p-3 rounded-lg glass border  ">
              <option value="">None</option>
              <option value="daily" ${t.recurrence === 'daily' ? 'selected' : ''}>Daily</option>
              <option value="weekly" ${t.recurrence === 'weekly' ? 'selected' : ''}>Weekly</option>
              <option value="monthly" ${t.recurrence === 'monthly' ? 'selected' : ''}>Monthly</option>
              <option value="yearly" ${t.recurrence === 'yearly' ? 'selected' : ''}>Yearly</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Note</label>
            <input id="tx_note"
              class="w-full p-3 rounded-lg glass border  "
              value="${t.note||''}" placeholder="Optional note" />
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button id="updateTx"
            class="flex-1 py-3 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 transition">
            ✅ Update
          </button>
          <button id="cancelTx"
            class="flex-1 py-3 rounded-lg bg-slate-700  font-semibold hover:bg-slate-600 transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  const modals = document.getElementById('modals');
  modals.innerHTML = html;

  // Close handlers
  document.getElementById('closeModal').onclick = () => modals.innerHTML = '';
  document.getElementById('closeModalBtn').onclick = () => modals.innerHTML = '';
  document.getElementById('cancelTx').onclick = () => modals.innerHTML = '';

  // Update handler
  document.getElementById('updateTx').onclick = async () => {
    t.date = document.getElementById('tx_date').value;
    t.type = document.getElementById('tx_type').value;
    t.amount = Number(document.getElementById('tx_amount').value || 0);
    t.account = document.getElementById('tx_account').value;
    t.category = document.getElementById('tx_category').value;
    t.recurrence = document.getElementById('tx_recurrence').value;
    t.note = document.getElementById('tx_note').value || '';
    t.Modified= nowISO1();
	//t.createdAt = nowISO1();
    try {
      await put('transactions', t);
      renderAll();
      modals.innerHTML = '';
      autoBackup();
      showToast('Transaction updated!', 'success');
    } catch (e) {
      showToast('Failed to update transaction', 'error');
    }
  };
}
// ----------------------------
// --- Toast Notification Utility ---
// ----------------------------
const toastQueue = []; // Queue for pending toasts
let activeToasts = 0;  // Count active toasts
const MAX_TOASTS = 2;  //  Max toasts visible at a time

function showToast(message, type = 'info', duration = 3000) {
  toastQueue.push({ message, type, duration });
  processToastQueue();
}

function processToastQueue() {
  if (activeToasts >= MAX_TOASTS || toastQueue.length === 0) return;

  const { message, type, duration } = toastQueue.shift();
  activeToasts++;

  // Toast colors
  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    warning: 'bg-amber-500 text-black',
    info: 'bg-sky-600',
  };

  // Create container if not exists
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-4 right-4 z-[9999] flex flex-col space-y-2';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `
    max-w-xs px-4 py-3 rounded-lg shadow-lg  font-medium
    transition-all transform duration-300 ease-out opacity-0 translate-x-6
    ${colors[type] || colors.info}
  `;
  toast.textContent = message;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-x-6');
    toast.classList.add('opacity-100', 'translate-x-0');
  });

  // Auto-remove after duration
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-x-0');
    toast.classList.add('opacity-0', 'translate-x-6');
    setTimeout(() => {
      toast.remove();
      activeToasts--;
      processToastQueue(); // Show next toast from queue
    }, 300);
  }, duration);
}

// ----------------------------
// Transaction modals
// ----------------------------
function openAddTransactionModal(prefill = {}) {
  const id = uid('tx');
  const today = prefill.date || nowISO();
ensureDropdownKey('recurrences');
const recurrences = state.dropdowns.recurrences && state.dropdowns.recurrences.length ? state.dropdowns.recurrences : ['None','daily','weekly','monthly','yearly'];
  const html = `
    <div class="fixed inset-0 flex items-center justify-center z-50">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div class="glass rounded-2xl shadow-2xl p-5 w-11/12 max-w-md z-50 animate-fadeIn">
        <h3 class="text-lg font-semibold  mb-4 flex items-center gap-2">
          ➕ Add Transaction
        </h3>
        <div class="space-y-3 text-sm ">
          
          <!-- Date -->
          <label class="block">
            <span class="text-xs text-muted">Date</span>
            <input id="tx_date" type="date" value="${today}"
              class="w-full p-2 rounded-lg glass border  focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </label>

          <!-- Type -->
          <label class="block">
            <span class="text-xs text-muted">Type</span>
            <select id="tx_type"
              class="w-full p-2 rounded-lg glass border  focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="out" ${prefill.type === 'out' ? 'selected' : ''}>💸 Expense</option>
              <option value="in" ${prefill.type === 'in' ? 'selected' : ''}>💰 Income</option>
            </select>
          </label>

          <!-- Amount -->
          <label class="block">
            <span class="text-xs text-muted">Amount</span>
            <input id="tx_amount" type="number" step="0.01" value="${prefill.amount || ''}"
              class="w-full p-2 rounded-lg glass border  focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Enter amount" />
          </label>

          <!-- Account -->
          <label class="block">
            <span class="text-xs text-muted">Account</span>
            <select id="tx_account"
              class="w-full p-2 rounded-lg glass border  focus:outline-none focus:ring-2 focus:ring-emerald-400">
              ${state.dropdowns.accounts.map(a => `<option ${a === prefill.account ? 'selected' : ''}>${a}</option>`).join('')}
            </select>
          </label>

          <!-- Category -->
          <label class="block">
            <span class="text-xs text-muted">Category</span>
            <select id="tx_category"
              class="w-full p-2 rounded-lg glass border  focus:outline-none focus:ring-2 focus:ring-emerald-400">
              ${state.dropdowns.categories.map(c => `<option ${c === prefill.category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </label>

          <!-- Recurrence -->
          <label class="block">
            <span class="text-xs text-muted">Recurrence</span>
            <select id="tx_recurrence"
              class="w-full p-2 rounded-lg glass border  focus:outline-none focus:ring-2 focus:ring-emerald-400">
               ${recurrences.map(r=>`<option value="${(r||'').toString().toLowerCase()}">${r}</option>`).join('')}
              </select>
          </label>

          <!-- Note -->
          <label class="block">
            <span class="text-xs text-muted">Note</span>
            <input id="tx_note" value="${prefill.note || ''}"
              class="w-full p-2 rounded-lg glass border  focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Optional note" />
          </label>
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 mt-5">
          <button id="saveTx"
            class="flex-1 py-2 rounded-lg bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-400 transition">
            💾 Save
          </button>
          <button id="cancelTx"
            class="flex-1 py-2 rounded-lg bg-slate-700  font-semibold hover:bg-slate-600 transition">
            ✖ Cancel
          </button>
        </div>
      </div>
    </div>
  `;

  const modals = document.getElementById('modals');
  modals.innerHTML = html;

  document.getElementById('cancelTx').onclick = () => modals.innerHTML = '';

  document.getElementById('saveTx').onclick = async () => {
    const txObj = {
      id,
      date: document.getElementById('tx_date').value,
      type: document.getElementById('tx_type').value,
      amount: Number(document.getElementById('tx_amount').value || 0),
      account: document.getElementById('tx_account').value,
      category: document.getElementById('tx_category').value,
      recurrence: document.getElementById('tx_recurrence').value,
      note: document.getElementById('tx_note').value || '',
      createdAt: nowISO1() 
    };

    try {
      await put('transactions', txObj);
      state.transactions.push(txObj);
      renderAll();
      modals.innerHTML = '';
      autoBackup();
      showToast('✅ Transaction added successfully!', 'success');
    } catch (e) {
      showToast('❌ Failed to add transaction!', 'error');
    }
  };
}


// ----------------------------
// Dropdown Manager
// ----------------------------

// ...existing code...
let dropdownManagerMinimized = true;
let recentTxMinimized = true;
let dashboardsMinimized = true;
function updateDropdownManagerVisibility() {
  const dm = document.getElementById('dropdownManager');
  const icon = document.getElementById('dropdownManagerToggleIcon');
  if (dropdownManagerMinimized) {
    dm.style.display = 'none';
    icon.textContent = '+';
  } else {
    dm.style.display = '';
    icon.textContent = '−';
  }
}
document.getElementById('toggleDropdownManager').onclick = function() {
  dropdownManagerMinimized = !dropdownManagerMinimized;
  updateDropdownManagerVisibility();
};

function updateRecentTxVisibility() {
  const section = document.getElementById('recentTxSection');
  const icon = document.getElementById('recentTxToggleIcon');
  if (recentTxMinimized) {
    section.style.display = 'none';
    icon.textContent = '+';
  } else {
    section.style.display = '';
    icon.textContent = '−';
  }
}
document.getElementById('toggleRecentTx').onclick = function() {
  recentTxMinimized = !recentTxMinimized;
  updateRecentTxVisibility();
};
document.getElementById('toggleRecentTxHDR').onclick = function() {
  recentTxMinimized = !recentTxMinimized;
  updateRecentTxVisibility();
};

function updateDashboardsVisibility() {
  const section = document.getElementById('dashboardsSection');
  const icon = document.getElementById('dashboardsToggleIcon');
  if (dashboardsMinimized) {
    section.style.display = 'none';
    icon.textContent = '+';
  } else {
    section.style.display = '';
    icon.textContent = '−';
    setTimeout(renderCharts, 200); // re-render charts after expanding
  }
}
document.getElementById('toggleDashboards').onclick = function() {
  dashboardsMinimized = !dashboardsMinimized;
  updateDashboardsVisibility();
};
 
window.addEventListener('DOMContentLoaded', updateDashboardsVisibility);
window.addEventListener('DOMContentLoaded', updateRecentTxVisibility);
window.addEventListener('DOMContentLoaded', updateDropdownManagerVisibility);
// ...existing code...
function renderDropdownManager(){
  const el = document.getElementById('dropdownManager'); el.innerHTML='';
  const dv = state.dropdowns;
  const makeList = (title, arrKey)=>{
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class='font-semibold mb-1'>${title}</div>`;
    const list = document.createElement('div'); list.className='space-y-1';
    (dv[arrKey]||[]).forEach((item, idx)=>{
      const row=document.createElement('div'); row.className='flex gap-2 items-center';
      row.innerHTML = `<div class='flex-1'>${item}</div><div><button data-idx='${idx}' data-key='${arrKey}' class='editDd text-xs'>Rename</button> <button data-idx='${idx}' data-key='${arrKey}' class='delDd text-xs text-rose-400'>Del</button></div>`;
      list.appendChild(row);
    });
    const addRow = document.createElement('div'); addRow.className='flex gap-2 mt-2'; addRow.innerHTML = `<input placeholder='Add' class='flex-1 p-1 rounded glass text-sm' data-key='${arrKey}'/><button class='addDd px-2 rounded bg-emerald-500 text-slate-900'>Add</button>`;
    wrap.appendChild(list); wrap.appendChild(addRow);
    return wrap;
  };
  el.appendChild(makeList('Accounts','accounts'));
  el.appendChild(makeList('Categories','categories'));
  el.appendChild(makeList('Persons (Loans)','persons'));
  el.appendChild(makeList('ReOccurrences','recurrences'));
  /*document.querySelectorAll('.addDd').forEach(btn=> btn.onclick = async(e)=>{
    const ip = e.target.previousElementSibling; const key = ip.dataset.key; const v = ip.value.trim(); if(!v) return; state.dropdowns[key].push(v); await put('dropdowns', state.dropdowns); renderDropdowns(); renderDropdownManager(); autoBackup(); });
  document.querySelectorAll('.delDd').forEach(btn=> btn.onclick = async(e)=>{ const key = e.target.dataset.key; const idx = Number(e.target.dataset.idx); state.dropdowns[key].splice(idx,1); await put('dropdowns', state.dropdowns); renderDropdowns(); renderDropdownManager(); autoBackup(); });
  document.querySelectorAll('.editDd').forEach(btn=> btn.onclick = (e)=>{ const key = e.target.dataset.key; const idx = Number(e.target.dataset.idx); const newVal = prompt('Rename', state.dropdowns[key][idx]); if (newVal) { state.dropdowns[key][idx]=newVal; put('dropdowns', state.dropdowns).then(()=>{ renderDropdowns(); renderDropdownManager(); autoBackup(); }); } });*/
 
document.querySelectorAll('.addDd').forEach(btn => btn.onclick = async (e) => {
  const ip = e.target.previousElementSibling;
  const key = ip.dataset.key;
  const v = ip.value.trim();
  if (!v) return;
  try {
    state.dropdowns[key] = state.dropdowns[key] || [];
    state.dropdowns[key].push(v);
    await put('dropdowns', state.dropdowns);
    renderDropdowns();
    renderDropdownManager();
    autoBackup();
    showToast('Dropdown added!', 'success');
  } catch (err) {
    showToast('Failed to add dropdown', 'error');
  }
});

document.querySelectorAll('.delDd').forEach(btn => btn.onclick = async (e) => {
  const key = e.target.dataset.key;
  const idx = Number(e.target.dataset.idx);
  if (!confirm('Are you sure you want to delete this item from dropdown?')) return;
  try {
    state.dropdowns[key].splice(idx, 1);
    await put('dropdowns', state.dropdowns);
    renderDropdowns();
    renderDropdownManager();
    autoBackup();
    showToast('Dropdown deleted!', 'success');
  } catch (err) {
    showToast('Failed to delete dropdown', 'error');
  }
});

document.querySelectorAll('.editDd').forEach(btn => btn.onclick = (e) => {
  const key = e.target.dataset.key;
  const idx = Number(e.target.dataset.idx);
  const newVal = prompt('Rename', state.dropdowns[key][idx]);
  if (newVal) {
    try {
      state.dropdowns[key][idx] = newVal;
      put('dropdowns', state.dropdowns).then(() => {
        renderDropdowns();
        renderDropdownManager();
        autoBackup();
        showToast('Dropdown renamed!', 'success');
      });
    } catch (err) {
      showToast('Failed to rename dropdown', 'error');
    }
  }
});

}

// ----------------------------
// Budgets & Alerts
// ----------------------------
async function setBudgetForMonth(category, month, limit, threshold=0.8){
  const b = { id: uid('budget'), category, month, limit:Number(limit), alertThreshold:threshold };
  await put('budgets', b); state.budgets.push(b); renderAll(); autoBackup();
}

function checkBudgetAlerts(){
  const month = new Date().toISOString().slice(0,7);
  const alerts = [];
  state.budgets.filter(b=>b.month===month).forEach(b=>{
    const actual = state.transactions.filter(t=>t.date.startsWith(month) && t.type==='out' && t.category===b.category).reduce((s,t)=>s+Number(t.amount),0);
    if (actual >= b.limit*b.alertThreshold) alerts.push({type:'budget', category:b.category, actual, limit:b.limit});
  });
  // push to reminders store for in-app notifications
  state.reminders = state.reminders.concat(alerts.map(a=>({id:uid('alert'), title:`Budget alert: ${a.category}`, dueDate: nowISO(), meta:a}))); renderNotifications();
}

// ----------------------------
// Notifications
// ----------------------------
/*function renderNotifications(){
  const list = document.getElementById('notifList'); list.innerHTML='';
  const items = state.reminders.slice(-30).reverse();
  items.forEach(r=>{ const div = document.createElement('div'); div.className='p-2 border-b border-slate-800'; div.innerHTML=`<div class='font-semibold'>${r.title||r.name||'Reminder'}</div><div class='text-xs text-muted'>${r.dueDate||''}</div>`; list.appendChild(div); });
  document.getElementById('notifCount').innerText = items.length;
}*/
function renderNotifications() {
  const list = document.getElementById('notifList');
  list.innerHTML = '';
  // Show only pending reminders (not completed)
  const items = (state.reminders || []).filter(r => !r.completed).slice(-30).reverse();
  items.forEach(r => {
    const div = document.createElement('div');
    div.className = 'p-2 border-b border-slate-800 flex justify-between items-center';
    div.innerHTML = `
      <div>
        <div class='font-semibold'>${r.title || r.name || 'Reminder'}</div>
        <div class='text-xs text-muted'>${r.dueDate || ''} ${r.dueTime || ''} ${r.recurrence ? '(' + r.recurrence + ')' : ''}</div>
      </div>
      <button class="ml-2 px-2 py-1 rounded bg-emerald-500 text-slate-900 text-xs markRemDone" data-id="${r.id}">✅Done</button>
    `;
    list.appendChild(div);
  });
  document.querySelectorAll('.markRemDone').forEach(btn => btn.onclick = async (e) => {
    const id = e.target.dataset.id;
    const idx = state.reminders.findIndex(r => r.id === id);
    if (idx !== -1) {
      state.reminders[idx].completed = true;
      await put('reminders', state.reminders[idx]);
      renderNotifications();
      autoBackup();
    }
  });
  document.getElementById('notifCount').innerText = items.length;
}
function toggleNotifPanel(){ document.getElementById('notifPanel').classList.toggle('hidden'); }

// ----------------------------
// Full Export / Import (JSON) - bit-perfect
// ----------------------------
async function fullExport(){
  const payload = {
    transactions: state.transactions,
    budgets: state.budgets,
    loans: state.loans,
    reminders: state.reminders,
    dropdowns: state.dropdowns,
    settings: state.settings,
    users: state.users,
    savings: state.savings,
    investments: state.investments,
    meta: { exportedAt: new Date().toISOString() }
  };
  const txt = JSON.stringify(payload, null, 2);
  // if folder available, write; else download
  if (state.dataFolderHandle && window.showDirectoryPicker){
    try{
      const dir = state.dataFolderHandle;
      const fh = await dir.getFileHandle('ledger-backup.json', { create:true });
      const writable = await fh.createWritable(); await writable.write(txt); await writable.close(); showToast('Backup written to folder'); return;
    }catch(err){ console.warn('folder write failed', err); }
  }
  // fallback download
  const blob = new Blob([txt],{type:'application/json'}); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download = `ledger-backup-${nowISO()}.json`; a.click(); URL.revokeObjectURL(url);
}

async function fullImportJSONText(txt){
  try{
    const data = JSON.parse(txt);
    // simple merge strategy: clear existing stores and replace - preserve ids
    // For zero data loss, user should ensure this is the desired action.
    await clearAllStores();
    for (const t of (data.transactions||[])) await put('transactions', t);
    for (const b of (data.budgets||[])) await put('budgets', b);
    for (const l of (data.loans||[])) await put('loans', l);
    for (const r of (data.reminders||[])) await put('reminders', r);
    if (data.dropdowns) await put('dropdowns', data.dropdowns);
    if (data.settings) await put('settings', {key:'meta', value:data.settings});
    if (data.users) for (const u of data.users) await put('users', u);
    if (data.savings) for (const s of data.savings) await put('savings', s);
    if (data.investments) for (const inv of data.investments) await put('investments', inv);
    await loadAllFromDB(); renderAll(); showToast('Import complete', 'success');
  }catch(err){ showToast('Import failed: '+err.message, 'error'); }
}

async function clearAllStores(){
  const stores = ['transactions','budgets','loans','reminders','dropdowns','settings','users','savings','investments'];
  for (const s of stores){
    await new Promise((res,rej)=>{ const t = db.transaction(s,'readwrite'); const o = t.objectStore(s); const r=o.clear(); r.onsuccess=res; r.onerror=rej; });
  }
}

// ----------------------------
// CSV import/export
// ----------------------------
async function importCSVText(txt){
  const rows = parseCSV(txt);
  const header = rows.shift().map(h=>h.trim());
  const map = header.reduce((m,h,i)=>(m[h]=i,m),{});
  const imported = [];
  for (const r of rows){
    if (r.length===1 && r[0].trim==='') continue;
    const t = {
      id: uid('tx'),
      date: r[map['date']]||nowISO(),
      type: r[map['type']]||'out',
      amount: Number(r[map['amount']]||0),
      category: r[map['category']]||'Other',
      account: r[map['account']]||state.dropdowns.accounts[0]||'Cash',
      note: r[map['note']]||''
    };
    await put('transactions', t); state.transactions.push(t); imported.push(t);
  }
  renderAll(); autoBackup(); 
  showToast('Imported '+imported.length+' rows', 'success');
}

async function exportTransactionsCSV(){
  const rows = [['date','type','amount','category','account','note']];
  state.transactions.forEach(t=> rows.push([t.date,t.type,t.amount,t.category,t.account,t.note]));
  const txt = arrayToCSV(rows);
  if (state.dataFolderHandle && window.showDirectoryPicker){
    try{ const fh = await state.dataFolderHandle.getFileHandle(`transactions-${nowISO()}.csv`, {create:true}); const w = await fh.createWritable(); await w.write(txt); await w.close(); showToast('CSV written to folder', 'success'); return; }catch(e){ console.warn(e); }
  }
  const blob = new Blob([txt],{type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`transactions-${nowISO()}.csv`; a.click(); URL.revokeObjectURL(url);
}

// ----------------------------
// Auto-backup
// ----------------------------
 
// ========= Enhanced Auto-Backup & Restore (Zero Data Loss) =========

// ---- Config ----
const BACKUP_SCHEMA_VERSION = 1;            // bump when shape changes
const BACKUP_INTERVAL_MS   = 1 * 60 * 1000; // scheduled backup every 5 min
const BACKUP_RETENTION     = 50;            // keep last N rolling backups
const BACKUP_DIR_OPFS      = 'ledgermate/backups'; // Origin Private FS dir
const BACKUP_BASENAME      = 'ledger-backup';      // filename prefix

// ---- Helpers: pack & validate ----
function packSnapshot(metaExtra = {}) {
  return {
    _type: 'LedgerMateBackup',
    _schema: BACKUP_SCHEMA_VERSION,
    _createdAt: new Date().toISOString(),
    _app: { name: 'LedgerMate', version: '1.0' },
    ...metaExtra,
    transactions: state.transactions || [],
    budgets:      state.budgets || [],
    loans:        state.loans || [],
    reminders:    state.reminders || [],
    dropdowns:    state.dropdowns || {},
    settings:     state.settings || {},
    users:        state.users || [],
    savings:      state.savings || [],
    investments:  state.investments || []
  };
}

function validateSnapshot(payload) {
  const ok =
    payload && payload._type === 'LedgerMateBackup' &&
    typeof payload._schema === 'number' &&
    Array.isArray(payload.transactions) &&
    Array.isArray(payload.budgets) &&
    Array.isArray(payload.loans) &&
    Array.isArray(payload.reminders) &&
    Array.isArray(payload.users) &&
    Array.isArray(payload.savings) &&
    Array.isArray(payload.investments) &&
    typeof payload.dropdowns === 'object' &&
    typeof payload.settings === 'object';
  return ok;
}

// ---- Merge (non-destructive) ----
// Upserts by `id` when present; otherwise appends. Never clears stores.
async function mergeRestore(payload) {
  if (!validateSnapshot(payload)) throw new Error('Invalid snapshot');

  const upsertList = async (store, arr) => {
    for (const item of arr) {
      if (item && item.id != null) {
        await put(store, item);
      } else {
        // generate id if missing
        await put(store, { id: uid(store.slice(0,2)), ...item });
      }
    }
  };

  await upsertList('transactions', payload.transactions || []);
  await upsertList('budgets',      payload.budgets || []);
  await upsertList('loans',        payload.loans || []);
  await upsertList('reminders',    payload.reminders || []);
  if (payload.dropdowns) await put('dropdowns', payload.dropdowns);
  if (payload.settings)  await put('settings',  { key: 'meta', value: payload.settings });
  await upsertList('users',        payload.users || []);
  await upsertList('savings',      payload.savings || []);
  await upsertList('investments',  payload.investments || []);

  // refresh in-memory
  await loadAllFromDB(); // you already have this; used widely in the app
}

// ---- Write targets ----
// 1) Multi-Location: OPFS (no prompt)
async function writeToOPFS(text, timestamp) {
  if (!('storage' in navigator) || !navigator.storage.getDirectory) return false;
  try {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle('ledgermate_backups', { create:true });
    const fh = await folder.getFileHandle('latest.json', { create:true }); // always overwrite
    const w = await fh.createWritable();
    await w.write(text);
    await w.close();
    return true;
  } catch (e) {
    console.warn('OPFS backup failed', e);
    return false;
  }
}

// 2) Multi-Location: user-selected folder (File System Access API)
async function writeToFolder(text) {
  if (!(state.dataFolderHandle && window.showDirectoryPicker)) return false; // existing handle is restored in your app
  try {
    const name = `${BACKUP_BASENAME}.json`; // stable rolling file
    const fh = await state.dataFolderHandle.getFileHandle(name, { create: true });
    const w  = await fh.createWritable();
    await w.write(text); await w.close();
    return true;
  } catch (e) {
    console.warn('Folder backup failed', e);
    return false;
  }
}

// 3) Fallback: IndexedDB (settings)
async function writeToIndexedDB(payload) {
  await put('settings', { key: 'lastAutoBackup', value: payload });
  // keep a small rolling list of timestamps for retention visibility
  const historyKey = 'autoBackupHistory';
  const metaHist = (state.settings && state.settings[historyKey]) || [];
  const next = [...metaHist, payload._createdAt].slice(-BACKUP_RETENTION);
  state.settings[historyKey] = next;
  await put('settings', { key: 'meta', value: state.settings });
  return true;
}

// ---- Public entry: autoBackup() ----
let autoBackupTimer = null;
async function performBackup() {
  const snapshot = packSnapshot({ meta: { reason: 'scheduled|event' } });
  if (!validateSnapshot(snapshot)) return;

  const txt = JSON.stringify(snapshot);

  // try all locations; we consider success if at least one succeeds
  //const ts = snapshot._createdAt.replace(/[:.]/g,'-');
  const ts = snapshot._createdAt.replace(/[^0-9A-Za-z-_]/g, '-');

  const r1 = await writeToFolder(txt);
//  const r2 = await writeToOPFS(txt, ts);
  const r3 = await writeToIndexedDB(snapshot);

  if (r1 ||  r3) {
    console.log('✅ Backup complete', { folder: r1, idb: r3 });
  } else {
    console.warn('❌ Backup failed: no location succeeded');
  }
}

// keep your existing call sites working
function autoBackup() {
  if (autoBackupTimer) clearTimeout(autoBackupTimer);
  // slight debounce so bursts of writes coalesce
  //autoBackupTimer = setTimeout(performBackup, 800);
  autoBackupTimer = setTimeout(performBackup, 3000);
}

// ---- Scheduled 5-minute backups ----
let backupIntervalHandle = null;
function startBackupSchedule() {
  if (backupIntervalHandle) clearInterval(backupIntervalHandle);
  backupIntervalHandle = setInterval(performBackup, BACKUP_INTERVAL_MS);
}

// ---- Auto-restore on start (non-destructive merge) ----
async function tryAutoRestoreOnStart() {
  // 1) Prefer folder file if handle exists
  if (state.dataFolderHandle && window.showDirectoryPicker) {
    try {
      const fh = await state.dataFolderHandle.getFileHandle(`${BACKUP_BASENAME}.json`, { create: false });
      const file = await fh.getFile();
      const text = await file.text();
      const data = JSON.parse(text);
      if (validateSnapshot(data)) {
        await mergeRestore(data);
        console.log('🔄 Restored from folder backup');
        return true;
      }
    } catch (_) {}
  }
  // 2) Try OPFS (newest file)
  if ('storage' in navigator && navigator.storage.getDirectory) {
    try {
      const root = await navigator.storage.getDirectory();
      const parts = BACKUP_DIR_OPFS.split('/');
      let dir = root;
      for (const p of parts) dir = await dir.getDirectoryHandle(p, { create: true });
      const files = [];
      for await (const entry of dir.values()) {
        if (entry.kind === 'file' && entry.name.startsWith(BACKUP_BASENAME)) files.push(entry);
      }
      files.sort((a,b)=> a.name.localeCompare(b.name)); // newest last
      const last = files[files.length-1];
      if (last) {
        const f = await last.getFile();
        const text = await f.text();
        const data = JSON.parse(text);
        if (validateSnapshot(data)) {
          await mergeRestore(data);
          console.log('🔄 Restored from OPFS backup');
          return true;
        }
      }
    } catch (_) {}
  }
  // 3) Fallback: IndexedDB snapshot
  try {
    const last = (state.settings && state.settings.lastAutoBackup) || null;
    if (last && validateSnapshot(last)) {
      await mergeRestore(last);
      console.log('🔄 Restored from IndexedDB backup');
      return true;
    }
  } catch (_) {}
  return false;
}



// ----------------------------
// Set Data Folder (File System Access API)
// ----------------------------
async function setDataFolder(){
  if (!window.showDirectoryPicker){ alert('Directory access not supported in this browser.'); return; }
  try{
    const dir = await window.showDirectoryPicker();
    state.dataFolderHandle = dir;
    await put('settings', {key:'dataFolderHandle', value:dir});
    document.getElementById('folderLabel').innerText = 'Folder set ✔';
    // try auto-load most recent csv/json
    if(confirm('Load latest backup from this folder? Existing data will be merged.'))
  {
    await tryAutoLoadFolder();
  }
    
    autoBackup();
  }catch(err){ console.warn(err); }
}

async function tryAutoLoadFolder(){
  if (!state.dataFolderHandle) return;
  try{
    const dir = state.dataFolderHandle; const files = [];
    for await (const entry of dir.values()){ if (entry.kind==='file' && (entry.name.endsWith('.json'))) files.push(entry); }
    if (!files.length) return;
    files.sort((a,b)=> (a.getFile ? 0:0)); // best-effort
    // pick newest by name (fallback)
    const candidate = files[files.length-1];
    const f = await candidate.getFile(); const txt = await f.text();
    if (candidate.name.endsWith('.csv')) await importCSVText(txt); else await fullImportJSONText(txt);
    document.getElementById('folderLabel').innerText = ` ${candidate.name}`;
  }catch(err){ console.warn('auto load folder failed', err); }
}

// ----------------------------
// Encryption helpers (Web Crypto)
// ----------------------------
async function deriveKeyFromPassphrase(passphrase, salt){
  const enc = new TextEncoder(); const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2', salt:enc.encode(salt), iterations:100000, hash:'SHA-256'}, keyMaterial, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function encryptJSON(obj, passphrase){
  const salt = uid('salt'); const key = await deriveKeyFromPassphrase(passphrase, salt); const iv = crypto.getRandomValues(new Uint8Array(12)); const enc = new TextEncoder(); const ct = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, enc.encode(JSON.stringify(obj))); return {salt, iv:Array.from(iv), ct:Array.from(new Uint8Array(ct))};
}
async function decryptJSON(payload, passphrase){
  const {salt, iv, ct} = payload; const key = await deriveKeyFromPassphrase(passphrase, salt); const dec = await crypto.subtle.decrypt({name:'AES-GCM', iv:new Uint8Array(iv)}, key, new Uint8Array(ct)); return JSON.parse(new TextDecoder().decode(dec));
}

// ----------------------------
// Placeholder hooks (AI/OCR/Voice/Cloud)
// ----------------------------
async function aiCategorizeTransaction(tx){
  // Lightweight heuristic: match keywords
  const text = (tx.note+' '+tx.category).toLowerCase();
  const rules = { 'food':['restaurant','dinner','lunch','cafe'],'transport':['uber','taxi','bus','train'],'salary':['salary','payroll'] };
  for (const k in rules) for (const kw of rules[k]) if (text.includes(kw)) return k;
  return tx.category||'Other';
}
async function ocrScanReceipt(fileOrImage){
  // Placeholder: implement with Tesseract.js or external service if desired
  alert('OCR placeholder — integrate Tesseract or external OCR to auto-read receipts');
}
async function voiceAddTransaction(){
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { alert('Speech recognition not supported'); return; }
  // Implement as optional enhancement
}

// ----------------------------
// Misc helpers
// ----------------------------
async function saveSettings(){ await put('settings',{key:'meta', value:state.settings}); }


function onKpiRangeChange(e) {
  const v = e.target.value;
  const cf = document.getElementById('customFrom');
  const ct = document.getElementById('customTo');
  if (v === 'custom') {
    cf.classList.remove('hidden');
    ct.classList.remove('hidden');
  } else {
    cf.classList.add('hidden');
    ct.classList.add('hidden');
  }
  // Re-render KPIs based on current state.transactions and selected range
  renderKPIs();
}
 
  function toggleTheme() {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.body.setAttribute('data-theme', newTheme);
            settings.theme = newTheme;
            
            // Update button text
            document.getElementById('themeIcon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
            
            saveSettingsToStore();
        }
  function saveSettingsToStore() {
            const settings_store = db.transaction(['settings'], 'readwrite').objectStore('settings');
            settings_store.put({ key: 'appSettings', value: settings });
        }
function clearAllData() {
  if (!db) {
    console.error("Database not initialized.");
    return;
  }
  autoBackup();
  if (confirm('This will permanently delete all data. Are you sure?')) {
    if (confirm('Last chance! This cannot be undone.')) {
      const existingStores = Array.from(db.objectStoreNames); // get all store names

      existingStores.forEach(storeName => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
      });

      // Clear memory arrays
      state.transactions = [];
      state.budgets = [];   
      state.loans = [];
      state.reminders = [];
     // state.dropdowns = { categories: [], persons: [] };
      state.users = [];
      state.savings = [];
      state.investments = []; 
      state.notifications = [];
      state.rewards = []; 
      renderAll();
      showToast('All data cleared', 'success');
    }
  }
}
// --- Recurring Transactions Engine ---
function processRecurringTransactions() {
  const today = nowISO();
  const alreadyToday = new Set(state.transactions.filter(t => t.date === today && t.recurringOrigin).map(t => t.recurringOrigin));
  state.transactions.forEach(t => {
    if (!t.recurrence || !t.id) return;
    // Only process if not already added today
    if (alreadyToday.has(t.id)) return;
    // Only add if the recurrence matches today and not duplicated
    let shouldAdd = false;
    const lastDate = t.date;
    const todayDate = new Date(today);
    const lastDateObj = new Date(lastDate);
    if (t.recurrence === 'daily') {
      shouldAdd = today > lastDate;
    } else if (t.recurrence === 'weekly') {
      shouldAdd = todayDate.getDay() === lastDateObj.getDay() && today > lastDate;
    } else if (t.recurrence === 'monthly') {
      shouldAdd = todayDate.getDate() === lastDateObj.getDate() && today > lastDate;
    } else if (t.recurrence === 'yearly') {
      shouldAdd = todayDate.getDate() === lastDateObj.getDate() && todayDate.getMonth() === lastDateObj.getMonth() && today > lastDate;
    }
    if (shouldAdd) {
      // Prevent duplicate for today
      if (state.transactions.some(x => x.date === today && x.recurringOrigin === t.id)) return;
      const newTx = { ...t, id: uid('tx'), date: today, recurringOrigin: t.id };
      delete newTx.recurrence; // Only the original holds recurrence
      put('transactions', newTx).then(() => {
        state.transactions.push(newTx);
        renderAll();
        autoBackup();
        showToast('Recurring transaction added!', 'info');
      });
    }
  });
}
function nowISO1() {
  return new Date().toISOString(); //  full ISO with time
}
const searchInput = document.getElementById('searchTx');
const suggestionsBox = document.getElementById('searchSuggestions');
let activeIndex = -1;

function updateSuggestions() {
  const q = searchInput.value.toLowerCase().trim();
  const suggestions = [];

  // 1️⃣ Smart keywords
  const keywords = ['today', 'yesterday', 'this week', 'last week', 'this month', 'last month'];
  keywords.forEach(k => { if (fuzzyMatch(k, q)) suggestions.push({ type: 'keyword', text: k }); });

  // 2️⃣ Field-specific
  const fields = ['amount>', 'amount<', 'amount=', 'category:', 'account:'];
  fields.forEach(f => { if (fuzzyMatch(f, q)) suggestions.push({ type: 'field', text: f }); });

  // 3️⃣ Dynamic categories & accounts
  const categories = [...new Set(state.transactions.map(t => t.category).filter(Boolean))];
  const accounts = [...new Set(state.transactions.map(t => t.account).filter(Boolean))];
  categories.forEach(c => {
    const token = `category:${c.toLowerCase()}`;
    if (fuzzyMatch(token, q)) suggestions.push({ type: 'category', text: token });
  });
  accounts.forEach(a => {
    const token = `account:${a.toLowerCase()}`;
    if (fuzzyMatch(token, q)) suggestions.push({ type: 'account', text: token });
  });

  // 4️⃣ Matching transactions
  const txMatches = state.transactions.filter(t => {
    const searchText = [
      t.note || '',
      t.category || '',
      t.account || '',
      String(t.amount || ''),
      t.date || '',
      t.createdAt || ''
    ].join(' ').toLowerCase();
    return fuzzyMatch(searchText, q);
  }).slice(0, 5);

  // Render dropdown
  if (!suggestions.length && !txMatches.length) {
    suggestionsBox.classList.add('hidden');
    return;
  }

  suggestionsBox.innerHTML = `
    ${suggestions.map((s, i) => `
      <div class="suggestion p-2 text-sm cursor-pointer " data-index="${i}" data-text="${s.text}">
        🔍 ${s.text}
      </div>
    `).join('')}
    ${txMatches.map((t, i) => `
      <div class="suggestion p-2 cursor-pointer" data-index="${suggestions.length + i}" data-text="${t.note || ''}">
        <div class="flex justify-between text-sm ">
          <span>${t.note || '(No Note)'}</span>
          <span class="${t.type === 'in' ? 'text-emerald-400' : 'text-rose-400'} font-semibold">
            ${t.type === 'in' ? '+' : '-'}${fmtINR(t.amount)}
          </span>
        </div>
        <div class="text-xs text-muted">
          ${t.category || 'Uncategorized'} • ${t.account} • ${t.date}
        </div>
      </div>
    `).join('')}
  `;
  suggestionsBox.classList.remove('hidden');
  activeIndex = -1;

  // Click handling
  [...suggestionsBox.querySelectorAll('.suggestion')].forEach(el => {
    el.onclick = () => selectSuggestion(el.dataset.text);
  });
}

function selectSuggestion(text) {
  searchInput.value = text;
  suggestionsBox.classList.add('hidden');
  refreshRecentList();
}

function highlightSuggestion(index) {
  const items = suggestionsBox.querySelectorAll('.suggestion');
  items.forEach((el, i) => {
    el.classList.toggle('bg-slate-600', i === index);
  });
}

searchInput.addEventListener('keydown', (e) => {
  const items = suggestionsBox.querySelectorAll('.suggestion');
  if (!items.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = (activeIndex + 1) % items.length;
    highlightSuggestion(activeIndex);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = (activeIndex - 1 + items.length) % items.length;
    highlightSuggestion(activeIndex);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (activeIndex >= 0) {
      const el = items[activeIndex];
      selectSuggestion(el.dataset.text);
    }
  } else if (e.key === 'Escape') {
    suggestionsBox.classList.add('hidden');
  }
});
function fuzzyMatch(str, query) {
  if (!query) return true;
  str = str.toLowerCase();
  query = query.toLowerCase();
  // Basic fuzzy matching: contains OR small typo tolerance
  return str.includes(query) || levenshteinDistance(str, query) <= 2;
}

// Very small Levenshtein for typos
function levenshteinDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

searchInput.addEventListener('input', updateSuggestions);
searchInput.addEventListener('blur', () => setTimeout(() => suggestionsBox.classList.add('hidden'), 200));

const themeToggle = document.getElementById('themeToggle');
  const root = document.documentElement;

  // Load theme from localStorage if available
  if(localStorage.getItem('theme') === 'dark') {
    root.classList.add('dark');
  }

  // Toggle theme when button is clicked
  themeToggle.addEventListener('click', () => {
    root.classList.toggle('dark');
    if(root.classList.contains('dark')) {
      localStorage.setItem('theme', 'dark');
    } else {
      localStorage.setItem('theme', 'light');
    }
  });


// ----------------------------
// Start
// ----------------------------
//init();
(async () => {
  try {
    await openDB();
    await seedDefaults();
    await loadAllFromDB();

    const isFresh =
      (state.transactions || []).length === 0 &&
      (state.budgets || []).length === 0 &&
      (state.loans || []).length === 0 &&
      (state.users || []).length === 0;

    if (isFresh) await tryAutoRestoreOnStart();

    startBackupSchedule();
    autoBackup();

    bindUI();
    renderAll();
    tryAutoLoadFolder();
    checkAllNotifications();
    setInterval(checkAllNotifications, 60 * 60 * 1000);
    processRecurringTransactions();
    setInterval(processRecurringTransactions, 60 * 60 * 1000);
    //setDataFolder();
  } catch (err) {
    console.error('Startup error', err);
  }
})();
