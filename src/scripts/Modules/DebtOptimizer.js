/**
 * LedgerMate – DebtOptimizer.js
 * ─────────────────────────────────────────────────────────────
 * Interactive Debt Snowball vs. Avalanche Payoff Simulator
 * Calculates optimal payoff schedule, months saved, and total interest saved.
 * Exposes: window.LM_DebtOptimizer
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  function getActiveDebts() {
    var rawLoans = (window.state && window.state.loans) ? window.state.loans : [];
    var emiLoans = (window.state && window.state.emi_loans) ? window.state.emi_loans : [];

    var debts = [];

    rawLoans.forEach(function (l, idx) {
      var bal = parseFloat(l.balance ?? l.amount) || 0;
      if (bal > 0 && l.type !== 'given') {
        debts.push({
          id: 'loan_' + (l.id || idx),
          name: l.person || l.name || 'Personal Loan',
          balance: bal,
          rate: parseFloat(l.interestRate || l.rate) || 10,
          minPayment: parseFloat(l.minPayment || l.monthlyPayment) || Math.max(500, bal * 0.03)
        });
      }
    });

    emiLoans.forEach(function (e, idx) {
      var bal = parseFloat(e.outstanding || e.principal) || 0;
      if (bal > 0) {
        debts.push({
          id: 'emi_' + (e.id || idx),
          name: e.loanName || e.name || 'EMI Loan',
          balance: bal,
          rate: parseFloat(e.annualRate || e.rate) || 12,
          minPayment: parseFloat(e.monthlyEmi || e.emi) || (bal * 0.04)
        });
      }
    });

    if (!debts.length) {
      // Demo defaults
      return [
        { id: 'd1', name: 'Credit Card Balance', balance: 45000, rate: 36, minPayment: 2500 },
        { id: 'd2', name: 'Personal Loan', balance: 120000, rate: 14.5, minPayment: 4200 },
        { id: 'd3', name: 'Car Loan', balance: 280000, rate: 9.2, minPayment: 6800 }
      ];
    }

    return debts;
  }

  // Simulate payoff timeline using specified strategy
  function simulatePayoff(debts, extraMonthlyPayment, strategy) {
    // Clone debts
    var list = debts.map(d => ({
      id: d.id,
      name: d.name,
      balance: d.balance,
      rate: d.rate,
      minPayment: d.minPayment,
      monthlyRate: (d.rate / 100) / 12,
      totalInterest: 0,
      paidOffMonth: 0
    }));

    // Strategy sorting
    if (strategy === 'snowball') {
      // Lowest balance first
      list.sort((a, b) => a.balance - b.balance);
    } else if (strategy === 'avalanche') {
      // Highest interest rate first
      list.sort((a, b) => b.rate - a.rate);
    }

    var month = 0;
    var maxMonths = 360; // 30 yr cap
    var totalInterestAll = 0;
    var monthlySchedule = [];

    while (list.some(d => d.balance > 0.5) && month < maxMonths) {
      month++;
      var availableExtra = extraMonthlyPayment;

      // 1. Apply monthly interest & pay minimums
      list.forEach(function (d) {
        if (d.balance <= 0) return;
        var interest = d.balance * d.monthlyRate;
        d.totalInterest += interest;
        totalInterestAll += interest;
        d.balance += interest;

        var payment = Math.min(d.balance, d.minPayment);
        d.balance -= payment;
        if (d.balance <= 0.5 && d.paidOffMonth === 0) {
          d.paidOffMonth = month;
          d.balance = 0;
        }
      });

      // 2. Apply extra payment to top prioritized active debt
      var target = list.find(d => d.balance > 0);
      if (target && availableExtra > 0) {
        var extraPay = Math.min(target.balance, availableExtra);
        target.balance -= extraPay;
        if (target.balance <= 0.5 && target.paidOffMonth === 0) {
          target.paidOffMonth = month;
          target.balance = 0;
        }
      }

      // Roll freed-up minimum payments into snowball
      list.forEach(function (d) {
        if (d.paidOffMonth > 0 && d.paidOffMonth < month) {
          availableExtra += d.minPayment;
        }
      });
    }

    return {
      strategy: strategy,
      totalMonths: month,
      totalInterest: totalInterestAll,
      debtResults: list
    };
  }

  function showSimulatorModal() {
    var existing = document.getElementById('lm-debt-modal');
    if (existing) existing.remove();

    var debts = getActiveDebts();
    var extraPayment = 5000;

    var modal = document.createElement('div');
    modal.id = 'lm-debt-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px);';

    function renderUI() {
      var snowball = simulatePayoff(debts, extraPayment, 'snowball');
      var avalanche = simulatePayoff(debts, extraPayment, 'avalanche');
      var baseline = simulatePayoff(debts, 0, 'snowball');

      var interestSaved = baseline.totalInterest - avalanche.totalInterest;
      var monthsSaved = baseline.totalMonths - avalanche.totalMonths;

      var fmt = (v) => '₹' + Math.round(v).toLocaleString('en-IN');

      modal.innerHTML = `
        <div style="background:var(--card,#151922);border:1px solid var(--border,#262f45);border-radius:16px;max-width:760px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.6);color:var(--text,#e8eaf6);font-family:Inter,sans-serif;">
          <div style="padding:16px 20px;border-bottom:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h3 style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;">🎯 Debt Payoff Optimizer</h3>
              <p style="font-size:11px;color:var(--text2,#8896b8);margin-top:2px;">Compare Debt Snowball vs. Debt Avalanche strategies to eliminate debt faster.</p>
            </div>
            <button id="lm-debt-close" style="background:none;border:none;color:var(--text2,#8896b8);font-size:22px;cursor:pointer;">&times;</button>
          </div>

          <!-- Controls -->
          <div style="padding:14px 20px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border,#262f45);display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
            <label style="font-size:12px;font-weight:600;">Extra Monthly Contribution:</label>
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:200px;">
              <input type="range" id="lm-debt-slider" min="0" max="50000" step="1000" value="${extraPayment}" style="flex:1;max-width:220px;cursor:pointer;"/>
              <strong id="lm-debt-extra-val" style="color:#00d4b4;font-size:13px;white-space:nowrap;">${fmt(extraPayment)}/mo</strong>
            </div>
          </div>

          <!-- Comparison Cards (Responsive Auto-Fit) -->
          <div style="padding:16px 20px;display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;background:rgba(0,0,0,0.2);">
            <!-- Snowball -->
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(79,142,247,0.3);border-radius:12px;padding:14px;">
              <div style="font-size:11px;font-weight:700;color:#4f8ef7;letter-spacing:0.5px;">❄️ DEBT SNOWBALL</div>
              <div style="font-size:10px;color:var(--text2,#8896b8);margin-top:2px;">Lowest balance first (Behavioral wins)</div>
              <div style="margin-top:10px;">
                <div style="font-size:20px;font-weight:800;color:#ffffff;">${snowball.totalMonths} months</div>
                <div style="font-size:11px;color:var(--text2,#8896b8);margin-top:2px;">Total Interest: <strong style="color:#f43f5e;">${fmt(snowball.totalInterest)}</strong></div>
              </div>
            </div>

            <!-- Avalanche -->
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(0,212,180,0.3);border-radius:12px;padding:14px;">
              <div style="font-size:11px;font-weight:700;color:#00d4b4;letter-spacing:0.5px;">⚡ DEBT AVALANCHE (Optimal)</div>
              <div style="font-size:10px;color:var(--text2,#8896b8);margin-top:2px;">Highest interest rate first (Saves most money)</div>
              <div style="margin-top:10px;">
                <div style="font-size:20px;font-weight:800;color:#ffffff;">${avalanche.totalMonths} months</div>
                <div style="font-size:11px;color:var(--text2,#8896b8);margin-top:2px;">Total Interest: <strong style="color:#10b981;">${fmt(avalanche.totalInterest)}</strong></div>
              </div>
            </div>
          </div>

          <!-- Summary banner -->
          <div style="margin:10px 20px 0;padding:10px 14px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:10px;font-size:11px;color:#10b981;line-height:1.4;">
            🎉 By contributing <strong>${fmt(extraPayment)}/mo extra</strong> with Avalanche, you become debt-free <strong>${monthsSaved} months earlier</strong> and save <strong>${fmt(interestSaved)}</strong> in interest!
          </div>

          <!-- Active Debts Table -->
          <div style="flex:1;overflow-y:auto;padding:14px 20px;-webkit-overflow-scrolling:touch;">
            <h4 style="font-size:12px;font-weight:700;margin-bottom:8px;">Your Active Debt Portfolio</h4>
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${debts.map(d => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(255,255,255,0.02);border:1px solid var(--border,#262f45);border-radius:8px;font-size:11px;flex-wrap:wrap;gap:6px;">
                  <div>
                    <strong style="color:var(--text,#e8eaf6);">${d.name}</strong>
                    <div style="font-size:10px;color:var(--text2,#8896b8);margin-top:1px;">Interest: ${d.rate}% p.a. · Min: ${fmt(d.minPayment)}/mo</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-weight:700;color:#f43f5e;font-size:12px;">${fmt(d.balance)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      document.getElementById('lm-debt-close').onclick = () => modal.remove();

      var slider = document.getElementById('lm-debt-slider');
      slider.oninput = function () {
        extraPayment = parseFloat(this.value) || 0;
        document.getElementById('lm-debt-extra-val').textContent = fmt(extraPayment) + '/mo';
      };
      slider.onchange = function () {
        renderUI();
      };
    }

    renderUI();
  }

  window.LM_DebtOptimizer = {
    simulate: simulatePayoff,
    showModal: showSimulatorModal,
    getActiveDebts: getActiveDebts
  };

  console.log('[LM] DebtOptimizer module initialized.');
})();
