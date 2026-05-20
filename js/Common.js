let transactions = []; // All transactions will be stored here
  let settings = {};   
const fmtINR = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(v || 0);
const nowISO = () => new Date().toISOString().slice(0,10);
const uid = (prefix='id') => prefix + '_' + Math.random().toString(36).slice(2,9);
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
let db = null;
async function openDB() {
    return new Promise((resolve, reject) => {
        const DB_NAME    = "ledgermate_db";
        const DB_VERSION = 13;

        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onerror = (e) => {
            console.error("❌ IndexedDB error:", e.target.error);
            if (typeof showToast === 'function') showToast(`❌ DB error: ${e.target.error}`, "error");
            reject(e.target.error);
        };

        req.onsuccess = (e) => {
            db = e.target.result;
            window.db = db;          /* expose to StorePatch + other modules */
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
            ensureStore("trips", { keyPath: "id", autoIncrement: true });
            ensureStore("trip_routes", { keyPath: "id", autoIncrement: true }, ["tripId"]);
            ensureStore("credentials", { keyPath: "id", autoIncrement: true });
            ensureStore("audit_logs", { keyPath: "id", autoIncrement: true }, ["profile", "timestamp"]);
            ensureStore("notes", { keyPath: "id", autoIncrement: true }, ["title", "folderId", "pinned", "modified"]);
            ensureStore("note_versions", { keyPath: "id", autoIncrement: true }, ["noteId", "timestamp"]);
            ensureStore("note_attachments", { keyPath: "id", autoIncrement: true }, ["noteId"]);
            ensureStore("note_folders", { keyPath: "id", autoIncrement: true }, ["parentId"]);
            ensureStore("emi_loans", { keyPath: "id", autoIncrement: true });
            ensureStore("net_worth_snapshots", { keyPath: "id", autoIncrement: true }, ["date"]);
            ensureStore("allocation_targets", { keyPath: "id" });
            ensureStore("sip_plan", { keyPath: "id", autoIncrement: true });
            ensureStore("essentials_settings", { keyPath: "key" });
            console.log("✅ DB schema upgrade complete");
        };
    });
}
/* ─── Expose key functions for cross-module access ── */
window.LM_resetDB = function() {
  try { if (db) { db.close(); } } catch {}
  db        = null;
  window.db = null;
  window.LM_DB_READY = false;
};
window.mergeRestore       = mergeRestore;
window.fullImportJSONText = fullImportJSONText;
window.FinalJson          = FinalJson;
function tx(store, mode='readonly'){
  if (!db) throw new Error('[LM] IndexedDB not ready – openDB() not yet called');
  return db.transaction(store, mode).objectStore(store);
}
async function getAll(storeName){
  if (!db) return [];          /* DB not yet open – return empty silently */
  return new Promise((res,rej)=>{
    try {
      const store = tx(storeName);
      const req = store.getAll();
      req.onsuccess = ()=>res(req.result||[]);
      req.onerror = ()=>rej(req.error);
    } catch(e) { rej(e); }
  });
}
async function put(storeName, obj){
  if (!db) throw new Error('[LM] IndexedDB not ready');
  return new Promise((res,rej)=>{
    const t = db.transaction(storeName,'readwrite');
    const s = t.objectStore(storeName);
    const req = s.put(obj);
    req.onsuccess = ()=>res(req.result);
    req.onerror = ()=>rej(req.error);
  });
}
async function del(storeName, key){
  if (!db) throw new Error('[LM] IndexedDB not ready');
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
  trips: [],
  routes: [],
  credentials: [],
  trip_routes: [],
  audit_logs: [],
  note_folders: [],
  note_attachments: [],
  note_versions: [],
  notes: [],
  emi_loans: [],
  net_worth_snapshots: [],
  allocation_targets: [],
  sip_plan: [],
  essentials_settings: {}
};

// Charts
let cashflowChart=null, doughnutChart=null, budgetChart=null;
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
  if (!hasMeta) {
    const defaultSettings = { theme: 'dark', kpiRange: 90 };
    await put('settings',{ key:'meta',        value: defaultSettings });
    await put('settings',{ key:'appSettings', value: defaultSettings });
  }
}

async function loadAllFromDB(){
  state.transactions = await getAll('transactions');
  state.budgets = await getAll('budgets');
  state.loans = await getAll('loans');
  state.reminders = await getAll('reminders');
  const dd = await getAll('dropdowns');
if (dd.length) {
  state.dropdowns = autoSortDropdowns(dd[0]);
} else {
  state.dropdowns = {id:'main',accounts:[],categories:[],persons:[],reminderTypes:[],recurrences:[]}; 
}
 // state.dropdowns = dd.length?dd[0]:{id:'main',accounts:[],categories:[],persons:[],reminderTypes:[],recurrences:[]};
  const settingsAll = await getAll('settings');
  const metaRec = settingsAll.find(x=>x.key==='meta');
  const appRec  = settingsAll.find(x=>x.key==='appSettings');
  /* Prefer appSettings (updated by toggleTheme) over meta */
  const loadedSettings = appRec?.value || metaRec?.value || {};
  state.settings = loadedSettings;
  /* Sync module-level settings variable */
  settings = { ...loadedSettings };
  /* Re-apply theme immediately after loading from DB */
  const theme = settings.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);
  const iconEl = document.getElementById('themeIcon');
  if (iconEl) iconEl.textContent = theme === 'dark' ? '🌙' : '☀️';
  state.users = await getAll('users');
  state.savings = await getAll('savings');
  state.investments = await getAll('investments');
  state.trips = await getAll('trips');
  state.routes = await getAll('trip_routes');
  state.credentials = await getAll('credentials');
  state.note_folders = await getAll('note_folders');
  state.note_attachments = await getAll('note_attachments');
  state.note_versions = await getAll('note_versions');
  state.notes = await getAll('notes');
  state.audit_logs = await getAll('audit_logs');
  state.emi_loans = await getAll('emi_loans');
  state.net_worth_snapshots = await getAll('net_worth_snapshots');
  state.allocation_targets = await getAll('allocation_targets');
  state.sip_plan = await getAll('sip_plan');
  const esAll = await getAll('essentials_settings');
  state.essentials_settings = esAll.reduce((acc,x) => ({...acc,[x.key]:x.value}),{});
  // restore folder handle if present
  const fh = settingsAll.find(x=>x.key==='dataFolderHandle');
  if (fh) state.dataFolderHandle = fh.value;
}
function autoSortDropdowns(data) {
  // Check if the object exists
  if (!data || typeof data !== 'object') return data;

  // Loop through all keys dynamically
  Object.keys(data).forEach(key => {
    const value = data[key];
    // Sort only if the value is an array of strings
    if (Array.isArray(value)) {
      data[key] = [...value].sort((a, b) => 
        String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
      );
    }
  });

  return data;
}

// ----------------------------
// UI Bindings
// ----------------------------
function bindUI(){
  document.getElementById('btnSetFolder').onclick = setDataFolder;
  document.getElementById('btnFullExport').onclick = fullExport;

  /* Import – bind to the correct file input ID (#importFile in HTML) */
  const importFileEl = document.getElementById('importFile') || document.getElementById('fileImport');
  document.getElementById('btnImport').onclick = () => importFileEl?.click();
  if (importFileEl && !importFileEl.dataset.bound) {
    importFileEl.dataset.bound = '1';
    importFileEl.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const txt = await file.text();
      if (file.name.endsWith('.csv')) {
        await importCSVText(txt);
      } else {
        await fullImportJSONText(txt, 'Manual');
      }
      e.target.value = ''; /* reset so same file can be re-imported */
    });
  }
  // document.getElementById('kpiRange').onchange = onKpiRangeChange;
  //document.getElementById('btnQuickAdd').onclick = () => openAddTransactionModal();
  document.getElementById('fabAddTx').onclick = () => openAddTransactionModal();
  //document.getElementById('btnQuickAdd1').onclick = () => openAddTransactionModal();
   
  document.getElementById('searchTx').oninput = refreshRecentList;
  //document.getElementById('notifBell').onclick = ()=>toggleNotifPanel();
  //document.getElementById('btnToggleTheme').onclick = toggleTheme;
  // Add handlers for Quick Actions

  //document.getElementById('openTransactions').onclick = showTransactionsModal;
  document.getElementById('openBudgets').onclick = showBudgetsModal;
  document.getElementById('openBudgets1').onclick = showBudgetsModal; 
  
  //document.getElementById('openRemainders').onclick = showRemindersModal;
  document.getElementById('openInvestments').onclick = showInvestmentsModal;
  document.getElementById('accountFilter').onchange = refreshRecentList;

  document.getElementById('clearData').addEventListener('click', clearAllData);
  document.getElementById("openTripPlannerBtn").onclick = () => openTripPlanner();
  document.getElementById("openDriveManagerBtn").onclick = () => DriveSync.showDriveSyncModal();
  //document.getElementById('openNotes').onclick = showNotesModal;
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
async function showBudgetsModal() {
  const month = new Date().toISOString().slice(0, 7);

  // Refresh state
  state.budgets = await getAll('budgets');
  state.transactions = await getAll('transactions'); // fetch all transactions

  const rows = (state.budgets || [])
    .filter(b => b.month === month)
    .map(b => {
      // calculate spent for this category
      const spent = (state.transactions || [])
        .filter(t => t.category === b.category && t.date?.slice(0, 7) === month)
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const percentSpent = Math.min((spent / b.limit) * 100, 100);
      const alertPercent = b.alertThreshold ? b.alertThreshold * 100 : 80;
      const overAlert = percentSpent >= alertPercent;
      const progressColor = overAlert ? 'bg-rose-500' : 'bg-emerald-500';

      return `
        <div class="p-3 rounded-lg border flex flex-col gap-2" style="background: var(--glass-bg); border-color: var(--glass-border);">
          <div class="flex justify-between items-center">
            <div>
              <div class="font-semibold text-[var(--text)]">${b.category}</div>
              <div class="text-xs text-[var(--text-muted)]">
                Limit: ${fmtINR(b.limit)} • Alert: ${alertPercent}%
              </div>
            </div>
            <div class="flex gap-1">
              <button class="editBudget px-2 py-1 rounded glass/60 text-[var(--text)]" data-id="${b.id}">✏️</button>
              <button class="delBudget px-2 py-1 rounded bg-rose-500 text-[var(--text)]" data-id="${b.id}">🗑️</button>
            </div>
          </div>
          <div class="w-full h-2 rounded-full bg-slate-600">
            <div class="h-2 rounded-full ${progressColor}" style="width: ${percentSpent}%; transition: width 0.3s;"></div>
          </div>
          <div class="text-xs text-[var(--text-muted)]">${fmtINR(spent)} spent • ${Math.round(percentSpent)}%</div>
        </div>
      `;
    }).join('') || `<div class="text-center text-[var(--text-muted)] text-sm">No budgets set</div>`;

  // Add form for unused categories
  const unusedCats = state.dropdowns.categories.filter(cat => !state.budgets.some(b => b.category === cat && b.month === month));
  let addForm = '';
  if (unusedCats.length) {
    addForm = `
      <form id="addBudgetForm" class="mt-4 space-y-2">
        <div class="grid grid-cols-3 gap-2">
          <select id="budgetCat" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)">
            ${unusedCats.map(c => `<option>${c}</option>`).join('')}
          </select>
          <input id="budgetLimit" type="number" min="1" placeholder="Limit ₹" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)" required/>
          <input id="budgetAlert" type="number" min="1" max="100" placeholder="Alert %" class="p-2 rounded border" style="background: var(--input-bg); color: var(--input-text); border-color: var(--input-border)" value="80" required/>
        </div>
        <button class="w-full py-2 rounded" style="background: var(--btn-green); color: var(--text);" type="submit">➕ Add Budget</button>
      </form>
    `;
  }

  showSimpleModal(
    '📊 Budgets (This Month)',
    `<div class="space-y-3">${rows}${addForm}</div>`
  );

  // Add new budget
  if (addForm) {
    document.getElementById('addBudgetForm').onsubmit = async e => {
      e.preventDefault();
      const cat = document.getElementById('budgetCat').value;
      const limit = Number(document.getElementById('budgetLimit').value);
      const alertThreshold = Number(document.getElementById('budgetAlert').value)/100;
      const budget = { id: uid('budget'), month, category: cat, limit, alertThreshold };
      await put('budgets', budget);
      state.budgets.push(budget);
      autoBackup();
      showBudgetsModal();
      showToast('Budget added!', 'success');
      renderBudgetOverview();
    };
  }

  // Edit & Delete handlers
  document.querySelectorAll('.editBudget').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      const budget = state.budgets.find(b => b.id === id);
      if (!budget) return;

      const newLimit = prompt(`Edit limit for ${budget.category}:`, budget.limit);
      if (!newLimit) return;
      const newAlert = prompt(`Edit alert % for ${budget.category}:`, budget.alertThreshold*100);
      if (!newAlert) return;

      budget.limit = Number(newLimit);
      budget.alertThreshold = Number(newAlert)/100;
      await put('budgets', budget);
      showBudgetsModal();
      showToast('Budget updated!', 'success');
      renderBudgetOverview();
    };
  });

  document.querySelectorAll('.delBudget').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.dataset.id;
      if (!confirm('Delete this budget?')) return;
      await del('budgets', id);
      state.budgets = state.budgets.filter(b => b.id !== id);
      autoBackup();
      showBudgetsModal();
      renderBudgetOverview();
      showToast('Budget deleted!', 'success');
    };
  });
}
function renderBudgetModalList() {
  const wrap = document.getElementById('budgetList');
  if (!wrap) return;
  const month = new Date().toISOString().slice(0,7);
  const monthBudgets = state.budgets.filter(b=>b.month===month);
  if (!monthBudgets.length) { wrap.innerHTML = '<div class="empty-state" style="padding:16px"><div class="empty-state-icon">🎯</div><div class="empty-state-text">No budgets for this month</div></div>'; return; }
  wrap.innerHTML = monthBudgets.map(b => {
    const actual = state.transactions.filter(t=>t.type==='out'&&t.category===b.category&&t.date.startsWith(month)).reduce((s,t)=>s+(+t.amount||0),0);
    const pct = b.limit>0?Math.min(Math.round((actual/b.limit)*100),100):0;
    const cls = pct>90?'over':pct>70?'warn':'safe';
    return `<div class="list-item" style="flex-direction:column; align-items:stretch;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div><div class="list-item-name">${b.category}</div><div class="list-item-sub">${fmtINR(actual)} / ${fmtINR(b.limit)} (${pct}%)</div></div>
        <button class="btn-danger" style="font-size:11px; padding:4px 8px;" onclick="deleteBudget('${b.id}')">✕</button>
      </div>
      <div class="budget-bar-bg" style="margin-top:6px;"><div class="budget-bar-fill ${cls}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}
/* ─────────────────────────────────────────────
   MODALS
───────────────────────────────────────────── */
function openModal(id) {
  document.getElementById(id).classList.add('show');
  // populate relevant lists
  if (id==='budgetModal') { renderBudgetModalList(); }
  if (id==='loanModal') { renderLoanList(); }
  if (id==='goalModal') { renderGoalList(); }
  if (id==='investModal') { renderInvestList(); }
}
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(el => {
  el.addEventListener('click', e => { if(e.target===el) el.classList.remove('show'); });
});
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
      account: loan.loanAccount,
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
/* ============================================================
   Loans Module – LedgerMate
   Modern, responsive, popup add form
   ============================================================ */

// Helper to escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Main function to display loans overview
function showLoansModal(prefill = {}) {
  ensureDropdownKey('persons');
  ensureDropdownKey('categories');
  ensureDropdownKey('recurrences');
  ensureDropdownKey('loanCategories');

  // ----- Group loans by person + type -----
  const grouped = {};
  (state.loans || []).forEach(l => {
    const key = `${l.person}__${l.type}`;
    if (!grouped[key]) {
      grouped[key] = {
        person: l.person,
        type: l.type,
        loans: [],
        total: 0,
        pendingTotal: 0,
        collectedTotal: 0
      };
    }
    grouped[key].loans.push(l);
    const signedAmount = (l.type === 'given' ? -1 : 1) * Number(l.amount);
    grouped[key].total += signedAmount;
    if (l.collected) grouped[key].collectedTotal += signedAmount;
    else grouped[key].pendingTotal += signedAmount;
  });

  // Calculate totals
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

  // Sort groups: pending first, then by earliest due date
  const sortedGroups = Object.values(grouped).sort((a, b) => {
    const aPending = a.loans.filter(l => !l.collected);
    const bPending = b.loans.filter(l => !l.collected);
    const aDate = aPending.length ? new Date(aPending[0].dueDate || '2100-01-01') : new Date('2100-01-01');
    const bDate = bPending.length ? new Date(bPending[0].dueDate || '2100-01-01') : new Date('2100-01-01');
    if (aPending.length && !bPending.length) return -1;
    if (!aPending.length && bPending.length) return 1;
    return aDate - bDate;
  });

  // ----- Build loan row HTML (compact on mobile) -----
  const buildLoanHtml = l => {
    const isOverdue = !l.collected && l.dueDate && new Date(l.dueDate) < new Date();
    const overdueClass = isOverdue ? 'border-l-4 border-l-rose-500 bg-rose-500/5' : '';
    const loanAmountColor = l.type === 'given' ? 'text-rose-400' : 'text-emerald-400';
    const loanSign = l.type === 'given' ? '-' : '+';
    const recurrenceLabel = l.recurrence && l.recurrence !== 'None' ? `🔁 ${l.recurrence}` : '';

    return `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl glass border ${overdueClass} transition-all hover:shadow-md loan-card">
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-400 mb-0.5">
            <span>📅 ${l.dueDate || 'N/A'}</span>
            ${l.collected ? `<span>✅ Collected</span>` : ''}
            ${recurrenceLabel ? `<span class="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs">${recurrenceLabel}</span>` : ''}
            ${isOverdue ? `<span class="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-xs">⚠️ Overdue</span>` : ''}
          </div>
          <div class="text-base sm:text-lg font-semibold ${loanAmountColor} truncate">
            ${loanSign}${fmtINR(l.amount)}
            <span class="text-xs text-slate-500 font-normal ml-1">${l.note || ''}</span>
          </div>
          ${l.category ? `<div class="text-xs text-slate-500 mt-0.5">🏷️ ${l.category}</div>` : ''}
        </div>
        <div class="flex items-center gap-1 flex-shrink-0 self-end sm:self-auto">
          <button class="editLoan px-2 py-1 rounded-lg text-xs font-medium bg-sky-500 hover:bg-sky-600 text-white transition" data-id="${l.id}">✏️</button>
          <button class="markCollected px-2 py-1 rounded-lg text-xs font-medium ${l.collected ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600 text-black'} transition" data-id="${l.id}">${l.collected ? '✅' : '⏳'}</button>
          <button class="delLoan px-2 py-1 rounded-lg text-xs font-medium bg-rose-500 hover:bg-rose-600 text-white transition" data-id="${l.id}">🗑️</button>
        </div>
      </div>
    `;
  };

  // ----- Build each group card -----
  const rows = sortedGroups.map(group => {
    const typeLabel = group.type === 'given' ? '💸 Given' : '📥 Taken';
    const pendingLoans = group.loans.filter(l => !l.collected);
    const collectedLoans = group.loans.filter(l => l.collected);
    const pendingTotalAbs = Math.abs(group.pendingTotal);
    const collectedTotalAbs = Math.abs(group.collectedTotal);
    const totalSum = pendingTotalAbs + collectedTotalAbs;
    const collectedPercent = totalSum ? (collectedTotalAbs / totalSum) * 100 : 0;

    const pendingHtml = pendingLoans.map(buildLoanHtml).join('');
    const collectedHtml = collectedLoans.map(buildLoanHtml).join('');

    const collectedSection = collectedLoans.length ? `
      <div class="mt-2">
        <button class="toggleCollected text-xs text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
          data-person="${group.person}" data-type="${group.type}">
          📋 View ${collectedLoans.length} collected
        </button>
        <div class="collectedList hidden mt-2 space-y-2">${collectedHtml}</div>
      </div>` : '';

    return `
      <div class="mb-4 p-3 rounded-xl glass shadow-sm border border-[var(--border)] hover:border-[var(--border-h)] transition-all loan-card">
        <div class="flex flex-wrap sm:flex-nowrap justify-between items-start gap-2 mb-2 loan-group-header">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-base sm:text-lg font-semibold">${escapeHtml(group.person || 'Unknown')}</span>
              <span class="text-xs px-1.5 py-0.5 rounded-full bg-[var(--bg3)] border border-[var(--border)]">${typeLabel}</span>
            </div>
            <div class="flex flex-wrap items-center gap-2 mt-1 text-xs">
              <span class="text-rose-400">⏳ ${fmtINR(pendingTotalAbs)}</span>
              <span class="text-emerald-400">✅ ${fmtINR(collectedTotalAbs)}</span>
            </div>
            ${totalSum > 0 ? `
              <div class="w-full max-w-[200px] mt-1 h-1.5 bg-[var(--bg3)] rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style="width: ${collectedPercent}%"></div>
              </div>
            ` : ''}
          </div>
          <button class="delLoanGroup px-2 py-1 rounded-lg text-xs font-medium bg-rose-500 hover:bg-rose-600 text-white transition flex-shrink-0" data-person="${group.person}" data-type="${group.type}">🗑️ All</button>
        </div>
        <div class="space-y-2">${pendingHtml || '<div class="text-xs text-slate-500 italic p-2 text-center">✨ No pending loans</div>'}</div>
        ${collectedSection}
      </div>
    `;
  }).join('') || `<div class="text-center text-slate-500 py-6 glass rounded-xl">✨ No loans added yet. Tap + to create one.</div>`;

  // ----- Summary Cards -----
  const summaryHtml = `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
      <div class="glass rounded-xl p-3 text-center border border-[var(--border)] loan-summary-card">
        <div class="text-2xl sm:text-3xl mb-1">💸</div>
        <div class="text-xs text-slate-400 uppercase">Given</div>
        <div class="text-xl sm:text-2xl font-bold text-rose-400">-${fmtINR(totalGiven)}</div>
      </div>
      <div class="glass rounded-xl p-3 text-center border border-[var(--border)] loan-summary-card">
        <div class="text-2xl sm:text-3xl mb-1">📥</div>
        <div class="text-xs text-slate-400 uppercase">Taken</div>
        <div class="text-xl sm:text-2xl font-bold text-emerald-400">+${fmtINR(totalTaken)}</div>
      </div>
      <div class="glass rounded-xl p-3 text-center border border-[var(--border)] loan-summary-card">
        <div class="text-2xl sm:text-3xl mb-1">⚖️</div>
        <div class="text-xs text-slate-400 uppercase">Outstanding</div>
        <div class="text-xl sm:text-2xl font-bold ${totalOutstanding >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
          ${totalOutstanding >= 0 ? '+' : ''}${fmtINR(totalOutstanding)}
        </div>
      </div>
    </div>
  `;

  // ----- Main content (no form) -----
  const mainContent = `
    ${summaryHtml}
    <div id="loanList" class="space-y-3">${rows}</div>
  `;

  renderLoansPage(mainContent);

  // ----- Floating Action Button to open add modal -----
   // ---- FAB: remove old, create new, attach to body ----
  const existingFab = document.getElementById('openAddLoanModalBtn');
  if (existingFab) existingFab.remove();

  const fab = document.createElement('button');
  fab.id = 'openAddLoanModalBtn';
  fab.className = 'fixed bottom-20  right-5 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg flex items-center justify-center text-2xl transition-all z-[9999]';
  fab.textContent = '+';
  fab.style.position = 'fixed';
  fab.style.bottom = '30px';
  fab.style.right = '16px';
  fab.style.zIndex = '9999';
  fab.onclick = () => openAddLoanModal();
  document.body.appendChild(fab);


  // ----- Attach event delegation for loan actions -----
  attachLoanEvents();

  // ----- Recurring loans -----
  handleRecurringLoans().catch(err => console.error('recurring error', err));
}

// ----- Open Add Loan Modal (popup) -----
function openAddLoanModal(prefill = {}) {
  const persons = state.dropdowns.persons || [];
  const categories = state.dropdowns.categories || [];
  const loanAccount = state.dropdowns.accounts || [];
  const recurrences = (state.dropdowns.recurrences && state.dropdowns.recurrences.length)
    ? state.dropdowns.recurrences
    : ['None', 'daily', 'weekly', 'monthly', 'yearly'];

  const modalHtml = `
    <div class="modal-overlay show" id="addLoanModalOverlay">
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title">➕ Add New Loan</h3>
          <button class="modal-close" onclick="closeAddLoanModal()">×</button>
        </div>
        <div class="modal-body">
          <form id="addLoanFormPopup" class="space-y-4">
            <div class="flex gap-2">
              <button type="button" class="type-btn given flex-1 py-2 rounded-md text-sm font-semibold border border-[var(--border)] bg-emerald-500/20 text-emerald-400 border-emerald-500/50" data-type="given">💸 Given</button>
              <button type="button" class="type-btn taken flex-1 py-2 rounded-md text-sm font-semibold border border-[var(--border)] text-slate-400" data-type="taken">📥 Taken</button>
            </div>
            <input type="hidden" id="loanTypePopup" value="given" />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Person(s)</label>
                <div id="loanPersonCheckboxesPopup" class="max-h-48 overflow-y-auto p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] space-y-1">
                  ${persons.map(p => `<label class="flex items-center gap-2 text-sm"><input type="checkbox" value="${p}" class="personCheckbox"> ${p}</label>`).join('')}
                </div>
              </div>
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Account</label>
                <select id="loanAccountPopup" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">
                  ${loanAccount.map(a => `<option value="${a}">${a}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Amount (₹)</label>
                <input id="loanAmountPopup" type="number" min="1" step="0.01" placeholder="0.00" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" />
              </div>
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Due Date</label>
                <input id="loanDueDatePopup" type="date" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Category</label>
                <select id="loanCategoryPopup" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">
                  ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Recurrence</label>
                <select id="loanRecurrencePopup" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">
                  ${recurrences.map(r => `<option value="${r.toLowerCase()}" ${r.toLowerCase() === 'none' ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Note</label>
              <input id="loanNotePopup" placeholder="What's this for?" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" />
            </div>

            <div class="flex flex-wrap gap-3">
              <label class="flex items-center gap-1 text-xs"><input type="checkbox" id="addReminderPopup" /> 🔔 Reminder</label>
              <label class="flex items-center gap-1 text-xs"><input type="checkbox" id="AddTransactionPopup" checked /> 💰 Add transaction</label>
            </div>

            <button type="submit" class="w-full py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 font-semibold text-sm transition shadow-md">➕ Add Loan</button>
          </form>
        </div>
      </div>
    </div>
  `;

  let container = document.getElementById('globalModals');
  if (!container) {
    container = document.createElement('div');
    container.id = 'globalModals';
    document.body.appendChild(container);
  }
  container.innerHTML = modalHtml;

  // Type toggle inside modal
  document.querySelectorAll('#addLoanModalOverlay .type-btn').forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      document.getElementById('loanTypePopup').value = type;
      document.querySelectorAll('#addLoanModalOverlay .type-btn').forEach(b => {
        b.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
        b.classList.add('text-slate-400');
      });
      btn.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
    };
  });

  // Submit handler
  document.getElementById('addLoanFormPopup').onsubmit = async (e) => {
    e.preventDefault();
    const type = document.getElementById('loanTypePopup').value;
    const selectedPersons = Array.from(document.querySelectorAll('#loanPersonCheckboxesPopup .personCheckbox:checked')).map(cb => cb.value);
    const amount = Number(document.getElementById('loanAmountPopup').value);
    const dueDate = document.getElementById('loanDueDatePopup').value;
    const note = document.getElementById('loanNotePopup').value.trim();
    const category = document.getElementById('loanCategoryPopup').value || 'Loan';
    const loanAccount = document.getElementById('loanAccountPopup').value || 'Cash';
    const recurrence = document.getElementById('loanRecurrencePopup').value || 'None';
    const addReminder = document.getElementById('addReminderPopup').checked;
    const addTransaction = document.getElementById('AddTransactionPopup').checked;

    if (!selectedPersons.length || !amount || !dueDate) {
      showToast('Select person(s), amount and due date', 'error');
      return;
    }

    const splitAmount = Number((amount / selectedPersons.length).toFixed(2));
    for (const person of selectedPersons) {
      const candidate = { person, type, amount: splitAmount, dueDate, note, category, recurrence, loanAccount, addTransaction };
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
      await handleLoanTransaction_V1(newLoan, addTransaction);
      if (addReminder) {
        const rem = {
          id: uid('rem'),
          title: `Loan due: ${person}`,
          dueDate,
          note: `Loan of ${fmtINR(splitAmount)} due for ${person}`,
          recurrence,
          completed: false,
          completedLog: []
        };
        await put('reminders', rem);
        state.reminders.push(rem);
      }
    }
    await handleRecurringLoans();
    autoBackup();
    showToast('Loan(s) added!', 'success');
    closeAddLoanModal();
    showLoansModal(); // refresh
  };
}

function closeAddLoanModal() {
  const overlay = document.getElementById('addLoanModalOverlay');
  if (overlay) overlay.classList.remove('show');
  setTimeout(() => {
    const container = document.getElementById('globalModals');
    if (container) container.innerHTML = '';
  }, 200);
}

// ----- Event delegation for loan actions (edit, delete, mark, delete group) -----
function attachLoanEvents() {
  const loanList = document.getElementById('loanList');
  if (!loanList) return;

  loanList.onclick = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.dataset.id;
    const loan = id ? state.loans.find(l => String(l.id) === String(id)) : null;

    // Delete single
    if (btn.classList.contains('delLoan')) {
      if (!confirm('Delete this loan?')) return;
      await del('loans', id);
      state.loans = state.loans.filter(l => l.id !== id);
      if (loan) {
        const toDeleteReminders = state.reminders.filter(r => r.title && r.title.includes(loan.person) && r.dueDate === loan.dueDate);
        for (const r of toDeleteReminders) await del('reminders', r.id);
        state.reminders = state.reminders.filter(r => !toDeleteReminders.includes(r));
        await handleLoanTransaction(loan, false);
      }
      autoBackup();
      showToast('Loan deleted', 'success');
      showLoansModal();
      return;
    }

    // Mark collected
    if (btn.classList.contains('markCollected') && loan) {
      loan.collected = !loan.collected;
      loan.collectedAt = loan.collected ? nowISO1() : null;
      await put('loans', loan);
      if (loan.collected) await handleLoanTransaction(loan, true);
      else await handleLoanTransaction(loan, false);
      autoBackup();
      renderNotifications();
      showToast(loan.collected ? 'Collected ✅' : 'Pending ⏳', 'info');
      showLoansModal();
      return;
    }

    // Edit loan – open edit modal (original logic)
    if (btn.classList.contains('editLoan') && loan) {
      openEditLoanModal(loan);
      return;
    }

    // Delete group
    if (btn.classList.contains('delLoanGroup')) {
      const person = btn.dataset.person;
      const type = btn.dataset.type;
      if (!confirm(`Delete ALL ${type} loans for ${person}?`)) return;
      const toDelete = state.loans.filter(l => l.person === person && l.type === type);
      for (const delLoan of toDelete) {
        await del('loans', delLoan.id);
        const rems = state.reminders.filter(r => r.title && r.title.includes(delLoan.person) && r.dueDate === delLoan.dueDate);
        for (const r of rems) await del('reminders', r.id);
        state.reminders = state.reminders.filter(r => !rems.includes(r));
        await handleLoanTransaction(delLoan, false);
      }
      state.loans = state.loans.filter(l => !(l.person === person && l.type === type));
      autoBackup();
      showToast(`All ${type} loans for ${person} deleted`, 'success');
      showLoansModal();
      return;
    }
  };

  // Toggle collected sections
  document.querySelectorAll('.toggleCollected').forEach(btn => {
    btn.removeEventListener('click', toggleCollectedHandler);
    btn.addEventListener('click', toggleCollectedHandler);
  });
}

function toggleCollectedHandler(e) {
  const btn = e.currentTarget;
  const parent = btn.closest('.glass');
  const list = parent?.querySelector('.collectedList');
  if (list) {
    const isHidden = list.classList.contains('hidden');
    list.classList.toggle('hidden', !isHidden);
    btn.innerHTML = isHidden ? '▲ Hide collected' : `📋 View ${list.children.length} collected`;
  }
}

// ----- Edit Loan Modal (unchanged from original, but must be defined) -----
function openEditLoanModal(loan) {
  const persons = state.dropdowns.persons || [];
  const categories = state.dropdowns.categories || [];
  const loanAccounts = state.dropdowns.accounts || [];
  const recurrences = (state.dropdowns.recurrences && state.dropdowns.recurrences.length)
    ? state.dropdowns.recurrences
    : ['None', 'daily', 'weekly', 'monthly', 'yearly'];

  const editModalHtml = `
    <div class="modal-overlay show" id="editLoanModalOverlay">
      <div class="modal" style="max-width: 500px;">
        <div class="modal-header">
          <h3 class="modal-title">✏️ Edit Loan</h3>
          <button class="modal-close" onclick="closeEditLoanModal()">×</button>
        </div>
        <div class="modal-body">
          <form id="editLoanFormPopup" class="space-y-4">
            <div class="flex gap-2">
              <button type="button" class="edit-type-btn given flex-1 py-2 rounded-md text-sm font-semibold border border-[var(--border)] ${loan.type === 'given' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'text-slate-400'}" data-type="given">💸 Given</button>
              <button type="button" class="edit-type-btn taken flex-1 py-2 rounded-md text-sm font-semibold border border-[var(--border)] ${loan.type === 'taken' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'text-slate-400'}" data-type="taken">📥 Taken</button>
            </div>
            <input type="hidden" id="editLoanType" value="${loan.type}" />

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Person</label>
                <select id="editLoanPerson" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">
                  ${persons.map(p => `<option value="${p}" ${loan.person === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Account</label>
                <select id="editLoanAccount" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">
                  ${loanAccounts.map(a => `<option value="${a}" ${loan.loanAccount === a ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Amount (₹)</label>
              <input id="editLoanAmount" type="number" min="1" step="0.01" value="${loan.amount}" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Due Date</label>
                <input id="editLoanDueDate" type="date" value="${loan.dueDate}" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" />
              </div>
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Category</label>
                <select id="editLoanCategory" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">
                  ${categories.map(c => `<option value="${c}" ${loan.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Note</label>
              <input id="editLoanNote" value="${loan.note || ''}" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" />
            </div>

            <div>
              <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Recurrence</label>
              <select id="editLoanRecurrence" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">
                ${recurrences.map(r => `<option value="${r.toLowerCase()}" ${loan.recurrence === r.toLowerCase() ? 'selected' : ''}>${r}</option>`).join('')}
              </select>
            </div>

            ${loan.recurrence && loan.recurrence !== 'None' ? `
              <div>
                <label class="text-xs text-slate-400 font-semibold uppercase mb-1 block">Scope</label>
                <select id="editScope" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">
                  <option value="this">Only This Loan</option>
                  <option value="future">This and Future Loans</option>
                  <option value="all">All Loans in Series</option>
                </select>
              </div>
            ` : ''}

            <label class="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" id="editLoanCollected" ${loan.collected ? 'checked' : ''} /> Collected
            </label>

            <button type="submit" class="w-full py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-semibold text-sm transition">💾 Save</button>
          </form>
        </div>
      </div>
    </div>
  `;

  let container = document.getElementById('globalModals');
  if (!container) {
    container = document.createElement('div');
    container.id = 'globalModals';
    document.body.appendChild(container);
  }
  container.innerHTML = editModalHtml;

  // Type toggle in edit modal
  document.querySelectorAll('#editLoanModalOverlay .edit-type-btn').forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      document.getElementById('editLoanType').value = type;
      document.querySelectorAll('#editLoanModalOverlay .edit-type-btn').forEach(b => {
        b.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
        b.classList.add('text-slate-400');
      });
      btn.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
    };
  });

  // Submit edit
  document.getElementById('editLoanFormPopup').onsubmit = async (e) => {
    e.preventDefault();
    const updates = {
      type: document.getElementById('editLoanType').value,
      person: document.getElementById('editLoanPerson').value,
      amount: Number(document.getElementById('editLoanAmount').value),
      dueDate: document.getElementById('editLoanDueDate').value,
      note: document.getElementById('editLoanNote').value,
      category: document.getElementById('editLoanCategory').value || 'Loan',
      recurrence: document.getElementById('editLoanRecurrence').value || 'None',
      collected: document.getElementById('editLoanCollected').checked,
      modifiedAt: nowISO1(),
      loanAccount: document.getElementById('editLoanAccount').value || 'Cash'
    };
    const scope = document.getElementById('editScope') ? document.getElementById('editScope').value : 'this';

    if (loan.recurrence !== updates.recurrence) {
      if (updates.recurrence && updates.recurrence !== 'None' && !loan.seriesId) loan.seriesId = uid('series');
      if (!updates.recurrence || updates.recurrence === 'None') loan.seriesId = null;
    }

    await applyLoanEdit(loan, updates, scope);
    closeEditLoanModal();
    showToast('Loan updated', 'success');
    showLoansModal();
  };
}

function closeEditLoanModal() {
  const overlay = document.getElementById('editLoanModalOverlay');
  if (overlay) overlay.classList.remove('show');
  setTimeout(() => {
    const container = document.getElementById('globalModals');
    if (container) container.innerHTML = '';
  }, 200);
}

// ----- Responsive CSS (add to your global styles) -----
const loansResponsiveCSS = `
@media (max-width: 640px) {
  .loan-card { padding: 0.5rem !important; }
  .loan-card .text-base { font-size: 0.875rem !important; }
  .loan-card .text-xs { font-size: 0.65rem !important; }
  .loan-card button { padding: 0.2rem 0.4rem !important; font-size: 0.65rem !important; }
  .loan-summary-card { padding: 0.5rem !important; }
  .loan-summary-card .text-2xl { font-size: 1.25rem !important; }
  .loan-summary-card .text-xl { font-size: 1rem !important; }
  .loan-group-header .text-base { font-size: 0.875rem !important; }
  .loan-group-header .gap-2 { gap: 0.25rem !important; }
  #openAddLoanModalBtn {
  position: fixed !important;
  bottom: 5rem !important;
  right: 1rem !important;
  z-index: 9999 !important;
}
}
`;
if (!document.getElementById('loansResponsiveCSS')) {
  const style = document.createElement('style');
  style.id = 'loansResponsiveCSS';
  style.textContent = loansResponsiveCSS;
  document.head.appendChild(style);
}
// The renderLoansPage function remains unchanged (assumed to exist)
function renderLoansPage(content) {
  const page = document.getElementById('loansOverview');
  if (page) {
    page.innerHTML = `
      <div class="loan-page-enter animate-fadeIn">
        ${content}
      </div>
    `;
  }
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
// Simple modal utility
function showSimpleModal(title, html) {
  const modals = document.getElementById('modals');

  modals.innerHTML = `
    <div style="
      position: fixed;
      inset: 0;
      z-index: 9999;
    ">

      <!-- Overlay -->
      <div 
        style="
          position:absolute;
          inset:0;
          background:rgba(0,0,0,0.6);
        "
        onclick="document.getElementById('modals').innerHTML=''">
      </div>

      <!-- Modal -->
      <div 
        style="
          position: fixed !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          width: 90% !important;
          max-width: 600px !important;
          z-index: 10000 !important;
        "
        class="glass rounded-2xl p-4 shadow-lg">

        <div class="flex justify-between items-center mb-2">
          <h3 class="font-semibold">${title}</h3>
          <button onclick="document.getElementById('modals').innerHTML=''">&times;</button>
        </div>

        <div style="max-height:70vh; overflow:auto;">
          ${html}
        </div>

      </div>
    </div>
  `;
}

// ----------------------------
// Renderers
// ----------------------------
let _renderAllTimer = null;
function renderAll(){
  /* Debounce: collapse rapid successive calls into one 60ms render */
  if (_renderAllTimer) { clearTimeout(_renderAllTimer); }
  _renderAllTimer = setTimeout(_doRenderAll, 60);
}
function _doRenderAll(){
  _renderAllTimer = null;
  renderDropdowns();
  renderKPIs();
  renderCharts();
  refreshRecentList();
  renderHeatmap();
  checkBudgetAlerts();
  //renderNotifications();
  processRecurringTransactions();
  renderBudgetOverview();
}

function renderDropdowns(){
  const sel = document.getElementById('accountFilter');
  if (!sel) return;
  sel.innerHTML = '<option value="all">All Accounts</option>' +
    (state.dropdowns?.accounts || []).map(a=>`<option value="${a}">${a}</option>`).join('');
}
function parseKpiRange(){
  const el = document.getElementById('kpiRange');
  if (!el) return 30;
  const v = el.value;
  if (v==='custom'){
    const from = document.getElementById('customFrom')?.value;
    const to   = document.getElementById('customTo')?.value;
    if (!from||!to) return 30;
    const diff = (new Date(to)-new Date(from))/(24*3600*1000)+1;
    return Math.max(1,Math.floor(diff));
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

 function renderBudgetChart(){
  const month = new Date().toISOString().slice(0,7);

  const limits = {};
  state.budgets
    .filter(b => b.month === month)
    .forEach(b => limits[b.category] = b.limit);

  const actual = {};

  state.transactions.forEach(t => {
    if (!t || !t.date || typeof t.date !== "string") return;  // <-- safety fix

    if (t.date.startsWith(month) && t.type === 'out') {
      actual[t.category] = (actual[t.category] || 0) + Number(t.amount);
    }
  });

  const cats = Array.from(new Set([...Object.keys(limits), ...Object.keys(actual)]));

  const dataLimit = cats.map(c => limits[c] || 0);
  const dataActual = cats.map(c => actual[c] || 0);

  const ctx = document.getElementById('budgetChart').getContext('2d');
  if (budgetChart instanceof Chart) budgetChart.destroy();

  budgetChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: cats,
      datasets: [
        { label: 'Limit', data: dataLimit, backgroundColor: 'rgba(99,102,241,0.25)' },
        { label: 'Actual', data: dataActual, backgroundColor: 'rgba(99,102,241,0.9)' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderHeatmap() {
  const grid = document.getElementById('heatmap');
  if (!grid) return;
  grid.innerHTML = '';

  const days = 30;
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);

    const total = state.transactions
      .filter(t => new Date(t.date).toDateString() === d.toDateString())
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const intensity = Math.min(1, total / 1000);
    const bg = `rgba(99, 102, 241, ${0.1 + intensity * 0.7})`;

    const el = document.createElement('div');
    el.className = 'heatmap-cell';
    el.style.background = bg;
    el.title = `${d.toLocaleDateString()}: ₹${total.toLocaleString()}`;
    el.innerText = d.getDate();

    grid.appendChild(el);
  }
}

function refreshRecentList() {
  const searchEl = document.getElementById('searchTx');
  const listEl   = document.getElementById('recentList');
  const accEl    = document.getElementById('accountFilter');
  if (!listEl) return;

  const q   = searchEl?.value?.toLowerCase?.()?.trim() || '';
  const list = listEl;
  list.innerHTML = '';
  const acc = accEl?.value || 'all';
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
let sourceTx = state.transactions;

// If NO search text (initial load), limit to 100
if (!q) {
    sourceTx = state.transactions
        .slice()
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
        .slice(0, 100);
}
  const items = sourceTx
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
        list.innerHTML = '<div class="tx-empty-msg">📋 No transactions found</div>';
        return;
    }

  items.forEach((t) => {
    const row = document.createElement('div');
    row.className = 'tx-item';

    // Category icon map
    const iconMap = { Food:'🍽️', Transport:'🚗', Bills:'💡', Shopping:'🛍️', Salary:'💼', Healthcare:'🏥', Entertainment:'🎬', Education:'📚', Housing:'🏠', Loan:'💸', Snacks:'🧆', Other:'💳' };
    const icon = iconMap[t.category] || '💳';
    const typeCls = t.type === 'in' ? 'income' : 'expense';

    // Badges
    const recurrenceBadge = t.recurrence && t.recurrence.toLowerCase() !== 'none'
      ? `<span class="tx-badge-recur">🔁 ${t.recurrence.charAt(0).toUpperCase() + t.recurrence.slice(1)}</span>`
      : '';
    const autoBadge = t.recurringOrigin
      ? `<span class="tx-badge-auto" title="Auto-generated">⟳ Auto</span>`
      : '';

    // Timestamp
    const ts = t.createdAt ? new Date(t.createdAt).toLocaleString('en-IN', { dateStyle:'short', timeStyle:'short' }) : '';

    row.innerHTML = `
      <div class="tx-row">

        <div class="tx-left">
          <!-- Icon dot -->
          <div class="tx-icon-dot ${typeCls}">${icon}</div>

          <!-- Text block -->
          <div class="tx-text">
            <div class="tx-top">
              <span class="tx-category">${t.category || 'Uncategorized'}</span>
              <span class="tx-date">${t.date}</span>
              ${recurrenceBadge}
              ${autoBadge}
            </div>
            <div class="tx-title">${t.note || '(No Note)'}</div>
            <div class="tx-meta">
              <span class="tx-meta-acc">${t.account || '—'}</span>
              <span class="tx-time">${ts}</span>
            </div>
          </div>
        </div>

        <div class="tx-right">
          <div class="tx-amount ${typeCls}">
            ${t.type === 'in' ? '+' : '−'}${fmtINR(t.amount)}
          </div>
          <div class="tx-actions">
            <button data-id="${t.id}" class="editTx" title="Edit">✏️</button>
            <button data-id="${t.id}" class="delTx"  title="Delete">🗑️</button>
          </div>
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

  // Use dynamic recurrences from state if available, else fallback
  const recurrences = (state.dropdowns.recurrences && state.dropdowns.recurrences.length)
    ? state.dropdowns.recurrences
    : ['None','daily','weekly','monthly','yearly'];

  const modalHTML = `
    <div class="modal-overlay" id="editTxOverlay">
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h3 class="modal-title text-lg font-semibold flex items-center gap-2">✏️ Edit Transaction</h3>
          <button id="editCloseBtn" class="modal-close text-2xl leading-none">×</button>
        </div>
        <div class="modal-body">
          <form id="editTxForm" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="form-label">Date</label>
                <input id="tx_date" type="date" value="${t.date}" class="form-input" required />
              </div>
              <div>
                <label class="form-label">Type</label>
                <select id="tx_type" class="form-input">
                  <option value="out" ${t.type === 'out' ? 'selected' : ''}>💸 Expense</option>
                  <option value="in"  ${t.type === 'in'  ? 'selected' : ''}>💰 Income</option>
                </select>
              </div>
              <div>
                <label class="form-label">Amount</label>
                <input id="tx_amount" type="number" step="0.01"
                  value="${t.amount}"
                  class="form-input"
                  placeholder="0.00" required />
              </div>
              <div>
                <label class="form-label">Account</label>
                <select id="tx_account" class="form-input">
                  ${state.dropdowns.accounts.map(a => `<option ${a === t.account ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="form-label">Category</label>
                <select id="tx_category" class="form-input">
                  ${state.dropdowns.categories.map(c => `<option ${c === t.category ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="form-label">Recurrence</label>
                <select id="tx_recurrence" class="form-input">
                  ${recurrences.map(r => {
                    const val = r.toLowerCase();
                    const sel = (t.recurrence || 'none') === val ? 'selected' : '';
                    return `<option value="${val}" ${sel}>${r}</option>`;
                  }).join('')}
                </select>
              </div>
            </div>
            <div>
              <label class="form-label">Note</label>
              <input id="tx_note"
                value="${t.note || ''}"
                class="form-input"
                placeholder="Optional note" />
            </div>
            <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--border)]">
              <button type="submit" class="btn-submit flex-1">💾 Update</button>
              <button type="button" id="editCancelBtn" class="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const modals = document.getElementById('modals');
  modals.innerHTML = modalHTML;

  // Show the overlay
  setTimeout(() => {
    const overlay = document.getElementById('editTxOverlay');
    if (overlay) overlay.classList.add('show');
  }, 10);

  const closeModal = () => {
    const overlay = document.getElementById('editTxOverlay');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }
  };

  // Close events
  document.getElementById('editCloseBtn').onclick = closeModal;
  document.getElementById('editCancelBtn').onclick = closeModal;
  document.getElementById('editTxOverlay').onclick = (e) => {
    if (e.target.id === 'editTxOverlay') closeModal();
  };

  // Submit handler
  document.getElementById('editTxForm').onsubmit = async (e) => {
    e.preventDefault();
    t.date = document.getElementById('tx_date').value;
    t.type = document.getElementById('tx_type').value;
    t.amount = Number(document.getElementById('tx_amount').value || 0);
    t.account = document.getElementById('tx_account').value;
    t.category = document.getElementById('tx_category').value;
    t.recurrence = document.getElementById('tx_recurrence').value;
    t.note = document.getElementById('tx_note').value || '';
    t.Modified = nowISO1();

    try {
      await put('transactions', t);
      renderAll();
      closeModal();
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
  /* Ensure container exists */
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  /* Animate in */
  requestAnimationFrame(() => toast.classList.add('show'));

  /* Auto-remove */
  const remove = () => {
    toast.classList.add('toast-out');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 250);
  };
  const timer = setTimeout(remove, duration);
  toast.addEventListener('click', () => { clearTimeout(timer); remove(); });
}
function processToastQueue() {} /* no-op – kept for backward compat */

// ----------------------------
// Transaction modals
// ----------------------------
function openAddTransactionModal(prefill = {}) {
  const id = uid('tx');
  const today = prefill.date || nowISO();
  prefill.category = prefill.category || 'Food';
  prefill.account = prefill.account || 'Cash';
  ensureDropdownKey('recurrences');
  prefill.recurrence = prefill.recurrence || 'None';

  const recurrences = state.dropdowns.recurrences || ['None','daily','weekly','monthly','yearly'];

  const modalHTML = `
    <div class="modal-overlay" id="addTxOverlay">
      <div class="modal" style="max-width:600px;">
        <div class="modal-header">
          <h3 class="modal-title text-lg font-semibold flex items-center gap-2">➕ Add Transaction</h3>
          <button id="cancelTx" class="modal-close text-2xl leading-none">×</button>
        </div>
        <div class="modal-body">
          <form id="txForm" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="form-label">Date</label>
                <input id="tx_date" type="date" value="${today}" class="form-input" required />
              </div>
              <div>
                <label class="form-label">Type</label>
                <select id="tx_type" class="form-input">
                  <option value="out" ${prefill.type === 'out' ? 'selected' : ''}>💸 Expense</option>
                  <option value="in" ${prefill.type === 'in' ? 'selected' : ''}>💰 Income</option>
                </select>
              </div>
              <div>
                <label class="form-label">Amount</label>
                <input id="tx_amount" type="number" step="0.01"
                  value="${prefill.amount || ''}"
                  class="form-input"
                  placeholder="0.00" required />
              </div>
              <div>
                <label class="form-label">Account</label>
                <select id="tx_account" class="form-input">
                  ${state.dropdowns.accounts.map(a => `<option ${a === prefill.account ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="form-label">Category</label>
                <select id="tx_category" class="form-input">
                  ${state.dropdowns.categories.map(c => `<option ${c === prefill.category ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="form-label">Recurrence</label>
                <select id="tx_recurrence" class="form-input">
                  ${recurrences.map(r => {
                    const val = r.toLowerCase();
                    return `<option value="${val}" ${val === prefill.recurrence.toLowerCase() ? 'selected' : ''}>${r}</option>`;
                  }).join('')}
                </select>
              </div>
            </div>
            <div>
              <label class="form-label">Note</label>
              <input id="tx_note"
                value="${prefill.note || ''}"
                class="form-input"
                placeholder="Optional note" />
            </div>
            <div class="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[var(--border)]">
              <button type="submit" class="btn-submit flex-1">💾 Save</button>
              <button type="button" id="cancelTx2" class="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const modals = document.getElementById('modals');
  modals.innerHTML = modalHTML;

  // Show the overlay by adding the 'show' class
  setTimeout(() => {
    const overlay = document.getElementById('addTxOverlay');
    if (overlay) overlay.classList.add('show');
  }, 10);

  const closeModal = () => {
    const overlay = document.getElementById('addTxOverlay');
    if (overlay) {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 300);
    }
  };

  document.getElementById('cancelTx').onclick = closeModal;
  document.getElementById('cancelTx2').onclick = closeModal;
  document.getElementById('addTxOverlay').onclick = (e) => {
    if (e.target.id === 'addTxOverlay') closeModal();
  };

  document.getElementById('txForm').onsubmit = async (e) => {
    e.preventDefault();
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
      closeModal();
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
let recentTxMinimized = false;
let dashboardsMinimized = true; 

// ----------------------------
// Budgets & Alerts
// ----------------------------
async function setBudgetForMonth(category, month, limit, threshold=0.8){
  const b = { id: uid('budget'), category, month, limit:Number(limit), alertThreshold:threshold };
  await put('budgets', b); state.budgets.push(b); renderAll(); autoBackup();
}

async function checkBudgetAlerts() {
  try {
    // 1️⃣ Load budgets & transactions from DB
    const budgets = await getAll('budgets') || [];
    const transactions = await getAll('transactions') || [];
    const today = new Date();
    const DAYS_BEFORE_END_ALERT = 2; // configurable

    const triggeredAlerts = [];

    for (let budget of budgets) {
      if (!budget || typeof budget !== 'object') continue;

      const alertThresholdPercent = budget.alertThreshold ? budget.alertThreshold * 100 : 80; // per budget
      const { id, category, limit, month } = budget; // only destructure what you need
if (!limit) continue;

// compute startDate and endDate dynamically if missing
const startDate = budget.startDate || `${month}-01`;
const endDate = budget.endDate || new Date(new Date(month + '-01').getFullYear(), 
                                           new Date(month + '-01').getMonth() + 1, 0)
                                      .toISOString().slice(0, 10);

// calculate spent
const spent = transactions
  .filter(t => {
    if (!t.date || !t.amount) return false;

    // string comparison works for YYYY-MM-DD format
    return t.category === category &&
           t.date >= startDate &&
           t.date <= endDate;
  })
  .reduce((sum, t) => sum + Number(t.amount || 0), 0);



      const percentUsed = (spent / limit) * 100;
      const end = new Date(endDate);
      const daysLeft = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

      // 🔔 Threshold alert
      if (percentUsed >= alertThresholdPercent && !budget.alertedThreshold) {
        showToast(`⚠️ ${category} budget used ${percentUsed.toFixed(1)}%`, "warning");
        triggeredAlerts.push({
          type: "budget",
          level: "warning",
          title: `${category} budget nearing limit`,
          message: `You've used ${percentUsed.toFixed(1)}% of your ${fmtINR(limit)} budget.`,
          category
        });
        budget.alertedThreshold = true;
      }

      // ❌ Over 100% critical alert
      if (percentUsed >= 100 && !budget.alertedExceeded) {
        showToast(`🚨 ${category} budget exceeded!`, "error");
        triggeredAlerts.push({
          type: "budget",
          level: "critical",
          title: `${category} budget exceeded`,
          message: `You spent ${fmtINR(spent)} of ${fmtINR(limit)}.`,
          category
        });
        budget.alertedExceeded = true;
        budget.exceeded = true;
      }

      // ⏱️ Budget period ending soon
      if (daysLeft <= DAYS_BEFORE_END_ALERT && daysLeft >= 0 && !budget.alertedPeriodEnd) {
        showToast(`📅 ${category} budget period ends in ${daysLeft} day(s)!`, "info");
        triggeredAlerts.push({
          type: "budget",
          level: "info",
          title: `${category} period ending`,
          message: `${daysLeft} day(s) left until this budget resets.`,
          category
        });
        budget.alertedPeriodEnd = true;
      }

      // ✅ Save updated budget flags
      await put('budgets', budget);
    }

    // 3️⃣ Push alerts to reminders
    if (triggeredAlerts.length > 0) {
      const reminders = await getAll('reminders') || [];
      triggeredAlerts.forEach(alert => {
        reminders.push({
          id: uid('alert'),
          title: alert.title,
          note: alert.message,
          tag: 'Budget',
          category: alert.category,
          priority: alert.level === 'critical' ? 'high' : 'medium',
          dueDate: today.toISOString().slice(0, 10),
          completed: false,
          createdAt: today.toISOString()
        });
      });

      // Save reminders
      for (let r of reminders) await put('reminders', r);
      state.reminders = reminders;
      renderNotifications();
    }

  } catch (err) {
    console.warn("❌ Error in checkBudgetAlerts:", err);
  }
}

// ----------------------------
// Full Export / Import (JSON) - bit-perfect
// ----------------------------
function safeFileTS() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
async function ensureDirPermission(dirHandle) {
  const perm = await dirHandle.queryPermission({ mode: 'readwrite' });
  if (perm === 'granted') return true;

  const req = await dirHandle.requestPermission({ mode: 'readwrite' });
  return req === 'granted';
}
async function fullExport() {
  const txt = await FinalJson();
  const fileTS = safeFileTS();

  // Try folder write
  if (state.dataFolderHandle && window.showDirectoryPicker) {
    try {
      const dir = state.dataFolderHandle;

      const ok = await ensureDirPermission(dir);
      if (!ok) throw new Error('No folder permission');

      // Timestamped backup
      const fh = await dir.getFileHandle(
        `ledger-backup-${fileTS}.json`,
        { create: true }
      );
      const writable = await fh.createWritable();
      await writable.write(txt);
      await writable.close();

      // Latest snapshot
      const fh1 = await dir.getFileHandle(
        `ledger-backup.json`,
        { create: true }
      );
      const writable1 = await fh1.createWritable();
      await writable1.write(txt);
      await writable1.close();

      showToast('Backup written to selected folder', 'success');
      return;
    } catch (err) {
      console.warn('Folder write failed, fallback to download', err);
    }
  }

  // Fallback download
  const blob = new Blob([txt], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ledger-backup-${fileTS}.json`;
  a.click();
  URL.revokeObjectURL(url);
}


async function fullImportJSONText(txt, source = "Unknown"){
  try{
    const data = JSON.parse(txt);

    /* Clear only the current user's data (not other users') */
    await clearAllStores();

    /* Restore all data stores */
    for (const t of (data.transactions||[]))        await put('transactions', t);
    for (const b of (data.budgets||[]))              await put('budgets', b);
    for (const l of (data.loans||[]))               await put('loans', l);
    for (const r of (data.reminders||[]))           await put('reminders', r);
    if (data.dropdowns)                             await put('dropdowns', data.dropdowns);
    if (data.settings)                              await put('settings', {key:'meta', value:data.settings});
    if (data.users)       for (const u of data.users)                   await put('users', u);
    if (data.savings)     for (const s of data.savings)                 await put('savings', s);
    if (data.investments) for (const inv of data.investments)           await put('investments', inv);
    if (data.trips)       for (const trip of data.trips)                await put('trips', trip);
    if (data.routes)      for (const route of data.routes)              await put('trip_routes', route);
    if (data.credentials) for (const cred of data.credentials)          await put('credentials', cred);
    if (data.notes)       for (const note of data.notes)                await put('notes', note);
    if (data.note_folders)      for (const f of data.note_folders)      await put('note_folders', f);
    if (data.note_attachments)  for (const a of data.note_attachments)  await put('note_attachments', a);
    if (data.note_versions)     for (const v of data.note_versions)     await put('note_versions', v);
    if (data.audit_logs)        for (const lg of data.audit_logs)       await put('audit_logs', lg);
    if (data.emi_loans)         for (const el of data.emi_loans)        await put('emi_loans', el);
    if (data.net_worth_snapshots) for (const s of data.net_worth_snapshots) await put('net_worth_snapshots', s);
    if (data.allocation_targets)  for (const t of data.allocation_targets)  await put('allocation_targets', t);
    if (data.sip_plan)            for (const p of data.sip_plan)             await put('sip_plan', p);
    if (data.essentials_settings) {
      for (const [key, value] of Object.entries(data.essentials_settings))
        await put('essentials_settings', { key, value });
    }

    /* ── Restore appSettings / theme ─────────────────── */
    if (data.appSettings && typeof data.appSettings === 'object') {
      Object.assign(settings, data.appSettings);
      localStorage.setItem('appSettings', JSON.stringify(settings));
      const uid = window.LM_Auth?.getCurrentUserId?.();
      if (uid) localStorage.setItem(`lm_u_${uid}_appSettings`, JSON.stringify(settings));
      /* Apply restored theme immediately */
      const theme = settings.theme || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      document.body.setAttribute('data-theme', theme);
      const iconValue = theme === 'dark' ? '🌙' : '☀️';
      const icon = document.getElementById('themeIcon');
      if (icon) icon.textContent = iconValue;
    }

    if(source !== "Drive"){
      await loadAllFromDB();
      renderAll();
      showToast('✅ Import complete', 'success');
    }
  } catch(err) {
    console.error('[LM] Import failed:', err);
    showToast('❌ Import failed: ' + err.message, 'error');
  }
}

async function clearAllStores(){
  const profileId = window.LM_Auth?.getCurrentUserId?.() || null;
  const stores = [
    'transactions','budgets','loans','reminders','savings','investments',
    'trips','trip_routes','credentials','audit_logs','notes','note_folders',
    'note_attachments','note_versions','emi_loans','net_worth_snapshots',
    'allocation_targets','sip_plan','essentials_settings'
  ];

  for (const s of stores){
    if (!db || !db.objectStoreNames.contains(s)) continue;
    if (profileId) {
      /* Delete only current user's records */
      await new Promise((res, rej) => {
        const t   = db.transaction(s, 'readwrite');
        const sto = t.objectStore(s);
        const req = sto.openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            if (!cursor.value.profile || cursor.value.profile === profileId) cursor.delete();
            cursor.continue();
          } else { res(); }
        };
        req.onerror = () => rej(req.error);
        t.oncomplete = res;
      });
    } else {
      /* Legacy: clear whole store */
      await new Promise((res, rej) => {
        const t = db.transaction(s, 'readwrite');
        const r = t.objectStore(s).clear();
        r.onsuccess = res; r.onerror = rej;
      });
    }
  }

  /* Also clear shared stores (dropdowns, settings) if needed */
  for (const s of ['dropdowns', 'settings']){
    if (!db || !db.objectStoreNames.contains(s)) continue;
    await new Promise((res, rej) => {
      const t = db.transaction(s, 'readwrite');
      const r = t.objectStore(s).clear();
      r.onsuccess = res; r.onerror = rej;
    });
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
    investments:  state.investments || [],
    trips:        state.trips || [],
    routes:      state.routes || [],
    credentials:  state.credentials || [],
    audit_logs:   state.audit_logs || [],
    notes:        state.notes || [],
    note_folders: state.note_folders || [],
    note_attachments: state.note_attachments || [],
    note_versions: state.note_versions || [],
    emi_loans: state.emi_loans || [],
    net_worth_snapshots: state.net_worth_snapshots || [],
    allocation_targets: state.allocation_targets || [],
    sip_plan: state.sip_plan || [],
    essentials_settings: state.essentials_settings || {}
  };
}

function validateSnapshot(payload) {
  /* Accept both the strict packSnapshot format (_type:'LedgerMateBackup')
     and the looser FinalJson / AdminPanel export format. */
  if (!payload || typeof payload !== 'object') return false;

  /* Strict format (auto-backup / packSnapshot) */
  if (payload._type === 'LedgerMateBackup') {
    return typeof payload._schema === 'number' &&
           Array.isArray(payload.transactions);
  }

  /* Loose format (FinalJson / AdminPanel export / user manual export) */
  return Array.isArray(payload.transactions) ||
         Array.isArray(payload.budgets)      ||
         Array.isArray(payload.savings)      ||
         Array.isArray(payload.investments);
}
 
// Upserts by `id` when present; otherwise appends. Never clears stores.
async function mergeRestore(payload) {
  if (!validateSnapshot(payload)) throw new Error('Invalid or unrecognised backup format.');
  if (!db) throw new Error('Database not ready. Please log in first.');

  const upsertList = async (store, arr) => {
    if (!Array.isArray(arr)) return;
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      try {
        if (item.id != null) {
          await put(store, item);
        } else {
          await put(store, { id: uid(store.slice(0, 3)), ...item });
        }
      } catch (e) {
        console.warn(`[mergeRestore] Failed to write to ${store}:`, e);
      }
    }
  };

  await upsertList('transactions',        payload.transactions || []);
  await upsertList('budgets',             payload.budgets || []);
  await upsertList('loans',               payload.loans || []);
  await upsertList('reminders',           payload.reminders || []);
  if (payload.dropdowns && typeof payload.dropdowns === 'object')
    await put('dropdowns', payload.dropdowns);
  if (payload.settings && typeof payload.settings === 'object')
    await put('settings', { key: 'meta', value: payload.settings });
  await upsertList('users',               payload.users || []);
  await upsertList('savings',             payload.savings || []);
  await upsertList('investments',         payload.investments || []);
  await upsertList('trips',               payload.trips || []);
  await upsertList('trip_routes',         payload.routes || payload.trip_routes || []);
  await upsertList('credentials',         payload.credentials || []);
  await upsertList('notes',               payload.notes || []);
  await upsertList('note_folders',        payload.note_folders || []);
  await upsertList('note_attachments',    payload.note_attachments || []);
  await upsertList('note_versions',       payload.note_versions || []);
  await upsertList('audit_logs',          payload.audit_logs || []);
  await upsertList('emi_loans',           payload.emi_loans || []);
  await upsertList('net_worth_snapshots', payload.net_worth_snapshots || []);
  await upsertList('allocation_targets',  payload.allocation_targets || []);
  await upsertList('sip_plan',            payload.sip_plan || []);

  if (payload.essentials_settings && typeof payload.essentials_settings === 'object') {
    for (const [key, value] of Object.entries(payload.essentials_settings)) {
      try { await put('essentials_settings', { key, value }); } catch {}
    }
  }

  /* ── Restore appSettings / theme ────────────────────── */
  if (payload.appSettings && typeof payload.appSettings === 'object') {
    Object.assign(settings, payload.appSettings);
    localStorage.setItem('appSettings', JSON.stringify(settings));
    const userId = window.LM_Auth?.getCurrentUserId?.();
    if (userId) localStorage.setItem(`lm_u_${userId}_appSettings`, JSON.stringify(settings));
    const theme = settings.theme || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    const icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }

  /* ── Refresh in-memory state ─────────────────────────── */
  if (db) await loadAllFromDB();
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
  autoBackupToDrive();
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
    document.getElementById('folderLabel').innerText = '✔';
    // try auto-load most recent csv/json
  /*  if(confirm('Load latest backup from this folder? Existing data will be merged.'))
  {
   await tryAutoLoadFolder();
  }*/
    
    //autoBackup();
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
async function saveSettings(){
  const merged = { ...(state.settings || {}), ...settings };
  state.settings = merged;
  settings = merged;
  if (db) {
    try {
      await put('settings', { key:'meta',        value: merged });
      await put('settings', { key:'appSettings', value: merged });
    } catch(e) { console.warn('[LM] saveSettings failed:', e); }
  }
  localStorage.setItem('appSettings', JSON.stringify(merged));
  const uid = window.LM_Auth?.getCurrentUserId?.();
  if (uid) localStorage.setItem(`lm_u_${uid}_appSettings`, JSON.stringify(merged));
}


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
  /* Read from documentElement (html) — always the authoritative source */
  const currentTheme = document.documentElement.getAttribute('data-theme') ||
                       document.body.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

  /* Apply immediately to both html and body */
  document.documentElement.setAttribute('data-theme', newTheme);
  document.body.setAttribute('data-theme', newTheme);

  /* Keep BOTH settings objects in sync (module-level + state) */
  settings.theme = newTheme;
  if (window.state) state.settings = { ...(state.settings || {}), theme: newTheme };

  /* Update icon */
  const iconValue = newTheme === 'dark' ? '🌙' : '☀️';
  ['themeIcon','themeBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = iconValue;
  });

  saveSettingsToStore();
}

function saveSettingsToStore() {
  const merged = { ...(state.settings || {}), ...settings, theme: settings.theme || state.settings?.theme || 'dark' };

  /* Write to IDB: both keys so all read paths get the correct value */
  if (db) {
    try {
      const t = db.transaction(['settings'], 'readwrite').objectStore('settings');
      t.put({ key: 'appSettings', value: merged });
      t.put({ key: 'meta',        value: merged });
    } catch (e) {
      console.warn('[LM] saveSettingsToStore IDB write failed:', e);
    }
  }

  /* Always write to localStorage — primary theme source on startup */
  localStorage.setItem('appSettings', JSON.stringify(merged));

  /* Per-user scoped key */
  const uid = window.LM_Auth?.getCurrentUserId?.();
  if (uid) localStorage.setItem(`lm_u_${uid}_appSettings`, JSON.stringify(merged));

  /* Keep state.settings current */
  if (window.state) state.settings = merged;
  settings = merged;
}
function clearAllData() {
  if (!db) {
    console.error("Database not initialized.");
    return;
  }
  autoBackup();
  if (confirm('This will permanently delete YOUR financial data. Are you sure?')) {
    if (confirm('Last chance! This cannot be undone.')) {
      const profileId = window.LM_Auth?.getCurrentUserId() || null;
      const userDataStores = ['transactions','budgets','loans','reminders','savings',
        'investments','recurringTransactions','audit_logs','auditLog',
        'trips','trip_routes','credentials','notes','note_versions',
        'note_attachments','note_folders','emi_loans','net_worth_snapshots',
        'allocation_targets','sip_plan'];

      if (profileId) {
        /* Delete only current user's records */
        userDataStores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) return;
          const txn = db.transaction(storeName, 'readwrite');
          const store = txn.objectStore(storeName);
          const req = store.openCursor();
          req.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              if (!cursor.value.profile || cursor.value.profile === profileId) {
                cursor.delete();
              }
              cursor.continue();
            }
          };
        });
        /* Clear user-scoped localStorage */
        Object.keys(localStorage).filter(k => k.startsWith(`lm_u_${profileId}_`))
          .forEach(k => localStorage.removeItem(k));
      } else {
        /* Fallback: clear all stores (single-user legacy mode) */
        Array.from(db.objectStoreNames).forEach(storeName => {
          const txn = db.transaction(storeName, 'readwrite');
          txn.objectStore(storeName).clear();
        });
      }

      /* Clear memory arrays */
      state.transactions = [];
      state.budgets = [];   
      state.loans = [];
      state.reminders = [];
      state.users = [];
      state.savings = [];
      state.investments = []; 
      state.notifications = [];
      state.rewards = []; 
      state.trips = [];
      state.routes = [];
      state.credentials = [];
      state.audit_logs = [];
      state.notes = [];
      state.note_folders = [];
      state.note_attachments = [];
      state.note_versions = [];
      state.emi_loans = [];
      state.net_worth_snapshots = [];
      state.allocation_targets = [];
      state.sip_plan = [];
      state.essentials_settings = {};
      renderAll();
      showToast('Your data cleared', 'success');
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
 lastDateObj.setHours(0, 0, 0, 0);
todayDate.setHours(0, 0, 0, 0);

if (t.recurrence.toLowerCase() === "daily") {
  //  True if at least 1 day passed
  shouldAdd = todayDate > lastDateObj;
}

else if (t.recurrence.toLowerCase() === "weekly") {
  const diffDays = Math.floor((todayDate - lastDateObj) / (1000 * 60 * 60 * 24));
  //  True if 7 or more days passed
  shouldAdd = diffDays >= 7;
}

else if (t.recurrence.toLowerCase() === "monthly") {
  const diffMonths =
    (todayDate.getFullYear() - lastDateObj.getFullYear()) * 12 +
    (todayDate.getMonth() - lastDateObj.getMonth());
  //  True if 1 or more months passed
  shouldAdd = diffMonths >= 1 && todayDate.getDate() >= lastDateObj.getDate();
}

else if (t.recurrence.toLowerCase() === "yearly") {
  const diffYears = todayDate.getFullYear() - lastDateObj.getFullYear();
  // True if 1 or more years passed and date reached
  shouldAdd =
    diffYears >= 1 &&
    (todayDate.getMonth() > lastDateObj.getMonth() ||
      (todayDate.getMonth() === lastDateObj.getMonth() && todayDate.getDate() >= lastDateObj.getDate()));
}


    if (shouldAdd) {
      // Prevent duplicate for today
      if (state.transactions.some(x => x.date === t.date && x.recurringOrigin === t.id)) return;
      const newTx = { ...t, id: uid('tx'), date: t.date, recurringOrigin: t.id, createdAt: nowISO1(), modifiedAt: nowISO1() };
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
      <div class="suggestion p-2 text-sm cursor-pointer glass" data-index="${i}" data-text="${s.text}">
        🔍 ${s.text}
      </div>
    `).join('')}
    ${txMatches.map((t, i) => `
      <div class="suggestion p-2 cursor-pointer glass" data-index="${suggestions.length + i}" data-text="${t.note || ''}">
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

function getAccountSummaries() {
  const summaries = {};
  
  state.transactions.forEach(t => {
    if (!summaries[t.account]) {
      summaries[t.account] = { income: 0, expense: 0, balance: 0 };
    }
    if (t.type === 'in') {
      summaries[t.account].income += Number(t.amount);
      summaries[t.account].balance += Number(t.amount);
    } else if (t.type === 'out') {
      summaries[t.account].expense += Number(t.amount);
      summaries[t.account].balance -= Number(t.amount);
    }
  });
  
  return summaries;
}
function renderAccountSummaries() {
  const summaries = getAccountSummaries();
  const container = document.getElementById('accountSummaries');
  container.innerHTML = '';

  for (const account in summaries) {
    const summary = summaries[account];

    const card = document.createElement('div');
    card.className = 'kpi-card teal';

    card.innerHTML = `
      <div class="kpi-icon teal">💼</div>

      <div class="kpi-label">${account}</div>

      <div class="kpi-value amount masked" data-value="${summary.balance}">
        ***
      </div>

      <div class="kpi-sub">
        <span class="chip income">
          + <span class="amount masked" data-value="${summary.income}">***</span>
        </span>

        <span class="chip expense ml-1">
          - <span class="amount masked" data-value="${summary.expense}">***</span>
        </span>
      </div>
    `;

    container.appendChild(card);
  }
}

let amountsVisible = false; // tracks global state

document.getElementById('toggleAllAmounts').onclick = () => {
  amountsVisible = !amountsVisible; // toggle state
  const amounts = document.querySelectorAll('#accountSummaries .amount');

  amounts.forEach(a => {
    if (amountsVisible) {
      a.textContent = fmtINR(a.dataset.value);
      a.classList.remove('masked');
    } else {
      a.textContent = '***';
      a.classList.add('masked');
    }
  });

  // Update button text
 // document.getElementById('toggleAllAmounts').textContent = amountsVisible ? '🙈 Hide All Amounts' : '👁 Show All Amounts';
};
// ====================== STEP 7: Sync Drive to IndexedDB ======================
async function syncDriveToIndexedDB(driveData) {
  try {
    console.log("🔄 Syncing Drive data to IndexedDB...");

    const dbStores = Array.from(db.objectStoreNames); // existing IDB stores

    for (const store of Object.keys(driveData)) {

      // ⚠️ Skip unknown / missing stores
      if (!dbStores.includes(store)) {
        console.warn(`⛔ Skipping unknown store: ${store}`);
        continue;
      }

      // ⚠️ Skip settings if you don't want to overwrite local settings
      if (store === "settings") continue;

      await put(store, driveData[store]);
    }

    console.log("✅ Drive data synced to IndexedDB");

  } catch (err) {
    console.error("❌ Sync failed:", err);
  }
}
async function loadFromDrive() {
  try {
    // 1. Check if auto-load is enabled
    if (!DriveSync.isAutoLoadEnabled()) {
      console.log("⏭️ Auto-load disabled, skipping Drive load");
      return;
    }

    // 2. Ensure connected
    if (!DriveSync.isConnected()) {
      console.log("⏭️ Not connected to Drive, skipping auto load");
      return;
    }

    // 3. Determine mode (latest / pinned)
    const mode = DriveSync.getAutoLoadMode();
    let fileId = null;

    if (mode === "pinned") {
      fileId = DriveSync.getAutoLoadFileId();
      if (!fileId) {
        console.log("⏭️ No pinned file set, falling back to latest");
      }
    }

    // 4. Get latest file (fallback or mode=latest)
    if (!fileId) {
      const latest = await DriveSync.getLatestBackupFile();
      if (!latest) {
        console.log("⏭️ No backups found on Drive");
        return;
      }
      fileId = latest.id;
    }

  //  console.log("📥 Loading from Drive File:", fileId);

    // 5. Download backup
    DriveSync.restoreBackup(fileId,"Drive");
  } catch (err) {
    console.error("❌ Drive load failed:", err);
    console.log("⏭️ Falling back to IndexedDB");
  }
}


async function FinalJson(){
  const userId = window.LM_Auth?.getCurrentUserId?.() || 'default';
  const payload = {
    transactions       : state.transactions,
    budgets            : state.budgets,
    loans              : state.loans,
    reminders          : state.reminders,
    dropdowns          : state.dropdowns,
    settings           : state.settings,
    appSettings        : settings,       /* theme + kpiRange */
    users              : state.users,
    savings            : state.savings,
    investments        : state.investments,
    trips              : state.trips,
    routes             : state.routes,
    credentials        : state.credentials,
    notes              : state.notes,
    note_folders       : state.note_folders,
    note_attachments   : state.note_attachments,
    note_versions      : state.note_versions,
    emi_loans          : state.emi_loans,
    net_worth_snapshots: state.net_worth_snapshots,
    allocation_targets : state.allocation_targets,
    sip_plan           : state.sip_plan,
    essentials_settings: state.essentials_settings,
    audit_logs         : state.audit_logs,
    meta: {
      exportedAt   : new Date().toISOString(),
      exportedBy   : window.LM_Auth?.getCurrentUser?.()?.username || 'user',
      profileId    : userId,
      version      : '2.0'
    }
  };
  return JSON.stringify(payload, null, 2);
}

// ====================== STEP 9: Auto Backup to Drive ======================
async function autoBackupToDrive() {
  try {
    if (!DriveSync.isConnected()) {
      console.log("⏭️ Drive not connected, skipping backup");
      return;
    } 
    console.log("📤 Auto-backing up to Drive...");
    const txt = await FinalJson();
    await DriveSync.autoBackupIfDue(txt);

  } catch (err) {
    console.warn("⚠️ Auto backup failed:", err);
  }
}
// ----------------------------
// Start
// ----------------------------
//init();
/* ─── LM_StartApp: called by AuthManager after login ─── */
window.LM_StartApp = async function LM_StartApp() {
  // Re-apply store patches after DB is open
  if (typeof window.LM_applyStorePatch === 'function') window.LM_applyStorePatch();
  try {
    await openDB();
    await seedDefaults();
  } catch (err) {
    console.error("❌ Failed to open IndexedDB:", err);
    return;
  }
  try {
  try {
    // Step 1: Check if Drive auto-load is enabled
    const isDriveEnabled = DriveSync.isAutoLoadEnabled();
    const isConnected = DriveSync.isConnected(); 
    if (isDriveEnabled && isConnected) {
      console.log("☁️ Drive auto-load enabled, loading from Drive...");
      await loadFromDrive();
    } else {
      console.log("💾 Loading from IndexedDB..."); 
    }

    //console.log("✅ App initialized successfully");
   // console.log("📊 Current state:", state);

  } catch (err) {
    console.error("❌ Initialization error:", err);
    // Fallback to IndexedDB if Drive fails 
  }
      await loadAllFromDB();

    // const isFresh =
    //   (state.transactions || []).length === 0 &&
    //   (state.budgets || []).length === 0 &&
    //   (state.loans || []).length === 0 &&
    //   (state.users || []).length === 0;

    // if (isFresh) await tryAutoRestoreOnStart(); 
    startBackupSchedule();
    //autoBackup(); 
    bindUI();
    if (typeof renderAll === "function") {
    renderAll();
    } 
   // tryAutoLoadFolder();
   // checkAllNotifications();
   // setInterval(checkAllNotifications, 60 * 60 * 1000);
    processRecurringTransactions();
    setInterval(processRecurringTransactions, 60 * 60 * 1000); 
    setGreeting();

    /* ── Signal that the app is fully booted ─────────── */
    window.LM_DB_READY = true;
    if (window.LM_Bus) {
      LM_Bus.emit('lm:app:ready', { user: window.LM_Auth?.getCurrentUser() });
      LM_Bus.emit('lm:auth:login', { user: window.LM_Auth?.getCurrentUser() });
    }
    /* Kick off notification polling after DB is ready */
    if (typeof window.checkAllNotifications === 'function') {
      window.checkAllNotifications();
      setInterval(window.checkAllNotifications, 60 * 60 * 1000);
    }
    
  } catch (err) {
    console.error('Startup error', err);
  }
}; /* end LM_StartApp */

/* ─── Last-page restore (runs after LM_StartApp completes) ─── */
window._LM_restoreLastPage = function() {
  const userId   = window.LM_Auth?.getCurrentUserId() || 'default';
  const uKey     = `lm_u_${userId}_lastPage`;
  const lastPage = localStorage.getItem(uKey) || localStorage.getItem('ledgerMate_lastPage') || 'dashboard';
  if (typeof showPage === 'function') showPage(lastPage);
};
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const menuBtn = document.getElementById("menuBtn");

menuBtn.addEventListener("click", () => {
  sidebar.classList.toggle("-translate-x-full");
  sidebarOverlay.classList.toggle("hidden");
});

sidebarOverlay.addEventListener("click", () => {
  sidebar.classList.add("-translate-x-full");
  sidebarOverlay.classList.add("hidden");
});
document.getElementById("year").textContent = new Date().getFullYear();
const helpModal = document.getElementById("helpModal");
const closeHelpModal = document.getElementById("closeHelpModal");
const closeHelpBtn = document.getElementById("closeHelpBtn");

// Open modal (attach this to a button somewhere in sidebar/header)
document.getElementById("openHelpBtn")?.addEventListener("click", () => {
  helpModal.classList.remove("hidden");
  helpModal.classList.add("flex");
});

// Close modal
closeHelpModal.addEventListener("click", () => {
  helpModal.classList.add("hidden");
  helpModal.classList.remove("flex");
});
closeHelpBtn.addEventListener("click", () => {
  helpModal.classList.add("hidden");
  helpModal.classList.remove("flex");
});

// Close modal when clicking outside the content
helpModal.addEventListener("click", (e) => {
  if (e.target === helpModal) {
    helpModal.classList.add("hidden");
    helpModal.classList.remove("flex");
  }
});

/* =========================
   SAFETY HELPERS
   ========================= */
function calcGrowthRate(current, previous) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function daysAgoISO(n) {
  var d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/* =========================
   SUM, GROUP, FILTER
   ========================= */
function sumBy(arr, key) {
  return arr.reduce((s, x) => s + Number(x[key] || 0), 0);
}

function groupBy(arr, key) {
  return arr.reduce((grp, x) => {
    let v = x[key] || "Unspecified";
    if (!grp[v]) grp[v] = [];
    grp[v].push(x);
    return grp;
  }, {});
}
function filterByRange(transactions, startDate, endDate) {
  const s = new Date(startDate);
  const e = new Date(endDate);

  s.setHours(0, 0, 0, 0);
  e.setHours(23, 59, 59, 999);

  return transactions.filter(t => {
    const d = new Date(t.date);
    return d >= s && d <= e;
  });
}

/* =========================
   FIXED FORECAST LOGIC (ACCURATE)
   ========================= */

function calcMonthlyForecast(expenseList) {
  if (!expenseList.length) return 0;

  // Use last 30 transactions or all if less
  const sorted = [...expenseList].sort((a, b) => new Date(a.date) - new Date(b.date));
  const recent = sorted.slice(-30);

  const total = sumBy(recent, "amount");
  const avgDaily = total / recent.length;

  return Math.round(avgDaily * 30);
}

/* =========================
   KPI CALCULATION
   ========================= */
function calculateKPIs() {
  const today = new Date();
  let startDate, endDate = today;
  let days = parseInt(state.timeRange);

  if (state.timeRange === "custom" && state.customRange.start && state.customRange.end) {
    startDate = new Date(state.customRange.start);
    endDate = new Date(state.customRange.end);
    days = Math.max(1, Math.floor((endDate - startDate) / 86400000) + 1);
  } else {
    if (!days || days <= 0) days = 30;
    startDate = new Date();
    startDate.setDate(today.getDate() - days + 1);
  }

  const rangeTx = filterByRange([...state.transactions], startDate, endDate);

  const income = sumBy(rangeTx.filter((t) => t.type === "in"), "amount");
  const expense = sumBy(rangeTx.filter((t) => t.type === "out"), "amount");

  const balance = state.transactions.reduce((s, t) =>
    s + (t.type === "in" ? +t.amount : -t.amount),
    0
  );

  const profitLoss = income - expense;

  /* Growth calculation */
  let prevStart = new Date(startDate);
  prevStart.setDate(prevStart.getDate() - days);

  let prevEnd = new Date(startDate);
  prevEnd.setDate(prevEnd.getDate() - 1);

  const prevTx = filterByRange([...state.transactions], prevStart, prevEnd);

  const prevIncome = sumBy(prevTx.filter((t) => t.type === "in"), "amount");
  const prevExpense = sumBy(prevTx.filter((t) => t.type === "out"), "amount");

  const incomeGrowth = calcGrowthRate(income, prevIncome);
  const expenseGrowth = calcGrowthRate(expense, prevExpense);

  /* Categories */
  const catGroup = groupBy(rangeTx.filter((t) => t.type === "out"), "category");
  const topCategories = Object.entries(catGroup)
    .map(([k, v]) => ({ category: k, amount: sumBy(v, "amount") }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  /* Avg */
  const avgDailyIncome = days > 0 ? income / days : 0;
  const avgDailyExpense = days > 0 ? expense / days : 0;

  const savingsRate = income ? (((income - expense) / income) * 100).toFixed(1) : 0;

  /* FIXED FORECAST */
  const recentExpenses = state.transactions.filter((t) => t.type === "out");
  const expenseForecast = calcMonthlyForecast(recentExpenses);

  /* Accounts */
  const accGroup = groupBy(state.transactions, "account");
  // const accountSummary = Object.entries(accGroup).map(([acc, tx]) => ({
  //   account: acc,
  //   balance: tx.reduce((s, t) => s + (t.type === "in" ? +t.amount : -t.amount), 0),
  // }));

  return {
    balance,
    income,
    expense,
    profitLoss,
    incomeGrowth,
    expenseGrowth,
    topCategories,
    avgDailyIncome,
    avgDailyExpense,
    savingsRate,
    expenseForecast,
    // accountSummary,
    days,
  };
}

/* =========================
   RENDER KPI (ULTRA-COMPACT)
   ========================= */
  function kpiCard(title, value, sub, type) {

  const typeMap = {
    blue: "teal",
    green: "emerald",
    red: "rose",
    purple: "violet",
    teal: "teal"
  };

  const cls = typeMap[type] || "teal";

  return `
    <div class="kpi-card ${cls}">
      
      <div class="kpi-icon ${cls}">
        ${getKpiIcon(title)}
      </div>

      <div class="kpi-label">${title}</div>

      <div class="kpi-value">${value}</div>

      <div class="kpi-sub">${sub}</div>

    </div>
  `;
}
function getKpiIcon(title) {
  switch (title) {
    case "Balance": return "💼";
    case "Income": return "📈";
    case "Expense": return "📉";
    case "Profit/Loss": return "💰";
    case "Forecast": return "🔮";
    default: return "📊";
  }
}

/* =========================
   RENDER DASHBOARD
   ========================= */

function renderKPIs() {
  const k = calculateKPIs();
  const row = document.getElementById("kpiCards");
  if (!row) return;

  row.innerHTML = `
  ${kpiCard("Balance", fmtINR(k.balance), "All accounts", "blue")}
  ${kpiCard("Income", fmtINR(k.income), k.days + " days", "green")}
  ${kpiCard("Expense", fmtINR(k.expense), k.days + " days", "red")}
  ${kpiCard("Profit/Loss", fmtINR(k.profitLoss), k.savingsRate + "% saved", "purple")}
  ${kpiCard("Forecast", fmtINR(k.expenseForecast), "Next 30 days", "teal")}
`;


  /* Top Categories */
 
const topCatEl = document.getElementById("topCategories");
const colors = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#a855f7", // purple
];

let index = 0;

topCatEl.innerHTML = k.topCategories
  .map(cat => {
    const color = colors[index++ % colors.length];
    const amount = cat.amount;
    const percent = ((amount / k.expense) * 100).toFixed(1);

    return `
      <div class="glass rounded-md p-2 mb-2"
           style="background:linear-gradient(135deg, ${color}22, ${color}15); border:1px solid ${color}33">
        
        <div class="flex justify-between mb-1">
          <span style="color: var(--text); font-weight:600; font-size:14px;">
            ${cat.category}
          </span>
          <span style="color: var(--text); font-weight:600;">
            ${fmtINR(amount)}
          </span>
        </div>

        <div class="flex justify-between text-[11px] text-muted mb-1">
          <span>${percent}%</span>
          <span>Total: ${fmtINR(k.expense)}</span>
        </div>

        <div class="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded overflow-hidden">
          <div class="h-2 rounded"
               style="width:${percent}%; background:${color};">
          </div>
        </div>

      </div>
    `;
  }).join("");


  /* Forecast */
  document.getElementById("forecastExpense").innerText = fmtINR(k.expenseForecast);
  document.getElementById("forecastIncome").innerText = fmtINR(k.expenseForecast / 0.8);

  /* Accounts */
  // document.getElementById("accountSummary").innerHTML = k.accountSummary
  //   .map(
  //     (a) => `
  //     <div class="glass rounded-md p-2 flex justify-between text-sm" style="color: var(--text);">
  //       <span>${a.account}</span>
  //       <span>${fmtINR(a.balance)}</span>
  //     </div>`
  //   )
  //   .join("");

  /* Stats */
  document.getElementById("totalTx").innerText = state.transactions.length;
  document.getElementById("avgDailyIncome").innerText = fmtINR(k.avgDailyIncome);
  document.getElementById("avgDailyExpense").innerText = fmtINR(k.avgDailyExpense);
  document.getElementById("savingsRate").innerText = k.savingsRate + "%";
   renderAccountSummaries();
}

/* =========================
   Button Theme Fix
   ========================= */
function setTimeRange(range) {
  state.timeRange = range;

  ["7","30","90","365","custom"].forEach(r => {
    const btn = document.getElementById("btn-" + r);
    if (!btn) return;

    if (r === range) {
     btn.classList.toggle("active", r === range);
      btn.style.color = "#fff";
      btn.style.border = "none";
    } else {
     btn.classList.toggle("active", r === range);
      btn.style.color = "var(--input-text)";
      btn.style.border = "1px solid var(--input-border)";
    }
  });

 document.getElementById("customRangeInputs")
  .style.display = range === "custom" ? "grid" : "none";

  renderKPIs();   // ← this refreshes dashboard correctly
}

/* =========================
   INIT
   ========================= */

document.getElementById("customStart").onchange = function (e) {
  state.customRange.start = e.target.value;
  if (state.customRange.end) renderKPIs();
};

document.getElementById("customEnd").onchange = function (e) {
  state.customRange.end = e.target.value;
  if (state.customRange.start) renderKPIs();
};
/* ================================
   CONNECT RANGE BUTTON CLICK EVENTS
   ================================ */
document.addEventListener("DOMContentLoaded", function () {

  const ranges = ["7", "30", "90", "365", "custom"];

  ranges.forEach(r => {
    const btn = document.getElementById("btn-" + r);
    if (btn) {
      btn.addEventListener("click", function () {
        setTimeRange(r);
      });
    }
  });

});
async function loadSettings() {
  /* Guard: DB not open yet → resolve immediately, theme comes from localStorage */
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const t   = db.transaction(['settings'], 'readonly');
      const s   = t.objectStore('settings');
      const req = s.get('appSettings');
      req.onsuccess = () => {
        if (req.result && req.result.value) settings = req.result.value;
        resolve();
      };
      req.onerror = () => resolve();
    } catch (e) {
      /* IDB not ready – resolve silently */
      resolve();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  /* Apply theme synchronously from best available source */
  let loaded = {};
  try {
    /* 1. Try user-scoped key first (most recent save) */
    const uid = window.LM_Auth?.getCurrentUserId?.();
    if (uid && uid !== 'default') {
      const raw = localStorage.getItem(`lm_u_${uid}_appSettings`);
      if (raw) loaded = JSON.parse(raw);
    }
    /* 2. Fallback to shared appSettings */
    if (!loaded.theme) {
      const raw = localStorage.getItem('appSettings');
      if (raw) loaded = JSON.parse(raw);
    }
  } catch {}

  /* Merge into module-level settings */
  settings = { ...loaded };

  /* Apply theme to BOTH html and body */
  const theme = settings.theme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  document.body.setAttribute('data-theme', theme);

  /* Sync icon */
  const iconValue = theme === 'dark' ? '🌙' : '☀️';
  const icon = document.getElementById('themeIcon');
  if (icon) icon.textContent = iconValue;
});


function renderBudgetOverview() {
  const wrap = document.getElementById('budgetOverview');
  const month = new Date().toISOString().slice(0,7);
  const monthBudgets = state.budgets.filter(b=>b.month===month);
  if (!monthBudgets.length) {
    wrap.innerHTML = '<div class="empty-state" style="padding:24px"><div class="empty-state-icon">🎯</div><div class="empty-state-text">No budgets set for this month. <button style="color:var(--teal);background:none;border:none;cursor:pointer;font-size:13px;" onclick="showBudgetsModal();">Add one →</button></div></div>';
    return;
  }
  wrap.innerHTML = monthBudgets.map(b => {
    const actual = state.transactions.filter(t=>t.type==='out'&&t.category===b.category&&t.date.startsWith(month)).reduce((s,t)=>s+(+t.amount||0),0);
    const pct = b.limit > 0 ? Math.min(Math.round((actual/b.limit)*100), 100) : 0;
    const cls = pct>90 ? 'over' : pct>70 ? 'warn' : 'safe';
    return `<div class="budget-item">
      <div class="budget-item-header">
        <span class="budget-item-name">${b.category}</span>
        <span class="budget-item-amounts">${fmtINR(actual)} / ${fmtINR(b.limit)}</span>
      </div>
      <div class="budget-bar-bg"><div class="budget-bar-fill ${cls}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}

/* ─────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────── */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  sb.classList.toggle('open');
  ov.classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}
document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
document.addEventListener('click', function (e) {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');
  const moreBtn = document.getElementById('bnav-more');    
 
  if (
    !sidebar.contains(e.target) &&
    !menuBtn.contains(e.target) &&
    !moreBtn.contains(e.target)
  ) {
    closeSidebar();
  }
});

document.getElementById('bottomNav').addEventListener('click', function(e) {
  const btn = e.target.closest('.bnav-item');
  if (!btn) return;

  const page = btn.id.replace('bnav-', '');

  // The "More" button just toggles the sidebar, not a page
  if (page === 'more') {
    toggleSidebar();
    return;
  }

  // Update bottom‑nav active state immediately
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Now switch the page
  showPage(page);
});

// ── Dashboard Wealth Summary Widget ──────────────────────────
function renderDashboardWealthWidget() {
  const wrap = document.getElementById('dashWealthWidget');
  if (!wrap) return;

  const investments = state.investments || [];
  const emiLoans    = state.emi_loans   || [];

  const totalAssets      = investments.reduce((s,a) => {
    const qty    = parseFloat(a.qty || a.stockQty || 0) || 0;
    const buyP   = parseFloat(a.buyPrice || a.avgCost || a.stockBuyPrice || 0) || 0;
    const curP   = parseFloat(a.currentPrice || a.ltp || a.stockCurrentPrice || buyP) || 0;
    const t      = (a.type || '').toUpperCase();
    const simple = ['GOLD','SILVER','PHYSICAL','COMMODITY','STOCK'];
    if (simple.includes(t)) return s + qty * (curP || buyP);
    return s + (parseFloat(a.principal || a.currentValue || a.amount || 0) || 0);
  }, 0);
  const totalLiabilities = emiLoans.reduce((s,l) => s + (parseFloat(l.outstanding) || 0), 0);
  const netWorth         = totalAssets - totalLiabilities;
  const invested         = investments.reduce((s,a) => {
    const qty  = parseFloat(a.qty || a.stockQty || 0) || 0;
    const buyP = parseFloat(a.buyPrice || a.avgCost || a.stockBuyPrice || 0) || 0;
    const t    = (a.type || '').toUpperCase();
    const simple = ['GOLD','SILVER','PHYSICAL','COMMODITY','STOCK'];
    if (simple.includes(t)) return s + qty * buyP;
    return s + (parseFloat(a.principal || a.amount || 0) || 0);
  }, 0);
  const pnl  = totalAssets - invested;
  const pnlP = invested > 0 ? ((pnl / invested) * 100).toFixed(1) : 0;

  if (investments.length === 0 && emiLoans.length === 0) {
    wrap.innerHTML = `
      <div class="chart-card" style="text-align:center;padding:24px;">
        <div style="font-size:28px;margin-bottom:8px;">💼</div>
        <div style="font-size:14px;color:var(--text-3);margin-bottom:12px;">No wealth data yet</div>
        <button class="btn-submit" style="width:auto;padding:8px 20px;margin:0;font-size:13px;" onclick="showPage('wealth')">Set Up Wealth →</button>
      </div>`;
    return;
  }

  wrap.innerHTML = `
    <div class="chart-card">
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:14px;">
        <div>
          <div class="kpi-label">NET WORTH</div>
          <div style="font-family:var(--font-m);font-size:clamp(18px,3vw,24px);font-weight:700;color:${netWorth>=0?'var(--teal)':'var(--rose)'};">${fmtINR(netWorth)}</div>
        </div>
        <div>
          <div class="kpi-label">ASSETS</div>
          <div style="font-family:var(--font-m);font-size:clamp(18px,3vw,24px);font-weight:700;color:var(--emerald);">${fmtINR(totalAssets)}</div>
        </div>
        <div>
          <div class="kpi-label">P&amp;L</div>
          <div style="font-family:var(--font-m);font-size:16px;font-weight:600;color:${pnl>=0?'var(--emerald)':'var(--rose)'};">${pnl>=0?'+':''}${fmtINR(pnl)} <span style="font-size:11px;">(${pnlP}%)</span></div>
        </div>
        <div>
          <div class="kpi-label">LIABILITIES</div>
          <div style="font-family:var(--font-m);font-size:16px;font-weight:600;color:${totalLiabilities>0?'var(--rose)':'var(--text-3)'};">${fmtINR(totalLiabilities)}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="section-action" onclick="showPage('wealth')">📊 View Wealth →</button>
        <button class="section-action" onclick="showPage('essentials')">🛡️ Health Check →</button>
      </div>
    </div>`;
}