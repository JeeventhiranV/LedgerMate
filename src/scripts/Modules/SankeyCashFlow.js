/**
 * LedgerMate – SankeyCashFlow.js
 * ─────────────────────────────────────────────────────────────
 * Interactive Cash Flow Sankey Visualizer
 * Maps Monthly Income ➔ Allocations (Needs, Wants, Savings, Debt) ➔ Categories
 * Exposes: window.LM_Sankey
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  function calculateFlowData(monthStr) {
    var txs = (window.state && window.state.transactions) ? window.state.transactions : [];
    if (monthStr) {
      txs = txs.filter(t => (t.date || '').startsWith(monthStr));
    }

    var incomeSources = {};
    var expenseCategories = {};
    var totalIncome = 0;
    var totalExpense = 0;

    txs.forEach(function (t) {
      var amt = parseFloat(t.amount) || 0;
      if (amt <= 0) return;
      var cat = t.category || 'Other';

      if (t.type === 'in') {
        totalIncome += amt;
        incomeSources[cat] = (incomeSources[cat] || 0) + amt;
      } else {
        totalExpense += amt;
        expenseCategories[cat] = (expenseCategories[cat] || 0) + amt;
      }
    });

    if (totalIncome === 0 && totalExpense === 0) {
      // Demo fallback if no transactions in selected month
      return {
        isEmpty: true,
        totalIncome: 100000,
        totalExpense: 65000,
        nodes: [
          { name: 'Salary', value: 90000, col: 0 },
          { name: 'Investments / Misc', value: 10000, col: 0 },
          { name: 'Total Inflow', value: 100000, col: 1 },
          { name: 'Needs (50%)', value: 40000, col: 2 },
          { name: 'Wants (30%)', value: 25000, col: 2 },
          { name: 'Savings & Surplus (20%)', value: 35000, col: 2 },
          { name: 'Rent & Bills', value: 25000, col: 3 },
          { name: 'Groceries', value: 15000, col: 3 },
          { name: 'Dining & Outings', value: 15000, col: 3 },
          { name: 'Shopping', value: 10000, col: 3 }
        ]
      };
    }

    // Classify expenses into Needs (Essentials), Wants (Discretionary), and Savings
    var needsCats = ['Bills & Utilities', 'Bills', 'Groceries', 'Rent', 'Healthcare', 'Transport & Fuel', 'Education'];
    var wantsCats = ['Food & Dining', 'Food', 'Shopping', 'Entertainment', 'Subscriptions', 'Travel', 'Personal Care'];

    var needsTotal = 0, wantsTotal = 0, otherExpense = 0;
    var detailedNeeds = {}, detailedWants = {};

    Object.keys(expenseCategories).forEach(function (c) {
      var val = expenseCategories[c];
      if (needsCats.some(nc => c.toLowerCase().includes(nc.toLowerCase()))) {
        needsTotal += val;
        detailedNeeds[c] = val;
      } else if (wantsCats.some(wc => c.toLowerCase().includes(wc.toLowerCase()))) {
        wantsTotal += val;
        detailedWants[c] = val;
      } else {
        otherExpense += val;
        detailedWants[c] = val;
      }
    });

    var netSavings = Math.max(0, totalIncome - totalExpense);

    return {
      isEmpty: false,
      totalIncome: totalIncome,
      totalExpense: totalExpense,
      netSavings: netSavings,
      incomeSources: incomeSources,
      needsTotal: needsTotal,
      wantsTotal: wantsTotal + otherExpense,
      detailedNeeds: detailedNeeds,
      detailedWants: detailedWants
    };
  }

  function renderSankeySVG(containerId, monthStr) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var data = calculateFlowData(monthStr);
    var width = container.clientWidth || 720;
    var height = 360;

    var incList = Object.keys(data.incomeSources || {});
    if (!incList.length) incList = ['Income'];

    var needsList = Object.keys(data.detailedNeeds || {});
    var wantsList = Object.keys(data.detailedWants || {});

    var fmt = (v) => '₹' + Math.round(v).toLocaleString('en-IN');

    container.innerHTML = `
      <div style="background:var(--card,#151922);border:1px solid var(--border,#262f45);border-radius:14px;padding:20px;color:var(--text,#e8eaf6);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <div>
            <h4 style="font-size:15px;font-weight:700;display:flex;align-items:center;gap:6px;">🌊 Cash Flow Sankey Diagram</h4>
            <p style="font-size:11px;color:var(--text2,#8896b8);">Visualize how money moves from income sources into needs, wants, and savings.</p>
          </div>
          <div style="display:flex;gap:12px;font-size:12px;">
            <span style="color:#10b981;">● Inflow: ${fmt(data.totalIncome)}</span>
            <span style="color:#f43f5e;">● Outflow: ${fmt(data.totalExpense)}</span>
            <span style="color:#00d4b4;">● Savings: ${fmt(data.netSavings)}</span>
          </div>
        </div>

        <svg viewBox="0 0 760 320" style="width:100%;height:auto;overflow:visible;font-family:Inter,sans-serif;">
          <defs>
            <linearGradient id="grad-in-mid" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#10b981" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#4f8ef7" stop-opacity="0.45"/>
            </linearGradient>
            <linearGradient id="grad-mid-needs" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#4f8ef7" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.45"/>
            </linearGradient>
            <linearGradient id="grad-mid-wants" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#4f8ef7" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.45"/>
            </linearGradient>
            <linearGradient id="grad-mid-save" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#4f8ef7" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#00d4b4" stop-opacity="0.45"/>
            </linearGradient>
          </defs>

          <!-- Paths / Ribbons -->
          <!-- Income to Central Hub -->
          <path id="flow-path-in1" d="M 120 70 C 220 70, 220 150, 320 150" fill="none" stroke="rgba(16, 185, 129, 0.2)" stroke-width="20" stroke-linecap="round"/>
          <path d="M 120 70 C 220 70, 220 150, 320 150 L 320 170 C 220 170, 220 90, 120 90 Z" fill="url(#grad-in-mid)"/>
          
          <path id="flow-path-in2" d="M 120 180 C 220 180, 220 160, 320 160" fill="none" stroke="rgba(16, 185, 129, 0.2)" stroke-width="16" stroke-linecap="round"/>
          <path d="M 120 180 C 220 180, 220 160, 320 160 L 320 175 C 220 175, 220 195, 120 195 Z" fill="url(#grad-in-mid)"/>

          <!-- Central Hub to Needs -->
          <path id="flow-path-needs" d="M 370 132 C 460 132, 460 72, 560 72" fill="none" stroke="rgba(245, 158, 11, 0.2)" stroke-width="22" stroke-linecap="round"/>
          <path d="M 370 120 C 460 120, 460 60, 560 60 L 560 85 C 460 85, 460 145, 370 145 Z" fill="url(#grad-mid-needs)"/>
          
          <!-- Central Hub to Wants -->
          <path id="flow-path-wants" d="M 370 160 C 460 160, 460 185, 560 185" fill="none" stroke="rgba(244, 63, 94, 0.2)" stroke-width="24" stroke-linecap="round"/>
          <path d="M 370 145 C 460 145, 460 170, 560 170 L 560 200 C 460 200, 460 175, 370 175 Z" fill="url(#grad-mid-wants)"/>
          
          <!-- Central Hub to Savings -->
          <path id="flow-path-save" d="M 370 187 C 460 187, 460 282, 560 282" fill="none" stroke="rgba(0, 212, 180, 0.2)" stroke-width="22" stroke-linecap="round"/>
          <path d="M 370 175 C 460 175, 460 270, 560 270 L 560 295 C 460 295, 460 200, 370 200 Z" fill="url(#grad-mid-save)"/>

          <!-- Glowing Energy Particle Streams -->
          <circle r="4" fill="#10b981" filter="drop-shadow(0 0 8px #10b981)">
            <animateMotion dur="2.2s" repeatCount="indefinite" path="M 120 70 C 220 70, 220 150, 320 150"/>
          </circle>
          <circle r="3.5" fill="#10b981" filter="drop-shadow(0 0 6px #10b981)">
            <animateMotion dur="2.5s" repeatCount="indefinite" path="M 120 180 C 220 180, 220 160, 320 160"/>
          </circle>
          <circle r="4.5" fill="#f59e0b" filter="drop-shadow(0 0 8px #f59e0b)">
            <animateMotion dur="2.4s" repeatCount="indefinite" path="M 370 132 C 460 132, 460 72, 560 72"/>
          </circle>
          <circle r="4.5" fill="#f43f5e" filter="drop-shadow(0 0 8px #f43f5e)">
            <animateMotion dur="2.1s" repeatCount="indefinite" path="M 370 160 C 460 160, 460 185, 560 185"/>
          </circle>
          <circle r="5" fill="#00d4b4" filter="drop-shadow(0 0 10px #00d4b4)">
            <animateMotion dur="1.9s" repeatCount="indefinite" path="M 370 187 C 460 187, 460 282, 560 282"/>
          </circle>

          <!-- Level 1 Nodes: Inflow Sources -->
          <g transform="translate(10, 45)">
            <rect width="110" height="50" rx="8" fill="#152620" stroke="#10b981" stroke-width="1.5"/>
            <text x="10" y="22" font-size="11" font-weight="600" fill="#10b981">💼 Primary Income</text>
            <text x="10" y="38" font-size="12" font-weight="700" fill="#ffffff">${fmt(data.totalIncome * 0.85)}</text>
          </g>
          <g transform="translate(10, 155)">
            <rect width="110" height="50" rx="8" fill="#152620" stroke="#10b981" stroke-width="1.5"/>
            <text x="10" y="22" font-size="11" font-weight="600" fill="#10b981">📈 Other Inflow</text>
            <text x="10" y="38" font-size="12" font-weight="700" fill="#ffffff">${fmt(data.totalIncome * 0.15)}</text>
          </g>

          <!-- Level 2 Node: Total Flow Hub -->
          <g transform="translate(290, 105)">
            <rect width="100" height="110" rx="10" fill="#18253d" stroke="#4f8ef7" stroke-width="2"/>
            <text x="12" y="35" font-size="11" font-weight="600" fill="#4f8ef7">TOTAL INFLOW</text>
            <text x="12" y="58" font-size="14" font-weight="700" fill="#ffffff">${fmt(data.totalIncome)}</text>
            <text x="12" y="85" font-size="10" fill="#8896b8">100% Capital</text>
          </g>

          <!-- Level 3 Nodes: Allocations -->
          <g transform="translate(560, 35)">
            <rect width="180" height="55" rx="8" fill="#2d2215" stroke="#f59e0b" stroke-width="1.5"/>
            <text x="12" y="22" font-size="11" font-weight="600" fill="#f59e0b">🛡️ Essential Needs</text>
            <text x="12" y="42" font-size="13" font-weight="700" fill="#ffffff">${fmt(data.needsTotal || data.totalExpense * 0.5)}</text>
          </g>

          <g transform="translate(560, 145)">
            <rect width="180" height="55" rx="8" fill="#2d151c" stroke="#f43f5e" stroke-width="1.5"/>
            <text x="12" y="22" font-size="11" font-weight="600" fill="#f43f5e">🎉 Lifestyle & Wants</text>
            <text x="12" y="42" font-size="13" font-weight="700" fill="#ffffff">${fmt(data.wantsTotal || data.totalExpense * 0.3)}</text>
          </g>

          <g transform="translate(560, 245)">
            <rect width="180" height="55" rx="8" fill="#102a28" stroke="#00d4b4" stroke-width="1.5"/>
            <text x="12" y="22" font-size="11" font-weight="600" fill="#00d4b4">💰 Net Savings / Wealth</text>
            <text x="12" y="42" font-size="13" font-weight="700" fill="#ffffff">${fmt(data.netSavings || data.totalIncome * 0.2)}</text>
          </g>
        </svg>
      </div>
    `;
  }

  function showSankeyModal() {
    var existing = document.getElementById('lm-sankey-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'lm-sankey-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.82);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);';

    modal.innerHTML = `
      <div class="modal-box glass" style="background:var(--card,#151922);border:1px solid var(--border,#262f45);border-radius:18px;max-width:860px;width:96%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.6);color:var(--text,#e8eaf6);font-family:Inter,sans-serif;margin-bottom:env(safe-area-inset-bottom, 12px);">
        <div style="padding:14px 20px;border-bottom:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;margin:0;">🌊 Cash Flow Sankey Visualizer</h3>
          <button id="lm-sankey-close" style="background:none;border:none;color:var(--text2,#8896b8);font-size:24px;cursor:pointer;line-height:1;" title="Close">&times;</button>
        </div>
        <div id="lm-sankey-body" style="padding:16px 20px;overflow-y:auto;overflow-x:auto;-webkit-overflow-scrolling:touch;">
          <!-- SVG rendered here -->
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    if (window.LM_hideBottomNav) window.LM_hideBottomNav();

    function closeModal() {
      modal.remove();
      if (window.LM_syncModalState) window.LM_syncModalState();
    }

    document.getElementById('lm-sankey-close').onclick = closeModal;
    modal.onclick = function(e) {
      if (e.target === modal) closeModal();
    };

    var currentMonth = new Date().toISOString().slice(0, 7);
    renderSankeySVG('lm-sankey-body', currentMonth);
  }

  window.LM_Sankey = {
    render: renderSankeySVG,
    showModal: showSankeyModal
  };
  window.openSankeyModal = showSankeyModal;
  window.LM_openCashFlowVisualizer = showSankeyModal;

  console.log('[LM] SankeyCashFlow module initialized.');
})();
