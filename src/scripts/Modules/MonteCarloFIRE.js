/**
 * LedgerMate – MonteCarloFIRE.js
 * ─────────────────────────────────────────────────────────────
 * Monte Carlo Net Worth & FIRE (Financial Independence) Simulator.
 * Runs 1,000 statistical market & inflation simulation paths to model
 * probabilistic wealth trajectories (10th, 50th, 90th percentile) and FIRE runway.
 * Exposes: window.LM_MonteCarloFIRE
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // Standard Box-Muller transform for normal distribution random sampling
  function randomNormal(mean = 0, stdDev = 1) {
    let u1 = 0, u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return z0 * stdDev + mean;
  }

  /**
   * Run Monte Carlo FIRE Simulation
   * @param {Object} params
   * @param {number} params.currentNetWorth - Current total wealth (₹)
   * @param {number} params.monthlySavings - Monthly SIP / savings (₹)
   * @param {number} params.annualExpenses - Annual living expenses (₹)
   * @param {number} params.currentAge - Current age in years
   * @param {number} params.targetAge - Retirement or target age
   * @param {number} params.expectedReturnMean - Mean annual equity return (default 0.12 = 12%)
   * @param {number} params.expectedReturnStdDev - Volatility standard deviation (default 0.16 = 16%)
   * @param {number} params.inflationRate - Expected inflation (default 0.06 = 6%)
   * @param {number} params.simulationsCount - Number of trials (default 1000)
   */
  function runSimulation({
    currentNetWorth = 1000000,
    monthlySavings = 30000,
    annualExpenses = 600000,
    currentAge = 25,
    targetAge = 50,
    expectedReturnMean = 0.12,
    expectedReturnStdDev = 0.15,
    inflationRate = 0.06,
    simulationsCount = 1000
  }) {
    const years = Math.max(1, targetAge - currentAge);
    const targetFIRECorpus = (annualExpenses * 25); // Standard 4% Safe Withdrawal Rule (25x expenses)

    const allPaths = []; // [simIndex][yearIndex]

    for (let sim = 0; sim < simulationsCount; sim++) {
      const path = [currentNetWorth];
      let balance = currentNetWorth;
      let exp = annualExpenses;

      for (let y = 1; y <= years; y++) {
        // Sample random annual return from normal distribution
        const annualReturn = randomNormal(expectedReturnMean, expectedReturnStdDev);
        const annualSavings = monthlySavings * 12 * Math.pow(1 + inflationRate, y - 1);
        exp = exp * (1 + inflationRate);

        // Growth = (balance + annualSavings) * (1 + annualReturn)
        balance = Math.max(0, (balance + annualSavings) * (1 + annualReturn));
        path.push(Math.round(balance));
      }
      allPaths.push(path);
    }

    // Extract percentiles for each year (10th percentile = pessimistic, 50th = median, 90th = optimistic)
    const p10 = [];
    const p50 = [];
    const p90 = [];
    const labels = [];

    for (let y = 0; y <= years; y++) {
      labels.push(`Age ${currentAge + y}`);
      const valuesAtYear = allPaths.map(p => p[y]).sort((a, b) => a - b);
      p10.push(valuesAtYear[Math.floor(simulationsCount * 0.10)]);
      p50.push(valuesAtYear[Math.floor(simulationsCount * 0.50)]);
      p90.push(valuesAtYear[Math.floor(simulationsCount * 0.90)]);
    }

    const finalMedian = p50[p50.length - 1];
    const fireSuccessCount = allPaths.filter(p => p[p.length - 1] >= targetFIRECorpus).length;
    const fireProbability = Math.round((fireSuccessCount / simulationsCount) * 100);

    return {
      labels,
      p10,
      p50,
      p90,
      targetFIRECorpus: Math.round(targetFIRECorpus),
      finalMedian,
      fireProbability,
      yearsToTarget: years
    };
  }

  /**
   * UI Modal for Interactive Monte Carlo FIRE Simulator
   */
  function openFIREModal() {
    const existing = document.getElementById('lm-fire-modal');
    if (existing) existing.remove();

    // Auto-calculate initial net worth from window.state if available
    let autoNetWorth = 500000;
    if (window.state) {
      const invTotal = (window.state.investments || []).reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
      const savTotal = (window.state.savings || []).reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
      if (invTotal + savTotal > 0) autoNetWorth = invTotal + savTotal;
    }

    const modal = document.createElement('div');
    modal.id = 'lm-fire-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px);';

    modal.innerHTML = `
      <div style="background:var(--card-bg, #111420);border:1px solid var(--border, #262f45);border-radius:20px;max-width:760px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.8);overflow:hidden;color:var(--text, #f1f4fd);font-family:Inter,-apple-system,sans-serif;">
        <!-- Header -->
        <div style="padding:16px 20px;border-bottom:1px solid var(--border, #262f45);display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:22px;">🎲</span>
            <div>
              <div style="font-size:15px;font-weight:700;">Monte Carlo Net Worth & FIRE Simulator</div>
              <div style="font-size:11px;color:var(--text-3, #7b88aa);">1,000 Statistical Economic Scenarios · Financial Independence Runway</div>
            </div>
          </div>
          <button id="fireCloseBtn" style="background:none;border:none;color:var(--text-3,#8896b8);font-size:22px;cursor:pointer;">&times;</button>
        </div>

        <!-- Body -->
        <div style="padding:20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:16px;-webkit-overflow-scrolling:touch;">
          <!-- Controls Grid -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px;background:rgba(255,255,255,0.01);padding:14px;border-radius:12px;border:1px solid var(--border,#262f45);">
            <div>
              <label style="font-size:10px;font-weight:600;color:var(--text-3,#8896b8);display:block;margin-bottom:3px;">Current Net Worth (₹)</label>
              <input type="number" id="fireNetWorth" value="${autoNetWorth}" style="width:100%;background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:6px;padding:6px 8px;color:#10b981;font-weight:700;font-size:12px;" />
            </div>
            <div>
              <label style="font-size:10px;font-weight:600;color:var(--text-3,#8896b8);display:block;margin-bottom:3px;">Monthly Savings (₹)</label>
              <input type="number" id="fireMonthlySavings" value="35000" style="width:100%;background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:6px;padding:6px 8px;color:#4f8ef7;font-weight:700;font-size:12px;" />
            </div>
            <div>
              <label style="font-size:10px;font-weight:600;color:var(--text-3,#8896b8);display:block;margin-bottom:3px;">Annual Expenses (₹)</label>
              <input type="number" id="fireAnnualExpenses" value="600000" style="width:100%;background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:6px;padding:6px 8px;color:#f59e0b;font-weight:700;font-size:12px;" />
            </div>
            <div>
              <label style="font-size:10px;font-weight:600;color:var(--text-3,#8896b8);display:block;margin-bottom:3px;">Current Age / Target Age</label>
              <div style="display:flex;gap:4px;">
                <input type="number" id="fireAge" value="25" style="width:50%;background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:6px;padding:6px;color:#fff;font-size:12px;" />
                <input type="number" id="fireTargetAge" value="48" style="width:50%;background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:6px;padding:6px;color:#fff;font-size:12px;" />
              </div>
            </div>
          </div>

          <!-- Probability Score Card -->
          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;">
            <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.3);border-radius:12px;padding:12px;text-align:center;">
              <div style="font-size:10px;color:var(--text-3,#8896b8);">FIRE Probability</div>
              <div id="fireProbValue" style="font-size:22px;font-weight:800;color:#10b981;margin-top:2px;">88%</div>
            </div>
            <div style="background:rgba(79,142,247,0.06);border:1px solid rgba(79,142,247,0.3);border-radius:12px;padding:12px;text-align:center;">
              <div style="font-size:10px;color:var(--text-3,#8896b8);">Median Net Worth (Age Target)</div>
              <div id="fireMedianValue" style="font-size:16px;font-weight:800;color:#4f8ef7;margin-top:4px;">₹2.4 Cr</div>
            </div>
            <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:12px;text-align:center;">
              <div style="font-size:10px;color:var(--text-3,#8896b8);">Required 25x Corpus</div>
              <div id="fireCorpusValue" style="font-size:16px;font-weight:800;color:#f59e0b;margin-top:4px;">₹1.5 Cr</div>
            </div>
          </div>

          <!-- Canvas Simulation Plot -->
          <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border,#262f45);border-radius:14px;padding:12px;position:relative;height:240px;">
            <canvas id="fireChartCanvas" style="width:100%;height:100%;"></canvas>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-size:10px;color:var(--text-3,#8896b8);">
              🟢 90th %ile (Optimistic) · 🔵 50th %ile (Median) · 🔴 10th %ile (Market Bear)
            </div>
            <button id="fireRecalculateBtn" style="padding:8px 16px;background:linear-gradient(135deg,#4f8ef7,#8b5cf6);border:none;border-radius:8px;color:#fff;font-weight:700;font-size:12px;cursor:pointer;">
              🔄 Re-run 1,000 Trials
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById('fireCloseBtn');
    const recalcBtn = document.getElementById('fireRecalculateBtn');
    closeBtn.onclick = () => modal.remove();

    function formatCrores(num) {
      if (num >= 10000000) return '₹' + (num / 10000000).toFixed(2) + ' Cr';
      if (num >= 100000) return '₹' + (num / 100000).toFixed(2) + ' L';
      return '₹' + num.toLocaleString('en-IN');
    }

    function drawSimulation() {
      const nw = parseFloat(document.getElementById('fireNetWorth').value) || 1000000;
      const sav = parseFloat(document.getElementById('fireMonthlySavings').value) || 30000;
      const exp = parseFloat(document.getElementById('fireAnnualExpenses').value) || 600000;
      const curAge = parseInt(document.getElementById('fireAge').value) || 25;
      const tgtAge = parseInt(document.getElementById('fireTargetAge').value) || 48;

      const res = runSimulation({
        currentNetWorth: nw,
        monthlySavings: sav,
        annualExpenses: exp,
        currentAge: curAge,
        targetAge: tgtAge
      });

      document.getElementById('fireProbValue').textContent = res.fireProbability + '%';
      document.getElementById('fireMedianValue').textContent = formatCrores(res.finalMedian);
      document.getElementById('fireCorpusValue').textContent = formatCrores(res.targetFIRECorpus);

      const canvas = document.getElementById('fireChartCanvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvas.parentElement.clientWidth - 24;
      const h = 216;
      canvas.width = w;
      canvas.height = h;

      ctx.clearRect(0, 0, w, h);

      const maxVal = Math.max(...res.p90, res.targetFIRECorpus * 1.2, 1000);
      const points = res.labels.length;

      function getX(idx) { return 40 + (idx / (points - 1)) * (w - 60); }
      function getY(val) { return h - 25 - (val / maxVal) * (h - 45); }

      // Gridlines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 4; g++) {
        const y = 20 + g * (h - 45) / 3;
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
      }

      // Draw P10-P90 Confidence Area
      ctx.fillStyle = 'rgba(79,142,247,0.12)';
      ctx.beginPath();
      res.p90.forEach((val, idx) => {
        if (idx === 0) ctx.moveTo(getX(idx), getY(val));
        else ctx.lineTo(getX(idx), getY(val));
      });
      for (let idx = points - 1; idx >= 0; idx--) {
        ctx.lineTo(getX(idx), getY(res.p10[idx]));
      }
      ctx.closePath();
      ctx.fill();

      // P90 Line
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      res.p90.forEach((val, idx) => {
        if (idx === 0) ctx.moveTo(getX(idx), getY(val));
        else ctx.lineTo(getX(idx), getY(val));
      });
      ctx.stroke();

      // P50 Median Line
      ctx.strokeStyle = '#4f8ef7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      res.p50.forEach((val, idx) => {
        if (idx === 0) ctx.moveTo(getX(idx), getY(val));
        else ctx.lineTo(getX(idx), getY(val));
      });
      ctx.stroke();

      // P10 Bear Line
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      res.p10.forEach((val, idx) => {
        if (idx === 0) ctx.moveTo(getX(idx), getY(val));
        else ctx.lineTo(getX(idx), getY(val));
      });
      ctx.stroke();

      // Target Corpus line (Dashed orange)
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, getY(res.targetFIRECorpus));
      ctx.lineTo(w - 20, getY(res.targetFIRECorpus));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    setTimeout(drawSimulation, 100);
    recalcBtn.onclick = drawSimulation;
  }

  window.LM_MonteCarloFIRE = {
    runSimulation,
    openFIREModal
  };

  console.log('[LM] MonteCarloFIRE simulation module ready.');
})();
