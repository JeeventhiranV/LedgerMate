/* ============================================================
   Essentials Module — LedgerMate (Production Ready)
   Tabs: Health | Goals | Retirement | Debt Payoff
   ============================================================ */

// ─── SAFE DEPENDENCY FALLBACKS ───────────────────────────────
if (typeof toNum !== 'function') window.toNum = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
if (typeof fmtINR !== 'function') window.fmtINR = n => '₹' + toNum(n).toLocaleString('en-IN');
if (typeof nowISO !== 'function') window.nowISO = () => new Date().toISOString().slice(0,10);
if (typeof showToast !== 'function') window.showToast = (msg, type) => alert(msg);
if (typeof uid !== 'function') window.uid = prefix => prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2,6);
if (typeof getNetWorth !== 'function') window.getNetWorth = () => (state.investments?.reduce((s,a)=>s+toNum(a.currentValue||0),0)||0) - (state.emi_loans?.reduce((s,l)=>s+toNum(l.outstanding),0)||0);
if (typeof getTotalAssets !== 'function') window.getTotalAssets = () => state.investments?.reduce((s,a)=>s+toNum(a.currentValue||0),0)||0;
if (typeof getTotalLiabilities !== 'function') window.getTotalLiabilities = () => state.emi_loans?.reduce((s,l)=>s+toNum(l.outstanding),0)||0;

// ─── RETIREMENT CALCULATION CONSTANTS ─────────────────────────
const RETIREMENT_CONFIG = {
  inflation: 6,           // %
  preRetReturns: 10,      // % p.a.
  postRetReturns: 7,      // % p.a.
  withdrawalRate: 4,      // % (4% rule)
  lifeExpectancy: 85
};

// ─── HEALTH SCORE CALCULATOR (CACHED) ─────────────────────────
let cachedHealthScore = null;
let lastHealthCalc = 0;
const HEALTH_CACHE_TTL = 300000; // 5 minutes

function calcHealthScore(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedHealthScore && (now - lastHealthCalc) < HEALTH_CACHE_TTL) {
    return cachedHealthScore;
  }

  try {
    let score = 0;
    const metrics = {};
    const txs = state.transactions || [];
    const nowDate = new Date();
    const es = state.essentials_settings || {};

    // 1. Savings Rate (3-month avg transaction income OR manual override)
    let totalIncome = 0, totalExpense = 0, monthsCount = 0;
    for (let i = 0; i < 3; i++) {
      const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0,7);
      const inc = txs.filter(t => (t.date||'').startsWith(monthStr) && t.type === 'in')
                     .reduce((s,t) => s + toNum(t.amount), 0);
      const exp = txs.filter(t => (t.date||'').startsWith(monthStr) && t.type === 'out')
                     .reduce((s,t) => s + toNum(t.amount), 0);
      if (inc > 0 || exp > 0) {
        totalIncome += inc;
        totalExpense += exp;
        monthsCount++;
      }
    }
    const transactionAvgIncome = monthsCount > 0 ? totalIncome / monthsCount : 0;
    const manualIncome = toNum(es.monthlyIncome);
    // Use manual income if provided (>0), otherwise fallback to transaction average
    const effectiveIncome = manualIncome > 0 ? manualIncome : transactionAvgIncome;
    const avgExpense = monthsCount > 0 ? totalExpense / monthsCount : 0;
    const savingsRate = effectiveIncome > 0 ? ((effectiveIncome - avgExpense) / effectiveIncome * 100) : 0;
    let savingsScore = 0;
    if (savingsRate >= 50) savingsScore = 2;
    else if (savingsRate >= 20) savingsScore = 1;
    metrics.savingsRate = { 
      value: savingsRate.toFixed(1), 
      score: savingsScore, 
      max: 2, 
      status: savingsScore===2?'perfect':savingsScore===1?'good':'risky', 
      income: effectiveIncome, 
      expense: avgExpense,
      incomeSource: manualIncome > 0 ? 'manual' : 'transaction'  // for UI hint
    };
    score += savingsScore;

    // 2. Emergency Fund (liquid assets vs 3 months expense)
    const liquidAssets = toNum(es.liquidAssets || 0);
    const monthlyExpense = avgExpense || 1;
    const runway = monthlyExpense > 0 ? (liquidAssets / monthlyExpense).toFixed(1) : 0;
    let efScore = 0;
    if (runway >= 6) efScore = 2;
    else if (runway >= 3) efScore = 1;
    metrics.emergencyFund = { value: runway, score: efScore, max: 2, status: efScore===2?'perfect':efScore===1?'good':'risky', liquidAssets, monthlyExpense };
    score += efScore;

    // 3. Term Insurance
    const termCover = toNum(es.termCover || 0);
    const annualExpense = monthlyExpense * 12;
    const netWorth = getNetWorth();
    const idealTermCover = Math.max(0, (25 * annualExpense) - netWorth);
    let termScore = termCover >= idealTermCover * 0.8 ? 2 : termCover > 0 ? 1 : 0;
    metrics.termInsurance = { value: termCover, score: termScore, max: 2, status: termScore===2?'perfect':termScore>0?'good':'risky', idealCover: idealTermCover };
    score += termScore;

    // 4. Health Insurance
    const healthCover = toNum(es.healthCover || 0);
    const dependents = Math.max(1, toNum(es.healthDependents || 1));
    const recommendedHealth = 500000 * dependents;
    const goodHealth = 1000000 * dependents;
    let healthScore = healthCover >= goodHealth ? 2 : healthCover >= recommendedHealth ? 1 : 0;
    metrics.healthInsurance = { value: healthCover, score: healthScore, max: 2, status: healthScore===2?'perfect':healthScore>0?'good':'risky', dependents, recommendedHealth, goodHealth };
    score += healthScore;

    // 5. Debt Ratio
    const totalAssets = getTotalAssets();
    const totalLiabilities = getTotalLiabilities();
    const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets * 100) : 0;
    let debtScore = debtRatio < 10 ? 2 : debtRatio < 30 ? 1 : 0;
    metrics.debtRatio = { value: debtRatio.toFixed(1), score: debtScore, max: 2, status: debtScore===2?'perfect':debtScore===1?'good':'risky', totalAssets, totalLiabilities };
    score += debtScore;

    const totalScore = Math.min(10, score);
    cachedHealthScore = { score: totalScore, total: 10, metrics, avgIncome: effectiveIncome, avgExpense };
    lastHealthCalc = now;
    return cachedHealthScore;
  } catch (err) {
    console.error('Health score calculation error:', err);
    return { score: 0, total: 10, metrics: {}, avgIncome: 0, avgExpense: 0 };
  }
}

// ─── PAGE RENDERING ───────────────────────────────────────────
function showEssentialsPage() {
  const page = document.getElementById('page-essentials');
  if (!page) return;
  const activeTab = page.dataset.activeTab || 'health';
  page.innerHTML = `
    <div class="page-header fade-up fade-up-1">
      <div>
        <div class="page-greeting">Your financial health check</div>
        <h1 class="page-title">Essentials <em>&amp; Goals</em></h1>
      </div>
    </div>
    <div class="wealth-tabs fade-up fade-up-2">
      <button class="wealth-tab ${activeTab==='health'?'active':''}" onclick="switchEssentialsTab('health')">Health</button>
      <button class="wealth-tab ${activeTab==='goals'?'active':''}" onclick="switchEssentialsTab('goals')">Goals</button>
      <button class="wealth-tab ${activeTab==='retirement'?'active':''}" onclick="switchEssentialsTab('retirement')">Retirement</button>
      <button class="wealth-tab ${activeTab==='debt'?'active':''}" onclick="switchEssentialsTab('debt')">Debt Payoff</button>
    </div>
    <div id="essentials-tab-content" class="fade-up fade-up-3"></div>
  `;
  switchEssentialsTab(activeTab);
}

function switchEssentialsTab(tab) {
  const page = document.getElementById('page-essentials');
  if (!page) return;
  page.dataset.activeTab = tab;
  page.querySelectorAll('.wealth-tab').forEach(btn => {
    const btnTab = btn.textContent.toLowerCase().replace(' ','');
    btn.classList.toggle('active', btnTab === tab || (btn.getAttribute('onclick')||'').includes(`'${tab}'`));
  });
  const content = document.getElementById('essentials-tab-content');
  if (!content) return;
  if (tab === 'health') renderHealthTab(content);
  if (tab === 'goals') renderGoalsTab(content);
  if (tab === 'retirement') renderRetirementTab(content);
  if (tab === 'debt') renderDebtPayoffTab(content);
}

// ─── HEALTH TAB ───────────────────────────────────────────────
async function renderHealthTab(container) {
  const { score, metrics, avgIncome, avgExpense } = calcHealthScore(true);
  const statusColor = score >= 7 ? 'var(--emerald)' : score >= 4 ? 'var(--gold)' : 'var(--rose)';
  const statusLabel = score >= 7 ? 'Excellent' : score >= 4 ? 'Moderate' : 'Needs Action';
  const pct = (score / 10 * 100).toFixed(0);
  const esSettings = state.essentials_settings || {};

  // Load latest profile from DB (in case changed elsewhere)
  try {
    const savedSettings = await getAll('essentials_settings');
    savedSettings.forEach(s => { esSettings[s.key] = s.value; });
  } catch(e) { console.warn(e); }

  const profileHtml = `
    <div class="chart-card" style="margin-bottom:20px;">
      <div class="section-heading" style="cursor:pointer; margin-bottom:0;" onclick="toggleFinancialProfile()">
        <div class="section-title"><span class="dot"></span> Financial Profile</div>
        <span id="profileToggleIcon" style="color:var(--text-3);">▼</span>
      </div>
      <div id="financialProfileBody" style="margin-top:16px; display:none;">
        <div class="grid-2">
          <div><label class="form-label">Liquid Assets (₹)</label><input id="es_liquid" type="number" class="form-input" value="${esSettings.liquidAssets||0}" placeholder="Cash + FD + Liquid Funds" /></div>
          <div><label class="form-label">Term Insurance Cover (₹)</label><input id="es_term" type="number" class="form-input" value="${esSettings.termCover||0}" placeholder="Sum assured" /></div>
          <div><label class="form-label">Health Insurance Cover (₹)</label><input id="es_health" type="number" class="form-input" value="${esSettings.healthCover||0}" placeholder="Sum insured" /></div>
          <div><label class="form-label">Dependents</label><input id="es_dependents" type="number" class="form-input" value="${esSettings.healthDependents||1}" placeholder="Number" /></div>
          <div><label class="form-label">Your Age</label><input id="es_age" type="number" class="form-input" value="${esSettings.age||30}" placeholder="Age" /></div>
          <div><label class="form-label">Monthly Income (₹)</label><input id="es_income" type="number" class="form-input" value="${esSettings.monthlyIncome||(avgIncome||0)}" placeholder="Optional override" /></div>
        </div>
        <button class="btn-submit" style="width:auto; padding:9px 20px; margin-top:12px;" onclick="saveEssentialsSettings()">💾 Save Profile</button>
      </div>
    </div>
  `;

  const scoreCard = `
    <div class="chart-card" style="margin-bottom:20px; background: linear-gradient(135deg, var(--bg2), var(--bg3));">
      <div style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
        <div style="position:relative; width:100px; height:100px;">
          <canvas id="healthGauge" width="100" height="100" style="width:100px; height:100px;"></canvas>
          <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center;">
            <span style="font-size:24px; font-weight:700; color:${statusColor};">${score}</span>
            <span style="font-size:12px;">/10</span>
          </div>
        </div>
        <div style="flex:1;">
          <div class="kpi-label">FINANCIAL HEALTH SCORE</div>
          <div style="font-size:24px; font-weight:700; color:${statusColor};">${statusLabel}</div>
          <div style="font-size:12px; color:var(--text-3); margin-top:4px;">Based on 5 key metrics</div>
        </div>
      </div>
    </div>
  `;

  const metricCards = `
    <div class="two-col">${buildEmergencyCard(metrics.emergencyFund)}${buildSavingsCard(metrics.savingsRate, avgIncome, avgExpense)}</div>
    <div class="two-col">${buildTermCard(metrics.termInsurance)}${buildHealthCard(metrics.healthInsurance)}</div>
    <div>${buildDebtCard(metrics.debtRatio)}</div>
  `;

  container.innerHTML = profileHtml + scoreCard + metricCards;

  setTimeout(() => {
    const canvas = document.getElementById('healthGauge');
    if (canvas) drawGauge(canvas, score / 10);
  }, 50);
}

function drawGauge(canvas, fraction) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const radius = w * 0.4;
  const centerX = w/2, centerY = h/2;
  const startAngle = -0.5 * Math.PI;
  const endAngle = startAngle + (2 * Math.PI * fraction);
  ctx.clearRect(0,0,w,h);
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2*Math.PI);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.strokeStyle = fraction > 0.7 ? 'var(--emerald)' : fraction > 0.4 ? 'var(--gold)' : 'var(--rose)';
  ctx.lineWidth = 8;
  ctx.stroke();
}

function buildEmergencyCard(m) {
  if (!m) return '';
  const statusColor = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const badge = `<span class="health-badge" style="background:${statusColor}20; color:${statusColor}; padding:2px 8px; border-radius:20px;">${m.status==='perfect'?'✅ Perfect':m.status==='good'?'⚡ Good':'🔴 Risky'}</span>`;
  const runwayPct = Math.min(100, (parseFloat(m.value) / 12) * 100);
  return `<div class="chart-card">
    <div style="display:flex; justify-content:space-between;"><div class="chart-card-title">🛡️ Emergency Fund</div>${badge}</div>
    <div class="kpi-label">Liquid Assets</div><div style="font-size:18px; font-family:var(--font-m);">${fmtINR(m.liquidAssets)}</div>
    <div class="kpi-label">Runway</div>
    <div style="background:var(--bg3); border-radius:99px; height:6px; margin:6px 0;"><div style="width:${runwayPct}%; height:100%; border-radius:99px; background:${statusColor};"></div></div>
    <div style="display:flex; justify-content:space-between; font-size:10px;"><span>0</span><span>3m</span><span>6m</span><span>12m</span></div>
    <div style="margin-top:8px; font-size:12px;">${parseFloat(m.value) < 3 ? '⚠️ Build at least 3 months of expenses' : parseFloat(m.value) < 6 ? '💡 Good! Aim for 6 months' : '✅ Excellent coverage'}</div>
  </div>`;
}

function buildSavingsCard(m, income, expense) {
  if (!m) return '';
  const statusColor = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const badge = `<span class="health-badge" style="background:${statusColor}20; color:${statusColor}; padding:2px 8px; border-radius:20px;">${m.status==='perfect'?'✅ Perfect':m.status==='good'?'⚡ Good':'🔴 Risky'}</span>`;
  const fiTarget = expense * 12 * 25;
  const currentNW = getNetWorth();
  const savings = income - expense;
  let yearsToFI = '—';
  if (savings > 0 && (fiTarget - currentNW) > 0) {
    yearsToFI = ((fiTarget - currentNW) / (savings * 12)).toFixed(1);
  }
  const incomeSourceHint = m.incomeSource === 'manual' ? '<span class="text-muted" style="font-size:10px;">(manual override)</span>' : '';
  return `<div class="chart-card">
    <div style="display:flex; justify-content:space-between;"><div class="chart-card-title">💰 Savings Rate</div>${badge}</div>
    <div style="font-size:28px; font-weight:700; color:${statusColor};">${m.value}%</div>
    <div class="kpi-label">of monthly income saved ${incomeSourceHint}</div>
    <div style="background:var(--bg3); border-radius:99px; height:6px; margin:6px 0;"><div style="width:${Math.min(100, parseFloat(m.value))}%; height:100%; border-radius:99px; background:linear-gradient(90deg,var(--rose),var(--gold),var(--emerald));"></div></div>
    <div class="grid-2" style="margin-top:8px;"><div><div class="kpi-label">Income</div><div>${fmtINR(income)}</div></div><div><div class="kpi-label">Expense</div><div>${fmtINR(expense)}</div></div></div>
    ${yearsToFI !== '—' ? `<div style="margin-top:8px; padding:8px; background:var(--bg3); border-radius:8px;"><span style="color:var(--text-3);">Time to FI:</span> <strong style="color:var(--teal);">~${yearsToFI} yrs</strong></div>` : ''}
  </div>`;
}

function buildTermCard(m) {
  if (!m) return '';
  const statusColor = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const badge = `<span class="health-badge" style="background:${statusColor}20; color:${statusColor};">${m.status==='perfect'?'✅ Perfect':m.status==='good'?'⚡ Good':'🔴 Risky'}</span>`;
  return `<div class="chart-card">
    <div style="display:flex; justify-content:space-between;"><div class="chart-card-title">🛡️ Term Insurance</div>${badge}</div>
    <div class="kpi-label">Your Cover</div>
    <div style="font-size:18px; font-family:var(--font-m);">${m.value>0?fmtINR(m.value):'Not set'}</div>
    <div style="margin-top:8px;"><div class="kpi-label">Ideal Cover</div><div>${fmtINR(m.idealCover)}</div></div>
    <div class="text-muted" style="font-size:11px; margin-top:4px;">Formula: 25×Annual Expense − Net Worth</div>
    <div style="margin-top:8px; font-size:12px;">${m.value===0?'⚠️ No term cover — protect your family':m.value>=m.idealCover*0.8?'✅ Good coverage!':'💡 Increase cover to recommended amount'}</div>
  </div>`;
}

function buildHealthCard(m) {
  if (!m) return '';
  const statusColor = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const badge = `<span class="health-badge" style="background:${statusColor}20; color:${statusColor};">${m.status==='perfect'?'✅ Perfect':m.status==='good'?'⚡ Good':'🔴 Risky'}</span>`;
  return `<div class="chart-card">
    <div style="display:flex; justify-content:space-between;"><div class="chart-card-title">🏥 Health Insurance</div>${badge}</div>
    <div class="kpi-label">Cover Amount</div>
    <div style="font-size:18px; font-family:var(--font-m);">${m.value>0?fmtINR(m.value):'Not set'}</div>
    <div style="margin-top:6px;"><div class="kpi-label">Recommended</div><div>Min ${fmtINR(m.recommendedHealth)} · Good ${fmtINR(m.goodHealth)}</div></div>
    <div style="font-size:12px; margin-top:8px;">${m.value===0?'⚠️ No health insurance — high risk':m.value>=m.goodHealth?'✅ Excellent coverage':m.value>=m.recommendedHealth?'💡 Good, but consider upgrading':'🔴 Inadequate coverage'}</div>
  </div>`;
}

function buildDebtCard(m) {
  if (!m) return '';
  const statusColor = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const badge = `<span class="health-badge" style="background:${statusColor}20; color:${statusColor};">${m.status==='perfect'?'✅ Perfect':m.status==='good'?'⚡ Good':'🔴 Risky'}</span>`;
  const pct = Math.min(100, parseFloat(m.value));
  return `<div class="chart-card">
    <div style="display:flex; justify-content:space-between;"><div class="chart-card-title">⚖️ Debt Ratio</div>${badge}</div>
    <div style="font-size:28px; font-weight:700; color:${statusColor};">${m.value}%</div>
    <div class="kpi-label">of assets financed by debt</div>
    <div style="background:var(--bg3); border-radius:99px; height:6px; margin:6px 0;"><div style="width:${pct}%; height:100%; border-radius:99px; background:${statusColor};"></div></div>
    <div class="grid-3" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-top:8px;">
      <div><div class="kpi-label">Assets</div><div>${fmtINR(m.totalAssets)}</div></div>
      <div><div class="kpi-label">Liabilities</div><div>${fmtINR(m.totalLiabilities)}</div></div>
      <div><div class="kpi-label">Net Worth</div><div>${fmtINR(m.totalAssets - m.totalLiabilities)}</div></div>
    </div>
    <div style="margin-top:8px; font-size:12px;">${parseFloat(m.value)===0?'✅ No debt — excellent!':parseFloat(m.value)<10?'✅ Low debt — healthy':parseFloat(m.value)<30?'💡 Moderate debt — manageable':'⚠️ High debt — prioritize reduction'}</div>
  </div>`;
}

// ─── GOALS TAB ────────────────────────────────────────────────
async function renderGoalsTab(container) {
  let goals = state.savings || [];
  // Refresh from DB to ensure latest
  try {
    const fresh = await getAll('savings');
    if (fresh.length) goals = fresh;
    state.savings = goals;
  } catch(e) { console.warn(e); }

  const netWorth = getNetWorth();
  const liquidSavings = toNum(state.essentials_settings?.liquidAssets || 0);

  // Bulk update goals (avoid multiple put calls per goal)
  let updated = false;
  for (const goal of goals) {
    let newCurrent = goal.current || 0;
    if (goal.trackBy === 'networth') newCurrent = netWorth;
    else if (goal.trackBy === 'savings') newCurrent = liquidSavings;
    if (Math.abs(newCurrent - toNum(goal.current)) > 0.01) {
      goal.current = newCurrent;
      updated = true;
    }
  }
  if (updated) {
    try {
      for (const goal of goals) await put('savings', goal);
      state.savings = goals;
    } catch(e) { console.warn('Failed to bulk update goals', e); }
  }

  container.innerHTML = `
    ${goals.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <div class="empty-state-text">No goals yet</div>
        <button class="btn-submit" style="width:auto; margin-top:12px;" onclick="toggleNewGoalForm()">+ Create Goal</button>
      </div>
    ` : `
      <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; margin-bottom:24px;">
        ${goals.map(g => buildGoalCardEnhanced(g)).join('')}
      </div>
    `}
    <div class="section-heading"><div class="section-title"><span class="dot" style="background:var(--gold)"></span>Create New Goal</div><button class="section-action" onclick="toggleNewGoalForm()">+ New Goal</button></div>
    <div id="newGoalForm" class="chart-card" style="display:none;">
      <form id="createGoalForm" class="space-y-4">
        <div class="grid-2">
          <div><label class="form-label">Goal Name</label><input id="goal_name" class="form-input" placeholder="e.g., Dream Home" required /></div>
          <div><label class="form-label">Target Amount (₹)</label><input id="goal_target" type="number" class="form-input" required min="1" /></div>
        </div>
        <div class="grid-2">
          <div><label class="form-label">Target Date</label><input id="goal_date" type="date" class="form-input" required /></div>
          <div><label class="form-label">Track Progress By</label><select id="goal_trackBy" class="form-input"><option value="manual">Manual Update</option><option value="networth">Net Worth</option><option value="savings">Liquid Savings</option></select></div>
        </div>
        <div><label class="form-label">Notes</label><textarea id="goal_notes" rows="2" class="form-input"></textarea></div>
        <div class="grid-2"><button type="submit" class="btn-submit">🎯 Create Goal</button><button type="button" class="btn-secondary" onclick="toggleNewGoalForm()">Cancel</button></div>
      </form>
    </div>
  `;

  const form = document.getElementById('createGoalForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const targetDate = document.getElementById('goal_date').value;
      if (new Date(targetDate) <= new Date()) {
        showToast('Target date must be in the future', 'error');
        return;
      }
      const goal = {
        id: uid('goal'),
        name: document.getElementById('goal_name').value.trim(),
        target: parseFloat(document.getElementById('goal_target').value),
        targetDate: targetDate,
        trackBy: document.getElementById('goal_trackBy').value,
        notes: document.getElementById('goal_notes').value,
        current: 0,
        createdAt: nowISO()
      };
      if (isNaN(goal.target) || goal.target <= 0) {
        showToast('Enter a valid target amount', 'error');
        return;
      }
      try {
        await put('savings', goal);
        state.savings = [...(state.savings||[]), goal];
        showToast('✅ Goal created', 'success');
        toggleNewGoalForm();
        renderGoalsTab(document.getElementById('essentials-tab-content'));
      } catch(err) {
        showToast('❌ Failed to create goal', 'error');
      }
    };
  }
}

function buildGoalCardEnhanced(g) {
  const target = toNum(g.target);
  const current = toNum(g.current);
  const pct = target > 0 ? Math.min(100, (current/target*100)).toFixed(0) : 0;
  const daysLeft = g.targetDate ? Math.max(0, Math.ceil((new Date(g.targetDate)-new Date())/(1000*60*60*24))) : null;
  const monthlyNeeded = daysLeft && daysLeft>0 ? ((target - current) / (daysLeft/30)).toFixed(0) : 0;
  const statusColor = pct >= 80 ? 'var(--emerald)' : pct >= 40 ? 'var(--gold)' : 'var(--blue)';
  const isOverdue = g.targetDate && new Date(g.targetDate) < new Date() && current < target;
  return `<div class="chart-card" style="position:relative;">
    <div style="display:flex; justify-content:space-between;">
      <div class="list-item-name">${g.name}</div>
      <div><button class="section-action" onclick="openUpdateGoalModal('${g.id}')">✏️</button><button class="section-action" style="color:var(--rose);" onclick="deleteGoalItem('${g.id}')">🗑️</button></div>
    </div>
    <div style="font-size:20px; font-family:var(--font-m); font-weight:600;">${fmtINR(current)}</div>
    <div class="text-muted" style="font-size:12px;">of ${fmtINR(target)}</div>
    <div class="goal-bar-bg" style="margin:8px 0;"><div style="width:${pct}%; height:6px; background:${statusColor}; border-radius:99px;"></div></div>
    <div style="display:flex; justify-content:space-between; font-size:12px;">
      <span>${pct}% achieved</span>
      ${daysLeft !== null ? `<span>${daysLeft} days left</span>` : ''}
      ${isOverdue ? `<span style="color:var(--rose);">⚠️ Overdue</span>` : ''}
    </div>
    ${monthlyNeeded>0 && !isOverdue ? `<div style="margin-top:8px; padding:8px; background:var(--bg3); border-radius:8px; display:flex; justify-content:space-between;"><span>Monthly needed:</span><strong style="color:var(--teal);">${fmtINR(monthlyNeeded)}</strong></div>` : ''}
    ${g.notes ? `<div class="text-muted" style="font-size:11px; margin-top:6px;">${g.notes}</div>` : ''}
  </div>`;
}

async function openUpdateGoalModal(id) {
  const goal = (state.savings||[]).find(g => g.id === id);
  if (!goal) return;
  const html = `
    <div class="modal-overlay show" id="updateGoalOverlay">
      <div class="modal" style="max-width:420px;">
        <div class="modal-header"><h3 class="modal-title">🎯 Update Goal</h3><button class="modal-close" onclick="closeEssentialModal('updateGoalOverlay')">×</button></div>
        <div class="modal-body">
          <form id="updateGoalForm">
            <div class="form-group"><label class="form-label">Goal Name</label><input id="ug_name" class="form-input" value="${escapeHtml(goal.name)}" required /></div>
            <div class="grid-2"><div><label class="form-label">Target Amount (₹)</label><input id="ug_target" type="number" class="form-input" value="${goal.target}" required /></div><div><label class="form-label">Current Amount (₹)</label><input id="ug_current" type="number" class="form-input" value="${goal.current||0}" /></div></div>
            <div class="form-group"><label class="form-label">Target Date</label><input id="ug_date" type="date" class="form-input" value="${goal.targetDate||''}" /></div>
            <div class="form-group"><label class="form-label">Notes</label><textarea id="ug_notes" class="form-input" rows="2">${escapeHtml(goal.notes||'')}</textarea></div>
            <div class="grid-2"><button type="submit" class="btn-submit">💾 Save</button><button type="button" class="btn-secondary" onclick="closeEssentialModal('updateGoalOverlay')">Cancel</button></div>
          </form>
        </div>
      </div>
    </div>
  `;
  let container = document.getElementById('essentialModals');
  if (!container) { container = document.createElement('div'); container.id = 'essentialModals'; document.body.appendChild(container); }
  container.innerHTML = html;
  document.getElementById('updateGoalForm').onsubmit = async (e) => {
    e.preventDefault();
    const updated = { ...goal,
      name: document.getElementById('ug_name').value.trim(),
      target: parseFloat(document.getElementById('ug_target').value),
      current: parseFloat(document.getElementById('ug_current').value),
      targetDate: document.getElementById('ug_date').value,
      notes: document.getElementById('ug_notes').value.trim()
    };
    if (isNaN(updated.target) || updated.target <= 0) { showToast('Invalid target', 'error'); return; }
    try {
      await put('savings', updated);
      state.savings = state.savings.map(g => g.id === id ? updated : g);
      closeEssentialModal('updateGoalOverlay');
      showToast('✅ Goal updated', 'success');
      renderGoalsTab(document.getElementById('essentials-tab-content'));
    } catch(err) { showToast('Failed to update', 'error'); }
  };
}

async function deleteGoalItem(id) {
  if (!confirm('Delete this goal?')) return;
  try {
    await del('savings', id);
    state.savings = state.savings.filter(g => g.id !== id);
    showToast('Goal deleted', 'info');
    renderGoalsTab(document.getElementById('essentials-tab-content'));
  } catch(e) { showToast('Failed to delete goal', 'error'); }
}

// ─── RETIREMENT TAB ───────────────────────────────────────────
function renderRetirementTab(container) {
  const settings = state.essentials_settings || {};
  const currentAge = toNum(settings.age) || 30;
  const retirementAge = toNum(settings.retirementAge) || 60;
  const monthlyExpense = getAverageMonthlyExpense(); // from health calc cache or recalc
  const netWorth = getNetWorth();
  const monthlySIP = (state.sip_plan || []).reduce((s,i) => s + toNum(i.monthlyAmount), 0);
  const { inflation, preRetReturns, postRetReturns, withdrawalRate, lifeExpectancy } = RETIREMENT_CONFIG;

  const yearsToRetire = retirementAge - currentAge;
  if (yearsToRetire <= 0) {
    container.innerHTML = `<div class="chart-card"><div class="empty-state-icon">⚠️</div><div>Retirement age must be greater than current age.</div></div>`;
    return;
  }

  // Future monthly expense at retirement (inflated)
  const futureMonthlyExpense = monthlyExpense * Math.pow(1 + inflation/100, yearsToRetire);
  const annualExpenseAtRetirement = futureMonthlyExpense * 12;
  // Corpus needed using 4% rule
  const corpusNeeded = annualExpenseAtRetirement / (withdrawalRate / 100);
  // Current investable (assume 70% of net worth is investable)
  const currentInvestable = netWorth * 0.7;
  const remainingCorpus = Math.max(0, corpusNeeded - currentInvestable);
  // Monthly investment required
  const monthlyReturn = preRetReturns / 100 / 12;
  const months = yearsToRetire * 12;
  let requiredMonthly = 0;
  if (months > 0 && monthlyReturn > 0 && remainingCorpus > 0) {
    requiredMonthly = (remainingCorpus * monthlyReturn) / (Math.pow(1 + monthlyReturn, months) - 1);
  }
  const onTrack = monthlySIP >= requiredMonthly;

  container.innerHTML = `
    <div class="chart-card" style="margin-bottom:20px;">
      <div class="section-heading"><div class="section-title"><span class="dot"></span> Retirement Planner</div></div>
      <div class="grid-2">
        <div><label class="form-label">Current Age</label><input id="ret_age" type="number" class="form-input" value="${currentAge}" min="18" max="100" /></div>
        <div><label class="form-label">Retirement Age</label><input id="ret_retAge" type="number" class="form-input" value="${retirementAge}" min="${currentAge+1}" max="100" /></div>
      </div>
      <button class="btn-submit" style="width:auto; margin-top:12px;" onclick="updateRetirementSettings()">Update Projection</button>
    </div>
    <div class="two-col">
      <div class="chart-card"><div class="kpi-label">Corpus Needed at Retirement</div><div style="font-size:24px; font-weight:700;">${fmtINR(corpusNeeded)}</div><div class="text-muted">To generate ₹${fmtINR(futureMonthlyExpense)}/month (inflated)</div></div>
      <div class="chart-card"><div class="kpi-label">Monthly Investment Required</div><div style="font-size:24px; font-weight:700; color:${onTrack?'var(--emerald)':'var(--rose)'};">${fmtINR(requiredMonthly)}</div><div class="text-muted">Your current SIP: ${fmtINR(monthlySIP)}</div></div>
    </div>
    <div class="chart-card"><div class="section-title">🛤️ Projection (Net Worth)</div><div style="height:200px;"><canvas id="retirementChart"></canvas></div></div>
  `;
  setTimeout(() => drawRetirementProjection(currentAge, retirementAge, monthlySIP, preRetReturns), 100);
}

function getAverageMonthlyExpense() {
  const txs = state.transactions || [];
  const now = new Date();
  let total = 0, months = 0;
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toISOString().slice(0,7);
    const monthExp = txs.filter(t => (t.date||'').startsWith(monthStr) && t.type === 'out')
                       .reduce((s,t) => s + toNum(t.amount), 0);
    if (monthExp > 0) { total += monthExp; months++; }
  }
  return months > 0 ? total / months : 0;
}

let retirementChartInstance = null;
function drawRetirementProjection(currentAge, retirementAge, monthlySIP, annualReturn) {
  const canvas = document.getElementById('retirementChart');
  if (!canvas) return;
  if (typeof Chart === 'undefined') {
    canvas.parentElement.innerHTML = '<div class="text-muted">Chart library not loaded</div>';
    return;
  }
  if (retirementChartInstance) retirementChartInstance.destroy();

  const months = (retirementAge - currentAge) * 12;
  let nw = getNetWorth();
  const monthlyReturn = annualReturn / 100 / 12;
  const dataPoints = [{ year: currentAge, nw }];
  for (let i = 1; i <= months; i++) {
    nw = nw * (1 + monthlyReturn) + monthlySIP;
    if (i % 12 === 0) {
      dataPoints.push({ year: currentAge + i/12, nw });
    }
  }
  retirementChartInstance = new Chart(canvas, {
    type: 'line',
    data: { labels: dataPoints.map(d => d.year), datasets: [{ label: 'Projected Net Worth', data: dataPoints.map(d => d.nw), borderColor: 'var(--teal)', fill: false, tension: 0.3 }] },
    options: { responsive: true, maintainAspectRatio: true, plugins: { tooltip: { callbacks: { label: ctx => fmtINR(ctx.raw) } } } }
  });
}

async function updateRetirementSettings() {
  const age = parseInt(document.getElementById('ret_age')?.value) || 30;
  let retAge = parseInt(document.getElementById('ret_retAge')?.value) || 60;
  if (retAge <= age) retAge = age + 1;
  const settings = { ...state.essentials_settings, age, retirementAge: retAge };
  try {
    for (const [k,v] of Object.entries(settings)) await put('essentials_settings', { key: k, value: v });
    state.essentials_settings = settings;
    showToast('Retirement settings updated', 'success');
    renderRetirementTab(document.getElementById('essentials-tab-content'));
  } catch(e) { showToast('Failed to save', 'error'); }
}

// ─── DEBT PAYOFF TAB ──────────────────────────────────────────
function renderDebtPayoffTab(container) {
  const loans = state.emi_loans || [];
  if (loans.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">✅</div><div>No active debts!</div></div>`;
    return;
  }
  const debts = loans.map(l => ({
    id: l.id,
    name: l.name || l.type || 'Loan',
    balance: toNum(l.outstanding),
    rate: toNum(l.interestRate),
    minPayment: toNum(l.monthlyEmi) || (toNum(l.outstanding) * 0.02) // fallback 2% of balance
  }));
  const extraPayment = toNum(state.essentials_settings?.debtExtraPayment || 5000);
  const method = state.essentials_settings?.debtPayoffMethod || 'avalanche';
  const sorted = method === 'avalanche' ? [...debts].sort((a,b) => b.rate - a.rate) : [...debts].sort((a,b) => a.balance - b.balance);
  let totalMonthlyAvailable = debts.reduce((s,d) => s + d.minPayment, 0) + extraPayment;

  let html = `
    <div class="chart-card" style="margin-bottom:16px;">
      <div class="section-heading"><div class="section-title">📉 Debt Payoff Planner</div></div>
      <div class="grid-2">
        <div><label class="form-label">Extra Monthly Payment (₹)</label><input id="debt_extra" type="number" class="form-input" value="${extraPayment}" /></div>
        <div><label class="form-label">Strategy</label><select id="debt_method" class="form-input"><option value="avalanche" ${method==='avalanche'?'selected':''}>Avalanche (Highest Interest First)</option><option value="snowball" ${method==='snowball'?'selected':''}>Snowball (Smallest Balance First)</option></select></div>
      </div>
      <button class="btn-submit" style="width:auto; margin-top:12px;" onclick="updateDebtPayoffStrategy()">Update Plan</button>
    </div>
    <div class="chart-card"><div class="section-title">📅 Payoff Schedule</div><div id="payoffList"></div></div>
  `;
  container.innerHTML = html;

  const updatePlan = () => {
    const newExtra = toNum(document.getElementById('debt_extra')?.value);
    const newMethod = document.getElementById('debt_method')?.value;
    const newSorted = newMethod === 'avalanche' ? [...debts].sort((a,b) => b.rate - a.rate) : [...debts].sort((a,b) => a.balance - b.balance);
    let remainingMonthly = debts.reduce((s,d) => s + d.minPayment, 0) + newExtra;
    let payoffListHtml = '<div style="display:flex; flex-direction:column; gap:12px;">';
    for (let d of newSorted) {
      const monthlyAvailableForThis = remainingMonthly;
      const monthsToPayoff = d.balance / monthlyAvailableForThis;
      payoffListHtml += `
        <div style="padding:8px; background:var(--bg3); border-radius:8px;">
          <div style="display:flex; justify-content:space-between;">
            <strong>${d.name}</strong>
            <span>${fmtINR(d.balance)} @ ${d.rate}%</span>
          </div>
          <div class="text-muted" style="font-size:12px;">Min payment: ${fmtINR(d.minPayment)} | Payoff: ~${Math.ceil(monthsToPayoff)} months</div>
        </div>
      `;
      remainingMonthly -= d.minPayment;
      if (remainingMonthly < 0) remainingMonthly = 0;
    }
    payoffListHtml += '</div>';
    document.getElementById('payoffList').innerHTML = payoffListHtml;
  };
  updatePlan();
  document.getElementById('debt_extra')?.addEventListener('input', updatePlan);
  document.getElementById('debt_method')?.addEventListener('change', updatePlan);
}

async function updateDebtPayoffStrategy() {
  const extra = parseFloat(document.getElementById('debt_extra')?.value) || 0;
  const method = document.getElementById('debt_method')?.value || 'avalanche';
  const settings = { ...state.essentials_settings, debtExtraPayment: extra, debtPayoffMethod: method };
  try {
    for (const [k,v] of Object.entries(settings)) await put('essentials_settings', { key: k, value: v });
    state.essentials_settings = settings;
    showToast('Debt plan updated', 'success');
    renderDebtPayoffTab(document.getElementById('essentials-tab-content'));
  } catch(e) { showToast('Failed to save', 'error'); }
}

// ─── COMMON HELPERS ───────────────────────────────────────────
function toggleFinancialProfile() {
  const body = document.getElementById('financialProfileBody');
  const icon = document.getElementById('profileToggleIcon');
  if (body && icon) {
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? '' : 'none';
    icon.textContent = isHidden ? '▲' : '▼';
  }
}

async function saveEssentialsSettings() {
  const settings = {
    liquidAssets: parseFloat(document.getElementById('es_liquid')?.value)||0,
    termCover: parseFloat(document.getElementById('es_term')?.value)||0,
    healthCover: parseFloat(document.getElementById('es_health')?.value)||0,
    healthDependents: parseInt(document.getElementById('es_dependents')?.value)||1,
    age: parseInt(document.getElementById('es_age')?.value)||30,
    monthlyIncome: parseFloat(document.getElementById('es_income')?.value)||0
  };
  try {
    for (const [k, v] of Object.entries(settings)) await put('essentials_settings', { key: k, value: v });
    state.essentials_settings = { ...state.essentials_settings, ...settings };
    showToast('✅ Profile saved', 'success');
    // refresh health tab to show new calculations
    const content = document.getElementById('essentials-tab-content');
    if (content && state.activeEssentialsTab === 'health') renderHealthTab(content);
  } catch(e) { showToast('❌ Failed to save profile', 'error'); }
}

function toggleNewGoalForm() {
  const form = document.getElementById('newGoalForm');
  if (form) form.style.display = form.style.display === 'none' ? '' : 'none';
}

function closeEssentialModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }
  const container = document.getElementById('essentialModals');
  if (container) container.innerHTML = '';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}