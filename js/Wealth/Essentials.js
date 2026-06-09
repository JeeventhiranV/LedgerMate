/* =============================================================
   LedgerMate — Essentials: Enterprise Health, Predictions & Goals
   ─────────────────────────────────────────────────────────────
   All metrics AUTO-DERIVED from real data:
   ✓ Income / Expense / Savings → 3-month transaction average
   ✓ Liquid Assets → Cash/Savings investments + transaction balance
   ✓ Debt Ratio → EMI loans + personal loans vs total assets
   ✓ FI Score → 4% rule against projected net worth
   ✓ Predictions: FI Timeline, Wealth Milestones, Debt-Free Date
   ✓ Spending Insights: Category trends, MoM delta, anomalies
   ✓ Tabs: Health | Goals | Retirement | Debt Payoff
   ============================================================= */

// ─── SAFE FALLBACKS ───────────────────────────────────────────
if (typeof toNum    !== 'function') window.toNum    = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
if (typeof fmtINR   !== 'function') window.fmtINR   = n => '₹' + toNum(n).toLocaleString('en-IN');
if (typeof nowISO   !== 'function') window.nowISO   = () => new Date().toISOString().slice(0,10);
if (typeof showToast!== 'function') window.showToast= (m) => console.log(m);
if (typeof uid      !== 'function') window.uid      = p => p + '_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
if (typeof getNetWorth       !== 'function') window.getNetWorth       = () => 0;
if (typeof getTotalAssets    !== 'function') window.getTotalAssets    = () => 0;
if (typeof getTotalLiabilities !== 'function') window.getTotalLiabilities = () => 0;

// ─── CONSTANTS ────────────────────────────────────────────────
const RETIREMENT_CONFIG = {
  inflation: 6, preRetReturns: 10, postRetReturns: 7,
  withdrawalRate: 4, lifeExpectancy: 85
};
const HEALTH_CACHE_TTL = 300_000; // 5 min
let cachedHealthScore = null, lastHealthCalc = 0;

/* ─────────────────────────────────────────────────────────────
   DATA ENGINE — single source of truth for all metrics
───────────────────────────────────────────────────────────── */
const DataEngine = {
  /* Monthly income/expense averages from real transactions */
  getTransactionAverages(months = 3) {
    const txs = state.transactions || [];
    const now = new Date();
    let totalInc = 0, totalExp = 0, cnt = 0;
    const monthly = {};
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ms = d.toISOString().slice(0, 7);
      const mTxs = txs.filter(t => (t.date || '').startsWith(ms));
      const inc = mTxs.filter(t => t.type === 'in').reduce((s, t) => s + toNum(t.amount), 0);
      const exp = mTxs.filter(t => t.type === 'out').reduce((s, t) => s + toNum(t.amount), 0);
      monthly[ms] = { inc, exp };
      if (inc > 0 || exp > 0) { totalInc += inc; totalExp += exp; cnt++; }
    }
    return {
      avgIncome: cnt > 0 ? totalInc / cnt : 0,
      avgExpense: cnt > 0 ? totalExp / cnt : 0,
      months: cnt,
      monthly
    };
  },

  /* Auto-detect liquid assets from:
     1. Investments in Cash & Savings category
     2. Net balance of 'savings'/'cash' transaction categories */
  getLiquidAssets() {
    // From investments (most accurate)
    const cashTypes = ['CASH','SAVINGS','LIQUID','EPF','PPF'];
    const fromInvestments = (state.investments || [])
      .filter(inv => cashTypes.includes((inv.type || '').toUpperCase()) ||
                     (inv.wealthCategory === 'Cash & Savings'))
      .reduce((s, inv) => {
        if (typeof getAssetCurrentValue === 'function') return s + getAssetCurrentValue(inv);
        return s + toNum(inv.principal || inv.currentValue || inv.amount || 0);
      }, 0);

    // From savings-category transactions (as a proxy if no investments set)
    const savingsCats = ['savings','cash','bank','liquid','emergency','fd','fixed deposit'];
    const fromTxns = (state.transactions || [])
      .filter(t => savingsCats.some(k => (t.category || '').toLowerCase().includes(k)))
      .reduce((s, t) => s + (t.type === 'in' ? toNum(t.amount) : -toNum(t.amount)), 0);

    // Prefer investments-derived; fall back to manual then tx-derived
    const manual = toNum((state.essentials_settings || {}).liquidAssets);
    if (fromInvestments > 0) return { value: fromInvestments, source: 'investments' };
    if (manual > 0)          return { value: manual,           source: 'manual' };
    if (fromTxns > 0)        return { value: fromTxns,         source: 'transactions' };
    return { value: 0, source: 'none' };
  },

  /* Category spending breakdown — last 3 months */
  getCategoryBreakdown() {
    const txs = state.transactions || [];
    const now = new Date();
    const result = {};
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ms = d.toISOString().slice(0, 7);
      txs.filter(t => (t.date||'').startsWith(ms) && t.type === 'out').forEach(t => {
        const cat = t.category || 'Uncategorised';
        if (!result[cat]) result[cat] = { total: 0, months: {} };
        result[cat].total += toNum(t.amount);
        result[cat].months[ms] = (result[cat].months[ms] || 0) + toNum(t.amount);
      });
    }
    return result;
  },

  /* Anomaly detection — expenses > 2× category average */
  getAnomalies() {
    const breakdown = this.getCategoryBreakdown();
    const anomalies = [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    Object.entries(breakdown).forEach(([cat, data]) => {
      const months = Object.keys(data.months).filter(m => m !== currentMonth);
      if (months.length === 0) return;
      const historicalAvg = months.reduce((s, m) => s + data.months[m], 0) / months.length;
      const currentAmt = data.months[currentMonth] || 0;
      if (historicalAvg > 0 && currentAmt > historicalAvg * 1.8) {
        anomalies.push({ category: cat, current: currentAmt, historical: historicalAvg,
                         delta: currentAmt - historicalAvg, pct: ((currentAmt - historicalAvg) / historicalAvg * 100) });
      }
    });
    return anomalies.sort((a, b) => b.pct - a.pct);
  },

  /* Personal loan net balance from state.loans */
  getPersonalLoanBalance() {
    const loans = state.loans || [];
    const pending = loans.filter(l => !l.collected);
    const given = pending.filter(l => l.type === 'given').reduce((s, l) => s + toNum(l.amount), 0);
    const taken = pending.filter(l => l.type === 'taken').reduce((s, l) => s + toNum(l.amount), 0);
    return { given, taken, net: given - taken };
  },

  /* FI projections */
  computeProjections() {
    const { avgIncome, avgExpense } = this.getTransactionAverages();
    const savings    = Math.max(0, avgIncome - avgExpense);
    const nw         = getNetWorth();
    const annualExp  = avgExpense * 12;
    const fiTarget   = annualExp * 25;                        // 4% rule
    const remaining  = Math.max(0, fiTarget - nw);
    const cagr       = 0.10;                                  // assume 10% CAGR
    const monthRate  = cagr / 12;

    // Months to FI using future value formula
    let monthsToFI = Infinity;
    if (savings > 0 && monthRate > 0) {
      // FV = nw*(1+r)^n + sav*((1+r)^n - 1)/r ≥ fiTarget
      // solve numerically
      let cur = nw, mo = 0;
      while (cur < fiTarget && mo < 600) { cur = cur * (1 + monthRate) + savings; mo++; }
      monthsToFI = mo < 600 ? mo : Infinity;
    }
    const yearsToFI = isFinite(monthsToFI) ? (monthsToFI / 12).toFixed(1) : null;

    // Wealth milestones
    const MILESTONES = [100000, 500000, 1000000, 5000000, 10000000, 25000000, 100000000];
    const milestones = MILESTONES.map(target => {
      if (nw >= target) return { target, achieved: true, months: 0 };
      let cur = nw, mo = 0;
      while (cur < target && mo < 600) { cur = cur * (1 + monthRate) + savings; mo++; }
      return { target, achieved: false, months: mo < 600 ? mo : null };
    });

    // NW projections: 1y, 3y, 5y, 10y
    const project = (years) => {
      let cur = nw;
      for (let i = 0; i < years * 12; i++) cur = cur * (1 + monthRate) + savings;
      return cur;
    };
    const projections = [1, 3, 5, 10].map(y => ({ years: y, value: project(y) }));

    // Debt-free date (EMI loans)
    const emiLoans  = state.emi_loans || [];
    const debtFreeDate = emiLoans.length === 0 ? null : (() => {
      // Find the loan with latest due date
      const dueDates = emiLoans.filter(l => l.dueDate).map(l => new Date(l.dueDate));
      if (!dueDates.length) return null;
      return dueDates.sort((a, b) => b - a)[0].toISOString().slice(0, 10);
    })();

    return {
      fiTarget, yearsToFI, savings, avgIncome, avgExpense,
      milestones, projections, debtFreeDate,
      fiPct: fiTarget > 0 ? Math.min(100, (nw / fiTarget * 100)).toFixed(1) : 0
    };
  }
};

/* ─────────────────────────────────────────────────────────────
   HEALTH SCORE (fully auto-derived)
───────────────────────────────────────────────────────────── */
function calcHealthScore(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedHealthScore && (now - lastHealthCalc) < HEALTH_CACHE_TTL) return cachedHealthScore;

  try {
    let score = 0;
    const metrics = {};
    const es = state.essentials_settings || {};
    const { avgIncome, avgExpense } = DataEngine.getTransactionAverages();

    // ── 1. Savings Rate ──
    const manualIncome = toNum(es.monthlyIncome);
    const effectiveIncome = manualIncome > 0 ? manualIncome : avgIncome;
    const savingsRate = effectiveIncome > 0 ? ((effectiveIncome - avgExpense) / effectiveIncome * 100) : 0;
    let savingsScore = savingsRate >= 50 ? 2 : savingsRate >= 20 ? 1 : 0;
    metrics.savingsRate = {
      value: savingsRate.toFixed(1), score: savingsScore, max: 2,
      status: savingsScore===2?'perfect':savingsScore===1?'good':'risky',
      income: effectiveIncome, expense: avgExpense,
      incomeSource: manualIncome > 0 ? 'manual' : 'transactions'
    };
    score += savingsScore;

    // ── 2. Emergency Fund (AUTO from investments + txns) ──
    const { value: liquidAssets, source: liquidSource } = DataEngine.getLiquidAssets();
    const monthlyExpense = avgExpense || 1;
    const runway = monthlyExpense > 0 ? (liquidAssets / monthlyExpense).toFixed(1) : 0;
    let efScore = runway >= 6 ? 2 : runway >= 3 ? 1 : 0;
    metrics.emergencyFund = {
      value: runway, score: efScore, max: 2,
      status: efScore===2?'perfect':efScore===1?'good':'risky',
      liquidAssets, monthlyExpense, liquidSource
    };
    score += efScore;

    // ── 3. Term Insurance ──
    const termCover = toNum(es.termCover);
    const annualExpense = monthlyExpense * 12;
    const nw = getNetWorth();
    const idealTermCover = Math.max(0, (25 * annualExpense) - nw);
    let termScore = termCover >= idealTermCover * 0.8 ? 2 : termCover > 0 ? 1 : 0;
    metrics.termInsurance = {
      value: termCover, score: termScore, max: 2,
      status: termScore===2?'perfect':termScore>0?'good':'risky',
      idealCover: idealTermCover
    };
    score += termScore;

    // ── 4. Health Insurance ──
    const healthCover = toNum(es.healthCover);
    const dependents = Math.max(1, toNum(es.healthDependents || 1));
    const recommendedHealth = 500000 * dependents;
    const goodHealth        = 1000000 * dependents;
    let healthScore = healthCover >= goodHealth ? 2 : healthCover >= recommendedHealth ? 1 : 0;
    metrics.healthInsurance = {
      value: healthCover, score: healthScore, max: 2,
      status: healthScore===2?'perfect':healthScore>0?'good':'risky',
      dependents, recommendedHealth, goodHealth
    };
    score += healthScore;

    // ── 5. Debt Ratio (EMI + personal loans vs assets) ──
    const totalAssets = getTotalAssets();
    const emiLiab     = getTotalLiabilities();
    const personalLoan= DataEngine.getPersonalLoanBalance();
    const totalDebt   = emiLiab + personalLoan.taken; // money you OWE
    const debtRatio   = totalAssets > 0 ? (totalDebt / totalAssets * 100) : 0;
    let debtScore = debtRatio < 10 ? 2 : debtRatio < 30 ? 1 : 0;
    metrics.debtRatio = {
      value: debtRatio.toFixed(1), score: debtScore, max: 2,
      status: debtScore===2?'perfect':debtScore===1?'good':'risky',
      totalAssets, emiLiab, personalDebt: personalLoan.taken, totalDebt
    };
    score += debtScore;

    cachedHealthScore = { score, total: 10, metrics, avgIncome: effectiveIncome, avgExpense };
    lastHealthCalc = now;
    return cachedHealthScore;
  } catch (err) {
    console.error('[Essentials] calcHealthScore error', err);
    return { score: 0, total: 10, metrics: {}, avgIncome: 0, avgExpense: 0 };
  }
}

/* ─────────────────────────────────────────────────────────────
   PAGE SHELL
───────────────────────────────────────────────────────────── */
function showEssentialsPage() {
  const page = document.getElementById('page-essentials');
  if (!page) return;
  const activeTab = page.dataset.activeTab || 'health';

  // Quick pulse strip data from cached score
  const { score, metrics } = calcHealthScore();
  const scoreColor  = score >= 7 ? 'var(--emerald)' : score >= 4 ? 'var(--gold)' : 'var(--rose)';
  const scoreLabel  = score >= 7 ? 'Excellent' : score >= 4 ? 'Good' : 'Needs Work';
  const srPct       = parseFloat(metrics?.savingsRate?.value || 0).toFixed(0);
  const srColor     = parseFloat(srPct) >= 20 ? 'var(--emerald)' : parseFloat(srPct) >= 10 ? 'var(--gold)' : 'var(--rose)';
  const efVal       = parseFloat(metrics?.emergencyFund?.value || 0).toFixed(1);
  const efColor     = parseFloat(efVal) >= 6 ? 'var(--emerald)' : parseFloat(efVal) >= 3 ? 'var(--gold)' : 'var(--rose)';
  const drVal       = parseFloat(metrics?.debtRatio?.value || 0).toFixed(0);
  const drColor     = parseFloat(drVal) < 10 ? 'var(--emerald)' : parseFloat(drVal) < 30 ? 'var(--gold)' : 'var(--rose)';

  page.innerHTML = `
    <div class="page-header fade-up fade-up-1">
      <div>
        <div class="page-greeting">Your financial health check</div>
        <h1 class="page-title">Essentials <em>&amp; Goals</em></h1>
      </div>
      <div class="rt-live"><div class="rt-dot"></div><span>Live</span></div>
    </div>

    <!-- Financial Pulse Strip -->
    <div class="health-pulse-strip fade-up fade-up-2">
      <div class="hps-item s1" onclick="switchEssentialsTab('health')" title="Health Score">
        <div class="hps-icon">❤️</div>
        <div class="hps-score score-reveal" style="color:${scoreColor};">${score}/10</div>
        <div class="hps-label">${scoreLabel}</div>
      </div>
      <div class="hps-item s2" onclick="switchEssentialsTab('health')" title="Savings Rate">
        <div class="hps-icon">💰</div>
        <div class="hps-score" style="color:${srColor};">${srPct}%</div>
        <div class="hps-label">Savings Rate</div>
      </div>
      <div class="hps-item s3" onclick="switchEssentialsTab('health')" title="Emergency Fund">
        <div class="hps-icon">🛡️</div>
        <div class="hps-score" style="color:${efColor};">${efVal}mo</div>
        <div class="hps-label">Emergency Fund</div>
      </div>
    </div>

    <div class="wealth-tabs fade-up fade-up-3">
      <button class="wealth-tab ${activeTab==='health'     ?'active':''}" onclick="switchEssentialsTab('health')">Health</button>
      <button class="wealth-tab ${activeTab==='goals'      ?'active':''}" onclick="switchEssentialsTab('goals')">Goals</button>
      <button class="wealth-tab ${activeTab==='predictions'?'active':''}" onclick="switchEssentialsTab('predictions')">Predictions</button>
      <button class="wealth-tab ${activeTab==='retirement' ?'active':''}" onclick="switchEssentialsTab('retirement')">Retirement</button>
      <button class="wealth-tab ${activeTab==='debt'       ?'active':''}" onclick="switchEssentialsTab('debt')">Debt Payoff</button>
    </div>
    <div id="essentials-tab-content" class="fade-up fade-up-4"></div>
    <div id="essentialModals"></div>`;
  switchEssentialsTab(activeTab);
}

function switchEssentialsTab(tab) {
  const page = document.getElementById('page-essentials');
  if (!page) return;
  page.dataset.activeTab = tab;
  state.activeEssentialsTab = tab;
  page.querySelectorAll('.wealth-tab').forEach(b =>
    b.classList.toggle('active', (b.getAttribute('onclick')||'').includes(`'${tab}'`)));
  const content = document.getElementById('essentials-tab-content');
  if (!content) return;

  content.classList.remove('tab-slide-in');
  void content.offsetWidth;
  content.classList.add('tab-slide-in');

  if (tab === 'health')      renderHealthTab(content);
  if (tab === 'goals')       renderGoalsTab(content);
  if (tab === 'predictions') renderPredictionsTab(content);
  if (tab === 'retirement')  renderRetirementTab(content);
  if (tab === 'debt')        renderDebtPayoffTab(content);
}

/* ─────────────────────────────────────────────────────────────
   HEALTH TAB
───────────────────────────────────────────────────────────── */
async function renderHealthTab(container) {
  const { score, metrics, avgIncome, avgExpense } = calcHealthScore(true);
  const statusColor = score >= 7 ? 'var(--emerald)' : score >= 4 ? 'var(--gold)' : 'var(--rose)';
  const statusLabel = score >= 7 ? 'Excellent' : score >= 4 ? 'Getting There' : 'Needs Action';
  const pct = (score / 10 * 100).toFixed(0);
  const es = state.essentials_settings || {};

  // Refresh settings from DB
  try {
    const saved = await getAll('essentials_settings');
    saved.forEach(s => { es[s.key] = s.value; });
  } catch(e) {}

  const { value: liquidAuto, source: liqSource } = DataEngine.getLiquidAssets();
  const anomalies = DataEngine.getAnomalies();
  const spending  = DataEngine.getCategoryBreakdown();
  const topCats   = Object.entries(spending).sort((a,b)=>b[1].total-a[1].total).slice(0,5);

  container.innerHTML = `
    <!-- Financial Profile (collapsed by default) -->
    <div class="chart-card" style="margin-bottom:16px;">
      <div class="section-heading" style="cursor:pointer;margin-bottom:0;" onclick="toggleFinancialProfile()">
        <div class="section-title"><span class="dot"></span>Financial Profile
          <span style="font-size:11px;color:var(--text-3);margin-left:8px;">(click to expand)</span>
        </div>
        <span id="profileToggleIcon" style="color:var(--text-3);">▼</span>
      </div>
      <div id="financialProfileBody" style="margin-top:14px;display:none;">
        <div style="font-size:11px;color:var(--teal);margin-bottom:10px;">
          💡 Liquid assets auto-detected from investments: <strong>${fmtINR(liquidAuto)}</strong>
          <span style="color:var(--text-3);">(source: ${liqSource})</span>
        </div>
        <div class="grid-2" style="gap:10px;">
          <div><label class="form-label">Liquid Assets (₹) — override</label>
            <input id="es_liquid" type="number" class="form-input" value="${es.liquidAssets||''}" placeholder="Auto: ${fmtINR(liquidAuto)}" /></div>
          <div><label class="form-label">Term Insurance Cover (₹)</label>
            <input id="es_term" type="number" class="form-input" value="${es.termCover||''}" placeholder="Sum assured" /></div>
          <div><label class="form-label">Health Insurance Cover (₹)</label>
            <input id="es_health" type="number" class="form-input" value="${es.healthCover||''}" placeholder="Per family" /></div>
          <div><label class="form-label">Dependents</label>
            <input id="es_dependents" type="number" class="form-input" value="${es.healthDependents||1}" /></div>
          <div><label class="form-label">Current Age</label>
            <input id="es_age" type="number" class="form-input" value="${es.age||30}" /></div>
          <div><label class="form-label">Monthly Income override (₹)</label>
            <input id="es_income" type="number" class="form-input" value="${es.monthlyIncome||''}"
              placeholder="Auto: ${fmtINR(avgIncome)}/mo" /></div>
        </div>
        <button class="btn-submit" style="width:auto;padding:9px 20px;margin-top:12px;font-size:13px;"
                onclick="saveEssentialsSettings()">💾 Save Profile</button>
      </div>
    </div>

    <!-- Overall Health Score -->
    <div class="chart-card card-enter ce-1" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div style="flex-shrink:0;">
          <canvas id="healthGauge" width="90" height="90" style="width:90px;height:90px;"></canvas>
        </div>
        <div style="flex:1;min-width:160px;">
          <div class="kpi-label">OVERALL HEALTH SCORE</div>
          <div style="display:flex;align-items:baseline;gap:4px;margin:4px 0;">
            <span id="healthScoreNum" class="score-reveal"
                  style="font-family:var(--font-m);font-size:40px;font-weight:700;color:${statusColor};">${score}</span>
            <span style="font-size:18px;color:var(--text-3);">/10</span>
            <span style="font-size:13px;color:${statusColor};margin-left:6px;">${statusLabel}</span>
          </div>
          <!-- Score bar animates from 0 via JS -->
          <div style="background:var(--bg3);border-radius:99px;height:10px;overflow:hidden;margin-top:8px;">
            <div id="healthScoreBar" class="anim-bar" style="width:0%;height:100%;border-radius:99px;
                        background:linear-gradient(90deg,var(--rose),var(--gold) 50%,var(--emerald));"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-3);margin-top:3px;font-family:var(--font-m);">
            <span>0</span><span>5</span><span>10</span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <div class="rt-live"><div class="rt-dot"></div><span>Auto-calculated</span></div>
          <div style="font-size:11px;color:var(--teal);">✅ ${(state.transactions||[]).length} txns</div>
          <div style="font-size:11px;color:var(--teal);">✅ ${(state.investments||[]).length} investments</div>
          <div style="font-size:11px;color:var(--teal);">✅ ${(state.emi_loans||[]).length + (state.loans||[]).length} loans</div>
          <button class="section-action" style="margin-top:4px;font-size:11px;"
                  onclick="cachedHealthScore=null;switchEssentialsTab('health')">🔄 Refresh</button>
        </div>
      </div>
    </div>

    <!-- Metric Cards with stagger -->
    <div class="two-col">
      <div class="card-enter ce-2">${buildEmergencyCard(metrics.emergencyFund)}</div>
      <div class="card-enter ce-3">${buildSavingsCard(metrics.savingsRate, avgIncome, avgExpense)}</div>
    </div>
    <div class="two-col">
      <div class="card-enter ce-4">${buildTermCard(metrics.termInsurance)}</div>
      <div class="card-enter ce-5">${buildHealthCard(metrics.healthInsurance)}</div>
    </div>
    <div class="card-enter ce-5">${buildDebtCard(metrics.debtRatio)}</div>

    <!-- Spending Insights -->
    ${topCats.length ? `
    <div class="section-heading" style="margin-top:8px;">
      <div class="section-title"><span class="dot" style="background:var(--violet)"></span>Spending Insights (3-month)</div>
      <button class="section-action" onclick="switchEssentialsTab('predictions')">Full Analysis →</button>
    </div>
    <div class="chart-card card-enter ce-5">
      ${topCats.map(([cat, data]) => {
        const months = Object.keys(data.months);
        const curMo = new Date().toISOString().slice(0,7);
        const curAmt = data.months[curMo] || 0;
        const prev   = months.filter(m => m !== curMo);
        const prevAvg= prev.length ? prev.reduce((s,m) => s + data.months[m], 0) / prev.length : 0;
        const delta  = prevAvg > 0 ? ((curAmt - prevAvg) / prevAvg * 100) : 0;
        const maxAmt = Math.max(...Object.values(data.months), 1);
        const barPct = (data.total / 3 / maxAmt * 100).toFixed(0);
        return `
          <div style="margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span style="font-size:13px;font-weight:600;">${cat}</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-family:var(--font-m);font-size:12px;">${fmtINR(data.total / 3)}/mo avg</span>
                ${delta !== 0 ? `<span style="font-size:11px;color:${delta > 0 ? 'var(--rose)' : 'var(--emerald)'};">${delta > 0 ? '↑' : '↓'}${Math.abs(delta).toFixed(0)}%</span>` : ''}
              </div>
            </div>
            <div style="background:var(--bg3);border-radius:99px;height:6px;overflow:hidden;">
              <div class="anim-bar" data-bar-pct="${barPct}" style="width:0%;height:100%;background:var(--violet);border-radius:99px;"></div>
            </div>
          </div>`;
      }).join('')}
      ${anomalies.length ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        <div style="font-size:12px;color:var(--rose);font-weight:600;margin-bottom:6px;">⚠️ Spending Anomalies This Month</div>
        ${anomalies.slice(0,3).map(a => `
          <div style="font-size:12px;color:var(--text-2);margin-bottom:4px;">
            <strong>${a.category}</strong>: ${fmtINR(a.current)} (↑${a.pct.toFixed(0)}% vs avg ${fmtINR(a.historical)})
          </div>`).join('')}
      </div>` : ''}
    </div>` : ''}`;

  // Animate gauge with requestAnimationFrame (progressive arc draw)
  setTimeout(() => {
    const canvas = document.getElementById('healthGauge');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cx = 45, cy = 45, r = 36;
    const startAngle = Math.PI * 0.75;
    const endAngle   = Math.PI * 2.25;
    const targetAngle = startAngle + (endAngle - startAngle) * (score / 10);
    const col = score >= 7 ? '#34d399' : score >= 4 ? '#fbbf24' : '#f87171';

    const DRAW_DUR = 900;
    const drawStart = performance.now();

    function drawFrame(now) {
      const t       = Math.min((now - drawStart) / DRAW_DUR, 1);
      const ease    = 1 - Math.pow(1 - t, 3);
      const curAngle = startAngle + (targetAngle - startAngle) * ease;

      ctx.clearRect(0, 0, 90, 90);

      // Track
      ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, endAngle);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();

      // Colored arc
      ctx.beginPath(); ctx.arc(cx, cy, r, startAngle, curAngle);
      ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.stroke();

      // Center label (fade in at end)
      const alpha = Math.max(0, (t - 0.6) / 0.4);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col; ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(score, cx, cy - 4);
      ctx.font = '9px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText('/10', cx, cy + 10);
      ctx.globalAlpha = 1;

      if (t < 1) requestAnimationFrame(drawFrame);
    }
    requestAnimationFrame(drawFrame);

    // Animate score bar
    const bar = document.getElementById('healthScoreBar');
    if (bar) bar.style.width = `${pct}%`;

    // Animate spending insight bars
    setTimeout(() => {
      document.querySelectorAll('[data-bar-pct]').forEach(b => {
        b.style.width = b.dataset.barPct + '%';
      });
    }, 200);
  }, 60);
}

/* ── Metric Card Builders ── */
function _badge(s) {
  const col = s==='perfect'?'var(--emerald)':s==='good'?'var(--gold)':'var(--rose)';
  const lbl = s==='perfect'?'✅ Perfect':s==='good'?'⚡ Good':'🔴 Risky';
  return `<span class="health-badge" style="background:${col}20;color:${col};padding:2px 8px;border-radius:20px;">${lbl}</span>`;
}

function buildEmergencyCard(m) {
  if (!m) return '';
  const col = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const runwayPct = Math.min(100, (parseFloat(m.value) / 12) * 100);
  const sourceHint = { investments:'from investments', manual:'manual override', transactions:'from tx history', none:'not detected' };
  return `
    <div class="chart-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:20px;">🛡️</span><div class="chart-card-title" style="margin:0;">Emergency Fund</div></div>
        ${_badge(m.status)}
      </div>
      <div class="kpi-label">LIQUID ASSETS <span style="font-size:9px;color:var(--text-3);">(${sourceHint[m.liquidSource||'none']})</span></div>
      <div style="font-family:var(--font-m);font-size:18px;margin:2px 0 8px;">${fmtINR(m.liquidAssets)}</div>
      <div class="kpi-label">RUNWAY — ${m.value} months</div>
      <div style="background:var(--bg3);border-radius:99px;height:8px;overflow:hidden;margin:6px 0;">
        <div class="anim-bar" data-bar-pct="${runwayPct}" style="width:0%;height:100%;border-radius:99px;background:${col};"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-3);font-family:var(--font-m);">
        <span>0</span><span>3m</span><span>6m</span><span>12m+</span>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-2);">
        ${parseFloat(m.value) < 3 ? '⚠️ Build at least 3 months of expenses in liquid savings' : parseFloat(m.value) < 6 ? '💡 Good! Aim for 6 months for extra safety' : '✅ Excellent — 6+ months runway!'}
        · Burn: ${fmtINR(m.monthlyExpense)}/mo
      </div>
    </div>`;
}

function buildSavingsCard(m, income, expense) {
  if (!m) return '';
  const col = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const pct = Math.min(100, parseFloat(m.value)||0);
  const annualExpense = expense * 12;
  const fiTarget = annualExpense * 25;
  const nw = getNetWorth();
  const savings = income - expense;
  const fiPct = fiTarget > 0 ? Math.min(100, (nw / fiTarget * 100)).toFixed(0) : 0;
  return `
    <div class="chart-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:20px;">💰</span><div class="chart-card-title" style="margin:0;">Savings Rate</div></div>
        ${_badge(m.status)}
      </div>
      <div style="font-family:var(--font-m);font-size:28px;font-weight:700;color:${col};">${m.value}%</div>
      <div style="font-size:11px;color:var(--text-3);margin-bottom:8px;">of income saved (3-mo avg ${m.incomeSource==='manual'?'· manual income':'· from transactions'})</div>
      <div style="background:var(--bg3);border-radius:99px;height:8px;overflow:hidden;margin:8px 0;">
        <div class="anim-bar" data-bar-pct="${pct}" style="width:0%;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--rose),var(--gold),var(--emerald));"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <div><div class="kpi-label">AVG INCOME</div><div style="font-family:var(--font-m);font-size:13px;color:var(--emerald);">${fmtINR(income)}/mo</div></div>
        <div><div class="kpi-label">AVG EXPENSE</div><div style="font-family:var(--font-m);font-size:13px;color:var(--rose);">${fmtINR(expense)}/mo</div></div>
      </div>
      <div style="margin-top:10px;padding:8px;background:var(--bg3);border-radius:8px;">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:4px;">FI PROGRESS</div>
        <div style="background:var(--border);border-radius:99px;height:5px;overflow:hidden;margin-bottom:4px;">
          <div class="anim-bar" data-bar-pct="${fiPct}" style="width:0%;height:100%;background:var(--teal);border-radius:99px;"></div>
        </div>
        <div style="font-size:11px;color:var(--text-2);">${fiPct}% to FI target (${fmtINR(fiTarget)})</div>
      </div>
    </div>`;
}

function buildTermCard(m) {
  if (!m) return '';
  const col = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  return `
    <div class="chart-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:20px;">🛡️</span><div class="chart-card-title" style="margin:0;">Term Insurance</div></div>
        ${_badge(m.status)}
      </div>
      <div class="kpi-label">YOUR COVER</div>
      ${m.value > 0
        ? `<div style="font-family:var(--font-m);font-size:18px;">${fmtINR(m.value)}</div>`
        : `<div style="font-size:13px;color:var(--rose);">Not set — enter in Financial Profile ↑</div>`}
      <div style="margin-top:8px;padding:8px;background:var(--bg3);border-radius:8px;">
        <div class="kpi-label">IDEAL COVER</div>
        <div style="font-size:13px;font-family:var(--font-m);">${fmtINR(m.idealCover)}</div>
        <div style="font-size:10px;color:var(--text-3);margin-top:2px;">Formula: 25× Annual Expense − Net Worth</div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-2);">
        ${m.value===0?'⚠️ No term cover — high financial risk':m.value>=m.idealCover*0.8?'✅ Adequate coverage':'💡 Consider increasing cover to '+fmtINR(m.idealCover)}
      </div>
    </div>`;
}

function buildHealthCard(m) {
  if (!m) return '';
  const col = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  return `
    <div class="chart-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:20px;">🏥</span><div class="chart-card-title" style="margin:0;">Health Insurance</div></div>
        ${_badge(m.status)}
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
        <span class="kpi-label">DEPENDENTS:</span>
        <span style="font-size:13px;font-family:var(--font-m);">${m.dependents} people</span>
      </div>
      <div class="kpi-label">YOUR COVER</div>
      ${m.value > 0
        ? `<div style="font-family:var(--font-m);font-size:18px;">${fmtINR(m.value)}</div>`
        : `<div style="font-size:13px;color:var(--rose);">Not set — enter in Financial Profile ↑</div>`}
      <div style="margin-top:8px;padding:8px;background:var(--bg3);border-radius:8px;">
        <div class="kpi-label">RECOMMENDED</div>
        <div style="font-size:12px;color:var(--text-2);">Min ${fmtINR(m.recommendedHealth)} · Good ${fmtINR(m.goodHealth)}</div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-2);">
        ${m.value===0?'⚠️ No health insurance — critical risk':m.value>=m.goodHealth?'✅ Excellent coverage':m.value>=m.recommendedHealth?'💡 Good, consider upgrading':'🔴 Below minimum recommended'}
      </div>
    </div>`;
}

function buildDebtCard(m) {
  if (!m) return '';
  const col = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const pct = Math.min(100, parseFloat(m.value)||0);
  return `
    <div class="chart-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:20px;">⚖️</span><div class="chart-card-title" style="margin:0;">Debt Ratio</div></div>
        ${_badge(m.status)}
      </div>
      <div style="font-family:var(--font-m);font-size:28px;font-weight:700;color:${col};">${m.value}%</div>
      <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;">of assets are debt-funded (EMI + personal loans you owe)</div>
      <div style="background:var(--bg3);border-radius:99px;height:8px;overflow:hidden;margin:8px 0;">
        <div class="anim-bar" data-bar-pct="${pct}" style="width:0%;height:100%;border-radius:99px;background:${col};"></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <div><div class="kpi-label">TOTAL ASSETS</div><div style="font-family:var(--font-m);font-size:12px;">${fmtINR(m.totalAssets)}</div></div>
        <div><div class="kpi-label">EMI LOANS</div><div style="font-family:var(--font-m);font-size:12px;color:var(--rose);">${fmtINR(m.emiLiab)}</div></div>
        <div><div class="kpi-label">PERSONAL DEBT</div><div style="font-family:var(--font-m);font-size:12px;color:var(--rose);">${fmtINR(m.personalDebt)}</div></div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-2);">
        ${parseFloat(m.value)===0?'✅ Debt-free — excellent!':parseFloat(m.value)<10?'✅ Low debt — healthy':parseFloat(m.value)<30?'💡 Moderate debt':'⚠️ High debt ratio — reduce liabilities'}
      </div>
    </div>`;
}

/* ─────────────────────────────────────────────────────────────
   PREDICTIONS TAB — AI-style projections from real data
───────────────────────────────────────────────────────────── */
function renderPredictionsTab(container) {
  let proj;
  try { proj = DataEngine.computeProjections(); }
  catch(e) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">Could not compute predictions</div><div class="empty-state-sub">${e.message}</div></div>`; return; }

  const { fiTarget, yearsToFI, savings, avgIncome, avgExpense, milestones, projections, debtFreeDate, fiPct } = proj;
  const nw = getNetWorth();
  const hasData = avgIncome > 0 || avgExpense > 0 || nw !== 0;

  if (!hasData) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">No data to predict from</div><div class="empty-state-sub">Add transactions, investments, and loans to unlock AI predictions.</div></div>`;
    return;
  }

  const MILESTONE_LABELS = { 100000:'₹1L', 500000:'₹5L', 1000000:'₹10L', 5000000:'₹50L', 10000000:'₹1Cr', 25000000:'₹2.5Cr', 100000000:'₹10Cr' };

  const milestoneCells = milestones.map(m => {
    const label = MILESTONE_LABELS[m.target] || fmtINR(m.target);
    if (m.achieved) return `
      <div class="chart-card" style="text-align:center;border:1px solid rgba(52,211,153,0.3);">
        <div style="font-size:24px;">🏆</div>
        <div style="font-family:var(--font-m);font-size:14px;font-weight:700;color:var(--emerald);">${label}</div>
        <div style="font-size:11px;color:var(--emerald);">Achieved!</div>
      </div>`;
    if (!m.months) return `
      <div class="chart-card" style="text-align:center;opacity:0.5;">
        <div style="font-size:20px;">🎯</div>
        <div style="font-family:var(--font-m);font-size:13px;">${label}</div>
        <div style="font-size:11px;color:var(--text-3);">Need more savings</div>
      </div>`;
    const yrsMo = m.months >= 12 ? `${(m.months/12).toFixed(1)} yrs` : `${m.months} mo`;
    const futureDate = new Date(); futureDate.setMonth(futureDate.getMonth() + m.months);
    return `
      <div class="chart-card" style="text-align:center;">
        <div style="font-size:20px;">🎯</div>
        <div style="font-family:var(--font-m);font-size:14px;font-weight:700;">${label}</div>
        <div style="font-size:12px;color:var(--teal);">in ~${yrsMo}</div>
        <div style="font-size:10px;color:var(--text-3);">${futureDate.toLocaleDateString('en-IN',{year:'numeric',month:'short'})}</div>
      </div>`;
  }).join('');

  const projRows = projections.map(p => {
    const delta = p.value - nw;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
        <div style="font-size:13px;color:var(--text-2);">In ${p.years} year${p.years>1?'s':''}</div>
        <div style="text-align:right;">
          <div style="font-family:var(--font-m);font-size:15px;font-weight:600;color:var(--teal);">${fmtINR(p.value)}</div>
          <div style="font-size:11px;color:var(--emerald);">+${fmtINR(delta)}</div>
        </div>
      </div>`;
  }).join('');

  // Category spending chart data
  const spending = DataEngine.getCategoryBreakdown();
  const topCats  = Object.entries(spending).sort((a,b)=>b[1].total-a[1].total).slice(0,8);

  container.innerHTML = `
    <!-- FI Progress -->
    <div class="chart-card" style="margin-bottom:16px;">
      <div class="chart-card-title"><span style="color:var(--teal)">●</span> Financial Independence Progress</div>
      <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;margin-top:12px;">
        <div style="flex:1;min-width:200px;">
          <div style="font-family:var(--font-m);font-size:28px;font-weight:700;color:var(--teal);">${fiPct}%</div>
          <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;">to Financial Independence</div>
          <div style="background:var(--bg3);border-radius:99px;height:12px;overflow:hidden;margin-bottom:8px;">
            <div style="width:${fiPct}%;height:100%;border-radius:99px;
                        background:linear-gradient(90deg,var(--rose),var(--gold) 50%,var(--emerald));
                        transition:width 0.8s;"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
            <div><span style="color:var(--text-3);">Current NW:</span> <strong>${fmtINR(nw)}</strong></div>
            <div><span style="color:var(--text-3);">FI Target:</span> <strong>${fmtINR(fiTarget)}</strong></div>
            <div><span style="color:var(--text-3);">Monthly savings:</span> <strong style="color:var(--emerald);">${fmtINR(savings)}</strong></div>
            <div><span style="color:var(--text-3);">Est. FI in:</span> <strong style="color:var(--teal);">${yearsToFI ? yearsToFI + ' yrs' : 'Need savings'}</strong></div>
          </div>
        </div>
        ${debtFreeDate ? `
        <div style="padding:16px;background:var(--bg3);border-radius:12px;text-align:center;min-width:140px;">
          <div style="font-size:20px;margin-bottom:4px;">🎯</div>
          <div class="kpi-label">DEBT-FREE DATE</div>
          <div style="font-family:var(--font-m);font-size:14px;font-weight:700;color:var(--emerald);">${debtFreeDate}</div>
        </div>` : ''}
      </div>
    </div>

    <!-- Net Worth Projections -->
    <div class="two-col" style="margin-bottom:16px;">
      <div class="chart-card">
        <div class="chart-card-title"><span style="color:var(--violet)">●</span> Net Worth Projections</div>
        <div style="font-size:11px;color:var(--text-3);margin-bottom:12px;">Assumes 10% CAGR + ₹${fmtINR(savings)}/mo savings</div>
        ${projRows}
      </div>
      <div class="chart-card">
        <div class="chart-card-title"><span style="color:var(--gold)">●</span> Spending by Category (3-mo)</div>
        <div style="height:180px;"><canvas id="spendCatChart"></canvas></div>
      </div>
    </div>

    <!-- Wealth Milestones -->
    <div class="section-heading">
      <div class="section-title"><span class="dot" style="background:var(--gold)"></span>Wealth Milestones</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;margin-bottom:16px;">
      ${milestoneCells}
    </div>

    <!-- Spending Trends -->
    ${topCats.length ? `
    <div class="section-heading">
      <div class="section-title"><span class="dot" style="background:var(--rose)"></span>Top Spending Categories (3-month)</div>
    </div>
    <div class="chart-card">
      <div style="height:200px;"><canvas id="spendTrendChart"></canvas></div>
    </div>` : ''}

    <!-- Anomalies -->
    ${(() => {
      const anomalies = DataEngine.getAnomalies();
      if (!anomalies.length) return '';
      return `
      <div class="section-heading" style="margin-top:8px;">
        <div class="section-title"><span class="dot" style="background:var(--rose)"></span>Spending Anomalies This Month</div>
      </div>
      <div class="chart-card">
        ${anomalies.map(a => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
            <div>
              <div style="font-weight:600;font-size:13px;">⚠️ ${a.category}</div>
              <div style="font-size:11px;color:var(--text-3);">This month: ${fmtINR(a.current)} vs avg ${fmtINR(a.historical)}</div>
            </div>
            <span style="color:var(--rose);font-weight:700;font-size:13px;">↑${a.pct.toFixed(0)}%</span>
          </div>`).join('')}
      </div>`;
    })()}`;

  // Charts
  setTimeout(() => {
    // Category pie
    const catCtx = document.getElementById('spendCatChart');
    if (catCtx && topCats.length) {
      const PALETTE = ['#3b82f6','#f59e0b','#10b981','#8b5cf6','#ef4444','#06b6d4','#f97316','#6366f1'];
      new Chart(catCtx, {
        type: 'doughnut',
        data: { labels: topCats.map(([c])=>c), datasets: [{ data: topCats.map(([,d])=>d.total/3), backgroundColor: PALETTE.slice(0,topCats.length), borderWidth:2, borderColor:'transparent' }] },
        options: { responsive:true, maintainAspectRatio:false, cutout:'55%', plugins: { legend: { position:'right', labels: { font:{size:10}, color: '#9ca3af', boxWidth:10 } }, tooltip: { callbacks: { label: c => ` ${c.label}: ${fmtINR(c.raw)}/mo` } } } }
      });
    }

    // Trend bar chart
    const trendCtx = document.getElementById('spendTrendChart');
    if (trendCtx && topCats.length) {
      const months = [...new Set(topCats.flatMap(([,d])=>Object.keys(d.months)))].sort().slice(-3);
      const PALETTE2 = ['#3b82f6','#f59e0b','#10b981','#8b5cf6','#ef4444'];
      const datasets = topCats.slice(0,5).map(([cat,data], i) => ({
        label: cat, data: months.map(m => data.months[m]||0),
        backgroundColor: PALETTE2[i] + 'cc', borderRadius: 4
      }));
      new Chart(trendCtx, {
        type: 'bar',
        data: { labels: months, datasets },
        options: { responsive:true, maintainAspectRatio:false, plugins: { legend: { labels: { font:{size:10}, color:'#9ca3af' } } }, scales: { x:{stacked:true, grid:{display:false}, ticks:{font:{size:10}}}, y:{stacked:true, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{font:{size:10}, callback: v => v>=1000?'₹'+(v/1000).toFixed(0)+'K':'₹'+v}} } }
      });
    }
  }, 80);
}

/* ─────────────────────────────────────────────────────────────
   GOALS TAB (unchanged from uploaded version, enhanced)
───────────────────────────────────────────────────────────── */
async function renderGoalsTab(container) {
  let goals = state.savings || [];
  try { const fresh = await getAll('savings'); if (fresh.length) { goals = fresh; state.savings = goals; } } catch(e) {}

  const nw = getNetWorth();
  const { value: liquidSavings } = DataEngine.getLiquidAssets();

  // Auto-update goal progress
  let updated = false;
  for (const goal of goals) {
    let newCurrent = goal.current || 0;
    if (goal.trackBy === 'networth') newCurrent = nw;
    else if (goal.trackBy === 'savings') newCurrent = liquidSavings;
    if (Math.abs(newCurrent - toNum(goal.current)) > 0.01) { goal.current = newCurrent; updated = true; }
  }
  if (updated) { try { for (const g of goals) await put('savings', g); } catch(e) {} }

  container.innerHTML = `
    ${goals.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-text">No goals yet</div><div class="empty-state-sub">Set financial goals to track milestones.</div></div>` :
    `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-bottom:24px;">
       ${goals.map(buildGoalCardEnhanced).join('')}
     </div>`}
    <div class="section-heading">
      <div class="section-title"><span class="dot" style="background:var(--gold)"></span>Create New Goal</div>
      <button class="section-action" onclick="toggleNewGoalForm()">+ New Goal</button>
    </div>
    <div id="newGoalForm" class="chart-card" style="display:none;">
      <form id="createGoalForm" class="space-y-4">
        <div class="grid-2">
          <div><label class="form-label">Goal Name*</label><input id="goal_name" class="form-input" placeholder="e.g., Dream Home" required /></div>
          <div><label class="form-label">Target Amount (₹)*</label><input id="goal_target" type="number" class="form-input" required min="1" /></div>
        </div>
        <div class="grid-2">
          <div><label class="form-label">Target Date*</label><input id="goal_date" type="date" class="form-input" required /></div>
          <div><label class="form-label">Track Progress By</label>
            <select id="goal_trackBy" class="form-input">
              <option value="manual">Manual Update</option>
              <option value="networth">Net Worth (auto)</option>
              <option value="savings">Liquid Savings (auto)</option>
            </select>
          </div>
        </div>
        <div><label class="form-label">Notes (optional)</label><textarea id="goal_notes" rows="2" class="form-input"></textarea></div>
        <div class="grid-2"><button type="submit" class="btn-submit">🎯 Create Goal</button><button type="button" class="btn-secondary" onclick="toggleNewGoalForm()">Cancel</button></div>
      </form>
    </div>`;

  const form = document.getElementById('createGoalForm');
  if (form) form.onsubmit = async (e) => {
    e.preventDefault();
    const td = document.getElementById('goal_date').value;
    if (new Date(td) <= new Date()) { showToast('Target date must be in the future','error'); return; }
    const goal = { id: uid('goal'), name: document.getElementById('goal_name').value.trim(), target: parseFloat(document.getElementById('goal_target').value), targetDate: td, trackBy: document.getElementById('goal_trackBy').value, notes: document.getElementById('goal_notes').value, current: 0, createdAt: nowISO() };
    if (isNaN(goal.target)||goal.target<=0) { showToast('Invalid target','error'); return; }
    try { await put('savings', goal); state.savings = [...(state.savings||[]), goal]; showToast('✅ Goal created','success'); toggleNewGoalForm(); renderGoalsTab(document.getElementById('essentials-tab-content')); }
    catch(e) { showToast('Failed to create goal','error'); }
  };
}

function buildGoalCardEnhanced(g) {
  const target = toNum(g.target), current = toNum(g.current);
  const pct = target > 0 ? Math.min(100, (current/target*100)).toFixed(0) : 0;
  const daysLeft = g.targetDate ? Math.max(0, Math.ceil((new Date(g.targetDate)-new Date())/86400_000)) : null;
  const monthlyNeeded = daysLeft > 0 ? Math.ceil((target-current)/(daysLeft/30)) : 0;
  const col = pct >= 80 ? 'var(--emerald)' : pct >= 40 ? 'var(--gold)' : 'var(--blue)';
  const isOverdue = g.targetDate && new Date(g.targetDate) < new Date() && current < target;
  return `
    <div class="chart-card">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <div class="list-item-name">${g.name}</div>
        <div><button class="section-action" onclick="openUpdateGoalModal('${g.id}')">✏️</button><button class="section-action" style="color:var(--rose);" onclick="deleteGoalItem('${g.id}')">🗑️</button></div>
      </div>
      <div style="font-size:20px;font-family:var(--font-m);font-weight:600;color:${col};">${fmtINR(current)}</div>
      <div style="font-size:12px;color:var(--text-3);">of ${fmtINR(target)}</div>
      <div class="goal-bar-bg" style="margin:8px 0;"><div style="width:${pct}%;height:6px;background:${col};border-radius:99px;"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;">
        <span>${pct}% achieved</span>
        ${isOverdue?`<span style="color:var(--rose);">⚠️ Overdue</span>`:daysLeft!==null?`<span>${daysLeft}d left</span>`:''}
      </div>
      ${monthlyNeeded>0&&!isOverdue?`<div style="margin-top:8px;padding:8px;background:var(--bg3);border-radius:8px;display:flex;justify-content:space-between;font-size:12px;"><span>Monthly needed</span><strong style="color:var(--teal);">${fmtINR(monthlyNeeded)}</strong></div>`:''}
      ${g.notes?`<div style="font-size:11px;color:var(--text-3);margin-top:6px;">${g.notes}</div>`:''}
    </div>`;
}

async function openUpdateGoalModal(id) {
  const goal = (state.savings||[]).find(g=>g.id===id);
  if (!goal) return;
  const html = `
    <div class="modal-overlay show" id="updateGoalOverlay">
      <div class="modal" style="max-width:420px;">
        <div class="modal-header"><h3 class="modal-title">🎯 Update Goal</h3><button class="modal-close" onclick="closeEssentialModal('updateGoalOverlay')">×</button></div>
        <div class="modal-body">
          <form id="updateGoalForm" class="space-y-4">
            <div><label class="form-label">Name</label><input id="ug_name" class="form-input" value="${(goal.name||'').replace(/"/g,'&quot;')}" required /></div>
            <div class="grid-2">
              <div><label class="form-label">Target (₹)</label><input id="ug_target" type="number" class="form-input" value="${goal.target}" required /></div>
              <div><label class="form-label">Current (₹)</label><input id="ug_current" type="number" class="form-input" value="${goal.current||0}" /></div>
            </div>
            <div><label class="form-label">Target Date</label><input id="ug_date" type="date" class="form-input" value="${goal.targetDate||''}" /></div>
            <div><label class="form-label">Notes</label><textarea id="ug_notes" class="form-input form-textarea" rows="2">${goal.notes||''}</textarea></div>
            <div class="grid-2"><button type="submit" class="btn-submit">💾 Save</button><button type="button" class="btn-secondary" onclick="closeEssentialModal('updateGoalOverlay')">Cancel</button></div>
          </form>
        </div>
      </div>
    </div>`;
  let c = document.getElementById('essentialModals'); if (!c) { c = document.createElement('div'); c.id='essentialModals'; document.body.appendChild(c); }
  c.innerHTML = html;
  document.getElementById('updateGoalForm').onsubmit = async (e) => {
    e.preventDefault();
    const up = { ...goal, name: document.getElementById('ug_name').value.trim(), target: parseFloat(document.getElementById('ug_target').value), current: parseFloat(document.getElementById('ug_current').value), targetDate: document.getElementById('ug_date').value, notes: document.getElementById('ug_notes').value.trim() };
    try { await put('savings',up); state.savings=state.savings.map(g=>g.id===id?up:g); closeEssentialModal('updateGoalOverlay'); showToast('✅ Goal updated','success'); renderGoalsTab(document.getElementById('essentials-tab-content')); }
    catch(e) { showToast('Failed to update','error'); }
  };
}

async function deleteGoalItem(id) {
  if (!confirm('Delete this goal?')) return;
  try { await del('savings',id); state.savings=state.savings.filter(g=>g.id!==id); showToast('Goal deleted','info'); renderGoalsTab(document.getElementById('essentials-tab-content')); }
  catch(e) { showToast('Failed','error'); }
}

/* ─────────────────────────────────────────────────────────────
   RETIREMENT TAB
───────────────────────────────────────────────────────────── */
function renderRetirementTab(container) {
  const es = state.essentials_settings || {};
  const currentAge = toNum(es.age) || 30;
  const retirementAge = toNum(es.retirementAge) || 60;
  const { avgExpense } = DataEngine.getTransactionAverages();
  const monthlyExpense = avgExpense;
  const nw = getNetWorth();
  const monthlySIP = (state.sip_plan||[]).reduce((s,i)=>s+toNum(i.monthlyAmount),0);
  const { inflation, preRetReturns, withdrawalRate } = RETIREMENT_CONFIG;
  const yearsToRetire = retirementAge - currentAge;

  if (yearsToRetire <= 0) { container.innerHTML = `<div class="chart-card"><div class="empty-state-icon">⚠️</div><div>Retirement age must be greater than current age.</div></div>`; return; }

  const futureMonthlyExpense = monthlyExpense * Math.pow(1 + inflation/100, yearsToRetire);
  const annualExpAtRetirement = futureMonthlyExpense * 12;
  const corpusNeeded = annualExpAtRetirement / (withdrawalRate / 100);
  const remainingCorpus = Math.max(0, corpusNeeded - nw);
  const monthlyReturn = preRetReturns / 100 / 12;
  const months = yearsToRetire * 12;
  let requiredMonthly = 0;
  if (months > 0 && monthlyReturn > 0 && remainingCorpus > 0) {
    requiredMonthly = (remainingCorpus * monthlyReturn) / (Math.pow(1+monthlyReturn, months) - 1);
  }
  const onTrack = monthlySIP >= requiredMonthly;
  const gap = requiredMonthly - monthlySIP;

  container.innerHTML = `
    <div class="chart-card" style="margin-bottom:16px;">
      <div class="section-heading"><div class="section-title"><span class="dot"></span>Retirement Planner</div></div>
      <div style="font-size:11px;color:var(--teal);margin-bottom:12px;">📊 Income/Expense auto-derived from your ${(state.transactions||[]).length} transactions (3-month avg)</div>
      <div class="grid-2" style="gap:10px;">
        <div><label class="form-label">Current Age</label><input id="ret_age" type="number" class="form-input" value="${currentAge}" /></div>
        <div><label class="form-label">Retirement Age</label><input id="ret_retAge" type="number" class="form-input" value="${retirementAge}" /></div>
      </div>
      <button class="btn-submit" style="width:auto;padding:9px 20px;margin-top:12px;font-size:13px;" onclick="updateRetirementSettings()">Update Projection</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
      <div class="kpi-card"><div class="kpi-label">CORPUS NEEDED</div><div class="kpi-value" style="font-size:clamp(13px,2vw,18px);">${fmtINR(corpusNeeded)}</div><div class="kpi-change">4% withdrawal rule</div></div>
      <div class="kpi-card ${onTrack?'green':'red'}"><div class="kpi-label">MONTHLY SIP NEEDED</div><div class="kpi-value" style="color:${onTrack?'var(--emerald)':'var(--rose)'};font-size:clamp(13px,2vw,18px);">${fmtINR(requiredMonthly)}</div><div class="kpi-change">Current: ${fmtINR(monthlySIP)} ${onTrack?'✅':'(-'+fmtINR(gap)+')' }</div></div>
      <div class="kpi-card"><div class="kpi-label">FUTURE EXPENSE</div><div class="kpi-value" style="font-size:clamp(13px,2vw,18px);">${fmtINR(futureMonthlyExpense)}</div><div class="kpi-change">At ${inflation}% inflation/yr</div></div>
    </div>
    <div class="chart-card"><div class="chart-card-title"><span style="color:var(--teal)">●</span> Net Worth Projection to Retirement</div><div style="height:200px;"><canvas id="retirementChart"></canvas></div></div>`;

  setTimeout(() => {
    const canvas = document.getElementById('retirementChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const mo = yearsToRetire * 12;
    let cur = nw;
    const pts = [{ y: currentAge, v: cur }];
    const mr = preRetReturns / 100 / 12;
    for (let i = 1; i <= mo; i++) { cur = cur*(1+mr) + monthlySIP; if (i%12===0) pts.push({ y: currentAge+i/12, v: cur }); }
    new Chart(canvas, {
      type: 'line',
      data: { labels: pts.map(p=>p.y), datasets: [
        { label: 'Projected NW', data: pts.map(p=>p.v), borderColor:'rgba(0,212,180,1)', backgroundColor:'rgba(0,212,180,0.1)', fill:true, tension:0.3, pointRadius:0 },
        { label: 'Corpus Target', data: pts.map(()=>corpusNeeded), borderColor:'rgba(251,113,133,0.5)', borderDash:[6,3], fill:false, pointRadius:0 }
      ]},
      options: { responsive:true, maintainAspectRatio:false, plugins: { legend:{labels:{font:{size:10},color:'#9ca3af'}}, tooltip:{callbacks:{label:c=>c.dataset.label+': '+fmtINR(c.raw)}} }, scales: { x:{grid:{display:false},ticks:{font:{size:10}}}, y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{font:{size:10},callback:v=>'₹'+(v>=10000000?(v/10000000).toFixed(1)+'Cr':v>=100000?(v/100000).toFixed(1)+'L':'')}} } }
    });
  }, 80);
}

async function updateRetirementSettings() {
  const age = parseInt(document.getElementById('ret_age')?.value)||30;
  let retAge = parseInt(document.getElementById('ret_retAge')?.value)||60;
  if (retAge <= age) { showToast('Retirement age must be greater than current age','error'); return; }
  const s = { ...state.essentials_settings, age, retirementAge: retAge };
  try { for (const [k,v] of Object.entries(s)) await put('essentials_settings',{key:k,value:v}); state.essentials_settings=s; showToast('Updated','success'); renderRetirementTab(document.getElementById('essentials-tab-content')); }
  catch(e) { showToast('Failed','error'); }
}

/* ─────────────────────────────────────────────────────────────
   DEBT PAYOFF TAB
───────────────────────────────────────────────────────────── */
function renderDebtPayoffTab(container) {
  const loans = state.emi_loans || [];
  if (!loans.length) { container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><div class="empty-state-text">No active EMI debts!</div><div class="empty-state-sub">All formal loans are cleared. Great financial health.</div></div>`; return; }
  const es = state.essentials_settings || {};
  const extraPayment = toNum(es.debtExtraPayment||5000);
  const method = es.debtPayoffMethod || 'avalanche';
  const debts = loans.map(l => ({ id:l.id, name:l.name||l.type||'Loan', balance:toNum(l.outstanding), rate:toNum(l.interestRate), minPayment:toNum(l.monthlyEmi)||(toNum(l.outstanding)*0.02) }));
  const totalMin = debts.reduce((s,d)=>s+d.minPayment,0);
  const totalBalance = debts.reduce((s,d)=>s+d.balance,0);
  const totalInterest = debts.reduce((s,d)=>s+(d.balance*(d.rate/100/12)*12),0);

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;">
      <div class="kpi-card rose"><div class="kpi-label">TOTAL DEBT</div><div class="kpi-value" style="color:var(--rose);font-size:clamp(13px,2vw,18px);">${fmtINR(totalBalance)}</div><div class="kpi-change">${loans.length} loans</div></div>
      <div class="kpi-card"><div class="kpi-label">MONTHLY EMI</div><div class="kpi-value" style="font-size:clamp(13px,2vw,18px);">${fmtINR(totalMin)}</div><div class="kpi-change">minimum payments</div></div>
      <div class="kpi-card"><div class="kpi-label">ANNUAL INTEREST</div><div class="kpi-value" style="color:var(--rose);font-size:clamp(13px,2vw,18px);">${fmtINR(totalInterest)}</div><div class="kpi-change">approx cost/yr</div></div>
    </div>
    <div class="chart-card" style="margin-bottom:16px;">
      <div class="section-heading"><div class="section-title"><span class="dot"></span>Debt Payoff Planner</div></div>
      <div class="grid-2" style="gap:10px;">
        <div><label class="form-label">Extra Monthly Payment (₹)</label><input id="debt_extra" type="number" class="form-input" value="${extraPayment}" /></div>
        <div><label class="form-label">Strategy</label>
          <select id="debt_method" class="form-input">
            <option value="avalanche" ${method==='avalanche'?'selected':''}>Avalanche (Highest Interest First)</option>
            <option value="snowball"  ${method==='snowball' ?'selected':''}>Snowball (Smallest Balance First)</option>
          </select>
        </div>
      </div>
      <button class="btn-submit" style="width:auto;padding:9px 20px;margin-top:12px;font-size:13px;" onclick="updateDebtPayoffStrategy()">Update Plan</button>
    </div>
    <div class="chart-card"><div class="section-title" style="margin-bottom:12px;">📅 Payoff Schedule</div><div id="payoffList"></div></div>`;

  const updatePlan = () => {
    const newExtra = toNum(document.getElementById('debt_extra')?.value);
    const newMethod = document.getElementById('debt_method')?.value;
    const sorted = newMethod === 'avalanche' ? [...debts].sort((a,b)=>b.rate-a.rate) : [...debts].sort((a,b)=>a.balance-b.balance);
    let free = debts.reduce((s,d)=>s+d.minPayment,0) + newExtra;
    let html = '';
    for (const d of sorted) {
      const mo = d.balance > 0 ? Math.ceil(d.balance / Math.max(free, d.minPayment)) : 0;
      const fd = new Date(); fd.setMonth(fd.getMonth()+mo);
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border);">
        <div><div style="font-weight:600;font-size:13px;">${d.name}</div><div style="font-size:11px;color:var(--text-3);">${fmtINR(d.balance)} @ ${d.rate}% · EMI ${fmtINR(d.minPayment)}</div></div>
        <div style="text-align:right;"><div style="font-size:13px;color:var(--teal);">~${mo} mo</div><div style="font-size:11px;color:var(--text-3);">${fd.toLocaleDateString('en-IN',{year:'numeric',month:'short'})}</div></div>
      </div>`;
      free -= d.minPayment; if(free<0) free=0;
    }
    document.getElementById('payoffList').innerHTML = html;
  };
  updatePlan();
  document.getElementById('debt_extra')?.addEventListener('input', updatePlan);
  document.getElementById('debt_method')?.addEventListener('change', updatePlan);
}

async function updateDebtPayoffStrategy() {
  const extra = parseFloat(document.getElementById('debt_extra')?.value)||0;
  const method = document.getElementById('debt_method')?.value||'avalanche';
  const s = { ...state.essentials_settings, debtExtraPayment:extra, debtPayoffMethod:method };
  try { for(const [k,v] of Object.entries(s)) await put('essentials_settings',{key:k,value:v}); state.essentials_settings=s; showToast('Plan updated','success'); }
  catch(e) { showToast('Failed','error'); }
}

/* ─────────────────────────────────────────────────────────────
   COMMON HELPERS
───────────────────────────────────────────────────────────── */
function toggleFinancialProfile() {
  const b = document.getElementById('financialProfileBody'), i = document.getElementById('profileToggleIcon');
  if (b && i) { const h = b.style.display==='none'; b.style.display=h?'':'none'; i.textContent=h?'▲':'▼'; }
}

async function saveEssentialsSettings() {
  const settings = {
    liquidAssets:    parseFloat(document.getElementById('es_liquid')?.value)||0,
    termCover:       parseFloat(document.getElementById('es_term')?.value)||0,
    healthCover:     parseFloat(document.getElementById('es_health')?.value)||0,
    healthDependents:parseInt(document.getElementById('es_dependents')?.value)||1,
    age:             parseInt(document.getElementById('es_age')?.value)||30,
    monthlyIncome:   parseFloat(document.getElementById('es_income')?.value)||0
  };
  try {
    for (const [k,v] of Object.entries(settings)) await put('essentials_settings',{key:k,value:v});
    state.essentials_settings = { ...state.essentials_settings, ...settings };
    cachedHealthScore = null; // invalidate cache
    showToast('✅ Profile saved','success');
    const content = document.getElementById('essentials-tab-content');
    if (content && state.activeEssentialsTab === 'health') renderHealthTab(content);
  } catch(e) { showToast('Failed to save','error'); }
}

function toggleNewGoalForm() {
  const f = document.getElementById('newGoalForm'); if(f) f.style.display = f.style.display==='none'?'':'none';
}

function closeEssentialModal(id) {
  const el = document.getElementById(id); if(el) { el.classList.remove('show'); setTimeout(()=>el.remove(),300); }
  const c = document.getElementById('essentialModals'); if(c) c.innerHTML='';
}
