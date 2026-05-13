/* ============================================================
   Wealth Module — LedgerMate (Enhanced)
   Tabs: Assets | Liabilities | Net Worth | Allocation
   Includes: SIP P&L fix, summary stats, concentration alert,
             rebalancing suggestions, wealth goal tracker.
   ============================================================ */

// ─── Asset Category Mapping ──────────────────────────────────
const ASSET_CATEGORIES = {
  Equity:        { icon: '📈', color: '#3b82f6', types: ['STOCK','SIP_EQUITY','MF_EQUITY','MUTUAL_FUND'] },
  Debt:          { icon: '🏦', color: '#10b981', types: ['FD','RD','SIP_DEBT','MF_DEBT','BOND'] },
  'Real Estate': { icon: '🏠', color: '#f59e0b', types: ['REAL_ESTATE','PROPERTY'] },
  Commodities:   { icon: '🪙', color: '#d97706', types: ['GOLD','SILVER','PHYSICAL','COMMODITY'] },
  'Cash & Savings': { icon: '💵', color: '#8b5cf6', types: ['CASH','SAVINGS','LIQUID','EPF','PPF'] },
};

const DEFAULT_ALLOCATION = [
  { id: 'alloc_equity',   category: 'Equity',           target: 55 },
  { id: 'alloc_debt',     category: 'Debt',              target: 20 },
  { id: 'alloc_realestate',category: 'Real Estate',     target: 10 },
  { id: 'alloc_commodities',category: 'Commodities',    target: 10 },
  { id: 'alloc_cash',     category: 'Cash & Savings',   target:  5 },
];

const LIABILITY_TYPES = ['Home Loan','Car Loan','Personal Loan','Education Loan','Business Loan','Gold Loan','Credit Card','Other'];

// ─── Helper: get asset category ──────────────────────────────
function getAssetCategory(inv) {
  if (!inv) return 'Commodities';
  const t = (inv.type || '').toUpperCase();
  const sub = (inv.subType || inv.category || '').toLowerCase();

  if (['GOLD','SILVER','PHYSICAL','COMMODITY'].includes(t)) return 'Commodities';
  if (t === 'REAL_ESTATE' || t === 'PROPERTY') return 'Real Estate';
  if (['FD','RD','BOND'].includes(t)) return 'Debt';
  if (t === 'STOCK' || t === 'MUTUAL_FUND') return 'Equity';
  if (t === 'SIP') return sub.includes('debt') ? 'Debt' : 'Equity';
  if (['CASH','SAVINGS','LIQUID','EPF','PPF'].includes(t)) return 'Cash & Savings';
  return inv.wealthCategory || 'Commodities';
}

// ─── FIXED: get current value for ANY asset (SIP/MF works) ───
function getAssetCurrentValue(inv) {
  if (!inv) return 0;
  const t = (inv.type || '').toUpperCase();
  const qty = toNum(inv.qty || inv.stockQty || 0);
  const curPrice = toNum(inv.currentPrice || inv.ltp || inv.stockCurrentPrice || 0);
  const buyPrice = toNum(inv.buyPrice || inv.avgCost || inv.stockBuyPrice || 0);

  // For assets with quantity * price (Stocks, SIP, MF, Gold, etc.)
  if (['STOCK','SIP','MUTUAL_FUND','GOLD','SILVER','PHYSICAL','COMMODITY'].includes(t)) {
    return qty * (curPrice > 0 ? curPrice : buyPrice);
  }
  if (t === 'REAL_ESTATE') return toNum(inv.currentValue || inv.buyPrice || 0);

  // Debt products: try maturity calculator, else principal
  if (['FD','RD','BOND','EPF'].includes(t) && typeof calculateMaturity === 'function') {
    const mat = calculateMaturity(inv);
    return mat > 0 ? mat : toNum(inv.principal || 0);
  }
  return toNum(inv.principal || inv.currentValue || inv.amount || 0);
}

// ─── FIXED: get invested amount for any asset ────────────────
function getAssetInvestedAmount(inv) {
  if (!inv) return 0;
  const t = (inv.type || '').toUpperCase();
  const qty = toNum(inv.qty || inv.stockQty || 0);
  const buyPrice = toNum(inv.buyPrice || inv.avgCost || inv.stockBuyPrice || 0);

  if (['STOCK','SIP','MUTUAL_FUND','GOLD','SILVER','PHYSICAL','COMMODITY'].includes(t)) {
    return qty * buyPrice;
  }
  if (t === 'REAL_ESTATE') return toNum(inv.buyPrice || inv.principal || 0);
  return toNum(inv.principal || inv.amount || 0);
}

// ─── Totals ──────────────────────────────────────────────────
function getTotalAssets() {
  return (state.investments || []).reduce((sum, inv) => sum + getAssetCurrentValue(inv), 0);
}

function getTotalLiabilities() {
  return (state.emi_loans || []).reduce((sum, l) => sum + toNum(l.outstanding || 0), 0);
}

function getNetWorth() {
  return getTotalAssets() - getTotalLiabilities();
}

// ─── WEALTH PAGE ENTRY ────────────────────────────────────────
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
     <div style="display:flex; gap:8px; align-items:center; flex-wrap:nowrap;">
  <button class="btn-submit" style="width:auto; padding:9px 25px; margin:0; font-size:13px; white-space:nowrap;" onclick="openAddAssetModal()">
    <span class="desktop-text">+ Add </span>
    <span class="mobile-icon" style="display:none;">+Add</span>
  </button>
  <button class="btn-secondary" style="padding:9px 14px; font-size:13px; white-space:nowrap;" onclick="exportWealthJSON()">📤</button>
</div>
    </div>

    <div class="wealth-tabs fade-up fade-up-2">
      <button class="wealth-tab ${currentTab==='assets'?'active':''}" onclick="switchWealthTab('assets')">Assets</button>
      <button class="wealth-tab ${currentTab==='liabilities'?'active':''}" onclick="switchWealthTab('liabilities')">Liabilities</button>
      <button class="wealth-tab ${currentTab==='networth'?'active':''}" onclick="switchWealthTab('networth')">Net Worth</button>
      <button class="wealth-tab ${currentTab==='allocation'?'active':''}" onclick="switchWealthTab('allocation')">Allocation</button>
    </div>

    <div id="wealth-tab-content" class="fade-up fade-up-3"></div>
  `;
  switchWealthTab(currentTab);
}

function switchWealthTab(tab) {
  const page = document.getElementById('page-wealth');
  if (!page) return;
  page.dataset.activeTab = tab;

  page.querySelectorAll('.wealth-tab').forEach(btn => {
    const btnTab = btn.textContent.toLowerCase().replace(' ','');
    btn.classList.toggle('active', btnTab === tab || btn.getAttribute('onclick').includes(`'${tab}'`));
  });

  const content = document.getElementById('wealth-tab-content');
  if (!content) return;

  if (tab === 'assets')      renderWealthAssets(content);
  if (tab === 'liabilities') renderWealthLiabilities(content);
  if (tab === 'networth')    renderWealthNetWorth(content);
  if (tab === 'allocation')  renderWealthAllocation(content);
}

// ─── ASSETS TAB (enhanced: summary stats + concentration alert) ──
function renderWealthAssets(container) {
  const assets = state.investments || [];
  const totalInvested = assets.reduce((s,a) => s + getAssetInvestedAmount(a), 0);
  const totalCurrent  = assets.reduce((s,a) => s + getAssetCurrentValue(a), 0);
  const totalPnL = totalCurrent - totalInvested;
  const pnlPct = totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(1) : 0;

  // Concentration alert
  const maxAsset = assets.reduce((max, a) => {
    const val = getAssetCurrentValue(a);
    return val > max.val ? { name: a.name || a.stockName, val } : max;
  }, { name: '', val: 0 });
  const concPct = totalCurrent > 0 ? ((maxAsset.val / totalCurrent) * 100).toFixed(1) : 0;
  const concentrationWarning = (concPct > 30) ? `
    <div class="alert-red" style="padding:10px; border-radius:10px; margin-bottom:16px;">
      ⚠️ High concentration: <strong>${maxAsset.name}</strong> is ${concPct}% of your portfolio. Consider diversifying.
    </div>` : '';

  // Summary stats HTML
  const winning = assets.filter(a => (getAssetCurrentValue(a) - getAssetInvestedAmount(a)) > 0).length;
  const losing  = assets.filter(a => (getAssetCurrentValue(a) - getAssetInvestedAmount(a)) < 0).length;
  const summaryStats = `
    <div class="stats-row" style="margin-bottom:20px;">
      <div class="stat-mini"><div class="stat-mini-val">${fmtINR(totalInvested)}</div><div class="stat-mini-label">Invested</div></div>
      <div class="stat-mini"><div class="stat-mini-val" style="color:var(--teal);">${fmtINR(totalCurrent)}</div><div class="stat-mini-label">Current Value</div></div>
      <div class="stat-mini"><div class="stat-mini-val" style="color:${totalPnL>=0?'var(--emerald)':'var(--rose)'};">${totalPnL>=0?'+':''}${fmtINR(totalPnL)}</div><div class="stat-mini-label">Total P&L</div></div>
      <div class="stat-mini"><div class="stat-mini-val">${pnlPct}%</div><div class="stat-mini-label">Return</div></div>
      <div class="stat-mini"><div class="stat-mini-val">${assets.length}</div><div class="stat-mini-label">Holdings</div></div>
      <div class="stat-mini"><div class="stat-mini-val">${winning} / ${losing}</div><div class="stat-mini-label">Win/Loss</div></div>
    </div>`;

  if (assets.length === 0) {
    container.innerHTML = summaryStats + concentrationWarning + `
      <div class="empty-state">
        <div class="empty-state-icon">🏦</div>
        <div class="empty-state-text">No assets yet</div>
        <div class="empty-state-sub">Add your first asset to start tracking</div>
        <button class="btn-submit" style="width:auto;padding:10px 24px;margin-top:16px;" onclick="openAddAssetModal()">+ Add Asset</button>
      </div>`;
    return;
  }

  // Build asset rows with individual P&L and allocation %
  const rows = assets.map(a => {
    const cat = getAssetCategory(a);
    const catInfo = ASSET_CATEGORIES[cat] || { icon: '💼', color: 'var(--teal)' };
    const invested  = getAssetInvestedAmount(a);
    const curVal    = getAssetCurrentValue(a);
    const pnl       = curVal - invested;
    const pnlPct    = invested > 0 ? ((pnl / invested) * 100).toFixed(1) : 0;
    const allocPct  = totalCurrent > 0 ? ((curVal / totalCurrent) * 100).toFixed(1) : 0;
    const qty       = toNum(a.qty || a.stockQty || 0);
    const avgCost   = toNum(a.buyPrice || a.avgCost || a.stockBuyPrice || 0);
    const ltp       = toNum(a.currentPrice || a.ltp || a.stockCurrentPrice || avgCost);
    const t = (a.type || '').toUpperCase();
    const qtyDisplay = ['GOLD','SILVER','PHYSICAL','COMMODITY','STOCK','SIP','MUTUAL_FUND'].includes(t) ? qty.toFixed(2) : '—';
    const avgDisplay = avgCost > 0 ? fmtINR(avgCost) : '—';
    const ltpDisplay = ltp > 0 ? fmtINR(ltp) : '—';

    return `
      <tr class="wealth-row" data-id="${a.id}">
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">${catInfo.icon}</span>
            <div>
              <div class="list-item-name" style="margin:0;">${a.name || a.stockName || 'Asset'}</div>
              <div class="list-item-sub" style="margin:0;">${a.subType || a.category || cat}</div>
            </div>
          </div>
        </td>
        <td class="wealth-td-mono">${qtyDisplay}</td>
        <td class="wealth-td-mono">${avgDisplay}</td>
        <td class="wealth-td-mono">${ltpDisplay}</td>
        <td class="wealth-td-mono">${fmtINR(invested)}</td>
        <td class="wealth-td-mono" style="color:var(--teal);">${fmtINR(curVal)}</td>
        <td class="wealth-td-mono" style="color:${pnl>=0?'var(--emerald)':'var(--rose)'};">${pnl>=0?'+':''}${fmtINR(pnl)}<br><span style="font-size:10px;">${pnl>=0?'+':''}${pnlPct}%</span></td>
        <td class="wealth-td-mono">${allocPct}%</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="section-action" onclick="openEditAssetModal('${a.id}')" style="padding:4px 8px;">✏️</button>
            <button class="section-action" onclick="deleteAsset('${a.id}')" style="padding:4px 8px;color:var(--rose);">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = summaryStats + concentrationWarning + `
    <div class="tx-card" style="overflow-x:auto;">
      <div class="section-heading">
        <div class="section-title"><span class="dot"></span>Holdings</div>
        <select id="assetCatFilter" class="tx-filter-select" onchange="filterWealthAssets(this.value)">
          <option value="all">All Categories</option>
          ${Object.keys(ASSET_CATEGORIES).map(c=>`<option value="${c}">${c}</option>`).join('')}
        </select>
      </div>
      <table class="wealth-table">
        <thead>
          <tr><th>NAME</th><th>QTY</th><th>AVG. COST</th><th>LTP</th><th>INVESTED</th><th>CUR. VAL</th><th>P&L</th><th>% ALLOC</th><th></th></tr>
        </thead>
        <tbody id="assetsTableBody">${rows}</tbody>
      </table>
      <div style="text-align:right;padding:12px 0 0;font-size:12px;color:var(--text-3);font-family:var(--font-m);">${assets.length} asset${assets.length!==1?'s':''}</div>
    </div>`;
}

function filterWealthAssets(cat) {
  const rows = document.querySelectorAll('#assetsTableBody .wealth-row');
  rows.forEach(row => {
    const id = row.dataset.id;
    const asset = (state.investments||[]).find(a=>String(a.id)===String(id));
    if (!asset) return;
    const assetCat = getAssetCategory(asset);
    row.style.display = (cat === 'all' || assetCat === cat) ? '' : 'none';
  });
}

// ─── LIABILITIES TAB (unchanged, works fine) ─────────────────
function renderWealthLiabilities(container) {
  const loans = state.emi_loans || [];
  const totalOutstanding = loans.reduce((s,l) => s + toNum(l.outstanding), 0);
  const totalAssets = getTotalAssets();
  const debtRatio = totalAssets > 0 ? ((totalOutstanding / totalAssets) * 100).toFixed(1) : 0;

  if (loans.length === 0) {
    container.innerHTML = `
      <div class="chart-card" style="text-align:center;margin-bottom:16px;">
        <div style="font-family:var(--font-m);font-size:28px;font-weight:600;color:var(--emerald);">₹0</div>
        <div class="kpi-label" style="margin-top:4px;">TOTAL LIABILITIES</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:4px;">0 active loans</div>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <div class="empty-state-text">No liabilities!</div>
        <div class="empty-state-sub">Excellent financial position — debt-free</div>
        <button class="btn-submit" style="width:auto;padding:10px 24px;margin-top:16px;" onclick="openAddLiabilityModal()">+ Add Liability</button>
      </div>`;
    return;
  }

  const rows = loans.map(l => {
    const emi = toNum(l.monthlyEmi);
    const rate = toNum(l.interestRate);
    const pct = totalOutstanding > 0 ? ((toNum(l.outstanding)/totalOutstanding)*100).toFixed(1) : 0;
    return `
      <div class="list-item" style="flex-direction:column;align-items:stretch;gap:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="kpi-icon" style="background:rgba(251,113,133,0.12);font-size:18px;">🏦</div>
            <div>
              <div class="list-item-name">${l.name||'Loan'}</div>
              <div class="list-item-sub">${l.type||'Loan'} · ${l.lender||''} ${l.accountNo?'· #'+l.accountNo:''}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-m);font-size:15px;font-weight:600;color:var(--rose);">${fmtINR(l.outstanding)}</div>
            <div style="font-size:11px;color:var(--text-3);">${pct}% of total</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 0;border-top:1px solid var(--border);">
          <div><div class="kpi-label">INTEREST</div><div style="font-size:13px;font-family:var(--font-m);">${rate}%</div></div>
          <div><div class="kpi-label">MONTHLY EMI</div><div style="font-size:13px;font-family:var(--font-m);">${emi>0?fmtINR(emi):'—'}</div></div>
          <div><div class="kpi-label">STARTED</div><div style="font-size:13px;font-family:var(--font-m);">${l.startDate||'—'}</div></div>
        </div>
        ${l.collateral?`<div style="font-size:11px;color:var(--text-3);">Collateral: ${l.collateral}</div>`:''}
        ${l.notes?`<div style="font-size:11px;color:var(--text-3);">${l.notes}</div>`:''}
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px;">
          <button class="section-action" onclick="openEditLiabilityModal('${l.id}')" style="padding:5px 10px;">✏️ Edit</button>
          <button class="section-action" onclick="deleteLiability('${l.id}')" style="padding:5px 10px;color:var(--rose);">🗑️ Delete</button>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
      <div class="kpi-card rose"><div class="kpi-label">TOTAL LIABILITIES</div><div class="kpi-value" style="color:var(--rose);">${fmtINR(totalOutstanding)}</div><div class="kpi-change">${loans.length} active loan${loans.length!==1?'s':''}</div></div>
      <div class="kpi-card violet"><div class="kpi-label">DEBT RATIO</div><div class="kpi-value" style="color:var(--violet);">${debtRatio}%</div><div class="kpi-change">of total assets</div></div>
      <div class="kpi-card emerald"><div class="kpi-label">NET WORTH</div><div class="kpi-value" style="color:var(--emerald);">${fmtINR(getNetWorth())}</div><div class="kpi-change">Assets − Liabilities</div></div>
    </div>
    <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--rose)"></span>Active Loans</div><button class="section-action" onclick="openAddLiabilityModal()">+ Add Liability</button></div>
    <div class="tx-card">${rows}</div>`;
}

// ─── NET WORTH TAB (enhanced with goal tracker) ──────────────
 async function renderWealthNetWorth(container) {
  const nw = getNetWorth();
  const assets = getTotalAssets();
  const liabilities = getTotalLiabilities();
  const snapshots = (state.net_worth_snapshots || []).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const lastSnap = snapshots[snapshots.length-1];
  const change = lastSnap ? nw - toNum(lastSnap.netWorth) : 0;

  // Get net worth goal from Essentials goals (trackBy === 'networth')
  let wealthGoal = null;
  if (state.savings && Array.isArray(state.savings)) {
    wealthGoal = state.savings.find(g => g.trackBy === 'networth');
  }

  let goalHtml = '';
  if (wealthGoal && wealthGoal.target > 0) {
    const progress = Math.min(100, (nw / wealthGoal.target) * 100);
    const deadlineDate = wealthGoal.targetDate ? new Date(wealthGoal.targetDate) : null;
    const monthsLeft = deadlineDate ? Math.max(0, (deadlineDate - new Date()) / (1000*3600*24*30)) : 0;
    const requiredMonthly = monthsLeft > 0 ? (wealthGoal.target - nw) / monthsLeft : 0;
    const monthlySIP = (state.sip_plan || []).reduce((s,i) => s + toNum(i.monthlyAmount), 0);
    const onTrack = requiredMonthly <= monthlySIP;
    goalHtml = `
      <div class="chart-card" style="margin-bottom:16px;">
        <div class="section-heading">
          <div class="section-title"><span class="dot" style="background:var(--gold)"></span>🎯 Wealth Goal: ${escapeHtml(wealthGoal.name)}</div>
          <button class="section-action" onclick="switchToEssentialsGoal('${wealthGoal.id}')">Edit in Goals</button>
        </div>
        <div><strong>Target:</strong> ${fmtINR(wealthGoal.target)}  |  <strong>Deadline:</strong> ${wealthGoal.targetDate || 'Not set'}</div>
        <div class="goal-bar-bg" style="margin:12px 0;"><div class="goal-bar-fill" style="width:${progress}%;"></div></div>
        <div>Progress: ${progress.toFixed(1)}% (${fmtINR(nw)} / ${fmtINR(wealthGoal.target)})</div>
        ${monthsLeft > 0 ? `<div style="margin-top:8px;font-size:13px;">💰 Required monthly savings: <strong style="color:${onTrack?'var(--emerald)':'var(--rose)'}">${fmtINR(requiredMonthly)}</strong> ${monthlySIP ? `(Current SIP: ${fmtINR(monthlySIP)})` : ''}</div>` : ''}
        ${!onTrack && monthsLeft>0 ? `<div class="alert-red" style="margin-top:8px;padding:6px;">⚠️ Increase monthly investments by ${fmtINR(requiredMonthly - monthlySIP)}</div>` : ''}
      </div>`;
  } else {
    goalHtml = `<div class="chart-card" style="margin-bottom:16px;text-align:center;">
      <button class="btn-secondary" onclick="switchToEssentialsGoals()">🎯 Set a Net Worth Goal in Essentials</button>
    </div>`;
  }

  // Snapshot list (unchanged)
  const snapshotList = snapshots.length === 0
    ? `<div class="empty-state" style="padding:32px;"><div class="empty-state-icon">📸</div><div class="empty-state-text">No snapshots yet</div><div class="empty-state-sub">Snapshots record your net worth at a point in time so you can track growth over months.</div></div>`
    : `<div class="tx-list">` + [...snapshots].reverse().map(s => {
        const snapChange = s.change || 0;
        return `<div class="list-item">
          <div class="tx-icon ${snapChange>=0?'income':'expense'}">${snapChange>=0?'📈':'📉'}</div>
          <div class="list-item-info"><div class="list-item-name">${s.date}</div><div class="list-item-sub">Assets: ${fmtINR(s.assets)} · Liabilities: ${fmtINR(s.liabilities)}</div></div>
          <div style="text-align:right;"><div class="list-item-amount" style="color:${s.netWorth>=0?'var(--teal)':'var(--rose)'};">${fmtINR(s.netWorth)}</div>${snapChange!==0?`<div style="font-size:11px;color:${snapChange>=0?'var(--emerald)':'var(--rose)'};">${snapChange>=0?'+':''}${fmtINR(snapChange)}</div>`:''}</div>
          <button onclick="deleteNetWorthSnapshot('${s.id}')" style="background:none;border:none;cursor:pointer;color:var(--text-3);padding:4px;margin-left:8px;">×</button>
        </div>`;
      }).join('') + `</div>`;

  // Mini chart data
  const chartLabels = snapshots.map(s => s.date.slice(5));
  const chartData = snapshots.map(s => s.netWorth);

  container.innerHTML = `
    <div class="chart-card" style="margin-bottom:16px;text-align:center;">
      <div class="kpi-label" style="margin-bottom:8px;">YOUR CURRENT NET WORTH</div>
      <div style="font-family:var(--font-m);font-size:clamp(24px,4vw,36px);font-weight:700;color:${nw>=0?'var(--teal)':'var(--rose)'};">${fmtINR(nw)}</div>
      ${change!==0?`<div style="margin-top:6px;font-size:13px;color:${change>=0?'var(--emerald)':'var(--rose)'};">${change>=0?'↑':'↓'} ${fmtINR(Math.abs(change))} from last snapshot</div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
        <div><div class="kpi-label">ASSETS</div><div style="font-family:var(--font-m);font-size:18px;font-weight:600;color:var(--emerald);">${fmtINR(assets)}</div></div>
        <div><div class="kpi-label">LIABILITIES</div><div style="font-family:var(--font-m);font-size:18px;font-weight:600;color:${liabilities>0?'var(--rose)':'var(--text-3)'};">${fmtINR(liabilities)}</div></div>
      </div>
    </div>
    ${goalHtml}
    ${snapshots.length > 1 ? `<div class="chart-card" style="margin-bottom:16px;"><div class="chart-card-title"><span style="color:var(--teal)">●</span> Net Worth History</div><div class="chart-wrap" style="height:180px;"><canvas id="nwHistoryChart"></canvas></div></div>` : ''}
    <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--teal)"></span>Snapshots</div><button class="btn-submit" style="width:auto;padding:8px 16px;margin:0;font-size:12px;" onclick="takeNetWorthSnapshot()">📸 Take Snapshot</button></div>
    <div class="tx-card">${snapshotList}</div>`;

  if (snapshots.length > 1) {
    setTimeout(() => {
      const ctx = document.getElementById('nwHistoryChart');
      if (!ctx) return;
      new Chart(ctx, {
        type: 'line',
        data: { labels: chartLabels, datasets: [{ label: 'Net Worth', data: chartData, borderColor: 'rgba(0,212,180,1)', backgroundColor: 'rgba(0,212,180,0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: 'rgba(0,212,180,1)' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { font: { size: 10 }, callback: v => '₹' + (v >= 100000 ? (v/100000).toFixed(1)+'L' : v >= 1000 ? (v/1000).toFixed(0)+'K' : v) } } } }
      });
    }, 50);
  }
}

async function takeNetWorthSnapshot() {
  const nw = getNetWorth();
  const assets = getTotalAssets();
  const liabilities = getTotalLiabilities();
  const snaps = state.net_worth_snapshots || [];
  const last = snaps.length ? snaps[snaps.length-1] : null;
  const change = last ? nw - toNum(last.netWorth) : 0;
  const snap = { date: nowISO(), netWorth: nw, assets, liabilities, change };
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
    state.net_worth_snapshots = state.net_worth_snapshots.filter(s => String(s.id) !== String(id));
    showToast('Snapshot deleted', 'info');
    switchWealthTab('networth');
  } catch(e) { showToast('Failed to delete', 'error'); }
}
 
// ─── ALLOCATION TAB (enhanced with rebalancing suggestions) ──
async function ensureAllocationTargets() {
  if (!state.allocation_targets || state.allocation_targets.length === 0) {
    const saved = await getAll('allocation_targets');
    if (saved.length === 0) {
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
  const targets = state.allocation_targets.length ? state.allocation_targets : DEFAULT_ALLOCATION;
  const assets = state.investments || [];
  const totalCurrent = getTotalAssets();

  const actual = {};
  assets.forEach(a => { const cat = getAssetCategory(a); actual[cat] = (actual[cat] || 0) + getAssetCurrentValue(a); });

  const targetMap = {};
  targets.forEach(t => targetMap[t.category] = t.target);
  const barSegments = targets.map(t => `<div style="flex:${t.target};background:${(ASSET_CATEGORIES[t.category]||{color:'#888'}).color};height:100%;"></div>`).join('');

  // Table rows
  const rows = targets.map(t => {
    const catInfo = ASSET_CATEGORIES[t.category] || { icon: '💼', color: '#888' };
    const actualAmt = actual[t.category] || 0;
    const actualPct = totalCurrent > 0 ? ((actualAmt / totalCurrent) * 100).toFixed(0) : 0;
    const tgtAmt    = totalCurrent * t.target / 100;
    const gapPct = toNum(actualPct) - t.target;
    const gapAmt    = actualAmt - tgtAmt;
    const action    = gapAmt < -1000 ? `<span style="color:var(--emerald);font-size:12px;cursor:pointer;" onclick="openAddAssetModal()">Add ${fmtINR(Math.abs(gapAmt))}</span>`
                    : gapAmt > 1000  ? `<span style="color:var(--rose);font-size:12px;">Reduce ${fmtINR(gapAmt)}</span>`
                    : `<span style="color:var(--text-3);font-size:12px;">On track</span>`;
    return `<tr><td><div style="display:flex;align-items:center;gap:8px;"><div style="width:10px;height:10px;border-radius:2px;background:${catInfo.color};"></div><span style="font-size:13px;font-weight:600;">${t.category}</span></div></td>
             <td class="wealth-td-mono">${actualPct}%</td><td class="wealth-td-mono">${fmtINR(actualAmt)}</td>
             <td class="wealth-td-mono">${t.target}%</td><td class="wealth-td-mono">${fmtINR(tgtAmt)}</td>
             <td class="wealth-td-mono"><span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;background:${Math.abs(gapPct)<=5?'rgba(52,211,153,0.12)':gapPct<0?'rgba(96,165,250,0.12)':'rgba(251,113,133,0.12)'};color:${Math.abs(gapPct)<=5?'var(--emerald)':gapPct<0?'var(--blue)':'var(--rose)'};">${gapPct>0?'+':''}${gapPct}%</span></td>
             <td>${action}</td></tr>`;
  }).join('');

  // Rebalancing suggestions
 // ─── Enhanced Rebalancing Suggestions UI ─────────────────────
// let rebalancingHtml = '';
// const actions = [];
// for (let t of targets) {
//   const actualAmt = actual[t.category] || 0;
//   const targetAmt = totalCurrent * t.target / 100;
//   const diff = targetAmt - actualAmt;
//   if (Math.abs(diff) > 1000) {
//     const isBuy = diff > 0;
//     actions.push(`
//       <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--border);">
//         <div>
//           <span style="font-weight: 500;">${t.category}</span>
//           <span style="font-size: 11px; color: var(--text-3); margin-left: 8px;">need ${isBuy ? '+' : '-'} ${fmtINR(Math.abs(diff))}</span>
//         </div>
//         <div>
//           ${isBuy 
//             ? `<button class="btn-submit" style="padding: 4px 10px; font-size: 11px;" onclick="openAddAssetModal({wealthCategory:'${t.category}'})">+ Add</button>`
//             : `<span class="chip" style="background: rgba(251,113,133,0.15); color: var(--rose); padding: 3px 8px; font-size: 11px;">Reduce ${fmtINR(Math.abs(diff))}</span>`
//           }
//         </div>
//       </div>
//     `);
//   }
// }
// if (actions.length) {
//   rebalancingHtml = `
//     <div class="tx-card" style="margin-top: 16px; padding: 12px 16px;">
//       <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">🔄 Rebalancing Suggestions</div>
//       ${actions.join('')}
//     </div>
//   `;
// }

  // SIP Plan
  const sipItems = state.sip_plan || [];
  const totalMonthlySIP = sipItems.reduce((s,i)=>s+toNum(i.monthlyAmount),0);

  

  const chartLabels = targets.map(t => t.category);
  const chartData   = targets.map(t => actual[t.category] || 0);
  const chartColors = targets.map(t => (ASSET_CATEGORIES[t.category]||{color:'#888'}).color);

  container.innerHTML = `
    <div class="two-col" style="margin-bottom:16px;">
      <div class="chart-card"><div class="chart-card-title"><span style="color:var(--gold)">●</span> Target Allocation <button class="section-action" onclick="openEditAllocationModal()" style="margin-left:auto;font-size:11px;">✏️ Edit</button></div>
        <div style="display:flex;height:10px;border-radius:99px;overflow:hidden;gap:1px;margin-bottom:8px;">${barSegments}</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">${targets.map(t => `<div style="display:flex;align-items:center;gap:4px;font-size:11px;"><span style="width:8px;height:8px;border-radius:50%;background:${(ASSET_CATEGORIES[t.category]||{color:'#888'}).color};"></span>${t.category} ${t.target}%</div>`).join('')}</div>
      </div>
      <div class="chart-card" style="display:flex;flex-direction:column;align-items:center;">
        <div class="chart-card-title" style="width:100%"><span style="color:var(--gold)">●</span> Current Allocation</div>
        ${totalCurrent > 0 ? `<div class="chart-wrap" style="height:160px;width:100%;max-width:220px;"><canvas id="allocDoughnut"></canvas></div>` : `<div class="empty-state" style="padding:24px;"><div class="empty-state-icon">🥧</div><div class="empty-state-text">No assets yet</div></div>`}
      </div>
    </div>
    <div class="chart-card" style="margin-bottom:16px;overflow-x:auto;">
      <div class="section-heading"><div class="section-title"><span class="dot"></span>Target vs Actual</div></div>
      <table class="wealth-table"><thead><tr><th>CATEGORY</th><th>ACTUAL</th><th>CUR VAL</th><th>TARGET</th><th>TGT VAL</th><th>GAP</th><th>ACTION</th></tr></thead><tbody>${rows}</tbody></table>
    </div>
    
    <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--violet)"></span>Monthly SIP Plan</div><button class="section-action" onclick="openAddSIPModal()">+ Add Instrument</button></div>
    <div class="chart-card" id="sipPlanContainer">
      ${sipItems.length === 0 ? `<div class="empty-state" style="padding:24px;"><div class="empty-state-icon">💰</div><div class="empty-state-text">No monthly SIP plan yet</div><button class="btn-submit" style="width:auto;margin-top:12px;" onclick="openAddSIPModal()">+ Add Instrument</button></div>` : renderSIPList(sipItems)}
    </div>`;

  if (totalCurrent > 0) {
    setTimeout(() => {
      const ctx = document.getElementById('allocDoughnut');
      if (ctx) new Chart(ctx, { type: 'doughnut', data: { labels: chartLabels, datasets: [{ data: chartData, backgroundColor: chartColors, borderWidth: 2, borderColor: 'transparent' }] }, options: { responsive: true, maintainAspectRatio: true, cutout: '65%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtINR(ctx.raw)}` } } } } });
    }, 50);
  }
}

function renderSIPList(sipItems) {
  const totalMonthly = sipItems.reduce((s,i)=>s+toNum(i.monthlyAmount),0);
  return `<div style="margin-bottom:12px;font-size:12px;">Total monthly investment: <strong style="color:var(--teal);">${fmtINR(totalMonthly)}</strong></div>
    ${sipItems.map(item => `<div class="list-item" style="justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:10px;"><div style="width:8px;height:8px;border-radius:50%;background:${(ASSET_CATEGORIES[item.category]||{color:'#888'}).color};"></div><div><div class="list-item-name">${item.name}</div><div class="list-item-sub">${item.category} · ${item.percentage||0}%</div></div></div>
      <div style="display:flex;align-items:center;gap:8px;"><div class="list-item-amount" style="color:var(--teal);">${fmtINR(item.monthlyAmount)}</div><button onclick="deleteSIPItem('${item.id}')" style="background:none;border:none;cursor:pointer;color:var(--text-3);padding:4px;">×</button></div>
    </div>`).join('')}`;
}

// ─── MODALS (Add/Edit Asset, Liability, Allocation, SIP) ─────
function openAddAssetModal(prefill = {}) {
  const html = `<div class="modal-overlay show" id="addAssetOverlay"><div class="modal" style="max-width:560px;"><div class="modal-header"><h3 class="modal-title">➕ ${prefill.id?'Edit':'Add'} Asset</h3><button class="modal-close" onclick="closeWealthModal('addAssetOverlay')">×</button></div><div class="modal-body"><form id="addAssetForm" class="space-y-4"><div class="grid-2"><div><label class="form-label">Asset Name*</label><input id="ast_name" class="form-input" value="${prefill.name||''}" required /></div><div><label class="form-label">Type*</label><select id="ast_type" class="form-input" onchange="toggleAssetFields()"><option value="GOLD" ${prefill.type==='GOLD'?'selected':''}>🪙 Gold</option><option value="SILVER" ${prefill.type==='SILVER'?'selected':''}>🥈 Silver</option><option value="STOCK" ${prefill.type==='STOCK'?'selected':''}>📈 Stock</option><option value="MUTUAL_FUND" ${prefill.type==='MUTUAL_FUND'?'selected':''}>📊 Mutual Fund (Lumpsum)</option><option value="SIP" ${prefill.type==='SIP'?'selected':''}>🔄 SIP / MF (SIP)</option><option value="FD" ${prefill.type==='FD'?'selected':''}>🏦 Fixed Deposit</option><option value="RD" ${prefill.type==='RD'?'selected':''}>📆 Recurring Deposit</option><option value="REAL_ESTATE" ${prefill.type==='REAL_ESTATE'?'selected':''}>🏠 Real Estate</option><option value="EPF" ${prefill.type==='EPF'?'selected':''}>💰 EPF / PPF</option><option value="BOND" ${prefill.type==='BOND'?'selected':''}>📜 Bond</option><option value="CASH" ${prefill.type==='CASH'?'selected':''}>💵 Cash/Savings</option></select></div></div>
    <div id="ast_qty_section" class="grid-2"><div><label class="form-label">Quantity / Units</label><input id="ast_qty" type="number" step="0.001" class="form-input" value="${prefill.qty||''}" /></div><div><label class="form-label">Buy Price / Avg Cost</label><input id="ast_buyPrice" type="number" step="0.01" class="form-input" value="${prefill.buyPrice||''}" /></div></div>
    <div id="ast_cur_section" class="grid-2"><div><label class="form-label">Current Price (LTP)</label><input id="ast_currentPrice" type="number" step="0.01" class="form-input" value="${prefill.currentPrice||''}" /></div><div><label class="form-label">Sub-Type / Label</label><input id="ast_subType" class="form-input" value="${prefill.subType||''}" /></div></div>
    <div id="ast_principal_section" class="grid-2" style="display:none;"><div><label class="form-label">Principal Amount</label><input id="ast_principal" type="number" step="0.01" class="form-input" value="${prefill.principal||''}" /></div><div><label class="form-label">Interest Rate (%)</label><input id="ast_rate" type="number" step="0.01" class="form-input" value="${prefill.rate||''}" /></div></div>
    <div id="ast_tenure_section" class="grid-2" style="display:none;"><div><label class="form-label">Tenure (Months)</label><input id="ast_tenure" type="number" class="form-input" value="${prefill.tenureMonths||''}" /></div><div><label class="form-label">Start Date</label><input id="ast_startDate" type="date" class="form-input" value="${prefill.startDate||nowISO()}" /></div></div>
    <div><label class="form-label">Notes</label><input id="ast_notes" class="form-input" value="${prefill.notes||''}" /></div>
    <div class="grid-2"><button type="submit" class="btn-submit">💾 Save Asset</button><button type="button" class="btn-secondary" onclick="closeWealthModal('addAssetOverlay')">Cancel</button></div></form></div></div></div>`;
  document.getElementById('wealthModals').innerHTML = html;
  toggleAssetFields();
  document.getElementById('addAssetForm').onsubmit = async (e) => {
    e.preventDefault();
    const type = document.getElementById('ast_type').value;
    const asset = {
      name: document.getElementById('ast_name').value.trim(), type,
      subType: document.getElementById('ast_subType').value.trim(),
      qty: parseFloat(document.getElementById('ast_qty').value)||0,
      stockQty: parseFloat(document.getElementById('ast_qty').value)||0,
      buyPrice: parseFloat(document.getElementById('ast_buyPrice').value)||0,
      avgCost: parseFloat(document.getElementById('ast_buyPrice').value)||0,
      stockBuyPrice: parseFloat(document.getElementById('ast_buyPrice').value)||0,
      currentPrice: parseFloat(document.getElementById('ast_currentPrice').value)||0,
      ltp: parseFloat(document.getElementById('ast_currentPrice').value)||0,
      stockCurrentPrice: parseFloat(document.getElementById('ast_currentPrice').value)||0,
      principal: parseFloat(document.getElementById('ast_principal').value)||0,
      rate: parseFloat(document.getElementById('ast_rate').value)||0,
      tenureMonths: parseInt(document.getElementById('ast_tenure').value)||0,
      startDate: document.getElementById('ast_startDate').value,
      notes: document.getElementById('ast_notes').value.trim(),
      wealthCategory: getAssetCategoryFromType(type),
      createdAt: new Date().toISOString()
    };
    if (prefill.id) { asset.id = prefill.id; await put('investments', asset); state.investments = state.investments.map(i => i.id === asset.id ? asset : i); showToast('✅ Asset updated!', 'success'); }
    else { const id = await put('investments', asset); asset.id = id; state.investments.push(asset); showToast('✅ Asset added!', 'success'); }
    closeWealthModal('addAssetOverlay');
    switchWealthTab('assets');
  };
}

function getAssetCategoryFromType(type) {
  for (const [cat, info] of Object.entries(ASSET_CATEGORIES)) if (info.types.includes(type)) return cat;
  if (['GOLD','SILVER','PHYSICAL','COMMODITY'].includes(type)) return 'Commodities';
  if (['FD','RD','BOND','EPF'].includes(type)) return 'Debt';
  if (['STOCK','SIP','MUTUAL_FUND'].includes(type)) return 'Equity';
  if (type === 'REAL_ESTATE') return 'Real Estate';
  return 'Cash & Savings';
}

function toggleAssetFields() {
  const type = document.getElementById('ast_type')?.value;
  if (!type) return;
  const debtTypes = ['FD','RD','BOND','EPF'];
  const qtySection = document.getElementById('ast_qty_section');
  const principalSection = document.getElementById('ast_principal_section');
  const tenureSection = document.getElementById('ast_tenure_section');
  const curSection = document.getElementById('ast_cur_section');
  if (debtTypes.includes(type)) {
    qtySection.style.display = 'none'; principalSection.style.display = ''; tenureSection.style.display = ''; curSection.style.display = 'none';
  } else if (type === 'REAL_ESTATE' || type === 'CASH') {
    qtySection.style.display = 'none'; principalSection.style.display = ''; tenureSection.style.display = 'none'; curSection.style.display = '';
  } else {
    qtySection.style.display = ''; principalSection.style.display = 'none'; tenureSection.style.display = 'none'; curSection.style.display = '';
  }
}

function openEditAssetModal(id) {
  const asset = (state.investments||[]).find(a=>String(a.id)===String(id));
  if (asset) openAddAssetModal(asset);
}

async function deleteAsset(id) {
  if (!confirm('Delete this asset?')) return;
  try { await del('investments', Number(id)); state.investments = state.investments.filter(a => String(a.id) !== String(id)); showToast('Asset deleted', 'info'); switchWealthTab('assets'); } catch(e) { showToast('Failed to delete asset', 'error'); }
}

function openAddLiabilityModal(prefill = {}) {
  const html = `<div class="modal-overlay show" id="addLiabOverlay"><div class="modal" style="max-width:540px;"><div class="modal-header"><h3 class="modal-title">🏦 ${prefill.id?'Edit':'Add'} Liability</h3><button class="modal-close" onclick="closeWealthModal('addLiabOverlay')">×</button></div><div class="modal-body"><form id="addLiabForm" class="space-y-4"><div><label class="form-label">Name*</label><input id="liab_name" class="form-input" value="${prefill.name||''}" required /></div><div class="grid-2"><div><label class="form-label">Type*</label><select id="liab_type" class="form-input">${LIABILITY_TYPES.map(t=>`<option value="${t}" ${prefill.type===t?'selected':''}>${t}</option>`).join('')}</select></div><div><label class="form-label">Outstanding Amount*</label><input id="liab_outstanding" type="number" step="0.01" class="form-input" value="${prefill.outstanding||''}" required /></div></div><div class="grid-2"><div><label class="form-label">Interest Rate (%)</label><input id="liab_rate" type="number" step="0.01" class="form-input" value="${prefill.interestRate||''}" /></div><div><label class="form-label">Monthly EMI</label><input id="liab_emi" type="number" step="0.01" class="form-input" value="${prefill.monthlyEmi||''}" /></div></div><div class="grid-2"><div><label class="form-label">Start Date</label><input id="liab_startDate" type="date" class="form-input" value="${prefill.startDate||''}" /></div><div><label class="form-label">Due Date</label><input id="liab_dueDate" type="date" class="form-input" value="${prefill.dueDate||''}" /></div></div><div class="grid-2"><div><label class="form-label">Principal Amount</label><input id="liab_principal" type="number" step="0.01" class="form-input" value="${prefill.principal||''}" /></div><div><label class="form-label">Lender</label><input id="liab_lender" class="form-input" value="${prefill.lender||''}" /></div></div><div class="grid-2"><div><label class="form-label">Loan Account No.</label><input id="liab_accountNo" class="form-input" value="${prefill.accountNo||''}" /></div><div><label class="form-label">Collateral</label><input id="liab_collateral" class="form-input" value="${prefill.collateral||''}" /></div></div><div><label class="form-label">Notes</label><textarea id="liab_notes" class="form-input form-textarea" rows="2">${prefill.notes||''}</textarea></div><div class="grid-2"><button type="submit" class="btn-submit">💾 Save</button><button type="button" class="btn-secondary" onclick="closeWealthModal('addLiabOverlay')">Cancel</button></div></form></div></div></div>`;
  document.getElementById('wealthModals').innerHTML = html;
  document.getElementById('addLiabForm').onsubmit = async (e) => {
    e.preventDefault();
    const liab = {
      name: document.getElementById('liab_name').value.trim(), type: document.getElementById('liab_type').value,
      outstanding: parseFloat(document.getElementById('liab_outstanding').value)||0,
      interestRate: parseFloat(document.getElementById('liab_rate').value)||0,
      monthlyEmi: parseFloat(document.getElementById('liab_emi').value)||0,
      startDate: document.getElementById('liab_startDate').value,
      dueDate: document.getElementById('liab_dueDate').value,
      principal: parseFloat(document.getElementById('liab_principal').value)||0,
      lender: document.getElementById('liab_lender').value.trim(),
      accountNo: document.getElementById('liab_accountNo').value.trim(),
      collateral: document.getElementById('liab_collateral').value.trim(),
      notes: document.getElementById('liab_notes').value.trim(),
      createdAt: new Date().toISOString()
    };
    if (prefill.id) { liab.id = prefill.id; await put('emi_loans', liab); state.emi_loans = state.emi_loans.map(l => l.id === liab.id ? liab : l); showToast('✅ Liability updated!', 'success'); }
    else { const id = await put('emi_loans', liab); liab.id = id; state.emi_loans = [...(state.emi_loans||[]), liab]; showToast('✅ Liability added!', 'success'); }
    closeWealthModal('addLiabOverlay');
    switchWealthTab('liabilities');
  };
}

function openEditLiabilityModal(id) {
  const liab = (state.emi_loans||[]).find(l=>String(l.id)===String(id));
  if (liab) openAddLiabilityModal(liab);
}

async function deleteLiability(id) {
  if (!confirm('Delete this liability?')) return;
  try { await del('emi_loans', Number(id)); state.emi_loans = state.emi_loans.filter(l => String(l.id) !== String(id)); showToast('Liability deleted', 'info'); switchWealthTab('liabilities'); } catch(e) { showToast('Failed to delete', 'error'); }
}

function openEditAllocationModal() {
  const targets = state.allocation_targets.length ? state.allocation_targets : DEFAULT_ALLOCATION;
  const fields = targets.map(t => `<div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;"><div style="width:8px;height:8px;border-radius:50%;background:${(ASSET_CATEGORIES[t.category]||{color:'#888'}).color};"></div><label style="flex:1;">${t.category}</label><input type="number" min="0" max="100" class="form-input" style="width:80px;" value="${t.target}" data-cat="${t.category}" /><span>%</span></div>`).join('');
  const html = `<div class="modal-overlay show" id="editAllocOverlay"><div class="modal" style="max-width:420px;"><div class="modal-header"><h3 class="modal-title">🎯 Edit Target Allocation</h3><button class="modal-close" onclick="closeWealthModal('editAllocOverlay')">×</button></div><div class="modal-body"><div class="text-muted" style="font-size:12px;margin-bottom:16px;">Total should add up to 100%</div><div id="allocFields">${fields}</div><div id="allocTotal" style="font-size:13px;margin:8px 0;"></div><div class="grid-2"><button class="btn-submit" onclick="saveAllocationTargets()">💾 Save</button><button class="btn-secondary" onclick="closeWealthModal('editAllocOverlay')">Cancel</button></div></div></div></div>`;
  document.getElementById('wealthModals').innerHTML = html;
  document.querySelectorAll('#allocFields input').forEach(input => { input.oninput = () => { const total = [...document.querySelectorAll('#allocFields input')].reduce((s,i)=>s+(parseFloat(i.value)||0),0); const el = document.getElementById('allocTotal'); el.textContent = `Total: ${total}%`; el.style.color = Math.abs(total-100) < 0.1 ? 'var(--emerald)' : 'var(--rose)'; }; input.oninput(); });
}

async function saveAllocationTargets() {
  const inputs = document.querySelectorAll('#allocFields input');
  const total = [...inputs].reduce((s,i)=>s+(parseFloat(i.value)||0),0);
  if (Math.abs(total - 100) > 0.1) { showToast('Total must be 100%', 'error'); return; }
  const newTargets = [...inputs].map(input => ({ id: 'alloc_' + input.dataset.cat.replace(/\s/g,'').toLowerCase(), category: input.dataset.cat, target: parseFloat(input.value)||0 }));
  for (const t of newTargets) await put('allocation_targets', t);
  state.allocation_targets = newTargets;
  closeWealthModal('editAllocOverlay');
  showToast('✅ Allocation targets saved!', 'success');
  switchWealthTab('allocation');
}

function openAddSIPModal() {
  const html = `<div class="modal-overlay show" id="addSIPOverlay"><div class="modal" style="max-width:420px;"><div class="modal-header"><h3 class="modal-title">📅 Add SIP Instrument</h3><button class="modal-close" onclick="closeWealthModal('addSIPOverlay')">×</button></div><div class="modal-body"><form id="sipForm"><div><label class="form-label">Instrument Name*</label><input id="sip_name" class="form-input" required /></div><div class="grid-2"><div><label class="form-label">Category*</label><select id="sip_category" class="form-input">${Object.keys(ASSET_CATEGORIES).map(c=>`<option>${c}</option>`).join('')}</select></div><div><label class="form-label">Monthly Amount (₹)*</label><input id="sip_amount" type="number" step="0.01" class="form-input" required /></div></div><div><label class="form-label">Percentage of Budget (%)</label><input id="sip_pct" type="number" step="0.1" class="form-input" /></div><div class="grid-2"><button type="submit" class="btn-submit">➕ Add</button><button type="button" class="btn-secondary" onclick="closeWealthModal('addSIPOverlay')">Cancel</button></div></form></div></div></div>`;
  document.getElementById('wealthModals').innerHTML = html;
  document.getElementById('sipForm').onsubmit = async (e) => {
    e.preventDefault();
    const item = { name: document.getElementById('sip_name').value.trim(), category: document.getElementById('sip_category').value, monthlyAmount: parseFloat(document.getElementById('sip_amount').value)||0, percentage: parseFloat(document.getElementById('sip_pct').value)||0 };
    const id = await put('sip_plan', item); item.id = id; state.sip_plan = [...(state.sip_plan||[]), item];
    closeWealthModal('addSIPOverlay'); showToast('✅ SIP instrument added!', 'success'); switchWealthTab('allocation');
  };
}

async function deleteSIPItem(id) {
  if (!confirm('Remove this SIP instrument?')) return;
  await del('sip_plan', Number(id));
  state.sip_plan = state.sip_plan.filter(i => String(i.id) !== String(id));
  switchWealthTab('allocation');
}

function closeWealthModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('show'); setTimeout(()=>el.remove(),300); }
  document.getElementById('wealthModals').innerHTML = '';
}

async function exportWealthJSON() {
  const data = { investments: state.investments, emi_loans: state.emi_loans, net_worth_snapshots: state.net_worth_snapshots, allocation_targets: state.allocation_targets, sip_plan: state.sip_plan, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `wealth-export-${nowISO()}.json`; a.click(); URL.revokeObjectURL(url);
  showToast('Wealth data exported!', 'success');
}

// ─── DASHBOARD WEALTH OVERVIEW WIDGET ────────────────────────
function renderWealthDashboard() {
  const el = document.getElementById('dashWealthWidget');
  if (!el) return;
  const assets = state.investments || [], liabs = state.emi_loans || [];
  const totalAssetVal = assets.reduce((s,a) => s + getAssetCurrentValue(a), 0);
  const totalInvested = assets.reduce((s,a) => s + getAssetInvestedAmount(a), 0);
  const totalLiab = liabs.reduce((s,l) => s + toNum(l.outstanding), 0);
  const nw = totalAssetVal - totalLiab;
  const totalPnL = totalAssetVal - totalInvested;
  const pnlPct = totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(1) : 0;
  const catTotals = {};
  assets.forEach(a => { const cat = getAssetCategory(a); catTotals[cat] = (catTotals[cat] || 0) + getAssetCurrentValue(a); });
  const catEntries = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const topHoldings = [...assets].sort((a,b) => getAssetCurrentValue(b) - getAssetCurrentValue(a)).slice(0, 3);
  if (assets.length === 0 && liabs.length === 0) {
    el.innerHTML = `<div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--violet)"></span>Wealth Overview</div><button class="section-action" onclick="showPage('wealth')">View All →</button></div><div class="tx-card" style="text-align:center;padding:24px;"><div style="font-size:24px;">🏦</div><div>No assets tracked yet</div><button class="btn-submit" style="width:auto;margin-top:12px;" onclick="showPage('wealth')">Start Tracking</button></div>`;
    return;
  }
  el.innerHTML = `<div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--violet)"></span>Wealth Overview</div><button class="section-action" onclick="showPage('wealth')">View All →</button></div>
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px;">
      <div class="kpi-card blue" onclick="showPage('wealth')"><div class="kpi-label">NET WORTH</div><div class="kpi-value" style="color:${nw>=0?'var(--teal)':'var(--rose)'};">${fmtINR(nw)}</div><div class="kpi-change">Assets − Liabilities</div></div>
      <div class="kpi-card green" onclick="showPage('wealth')"><div class="kpi-label">INVESTED</div><div class="kpi-value">${fmtINR(totalInvested)}</div><div class="kpi-change" style="color:${totalPnL>=0?'var(--emerald)':'var(--rose)'};">P&L: ${totalPnL>=0?'+':''}${fmtINR(totalPnL)} (${pnlPct}%)</div></div>
      <div class="kpi-card ${totalLiab===0?'green':'red'}" onclick="showPage('wealth')"><div class="kpi-label">LIABILITIES</div><div class="kpi-value" style="color:${totalLiab>0?'var(--rose)':'var(--emerald)'};">${fmtINR(totalLiab)}</div><div class="kpi-change">${liabs.length} active loan${liabs.length!==1?'s':''}</div></div>
    </div>
    <div class="two-col">
      <div class="tx-card"><div class="section-heading" style="margin-bottom:10px;"><div class="section-title" style="font-size:12px;"><span class="dot" style="background:var(--teal)"></span>Top Holdings</div><button class="section-action" onclick="showPage('wealth')">View all →</button></div>${topHoldings.length===0?'<div style="text-align:center;padding:20px;">No holdings yet</div>':topHoldings.map(a=>{const cat=getAssetCategory(a), curVal=getAssetCurrentValue(a), pnl=curVal-getAssetInvestedAmount(a); return `<div class="list-item" style="padding:10px 0;"><div style="font-size:18px;">${(ASSET_CATEGORIES[cat]||{icon:'💼'}).icon}</div><div class="list-item-info"><div class="list-item-name">${a.name||a.stockName||'Asset'}</div><div class="list-item-sub">${a.subType||cat}</div></div><div style="text-align:right;"><div class="list-item-amount" style="color:var(--teal);">${fmtINR(curVal)}</div>${pnl!==0?`<div style="font-size:11px;color:${pnl>=0?'var(--emerald)':'var(--rose)'};">${pnl>=0?'+':''}${fmtINR(pnl)}</div>`:''}</div></div>`;}).join('')}</div>
      <div class="tx-card"><div class="section-heading" style="margin-bottom:10px;"><div class="section-title" style="font-size:12px;"><span class="dot" style="background:var(--gold)"></span>Asset Allocation</div><button class="section-action" onclick="showPage('wealth');setTimeout(()=>switchWealthTab('allocation'),200)">Rebalance →</button></div>${catEntries.length>0?`<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;"><div style="width:100px;height:100px;"><canvas id="dashAllocChart"></canvas></div><div style="flex:1;">${catEntries.map(([cat,val])=>{const pct=totalAssetVal>0?((val/totalAssetVal)*100).toFixed(0):0; return `<div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;"><div><span style="width:8px;height:8px;border-radius:50%;background:${(ASSET_CATEGORIES[cat]||{color:'#888'}).color};display:inline-block;margin-right:6px;"></span>${cat}</div><span>${pct}%</span></div>`;}).join('')}</div></div>`:'<div style="text-align:center;padding:20px;">No assets</div>'}</div>
    </div>`;
  if (catEntries.length > 0) {
    setTimeout(() => {
      const ctx = document.getElementById('dashAllocChart');
      if (ctx) new Chart(ctx, { type: 'doughnut', data: { labels: catEntries.map(e=>e[0]), datasets: [{ data: catEntries.map(e=>e[1]), backgroundColor: catEntries.map(([cat])=>(ASSET_CATEGORIES[cat]||{color:'#888'}).color), borderWidth: 2, borderColor: 'transparent' }] }, options: { responsive: true, maintainAspectRatio: true, cutout: '60%', plugins: { legend: { display: false }, tooltip: { enabled: false } } } });
    }, 80);
  }
}
// ─── LINK TO ESSENTIALS GOALS ─────────────────────────────────
function switchToEssentialsGoal(goalId) {
  showPage('essentials');
  setTimeout(() => {
    switchEssentialsTab('goals');
    if (goalId && typeof openUpdateGoalModal === 'function') {
      openUpdateGoalModal(goalId);
    }
  }, 100);
}

function switchToEssentialsGoals() {
  showPage('essentials');
  setTimeout(() => {
    switchEssentialsTab('goals');
    // Open the new goal form
    const toggleBtn = document.querySelector('#essentials-tab-content .section-action');
    if (toggleBtn && toggleBtn.textContent.includes('New Goal')) {
      toggleBtn.click();
    }
  }, 100);
}
// Helper: ensure `toNum` exists (fallback)
window.toNum = window.toNum || function(v) { const n = parseFloat(v); return isNaN(n) ? 0 : n; };