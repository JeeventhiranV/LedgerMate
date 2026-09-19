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

function isAssetClosedOrMatured(inv) {
  if (!inv) return false;
  const status = String(inv.status || '').toLowerCase().trim();
  if (['closed', 'matured', 'liquidated', 'redeemed', 'completed', 'inactive', 'sold', 'exited'].includes(status)) {
    return true;
  }
  if (inv.isClosed === true || inv.closed === true || inv.isMatured === true || inv.matured === true) {
    return true;
  }
  let matDate = inv.maturityDate;
  if (!matDate && inv.startDate && inv.tenureMonths) {
    const start = new Date(inv.startDate);
    if (!isNaN(start.getTime())) {
      start.setMonth(start.getMonth() + toNum(inv.tenureMonths));
      matDate = start.toISOString().split('T')[0];
    }
  }
  if (matDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mat = new Date(matDate);
    if (!isNaN(mat.getTime()) && mat < today) {
      return true;
    }
  }
  return false;
}

// ─── Financial Calculation Engine ─────────────────────────────────
function _getCompoundingFrequency(freq) {
  switch ((freq || '').toLowerCase()) {
    case 'monthly': return 12;
    case 'quarterly': return 4;
    case 'half-yearly': return 2;
    case 'yearly': return 1;
    default: return 4; // default Indian bank FD = quarterly compounding
  }
}

function calculateAssetMaturityValue(inv) {
  if (!inv) return 0;
  if (window.LM_InvestmentsUI && typeof window.LM_InvestmentsUI.calculateMaturity === 'function') {
    const m = window.LM_InvestmentsUI.calculateMaturity(inv);
    if (m > 0) return m;
  }
  const t = (inv.type || '').toUpperCase();
  const P = toNum(inv.principal || inv.amount);
  const r = toNum(inv.rate || inv.sipReturn || inv.interestRate || 0) / 100;
  const months = Math.max(0, toNum(inv.tenureMonths));
  const tenureYears = months / 12;
  const add = toNum(inv.additionalDeposit || inv.sipMonthly);

  if (t === 'FD') {
    const n = _getCompoundingFrequency(inv.compounding || 'quarterly');
    const effYears = tenureYears > 0 ? tenureYears : 1;
    const effRate = r > 0 ? r : 0.07;
    const matFD = P * Math.pow(1 + effRate / n, n * effYears);
    return Number(matFD.toFixed(2));
  }

  if (t === 'RD') {
    const nRD = 12;
    const deposit = add > 0 ? add : P;
    if (deposit <= 0) return 0;
    const effMonths = months > 0 ? months : 12;
    const effRate = (r > 0 ? r : 0.07) / nRD;
    const matRD = deposit * ((Math.pow(1 + effRate, effMonths) - 1) / effRate) * (1 + effRate);
    return Number(matRD.toFixed(2));
  }

  if (t === 'SIP') {
    const qty = toNum(inv.qty || inv.stockQty);
    const curPrice = toNum(inv.currentPrice || inv.ltp || inv.stockCurrentPrice);
    const buyPrice = toNum(inv.buyPrice || inv.avgCost || inv.stockBuyPrice);
    if (qty > 0 && (curPrice > 0 || buyPrice > 0)) {
      return Number((qty * (curPrice > 0 ? curPrice : buyPrice)).toFixed(2));
    }
    const sip = toNum(inv.sipMonthly || add || P);
    const expRet = r > 0 ? r : 0.12;
    const i = expRet / 12;
    const effMonths = months > 0 ? months : 12;
    if (sip <= 0) return P > 0 ? P : 0;
    const fv = sip * ((Math.pow(1 + i, effMonths) - 1) / i) * (1 + i);
    const lump = P > 0 && add > 0 ? P * Math.pow(1 + expRet, effMonths / 12) : 0;
    return Number((fv + lump).toFixed(2));
  }

  if (['GOLD','SILVER','PHYSICAL','COMMODITY','SGB'].includes(t)) {
    const grams = toNum(inv.goldGrams || inv.qty || 1);
    const buyPrice = toNum(inv.stockBuyPrice || inv.buyPrice || inv.avgCost || inv.principal || 6500);
    const curPrice = toNum(inv.stockCurrentPrice || inv.currentPrice || inv.ltp || buyPrice);
    let goldVal = grams * (curPrice > 0 ? curPrice : buyPrice);
    if (t === 'SGB' && tenureYears > 0) {
      goldVal += (grams * buyPrice * 0.025 * tenureYears);
    }
    return Number(goldVal.toFixed(2));
  }

  if (['PPF','EPF','NPS'].includes(t)) {
    const annual = toNum(inv.additionalDeposit || inv.principal);
    const ratePPF = r > 0 ? r : 0.071;
    const effYears = tenureYears > 0 ? Math.ceil(tenureYears) : 1;
    let fvPPF = P;
    for (let y = 1; y <= effYears; y++) {
      fvPPF = (fvPPF + annual) * (1 + ratePPF);
    }
    return Number(fvPPF.toFixed(2));
  }

  if (['STOCK','MUTUAL_FUND'].includes(t)) {
    const qty = toNum(inv.stockQty || inv.qty);
    const cur = toNum(inv.stockCurrentPrice || inv.currentPrice || inv.ltp);
    const buy = toNum(inv.stockBuyPrice || inv.buyPrice || inv.avgCost);
    if (qty > 0) {
      return Number((qty * (cur > 0 ? cur : buy)).toFixed(2));
    }
    if (cur > 0 && buy > 0 && P > 0) {
      return Number((P * (cur / buy)).toFixed(2));
    }
    return toNum(inv.currentValue || P);
  }

  if (inv.currentValue) return toNum(inv.currentValue);
  const defVal = P * (1 + (r > 0 ? r : 0.06) * (tenureYears > 0 ? tenureYears : 1));
  return Number(defVal.toFixed(2));
}

// ─── Current value (Excludes closed/matured FDs & properly evaluates returns) ─────
function getAssetCurrentValue(inv) {
  if (!inv || isAssetClosedOrMatured(inv)) return 0;
  const t = (inv.type || '').toUpperCase();
  const qty = toNum(inv.qty || inv.stockQty || 0);
  const curPrice = toNum(inv.currentPrice || inv.ltp || inv.stockCurrentPrice || 0);
  const buyPrice = toNum(inv.buyPrice || inv.avgCost || inv.stockBuyPrice || 0);

  // Qty-based price tracking (Stocks, Gold, Silver, Commodity, MF if units given)
  if (qty > 0 && (curPrice > 0 || buyPrice > 0)) {
    return Number((qty * (curPrice > 0 ? curPrice : buyPrice)).toFixed(2));
  }

  if (['REAL_ESTATE','PROPERTY'].includes(t)) {
    return toNum(inv.currentValue || inv.buyPrice || inv.principal || 0);
  }

  if (inv.currentValue && toNum(inv.currentValue) > 0) {
    return toNum(inv.currentValue);
  }

  // Compound / Maturity / Future valuation for FD, RD, SIP, PPF, EPF, SGB, Bond
  const mat = calculateAssetMaturityValue(inv);
  if (mat > 0) return mat;

  return toNum(inv.principal || inv.amount || 0);
}

// ─── Invested amount (Excludes closed/matured FDs) ─────────────────
function getAssetInvestedAmount(inv) {
  if (!inv || isAssetClosedOrMatured(inv)) return 0;
  if (window.LM_InvestmentsUI && typeof window.LM_InvestmentsUI.calculateInvestedSoFar === 'function') {
    const invAmt = window.LM_InvestmentsUI.calculateInvestedSoFar(inv);
    if (invAmt > 0) return invAmt;
  }
  const t = (inv.type || '').toUpperCase();
  const qty = toNum(inv.qty || inv.stockQty || 0);
  const buyPrice = toNum(inv.buyPrice || inv.avgCost || inv.stockBuyPrice || 0);
  const P = toNum(inv.principal || inv.amount || 0);
  const add = toNum(inv.additionalDeposit || inv.sipMonthly || 0);
  const months = toNum(inv.tenureMonths || 0);

  if (qty > 0 && buyPrice > 0) {
    return Number((qty * buyPrice).toFixed(2));
  }
  if (t === 'FD') return P;
  if (t === 'RD') return (add > 0 ? add : P) * (months > 0 ? months : 1);
  if (t === 'SIP') {
    const sip = toNum(inv.sipMonthly || add || P);
    return (sip * (months > 0 ? months : 1)) + (add > 0 && P > 0 ? P : 0);
  }
  if (['PPF', 'EPF', 'NPS'].includes(t)) {
    return P + (add * ((months > 0 ? months : 12) / 12));
  }
  if (['GOLD','SILVER','PHYSICAL','COMMODITY','SGB'].includes(t)) {
    const grams = toNum(inv.goldGrams || inv.qty || 1);
    return Number((grams * (buyPrice > 0 ? buyPrice : (P > 0 ? P : 6500))).toFixed(2));
  }
  if (['REAL_ESTATE','PROPERTY'].includes(t)) {
    return toNum(inv.buyPrice || inv.principal || inv.amount || 0);
  }
  return P > 0 ? P : toNum(inv.buyPrice || 0);
}

function getAssetCategoryFromType(type) {
  for (const [cat, info] of Object.entries(ASSET_CATEGORIES)) if (info.types.includes(type)) return cat;
  if (['GOLD','SILVER','PHYSICAL','COMMODITY','SGB'].includes(type)) return 'Commodities';
  if (['FD','RD','BOND','BONDS','EPF'].includes(type))                 return 'Debt';
  if (['STOCK','SIP','MUTUAL_FUND'].includes(type))            return 'Equity';
  if (['REAL_ESTATE','PROPERTY'].includes(type))               return 'Real Estate';
  return 'Cash & Savings';
}

// ─── Loan Financial & Interest Calculation Engine ────────────────
function getLoanFinancialDetails(loan, asOfDate = new Date()) {
  if (!loan) {
    return {
      principal: 0,
      interestRate: 0,
      totalRepaid: 0,
      principalPaid: 0,
      interestPaid: 0,
      remainingPrincipal: 0,
      accruedInterest: 0,
      unpaidInterest: 0,
      totalBalance: 0,
      isSettled: false,
      isOverdue: false,
      daysElapsed: 0,
      repaymentsCount: 0
    };
  }

  const principal = toNum(loan.amount || loan.principal || 0);
  const rate = toNum(loan.interestRate || loan.rate || 0);
  const repayments = Array.isArray(loan.repayments) ? loan.repayments : [];

  let totalRepaid = repayments.reduce((s, r) => s + toNum(r.amount || 0), 0);
  if (repayments.length === 0 && (loan.collected === true || toNum(loan.collectedAmount) > 0)) {
    totalRepaid = toNum(loan.collectedAmount || (loan.collected ? principal : 0));
  }

  // Determine start date
  let start = new Date(loan.startDate || loan.createdAt || loan.date || Date.now());
  if (isNaN(start.getTime())) start = new Date();
  start.setHours(0, 0, 0, 0);

  const today = new Date(asOfDate);
  today.setHours(0, 0, 0, 0);

  const diffMs = Math.max(0, today - start);
  const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Accrued interest on principal / reducing balance
  let accruedInterest = 0;
  if (rate > 0 && principal > 0) {
    if (repayments.length === 0) {
      accruedInterest = Number((principal * (rate / 100) * (daysElapsed / 365)).toFixed(2));
    } else {
      // Piecewise interest calculation across repayment events
      let currentPrincipal = principal;
      let lastDate = new Date(start);
      let totalCalculatedInterest = 0;

      const sortedRepayments = [...repayments].sort((a, b) => new Date(a.date) - new Date(b.date));
      for (const rep of sortedRepayments) {
        const repDate = new Date(rep.date || lastDate);
        repDate.setHours(0, 0, 0, 0);
        const segmentDays = Math.max(0, Math.floor((repDate - lastDate) / (1000 * 60 * 60 * 24)));
        totalCalculatedInterest += currentPrincipal * (rate / 100) * (segmentDays / 365);
        currentPrincipal = Math.max(0, currentPrincipal - toNum(rep.principalPaid !== undefined ? rep.principalPaid : rep.amount));
        lastDate = repDate;
      }

      // Remaining segment until today
      const finalDays = Math.max(0, Math.floor((today - lastDate) / (1000 * 60 * 60 * 24)));
      totalCalculatedInterest += currentPrincipal * (rate / 100) * (finalDays / 365);
      accruedInterest = Number(totalCalculatedInterest.toFixed(2));
    }
  }

  let interestPaid = repayments.reduce((s, r) => s + toNum(r.interestPaid || 0), 0);
  let principalPaid = repayments.reduce((s, r) => s + toNum(r.principalPaid !== undefined ? r.principalPaid : r.amount), 0);
  if (repayments.length === 0 && loan.collected) {
    principalPaid = principal;
  }

  const remainingPrincipal = Math.max(0, principal - principalPaid);
  const unpaidInterest = Math.max(0, accruedInterest - interestPaid);
  let totalBalance = remainingPrincipal + unpaidInterest;

  // If marked collected explicitly or balance is <= 0.50
  const isSettled = loan.collected === true || (principal > 0 && totalRepaid >= (principal + accruedInterest) - 0.5);
  if (isSettled) {
    totalBalance = 0;
  }

  let isOverdue = false;
  if (!isSettled && loan.dueDate) {
    const due = new Date(loan.dueDate);
    due.setHours(0, 0, 0, 0);
    if (!isNaN(due.getTime()) && due < today) {
      isOverdue = true;
    }
  }

  return {
    principal,
    interestRate: rate,
    totalRepaid,
    principalPaid,
    interestPaid,
    remainingPrincipal,
    accruedInterest,
    unpaidInterest,
    totalBalance,
    isSettled,
    isOverdue,
    daysElapsed,
    repaymentsCount: repayments.length
  };
}

// ─── Totals (Upgraded with personal loans, interest & stock portfolio) ──────────
function getTotalAssets() {
  const investments = (state.investments || []).reduce((s, a) => s + getAssetCurrentValue(a), 0);
  // Money OWED TO you (given loans not yet collected, including accrued interest)
  const givenOutstanding = (state.loans || [])
    .filter(l => l.type === 'given')
    .reduce((s, l) => s + getLoanFinancialDetails(l).totalBalance, 0);

  let stockVal = 0;
  if (window.LM_StockPortfolioService && typeof window.LM_StockPortfolioService.getPortfolioSummary === 'function') {
    try {
      const summary = window.LM_StockPortfolioService.getPortfolioSummary();
      stockVal = toNum(summary?.totalCurrentValue || 0);
    } catch(e) {}
  }

  return investments + givenOutstanding + stockVal;
}

function getTotalLiabilities() {
  const emiLiabilities = (state.emi_loans || []).reduce((s, l) => s + toNum(l.outstanding || 0), 0);
  // Money YOU OWE (taken loans not yet collected, including accrued interest)
  const takenOutstanding = (state.loans || [])
    .filter(l => l.type === 'taken')
    .reduce((s, l) => s + getLoanFinancialDetails(l).totalBalance, 0);

  let ccOutstanding = 0;
  if (window.LM_CreditCardsService && typeof window.LM_CreditCardsService.getTotalOutstandingDue === 'function') {
    try {
      ccOutstanding = toNum(window.LM_CreditCardsService.getTotalOutstandingDue() || 0);
    } catch(e) {}
  } else if (Array.isArray(state.credit_cards)) {
    ccOutstanding = state.credit_cards.reduce((s, c) => s + toNum(c.current_due || 0), 0);
  }

  return emiLiabilities + takenOutstanding + ccOutstanding;
}

function getNetWorth() {
  return getTotalAssets() - getTotalLiabilities();
}

// ─── Animated counter: smoothly counts from 0 to target ──
function wealthAnimateValue(el, target, dur = 700) {
  if (!el) return;
  const sign = target < 0 ? -1 : 1;
  const abs  = Math.abs(target);
  const fmt  = v => (v < 0 ? '-' : '') + '₹' + Math.round(Math.abs(v)).toLocaleString('en-IN');
  const start = performance.now();
  (function step(now) {
    const t    = Math.min((now - start) / dur, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(sign * abs * ease);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = fmt(target);
  })(start);
}
/* ─────────────────────────────────────────────────────────────
   LOAN ANALYTICS HELPERS (reads state.loans from Common.js)
───────────────────────────────────────────────────────────── */
function buildLoanGroups() {
  const groups = {};
  (state.loans || []).forEach(l => {
    const key = `${l.person}__${l.type}`;
    if (!groups[key]) groups[key] = { person: l.person, type: l.type, loans: [], pendingAmt: 0, collectedAmt: 0, totalInterest: 0 };
    groups[key].loans.push(l);
    const fin = getLoanFinancialDetails(l);
    groups[key].collectedAmt += fin.totalRepaid;
    groups[key].pendingAmt   += fin.totalBalance;
    groups[key].totalInterest += fin.accruedInterest;
  });
  return Object.values(groups);
}

function getLoanSummary() {
  const loans = state.loans || [];
  let givenOut = 0;
  let takenOut = 0;
  let totalGiven = 0;
  let totalTaken = 0;
  let collectedGiven = 0;
  let collectedTaken = 0;
  let totalInterestGiven = 0;
  let totalInterestTaken = 0;
  const overdue = [];

  loans.forEach(l => {
    const fin = getLoanFinancialDetails(l);
    if (l.type === 'given') {
      totalGiven += fin.principal;
      collectedGiven += fin.totalRepaid;
      totalInterestGiven += fin.accruedInterest;
      if (!fin.isSettled) {
        givenOut += fin.totalBalance;
        if (fin.isOverdue) overdue.push(l);
      }
    } else {
      totalTaken += fin.principal;
      collectedTaken += fin.totalRepaid;
      totalInterestTaken += fin.accruedInterest;
      if (!fin.isSettled) {
        takenOut += fin.totalBalance;
        if (fin.isOverdue) overdue.push(l);
      }
    }
  });

  return {
    givenOut,
    takenOut,
    netBalance: givenOut - takenOut,
    totalGiven,
    totalTaken,
    collectedGiven,
    collectedTaken,
    totalInterestGiven,
    totalInterestTaken,
    overdue,
    totalLoans: loans.length
  };
}

/* ─────────────────────────────────────────────────────────────
   WEALTH PAGE
───────────────────────────────────────────────────────────── */
function showWealthPage() {
  const page = document.getElementById('page-wealth');
  if (!page) return;
  const currentTab = page.dataset.activeTab || 'assets';

  const nw        = getNetWorth();
  const assets    = getTotalAssets();
  const liabs     = getTotalLiabilities();
  const invested  = (state.investments||[]).reduce((s,a)=>s+getAssetInvestedAmount(a),0);
  const curVal    = (state.investments||[]).reduce((s,a)=>s+getAssetCurrentValue(a),0);
  const pnl       = curVal - invested;
  const pnlColor  = pnl >= 0 ? 'var(--emerald)' : 'var(--rose)';
  const nwColor   = nw  >= 0 ? 'var(--teal)'    : 'var(--rose)';

  page.innerHTML = `
    <div class="page-header fade-up fade-up-1">
      <div class="page-header-left">
        <div class="page-greeting">Track your portfolio</div>
        <h1 class="page-title">Wealth <em>Manager</em></h1>
      </div>
      <div class="page-header-right">
        <div class="overview-quick-tools">
          <button class="overview-tool-btn privacy-toggle-btn" title="Toggle Balance Privacy (Stealth Mode)" onclick="window.LM_togglePrivacyMode()" aria-label="Privacy Mode">
            ${document.body.classList.contains('privacy-mode') ? '🙈' : '👁️'} <span class="overview-tool-label">Privacy</span>
          </button>
        </div>
        <button class="btn-submit" style="width:auto;padding:9px 18px;margin:0;font-size:13px;"
                onclick="openAddAssetModal()">+ Add Asset</button>
        <button class="btn-secondary" style="padding:9px 14px;font-size:13px;"
                onclick="exportWealthJSON()">📤 Export</button>
      </div>
    </div>

    <!-- Live KPI strip -->
    <div class="wealth-kpi-strip fade-up fade-up-2">
      <div class="wkpi stagger-1 ${nw<0?'live-glow-red':''}" onclick="switchWealthTab('networth')" style="cursor:pointer;">
        <div class="wkpi-label">Net Worth</div>
        <div class="wkpi-val ${nw<0?'live-glow-text-red':''}" id="wkpi-nw" style="color:${nwColor};">${fmtINR(nw)}</div>
        <div class="wkpi-sub">Assets − Liabilities</div>
      </div>
      <div class="wkpi stagger-2 live-glow-green" onclick="switchWealthTab('assets')" style="cursor:pointer;">
        <div class="wkpi-label">Total Assets</div>
        <div class="wkpi-val live-glow-text-green" style="color:var(--teal);" id="wkpi-assets">${fmtINR(assets)}</div>
        <div class="wkpi-sub">${(state.investments||[]).length} holdings</div>
      </div>
      <div class="wkpi stagger-3 ${liabs>0?'live-glow-red':''}" onclick="switchWealthTab('liabilities')" style="cursor:pointer;">
        <div class="wkpi-label">Liabilities</div>
        <div class="wkpi-val ${liabs>0?'live-glow-text-red':''}" style="color:${liabs>0?'var(--rose)':'var(--text-3)'};" id="wkpi-liabs">${fmtINR(liabs)}</div>
        <div class="wkpi-sub">${(state.emi_loans||[]).length} active loans</div>
      </div>
      <div class="wkpi stagger-4 ${pnl>=0?'live-glow-green':'live-glow-red'}" onclick="switchWealthTab('allocation')" style="cursor:pointer;">
        <div class="wkpi-label">P&amp;L (PROFIT &amp; LOSS)</div>
        <div class="wkpi-val ${pnl>=0?'live-glow-text-green':'live-glow-text-red'}" style="color:${pnlColor};" id="wkpi-pnl">${pnl>=0?'+':''}${fmtINR(pnl)}</div>
        <div class="wkpi-sub">${invested > 0 ? `${pnl>=0?'+':''}${((pnl/invested)*100).toFixed(1)}% return` : 'Unrealised'}</div>
      </div>
    </div>

    <div class="wealth-tabs fade-up fade-up-3">
      <button class="wealth-tab" onclick="switchWealthTab('assets')">Assets</button>
      <button class="wealth-tab" onclick="switchWealthTab('liabilities')">Liabilities</button>
      <button class="wealth-tab" onclick="switchWealthTab('loans')">Loans</button>
      <button class="wealth-tab" onclick="switchWealthTab('networth')">Net Worth</button>
      <button class="wealth-tab" onclick="switchWealthTab('allocation')">Allocation</button>
    </div>

    <div id="wealth-tab-content" class="fade-up fade-up-4"></div>
    <div id="wealthModals"></div>`;

  // Animate the KPI strip counters
  setTimeout(() => {
    wealthAnimateValue(document.getElementById('wkpi-nw'),     nw,     600);
    wealthAnimateValue(document.getElementById('wkpi-assets'), assets, 700);
    wealthAnimateValue(document.getElementById('wkpi-liabs'),  liabs,  800);
    wealthAnimateValue(document.getElementById('wkpi-pnl'),    pnl,    750);
  }, 80);

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

  // Slide-in animation on every tab switch
  content.classList.remove('tab-slide-in');
  void content.offsetWidth;
  content.classList.add('tab-slide-in');

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
  const rawAssets    = state.investments || [];
  const assets       = [...rawAssets].sort((a, b) => {
    const aClosed = isAssetClosedOrMatured(a);
    const bClosed = isAssetClosedOrMatured(b);
    if (!aClosed && bClosed) return -1;
    if (aClosed && !bClosed) return 1;

    // Within active: highest value first
    const valA = getAssetCurrentValue(a);
    const valB = getAssetCurrentValue(b);
    if (valA !== valB) return valB - valA;
    return new Date(b.date || b.startDate || b.purchaseDate || 0) - new Date(a.date || a.startDate || a.purchaseDate || 0);
  });

  const totalInvested = rawAssets.reduce((s,a)=>s+getAssetInvestedAmount(a),0);
  const totalCurrent  = rawAssets.reduce((s,a)=>s+getAssetCurrentValue(a),0);
  const totalPnL      = totalCurrent - totalInvested;
  const pnlPct        = totalInvested > 0 ? ((totalPnL/totalInvested)*100).toFixed(1) : 0;
  const pnlColor      = totalPnL >= 0 ? 'var(--emerald)' : 'var(--rose)';
  const xirrRate      = typeof getPortfolioXIRR === 'function' ? getPortfolioXIRR() : null;
  const xirrDisplay   = xirrRate !== null && isFinite(xirrRate) ? (xirrRate * 100).toFixed(1) + '%' : '—';

  const givenOutstanding = (state.loans || []).filter(l => l.type === 'given' && !l.collected).reduce((s,l)=>s+toNum(l.amount),0);
  const takenOutstanding = (state.loans || []).filter(l => l.type === 'taken' && !l.collected).reduce((s,l)=>s+toNum(l.amount),0);
  const emiLiabilities = (state.emi_loans || []).reduce((s,l)=>s+toNum(l.outstanding||0),0);

  let stockSummary = null;
  if (window.LM_StockPortfolioService && typeof window.LM_StockPortfolioService.getPortfolioSummary === 'function') {
    try { stockSummary = window.LM_StockPortfolioService.getPortfolioSummary(); } catch(e){}
  }
  const stockVal = Number(stockSummary?.totalCurrentValue || 0);
  const stockCount = Number(stockSummary?.holdingsCount || 0);
  const stockPnL = Number(stockSummary?.totalPnL || 0);
  const stockPnLPct = Number(stockSummary?.totalPnLPercentage || 0);

  const summaryBar = `
    <div class="chart-card" style="margin-bottom:16px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:12px;margin-top:16px;padding-top:16px;border-top:1px solid var(--border);">
        <div>
          <div class="kpi-label">INVESTMENTS</div>
          <div style="font-family:var(--font-m);font-size:14px;font-weight:600;color:var(--emerald);">
            ${fmtINR(totalCurrent)}
          </div>
          <div style="font-size:11px;color:${pnlColor};font-weight:600;margin-top:2px;">
            ${totalPnL>=0?'+':''}${fmtINR(totalPnL)} (${totalPnL>=0?'+':''}${pnlPct}%)
          </div>
        </div>
        <div>
          <div class="kpi-label">INDIAN STOCKS</div>
          <div style="font-family:var(--font-m);font-size:14px;font-weight:600;color:${stockVal>0?'var(--teal)':'var(--text-3)'};">
            ${fmtINR(stockVal)} <span style="font-size:10px;font-weight:normal;opacity:0.8;">(${stockCount})</span>
          </div>
          ${stockCount > 0 ? `<div style="font-size:11px;color:${stockPnL>=0?'var(--emerald)':'var(--rose)'};font-weight:600;margin-top:2px;">${stockPnL>=0?'+':''}${fmtINR(stockPnL)} (${stockPnL>=0?'+':''}${stockPnLPct}%)</div>` : ''}
        </div>
        <div>
          <div class="kpi-label">GIVEN LOANS</div>
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
        <div>
          <div class="kpi-label">XIRR (RETURN)</div>
          <div style="font-family:var(--font-m);font-size:14px;font-weight:600;color:var(--violet);" title="Internal Rate of Return — time-weighted">
            ${xirrDisplay} p.a.
          </div>
        </div>
      </div>
    </div>`;

  const stockSpotlight = `
    <div class="chart-card" style="margin-bottom:16px;background:linear-gradient(135deg, rgba(6,182,212,0.08), rgba(99,102,241,0.06));border:1px solid rgba(6,182,212,0.25);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:14px 18px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:24px;">📈</span>
        <div>
          <div style="font-weight:700;font-size:14px;color:var(--text-1);">Indian Stock Portfolio</div>
          <div style="font-size:12px;color:var(--text-3);">
            ${stockCount > 0 ? `${stockCount} Holdings · Value: <b style="color:var(--teal);">${fmtINR(stockVal)}</b> · P&L: <b style="color:${stockPnL>=0?'var(--emerald)':'var(--rose)'};">${stockPnL>=0?'+':''}${fmtINR(stockPnL)} (${stockPnL>=0?'+':''}${stockPnLPct}%)</b>` : 'Real-time live NSE/BSE stock tracking and analytics'}
          </div>
        </div>
      </div>
      <button class="btn-submit" style="width:auto;padding:8px 16px;font-size:12px;margin:0;" onclick="showPage('stocks')">
        ${stockCount > 0 ? 'Manage Stocks →' : '+ Open Stock Tracker'}
      </button>
    </div>`;

  if (assets.length === 0 && stockCount === 0) {
    container.innerHTML = summaryBar + stockSpotlight + `
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
    const isClosed = isAssetClosedOrMatured(a);
    const cat      = getAssetCategory(a);
    const catInfo  = ASSET_CATEGORIES[cat] || { icon: '💼', color: 'var(--teal)' };
    const invested = getAssetInvestedAmount(a);
    const curVal   = getAssetCurrentValue(a);
    const historicalInvested = toNum(a.buyPrice || a.principal || a.amount || 0) || (window.LM_InvestmentsUI?.calculateHistoricalInvested ? window.LM_InvestmentsUI.calculateHistoricalInvested(a) : 0);
    const historicalCurrent = toNum(a.currentValue || calculateAssetMaturityValue(Object.assign({}, a, { status: 'active', isClosed: false, isMatured: false })) || historicalInvested);
    const pnl      = isClosed ? (historicalCurrent - historicalInvested) : (curVal - invested);
    const pct      = totalCurrent > 0 ? ((curVal/totalCurrent)*100).toFixed(1) : 0;
    const qty      = toNum(a.qty || a.stockQty || 0);
    const avgCost  = toNum(a.buyPrice || a.avgCost || a.stockBuyPrice || 0);
    const ltp      = toNum(a.currentPrice || a.ltp || a.stockCurrentPrice || avgCost);
    const t        = (a.type||'').toUpperCase();
    const isQtyType = ['GOLD','SILVER','PHYSICAL','COMMODITY','STOCK','SIP','MUTUAL_FUND'].includes(t);
    const qtyDisp  = isQtyType && qty > 0 ? qty.toFixed(qty < 10 ? 3 : 2) : '—';
    const avgDisp  = avgCost > 0 ? fmtINR(avgCost) : (isQtyType ? '—' : fmtINR(isClosed ? historicalInvested : invested));
    const ltpDisp  = ltp > 0    ? fmtINR(ltp)      : (isQtyType ? '—' : fmtINR(isClosed ? historicalCurrent : curVal));
    const pnlInvPct = (isClosed ? historicalInvested : invested) > 0 ? ((pnl/(isClosed ? historicalInvested : invested))*100).toFixed(1) : 0;

    return `
      <tr class="wealth-row ${isClosed ? 'wealth-row-closed' : ''}" data-id="${a.id}" data-cat="${cat}" style="${isClosed ? 'opacity:0.85;background:rgba(244,63,94,0.02);' : ''}">
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:18px;">${catInfo.icon}</span>
            <div>
              <div class="list-item-name" style="margin:0;display:flex;align-items:center;gap:6px;">
                ${a.name||'Asset'}
                ${isClosed ? '<span style="background:rgba(244,63,94,0.15);color:#f43f5e;border:1px solid rgba(244,63,94,0.35);padding:1px 6px;border-radius:4px;font-size:10px;font-weight:700;">🔒 Matured / Closed</span>' : ''}
              </div>
              <div class="list-item-sub" style="margin:0;">${a.subType||cat} · ${a.institution || a.bank || (a.type==='FD'||a.type==='RD'?'Bank Deposit':'Asset')}</div>
            </div>
          </div>
        </td>
        <td class="wealth-td-mono">${qtyDisp}</td>
        <td class="wealth-td-mono">${avgDisp}</td>
        <td class="wealth-td-mono">${ltpDisp}</td>
        <td class="wealth-td-mono">
          ${isClosed 
            ? `<span style="text-decoration:line-through;color:var(--text-3);">${fmtINR(historicalInvested)}</span> <span style="font-size:10px;color:#f43f5e;font-weight:700;">(₹0 Active)</span>` 
            : fmtINR(invested)}
        </td>
        <td class="wealth-td-mono" style="color:${isClosed ? 'var(--text-2)' : 'var(--teal)'};">
          ${isClosed ? `${fmtINR(historicalCurrent > 0 ? historicalCurrent : historicalInvested)} <span style="font-size:10px;color:var(--text-3);">(Matured)</span>` : fmtINR(curVal)}
        </td>
        <td class="wealth-td-mono" style="color:${pnl>=0?'var(--emerald)':'var(--rose)'};">
          ${pnl>=0?'<span class="live-arrow-up">▲</span> +':'<span class="live-arrow-down">▼</span> '}${fmtINR(pnl)}<br>
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

  // Category composition bar data
  const catTotals = {};
  rawAssets.forEach(a => {
    const c = getAssetCategory(a);
    catTotals[c] = (catTotals[c] || 0) + getAssetCurrentValue(a);
  });
  const compSegs = Object.entries(catTotals)
    .sort((a,b)=>b[1]-a[1])
    .map(([c, v]) => {
      const pct = totalCurrent > 0 ? ((v/totalCurrent)*100).toFixed(1) : 0;
      const col = (ASSET_CATEGORIES[c]||{color:'#888'}).color;
      return `<div class="cat-comp-seg" title="${c}: ${pct}%" style="width:${pct}%;background:${col};"></div>`;
    }).join('');

  const compLegend = Object.entries(catTotals)
    .sort((a,b)=>b[1]-a[1])
    .map(([c, v]) => {
      const pct = totalCurrent > 0 ? ((v/totalCurrent)*100).toFixed(1) : 0;
      const col = (ASSET_CATEGORIES[c]||{color:'#888'}).color;
      const ic  = (ASSET_CATEGORIES[c]||{icon:'💼'}).icon;
      return `<div style="display:flex;align-items:center;gap:5px;font-size:11px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${col};display:inline-block;flex-shrink:0;"></span>
        <span style="color:var(--text-2);">${ic} ${c}</span>
        <span style="font-family:var(--font-m);color:var(--text-3);">${pct}%</span>
      </div>`;
    }).join('');

  // Mobile card view
  const mobileCards = assets.map((a, i) => {
    const isClosed = isAssetClosedOrMatured(a);
    const cat      = getAssetCategory(a);
    const catInfo  = ASSET_CATEGORIES[cat] || { icon: '💼', color: 'var(--teal)' };
    const invested = getAssetInvestedAmount(a);
    const curVal   = getAssetCurrentValue(a);
    const historicalInvested = toNum(a.buyPrice || a.principal || a.amount || 0) || (window.LM_InvestmentsUI?.calculateHistoricalInvested ? window.LM_InvestmentsUI.calculateHistoricalInvested(a) : 0);
    const historicalCurrent = toNum(a.currentValue || calculateAssetMaturityValue(Object.assign({}, a, { status: 'active', isClosed: false, isMatured: false })) || historicalInvested);
    const pnl      = isClosed ? (historicalCurrent - historicalInvested) : (curVal - invested);
    const pct      = totalCurrent > 0 ? ((curVal/totalCurrent)*100).toFixed(1) : 0;
    const pnlInvPct = (isClosed ? historicalInvested : invested) > 0 ? ((pnl/(isClosed ? historicalInvested : invested))*100).toFixed(1) : 0;
    const staggerCls = `s${Math.min(i+1,5)}`;
    return `
      <div class="wealth-mob-card ${staggerCls} ${isClosed ? 'wealth-mob-card-closed' : ''}" data-id="${a.id}" data-cat="${cat}" style="${isClosed ? 'opacity:0.88;border-color:rgba(244,63,94,0.3);background:rgba(244,63,94,0.02);' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;line-height:1;">${catInfo.icon}</span>
            <div>
              <div class="list-item-name" style="margin:0;display:flex;align-items:center;gap:6px;">
                ${a.name||'Asset'}
                ${isClosed ? '<span style="background:rgba(244,63,94,0.15);color:#f43f5e;border:1px solid rgba(244,63,94,0.35);padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;">🔒 Closed</span>' : ''}
              </div>
              <div class="list-item-sub" style="margin:0;">${a.subType||cat}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-m);font-size:14px;font-weight:700;color:${isClosed ? 'var(--text-2)' : 'var(--teal)'};">${fmtINR(isClosed ? (historicalCurrent > 0 ? historicalCurrent : historicalInvested) : curVal)}</div>
            <div style="font-size:11px;color:${pnl>=0?'var(--emerald)':'var(--rose)'};display:inline-flex;align-items:center;gap:3px;">${pnl>=0?'<span class="live-arrow-up">▲</span> +':'<span class="live-arrow-down">▼</span> '}${fmtINR(pnl)} (${pnl>=0?'+':''}${pnlInvPct}%)</div>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid var(--border);font-size:11px;color:var(--text-3);">
          <span>Invested: <b style="color:var(--text-2);">${isClosed ? `<span style="text-decoration:line-through;">${fmtINR(historicalInvested)}</span> (Closed)` : fmtINR(invested)}</b></span>
          <span>Alloc: <b style="color:var(--text-2);">${pct}%</b></span>
          <div style="display:flex;gap:4px;">
            <button class="section-action" onclick="openEditAssetModal('${a.id}')" style="padding:4px 8px;" title="Edit">✏️</button>
            <button class="section-action" onclick="deleteAsset('${a.id}')" style="padding:4px 8px;color:var(--rose);" title="Delete">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = summaryBar + stockSpotlight + `
    <!-- Category composition bar -->
    <div class="chart-card" style="margin-bottom:16px;padding:14px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:11px;font-weight:600;color:var(--text-3);text-transform:uppercase;letter-spacing:.8px;">Portfolio Composition</span>
        <span style="font-size:11px;font-family:var(--font-m);color:var(--text-3);">${assets.length} holdings · ${fmtINR(totalCurrent)}</span>
      </div>
      <div class="cat-comp-bar" id="catCompBar">${compSegs}</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px 16px;margin-top:4px;">${compLegend}</div>
    </div>

    <!-- Desktop table -->
    <div class="tx-card wealth-table-scroll" style="overflow-x:auto;">
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
    </div>

    <!-- Mobile card view -->
    <div class="wealth-mob-cards" style="display:none;">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap;">
        <input id="assetSearchMob" class="form-input" style="flex:1;min-width:120px;padding:7px 10px;font-size:12px;"
               placeholder="🔍 Search..." oninput="filterWealthAssetsMob()">
      </div>
      <div id="assetsMobList">${mobileCards}</div>
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

function filterWealthAssetsMob() {
  const search = (document.getElementById('assetSearchMob')?.value||'').toLowerCase();
  document.querySelectorAll('#assetsMobList .wealth-mob-card').forEach(card => {
    const name = card.querySelector('.list-item-name')?.textContent.toLowerCase() || '';
    card.style.display = (!search || name.includes(search)) ? '' : 'none';
  });
}

/* ─────────────────────────────────────────────────────────────
   TAB 2 — LIABILITIES (EMI / Formal Loans)
───────────────────────────────────────────────────────────── */
function renderWealthLiabilities(container) {
  const loans            = state.emi_loans || [];
  const totalOutst       = getTotalLiabilities();
  const totalAssets      = getTotalAssets();
  const debtRatio        = totalAssets > 0 ? ((totalOutst / totalAssets) * 100).toFixed(1) : 0;
  const personalTaken    = (state.loans || []).filter(l => l.type === 'taken' && !l.collected);
  const ccCards          = (window.LM_CreditCardsService?.getAllCards?.() || state.credit_cards || []);
  const ccDueTotal       = ccCards.reduce((s, c) => s + toNum(c.current_due || 0), 0);

  const totalItemCount = loans.length + personalTaken.length + ccCards.length;

  if (totalItemCount === 0) {
    container.innerHTML = `
      <div class="chart-card" style="text-align:center;margin-bottom:16px;">
        <div style="font-family:var(--font-m);font-size:28px;font-weight:600;color:var(--emerald);">₹0</div>
        <div class="kpi-label" style="margin-top:4px;">TOTAL LIABILITIES</div>
        <div style="font-size:12px;color:var(--text-3);margin-top:4px;">0 active obligations</div>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <div class="empty-state-text">No active liabilities!</div>
        <div class="empty-state-sub">Excellent — you are completely debt-free. You can track loans or add credit cards anytime.</div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:16px;">
          <button class="btn-submit" style="width:auto;padding:10px 20px;" onclick="openAddLiabilityModal()">+ Add Loan</button>
          <button class="btn-submit" style="width:auto;padding:10px 20px;background:var(--teal);" onclick="showPage('credit-cards')">💳 Credit Cards</button>
        </div>
      </div>`;
    return;
  }

  const emiCardsHtml = loans.map(l => {
    const pct = totalOutst > 0 ? ((toNum(l.outstanding) / totalOutst) * 100).toFixed(1) : 0;
    const emi = toNum(l.monthlyEmi);
    return `
      <div class="list-item" style="flex-direction:column;align-items:stretch;gap:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="kpi-icon" style="background:rgba(251,113,133,0.12);font-size:18px;">🏦</div>
            <div>
              <div class="list-item-name">${escapeHtml(l.name || 'Loan')}</div>
              <div class="list-item-sub">${escapeHtml(l.type || 'Loan')}${l.lender ? ' · ' + escapeHtml(l.lender) : ''}${l.accountNo ? ' · #' + escapeHtml(l.accountNo) : ''}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-m);font-size:15px;font-weight:600;color:var(--rose);">${fmtINR(l.outstanding)}</div>
            <div style="font-size:11px;color:var(--text-3);">${pct}% of total</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 0;border-top:1px solid var(--border);">
          <div><div class="kpi-label">INTEREST</div><div style="font-size:13px;font-family:var(--font-m);">${toNum(l.interestRate)}%</div></div>
          <div><div class="kpi-label">EMI</div><div style="font-size:13px;font-family:var(--font-m);">${emi > 0 ? fmtINR(emi) : '—'}</div></div>
          <div><div class="kpi-label">STARTED</div><div style="font-size:13px;font-family:var(--font-m);">${l.startDate || '—'}</div></div>
        </div>
        ${l.collateral ? `<div style="font-size:11px;color:var(--text-3);">Collateral: ${escapeHtml(l.collateral)}</div>` : ''}
        ${l.notes ? `<div style="font-size:11px;color:var(--text-3);">${escapeHtml(l.notes)}</div>` : ''}
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
        <div class="kpi-change">${totalItemCount} active obligation${totalItemCount !== 1 ? 's' : ''}</div>
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

    <!-- Active Credit Cards Section -->
    ${ccCards.length > 0 ? `
      <div class="section-heading" style="margin-top:16px;">
        <div class="section-title"><span class="dot" style="background:var(--gold)"></span>Credit Cards (${ccCards.length})</div>
        <button class="section-action" onclick="showPage('credit-cards')">Manage Cards →</button>
      </div>
      <div class="tx-card" style="margin-bottom:20px;">
        ${ccCards.map(c => `
          <div class="list-item">
            <div class="tx-icon expense">💳</div>
            <div>
              <div class="list-item-name">${escapeHtml(c.card_name || 'Card')} <span style="font-size:11px;color:var(--text-3); font-weight:normal;">(${escapeHtml(c.bank_name || '')} ••${escapeHtml(c.last_4_digits || '0000')})</span></div>
              <div class="list-item-sub">Due: ${c.due_day ? c.due_day + 'th of month' : 'N/A'} · Limit: ${fmtINR(c.credit_limit || 0)}</div>
            </div>
            <div style="text-align:right;">
              <div class="list-item-amount" style="color:${toNum(c.current_due) > 0 ? 'var(--rose)' : 'var(--emerald)'};">${fmtINR(c.current_due || 0)}</div>
              <div style="font-size:11px;color:var(--text-3);">${toNum(c.current_due) > 0 ? 'Outstanding' : 'Cleared'}</div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Personal Loans Taken Section -->
    ${personalTaken.length > 0 ? `
      <div class="section-heading" style="margin-top:16px;">
        <div class="section-title"><span class="dot" style="background:var(--rose)"></span>Personal Loans (Taken) (${personalTaken.length})</div>
        <button class="section-action" onclick="setTimeout(()=>showPage('loans'),150)">Manage →</button>
      </div>
      <div class="tx-card" style="margin-bottom:20px;">
        ${personalTaken.map(l => `
          <div class="list-item">
            <div class="tx-icon expense">📥</div>
            <div>
              <div class="list-item-name">${escapeHtml(l.person)}</div>
              <div class="list-item-sub">Due: ${l.dueDate || 'N/A'} · ${escapeHtml(l.category || 'Loan')}</div>
            </div>
            <div class="list-item-amount" style="color:var(--rose);">${fmtINR(l.amount)}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Formal Loans Section -->
    <div class="section-heading">
      <div class="section-title"><span class="dot" style="background:var(--rose)"></span>Active Loans (${loans.length})</div>
      <button class="section-action" onclick="openAddLiabilityModal()">+ Add Loan</button>
    </div>
    <div class="tx-card">
      ${loans.length > 0 ? emiCardsHtml : '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:13px;">No active formal/bank loans.</div>'}
    </div>
  `;
}

/* ─────────────────────────────────────────────────────────────
   TAB 3 — LOANS (Personal Given / Taken Analytics & Management)
───────────────────────────────────────────────────────────── */
// Global UI State for Loans
window._loanActiveSubtab = window._loanActiveSubtab || 'all'; // 'all' | 'given' | 'taken' | 'overdue' | 'settled'
window._loanSearchQuery = window._loanSearchQuery || '';
window._loanViewMode = window._loanViewMode || 'cards'; // 'cards' | 'people'

// ------------------------------------------------------------
// 1. RENDER WEALTH LOANS (Main View)
// ------------------------------------------------------------
function renderWealthLoans(container) {
  if (!container) return;
  const loans = state.loans || [];
  const s = getLoanSummary();
  const activeSubtab = window._loanActiveSubtab || 'all';
  const searchQuery = (window._loanSearchQuery || '').trim().toLowerCase();
  const viewMode = window._loanViewMode || 'cards';

  // Counts for Subtabs
  const allCount = loans.length;
  const givenCount = loans.filter(l => l.type === 'given' && !getLoanFinancialDetails(l).isSettled).length;
  const takenCount = loans.filter(l => l.type === 'taken' && !getLoanFinancialDetails(l).isSettled).length;
  const overdueCount = loans.filter(l => {
    const fin = getLoanFinancialDetails(l);
    return fin.isOverdue && !fin.isSettled;
  }).length;
  const settledCount = loans.filter(l => getLoanFinancialDetails(l).isSettled).length;

  // Filter loans according to subtab & search query
  let filteredLoans = loans.filter(l => {
    const fin = getLoanFinancialDetails(l);
    if (activeSubtab === 'given' && (l.type !== 'given' || fin.isSettled)) return false;
    if (activeSubtab === 'taken' && (l.type !== 'taken' || fin.isSettled)) return false;
    if (activeSubtab === 'overdue' && (!fin.isOverdue || fin.isSettled)) return false;
    if (activeSubtab === 'settled' && !fin.isSettled) return false;
    return true;
  });

  if (searchQuery) {
    filteredLoans = filteredLoans.filter(l =>
      (l.person || '').toLowerCase().includes(searchQuery) ||
      (l.category || '').toLowerCase().includes(searchQuery) ||
      (l.note || '').toLowerCase().includes(searchQuery) ||
      (l.loanAccount || '').toLowerCase().includes(searchQuery)
    );
  }

  // Sort: Active first (overdue first, then soonest due date), Settled last
  filteredLoans.sort((a, b) => {
    const finA = getLoanFinancialDetails(a);
    const finB = getLoanFinancialDetails(b);
    if (!finA.isSettled && finB.isSettled) return -1;
    if (finA.isSettled && !finB.isSettled) return 1;
    if (!finA.isSettled && !finB.isSettled) {
      if (finA.isOverdue && !finB.isOverdue) return -1;
      if (!finA.isOverdue && finB.isOverdue) return 1;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    }
    return new Date(b.createdAt || b.startDate || 0) - new Date(a.createdAt || a.startDate || 0);
  });

  // Empty state if no loans at all
  if (loans.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 0;text-align:center;">
        <div class="empty-state-icon" style="font-size:48px;margin-bottom:12px;">🤝</div>
        <div class="empty-state-text" style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:6px;">No Personal Loans Tracked</div>
        <div class="empty-state-sub" style="font-size:13px;color:var(--text-3);max-width:400px;margin:0 auto 20px;">Record money given to or borrowed from friends, family, or contacts with optional interest rate and partial repayments.</div>
        <button class="btn-submit" style="width:auto;padding:10px 28px;border-radius:12px;cursor:pointer;" onclick="openAddLoanModal()">+ Add Loan</button>
      </div>`;
    ensureFAB();
    return;
  }

  // Overdue Banner
  const overdueBanner = s.overdue.length ? `
    <div class="loan-overdue-banner" style="background:rgba(251,113,133,0.12);border:1px solid rgba(251,113,133,0.35);border-radius:12px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:var(--rose);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">⚠️</span>
        <div>
          <strong>${s.overdue.length} overdue loan${s.overdue.length !== 1 ? 's' : ''}</strong>: 
          ${s.overdue.map(l => `<em>${escapeHtml(l.person)}</em> (${fmtINR(getLoanFinancialDetails(l).totalBalance)}, due ${l.dueDate})`).join(', ')}
        </div>
      </div>
      <button class="loan-filter-pill" style="background:rgba(251,113,133,0.2);color:var(--rose);border:1px solid rgba(251,113,133,0.4);border-radius:8px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;" onclick="setLoanSubtab('overdue')">View Overdue →</button>
    </div>` : '';

  // KPI Summary Strip
  const netColor = s.netBalance >= 0 ? 'var(--emerald)' : 'var(--rose)';
  const netLabel = s.netBalance > 0 ? '🟢 You Are Net Creditor' : s.netBalance < 0 ? '🔴 You Are Net Debtor' : '⚪ Fully Balanced';
  const totalInterestCombined = (s.totalInterestGiven || 0) + (s.totalInterestTaken || 0);

  const kpiStripHtml = `
    <div class="loan-kpi-strip" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:18px;">
      <div class="kpi-card emerald" style="position:relative;overflow:hidden;border-radius:14px;padding:14px 16px;">
        <div class="kpi-label" style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:var(--text-3);display:flex;justify-content:space-between;">
          <span>💸 GIVEN (OUTSTANDING)</span>
          <span style="color:var(--emerald);">${s.totalGiven > 0 ? Math.round((s.collectedGiven / s.totalGiven) * 100) : 0}% collected</span>
        </div>
        <div class="kpi-value" style="color:var(--emerald);font-size:clamp(18px,2.2vw,24px);font-weight:800;margin:4px 0;">${fmtINR(s.givenOut)}</div>
        <div class="kpi-change" style="font-size:11px;color:var(--text-3);">
          Principal: ${fmtINR(s.totalGiven)} ${s.totalInterestGiven > 0 ? `· <span style="color:var(--gold);">+${fmtINR(s.totalInterestGiven)} Int</span>` : ''}
        </div>
      </div>

      <div class="kpi-card rose" style="position:relative;overflow:hidden;border-radius:14px;padding:14px 16px;">
        <div class="kpi-label" style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:var(--text-3);display:flex;justify-content:space-between;">
          <span>📥 TAKEN (OUTSTANDING)</span>
          <span style="color:var(--rose);">${s.totalTaken > 0 ? Math.round((s.collectedTaken / s.totalTaken) * 100) : 0}% repaid</span>
        </div>
        <div class="kpi-value" style="color:var(--rose);font-size:clamp(18px,2.2vw,24px);font-weight:800;margin:4px 0;">${fmtINR(s.takenOut)}</div>
        <div class="kpi-change" style="font-size:11px;color:var(--text-3);">
          Principal: ${fmtINR(s.totalTaken)} ${s.totalInterestTaken > 0 ? `· <span style="color:var(--gold);">+${fmtINR(s.totalInterestTaken)} Int</span>` : ''}
        </div>
      </div>

      <div class="kpi-card teal" style="position:relative;overflow:hidden;border-radius:14px;padding:14px 16px;">
        <div class="kpi-label" style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:var(--text-3);">⚖️ NET POSITION</div>
        <div class="kpi-value" style="color:${netColor};font-size:clamp(18px,2.2vw,24px);font-weight:800;margin:4px 0;">${s.netBalance >= 0 ? '+' : ''}${fmtINR(s.netBalance)}</div>
        <div class="kpi-change" style="font-size:11px;color:${netColor};">${netLabel}</div>
      </div>

      ${totalInterestCombined > 0 ? `
        <div class="kpi-card gold" style="position:relative;overflow:hidden;border-radius:14px;padding:14px 16px;">
          <div class="kpi-label" style="font-size:11px;font-weight:700;letter-spacing:0.5px;color:var(--text-3);">✨ TOTAL INTEREST ACCRUED</div>
          <div class="kpi-value" style="color:var(--gold);font-size:clamp(18px,2.2vw,24px);font-weight:800;margin:4px 0;">+${fmtINR(totalInterestCombined)}</div>
          <div class="kpi-change" style="font-size:11px;color:var(--text-3);">Given: +${fmtINR(s.totalInterestGiven)} · Taken: +${fmtINR(s.totalInterestTaken)}</div>
        </div>
      ` : ''}
    </div>
  `;

  // Subtabs & Search Navigation Bar
  const navBarHtml = `
    <div class="loan-nav-bar" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
      <div class="loan-subtabs-scroll" style="display:flex;align-items:center;gap:6px;overflow-x:auto;padding-bottom:4px;max-width:100%;">
        <button class="loan-tab-btn ${activeSubtab === 'all' ? 'active' : ''}" onclick="setLoanSubtab('all')">
          All <span class="loan-badge">${allCount}</span>
        </button>
        <button class="loan-tab-btn ${activeSubtab === 'given' ? 'active' : ''}" onclick="setLoanSubtab('given')">
          💸 Given <span class="loan-badge">${givenCount}</span>
        </button>
        <button class="loan-tab-btn ${activeSubtab === 'taken' ? 'active' : ''}" onclick="setLoanSubtab('taken')">
          📥 Taken <span class="loan-badge">${takenCount}</span>
        </button>
        <button class="loan-tab-btn ${activeSubtab === 'overdue' ? 'active' : ''}" onclick="setLoanSubtab('overdue')">
          ⚠️ Overdue <span class="loan-badge ${overdueCount > 0 ? 'badge-warn' : ''}">${overdueCount}</span>
        </button>
        <button class="loan-tab-btn ${activeSubtab === 'settled' ? 'active' : ''}" onclick="setLoanSubtab('settled')">
          ✅ Settled <span class="loan-badge">${settledCount}</span>
        </button>
      </div>

      <div class="loan-controls-wrap" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex-grow:1;justify-content:flex-end;">
        <div class="loan-search-wrap" style="position:relative;min-width:180px;flex:1;max-width:280px;">
          <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-3);font-size:12px;pointer-events:none;">🔍</span>
          <input type="text" class="loan-search-input" placeholder="Search person, note..." value="${escapeHtml(window._loanSearchQuery || '')}" oninput="handleLoanSearch(this.value)" style="width:100%;padding:6px 28px 6px 30px;font-size:12px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text);" />
          ${window._loanSearchQuery ? `<button onclick="handleLoanSearch('')" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-3);font-size:14px;cursor:pointer;">×</button>` : ''}
        </div>
        <div class="loan-view-toggle" style="display:inline-flex;background:var(--bg3);padding:3px;border-radius:10px;border:1px solid var(--border);">
          <button class="loan-view-btn ${viewMode === 'cards' ? 'active' : ''}" onclick="setLoanViewMode('cards')" title="Cards Grid View" style="padding:4px 10px;border-radius:7px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:${viewMode === 'cards' ? 'var(--teal)' : 'transparent'};color:${viewMode === 'cards' ? '#000' : 'var(--text-3)'};">📇 Cards</button>
          <button class="loan-view-btn ${viewMode === 'people' ? 'active' : ''}" onclick="setLoanViewMode('people')" title="By Person Summary" style="padding:4px 10px;border-radius:7px;border:none;font-size:12px;font-weight:600;cursor:pointer;background:${viewMode === 'people' ? 'var(--teal)' : 'transparent'};color:${viewMode === 'people' ? '#000' : 'var(--text-3)'};">👥 People</button>
        </div>
        <button class="btn-submit" style="width:auto;padding:7px 16px;font-size:12px;border-radius:10px;cursor:pointer;white-space:nowrap;" onclick="openAddLoanModal()">+ Add Loan</button>
      </div>
    </div>
  `;

  // --- Render based on view mode ---
  let mainContentHtml = '';

  if (viewMode === 'cards') {
    if (filteredLoans.length === 0) {
      mainContentHtml = `
        <div class="tx-card" style="padding:36px 16px;text-align:center;color:var(--text-3);">
          <div style="font-size:32px;margin-bottom:8px;">🔍</div>
          <div style="font-size:14px;font-weight:600;color:var(--text-2);">No loans found</div>
          <div style="font-size:12px;margin-top:4px;">Try selecting another subtab or clearing your search query.</div>
        </div>`;
    } else {
      const cardsHtml = filteredLoans.map(l => {
        const fin = getLoanFinancialDetails(l);
        const isGiven = l.type === 'given';
        const totalTarget = fin.principal + fin.accruedInterest;
        const progressPct = totalTarget > 0 ? Math.min(100, Math.round((fin.totalRepaid / totalTarget) * 100)) : (fin.isSettled ? 100 : 0);

        // Days calculation
        let dueStatusHtml = '';
        if (fin.isSettled) {
          dueStatusHtml = `<span style="color:var(--text-3);">Settled ${l.collectedAt ? new Date(l.collectedAt).toLocaleDateString() : ''}</span>`;
        } else if (l.dueDate) {
          const due = new Date(l.dueDate);
          const today = new Date();
          today.setHours(0,0,0,0);
          due.setHours(0,0,0,0);
          const days = Math.round((due - today) / (1000 * 60 * 60 * 24));
          if (days < 0) {
            dueStatusHtml = `<span style="color:var(--rose);font-weight:700;">⚠️ ${Math.abs(days)}d overdue</span>`;
          } else if (days === 0) {
            dueStatusHtml = `<span style="color:var(--gold);font-weight:700;">⏳ Due Today</span>`;
          } else {
            dueStatusHtml = `<span style="color:var(--text-3);">Due in ${days}d</span>`;
          }
        }

        // Repayment ledger rows
        const repayments = Array.isArray(l.repayments) ? l.repayments : [];
        const repaymentsHtml = repayments.length > 0 ? repayments.map((r) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:11.5px;">
            <div>
              <span style="font-weight:600;color:var(--text);">${r.date || 'N/A'}</span>
              <span style="color:var(--text-3);margin-left:6px;">· ${escapeHtml(r.account || 'Cash')}</span>
              ${r.note ? `<span style="color:var(--text-3);margin-left:6px;font-style:italic;">"${escapeHtml(r.note)}"</span>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-family:var(--font-m);font-weight:700;color:var(--emerald);">+${fmtINR(r.amount)}</span>
              <button onclick="deleteLoanRepayment('${l.id}', '${r.id}')" title="Delete this payment entry" style="background:none;border:none;color:var(--rose);cursor:pointer;font-size:12px;padding:0 2px;">🗑️</button>
            </div>
          </div>
        `).join('') : '<div style="font-size:11px;color:var(--text-3);font-style:italic;padding:6px 0;">No partial repayments recorded yet.</div>';

        return `
          <div class="loan-card ${fin.isSettled ? 'settled' : ''} ${fin.isOverdue && !fin.isSettled ? 'overdue' : ''}" style="background:var(--surface);border:1px solid ${fin.isOverdue && !fin.isSettled ? 'rgba(251,113,133,0.4)' : 'var(--border)'};border-radius:14px;padding:16px;box-shadow:var(--shadow-sm);transition:all 0.2s ease;">
            <!-- Card Header -->
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:12px;">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <div style="width:38px;height:38px;border-radius:50%;background:${isGiven ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)'};color:${isGiven ? 'var(--emerald)' : 'var(--rose)'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;flex-shrink:0;">
                  ${(l.person || '?').charAt(0).toUpperCase()}
                </div>
                <div style="min-width:0;">
                  <div style="font-size:15px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${escapeHtml(l.person || 'Unknown')}
                  </div>
                  <div style="font-size:11px;color:var(--text-3);display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:2px;">
                    <span>${escapeHtml(l.category || 'Personal')}</span>
                    <span>·</span>
                    <span>${escapeHtml(l.loanAccount || 'Cash')}</span>
                  </div>
                </div>
              </div>
              
              <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
                <div style="display:flex;gap:4px;">
                  <span class="loan-badge ${isGiven ? 'badge-given' : 'badge-taken'}">${isGiven ? '💸 Given' : '📥 Taken'}</span>
                  ${fin.isSettled ? `<span class="loan-badge badge-settled">✅ Settled</span>` : (fin.isOverdue ? `<span class="loan-badge badge-warn">⚠️ Overdue</span>` : '')}
                </div>
                ${fin.interestRate > 0 ? `
                  <span class="loan-badge badge-interest" style="background:rgba(234,179,8,0.12);color:var(--gold);border:1px solid rgba(234,179,8,0.3);font-size:10px;">
                    ✨ ${fin.interestRate}% p.a.
                  </span>
                ` : ''}
              </div>
            </div>

            <!-- Progress Bar -->
            <div style="margin-bottom:14px;">
              <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;color:var(--text-3);">
                <span>Repayment Progress</span>
                <span style="font-weight:600;color:${progressPct === 100 ? 'var(--emerald)' : 'var(--text-2)'};">${progressPct}% (${fmtINR(fin.totalRepaid)} of ${fmtINR(totalTarget)})</span>
              </div>
              <div style="height:6px;background:var(--bg3);border-radius:99px;overflow:hidden;position:relative;">
                <div style="height:100%;width:${progressPct}%;background:${isGiven ? 'linear-gradient(90deg, #10b981, #14b8a6)' : 'linear-gradient(90deg, #f43f5e, #fb7185)'};border-radius:99px;transition:width 0.4s ease;"></div>
              </div>
            </div>

            <!-- 5-Metric Strip -->
            <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:10px;background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:12px;">
              <div>
                <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Original Principal</div>
                <div style="font-weight:700;color:var(--text);font-size:13px;">${fmtINR(fin.principal)}</div>
              </div>
              <div>
                <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Interest Accrued</div>
                <div style="font-weight:700;color:${fin.accruedInterest > 0 ? 'var(--gold)' : 'var(--text-3)'};font-size:13px;">
                  ${fin.accruedInterest > 0 ? `+${fmtINR(fin.accruedInterest)}` : '₹0 (0%)'}
                </div>
              </div>
              <div>
                <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Due Date</div>
                <div style="font-size:12px;color:var(--text-2);font-weight:600;">
                  ${l.dueDate || 'N/A'} <span style="font-size:10px;">${dueStatusHtml}</span>
                </div>
              </div>
              <div>
                <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Remaining Balance</div>
                <div style="font-family:var(--font-m);font-weight:800;font-size:15px;color:${fin.isSettled ? 'var(--text-3)' : (isGiven ? 'var(--emerald)' : 'var(--rose)')};">
                  ${fmtINR(fin.totalBalance)}
                </div>
              </div>
            </div>

            ${l.note ? `
              <div style="font-size:11.5px;color:var(--text-3);margin-bottom:12px;padding:0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                📝 <em>${escapeHtml(l.note)}</em>
              </div>
            ` : ''}

            <!-- Action Buttons -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:10px;border-top:1px solid var(--border);flex-wrap:wrap;">
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${!fin.isSettled ? `
                  <button onclick="openRepayLoanModal('${l.id}')" style="background:${isGiven ? 'var(--emerald)' : '#3b82f6'};color:#000;border:none;border-radius:8px;padding:6px 12px;font-size:11.5px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:4px;">
                    💳 ${isGiven ? 'Collect / Repay' : 'Make Payment'}
                  </button>
                ` : `
                  <button onclick="reopenLoanById('${l.id}')" style="background:var(--bg3);color:var(--text-2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer;">
                    🔄 Reopen
                  </button>
                `}
                <button onclick="openEditLoanModalById('${l.id}')" style="background:var(--bg3);color:var(--text-2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer;">
                  ✏️ Edit
                </button>
                <button onclick="toggleLoanHistory('${l.id}')" style="background:var(--bg3);color:var(--text-2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:11px;font-weight:600;cursor:pointer;">
                  📜 History (${fin.repaymentsCount})
                </button>
              </div>
              <button onclick="deleteLoanById('${l.id}')" title="Delete Loan" style="background:rgba(239,68,68,0.1);color:var(--rose);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer;">
                🗑️
              </button>
            </div>

            <!-- Expandable History Section -->
            <div id="loan_history_${l.id}" style="display:none;margin-top:12px;padding-top:10px;border-top:1px dashed var(--border);">
              <div style="font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
                <span>Repayment Ledger</span>
                <span>${fin.repaymentsCount} entry(ies)</span>
              </div>
              <div class="loan-history-list" style="background:var(--bg3);border-radius:8px;padding:8px 10px;max-height:160px;overflow-y:auto;">
                ${repaymentsHtml}
              </div>
            </div>
          </div>
        `;
      }).join('');

      mainContentHtml = `<div class="loan-cards-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:14px;">${cardsHtml}</div>`;
    }
  } else {
    // --- By Person Summary View ---
    const groups = buildLoanGroups();
    const byPerson = {};
    groups.forEach(g => {
      if (!byPerson[g.person]) byPerson[g.person] = { given: 0, taken: 0, givenInterest: 0, takenInterest: 0, givenColl: 0, takenColl: 0, loans: [] };
      if (g.type === 'given') {
        byPerson[g.person].given += g.pendingAmt;
        byPerson[g.person].givenColl += g.collectedAmt;
        byPerson[g.person].givenInterest += g.totalInterest;
      } else {
        byPerson[g.person].taken += g.pendingAmt;
        byPerson[g.person].takenColl += g.collectedAmt;
        byPerson[g.person].takenInterest += g.totalInterest;
      }
      byPerson[g.person].loans.push(...g.loans);
    });

    let personEntries = Object.entries(byPerson);
    if (searchQuery) {
      personEntries = personEntries.filter(([p]) => p.toLowerCase().includes(searchQuery));
    }
    personEntries.sort((a, b) => (b[1].given + b[1].taken) - (a[1].given + a[1].taken));

    const personRows = personEntries.map(([person, d]) => {
      const net = d.given - d.taken;
      const netColor2 = net > 0 ? 'var(--emerald)' : net < 0 ? 'var(--rose)' : 'var(--text-3)';
      const netLabel2 = net > 0 ? `You get ${fmtINR(net)}` : net < 0 ? `You owe ${fmtINR(Math.abs(net))}` : 'Settled';
      const overdueCount = d.loans.filter(l => {
        const fin = getLoanFinancialDetails(l);
        return !fin.isSettled && fin.isOverdue;
      }).length;

      const personLoanDetails = d.loans.map(l => {
        const fin = getLoanFinancialDetails(l);
        return `
          <div class="loan-detail-item" style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);gap:8px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span style="font-size:14px;">${l.type === 'given' ? '💸' : '📥'}</span>
              <div>
                <div style="font-size:12.5px;font-weight:600;color:${l.type === 'given' ? 'var(--emerald)' : 'var(--rose)'};">
                  ${l.type === 'given' ? 'Given' : 'Taken'}: ${fmtINR(fin.principal)}
                  ${fin.interestRate > 0 ? `<span style="font-size:10px;color:var(--gold);margin-left:4px;">(${fin.interestRate}% · +${fmtINR(fin.accruedInterest)})</span>` : ''}
                </div>
                <div style="font-size:11px;color:var(--text-3);">
                  Due: ${l.dueDate || 'N/A'} · Bal: <strong>${fmtINR(fin.totalBalance)}</strong> · ${escapeHtml(l.category || 'Personal')}
                  ${fin.isOverdue && !fin.isSettled ? '<span style="color:var(--rose);font-weight:700;"> · OVERDUE</span>' : ''}
                  ${fin.isSettled ? '<span style="color:var(--emerald);"> · SETTLED</span>' : ''}
                </div>
              </div>
            </div>
            <div style="display:flex;gap:6px;">
              ${!fin.isSettled ? `<button onclick="openRepayLoanModal('${l.id}')" style="background:${l.type==='given'?'var(--emerald)':'#3b82f6'};color:#000;border:none;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;cursor:pointer;">💳 Pay</button>` : ''}
              <button onclick="openEditLoanModalById('${l.id}')" style="background:#3b82f6;border:none;border-radius:6px;padding:3px 8px;font-size:11px;color:white;cursor:pointer;">✏️</button>
              <button onclick="deleteLoanById('${l.id}')" style="background:#ef4444;border:none;border-radius:6px;padding:3px 8px;font-size:11px;color:white;cursor:pointer;">🗑️</button>
            </div>
          </div>
        `;
      }).join('');

      const cleanPersonId = person.replace(/[^a-zA-Z0-9]/g, '_');
      return `
        <tr style="cursor:pointer;" onclick="togglePersonLoans('person_${cleanPersonId}')">
          <td>
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:50%;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">
                ${person.charAt(0).toUpperCase()}
              </div>
              <div>
                <div class="list-item-name" style="margin:0;font-weight:600;">${escapeHtml(person)}</div>
                <div class="list-item-sub" style="margin:0;font-size:11px;color:var(--text-3);">${d.loans.length} loan${d.loans.length !== 1 ? 's' : ''}
                  ${overdueCount ? `<span style="color:var(--rose);font-weight:700;"> · ${overdueCount} overdue</span>` : ''}
                </div>
              </div>
            </div>
          </td>
          <td class="wealth-td-mono" style="color:var(--emerald);">
            ${d.given > 0 ? fmtINR(d.given) : '—'}
            ${d.givenColl > 0 ? `<br><span style="font-size:10px;color:var(--text-3);">+${fmtINR(d.givenColl)} coll.</span>` : ''}
          </td>
          <td class="wealth-td-mono" style="color:var(--rose);">
            ${d.taken > 0 ? fmtINR(d.taken) : '—'}
            ${d.takenColl > 0 ? `<br><span style="font-size:10px;color:var(--text-3);">+${fmtINR(d.takenColl)} repaid</span>` : ''}
          </td>
          <td class="wealth-td-mono" style="color:${netColor2};font-weight:700;">${netLabel2}</td>
          <td><span id="person_${cleanPersonId}_icon" style="color:var(--text-3);">▼</span></td>
        </tr>
        <tr id="person_${cleanPersonId}" style="display:none;">
          <td colspan="5" style="padding:0 0 10px 44px;">
            <div style="border-left:2px solid var(--border);padding-left:12px;">
              ${personLoanDetails || '<div class="text-slate-500 italic text-sm p-2">No loans for this person</div>'}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    mainContentHtml = `
      <div class="tx-card" style="overflow-x:auto;">
        <table class="wealth-table">
          <thead>
            <tr>
              <th>PERSON</th>
              <th style="color:var(--emerald);">GIVEN (OUTSTANDING)</th>
              <th style="color:var(--rose);">TAKEN (OUTSTANDING)</th>
              <th>NET POSITION</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="loanPersonBody">${personRows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-3);">No person records found</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  // Combine full layout
  container.innerHTML = `
    ${overdueBanner}
    ${kpiStripHtml}
    ${navBarHtml}
    ${mainContentHtml}
  `;

  ensureFAB();
}

// ------------------------------------------------------------
// 2. LOAN NAVIGATION & FILTER HELPERS
// ------------------------------------------------------------
function setLoanSubtab(subtab) {
  window._loanActiveSubtab = subtab;
  const wealthContainer = document.querySelector('#wealth-tab-content') || document.querySelector('#loansOverview');
  if (wealthContainer) renderWealthLoans(wealthContainer);
}

function handleLoanSearch(val) {
  window._loanSearchQuery = val || '';
  const wealthContainer = document.querySelector('#wealth-tab-content') || document.querySelector('#loansOverview');
  if (wealthContainer) renderWealthLoans(wealthContainer);
}

function setLoanViewMode(mode) {
  window._loanViewMode = mode;
  const wealthContainer = document.querySelector('#wealth-tab-content') || document.querySelector('#loansOverview');
  if (wealthContainer) renderWealthLoans(wealthContainer);
}

function toggleLoanHistory(loanId) {
  const el = document.getElementById(`loan_history_${loanId}`);
  if (el) {
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  }
}

// ------------------------------------------------------------
// 3. LIVE INTEREST PREVIEW CALCULATOR
// ------------------------------------------------------------
function updateLoanLiveInterestPreview(prefix = '') {
  const amountInput = document.getElementById(prefix + 'loanAmount') || document.getElementById(prefix + 'loanAmountPopup');
  const rateInput = document.getElementById(prefix + 'loanInterestRate');
  const startInput = document.getElementById(prefix + 'loanStartDate');
  const dueInput = document.getElementById(prefix + 'loanDueDate') || document.getElementById(prefix + 'loanDueDatePopup');
  const previewBox = document.getElementById(prefix + 'loanInterestPreviewBox');
  if (!previewBox) return;

  const P = toNum(amountInput ? amountInput.value : 0);
  const r = toNum(rateInput ? rateInput.value : 0);

  if (P <= 0 || r <= 0) {
    previewBox.style.display = 'none';
    return;
  }

  previewBox.style.display = 'block';
  const monthlyInt = (P * (r / 100)) / 12;
  const annualInt = P * (r / 100);

  let tenureDays = 0;
  let tenureInt = 0;
  let tenureText = '';

  const startVal = startInput ? startInput.value : '';
  const dueVal = dueInput ? dueInput.value : '';

  if (startVal && dueVal) {
    const s = new Date(startVal);
    const d = new Date(dueVal);
    if (!isNaN(s.getTime()) && !isNaN(d.getTime()) && d >= s) {
      tenureDays = Math.max(0, Math.floor((d - s) / (1000 * 60 * 60 * 24)));
      tenureInt = P * (r / 100) * (tenureDays / 365);
      tenureText = `(${tenureDays} days)`;
    }
  }

  const totalExpected = P + (tenureInt > 0 ? tenureInt : annualInt);

  previewBox.innerHTML = `
    <div style="background:rgba(20,184,166,0.08);border:1px solid rgba(20,184,166,0.25);border-radius:10px;padding:10px 12px;font-size:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-weight:600;color:var(--teal);">✨ Interest Preview (${r}% p.a.)</span>
        <span style="color:var(--text-3);font-size:11px;">Simple Interest</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:11.5px;">
        <div>
          <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Monthly Interest</div>
          <div style="font-weight:600;color:var(--text);">${fmtINR(monthlyInt)} / mo</div>
        </div>
        <div>
          <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Annual Interest</div>
          <div style="font-weight:600;color:var(--text);">${fmtINR(annualInt)} / yr</div>
        </div>
        ${tenureDays > 0 ? `
          <div>
            <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Interest to Due Date ${tenureText}</div>
            <div style="font-weight:600;color:var(--gold);">${fmtINR(tenureInt)}</div>
          </div>
          <div>
            <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Total Expected ${tenureText}</div>
            <div style="font-weight:700;color:var(--emerald);">${fmtINR(totalExpected)}</div>
          </div>
        ` : `
          <div style="grid-column: span 2;">
            <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Principal + 1 Year Interest</div>
            <div style="font-weight:700;color:var(--emerald);">${fmtINR(P + annualInt)}</div>
          </div>
        `}
      </div>
    </div>
  `;
}

// ------------------------------------------------------------
// 4. MODAL: RECORD REPAYMENT / PARTIAL COLLECTION
// ------------------------------------------------------------
function openRepayLoanModal(loanId) {
  const loan = (state.loans || []).find(l => String(l.id) === String(loanId));
  if (!loan) {
    if (typeof showToast === 'function') showToast('Loan not found', 'error');
    return;
  }

  const fin = getLoanFinancialDetails(loan);
  const loanAccounts = state.dropdowns.accounts || ['Cash', 'Bank Account'];
  const todayStr = nowISO1().split('T')[0];
  const isGiven = loan.type === 'given';
  const typeLabel = isGiven ? '💸 Given (Lent)' : '📥 Taken (Borrowed)';
  const actionName = isGiven ? 'Collect Repayment' : 'Make Repayment';

  const modalHtml = `
    <div class="modal-overlay show" id="repayLoanModalOverlay">
      <div class="modal" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title">💳 ${actionName}</h3>
          <button class="modal-close" onclick="closeRepayLoanModal()">×</button>
        </div>
        <div class="modal-body">
          <!-- Loan Info Strip -->
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-weight:700;font-size:15px;color:var(--text);display:flex;align-items:center;gap:6px;">
                <span>${escapeHtml(loan.person)}</span>
                <span class="loan-badge ${isGiven ? 'badge-given' : 'badge-taken'}">${typeLabel}</span>
              </div>
              <span style="font-size:12px;color:var(--text-3);">${loan.dueDate ? `Due: ${loan.dueDate}` : ''}</span>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px;">
              <div>
                <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Principal</div>
                <div style="font-weight:600;color:var(--text);">${fmtINR(fin.principal)}</div>
              </div>
              <div>
                <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Interest (${fin.interestRate}% p.a.)</div>
                <div style="font-weight:600;color:var(--gold);">+${fmtINR(fin.accruedInterest)}</div>
              </div>
              <div>
                <div style="color:var(--text-3);font-size:10px;text-transform:uppercase;">Repaid So Far</div>
                <div style="font-weight:600;color:var(--emerald);">${fmtINR(fin.totalRepaid)}</div>
              </div>
            </div>
            <div style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--border);display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;font-weight:600;color:var(--text-2);">Outstanding Balance:</span>
              <span style="font-family:var(--font-m);font-size:18px;font-weight:700;color:${isGiven ? 'var(--emerald)' : 'var(--rose)'};">${fmtINR(fin.totalBalance)}</span>
            </div>
          </div>

          <form id="repayLoanForm" class="space-y-4">
            <!-- Quick Preset Buttons -->
            <div>
              <label class="text-xs text-slate-400 uppercase mb-1.5 block font-semibold">Quick Amounts</label>
              <div style="display:flex;gap:6px;flex-wrap:wrap;">
                <button type="button" class="loan-preset-btn" onclick="setRepayAmount(${fin.totalBalance})">Full (₹${fin.totalBalance.toFixed(0)})</button>
                ${fin.unpaidInterest > 0 ? `<button type="button" class="loan-preset-btn" onclick="setRepayAmount(${fin.unpaidInterest})">Interest (₹${fin.unpaidInterest.toFixed(0)})</button>` : ''}
                ${fin.totalBalance > 100 ? `<button type="button" class="loan-preset-btn" onclick="setRepayAmount(${Math.round(fin.totalBalance / 2)})">50% (₹${Math.round(fin.totalBalance / 2)})</button>` : ''}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 uppercase mb-1 block font-semibold">Repayment Amount (₹) *</label>
                <input id="repayAmount" type="number" min="0.01" step="0.01" value="${fin.totalBalance > 0 ? fin.totalBalance : ''}" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm font-semibold" oninput="handleRepayAmountChange(${fin.totalBalance})" />
              </div>
              <div>
                <label class="text-xs text-slate-400 uppercase mb-1 block font-semibold">Payment Date *</label>
                <input id="repayDate" type="date" value="${todayStr}" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" />
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-400 uppercase mb-1 block font-semibold">Payment Account</label>
              <select id="repayAccount" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm">
                ${loanAccounts.map(a => `<option value="${a}" ${loan.loanAccount === a ? 'selected' : ''}>${a}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="text-xs text-slate-400 uppercase mb-1 block font-semibold">Note / Remarks</label>
              <input id="repayNote" placeholder="e.g. Partial collection via UPI / Cash" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" />
            </div>

            <div class="space-y-2 pt-2 border-t border-[var(--border)]">
              <label class="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" id="repayRecordTx" checked />
                <span>💰 Record transaction in Ledger (${isGiven ? 'Income / In' : 'Expense / Out'})</span>
              </label>
              <label class="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" id="repayMarkSettled" ${fin.totalBalance <= 0.5 ? 'checked' : ''} />
                <span>✅ Mark Loan as Fully Settled</span>
              </label>
            </div>

            <button type="submit" class="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 font-bold text-sm transition shadow-md mt-2">
              💾 Record Repayment
            </button>
          </form>
        </div>
      </div>
    </div>
  `;

  let modalContainer = document.getElementById('globalModals');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'globalModals';
    document.body.appendChild(modalContainer);
  }
  modalContainer.innerHTML = modalHtml;

  // Submit handler
  document.getElementById('repayLoanForm').onsubmit = async (e) => {
    e.preventDefault();
    const repAmount = Number(document.getElementById('repayAmount').value);
    const repDate = document.getElementById('repayDate').value || todayStr;
    const repAccount = document.getElementById('repayAccount').value || 'Cash';
    const repNote = document.getElementById('repayNote').value.trim();
    const recordTx = document.getElementById('repayRecordTx').checked;
    const markSettled = document.getElementById('repayMarkSettled').checked;

    if (!repAmount || repAmount <= 0) {
      if (typeof showToast === 'function') showToast('Please enter a valid amount', 'error');
      return;
    }

    if (!Array.isArray(loan.repayments)) loan.repayments = [];

    const newRep = {
      id: uid('rep'),
      date: repDate,
      amount: repAmount,
      account: repAccount,
      note: repNote,
      createdAt: nowISO1()
    };
    loan.repayments.push(newRep);

    // Recalculate financial status
    const updatedFin = getLoanFinancialDetails(loan);
    if (markSettled || updatedFin.totalBalance <= 0.5) {
      loan.collected = true;
      loan.collectedAt = nowISO1();
    } else {
      loan.collected = false;
    }

    // Record transaction
    if (recordTx) {
      await recordLoanRepaymentTransaction(loan, newRep);
    }

    await put('loans', loan);
    if (typeof autoBackup === 'function') autoBackup();
    if (typeof showToast === 'function') showToast(`Recorded repayment of ${fmtINR(repAmount)}!`, 'success');
    closeRepayLoanModal();

    const wealthContainer = document.querySelector('#wealth-tab-content') || document.querySelector('#loansOverview');
    if (wealthContainer && typeof renderWealthLoans === 'function') renderWealthLoans(wealthContainer);
  };
}

function setRepayAmount(amt) {
  const input = document.getElementById('repayAmount');
  if (input) {
    input.value = Number(amt).toFixed(2);
    input.dispatchEvent(new Event('input'));
  }
}

function handleRepayAmountChange(totalBal) {
  const input = document.getElementById('repayAmount');
  const checkbox = document.getElementById('repayMarkSettled');
  if (input && checkbox) {
    const val = Number(input.value) || 0;
    checkbox.checked = val >= (totalBal - 0.5);
  }
}

function closeRepayLoanModal() {
  const overlay = document.getElementById('repayLoanModalOverlay');
  if (overlay) overlay.classList.remove('show');
  setTimeout(() => {
    const container = document.getElementById('globalModals');
    if (container) container.innerHTML = '';
  }, 200);
}

// Record repayment in main transactions ledger
async function recordLoanRepaymentTransaction(loan, repayment) {
  if (!repayment || !loan) return;
  const isGiven = loan.type === 'given';
  const tx = {
    id: uid('tx'),
    date: repayment.date || nowISO1().split('T')[0],
    type: isGiven ? 'in' : 'out', // Given collected = cash in, Taken paid = cash out
    amount: repayment.amount,
    account: repayment.account || loan.loanAccount || 'Cash',
    category: loan.category || 'Loan Repayment',
    recurrence: '',
    note: `Loan repayment ${isGiven ? 'from' : 'to'} ${loan.person}${repayment.note ? `: ${repayment.note}` : ''}`,
    createdAt: nowISO1()
  };
  if (typeof put === 'function') await put('transactions', tx);
  if (Array.isArray(state.transactions)) state.transactions.push(tx);
  if (typeof refreshRecentList === 'function') refreshRecentList();
  if (typeof renderAll === 'function') renderAll();
}

// Delete repayment record
async function deleteLoanRepayment(loanId, repId) {
  const loan = (state.loans || []).find(l => String(l.id) === String(loanId));
  if (!loan || !Array.isArray(loan.repayments)) return;
  if (!confirm('Delete this repayment record?')) return;

  loan.repayments = loan.repayments.filter(r => String(r.id) !== String(repId));
  const updatedFin = getLoanFinancialDetails(loan);
  loan.collected = updatedFin.totalBalance <= 0.5;
  if (!loan.collected) loan.collectedAt = null;

  await put('loans', loan);
  if (typeof autoBackup === 'function') autoBackup();
  if (typeof showToast === 'function') showToast('Repayment record deleted', 'info');

  const wealthContainer = document.querySelector('#wealth-tab-content') || document.querySelector('#loansOverview');
  if (wealthContainer && typeof renderWealthLoans === 'function') renderWealthLoans(wealthContainer);
}

// ------------------------------------------------------------
// 5. LOAN CRUD HELPERS (Delete / Reopen / By-ID)
// ------------------------------------------------------------
async function deleteLoanById(loanId) {
  const loan = (state.loans || []).find(l => String(l.id) === String(loanId));
  if (!loan) return;
  if (!confirm(`Delete loan for ${loan.person}?`)) return;

  await del('loans', loan.id);
  state.loans = state.loans.filter(l => l.id !== loan.id);

  // delete linked reminders
  const linkedReminders = (state.reminders || []).filter(r => r.title?.includes(loan.person) && r.dueDate === loan.dueDate);
  for (const r of linkedReminders) await del('reminders', r.id);
  state.reminders = (state.reminders || []).filter(r => !linkedReminders.includes(r));

  if (typeof handleLoanTransaction === 'function') await handleLoanTransaction(loan, false);
  if (typeof autoBackup === 'function') autoBackup();
  if (typeof showToast === 'function') showToast('Loan deleted', 'success');

  const wealthContainer = document.querySelector('#wealth-tab-content') || document.querySelector('#loansOverview');
  if (wealthContainer && typeof renderWealthLoans === 'function') renderWealthLoans(wealthContainer);
}

async function reopenLoanById(loanId) {
  const loan = (state.loans || []).find(l => String(l.id) === String(loanId));
  if (!loan) return;
  loan.collected = false;
  loan.collectedAt = null;
  await put('loans', loan);
  if (typeof autoBackup === 'function') autoBackup();
  if (typeof showToast === 'function') showToast('Loan marked as active ⏳', 'info');

  const wealthContainer = document.querySelector('#wealth-tab-content') || document.querySelector('#loansOverview');
  if (wealthContainer && typeof renderWealthLoans === 'function') renderWealthLoans(wealthContainer);
}

function openEditLoanModalById(loanId) {
  const loan = (state.loans || []).find(l => String(l.id) === String(loanId));
  if (!loan) return;
  openEditLoanModal(loan);
}

// ------------------------------------------------------------
// 6. MODAL: ADD LOAN (Upgraded with Interest % & Live Preview)
// ------------------------------------------------------------
function openAddLoanModal(prefill = {}) {
  ensureDropdownKey('persons');
  ensureDropdownKey('categories');
  ensureDropdownKey('recurrences');
  ensureDropdownKey('loanCategories');

  const persons = state.dropdowns.persons || [];
  const categories = state.dropdowns.categories || [];
  const loanAccounts = state.dropdowns.accounts || ['Cash', 'Bank Account'];
  const recurrences = (state.dropdowns.recurrences && state.dropdowns.recurrences.length)
    ? state.dropdowns.recurrences : ['None', 'daily', 'weekly', 'monthly', 'yearly'];
  const todayStr = nowISO1().split('T')[0];

  const modalHtml = `
    <div class="modal-overlay show" id="addLoanModalOverlay">
      <div class="modal" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title">➕ Add Personal Loan</h3>
          <button class="modal-close" onclick="closeAddLoanModal()">×</button>
        </div>
        <div class="modal-body">
          <form id="addLoanFormPopup" class="space-y-4">
            <!-- Type Selector -->
            <div class="flex gap-2">
              <button type="button" class="type-btn given flex-1 py-2 rounded-lg text-sm font-bold border border-emerald-500/50 bg-emerald-500/20 text-emerald-400" data-type="given">💸 Given (You Lent)</button>
              <button type="button" class="type-btn taken flex-1 py-2 rounded-lg text-sm font-semibold border border-[var(--border)] text-slate-400" data-type="taken">📥 Taken (You Borrowed)</button>
            </div>
            <input type="hidden" id="loanTypePopup" value="given" />

            <!-- Person Selection -->
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <label class="text-xs text-slate-400 uppercase font-semibold">Person(s)</label>
                <span style="font-size:11px;color:var(--text-3);">Select existing or enter new</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div id="loanPersonCheckboxesPopup" class="max-h-36 overflow-y-auto p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] space-y-1">
                  ${persons.map(p => `<label class="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" value="${escapeHtml(p)}" class="personCheckbox"> ${escapeHtml(p)}</label>`).join('')}
                </div>
                <div>
                  <input id="loanNewPersonInput" type="text" placeholder="+ Type new person name" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs mb-2" />
                  <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Account</label>
                  <select id="loanAccountPopup" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs">
                    ${loanAccounts.map(a => `<option value="${a}">${a}</option>`).join('')}
                  </select>
                </div>
              </div>
            </div>

            <!-- Amount & Interest Rate -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Principal Amount (₹) *</label>
                <input id="loanAmountPopup" type="number" min="1" step="0.01" placeholder="0.00" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm font-semibold" oninput="updateLoanLiveInterestPreview('')" />
              </div>
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Interest Rate (% p.a.)</label>
                <input id="loanInterestRate" type="number" min="0" max="100" step="0.01" placeholder="0% (Optional)" value="" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" oninput="updateLoanLiveInterestPreview('')" />
              </div>
            </div>

            <!-- Live Interest Calculation Preview Box -->
            <div id="loanInterestPreviewBox" style="display:none;"></div>

            <!-- Dates -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Start Date</label>
                <input id="loanStartDate" type="date" value="${todayStr}" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs" oninput="updateLoanLiveInterestPreview('')" />
              </div>
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Due Date *</label>
                <input id="loanDueDatePopup" type="date" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs" oninput="updateLoanLiveInterestPreview('')" />
              </div>
            </div>

            <!-- Category & Recurrence -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Category</label>
                <select id="loanCategoryPopup" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs">
                  ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Recurrence</label>
                <select id="loanRecurrencePopup" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs">
                  ${recurrences.map(r => `<option value="${r.toLowerCase()}" ${r.toLowerCase() === 'none' ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Note -->
            <div>
              <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Note / Purpose</label>
              <input id="loanNotePopup" placeholder="e.g. Emergency funds / Travel loan" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs" />
            </div>

            <!-- Options -->
            <div class="flex flex-wrap gap-4 pt-1">
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" id="addReminderPopup" /> 🔔 Create Reminder
              </label>
              <label class="flex items-center gap-1.5 text-xs cursor-pointer">
                <input type="checkbox" id="AddTransactionPopup" checked /> 💰 Record in Transactions
              </label>
            </div>

            <button type="submit" class="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-900 font-bold text-sm transition shadow-md">
              ➕ Save Loan
            </button>
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
    let selectedPersons = Array.from(document.querySelectorAll('#loanPersonCheckboxesPopup .personCheckbox:checked')).map(cb => cb.value);
    const newPersonName = (document.getElementById('loanNewPersonInput').value || '').trim();
    if (newPersonName && !selectedPersons.includes(newPersonName)) {
      selectedPersons.push(newPersonName);
      if (!state.dropdowns.persons.includes(newPersonName)) {
        state.dropdowns.persons.push(newPersonName);
        if (typeof put === 'function') await put('dropdowns', state.dropdowns);
      }
    }

    const amount = Number(document.getElementById('loanAmountPopup').value);
    const interestRate = Number(document.getElementById('loanInterestRate').value) || 0;
    const startDate = document.getElementById('loanStartDate').value || todayStr;
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
      const candidate = {
        person,
        type,
        amount: splitAmount,
        interestRate,
        startDate,
        dueDate,
        note,
        category,
        recurrence,
        loanAccount,
        addTransaction,
        repayments: []
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
      if (!Array.isArray(state.loans)) state.loans = [];
      state.loans.push(newLoan);

      if (typeof handleLoanTransaction === 'function') await handleLoanTransaction(newLoan, addTransaction);

      if (addReminder) {
        const rem = {
          id: uid('rem'),
          title: `Loan due: ${person}`,
          dueDate,
          note: `Loan of ${fmtINR(splitAmount)} due for ${person}${interestRate > 0 ? ` (${interestRate}% interest)` : ''}`,
          recurrence,
          completed: false,
          completedLog: []
        };
        await put('reminders', rem);
        if (!Array.isArray(state.reminders)) state.reminders = [];
        state.reminders.push(rem);
      }
    }

    if (typeof handleRecurringLoans === 'function') await handleRecurringLoans();
    if (typeof autoBackup === 'function') autoBackup();
    if (typeof showToast === 'function') showToast('Loan(s) added successfully!', 'success');
    closeAddLoanModal();

    const wealthContainer = document.querySelector('#wealth-tab-content') || document.querySelector('#loansOverview');
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
// 7. MODAL: EDIT LOAN (Upgraded with Interest % & Live Preview)
// ------------------------------------------------------------
function openEditLoanModal(loan, onSaveCallback) {
  const persons = state.dropdowns.persons || [];
  const categories = state.dropdowns.categories || [];
  const loanAccounts = state.dropdowns.accounts || ['Cash', 'Bank Account'];
  const recurrences = (state.dropdowns.recurrences && state.dropdowns.recurrences.length)
    ? state.dropdowns.recurrences : ['None', 'daily', 'weekly', 'monthly', 'yearly'];
  const startVal = loan.startDate || (loan.createdAt ? loan.createdAt.split('T')[0] : '');

  const editModalHtml = `
    <div class="modal-overlay show" id="editLoanModalOverlay">
      <div class="modal" style="max-width: 520px;">
        <div class="modal-header">
          <h3 class="modal-title">✏️ Edit Personal Loan</h3>
          <button class="modal-close" onclick="closeEditLoanModal()">×</button>
        </div>
        <div class="modal-body">
          <form id="editLoanFormPopup" class="space-y-4">
            <div class="flex gap-2">
              <button type="button" class="edit-type-btn given flex-1 py-2 rounded-lg text-sm font-bold border ${loan.type === 'given' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'border-[var(--border)] text-slate-400'}" data-type="given">💸 Given</button>
              <button type="button" class="edit-type-btn taken flex-1 py-2 rounded-lg text-sm font-bold border ${loan.type === 'taken' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'border-[var(--border)] text-slate-400'}" data-type="taken">📥 Taken</button>
            </div>
            <input type="hidden" id="editLoanType" value="${loan.type}" />

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Person</label>
                <select id="editLoanPerson" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs">
                  ${persons.map(p => `<option value="${p}" ${loan.person === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Account</label>
                <select id="editLoanAccount" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs">
                  ${loanAccounts.map(a => `<option value="${a}" ${loan.loanAccount === a ? 'selected' : ''}>${a}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Principal Amount (₹) *</label>
                <input id="editLoanAmount" type="number" min="1" step="0.01" value="${loan.amount}" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm font-semibold" oninput="updateLoanLiveInterestPreview('edit_')" />
              </div>
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Interest Rate (% p.a.)</label>
                <input id="edit_loanInterestRate" type="number" min="0" max="100" step="0.01" placeholder="0.00" value="${loan.interestRate || 0}" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-sm" oninput="updateLoanLiveInterestPreview('edit_')" />
              </div>
            </div>

            <!-- Live Interest Preview -->
            <div id="edit_loanInterestPreviewBox" style="display:none;"></div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Start Date</label>
                <input id="edit_loanStartDate" type="date" value="${startVal}" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs" oninput="updateLoanLiveInterestPreview('edit_')" />
              </div>
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Due Date *</label>
                <input id="editLoanDueDate" type="date" value="${loan.dueDate || ''}" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs" oninput="updateLoanLiveInterestPreview('edit_')" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Category</label>
                <select id="editLoanCategory" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs">
                  ${categories.map(c => `<option value="${c}" ${loan.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Recurrence</label>
                <select id="editLoanRecurrence" required class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs">
                  ${recurrences.map(r => `<option value="${r.toLowerCase()}" ${loan.recurrence === r.toLowerCase() ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Note</label>
              <input id="editLoanNote" value="${escapeHtml(loan.note || '')}" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs" />
            </div>

            ${loan.recurrence && loan.recurrence !== 'None' ? `
              <div>
                <label class="text-xs text-slate-400 uppercase font-semibold block mb-1">Scope</label>
                <select id="editScope" class="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--bg3)] text-xs">
                  <option value="this">Only This Loan</option>
                  <option value="future">This and Future Loans</option>
                  <option value="all">All Loans in Series</option>
                </select>
              </div>
            ` : ''}

            <label class="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" id="editLoanCollected" ${loan.collected ? 'checked' : ''} />
              <span>✅ Mark as Fully Settled / Collected</span>
            </label>

            <button type="submit" class="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold text-sm transition">
              💾 Save Changes
            </button>
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

  // Type toggle
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

  // Initial preview trigger
  updateLoanLiveInterestPreview('edit_');

  document.getElementById('editLoanFormPopup').onsubmit = async (e) => {
    e.preventDefault();
    const updates = {
      type: document.getElementById('editLoanType').value,
      person: document.getElementById('editLoanPerson').value,
      amount: Number(document.getElementById('editLoanAmount').value),
      interestRate: Number(document.getElementById('edit_loanInterestRate').value) || 0,
      startDate: document.getElementById('edit_loanStartDate').value,
      dueDate: document.getElementById('editLoanDueDate').value,
      note: document.getElementById('editLoanNote').value,
      category: document.getElementById('editLoanCategory').value || 'Loan',
      recurrence: document.getElementById('editLoanRecurrence').value || 'None',
      collected: document.getElementById('editLoanCollected').checked,
      modifiedAt: nowISO1(),
      loanAccount: document.getElementById('editLoanAccount').value || 'Cash'
    };

    Object.assign(loan, updates);
    if (updates.recurrence && updates.recurrence !== 'None' && !loan.seriesId) loan.seriesId = uid('series');
    if (!updates.recurrence || updates.recurrence === 'None') loan.seriesId = null;
    await put('loans', loan);

    if (typeof autoBackup === 'function') autoBackup();
    if (typeof showToast === 'function') showToast('Loan updated', 'success');
    closeEditLoanModal();

    if (onSaveCallback) onSaveCallback();
    else {
      const wealthContainer = document.querySelector('#wealth-tab-content') || document.querySelector('#loansOverview');
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
// 8. HELPER: Floating Action Button
// ------------------------------------------------------------
function ensureFAB() {
  if (document.getElementById('wealthLoansFAB')) return;
  const fab = document.createElement('button');
  fab.id = 'wealthLoansFAB';
  fab.innerHTML = '+';
  fab.style.display = 'flex';
  fab.style.alignItems = 'center';
  fab.style.justifyContent = 'center';
  fab.style.position = 'fixed';
  fab.style.bottom = '5rem';
  fab.style.right = '16px';
  fab.style.width = '56px';
  fab.style.height = '56px';
  fab.style.borderRadius = '50%';
  fab.style.backgroundColor = '#10b981';
  fab.style.color = 'white';
  fab.style.fontSize = '28px';
  fab.style.fontWeight = 'normal';
  fab.style.lineHeight = '1';
  fab.style.border = 'none';
  fab.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  fab.style.zIndex = '9999';
  fab.style.cursor = 'pointer';
  fab.onclick = () => openAddLoanModal();
  document.body.appendChild(fab);
}

// ------------------------------------------------------------
// 9. UTILITY: loanKey (for duplicate detection)
// ------------------------------------------------------------
function loanKey(loan) {
  return `${loan.person}|${loan.type}|${loan.amount}|${loan.dueDate}|${loan.category || ''}`;
}

// ------------------------------------------------------------
// 10. ACCORDION TOGGLE (for per‑person expandable rows)
// ------------------------------------------------------------
function togglePersonLoans(rowId) {
  const row = document.getElementById(rowId);
  const icon = document.getElementById(rowId + '_icon');
  if (!row) return;
  const visible = row.style.display !== 'none';
  row.style.display = visible ? 'none' : '';
  if (icon) icon.textContent = visible ? '▼' : '▲';
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
              ${d!==0?`<div style="font-size:11px;color:${d>=0?'var(--emerald)':'var(--rose)'};display:inline-flex;align-items:center;gap:2px;">${d>=0?'<span class="live-arrow-up">▲</span> +':'<span class="live-arrow-down">▼</span> '}${fmtINR(d)}</div>`:''}
            </div>
            <button onclick="deleteNetWorthSnapshot('${s.id}')"
                    style="background:none;border:none;cursor:pointer;color:var(--text-3);padding:4px;margin-left:4px;">×</button>
          </div>`;
        }).join('')
      + `</div>`;

  // Net worth as % of FI target (25× annual expense) for ring
  const annualExp = (DataEngine?.getTransactionAverages?.()?.avgExpense || 0) * 12;
  const fiTarget  = annualExp > 0 ? annualExp * 25 : 0;
  const fiPct     = fiTarget > 0 ? Math.min(100, (nw / fiTarget) * 100) : 0;
  const ringR     = 42, ringC = 50, ringCirc = 2 * Math.PI * ringR;
  const ringOffset = ringCirc * (1 - fiPct / 100);
  const ringColor  = nw >= 0 ? 'var(--teal)' : 'var(--rose)';

  container.innerHTML = `
    <div class="chart-card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;justify-content:center;">
        <!-- Animated SVG ring -->
        <div style="position:relative;flex-shrink:0;">
          <svg class="nw-ring" width="100" height="100" viewBox="0 0 100 100">
            <circle class="nw-ring-track" cx="${ringC}" cy="${ringC}" r="${ringR}" stroke-width="8"/>
            <circle class="nw-ring-fill" id="nwRingFill"
              cx="${ringC}" cy="${ringC}" r="${ringR}" stroke-width="8"
              stroke="${ringColor}"
              stroke-dasharray="${ringCirc}"
              stroke-dashoffset="${ringCirc}"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
            <span style="font-family:var(--font-m);font-size:13px;font-weight:700;color:${ringColor};">${fiPct.toFixed(0)}%</span>
            <span style="font-size:9px;color:var(--text-3);">to FI</span>
          </div>
        </div>
        <div style="text-align:center;flex:1;min-width:160px;">
          <div class="kpi-label" style="margin-bottom:6px;">YOUR CURRENT NET WORTH</div>
          <div class="score-reveal" style="font-family:var(--font-m);font-size:clamp(24px,4vw,36px);font-weight:700;color:${nw>=0?'var(--teal)':'var(--rose)'};" id="nwBigVal">${fmtINR(nw)}</div>
          ${change!==0?`<div style="margin-top:6px;font-size:13px;color:${change>=0?'var(--emerald)':'var(--rose)'};">
            ${change>=0?'↑':'↓'} ${fmtINR(Math.abs(change))} from last snapshot</div>`:''}
          ${fiTarget>0?`<div style="font-size:11px;color:var(--text-3);margin-top:4px;">FI Target: ${fmtINR(fiTarget)}</div>`:''}
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px;
                  padding-top:16px;border-top:1px solid var(--border);">
        <div class="card-enter ce-1">
          <div class="kpi-label">ASSETS</div>
          <div style="font-family:var(--font-m);font-size:16px;font-weight:600;color:var(--emerald);" id="nwAssetVal">${fmtINR(assets)}</div>
        </div>
        <div class="card-enter ce-2">
          <div class="kpi-label">LIABILITIES</div>
          <div style="font-family:var(--font-m);font-size:16px;font-weight:600;color:${liabilities>0?'var(--rose)':'var(--text-3)'};" id="nwLiabVal">${fmtINR(liabilities)}</div>
        </div>
        <div class="card-enter ce-3">
          <div class="kpi-label">PERSONAL LOANS NET</div>
          <div style="font-family:var(--font-m);font-size:16px;font-weight:600;color:${personalNet>=0?'var(--emerald)':'var(--rose)'};" id="nwLoanVal">
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

  // Animate ring + counters
  setTimeout(() => {
    const ring = document.getElementById('nwRingFill');
    if (ring) ring.style.strokeDashoffset = String(ringOffset);
    wealthAnimateValue(document.getElementById('nwBigVal'),  nw,          900);
    wealthAnimateValue(document.getElementById('nwAssetVal'), assets,     700);
    wealthAnimateValue(document.getElementById('nwLiabVal'),  liabilities, 800);
    wealthAnimateValue(document.getElementById('nwLoanVal'),  personalNet, 750);
  }, 60);

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
window.setLoanSubtab = setLoanSubtab;
window.handleLoanSearch = handleLoanSearch;
window.setLoanViewMode = setLoanViewMode;
window.openRepayLoanModal = openRepayLoanModal;
window.closeRepayLoanModal = closeRepayLoanModal;
window.setRepayAmount = setRepayAmount;
window.handleRepayAmountChange = handleRepayAmountChange;
window.deleteLoanRepayment = deleteLoanRepayment;
window.toggleLoanHistory = toggleLoanHistory;
window.deleteLoanById = deleteLoanById;
window.reopenLoanById = reopenLoanById;
window.openEditLoanModalById = openEditLoanModalById;
window.openAddLoanModal = openAddLoanModal;
window.closeAddLoanModal = closeAddLoanModal;
window.openEditLoanModal = openEditLoanModal;
window.closeEditLoanModal = closeEditLoanModal;
window.updateLoanLiveInterestPreview = updateLoanLiveInterestPreview;
window.getLoanFinancialDetails = getLoanFinancialDetails;
window.getLoanSummary = getLoanSummary;
window.buildLoanGroups = buildLoanGroups;
window.isAssetClosedOrMatured = isAssetClosedOrMatured;
window.getAssetCurrentValue = getAssetCurrentValue;
window.getAssetInvestedAmount = getAssetInvestedAmount;
window.calculateAssetMaturityValue = calculateAssetMaturityValue;
window.calculateMaturity = window.calculateMaturity || calculateAssetMaturityValue;
window.getAssetCategory = getAssetCategory;
window.getTotalAssets = getTotalAssets;
window.ASSET_CATEGORIES = ASSET_CATEGORIES;
window.LM_Wealth = {
  isAssetClosedOrMatured,
  getAssetCurrentValue,
  getAssetInvestedAmount,
  calculateAssetMaturityValue,
  getAssetCategory,
  getTotalAssets,
  ASSET_CATEGORIES,
  getLoanFinancialDetails,
  getLoanSummary,
  buildLoanGroups,
  renderWealthLoans,
  openRepayLoanModal,
  openAddLoanModal,
  openEditLoanModal
};