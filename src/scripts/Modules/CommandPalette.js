/**
 * LedgerMate – CommandPalette.js
 * ─────────────────────────────────────────────────────────────
 * Universal Command Palette & Fast Action Bar (Ctrl+K / Cmd+K)
 * Quick navigation, instant transaction creation, and tools runner.
 * Exposes: window.LM_CommandPalette
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _isOpen = false;
  var _selectedIdx = 0;

  var STATIC_COMMANDS = [
    { title: '➕ Quick Add Transaction', desc: 'Type "+tx 500 Coffee" or select this', icon: '💸', action: () => openAddTxPrompt() },
    { title: '📈 Indian Stock Portfolio', desc: 'Track NSE/BSE stocks, profit/loss & portfolio analytics', icon: '📈', action: () => { if (typeof showPage === 'function') showPage('stocks'); } },
    { title: '🛒 Record Stock Buy/Sell', desc: 'Add a new equity purchase or sale order', icon: '🛒', action: () => { if (typeof showPage === 'function') showPage('stocks'); setTimeout(() => window.LM_StockPortfolioUI?.openAddTransactionModal(), 100); } },
    { title: '🔄 Refresh Stock Quotes', desc: 'Fetch latest live prices for holdings', icon: '🔄', action: () => window.LM_StockPortfolioUI?.handleRefreshPrices() },
    { title: '🌊 Open Cash Flow Sankey', desc: 'Visualize income & expense streams', icon: '🌊', action: () => window.LM_Sankey?.showModal() },
    { title: '🎯 Debt Payoff Optimizer', desc: 'Simulate Snowball vs Avalanche payoff', icon: '🎯', action: () => window.LM_DebtOptimizer?.showModal() },
    { title: '📄 Import Bank Statement', desc: 'Upload bank CSV/statement for auto-import', icon: '📄', action: () => window.LM_StatementParser?.openFilePicker() },
    { title: '🏷️ Auto-Categorization Rules', desc: 'Configure keyword & regex smart rules', icon: '🏷️', action: () => window.LM_CategoryRules?.showRulesModal() },
    { title: '🔐 Open Credentials Vault', desc: 'Encrypted passwords and keys', icon: '🔐', action: () => window.showCredModal?.() },
    { title: '☁️ Sync with Supabase Cloud', desc: 'Immediate cloud backup push', icon: '☁️', action: () => window.LM_manualSync?.() },
    { title: '📚 Open Study Resources Hub', desc: 'Interview prep, DSA, Java, React', icon: '📚', action: () => window.location.href = './study/index.html' },
    { title: '🌓 Toggle Dark / Light Theme', desc: 'Switch app visual mode', icon: '🌓', action: () => toggleTheme() }
  ];

  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') || 'dark';
    var next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lm_theme', next);
    if (typeof showToast === 'function') showToast(`Theme switched to ${next}`, 'info');
  }

  function openAddTxPrompt() {
    var promptVal = prompt('Enter transaction: Amount Description (e.g., "450 Groceries" or "+12000 Freelance")');
    if (!promptVal) return;

    var isIncome = promptVal.startsWith('+');
    var cleanStr = promptVal.replace(/^[+-]/, '').trim();
    var match = cleanStr.match(/^([\d.]+)\s*(.*)$/);

    if (match) {
      var amt = parseFloat(match[1]);
      var desc = match[2] || 'Quick Entry';
      var type = isIncome ? 'in' : 'out';
      var cat = window.LM_CategoryRules ? window.LM_CategoryRules.suggestCategory(desc, type) : 'Other';

      var newTx = {
        date: new Date().toISOString().slice(0, 10),
        name: desc,
        amount: amt,
        type: type,
        category: cat,
        notes: 'Quick command entry'
      };

      if (typeof window.put === 'function') {
        window.put('transactions', newTx).then(() => {
          if (typeof showToast === 'function') showToast(`✅ Added ${type === 'in' ? '+' : '-'}₹${amt} (${desc})`, 'success');
          if (typeof window.renderAll === 'function') {
            window.loadAllFromDB?.().then(() => window.renderAll());
          }
        });
      }
    }
  }

  function getSuggestions(query) {
    query = (query || '').trim().toLowerCase();
    if (!query) return STATIC_COMMANDS;

    // Fast command prefixes: "+tx 450 Coffee"
    if (query.startsWith('+tx') || query.startsWith('add')) {
      return [{
        title: `Execute: Add Transaction "${query}"`,
        desc: 'Press Enter to create this transaction instantly',
        icon: '⚡',
        action: () => {
          var clean = query.replace(/^\+?tx\s*/i, '').replace(/^add\s*/i, '');
          var match = clean.match(/^([\d.]+)\s*(.*)$/);
          if (match) {
            var amt = parseFloat(match[1]);
            var desc = match[2] || 'Quick Entry';
            var cat = window.LM_CategoryRules ? window.LM_CategoryRules.suggestCategory(desc, 'out') : 'Other';
            if (typeof window.put === 'function') {
              window.put('transactions', {
                date: new Date().toISOString().slice(0, 10),
                name: desc,
                amount: amt,
                type: 'out',
                category: cat
              }).then(() => {
                if (typeof showToast === 'function') showToast(`✅ Created ₹${amt} ${desc}`, 'success');
                window.loadAllFromDB?.().then(() => window.renderAll());
              });
            }
          }
        }
      }];
    }

    var list = STATIC_COMMANDS.filter(cmd =>
      cmd.title.toLowerCase().includes(query) ||
      cmd.desc.toLowerCase().includes(query)
    );

    // Search existing transactions if matching query
    if (window.state && window.state.transactions) {
      var txMatches = window.state.transactions.filter(t =>
        (t.name || '').toLowerCase().includes(query) ||
        (t.category || '').toLowerCase().includes(query)
      ).slice(0, 5);

      txMatches.forEach(t => {
        list.push({
          title: `${t.name} (₹${t.amount})`,
          desc: `${t.date} · ${t.category} · ${t.type === 'in' ? 'Income' : 'Expense'}`,
          icon: t.type === 'in' ? '🟢' : '🔴',
          action: () => {
            if (typeof window.openEditTransactionModal === 'function') {
              window.openEditTransactionModal(t.id);
            }
          }
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
      el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.75);z-index:99999;display:none;align-items:flex-start;justify-content:center;padding:max(5vh, 24px) 12px 12px;backdrop-filter:blur(8px);';
      document.body.appendChild(el);
    }

    el.innerHTML = `
      <div style="background:var(--card,#151922);border:1px solid var(--border,#262f45);border-radius:16px;max-width:580px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.8);overflow:hidden;color:var(--text,#e8eaf6);font-family:Inter,sans-serif;animation:cmdIn .15s ease-out;">
        <div style="padding:14px 16px;border-bottom:1px solid var(--border,#262f45);display:flex;align-items:center;gap:10px;">
          <span style="font-size:16px;color:var(--text2,#8896b8);flex-shrink:0;">🔍</span>
          <input type="text" id="lm-cmd-input" placeholder="Type command or search... (e.g. +tx 500 Food)" style="flex:1;background:transparent;border:none;outline:none;font-size:15px;color:var(--text,#e8eaf6);font-family:Inter,sans-serif;min-width:0;" autocomplete="off"/>
          <button id="lm-cmd-esc-btn" style="background:rgba(255,255,255,0.06);border:1px solid var(--border,#262f45);padding:3px 8px;border-radius:6px;color:var(--text2,#8896b8);font-size:11px;cursor:pointer;">ESC</button>
        </div>
        <div id="lm-cmd-list" style="flex:1;max-height:min(50vh, 360px);overflow-y:auto;padding:8px;-webkit-overflow-scrolling:touch;"></div>
        <div style="padding:10px 16px;background:rgba(255,255,255,0.02);border-top:1px solid var(--border,#262f45);font-size:11px;color:var(--text3,#5a6688);display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">
          <span>Navigation: <kbd style="color:var(--text2,#8896b8);">↑</kbd> <kbd style="color:var(--text2,#8896b8);">↓</kbd> · Select: <kbd style="color:var(--text2,#8896b8);">Enter</kbd></span>
          <span>Fast add: "+tx 400 Dinner"</span>
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

      listEl.innerHTML = items.map((item, idx) => `
        <div class="lm-cmd-item ${idx === _selectedIdx ? 'selected' : ''}" data-idx="${idx}" style="padding:10px 14px;border-radius:10px;display:flex;align-items:center;gap:12px;cursor:pointer;background:${idx === _selectedIdx ? 'rgba(79,142,247,0.15)' : 'transparent'};border:${idx === _selectedIdx ? '1px solid rgba(79,142,247,0.3)' : '1px solid transparent'};margin-bottom:2px;">
          <span style="font-size:18px;flex-shrink:0;">${item.icon}</span>
          <div style="flex:1;overflow:hidden;">
            <div style="font-size:13px;font-weight:600;color:var(--text,#e8eaf6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</div>
            <div style="font-size:11px;color:var(--text2,#8896b8);">${item.desc}</div>
          </div>
          ${idx === _selectedIdx ? '<span style="font-size:11px;color:#4f8ef7;">↵</span>' : ''}
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
  window.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggle();
    }
  });

  window.LM_CommandPalette = {
    open: open,
    close: close,
    toggle: toggle
  };

  console.log('[LM] CommandPalette module initialized (Press Ctrl+K).');
})();
