/* ============================================================
   Wealth Module — LedgerMate (Enhanced + Loans Analytics)
   Tabs: Assets | Liabilities | Loans | Net Worth | Allocation
   ============================================================ */

// ─── Asset Category Mapping ───────────────────────────────────
const ASSET_CATEGORIES = {
  Equity:           { icon: '📈', color: '#3b82f6', types: ['STOCK','SIP_EQUITY','MF_EQUITY','MUTUAL_FUND'] },
  Debt:             { icon: '🏦', color: '#10b981', types: ['FD','RD','SIP_DEBT','MF_DEBT','BOND'] },
  'Real Estate':    { icon: '🏠', color: '#f59e0b', types: ['REAL_ESTATE','PROPERTY'] },
  Commodities:      { icon: '🪙', color: '#d97706', types: ['GOLD','SILVER','PHYSICAL','COMMODITY'] },
  'Cash & Savings': { icon: '💵', color: '#8b5cf6', types: ['CASH','SAVINGS','LIQUID','EPF','PPF'] },
};

const DEFAULT_ALLOCATION = [
  { id: 'alloc_equity',        category: 'Equity',           target: 55 },
  { id: 'alloc_debt',          category: 'Debt',             target: 20 },
  { id: 'alloc_realestate',    category: 'Real Estate',      target: 10 },
  { id: 'alloc_commodities',   category: 'Commodities',      target: 10 },
  { id: 'alloc_cash',          category: 'Cash & Savings',   target:  5 },
];

const LIABILITY_TYPES = ['Home Loan','Car Loan','Personal Loan','Education Loan',
                         'Business Loan','Gold Loan','Credit Card','Other'];

// ─── Helper: asset category ───────────────────────────────────
function getAssetCategory(inv) {
  if (!inv) return 'Commodities';
  const t   = (inv.type || '').toUpperCase();
  const sub = (inv.subType || inv.category || '').toLowerCase();
  if (['GOLD','SILVER','PHYSICAL','COMMODITY'].includes(t))   return 'Commodities';
  if (['REAL_ESTATE','PROPERTY'].includes(t))                 return 'Real Estate';
  if (['FD','RD','BOND'].includes(t))                         return 'Debt';
  if (['STOCK','MUTUAL_FUND'].includes(t))                    return 'Equity';
  if (t === 'SIP') return sub.includes('debt') ? 'Debt' : 'Equity';
  if (['CASH','SAVINGS','LIQUID','EPF','PPF'].includes(t))    return 'Cash & Savings';
  return inv.wealthCategory || 'Commodities';
}

// ─── FIXED: current value (SIP qty×price works correctly) ─────
function getAssetCurrentValue(inv) {
  if (!inv) return 0;
  const t         = (inv.type || '').toUpperCase();
  const qty       = toNum(inv.qty || inv.stockQty || 0);
  const curPrice  = toNum(inv.currentPrice || inv.ltp || inv.stockCurrentPrice || 0);
  const buyPrice  = toNum(inv.buyPrice || inv.avgCost || inv.stockBuyPrice || 0);

  // Qty-based types: Stock, SIP, MF, Gold, Silver, Commodity
  if (['STOCK','SIP','MUTUAL_FUND','GOLD','SILVER','PHYSICAL','COMMODITY'].includes(t)) {
    return qty * (curPrice > 0 ? curPrice : buyPrice);
  }
  if (['REAL_ESTATE','PROPERTY'].includes(t)) return toNum(inv.currentValue || inv.buyPrice || 0);
  if (['FD','RD','BOND','EPF'].includes(t) && typeof calculateMaturity === 'function') {
    const mat = calculateMaturity(inv);
    return mat > 0 ? mat : toNum(inv.principal || 0);
  }
  return toNum(inv.principal || inv.currentValue || inv.amount || 0);
}

// ─── FIXED: invested amount (SIP qty×buyPrice works correctly) ─
function getAssetInvestedAmount(inv) {
  if (!inv) return 0;
  const t        = (inv.type || '').toUpperCase();
  const qty      = toNum(inv.qty || inv.stockQty || 0);
  const buyPrice = toNum(inv.buyPrice || inv.avgCost || inv.stockBuyPrice || 0);

  if (['STOCK','SIP','MUTUAL_FUND','GOLD','SILVER','PHYSICAL','COMMODITY'].includes(t)) {
    return qty * buyPrice;
  }
  if (['REAL_ESTATE','PROPERTY'].includes(t)) return toNum(inv.buyPrice || inv.principal || 0);
  return toNum(inv.principal || inv.amount || 0);
}

function getAssetCategoryFromType(type) {
  for (const [cat, info] of Object.entries(ASSET_CATEGORIES)) if (info.types.includes(type)) return cat;
  if (['GOLD','SILVER','PHYSICAL','COMMODITY'].includes(type)) return 'Commodities';
  if (['FD','RD','BOND','EPF'].includes(type))                 return 'Debt';
  if (['STOCK','SIP','MUTUAL_FUND'].includes(type))            return 'Equity';
  if (['REAL_ESTATE','PROPERTY'].includes(type))               return 'Real Estate';
  return 'Cash & Savings';
}

// ─── Totals ───────────────────────────────────────────────────
// ─── Totals (Upgraded with personal loans) ───────────────────
function getTotalAssets() {
  const investments = (state.investments || []).reduce((s, a) => s + getAssetCurrentValue(a), 0);
  // Money OWED TO you (given loans not yet collected)
  const givenOutstanding = (state.loans || [])
    .filter(l => l.type === 'given' && !l.collected)
    .reduce((s, l) => s + toNum(l.amount), 0);
  return investments + givenOutstanding;
}

function getTotalLiabilities() {
  const emiLiabilities = (state.emi_loans || []).reduce((s, l) => s + toNum(l.outstanding || 0), 0);
  // Money YOU OWE (taken loans not yet collected)
  const takenOutstanding = (state.loans || [])
    .filter(l => l.type === 'taken' && !l.collected)
    .reduce((s, l) => s + toNum(l.amount), 0);
  return emiLiabilities + takenOutstanding;
}

function getNetWorth() {
  return getTotalAssets() - getTotalLiabilities();
}
/* ─────────────────────────────────────────────────────────────
   LOAN ANALYTICS HELPERS (reads state.loans from Common.js)
───────────────────────────────────────────────────────────── */
function buildLoanGroups() {
  const groups = {};
  (state.loans || []).forEach(l => {
    const key = `${l.person}__${l.type}`;
    if (!groups[key]) groups[key] = { person: l.person, type: l.type, loans: [], pendingAmt: 0, collectedAmt: 0 };
    groups[key].loans.push(l);
    const amt = toNum(l.amount);
    if (l.collected) groups[key].collectedAmt += amt;
    else             groups[key].pendingAmt   += amt;
  });
  return Object.values(groups);
}

function getLoanSummary() {
  const loans = state.loans || [];
  const pending  = loans.filter(l => !l.collected);
  const givenOut = pending.filter(l => l.type === 'given').reduce((s,l)=>s+toNum(l.amount),0);  // owed TO you
  const takenOut = pending.filter(l => l.type === 'taken').reduce((s,l)=>s+toNum(l.amount),0);  // you OWE
  const totalGiven    = loans.filter(l=>l.type==='given').reduce((s,l)=>s+toNum(l.amount),0);
  const totalTaken    = loans.filter(l=>l.type==='taken').reduce((s,l)=>s+toNum(l.amount),0);
  const collectedGiven = loans.filter(l=>l.type==='given'&&l.collected).reduce((s,l)=>s+toNum(l.amount),0);
  const collectedTaken = loans.filter(l=>l.type==='taken'&&l.collected).reduce((s,l)=>s+toNum(l.amount),0);
  const overdue = pending.filter(l => l.dueDate && new Date(l.dueDate) < new Date());
  return { givenOut, takenOut, netBalance: givenOut - takenOut, totalGiven, totalTaken,
           collectedGiven, collectedTaken, overdue, totalLoans: loans.length };
}

/* ─────────────────────────────────────────────────────────────
   WEALTH PAGE
───────────────────────────────────────────────────────────── */
function showWealthPage() {
  const page = document.getElementById('page-wealth');
  if (!page) return;
  const currentTab = page.dataset.activeTab || 'assets';

  page.innerHTML = `
    <div class="page-header fade-up fade-up-1">
      <div>
        <div class="page-greeting">Track your portfolio</div>
        <h1 class="page-title">Wealth <em>Manager</em></h1>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
        <button class="btn-submit" style="width:auto;padding:9px 18px;margin:0;font-size:13px;"
                onclick="openAddAssetModal()">+ Add Asset</button>
        <button class="btn-secondary" style="padding:9px 14px;font-size:13px;"
                onclick="exportWealthJSON()">📤 Export</button>
      </div>
    </div>

    <div class="wealth-tabs fade-up fade-up-2">
      <button class="wealth-tab" onclick="switchWealthTab('assets')">Assets</button>
      <button class="wealth-tab" onclick="switchWealthTab('liabilities')">Liabilities</button>
      
      <button class="wealth-tab" onclick="switchWealthTab('networth')">Net Worth</button>
      <button class="wealth-tab" onclick="switchWealthTab('allocation')">Allocation</button>
    </div>

    <div id="wealth-tab-content" class="fade-up fade-up-3"></div>
    <div id="wealthModals"></div>`;

  switchWealthTab(currentTab);
}

function switchWealthTab(tab) {
  
  const page = document.getElementById('page-wealth');
  if (!page) return;
  page.dataset.activeTab = tab;
  updateFabVisibility(tab);

  const TAB_MAP = { assets:'Assets', liabilities:'Liabilities', loans:'Loans',
                    networth:'Net Worth', allocation:'Allocation' };
  page.querySelectorAll('.wealth-tab').forEach(b =>
    b.classList.toggle('active', b.textContent.trim() === (TAB_MAP[tab] || '')));

  const content = document.getElementById('wealth-tab-content');
  if (!content) return;
  if (tab === 'assets')       renderWealthAssets(content);
  if (tab === 'liabilities')  renderWealthLiabilities(content);
  if (tab === 'loans')        renderWealthLoans(content);
  if (tab === 'networth')     renderWealthNetWorth(content);
  if (tab === 'allocation')   renderWealthAllocation(content);
}

/* ─────────────────────────────────────────────────────────────
   TAB 1 — ASSETS
───────────────────────────────────────────────────────────── */
function renderWealthAssets(container) {
  const assets        = state.investments || [];
  const totalInvested = assets.reduce((s,a)=>s+getAssetInvestedAmount(a),0);
  const totalCurrent  = assets.reduce((s,a)=>s+getAssetCurrentValue(a),0);
  const totalPnL      = totalCurrent - totalInvested;
  const pnlPct        = totalInvested > 0 ? ((totalPnL/totalInvested)*100).toFixed(1) : 0;
  const pnlColor      = totalPnL >= 0 ? 'var(--emerald)' : 'var(--rose)';

const givenOutstanding = (state.loans || []).filter(l => l.type === 'given' && !l.collected).reduce((s,l)=>s+toNum(l.amount),0);
const takenOutstanding = (state.loans || []).filter(l => l.type === 'taken' && !l.collected).reduce((s,l)=>s+toNum(l.amount),0);
const emiLiabilities = (state.emi_loans || []).reduce((s,l)=>s+toNum(l.outstanding||0),0);

  const summaryBar = `
    <div class="chart-card" style="margin-bottom:16px;">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
  <div>
    <div class="kpi-label">INVESTMENTS</div>
    <div style="font-family:var(--font-m);font-size:14px;font-weight:600;color:var(--emerald);">
      ${fmtINR((state.investments||[]).reduce((s,a)=>s+getAssetCurrentValue(a),0))}
    </div>
  </div>
  <div>
    <div class="kpi-label">GIVEN LOANS (ASSET)</div>
    <div style="font-family:var(--font-m);font-size:14px;font-weight:600;color:${givenOutstanding>=0?'var(--teal)':'var(--text-3)'};">
      ${fmtINR(givenOutstanding)}
    </div>
  </div>
  <div>
    <div class="kpi-label">EMI + TAKEN LOANS</div>
    <div style="font-family:var(--font-m);font-size:14px;font-weight:600;color:${emiLiabilities+takenOutstanding>0?'var(--rose)':'var(--text-3)'};">
      ${fmtINR(emiLiabilities)} + ${fmtINR(takenOutstanding)}
    </div>
  </div>
</div>
    </div>`;

  if (assets.length === 0) {
    container.innerHTML = summaryBar + `
      <div class="empty-state">
        <div class="empty-state-icon">🏦</div>
        <div class="empty-state-text">No assets yet</div>
        <div class="empty-state-sub">Add your first asset to start tracking</div>
        <button class="btn-submit" style="width:auto;padding:10px 24px;margin-top:16px;"
                onclick="openAddAssetModal()">+ Add Asset</button>
      </div>`;
    return;
  }

  const rows = assets.map(a => {
    const cat      = getAssetCategory(a);
    const catInfo  = ASSET_CATEGORIES[cat] || { icon: '💼', color: 'var(--teal)' };
    const invested = getAssetInvestedAmount(a);
    const curVal   = getAssetCurrentValue(a);
    const pnl      = curVal - invested;
    const pct      = totalCurrent > 0 ? ((curVal/totalCurrent)*100).toFixed(1) : 0;
    const qty      = toNum(a.qty || a.stockQty || 0);
    const avgCost  = toNum(a.buyPrice || a.avgCost || a.stockBuyPrice || 0);
    const ltp      = toNum(a.currentPrice || a.ltp || a.stockCurrentPrice || avgCost);
    const t        = (a.type||'').toUpperCase();
    const isQtyType = ['GOLD','SILVER','PHYSICAL','COMMODITY','STOCK','SIP','MUTUAL_FUND'].includes(t);
    const qtyDisp  = isQtyType && qty > 0 ? qty.toFixed(qty < 10 ? 3 : 2) : '—';
    const avgDisp  = avgCost > 0 ? fmtINR(avgCost) : '—';
    const ltpDisp  = ltp > 0    ? fmtINR(ltp)      : '—';
    const pnlInvPct = invested > 0 ? ((pnl/invested)*100).toFixed(1) : 0;

    return `
      <tr class="wealth-row" data-id="${a.id}" data-cat="${cat}">
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">${catInfo.icon}</span>
            <div>
              <div class="list-item-name" style="margin:0;">${a.name||'Asset'}</div>
              <div class="list-item-sub" style="margin:0;">${a.subType||cat}</div>
            </div>
          </div>
        </td>
        <td class="wealth-td-mono">${qtyDisp}</td>
        <td class="wealth-td-mono">${avgDisp}</td>
        <td class="wealth-td-mono">${ltpDisp}</td>
        <td class="wealth-td-mono">${fmtINR(invested)}</td>
        <td class="wealth-td-mono" style="color:var(--teal);">${fmtINR(curVal)}</td>
        <td class="wealth-td-mono" style="color:${pnl>=0?'var(--emerald)':'var(--rose)'};">
          ${pnl>=0?'+':''}${fmtINR(pnl)}<br>
          <span style="font-size:10px;opacity:0.8;">${pnl>=0?'+':''}${pnlInvPct}%</span>
        </td>
        <td class="wealth-td-mono">${pct}%</td>
        <td>
          <div style="display:flex;gap:4px;">
            <button class="section-action" onclick="openEditAssetModal('${a.id}')"
                    style="padding:4px 8px;" title="Edit">✏️</button>
            <button class="section-action" onclick="deleteAsset('${a.id}')"
                    style="padding:4px 8px;color:var(--rose);" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = summaryBar + `
    <div class="tx-card" style="overflow-x:auto;">
      <div class="section-heading">
        <div class="section-title"><span class="dot"></span>Holdings</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input id="assetSearch" class="form-input" style="width:160px;padding:7px 10px;font-size:12px;"
                 placeholder="🔍 Search..." oninput="filterWealthAssets()">
          <select id="assetCatFilter" class="form-input" style="width:140px;padding:7px 10px;font-size:12px;"
                  onchange="filterWealthAssets()">
            <option value="all">All Categories</option>
            ${Object.keys(ASSET_CATEGORIES).map(c=>`<option value="${c}">${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <table class="wealth-table">
        <thead>
          <tr>
            <th>NAME</th><th>QTY</th><th>AVG. COST</th><th>LTP</th>
            <th>INVESTED</th><th>CUR. VAL ↓</th><th>P&amp;L</th><th>% ALLOC</th><th></th>
          </tr>
        </thead>
        <tbody id="assetsTableBody">${rows}</tbody>
      </table>
      <div style="text-align:right;padding:10px 0 0;font-size:12px;color:var(--text-3);
                  font-family:var(--font-m);">${assets.length} asset${assets.length!==1?'s':''}</div>
    </div>`;
}

function filterWealthAssets() {
  const search = (document.getElementById('assetSearch')?.value||'').toLowerCase();
  const cat    = document.getElementById('assetCatFilter')?.value || 'all';
  document.querySelectorAll('#assetsTableBody .wealth-row').forEach(row => {
    const rowCat  = row.dataset.cat || '';
    const rowName = row.querySelector('.list-item-name')?.textContent.toLowerCase() || '';
    const catOk   = cat === 'all' || rowCat === cat;
    const srchOk  = !search || rowName.includes(search);
    row.style.display = (catOk && srchOk) ? '' : 'none';
  });
}

/* ─────────────────────────────────────────────────────────────
   TAB 2 — LIABILITIES (EMI / Formal Loans)
───────────────────────────────────────────────────────────── */
function renderWealthLiabilities(container) {
  const loans        = state.emi_loans || [];
  const totalOutst   = loans.reduce((s,l)=>s+toNum(l.outstanding),0);
  const totalAssets  = getTotalAssets();
  const debtRatio    = totalAssets > 0 ? ((totalOutst/totalAssets)*100).toFixed(1) : 0;

  if (loans.length === 0) {
    container.innerHTML = `
      <div class="chart-card" style="text-align:center;margin-bottom:16px;">
        <div style="font-family:var(--font-m);font-size:28px;font-weight:600;color:var(--emerald);">₹0</div>
        <div class="kpi-label" style="margin-top:4px;">TOTAL LIABILITIES</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:4px;">0 active loans</div>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <div class="empty-state-text">No formal liabilities!</div>
        <div class="empty-state-sub">Excellent — debt-free. Track personal loans in the Loans tab.</div>
        <button class="btn-submit" style="width:auto;padding:10px 24px;margin-top:16px;"
                onclick="openAddLiabilityModal()">+ Add Liability</button>
      </div>`;
    return;
  }
  const personalTaken = (state.loans || []).filter(l => l.type === 'taken' && !l.collected);
if (personalTaken.length > 0) {
  container.innerHTML += `
    <div class="section-heading" style="margin-top:24px;">
      <div class="section-title"><span class="dot" style="background:var(--rose)"></span>Personal Loans (Taken)</div>
      <button class="section-action" onclick="setTimeout(()=>showPage('loans'),150)">Manage →</button>
    </div>
    <div class="tx-card">
      ${personalTaken.map(l => `
        <div class="list-item">
          <div class="tx-icon expense">📥</div>
          <div>
            <div class="list-item-name">${escapeHtml(l.person)}</div>
            <div class="list-item-sub">Due: ${l.dueDate || 'N/A'} · ${l.category || 'Loan'}</div>
          </div>
          <div class="list-item-amount" style="color:var(--rose);">${fmtINR(l.amount)}</div>
        </div>
      `).join('')}
    </div>`;
}

  const cards = loans.map(l => {
    const pct = totalOutst > 0 ? ((toNum(l.outstanding)/totalOutst)*100).toFixed(1) : 0;
    const emi = toNum(l.monthlyEmi);
    return `
      <div class="list-item" style="flex-direction:column;align-items:stretch;gap:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="kpi-icon" style="background:rgba(251,113,133,0.12);font-size:18px;">🏦</div>
            <div>
              <div class="list-item-name">${l.name||'Loan'}</div>
              <div class="list-item-sub">${l.type||'Loan'}${l.lender?' · '+l.lender:''}${l.accountNo?' · #'+l.accountNo:''}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-m);font-size:15px;font-weight:600;color:var(--rose);">${fmtINR(l.outstanding)}</div>
            <div style="font-size:11px;color:var(--text-3);">${pct}% of total</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 0;
                    border-top:1px solid var(--border);">
          <div><div class="kpi-label">INTEREST</div><div style="font-size:13px;font-family:var(--font-m);">${toNum(l.interestRate)}%</div></div>
          <div><div class="kpi-label">EMI</div><div style="font-size:13px;font-family:var(--font-m);">${emi>0?fmtINR(emi):'—'}</div></div>
          <div><div class="kpi-label">STARTED</div><div style="font-size:13px;font-family:var(--font-m);">${l.startDate||'—'}</div></div>
        </div>
        ${l.collateral?`<div style="font-size:11px;color:var(--text-3);">Collateral: ${l.collateral}</div>`:''}
        ${l.notes?`<div style="font-size:11px;color:var(--text-3);">${l.notes}</div>`:''}
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="section-action" onclick="openEditLiabilityModal('${l.id}')" style="padding:5px 10px;">✏️ Edit</button>
          <button class="section-action" onclick="deleteLiability('${l.id}')" style="padding:5px 10px;color:var(--rose);">🗑️ Delete</button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
      <div class="kpi-card rose">
        <div class="kpi-label">TOTAL LIABILITIES</div>
        <div class="kpi-value" style="color:var(--rose);">${fmtINR(totalOutst)}</div>
        <div class="kpi-change">${loans.length} active loan${loans.length!==1?'s':''}</div>
      </div>
      <div class="kpi-card violet">
        <div class="kpi-label">DEBT RATIO</div>
        <div class="kpi-value" style="color:var(--violet);">${debtRatio}%</div>
        <div class="kpi-change">of total assets</div>
      </div>
      <div class="kpi-card emerald">
        <div class="kpi-label">NET WORTH</div>
        <div class="kpi-value" style="color:var(--emerald);">${fmtINR(getNetWorth())}</div>
        <div class="kpi-change">Assets − Liabilities</div>
      </div>
    </div>
    <div class="section-heading">
      <div class="section-title"><span class="dot" style="background:var(--rose)"></span>Active Loans</div>
      <button class="section-action" onclick="openAddLiabilityModal()">+ Add Liability</button>
    </div>
    <div class="tx-card">${cards}</div>`;
}

/* ─────────────────────────────────────────────────────────────
   TAB 3 — LOANS (Personal Given / Taken Analytics)
───────────────────────────────────────────────────────────── */
// ─────────────────────────────────────────────────────────────
//  MERGED: Wealth Loans (Analytics + Full CRUD + Modal)
// ─────────────────────────────────────────────────────────────
// ============================================================
//  FINAL MERGED: Wealth Loans (Analytics + Full CRUD)
// ============================================================

// ------------------------------------------------------------
// 1. RENDER WEALTH LOANS (with built‑in event delegation)
// ------------------------------------------------------------
function renderWealthLoans(container) {
  // Remove previous click listener to avoid duplicates
  if (container._loanClickHandler) {
    container.removeEventListener('click', container._loanClickHandler);
  }

  const loans = state.loans || [];
  const s = getLoanSummary();

  // --- Empty state ---
  if (loans.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 0;">
        <div class="empty-state-icon">🤝</div>
        <div class="empty-state-text">No personal loans tracked</div>
        <div class="empty-state-sub">Record money you've given to or taken from people.</div>
        <button class="btn-submit" style="width:auto;padding:10px 24px;margin-top:16px;"
                onclick="openAddLoanModal()">+ Add Loan</button>
      </div>`;
    ensureFAB();
    return;
  }

  // --- KPI Strip ---
  const netColor = s.netBalance >= 0 ? 'var(--emerald)' : 'var(--rose)';
  const netLabel = s.netBalance > 0 ? '🟢 Net Creditor' : s.netBalance < 0 ? '🔴 Net Debtor' : '⚪ Balanced';

  // Overdue banner
  const overdueBanner = s.overdue.length ? `
    <div style="background:rgba(251,113,133,0.1);border:1px solid rgba(251,113,133,0.3);
                border-radius:10px;padding:10px 14px;margin-bottom:16px;font-size:13px;color:var(--rose);">
      ⚠️ <strong>${s.overdue.length} overdue loan${s.overdue.length!==1?'s':''}</strong> —
      ${s.overdue.map(l=>`<em>${l.person}</em> (${fmtINR(l.amount)}, due ${l.dueDate})`).join(', ')}
    </div>` : '';

  // --- Group loans per person ---
  const groups = buildLoanGroups();
  const byPerson = {};
  groups.forEach(g => {
    if (!byPerson[g.person]) byPerson[g.person] = { given:0, taken:0, givenColl:0, takenColl:0, loans:[] };
    if (g.type === 'given') {
      byPerson[g.person].given += g.pendingAmt;
      byPerson[g.person].givenColl += g.collectedAmt;
    } else {
      byPerson[g.person].taken += g.pendingAmt;
      byPerson[g.person].takenColl += g.collectedAmt;
    }
    byPerson[g.person].loans.push(...g.loans);
  });

  // --- Per‑person table rows (with expandable details + action buttons) ---
  const personRows = Object.entries(byPerson)
    .sort((a,b) => (b[1].given + b[1].taken) - (a[1].given + a[1].taken))
    .map(([person, d]) => {
      const net = d.given - d.taken;
      const netColor2 = net > 0 ? 'var(--emerald)' : net < 0 ? 'var(--rose)' : 'var(--text-3)';
      const netLabel2 = net > 0 ? `You get ${fmtINR(net)}` : net < 0 ? `You owe ${fmtINR(Math.abs(net))}` : 'Settled';
      const overdueCount = d.loans.filter(l=>!l.collected && l.dueDate && new Date(l.dueDate) < new Date()).length;

      const loanDetailsHtml = d.loans.sort((a,b)=>a.collected-b.collected).map(l => {
        const isOverdue = !l.collected && l.dueDate && new Date(l.dueDate) < new Date();
        return `
          <div class="loan-detail-item" data-loan-id="${l.id}" style="display:flex;align-items:center;justify-content:space-between;
                      padding:8px 0;border-bottom:1px solid var(--border);
                      ${isOverdue ? 'background:rgba(251,113,133,0.04);' : ''}">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:14px;">${l.type==='given'?'💸':'📥'}</span>
              <div>
                <div style="font-size:13px;font-weight:600;color:${l.type==='given'?'var(--emerald)':'var(--rose)'};">
                  ${l.type==='given'?'Given':'Taken'}: ${fmtINR(l.amount)}
                </div>
                <div style="font-size:11px;color:var(--text-3);">
                  Due: ${l.dueDate||'N/A'} ${l.category ? `· ${l.category}` : ''} ${l.note ? `· ${l.note}` : ''}
                  ${isOverdue ? '<span style="color:var(--rose);"> · OVERDUE</span>' : ''}
                </div>
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="edit-loan-btn" data-id="${l.id}" style="background:#3b82f6;border:none;border-radius:20px;padding:4px 8px;font-size:11px;color:white;cursor:pointer;">✏️</button>
              <button class="mark-loan-btn" data-id="${l.id}" style="background:${l.collected ? '#10b981' : '#f59e0b'};border:none;border-radius:20px;padding:4px 8px;font-size:11px;color:white;cursor:pointer;">${l.collected ? '✅' : '⏳'}</button>
              <button class="delete-loan-btn" data-id="${l.id}" style="background:#ef4444;border:none;border-radius:20px;padding:4px 8px;font-size:11px;color:white;cursor:pointer;">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <tr style="cursor:pointer;" onclick="togglePersonLoans('person_${person.replace(/\s/g,'_')}')">
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:50%;background:var(--surface);
                          display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">
                ${person.charAt(0).toUpperCase()}
              </div>
              <div>
                <div class="list-item-name" style="margin:0;">${escapeHtml(person)}</div>
                <div class="list-item-sub" style="margin:0;">${d.loans.length} loan${d.loans.length!==1?'s':''}
                  ${overdueCount ? `<span style="color:var(--rose);"> · ${overdueCount} overdue</span>` : ''}
                </div>
              </div>
            </div>
          </td>
          <td class="wealth-td-mono" style="color:var(--emerald);">
            ${d.given > 0 ? fmtINR(d.given) : '—'}
            ${d.givenColl > 0 ? `<br><span style="font-size:10px;">+${fmtINR(d.givenColl)} coll.</span>` : ''}
          </td>
          <td class="wealth-td-mono" style="color:var(--rose);">
            ${d.taken > 0 ? fmtINR(d.taken) : '—'}
            ${d.takenColl > 0 ? `<br><span style="font-size:10px;">+${fmtINR(d.takenColl)} repaid</span>` : ''}
          </td>
          <td class="wealth-td-mono" style="color:${netColor2};font-weight:600;">${netLabel2}</td>
          <td><span id="person_${person.replace(/\s/g,'_')}_icon" style="color:var(--text-3);">▼</span></td>
        </tr>
        <tr id="person_${person.replace(/\s/g,'_')}" style="display:none;">
          <td colspan="5" style="padding:0 0 8px 44px;">
            <div style="border-left:2px solid var(--border);padding-left:12px;">
              ${loanDetailsHtml || '<div class="text-slate-500 italic text-sm p-2">No loans for this person</div>'}
            </div>
          </td>
        </tr>
      `;
    }).join('');

  // --- Bar chart data (top 10) ---
  const chartPeople = Object.entries(byPerson).slice(0,10);
  const barGiven = chartPeople.map(([,d])=>d.given);
  const barTaken = chartPeople.map(([,d])=>d.taken);
  const barLabels = chartPeople.map(([p])=>p.length>10?p.slice(0,10)+'…':p);
  const collRate = s.totalGiven > 0 ? ((s.collectedGiven/s.totalGiven)*100).toFixed(0) : 0;
  const repayRate = s.totalTaken > 0 ? ((s.collectedTaken/s.totalTaken)*100).toFixed(0) : 0;

  // --- Render full HTML ---
  container.innerHTML = `
    ${overdueBanner}
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px;">
      <div class="kpi-card emerald">
        <div class="kpi-label">💸 GIVEN (OUTSTANDING)</div>
        <div class="kpi-value" style="color:var(--emerald);font-size:clamp(14px,2.5vw,22px);">${fmtINR(s.givenOut)}</div>
        <div class="kpi-change">Total ever: ${fmtINR(s.totalGiven)} · Collected: ${fmtINR(s.collectedGiven)} (${collRate}%)</div>
      </div>
      <div class="kpi-card rose">
        <div class="kpi-label">📥 TAKEN (OUTSTANDING)</div>
        <div class="kpi-value" style="color:var(--rose);font-size:clamp(14px,2.5vw,22px);">${fmtINR(s.takenOut)}</div>
        <div class="kpi-change">Total ever: ${fmtINR(s.totalTaken)} · Repaid: ${fmtINR(s.collectedTaken)} (${repayRate}%)</div>
      </div>
    </div>
    <div class="two-col" style="margin-bottom:16px;">
      <div class="chart-card" style="display:flex;flex-direction:column;justify-content:center;">
        <div class="kpi-label" style="margin-bottom:8px;">NET POSITION</div>
        <div style="font-family:var(--font-m);font-size:clamp(20px,4vw,32px);font-weight:700;color:${netColor};">${s.netBalance >= 0 ? '+' : ''}${fmtINR(s.netBalance)}</div>
        <div style="font-size:13px;margin-top:6px;color:${netColor};">${netLabel}</div>
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;font-size:12px;"><span>Overdue loans</span><span style="color:${s.overdue.length?'var(--rose)':'var(--emerald)'};">${s.overdue.length} loan${s.overdue.length!==1?'s':''}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;"><span>Total people</span><span>${Object.keys(byPerson).length}</span></div>
          <div style="display:flex;justify-content:space-between;font-size:12px;"><span>Total transactions</span><span>${s.totalLoans}</span></div>
        </div>
        
      </div>
      <div class="chart-card">
        <div class="chart-card-title"><span style="color:var(--emerald)">●</span> Given vs Taken by Person</div>
        <div class="chart-wrap" style="height:200px;"><canvas id="loanPersonChart"></canvas></div>
      </div>
    </div>
    <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--teal)"></span>Per-Person Breakdown</div></div>
    <div class="tx-card" style="overflow-x:auto;">
      <table class="wealth-table"><thead><tr><th>PERSON</th><th style="color:var(--emerald);">GIVEN (PENDING)</th><th style="color:var(--rose);">TAKEN (PENDING)</th><th>NET POSITION</th><th></th></tr></thead>
      <tbody id="loanPersonBody">${personRows}</tbody></table>
    </div>
    <div class="chart-card" style="margin-top:16px;">
      <div class="chart-card-title"><span style="color:var(--violet)">●</span> Recovery / Repayment Progress</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:12px;">
        <div><div style="display:flex;justify-content:space-between;font-size:12px;"><span>💸 Collection Rate (Given)</span><span>${collRate}%</span></div>
        <div style="background:var(--bg3);border-radius:99px;height:8px;"><div style="width:${collRate}%;height:100%;background:var(--emerald);border-radius:99px;"></div></div>
        <div style="font-size:11px;">${fmtINR(s.collectedGiven)} of ${fmtINR(s.totalGiven)} collected</div></div>
        <div><div style="display:flex;justify-content:space-between;font-size:12px;"><span>📥 Repayment Rate (Taken)</span><span>${repayRate}%</span></div>
        <div style="background:var(--bg3);border-radius:99px;height:8px;"><div style="width:${repayRate}%;height:100%;background:var(--blue, #3b82f6);border-radius:99px;"></div></div>
        <div style="font-size:11px;">${fmtINR(s.collectedTaken)} of ${fmtINR(s.totalTaken)} repaid</div></div>
      </div>
    </div>`;

  // --- Draw chart ---
  setTimeout(() => {
    const ctx = document.getElementById('loanPersonChart');
    if (ctx && chartPeople.length && typeof Chart !== 'undefined') {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: barLabels,
          datasets: [
            { label: 'Given (Pending)', data: barGiven, backgroundColor: 'rgba(52,211,153,0.7)', borderRadius: 4 },
            { label: 'Taken (Pending)', data: barTaken, backgroundColor: 'rgba(251,113,133,0.7)', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { font: { size: 11 }, color: '#9ca3af' } } },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => v>=100000 ? '₹'+(v/100000).toFixed(1)+'L' : v>=1000 ? '₹'+(v/1000).toFixed(0)+'K' : '₹'+v } }
          }
        }
      });
    }
  }, 60);

  // --- Event delegation for loan actions (edit/mark/delete) ---
  const clickHandler = async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const loanId = btn.getAttribute('data-id');
    const loan = loanId ? state.loans.find(l => String(l.id) === String(loanId)) : null;

    // Delete
    if (btn.classList.contains('delete-loan-btn') && loan) {
      if (!confirm('Delete this loan?')) return;
      await del('loans', loan.id);
      state.loans = state.loans.filter(l => l.id !== loan.id);
      // delete linked reminders
      const linkedReminders = state.reminders.filter(r => r.title?.includes(loan.person) && r.dueDate === loan.dueDate);
      for (const r of linkedReminders) await del('reminders', r.id);
      state.reminders = state.reminders.filter(r => !linkedReminders.includes(r));
      if (typeof handleLoanTransaction === 'function') await handleLoanTransaction(loan, false);
      if (typeof autoBackup === 'function') autoBackup();
      if (typeof showToast === 'function') showToast('Loan deleted', 'success');
      renderWealthLoans(container);
      return;
    }

    // Mark collected/pending
    if (btn.classList.contains('mark-loan-btn') && loan) {
      loan.collected = !loan.collected;
      loan.collectedAt = loan.collected ? nowISO1() : null;
      await put('loans', loan);
      if (typeof handleLoanTransaction === 'function') await handleLoanTransaction(loan, loan.collected);
      if (typeof autoBackup === 'function') autoBackup();
      if (typeof renderNotifications === 'function') renderNotifications();
      if (typeof showToast === 'function') showToast(loan.collected ? 'Marked as collected ✅' : 'Marked as pending ⏳', 'info');
      renderWealthLoans(container);
      return;
    }

    // Edit
    if (btn.classList.contains('edit-loan-btn') && loan) {
      if (typeof openEditLoanModal === 'function') {
        openEditLoanModal(loan, () => renderWealthLoans(container));
      } else {
        console.error('openEditLoanModal is not defined');
        if (typeof showToast === 'function') showToast('Edit modal not available', 'error');
      }
    }
  };

  container.addEventListener('click', clickHandler);
  container._loanClickHandler = clickHandler; // for cleanup

  ensureFAB();
}

// ------------------------------------------------------------
// 2. MODAL: ADD LOAN (floating button trigger)
// ------------------------------------------------------------
function openAddLoanModal() {
  // Ensure dropdown data exists
  ensureDropdownKey('persons');
  ensureDropdownKey('categories');
  ensureDropdownKey('recurrences');
  ensureDropdownKey('loanCategories');

  const persons = state.dropdowns.persons || [];
  const categories = state.dropdowns.categories || [];
  const loanAccounts = state.dropdowns.accounts || [];
  const recurrences = (state.dropdowns.recurrences && state.dropdowns.recurrences.length)
    ? state.dropdowns.recurrences : ['None', 'daily', 'weekly', 'monthly', 'yearly'];

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
                  ${loanAccounts.map(a => `<option value="${a}">${a}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-xs text-slate-400 uppercase mb-1 block">Amount (₹)</label><input id="loanAmountPopup" type="number" min="1" step="0.01" placeholder="0.00" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" /></div>
              <div><label class="text-xs text-slate-400 uppercase mb-1 block">Due Date</label><input id="loanDueDatePopup" type="date" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-xs text-slate-400 uppercase mb-1 block">Category</label><select id="loanCategoryPopup" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">${categories.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
              <div><label class="text-xs text-slate-400 uppercase mb-1 block">Recurrence</label><select id="loanRecurrencePopup" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">${recurrences.map(r => `<option value="${r.toLowerCase()}" ${r.toLowerCase() === 'none' ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
            </div>
            <div><label class="text-xs text-slate-400 uppercase mb-1 block">Note</label><input id="loanNotePopup" placeholder="What's this for?" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" /></div>
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

  // Type toggle
  document.querySelectorAll('#addLoanModalOverlay .type-btn').forEach(btn => {
    btn.onclick = () => {
      document.getElementById('loanTypePopup').value = btn.dataset.type;
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
      if (typeof showToast === 'function') showToast('Select person(s), amount and due date', 'error');
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
      if (typeof handleLoanTransaction === 'function') await handleLoanTransaction(newLoan, addTransaction);
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
    if (typeof handleRecurringLoans === 'function') await handleRecurringLoans();
    if (typeof autoBackup === 'function') autoBackup(); 
    if (typeof showToast === 'function') showToast('Loan(s) added!', 'success');
    closeAddLoanModal();
    // Refresh the wealth loans view
    const wealthContainer = document.querySelector('#loansOverview');
    if (wealthContainer && typeof renderWealthLoans === 'function') renderWealthLoans(wealthContainer);
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

// ------------------------------------------------------------
// 3. MODAL: EDIT LOAN
// ------------------------------------------------------------
function openEditLoanModal(loan, onSaveCallback) {
  const persons = state.dropdowns.persons || [];
  const categories = state.dropdowns.categories || [];
  const loanAccounts = state.dropdowns.accounts || [];
  const recurrences = (state.dropdowns.recurrences && state.dropdowns.recurrences.length)
    ? state.dropdowns.recurrences : ['None', 'daily', 'weekly', 'monthly', 'yearly'];

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
              <div><label class="text-xs text-slate-400 uppercase mb-1 block">Person</label><select id="editLoanPerson" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">${persons.map(p => `<option value="${p}" ${loan.person === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
              <div><label class="text-xs text-slate-400 uppercase mb-1 block">Account</label><select id="editLoanAccount" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">${loanAccounts.map(a => `<option value="${a}" ${loan.loanAccount === a ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
            </div>
            <div><label class="text-xs text-slate-400 uppercase mb-1 block">Amount (₹)</label><input id="editLoanAmount" type="number" min="1" step="0.01" value="${loan.amount}" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" /></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="text-xs text-slate-400 uppercase mb-1 block">Due Date</label><input id="editLoanDueDate" type="date" value="${loan.dueDate}" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" /></div>
              <div><label class="text-xs text-slate-400 uppercase mb-1 block">Category</label><select id="editLoanCategory" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">${categories.map(c => `<option value="${c}" ${loan.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
            </div>
            <div><label class="text-xs text-slate-400 uppercase mb-1 block">Note</label><input id="editLoanNote" value="${loan.note || ''}" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" /></div>
            <div><label class="text-xs text-slate-400 uppercase mb-1 block">Recurrence</label><select id="editLoanRecurrence" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">${recurrences.map(r => `<option value="${r.toLowerCase()}" ${loan.recurrence === r.toLowerCase() ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
            ${loan.recurrence && loan.recurrence !== 'None' ? `<div><label class="text-xs text-slate-400 uppercase mb-1 block">Scope</label><select id="editScope" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm"><option value="this">Only This Loan</option><option value="future">This and Future Loans</option><option value="all">All Loans in Series</option></select></div>` : ''}
            <label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" id="editLoanCollected" ${loan.collected ? 'checked' : ''} /> Collected</label>
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
      document.getElementById('editLoanType').value = btn.dataset.type;
      document.querySelectorAll('#editLoanModalOverlay .edit-type-btn').forEach(b => {
        b.classList.remove('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
        b.classList.add('text-slate-400');
      });
      btn.classList.add('bg-emerald-500/20', 'text-emerald-400', 'border-emerald-500/50');
    };
  });

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

    // Apply edit (simplified: update this loan only, but you can add series logic)
    Object.assign(loan, updates);
    if (updates.recurrence && updates.recurrence !== 'None' && !loan.seriesId) loan.seriesId = uid('series');
    if (!updates.recurrence || updates.recurrence === 'None') loan.seriesId = null;
    await put('loans', loan);

    if (typeof autoBackup === 'function') autoBackup();
    if (typeof showToast === 'function') showToast('Loan updated', 'success');
    closeEditLoanModal();
    if (onSaveCallback) onSaveCallback();
    else {
      const wealthContainer = document.querySelector('#loansOverview');
      if (wealthContainer && typeof renderWealthLoans === 'function') renderWealthLoans(wealthContainer);
    }
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

// ------------------------------------------------------------
// 4. HELPER: Floating Action Button
// ------------------------------------------------------------
function ensureFAB() {
  if (document.getElementById('wealthLoansFAB')) return;
  const fab = document.createElement('button');
  fab.id = 'wealthLoansFAB';
  fab.innerHTML = '+';
  // Use flexbox to center the plus sign perfectly
  fab.style.display = 'flex';
  fab.style.alignItems = 'center';
  fab.style.justifyContent = 'center';
  fab.style.position = 'fixed';
  fab.style.bottom = '5rem';      // or '30px' – keep your preferred value
  fab.style.right = '16px';
  fab.style.width = '56px';
  fab.style.height = '56px';
  fab.style.borderRadius = '50%';
  fab.style.backgroundColor = '#10b981';
  fab.style.color = 'white';
  fab.style.fontSize = '28px';
  fab.style.fontWeight = 'normal'; // avoid bold shifting
  fab.style.lineHeight = '1';      // remove extra line‑height
  fab.style.border = 'none';
  fab.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  fab.style.zIndex = '9999';
  fab.style.cursor = 'pointer';
  fab.onclick = () => openAddLoanModal();
  document.body.appendChild(fab);
}

// ------------------------------------------------------------
// 5. UTILITY: loanKey (for duplicate detection)
// ------------------------------------------------------------
function loanKey(loan) {
  return `${loan.person}|${loan.type}|${loan.amount}|${loan.dueDate}|${loan.category || ''}`;
}

// ------------------------------------------------------------
// 6. ACCORDION TOGGLE (for per‑person expandable rows)
// ------------------------------------------------------------
function togglePersonLoans(rowId) {
  const row = document.getElementById(rowId);
  const icon = document.getElementById(rowId + '_icon');
  if (!row) return;
  const visible = row.style.display !== 'none';
  row.style.display = visible ? 'none' : '';
  if (icon) icon.textContent = visible ? '▼' : '▲';
}

// ------------------------------------------------------------
// 7. RESPONSIVE CSS (injected once)
// ------------------------------------------------------------
if (!document.getElementById('wealthLoansResponsiveCSS')) {
  const style = document.createElement('style');
  style.id = 'wealthLoansResponsiveCSS';
  style.textContent = `
    @media (max-width: 640px) {
      .loan-detail-item { flex-direction: column; align-items: flex-start !important; gap: 8px; }
      .loan-detail-item > div:last-child { align-self: flex-end; }
      .wealth-table th, .wealth-table td { padding: 8px 4px; font-size: 12px; }
      .btn-submit, .btn-secondary { padding: 6px 12px; font-size: 12px; }
      #wealthLoansFAB { width: 48px; height: 48px; font-size: 24px; bottom: 20px; right: 12px; }
    }
  `;
  document.head.appendChild(style);
}

/* ─────────────────────────────────────────────────────────────
   TAB 4 — NET WORTH
───────────────────────────────────────────────────────────── */
function renderWealthNetWorth(container) {
  const nw         = getNetWorth();
  const assets     = getTotalAssets();
  const liabilities= getTotalLiabilities();
  const snapshots  = (state.net_worth_snapshots||[]).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const lastSnap   = snapshots[snapshots.length-1];
  const change     = lastSnap ? nw - toNum(lastSnap.netWorth) : 0;

  // Also include personal loan net balance in display
  const loanSummary  = getLoanSummary();
  const personalNet  = loanSummary.netBalance; // +ve = owed to you, -ve = you owe

  const chartLabels  = snapshots.map(s=>s.date.slice(5));
  const chartData    = snapshots.map(s=>s.netWorth);

  const snapshotList = snapshots.length === 0
    ? `<div class="empty-state" style="padding:32px;">
        <div class="empty-state-icon">📸</div>
        <div class="empty-state-text">No snapshots yet</div>
        <div class="empty-state-sub">Snapshots record your net worth over time so you can track growth.</div>
       </div>`
    : `<div class="tx-list">`
      + [...snapshots].reverse().map(s => {
          const d = s.change||0;
          return `<div class="list-item">
            <div class="tx-icon ${d>=0?'income':'expense'}">${d>=0?'📈':'📉'}</div>
            <div class="list-item-info">
              <div class="list-item-name">${s.date}</div>
              <div class="list-item-sub">Assets: ${fmtINR(s.assets)} · Liabilities: ${fmtINR(s.liabilities)}</div>
            </div>
            <div style="text-align:right;">
              <div class="list-item-amount" style="color:${s.netWorth>=0?'var(--teal)':'var(--rose)'};">${fmtINR(s.netWorth)}</div>
              ${d!==0?`<div style="font-size:11px;color:${d>=0?'var(--emerald)':'var(--rose)'};">${d>=0?'+':''}${fmtINR(d)}</div>`:''}
            </div>
            <button onclick="deleteNetWorthSnapshot('${s.id}')"
                    style="background:none;border:none;cursor:pointer;color:var(--text-3);padding:4px;margin-left:4px;">×</button>
          </div>`;
        }).join('')
      + `</div>`;

  container.innerHTML = `
    <div class="chart-card" style="margin-bottom:16px;text-align:center;">
      <div class="kpi-label" style="margin-bottom:8px;">YOUR CURRENT NET WORTH</div>
      <div style="font-family:var(--font-m);font-size:clamp(24px,4vw,36px);font-weight:700;
                  color:${nw>=0?'var(--teal)':'var(--rose)'};">${fmtINR(nw)}</div>
      ${change!==0?`<div style="margin-top:6px;font-size:13px;color:${change>=0?'var(--emerald)':'var(--rose)'};">
        ${change>=0?'↑':'↓'} ${fmtINR(Math.abs(change))} from last snapshot</div>`:''}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;
                  padding-top:16px;border-top:1px solid var(--border);">
        <div>
          <div class="kpi-label">ASSETS</div>
          <div style="font-family:var(--font-m);font-size:16px;font-weight:600;color:var(--emerald);">${fmtINR(assets)}</div>
        </div>
        <div>
          <div class="kpi-label">LIABILITIES</div>
          <div style="font-family:var(--font-m);font-size:16px;font-weight:600;color:${liabilities>0?'var(--rose)':'var(--text-3)'};">${fmtINR(liabilities)}</div>
        </div>
        <div>
          <div class="kpi-label">PERSONAL LOANS NET</div>
          <div style="font-family:var(--font-m);font-size:16px;font-weight:600;color:${personalNet>=0?'var(--emerald)':'var(--rose)'};">
            ${personalNet>=0?'+':''}${fmtINR(personalNet)}
          </div>
        </div>
      </div>
    </div>

    ${snapshots.length > 1 ? `
    <div class="chart-card" style="margin-bottom:16px;">
      <div class="chart-card-title"><span style="color:var(--teal)">●</span> Net Worth History</div>
      <div class="chart-wrap" style="height:180px;"><canvas id="nwHistoryChart"></canvas></div>
    </div>` : ''}

    <div class="section-heading">
      <div class="section-title"><span class="dot" style="background:var(--teal)"></span>Snapshots</div>
      <button class="btn-submit" style="width:auto;padding:8px 16px;margin:0;font-size:12px;"
              onclick="takeNetWorthSnapshot()">📸 Take Snapshot</button>
    </div>
    <div class="tx-card">${snapshotList}</div>`;

  if (snapshots.length > 1) {
    setTimeout(() => {
      const ctx = document.getElementById('nwHistoryChart');
      if (!ctx) return;
      new Chart(ctx, {
        type: 'line',
        data: { labels: chartLabels, datasets: [{
          label: 'Net Worth', data: chartData,
          borderColor: 'rgba(0,212,180,1)', backgroundColor: 'rgba(0,212,180,0.1)',
          borderWidth: 2, fill: true, tension: 0.4, pointRadius: 4,
          pointBackgroundColor: 'rgba(0,212,180,1)'
        }]},
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid:{display:false}, ticks:{font:{size:10}} },
            y: { grid:{color:'rgba(255,255,255,0.04)'},
                 ticks:{font:{size:10}, callback: v => '₹'+(v>=100000?(v/100000).toFixed(1)+'L':v>=1000?(v/1000).toFixed(0)+'K':v)}}
          }
        }
      });
    }, 50);
  }
}

async function takeNetWorthSnapshot() {
  const nw   = getNetWorth();
  const snaps = state.net_worth_snapshots||[];
  const last  = snaps[snaps.length-1];
  const snap  = {
    date: nowISO(), netWorth: nw,
    assets: getTotalAssets(), liabilities: getTotalLiabilities(),
    change: last ? nw - toNum(last.netWorth) : 0
  };
  try {
    const id = await put('net_worth_snapshots', snap);
    snap.id = id;
    state.net_worth_snapshots = [...snaps, snap];
    showToast('✅ Snapshot saved!', 'success');
    switchWealthTab('networth');
  } catch(e) { showToast('❌ Failed to save snapshot', 'error'); }
}

async function deleteNetWorthSnapshot(id) {
  if (!confirm('Delete this snapshot?')) return;
  try {
    await del('net_worth_snapshots', Number(id));
    state.net_worth_snapshots = state.net_worth_snapshots.filter(s=>String(s.id)!==String(id));
    showToast('Snapshot deleted','info');
    switchWealthTab('networth');
  } catch(e) { showToast('Failed to delete','error'); }
}

/* ─────────────────────────────────────────────────────────────
   TAB 5 — ALLOCATION
───────────────────────────────────────────────────────────── */
async function ensureAllocationTargets() {
  if (!state.allocation_targets || !state.allocation_targets.length) {
    const saved = await getAll('allocation_targets');
    if (!saved.length) {
      for (const d of DEFAULT_ALLOCATION) await put('allocation_targets', d);
      state.allocation_targets = [...DEFAULT_ALLOCATION];
    } else {
      state.allocation_targets = saved;
    }
  }
}

function renderWealthAllocation(container) {
  ensureAllocationTargets().then(() => _doRenderAllocation(container));
}

function _doRenderAllocation(container) {
  const targets     = state.allocation_targets.length ? state.allocation_targets : DEFAULT_ALLOCATION;
  const assets      = state.investments||[];
  const totalCurrent= getTotalAssets();
  const actual      = {};
  assets.forEach(a => { const c = getAssetCategory(a); actual[c] = (actual[c]||0) + getAssetCurrentValue(a); });

  const barSegments = targets.map(t =>
    `<div style="flex:${t.target};background:${(ASSET_CATEGORIES[t.category]||{color:'#888'}).color};height:100%;"></div>`
  ).join('');

  const rows = targets.map(t => {
    const catInfo   = ASSET_CATEGORIES[t.category]||{icon:'💼',color:'#888'};
    const actualAmt = actual[t.category]||0;
    const actualPct = totalCurrent > 0 ? ((actualAmt/totalCurrent)*100).toFixed(0) : 0;
    const tgtAmt    = totalCurrent * t.target / 100;
    const gapPct    = toNum(actualPct) - t.target;
    const gapAmt    = actualAmt - tgtAmt;
    const action    = gapAmt < -1000
      ? `<span style="color:var(--emerald);font-size:12px;cursor:pointer;" onclick="openAddAssetModal()">Add ${fmtINR(Math.abs(gapAmt))}</span>`
      : gapAmt > 1000
      ? `<span style="color:var(--rose);font-size:12px;">Reduce ${fmtINR(gapAmt)}</span>`
      : `<span style="color:var(--text-3);font-size:12px;">On track</span>`;
    return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px;">
          <div style="width:10px;height:10px;border-radius:2px;background:${catInfo.color};flex-shrink:0;"></div>
          <span style="font-size:13px;font-weight:600;">${t.category}</span>
        </div></td>
        <td class="wealth-td-mono">${actualPct}%</td>
        <td class="wealth-td-mono">${fmtINR(actualAmt)}</td>
        <td class="wealth-td-mono">${t.target}%</td>
        <td class="wealth-td-mono">${fmtINR(tgtAmt)}</td>
        <td class="wealth-td-mono">
          <span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;
            background:${Math.abs(gapPct)<=5?'rgba(52,211,153,0.12)':gapPct<0?'rgba(96,165,250,0.12)':'rgba(251,113,133,0.12)'};
            color:${Math.abs(gapPct)<=5?'var(--emerald)':gapPct<0?'var(--blue, #3b82f6)':'var(--rose)'};">
            ${gapPct>0?'+':''}${gapPct}%
          </span>
        </td>
        <td>${action}</td>
      </tr>`;
  }).join('');

  const sipItems = state.sip_plan||[];
  const chartLabels = targets.map(t=>t.category);
  const chartData   = targets.map(t=>actual[t.category]||0);
  const chartColors = targets.map(t=>(ASSET_CATEGORIES[t.category]||{color:'#888'}).color);

  container.innerHTML = `
    <div class="two-col" style="margin-bottom:16px;">
      <div class="chart-card">
        <div class="chart-card-title">
          <span style="color:var(--gold)">●</span> Target Allocation
          <button class="section-action" onclick="openEditAllocationModal()" style="margin-left:auto;font-size:11px;">✏️ Edit</button>
        </div>
        <div style="display:flex;height:10px;border-radius:99px;overflow:hidden;gap:1px;margin-bottom:8px;">${barSegments}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${targets.map(t=>`<div style="display:flex;align-items:center;gap:4px;font-size:11px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${(ASSET_CATEGORIES[t.category]||{color:'#888'}).color};display:inline-block;"></span>
            ${t.category} ${t.target}%</div>`).join('')}
        </div>
      </div>
      <div class="chart-card" style="display:flex;flex-direction:column;align-items:center;">
        <div class="chart-card-title" style="width:100%"><span style="color:var(--gold)">●</span> Current Allocation</div>
        ${totalCurrent > 0
          ? `<div class="chart-wrap" style="height:160px;width:100%;max-width:220px;"><canvas id="allocDoughnut"></canvas></div>`
          : `<div class="empty-state" style="padding:24px;"><div class="empty-state-icon">🥧</div><div class="empty-state-text">No assets yet</div></div>`}
      </div>
    </div>

    <div class="chart-card" style="margin-bottom:16px;overflow-x:auto;">
      <div class="section-heading"><div class="section-title"><span class="dot"></span>Target vs Actual</div></div>
      <table class="wealth-table">
        <thead>
          <tr><th>CATEGORY</th><th>ACTUAL</th><th>CUR VAL</th><th>TARGET</th><th>TGT VAL</th><th>GAP</th><th>ACTION</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="section-heading">
      <div class="section-title"><span class="dot" style="background:var(--violet)"></span>Monthly SIP Plan</div>
      <button class="section-action" onclick="openAddSIPModal()">+ Add Instrument</button>
    </div>
    <div class="chart-card" id="sipPlanContainer">
      ${sipItems.length === 0
        ? `<div class="empty-state" style="padding:24px;"><div class="empty-state-icon">💰</div>
           <div class="empty-state-text">No monthly SIP plan yet</div>
           <button class="btn-submit" style="width:auto;margin-top:12px;" onclick="openAddSIPModal()">+ Add Instrument</button></div>`
        : renderSIPList(sipItems)}
    </div>`;

  if (totalCurrent > 0) {
    setTimeout(() => {
      const ctx = document.getElementById('allocDoughnut');
      if (ctx) new Chart(ctx, {
        type: 'doughnut',
        data: { labels: chartLabels, datasets: [{ data: chartData, backgroundColor: chartColors, borderWidth: 2, borderColor: 'transparent' }] },
        options: { responsive:true, maintainAspectRatio:false, cutout:'65%',
                   plugins: { legend:{display:false}, tooltip:{callbacks:{label:c=>` ${c.label}: ${fmtINR(c.raw)}`}} } }
      });
    }, 50);
  }
}

function renderSIPList(sipItems) {
  const total = sipItems.reduce((s,i)=>s+toNum(i.monthlyAmount),0);
  return `<div style="margin-bottom:12px;font-size:12px;">Total monthly investment:
    <strong style="color:var(--teal);">${fmtINR(total)}</strong></div>
    ${sipItems.map(item=>`
      <div class="list-item" style="justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${(ASSET_CATEGORIES[item.category]||{color:'#888'}).color};flex-shrink:0;"></div>
          <div><div class="list-item-name">${item.name}</div><div class="list-item-sub">${item.category} · ${item.percentage||0}%</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="list-item-amount" style="color:var(--teal);">${fmtINR(item.monthlyAmount)}</div>
          <button onclick="deleteSIPItem('${item.id}')" style="background:none;border:none;cursor:pointer;color:var(--text-3);padding:4px;">×</button>
        </div>
      </div>`).join('')}`;
}

/* ─────────────────────────────────────────────────────────────
   MODALS — Add/Edit Asset
───────────────────────────────────────────────────────────── */
function openAddAssetModal(prefill = {}) {
  const html = `
    <div class="modal-overlay show" id="addAssetOverlay">
      <div class="modal" style="max-width:560px;">
        <div class="modal-header">
          <h3 class="modal-title">➕ ${prefill.id?'Edit':'Add'} Asset</h3>
          <button class="modal-close" onclick="closeWealthModal('addAssetOverlay')">×</button>
        </div>
        <div class="modal-body">
          <form id="addAssetForm" class="space-y-4">
            <div class="grid-2">
              <div>
                <label class="form-label">ASSET NAME*</label>
                <input id="ast_name" class="form-input" value="${prefill.name||''}" required />
              </div>
              <div>
                <label class="form-label">TYPE*</label>
                <select id="ast_type" class="form-input" onchange="toggleAssetFields();updateAssetPreview()">
                  <option value="GOLD"        ${prefill.type==='GOLD'       ?'selected':''}>🪙 Gold (Physical)</option>
                  <option value="SILVER"      ${prefill.type==='SILVER'     ?'selected':''}>🥈 Silver</option>
                  <option value="STOCK"       ${prefill.type==='STOCK'      ?'selected':''}>📈 Stock</option>
                  <option value="MUTUAL_FUND" ${prefill.type==='MUTUAL_FUND'?'selected':''}>📊 Mutual Fund (Lumpsum)</option>
                  <option value="SIP"         ${prefill.type==='SIP'        ?'selected':''}>🔄 SIP / MF (SIP)</option>
                  <option value="FD"          ${prefill.type==='FD'         ?'selected':''}>🏦 Fixed Deposit</option>
                  <option value="RD"          ${prefill.type==='RD'         ?'selected':''}>📆 Recurring Deposit</option>
                  <option value="REAL_ESTATE" ${prefill.type==='REAL_ESTATE'?'selected':''}>🏠 Real Estate</option>
                  <option value="EPF"         ${prefill.type==='EPF'        ?'selected':''}>💰 EPF / PPF</option>
                  <option value="BOND"        ${prefill.type==='BOND'       ?'selected':''}>📜 Bond</option>
                  <option value="CASH"        ${prefill.type==='CASH'       ?'selected':''}>💵 Cash/Savings</option>
                </select>
              </div>
            </div>

            <div id="ast_qty_section" class="grid-2">
              <div>
                <label class="form-label">QUANTITY / UNITS</label>
                <input id="ast_qty" type="number" step="0.001" class="form-input"
                       value="${prefill.qty||''}" oninput="updateAssetPreview()" />
              </div>
              <div>
                <label class="form-label">BUY PRICE / AVG COST</label>
                <input id="ast_buyPrice" type="number" step="0.01" class="form-input"
                       value="${prefill.buyPrice||''}" oninput="updateAssetPreview()" />
              </div>
            </div>

            <div id="ast_cur_section" class="grid-2">
              <div>
                <label class="form-label">CURRENT PRICE (LTP)</label>
                <input id="ast_currentPrice" type="number" step="0.01" class="form-input"
                       value="${prefill.currentPrice||''}" oninput="updateAssetPreview()" />
              </div>
              <div>
                <label class="form-label">SUB-TYPE / LABEL</label>
                <input id="ast_subType" class="form-input" value="${prefill.subType||''}" />
              </div>
            </div>

            <div id="ast_principal_section" class="grid-2" style="display:none;">
              <div>
                <label class="form-label">PRINCIPAL AMOUNT</label>
                <input id="ast_principal" type="number" step="0.01" class="form-input" value="${prefill.principal||''}" />
              </div>
              <div>
                <label class="form-label">INTEREST RATE (%)</label>
                <input id="ast_rate" type="number" step="0.01" class="form-input" value="${prefill.rate||''}" />
              </div>
            </div>

            <div id="ast_tenure_section" class="grid-2" style="display:none;">
              <div>
                <label class="form-label">TENURE (MONTHS)</label>
                <input id="ast_tenure" type="number" class="form-input" value="${prefill.tenureMonths||''}" />
              </div>
              <div>
                <label class="form-label">START DATE</label>
                <input id="ast_startDate" type="date" class="form-input" value="${prefill.startDate||nowISO()}" />
              </div>
            </div>

            <!-- Live P&L Preview -->
            <div id="ast_preview" style="display:none;background:var(--bg3);border-radius:10px;padding:12px;">
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center;">
                <div><div class="kpi-label" style="font-size:9px;">INVESTED</div>
                  <div id="prev_invested" style="font-family:var(--font-m);font-size:13px;font-weight:600;"></div></div>
                <div><div class="kpi-label" style="font-size:9px;">CURRENT VALUE</div>
                  <div id="prev_current" style="font-family:var(--font-m);font-size:13px;font-weight:600;color:var(--teal);"></div></div>
                <div><div class="kpi-label" style="font-size:9px;">P&amp;L</div>
                  <div id="prev_pnl" style="font-family:var(--font-m);font-size:13px;font-weight:600;"></div></div>
              </div>
            </div>

            <div>
              <label class="form-label">NOTES (OPTIONAL)</label>
              <input id="ast_notes" class="form-input" value="${prefill.notes||''}" />
            </div>

            <div class="grid-2">
              <button type="submit" class="btn-submit">💾 Save Asset</button>
              <button type="button" class="btn-secondary" onclick="closeWealthModal('addAssetOverlay')">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;

  document.getElementById('wealthModals').innerHTML = html;
  toggleAssetFields();

  document.getElementById('addAssetForm').onsubmit = async (e) => {
    e.preventDefault();
    const type = document.getElementById('ast_type').value;
    const asset = {
      name:              document.getElementById('ast_name').value.trim(),
      type,
      subType:           document.getElementById('ast_subType').value.trim(),
      qty:               parseFloat(document.getElementById('ast_qty').value)||0,
      stockQty:          parseFloat(document.getElementById('ast_qty').value)||0,
      buyPrice:          parseFloat(document.getElementById('ast_buyPrice').value)||0,
      avgCost:           parseFloat(document.getElementById('ast_buyPrice').value)||0,
      stockBuyPrice:     parseFloat(document.getElementById('ast_buyPrice').value)||0,
      currentPrice:      parseFloat(document.getElementById('ast_currentPrice').value)||0,
      ltp:               parseFloat(document.getElementById('ast_currentPrice').value)||0,
      stockCurrentPrice: parseFloat(document.getElementById('ast_currentPrice').value)||0,
      principal:         parseFloat(document.getElementById('ast_principal').value)||0,
      rate:              parseFloat(document.getElementById('ast_rate').value)||0,
      tenureMonths:      parseInt(document.getElementById('ast_tenure').value)||0,
      startDate:         document.getElementById('ast_startDate').value,
      notes:             document.getElementById('ast_notes').value.trim(),
      wealthCategory:    getAssetCategoryFromType(type),
      createdAt:         new Date().toISOString()
    };
    if (prefill.id) {
      asset.id = prefill.id;
      await put('investments', asset);
      state.investments = state.investments.map(i => i.id === asset.id ? asset : i);
      showToast('✅ Asset updated!', 'success');
    } else {
      const id = await put('investments', asset);
      asset.id = id;
      state.investments.push(asset);
      showToast('✅ Asset added!', 'success');
    }
    closeWealthModal('addAssetOverlay');
    switchWealthTab('assets');
  };
}

/* Live preview inside Add Asset modal */
function updateAssetPreview() {
  const type     = document.getElementById('ast_type')?.value||'';
  const qty      = parseFloat(document.getElementById('ast_qty')?.value)||0;
  const buyP     = parseFloat(document.getElementById('ast_buyPrice')?.value)||0;
  const curP     = parseFloat(document.getElementById('ast_currentPrice')?.value)||0;
  const preview  = document.getElementById('ast_preview');
  const isQtyType= ['STOCK','SIP','MUTUAL_FUND','GOLD','SILVER','PHYSICAL','COMMODITY'].includes(type);
  if (!preview) return;
  if (!isQtyType || qty === 0 || buyP === 0) { preview.style.display='none'; return; }
  const invested = qty * buyP;
  const current  = qty * (curP > 0 ? curP : buyP);
  const pnl      = current - invested;
  preview.style.display = '';
  document.getElementById('prev_invested').textContent = fmtINR(invested);
  document.getElementById('prev_current').textContent  = fmtINR(current);
  const pnlEl = document.getElementById('prev_pnl');
  pnlEl.textContent = (pnl>=0?'+':'') + fmtINR(pnl) + ' (' + (buyP>0?((pnl/invested)*100).toFixed(1):0) + '%)';
  pnlEl.style.color = pnl >= 0 ? 'var(--emerald)' : 'var(--rose)';
}

function toggleAssetFields() {
  const type = document.getElementById('ast_type')?.value;
  if (!type) return;
  const debtTypes = ['FD','RD','BOND','EPF'];
  const qtyS = document.getElementById('ast_qty_section');
  const priS = document.getElementById('ast_principal_section');
  const tenS = document.getElementById('ast_tenure_section');
  const curS = document.getElementById('ast_cur_section');
  if (debtTypes.includes(type)) {
    qtyS.style.display='none'; priS.style.display=''; tenS.style.display=''; curS.style.display='none';
  } else if (['REAL_ESTATE','CASH'].includes(type)) {
    qtyS.style.display='none'; priS.style.display=''; tenS.style.display='none'; curS.style.display='';
  } else {
    qtyS.style.display=''; priS.style.display='none'; tenS.style.display='none'; curS.style.display='';
  }
}

function openEditAssetModal(id) {
  const a = (state.investments||[]).find(a=>String(a.id)===String(id));
  if (a) openAddAssetModal(a);
}

async function deleteAsset(id) {
  if (!confirm('Delete this asset?')) return;
  try {
    await del('investments', Number(id));
    state.investments = state.investments.filter(a=>String(a.id)!==String(id));
    showToast('Asset deleted','info');
    switchWealthTab('assets');
  } catch(e) { showToast('Failed to delete asset','error'); }
}

/* ─────────────────────────────────────────────────────────────
   MODAL — Add/Edit Liability (EMI Loan)
───────────────────────────────────────────────────────────── */
function openAddLiabilityModal(prefill = {}) {
  const html = `
    <div class="modal-overlay show" id="addLiabOverlay">
      <div class="modal" style="max-width:540px;">
        <div class="modal-header">
          <h3 class="modal-title">🏦 ${prefill.id?'Edit':'Add'} Liability</h3>
          <button class="modal-close" onclick="closeWealthModal('addLiabOverlay')">×</button>
        </div>
        <div class="modal-body">
          <form id="addLiabForm" class="space-y-4">
            <div><label class="form-label">Name*</label>
              <input id="liab_name" class="form-input" value="${prefill.name||''}" required /></div>
            <div class="grid-2">
              <div><label class="form-label">Type*</label>
                <select id="liab_type" class="form-input">
                  ${LIABILITY_TYPES.map(t=>`<option value="${t}" ${prefill.type===t?'selected':''}>${t}</option>`).join('')}
                </select></div>
              <div><label class="form-label">Outstanding Amount*</label>
                <input id="liab_outstanding" type="number" step="0.01" class="form-input" value="${prefill.outstanding||''}" required /></div>
            </div>
            <div class="grid-2">
              <div><label class="form-label">Interest Rate (%)</label>
                <input id="liab_rate" type="number" step="0.01" class="form-input" value="${prefill.interestRate||''}" /></div>
              <div><label class="form-label">Monthly EMI</label>
                <input id="liab_emi" type="number" step="0.01" class="form-input" value="${prefill.monthlyEmi||''}" /></div>
            </div>
            <div class="grid-2">
              <div><label class="form-label">Start Date</label>
                <input id="liab_startDate" type="date" class="form-input" value="${prefill.startDate||''}" /></div>
              <div><label class="form-label">Due Date</label>
                <input id="liab_dueDate" type="date" class="form-input" value="${prefill.dueDate||''}" /></div>
            </div>
            <div class="grid-2">
              <div><label class="form-label">Principal Amount</label>
                <input id="liab_principal" type="number" step="0.01" class="form-input" value="${prefill.principal||''}" /></div>
              <div><label class="form-label">Lender / Bank</label>
                <input id="liab_lender" class="form-input" value="${prefill.lender||''}" /></div>
            </div>
            <div class="grid-2">
              <div><label class="form-label">Loan Account No.</label>
                <input id="liab_accountNo" class="form-input" value="${prefill.accountNo||''}" /></div>
              <div><label class="form-label">Collateral</label>
                <input id="liab_collateral" class="form-input" value="${prefill.collateral||''}" /></div>
            </div>
            <div><label class="form-label">Notes</label>
              <textarea id="liab_notes" class="form-input form-textarea" rows="2">${prefill.notes||''}</textarea></div>
            <div class="grid-2">
              <button type="submit" class="btn-submit">💾 Save</button>
              <button type="button" class="btn-secondary" onclick="closeWealthModal('addLiabOverlay')">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
  document.getElementById('wealthModals').innerHTML = html;

  document.getElementById('addLiabForm').onsubmit = async (e) => {
    e.preventDefault();
    const liab = {
      name:         document.getElementById('liab_name').value.trim(),
      type:         document.getElementById('liab_type').value,
      outstanding:  parseFloat(document.getElementById('liab_outstanding').value)||0,
      interestRate: parseFloat(document.getElementById('liab_rate').value)||0,
      monthlyEmi:   parseFloat(document.getElementById('liab_emi').value)||0,
      startDate:    document.getElementById('liab_startDate').value,
      dueDate:      document.getElementById('liab_dueDate').value,
      principal:    parseFloat(document.getElementById('liab_principal').value)||0,
      lender:       document.getElementById('liab_lender').value.trim(),
      accountNo:    document.getElementById('liab_accountNo').value.trim(),
      collateral:   document.getElementById('liab_collateral').value.trim(),
      notes:        document.getElementById('liab_notes').value.trim(),
      createdAt:    new Date().toISOString()
    };
    if (prefill.id) {
      liab.id = prefill.id;
      await put('emi_loans', liab);
      state.emi_loans = state.emi_loans.map(l=>l.id===liab.id?liab:l);
      showToast('✅ Liability updated!','success');
    } else {
      const id = await put('emi_loans', liab);
      liab.id = id;
      state.emi_loans = [...(state.emi_loans||[]), liab];
      showToast('✅ Liability added!','success');
    }
    closeWealthModal('addLiabOverlay');
    switchWealthTab('liabilities');
  };
}

function openEditLiabilityModal(id) {
  const l = (state.emi_loans||[]).find(l=>String(l.id)===String(id));
  if (l) openAddLiabilityModal(l);
}

async function deleteLiability(id) {
  if (!confirm('Delete this liability?')) return;
  try {
    await del('emi_loans', Number(id));
    state.emi_loans = state.emi_loans.filter(l=>String(l.id)!==String(id));
    showToast('Liability deleted','info');
    switchWealthTab('liabilities');
  } catch(e) { showToast('Failed to delete','error'); }
}

/* ─────────────────────────────────────────────────────────────
   MODAL — Edit Allocation Targets
───────────────────────────────────────────────────────────── */
function openEditAllocationModal() {
  const targets = state.allocation_targets.length ? state.allocation_targets : DEFAULT_ALLOCATION;
  const fields  = targets.map(t => `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <div style="width:8px;height:8px;border-radius:50%;background:${(ASSET_CATEGORIES[t.category]||{color:'#888'}).color};flex-shrink:0;"></div>
      <label style="flex:1;font-size:13px;">${t.category}</label>
      <input type="number" min="0" max="100" class="form-input" style="width:80px;"
             value="${t.target}" data-cat="${t.category}" oninput="updateAllocTotal()" />
      <span style="font-size:12px;color:var(--text-3);">%</span>
    </div>`).join('');

  const html = `
    <div class="modal-overlay show" id="editAllocOverlay">
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <h3 class="modal-title">🎯 Edit Target Allocation</h3>
          <button class="modal-close" onclick="closeWealthModal('editAllocOverlay')">×</button>
        </div>
        <div class="modal-body">
          <div class="text-muted" style="font-size:12px;margin-bottom:16px;">Total must equal 100%</div>
          <div id="allocFields">${fields}</div>
          <div id="allocTotal" style="font-size:13px;margin:8px 0;font-weight:600;"></div>
          <div class="grid-2" style="margin-top:16px;">
            <button class="btn-submit" onclick="saveAllocationTargets()">💾 Save</button>
            <button class="btn-secondary" onclick="closeWealthModal('editAllocOverlay')">Cancel</button>
          </div>
        </div>
      </div>
    </div>`;
  document.getElementById('wealthModals').innerHTML = html;
  updateAllocTotal();
}

function updateAllocTotal() {
  const total = [...document.querySelectorAll('#allocFields input')].reduce((s,i)=>s+(parseFloat(i.value)||0),0);
  const el    = document.getElementById('allocTotal');
  if (!el) return;
  el.textContent = `Total: ${total}%`;
  el.style.color = Math.abs(total-100) < 0.1 ? 'var(--emerald)' : 'var(--rose)';
}

async function saveAllocationTargets() {
  const inputs = document.querySelectorAll('#allocFields input');
  const total  = [...inputs].reduce((s,i)=>s+(parseFloat(i.value)||0),0);
  if (Math.abs(total-100) > 0.1) { showToast('Total must be 100%','error'); return; }
  const newTargets = [...inputs].map(inp => ({
    id: 'alloc_' + inp.dataset.cat.replace(/\s/g,'').toLowerCase(),
    category: inp.dataset.cat,
    target: parseFloat(inp.value)||0
  }));
  for (const t of newTargets) await put('allocation_targets', t);
  state.allocation_targets = newTargets;
  closeWealthModal('editAllocOverlay');
  showToast('✅ Allocation targets saved!','success');
  switchWealthTab('allocation');
}

/* ─────────────────────────────────────────────────────────────
   MODAL — Add SIP Plan Instrument
───────────────────────────────────────────────────────────── */
function openAddSIPModal() {
  const html = `
    <div class="modal-overlay show" id="addSIPOverlay">
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <h3 class="modal-title">📅 Add SIP Instrument</h3>
          <button class="modal-close" onclick="closeWealthModal('addSIPOverlay')">×</button>
        </div>
        <div class="modal-body">
          <form id="sipForm" class="space-y-4">
            <div><label class="form-label">Instrument Name*</label>
              <input id="sip_name" class="form-input" required /></div>
            <div class="grid-2">
              <div><label class="form-label">Category*</label>
                <select id="sip_category" class="form-input">
                  ${Object.keys(ASSET_CATEGORIES).map(c=>`<option>${c}</option>`).join('')}
                </select></div>
              <div><label class="form-label">Monthly Amount (₹)*</label>
                <input id="sip_amount" type="number" step="0.01" class="form-input" required /></div>
            </div>
            <div><label class="form-label">% of Monthly Budget</label>
              <input id="sip_pct" type="number" step="0.1" class="form-input" placeholder="e.g. 30" /></div>
            <div class="grid-2">
              <button type="submit" class="btn-submit">➕ Add</button>
              <button type="button" class="btn-secondary" onclick="closeWealthModal('addSIPOverlay')">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;
  document.getElementById('wealthModals').innerHTML = html;
  document.getElementById('sipForm').onsubmit = async (e) => {
    e.preventDefault();
    const item = {
      name:         document.getElementById('sip_name').value.trim(),
      category:     document.getElementById('sip_category').value,
      monthlyAmount:parseFloat(document.getElementById('sip_amount').value)||0,
      percentage:   parseFloat(document.getElementById('sip_pct').value)||0
    };
    const id = await put('sip_plan', item);
    item.id = id;
    state.sip_plan = [...(state.sip_plan||[]), item];
    closeWealthModal('addSIPOverlay');
    showToast('✅ SIP instrument added!','success');
    switchWealthTab('allocation');
  };
}

async function deleteSIPItem(id) {
  if (!confirm('Remove this SIP instrument?')) return;
  await del('sip_plan', Number(id));
  state.sip_plan = state.sip_plan.filter(i=>String(i.id)!==String(id));
  switchWealthTab('allocation');
}

/* ─────────────────────────────────────────────────────────────
   UTILITIES
───────────────────────────────────────────────────────────── */
function closeWealthModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('show'); setTimeout(()=>el.remove(),300); }
  const m = document.getElementById('wealthModals');
  if (m) m.innerHTML = '';
}

async function exportWealthJSON() {
  const data = {
    investments:          state.investments,
    emi_loans:            state.emi_loans,
    net_worth_snapshots:  state.net_worth_snapshots,
    allocation_targets:   state.allocation_targets,
    sip_plan:             state.sip_plan,
    exportedAt:           new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `wealth-export-${nowISO()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('Wealth data exported!','success');
}

/* ─────────────────────────────────────────────────────────────
   DASHBOARD WEALTH WIDGET (renders into #dashWealthWidget)
───────────────────────────────────────────────────────────── */
function renderWealthDashboard() {
  const el = document.getElementById('dashWealthWidget');
  if (!el) return;
  const assets        = state.investments||[];
  const liabs         = state.emi_loans||[];
  const totalAssetVal = assets.reduce((s,a)=>s+getAssetCurrentValue(a),0);
  const totalInvested = assets.reduce((s,a)=>s+getAssetInvestedAmount(a),0);
  const totalLiab     = liabs.reduce((s,l)=>s+toNum(l.outstanding),0);
  const nw            = totalAssetVal - totalLiab;
  const totalPnL      = totalAssetVal - totalInvested;
  const pnlPct        = totalInvested>0?((totalPnL/totalInvested)*100).toFixed(1):0;
  const loanSum       = getLoanSummary();
  const catTotals     = {};
  assets.forEach(a => { const c=getAssetCategory(a); catTotals[c]=(catTotals[c]||0)+getAssetCurrentValue(a); });
  const catEntries    = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const topHoldings   = [...assets].sort((a,b)=>getAssetCurrentValue(b)-getAssetCurrentValue(a)).slice(0,3);

  if (assets.length === 0 && liabs.length === 0) {
    el.innerHTML = `
      <div class="section-heading">
        <div class="section-title"><span class="dot" style="background:var(--violet)"></span>Wealth Overview</div>
        <button class="section-action" onclick="showPage('wealth')">View All →</button>
      </div>
      <div class="tx-card" style="text-align:center;padding:24px;">
        <div style="font-size:24px;margin-bottom:8px;">🏦</div>
        <div style="font-size:14px;color:var(--text-2);">No assets tracked yet</div>
        <button class="btn-submit" style="width:auto;padding:9px 20px;margin-top:12px;font-size:13px;"
                onclick="showPage('wealth')">Start Tracking</button>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="section-heading">
      <div class="section-title"><span class="dot" style="background:var(--violet)"></span>Wealth Overview</div>
      <button class="section-action" onclick="showPage('wealth')">View All →</button>
    </div>
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px;">
      <div class="kpi-card blue" style="cursor:pointer;" onclick="showPage('wealth')">
        <div class="kpi-label">NET WORTH</div>
        <div class="kpi-value" style="color:${nw>=0?'var(--teal)':'var(--rose)'};font-size:clamp(13px,2vw,18px);">${fmtINR(nw)}</div>
        <div class="kpi-change">Assets − Liabilities</div>
      </div>
      <div class="kpi-card green" style="cursor:pointer;" onclick="showPage('wealth')">
        <div class="kpi-label">INVESTED</div>
        <div class="kpi-value" style="font-size:clamp(13px,2vw,18px);">${fmtINR(totalInvested)}</div>
        <div class="kpi-change" style="color:${totalPnL>=0?'var(--emerald)':'var(--rose)'};">
          P&L: ${totalPnL>=0?'+':''}${fmtINR(totalPnL)} (${pnlPct}%)
        </div>
      </div>
      <div class="kpi-card" style="cursor:pointer;" onclick="showPage('wealth');setTimeout(()=>switchWealthTab('loans'),150)">
        <div class="kpi-label">LOANS NET</div>
        <div class="kpi-value" style="color:${loanSum.netBalance>=0?'var(--emerald)':'var(--rose)'};font-size:clamp(13px,2vw,18px);">
          ${loanSum.netBalance>=0?'+':''}${fmtINR(loanSum.netBalance)}
        </div>
        <div class="kpi-change">${loanSum.overdue.length?`⚠️ ${loanSum.overdue.length} overdue`:'All clear'}</div>
      </div>
    </div>
    <div class="two-col">
      <div class="tx-card">
        <div class="section-heading" style="margin-bottom:10px;">
          <div class="section-title" style="font-size:12px;"><span class="dot" style="background:var(--teal)"></span>Top Holdings</div>
          <button class="section-action" onclick="showPage('wealth')">View all →</button>
        </div>
        ${topHoldings.length===0
          ? `<div style="text-align:center;padding:20px;color:var(--text-3);">No holdings yet</div>`
          : topHoldings.map(a => {
              const cat=getAssetCategory(a), curVal=getAssetCurrentValue(a), pnl=curVal-getAssetInvestedAmount(a);
              return `<div class="list-item" style="padding:10px 0;">
                <div style="font-size:18px;">${(ASSET_CATEGORIES[cat]||{icon:'💼'}).icon}</div>
                <div class="list-item-info">
                  <div class="list-item-name">${a.name||'Asset'}</div>
                  <div class="list-item-sub">${a.subType||cat}</div>
                </div>
                <div style="text-align:right;">
                  <div class="list-item-amount" style="color:var(--teal);">${fmtINR(curVal)}</div>
                  ${pnl!==0?`<div style="font-size:11px;color:${pnl>=0?'var(--emerald)':'var(--rose)'};">${pnl>=0?'+':''}${fmtINR(pnl)}</div>`:''}
                </div>
              </div>`;
            }).join('')}
      </div>
      <div class="tx-card">
        <div class="section-heading" style="margin-bottom:10px;">
          <div class="section-title" style="font-size:12px;"><span class="dot" style="background:var(--gold)"></span>Asset Allocation</div>
          <button class="section-action" onclick="showPage('wealth');setTimeout(()=>switchWealthTab('allocation'),150)">Rebalance →</button>
        </div>
        ${catEntries.length > 0
          ? `<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
              <div style="width:100px;height:100px;flex-shrink:0;"><canvas id="dashAllocChart"></canvas></div>
              <div style="flex:1;min-width:120px;">
                ${catEntries.map(([cat,val])=>{
                  const pct=totalAssetVal>0?((val/totalAssetVal)*100).toFixed(0):0;
                  return `<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;">
                    <div><span style="width:8px;height:8px;border-radius:50%;background:${(ASSET_CATEGORIES[cat]||{color:'#888'}).color};display:inline-block;margin-right:6px;"></span>${cat}</div>
                    <span style="font-family:var(--font-m);">${pct}%</span>
                  </div>`;
                }).join('')}
              </div>
             </div>`
          : `<div style="text-align:center;padding:20px;color:var(--text-3);">No assets</div>`}
      </div>
    </div>`;

  if (catEntries.length > 0) {
    setTimeout(() => {
      const ctx = document.getElementById('dashAllocChart');
      if (ctx) new Chart(ctx, {
        type: 'doughnut',
        data: { labels: catEntries.map(e=>e[0]), datasets: [{ data: catEntries.map(e=>e[1]), backgroundColor: catEntries.map(([c])=>(ASSET_CATEGORIES[c]||{color:'#888'}).color), borderWidth:2, borderColor:'transparent' }] },
        options: { responsive:true, maintainAspectRatio:true, cutout:'60%', plugins:{legend:{display:false},tooltip:{enabled:false}} }
      });
    }, 80);
  }
}

/* ─── Navigation helpers ──────────────────────────────────────*/
function switchToEssentialsGoal(goalId) {
  showPage('essentials');
  setTimeout(() => { switchEssentialsTab('goals'); if (goalId && typeof openUpdateGoalModal==='function') openUpdateGoalModal(goalId); }, 100);
}
function switchToEssentialsGoals() {
  showPage('essentials');
  setTimeout(() => { switchEssentialsTab('goals'); }, 100);
}

window.toNum = window.toNum || function(v) { const n=parseFloat(v); return isNaN(n)?0:n; };
window.renderWealthLoans = renderWealthLoans;