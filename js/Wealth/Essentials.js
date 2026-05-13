/* ============================================================
   Essentials Module — LedgerMate
   Tabs: Essentials (Health Checks) | Goals
   ============================================================ */

// ─── HEALTH SCORE CONSTANTS ────────────────────────────────────
const HEALTH_CATEGORIES = ['Emergency Fund','Savings Rate','Term Insurance','Health Insurance','Debt Ratio'];

function calcHealthScore() {
  let score = 0;
  const metrics = {};

  // 1. Savings Rate (2 pts max)
  const txs = state.transactions || [];
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthTxs = txs.filter(t => (t.date||'').startsWith(thisMonth));
  const income  = monthTxs.filter(t=>t.type==='in').reduce((s,t)=>s+(+t.amount||0),0);
  const expense = monthTxs.filter(t=>t.type==='out').reduce((s,t)=>s+(+t.amount||0),0);
  const savingsRate = income > 0 ? ((income-expense)/income*100) : 0;
  let savingsScore = 0;
  if (savingsRate >= 50) savingsScore = 2;
  else if (savingsRate >= 20) savingsScore = 1;
  metrics.savingsRate = { value: savingsRate.toFixed(1), score: savingsScore, max: 2, status: savingsScore===2?'perfect':savingsScore===1?'good':'risky' };
  score += savingsScore;

  // 2. Emergency Fund (2 pts max) - liquid assets vs 3 months expenses
  const es = state.essentials_settings || {};
  const liquidAssets = toNum(es.liquidAssets || 0);
  const monthlyExpense = expense || 1;
  const runway = liquidAssets > 0 ? (liquidAssets / monthlyExpense).toFixed(1) : 0;
  let efScore = 0;
  if (runway >= 6) efScore = 2;
  else if (runway >= 3) efScore = 1;
  metrics.emergencyFund = { value: runway, score: efScore, max: 2, status: efScore===2?'perfect':efScore===1?'good':'risky', liquidAssets, monthlyExpense };
  score += efScore;

  // 3. Term Insurance (2 pts)
  const termCover = toNum(es.termCover || 0);
  const annualExpense = expense * 12;
  const netWorth = getNetWorth ? getNetWorth() : 0;
  const idealTermCover = (25 * annualExpense) - netWorth;
  let termScore = termCover >= idealTermCover * 0.8 ? 2 : termCover > 0 ? 1 : 0;
  metrics.termInsurance = { value: termCover, score: termScore, max: 2, status: termScore===2?'perfect':termScore>0?'good':'risky', idealCover: idealTermCover };
  score += termScore;

  // 4. Health Insurance (2 pts)
  const healthCover = toNum(es.healthCover || 0);
  const healthDependents = toNum(es.healthDependents || 0);
  const minHealth = 500000; const goodHealth = 1000000;
  let healthScore = healthCover >= goodHealth ? 2 : healthCover >= minHealth ? 1 : 0;
  metrics.healthInsurance = { value: healthCover, score: healthScore, max: 2, status: healthScore===2?'perfect':healthScore>0?'good':'risky', dependents: healthDependents };
  score += healthScore;

  // 5. Debt Ratio (2 pts)
  const totalAssets = getTotalAssets ? getTotalAssets() : 0;
  const totalLiabilities = getTotalLiabilities ? getTotalLiabilities() : 0;
  const debtRatio = totalAssets > 0 ? (totalLiabilities / totalAssets * 100) : 0;
  let debtScore = debtRatio < 10 ? 2 : debtRatio < 30 ? 1 : 0;
  metrics.debtRatio = { value: debtRatio.toFixed(1), score: debtScore, max: 2, status: debtScore===2?'perfect':debtScore===1?'good':'risky', totalAssets, totalLiabilities };
  score += debtScore;

  const total = Math.min(10, (score / 10 * 10).toFixed(1));
  return { score: parseFloat((score/2).toFixed(1)), total: 10, metrics, income, expense };
}

// ─── ESSENTIALS PAGE ─────────────────────────────────────────
function showEssentialsPage() {
  const page = document.getElementById('page-essentials');
  if (!page) return;
  const activeTab = page.dataset.activeTab || 'essentials';

  page.innerHTML = `
    <div class="page-header fade-up fade-up-1">
      <div>
        <div class="page-greeting">Your financial health check</div>
        <h1 class="page-title">Essentials <em>&amp; Goals</em></h1>
      </div>
    </div>
    <div class="wealth-tabs fade-up fade-up-2">
      <button class="wealth-tab ${activeTab==='essentials'?'active':''}" onclick="switchEssentialsTab('essentials')">Essentials</button>
      <button class="wealth-tab ${activeTab==='goals'?'active':''}" onclick="switchEssentialsTab('goals')">Goals</button>
    </div>
    <div id="essentials-tab-content" class="fade-up fade-up-3"></div>`;

  switchEssentialsTab(activeTab);
}

function switchEssentialsTab(tab) {
  const page = document.getElementById('page-essentials');
  if (!page) return;
  page.dataset.activeTab = tab;
  page.querySelectorAll('.wealth-tab').forEach(b => b.classList.toggle('active', b.getAttribute('onclick').includes(`'${tab}'`)));
  const content = document.getElementById('essentials-tab-content');
  if (!content) return;
  if (tab === 'essentials') renderEssentialHealth(content);
  if (tab === 'goals')      renderGoalsPage(content);
}

// ─── HEALTH PAGE ─────────────────────────────────────────────
function renderEssentialHealth(container) {
  const { score, total, metrics, income, expense } = calcHealthScore();
  const statusColor = score >= 7 ? 'var(--emerald)' : score >= 4 ? 'var(--gold)' : 'var(--rose)';
  const statusLabel = score >= 7 ? 'On Track' : score >= 4 ? 'Getting There' : 'Needs Attention';
  const pct = (score / total * 100).toFixed(0);

  // Financial Profile
  const esSettings = state.essentials_settings || {};

  container.innerHTML = `
    <!-- Financial Profile -->
    <div class="chart-card" style="margin-bottom:16px;">
      <div class="section-heading" style="cursor:pointer;margin-bottom:0;" onclick="toggleFinancialProfile()">
        <div class="section-title"><span class="dot"></span> Financial Profile</div>
        <span id="profileToggleIcon" style="color:var(--text-3);">▼</span>
      </div>
      <div id="financialProfileBody" style="margin-top:16px;display:none;">
        <div class="grid-2" style="gap:12px;">
          <div>
            <label class="form-label">Liquid Assets (₹)</label>
            <input id="es_liquid" type="number" class="form-input" placeholder="Cash + FD + Liquid Funds" value="${esSettings.liquidAssets||''}" />
          </div>
          <div>
            <label class="form-label">Term Insurance Cover (₹)</label>
            <input id="es_term" type="number" class="form-input" placeholder="Total sum assured" value="${esSettings.termCover||''}" />
          </div>
          <div>
            <label class="form-label">Health Insurance Cover (₹)</label>
            <input id="es_health" type="number" class="form-input" placeholder="Sum insured" value="${esSettings.healthCover||''}" />
          </div>
          <div>
            <label class="form-label">Number of Dependents</label>
            <input id="es_dependents" type="number" class="form-input" placeholder="0" value="${esSettings.healthDependents||''}" />
          </div>
        </div>
        <button class="btn-submit" style="width:auto;padding:9px 20px;margin-top:12px;font-size:13px;" onclick="saveEssentialsSettings()">💾 Save Profile</button>
      </div>
    </div>

    <!-- Overall Health Score -->
    <div class="chart-card" style="margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div style="flex:1;">
          <div class="kpi-label">OVERALL HEALTH SCORE</div>
          <div style="display:flex;align-items:baseline;gap:4px;margin:4px 0;">
            <span style="font-family:var(--font-m);font-size:32px;font-weight:700;color:${statusColor};">${score}</span>
            <span style="font-size:16px;color:var(--text-3);">/10</span>
          </div>
          <div style="font-size:12px;color:${statusColor};">${statusLabel}</div>
        </div>
        <div style="flex:3;min-width:200px;">
          <div style="background:var(--bg3);border-radius:99px;height:12px;overflow:hidden;margin-bottom:6px;">
            <div style="width:${pct}%;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--rose),var(--gold),var(--emerald));transition:width 0.5s;"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-3);font-family:var(--font-m);">
            <span>0</span><span>5</span><span>10</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Health Metric Cards (2-col grid) -->
    <div class="two-col">
      ${buildEmergencyFundCard(metrics.emergencyFund)}
      ${buildSavingsRateCard(metrics.savingsRate, income, expense)}
    </div>
    <div class="two-col" style="margin-top:0;">
      ${buildTermInsuranceCard(metrics.termInsurance)}
      ${buildHealthInsuranceCard(metrics.healthInsurance)}
    </div>
    <div style="margin-top:0;">
      ${buildDebtRatioCard(metrics.debtRatio)}
    </div>`;
}

function toggleFinancialProfile() {
  const body = document.getElementById('financialProfileBody');
  const icon = document.getElementById('profileToggleIcon');
  const isHidden = body.style.display === 'none';
  body.style.display = isHidden ? '' : 'none';
  icon.textContent = isHidden ? '▲' : '▼';
}

async function saveEssentialsSettings() {
  const settings = {
    liquidAssets: parseFloat(document.getElementById('es_liquid')?.value)||0,
    termCover: parseFloat(document.getElementById('es_term')?.value)||0,
    healthCover: parseFloat(document.getElementById('es_health')?.value)||0,
    healthDependents: parseInt(document.getElementById('es_dependents')?.value)||0
  };
  for (const [key, value] of Object.entries(settings)) {
    await put('essentials_settings', { key, value });
  }
  state.essentials_settings = { ...state.essentials_settings, ...settings };
  showToast('✅ Profile saved!', 'success');
  switchEssentialsTab('essentials');
}

function buildEmergencyFundCard(m) {
  const statusColor = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const statusBadge = `<span class="health-badge" style="background:${statusColor}20;color:${statusColor};">${m.status==='perfect'?'✅ Perfect':m.status==='good'?'⚡ Good':'🔴 Risky'}</span>`;
  const runwayPct = Math.min(100, (m.value / 12) * 100);

  return `
    <div class="chart-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">🛡️</span>
          <div class="chart-card-title" style="margin:0;">Emergency Fund</div>
        </div>
        ${statusBadge}
      </div>
      <div class="kpi-label">LIQUID ASSETS</div>
      <div style="font-family:var(--font-m);font-size:18px;margin:2px 0 8px;">${fmtINR(m.liquidAssets)}</div>
      <div class="kpi-label">RUNWAY</div>
      <div style="background:var(--bg3);border-radius:99px;height:8px;overflow:hidden;margin:6px 0;">
        <div style="width:${runwayPct}%;height:100%;border-radius:99px;background:${statusColor};"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-3);font-family:var(--font-m);">
        <span>0</span><span>3m</span><span>6m</span><span>12m+</span>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-2);">
        ${m.value < 3 ? '⚠️ Build at least 3 months of expenses in liquid savings' : m.value < 6 ? '💡 Good! Aim for 6 months for extra safety' : '✅ Excellent emergency fund coverage!'}
      </div>
    </div>`;
}

function buildSavingsRateCard(m, income, expense) {
  const statusColor = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const statusBadge = `<span class="health-badge" style="background:${statusColor}20;color:${statusColor};">${m.status==='perfect'?'✅ Perfect':m.status==='good'?'⚡ Good':'🔴 Risky'}</span>`;
  const savingsPct = Math.min(100, parseFloat(m.value)||0);

  // Time to FI calc (simplified: FI when investments = 25x annual expenses)
  const annualExpense = expense * 12;
  const currentNW = getNetWorth ? getNetWorth() : 0;
  const savings = income - expense;
  const fiTarget = annualExpense * 25;
  const remaining = fiTarget - currentNW;
  const yearsToFI = remaining > 0 && savings > 0 ? (remaining / (savings * 12)).toFixed(1) : '—';

  return `
    <div class="chart-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">💰</span>
          <div class="chart-card-title" style="margin:0;">Savings Rate</div>
        </div>
        ${statusBadge}
      </div>
      <div style="font-family:var(--font-m);font-size:28px;font-weight:700;color:${statusColor};">${m.value}%</div>
      <div style="font-size:12px;color:var(--text-3);margin:2px 0 8px;">of income saved (this month)</div>
      <div style="background:var(--bg3);border-radius:99px;height:8px;overflow:hidden;margin:8px 0;">
        <div style="width:${savingsPct}%;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--rose),var(--gold),var(--emerald));"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-3);">
        <span>0%</span><span>20%</span><span>50%</span><span>80%+</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border);">
        <div><div class="kpi-label">INCOME</div><div style="font-family:var(--font-m);font-size:13px;color:var(--emerald);">${fmtINR(income)}</div></div>
        <div><div class="kpi-label">EXPENSE</div><div style="font-family:var(--font-m);font-size:13px;color:var(--rose);">${fmtINR(expense)}</div></div>
      </div>
      ${yearsToFI !== '—' ? `<div style="margin-top:8px;padding:8px;background:var(--bg3);border-radius:8px;font-size:12px;">
        <span style="color:var(--text-3);">TIME TO FINANCIAL INDEPENDENCE:</span>
        <strong style="color:var(--teal);margin-left:6px;">~${yearsToFI} yrs</strong>
      </div>` : ''}
    </div>`;
}

function buildTermInsuranceCard(m) {
  const statusColor = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const statusBadge = `<span class="health-badge" style="background:${statusColor}20;color:${statusColor};">${m.status==='perfect'?'✅ Perfect':m.status==='good'?'⚡ Good':'🔴 Risky'}</span>`;

  return `
    <div class="chart-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">🛡️</span>
          <div class="chart-card-title" style="margin:0;">Term Insurance</div>
        </div>
        ${statusBadge}
      </div>
      <div class="kpi-label">YOUR COVER</div>
      ${m.value > 0
        ? `<div style="font-family:var(--font-m);font-size:18px;margin:2px 0;">${fmtINR(m.value)}</div>`
        : `<div style="font-size:13px;color:var(--text-3);margin:4px 0;">Not set — <button class="section-action" style="display:inline;padding:2px 8px;" onclick="toggleFinancialProfile();document.getElementById('financialProfileBody').style.display=''">Enter cover amount</button></div>`}
      <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">
        <div class="kpi-label">IDEAL COVER</div>
        <div style="font-family:var(--font-m);font-size:14px;color:var(--text-2);">${fmtINR(Math.max(0,m.idealCover))}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:2px;">Formula: 25× Annual Expense − Net Worth</div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-2);">
        ${m.value === 0 ? '⚠️ Your term cover is significantly below the recommended amount' : m.value >= m.idealCover * 0.8 ? '✅ Good coverage!' : '💡 Consider increasing your term cover'}
      </div>
    </div>`;
}

function buildHealthInsuranceCard(m) {
  const statusColor = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const statusBadge = `<span class="health-badge" style="background:${statusColor}20;color:${statusColor};">${m.status==='perfect'?'✅ Perfect':m.status==='good'?'⚡ Good':'🔴 Risky'}</span>`;

  return `
    <div class="chart-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">🏥</span>
          <div class="chart-card-title" style="margin:0;">Health Insurance</div>
        </div>
        ${statusBadge}
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
        <div class="kpi-label">DEPENDENTS:</div>
        <div style="font-family:var(--font-m);font-size:14px;">${m.dependents} people</div>
      </div>
      <div class="kpi-label">YOUR COVER</div>
      ${m.value > 0
        ? `<div style="font-family:var(--font-m);font-size:18px;margin:2px 0;">${fmtINR(m.value)}</div>`
        : `<div style="font-size:13px;color:var(--text-3);margin:4px 0;">Not set — <button class="section-action" style="display:inline;padding:2px 8px;" onclick="toggleFinancialProfile();document.getElementById('financialProfileBody').style.display=''">Enter cover amount</button></div>`}
      <div style="margin-top:8px;padding:8px;background:var(--bg3);border-radius:8px;font-size:12px;">
        <div class="kpi-label">RECOMMENDED</div>
        <div style="color:var(--text-2);">Min ₹5L · Good ₹10L+ per person</div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-2);">
        ${m.value === 0 ? '⚠️ Minimum ₹5L private health cover is recommended' : m.value >= 1000000 ? '✅ Good coverage!' : '💡 Consider upgrading to ₹10L+ for better protection'}
      </div>
    </div>`;
}

function buildDebtRatioCard(m) {
  const statusColor = m.status==='perfect'?'var(--emerald)':m.status==='good'?'var(--gold)':'var(--rose)';
  const statusBadge = `<span class="health-badge" style="background:${statusColor}20;color:${statusColor};">${m.status==='perfect'?'✅ Perfect':m.status==='good'?'⚡ Good':'🔴 Risky'}</span>`;
  const pct = Math.min(100, parseFloat(m.value)||0);

  return `
    <div class="chart-card" style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:20px;">⚖️</span>
          <div class="chart-card-title" style="margin:0;">Debt Ratio</div>
        </div>
        ${statusBadge}
      </div>
      <div style="font-family:var(--font-m);font-size:28px;font-weight:700;color:${statusColor};">${m.value}%</div>
      <div style="font-size:12px;color:var(--text-3);margin-bottom:8px;">of assets are debt-funded</div>
      <div style="background:var(--bg3);border-radius:99px;height:8px;overflow:hidden;margin:8px 0;">
        <div style="width:${pct}%;height:100%;border-radius:99px;background:${statusColor};"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-3);">
        <span>0%</span><span>10%</span><span>30%</span><span>50%+</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
        <div><div class="kpi-label">TOTAL ASSETS</div><div style="font-family:var(--font-m);font-size:13px;">${fmtINR(m.totalAssets)}</div></div>
        <div><div class="kpi-label">TOTAL LIABILITIES</div><div style="font-family:var(--font-m);font-size:13px;color:${m.totalLiabilities>0?'var(--rose)':'var(--text-3)'};">${fmtINR(m.totalLiabilities)}</div></div>
        <div>
          <div class="kpi-label">NET WORTH</div>
          <div style="font-family:var(--font-m);font-size:13px;color:var(--teal);">${fmtINR(m.totalAssets - m.totalLiabilities)}</div>
        </div>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--text-2);">
        ${parseFloat(m.value) === 0 ? '✅ No liabilities — excellent financial position!' : parseFloat(m.value) < 10 ? '✅ Low debt ratio — healthy!' : parseFloat(m.value) < 30 ? '💡 Moderate debt — manageable but watch it' : '⚠️ High debt ratio — consider reducing liabilities'}
      </div>
    </div>`;
}

// ─── GOALS PAGE ───────────────────────────────────────────────
function renderGoalsPage(container) {
  const goals = state.savings || [];

  container.innerHTML = `
    ${goals.length === 0
      ? `<div class="empty-state" style="padding:40px 0;">
          <div class="empty-state-icon">🎯</div>
          <div class="empty-state-text">No goals yet</div>
          <div class="empty-state-sub">Set financial goals to track your progress toward milestones like retirement, home purchase, or emergency funds.</div>
         </div>`
      : `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-bottom:16px;">
          ${goals.map(g => buildGoalCard(g)).join('')}
         </div>`}

    <!-- Create New Goal -->
    <div class="section-heading" style="margin-top:8px;">
      <div class="section-title"><span class="dot" style="background:var(--gold)"></span>Create New Goal</div>
      <button class="section-action" onclick="toggleNewGoalForm()">
        <span id="newGoalToggle">+ New Goal</span>
      </button>
    </div>

    <div id="newGoalForm" class="chart-card" style="display:none;">
      <form id="createGoalForm" class="space-y-4">
        <div class="grid-2">
          <div>
            <label class="form-label">Goal Name*</label>
            <div style="display:flex;align-items:center;gap:8px;">
              <span id="goalEmoji" style="font-size:20px;cursor:pointer;" onclick="cycleGoalEmoji()">🎯</span>
              <input id="goal_name" class="form-input" placeholder="Goal name" required />
            </div>
          </div>
          <div>
            <label class="form-label">Template</label>
            <select id="goal_template" class="form-input" onchange="applyGoalTemplate()">
              <option value="">Select a template...</option>
              <option value="retirement">🏖️ Retirement Fund</option>
              <option value="home">🏠 Home Purchase</option>
              <option value="emergency">🛡️ Emergency Fund</option>
              <option value="education">📚 Education</option>
              <option value="vehicle">🚗 Vehicle</option>
              <option value="vacation">✈️ Vacation</option>
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div>
            <label class="form-label">Target Amount (₹)*</label>
            <input id="goal_target" type="number" step="1" class="form-input" placeholder="₹" required />
          </div>
          <div>
            <label class="form-label">Target Date*</label>
            <input id="goal_date" type="date" class="form-input" required />
          </div>
        </div>
        <div>
          <label class="form-label">Track Progress By</label>
          <select id="goal_trackBy" class="form-input">
            <option value="networth">Net Worth (all assets)</option>
            <option value="savings">Savings Balance</option>
            <option value="manual">Manual Update</option>
          </select>
        </div>
        <div>
          <label class="form-label">Notes (optional)</label>
          <textarea id="goal_notes" class="form-input form-textarea" rows="2" placeholder="Why this goal matters, milestones, plan..."></textarea>
        </div>
        <div class="grid-2">
          <button type="submit" class="btn-submit">🎯 Create Goal</button>
          <button type="button" class="btn-secondary" onclick="toggleNewGoalForm()">Cancel</button>
        </div>
      </form>
    </div>`;

  // Bind form
  const form = document.getElementById('createGoalForm');
  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const emoji = document.getElementById('goalEmoji')?.textContent || '🎯';
      const goal = {
        id: uid('goal'),
        name: emoji + ' ' + document.getElementById('goal_name').value.trim(),
        target: parseFloat(document.getElementById('goal_target').value)||0,
        targetDate: document.getElementById('goal_date').value,
        trackBy: document.getElementById('goal_trackBy').value,
        notes: document.getElementById('goal_notes').value.trim(),
        current: 0,
        createdAt: nowISO()
      };

      try {
        await put('savings', goal);
        state.savings = [...(state.savings||[]), goal];
        showToast('✅ Goal created!', 'success');
        switchEssentialsTab('goals');
      } catch(e) {
        showToast('❌ Failed to create goal', 'error');
      }
    };
  }
}

const GOAL_EMOJIS = ['🎯','🏠','🚗','✈️','📚','🏖️','💒','👶','🛡️','💡','🌍','🎓'];
let goalEmojiIdx = 0;
function cycleGoalEmoji() {
  goalEmojiIdx = (goalEmojiIdx + 1) % GOAL_EMOJIS.length;
  const el = document.getElementById('goalEmoji');
  if (el) el.textContent = GOAL_EMOJIS[goalEmojiIdx];
}

function toggleNewGoalForm() {
  const form = document.getElementById('newGoalForm');
  if (!form) return;
  const isHidden = form.style.display === 'none';
  form.style.display = isHidden ? '' : 'none';
  const toggle = document.getElementById('newGoalToggle');
  if (toggle) toggle.textContent = isHidden ? '✕ Close' : '+ New Goal';
}

function applyGoalTemplate() {
  const tmpl = document.getElementById('goal_template').value;
  const nameEl = document.getElementById('goal_name');
  const targetEl = document.getElementById('goal_target');
  const emojiEl = document.getElementById('goalEmoji');
  const notesEl = document.getElementById('goal_notes');
  const templates = {
    retirement: { name: 'Retirement Fund', target: 10000000, emoji: '🏖️', notes: 'Build a corpus for financial independence' },
    home:       { name: 'Home Purchase',   target: 5000000,  emoji: '🏠', notes: 'Save for down payment and registration' },
    emergency:  { name: 'Emergency Fund',  target: 300000,   emoji: '🛡️', notes: '6 months of monthly expenses' },
    education:  { name: 'Education Fund',  target: 1000000,  emoji: '📚', notes: 'Higher education or children\'s education' },
    vehicle:    { name: 'Vehicle',         target: 800000,   emoji: '🚗', notes: 'Car or two-wheeler purchase' },
    vacation:   { name: 'Dream Vacation',  target: 150000,   emoji: '✈️', notes: 'Annual vacation fund' },
  };
  const t = templates[tmpl];
  if (!t) return;
  if (nameEl) nameEl.value = t.name;
  if (targetEl) targetEl.value = t.target;
  if (emojiEl) emojiEl.textContent = t.emoji;
  if (notesEl) notesEl.value = t.notes;
}

function buildGoalCard(g) {
  const target = toNum(g.target);
  const current = toNum(g.current || 0);
  const pct = target > 0 ? Math.min(100, (current/target*100)).toFixed(0) : 0;
  const daysLeft = g.targetDate ? Math.max(0, Math.ceil((new Date(g.targetDate)-new Date())/(1000*60*60*24))) : null;
  const statusColor = pct >= 75 ? 'var(--emerald)' : pct >= 40 ? 'var(--gold)' : 'var(--blue)';
  const monthlyNeeded = (daysLeft && daysLeft > 0) ? ((target - current) / (daysLeft / 30)).toFixed(0) : 0;

  return `
    <div class="chart-card" style="position:relative;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
        <div class="list-item-name">${g.name}</div>
        <div style="display:flex;gap:4px;">
          <button class="section-action" onclick="openUpdateGoalModal('${g.id}')" style="padding:3px 8px;font-size:11px;">✏️</button>
          <button class="section-action" onclick="deleteGoalItem('${g.id}')" style="padding:3px 8px;font-size:11px;color:var(--rose);">🗑️</button>
        </div>
      </div>

      <!-- Progress -->
      <div style="font-family:var(--font-m);font-size:20px;font-weight:600;color:${statusColor};">${fmtINR(current)}</div>
      <div style="font-size:11px;color:var(--text-3);margin-bottom:8px;">of ${fmtINR(target)} target</div>
      <div class="goal-bar-bg" style="margin-bottom:4px;">
        <div style="width:${pct}%;height:6px;border-radius:99px;background:${statusColor};"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-3);margin-bottom:10px;">
        <span>${pct}% achieved</span>
        ${daysLeft !== null ? `<span>${daysLeft} days left</span>` : ''}
      </div>

      ${g.notes ? `<div style="font-size:11px;color:var(--text-3);margin-bottom:8px;">${g.notes}</div>` : ''}

      ${monthlyNeeded > 0 ? `
        <div style="padding:8px;background:var(--bg3);border-radius:8px;font-size:12px;display:flex;justify-content:space-between;">
          <span style="color:var(--text-3);">Monthly needed</span>
          <strong style="color:var(--teal);">${fmtINR(monthlyNeeded)}</strong>
        </div>` : ''}
    </div>`;
}

function openUpdateGoalModal(id) {
  const goal = (state.savings||[]).find(g=>g.id===id);
  if (!goal) return;

  const html = `
    <div class="modal-overlay show" id="updateGoalOverlay">
      <div class="modal" style="max-width:420px;">
        <div class="modal-header">
          <h3 class="modal-title">🎯 Update Goal</h3>
          <button class="modal-close" onclick="closeEssentialModal('updateGoalOverlay')">×</button>
        </div>
        <div class="modal-body">
          <form id="updateGoalForm" class="space-y-4">
            <div>
              <label class="form-label">Goal Name</label>
              <input id="ug_name" class="form-input" value="${goal.name}" required />
            </div>
            <div class="grid-2">
              <div>
                <label class="form-label">Target Amount (₹)</label>
                <input id="ug_target" type="number" class="form-input" value="${goal.target}" required />
              </div>
              <div>
                <label class="form-label">Current Amount (₹)</label>
                <input id="ug_current" type="number" class="form-input" value="${goal.current||0}" />
              </div>
            </div>
            <div>
              <label class="form-label">Target Date</label>
              <input id="ug_date" type="date" class="form-input" value="${goal.targetDate||''}" />
            </div>
            <div>
              <label class="form-label">Notes</label>
              <textarea id="ug_notes" class="form-input form-textarea" rows="2">${goal.notes||''}</textarea>
            </div>
            <div class="grid-2">
              <button type="submit" class="btn-submit">💾 Save</button>
              <button type="button" class="btn-secondary" onclick="closeEssentialModal('updateGoalOverlay')">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>`;

  let container = document.getElementById('essentialModals');
  if (!container) {
    container = document.createElement('div');
    container.id = 'essentialModals';
    document.body.appendChild(container);
  }
  container.innerHTML = html;

  document.getElementById('updateGoalForm').onsubmit = async (e) => {
    e.preventDefault();
    const updated = {
      ...goal,
      name: document.getElementById('ug_name').value.trim(),
      target: parseFloat(document.getElementById('ug_target').value)||0,
      current: parseFloat(document.getElementById('ug_current').value)||0,
      targetDate: document.getElementById('ug_date').value,
      notes: document.getElementById('ug_notes').value.trim()
    };
    await put('savings', updated);
    state.savings = state.savings.map(g => g.id === id ? updated : g);
    closeEssentialModal('updateGoalOverlay');
    showToast('✅ Goal updated!', 'success');
    switchEssentialsTab('goals');
  };
}

async function deleteGoalItem(id) {
  if (!confirm('Delete this goal?')) return;
  try {
    await del('savings', id);
    state.savings = state.savings.filter(g => g.id !== id);
    showToast('Goal deleted', 'info');
    switchEssentialsTab('goals');
  } catch(e) { showToast('Failed to delete goal', 'error'); }
}

function closeEssentialModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.remove('show'); setTimeout(()=>el.remove(),300); }
  const container = document.getElementById('essentialModals');
  if (container) container.innerHTML = '';
}
