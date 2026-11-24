/**
 * LedgerMate – TransactionService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise Transaction Management Service.
 * Encapsulates transaction operations:
 *  • CRUD & Batch Operations (IndexedDB + AppBus broadcast)
 *  • Smart Query & Token Filtering (amounts, categories, accounts, date ranges)
 *  • Category Palettes, Visual Icons & Date Grouping
 *  • Interlink Integration (Loans, Credit Cards, Stocks, Investments)
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // Standard category color palette
  const CAT_COLORS = {
    Food: '#f59e0b', Groceries: '#f59e0b', Snacks: '#fb923c', Dining: '#f97316',
    Transport: '#3b82f6', Fuel: '#60a5fa', Travel: '#0ea5e9',
    Bills: '#8b5cf6', Utilities: '#7c3aed', Subscription: '#a78bfa',
    Shopping: '#ec4899', Clothing: '#f472b6',
    Salary: '#10b981', Freelance: '#34d399', Investment: '#14b8a6',
    Healthcare: '#06b6d4', Medical: '#22d3ee', Insurance: '#0891b2',
    Entertainment: '#f97316', Education: '#6366f1',
    Housing: '#84cc16', Rent: '#65a30d',
    Loan: '#ef4444', Tax: '#dc2626', EMI: '#ef4444',
    Gift: '#a855f7', Charity: '#9333ea',
    Gym: '#fb923c', Sports: '#3b82f6', Petrol: '#60a5fa',
    Other: '#94a3b8'
  };

  // Standard category icons
  const CAT_ICONS = {
    Food: '🍽️', Groceries: '🛒', Snacks: '🧆', Dining: '🍴',
    Transport: '🚗', Fuel: '⛽', Travel: '✈️',
    Bills: '💡', Utilities: '🔌', Subscription: '📱',
    Shopping: '🛍️', Clothing: '👕',
    Salary: '💼', Freelance: '💻', Investment: '📈',
    Healthcare: '🏥', Medical: '💊', Insurance: '🛡️',
    Entertainment: '🎬', Education: '📚',
    Housing: '🏠', Rent: '🏢',
    Loan: '💸', Tax: '🏛️', EMI: '🏦',
    Gift: '🎁', Charity: '❤️',
    Gym: '🏋️', Sports: '⚽', Petrol: '⛽',
    Other: '💳'
  };

  const TransactionService = {
    CAT_COLORS,
    CAT_ICONS,

    /* ── Category Styling Helpers ── */
    getCategoryColor(cat) {
      if (!cat) return CAT_COLORS.Other;
      if (CAT_COLORS[cat]) return CAT_COLORS[cat];
      const pal = [
        '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4',
        '#f97316', '#6366f1', '#84cc16', '#ef4444', '#a855f7', '#14b8a6',
        '#fb923c', '#0ea5e9', '#65a30d', '#e11d48', '#7c3aed', '#059669'
      ];
      let h = 0;
      for (let i = 0; i < cat.length; i++) {
        h = (h * 31 + cat.charCodeAt(i)) >>> 0;
      }
      return pal[h % pal.length];
    },

    getCategoryIcon(cat) {
      if (!cat) return '💳';
      const normCat = (cat || '').trim();
      const matchKey = Object.keys(CAT_ICONS).find(k => k.toLowerCase() === normCat.toLowerCase());
      return matchKey ? CAT_ICONS[matchKey] : (normCat ? normCat.charAt(0).toUpperCase() : '💳');
    },

    /* ── Date Helpers ── */
    getDateLabel(dateStr) {
      if (!dateStr) return 'Transactions';
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);

          const startOfDay = date => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
          if (startOfDay(d) === startOfDay(today)) return 'Today';
          if (startOfDay(d) === startOfDay(yesterday)) return 'Yesterday';

          return d.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
        }
      } catch (e) {}
      return dateStr;
    },

    /* ── Filter Engine ── */
    filterTransactions(transactions = [], query = '', account = 'all', quickFilter = 'all') {
      if (!Array.isArray(transactions)) return [];

      const today = new Date();
      const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const isSameDay = (d1, d2) => startOfDay(d1).getTime() === startOfDay(d2).getTime();
      const getWeekStart = d => {
        const day = d.getDay();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day || 7) + 1);
      };

      const q = (query || '').toLowerCase().trim();
      const tokens = q ? q.split(/\s+/) : [];

      return transactions
        .slice()
        .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
        .filter(t => {
          // Account match
          if (account !== 'all' && account && account !== t.account) return false;

          // Quick Filter Chip Match
          if (quickFilter && quickFilter !== 'all') {
            if (quickFilter === 'out' && t.type !== 'out') return false;
            if (quickFilter === 'in' && t.type !== 'in') return false;
            if (quickFilter === 'transfer' && t.type !== 'transfer') return false;
            if (quickFilter === 'high' && parseFloat(t.amount || 0) < 5000) return false;
            if (quickFilter === 'recent7') {
              const txDate = new Date(t.date || t.createdAt);
              const diffMs = today.getTime() - txDate.getTime();
              if (diffMs > 7 * 24 * 60 * 60 * 1000) return false;
            }
          }

          let match = true;

          for (const token of tokens) {
            if (!token) continue;

            // Amount token: amount>100, amount<=500, amount=200
            const amountMatch = token.match(/^amount([<>]=?|=)(\d+(?:\.\d+)?)$/);
            if (amountMatch) {
              const [, operator, valueStr] = amountMatch;
              const value = parseFloat(valueStr);
              const tAmount = parseFloat(t.amount);
              if (operator === '>'  && !(tAmount >  value)) match = false;
              if (operator === '>=' && !(tAmount >= value)) match = false;
              if (operator === '<'  && !(tAmount <  value)) match = false;
              if (operator === '<=' && !(tAmount <= value)) match = false;
              if (operator === '='  && !(tAmount === value)) match = false;
              continue;
            }

            // Category token: category:food
            const categoryMatch = token.match(/^category:(.+)$/);
            if (categoryMatch) {
              if (!(t.category || '').toLowerCase().includes(categoryMatch[1].trim())) match = false;
              continue;
            }

            // Account token: account:hdfc
            const accountMatch = token.match(/^account:(.+)$/);
            if (accountMatch) {
              if (!(t.account || '').toLowerCase().includes(accountMatch[1].trim())) match = false;
              continue;
            }

            // Smart date tokens
            if (token === 'today') {
              if (!isSameDay(new Date(t.date), today)) match = false;
              continue;
            }

            if (token === 'yesterday') {
              const yesterday = new Date(today);
              yesterday.setDate(today.getDate() - 1);
              if (!isSameDay(new Date(t.date), yesterday)) match = false;
              continue;
            }

            if (token === 'this' || token === 'last') {
              continue; // Handled in multi-word combination below
            }

            if (token === 'week' || token === 'month') {
              const idx = tokens.indexOf(token);
              const prev = tokens[idx - 1];

              if (prev === 'this' && token === 'week') {
                const weekStart = startOfDay(getWeekStart(new Date(today)));
                if (!(new Date(t.date) >= weekStart)) match = false;
              }

              if (prev === 'last' && token === 'week') {
                const thisWeekStart = startOfDay(getWeekStart(new Date(today)));
                const lastWeekStart = new Date(thisWeekStart);
                lastWeekStart.setDate(lastWeekStart.getDate() - 7);
                const lastWeekEnd = new Date(thisWeekStart);
                if (!(new Date(t.date) >= lastWeekStart && new Date(t.date) < lastWeekEnd)) match = false;
              }

              if (prev === 'this' && token === 'month') {
                if (!(new Date(t.date).getMonth() === today.getMonth() &&
                      new Date(t.date).getFullYear() === today.getFullYear())) {
                  match = false;
                }
              }

              if (prev === 'last' && token === 'month') {
                const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                if (!(new Date(t.date).getMonth() === lastMonth.getMonth() &&
                      new Date(t.date).getFullYear() === lastMonth.getFullYear())) {
                  match = false;
                }
              }
              continue;
            }

            // Free text fallback
            const searchText = [
              t.note || '',
              t.category || '',
              t.account || '',
              String(t.amount || ''),
              t.type === 'in' ? 'income' : 'expense',
              t.date || '',
              t.createdAt ? new Date(t.createdAt).toLocaleString() : ''
            ].join(' ').toLowerCase();

            if (!searchText.includes(token)) match = false;
          }

          return match;
        });
    },

    /* ── Highlight Query Terms ── */
    highlightText(text, term) {
      if (!term || !text) return text || '';
      const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(${safeTerm})`, 'gi');
      return String(text).replace(re, '<mark>$1</mark>');
    },

    /* ── Row HTML Generator ── */
    buildRowHTML(t, query = '') {
      const normCat = (t.category || '').trim();
      const icon = this.getCategoryIcon(normCat);
      const catDotColor = this.getCategoryColor(normCat);
      const typeCls = t.type === 'in' ? 'income' : 'expense';
      const simpleQ = (query && !query.includes(':') && !query.match(/^amount/)) ? query : '';

      // Badges
      const recurrenceBadge = t.recurrence && t.recurrence.toLowerCase() !== 'none'
        ? `<span class="tx-badge-recur">🔁 ${t.recurrence.charAt(0).toUpperCase() + t.recurrence.slice(1)}</span>`
        : '';
      const autoBadge = t.recurringOrigin
        ? `<span class="tx-badge-auto" title="Auto-generated">⟳ Auto</span>`
        : '';

      let interlinkBadge = '';
      if (t.interlink && t.interlink.sourceModule) {
        const srcMod = t.interlink.sourceModule;
        const modLabels = {
          credit_cards: { icon: '💳', name: 'Credit Card', target: 'credit-cards' },
          loans: { icon: '🏦', name: 'Loan EMI', target: 'loans' },
          stocks: { icon: '📈', name: 'Stock Trade', target: 'stocks' },
          investments: { icon: '💰', name: 'Investment', target: 'investments' },
          vehicles: { icon: '🏍️', name: 'Vehicle', target: 'vehicles' },
          business: { icon: '💼', name: 'Business Hub', target: 'business' }
        };
        const info = modLabels[srcMod] || { icon: '🔗', name: srcMod, target: srcMod };
        const entityStr = t.interlink.entityName ? ` · ${t.interlink.entityName}` : '';
        interlinkBadge = `<span class="tx-badge-interlink" data-mod="${info.target}" title="Interlinked from ${info.name}${entityStr}. Click to view source module.">${info.icon} ${info.name}${entityStr}</span>`;
      }

      // Format currency
      const formattedAmount = (typeof window !== 'undefined' && typeof window.fmtINR === 'function')
        ? window.fmtINR(t.amount)
        : '₹' + Number(t.amount || 0).toLocaleString('en-IN');

      return `
        <div class="tx-item" data-id="${t.id}">
          <div class="tx-row">
            <div class="tx-left">
              <div class="tx-icon-dot" style="background:${catDotColor}22;border:1.5px solid ${catDotColor}66;">${icon}</div>
              <div class="tx-text">
                <div class="tx-title">${this.highlightText(t.note || '(No Note)', simpleQ)}</div>
                <div class="tx-meta">
                  <span class="tx-category" style="display:inline-flex;align-items:center;gap:3px;">
                    <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${catDotColor};flex-shrink:0;"></span>
                    ${this.highlightText(t.category || 'Uncategorized', simpleQ)}
                  </span>
                  <span class="tx-meta-sep">·</span>
                  <span class="tx-meta-acc">${this.highlightText(t.account || '—', simpleQ)}</span>
                  <span class="tx-meta-sep">·</span><span class="tx-time">${t.date || ''}</span>
                  ${recurrenceBadge}${autoBadge}${interlinkBadge}
                </div>
              </div>
            </div>
            <div class="tx-right">
              <div class="tx-amount ${typeCls}">${t.type === 'in' ? '+' : '−'}${formattedAmount}</div>
              <div class="tx-actions">
                <button data-id="${t.id}" class="editTx"  title="Edit">✏️</button>
                <button data-id="${t.id}" class="splitTx" title="Split">✂️</button>
                <button data-id="${t.id}" class="delTx"   title="Delete">🗑️</button>
              </div>
            </div>
          </div>
        </div>
      `.trim();
    },

    /* ── CRUD & Mutation Operations ── */
    async addTransaction(tx) {
      if (!tx || typeof tx !== 'object') throw new Error('Invalid transaction');
      if (!tx.id) {
        tx.id = 'tx_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);
      }
      if (!tx.createdAt) {
        tx.createdAt = new Date().toISOString();
      }

      if (typeof window !== 'undefined' && typeof window.put === 'function') {
        await window.put('transactions', tx);
        if (window.state && Array.isArray(window.state.transactions)) {
          window.state.transactions.push(tx);
        }
      }

      // Broadcast mutation across tabs
      if (typeof window !== 'undefined' && window.LM_Bus) {
        window.LM_Bus.broadcast('lm:data:changed', { store: 'transactions', action: 'add', item: tx });
      }

      return tx;
    },

    async deleteTransaction(id) {
      if (!id) return false;

      if (typeof window !== 'undefined' && typeof window.del === 'function') {
        await window.del('transactions', id);
        if (window.state && Array.isArray(window.state.transactions)) {
          const idx = window.state.transactions.findIndex(t => t.id === id);
          if (idx !== -1) window.state.transactions.splice(idx, 1);
        }
      }

      // Broadcast mutation across tabs
      if (typeof window !== 'undefined' && window.LM_Bus) {
        window.LM_Bus.broadcast('lm:data:changed', { store: 'transactions', action: 'delete', id });
      }

      return true;
    }
  };

  // Browser global
  if (typeof window !== 'undefined') {
    window.LM_TransactionService = TransactionService;
  }

  // Node export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionService;
  }
})();
