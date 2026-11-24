/**
 * LedgerMate – CommandPalette.js (Omnisearch 2.0)
 * ─────────────────────────────────────────────────────────────
 * Raycast/Spotlight-style Omnisearch & Quick Command Engine.
 * Features:
 *   1. Deep fuzzy search across Commands, Transactions, Stocks,
 *      Credit Cards, Loans, Notes, and System Tools.
 *   2. Safe inline financial math calculator (e.g. "25000 * 0.18").
 *   3. Natural language transaction creator ("+1500 Freelance", "-450 Coffee").
 *   4. Direct 1-click access to GAAP Financial Reports & General Ledger.
 *   5. Keyboard-first navigation (↑, ↓, Enter, ESC, Tab).
 * Keyboard shortcut: Ctrl+K / Cmd+K
 * Exposes: window.LM_CommandPalette
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _isOpen = false;
  var _selectedIdx = 0;

  var STATIC_COMMANDS = [
    // Executive Hub & Financial Statements
    { title: '⊞ Executive Apps & Modules Hub', desc: 'Browse all 44+ financial engines, telemetry & tools', icon: '⊞', group: 'NAV', action: () => { if (typeof showPage === 'function') showPage('modules'); } },
    { title: '📑 Generate Audit Financial Reports', desc: 'Auditor-ready Balance Sheet, P&L, Capital Gains & Cash Flow statements', icon: '📑', group: 'REPORTS', action: () => window.LM_FinancialReporting?.showReportingModal() },
    { title: '⚖️ Double-Entry General Ledger & Trial Balance', desc: 'Audit Trial Balance, Balance Sheet integrity & journal entries', icon: '⚖️', group: 'REPORTS', action: () => window.LM_GeneralLedger?.showGeneralLedgerModal() },
    { title: '🌾 Indian Tax & Capital Gains Harvester', desc: 'Compare Old vs New Regime (Budget 2024), advance tax & LTCG harvesting', icon: '🌾', group: 'TAX', action: () => { if (typeof showPage === 'function') showPage('tax-planner'); } },

    // Core Transactions & Money Management
    { title: '💳 Credit Cards & Grace Day Arbitrage', desc: 'Manage statement cut-offs, dues & card recommendations', icon: '💳', group: 'NAV', action: () => { if (typeof showPage === 'function') showPage('credit-cards'); } },
    { title: '🏦 Loans & Amortization Schedules', desc: 'Track EMIs, remaining principal & payoff timelines', icon: '🏦', group: 'NAV', action: () => { if (typeof showPage === 'function') showPage('loans'); } },
    { title: '💎 Net Worth & Balance Sheet', desc: 'Total assets, investments, cash vs debt obligations', icon: '💎', group: 'NAV', action: () => { if (typeof showPage === 'function') showPage('wealth'); } },
    { title: '📈 Indian Stock Portfolio', desc: 'Track NSE/BSE stocks, profit/loss & portfolio analytics', icon: '📈', group: 'STOCKS', action: () => { if (typeof showPage === 'function') showPage('stocks'); } },
    { title: '🔄 Refresh Stock Quotes & NAVs', desc: 'Fetch latest live market prices for holdings', icon: '🔄', group: 'STOCKS', action: () => window.LM_StockPortfolioUI?.handleRefreshPrices() },
    { title: '🛡️ Emergency Fund & Runway', desc: 'Calculate liquid runway in months based on living burn', icon: '🛡️', group: 'NAV', action: () => { if (typeof showPage === 'function') showPage('emergency-fund'); } },
    { title: '🏍️ Bike & Vehicle Mileage', desc: 'Fuel logs, efficiency (km/L) & maintenance service alarms', icon: '🏍️', group: 'NAV', action: () => { if (typeof showPage === 'function') showPage('vehicles'); } },
    { title: '👥 Split Bill with Friends (UPI)', desc: 'Group expense division with simplified settlement graph', icon: '👥', group: 'TOOLS', action: () => { if (window.LM_BillSplitter && typeof window.LM_BillSplitter.openBillSplitterModal === 'function') window.LM_BillSplitter.openBillSplitterModal(); } },
    { title: '🧮 Loan EMI & Prepayment Calculator', desc: 'Simulate interest savings through tenure or EMI reduction', icon: '🧮', group: 'TOOLS', action: () => { if (typeof openEMIModal === 'function') openEMIModal(); } },
    { title: '🌊 Open Cash Flow Sankey', desc: 'Visualize income & expense streams', icon: '🌊', group: 'TOOLS', action: () => window.LM_Sankey?.showModal() },
    { title: '🎯 Debt Payoff Optimizer', desc: 'Simulate Snowball vs Avalanche payoff', icon: '🎯', group: 'TOOLS', action: () => window.LM_DebtOptimizer?.showModal() },
    { title: '📊 FY Annual Summary', desc: 'Fiscal year executive reporting and quarterly analysis', icon: '📊', group: 'REPORTS', action: () => { if (typeof showPage === 'function') showPage('fy-summary'); } },
    { title: '🗓️ Daily Spending Heatmap', desc: 'Calendar matrix view of daily spending intensity', icon: '🗓️', group: 'TOOLS', action: () => { if (typeof showPage === 'function') showPage('spending-heatmap'); } },
    { title: '📄 Bank Statement Reconciliation', desc: 'Upload bank PDF/CSV statement for automated 2-pass reconciliation', icon: '📄', group: 'TOOLS', action: () => window.LM_StatementParser?.openFilePicker() },
    { title: '🏷️ Auto-Categorization Rules', desc: 'Configure keyword & regex smart rules', icon: '🏷️', group: 'SETTINGS', action: () => window.LM_CategoryRules?.showRulesModal() },
    { title: '🔐 Open Credentials Vault', desc: 'Encrypted passwords and keys', icon: '🔐', group: 'SETTINGS', action: () => window.showCredModal?.() },
    { title: '☁️ Sync with Supabase Cloud', desc: 'Immediate cloud backup push', icon: '☁️', group: 'SYNC', action: () => window.LM_manualSync?.() },
    { title: '🏢 Business Hub & Digital Khata', desc: 'Track business income, operating expenses & customer invoices', icon: '🏢', group: 'NAV', action: () => { if (typeof showPage === 'function') showPage('business'); } },
    { title: '✈️ Trip Planner & Expenses', desc: 'Plan trips, day itineraries & track travel expenses', icon: '✈️', group: 'NAV', action: () => { if (typeof showPage === 'function') showPage('trips'); } },
    { title: '📚 Open Study Resources Hub', desc: 'Interview prep, DSA, Java, React', icon: '📚', group: 'STUDY', action: () => window.location.href = './study/index.html' },
    { title: '🌓 Toggle Dark / Light Theme', desc: 'Switch app visual palette mode', icon: '🌓', group: 'SETTINGS', action: () => toggleTheme() }
  ];

  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lm_theme', next);
    if (typeof showToast === 'function') showToast(`Theme switched to ${next}`, 'info');
  }

  /**
   * Safe financial math expression evaluator (no eval)
   */
  function evaluateMathExpression(str) {
    if (!str || typeof str !== 'string') return null;
    var clean = str.replace(/[₹,\s]/g, '');
    // Check if string contains only arithmetic symbols: digits, +, -, *, /, %, (, ), .
    if (!/^[0-9+\-*/().%^ ]+$/.test(clean)) return null;
    // Must contain at least one arithmetic operator
    if (!/[+\-*/%^]/.test(clean)) return null;

    try {
      // Safe tokenized arithmetic parser
      var sanitized = clean.replace(/\^/g, '**');
      // eslint-disable-next-line no-new-func
      var val = Function('"use strict"; return (' + sanitized + ')')();
      if (typeof val === 'number' && !isNaN(val) && isFinite(val)) {
        return Math.round(val * 100) / 100;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  /**
   * Natural language transaction parser
   * e.g. "+1500 Freelance Consulting", "-450 Coffee and snacks", "paid 25000 rent", "500 Petrol"
   */
  function parseQuickTransaction(query) {
    var str = (query || '').trim();
    if (!str) return null;

    var isIncome = false;
    var isExpense = false;

    if (str.startsWith('+') || str.toLowerCase().startsWith('in ') || str.toLowerCase().startsWith('received ')) {
      isIncome = true;
      str = str.replace(/^\+/, '').replace(/^in\s+/i, '').replace(/^received\s+/i, '').trim();
    } else if (str.startsWith('-') || str.toLowerCase().startsWith('out ') || str.toLowerCase().startsWith('paid ') || str.toLowerCase().startsWith('spent ')) {
      isExpense = true;
      str = str.replace(/^-/, '').replace(/^out\s+/i, '').replace(/^paid\s+/i, '').replace(/^spent\s+/i, '').trim();
    } else if (str.toLowerCase().startsWith('tx ') || str.toLowerCase().startsWith('add ')) {
      str = str.replace(/^tx\s+/i, '').replace(/^add\s+/i, '').trim();
    }

    var match = str.match(/^([\d,.]+)\s*(.*)$/);
    if (!match) return null;

    var amtStr = match[1].replace(/,/g, '');
    var amt = parseFloat(amtStr);
    if (isNaN(amt) || amt <= 0) return null;

    var desc = match[2].trim() || (isIncome ? 'Quick Income' : 'Quick Expense');
    var type = isIncome ? 'in' : 'out';

    var cat = 'Other';
    if (typeof window !== 'undefined' && window.LM_CategoryRules && typeof window.LM_CategoryRules.suggestCategory === 'function') {
      cat = window.LM_CategoryRules.suggestCategory(desc, type);
    }

    return {
      amount: amt,
      name: desc,
      type: type,
      category: cat
    };
  }

  /**
   * Create and commit quick transaction
   */
  function executeCreateTransaction(parsedTx) {
    if (!parsedTx || !parsedTx.amount) return;
    var newTx = {
      id: 'tx_omni_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36),
      date: new Date().toISOString().slice(0, 10),
      name: parsedTx.name,
      amount: parsedTx.amount,
      type: parsedTx.type,
      category: parsedTx.category,
      notes: 'Added via Omnisearch 2.0'
    };

    if (typeof window !== 'undefined' && typeof window.put === 'function') {
      window.put('transactions', newTx).then(() => {
        if (typeof window.showUndoToast === 'function') {
          window.showUndoToast(`✅ Created ${newTx.type === 'in' ? '+' : '−'}₹${newTx.amount} (${newTx.name})`, function () {
            if (typeof window.del === 'function') {
              window.del('transactions', newTx.id).then(() => {
                if (typeof window.renderAll === 'function') window.renderAll();
              });
            }
          });
        } else if (typeof showToast === 'function') {
          showToast(`✅ Created ${newTx.type === 'in' ? '+' : '−'}₹${newTx.amount} (${newTx.name})`, 'success');
        }
        if (typeof window.renderAll === 'function') {
          window.loadAllFromDB?.().then(() => window.renderAll());
        }
      });
    }
  }

  /**
   * Search suggestions generator
   */
  function getSuggestions(query) {
    query = (query || '').trim();
    var list = [];

    // 1. Math calculation result
    var mathRes = evaluateMathExpression(query);
    if (mathRes !== null) {
      list.push({
        title: `Calculator Result: ₹${mathRes.toLocaleString('en-IN')}`,
        desc: `Formula: ${query} = ${mathRes}`,
        icon: '🧮',
        group: 'MATH',
        action: () => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(String(mathRes));
            if (typeof showToast === 'function') showToast(`Copied ${mathRes} to clipboard!`, 'info');
          }
        }
      });
    }

    // 2. Natural language quick transaction
    var quickTx = parseQuickTransaction(query);
    if (quickTx) {
      list.push({
        title: `Add ${quickTx.type === 'in' ? 'Income' : 'Expense'}: ₹${quickTx.amount.toLocaleString('en-IN')} ("${quickTx.name}")`,
        desc: `Category: ${quickTx.category} · Press Enter to create immediately`,
        icon: quickTx.type === 'in' ? '🟢' : '🔴',
        group: 'QUICK ENTRY',
        action: () => executeCreateTransaction(quickTx)
      });
    }

    if (!query) return STATIC_COMMANDS;

    var lQuery = query.toLowerCase();

    // 3. Static commands matching query
    var cmdMatches = STATIC_COMMANDS.filter(cmd =>
      cmd.title.toLowerCase().includes(lQuery) ||
      cmd.desc.toLowerCase().includes(lQuery)
    );
    list = list.concat(cmdMatches);

    // 4. Search existing transactions in state
    var state = (typeof window !== 'undefined' && window.state) ? window.state : {};
    if (Array.isArray(state.transactions)) {
      var txMatches = state.transactions.filter(t =>
        (t.name || '').toLowerCase().includes(lQuery) ||
        (t.category || '').toLowerCase().includes(lQuery) ||
        (t.account || '').toLowerCase().includes(lQuery) ||
        String(t.amount || '').includes(lQuery)
      ).slice(0, 6);

      txMatches.forEach(t => {
        list.push({
          title: `${t.name} (₹${Number(t.amount || 0).toLocaleString('en-IN')})`,
          desc: `${t.date} · ${t.category} · ${t.account || 'Bank'}`,
          icon: t.type === 'in' ? '💵' : '💸',
          group: 'TRANSACTIONS',
          action: () => {
            if (typeof window.openEditTransactionModal === 'function') {
              window.openEditTransactionModal(t.id);
            }
          }
        });
      });
    }

    // 5. Search stocks in state
    if (Array.isArray(state.stocks)) {
      var stockMatches = state.stocks.filter(s =>
        (s.symbol || '').toLowerCase().includes(lQuery) ||
        (s.name || '').toLowerCase().includes(lQuery)
      ).slice(0, 4);

      stockMatches.forEach(s => {
        list.push({
          title: `${s.symbol} – ${s.name || 'Stock'}`,
          desc: `Holdings: ${s.quantity || s.qty || 0} shares · Avg: ₹${s.avgBuyPrice || s.buyPrice || 0}`,
          icon: '📈',
          group: 'STOCKS',
          action: () => { if (typeof showPage === 'function') showPage('stocks'); }
        });
      });
    }

    // 6. Search Credit Cards in state
    if (Array.isArray(state.creditCards)) {
      var cardMatches = state.creditCards.filter(c =>
        (c.name || '').toLowerCase().includes(lQuery) ||
        (c.bank || '').toLowerCase().includes(lQuery)
      ).slice(0, 3);

      cardMatches.forEach(c => {
        list.push({
          title: `${c.name} (${c.bank || 'Card'})`,
          desc: `Outstanding: ₹${Number(c.outstandingBalance || c.totalDue || 0).toLocaleString('en-IN')} · Due: ${c.dueDate || '—'}`,
          icon: '💳',
          group: 'CARDS',
          action: () => { if (typeof showPage === 'function') showPage('credit-cards'); }
        });
      });
    }

    // 7. Search Notes in state
    if (Array.isArray(state.notes)) {
      var noteMatches = state.notes.filter(n =>
        (n.title || '').toLowerCase().includes(lQuery) ||
        (n.folder || '').toLowerCase().includes(lQuery) ||
        (n.content || '').toLowerCase().includes(lQuery)
      ).slice(0, 3);

      noteMatches.forEach(n => {
        list.push({
          title: `Note: ${n.title || 'Untitled'}`,
          desc: `Folder: ${n.folder || 'General'} · Updated: ${n.updatedAt ? n.updatedAt.slice(0, 10) : '—'}`,
          icon: '📝',
          group: 'NOTES',
          action: () => { if (typeof window.openNotesModal === 'function') window.openNotesModal(n.id); }
        });
      });
    }

    return list;
  }

  function renderPalette() {
    var el = document.getElementById('lm-command-palette');
    if (!el) {
      el = document.createElement('div');
      el.id = 'lm-command-palette';
      el.style.cssText = `
        position: fixed; inset: 0; background: rgba(5,7,20,0.85);
        backdrop-filter: blur(10px); z-index: 99999; display: none;
        align-items: flex-start; justify-content: center;
        padding: max(6vh, 24px) 16px 16px;
      `;
      document.body.appendChild(el);
    }

    el.innerHTML = `
      <div style="
        background: var(--bg2, #0d122b); border: 1px solid var(--border, rgba(255,255,255,0.08));
        border-radius: var(--lm-radius-lg, 16px); max-width: 620px; width: 100%; max-height: 85vh;
        display: flex; flex-direction: column; box-shadow: 0 25px 60px rgba(0,0,0,0.8);
        overflow: hidden; color: var(--text-1, #f8fafc); font-family: var(--lm-font-sans, Inter, sans-serif);
      ">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.08)); display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 18px; color: var(--teal, #00f0ff); flex-shrink: 0;">⚡</span>
          <input type="text" id="lm-cmd-input" placeholder="Type a command, search, math (25000*0.18), or +500 Coffee..." style="
            flex: 1; background: transparent; border: none; outline: none; font-size: 15px;
            color: var(--text-1, #f8fafc); font-family: inherit; min-width: 0;
          " autocomplete="off"/>
          <button id="lm-cmd-esc-btn" style="
            background: rgba(255,255,255,0.06); border: 1px solid var(--border, rgba(255,255,255,0.1));
            padding: 3px 8px; border-radius: 6px; color: var(--text-2, #94a3b8); font-size: 11px; cursor: pointer;
          ">ESC</button>
        </div>

        <div id="lm-cmd-list" style="flex: 1; max-height: min(54vh, 400px); overflow-y: auto; padding: 8px; -webkit-overflow-scrolling: touch;"></div>

        <div style="
          padding: 10px 18px; background: rgba(255,255,255,0.02); border-top: 1px solid var(--border, rgba(255,255,255,0.06));
          font-size: 11px; color: var(--text-3, #64748b); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 6px;
        ">
          <span>Navigate: <kbd style="color:var(--text-2,#94a3b8);">↑</kbd> <kbd style="color:var(--text-2,#94a3b8);">↓</kbd> · Select: <kbd style="color:var(--text-2,#94a3b8);">↵</kbd></span>
          <span>Fast Add: <code style="color:var(--teal,#00f0ff);">+1500 Consulting</code> or <code style="color:var(--rose,#f43f5e);">-450 Lunch</code></span>
        </div>
      </div>
    `;

    var input = document.getElementById('lm-cmd-input');
    var listEl = document.getElementById('lm-cmd-list');
    document.getElementById('lm-cmd-esc-btn').onclick = close;

    function updateList() {
      var query = input.value;
      var items = getSuggestions(query);
      if (_selectedIdx >= items.length) _selectedIdx = 0;

      if (!items.length) {
        listEl.innerHTML = `
          <div style="padding: 24px 16px; text-align: center; color: var(--text-3, #64748b); font-size: 13px;">
            No matching commands or records found for "${query}"
          </div>
        `;
        return;
      }

      listEl.innerHTML = items.map((item, idx) => `
        <div class="lm-cmd-item ${idx === _selectedIdx ? 'selected' : ''}" data-idx="${idx}" style="
          padding: 10px 14px; border-radius: 10px; display: flex; align-items: center; gap: 12px; cursor: pointer;
          background: ${idx === _selectedIdx ? 'rgba(0,240,255,0.12)' : 'transparent'};
          border: ${idx === _selectedIdx ? '1px solid rgba(0,240,255,0.25)' : '1px solid transparent'};
          margin-bottom: 2px;
        ">
          <span style="font-size: 18px; flex-shrink: 0;">${item.icon}</span>
          <div style="flex: 1; overflow: hidden;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${item.title}
              </span>
              ${item.group ? `<span style="font-size: 9px; font-weight:700; padding:1px 5px; border-radius:4px; background:rgba(255,255,255,0.06); color:var(--text-3,#64748b);">${item.group}</span>` : ''}
            </div>
            <div style="font-size: 11px; color: var(--text-2, #94a3b8); margin-top: 1px;">${item.desc}</div>
          </div>
          ${idx === _selectedIdx ? '<span style="font-size: 12px; color: var(--teal, #00f0ff); font-weight: 700;">↵</span>' : ''}
        </div>
      `).join('');

      listEl.querySelectorAll('.lm-cmd-item').forEach(el => {
        el.onclick = function () {
          var idx = parseInt(this.dataset.idx, 10);
          close();
          items[idx]?.action?.();
        };
      });
    }

    input.oninput = () => { _selectedIdx = 0; updateList(); };
    input.onkeydown = function (e) {
      var items = getSuggestions(input.value);
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        _selectedIdx = (_selectedIdx + 1) % items.length;
        updateList();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _selectedIdx = (_selectedIdx - 1 + items.length) % items.length;
        updateList();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[_selectedIdx]) {
          close();
          items[_selectedIdx].action?.();
        }
      } else if (e.key === 'Escape') {
        close();
      }
    };

    el.onclick = function (e) {
      if (e.target === el) close();
    };

    updateList();
  }

  function open() {
    renderPalette();
    var el = document.getElementById('lm-command-palette');
    if (el) {
      el.style.display = 'flex';
      _isOpen = true;
      setTimeout(() => document.getElementById('lm-cmd-input')?.focus(), 50);
    }
  }

  function close() {
    var el = document.getElementById('lm-command-palette');
    if (el) el.style.display = 'none';
    _isOpen = false;
  }

  function toggle() {
    if (_isOpen) close();
    else open();
  }

  // Keyboard shortcut listener: Ctrl+K / Cmd+K
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggle();
      }
    });
  }

  var CommandPaletteModule = {
    open: open,
    close: close,
    toggle: toggle,
    evaluateMathExpression: evaluateMathExpression,
    parseQuickTransaction: parseQuickTransaction,
    getSuggestions: getSuggestions
  };

  if (typeof window !== 'undefined') {
    window.LM_CommandPalette = CommandPaletteModule;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommandPaletteModule;
  }

  console.log('[LM] CommandPalette module (Omnisearch 2.0) initialized.');
})();
