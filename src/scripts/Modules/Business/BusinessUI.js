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
  var _busSubscribed = false;

  // Restore remembered tab from session storage if available
  try {
    var savedTab = sessionStorage.getItem('lm_biz_active_tab');
    if (savedTab && ['ledger', 'parties', 'analytics', 'settings'].indexOf(savedTab) !== -1) {
      _activeTab = savedTab;
    }
  } catch (e) {}

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

  function _formatLocalDate(d) {
    if (!d) return '';
    var dt = (d instanceof Date) ? d : new Date(d);
    if (isNaN(dt.getTime())) return '';
    var yr = dt.getFullYear();
    var mo = String(dt.getMonth() + 1).padStart(2, '0');
    var da = String(dt.getDate()).padStart(2, '0');
    return yr + '-' + mo + '-' + da;
  }

  function _getTodayLocalDate() {
    return _formatLocalDate(new Date());
  }

  function _getDateRange(filterKey) {
    var now = new Date();
    var yr = now.getFullYear();
    var mo = now.getMonth();

    if (filterKey === 'month') {
      var dFrom = _formatLocalDate(new Date(yr, mo, 1));
      var dTo = _formatLocalDate(new Date(yr, mo + 1, 0));
      return { dateFrom: dFrom, dateTo: dTo, label: 'This Month' };
    }
    if (filterKey === 'last_month') {
      var lmFrom = _formatLocalDate(new Date(yr, mo - 1, 1));
      var lmTo = _formatLocalDate(new Date(yr, mo, 0));
      return { dateFrom: lmFrom, dateTo: lmTo, label: 'Last Month' };
    }
    if (filterKey === 'quarter') {
      var qStartMo = Math.floor(mo / 3) * 3;
      var qFrom = _formatLocalDate(new Date(yr, qStartMo, 1));
      var qTo = _formatLocalDate(new Date(yr, qStartMo + 3, 0));
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
      var self = this;
      var service = _getService();
      if (service && typeof service.init === 'function') {
        await service.init();
      }

      // Check active tab from session
      try {
        var sTab = sessionStorage.getItem('lm_biz_active_tab');
        if (sTab && ['ledger', 'parties', 'analytics', 'settings'].indexOf(sTab) !== -1) {
          _activeTab = sTab;
        }
      } catch (e) {}

      if (!_busSubscribed && window.LM_Bus) {
        _busSubscribed = true;
        window.LM_Bus.on('lm:data:changed', function (ev) {
          if (!ev || ev.source === 'businesses' || ev.source === 'business_transactions' || ev.source === 'business_restore' || ev.store === 'businesses' || ev.store === 'business_transactions') {
            var el = document.getElementById('page-business');
            if (el && el.style.display !== 'none') {
              self.render();
            }
          }
        });
        window.LM_Bus.on('lm:cloud:synced', function () {
          if (service && typeof service.init === 'function') {
            service.init().then(function () {
              var el = document.getElementById('page-business');
              if (el && el.style.display !== 'none') self.render();
            });
          }
        });
        window.LM_Bus.on('lm:import:complete', function () {
          if (service && typeof service.init === 'function') {
            service.init().then(function () {
              var el = document.getElementById('page-business');
              if (el && el.style.display !== 'none') self.render();
            });
          }
        });
        window.LM_Bus.on('lm:business:active_changed', function (ev) {
          if (ev && ev.businessId) _activeBusinessId = ev.businessId;
          var el = document.getElementById('page-business');
          if (el && el.style.display !== 'none') self.render();
        });
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
      try {
        sessionStorage.setItem('lm_biz_active_tab', tab);
      } catch (e) {}
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
     * Send instant WhatsApp reminder with pre-filled ledger balance & UPI
     */
    sendWhatsAppReminder: function (partyName) {
      var service = _getService();
      if (!service) return;
      var text = service.generatePartyWhatsAppReminder(partyName, _activeBusinessId);
      var url = 'https://wa.me/?text=' + encodeURIComponent(text);
      window.open(url, '_blank');
      if (typeof showToast === 'function') {
        showToast('📱 WhatsApp reminder launched!', 'success');
      }
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
        ? { id: 'all', name: 'All Businesses (Consolidated)', currencySymbol: '₹', icon: '🌐', color: '#3b82f6', category: 'Consolidated Portfolio' }
        : (service.getBusinessById(_activeBusinessId) || businesses[0]);

      var currSym = activeBiz.currencySymbol || '₹';
      var dateRange = _getDateRange(_dateFilter);
      var metrics = service.getMetrics(_activeBusinessId, dateRange);

      var html = `
        <div class="biz-container">
          <!-- ── TOP COMMAND HEADER & BUSINESS SELECTOR ── -->
          <div class="biz-header">
            <div class="biz-header-left">
              <div class="biz-avatar">` + (activeBiz.icon || '🏢') + `</div>
              <div class="biz-header-titles">
                <h1 class="biz-title">` + _esc(activeBiz.name) + `</h1>
                <div class="biz-subtitle">
                  ` + (activeBiz.tagline ? _esc(activeBiz.tagline) + ' · ' : '') + `
                  ` + (activeBiz.category ? _esc(activeBiz.category) + ' · ' : '') + `Enterprise Accounting Vault
                </div>
              </div>
            </div>

            <!-- Action buttons & business switcher -->
            <div class="biz-header-actions">
              <select id="bizSelectDropdown" class="biz-select-dropdown" onchange="window.LM_BusinessUI.setActiveBusiness(this.value)">
                ` + businesses.map(function (b) {
                  return '<option value="' + b.id + '"' + (b.id === _activeBusinessId ? ' selected' : '') + '>' + (b.icon || '🏢') + ' ' + _esc(b.name) + '</option>';
                }).join('') + `
                <option value="all"` + (_activeBusinessId === 'all' ? ' selected' : '') + `>🌐 All Businesses (Consolidated)</option>
              </select>

              <div class="biz-quick-actions-bar">
                <button class="biz-btn biz-btn-credit" onclick="window.LM_BusinessUI.openTxModal(null, 'credit')" title="Record revenue / customer credit">
                  <span>＋</span> Credit
                </button>
                <button class="biz-btn biz-btn-debit" onclick="window.LM_BusinessUI.openTxModal(null, 'debit')" title="Record expense / vendor debit">
                  <span>－</span> Debit
                </button>
                <button class="biz-btn biz-btn-charge" onclick="window.LM_BusinessUI.openTxModal(null, 'charge')" title="Log payment fee or tax charge">
                  <span>⚡</span> Charge
                </button>
                <button class="biz-btn biz-btn-secondary" onclick="window.LM_BusinessUI.openBusinessModal()" title="Add new business profile">
                  <span>🏢</span> + New
                </button>
              </div>
            </div>
          </div>

          <!-- ── DATE FILTER PILL TABS ── -->
          <div class="biz-date-strip">
            <div class="biz-date-pills-group">
              ` + [
                { k: 'month', label: 'This Month' },
                { k: 'last_month', label: 'Last Month' },
                { k: 'quarter', label: 'This Quarter' },
                { k: 'year', label: 'Financial Year' },
                { k: 'all', label: 'All Time' }
              ].map(function (tab) {
                var isAct = _dateFilter === tab.k;
                return '<button class="biz-date-pill' + (isAct ? ' active' : '') + '" onclick="window.LM_BusinessUI.setDateFilter(\'' + tab.k + '\')">' + tab.label + '</button>';
              }).join('') + `
            </div>

            <div class="biz-date-label">
              Range: <strong style="color:var(--text,#f8fafc);">` + _esc(dateRange.label) + `</strong> (` + metrics.transactionCount + ` transactions)
            </div>
          </div>

          <!-- ── EXECUTIVE METRIC CARDS (P&L SNAPSHOT) ── -->
          <div class="biz-kpi-grid">
            <!-- 1. Gross Revenue / Credits -->
            <div class="biz-kpi-card credit">
              <div class="biz-kpi-top">
                <span class="biz-kpi-title">Gross Revenue (Credits)</span>
                <span>🟢</span>
              </div>
              <div class="biz-kpi-val">` + _fmtCurr(metrics.totalCredits, currSym) + `</div>
              <div class="biz-kpi-sub">
                <span>Received: <strong style="color:var(--biz-teal,#00d4b4);">` + _fmtCurr(metrics.paidCredits, currSym) + `</strong></span>
                <span>Due: <strong style="color:var(--biz-amber,#fbbf24);">` + _fmtCurr(metrics.pendingCredits, currSym) + `</strong></span>
              </div>
            </div>

            <!-- 2. Operating Expenses / Debits -->
            <div class="biz-kpi-card debit">
              <div class="biz-kpi-top">
                <span class="biz-kpi-title">Operating Costs (Debits)</span>
                <span>🔴</span>
              </div>
              <div class="biz-kpi-val">` + _fmtCurr(metrics.totalDebits, currSym) + `</div>
              <div class="biz-kpi-sub">
                <span>Settled: <strong style="color:var(--biz-rose,#fb7185);">` + _fmtCurr(metrics.paidDebits, currSym) + `</strong></span>
                <span>Unpaid: <strong style="color:var(--biz-amber,#fbbf24);">` + _fmtCurr(metrics.pendingDebits, currSym) + `</strong></span>
              </div>
            </div>

            <!-- 3. Platform Fees & Taxes / Charges -->
            <div class="biz-kpi-card charge">
              <div class="biz-kpi-top">
                <span class="biz-kpi-title">Fees &amp; Taxes (Charges)</span>
                <span>🟡</span>
              </div>
              <div class="biz-kpi-val">` + _fmtCurr(metrics.totalCharges, currSym) + `</div>
              <div class="biz-kpi-sub">
                <span>Gateway cuts, wire fees &amp; GST</span>
              </div>
            </div>

            <!-- 4. Bottom Line Net Profit & Margin -->
            <div class="biz-kpi-card profit` + (metrics.netProfit < 0 ? ' loss' : '') + `">
              <div class="biz-kpi-top">
                <span class="biz-kpi-title" style="color:` + (metrics.netProfit >= 0 ? 'var(--biz-teal,#00d4b4)' : 'var(--biz-rose,#fb7185)') + `;">Bottom Line Net Profit</span>
                <span style="font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:` + (metrics.profitMargin >= 20 ? 'rgba(0,212,180,0.15)' : 'rgba(245,158,11,0.15)') + `;color:` + (metrics.profitMargin >= 20 ? 'var(--biz-teal,#00d4b4)' : 'var(--biz-amber,#fbbf24)') + `;">` + metrics.profitMargin + `% Margin</span>
              </div>
              <div class="biz-kpi-val" style="color:` + (metrics.netProfit >= 0 ? 'var(--biz-teal,#00d4b4)' : 'var(--biz-rose,#fb7185)') + `;">` + _fmtCurr(metrics.netProfit, currSym) + `</div>
              <div class="biz-kpi-sub">
                <span>Net Cash Inflow: ` + _fmtCurr(metrics.netCashFlow, currSym) + `</span>
              </div>
            </div>

            <!-- 5. Pending Receivables vs Payables (Khata Position) -->
            <div class="biz-kpi-card khata">
              <div class="biz-kpi-top">
                <span class="biz-kpi-title">Khata Dues Balance</span>
                <span>⏳</span>
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-top:2px;">
                <div>
                  <div style="font-size:11px;color:var(--text3,#94a3b8);">You'll Get (Clients)</div>
                  <div style="font-size:15.5px;font-weight:800;color:var(--biz-teal,#00d4b4);">` + _fmtCurr(metrics.pendingCredits, currSym) + `</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:11px;color:var(--text3,#94a3b8);">You'll Give (Vendors)</div>
                  <div style="font-size:15.5px;font-weight:800;color:var(--biz-rose,#fb7185);">` + _fmtCurr(metrics.pendingDebits, currSym) + `</div>
                </div>
              </div>
              <div class="biz-kpi-sub">
                ` + ((metrics.overdueReceivablesCount > 0 || metrics.overduePayablesCount > 0) ? `
                  <span style="color:var(--biz-amber,#fbbf24);font-weight:600;">⚠️ ` + metrics.overdueReceivablesCount + ` overdue invoice(s)</span>
                ` : `
                  <span>All payments current on schedule</span>
                `) + `
              </div>
            </div>
          </div>

          <!-- ── SUB-TABS NAVIGATION ── -->
          <div class="biz-tabs-bar">
            ` + [
              { k: 'ledger', icon: '📋', label: 'Ledger Timeline' },
              { k: 'parties', icon: '👥', label: 'Party Book (Khata)' },
              { k: 'analytics', icon: '📊', label: 'P&L Analytics' },
              { k: 'settings', icon: '⚙️', label: 'Business Profile' }
            ].map(function (tab) {
              var isAct = _activeTab === tab.k;
              return '<button class="biz-tab-btn' + (isAct ? ' active' : '') + '" onclick="window.LM_BusinessUI.setTab(\'' + tab.k + '\')"><span>' + tab.icon + '</span> ' + tab.label + '</button>';
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
        <div class="biz-container" style="max-width:540px;margin:60px auto;text-align:center;padding:36px 24px;background:var(--surface-glass,rgba(19,24,43,0.7));border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:24px;">
          <div style="font-size:48px;margin-bottom:12px;">🏢</div>
          <h2 style="font-size:22px;font-weight:800;color:var(--text,#f8fafc);margin-bottom:8px;">Welcome to Business Hub</h2>
          <p style="font-size:13px;color:var(--text3,#94a3b8);line-height:1.5;margin-bottom:24px;">
            Manage your businesses, client credits (revenue), vendor debits (expenses), and gateway charges all in one private, zero-knowledge accounting vault.
          </p>
          <button class="biz-btn biz-btn-primary" onclick="window.LM_BusinessUI.openBusinessModal()" style="padding:12px 24px;font-size:13.5px;">
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
        <div class="biz-filters-bar">
          <!-- Type filter pills -->
          <div class="biz-filter-pills">
            ` + [
              { k: 'all', label: 'All Entries' },
              { k: 'credit', label: '🟢 Credits' },
              { k: 'debit', label: '🔴 Debits' },
              { k: 'charge', label: '🟡 Charges' }
            ].map(function (tf) {
              var isAct = _typeFilter === tf.k;
              return '<button class="biz-filter-pill' + (isAct ? ' active' : '') + '" onclick="window.LM_BusinessUI.setTypeFilter(\'' + tf.k + '\')">' + tf.label + '</button>';
            }).join('') + `
          </div>

          <!-- Status filter & Search bar -->
          <div class="biz-filter-controls">
            <select class="biz-select" onchange="window.LM_BusinessUI.setStatusFilter(this.value)" style="padding:6px 10px;font-size:11.5px;font-weight:600;">
              <option value="all"` + (_statusFilter === 'all' ? ' selected' : '') + `>Status: All</option>
              <option value="paid"` + (_statusFilter === 'paid' ? ' selected' : '') + `>Status: Paid / Settled</option>
              <option value="pending"` + (_statusFilter === 'pending' ? ' selected' : '') + `>Status: Pending / Due</option>
              <option value="overdue"` + (_statusFilter === 'overdue' ? ' selected' : '') + `>Status: Overdue</option>
            </select>

            <input type="text" class="biz-search-input" placeholder="Search parties, ref #…" value="` + _esc(_searchQuery) + `"
              oninput="window.LM_BusinessUI.setSearch(this.value)" />
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
              <button class="biz-btn biz-btn-credit" onclick="window.LM_BusinessUI.openTxModal(null, 'credit')">+ Credit</button>
              <button class="biz-btn biz-btn-debit" onclick="window.LM_BusinessUI.openTxModal(null, 'debit')">+ Debit</button>
            </div>
          </div>
        `;
      }

      var rowsHtml = txs.map(function (t) {
        var isCredit = t.type === 'credit';
        var isDebit = t.type === 'debit';

        var typeBadgeClass = isCredit ? 'credit' : (isDebit ? 'debit' : 'charge');
        var typeBadgeText = isCredit ? 'Credit' : (isDebit ? 'Debit' : 'Charge');

        var statusClass = t.paymentStatus === 'paid' ? 'paid' : (t.paymentStatus === 'partial' ? 'partial' : 'pending');
        var statusText = t.paymentStatus === 'paid'
          ? '✅ Paid'
          : (t.paymentStatus === 'partial'
              ? '⏳ Partial (' + _fmtCurr(t.paidAmount, currSym) + ')'
              : '⚠️ Pending' + (t.dueDate ? ' (Due ' + t.dueDate + ')' : ''));

        var amountClass = isCredit ? 'credit' : (isDebit ? 'debit' : 'charge');
        var amountSign = isCredit ? '+' : '-';

        return `
          <div class="biz-tx-card">
            <div class="biz-tx-main">
              <span class="biz-tx-badge ` + typeBadgeClass + `">` + typeBadgeText + `</span>
              <div class="biz-tx-details">
                <div class="biz-tx-title">
                  ` + _esc(t.partyName) + `
                  ` + (t.invoiceNumber ? '<span class="biz-tx-ref">#' + _esc(t.invoiceNumber) + '</span>' : '') + `
                </div>
                <div class="biz-tx-meta">
                  ` + _esc(t.category) + ` · ` + t.date + ` ` + (t.paymentMode ? '· ' + _esc(t.paymentMode) : '') + `
                </div>
              </div>
            </div>

            <!-- Amount & Status -->
            <div class="biz-tx-amount-col">
              <div class="biz-tx-amount ` + amountClass + `">
                ` + amountSign + ` ` + _fmtCurr(t.amount, currSym) + `
              </div>
              <div class="biz-tx-status ` + statusClass + `">` + statusText + `</div>
            </div>

            <!-- Action buttons -->
            <div class="biz-tx-actions">
              ` + (t.paymentStatus !== 'paid' ? `
                <button class="biz-btn biz-btn-credit" onclick="window.LM_BusinessUI.markAsPaid('` + t.id + `')" title="Mark as Fully Paid" style="padding:4px 9px;font-size:11px;">
                  Mark Paid
                </button>
              ` : '') + `

              ` + (isCredit ? `
                <button class="biz-icon-btn" onclick="window.LM_BusinessUI.openInvoiceModal('` + t.id + `')" title="Generate Invoice / Receipt">
                  📄
                </button>
              ` : '') + `

              <button class="biz-icon-btn" onclick="window.LM_BusinessUI.openTxModal('` + t.id + `')" title="Edit Entry">
                ✏️
              </button>

              <button class="biz-icon-btn delete" onclick="window.LM_BusinessUI.deleteTx('` + t.id + `')" title="Delete Entry">
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

        var balanceClass = isReceivable ? 'receivable' : (isPayable ? 'payable' : 'settled');
        var balanceLabel = isReceivable
          ? 'You\'ll Get: ' + _fmtCurr(p.netReceivable, currSym)
          : (isPayable
              ? 'You\'ll Give: ' + _fmtCurr(Math.abs(p.netReceivable), currSym)
              : 'Settled Balance (₹0)');

        return `
          <div class="biz-party-card">
            <div>
              <div class="biz-party-header">
                <span class="biz-party-name">` + _esc(p.name) + `</span>
                <span class="biz-party-type-badge">` + (p.partyType || 'customer') + `</span>
              </div>
              <div class="biz-party-stats">
                Total Billed: ` + _fmtCurr(p.totalBilled, currSym) + ` · Total Spent: ` + _fmtCurr(p.totalSpent, currSym) + `
              </div>
              <div class="biz-party-balance ` + balanceClass + `">
                ` + balanceLabel + `
              </div>
            </div>
            <div class="biz-party-footer">
              <span style="font-size:11px;color:var(--text3,#94a3b8);">` + p.txCount + ` entry(ies)</span>
              <div style="display:flex;align-items:center;gap:6px;">
                ` + (isReceivable ? `
                  <button class="biz-btn" onclick="window.LM_BusinessUI.sendWhatsAppReminder('` + _esc(p.name) + `')"
                    style="padding:4px 8px;background:#25d366;color:#fff;border-radius:7px;font-size:11px;font-weight:700;" title="Send 1-Click WhatsApp payment reminder with UPI">
                    💬 WhatsApp
                  </button>
                ` : '') + `
                <button class="biz-btn biz-btn-secondary" onclick="window.LM_BusinessUI.openPartyStatementModal('` + _esc(p.name) + `')" style="padding:4px 9px;font-size:11.5px;">
                  Statement 📋
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="biz-party-grid">
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
            <div style="font-size:11px;color:var(--text3,#94a3b8);margin-bottom:14px;">Where capital is deployed across vendors &amp; categories</div>
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

    // ── TAB 4: COMPLETE ENTERPRISE BUSINESS SETTINGS ────────
    renderSettingsTab: function (activeBiz) {
      if (activeBiz.id === 'all') {
        return '<div style="padding:24px;text-align:center;color:var(--text3,#94a3b8);">Please select an individual business profile from the top dropdown to view its settings.</div>';
      }

      var bank = activeBiz.bankDetails || {};

      return `
        <div style="max-width:760px;margin:0 auto;background:var(--surface-glass,rgba(19,24,43,0.7));border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:18px;padding:22px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px;">
            <div>
              <div style="font-size:16px;font-weight:800;color:var(--text,#f8fafc);">` + _esc(activeBiz.name) + ` Enterprise Profile</div>
              <div style="font-size:11.5px;color:var(--text3,#94a3b8);">Identity, contact details, tax identifiers, and official bank credentials</div>
            </div>
            <button class="biz-btn biz-icon-btn delete" onclick="window.LM_BusinessUI.deleteBusiness('` + activeBiz.id + `')" style="width:auto;padding:6px 12px;font-size:11.5px;font-weight:600;">
              🗑️ Delete Profile
            </button>
          </div>

          <form id="bizSettingsForm" onsubmit="event.preventDefault(); window.LM_BusinessUI.handleSaveBizSettings('` + activeBiz.id + `');" class="biz-form-grid">
            
            <!-- SECTION 1: IDENTITY & BRANDING -->
            <div class="biz-form-group full" style="border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;margin-top:4px;">
              <span style="font-size:12px;font-weight:700;color:var(--biz-teal,#00d4b4);text-transform:uppercase;letter-spacing:0.5px;">🏢 Identity &amp; Branding</span>
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Business / Entity Name *</label>
              <input type="text" id="setBizName" class="biz-input" value="` + _esc(activeBiz.name) + `" required />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Tagline / Industry Subtitle</label>
              <input type="text" id="setBizTagline" class="biz-input" value="` + _esc(activeBiz.tagline || '') + `" placeholder="e.g. Premium Software Consulting" />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Business Category</label>
              <input type="text" id="setBizCategory" class="biz-input" value="` + _esc(activeBiz.category || 'Services') + `" placeholder="Services, Retail, Tech…" />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Currency Symbol</label>
              <input type="text" id="setBizCurr" class="biz-input" value="` + _esc(activeBiz.currencySymbol || '₹') + `" placeholder="₹, $, €" />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Icon / Emoji</label>
              <input type="text" id="setBizIcon" class="biz-input" value="` + _esc(activeBiz.icon || '🏢') + `" placeholder="🏢, 💻, 🛍️" />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Brand Accent Color</label>
              <input type="color" id="setBizColor" class="biz-input" value="` + _esc(activeBiz.color || '#00d4b4') + `" style="height:38px;padding:2px 4px;cursor:pointer;" />
            </div>

            <!-- SECTION 2: OFFICIAL REGISTRATION & CONTACT -->
            <div class="biz-form-group full" style="border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;margin-top:10px;">
              <span style="font-size:12px;font-weight:700;color:var(--biz-teal,#00d4b4);text-transform:uppercase;letter-spacing:0.5px;">📑 Registration &amp; Official Contact</span>
            </div>

            <div class="biz-form-group">
              <label class="biz-label">GSTIN / Reg Number</label>
              <input type="text" id="setBizReg" class="biz-input" value="` + _esc(activeBiz.regNumber || '') + `" placeholder="29ABCDE1234F1Z5" />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Official Email</label>
              <input type="email" id="setBizEmail" class="biz-input" value="` + _esc(activeBiz.email || '') + `" placeholder="billing@enterprise.com" />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Official Phone</label>
              <input type="tel" id="setBizPhone" class="biz-input" value="` + _esc(activeBiz.phone || '') + `" placeholder="+91 98765 43210" />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Registered Office Address</label>
              <input type="text" id="setBizAddress" class="biz-input" value="` + _esc(activeBiz.address || '') + `" placeholder="Suite 400, Tech Park, City" />
            </div>

            <!-- SECTION 3: BANKING & UPI SETTLEMENT (FOR INVOICES) -->
            <div class="biz-form-group full" style="border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;margin-top:10px;">
              <span style="font-size:12px;font-weight:700;color:var(--biz-teal,#00d4b4);text-transform:uppercase;letter-spacing:0.5px;">💳 Banking &amp; UPI Settlement Credentials</span>
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Bank Name</label>
              <input type="text" id="setBizBank" class="biz-input" value="` + _esc(bank.bankName || '') + `" placeholder="HDFC Bank" />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Account Holder Name</label>
              <input type="text" id="setBizHolder" class="biz-input" value="` + _esc(bank.holderName || '') + `" placeholder="Full registered account name" />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">Account Number</label>
              <input type="text" id="setBizAcc" class="biz-input" value="` + _esc(bank.accountNumber || '') + `" placeholder="123456789012" />
            </div>

            <div class="biz-form-group">
              <label class="biz-label">IFSC Code</label>
              <input type="text" id="setBizIfsc" class="biz-input" value="` + _esc(bank.ifsc || '') + `" placeholder="HDFC0001234" />
            </div>

            <div class="biz-form-group full">
              <label class="biz-label">UPI ID for Invoices &amp; QR Payments</label>
              <input type="text" id="setBizUpi" class="biz-input" value="` + _esc(bank.upiId || '') + `" placeholder="enterprise@okaxis" />
            </div>

            <div class="biz-form-actions">
              <button type="submit" class="biz-btn biz-btn-primary" style="padding:10px 24px;font-size:13px;">
                💾 Save Business Profile
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

      var name = (document.getElementById('setBizName')?.value || '').trim();
      if (!name) {
        if (typeof showToast === 'function') showToast('⚠️ Business name cannot be empty', 'warning');
        return;
      }

      current.name = name;
      current.tagline = (document.getElementById('setBizTagline')?.value || '').trim();
      current.category = (document.getElementById('setBizCategory')?.value || 'Services').trim();
      current.currencySymbol = (document.getElementById('setBizCurr')?.value || '₹').trim() || '₹';
      current.icon = (document.getElementById('setBizIcon')?.value || '🏢').trim() || '🏢';
      current.color = (document.getElementById('setBizColor')?.value || '#00d4b4').trim();

      current.regNumber = (document.getElementById('setBizReg')?.value || '').trim();
      current.email = (document.getElementById('setBizEmail')?.value || '').trim();
      current.phone = (document.getElementById('setBizPhone')?.value || '').trim();
      current.address = (document.getElementById('setBizAddress')?.value || '').trim();

      current.bankDetails = {
        bankName: (document.getElementById('setBizBank')?.value || '').trim(),
        holderName: (document.getElementById('setBizHolder')?.value || '').trim(),
        accountNumber: (document.getElementById('setBizAcc')?.value || '').trim(),
        ifsc: (document.getElementById('setBizIfsc')?.value || '').trim(),
        upiId: (document.getElementById('setBizUpi')?.value || '').trim()
      };

      await service.saveBusiness(current);
      if (typeof showToast === 'function') showToast('✅ Business profile updated and synced!', 'success');
      this.render();
    },

    deleteBusiness: async function (bizId) {
      if (!confirm('Are you sure you want to delete this business and all its entries? This cannot be undone.')) return;
      var service = _getService();
      if (!service) return;
      await service.deleteBusiness(bizId);
      _activeBusinessId = null;
      if (typeof showToast === 'function') showToast('🗑️ Business profile deleted.', 'info');
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
      if (!service) return;
      var businesses = service.getBusinesses();
      if (!businesses || businesses.length === 0) {
        if (typeof showToast === 'function') showToast('🏢 Please create a business profile first!', 'info');
        this.openBusinessModal();
        return;
      }

      var tx = txId ? service.getTransactionById(txId) : null;
      var type = tx ? tx.type : (prefillType || 'credit');

      var existingModal = document.getElementById('bizTxModal');
      if (existingModal) existingModal.remove();

      var categories = service.DEFAULT_CATEGORIES[type] || [];
      var targetBizId = tx ? tx.businessId : (_activeBusinessId === 'all' ? businesses[0].id : (_activeBusinessId || businesses[0].id));

      // Retrieve all known parties for easy datalist autocompletion
      var existingParties = service.getAllParties(targetBizId);

      var modalHtml = `
        <div id="bizTxModal" class="biz-modal-overlay">
          <div class="biz-modal">
            <div class="biz-modal-header">
              <h3 class="biz-modal-title">
                ` + (tx ? 'Edit Transaction' : 'Record Business Entry') + `
              </h3>
              <button class="biz-modal-close" onclick="document.getElementById('bizTxModal').remove()">✕</button>
            </div>

            <!-- Type Selector Tabs -->
            <div style="display:flex;gap:6px;background:rgba(0,0,0,0.25);padding:3px;border-radius:10px;margin-bottom:16px;">
              <button type="button" onclick="window.LM_BusinessUI.updateTxModalType('credit')" id="btnTypeCredit"
                style="flex:1;padding:7px;border-radius:8px;border:none;background:` + (type === 'credit' ? 'rgba(0,212,180,0.2)' : 'transparent') + `;color:` + (type === 'credit' ? 'var(--biz-teal,#00d4b4)' : 'var(--text3,#94a3b8)') + `;font-size:12px;font-weight:700;cursor:pointer;">
                🟢 Credit (Inflow)
              </button>
              <button type="button" onclick="window.LM_BusinessUI.updateTxModalType('debit')" id="btnTypeDebit"
                style="flex:1;padding:7px;border-radius:8px;border:none;background:` + (type === 'debit' ? 'rgba(244,63,94,0.2)' : 'transparent') + `;color:` + (type === 'debit' ? 'var(--biz-rose,#fb7185)' : 'var(--text3,#94a3b8)') + `;font-size:12px;font-weight:700;cursor:pointer;">
                🔴 Debit (Outflow)
              </button>
              <button type="button" onclick="window.LM_BusinessUI.updateTxModalType('charge')" id="btnTypeCharge"
                style="flex:1;padding:7px;border-radius:8px;border:none;background:` + (type === 'charge' ? 'rgba(245,158,11,0.2)' : 'transparent') + `;color:` + (type === 'charge' ? 'var(--biz-amber,#fbbf24)' : 'var(--text3,#94a3b8)') + `;font-size:12px;font-weight:700;cursor:pointer;">
                🟡 Charge (Fee/Tax)
              </button>
            </div>

            <form id="bizTxForm" onsubmit="event.preventDefault(); window.LM_BusinessUI.saveTxForm('` + (tx ? tx.id : '') + `');" class="biz-form-grid">
              <input type="hidden" id="txModalType" value="` + type + `" />

              <div class="biz-form-group full">
                <label class="biz-label">Business Entity</label>
                <select id="txBizId" class="biz-select">
                  ` + businesses.map(function (b) {
                    var sel = b.id === targetBizId;
                    return '<option value="' + b.id + '"' + (sel ? ' selected' : '') + '>' + (b.icon || '🏢') + ' ' + _esc(b.name) + '</option>';
                  }).join('') + `
                </select>
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Amount *</label>
                <input type="number" step="any" id="txAmount" class="biz-input" value="` + (tx ? tx.amount : '') + `" placeholder="0.00" required style="font-weight:700;" />
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Gateway / Wire Fee (optional)</label>
                <input type="number" step="any" id="txCharge" class="biz-input" value="` + (tx ? (tx.chargeAmount || '') : '') + `" placeholder="e.g. 250" />
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Client / Vendor Name *</label>
                <input type="text" list="bizPartyDatalist" id="txPartyName" class="biz-input" value="` + (tx ? _esc(tx.partyName) : '') + `" placeholder="Client or Vendor Name" required />
                <datalist id="bizPartyDatalist">
                  ` + existingParties.map(function (p) { return '<option value="' + _esc(p.name) + '">'; }).join('') + `
                </datalist>
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Category</label>
                <select id="txCategory" class="biz-select">
                  ` + categories.map(function (c) {
                    var sel = tx && tx.category === c;
                    return '<option value="' + c + '"' + (sel ? ' selected' : '') + '>' + c + '</option>';
                  }).join('') + `
                </select>
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Date *</label>
                <input type="date" id="txDate" class="biz-input" value="` + (tx ? tx.date : _getTodayLocalDate()) + `" required />
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Payment Status</label>
                <select id="txStatus" class="biz-select">
                  <option value="paid"` + (!tx || tx.paymentStatus === 'paid' ? ' selected' : '') + `>✅ Paid / Settled</option>
                  <option value="pending"` + (tx && tx.paymentStatus === 'pending' ? ' selected' : '') + `>⏳ Pending / Unpaid</option>
                  <option value="partial"` + (tx && tx.paymentStatus === 'partial' ? ' selected' : '') + `>⏳ Partial Payment</option>
                </select>
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Invoice / Reference # (optional)</label>
                <input type="text" id="txInvoice" class="biz-input" value="` + (tx ? _esc(tx.invoiceNumber) : '') + `" placeholder="INV-2026-001" />
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Due Date (for pending dues)</label>
                <input type="date" id="txDueDate" class="biz-input" value="` + (tx ? (tx.dueDate || '') : '') + `" />
              </div>

              <div class="biz-form-group full">
                <label class="biz-label">Payment Mode</label>
                <select id="txPaymentMode" class="biz-select">
                  <option value="Bank Transfer"` + (tx && tx.paymentMode === 'Bank Transfer' ? ' selected' : '') + `>Bank Transfer / NEFT / RTGS</option>
                  <option value="UPI"` + (tx && tx.paymentMode === 'UPI' ? ' selected' : '') + `>UPI / QR</option>
                  <option value="Credit Card"` + (tx && tx.paymentMode === 'Credit Card' ? ' selected' : '') + `>Credit Card</option>
                  <option value="Cash"` + (tx && tx.paymentMode === 'Cash' ? ' selected' : '') + `>Cash</option>
                  <option value="Cheque"` + (tx && tx.paymentMode === 'Cheque' ? ' selected' : '') + `>Cheque</option>
                  <option value="Payment Gateway"` + (tx && tx.paymentMode === 'Payment Gateway' ? ' selected' : '') + `>Payment Gateway (Razorpay/Stripe)</option>
                </select>
              </div>

              <div class="biz-form-group full">
                <label class="biz-label">Notes &amp; Description</label>
                <textarea id="txNotes" class="biz-textarea" placeholder="Work details, deliverables, milestone notes…">` + (tx ? _esc(tx.notes) : '') + `</textarea>
              </div>

              <div class="biz-form-actions">
                <button type="button" class="biz-btn biz-btn-secondary" onclick="document.getElementById('bizTxModal').remove()">
                  Cancel
                </button>
                <button type="submit" class="biz-btn biz-btn-primary">
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
            ? (type === 'credit' ? 'var(--biz-teal,#00d4b4)' : (type === 'debit' ? 'var(--biz-rose,#fb7185)' : 'var(--biz-amber,#fbbf24)'))
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
      var rawAmount = document.getElementById('txAmount')?.value;
      var amount = parseFloat(rawAmount);
      var rawCharge = document.getElementById('txCharge')?.value;
      var charge = rawCharge ? parseFloat(rawCharge) : 0;
      var partyName = (document.getElementById('txPartyName')?.value || 'General').trim();
      var category = document.getElementById('txCategory')?.value || 'Other';
      var date = document.getElementById('txDate')?.value || _getTodayLocalDate();
      var status = document.getElementById('txStatus')?.value || 'paid';
      var invoice = (document.getElementById('txInvoice')?.value || '').trim();
      var dueDate = document.getElementById('txDueDate')?.value || '';
      var paymentMode = document.getElementById('txPaymentMode')?.value || 'Bank Transfer';
      var notes = (document.getElementById('txNotes')?.value || '').trim();
      var bizId = document.getElementById('txBizId')?.value || service.getActiveBusinessId();

      if (isNaN(amount) || amount <= 0) {
        if (typeof showToast === 'function') showToast('⚠️ Please enter a valid positive amount (> 0)', 'warning');
        return;
      }
      if (isNaN(charge) || charge < 0) {
        charge = 0;
      }
      if (!partyName) {
        partyName = 'General';
      }
      if (!bizId) {
        if (typeof showToast === 'function') showToast('⚠️ Please select or create a business profile first', 'warning');
        return;
      }

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
      var bank = (biz && biz.bankDetails) ? biz.bankDetails : {};

      var existing = document.getElementById('bizEntityModal');
      if (existing) existing.remove();

      var html = `
        <div id="bizEntityModal" class="biz-modal-overlay">
          <div class="biz-modal">
            <div class="biz-modal-header">
              <h3 class="biz-modal-title">
                ` + (biz ? 'Edit Business Profile' : 'New Business Profile') + `
              </h3>
              <button class="biz-modal-close" onclick="document.getElementById('bizEntityModal').remove()">✕</button>
            </div>

            <form onsubmit="event.preventDefault(); window.LM_BusinessUI.saveBusinessForm('` + (biz ? biz.id : '') + `');" class="biz-form-grid">
              <div class="biz-form-group full">
                <label class="biz-label">Business / Entity Name *</label>
                <input type="text" id="modalBizName" class="biz-input" value="` + (biz ? _esc(biz.name) : '') + `" placeholder="e.g. Apex Tech Enterprises" required />
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Tagline / Subtitle</label>
                <input type="text" id="modalBizTagline" class="biz-input" value="` + (biz ? _esc(biz.tagline || '') : '') + `" placeholder="e.g. Cloud Solutions & Consulting" />
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Category</label>
                <input type="text" id="modalBizCategory" class="biz-input" value="` + (biz ? _esc(biz.category || 'Services') : 'Services') + `" placeholder="Services, Agency, Retail" />
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Icon / Emoji</label>
                <input type="text" id="modalBizIcon" class="biz-input" value="` + (biz ? _esc(biz.icon) : '🏢') + `" placeholder="🏢, 💻, 🛍️" />
              </div>

              <div class="biz-form-group">
                <label class="biz-label">Currency Symbol</label>
                <input type="text" id="modalBizCurr" class="biz-input" value="` + (biz ? _esc(biz.currencySymbol) : '₹') + `" placeholder="₹, $, €" />
              </div>

              <div class="biz-form-group">
                <label class="biz-label">GSTIN / Reg Number (optional)</label>
                <input type="text" id="modalBizReg" class="biz-input" value="` + (biz ? _esc(biz.regNumber) : '') + `" placeholder="29ABCDE1234F1Z5" />
              </div>

              <div class="biz-form-group">
                <label class="biz-label">UPI ID for Invoices (optional)</label>
                <input type="text" id="modalBizUpi" class="biz-input" value="` + _esc(bank.upiId || '') + `" placeholder="enterprise@okaxis" />
              </div>

              <div class="biz-form-actions">
                <button type="button" class="biz-btn biz-btn-secondary" onclick="document.getElementById('bizEntityModal').remove()">
                  Cancel
                </button>
                <button type="submit" class="biz-btn biz-btn-primary">
                  Save Profile
                </button>
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

      var name = (document.getElementById('modalBizName')?.value || '').trim();
      if (!name) {
        if (typeof showToast === 'function') showToast('⚠️ Please enter a business name', 'warning');
        return;
      }
      var tagline = (document.getElementById('modalBizTagline')?.value || '').trim();
      var category = (document.getElementById('modalBizCategory')?.value || 'Services').trim();
      var icon = (document.getElementById('modalBizIcon')?.value || '🏢').trim() || '🏢';
      var curr = (document.getElementById('modalBizCurr')?.value || '₹').trim() || '₹';
      var reg = (document.getElementById('modalBizReg')?.value || '').trim();
      var upi = (document.getElementById('modalBizUpi')?.value || '').trim();

      var existing = bizId ? service.getBusinessById(bizId) : {};
      var bankDetails = Object.assign({}, existing?.bankDetails || {});
      if (upi) bankDetails.upiId = upi;

      var saved = await service.saveBusiness({
        id: bizId || undefined,
        name: name,
        tagline: tagline,
        category: category,
        icon: icon,
        currencySymbol: curr,
        regNumber: reg,
        bankDetails: bankDetails
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
        <div id="bizPartyModal" class="biz-modal-overlay">
          <div class="biz-modal" style="max-width:620px;">
            <div class="biz-modal-header">
              <div>
                <h3 class="biz-modal-title">` + _esc(stmt.partyName) + ` Statement</h3>
                <div style="font-size:12px;color:var(--text3,#94a3b8);margin-top:2px;">Complete account history &amp; Khata balances</div>
              </div>
              <button class="biz-modal-close" onclick="document.getElementById('bizPartyModal').remove()">✕</button>
            </div>

            <!-- Balances -->
            <div style="display:flex;gap:12px;background:rgba(0,0,0,0.25);padding:12px;border-radius:12px;margin-bottom:16px;flex-wrap:wrap;">
              <div style="flex:1;min-width:90px;">
                <div style="font-size:11px;color:var(--text3,#94a3b8);">Total Billed</div>
                <div style="font-size:16px;font-weight:800;color:var(--text,#f8fafc);">` + _fmtCurr(stmt.totalCredits, currSym) + `</div>
              </div>
              <div style="flex:1;min-width:90px;">
                <div style="font-size:11px;color:var(--text3,#94a3b8);">Total Expenses</div>
                <div style="font-size:16px;font-weight:800;color:var(--text,#f8fafc);">` + _fmtCurr(stmt.totalDebits, currSym) + `</div>
              </div>
              <div style="flex:1;min-width:90px;">
                <div style="font-size:11px;color:var(--text3,#94a3b8);">Net Outstanding</div>
                <div style="font-size:16px;font-weight:800;color:` + (isReceivable ? 'var(--biz-teal,#00d4b4)' : (isPayable ? 'var(--biz-rose,#fb7185)' : 'var(--text3,#94a3b8)')) + `;">
                  ` + (isReceivable ? 'You\'ll Get ' + _fmtCurr(stmt.netBalance, currSym) : (isPayable ? 'You\'ll Give ' + _fmtCurr(Math.abs(stmt.netBalance), currSym) : 'Settled')) + `
                </div>
              </div>
            </div>

            <!-- Transactions list -->
            <div style="font-size:12px;font-weight:700;color:var(--text3,#94a3b8);margin-bottom:8px;">Ledger Records (` + stmt.transactions.length + `)</div>
            <div style="max-height:220px;overflow-y:auto;margin-bottom:16px;">
              ` + stmt.transactions.map(function (t) {
                var isCred = t.type === 'credit';
                return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px;"><div><span style="font-weight:700;color:var(--text,#f8fafc);">' + t.date + '</span> · ' + _esc(t.category) + '</div><div style="font-weight:800;color:' + (isCred ? 'var(--biz-teal,#00d4b4)' : 'var(--biz-rose,#fb7185)') + ';">' + (isCred ? '+' : '-') + ' ' + _fmtCurr(t.amount, currSym) + '</div></div>';
              }).join('') + `
            </div>

            <!-- Actions -->
            <div class="biz-form-actions">
              ` + (isReceivable ? `
                <button class="biz-btn" onclick="window.LM_BusinessUI.sendWhatsAppReminder('` + _esc(stmt.partyName) + `')"
                  style="padding:8px 14px;background:#25d366;color:#fff;font-size:11.5px;font-weight:700;">
                  💬 Send WhatsApp Reminder
                </button>
              ` : '') + `
              <button class="biz-btn biz-btn-secondary" onclick="document.getElementById('bizPartyModal').remove()">
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
        <div id="bizInvoiceModal" class="biz-modal-overlay">
          <div class="biz-invoice-card">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;border-bottom:2px solid #e2e8f0;padding-bottom:16px;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
              <div>
                <div style="font-size:22px;font-weight:800;color:#0f172a;">` + _esc(biz ? biz.name : 'LedgerMate Enterprise') + `</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">
                  ` + (biz?.regNumber ? 'GSTIN/Reg: ' + _esc(biz.regNumber) : 'Official Business Receipt') + `
                  ` + (biz?.email ? ' · ' + _esc(biz.email) : '') + `
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:18px;font-weight:800;color:#0f172a;">TAX INVOICE</div>
                <div style="font-size:12px;color:#64748b;">#` + _esc(tx.invoiceNumber || 'INV-' + tx.date.replace(/-/g,'')) + `</div>
                <div style="font-size:12px;color:#64748b;">Date: ` + tx.date + `</div>
              </div>
            </div>

            <!-- Billed to -->
            <div style="margin-bottom:20px;">
              <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Billed To</div>
              <div style="font-size:16px;font-weight:700;color:#0f172a;">` + _esc(tx.partyName) + `</div>
            </div>

            <!-- Line Item Table -->
            <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
              <thead>
                <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;text-align:left;">
                  <th style="padding:10px;font-size:11.5px;color:#64748b;">Description / Category</th>
                  <th style="padding:10px;font-size:11.5px;color:#64748b;text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid #f1f5f9;">
                  <td style="padding:12px 10px;font-size:13.5px;font-weight:600;">
                    ` + _esc(tx.category) + `
                    ` + (tx.notes ? '<div style="font-size:11.5px;color:#64748b;font-weight:400;margin-top:3px;">' + _esc(tx.notes) + '</div>' : '') + `
                  </td>
                  <td style="padding:12px 10px;font-size:13.5px;font-weight:700;text-align:right;">` + _fmtCurr(tx.amount, currSym) + `</td>
                </tr>
              </tbody>
            </table>

            <!-- Total -->
            <div style="display:flex;justify-content:flex-end;margin-bottom:24px;">
              <div style="width:240px;border-top:2px solid #0f172a;padding-top:8px;">
                <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:800;">
                  <span>Total Amount:</span>
                  <span>` + _fmtCurr(tx.amount, currSym) + `</span>
                </div>
                <div style="font-size:11.5px;color:#10b981;font-weight:600;text-align:right;margin-top:4px;">
                  Status: ` + tx.paymentStatus.toUpperCase() + `
                </div>
              </div>
            </div>

            <!-- Bank / Payment details -->
            ` + (biz?.bankDetails?.accountNumber ? `
              <div style="background:#f8fafc;padding:12px 14px;border-radius:10px;font-size:11.5px;color:#475569;margin-bottom:20px;">
                <strong>Bank Credentials:</strong> Bank: ` + _esc(biz.bankDetails.bankName) + ` · A/C: ` + _esc(biz.bankDetails.accountNumber) + ` · IFSC: ` + _esc(biz.bankDetails.ifsc) + ` ` + (biz.bankDetails.holderName ? ' · Holder: ' + _esc(biz.bankDetails.holderName) : '') + ` ` + (biz.bankDetails.upiId ? '· UPI: ' + _esc(biz.bankDetails.upiId) : '') + `
              </div>
            ` : '') + `

            <!-- Print button -->
            <div style="display:flex;justify-content:flex-end;gap:10px;">
              <button onclick="window.print()" class="biz-btn" style="background:#0f172a;color:#fff;padding:9px 18px;font-size:12px;font-weight:700;">
                🖨️ Print / Save PDF
              </button>
              <button onclick="document.getElementById('bizInvoiceModal').remove()" class="biz-btn" style="background:#e2e8f0;color:#0f172a;padding:9px 18px;font-size:12px;">
                Close
              </button>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', html);
    }
  };

  window.LM_BusinessUI = BusinessUI;
})();
