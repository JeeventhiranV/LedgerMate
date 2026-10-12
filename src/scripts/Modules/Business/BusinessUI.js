/**
 * LedgerMate – BusinessUI.js
 * ─────────────────────────────────────────────────────────────
 * Dedicated Business Ledger & Accounting User Interface Layer.
 * Renders the business management dashboard inside #page-business,
 * multi-entity business switcher, executive P&L KPI cards,
 * Credits / Debits / Charges ledger timeline, Party Book (Khata),
 * P&L Chart.js analytics, invoice generator, and party statements.
 *
 * Exposes: window.LM_BusinessUI
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _activeBusinessId = null;
  var _activeTab = 'ledger'; // 'ledger', 'parties', 'analytics', 'settings'
  var _typeFilter = 'all';    // 'all', 'credit', 'debit', 'charge'
  var _statusFilter = 'all';  // 'all', 'paid', 'pending', 'overdue'
  var _dateFilter = 'month';  // 'month', 'last_month', 'quarter', 'year', 'all'
  var _searchQuery = '';

  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _fmtCurr(n, sym) {
    var num = Number(n) || 0;
    sym = sym || '₹';
    return sym + ' ' + Math.round(num).toLocaleString('en-IN');
  }

  function _getService() {
    return window.LM_BusinessService;
  }

  function _getDateRange(filterKey) {
    var now = new Date();
    var yr = now.getFullYear();
    var mo = now.getMonth();

    if (filterKey === 'month') {
      var dFrom = new Date(yr, mo, 1).toISOString().split('T')[0];
      var dTo = new Date(yr, mo + 1, 0).toISOString().split('T')[0];
      return { dateFrom: dFrom, dateTo: dTo, label: 'This Month' };
    }
    if (filterKey === 'last_month') {
      var lmFrom = new Date(yr, mo - 1, 1).toISOString().split('T')[0];
      var lmTo = new Date(yr, mo, 0).toISOString().split('T')[0];
      return { dateFrom: lmFrom, dateTo: lmTo, label: 'Last Month' };
    }
    if (filterKey === 'quarter') {
      var qStartMo = Math.floor(mo / 3) * 3;
      var qFrom = new Date(yr, qStartMo, 1).toISOString().split('T')[0];
      var qTo = new Date(yr, qStartMo + 3, 0).toISOString().split('T')[0];
      return { dateFrom: qFrom, dateTo: qTo, label: 'This Quarter' };
    }
    if (filterKey === 'year') {
      var fyStart = mo >= 3 ? yr : yr - 1;
      var yFrom = fyStart + '-04-01';
      var yTo = (fyStart + 1) + '-03-31';
      return { dateFrom: yFrom, dateTo: yTo, label: 'FY ' + fyStart + '-' + String(fyStart + 1).slice(-2) };
    }
    return { dateFrom: null, dateTo: null, label: 'All Time' };
  }

  var BusinessUI = {
    /**
     * Initialize UI and render page
     */
    init: async function () {
      var service = _getService();
      if (service && typeof service.init === 'function') {
        await service.init();
      }
      this.render();
    },

    setActiveBusiness: function (id) {
      _activeBusinessId = id;
      var service = _getService();
      if (service && id) service.setActiveBusinessId(id);
      this.render();
    },

    setTab: function (tab) {
      _activeTab = tab;
      this.render();
    },

    setTypeFilter: function (type) {
      _typeFilter = type;
      this.render();
    },

    setStatusFilter: function (status) {
      _statusFilter = status;
      this.render();
    },

    setDateFilter: function (dKey) {
      _dateFilter = dKey;
      this.render();
    },

    setSearch: function (q) {
      _searchQuery = q || '';
      this.render();
    },

    /**
     * Main page renderer for #page-business
     */
    render: function () {
      var container = document.getElementById('page-business');
      if (!container) return;

      var service = _getService();
      if (!service) {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text3,#94a3b8);">Loading Business Hub module…</div>';
        return;
      }

      var businesses = service.getBusinesses();
      if (!businesses || businesses.length === 0) {
        this.renderEmptyState(container);
        return;
      }

      if (!_activeBusinessId || (_activeBusinessId !== 'all' && !businesses.some(function (b) { return b.id === _activeBusinessId; }))) {
        _activeBusinessId = service.getActiveBusinessId() || businesses[0].id;
      }

      var activeBiz = _activeBusinessId === 'all'
        ? { id: 'all', name: 'All Businesses (Consolidated)', currencySymbol: '₹', icon: '🌐', color: '#3b82f6' }
        : (service.getBusinessById(_activeBusinessId) || businesses[0]);

      var currSym = activeBiz.currencySymbol || '₹';
      var dateRange = _getDateRange(_dateFilter);
      var metrics = service.getMetrics(_activeBusinessId, dateRange);

      var html = `
        <div class="business-dashboard-container" style="max-width:1160px;margin:0 auto;padding:16px 14px 44px;">
          <!-- ── TOP COMMAND HEADER & BUSINESS SELECTOR ── -->
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:18px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-size:26px;">` + (activeBiz.icon || '🏢') + `</span>
                <div>
                  <h1 style="font-size:22px;font-weight:800;color:var(--text,#f8fafc);margin:0;letter-spacing:-0.02em;line-height:1.2;">
                    ` + _esc(activeBiz.name) + `
                  </h1>
                  <div style="font-size:12px;color:var(--text3,#94a3b8);margin-top:2px;">
                    ` + (activeBiz.tagline ? _esc(activeBiz.tagline) + ' · ' : '') + `Credits, Debits &amp; Charges Ledger
                  </div>
                </div>
              </div>
            </div>

            <!-- Action buttons & business switcher -->
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;">
              <!-- Business Dropdown -->
              <div style="position:relative;">
                <select id="bizSelectDropdown" onchange="window.LM_BusinessUI.setActiveBusiness(this.value)"
                  style="background:var(--surface,#13182b);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:600;cursor:pointer;outline:none;">
                  ` + businesses.map(function (b) {
                    return '<option value="' + b.id + '"' + (b.id === _activeBusinessId ? ' selected' : '') + '>' + (b.icon || '🏢') + ' ' + _esc(b.name) + '</option>';
                  }).join('') + `
                  <option value="all"` + (_activeBusinessId === 'all' ? ' selected' : '') + `>🌐 All Businesses (Consolidated)</option>
                </select>
              </div>

              <!-- Quick Log Buttons -->
              <button onclick="window.LM_BusinessUI.openTxModal(null, 'credit')"
                style="display:inline-flex;align-items:center;gap:6px;background:rgba(0,212,180,0.12);color:var(--teal,#00d4b4);border:1px solid rgba(0,212,180,0.3);padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all .18s;">
                <span>＋</span> Record Credit
              </button>

              <button onclick="window.LM_BusinessUI.openTxModal(null, 'debit')"
                style="display:inline-flex;align-items:center;gap:6px;background:rgba(244,63,94,0.12);color:#fb7185;border:1px solid rgba(244,63,94,0.3);padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all .18s;">
                <span>－</span> Record Debit
              </button>

              <button onclick="window.LM_BusinessUI.openTxModal(null, 'charge')"
                style="display:inline-flex;align-items:center;gap:6px;background:rgba(245,158,11,0.12);color:#fbbf24;border:1px solid rgba(245,158,11,0.3);padding:8px 12px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;transition:all .18s;">
                <span>⚡</span> Log Charge
              </button>

              <button onclick="window.LM_BusinessUI.openBusinessModal()" title="Add new business entity"
                style="background:var(--surface,#13182b);color:var(--text2,#cbd5e1);border:1px solid var(--border,rgba(255,255,255,0.1));padding:8px 10px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;">
                🏢 + New
              </button>
            </div>
          </div>

          <!-- ── DATE FILTER PILL TABS ── -->
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
            <div style="display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.22);padding:3px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,0.06));">
              ` + [
                { k: 'month', label: 'This Month' },
                { k: 'last_month', label: 'Last Month' },
                { k: 'quarter', label: 'This Quarter' },
                { k: 'year', label: 'Financial Year' },
                { k: 'all', label: 'All Time' }
              ].map(function (tab) {
                var isAct = _dateFilter === tab.k;
                return '<button onclick="window.LM_BusinessUI.setDateFilter(\'' + tab.k + '\')" style="padding:5px 11px;border-radius:7px;border:none;background:' + (isAct ? 'var(--card,#13182b)' : 'transparent') + ';color:' + (isAct ? 'var(--teal,#00d4b4)' : 'var(--text3,#94a3b8)') + ';font-size:11.5px;font-weight:600;cursor:pointer;box-shadow:' + (isAct ? '0 2px 6px rgba(0,0,0,0.25)' : 'none') + ';">' + tab.label + '</button>';
              }).join('') + `
            </div>

            <div style="font-size:11.5px;color:var(--text3,#94a3b8);font-weight:500;">
              Showing: <strong style="color:var(--text,#f8fafc);">` + _esc(dateRange.label) + `</strong> (` + metrics.transactionCount + ` transactions)
            </div>
          </div>

          <!-- ── EXECUTIVE METRIC CARDS (P&L SNAPSHOT) ── -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:12px;margin-bottom:20px;">
            <!-- 1. Gross Revenue / Credits -->
            <div style="background:var(--surface-glass,rgba(19,24,43,0.7));border:1px solid rgba(0,212,180,0.2);backdrop-filter:blur(16px);border-radius:16px;padding:14px 16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:11px;font-weight:700;color:var(--teal,#00d4b4);text-transform:uppercase;letter-spacing:0.5px;">Gross Revenue (Credits)</span>
                <span style="font-size:14px;">🟢</span>
              </div>
              <div style="font-size:22px;font-weight:800;color:var(--text,#f8fafc);letter-spacing:-0.02em;">
                ` + _fmtCurr(metrics.totalCredits, currSym) + `
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text3,#94a3b8);">
                <span>Received: <strong style="color:var(--teal,#00d4b4);">` + _fmtCurr(metrics.paidCredits, currSym) + `</strong></span>
                <span>Pending: <strong style="color:#f59e0b;">` + _fmtCurr(metrics.pendingCredits, currSym) + `</strong></span>
              </div>
            </div>

            <!-- 2. Operating Expenses / Debits -->
            <div style="background:var(--surface-glass,rgba(19,24,43,0.7));border:1px solid rgba(244,63,94,0.2);backdrop-filter:blur(16px);border-radius:16px;padding:14px 16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:11px;font-weight:700;color:#fb7185;text-transform:uppercase;letter-spacing:0.5px;">Operating Costs (Debits)</span>
                <span style="font-size:14px;">🔴</span>
              </div>
              <div style="font-size:22px;font-weight:800;color:var(--text,#f8fafc);letter-spacing:-0.02em;">
                ` + _fmtCurr(metrics.totalDebits, currSym) + `
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--text3,#94a3b8);">
                <span>Settled: <strong style="color:#fb7185;">` + _fmtCurr(metrics.paidDebits, currSym) + `</strong></span>
                <span>Unpaid: <strong style="color:#f59e0b;">` + _fmtCurr(metrics.pendingDebits, currSym) + `</strong></span>
              </div>
            </div>

            <!-- 3. Platform Fees & Taxes / Charges -->
            <div style="background:var(--surface-glass,rgba(19,24,43,0.7));border:1px solid rgba(245,158,11,0.2);backdrop-filter:blur(16px);border-radius:16px;padding:14px 16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:11px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:0.5px;">Fees &amp; Taxes (Charges)</span>
                <span style="font-size:14px;">🟡</span>
              </div>
              <div style="font-size:22px;font-weight:800;color:var(--text,#f8fafc);letter-spacing:-0.02em;">
                ` + _fmtCurr(metrics.totalCharges, currSym) + `
              </div>
              <div style="margin-top:6px;font-size:11px;color:var(--text3,#94a3b8);">
                Gateway cuts, wire fees &amp; GST deductions
              </div>
            </div>

            <!-- 4. Bottom Line Net Profit & Margin -->
            <div style="background:var(--surface-glass,rgba(19,24,43,0.7));border:1px solid ` + (metrics.netProfit >= 0 ? 'rgba(0,212,180,0.3)' : 'rgba(244,63,94,0.3)') + `;backdrop-filter:blur(16px);border-radius:16px;padding:14px 16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:11px;font-weight:700;color:` + (metrics.netProfit >= 0 ? 'var(--teal,#00d4b4)' : '#fb7185') + `;text-transform:uppercase;letter-spacing:0.5px;">Bottom Line Net Profit</span>
                <span style="display:inline-block;padding:2px 6px;border-radius:6px;font-size:10.5px;font-weight:700;background:` + (metrics.profitMargin >= 20 ? 'rgba(0,212,180,0.15)' : 'rgba(245,158,11,0.15)') + `;color:` + (metrics.profitMargin >= 20 ? 'var(--teal,#00d4b4)' : '#fbbf24') + `">` + metrics.profitMargin + `% Margin</span>
              </div>
              <div style="font-size:22px;font-weight:800;color:` + (metrics.netProfit >= 0 ? 'var(--teal,#00d4b4)' : '#fb7185') + `;letter-spacing:-0.02em;">
                ` + _fmtCurr(metrics.netProfit, currSym) + `
              </div>
              <div style="margin-top:6px;font-size:11px;color:var(--text3,#94a3b8);">
                Cash Inflow Net: ` + _fmtCurr(metrics.netCashFlow, currSym) + `
              </div>
            </div>

            <!-- 5. Pending Receivables vs Payables (Khata Position) -->
            <div style="background:var(--surface-glass,rgba(19,24,43,0.7));border:1px solid rgba(139,92,246,0.25);backdrop-filter:blur(16px);border-radius:16px;padding:14px 16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:11px;font-weight:700;color:#c084fc;text-transform:uppercase;letter-spacing:0.5px;">Khata Dues Balance</span>
                <span style="font-size:14px;">⏳</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px;">
                <div>
                  <div style="font-size:11px;color:var(--text3,#94a3b8);">You'll Get (Clients)</div>
                  <div style="font-size:16px;font-weight:800;color:var(--teal,#00d4b4);">` + _fmtCurr(metrics.pendingCredits, currSym) + `</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:11px;color:var(--text3,#94a3b8);">You'll Give (Vendors)</div>
                  <div style="font-size:16px;font-weight:800;color:#fb7185;">` + _fmtCurr(metrics.pendingDebits, currSym) + `</div>
                </div>
              </div>
              ` + ((metrics.overdueReceivablesCount > 0 || metrics.overduePayablesCount > 0) ? `
                <div style="margin-top:6px;font-size:10.5px;color:#fbbf24;font-weight:600;">
                  ⚠️ ` + metrics.overdueReceivablesCount + ` overdue client invoice(s)
                </div>
              ` : `
                <div style="margin-top:6px;font-size:10.5px;color:var(--text3,#94a3b8);">
                  All payments current on schedule
                </div>
              `) + `
            </div>
          </div>

          <!-- ── SUB-TABS NAVIGATION ── -->
          <div style="display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border,rgba(255,255,255,0.08));margin-bottom:18px;">
            ` + [
              { k: 'ledger', icon: '📋', label: 'Ledger Timeline' },
              { k: 'parties', icon: '👥', label: 'Party Book (Khata)' },
              { k: 'analytics', icon: '📊', label: 'P&L Analytics' },
              { k: 'settings', icon: '⚙️', label: 'Business Profile' }
            ].map(function (tab) {
              var isAct = _activeTab === tab.k;
              return '<button onclick="window.LM_BusinessUI.setTab(\'' + tab.k + '\')" style="display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border:none;background:transparent;color:' + (isAct ? 'var(--teal,#00d4b4)' : 'var(--text3,#94a3b8)') + ';font-size:13px;font-weight:700;cursor:pointer;border-bottom:2px solid ' + (isAct ? 'var(--teal,#00d4b4)' : 'transparent') + ';margin-bottom:-1px;"><span>' + tab.icon + '</span> ' + tab.label + '</button>';
            }).join('') + `
          </div>

          <!-- ── SUB-TAB CONTENT RENDERING ── -->
          ` + this.renderSubTabContent(activeBiz, metrics, dateRange) + `

        </div>
      `;

      container.innerHTML = html;
      if (_activeTab === 'analytics') {
        setTimeout(function () {
          window.LM_BusinessUI.renderCharts(activeBiz);
        }, 60);
      }
    },

    renderEmptyState: function (container) {
      container.innerHTML = `
        <div style="max-width:540px;margin:60px auto;text-align:center;padding:32px 20px;background:var(--surface-glass,rgba(19,24,43,0.7));border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:24px;">
          <div style="font-size:48px;margin-bottom:12px;">🏢</div>
          <h2 style="font-size:22px;font-weight:800;color:var(--text,#f8fafc);margin-bottom:8px;">Welcome to Business Hub</h2>
          <p style="font-size:13px;color:var(--text3,#94a3b8);line-height:1.5;margin-bottom:24px;">
            Manage your businesses, client credits (revenue), vendor debits (expenses), and gateway charges all in one private, zero-knowledge accounting vault.
          </p>
          <button onclick="window.LM_BusinessUI.openBusinessModal()"
            style="padding:12px 22px;background:linear-gradient(135deg,#00d4b4,#3b82f6);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(0,212,180,0.3);">
            + Create First Business Profile
          </button>
        </div>
      `;
    },

    renderSubTabContent: function (activeBiz, metrics, dateRange) {
      if (_activeTab === 'parties') return this.renderPartiesTab(activeBiz);
      if (_activeTab === 'analytics') return this.renderAnalyticsTab(activeBiz, metrics);
      if (_activeTab === 'settings') return this.renderSettingsTab(activeBiz);
      return this.renderLedgerTab(activeBiz, dateRange);
    },

    // ── TAB 1: LEDGER TIMELINE ──────────────────────────────
    renderLedgerTab: function (activeBiz, dateRange) {
      var service = _getService();
      var txs = service.getTransactions({
        businessId: _activeBusinessId,
        type: _typeFilter,
        paymentStatus: _statusFilter,
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
        search: _searchQuery
      });

      var currSym = activeBiz.currencySymbol || '₹';

      var filtersHtml = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
          <!-- Type filter pills -->
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;">
            ` + [
              { k: 'all', label: 'All Entries' },
              { k: 'credit', label: '🟢 Credits (Inflows)' },
              { k: 'debit', label: '🔴 Debits (Outflows)' },
              { k: 'charge', label: '🟡 Charges (Fees)' }
            ].map(function (tf) {
              var isAct = _typeFilter === tf.k;
              return '<button onclick="window.LM_BusinessUI.setTypeFilter(\'' + tf.k + '\')" style="padding:5px 10px;border-radius:8px;border:1px solid ' + (isAct ? 'var(--teal,#00d4b4)' : 'var(--border,rgba(255,255,255,0.08))') + ';background:' + (isAct ? 'rgba(0,212,180,0.1)' : 'var(--surface,#13182b)') + ';color:' + (isAct ? 'var(--teal,#00d4b4)' : 'var(--text3,#94a3b8)') + ';font-size:11.5px;font-weight:600;cursor:pointer;">' + tf.label + '</button>';
            }).join('') + `
          </div>

          <!-- Status filter & Search bar -->
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <select onchange="window.LM_BusinessUI.setStatusFilter(this.value)"
              style="background:var(--surface,#13182b);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:8px;padding:6px 10px;font-size:11.5px;font-weight:600;outline:none;">
              <option value="all"` + (_statusFilter === 'all' ? ' selected' : '') + `>Status: All</option>
              <option value="paid"` + (_statusFilter === 'paid' ? ' selected' : '') + `>Status: Paid / Settled</option>
              <option value="pending"` + (_statusFilter === 'pending' ? ' selected' : '') + `>Status: Pending / Due</option>
              <option value="overdue"` + (_statusFilter === 'overdue' ? ' selected' : '') + `>Status: Overdue</option>
            </select>

            <div style="position:relative;">
              <input type="text" placeholder="Search parties, ref #…" value="` + _esc(_searchQuery) + `"
                oninput="window.LM_BusinessUI.setSearch(this.value)"
                style="background:var(--surface,#13182b);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:8px;padding:6px 12px;font-size:11.5px;outline:none;width:170px;" />
            </div>
          </div>
        </div>
      `;

      if (txs.length === 0) {
        return filtersHtml + `
          <div style="background:var(--surface,#13182b);border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:16px;padding:40px 20px;text-align:center;color:var(--text3,#94a3b8);">
            <div style="font-size:32px;margin-bottom:8px;">🔍</div>
            <div style="font-size:14px;font-weight:700;color:var(--text,#f8fafc);margin-bottom:4px;">No matching entries found</div>
            <div style="font-size:12px;margin-bottom:16px;">Record a new credit, debit or fee deduction for this business.</div>
            <div style="display:flex;justify-content:center;gap:8px;">
              <button onclick="window.LM_BusinessUI.openTxModal(null, 'credit')" style="padding:7px 14px;background:rgba(0,212,180,0.15);color:var(--teal,#00d4b4);border:1px solid rgba(0,212,180,0.3);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">+ Credit</button>
              <button onclick="window.LM_BusinessUI.openTxModal(null, 'debit')" style="padding:7px 14px;background:rgba(244,63,94,0.15);color:#fb7185;border:1px solid rgba(244,63,94,0.3);border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">+ Debit</button>
            </div>
          </div>
        `;
      }

      var rowsHtml = txs.map(function (t) {
        var isCredit = t.type === 'credit';
        var isDebit = t.type === 'debit';

        var typeBadge = isCredit
          ? '<span style="display:inline-block;padding:2px 7px;border-radius:6px;font-size:10.5px;font-weight:700;background:rgba(0,212,180,0.12);color:var(--teal,#00d4b4);border:1px solid rgba(0,212,180,0.25);">Credit</span>'
          : (isDebit
              ? '<span style="display:inline-block;padding:2px 7px;border-radius:6px;font-size:10.5px;font-weight:700;background:rgba(244,63,94,0.12);color:#fb7185;border:1px solid rgba(244,63,94,0.25);">Debit</span>'
              : '<span style="display:inline-block;padding:2px 7px;border-radius:6px;font-size:10.5px;font-weight:700;background:rgba(245,158,11,0.12);color:#fbbf24;border:1px solid rgba(245,158,11,0.25);">Charge</span>');

        var statusBadge = t.paymentStatus === 'paid'
          ? '<span style="font-size:10.5px;color:var(--teal,#00d4b4);font-weight:600;">✅ Paid</span>'
          : (t.paymentStatus === 'partial'
              ? '<span style="font-size:10.5px;color:#f59e0b;font-weight:600;">⏳ Partial (' + _fmtCurr(t.paidAmount, currSym) + ')</span>'
              : '<span style="font-size:10.5px;color:#fb7185;font-weight:600;">⚠️ Pending' + (t.dueDate ? ' (Due ' + t.dueDate + ')' : '') + '</span>');

        var amountColor = isCredit ? 'var(--teal,#00d4b4)' : (isDebit ? '#fb7185' : '#fbbf24');
        var amountSign = isCredit ? '+' : '-';

        return `
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 14px;background:var(--surface-glass,rgba(19,24,43,0.6));border:1px solid var(--border,rgba(255,255,255,0.06));border-radius:12px;margin-bottom:8px;transition:all .18s;">
            <div style="display:flex;align-items:center;gap:12px;min-width:240px;flex:1;">
              <div>` + typeBadge + `</div>
              <div>
                <div style="font-size:13.5px;font-weight:700;color:var(--text,#f8fafc);">
                  ` + _esc(t.partyName) + `
                  ` + (t.invoiceNumber ? '<span style="font-size:11px;color:var(--text3,#94a3b8);font-weight:500;margin-left:6px;">#' + _esc(t.invoiceNumber) + '</span>' : '') + `
                </div>
                <div style="font-size:11px;color:var(--text3,#94a3b8);margin-top:2px;">
                  ` + _esc(t.category) + ` · ` + t.date + ` ` + (t.paymentMode ? '· ' + _esc(t.paymentMode) : '') + `
                </div>
              </div>
            </div>

            <!-- Amount & Status -->
            <div style="text-align:right;min-width:140px;">
              <div style="font-size:15px;font-weight:800;color:` + amountColor + `;">
                ` + amountSign + ` ` + _fmtCurr(t.amount, currSym) + `
              </div>
              <div style="margin-top:2px;">` + statusBadge + `</div>
            </div>

            <!-- Action buttons -->
            <div style="display:flex;align-items:center;gap:6px;">
              ` + (t.paymentStatus !== 'paid' ? `
                <button onclick="window.LM_BusinessUI.markAsPaid('` + t.id + `')" title="Mark as Fully Paid"
                  style="background:rgba(0,212,180,0.1);color:var(--teal,#00d4b4);border:1px solid rgba(0,212,180,0.25);padding:5px 9px;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;">
                  Mark Paid
                </button>
              ` : '') + `

              ` + (isCredit ? `
                <button onclick="window.LM_BusinessUI.openInvoiceModal('` + t.id + `')" title="Generate Invoice / Receipt"
                  style="background:var(--surface,#13182b);color:var(--text2,#cbd5e1);border:1px solid var(--border,rgba(255,255,255,0.1));padding:5px 8px;border-radius:7px;font-size:11px;cursor:pointer;">
                  📄
                </button>
              ` : '') + `

              <button onclick="window.LM_BusinessUI.openTxModal('` + t.id + `')" title="Edit Entry"
                style="background:var(--surface,#13182b);color:var(--text2,#cbd5e1);border:1px solid var(--border,rgba(255,255,255,0.1));padding:5px 8px;border-radius:7px;font-size:11px;cursor:pointer;">
                ✏️
              </button>

              <button onclick="window.LM_BusinessUI.deleteTx('` + t.id + `')" title="Delete Entry"
                style="background:rgba(244,63,94,0.08);color:#fb7185;border:1px solid rgba(244,63,94,0.2);padding:5px 8px;border-radius:7px;font-size:11px;cursor:pointer;">
                🗑️
              </button>
            </div>
          </div>
        `;
      }).join('');

      return filtersHtml + rowsHtml;
    },

    // ── TAB 2: PARTY BOOK (KHATA BOOK) ──────────────────────
    renderPartiesTab: function (activeBiz) {
      var service = _getService();
      var parties = service.getAllParties(_activeBusinessId);
      var currSym = activeBiz.currencySymbol || '₹';

      if (parties.length === 0) {
        return `
          <div style="background:var(--surface,#13182b);border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:16px;padding:40px 20px;text-align:center;color:var(--text3,#94a3b8);">
            <div style="font-size:32px;margin-bottom:8px;">👥</div>
            <div style="font-size:14px;font-weight:700;color:var(--text,#f8fafc);margin-bottom:4px;">Party Book is Empty</div>
            <div style="font-size:12px;">As you record credits and debits, customer &amp; vendor ledgers automatically appear here.</div>
          </div>
        `;
      }

      var cardsHtml = parties.map(function (p) {
        var isReceivable = p.netReceivable > 0;
        var isPayable = p.netReceivable < 0;

        var balanceColor = isReceivable ? 'var(--teal,#00d4b4)' : (isPayable ? '#fb7185' : 'var(--text3,#94a3b8)');
        var balanceLabel = isReceivable
          ? 'You\'ll Get: ' + _fmtCurr(p.netReceivable, currSym)
          : (isPayable
              ? 'You\'ll Give: ' + _fmtCurr(Math.abs(p.netReceivable), currSym)
              : 'Settled Balance (₹0)');

        return `
          <div style="background:var(--surface-glass,rgba(19,24,43,0.6));border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:14px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:14.5px;font-weight:700;color:var(--text,#f8fafc);">` + _esc(p.name) + `</span>
                <span style="font-size:10.5px;padding:2px 6px;border-radius:6px;background:rgba(255,255,255,0.05);color:var(--text3,#94a3b8);text-transform:capitalize;">` + (p.partyType || 'customer') + `</span>
              </div>
              <div style="font-size:11.5px;color:var(--text3,#94a3b8);margin-bottom:10px;">
                Total Billed: ` + _fmtCurr(p.totalBilled, currSym) + ` · Total Spent: ` + _fmtCurr(p.totalSpent, currSym) + `
              </div>
              <div style="font-size:13.5px;font-weight:800;color:` + balanceColor + `;margin-bottom:12px;">
                ` + balanceLabel + `
              </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border,rgba(255,255,255,0.06));padding-top:10px;">
              <span style="font-size:11px;color:var(--text3,#94a3b8);">` + p.txCount + ` transaction(s)</span>
              <button onclick="window.LM_BusinessUI.openPartyStatementModal('` + _esc(p.name) + `')"
                style="background:var(--surface,#13182b);color:var(--teal,#00d4b4);border:1px solid rgba(0,212,180,0.3);padding:5px 11px;border-radius:7px;font-size:11.5px;font-weight:600;cursor:pointer;">
                View Statement 📋
              </button>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:12px;">
          ` + cardsHtml + `
        </div>
      `;
    },

    // ── TAB 3: P&L ANALYTICS ────────────────────────────────
    renderAnalyticsTab: function (activeBiz, metrics) {
      return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px;margin-bottom:20px;">
          <!-- Monthly Trends Bar Chart -->
          <div style="background:var(--surface-glass,rgba(19,24,43,0.6));border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:16px;padding:16px;">
            <div style="font-size:13px;font-weight:700;color:var(--text,#f8fafc);margin-bottom:4px;">Monthly P&amp;L Breakdown (6-Month Trend)</div>
            <div style="font-size:11px;color:var(--text3,#94a3b8);margin-bottom:14px;">Revenue (Credits) vs Expenses (Debits) vs Net Margin</div>
            <div style="height:240px;position:relative;">
              <canvas id="bizPnlChartCanvas"></canvas>
            </div>
          </div>

          <!-- Expense Category Donut Chart -->
          <div style="background:var(--surface-glass,rgba(19,24,43,0.6));border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:16px;padding:16px;">
            <div style="font-size:13px;font-weight:700;color:var(--text,#f8fafc);margin-bottom:4px;">Operating Expense Distribution</div>
            <div style="font-size:11px;color:var(--text3,#94a3b8);margin-bottom:14px;">Where capital is being deployed across vendors &amp; categories</div>
            <div style="height:240px;position:relative;">
              <canvas id="bizCategoryChartCanvas"></canvas>
            </div>
          </div>
        </div>
      `;
    },

    renderCharts: function (activeBiz) {
      var service = _getService();
      if (!service) return;

      var canvas1 = document.getElementById('bizPnlChartCanvas');
      if (canvas1 && window.Chart) {
        var pnl = service.getMonthlyPnLTrends(_activeBusinessId, 6);
        if (window._bizPnlChartInstance) {
          try { window._bizPnlChartInstance.destroy(); } catch (e) {}
        }
        window._bizPnlChartInstance = new window.Chart(canvas1, {
          type: 'bar',
          data: {
            labels: pnl.labels,
            datasets: [
              { label: 'Revenue (Credits)', data: pnl.credits, backgroundColor: '#00d4b4', borderRadius: 6 },
              { label: 'Expenses (Debits)', data: pnl.debits, backgroundColor: '#f43f5e', borderRadius: 6 },
              { label: 'Fees (Charges)', data: pnl.charges, backgroundColor: '#f59e0b', borderRadius: 6 }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, color: '#94a3b8', font: { size: 10.5 } } }
            },
            scales: {
              x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
              y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }
            }
          }
        });
      }

      var canvas2 = document.getElementById('bizCategoryChartCanvas');
      if (canvas2 && window.Chart) {
        var dist = service.getCategoryDistribution(_activeBusinessId, 'debit');
        if (window._bizCatChartInstance) {
          try { window._bizCatChartInstance.destroy(); } catch (e) {}
        }
        window._bizCatChartInstance = new window.Chart(canvas2, {
          type: 'doughnut',
          data: {
            labels: dist.labels.length > 0 ? dist.labels : ['No Expenses Yet'],
            datasets: [{
              data: dist.values.length > 0 ? dist.values : [1],
              backgroundColor: dist.values.length > 0
                ? ['#00d4b4', '#8b5cf6', '#3b82f6', '#f59e0b', '#f43f5e', '#10b981', '#ec4899', '#6366f1']
                : ['rgba(255,255,255,0.1)'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, color: '#94a3b8', font: { size: 10 } } }
            },
            cutout: '70%'
          }
        });
      }
    },

    // ── TAB 4: BUSINESS PROFILE & SETTINGS ──────────────────
    renderSettingsTab: function (activeBiz) {
      if (activeBiz.id === 'all') {
        return '<div style="padding:24px;text-align:center;color:var(--text3,#94a3b8);">Please select an individual business from the top dropdown to view its settings.</div>';
      }

      return `
        <div style="max-width:680px;background:var(--surface-glass,rgba(19,24,43,0.6));border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:18px;padding:22px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
            <div>
              <div style="font-size:16px;font-weight:800;color:var(--text,#f8fafc);">` + _esc(activeBiz.name) + ` Settings</div>
              <div style="font-size:11.5px;color:var(--text3,#94a3b8);">Company profile, tax/GSTIN credentials, and invoice bank details</div>
            </div>
            <button onclick="window.LM_BusinessUI.deleteBusiness('` + activeBiz.id + `')"
              style="padding:6px 12px;background:rgba(244,63,94,0.1);color:#fb7185;border:1px solid rgba(244,63,94,0.3);border-radius:8px;font-size:11.5px;font-weight:600;cursor:pointer;">
              Delete Business
            </button>
          </div>

          <form id="bizSettingsForm" onsubmit="event.preventDefault(); window.LM_BusinessUI.handleSaveBizSettings('` + activeBiz.id + `');" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div style="grid-column:1 / -1;">
              <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Business / Entity Name</label>
              <input type="text" id="setBizName" value="` + _esc(activeBiz.name) + `" required
                style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
            </div>

            <div>
              <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">GSTIN / Reg Number</label>
              <input type="text" id="setBizReg" value="` + _esc(activeBiz.regNumber || '') + `" placeholder="29ABCDE1234F1Z5"
                style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
            </div>

            <div>
              <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Currency Symbol</label>
              <input type="text" id="setBizCurr" value="` + _esc(activeBiz.currencySymbol || '₹') + `"
                style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
            </div>

            <div>
              <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Bank Name</label>
              <input type="text" id="setBizBank" value="` + _esc(activeBiz.bankDetails?.bankName || '') + `" placeholder="HDFC Bank"
                style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
            </div>

            <div>
              <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Account Number</label>
              <input type="text" id="setBizAcc" value="` + _esc(activeBiz.bankDetails?.accountNumber || '') + `"
                style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
            </div>

            <div>
              <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">IFSC Code</label>
              <input type="text" id="setBizIfsc" value="` + _esc(activeBiz.bankDetails?.ifsc || '') + `"
                style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
            </div>

            <div>
              <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">UPI ID for Invoices</label>
              <input type="text" id="setBizUpi" value="` + _esc(activeBiz.bankDetails?.upiId || '') + `" placeholder="business@okaxis"
                style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
            </div>

            <div style="grid-column:1 / -1;margin-top:8px;">
              <button type="submit"
                style="padding:10px 18px;background:linear-gradient(135deg,#00d4b4,#3b82f6);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;">
                Save Business Profile
              </button>
            </div>
          </form>
        </div>
      `;
    },

    handleSaveBizSettings: async function (bizId) {
      var service = _getService();
      if (!service) return;
      var current = service.getBusinessById(bizId);
      if (!current) return;

      current.name = document.getElementById('setBizName')?.value || current.name;
      current.regNumber = document.getElementById('setBizReg')?.value || '';
      current.currencySymbol = document.getElementById('setBizCurr')?.value || '₹';
      current.bankDetails = {
        bankName: document.getElementById('setBizBank')?.value || '',
        accountNumber: document.getElementById('setBizAcc')?.value || '',
        ifsc: document.getElementById('setBizIfsc')?.value || '',
        upiId: document.getElementById('setBizUpi')?.value || ''
      };

      await service.saveBusiness(current);
      if (typeof showToast === 'function') showToast('✅ Business profile updated!', 'success');
      this.render();
    },

    deleteBusiness: async function (bizId) {
      if (!confirm('Are you sure you want to delete this business and all its entries? This cannot be undone.')) return;
      var service = _getService();
      if (!service) return;
      await service.deleteBusiness(bizId);
      _activeBusinessId = null;
      if (typeof showToast === 'function') showToast('🗑️ Business deleted.', 'info');
      this.render();
    },

    deleteTx: async function (txId) {
      if (!confirm('Delete this transaction entry?')) return;
      var service = _getService();
      if (!service) return;
      await service.deleteTransaction(txId);
      if (typeof showToast === 'function') showToast('Entry deleted.', 'info');
      this.render();
    },

    markAsPaid: async function (txId) {
      var service = _getService();
      if (!service) return;
      await service.markAsPaid(txId);
      if (typeof showToast === 'function') showToast('✅ Marked as Paid!', 'success');
      this.render();
    },

    // ── MODALS (TRANSACTION, BUSINESS, STATEMENT, INVOICE) ──

    openTxModal: function (txId, prefillType) {
      var service = _getService();
      var tx = txId ? service.getTransactionById(txId) : null;
      var type = tx ? tx.type : (prefillType || 'credit');

      var existingModal = document.getElementById('bizTxModal');
      if (existingModal) existingModal.remove();

      var categories = service.DEFAULT_CATEGORIES[type] || [];
      var businesses = service.getBusinesses();

      var modalHtml = `
        <div id="bizTxModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;">
          <div style="background:var(--card,#13182b);border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:20px;max-width:540px;width:100%;max-height:90vh;overflow-y:auto;padding:22px;box-shadow:0 25px 50px rgba(0,0,0,0.5);">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <h3 style="font-size:18px;font-weight:800;color:var(--text,#f8fafc);margin:0;">
                ` + (tx ? 'Edit Transaction' : 'Record Business Transaction') + `
              </h3>
              <button onclick="document.getElementById('bizTxModal').remove()" style="background:none;border:none;color:var(--text3,#94a3b8);font-size:20px;cursor:pointer;">✕</button>
            </div>

            <!-- Type Selector Tabs -->
            <div style="display:flex;gap:6px;background:rgba(0,0,0,0.25);padding:3px;border-radius:10px;margin-bottom:16px;">
              <button type="button" onclick="window.LM_BusinessUI.updateTxModalType('credit')" id="btnTypeCredit"
                style="flex:1;padding:7px;border-radius:8px;border:none;background:` + (type === 'credit' ? 'rgba(0,212,180,0.2)' : 'transparent') + `;color:` + (type === 'credit' ? 'var(--teal,#00d4b4)' : 'var(--text3,#94a3b8)') + `;font-size:12px;font-weight:700;cursor:pointer;">
                🟢 Credit (Inflow)
              </button>
              <button type="button" onclick="window.LM_BusinessUI.updateTxModalType('debit')" id="btnTypeDebit"
                style="flex:1;padding:7px;border-radius:8px;border:none;background:` + (type === 'debit' ? 'rgba(244,63,94,0.2)' : 'transparent') + `;color:` + (type === 'debit' ? '#fb7185' : 'var(--text3,#94a3b8)') + `;font-size:12px;font-weight:700;cursor:pointer;">
                🔴 Debit (Outflow)
              </button>
              <button type="button" onclick="window.LM_BusinessUI.updateTxModalType('charge')" id="btnTypeCharge"
                style="flex:1;padding:7px;border-radius:8px;border:none;background:` + (type === 'charge' ? 'rgba(245,158,11,0.2)' : 'transparent') + `;color:` + (type === 'charge' ? '#fbbf24' : 'var(--text3,#94a3b8)') + `;font-size:12px;font-weight:700;cursor:pointer;">
                🟡 Charge (Fee/Tax)
              </button>
            </div>

            <form id="bizTxForm" onsubmit="event.preventDefault(); window.LM_BusinessUI.saveTxForm('` + (tx ? tx.id : '') + `');">
              <input type="hidden" id="txModalType" value="` + type + `" />

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div style="grid-column:1 / -1;">
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Business Entity</label>
                  <select id="txBizId" style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:12.5px;">
                    ` + businesses.map(function (b) {
                      var sel = (tx && tx.businessId === b.id) || (!tx && b.id === _activeBusinessId);
                      return '<option value="' + b.id + '"' + (sel ? ' selected' : '') + '>' + (b.icon || '🏢') + ' ' + _esc(b.name) + '</option>';
                    }).join('') + `
                  </select>
                </div>

                <div>
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Amount</label>
                  <input type="number" step="any" id="txAmount" value="` + (tx ? tx.amount : '') + `" placeholder="0.00" required
                    style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13.5px;font-weight:700;" />
                </div>

                <div>
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Gateway / Fee Cut (optional)</label>
                  <input type="number" step="any" id="txCharge" value="` + (tx ? (tx.chargeAmount || '') : '') + `" placeholder="e.g. 200"
                    style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
                </div>

                <div>
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Client / Vendor Name</label>
                  <input type="text" id="txPartyName" value="` + (tx ? _esc(tx.partyName) : '') + `" placeholder="Client / Vendor Name" required
                    style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
                </div>

                <div>
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Category</label>
                  <select id="txCategory" style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:12.5px;">
                    ` + categories.map(function (c) {
                      var sel = tx && tx.category === c;
                      return '<option value="' + c + '"' + (sel ? ' selected' : '') + '>' + c + '</option>';
                    }).join('') + `
                  </select>
                </div>

                <div>
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Date</label>
                  <input type="date" id="txDate" value="` + (tx ? tx.date : new Date().toISOString().split('T')[0]) + `" required
                    style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:12.5px;" />
                </div>

                <div>
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Payment Status</label>
                  <select id="txStatus" style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:12.5px;">
                    <option value="paid"` + (!tx || tx.paymentStatus === 'paid' ? ' selected' : '') + `>✅ Paid / Settled</option>
                    <option value="pending"` + (tx && tx.paymentStatus === 'pending' ? ' selected' : '') + `>⏳ Pending / Unpaid</option>
                    <option value="partial"` + (tx && tx.paymentStatus === 'partial' ? ' selected' : '') + `>⏳ Partial Payment</option>
                  </select>
                </div>

                <div>
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Invoice / Ref # (optional)</label>
                  <input type="text" id="txInvoice" value="` + (tx ? _esc(tx.invoiceNumber) : '') + `" placeholder="INV-2026-001"
                    style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
                </div>

                <div>
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Due Date (for pending dues)</label>
                  <input type="date" id="txDueDate" value="` + (tx ? (tx.dueDate || '') : '') + `"
                    style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:12.5px;" />
                </div>

                <div style="grid-column:1 / -1;">
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Payment Mode</label>
                  <select id="txPaymentMode" style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:12.5px;">
                    <option value="Bank Transfer"` + (tx && tx.paymentMode === 'Bank Transfer' ? ' selected' : '') + `>Bank Transfer / NEFT / RTGS</option>
                    <option value="UPI"` + (tx && tx.paymentMode === 'UPI' ? ' selected' : '') + `>UPI / QR</option>
                    <option value="Credit Card"` + (tx && tx.paymentMode === 'Credit Card' ? ' selected' : '') + `>Credit Card</option>
                    <option value="Cash"` + (tx && tx.paymentMode === 'Cash' ? ' selected' : '') + `>Cash</option>
                    <option value="Cheque"` + (tx && tx.paymentMode === 'Cheque' ? ' selected' : '') + `>Cheque</option>
                    <option value="Payment Gateway"` + (tx && tx.paymentMode === 'Payment Gateway' ? ' selected' : '') + `>Payment Gateway (Razorpay/Stripe)</option>
                  </select>
                </div>

                <div style="grid-column:1 / -1;">
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Notes &amp; Description</label>
                  <textarea id="txNotes" placeholder="Work details, project deliverables, payment notes…"
                    style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:12.5px;min-height:56px;">` + (tx ? _esc(tx.notes) : '') + `</textarea>
                </div>
              </div>

              <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:16px;">
                <button type="button" onclick="document.getElementById('bizTxModal').remove()"
                  style="padding:8px 14px;background:none;border:1px solid var(--border,rgba(255,255,255,0.1));color:var(--text2,#cbd5e1);border-radius:8px;font-size:12px;cursor:pointer;">
                  Cancel
                </button>
                <button type="submit"
                  style="padding:8px 18px;background:linear-gradient(135deg,#00d4b4,#3b82f6);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    updateTxModalType: function (type) {
      var service = _getService();
      if (!service) return;
      document.getElementById('txModalType').value = type;

      ['Credit', 'Debit', 'Charge'].forEach(function (t) {
        var btn = document.getElementById('btnType' + t);
        if (btn) {
          var isMatch = t.toLowerCase() === type;
          btn.style.background = isMatch
            ? (type === 'credit' ? 'rgba(0,212,180,0.2)' : (type === 'debit' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'))
            : 'transparent';
          btn.style.color = isMatch
            ? (type === 'credit' ? 'var(--teal,#00d4b4)' : (type === 'debit' ? '#fb7185' : '#fbbf24'))
            : 'var(--text3,#94a3b8)';
        }
      });

      var catSelect = document.getElementById('txCategory');
      if (catSelect) {
        var categories = service.DEFAULT_CATEGORIES[type] || [];
        catSelect.innerHTML = categories.map(function (c) {
          return '<option value="' + c + '">' + c + '</option>';
        }).join('');
      }
    },

    saveTxForm: async function (txId) {
      var service = _getService();
      if (!service) return;

      var type = document.getElementById('txModalType')?.value || 'credit';
      var amount = parseFloat(document.getElementById('txAmount')?.value) || 0;
      var charge = parseFloat(document.getElementById('txCharge')?.value) || 0;
      var partyName = document.getElementById('txPartyName')?.value || 'General';
      var category = document.getElementById('txCategory')?.value || 'Other';
      var date = document.getElementById('txDate')?.value;
      var status = document.getElementById('txStatus')?.value || 'paid';
      var invoice = document.getElementById('txInvoice')?.value || '';
      var dueDate = document.getElementById('txDueDate')?.value || '';
      var paymentMode = document.getElementById('txPaymentMode')?.value || 'Bank Transfer';
      var notes = document.getElementById('txNotes')?.value || '';
      var bizId = document.getElementById('txBizId')?.value || service.getActiveBusinessId();

      var data = {
        id: txId || undefined,
        businessId: bizId,
        type: type,
        amount: amount,
        grossAmount: amount,
        chargeAmount: charge,
        partyName: partyName,
        category: category,
        date: date,
        paymentStatus: status,
        invoiceNumber: invoice,
        dueDate: dueDate,
        paymentMode: paymentMode,
        notes: notes
      };

      await service.saveTransaction(data);
      document.getElementById('bizTxModal')?.remove();
      if (typeof showToast === 'function') showToast('✅ Entry saved successfully!', 'success');
      this.render();
    },

    openBusinessModal: function (bizId) {
      var service = _getService();
      var biz = bizId ? service.getBusinessById(bizId) : null;

      var existing = document.getElementById('bizEntityModal');
      if (existing) existing.remove();

      var html = `
        <div id="bizEntityModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;">
          <div style="background:var(--card,#13182b);border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:20px;max-width:500px;width:100%;padding:22px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
              <h3 style="font-size:18px;font-weight:800;color:var(--text,#f8fafc);margin:0;">
                ` + (biz ? 'Edit Business Profile' : 'New Business Profile') + `
              </h3>
              <button onclick="document.getElementById('bizEntityModal').remove()" style="background:none;border:none;color:var(--text3,#94a3b8);font-size:20px;cursor:pointer;">✕</button>
            </div>

            <form onsubmit="event.preventDefault(); window.LM_BusinessUI.saveBusinessForm('` + (biz ? biz.id : '') + `');" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div style="grid-column:1 / -1;">
                <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Business Name</label>
                <input type="text" id="modalBizName" value="` + (biz ? _esc(biz.name) : '') + `" placeholder="e.g. Apex Tech Solutions" required
                  style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
              </div>

              <div>
                <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Icon</label>
                <input type="text" id="modalBizIcon" value="` + (biz ? _esc(biz.icon) : '🏢') + `" placeholder="🏢, 💻, 🛍️"
                  style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
              </div>

              <div>
                <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">Currency Symbol</label>
                <input type="text" id="modalBizCurr" value="` + (biz ? _esc(biz.currencySymbol) : '₹') + `" placeholder="₹, $, €"
                  style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
              </div>

              <div style="grid-column:1 / -1;">
                <label style="display:block;font-size:11px;font-weight:600;color:var(--text3,#94a3b8);margin-bottom:4px;">GSTIN / Tax ID (optional)</label>
                <input type="text" id="modalBizReg" value="` + (biz ? _esc(biz.regNumber) : '') + `" placeholder="29ABCDE1234F1Z5"
                  style="width:100%;background:rgba(0,0,0,0.25);color:var(--text,#f8fafc);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;padding:8px 12px;font-size:13px;" />
              </div>

              <div style="grid-column:1 / -1;display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
                <button type="button" onclick="document.getElementById('bizEntityModal').remove()"
                  style="padding:8px 14px;background:none;border:1px solid var(--border,rgba(255,255,255,0.1));color:var(--text2,#cbd5e1);border-radius:8px;font-size:12px;cursor:pointer;">Cancel</button>
                <button type="submit"
                  style="padding:8px 18px;background:linear-gradient(135deg,#00d4b4,#3b82f6);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
    },

    saveBusinessForm: async function (bizId) {
      var service = _getService();
      if (!service) return;

      var name = document.getElementById('modalBizName')?.value || 'New Business';
      var icon = document.getElementById('modalBizIcon')?.value || '🏢';
      var curr = document.getElementById('modalBizCurr')?.value || '₹';
      var reg = document.getElementById('modalBizReg')?.value || '';

      var saved = await service.saveBusiness({
        id: bizId || undefined,
        name: name,
        icon: icon,
        currencySymbol: curr,
        regNumber: reg
      });

      document.getElementById('bizEntityModal')?.remove();
      if (saved) {
        _activeBusinessId = saved.id;
        service.setActiveBusinessId(saved.id);
      }
      if (typeof showToast === 'function') showToast('✅ Business profile saved!', 'success');
      this.render();
    },

    openPartyStatementModal: function (partyName) {
      var service = _getService();
      var stmt = service.getPartyStatement(partyName, _activeBusinessId);
      if (!stmt) return;

      var existing = document.getElementById('bizPartyModal');
      if (existing) existing.remove();

      var currSym = '₹';
      var isReceivable = stmt.netBalance > 0;
      var isPayable = stmt.netBalance < 0;

      var html = `
        <div id="bizPartyModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;">
          <div style="background:var(--card,#13182b);border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:20px;max-width:580px;width:100%;max-height:85vh;overflow-y:auto;padding:22px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
              <div>
                <h3 style="font-size:18px;font-weight:800;color:var(--text,#f8fafc);margin:0;">` + _esc(stmt.partyName) + ` Statement</h3>
                <div style="font-size:12px;color:var(--text3,#94a3b8);margin-top:2px;">Complete account history &amp; Khata balances</div>
              </div>
              <button onclick="document.getElementById('bizPartyModal').remove()" style="background:none;border:none;color:var(--text3,#94a3b8);font-size:20px;cursor:pointer;">✕</button>
            </div>

            <!-- Balances -->
            <div style="display:flex;gap:12px;background:rgba(0,0,0,0.25);padding:12px;border-radius:12px;margin-bottom:16px;">
              <div style="flex:1;">
                <div style="font-size:11px;color:var(--text3,#94a3b8);">Total Billed</div>
                <div style="font-size:16px;font-weight:800;color:var(--text,#f8fafc);">` + _fmtCurr(stmt.totalCredits, currSym) + `</div>
              </div>
              <div style="flex:1;">
                <div style="font-size:11px;color:var(--text3,#94a3b8);">Total Expenses</div>
                <div style="font-size:16px;font-weight:800;color:var(--text,#f8fafc);">` + _fmtCurr(stmt.totalDebits, currSym) + `</div>
              </div>
              <div style="flex:1;">
                <div style="font-size:11px;color:var(--text3,#94a3b8);">Net Outstanding</div>
                <div style="font-size:16px;font-weight:800;color:` + (isReceivable ? 'var(--teal,#00d4b4)' : (isPayable ? '#fb7185' : 'var(--text3,#94a3b8)')) + `;">
                  ` + (isReceivable ? 'You\'ll Get ' + _fmtCurr(stmt.netBalance, currSym) : (isPayable ? 'You\'ll Give ' + _fmtCurr(Math.abs(stmt.netBalance), currSym) : 'Settled')) + `
                </div>
              </div>
            </div>

            <!-- Transactions list -->
            <div style="font-size:12px;font-weight:700;color:var(--text3,#94a3b8);margin-bottom:8px;">Ledger Records (` + stmt.transactions.length + `)</div>
            <div style="max-height:220px;overflow-y:auto;margin-bottom:16px;">
              ` + stmt.transactions.map(function (t) {
                var isCred = t.type === 'credit';
                return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px;"><div><span style="font-weight:700;color:var(--text,#f8fafc);">' + t.date + '</span> · ' + _esc(t.category) + '</div><div style="font-weight:800;color:' + (isCred ? 'var(--teal,#00d4b4)' : '#fb7185') + ';">' + (isCred ? '+' : '-') + ' ' + _fmtCurr(t.amount, currSym) + '</div></div>';
              }).join('') + `
            </div>

            <!-- Actions -->
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;">
              ` + (isReceivable ? `
                <button onclick="window.open('https://wa.me/?text=' + encodeURIComponent('Hi ` + _esc(stmt.partyName) + `, this is a friendly reminder that a balance of ` + _fmtCurr(stmt.netBalance, currSym) + ` is due. Thank you!'))"
                  style="padding:8px 14px;background:#25d366;color:#fff;border:none;border-radius:8px;font-size:11.5px;font-weight:700;cursor:pointer;">
                  💬 Send WhatsApp Reminder
                </button>
              ` : '') + `
              <button onclick="document.getElementById('bizPartyModal').remove()"
                style="padding:8px 14px;background:var(--surface,#13182b);border:1px solid var(--border,rgba(255,255,255,0.1));color:var(--text2,#cbd5e1);border-radius:8px;font-size:12px;cursor:pointer;">
                Close
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
    },

    openInvoiceModal: function (txId) {
      var service = _getService();
      var tx = service.getTransactionById(txId);
      if (!tx) return;
      var biz = service.getBusinessById(tx.businessId) || service.getBusinesses()[0];
      var currSym = biz?.currencySymbol || '₹';

      var existing = document.getElementById('bizInvoiceModal');
      if (existing) existing.remove();

      var html = `
        <div id="bizInvoiceModal" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;">
          <div style="background:#fff;color:#0f172a;border-radius:16px;max-width:620px;width:100%;max-height:90vh;overflow-y:auto;padding:28px;box-shadow:0 25px 50px rgba(0,0,0,0.5);font-family:Inter,sans-serif;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #e2e8f0;padding-bottom:16px;margin-bottom:16px;">
              <div>
                <div style="font-size:22px;font-weight:800;color:#0f172a;">` + _esc(biz ? biz.name : 'LedgerMate Enterprise') + `</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">` + (biz?.regNumber ? 'GSTIN/Reg: ' + _esc(biz.regNumber) : 'Official Business Receipt') + `</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:18px;font-weight:800;color:#0f172a;">INVOICE</div>
                <div style="font-size:12px;color:#64748b;">#` + _esc(tx.invoiceNumber || 'INV-' + tx.date.replace(/-/g,'')) + `</div>
                <div style="font-size:12px;color:#64748b;">Date: ` + tx.date + `</div>
              </div>
            </div>

            <!-- Billed to -->
            <div style="margin-bottom:20px;">
              <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Billed To</div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;">` + _esc(tx.partyName) + `</div>
            </div>

            <!-- Line Item Table -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <thead>
                <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;text-align:left;">
                  <th style="padding:8px 10px;font-size:11px;color:#64748b;">Description / Category</th>
                  <th style="padding:8px 10px;font-size:11px;color:#64748b;text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 10px;font-size:13px;font-weight:600;">
                    ` + _esc(tx.category) + `
                    ` + (tx.notes ? '<div style="font-size:11px;color:#64748b;font-weight:400;margin-top:2px;">' + _esc(tx.notes) + '</div>' : '') + `
                  </td>
                  <td style="padding:12px 10px;font-size:13px;font-weight:700;text-align:right;">` + _fmtCurr(tx.amount, currSym) + `</td>
                </tr>
              </tbody>
            </table>

            <!-- Total -->
            <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
              <div style="width:220px;border-top:2px solid #0f172a;padding-top:8px;">
                <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;">
                  <span>Total Due:</span>
                  <span>` + _fmtCurr(tx.amount, currSym) + `</span>
                </div>
                <div style="font-size:11px;color:#10b981;font-weight:600;text-align:right;margin-top:4px;">
                  Status: ` + tx.paymentStatus.toUpperCase() + `
                </div>
              </div>
            </div>

            <!-- Bank / Payment details -->
            ` + (biz?.bankDetails?.accountNumber ? `
              <div style="background:#f8fafc;padding:12px;border-radius:10px;font-size:11.5px;color:#475569;margin-bottom:20px;">
                <strong>Payment Details:</strong> Bank: ` + _esc(biz.bankDetails.bankName) + ` · A/C: ` + _esc(biz.bankDetails.accountNumber) + ` · IFSC: ` + _esc(biz.bankDetails.ifsc) + ` ` + (biz.bankDetails.upiId ? '· UPI: ' + _esc(biz.bankDetails.upiId) : '') + `
              </div>
            ` : '') + `

            <!-- Print button -->
            <div style="display:flex;justify-content:flex-end;gap:8px;">
              <button onclick="window.print()" style="padding:8px 16px;background:#0f172a;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">🖨️ Print / Save PDF</button>
              <button onclick="document.getElementById('bizInvoiceModal').remove()" style="padding:8px 16px;background:#e2e8f0;color:#0f172a;border:none;border-radius:8px;font-size:12px;cursor:pointer;">Close</button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
    }
  };

  window.LM_BusinessUI = BusinessUI;
})();
