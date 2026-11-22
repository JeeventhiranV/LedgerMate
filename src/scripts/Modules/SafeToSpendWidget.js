/**
 * LedgerMate – SafeToSpendWidget.js
 * ─────────────────────────────────────────────────────────────────────────────
 * "Safe to Spend" True Liquidity & Daily Burn Rate Cockpit.
 * Computes:
 *   Safe to Spend = (Liquid Bank & Cash Balances) - (Pending CC Bills + Dues in 15d)
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  function calculateLiquidity() {
    // 1. Calculate liquid bank & cash balances
    const txs = (window.state && Array.isArray(window.state.transactions)) ? window.state.transactions : [];
    let liquidCash = 0;
    for (const t of txs) {
      const amt = parseFloat(t.amount) || 0;
      if (t.type === 'income') liquidCash += amt;
      else if (t.type === 'expense') liquidCash -= amt;
    }

    // 2. Calculate pending credit card dues
    let ccDues = 0;
    const cards = (window.state && Array.isArray(window.state.credit_cards)) ? window.state.credit_cards : [];
    for (const c of cards) {
      ccDues += (parseFloat(c.currentBalance) || parseFloat(c.statementDue) || 0);
    }

    // 3. Calculate upcoming commitments in next 15 days
    let upcomingDues = 0;
    const now = new Date();
    const future15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

    // From reminders
    const reminders = (window.state && Array.isArray(window.state.reminders)) ? window.state.reminders : [];
    for (const r of reminders) {
      if (!r.paid && r.dueDate) {
        const d = new Date(r.dueDate);
        if (d >= now && d <= future15) {
          upcomingDues += (parseFloat(r.amount) || 0);
        }
      }
    }

    // From loans (EMIs due)
    const loans = (window.state && Array.isArray(window.state.loans)) ? window.state.loans : [];
    for (const l of loans) {
      if (l.type === 'taken' && l.pendingAmount > 0 && l.nextDueDate) {
        const d = new Date(l.nextDueDate);
        if (d >= now && d <= future15) {
          upcomingDues += (parseFloat(l.emiAmount) || parseFloat(l.pendingAmount) || 0);
        }
      }
    }

    const totalLiabilities = ccDues + upcomingDues;
    const safeToSpend = liquidCash - totalLiabilities;

    // Days remaining in month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(1, endOfMonth - now.getDate());
    const dailySafeBudget = safeToSpend > 0 ? (safeToSpend / daysLeft) : 0;

    let status = 'safe';
    if (safeToSpend < 0) status = 'danger';
    else if (safeToSpend < 10000) status = 'warning';

    return {
      liquidCash,
      ccDues,
      upcomingDues,
      totalLiabilities,
      safeToSpend,
      daysLeft,
      dailySafeBudget,
      status
    };
  }

  function render(targetContainerId = 'safeToSpendWidgetWrap') {
    let wrap = document.getElementById(targetContainerId);
    if (!wrap) {
      const parent = document.getElementById('dashboardTopMetrics') || document.querySelector('.dash-summary-grid') || document.getElementById('page-dashboard');
      if (!parent) return;
      wrap = document.createElement('div');
      wrap.id = targetContainerId;
      wrap.style.marginBottom = '16px';
      parent.prepend(wrap);
    }

    const data = calculateLiquidity();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    let statusBadgeColor = '#10b981';
    let statusLabel = '🟢 Healthy Liquidity';
    if (data.status === 'warning') {
      statusBadgeColor = '#f59e0b';
      statusLabel = '🟡 Caution — Tight Margin';
    } else if (data.status === 'danger') {
      statusBadgeColor = '#ef4444';
      statusLabel = '🔴 Deficit Warning';
    }

    const fmt = (v) => '₹' + Math.abs(Math.round(v)).toLocaleString('en-IN');

    wrap.innerHTML = `
      <div class="safe-to-spend-card" style="background:var(--bg3,#1e293b);border:1px solid var(--border2,rgba(255,255,255,0.08));border-radius:16px;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;box-shadow:0 4px 20px rgba(0,0,0,0.15);">
        <div style="display:flex;align-items:center;gap:14px;">
          <div style="width:44px;height:44px;border-radius:12px;background:rgba(0,240,255,0.1);display:flex;align-items:center;justify-content:center;font-size:22px;">🛡️</div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:12px;font-weight:700;color:var(--text-3,#94a3b8);text-transform:uppercase;letter-spacing:0.5px;">Safe To Spend</span>
              <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:10px;background:rgba(255,255,255,0.06);color:${statusBadgeColor};">${statusLabel}</span>
            </div>
            <div style="font-size:24px;font-weight:800;color:${data.safeToSpend >= 0 ? 'var(--text,#f8fafc)' : '#fb7185'};margin-top:2px;">
              ${data.safeToSpend < 0 ? '-' : ''}${fmt(data.safeToSpend)}
            </div>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div style="text-align:right;">
            <div style="font-size:11px;color:var(--text-3,#94a3b8);">Daily Burn Limit</div>
            <div style="font-size:14px;font-weight:700;color:#00f0ff;">${fmt(data.dailySafeBudget)} / day</div>
            <div style="font-size:10px;color:var(--text-3,#64748b);">${data.daysLeft} days left in month</div>
          </div>
          <div style="width:1px;height:36px;background:var(--border2,rgba(255,255,255,0.08));"></div>
          <div style="text-align:right;">
            <div style="font-size:11px;color:var(--text-3,#94a3b8);">Pending Dues (15d)</div>
            <div style="font-size:14px;font-weight:700;color:#fb7185;">${fmt(data.totalLiabilities)}</div>
            <div style="font-size:10px;color:var(--text-3,#64748b);">CC Bills & EMIs</div>
          </div>
        </div>
      </div>
    `;
  }

  window.LM_SafeToSpend = {
    calculate: calculateLiquidity,
    render: render
  };

  // Auto-render on bus events
  if (window.LM_Bus) {
    LM_Bus.on('lm:data:changed', function () {
      setTimeout(render, 300);
    });
  }

})();
