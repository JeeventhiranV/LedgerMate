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
        const DB_VERSION = 16;

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
            ensureStore("essentials_settings", { keyPath: "id", autoIncrement: true }, ["key", "profile"]);
            ensureStore("savings_goals",       { keyPath: "id", autoIncrement: true }, ["profile", "targetDate"]);
            ensureStore("subscriptions",       { keyPath: "id", autoIncrement: true }, ["profile"]);
            ensureStore("fd_rd",               { keyPath: "id", autoIncrement: true }, ["profile"]);
            ensureStore("tx_templates",        { keyPath: "id", autoIncrement: true }, ["profile"]);
            ensureStore("dashboard_config",    { keyPath: "id" });
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
  essentials_settings: {},
  savings_goals: [],
  subscriptions: [],
  fd_rd: [],
  tx_templates: [],
  dashboard_config: {}
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
  // settings defaults — seeded per user so each user gets independent defaults
  const seedUserId = window.LM_Auth?.getCurrentUserId?.() || 'default';
  const seedKey    = `${seedUserId}_appSettings`;
  const settingsAll = await getAll('settings');
  const hasUserSettings = settingsAll.find(x => x.key === seedKey);
  if (!hasUserSettings) {
    /* Inherit from legacy shared key if present, else start fresh */
    const legacyRec = settingsAll.find(x => x.key === 'appSettings') ||
                      settingsAll.find(x => x.key === 'meta');
    const defaultSettings = legacyRec?.value || { theme: 'dark', kpiRange: 90, currency: 'INR' };
    await put('settings', { key: seedKey, value: defaultSettings });
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
  const userId = window.LM_Auth?.getCurrentUserId?.() || 'default';
  const userSettingsKey = `${userId}_appSettings`;

  /* 1. Look for user-scoped IDB record (written by new saveSettingsToStore) */
  const userRec = settingsAll.find(x => x.key === userSettingsKey);
  /* 2. Fall back to legacy shared keys for existing installations */
  const legacyAppRec = settingsAll.find(x => x.key === 'appSettings');
  const legacyMetaRec = settingsAll.find(x => x.key === 'meta');

  /* 3. Check user-scoped localStorage (fastest, set on last save) */
  let lsSettings = null;
  try {
    const raw = localStorage.getItem(`lm_u_${userId}_appSettings`);
    if (raw) lsSettings = JSON.parse(raw);
  } catch {}

  /* Preference order: user-scoped IDB → user-scoped LS → legacy IDB → defaults */
  const loadedSettings = userRec?.value || lsSettings || legacyAppRec?.value || legacyMetaRec?.value || {};

  /* If we loaded from legacy shared record, migrate it immediately to user-scoped */
  if (!userRec && (legacyAppRec || legacyMetaRec)) {
    try {
      const t = db.transaction(['settings'], 'readwrite').objectStore('settings');
      t.put({ key: userSettingsKey, value: loadedSettings });
    } catch {}
  }

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
  /* essentials_settings: now profile-scoped (records have {key, value, profile, id}) */
  const esAll = await getAll('essentials_settings');
  state.essentials_settings = esAll.reduce((acc, x) => ({ ...acc, [x.key]: x.value }), {});

  /* savings_goals: per-user goals store */
  if (db && db.objectStoreNames.contains('savings_goals')) {
    state.savings_goals = await getAll('savings_goals');
  } else {
    state.savings_goals = [];
  }
  if (db && db.objectStoreNames.contains('subscriptions')) {
    state.subscriptions = await getAll('subscriptions');
  } else {
    state.subscriptions = [];
  }
  if (db && db.objectStoreNames.contains('fd_rd')) {
    state.fd_rd = await getAll('fd_rd');
  } else {
    state.fd_rd = [];
  }
  if (db && db.objectStoreNames.contains('tx_templates')) {
    state.tx_templates = await getAll('tx_templates');
  } else {
    state.tx_templates = [];
  }
  if (db && db.objectStoreNames.contains('dashboard_config')) {
    const dc = await getAll('dashboard_config');
    state.dashboard_config = dc[0] || { id: 'main', widgets: null };
  } else {
    state.dashboard_config = { id: 'main', widgets: null };
  }

  // restore folder handle if present
  const fh = settingsAll.find(x => x.key === `${userId}_dataFolderHandle` || x.key === 'dataFolderHandle');
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

  // Global keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openAddTransactionModal(); }
    if (e.key === '/' || e.key === 'f') { e.preventDefault(); document.getElementById('searchTx')?.focus(); }
    if (e.key === 'd') { e.preventDefault(); showPage('dashboard'); }
    if (e.key === 't') { e.preventDefault(); showPage('transactions'); }
  });

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
  fi.onchange = async(e)=>{ const f = e.target.files[0]; if (!f) return; const txt = await f.text(); if (f.name.endsWith('.csv')) await smartImportCSV(txt); else await fullImportJSONText(txt); }
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
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:6px;">
          <input type="checkbox" id="budgetRollover" style="width:15px;height:15px;">
          <span>Rollover unspent budget to next month</span>
        </label>
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
      const rollover = document.getElementById('budgetRollover')?.checked || false;
      const budget = { id: uid('budget'), month, category: cat, limit, alertThreshold, rollover };
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
    const rawPct = b.limit>0?Math.round((actual/b.limit)*100):0;
    const pct = Math.min(rawPct,100);
    const cls = rawPct>=100?'over':pct>90?'danger':pct>70?'warning':'safe';
    return `<div class="list-item" style="flex-direction:column; align-items:stretch;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div><div class="list-item-name">${b.category}</div><div class="list-item-sub">${fmtINR(actual)} / ${fmtINR(b.limit)} (${rawPct}%)</div></div>
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

function closeSimpleModal() {
  const modals = document.getElementById('modals');
  if (modals) modals.innerHTML = '';
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
  try { applyDashboardConfig(); } catch(e) {}
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
    el.title = `${d.toLocaleDateString('en-IN', {day:'numeric',month:'short'})}: ₹${total.toLocaleString('en-IN')}`;

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

  // Category color palette for dots
  const CAT_COLORS = {
    Food:'#f59e0b', Transport:'#3b82f6', Bills:'#8b5cf6', Shopping:'#ec4899',
    Salary:'#10b981', Healthcare:'#06b6d4', Entertainment:'#f97316',
    Education:'#6366f1', Housing:'#84cc16', Loan:'#ef4444', Snacks:'#fb923c', Other:'#94a3b8'
  };

  // Highlight search term in text
  const hlText = (text, term) => {
    if (!term || !text) return text || '';
    const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return String(text).replace(re, '<mark>$1</mark>');
  };

  items.forEach((t) => {
    const row = document.createElement('div');
    row.className = 'tx-item';

    // Category icon map
    const iconMap = { Food:'🍽️', Transport:'🚗', Bills:'💡', Shopping:'🛍️', Salary:'💼', Healthcare:'🏥', Entertainment:'🎬', Education:'📚', Housing:'🏠', Loan:'💸', Snacks:'🧆', Other:'💳' };
    const icon = iconMap[t.category] || '💳';
    const typeCls = t.type === 'in' ? 'income' : 'expense';
    const catDotColor = CAT_COLORS[t.category] || 'var(--text-3)';
    const simpleQ = (q && !q.includes(':') && !q.match(/^amount/)) ? q : '';

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
          <!-- Icon dot with category color ring -->
          <div class="tx-icon-dot ${typeCls}" style="box-shadow:0 0 0 2px ${catDotColor}44;">${icon}</div>

          <!-- Text block -->
          <div class="tx-text">
            <div class="tx-title">${hlText(t.note || '(No Note)', simpleQ)}</div>
            <div class="tx-meta">
              <span class="tx-category" style="display:inline-flex;align-items:center;gap:3px;">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${catDotColor};flex-shrink:0;"></span>
                ${hlText(t.category || 'Uncategorized', simpleQ)}
              </span>
              <span class="tx-meta-sep">·</span>
              <span class="tx-meta-acc">${hlText(t.account || '—', simpleQ)}</span>
              <span class="tx-meta-sep">·</span><span class="tx-time">${t.date}</span>
              ${recurrenceBadge}${autoBadge}
            </div>
          </div>
        </div>

        <div class="tx-right">
          <div class="tx-amount ${typeCls}">${t.type === 'in' ? '+' : '−'}${fmtINR(t.amount)}</div>
          <div class="tx-actions">
            <button data-id="${t.id}" class="editTx"  title="Edit">✏️</button>
            <button data-id="${t.id}" class="splitTx" title="Split">✂️</button>
            <button data-id="${t.id}" class="delTx"   title="Delete">🗑️</button>
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
  document.querySelectorAll('.splitTx').forEach((btn) =>
    btn.onclick = (e) => openSplitModal(e.target.dataset.id)
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

  // Apply dropdown defaults when not prefilling
  const defAcct = getDropdownDefault('accounts');
  const defCat  = getDropdownDefault('categories');
  const defRecur = getDropdownDefault('recurrences');
  prefill.account    = prefill.account    || defAcct || 'Cash';
  prefill.category   = prefill.category   || defCat  || 'Food';
  prefill.recurrence = prefill.recurrence || defRecur || 'None';

  ensureDropdownKey('recurrences');
  const recurrences = state.dropdowns.recurrences || ['None','Daily','Weekly','Monthly','Yearly'];
  const accounts    = state.dropdowns.accounts    || ['Cash'];
  const categories  = state.dropdowns.categories  || ['Food','Other'];

  // Quick-amount chips
  const amtChips = [100, 500, 1000, 2000, 5000, 10000];

  // Category icon map
  const CAT_ICONS = {
    food:'🍔', groceries:'🛒', transport:'🚗', travel:'✈️',
    entertainment:'🎬', shopping:'🛍️', bills:'💡', health:'🏥',
    salary:'💼', rent:'🏠', education:'📚', finance:'📈', other:'📌'
  };
  const getCatIcon = c => CAT_ICONS[c?.toLowerCase()] || '📌';

  const modalHTML = `
    <div class="modal-overlay" id="addTxOverlay">
      <div class="modal atx-modal">
        <div class="modal-header" style="padding:16px 20px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:34px;height:34px;background:linear-gradient(135deg,var(--teal),var(--violet));border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;">➕</div>
            <div>
              <div class="modal-title" style="font-size:15px;">New Transaction</div>
              <div style="font-size:11px;color:var(--text-3);font-family:var(--font-m);">Press Esc to cancel</div>
            </div>
          </div>
          <button id="cancelTx" class="modal-close">×</button>
        </div>
        <div class="modal-body" style="padding:16px 20px 20px;">
          <form id="txForm" autocomplete="off">

            <!-- TEMPLATE QUICK-PICK -->
            ${(state.tx_templates || []).length ? `
            <div class="atx-tpl-bar">
              <span class="atx-tpl-bar-label">📋 Templates</span>
              <div class="atx-tpl-chips">
                ${(state.tx_templates || []).map(t => `
                  <button type="button" class="atx-tpl-chip" onclick="applyTplToForm(${t.id})">
                    ${t.type==='in'?'📈':'💸'} ${t.name}
                  </button>`).join('')}
              </div>
            </div>` : ''}

            <!-- TYPE TOGGLE -->
            <div class="atx-type-toggle" id="atxTypeToggle">
              <button type="button" class="atx-type-btn expense ${(!prefill.type || prefill.type==='out') ? 'active' : ''}" data-val="out">
                <span class="atx-type-icon">💸</span> Expense
              </button>
              <button type="button" class="atx-type-btn income ${prefill.type==='in' ? 'active' : ''}" data-val="in">
                <span class="atx-type-icon">💰</span> Income
              </button>
              <button type="button" class="atx-type-btn transfer ${prefill.type==='transfer' ? 'active' : ''}" data-val="transfer">
                <span class="atx-type-icon">🔄</span> Transfer
              </button>
            </div>
            <input type="hidden" id="tx_type" value="${prefill.type || 'out'}">

            <!-- AMOUNT -->
            <div class="atx-amount-wrap">
              <span class="atx-currency-symbol">₹</span>
              <input id="tx_amount" type="number" step="0.01" inputmode="decimal"
                     class="atx-amount-input" placeholder="0.00"
                     value="${prefill.amount || ''}" required autofocus />
            </div>
            <!-- Quick chips -->
            <div class="atx-chips">
              ${amtChips.map(v => `<button type="button" class="atx-chip" data-amt="${v}">+${v >= 1000 ? (v/1000)+'k' : v}</button>`).join('')}
              <button type="button" class="atx-chip atx-chip-clear" id="atxClearAmt">✕ Clear</button>
            </div>

            <!-- DATE + ACCOUNT ROW -->
            <div class="atx-row">
              <div class="atx-field">
                <label class="form-label">Date</label>
                <input id="tx_date" type="date" value="${today}" class="form-input" required />
              </div>
              <div class="atx-field">
                <label class="form-label">Account
                  ${defAcct ? `<span class="dd-default-badge" style="margin-left:4px;">DEFAULT</span>` : ''}
                </label>
                <select id="tx_account" class="form-input">
                  ${accounts.map(a => `<option value="${a}" ${a === prefill.account ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- CATEGORY GRID -->
            <div class="atx-field" style="margin-bottom:14px;">
              <label class="form-label">Category
                ${defCat ? `<span class="dd-default-badge" style="margin-left:4px;">DEFAULT</span>` : ''}
              </label>
              <div class="atx-cat-grid" id="atxCatGrid">
                ${categories.map(c => `
                  <button type="button" class="atx-cat-chip ${c === prefill.category ? 'active' : ''}" data-cat="${c}">
                    <span>${getCatIcon(c)}</span>
                    <span class="atx-cat-label">${c}</span>
                  </button>`).join('')}
              </div>
              <input type="hidden" id="tx_category" value="${prefill.category}">
            </div>

            <!-- RECURRENCE + NOTE ROW -->
            <div class="atx-row">
              <div class="atx-field">
                <label class="form-label">Recurrence</label>
                <select id="tx_recurrence" class="form-input">
                  ${recurrences.map(r => {
                    const val = r.toLowerCase();
                    return `<option value="${val}" ${val === (prefill.recurrence||'none').toLowerCase() ? 'selected' : ''}>${r}</option>`;
                  }).join('')}
                </select>
              </div>
              <div class="atx-field">
                <label class="form-label">Note / Description</label>
                <input id="tx_note" class="form-input" placeholder="What was this for?"
                       value="${prefill.note || ''}" />
              </div>
            </div>

            <!-- SAVE -->
            <button type="submit" class="btn-submit" style="margin-top:8px;">
              Save Transaction
            </button>
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
  document.getElementById('addTxOverlay').onclick = (e) => {
    if (e.target.id === 'addTxOverlay') closeModal();
  };

  // Keyboard: Esc to close
  const _escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', _escHandler); } };
  document.addEventListener('keydown', _escHandler);

  // Type toggle
  document.querySelectorAll('.atx-type-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.atx-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tx_type').value = btn.dataset.val;
    };
  });

  // Quick-amount chips
  document.querySelectorAll('.atx-chip[data-amt]').forEach(chip => {
    chip.onclick = () => {
      const inp = document.getElementById('tx_amount');
      inp.value = (parseFloat(inp.value) || 0) + parseFloat(chip.dataset.amt);
    };
  });
  const clearBtn = document.getElementById('atxClearAmt');
  if (clearBtn) clearBtn.onclick = () => { document.getElementById('tx_amount').value = ''; };

  // Category grid
  document.querySelectorAll('.atx-cat-chip').forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll('.atx-cat-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      document.getElementById('tx_category').value = chip.dataset.cat;
    };
  });

  document.getElementById('txForm').onsubmit = async (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById('tx_amount').value || 0);
    if (!amount || amount <= 0) {
      document.getElementById('tx_amount').classList.add('input-error');
      showToast('Enter a valid amount', 'error');
      return;
    }
    const txObj = {
      id,
      date: document.getElementById('tx_date').value,
      type: document.getElementById('tx_type').value,
      amount,
      account:    document.getElementById('tx_account').value,
      category:   document.getElementById('tx_category').value,
      recurrence: document.getElementById('tx_recurrence').value,
      note:       document.getElementById('tx_note').value.trim() || '',
      createdAt:  nowISO1()
    };

    // If recurring, also add to recurringTransactions store
    if (txObj.recurrence && txObj.recurrence !== 'none') {
      await put('recurringTransactions', { ...txObj, id: uid('rec'), originalTxId: txObj.id });
    }

    try {
      await put('transactions', txObj);
      state.transactions.push(txObj);
      renderAll();
      closeModal();
      autoBackup();
      const amtStr = fmtINR(amount);
      showToast(`${txObj.type === 'in' ? '💰 Income' : '💸 Expense'} ${amtStr} saved`, 'success');
    } catch (err) {
      showToast('Failed to save transaction', 'error');
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
    essentials_settings: state.essentials_settings || {},
    savings_goals: state.savings_goals || []
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
    if (candidate.name.endsWith('.csv')) await smartImportCSV(txt); else await fullImportJSONText(txt);
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

  /* Determine current user — fall back to 'default' for single-user mode */
  const userId = window.LM_Auth?.getCurrentUserId?.() || 'default';
  const idbKey = `${userId}_appSettings`;

  /* Write to IDB under user-scoped key so each user has independent settings */
  if (db) {
    try {
      const t = db.transaction(['settings'], 'readwrite').objectStore('settings');
      t.put({ key: idbKey, value: merged });
    } catch (e) {
      console.warn('[LM] saveSettingsToStore IDB write failed:', e);
    }
  }

  /* Write ONLY to per-user localStorage key — never to the global bare key */
  localStorage.setItem(`lm_u_${userId}_appSettings`, JSON.stringify(merged));

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
      if (state.transactions.some(x => x.date === today && x.recurringOrigin === t.id)) return;
      const newTx = { ...t, id: uid('tx'), date: today, recurringOrigin: t.id, createdAt: nowISO1(), modifiedAt: nowISO1() };
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
    autoNetWorthSnapshot();
    checkLowBalanceAlert();
    checkSpendingAnomalyAlerts();
    checkBudgetRollover();
    schedulePushNotifications();

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
  function kpiCard(title, value, sub, type, valueColor) {

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

      <div class="kpi-value animate-in" style="color:${valueColor || 'var(--text)'};">${value}</div>

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

  const balanceColor    = k.balance    >= 0 ? 'var(--teal)'    : 'var(--rose)';
  const profitColor     = k.profitLoss >= 0 ? 'var(--emerald)' : 'var(--rose)';

  row.innerHTML = `
  ${kpiCard("Balance",     fmtINR(k.balance),            "All accounts",          "blue",   balanceColor)}
  ${kpiCard("Income",      fmtINR(k.income),             k.days + " days",        "green",  'var(--emerald)')}
  ${kpiCard("Expense",     fmtINR(k.expense),            k.days + " days",        "red",    'var(--rose)')}
  ${kpiCard("Profit/Loss", fmtINR(k.profitLoss),         k.savingsRate + "% saved","purple", profitColor)}
  ${kpiCard("Forecast",    fmtINR(k.expenseForecast),    "Next 30 days",          "teal",   'var(--gold)')}
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

  /* New dashboard widgets */
  try { renderHealthScore(); } catch (e) { console.warn('[LM] renderHealthScore:', e); }
  try { renderNWSparkline(); } catch (e) { console.warn('[LM] NW sparkline:', e); }
  try { renderMoMWidget(); } catch (e) { console.warn('[LM] renderMoMWidget:', e); }
  try {
    if (typeof renderWealthDashboard === 'function') renderWealthDashboard();
    else renderDashboardWealthWidget();
  } catch (e) { console.warn('[LM] wealth widget:', e); }
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
    const rawPct = b.limit > 0 ? Math.round((actual/b.limit)*100) : 0;
    const pct = Math.min(rawPct, 100);
    const cls = rawPct >= 100 ? 'over' : pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'safe';
    const pctLabel = rawPct > 100 ? `<span style="color:var(--rose);font-weight:700;font-size:11px;">+${rawPct-100}% over</span>` : `${rawPct}%`;
    return `<div class="budget-item">
      <div class="budget-item-header">
        <span class="budget-item-name">${b.category}</span>
        <span class="budget-item-amounts">${fmtINR(actual)} / ${fmtINR(b.limit)} &nbsp;${pctLabel}</span>
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

/* ════════════════════════════════════════════════════════════
   PHASE 2A – FINANCIAL HEALTH SCORE
════════════════════════════════════════════════════════════ */
function calculateFinancialHealth() {
  const k = calculateKPIs();
  const month = new Date().toISOString().slice(0, 7);

  // 1. Savings Rate (0–30 pts)
  const savingsRate = parseFloat(k.savingsRate) || 0;
  const savingsPts = savingsRate >= 20 ? 30 : savingsRate >= 10 ? 20 : savingsRate > 0 ? 10 : 0;

  // 2. Debt-to-Income (0–25 pts): annual outstanding vs annual income
  const totalDebt = (state.emi_loans || []).reduce((s, l) => s + (parseFloat(l.outstanding) || 0), 0);
  const annualIncome = k.avgDailyIncome * 365;
  let debtPts = 25;
  if (annualIncome > 0) {
    const dti = totalDebt / annualIncome;
    debtPts = dti < 0.2 ? 25 : dti < 0.4 ? 18 : dti < 0.6 ? 10 : 3;
  }

  // 3. Emergency Fund – months of expenses covered by savings balance (0–25 pts)
  const totalSavings = (state.savings || []).reduce((s, x) => s + (parseFloat(x.amount || x.balance || 0) || 0), 0);
  const monthlyExpense = k.avgDailyExpense * 30;
  let emergencyPts = 0;
  if (monthlyExpense > 0) {
    const months = totalSavings / monthlyExpense;
    emergencyPts = months >= 6 ? 25 : months >= 3 ? 18 : months >= 1 ? 10 : 3;
  } else if (totalSavings > 0) {
    emergencyPts = 15; // has savings but no expense data yet
  }

  // 4. Budget Adherence (0–20 pts)
  const monthBudgets = (state.budgets || []).filter(b => b.month === month);
  let budgetPts = 10;
  if (monthBudgets.length > 0) {
    const onTrack = monthBudgets.filter(b => {
      const actual = (state.transactions || [])
        .filter(t => t.type === 'out' && t.category === b.category && (t.date || '').startsWith(month))
        .reduce((s, t) => s + (+t.amount || 0), 0);
      return actual <= b.limit;
    }).length;
    budgetPts = Math.round((onTrack / monthBudgets.length) * 20);
  }

  const score = Math.min(100, Math.max(0, Math.round(savingsPts + debtPts + emergencyPts + budgetPts)));
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs Work';
  const color = score >= 80 ? 'var(--emerald)' : score >= 60 ? 'var(--teal)' : score >= 40 ? 'var(--gold)' : 'var(--rose)';

  return { score, grade, color, savingsPts, debtPts, emergencyPts, budgetPts, savingsRate, totalDebt, totalSavings, monthlyExpense };
}

function renderHealthScore() {
  const wrap = document.getElementById('healthScoreWidget');
  if (!wrap) return;
  const h = calculateFinancialHealth();
  const R = 52;
  const C = 2 * Math.PI * R;
  const offset = C - (h.score / 100) * C;

  wrap.innerHTML = `
    <div class="chart-card" style="padding:20px;">
      <div class="chart-card-title" style="margin-bottom:16px;">
        <span style="color:var(--teal)">●</span> Financial Health Score
        <span style="font-size:11px;color:var(--text-3);margin-left:auto;">savings · debt · emergency · budgets</span>
      </div>
      <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap;">

        <div style="position:relative;width:130px;height:130px;flex-shrink:0;">
          <svg width="130" height="130" style="transform:rotate(-90deg);">
            <circle cx="65" cy="65" r="${R}" fill="none" stroke="var(--bg3)" stroke-width="10"/>
            <circle cx="65" cy="65" r="${R}" fill="none" stroke="${h.color}" stroke-width="10"
              stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
              stroke-linecap="round" style="transition:stroke-dashoffset 1s ease;"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <div style="font-family:var(--font-m);font-size:30px;font-weight:700;color:${h.color};">${h.score}</div>
            <div style="font-size:11px;color:var(--text-3);">${h.grade}</div>
          </div>
        </div>

        <div style="flex:1;min-width:180px;">
          ${_healthBar('Savings Rate', h.savingsPts, 30, h.savingsRate + '%')}
          ${_healthBar('Debt-to-Income', h.debtPts, 25, h.totalDebt > 0 ? fmtINR(h.totalDebt) + ' debt' : 'Debt-free')}
          ${_healthBar('Emergency Fund', h.emergencyPts, 25, h.totalSavings > 0 ? fmtINR(h.totalSavings) + ' saved' : 'No savings')}
          ${_healthBar('Budget Adherence', h.budgetPts, 20, h.budgetPts >= 16 ? 'On Track' : h.budgetPts >= 10 ? 'Moderate' : 'Over Budget')}
        </div>

      </div>
    </div>`;
}

function _healthBar(label, pts, max, detail) {
  const pct = max > 0 ? Math.round((pts / max) * 100) : 0;
  const color = pct >= 80 ? 'var(--emerald)' : pct >= 55 ? 'var(--teal)' : pct >= 35 ? 'var(--gold)' : 'var(--rose)';
  return `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
        <span style="color:var(--text-2);">${label}</span>
        <span style="color:${color};font-family:var(--font-m);font-weight:600;">${pts}/${max} · ${detail}</span>
      </div>
      <div style="height:5px;background:var(--bg3);border-radius:3px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;transition:width 0.8s ease;"></div>
      </div>
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   PHASE 2E – MONTH-OVER-MONTH ANALYTICS
════════════════════════════════════════════════════════════ */
function renderMoMWidget() {
  const wrap = document.getElementById('momWidget');
  if (!wrap) return;

  const now = new Date();
  const curMonth = now.toISOString().slice(0, 7);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = prevDate.toISOString().slice(0, 7);

  const curTx  = (state.transactions || []).filter(t => (t.date || '').startsWith(curMonth));
  const prevTx = (state.transactions || []).filter(t => (t.date || '').startsWith(prevMonth));

  const curIncome  = curTx.filter(t => t.type === 'in').reduce((s, t) => s + (+t.amount || 0), 0);
  const curExpense = curTx.filter(t => t.type === 'out').reduce((s, t) => s + (+t.amount || 0), 0);
  const prevIncome  = prevTx.filter(t => t.type === 'in').reduce((s, t) => s + (+t.amount || 0), 0);
  const prevExpense = prevTx.filter(t => t.type === 'out').reduce((s, t) => s + (+t.amount || 0), 0);

  function momPct(cur, prev) {
    if (!prev) return cur > 0 ? '+100%' : '—';
    const d = ((cur - prev) / prev * 100);
    return (d >= 0 ? '+' : '') + d.toFixed(1) + '%';
  }
  function momColor(cur, prev, lowerIsBetter) {
    if (!prev) return 'var(--text-3)';
    return lowerIsBetter
      ? (cur <= prev ? 'var(--emerald)' : 'var(--rose)')
      : (cur >= prev ? 'var(--emerald)' : 'var(--rose)');
  }

  // Per-category comparison (top 5 expense cats)
  const curCats  = {};
  const prevCats = {};
  curTx.filter(t => t.type === 'out').forEach(t => { curCats[t.category] = (curCats[t.category] || 0) + (+t.amount || 0); });
  prevTx.filter(t => t.type === 'out').forEach(t => { prevCats[t.category] = (prevCats[t.category] || 0) + (+t.amount || 0); });
  const allCats = [...new Set([...Object.keys(curCats), ...Object.keys(prevCats)])];
  const topCats = allCats.sort((a, b) => (curCats[b] || 0) - (curCats[a] || 0)).slice(0, 5);

  if (!curTx.length && !prevTx.length) {
    wrap.innerHTML = `<div class="chart-card" style="text-align:center;padding:20px;color:var(--text-3);font-size:13px;">No transactions yet to compare.</div>`;
    return;
  }

  const prevLabel = prevDate.toLocaleString('default', { month: 'short' });
  const curLabel  = now.toLocaleString('default', { month: 'short' });

  wrap.innerHTML = `
    <div class="chart-card" style="padding:16px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
        <div style="background:var(--bg3);border-radius:10px;padding:12px;">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;">Income ${curLabel} vs ${prevLabel}</div>
          <div style="font-family:var(--font-m);font-size:18px;font-weight:700;color:var(--emerald);">${fmtINR(curIncome)}</div>
          <div style="font-size:12px;color:${momColor(curIncome, prevIncome, false)};">${momPct(curIncome, prevIncome)} <span style="color:var(--text-3);">prev ${fmtINR(prevIncome)}</span></div>
        </div>
        <div style="background:var(--bg3);border-radius:10px;padding:12px;">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;">Expense ${curLabel} vs ${prevLabel}</div>
          <div style="font-family:var(--font-m);font-size:18px;font-weight:700;color:var(--rose);">${fmtINR(curExpense)}</div>
          <div style="font-size:12px;color:${momColor(curExpense, prevExpense, true)};">${momPct(curExpense, prevExpense)} <span style="color:var(--text-3);">prev ${fmtINR(prevExpense)}</span></div>
        </div>
      </div>
      ${topCats.length ? `
      <div style="font-size:11px;font-weight:600;color:var(--text-3);margin-bottom:8px;letter-spacing:.5px;">TOP CATEGORIES</div>
      ${topCats.map(cat => {
        const cur = curCats[cat] || 0;
        const prev = prevCats[cat] || 0;
        const pct = momPct(cur, prev);
        const col = momColor(cur, prev, true);
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bg3);">
          <span style="font-size:13px;color:var(--text-2);">${cat}</span>
          <div style="text-align:right;">
            <span style="font-family:var(--font-m);font-size:13px;color:var(--text);">${fmtINR(cur)}</span>
            <span style="font-size:11px;color:${col};margin-left:6px;">${pct}</span>
          </div>
        </div>`;
      }).join('')}` : ''}
    </div>`;
}

/* ════════════════════════════════════════════════════════════
   PHASE 2C – SAVINGS GOALS TRACKER
════════════════════════════════════════════════════════════ */
let _sgRows = []; // cached for CSV import flow

async function renderSavingsGoals() {
  const wrap = document.getElementById('savingsGoalsList');
  if (!wrap) return;
  _sgRows = await getAll('savings_goals');
  if (!_sgRows.length) {
    wrap.innerHTML = `
      <div class="chart-card" style="text-align:center;padding:32px;">
        <div style="font-size:36px;margin-bottom:8px;">🎯</div>
        <div style="font-size:14px;color:var(--text-3);margin-bottom:16px;">No savings goals yet.</div>
        <button class="btn-submit" style="width:auto;padding:8px 24px;margin:0;" onclick="openSavingsGoalModal()">Create First Goal</button>
      </div>`;
    return;
  }
  wrap.innerHTML = _sgRows.map(g => _sgGoalCard(g)).join('');
}

function _sgGoalCard(g) {
  const target  = parseFloat(g.target) || 0;
  const current = parseFloat(g.current) || 0;
  const pct     = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const color   = pct >= 100 ? 'var(--emerald)' : pct >= 60 ? 'var(--teal)' : pct >= 30 ? 'var(--gold)' : 'var(--rose)';
  const remaining = Math.max(0, target - current);

  let projectedLabel = '';
  if (g.monthly > 0 && remaining > 0) {
    const monthsLeft = Math.ceil(remaining / g.monthly);
    const projDate = new Date();
    projDate.setMonth(projDate.getMonth() + monthsLeft);
    projectedLabel = `Projected: ${projDate.toLocaleDateString('default', { month: 'short', year: 'numeric' })}`;
  }

  let deadlineWarning = '';
  if (g.deadline) {
    const daysLeft = Math.ceil((new Date(g.deadline) - new Date()) / 86400000);
    if (daysLeft < 0) deadlineWarning = `<span style="color:var(--rose);font-size:11px;">⚠ Overdue by ${Math.abs(daysLeft)}d</span>`;
    else if (daysLeft <= 30) deadlineWarning = `<span style="color:var(--gold);font-size:11px;">⏳ ${daysLeft}d left</span>`;
  }

  return `
    <div class="chart-card" style="padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div>
          <div style="font-weight:600;font-size:15px;color:var(--text);">${g.name || 'Goal'}</div>
          ${g.category ? `<div style="font-size:11px;color:var(--text-3);">${g.category}</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${deadlineWarning}
          <button class="section-action" onclick="openSavingsGoalModal(${g.id})">Edit</button>
          <button class="section-action" style="color:var(--rose);" onclick="deleteSavingsGoal(${g.id})">Del</button>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-2);margin-bottom:6px;">
        <span>${fmtINR(current)} saved</span>
        <span style="color:${color};font-weight:600;">${pct}% · ${fmtINR(target)} target</span>
      </div>
      <div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden;margin-bottom:8px;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 0.8s;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);">
        <span>${remaining > 0 ? fmtINR(remaining) + ' remaining' : '🎉 Goal reached!'}</span>
        <span>${projectedLabel}${g.monthly > 0 ? ' · ' + fmtINR(g.monthly) + '/mo' : ''}</span>
      </div>
    </div>`;
}

function openSavingsGoalModal(id) {
  const modal = document.getElementById('savingsGoalModal');
  if (!modal) return;
  document.getElementById('sgEditId').value = '';
  document.getElementById('sgName').value = '';
  document.getElementById('sgTarget').value = '';
  document.getElementById('sgCurrent').value = '';
  document.getElementById('sgDeadline').value = '';
  document.getElementById('sgMonthly').value = '';
  document.getElementById('sgCategory').value = '';

  if (id) {
    const g = _sgRows.find(r => r.id === id);
    if (g) {
      document.getElementById('sgEditId').value = g.id;
      document.getElementById('sgName').value = g.name || '';
      document.getElementById('sgTarget').value = g.target || '';
      document.getElementById('sgCurrent').value = g.current || '';
      document.getElementById('sgDeadline').value = g.deadline || '';
      document.getElementById('sgMonthly').value = g.monthly || '';
      document.getElementById('sgCategory').value = g.category || '';
    }
  }
  modal.style.display = 'flex';
}

function closeSavingsGoalModal() {
  const modal = document.getElementById('savingsGoalModal');
  if (modal) modal.style.display = 'none';
}

async function saveSavingsGoal() {
  const name    = document.getElementById('sgName').value.trim();
  const target  = parseFloat(document.getElementById('sgTarget').value) || 0;
  const current = parseFloat(document.getElementById('sgCurrent').value) || 0;
  const deadline = document.getElementById('sgDeadline').value;
  const monthly  = parseFloat(document.getElementById('sgMonthly').value) || 0;
  const category = document.getElementById('sgCategory').value.trim();
  const editId   = document.getElementById('sgEditId').value;

  if (!name || !target) { showToast('Name and target amount are required.', 'warning'); return; }

  const record = { name, target, current, deadline, monthly, category, createdAt: new Date().toISOString() };
  if (editId) record.id = parseInt(editId, 10);

  await put('savings_goals', record);
  closeSavingsGoalModal();
  showToast(editId ? 'Goal updated!' : 'Goal created!', 'success');
  renderSavingsGoals();
}

async function deleteSavingsGoal(id) {
  if (!confirm('Delete this savings goal?')) return;
  await del('savings_goals', id);
  showToast('Goal deleted.', 'info');
  renderSavingsGoals();
}

/* ════════════════════════════════════════════════════════════
   PHASE 2G – CSV SMART IMPORT (column mapper)
════════════════════════════════════════════════════════════ */
let _csvImportRows = [];
let _csvImportHeaders = [];

function openCsvImportModal(csvText) {
  const rows = parseCSV(csvText);
  if (!rows.length) { showToast('Empty or invalid CSV.', 'warning'); return; }
  _csvImportHeaders = rows[0].map(h => h.trim());
  _csvImportRows = rows.slice(1).filter(r => r.some(c => c.trim()));

  const LM_FIELDS = ['date', 'type', 'amount', 'category', 'account', 'note'];
  const guesses = {};
  LM_FIELDS.forEach(f => {
    const hit = _csvImportHeaders.findIndex(h => h.toLowerCase().includes(f));
    guesses[f] = hit >= 0 ? _csvImportHeaders[hit] : '';
  });

  const mapper = document.getElementById('csvColumnMapper');
  if (!mapper) return;
  mapper.innerHTML = LM_FIELDS.map(f => `
    <div class="form-group" style="margin-bottom:8px;">
      <label class="form-label" style="font-size:12px;">${f.toUpperCase()}</label>
      <select id="csv_map_${f}" class="form-input" style="font-size:12px;">
        <option value="">(skip)</option>
        ${_csvImportHeaders.map(h => `<option value="${h}" ${guesses[f] === h ? 'selected' : ''}>${h}</option>`).join('')}
      </select>
    </div>`).join('');

  const preview = document.getElementById('csvPreview');
  if (preview) preview.textContent = `${_csvImportRows.length} rows found · first row: ${_csvImportRows[0]?.join(', ') || ''}`;

  document.getElementById('csvImportModal').style.display = 'flex';
}

function closeCsvImportModal() {
  const modal = document.getElementById('csvImportModal');
  if (modal) modal.style.display = 'none';
}

async function confirmCsvImport() {
  const LM_FIELDS = ['date', 'type', 'amount', 'category', 'account', 'note'];
  const colMap = {};
  LM_FIELDS.forEach(f => {
    const sel = document.getElementById(`csv_map_${f}`);
    if (sel && sel.value) colMap[f] = _csvImportHeaders.indexOf(sel.value);
    else colMap[f] = -1;
  });

  const imported = [];
  for (const row of _csvImportRows) {
    const get = (f) => colMap[f] >= 0 ? (row[colMap[f]] || '').trim() : '';
    const rawType = get('type').toLowerCase();
    const type = rawType.includes('in') || rawType.includes('credit') ? 'in' : 'out';
    const amount = parseFloat(get('amount').replace(/[^0-9.]/g, '')) || 0;
    if (!amount) continue;
    const t = {
      id: uid('tx'),
      date: get('date') || nowISO(),
      type,
      amount,
      category: get('category') || merchantToCategory(get('note') || get('account')) || 'Other',
      account: get('account') || (state.dropdowns?.accounts?.[0] || 'Cash'),
      note: get('note') || '',
      createdAt: new Date().toISOString()
    };
    await put('transactions', t);
    state.transactions.push(t);
    imported.push(t);
  }
  closeCsvImportModal();
  renderAll();
  autoBackup();
  showToast(`Imported ${imported.length} transactions.`, 'success');
}

/* ════════════════════════════════════════════════════════════
   SMART CSV IMPORT – route non-standard CSVs to column mapper
════════════════════════════════════════════════════════════ */
async function smartImportCSV(txt) {
  const rows = parseCSV(txt);
  if (!rows.length) return;
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const LM_STANDARD = ['date', 'type', 'amount', 'category', 'account', 'note'];
  const isStandard = LM_STANDARD.every(f => headers.some(h => h === f || h.includes(f)));
  if (isStandard) {
    return importCSVText(txt);
  }
  openCsvImportModal(txt);
}

/* ════════════════════════════════════════════════════════════
   AUTO NET WORTH SNAPSHOT – once per day on app start
════════════════════════════════════════════════════════════ */
function autoNetWorthSnapshot() {
  setTimeout(async () => {
    try {
      const snaps = state.net_worth_snapshots || [];
      const lastSnap = snaps[snaps.length - 1];
      const today = nowISO();
      if (!lastSnap || lastSnap.date !== today) {
        if (typeof takeNetWorthSnapshot === 'function') {
          await takeNetWorthSnapshot();
          console.log('[LM] Auto net worth snapshot taken for', today);
        }
      }
    } catch (e) { console.warn('[LM] Auto net worth snapshot failed:', e); }
  }, 2500);
}

/* ════════════════════════════════════════════════════════════
   LOW BALANCE ALERT – warn when account balance drops below threshold
════════════════════════════════════════════════════════════ */
function checkLowBalanceAlert() {
  try {
    const threshold = parseFloat(state.settings?.lowBalanceThreshold || 0);
    if (!threshold || threshold <= 0) return;

    const txs = state.transactions || [];
    const accounts = [...new Set(txs.map(t => t.account).filter(Boolean))];

    accounts.forEach(acct => {
      const bal = txs.reduce((sum, t) => {
        if (t.account !== acct) return sum;
        return t.type === 'income' ? sum + parseFloat(t.amount || 0)
             : t.type === 'expense' ? sum - parseFloat(t.amount || 0)
             : sum;
      }, 0);
      if (bal < threshold) {
        const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
        showToast(`Low balance: "${acct}" has ${fmt(bal)} (threshold: ${fmt(threshold)})`, 'warning');
      }
    });
  } catch (e) { console.warn('[LM] Low balance check failed:', e); }
}

/* ════════════════════════════════════════════════════════════
   SPENDING ANOMALY ALERTS – flag unusual category spikes
════════════════════════════════════════════════════════════ */
function checkSpendingAnomalyAlerts() {
  try {
    if (state.settings?.anomalyAlertsEnabled === false) return;
    const txs = state.transactions || [];
    if (txs.length < 10) return; // not enough data

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Build per-category monthly totals (last 6 months)
    const catMonthly = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      const m = (t.date || '').slice(0, 7);
      const cat = t.category || 'Uncategorized';
      if (!catMonthly[cat]) catMonthly[cat] = {};
      catMonthly[cat][m] = (catMonthly[cat][m] || 0) + parseFloat(t.amount || 0);
    });

    const anomalies = [];
    Object.entries(catMonthly).forEach(([cat, months]) => {
      const current = months[thisMonth] || 0;
      if (!current) return;
      const history = Object.entries(months)
        .filter(([m]) => m < thisMonth)
        .map(([, v]) => v);
      if (history.length < 2) return;
      const avg = history.reduce((a, b) => a + b, 0) / history.length;
      if (avg > 0 && current > avg * 1.8) {
        anomalies.push({ cat, current, avg, pct: Math.round((current / avg - 1) * 100) });
      }
    });

    if (anomalies.length === 0) return;

    // Show top anomaly as toast
    anomalies.sort((a, b) => b.pct - a.pct);
    const top = anomalies[0];
    const fmt = n => '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    showToast(
      `Spending spike: "${top.cat}" is ${fmt(top.current)} this month (+${top.pct}% vs avg ${fmt(top.avg)})`,
      'warning'
    );

    if (anomalies.length > 1) {
      setTimeout(() => {
        anomalies.slice(1, 3).forEach((a, i) => {
          setTimeout(() => {
            showToast(`High spend: "${a.cat}" up ${a.pct}% vs monthly average`, 'warning');
          }, i * 1500);
        });
      }, 2000);
    }
  } catch (e) { console.warn('[LM] Spending anomaly check failed:', e); }
}

/* ════════════════════════════════════════════════════════════
   PREFERENCES MODAL – alert thresholds, session timeout
════════════════════════════════════════════════════════════ */
function openPreferencesModal() {
  const s = state.settings || {};
  const el = document.getElementById('preferencesModal');
  if (!el) return;

  const threshold = document.getElementById('prefLowBalanceThreshold');
  const anomaly   = document.getElementById('prefAnomalyAlerts');
  const timeout   = document.getElementById('prefSessionTimeout');

  if (threshold) threshold.value = s.lowBalanceThreshold || 0;
  if (anomaly)   anomaly.checked = s.anomalyAlertsEnabled !== false;
  if (timeout) {
    const mins = s.sessionTimeoutMins ?? 30;
    timeout.value = [30, 60, 120, 0].includes(+mins) ? String(mins) : '30';
  }
  el.style.display = 'flex';
}

function closePreferencesModal() {
  const el = document.getElementById('preferencesModal');
  if (el) el.style.display = 'none';
}

async function savePreferences() {
  const threshold = parseFloat(document.getElementById('prefLowBalanceThreshold')?.value || 0);
  const anomaly   = document.getElementById('prefAnomalyAlerts')?.checked !== false;
  const timeoutMins = parseInt(document.getElementById('prefSessionTimeout')?.value || 30);

  state.settings = {
    ...(state.settings || {}),
    lowBalanceThreshold: isNaN(threshold) ? 0 : threshold,
    anomalyAlertsEnabled: anomaly,
    sessionTimeoutMins: timeoutMins
  };
  settings = { ...settings, ...state.settings };
  await saveSettingsToStore();

  // Apply new session timeout immediately
  if (window.LM_Auth?.startInactivityWatcher) {
    // Re-define INACTIVITY_MS via override approach
    window._LM_InactivityOverride = timeoutMins > 0 ? timeoutMins * 60 * 1000 : null;
    window.LM_Auth.resetInactivityTimer();
  }

  closePreferencesModal();
  showToast('Preferences saved.', 'success');
}

/* ══════════════════════════════════════════════════════════════
   TAX ESTIMATOR — India FY 2024-25 Old vs New Regime
══════════════════════════════════════════════════════════════ */
function showTaxPage() {
  const el = document.getElementById('taxPlannerContent');
  if (!el) return;

  const now = new Date();
  const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart = `${fy}-04-01`, fyEnd = `${fy + 1}-03-31`;
  const annualIncome = state.transactions
    .filter(t => t.type === 'income' || t.type === 'in')
    .filter(t => t.date >= fyStart && t.date <= fyEnd)
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  el.innerHTML = `
    <div class="tx-card" style="margin-bottom:16px;">
      <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--gold)"></span>Income &amp; Deductions (FY ${fy}-${fy+1})</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label class="form-label">Annual Income (₹)</label>
          <input type="number" id="taxIncome" class="form-input" value="${Math.round(annualIncome)}" oninput="calcTax()" placeholder="Gross annual income">
        </div>
        <div>
          <label class="form-label">Age Group</label>
          <select id="taxAge" class="form-input" onchange="calcTax()">
            <option value="below60">Below 60</option>
            <option value="senior">60-79 (Senior)</option>
            <option value="super">80+ (Super Senior)</option>
          </select>
        </div>
        <div>
          <label class="form-label">80C Investments (max ₹1,50,000)</label>
          <input type="number" id="tax80C" class="form-input" value="0" oninput="calcTax()" placeholder="PPF, ELSS, LIC, PF…">
        </div>
        <div>
          <label class="form-label">80D Health Insurance (₹)</label>
          <input type="number" id="tax80D" class="form-input" value="0" oninput="calcTax()" placeholder="Medical insurance premium">
        </div>
        <div>
          <label class="form-label">HRA Exemption (₹)</label>
          <input type="number" id="taxHRA" class="form-input" value="0" oninput="calcTax()" placeholder="If applicable">
        </div>
        <div>
          <label class="form-label">Other Deductions (₹)</label>
          <input type="number" id="taxOther" class="form-input" value="0" oninput="calcTax()" placeholder="80E, 80G, NPS…">
        </div>
      </div>
    </div>
    <div id="taxResult"></div>
  `;
  calcTax();
}

function calcTax() {
  const income = parseFloat(document.getElementById('taxIncome')?.value || 0);
  const age    = document.getElementById('taxAge')?.value || 'below60';
  const c80C   = Math.min(parseFloat(document.getElementById('tax80C')?.value || 0), 150000);
  const c80D   = Math.min(parseFloat(document.getElementById('tax80D')?.value || 0), age === 'senior' || age === 'super' ? 50000 : 25000);
  const hra    = parseFloat(document.getElementById('taxHRA')?.value || 0);
  const other  = parseFloat(document.getElementById('taxOther')?.value || 0);

  // Old Regime
  const stdOld     = 50000;
  const taxableOld = Math.max(0, income - stdOld - c80C - c80D - hra - other);
  const oldTax     = _computeOldRegimeTax(taxableOld, age);
  const oldRebate  = income <= 500000 ? Math.min(oldTax, 12500) : 0;
  const oldAfterR  = Math.max(0, oldTax - oldRebate);
  const oldSurcharge = _getSurcharge(oldAfterR, income);
  const oldCess    = (oldAfterR + oldSurcharge) * 0.04;
  const oldFinal   = oldAfterR + oldSurcharge + oldCess;
  const oldEffRate = income > 0 ? (oldFinal / income * 100).toFixed(1) : '0.0';

  // New Regime 2024-25
  const stdNew     = 75000;
  const taxableNew = Math.max(0, income - stdNew);
  const newTax     = _computeNewRegimeTax(taxableNew);
  const newRebate  = income <= 700000 ? Math.min(newTax, 25000) : 0;
  const newAfterR  = Math.max(0, newTax - newRebate);
  const newSurcharge = _getSurcharge(newAfterR, income);
  const newCess    = (newAfterR + newSurcharge) * 0.04;
  const newFinal   = newAfterR + newSurcharge + newCess;
  const newEffRate = income > 0 ? (newFinal / income * 100).toFixed(1) : '0.0';

  const savings = oldFinal - newFinal;
  const better  = savings > 100 ? 'new' : savings < -100 ? 'old' : 'same';

  const headroom80C = Math.max(0, 150000 - c80C);

  const res = document.getElementById('taxResult');
  if (!res) return;
  res.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
      <div class="tx-card" style="${better==='old'?'border:2px solid var(--emerald);':''}">
        <div class="section-heading"><div class="section-title" style="font-size:14px;">📘 Old Regime</div></div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;">Taxable: <b style="color:var(--text)">${fmtINR(taxableOld)}</b> | Std Deduction: ₹50,000</div>
        ${_taxBreakdown(oldTax, oldRebate, oldSurcharge, oldCess, oldFinal, oldEffRate)}
        ${better==='old'?`<div style="margin-top:8px;padding:6px 10px;background:rgba(52,211,153,0.12);border-radius:8px;font-size:12px;color:var(--emerald);font-weight:600;">✓ Better — save ${fmtINR(Math.abs(savings))}</div>`:''}
      </div>
      <div class="tx-card" style="${better==='new'?'border:2px solid var(--emerald);':''}">
        <div class="section-heading"><div class="section-title" style="font-size:14px;">📗 New Regime</div></div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;">Taxable: <b style="color:var(--text)">${fmtINR(taxableNew)}</b> | Std Deduction: ₹75,000</div>
        ${_taxBreakdown(newTax, newRebate, newSurcharge, newCess, newFinal, newEffRate)}
        ${better==='new'?`<div style="margin-top:8px;padding:6px 10px;background:rgba(52,211,153,0.12);border-radius:8px;font-size:12px;color:var(--emerald);font-weight:600;">✓ Better — save ${fmtINR(Math.abs(savings))}</div>`:''}
        ${better==='same'?`<div style="margin-top:8px;padding:6px 10px;background:rgba(251,191,36,0.12);border-radius:8px;font-size:12px;color:var(--gold);">Both regimes give similar tax</div>`:''}
      </div>
    </div>
    <div class="tx-card" style="margin-bottom:16px;">
      <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--violet)"></span>80C Headroom &amp; Advice</div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center;">
        <div style="padding:12px;background:var(--bg3);border-radius:10px;">
          <div style="font-size:12px;color:var(--text-3);">80C Headroom</div>
          <div style="font-size:18px;font-weight:700;color:var(--teal)">${fmtINR(headroom80C)}</div>
          <div style="font-size:11px;color:var(--text-3);">more can be invested</div>
        </div>
        <div style="padding:12px;background:var(--bg3);border-radius:10px;">
          <div style="font-size:12px;color:var(--text-3);">Max Old-Regime Saving</div>
          <div style="font-size:18px;font-weight:700;color:var(--emerald)">${fmtINR(headroom80C * 0.3)}</div>
          <div style="font-size:11px;color:var(--text-3);">at 30% slab</div>
        </div>
        <div style="padding:12px;background:var(--bg3);border-radius:10px;">
          <div style="font-size:12px;color:var(--text-3);">Monthly Tax (Old)</div>
          <div style="font-size:18px;font-weight:700;color:var(--rose)">${fmtINR(oldFinal / 12)}</div>
          <div style="font-size:11px;color:var(--text-3);">advance tax per month</div>
        </div>
      </div>
    </div>
  `;
}

function _taxBreakdown(tax, rebate, surcharge, cess, total, effRate) {
  return `
    <div style="font-size:12px;color:var(--text-2);display:flex;flex-direction:column;gap:5px;">
      <div style="display:flex;justify-content:space-between;"><span>Income Tax</span><span>${fmtINR(tax)}</span></div>
      ${rebate > 0 ? `<div style="display:flex;justify-content:space-between;color:var(--emerald);"><span>87A Rebate</span><span>−${fmtINR(rebate)}</span></div>` : ''}
      ${surcharge > 0 ? `<div style="display:flex;justify-content:space-between;"><span>Surcharge</span><span>${fmtINR(surcharge)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;"><span>4% Cess</span><span>${fmtINR(cess)}</span></div>
      <div style="display:flex;justify-content:space-between;font-weight:700;border-top:1px solid var(--border);padding-top:5px;margin-top:2px;">
        <span>Total Tax</span><span style="color:var(--rose);font-size:14px;">${fmtINR(total)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;color:var(--text-3);font-size:11px;">
        <span>Effective Rate</span><span>${effRate}%</span>
      </div>
    </div>`;
}

function _computeOldRegimeTax(income, age) {
  const exempt = age === 'super' ? 500000 : age === 'senior' ? 300000 : 250000;
  if (income <= exempt) return 0;
  let tax = 0;
  const bands = [[exempt, 500000, 0.05], [500000, 1000000, 0.20], [1000000, Infinity, 0.30]];
  for (const [lo, hi, rate] of bands) {
    if (income > lo) tax += (Math.min(income, hi) - lo) * rate;
  }
  return tax;
}

function _computeNewRegimeTax(income) {
  if (income <= 300000) return 0;
  let tax = 0;
  const bands = [
    [300000, 700000, 0.05], [700000, 1000000, 0.10],
    [1000000, 1200000, 0.15], [1200000, 1500000, 0.20],
    [1500000, Infinity, 0.30]
  ];
  for (const [lo, hi, rate] of bands) {
    if (income > lo) tax += (Math.min(income, hi) - lo) * rate;
  }
  return tax;
}

function _getSurcharge(tax, income) {
  if (income <= 5000000) return 0;
  if (income <= 10000000) return tax * 0.10;
  if (income <= 20000000) return tax * 0.15;
  if (income <= 50000000) return tax * 0.25;
  return tax * 0.37;
}

/* ══════════════════════════════════════════════════════════════
   SUBSCRIPTION TRACKER
══════════════════════════════════════════════════════════════ */
function renderSubscriptionPage() {
  const el = document.getElementById('subscriptionsContent');
  if (!el) return;

  const manual = state.subscriptions || [];
  const detected = detectSubscriptions();
  const toMonthly = (s) => {
    if (s.cycle === 'yearly') return s.amount / 12;
    if (s.cycle === 'quarterly') return s.amount / 3;
    if (s.cycle === 'weekly') return s.amount * 4.33;
    return s.amount;
  };
  const totalMonthly = manual.reduce((sum, s) => sum + toMonthly(s), 0)
                     + detected.reduce((sum, s) => sum + s.amount, 0);

  const manualHTML = manual.length
    ? manual.map(s => `
      <div class="list-item">
        <div class="tx-icon" style="background:rgba(96,165,250,0.15);color:var(--blue);font-size:18px;">🔄</div>
        <div class="list-item-info">
          <div class="list-item-name">${s.name}</div>
          <div class="list-item-sub">${s.category || ''} · ${s.cycle} · Next: ${s.dueDate || '—'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="list-item-amount" style="color:var(--rose);">−${fmtINR(s.amount)}</div>
          <button style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:16px;" onclick="deleteSubscription('${s.id}')">🗑️</button>
          <button style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:16px;" onclick="editSubscription('${s.id}')">✏️</button>
        </div>
      </div>`).join('')
    : '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:13px;">No manual subscriptions. Add one above.</div>';

  const detectedHTML = detected.length
    ? detected.map(s => `
      <div class="list-item">
        <div class="tx-icon" style="background:rgba(167,139,250,0.15);color:var(--violet);font-size:18px;">📡</div>
        <div class="list-item-info">
          <div class="list-item-name">${s.note || s.category}</div>
          <div class="list-item-sub">Auto-detected · ${s.count} months · Avg ${fmtINR(s.amount)}/mo</div>
        </div>
        <div class="list-item-amount" style="color:var(--rose);">−${fmtINR(s.amount)}</div>
      </div>`).join('')
    : '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:13px;">No recurring patterns detected yet.</div>';

  el.innerHTML = `
    <div class="tx-card" style="margin-bottom:12px;text-align:center;padding:20px;">
      <div style="font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;">Total Monthly Subscriptions</div>
      <div style="font-size:32px;font-weight:800;color:var(--rose);margin:6px 0;">${fmtINR(totalMonthly)}</div>
      <div style="font-size:13px;color:var(--text-3);">≈ ${fmtINR(totalMonthly * 12)} / year</div>
    </div>
    <div class="tx-card" style="margin-bottom:12px;">
      <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--blue)"></span>Manual Subscriptions</div></div>
      ${manualHTML}
    </div>
    <div class="tx-card">
      <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--violet)"></span>Auto-Detected Recurring</div></div>
      ${detectedHTML}
    </div>`;
}

function detectSubscriptions() {
  const txs = state.transactions.filter(t => t.type === 'expense' || t.type === 'out');
  const groups = {};
  txs.forEach(t => {
    const key = `${(t.note || '').toLowerCase().trim()}|${t.category}`;
    if (!key.replace(/\|/, '').trim()) return;
    if (!groups[key]) groups[key] = { note: t.note, category: t.category, months: {}, amounts: [] };
    const month = (t.date || '').slice(0, 7);
    if (!groups[key].months[month]) { groups[key].months[month] = 0; }
    groups[key].months[month] += parseFloat(t.amount || 0);
    groups[key].amounts.push(parseFloat(t.amount || 0));
  });

  const recurring = [];
  for (const [, g] of Object.entries(groups)) {
    const monthKeys = Object.keys(g.months);
    if (monthKeys.length < 2) continue;
    const amounts = Object.values(g.months);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.every(a => Math.abs(a - avg) / avg < 0.2);
    if (variance) recurring.push({ note: g.note, category: g.category, amount: Math.round(avg), count: monthKeys.length });
  }
  return recurring.sort((a, b) => b.amount - a.amount).slice(0, 15);
}

function openAddSubscriptionModal(id) {
  const modal = document.getElementById('addSubscriptionModal');
  if (!modal) return;
  document.getElementById('subEditId').value = id || '';
  if (id) {
    const s = (state.subscriptions || []).find(x => x.id === id);
    if (s) {
      document.getElementById('subName').value = s.name || '';
      document.getElementById('subAmount').value = s.amount || '';
      document.getElementById('subCycle').value = s.cycle || 'monthly';
      document.getElementById('subCategory').value = s.category || '';
      document.getElementById('subDueDate').value = s.dueDate || '';
    }
  } else {
    ['subName','subAmount','subCategory','subDueDate'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('subCycle').value = 'monthly';
  }
  modal.style.display = 'flex';
}
function closeAddSubscriptionModal() {
  const m = document.getElementById('addSubscriptionModal');
  if (m) m.style.display = 'none';
}
function editSubscription(id) { openAddSubscriptionModal(id); }
async function saveSubscription() {
  const name = document.getElementById('subName')?.value.trim();
  if (!name) { showToast('Enter subscription name', 'error'); return; }
  const editId = document.getElementById('subEditId')?.value;
  const sub = {
    id: editId || uid('sub'),
    name,
    amount: parseFloat(document.getElementById('subAmount')?.value || 0),
    cycle: document.getElementById('subCycle')?.value || 'monthly',
    category: document.getElementById('subCategory')?.value.trim() || '',
    dueDate: document.getElementById('subDueDate')?.value || '',
    createdAt: new Date().toISOString()
  };
  await put('subscriptions', sub);
  if (editId) {
    state.subscriptions = state.subscriptions.map(s => s.id === editId ? sub : s);
  } else {
    state.subscriptions = [...(state.subscriptions || []), sub];
  }
  closeAddSubscriptionModal();
  renderSubscriptionPage();
  showToast('Subscription saved.', 'success');
}
async function deleteSubscription(id) {
  if (!confirm('Delete this subscription?')) return;
  await del('subscriptions', id);
  state.subscriptions = (state.subscriptions || []).filter(s => s.id !== id);
  renderSubscriptionPage();
  showToast('Deleted.', 'success');
}

/* ══════════════════════════════════════════════════════════════
   SPLIT TRANSACTIONS
══════════════════════════════════════════════════════════════ */
let _splitTxId = null;

function openSplitModal(txId) {
  const t = state.transactions.find(x => x.id === txId);
  if (!t) return;
  _splitTxId = txId;

  const info = document.getElementById('splitTxInfo');
  if (info) info.innerHTML = `Splitting: <b>${t.note || t.category}</b> — <b style="color:var(--rose)">${fmtINR(t.amount)}</b> on ${t.date}`;

  const rows = document.getElementById('splitRows');
  if (rows) {
    rows.innerHTML = '';
    addSplitRow(t.category, t.amount / 2);
    addSplitRow('', t.amount / 2);
  }
  updateSplitBalance();

  const m = document.getElementById('splitTxModal');
  if (m) m.style.display = 'flex';
}

function closeSplitModal() {
  const m = document.getElementById('splitTxModal');
  if (m) m.style.display = 'none';
  _splitTxId = null;
}

function addSplitRow(cat = '', amt = '') {
  const rows = document.getElementById('splitRows');
  if (!rows) return;
  const i = rows.children.length;
  const div = document.createElement('div');
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center;';
  div.innerHTML = `
    <input type="text" class="form-input split-cat" placeholder="Category" value="${cat}" oninput="updateSplitBalance()">
    <input type="number" class="form-input split-amt" placeholder="Amount" value="${amt ? +amt.toFixed(2) : ''}" step="0.01" oninput="updateSplitBalance()">
    <button style="background:none;border:none;color:var(--rose);cursor:pointer;font-size:18px;" onclick="this.closest('div').remove();updateSplitBalance()">×</button>`;
  rows.appendChild(div);
}

function updateSplitBalance() {
  const t = _splitTxId ? state.transactions.find(x => x.id === _splitTxId) : null;
  if (!t) return;
  const total = parseFloat(t.amount) || 0;
  const assigned = [...document.querySelectorAll('.split-amt')]
    .reduce((s, el) => s + (parseFloat(el.value) || 0), 0);
  const remaining = total - assigned;
  const info = document.getElementById('splitBalanceInfo');
  if (info) info.innerHTML = `Assigned: <b>${fmtINR(assigned)}</b> | Remaining: <b style="color:${Math.abs(remaining) < 0.01 ? 'var(--emerald)' : 'var(--rose)'}">${fmtINR(remaining)}</b>`;
}

async function saveSplitTransaction() {
  const t = _splitTxId ? state.transactions.find(x => x.id === _splitTxId) : null;
  if (!t) return;

  const cats = [...document.querySelectorAll('.split-cat')].map(el => el.value.trim());
  const amts = [...document.querySelectorAll('.split-amt')].map(el => parseFloat(el.value) || 0);
  const total = amts.reduce((a, b) => a + b, 0);

  if (Math.abs(total - parseFloat(t.amount)) > 0.01) {
    showToast('Split amounts must equal the original total.', 'error'); return;
  }
  if (cats.some(c => !c)) { showToast('Fill all category fields.', 'error'); return; }

  // Delete original
  await del('transactions', t.id);
  state.transactions = state.transactions.filter(x => x.id !== t.id);

  // Create split entries
  for (let i = 0; i < cats.length; i++) {
    const newTx = { ...t, id: uid('tx'), category: cats[i], amount: amts[i], note: `${t.note || ''} [split]`.trim(), splitFrom: t.id, createdAt: new Date().toISOString() };
    await put('transactions', newTx);
    state.transactions.push(newTx);
  }

  closeSplitModal();
  renderAll();
  autoBackup();
  showToast(`Split into ${cats.length} transactions.`, 'success');
}

/* ══════════════════════════════════════════════════════════════
   BUDGET ROLLOVER — carry unspent budget to next month
══════════════════════════════════════════════════════════════ */
async function checkBudgetRollover() {
  try {
    const budgets = state.budgets || [];
    if (!budgets.length) return;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const lastRollover = state.settings?.lastBudgetRollover;
    if (lastRollover === thisMonth) return; // already done this month

    let rolled = 0;
    for (const b of budgets) {
      if (!b.rollover) continue; // only rollover-enabled budgets
      const spent = state.transactions
        .filter(t => (t.type === 'expense' || t.type === 'out') && t.category === b.category && (t.date || '').startsWith(prevMonth))
        .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
      const unspent = Math.max(0, (b.limit || 0) - spent);
      if (unspent > 0) {
        const updated = { ...b, limit: (b.limit || 0) + unspent, rolledOverAmount: unspent, rolledOverFrom: prevMonth };
        await put('budgets', updated);
        state.budgets = state.budgets.map(x => x.id === b.id ? updated : x);
        rolled++;
      }
    }

    state.settings = { ...(state.settings || {}), lastBudgetRollover: thisMonth };
    await saveSettingsToStore();
    if (rolled > 0) showToast(`Budget rollover: ${rolled} categories carried forward.`, 'success');
  } catch (e) { console.warn('[LM] Budget rollover failed:', e); }
}

/* ══════════════════════════════════════════════════════════════
   XIRR — Time-weighted portfolio return (Newton-Raphson)
══════════════════════════════════════════════════════════════ */
function calcXIRR(cashflows, dates, guess = 0.1) {
  if (!cashflows || cashflows.length < 2) return null;
  const t0 = dates[0];
  const yrs = dates.map(d => (d - t0) / (365.25 * 86400000));

  function npv(r) {
    return cashflows.reduce((s, cf, i) => s + cf / Math.pow(1 + r, yrs[i]), 0);
  }
  function dnpv(r) {
    return cashflows.reduce((s, cf, i) => s - yrs[i] * cf / Math.pow(1 + r, yrs[i] + 1), 0);
  }

  let r = guess;
  for (let i = 0; i < 200; i++) {
    const n = npv(r), dn = dnpv(r);
    if (Math.abs(dn) < 1e-12) break;
    const nr = r - n / dn;
    if (Math.abs(nr - r) < 1e-8) return nr;
    r = nr;
    if (r < -1) r = -0.99;
  }
  return r;
}

function getPortfolioXIRR() {
  const investments = state.investments || [];
  if (!investments.length) return null;
  const flows = [], dates = [];
  investments.forEach(inv => {
    const amt = parseFloat(inv.amount || inv.invested || 0);
    const date = new Date(inv.date || inv.purchaseDate || inv.startDate || Date.now());
    if (!amt) return;
    flows.push(-amt); dates.push(date);
  });
  // Current value as final cashflow (today)
  const currentValue = investments.reduce((s, inv) => {
    if (typeof getAssetCurrentValue === 'function') return s + getAssetCurrentValue(inv);
    return s + parseFloat(inv.currentValue || inv.amount || 0);
  }, 0);
  if (currentValue > 0) { flows.push(currentValue); dates.push(new Date()); }
  if (flows.length < 2) return null;
  try { return calcXIRR(flows, dates); } catch { return null; }
}

/* ══════════════════════════════════════════════════════════════
   NET WORTH SPARKLINE — mini trend chart on dashboard
══════════════════════════════════════════════════════════════ */
let _nwSparkChart = null;

function renderNWSparkline() {
  const wrap = document.getElementById('nwSparklineWidget');
  if (!wrap) return;
  const snaps = (state.net_worth_snapshots || []).sort((a, b) => (a.date || '') > (b.date || '') ? 1 : -1);

  if (snaps.length < 2) {
    wrap.innerHTML = `<div class="tx-card" style="text-align:center;padding:20px;color:var(--text-3);font-size:13px;">
      Take your first net worth snapshot in the Wealth module to see trends here.</div>`;
    return;
  }

  const labels = snaps.map(s => s.date?.slice(5) || '');
  const values = snaps.map(s => s.netWorth || 0);
  const latest = values[values.length - 1];
  const prev   = values[values.length - 2];
  const delta  = latest - prev;
  const pct    = prev !== 0 ? ((delta / Math.abs(prev)) * 100).toFixed(1) : '0.0';

  wrap.innerHTML = `
    <div class="tx-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <div style="font-size:22px;font-weight:800;color:${latest>=0?'var(--teal)':'var(--rose)'}">${fmtINR(latest)}</div>
          <div style="font-size:12px;color:${delta>=0?'var(--emerald)':'var(--rose)'}">${delta>=0?'▲':'▼'} ${fmtINR(Math.abs(delta))} (${pct}%) vs last snapshot</div>
        </div>
        <div style="font-size:11px;color:var(--text-3);">${snaps.length} snapshots</div>
      </div>
      <div style="height:80px;"><canvas id="nwSparkCanvas"></canvas></div>
    </div>`;

  requestAnimationFrame(() => {
    const ctx = document.getElementById('nwSparkCanvas');
    if (!ctx) return;
    if (_nwSparkChart) { _nwSparkChart.destroy(); _nwSparkChart = null; }
    const colors = getChartColors();
    _nwSparkChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data: values,
          borderColor: latest >= 0 ? colors.teal : colors.rose,
          backgroundColor: latest >= 0 ? 'rgba(0,212,180,0.1)' : 'rgba(251,113,133,0.1)',
          fill: true, tension: 0.4, pointRadius: 3, borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 600 },
        plugins: { legend: { display: false }, tooltip: {
          callbacks: { label: ctx => fmtINR(ctx.parsed.y) }
        }},
        scales: {
          x: { display: false },
          y: { display: false }
        }
      }
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   WHAT-IF SIMULATOR
══════════════════════════════════════════════════════════════ */
function openWhatIfModal() {
  const m = document.getElementById('whatIfModal');
  if (!m) return;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthIncome  = state.transactions.filter(t => (t.type === 'income' || t.type === 'in') && (t.date||'').startsWith(thisMonth)).reduce((s,t) => s + parseFloat(t.amount||0), 0);
  const monthExpense = state.transactions.filter(t => (t.type === 'expense' || t.type === 'out') && (t.date||'').startsWith(thisMonth)).reduce((s,t) => s + parseFloat(t.amount||0), 0);
  const monthlySavings = Math.max(0, monthIncome - monthExpense);

  const el = document.getElementById('wiCurrentSavings');
  if (el) el.value = Math.round(monthlySavings);
  const el2 = document.getElementById('emiIncome');
  if (el2) el2.value = Math.round(monthIncome);
  m.style.display = 'flex';
  calcWhatIf();
}

function closeWhatIfModal() {
  const m = document.getElementById('whatIfModal');
  if (m) m.style.display = 'none';
}

function calcWhatIf() {
  const current  = parseFloat(document.getElementById('wiCurrentSavings')?.value || 0);
  const extra    = parseFloat(document.getElementById('wiExtra')?.value || 0);
  const years    = parseFloat(document.getElementById('wiYears')?.value || 20);
  const rate     = parseFloat(document.getElementById('wiReturn')?.value || 12) / 100 / 12;
  const months   = years * 12;

  const fv = (pmt, r, n) => r === 0 ? pmt * n : pmt * (Math.pow(1 + r, n) - 1) / r;
  const corpusCurrent = fv(current, rate, months);
  const corpusExtra   = fv(extra, rate, months);
  const corpusTotal   = fv(current + extra, rate, months);
  const gain          = corpusExtra;

  const res = document.getElementById('whatIfResult');
  if (!res) return;
  res.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">
      <div style="padding:14px;background:var(--bg3);border-radius:12px;text-align:center;">
        <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;">Current Path</div>
        <div style="font-size:22px;font-weight:800;color:var(--teal);margin:6px 0;">${fmtINR(corpusCurrent)}</div>
        <div style="font-size:11px;color:var(--text-3);">in ${years} years</div>
      </div>
      <div style="padding:14px;background:var(--bg3);border-radius:12px;text-align:center;border:2px solid var(--emerald);">
        <div style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:1px;">With Extra ₹${Number(extra).toLocaleString('en-IN')}/mo</div>
        <div style="font-size:22px;font-weight:800;color:var(--emerald);margin:6px 0;">${fmtINR(corpusTotal)}</div>
        <div style="font-size:11px;color:var(--emerald);">+${fmtINR(gain)} extra</div>
      </div>
    </div>
    <div style="margin-top:12px;padding:12px;background:rgba(167,139,250,0.1);border-radius:10px;font-size:13px;color:var(--text-2);">
      Saving ${fmtINR(extra)} more per month at ${(parseFloat(document.getElementById('wiReturn')?.value||12))}% p.a.
      adds <b style="color:var(--violet)">${fmtINR(gain)}</b> to your corpus over ${years} years.
      That's <b>${(gain/(extra||1)/months).toFixed(0)}×</b> your extra investment.
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   FINANCIAL YEAR SUMMARY (Apr–Mar) with PDF export
══════════════════════════════════════════════════════════════ */
function renderFYSummary() {
  const el = document.getElementById('fySummaryContent');
  if (!el) return;

  const now = new Date();
  const fy  = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const fyStart = `${fy}-04-01`, fyEnd = `${fy + 1}-03-31`;

  const txs   = state.transactions.filter(t => t.date >= fyStart && t.date <= fyEnd);
  const income  = txs.filter(t => t.type === 'income' || t.type === 'in').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const expense = txs.filter(t => t.type === 'expense' || t.type === 'out').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const savings = income - expense;
  const savRate = income > 0 ? (savings / income * 100).toFixed(1) : '0.0';

  // Category breakdown
  const catMap = {};
  txs.filter(t => t.type === 'expense' || t.type === 'out').forEach(t => {
    catMap[t.category || 'Other'] = (catMap[t.category || 'Other'] || 0) + parseFloat(t.amount || 0);
  });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Monthly breakdown
  const monthMap = {};
  for (let m = 0; m < 12; m++) {
    const d = new Date(fy, 3 + m, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
    const mInc = txs.filter(t => (t.type==='income'||t.type==='in') && (t.date||'').startsWith(key)).reduce((s,t) => s+parseFloat(t.amount||0), 0);
    const mExp = txs.filter(t => (t.type==='expense'||t.type==='out') && (t.date||'').startsWith(key)).reduce((s,t) => s+parseFloat(t.amount||0), 0);
    monthMap[label] = { inc: mInc, exp: mExp };
  }

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <div style="font-size:15px;font-weight:600;color:var(--text);">FY ${fy}–${fy+1} (Apr ${fy} – Mar ${fy+1})</div>
      <button class="section-action" onclick="exportFYSummaryPDF()">📄 Export PDF</button>
    </div>
    <div class="kpi-grid" style="margin-bottom:16px;" id="fySummaryKPIs">
      <div class="kpi-card green"><div class="kpi-label">TOTAL INCOME</div><div class="kpi-value" style="color:var(--emerald)">${fmtINR(income)}</div></div>
      <div class="kpi-card" style="background:rgba(251,113,133,0.08)"><div class="kpi-label">TOTAL EXPENSE</div><div class="kpi-value" style="color:var(--rose)">${fmtINR(expense)}</div></div>
      <div class="kpi-card blue"><div class="kpi-label">NET SAVINGS</div><div class="kpi-value" style="color:${savings>=0?'var(--teal)':'var(--rose)'}">${fmtINR(savings)}</div></div>
      <div class="kpi-card"><div class="kpi-label">SAVINGS RATE</div><div class="kpi-value" style="color:var(--violet)">${savRate}%</div></div>
    </div>
    <div class="two-col" style="margin-bottom:16px;">
      <div class="tx-card">
        <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--rose)"></span>Top Expense Categories</div></div>
        ${topCats.map(([cat, amt]) => `
          <div class="list-item" style="padding:8px 0;">
            <div class="list-item-info"><div class="list-item-name">${cat}</div></div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:80px;height:6px;border-radius:3px;background:var(--bg3);overflow:hidden;"><div style="height:100%;width:${Math.min(100,(amt/expense*100))}%;background:var(--rose);border-radius:3px;"></div></div>
              <div class="list-item-amount" style="color:var(--rose)">${fmtINR(amt)}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="tx-card">
        <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--blue)"></span>Monthly Overview</div></div>
        <div style="overflow-x:auto;">
          ${Object.entries(monthMap).map(([label, d]) => `
            <div class="list-item" style="padding:6px 0;">
              <div style="width:50px;font-size:12px;color:var(--text-3);">${label}</div>
              <div style="flex:1;display:flex;flex-direction:column;gap:2px;">
                <div style="height:5px;border-radius:3px;background:rgba(52,211,153,0.2);overflow:hidden;"><div style="height:100%;width:${income>0?Math.min(100,d.inc/income*800)+'%':'0'};background:var(--emerald);border-radius:3px;"></div></div>
                <div style="height:5px;border-radius:3px;background:rgba(251,113,133,0.2);overflow:hidden;"><div style="height:100%;width:${expense>0?Math.min(100,d.exp/expense*800)+'%':'0'};background:var(--rose);border-radius:3px;"></div></div>
              </div>
              <div style="text-align:right;font-size:11px;width:70px;color:${d.inc-d.exp>=0?'var(--emerald)':'var(--rose)'};">${fmtINR(d.inc-d.exp)}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="tx-card">
      <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--violet)"></span>Transaction Count: ${txs.length} transactions</div></div>
      <div style="font-size:13px;color:var(--text-2);display:flex;gap:20px;flex-wrap:wrap;padding:8px 0;">
        <span>Income transactions: <b>${txs.filter(t=>t.type==='income'||t.type==='in').length}</b></span>
        <span>Expense transactions: <b>${txs.filter(t=>t.type==='expense'||t.type==='out').length}</b></span>
        <span>Largest expense: <b style="color:var(--rose)">${fmtINR(Math.max(0,...txs.filter(t=>t.type==='expense'||t.type==='out').map(t=>parseFloat(t.amount||0))))}</b></span>
      </div>
    </div>`;
}

function exportFYSummaryPDF() {
  const el = document.getElementById('fySummaryContent');
  if (!el) return;
  const now = new Date();
  const fy  = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const w = window.open('', '_blank');
  w.document.write(`
    <!DOCTYPE html><html><head>
    <title>FY ${fy}-${fy+1} Summary — LedgerMate</title>
    <style>
      body{font-family:sans-serif;padding:30px;color:#1a1a1a;max-width:800px;margin:auto;}
      h1{font-size:22px;margin-bottom:4px;} .sub{font-size:13px;color:#666;margin-bottom:20px;}
      table{width:100%;border-collapse:collapse;margin-bottom:20px;}
      th,td{border:1px solid #ddd;padding:8px 12px;text-align:left;font-size:13px;}
      th{background:#f5f5f5;font-weight:600;} .right{text-align:right;}
      .kpi{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap;}
      .kpi-box{padding:14px 20px;border:1px solid #eee;border-radius:8px;flex:1;min-width:120px;}
      .kpi-label{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;}
      .kpi-val{font-size:22px;font-weight:700;margin-top:4px;}
    </style></head><body>
    <h1>LedgerMate — Financial Year Summary</h1>
    <div class="sub">FY ${fy}–${fy+1} | Generated ${new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</div>
    ${el.innerHTML}
    <script>window.onload=function(){window.print();}<\/script>
    </body></html>`);
  w.document.close();
}

/* ══════════════════════════════════════════════════════════════
   EMI PRE-QUALIFIER
══════════════════════════════════════════════════════════════ */
function openEMIModal() {
  const m = document.getElementById('emiModal');
  if (!m) return;
  // Auto-fill monthly income from this month
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const mInc = state.transactions.filter(t => (t.type==='income'||t.type==='in') && (t.date||'').startsWith(thisMonth))
               .reduce((s,t) => s + parseFloat(t.amount||0), 0);
  const el = document.getElementById('emiIncome');
  if (el && !el.value) el.value = Math.round(mInc) || '';
  m.style.display = 'flex';
  calcEMIPreview();
}
function closeEMIModal() {
  const m = document.getElementById('emiModal');
  if (m) m.style.display = 'none';
}
function calcEMIPreview() {
  const P = parseFloat(document.getElementById('emiAmount')?.value || 0);
  const r = parseFloat(document.getElementById('emiRate')?.value || 0) / 100 / 12;
  const n = parseInt(document.getElementById('emiTenure')?.value || 0);
  const income = parseFloat(document.getElementById('emiIncome')?.value || 0);
  const res = document.getElementById('emiResult');
  if (!res || !P || !n) { if (res) res.innerHTML = ''; return; }

  const emi = r === 0 ? P / n : P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const totalPay = emi * n;
  const totalInt = totalPay - P;
  const dti = income > 0 ? (emi / income * 100).toFixed(1) : null;
  const affordable = !dti || parseFloat(dti) <= 40;

  res.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;">
      <div style="padding:12px;background:var(--bg3);border-radius:10px;text-align:center;">
        <div style="font-size:11px;color:var(--text-3);">Monthly EMI</div>
        <div style="font-size:20px;font-weight:800;color:var(--teal);">${fmtINR(Math.round(emi))}</div>
      </div>
      <div style="padding:12px;background:var(--bg3);border-radius:10px;text-align:center;">
        <div style="font-size:11px;color:var(--text-3);">Total Interest</div>
        <div style="font-size:20px;font-weight:800;color:var(--rose);">${fmtINR(Math.round(totalInt))}</div>
      </div>
      <div style="padding:12px;background:var(--bg3);border-radius:10px;text-align:center;">
        <div style="font-size:11px;color:var(--text-3);">Total Payable</div>
        <div style="font-size:20px;font-weight:800;color:var(--violet);">${fmtINR(Math.round(totalPay))}</div>
      </div>
    </div>
    ${dti ? `
    <div style="padding:12px;background:${affordable?'rgba(52,211,153,0.1)':'rgba(251,113,133,0.1)'};border-radius:10px;font-size:13px;">
      <b>Debt-to-Income Ratio: ${dti}%</b> of monthly income
      <div style="margin-top:4px;color:${affordable?'var(--emerald)':'var(--rose)'};">
        ${affordable ? '✓ Within healthy range (≤40%). This loan looks manageable.' : '⚠ Exceeds 40% of income. Consider a smaller loan or longer tenure.'}
      </div>
    </div>` : ''}`;
}

/* ══════════════════════════════════════════════════════════════
   SPENDING HEATMAP — compact, fully responsive
══════════════════════════════════════════════════════════════ */
function renderFullSpendingHeatmap() {
  const el = document.getElementById('spendingHeatmapContent');
  if (!el) return;

  const WEEKS = 16; // ~4 months — fits any screen without scroll
  const BG = ['var(--bg3)','rgba(251,113,133,0.18)','rgba(251,113,133,0.38)','rgba(251,113,133,0.58)','rgba(251,113,133,0.78)','var(--rose)'];
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW = ['M','T','W','T','F','S','S'];

  const txs = state.transactions.filter(t => t.type === 'expense' || t.type === 'out');
  const dailyMap = {};
  txs.forEach(t => { dailyMap[t.date] = (dailyMap[t.date] || 0) + parseFloat(t.amount || 0); });

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - (WEEKS * 7 - 1));
  while (start.getDay() !== 1) start.setDate(start.getDate() - 1); // align to Mon

  const allVals = Object.values(dailyMap).filter(v => v > 0);
  const sorted = allVals.slice().sort((a,b) => a - b);
  const p75 = sorted[Math.floor(sorted.length * 0.75)] || 1;
  const getLevel = v => {
    if (!v) return 0;
    if (v < p75 * 0.2) return 1;
    if (v < p75 * 0.45) return 2;
    if (v < p75 * 0.7) return 3;
    if (v < p75) return 4;
    return 5;
  };

  // Build week columns
  const weeks = [];
  let cur = new Date(start), week = [];
  while (cur <= today) {
    const ds = cur.toISOString().slice(0,10);
    const val = dailyMap[ds] || 0;
    week.push({ date: ds, val, level: getLevel(val) });
    if (cur.getDay() === 0) { weeks.push(week); week = []; }
    cur.setDate(cur.getDate() + 1);
  }
  if (week.length) weeks.push(week);

  // Month change labels
  const monthLabels = weeks.map((wk, i) => {
    const m = new Date(wk[0]?.date).getMonth();
    const prev = i > 0 ? new Date(weeks[i-1][0]?.date).getMonth() : -1;
    return m !== prev ? MON[m] : '';
  });

  // Stats
  const totalSpend = Object.values(dailyMap).reduce((a,b) => a+b, 0);
  const activeDays = allVals.length;
  const avgDay = activeDays ? totalSpend / activeDays : 0;
  const peak = Object.entries(dailyMap).sort((a,b) => b[1]-a[1])[0];

  // Month-wise bar summary (last 4 months)
  const monthSummary = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = d.toISOString().slice(0,7);
    const label = MON[d.getMonth()];
    const total = txs.filter(t => t.date?.startsWith(key)).reduce((s,t) => s + parseFloat(t.amount||0), 0);
    monthSummary.push({ label, total });
  }
  const maxMonth = Math.max(...monthSummary.map(m => m.total), 1);

  el.innerHTML = `
    <!-- Stats row -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
      <div class="hm-stat"><div class="hm-stat-val" style="color:var(--rose)">${fmtINR(totalSpend)}</div><div class="hm-stat-lbl">4-MONTH SPEND</div></div>
      <div class="hm-stat"><div class="hm-stat-val" style="color:var(--gold)">${fmtINR(Math.round(avgDay))}</div><div class="hm-stat-lbl">AVG / DAY</div></div>
      <div class="hm-stat"><div class="hm-stat-val" style="color:var(--violet)">${peak ? fmtINR(peak[1]) : '—'}</div><div class="hm-stat-lbl">PEAK DAY</div></div>
    </div>

    <!-- Month bar summary -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px;">
      ${monthSummary.map(m => {
        const pct = maxMonth > 0 ? Math.round((m.total/maxMonth)*100) : 0;
        return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 8px 6px;text-align:center;">
          <div style="height:36px;display:flex;align-items:flex-end;justify-content:center;margin-bottom:4px;">
            <div style="width:20px;border-radius:4px 4px 0 0;background:linear-gradient(to top,var(--rose),rgba(251,113,133,0.4));height:${Math.max(pct,4)}%;min-height:3px;transition:height 0.6s;"></div>
          </div>
          <div style="font-size:10px;font-weight:700;color:var(--text-3);">${m.label}</div>
          <div style="font-size:11px;font-weight:600;color:var(--text);font-family:var(--font-m);">${m.total > 0 ? fmtINR(Math.round(m.total)) : '—'}</div>
        </div>`;
      }).join('')}
    </div>

    <!-- Heatmap grid -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 10px 10px;">
      <div style="display:flex;gap:0;align-items:flex-start;">
        <!-- Day labels -->
        <div style="display:flex;flex-direction:column;gap:2px;padding-top:18px;margin-right:4px;flex-shrink:0;">
          ${DOW.map(d=>`<div style="height:var(--hm-cell);line-height:var(--hm-cell);font-size:9px;color:var(--text-3);width:12px;text-align:center;">${d}</div>`).join('')}
        </div>
        <!-- Week columns -->
        <div style="flex:1;min-width:0;">
          <div style="display:grid;grid-template-columns:repeat(${weeks.length},1fr);gap:2px;margin-bottom:3px;">
            ${monthLabels.map(l=>`<div style="font-size:9px;color:var(--text-3);text-align:center;overflow:hidden;">${l}</div>`).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(${weeks.length},1fr);gap:2px;">
            ${weeks.map(wk => `
              <div style="display:flex;flex-direction:column;gap:2px;">
                ${wk.map(day => `
                  <div title="${day.date}${day.val ? ': ' + fmtINR(day.val) : ''}"
                       style="aspect-ratio:1;border-radius:2px;background:${BG[day.level]};cursor:${day.val?'pointer':'default'};"></div>`).join('')}
              </div>`).join('')}
          </div>
        </div>
      </div>
      <!-- Legend -->
      <div style="display:flex;align-items:center;gap:4px;margin-top:8px;font-size:10px;color:var(--text-3);">
        <span>Less</span>
        ${BG.map(bg=>`<div style="width:10px;height:10px;border-radius:2px;background:${bg};"></div>`).join('')}
        <span>More</span>
        ${peak ? `<span style="margin-left:auto;color:var(--text-3);">Peak: ${peak[0]}</span>` : ''}
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   MERCHANT AUTO-CATEGORIZE — used in CSV import
══════════════════════════════════════════════════════════════ */
const MERCHANT_PATTERNS = [
  { pattern: /swiggy|zomato|dominos|pizza|mcdonald|kfc|starbucks|café|cafe|restaurant|biryani|dhaba|foodpanda/i, category: 'Food' },
  { pattern: /uber|ola|rapido|redbus|makemytrip|irctc|indigo|spicejet|goibibo|airline|metro|bus|taxi|auto/i, category: 'Transport' },
  { pattern: /netflix|amazon prime|hotstar|disney|spotify|youtube|apple music|zee5|sonyliv|jiocinema/i, category: 'Entertainment' },
  { pattern: /amazon|flipkart|myntra|meesho|nykaa|ajio|snapdeal|shop|mall|store|market/i, category: 'Shopping' },
  { pattern: /electricity|water|gas\s|bescom|tneb|jiofiber|airtel|bsnl|vodafone|vi\s|recharge|broadband|internet|bill\s/i, category: 'Bills' },
  { pattern: /gym|fitness|cult\.fit|healthifyme|apollo|hospital|clinic|pharmacy|medical|doctor|health/i, category: 'Health' },
  { pattern: /hotel|oyo|booking\.com|airbnb|resort|vacation|holiday|tour/i, category: 'Travel' },
  { pattern: /salary|payroll|stipend|wage|bonus|incentive/i, category: 'Salary' },
  { pattern: /emi|loan|mortgage|insurance|premium|lic|hdfc life|sbi life/i, category: 'Finance' },
  { pattern: /school|college|university|tuition|course|udemy|coursera|education|book/i, category: 'Education' },
  { pattern: /rent|pg\s|hostel|housing/i, category: 'Rent' },
  { pattern: /grocery|supermarket|bigbasket|blinkit|zepto|dmart|reliance fresh|vegetables|fruits/i, category: 'Groceries' },
];

function merchantToCategory(text) {
  if (!text) return null;
  for (const { pattern, category } of MERCHANT_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return null;
}

/* ══════════════════════════════════════════════════════════════
   LINKED GOALS TO BUDGET CATEGORIES
══════════════════════════════════════════════════════════════ */
function getGoalLinkedProgress(goal) {
  if (!goal.linkedCategory) return null;
  const now = new Date();
  const startDate = goal.createdAt ? goal.createdAt.slice(0, 10) : '2000-01-01';
  const saved = state.transactions
    .filter(t => (t.type === 'income' || t.type === 'in') && t.category === goal.linkedCategory && t.date >= startDate)
    .reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  return saved;
}

// Patch openSavingsGoalModal to add linked category field
const _origOpenSavingsGoalModal = window.openSavingsGoalModal;
window.openSavingsGoalModal = function(id) {
  if (typeof _origOpenSavingsGoalModal === 'function') _origOpenSavingsGoalModal(id);
  // Inject linked category field if not present
  setTimeout(() => {
    const modal = document.getElementById('savingsGoalModal');
    if (!modal || modal.querySelector('#sgLinkedCategory')) return;
    const btn = modal.querySelector('.btn-submit');
    if (!btn) return;
    const div = document.createElement('div');
    div.className = 'form-group';
    div.innerHTML = `
      <label class="form-label">Link to Income Category (optional)</label>
      <input type="text" id="sgLinkedCategory" class="form-input"
             placeholder="e.g. Salary — auto-tracks contributions">`;
    btn.before(div);
    if (id) {
      const g = (state.savings_goals || []).find(x => x.id == id);
      if (g?.linkedCategory) document.getElementById('sgLinkedCategory').value = g.linkedCategory;
    }
  }, 50);
};

// Patch saveSavingsGoal to persist linkedCategory
const _origSaveSavingsGoal = window.saveSavingsGoal;
window.saveSavingsGoal = async function() {
  const linked = document.getElementById('sgLinkedCategory')?.value.trim() || null;
  if (typeof _origSaveSavingsGoal === 'function') await _origSaveSavingsGoal();
  // Update last saved goal with linkedCategory
  if (linked) {
    const goals = await (window.getAll ? getAll('savings_goals') : Promise.resolve(state.savings_goals || []));
    const last  = goals[goals.length - 1];
    if (last) {
      const updated = { ...last, linkedCategory: linked };
      await put('savings_goals', updated);
      state.savings_goals = state.savings_goals.map(g => g.id === updated.id ? updated : g);
    }
  }
};

/* ══════════════════════════════════════════════════════════════
   PUSH NOTIFICATIONS — bill due date reminders
══════════════════════════════════════════════════════════════ */
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const p = await Notification.requestPermission();
    return p === 'granted';
  }
  return false;
}

function schedulePushNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    // Request permission silently in background
    requestNotificationPermission();
    return;
  }
  checkBillNotifications();
  // Check every 4 hours
  setInterval(checkBillNotifications, 4 * 60 * 60 * 1000);
}

function checkBillNotifications() {
  try {
    const today = nowISO();
    const in3days = new Date(); in3days.setDate(in3days.getDate() + 3);
    const in3 = in3days.toISOString().slice(0, 10);

    // Loan due dates
    (state.loans || []).forEach(loan => {
      if (!loan.dueDate || loan.dueDate > in3 || loan.dueDate < today) return;
      const key = `lm_notif_loan_${loan.id}_${loan.dueDate}`;
      if (localStorage.getItem(key)) return;
      new Notification('LedgerMate — Loan Due', {
        body: `"${loan.description || loan.name}" is due on ${loan.dueDate}. Amount: ${fmtINR(loan.amount)}`,
        icon: '/favicon.ico'
      });
      localStorage.setItem(key, '1');
    });

    // Reminder due dates
    (state.reminders || []).forEach(rem => {
      if (!rem.date || rem.date > in3 || rem.date < today) return;
      const key = `lm_notif_rem_${rem.id}_${rem.date}`;
      if (localStorage.getItem(key)) return;
      new Notification('LedgerMate — Reminder', {
        body: `${rem.title || rem.description || 'Reminder'} on ${rem.date}`,
        icon: '/favicon.ico'
      });
      localStorage.setItem(key, '1');
    });

    // Subscription due dates
    (state.subscriptions || []).forEach(sub => {
      if (!sub.dueDate || sub.dueDate > in3 || sub.dueDate < today) return;
      const key = `lm_notif_sub_${sub.id}_${sub.dueDate}`;
      if (localStorage.getItem(key)) return;
      new Notification('LedgerMate — Subscription Due', {
        body: `"${sub.name}" charges ${fmtINR(sub.amount)} on ${sub.dueDate}`,
        icon: '/favicon.ico'
      });
      localStorage.setItem(key, '1');
    });
  } catch (e) { console.warn('[LM] Push notification error:', e); }
}

/* Expose XIRR and other utilities globally */
window.calcXIRR        = calcXIRR;
window.getPortfolioXIRR = getPortfolioXIRR;
window.merchantToCategory = merchantToCategory;

/* ══════════════════════════════════════════════════════════════
   VIEWS BROWSER — lists all files in /views/ folder
   ➜ To add a new file: push an entry to VIEWS_FILES below.
══════════════════════════════════════════════════════════════ */
const VIEWS_FILES = [
  {
    file: 'views/Preparation/DSA-Prep-Hub.html',
    title: 'DSA Master Preparation Hub',
    description: '200+ DSA questions across 15 categories with approach guides, complexity analysis, and persistent progress tracking for FAANG & MNC interviews.',
    icon: '🧠',
    tags: ['DSA', 'Algorithms', 'FAANG', 'Interview'],
    color: 'var(--teal)'
  },
  {
    file: 'views/Preparation/Java-Prep-kit.html',
    title: 'Java Interview Prep Kit',
    description: 'Core Java concepts, OOP, Collections, Streams, Multithreading, Spring Boot, and common interview Q&A.',
    icon: '☕',
    tags: ['Java', 'Interview', 'Backend'],
    color: 'var(--gold)'
  }
  // Add more entries here as you drop files into /views/
];

function renderViewsBrowser() {
  const el = document.getElementById('viewsBrowserContent');
  if (!el) return;

  if (!VIEWS_FILES.length) {
    el.innerHTML = `<div style="text-align:center;padding:48px 24px;">
      <div style="font-size:48px;margin-bottom:12px;">📂</div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px;">No files yet</div>
      <div style="color:var(--text-3);font-size:13px;">Drop HTML files into the <code>views/</code> folder and add entries to <code>VIEWS_FILES</code> in Common.js</div>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;">
      ${VIEWS_FILES.map((f, i) => `
        <div class="vb-card fade-up fade-up-${Math.min(i+1,5)}" onclick="window.open('${f.file}', '_self')" title="Open ${f.title}">
          <div class="vb-card-icon" style="background:${f.color}18;color:${f.color};">${f.icon}</div>
          <div class="vb-card-body">
            <div class="vb-card-title">${f.title}</div>
            <div class="vb-card-desc">${f.description}</div>
            <div class="vb-card-tags">
              ${f.tags.map(t => `<span class="vb-tag">${t}</span>`).join('')}
            </div>
          </div>
          <div class="vb-card-arrow">↗</div>
        </div>
      `).join('')}
    </div>
    <div style="margin-top:20px;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;font-size:12px;color:var(--text-3);">
      💡 To add more resources: drop an HTML file into the <code style="background:var(--bg3);padding:1px 5px;border-radius:4px;">views/</code> folder and add an entry to <code style="background:var(--bg3);padding:1px 5px;border-radius:4px;">VIEWS_FILES</code> in <code style="background:var(--bg3);padding:1px 5px;border-radius:4px;">js/Common.js</code>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   CASH FLOW CALENDAR
══════════════════════════════════════════════════════════════ */
let _cfcYear  = new Date().getFullYear();
let _cfcMonth = new Date().getMonth(); // 0-indexed

function renderCashFlowCalendar(year, month) {
  if (year  !== undefined) _cfcYear  = year;
  if (month !== undefined) _cfcMonth = month;

  const el = document.getElementById('cashFlowCalendarContent');
  if (!el) return;

  const MON_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
  const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  const y = _cfcYear, m = _cfcMonth;
  const monthKey = `${y}-${String(m+1).padStart(2,'0')}`;

  // Build daily aggregates
  const txs = state.transactions.filter(t => t.date && t.date.startsWith(monthKey));
  const dayMap = {}; // date → { income, expense }
  txs.forEach(t => {
    if (!dayMap[t.date]) dayMap[t.date] = { income: 0, expense: 0 };
    const amt = parseFloat(t.amount) || 0;
    if (t.type === 'in') dayMap[t.date].income += amt;
    else dayMap[t.date].expense += amt;
  });

  // Calendar grid — weeks start Monday
  const firstDay = new Date(y, m, 1);
  const lastDay  = new Date(y, m + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const totalDays = lastDay.getDate();

  // Month summary stats
  const totIncome  = txs.filter(t => t.type === 'in').reduce((s,t) => s + parseFloat(t.amount||0), 0);
  const totExpense = txs.filter(t => t.type !== 'in').reduce((s,t) => s + parseFloat(t.amount||0), 0);
  const netFlow    = totIncome - totExpense;
  const activeDays = Object.keys(dayMap).length;

  // Top category this month
  const catMap = {};
  txs.filter(t => t.type !== 'in').forEach(t => {
    catMap[t.category || 'Other'] = (catMap[t.category || 'Other'] || 0) + parseFloat(t.amount||0);
  });
  const topCat = Object.entries(catMap).sort((a,b) => b[1]-a[1])[0];

  // Build calendar cells
  let cells = '';
  // Empty lead cells
  for (let i = 0; i < startDow; i++) {
    cells += `<div class="cfc-cell cfc-empty"></div>`;
  }

  for (let d = 1; d <= totalDays; d++) {
    const ds   = `${monthKey}-${String(d).padStart(2,'0')}`;
    const data = dayMap[ds];
    const isToday = ds === new Date().toISOString().slice(0,10);
    const net  = data ? data.income - data.expense : 0;
    const hasData = !!data;

    let cls = 'cfc-cell';
    if (isToday)       cls += ' cfc-today';
    if (!hasData)      cls += ' cfc-nodata';
    else if (net > 0)  cls += ' cfc-income';
    else if (net < 0)  cls += ' cfc-expense';
    else               cls += ' cfc-neutral';

    const bar = hasData ? (() => {
      const maxVal = Math.max(data.income, data.expense, 1);
      const iPct   = Math.round((data.income  / maxVal) * 100);
      const ePct   = Math.round((data.expense / maxVal) * 100);
      return `<div class="cfc-bars">
        ${data.income  > 0 ? `<div class="cfc-bar-i" style="height:${iPct}%"></div>` : ''}
        ${data.expense > 0 ? `<div class="cfc-bar-e" style="height:${ePct}%"></div>` : ''}
      </div>`;
    })() : '';

    const amtLabel = hasData
      ? `<div class="cfc-amt">${net >= 0 ? '+' : ''}${Math.abs(net) >= 1000 ? (Math.abs(net)/1000).toFixed(1)+'k' : Math.round(Math.abs(net))}</div>`
      : '';

    cells += `
      <div class="${cls}" onclick="cfcDayDrill('${ds}')" title="${ds}${data ? ': +'+fmtINR(data.income)+' / -'+fmtINR(data.expense) : ''}">
        <div class="cfc-day-num">${d}</div>
        ${bar}
        ${amtLabel}
      </div>`;
  }

  el.innerHTML = `
    <!-- Stats strip -->
    <div class="cfc-stats">
      <div class="cfc-stat">
        <div class="cfc-stat-val" style="color:var(--emerald)">${fmtINR(totIncome)}</div>
        <div class="cfc-stat-lbl">Income</div>
      </div>
      <div class="cfc-stat">
        <div class="cfc-stat-val" style="color:var(--rose)">${fmtINR(totExpense)}</div>
        <div class="cfc-stat-lbl">Expense</div>
      </div>
      <div class="cfc-stat">
        <div class="cfc-stat-val" style="color:${netFlow>=0?'var(--teal)':'var(--rose)'}">${netFlow>=0?'+':''}${fmtINR(netFlow)}</div>
        <div class="cfc-stat-lbl">Net Flow</div>
      </div>
      <div class="cfc-stat">
        <div class="cfc-stat-val" style="color:var(--violet)">${activeDays}</div>
        <div class="cfc-stat-lbl">Active Days</div>
      </div>
    </div>

    <!-- Month nav + calendar -->
    <div class="cfc-card">
      <div class="cfc-nav">
        <button class="cfc-nav-btn" onclick="renderCashFlowCalendar(${m===0?y-1:y},${m===0?11:m-1})">‹</button>
        <span class="cfc-nav-title">${MON_NAMES[m]} ${y}</span>
        <button class="cfc-nav-btn" onclick="renderCashFlowCalendar(${m===11?y+1:y},${m===11?0:m+1})" ${monthKey >= new Date().toISOString().slice(0,7) ? 'disabled style="opacity:0.3"' : ''}>›</button>
      </div>

      <!-- Day-of-week headers -->
      <div class="cfc-dow-row">
        ${DOW.map(d => `<div class="cfc-dow">${d}</div>`).join('')}
      </div>

      <!-- Calendar grid -->
      <div class="cfc-grid">
        ${cells}
      </div>

      <!-- Legend -->
      <div class="cfc-legend">
        <span class="cfc-legend-dot" style="background:var(--emerald)"></span> Income &nbsp;
        <span class="cfc-legend-dot" style="background:var(--rose)"></span> Expense &nbsp;
        <span class="cfc-legend-dot" style="background:var(--bg3);border:1px solid var(--border)"></span> No activity
        ${topCat ? `&nbsp;· Top: <b>${topCat[0]}</b> ${fmtINR(topCat[1])}` : ''}
      </div>
    </div>`;
}

function cfcDayDrill(dateStr) {
  const modal = document.getElementById('cfcDayModal');
  const title = document.getElementById('cfcDayTitle');
  const body  = document.getElementById('cfcDayBody');
  if (!modal) return;

  const txs = state.transactions.filter(t => t.date === dateStr)
    .sort((a,b) => new Date(b.createdAt||b.date) - new Date(a.createdAt||a.date));

  const d = new Date(dateStr);
  title.textContent = `📅 ${d.toLocaleDateString('en-IN', {weekday:'long', day:'numeric', month:'long', year:'numeric'})}`;

  if (!txs.length) {
    body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-3);">No transactions on this day</div>';
  } else {
    const totIn  = txs.filter(t=>t.type==='in').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const totOut = txs.filter(t=>t.type!=='in').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    body.innerHTML = `
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:1;background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.2);border-radius:8px;padding:8px;text-align:center;">
          <div style="font-size:13px;font-weight:700;color:var(--emerald)">${fmtINR(totIn)}</div>
          <div style="font-size:10px;color:var(--text-3)">Income</div>
        </div>
        <div style="flex:1;background:rgba(251,113,133,0.1);border:1px solid rgba(251,113,133,0.2);border-radius:8px;padding:8px;text-align:center;">
          <div style="font-size:13px;font-weight:700;color:var(--rose)">${fmtINR(totOut)}</div>
          <div style="font-size:10px;color:var(--text-3)">Expense</div>
        </div>
      </div>
      ${txs.map(t => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text)">${t.note || '(No note)'}</div>
            <div style="font-size:11px;color:var(--text-3)">${t.category || '—'} · ${t.account || '—'}</div>
          </div>
          <div style="font-size:13px;font-weight:700;font-family:var(--font-m);color:${t.type==='in'?'var(--emerald)':'var(--rose)'}">
            ${t.type==='in'?'+':'−'}${fmtINR(t.amount)}
          </div>
        </div>`).join('')}`;
  }
  modal.style.display = 'flex';
}

/* ══════════════════════════════════════════════════════════════
   DEBT PAYOFF PLANNER — Snowball & Avalanche
══════════════════════════════════════════════════════════════ */
let _debtStrategy = 'avalanche'; // 'avalanche' | 'snowball'

function renderDebtPayoffPlanner() {
  const el = document.getElementById('debtPayoffContent');
  if (!el) return;

  const loans = (state.loans || []).filter(l => {
    const paid = (state.transactions || [])
      .filter(t => (t.note||'').toLowerCase().includes((l.person||'').toLowerCase()) && t.type !== 'in')
      .reduce((s,t) => s + parseFloat(t.amount||0), 0);
    return (parseFloat(l.amount||0) - paid) > 0;
  });

  if (!loans.length) {
    el.innerHTML = `<div style="text-align:center;padding:48px 24px;">
      <div style="font-size:48px;margin-bottom:12px;">🎉</div>
      <div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:8px;">No active loans!</div>
      <div style="color:var(--text-3);font-size:14px;">Add loans in the Loans module to use the planner.</div>
    </div>`;
    return;
  }

  // Build debt objects with remaining balance
  const debts = loans.map(l => {
    const paid = (state.transactions || [])
      .filter(t => (t.note||'').toLowerCase().includes((l.person||'').toLowerCase()) && t.type !== 'in')
      .reduce((s,t) => s + parseFloat(t.amount||0), 0);
    const balance = Math.max(0, parseFloat(l.amount||0) - paid);
    const rate    = parseFloat(l.interestRate || l.interest || 0) / 100 / 12; // monthly
    const minPay  = rate > 0
      ? Math.ceil(balance * rate / (1 - Math.pow(1+rate, -36))) // 3yr default term
      : Math.ceil(balance / 24);
    return { name: l.person || `Loan ${l.id}`, balance, rate, minPay: Math.max(minPay, 100), origBalance: parseFloat(l.amount||0) };
  });

  const totalDebt    = debts.reduce((s,d) => s+d.balance, 0);
  const totalMinPay  = debts.reduce((s,d) => s+d.minPay, 0);

  // Read extra payment from state or default
  const extra = parseFloat(el.dataset.extra || 0);
  const totalPay = totalMinPay + extra;

  el.innerHTML = `
    <!-- Summary stats -->
    <div class="dp-stats">
      <div class="dp-stat"><div class="dp-stat-val" style="color:var(--rose)">${fmtINR(totalDebt)}</div><div class="dp-stat-lbl">Total Debt</div></div>
      <div class="dp-stat"><div class="dp-stat-val" style="color:var(--gold)">${fmtINR(totalMinPay)}</div><div class="dp-stat-lbl">Min / Month</div></div>
      <div class="dp-stat"><div class="dp-stat-val" style="color:var(--teal)">${debts.length}</div><div class="dp-stat-lbl">Loans</div></div>
    </div>

    <!-- Controls -->
    <div class="dp-controls">
      <div style="display:flex;flex-direction:column;gap:4px;flex:1;">
        <label class="form-label">Extra Monthly Payment (₹)</label>
        <input type="number" id="dpExtra" class="form-input" value="${extra}" min="0" step="100"
               placeholder="0" onchange="document.getElementById('debtPayoffContent').dataset.extra=this.value;renderDebtPayoffPlanner()">
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label class="form-label">Strategy</label>
        <div class="dp-strategy-toggle">
          <button class="dp-strat-btn ${_debtStrategy==='avalanche'?'active':''}" onclick="_debtStrategy='avalanche';renderDebtPayoffPlanner()">
            🔥 Avalanche<span class="dp-strat-sub">Highest interest first</span>
          </button>
          <button class="dp-strat-btn ${_debtStrategy==='snowball'?'active':''}" onclick="_debtStrategy='snowball';renderDebtPayoffPlanner()">
            ⛄ Snowball<span class="dp-strat-sub">Smallest balance first</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Comparison: min-only vs with strategy -->
    ${_buildDebtComparison(debts, totalMinPay, extra)}

    <!-- Debt list with payoff bars -->
    <div class="dp-debt-list">
      ${debts.map(d => _buildDebtCard(d, totalDebt)).join('')}
    </div>

    <!-- Month-by-month schedule (first 12 months) -->
    ${_buildPayoffSchedule(debts, totalMinPay, extra)}
  `;
}

function _buildDebtComparison(debts, minPay, extra) {
  const calcPayoff = (dList, totalPay, strategy) => {
    let ds = dList.map(d => ({...d}));
    let months = 0, totalInterest = 0;
    const maxMonths = 600;
    while (ds.some(d => d.balance > 0) && months < maxMonths) {
      months++;
      // Sort by strategy
      const active = ds.filter(d => d.balance > 0);
      if (strategy === 'avalanche') active.sort((a,b) => b.rate - a.rate);
      else active.sort((a,b) => a.balance - b.balance);

      let available = totalPay;
      // Pay minimums on all
      ds.forEach(d => {
        if (d.balance <= 0) return;
        const interest = d.balance * d.rate;
        totalInterest += interest;
        d.balance += interest;
        const pay = Math.min(d.minPay, d.balance);
        d.balance -= pay;
        available -= pay;
      });
      // Apply extra to priority debt
      if (active.length && available > 0) {
        const target = active[0];
        const d = ds.find(x => x.name === target.name);
        if (d) {
          const pay = Math.min(available, d.balance);
          d.balance -= pay;
          if (d.balance < 0.01) d.balance = 0;
        }
      }
    }
    return { months, totalInterest };
  };

  const minOnly   = calcPayoff(debts, minPay, _debtStrategy);
  const withExtra = extra > 0 ? calcPayoff(debts, minPay + extra, _debtStrategy) : null;

  const fmtMonths = m => m >= 12 ? `${Math.floor(m/12)}y ${m%12}m` : `${m}m`;

  return `
    <div class="dp-comparison">
      <div class="dp-cmp-card">
        <div class="dp-cmp-label">Minimum Only</div>
        <div class="dp-cmp-val" style="color:var(--rose)">${fmtMonths(minOnly.months)}</div>
        <div class="dp-cmp-sub">Payoff time</div>
        <div class="dp-cmp-interest">Interest: ${fmtINR(Math.round(minOnly.totalInterest))}</div>
      </div>
      ${withExtra ? `
      <div class="dp-cmp-arrow">→</div>
      <div class="dp-cmp-card dp-cmp-better">
        <div class="dp-cmp-label">${_debtStrategy === 'avalanche' ? '🔥 Avalanche' : '⛄ Snowball'} + ${fmtINR(extra)}/mo</div>
        <div class="dp-cmp-val" style="color:var(--emerald)">${fmtMonths(withExtra.months)}</div>
        <div class="dp-cmp-sub">Payoff time</div>
        <div class="dp-cmp-interest">Interest: ${fmtINR(Math.round(withExtra.totalInterest))}</div>
        <div class="dp-cmp-saved">Save ${fmtINR(Math.round(minOnly.totalInterest - withExtra.totalInterest))} &amp; ${minOnly.months - withExtra.months} months</div>
      </div>` : `
      <div class="dp-cmp-hint">👆 Add extra payment to see savings</div>`}
    </div>`;
}

function _buildDebtCard(d, totalDebt) {
  const paidPct = Math.round(((d.origBalance - d.balance) / d.origBalance) * 100);
  const annualRate = (d.rate * 12 * 100).toFixed(1);
  return `
    <div class="dp-debt-card">
      <div class="dp-debt-header">
        <div>
          <div class="dp-debt-name">${d.name}</div>
          <div class="dp-debt-meta">${annualRate}% p.a. · Min ₹${Math.round(d.minPay).toLocaleString('en-IN')}/mo</div>
        </div>
        <div style="text-align:right;">
          <div class="dp-debt-balance">${fmtINR(d.balance)}</div>
          <div class="dp-debt-meta">${paidPct}% paid</div>
        </div>
      </div>
      <div class="dp-debt-bar-wrap">
        <div class="dp-debt-bar-fill" style="width:${paidPct}%"></div>
      </div>
    </div>`;
}

function _buildPayoffSchedule(debts, minPay, extra) {
  const totalPay = minPay + extra;
  let ds = debts.map(d => ({...d}));
  const rows = [];
  const maxRows = 24;

  for (let m = 1; m <= maxRows && ds.some(d => d.balance > 0); m++) {
    const active = ds.filter(d => d.balance > 0);
    if (_debtStrategy === 'avalanche') active.sort((a,b) => b.rate - a.rate);
    else active.sort((a,b) => a.balance - b.balance);

    let available = totalPay;
    let interestThisMonth = 0;
    let paidThisMonth = 0;

    ds.forEach(d => {
      if (d.balance <= 0) return;
      const interest = d.balance * d.rate;
      interestThisMonth += interest;
      d.balance += interest;
      const pay = Math.min(d.minPay, d.balance);
      d.balance = Math.max(0, d.balance - pay);
      paidThisMonth += pay;
      available -= pay;
    });

    if (active.length && available > 0) {
      const tgt = ds.find(x => x.name === active[0].name && x.balance > 0);
      if (tgt) {
        const pay = Math.min(available, tgt.balance);
        tgt.balance = Math.max(0, tgt.balance - pay);
        paidThisMonth += pay;
      }
    }

    const remaining = ds.reduce((s,d) => s+d.balance, 0);
    const d = new Date(); d.setMonth(d.getMonth() + m);
    rows.push({ month: d.toLocaleDateString('en-IN',{month:'short',year:'numeric'}), paid: paidThisMonth, interest: interestThisMonth, remaining });
  }

  if (!rows.length) return '';

  return `
    <div style="margin-top:16px;">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px;">📋 Payoff Schedule (next ${rows.length} months)</div>
      <div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border);">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:var(--bg3);color:var(--text-3);">
              <th style="padding:8px 10px;text-align:left;font-weight:600;">Month</th>
              <th style="padding:8px 10px;text-align:right;font-weight:600;">Paid</th>
              <th style="padding:8px 10px;text-align:right;font-weight:600;">Interest</th>
              <th style="padding:8px 10px;text-align:right;font-weight:600;">Remaining</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r,i) => `
              <tr style="border-top:1px solid var(--border);background:${i%2===0?'transparent':'rgba(255,255,255,0.02)'}">
                <td style="padding:7px 10px;color:var(--text-2)">${r.month}</td>
                <td style="padding:7px 10px;text-align:right;color:var(--emerald);font-family:var(--font-m)">${fmtINR(Math.round(r.paid))}</td>
                <td style="padding:7px 10px;text-align:right;color:var(--rose);font-family:var(--font-m)">${fmtINR(Math.round(r.interest))}</td>
                <td style="padding:7px 10px;text-align:right;font-family:var(--font-m);font-weight:600;color:${r.remaining<1?'var(--emerald)':'var(--text)'}">${r.remaining < 1 ? '✅ Paid off' : fmtINR(Math.round(r.remaining))}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   HOME SCREEN WIDGET — open standalone widget page
══════════════════════════════════════════════════════════════ */
function openWidgetPage() {
  window.open('widget.html', '_blank');
}

/* ══════════════════════════════════════════════════════════════
   FD / RD TRACKER
══════════════════════════════════════════════════════════════ */
function renderFDRDPage() {
  const el = document.getElementById('fdrdContent');
  if (!el) return;

  const items = state.fd_rd || [];
  const today = new Date();

  const calcMaturity = (item) => {
    const p = parseFloat(item.amount || 0);
    const r = parseFloat(item.rate || 0) / 100;
    const months = parseInt(item.tenureMonths || 12);
    if (item.type === 'RD') {
      const monthlyRate = r / 12;
      return p * months + p * months * (months + 1) / 2 * monthlyRate / 12;
    }
    if (item.payout === 'cumulative') return p * Math.pow(1 + r / 4, 4 * months / 12);
    return p + (p * r * months / 12);
  };

  const daysLeft = (matDate) => {
    const diff = new Date(matDate) - today;
    return Math.ceil(diff / 86400000);
  };

  const totalInvested = items.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const totalMaturity = items.reduce((s, i) => s + calcMaturity(i), 0);
  const maturing30    = items.filter(i => { const d = daysLeft(i.maturityDate); return d > 0 && d <= 30; }).length;

  el.innerHTML = `
    <div class="fdrd-stats">
      <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:var(--teal)">${fmtINR(totalInvested)}</div><div class="fdrd-stat-lbl">Total Invested</div></div>
      <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:var(--emerald)">${fmtINR(Math.round(totalMaturity))}</div><div class="fdrd-stat-lbl">At Maturity</div></div>
      <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:var(--gold)">${fmtINR(Math.round(totalMaturity - totalInvested))}</div><div class="fdrd-stat-lbl">Total Interest</div></div>
      <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:${maturing30>0?'var(--rose)':'var(--text-3)'}">${maturing30}</div><div class="fdrd-stat-lbl">Maturing in 30d</div></div>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-bottom:12px;">
      <button class="btn-submit" style="padding:9px 20px;font-size:13px;" onclick="openFDRDModal()">+ Add FD / RD</button>
    </div>

    ${!items.length ? `<div style="text-align:center;padding:48px;color:var(--text-3);">
      <div style="font-size:40px;margin-bottom:12px;">🏦</div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;">No deposits yet</div>
      <div style="font-size:13px;">Track your Fixed Deposits and Recurring Deposits here.</div>
    </div>` : `
    <div style="display:flex;flex-direction:column;gap:10px;">
      ${items.map(item => {
        const mat = calcMaturity(item);
        const interest = mat - parseFloat(item.amount || 0);
        const dl = daysLeft(item.maturityDate);
        const pct = Math.max(0, Math.min(100, Math.round((1 - dl / parseInt(item.tenureMonths || 12) / 30) * 100)));
        const urgency = dl <= 0 ? 'over' : dl <= 7 ? 'danger' : dl <= 30 ? 'warning' : 'safe';
        const urgencyColor = { over:'var(--text-3)', danger:'var(--rose)', warning:'var(--gold)', safe:'var(--emerald)' }[urgency];
        return `<div class="fdrd-card">
          <div class="fdrd-card-header">
            <div>
              <div class="fdrd-card-badge ${item.type==='FD'?'fd':'rd'}">${item.type}</div>
              <div class="fdrd-card-name">${item.bank || 'Bank'}</div>
              <div class="fdrd-card-meta">${item.rate}% p.a. · ${item.tenureMonths}m · ${item.payout||'Cumulative'}</div>
            </div>
            <div style="text-align:right;">
              <div class="fdrd-card-amount">${fmtINR(Math.round(mat))}</div>
              <div style="font-size:11px;color:var(--text-3);">Principal: ${fmtINR(item.amount)}</div>
              <div style="font-size:11px;color:var(--gold);">+${fmtINR(Math.round(interest))} interest</div>
            </div>
          </div>
          <div class="fdrd-bar-wrap"><div class="fdrd-bar-fill budget-bar-fill ${urgency}" style="width:${pct}%"></div></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
            <span style="font-size:11px;color:var(--text-3);">Matures: ${item.maturityDate}</span>
            <span style="font-size:11px;font-weight:700;color:${urgencyColor};">${dl <= 0 ? 'Matured' : dl === 1 ? 'Tomorrow!' : dl + ' days left'}</span>
          </div>
          <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end;">
            <button class="btn-cancel" style="padding:4px 12px;font-size:11px;" onclick="editFDRD(${item.id})">Edit</button>
            <button class="btn-cancel" style="padding:4px 12px;font-size:11px;color:var(--rose);" onclick="deleteFDRD(${item.id})">Delete</button>
          </div>
        </div>`;
      }).join('')}
    </div>`}`;
}

function openFDRDModal(existing) {
  const isEdit = !!existing;
  showSimpleModal((isEdit ? '✏️ Edit' : '➕ Add') + ' FD / RD', `
    <div style="display:flex;flex-direction:column;gap:12px;padding:4px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div><label class="form-label">Type</label>
          <select id="fdrdType" class="form-input">
            <option value="FD" ${existing?.type==='FD'?'selected':''}>FD (Fixed Deposit)</option>
            <option value="RD" ${existing?.type==='RD'?'selected':''}>RD (Recurring Deposit)</option>
          </select></div>
        <div><label class="form-label">Bank / Institution</label>
          <input id="fdrdBank" class="form-input" placeholder="e.g. SBI, HDFC" value="${existing?.bank||''}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div><label class="form-label">Amount (₹)</label>
          <input id="fdrdAmount" class="form-input" type="number" placeholder="100000" value="${existing?.amount||''}"></div>
        <div><label class="form-label">Interest Rate (% p.a.)</label>
          <input id="fdrdRate" class="form-input" type="number" step="0.1" placeholder="7.5" value="${existing?.rate||''}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div><label class="form-label">Tenure (months)</label>
          <input id="fdrdTenure" class="form-input" type="number" placeholder="12" value="${existing?.tenureMonths||12}"></div>
        <div><label class="form-label">Start Date</label>
          <input id="fdrdStart" class="form-input" type="date" value="${existing?.startDate||nowISO()}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div><label class="form-label">Maturity Date</label>
          <input id="fdrdMaturity" class="form-input" type="date" value="${existing?.maturityDate||''}"></div>
        <div><label class="form-label">Payout Type</label>
          <select id="fdrdPayout" class="form-input">
            <option value="cumulative" ${existing?.payout==='cumulative'?'selected':''}>Cumulative</option>
            <option value="monthly"    ${existing?.payout==='monthly'?'selected':''}>Monthly</option>
            <option value="quarterly"  ${existing?.payout==='quarterly'?'selected':''}>Quarterly</option>
          </select></div>
      </div>
      <div><label class="form-label">Notes</label>
        <input id="fdrdNotes" class="form-input" placeholder="Account number, nominee, etc." value="${existing?.notes||''}"></div>
      <button class="btn-submit" onclick="saveFDRD(${existing?.id||'null'})" style="margin-top:4px;">${isEdit?'Update':'Save'} Deposit</button>
    </div>`);

  // Auto-calculate maturity date from start + tenure
  setTimeout(() => {
    const startEl = document.getElementById('fdrdStart');
    const tenureEl = document.getElementById('fdrdTenure');
    const matEl = document.getElementById('fdrdMaturity');
    const calcMat = () => {
      const s = startEl?.value; const t = parseInt(tenureEl?.value);
      if (s && t) { const d = new Date(s); d.setMonth(d.getMonth() + t); matEl.value = d.toISOString().slice(0,10); }
    };
    startEl?.addEventListener('change', calcMat);
    tenureEl?.addEventListener('input', calcMat);
    if (!existing) calcMat();
  }, 80);
}

async function saveFDRD(id) {
  const item = {
    type:         document.getElementById('fdrdType')?.value,
    bank:         document.getElementById('fdrdBank')?.value?.trim(),
    amount:       parseFloat(document.getElementById('fdrdAmount')?.value) || 0,
    rate:         parseFloat(document.getElementById('fdrdRate')?.value) || 0,
    tenureMonths: parseInt(document.getElementById('fdrdTenure')?.value) || 12,
    startDate:    document.getElementById('fdrdStart')?.value,
    maturityDate: document.getElementById('fdrdMaturity')?.value,
    payout:       document.getElementById('fdrdPayout')?.value,
    notes:        document.getElementById('fdrdNotes')?.value?.trim()
  };
  if (!item.amount || !item.bank) { showToast('Fill bank and amount', 'error'); return; }
  if (id && id !== 'null') {
    item.id = id;
    await put('fd_rd', item);
    state.fd_rd = state.fd_rd.map(x => x.id === id ? { ...x, ...item } : x);
  } else {
    const saved = await put('fd_rd', item);
    item.id = saved;
    state.fd_rd.push(item);
  }
  autoBackup();
  closeSimpleModal();
  renderFDRDPage();
  showToast('Deposit saved!', 'success');
}

function editFDRD(id) { openFDRDModal(state.fd_rd.find(x => x.id === id)); }

async function deleteFDRD(id) {
  if (!confirm('Delete this deposit?')) return;
  await del('fd_rd', id);
  state.fd_rd = state.fd_rd.filter(x => x.id !== id);
  renderFDRDPage();
  showToast('Deleted', 'success');
}

/* ══════════════════════════════════════════════════════════════
   TRANSACTION TEMPLATES
══════════════════════════════════════════════════════════════ */
function renderTemplatesPage() {
  const el = document.getElementById('templatesContent');
  if (!el) return;
  const tpls = state.tx_templates || [];

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <div style="font-size:13px;color:var(--text-3);">${tpls.length} template${tpls.length!==1?'s':''} · Tap to use</div>
      <button class="btn-submit" style="padding:9px 20px;font-size:13px;" onclick="openTemplateModal()">+ New Template</button>
    </div>
    ${!tpls.length ? `<div style="text-align:center;padding:48px;color:var(--text-3);">
      <div style="font-size:40px;margin-bottom:12px;">📋</div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;">No templates yet</div>
      <div style="font-size:13px;">Save your frequent transactions as templates for one-tap entry.</div>
    </div>` : `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;">
      ${tpls.map(t => {
        const typeCls = t.type === 'in' ? 'income' : 'expense';
        const sign    = t.type === 'in' ? '+' : '−';
        return `<div class="tpl-card" onclick="useTemplate(${t.id})">
          <div class="tpl-card-top">
            <div class="tpl-icon ${typeCls}">${t.type==='in'?'📈':'💸'}</div>
            <div style="flex:1;min-width:0;">
              <div class="tpl-name">${t.name}</div>
              <div class="tpl-meta">${t.category||'—'} · ${t.account||'—'}</div>
            </div>
            <div class="tpl-amount ${typeCls}">${sign}${fmtINR(t.amount)}</div>
          </div>
          ${t.note ? `<div class="tpl-note">${t.note}</div>` : ''}
          <div class="tpl-actions">
            <button onclick="event.stopPropagation();openTemplateModal(${t.id})" class="tpl-btn">✏️ Edit</button>
            <button onclick="event.stopPropagation();deleteTemplate(${t.id})" class="tpl-btn" style="color:var(--rose);">🗑️ Delete</button>
          </div>
        </div>`;
      }).join('')}
    </div>`}`;
}

function openTemplateModal(id) {
  const ex = id ? state.tx_templates.find(t => t.id === id) : null;
  const cats = state.dropdowns?.categories || ['Food','Transport','Bills','Shopping','Other'];
  const accs = state.dropdowns?.accounts   || ['Cash','Bank'];
  showSimpleModal((ex ? '✏️ Edit' : '➕ New') + ' Template', `
    <div style="display:flex;flex-direction:column;gap:12px;padding:4px;">
      <div><label class="form-label">Template Name</label>
        <input id="tplName" class="form-input" placeholder="e.g. Monthly Rent" value="${ex?.name||''}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div><label class="form-label">Type</label>
          <select id="tplType" class="form-input">
            <option value="out" ${ex?.type==='out'||!ex?'selected':''}>Expense</option>
            <option value="in"  ${ex?.type==='in'?'selected':''}>Income</option>
          </select></div>
        <div><label class="form-label">Amount (₹)</label>
          <input id="tplAmount" class="form-input" type="number" placeholder="0" value="${ex?.amount||''}"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div><label class="form-label">Category</label>
          <select id="tplCategory" class="form-input">${cats.map(c=>`<option ${ex?.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div><label class="form-label">Account</label>
          <select id="tplAccount" class="form-input">${accs.map(a=>`<option ${ex?.account===a?'selected':''}>${a}</option>`).join('')}</select></div>
      </div>
      <div><label class="form-label">Default Note</label>
        <input id="tplNote" class="form-input" placeholder="Optional note" value="${ex?.note||''}"></div>
      <button class="btn-submit" onclick="saveTemplate(${ex?.id||'null'})" style="margin-top:4px;">${ex?'Update':'Save'} Template</button>
    </div>`);
}

async function saveTemplate(id) {
  const tpl = {
    name:     document.getElementById('tplName')?.value?.trim(),
    type:     document.getElementById('tplType')?.value,
    amount:   parseFloat(document.getElementById('tplAmount')?.value) || 0,
    category: document.getElementById('tplCategory')?.value,
    account:  document.getElementById('tplAccount')?.value,
    note:     document.getElementById('tplNote')?.value?.trim()
  };
  if (!tpl.name) { showToast('Enter a template name', 'error'); return; }
  if (id && id !== 'null') {
    tpl.id = id;
    await put('tx_templates', tpl);
    state.tx_templates = state.tx_templates.map(x => x.id === id ? { ...x, ...tpl } : x);
  } else {
    const sid = await put('tx_templates', tpl);
    tpl.id = sid;
    state.tx_templates.push(tpl);
  }
  autoBackup(); closeSimpleModal(); renderTemplatesPage();
  showToast('Template saved!', 'success');
}

function useTemplate(id) {
  const tpl = state.tx_templates.find(t => t.id === id);
  if (!tpl) return;
  openAddTransactionModal({ type: tpl.type, amount: tpl.amount, category: tpl.category, account: tpl.account, note: tpl.note });
}

function applyTplToForm(id) {
  const tpl = (state.tx_templates || []).find(t => t.id === id);
  if (!tpl) return;
  // type
  document.querySelectorAll('#atxTypeToggle .atx-type-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.val === tpl.type);
  });
  const txTypeEl = document.getElementById('tx_type');
  if (txTypeEl) txTypeEl.value = tpl.type;
  // amount
  const amtEl = document.getElementById('tx_amount');
  if (amtEl) { amtEl.value = tpl.amount; amtEl.dispatchEvent(new Event('input')); }
  // account
  const accEl = document.getElementById('tx_account');
  if (accEl) accEl.value = tpl.account;
  // category
  document.querySelectorAll('#atxCatGrid .atx-cat-chip').forEach(c => {
    c.classList.toggle('active', c.dataset.cat === tpl.category);
  });
  const catEl = document.getElementById('tx_category');
  if (catEl) catEl.value = tpl.category;
  // note
  const noteEl = document.getElementById('tx_note');
  if (noteEl) noteEl.value = tpl.note || '';
  showToast(`"${tpl.name}" applied`, 'success');
}

function editTemplate(id) { openTemplateModal(id); }

async function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  await del('tx_templates', id);
  state.tx_templates = state.tx_templates.filter(x => x.id !== id);
  renderTemplatesPage();
  showToast('Deleted', 'success');
}

/* ══════════════════════════════════════════════════════════════
   MONTH vs MONTH COMPARISON
══════════════════════════════════════════════════════════════ */
let _mvm = { y0: new Date().getFullYear(), m0: new Date().getMonth() };

function renderMonthComparison() {
  const el = document.getElementById('monthCompContent');
  if (!el) return;

  const { y0, m0 } = _mvm;
  const months = [
    { year: y0, month: m0 },
    { year: m0 === 0 ? y0-1 : y0, month: m0 === 0 ? 11 : m0-1 },
    { year: m0 <= 1 ? y0-1 : y0, month: m0 <= 1 ? m0+10 : m0-2 }
  ];
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const getMonthData = ({year, month}) => {
    const key = `${year}-${String(month+1).padStart(2,'0')}`;
    const txs = state.transactions.filter(t => t.date?.startsWith(key));
    const income  = txs.filter(t=>t.type==='in').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const expense = txs.filter(t=>t.type!=='in').reduce((s,t)=>s+parseFloat(t.amount||0),0);
    const cats = {};
    txs.filter(t=>t.type!=='in').forEach(t => { cats[t.category||'Other'] = (cats[t.category||'Other']||0)+parseFloat(t.amount||0); });
    return { key, label: `${MON[month]} ${year}`, income, expense, net: income-expense, cats };
  };

  const data = months.map(getMonthData);
  const cur = data[0], prev = data[1], prev2 = data[2];

  // All categories across 3 months
  const allCats = [...new Set([...Object.keys(cur.cats), ...Object.keys(prev.cats), ...Object.keys(prev2.cats)])].sort();

  const delta = (a, b) => {
    if (!b) return '';
    const d = a - b;
    const pct = b > 0 ? Math.round((d/b)*100) : 0;
    const color = d > 0 ? 'var(--rose)' : 'var(--emerald)';
    return `<span style="font-size:10px;color:${color};font-weight:700;">${d>0?'▲':'▼'}${Math.abs(pct)}%</span>`;
  };

  el.innerHTML = `
    <!-- Month selector -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="cfc-nav-btn" onclick="_mvm.m0=${m0===0?11:m0-1};_mvm.y0=${m0===0?y0-1:y0};renderMonthComparison()">‹</button>
      <span style="font-size:15px;font-weight:700;color:var(--text);">Comparing from <em>${cur.label}</em></span>
      <button class="cfc-nav-btn" onclick="_mvm.m0=${m0===11?0:m0+1};_mvm.y0=${m0===11?y0+1:y0};renderMonthComparison()" ${`${y0}-${String(m0+1).padStart(2,'0')}` >= new Date().toISOString().slice(0,7) ? 'disabled style="opacity:0.3"':''}>›</button>
    </div>

    <!-- Summary cards -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
      ${data.map((d,i) => `<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;${i===0?'border-color:var(--teal);':''}">
        <div style="font-size:11px;font-weight:700;color:${i===0?'var(--teal)':'var(--text-3)'};margin-bottom:6px;">${d.label}${i===0?' (Current)':''}</div>
        <div style="font-size:11px;color:var(--emerald);font-family:var(--font-m);">+${fmtINR(d.income)}</div>
        <div style="font-size:11px;color:var(--rose);font-family:var(--font-m);">−${fmtINR(d.expense)}</div>
        <div style="font-size:13px;font-weight:700;color:${d.net>=0?'var(--teal)':'var(--rose)'};margin-top:4px;font-family:var(--font-m);">${d.net>=0?'+':''}${fmtINR(d.net)}</div>
      </div>`).join('')}
    </div>

    <!-- Category table -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;">
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:var(--bg3);">
              <th style="padding:10px 12px;text-align:left;color:var(--text-3);font-weight:700;">Category</th>
              ${data.map((d,i) => `<th style="padding:10px 12px;text-align:right;color:${i===0?'var(--teal)':'var(--text-3)'};font-weight:700;">${d.label}</th>`).join('')}
              <th style="padding:10px 12px;text-align:right;color:var(--text-3);font-weight:700;">vs Last</th>
            </tr>
          </thead>
          <tbody>
            ${allCats.map((cat,i) => `
              <tr style="border-top:1px solid var(--border);background:${i%2?'rgba(255,255,255,0.01)':'transparent'}">
                <td style="padding:8px 12px;color:var(--text-2);font-weight:600;">${cat}</td>
                ${data.map(d => `<td style="padding:8px 12px;text-align:right;font-family:var(--font-m);color:${d.cats[cat]>0?'var(--rose)':'var(--text-3)'};">${d.cats[cat]?fmtINR(d.cats[cat]):'—'}</td>`).join('')}
                <td style="padding:8px 12px;text-align:right;">${delta(cur.cats[cat]||0, prev.cats[cat]||0)}</td>
              </tr>`).join('')}
            <tr style="border-top:2px solid var(--border);background:var(--bg3);font-weight:700;">
              <td style="padding:10px 12px;color:var(--text);">Total Expense</td>
              ${data.map(d => `<td style="padding:10px 12px;text-align:right;font-family:var(--font-m);color:var(--rose);">${fmtINR(d.expense)}</td>`).join('')}
              <td style="padding:10px 12px;text-align:right;">${delta(cur.expense, prev.expense)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   EMERGENCY FUND TRACKER
══════════════════════════════════════════════════════════════ */
function renderEmergencyFund() {
  const el = document.getElementById('emergencyFundContent');
  if (!el) return;

  const efKey = `lm_u_${window.LM_Auth?.getCurrentUserId?.()||'default'}_ef`;
  const ef = JSON.parse(localStorage.getItem(efKey) || '{"target_months":6,"saved":0}');

  const last3Months = [0,1,2].map(i => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0,7);
    return state.transactions.filter(t => t.type !== 'in' && t.date?.startsWith(key))
      .reduce((s,t) => s + parseFloat(t.amount||0), 0);
  });
  const avgMonthlyExpense = last3Months.reduce((a,b)=>a+b,0) / 3;
  const target = avgMonthlyExpense * ef.target_months;
  const saved  = parseFloat(ef.saved || 0);
  const pct    = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const monthsCovered = avgMonthlyExpense > 0 ? (saved / avgMonthlyExpense).toFixed(1) : '∞';

  const ringSize = 140;
  const r = 54, cx = 70, cy = 70;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  el.innerHTML = `
    <!-- SVG progress ring -->
    <div style="display:flex;flex-direction:column;align-items:center;margin-bottom:20px;">
      <svg width="${ringSize}" height="${ringSize}" style="transform:rotate(-90deg);">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg3)" stroke-width="12"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
          stroke="${pct>=100?'var(--emerald)':pct>=50?'var(--teal)':'var(--gold)'}"
          stroke-width="12" stroke-linecap="round"
          stroke-dasharray="${dash} ${circumference}"
          style="transition:stroke-dasharray 1s cubic-bezier(.4,0,.2,1);"/>
      </svg>
      <div style="margin-top:-${ringSize/2+16}px;text-align:center;position:relative;z-index:1;">
        <div style="font-size:26px;font-weight:800;font-family:var(--font-m);color:var(--text);">${pct}%</div>
        <div style="font-size:11px;color:var(--text-3);font-weight:700;">FUNDED</div>
      </div>
      <div style="height:${ringSize/2+4}px;"></div>
    </div>

    <!-- Stats -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px;">
      <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:var(--teal)">${fmtINR(Math.round(saved))}</div><div class="fdrd-stat-lbl">Saved</div></div>
      <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:var(--gold)">${fmtINR(Math.round(target))}</div><div class="fdrd-stat-lbl">${ef.target_months}M Target</div></div>
      <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:var(--emerald)">${monthsCovered}</div><div class="fdrd-stat-lbl">Months Covered</div></div>
    </div>

    <!-- Settings -->
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px;">Emergency Fund Settings</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div><label class="form-label">Target (months of expenses)</label>
          <select id="efMonths" class="form-input" onchange="saveEFSettings()">
            ${[3,6,9,12].map(m=>`<option value="${m}" ${ef.target_months==m?'selected':''}>${m} months</option>`).join('')}
          </select></div>
        <div><label class="form-label">Amount Saved (₹)</label>
          <input id="efSaved" class="form-input" type="number" value="${saved}" onchange="saveEFSettings()" placeholder="0"></div>
      </div>
      <div style="font-size:12px;color:var(--text-3);line-height:1.6;">
        Avg monthly expense (last 3 months): <strong style="color:var(--text)">${fmtINR(Math.round(avgMonthlyExpense))}</strong><br>
        Remaining to goal: <strong style="color:${target-saved>0?'var(--rose)':'var(--emerald)'}">
          ${target-saved > 0 ? fmtINR(Math.round(target-saved)) : '🎉 Goal reached!'}
        </strong>
      </div>
    </div>`;
}

function saveEFSettings() {
  const efKey = `lm_u_${window.LM_Auth?.getCurrentUserId?.()||'default'}_ef`;
  const ef = {
    target_months: parseInt(document.getElementById('efMonths')?.value || 6),
    saved: parseFloat(document.getElementById('efSaved')?.value || 0)
  };
  localStorage.setItem(efKey, JSON.stringify(ef));
  renderEmergencyFund();
}

/* ══════════════════════════════════════════════════════════════
   WEALTH & GOALS EXTRAS — Milestones, Gold, Loan vs Invest, Retirement
══════════════════════════════════════════════════════════════ */
const NW_MILESTONES = [
  { label: '₹1 Lakh',   value: 100000,    icon: '🥉' },
  { label: '₹5 Lakh',   value: 500000,    icon: '🥈' },
  { label: '₹10 Lakh',  value: 1000000,   icon: '🥇' },
  { label: '₹25 Lakh',  value: 2500000,   icon: '💎' },
  { label: '₹50 Lakh',  value: 5000000,   icon: '🏆' },
  { label: '₹1 Crore',  value: 10000000,  icon: '🚀' },
  { label: '₹5 Crore',  value: 50000000,  icon: '⭐' },
];

function renderWealthGoalsPage() {
  const el = document.getElementById('wealthGoalsContent');
  if (!el) return;

  const totalAssets = (state.investments||[]).reduce((s,i) => s + parseFloat(i.currentValue||i.amount||0), 0);
  const totalLoans  = (state.loans||[]).reduce((s,l) => s + parseFloat(l.amount||0), 0);
  const netWorth    = totalAssets - totalLoans;

  // Gold tracker
  const gKey = `lm_u_${window.LM_Auth?.getCurrentUserId?.()||'default'}_gold`;
  const goldData = JSON.parse(localStorage.getItem(gKey) || '{"grams":0,"price":7200}');

  el.innerHTML = `
    <!-- Net Worth Milestones -->
    <div class="wg-section">
      <div class="wg-section-title">🏆 Net Worth Milestones</div>
      <div style="font-size:13px;color:var(--text-3);margin-bottom:12px;">Current Net Worth: <strong style="color:var(--text);font-family:var(--font-m);">${fmtINR(Math.round(netWorth))}</strong></div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${NW_MILESTONES.map(m => {
          const achieved = netWorth >= m.value;
          const pct = Math.min(100, Math.round((netWorth / m.value) * 100));
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${achieved?'rgba(52,211,153,0.08)':'var(--surface)'};border:1px solid ${achieved?'rgba(52,211,153,0.3)':'var(--border)'};border-radius:10px;">
            <span style="font-size:22px;">${m.icon}</span>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="font-size:13px;font-weight:600;color:${achieved?'var(--emerald)':'var(--text)'};">${m.label}</span>
                <span style="font-size:11px;color:${achieved?'var(--emerald)':'var(--text-3)'};">${achieved?'✅ Achieved!':pct+'%'}</span>
              </div>
              <div style="height:4px;background:var(--bg3);border-radius:99px;"><div style="height:100%;width:${pct}%;background:${achieved?'var(--emerald)':'var(--teal)'};border-radius:99px;transition:width 0.8s;"></div></div>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Gold Tracker -->
    <div class="wg-section">
      <div class="wg-section-title">🪙 Gold Tracker</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div><label class="form-label">Gold Held (grams)</label>
          <input id="goldGrams" class="form-input" type="number" step="0.1" value="${goldData.grams}" placeholder="0" onchange="updateGold()"></div>
        <div><label class="form-label">Price per gram (₹)</label>
          <input id="goldPrice" class="form-input" type="number" value="${goldData.price}" placeholder="7200" onchange="updateGold()"></div>
      </div>
      <div id="goldResult" style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:10px;padding:12px;text-align:center;">
        <div style="font-size:22px;font-weight:800;font-family:var(--font-m);color:var(--gold);">${fmtINR(Math.round(goldData.grams * goldData.price))}</div>
        <div style="font-size:11px;color:var(--text-3);">Current Gold Value (${goldData.grams}g × ₹${goldData.price}/g)</div>
      </div>
    </div>

    <!-- Loan vs Invest Calculator -->
    <div class="wg-section">
      <div class="wg-section-title">⚖️ Loan vs Invest Calculator</div>
      <div style="font-size:12px;color:var(--text-3);margin-bottom:12px;">Should you prepay your loan or invest that amount?</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div><label class="form-label">Loan Interest Rate (% p.a.)</label>
          <input id="lviLoanRate" class="form-input" type="number" step="0.1" placeholder="8.5" oninput="calcLoanVsInvest()"></div>
        <div><label class="form-label">Expected Investment Return (% p.a.)</label>
          <input id="lviInvReturn" class="form-input" type="number" step="0.1" placeholder="12" oninput="calcLoanVsInvest()"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div><label class="form-label">Amount to Deploy (₹)</label>
          <input id="lviAmount" class="form-input" type="number" placeholder="50000" oninput="calcLoanVsInvest()"></div>
        <div><label class="form-label">Horizon (years)</label>
          <input id="lviYears" class="form-input" type="number" placeholder="5" oninput="calcLoanVsInvest()"></div>
      </div>
      <div id="lviResult"></div>
    </div>

    <!-- Retirement Calculator -->
    <div class="wg-section">
      <div class="wg-section-title">🏖️ Retirement Calculator</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div><label class="form-label">Current Age</label>
          <input id="retAge" class="form-input" type="number" placeholder="30" oninput="calcRetirement()"></div>
        <div><label class="form-label">Retirement Age</label>
          <input id="retRetAge" class="form-input" type="number" placeholder="60" oninput="calcRetirement()"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div><label class="form-label">Monthly Savings (₹)</label>
          <input id="retSaving" class="form-input" type="number" placeholder="20000" oninput="calcRetirement()"></div>
        <div><label class="form-label">Expected Return (% p.a.)</label>
          <input id="retReturn" class="form-input" type="number" step="0.1" placeholder="12" oninput="calcRetirement()"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
        <div><label class="form-label">Monthly Expense in Retirement (₹)</label>
          <input id="retExpense" class="form-input" type="number" placeholder="50000" oninput="calcRetirement()"></div>
        <div><label class="form-label">Inflation Rate (% p.a.)</label>
          <input id="retInflation" class="form-input" type="number" step="0.1" placeholder="6" oninput="calcRetirement()"></div>
      </div>
      <div id="retResult"></div>
    </div>`;
}

function updateGold() {
  const grams = parseFloat(document.getElementById('goldGrams')?.value || 0);
  const price  = parseFloat(document.getElementById('goldPrice')?.value || 7200);
  const gKey   = `lm_u_${window.LM_Auth?.getCurrentUserId?.()||'default'}_gold`;
  localStorage.setItem(gKey, JSON.stringify({ grams, price }));
  const res = document.getElementById('goldResult');
  if (res) {
    res.innerHTML = `<div style="font-size:22px;font-weight:800;font-family:var(--font-m);color:var(--gold);">${fmtINR(Math.round(grams*price))}</div>
      <div style="font-size:11px;color:var(--text-3);">Current Gold Value (${grams}g × ₹${price}/g)</div>`;
  }
}

function calcLoanVsInvest() {
  const lRate  = parseFloat(document.getElementById('lviLoanRate')?.value) / 100;
  const iRate  = parseFloat(document.getElementById('lviInvReturn')?.value) / 100;
  const amt    = parseFloat(document.getElementById('lviAmount')?.value);
  const years  = parseFloat(document.getElementById('lviYears')?.value);
  const res    = document.getElementById('lviResult');
  if (!res || !lRate || !iRate || !amt || !years) { if(res) res.innerHTML=''; return; }

  const interestSaved = amt * lRate * years; // simplified linear interest saved
  const investGain    = amt * (Math.pow(1 + iRate, years) - 1);
  const winner = investGain > interestSaved ? 'invest' : 'prepay';
  const advantage = Math.abs(investGain - interestSaved);

  res.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">
    <div style="background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.2);border-radius:10px;padding:12px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:var(--text-3);margin-bottom:4px;">PREPAY LOAN</div>
      <div style="font-size:18px;font-weight:800;color:var(--rose);font-family:var(--font-m);">${fmtINR(Math.round(interestSaved))}</div>
      <div style="font-size:10px;color:var(--text-3);">Interest saved</div>
    </div>
    <div style="background:rgba(52,211,153,0.08);border:1px solid rgba(52,211,153,0.2);border-radius:10px;padding:12px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:var(--text-3);margin-bottom:4px;">INVEST</div>
      <div style="font-size:18px;font-weight:800;color:var(--emerald);font-family:var(--font-m);">${fmtINR(Math.round(investGain))}</div>
      <div style="font-size:10px;color:var(--text-3);">Investment gain</div>
    </div>
  </div>
  <div style="margin-top:10px;padding:10px 14px;background:${winner==='invest'?'rgba(52,211,153,0.08)':'rgba(96,165,250,0.08)'};border-radius:10px;border:1px solid ${winner==='invest'?'rgba(52,211,153,0.2)':'rgba(96,165,250,0.2)'};font-size:13px;font-weight:700;color:${winner==='invest'?'var(--emerald)':'var(--blue)'};">
    💡 ${winner==='invest'?'Investing wins':'Prepaying wins'} by ${fmtINR(Math.round(advantage))} over ${years} years.
  </div>`;
}

function calcRetirement() {
  const age     = parseInt(document.getElementById('retAge')?.value);
  const retAge  = parseInt(document.getElementById('retRetAge')?.value);
  const saving  = parseFloat(document.getElementById('retSaving')?.value);
  const ret     = parseFloat(document.getElementById('retReturn')?.value) / 100 / 12;
  const expense = parseFloat(document.getElementById('retExpense')?.value);
  const infl    = parseFloat(document.getElementById('retInflation')?.value) / 100;
  const res     = document.getElementById('retResult');
  if (!res || !age || !retAge || !saving || !ret || !expense) { if(res) res.innerHTML=''; return; }

  const years = retAge - age;
  const months = years * 12;
  // Future value of monthly savings
  const corpus = saving * (Math.pow(1 + ret, months) - 1) / ret;
  // Corpus needed (25x annual expense adjusted for inflation — 4% SWR)
  const futureExpense = expense * Math.pow(1 + infl, years);
  const corpusNeeded  = futureExpense * 12 * 25;
  const shortfall     = corpusNeeded - corpus;
  const extraNeeded   = shortfall > 0 && months > 0
    ? Math.round(shortfall * ret / (Math.pow(1 + ret, months) - 1))
    : 0;

  res.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;">
    <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:var(--teal)">${fmtINR(Math.round(corpus))}</div><div class="fdrd-stat-lbl">Projected Corpus</div></div>
    <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:var(--violet)">${fmtINR(Math.round(corpusNeeded))}</div><div class="fdrd-stat-lbl">Corpus Needed</div></div>
    <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:var(--gold)">${fmtINR(Math.round(futureExpense))}</div><div class="fdrd-stat-lbl">Monthly Expense at ${retAge}</div></div>
    <div class="fdrd-stat"><div class="fdrd-stat-val" style="color:${shortfall<=0?'var(--emerald)':'var(--rose)'};">${shortfall<=0?'🎉 On Track!':fmtINR(extraNeeded)+'/mo more'}</div><div class="fdrd-stat-lbl">${shortfall<=0?'':'Extra Needed'}</div></div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   CUSTOM DASHBOARD — widget visibility toggle
══════════════════════════════════════════════════════════════ */
const DASHBOARD_WIDGETS = [
  { id: 'kpiCards',         label: 'KPI Cards',           icon: '📊' },
  { id: 'nwSparklineWidget',label: 'Net Worth Trend',      icon: '📈' },
  { id: 'budgetOverview',   label: 'Budget Overview',      icon: '🎯' },
  { id: 'topCategories',    label: 'Top Categories',       icon: '🗂️' },
  { id: 'heatmap-wrap',     label: 'Expense Heatmap',      icon: '🗓️' },
  { id: 'recentList',       label: 'Recent Transactions',  icon: '↕️' },
];

function openDashboardCustomizer() {
  const cfg = state.dashboard_config?.widgets || {};
  showSimpleModal('🎛️ Customize Dashboard', `
    <div style="display:flex;flex-direction:column;gap:6px;padding:4px;">
      <div style="font-size:12px;color:var(--text-3);margin-bottom:6px;">Toggle widgets on or off. Changes take effect immediately.</div>
      ${DASHBOARD_WIDGETS.map(w => {
        const visible = cfg[w.id] !== false;
        return `<label style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;cursor:pointer;">
          <span style="font-size:20px;">${w.icon}</span>
          <span style="flex:1;font-size:13px;font-weight:600;color:var(--text);">${w.label}</span>
          <input type="checkbox" id="dw_${w.id}" ${visible?'checked':''} onchange="toggleDashWidget('${w.id}',this.checked)"
            style="width:18px;height:18px;accent-color:var(--teal);cursor:pointer;">
        </label>`;
      }).join('')}
    </div>`);
}

async function toggleDashWidget(id, visible) {
  if (!state.dashboard_config) state.dashboard_config = { id: 'main', widgets: {} };
  if (!state.dashboard_config.widgets) state.dashboard_config.widgets = {};
  state.dashboard_config.widgets[id] = visible;
  await put('dashboard_config', state.dashboard_config);
  applyDashboardConfig();
}

function applyDashboardConfig() {
  const cfg = state.dashboard_config?.widgets || {};
  DASHBOARD_WIDGETS.forEach(w => {
    // Handle both direct ID and parent .heatmap-wrap
    const el = document.getElementById(w.id) || document.querySelector(`.${w.id}`);
    if (!el) return;
    const visible = cfg[w.id] !== false;
    // Walk up to find the section container
    const section = el.closest('.fade-up') || el.closest('.card') || el.parentElement;
    const target = (w.id === 'recentList' || w.id === 'kpiCards') ? el.parentElement : section;
    if (target) target.style.display = visible ? '' : 'none';
  });
}