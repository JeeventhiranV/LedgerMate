/**
 * LedgerMate – StockPortfolioUI.js
 * ─────────────────────────────────────────────────────────────
 * Complete UI Controller & Renderer for Indian Stock Portfolio.
 * Manages Dashboard KPIs, Holdings Views, Add/Edit Modals,
 * Transaction Ledgers, Detail Views, and Chart Visualizations.
 * Exposes: window.LM_StockPortfolioUI
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _activeTab = 'holdings'; // 'holdings', 'all-stocks', 'transactions', 'analytics'
  var _searchQuery = '';
  var _sectorFilter = 'ALL';
  var _sortField = 'value'; // 'value', 'pl', 'name', 'day_change', 'qty'
  var _sortOrder = 'desc';
  var _txTypeFilter = 'ALL';
  var _txExchangeFilter = 'ALL';

  var _allocationChartInstance = null;
  var _plChartInstance = null;

  function getCalculations() {
    return window.LM_StockCalculations || {
      formatINR: function(v) { return '₹' + Number(v || 0).toFixed(2); },
      formatPercent: function(v) { return Number(v || 0).toFixed(2) + '%'; },
      formatQty: function(v) { return Number(v || 0).toString(); }
    };
  }

  function getService() {
    return window.LM_StockPortfolioService;
  }

  function toast(msg, type) {
    if (window.LMToast && typeof window.LMToast[type || 'info'] === 'function') {
      window.LMToast[type || 'info'](msg);
    } else if (typeof showToast === 'function') {
      showToast(msg, type || 'info');
    } else {
      console.log('[StockUI]', msg);
    }
  }

  /**
   * Main render function for the entire Stocks page
   */
  function render() {
    var container = document.getElementById('page-stocks');
    if (!container) return;

    var service = getService();
    if (!service) {
      container.innerHTML = '<div class="stocks-container"><div class="stocks-empty-state"><p>Loading Stock Portfolio...</p></div></div>';
      return;
    }

    var calc = getCalculations();
    var portfolio = service.getActivePortfolio();
    var allHoldings = service.getHoldingsWithMetrics();
    var summary = service.getPortfolioSummary();
    var marketStatus = window.LM_MarketDataService ? window.LM_MarketDataService.getMarketStatus() : { status: 'CLOSED', isOpen: false };
    var lastUpdated = window.LM_MarketDataService ? window.LM_MarketDataService.getLastUpdated() : null;

    var updatedText = 'Market data offline';
    if (lastUpdated) {
      var diffMins = Math.floor((Date.now() - lastUpdated) / 60000);
      updatedText = diffMins === 0 ? 'Updated just now' : 'Updated ' + diffMins + 'm ago';
    }

    var isTotalPlPositive = summary.totalPortfolioPL >= 0;
    var isDayChangePositive = summary.todayChangeAmount >= 0;

    var html = `
      <div class="stocks-container fade-in">
        <!-- ── Header Banner ── -->
        <div class="stocks-header">
          <div class="stocks-header-title-group">
            <h1>
              <span>📈 Indian Stock Portfolio</span>
              <span class="market-badge ${marketStatus.isOpen ? 'live' : 'closed'}">
                ● ${marketStatus.status}
              </span>
            </h1>
            <p class="stocks-header-sub">
              ${portfolio ? portfolio.name : 'Main Portfolio'} · NSE / BSE Equities · ${updatedText}
            </p>
          </div>

          <div class="stocks-header-actions">
            <button class="overview-tool-btn privacy-toggle-btn" style="background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);border-radius:10px;padding:7px 12px;" title="Toggle Balance Privacy (Stealth Mode)" onclick="window.LM_togglePrivacyMode()" aria-label="Privacy Mode">
              ${document.body.classList.contains('privacy-mode') ? '🙈' : '👁️'} <span class="overview-tool-label">Privacy</span>
            </button>
            <button class="btn-stock-secondary" id="btnRefreshPrices" onclick="window.LM_StockPortfolioUI.handleRefreshPrices()">
              <span class="spin-icon">🔄</span> Refresh Prices
            </button>
            <button class="btn-stock-primary" onclick="window.LM_StockPortfolioUI.openAddTransactionModal()">
              <span>+</span> Add Stock / Tx
            </button>
          </div>
        </div>

        <!-- ── Real-Time Animated Market Marquee Ticker Tape ── -->
        <div class="market-marquee-container" id="stocksMarqueeTicker">
          <div class="market-marquee-track">
            <div class="ticker-item"><span class="ticker-symbol">NIFTY 50</span><span class="ticker-price">24,850.30</span><span class="ticker-badge up">▲ +0.65%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">SENSEX</span><span class="ticker-price">81,920.40</span><span class="ticker-badge up">▲ +0.58%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">BANK NIFTY</span><span class="ticker-price">52,180.15</span><span class="ticker-badge down">▼ -0.22%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">NIFTY IT</span><span class="ticker-price">36,420.80</span><span class="ticker-badge up">▲ +1.12%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">RELIANCE</span><span class="ticker-price">₹2,985.40</span><span class="ticker-badge up">▲ +0.82%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">TATA MOTORS</span><span class="ticker-price">₹980.50</span><span class="ticker-badge up">▲ +2.15%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">HDFC BANK</span><span class="ticker-price">₹1,642.00</span><span class="ticker-badge down">▼ -0.40%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">INFOSYS</span><span class="ticker-price">₹1,780.25</span><span class="ticker-badge up">▲ +1.45%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">TCS</span><span class="ticker-price">₹4,120.00</span><span class="ticker-badge up">▲ +0.90%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">ICICI BANK</span><span class="ticker-price">₹1,215.30</span><span class="ticker-badge up">▲ +0.75%</span></div>
            <!-- Duplicate loop for seamless continuous marquee -->
            <div class="ticker-item"><span class="ticker-symbol">NIFTY 50</span><span class="ticker-price">24,850.30</span><span class="ticker-badge up">▲ +0.65%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">SENSEX</span><span class="ticker-price">81,920.40</span><span class="ticker-badge up">▲ +0.58%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">BANK NIFTY</span><span class="ticker-price">52,180.15</span><span class="ticker-badge down">▼ -0.22%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">NIFTY IT</span><span class="ticker-price">36,420.80</span><span class="ticker-badge up">▲ +1.12%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">RELIANCE</span><span class="ticker-price">₹2,985.40</span><span class="ticker-badge up">▲ +0.82%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">TATA MOTORS</span><span class="ticker-price">₹980.50</span><span class="ticker-badge up">▲ +2.15%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">HDFC BANK</span><span class="ticker-price">₹1,642.00</span><span class="ticker-badge down">▼ -0.40%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">INFOSYS</span><span class="ticker-price">₹1,780.25</span><span class="ticker-badge up">▲ +1.45%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">TCS</span><span class="ticker-price">₹4,120.00</span><span class="ticker-badge up">▲ +0.90%</span></div>
            <div class="ticker-item"><span class="ticker-symbol">ICICI BANK</span><span class="ticker-price">₹1,215.30</span><span class="ticker-badge up">▲ +0.75%</span></div>
          </div>
        </div>

        <!-- ── KPI Summary Cards ── -->
        <div class="stocks-kpi-grid">
          <!-- Card 1: Current Portfolio Value -->
          <div class="stock-kpi-card">
            <div class="stock-kpi-lbl">
              <span>Current Portfolio Value</span>
              <span>💼</span>
            </div>
            <div class="stock-kpi-val">${calc.formatINR(summary.currentPortfolioValue)}</div>
            <div class="stock-kpi-sub">
              <span>Invested:</span>
              <strong style="color:var(--text2,#cbd5e1);font-family:'JetBrains Mono',monospace;">
                ${calc.formatINR(summary.totalInvested)}
              </strong>
            </div>
          </div>

          <!-- Card 2: Total Profit & Loss -->
          <div class="stock-kpi-card">
            <div class="stock-kpi-lbl">
              <span>Total Profit / Loss</span>
              <span>${isTotalPlPositive ? '🚀' : '📉'}</span>
            </div>
            <div class="stock-kpi-val ${isTotalPlPositive ? 'stock-pill-gain' : 'stock-pill-loss'}">
              ${calc.formatINR(summary.totalPortfolioPL, { showSign: true })}
            </div>
            <div class="stock-kpi-sub">
              <span>Overall Return:</span>
              <strong class="${isTotalPlPositive ? 'stock-pill-gain' : 'stock-pill-loss'}">
                ${calc.formatPercent(summary.totalReturnPct)}
              </strong>
              <span style="font-size:10px;color:var(--text3,#9ca3af);">
                (Unrealized: ${calc.formatINR(summary.totalUnrealizedPL)})
              </span>
            </div>
          </div>

          <!-- Card 3: Today's Day Change -->
          <div class="stock-kpi-card">
            <div class="stock-kpi-lbl">
              <span>Today's Change</span>
              <span>⚡</span>
            </div>
            <div class="stock-kpi-val ${isDayChangePositive ? 'stock-pill-gain' : 'stock-pill-loss'}">
              ${calc.formatINR(summary.todayChangeAmount, { showSign: true })}
            </div>
            <div class="stock-kpi-sub">
              <span>Day Movement:</span>
              <strong class="${isDayChangePositive ? 'stock-pill-gain' : 'stock-pill-loss'}">
                ${calc.formatPercent(summary.todayChangePct)}
              </strong>
            </div>
          </div>

          <!-- Card 4: Portfolio Holdings Health -->
          <div class="stock-kpi-card">
            <div class="stock-kpi-lbl">
              <span>Holdings Overview</span>
              <span>📊</span>
            </div>
            <div class="stock-kpi-val">${summary.totalHoldingsCount} <span style="font-size:13px;font-weight:500;color:var(--text3,#9ca3af);">Stocks</span></div>
            <div class="stock-kpi-sub">
              <span class="stock-pill-gain">${summary.profitableCount} Profit</span>
              <span>·</span>
              <span class="stock-pill-loss">${summary.lossCount} Loss</span>
              ${summary.totalRealizedPL !== 0 ? `<span style="margin-left:auto;font-size:11px;color:var(--text3,#9ca3af);">Realized: ${calc.formatINR(summary.totalRealizedPL, { showSign: true })}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- ── Top Performers Mini-Grid ── -->
        ${summary.totalHoldingsCount > 0 && summary.bestPerformer ? `
          <div class="performers-grid">
            <div class="performer-card">
              <div class="performer-card-lbl">Top Gainer (%)</div>
              <div class="performer-card-sym">${summary.bestPerformer.symbol}</div>
              <div class="performer-card-val stock-pill-gain">${calc.formatPercent(summary.bestPerformer.metrics.unrealizedPLPct)}</div>
            </div>
            <div class="performer-card">
              <div class="performer-card-lbl">Top Gainer (₹)</div>
              <div class="performer-card-sym">${summary.largestGain ? summary.largestGain.symbol : '—'}</div>
              <div class="performer-card-val stock-pill-gain">${summary.largestGain ? calc.formatINR(summary.largestGain.metrics.unrealizedPL, { showSign: true }) : '₹0'}</div>
            </div>
            <div class="performer-card">
              <div class="performer-card-lbl">Highest Allocation</div>
              <div class="performer-card-sym">${summary.highestAllocation ? summary.highestAllocation.symbol : '—'}</div>
              <div class="performer-card-val" style="color:var(--stock-blue,#3b82f6);">${summary.highestAllocation ? calc.formatINR(summary.highestAllocation.metrics.currentValue) : '₹0'}</div>
            </div>
            <div class="performer-card">
              <div class="performer-card-lbl">Top Drag / Loss</div>
              <div class="performer-card-sym">${summary.worstPerformer ? summary.worstPerformer.symbol : '—'}</div>
              <div class="performer-card-val ${summary.worstPerformer && summary.worstPerformer.metrics.unrealizedPL < 0 ? 'stock-pill-loss' : 'stock-pill-gain'}">
                ${summary.worstPerformer ? calc.formatPercent(summary.worstPerformer.metrics.unrealizedPLPct) : '0%'}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- ── Navigation Tabs ── -->
        <div class="stocks-tabs">
          <button class="stock-tab-btn ${_activeTab === 'holdings' ? 'active' : ''}" onclick="window.LM_StockPortfolioUI.switchTab('holdings')">
            💼 Open Holdings (${summary.totalHoldingsCount})
          </button>
          <button class="stock-tab-btn ${_activeTab === 'transactions' ? 'active' : ''}" onclick="window.LM_StockPortfolioUI.switchTab('transactions')">
            📜 Transaction History (${service.getAllTransactions().length})
          </button>
          <button class="stock-tab-btn ${_activeTab === 'analytics' ? 'active' : ''}" onclick="window.LM_StockPortfolioUI.switchTab('analytics')">
            📊 Allocation & Analytics
          </button>
        </div>

        <!-- ── Tab Body Content ── -->
        <div id="stocksTabContent">
          ${renderTabContent(allHoldings, summary)}
        </div>
      </div>
    `;

    container.innerHTML = html;

    if (_activeTab === 'analytics') {
      setTimeout(renderAnalyticsCharts, 50);
    }
  }

  /**
   * Render the active tab content
   */
  function renderTabContent(allHoldings, summary) {
    if (_activeTab === 'holdings') {
      return renderHoldingsTab(allHoldings);
    } else if (_activeTab === 'transactions') {
      return renderTransactionsTab();
    } else if (_activeTab === 'analytics') {
      return renderAnalyticsTab(allHoldings, summary);
    }
    return '';
  }

  /**
   * Render Holdings View with Search, Filtering, and Sorting
   */
  function renderHoldingsTab(allHoldings) {
    var calc = getCalculations();
    var openHoldings = allHoldings.filter(h => h.metrics.isOpen);

    if (openHoldings.length === 0) {
      return `
        <div class="stocks-empty-state">
          <div class="stocks-empty-icon">📈</div>
          <div class="stocks-empty-title">No stocks in your portfolio yet</div>
          <div class="stocks-empty-sub">
            Track your investments in Reliance, TCS, HDFC Bank, Infosys, and 120+ NSE/BSE equities with real-time profit & loss.
          </div>
          <button class="btn-stock-primary" onclick="window.LM_StockPortfolioUI.openAddTransactionModal()">
            + Add Your First Stock
          </button>
        </div>
      `;
    }

    // Filter by sector & search
    var filtered = openHoldings.filter(function (h) {
      var matchSearch = true;
      if (_searchQuery) {
        var q = _searchQuery.toUpperCase();
        matchSearch = h.symbol.toUpperCase().includes(q) || h.company_name.toUpperCase().includes(q);
      }
      var matchSector = (_sectorFilter === 'ALL' || h.sector === _sectorFilter);
      return matchSearch && matchSector;
    });

    // Sort
    filtered.sort(function (a, b) {
      var mul = _sortOrder === 'desc' ? -1 : 1;
      if (_sortField === 'value') {
        return (a.metrics.currentValue - b.metrics.currentValue) * mul;
      } else if (_sortField === 'pl') {
        return (a.metrics.unrealizedPL - b.metrics.unrealizedPL) * mul;
      } else if (_sortField === 'name') {
        return a.symbol.localeCompare(b.symbol) * (mul * -1);
      } else if (_sortField === 'day_change') {
        return (a.metrics.dayChangePct - b.metrics.dayChangePct) * mul;
      } else if (_sortField === 'qty') {
        return (a.metrics.quantity - b.metrics.quantity) * mul;
      }
      return 0;
    });

    // Extract available sectors
    var sectors = window.LM_StockRegistry ? window.LM_StockRegistry.getSectors() : [];

    return `
      <!-- ── Search & Filter Toolbar ── -->
      <div class="stocks-toolbar">
        <div class="stocks-search-wrap">
          <span class="stocks-search-icon">🔍</span>
          <input type="text" placeholder="Search holdings by name or symbol…" value="${_searchQuery}" oninput="window.LM_StockPortfolioUI.handleSearch(this.value)">
        </div>

        <div class="stocks-filters-wrap">
          <select class="stock-select" onchange="window.LM_StockPortfolioUI.handleSectorFilter(this.value)">
            <option value="ALL" ${_sectorFilter === 'ALL' ? 'selected' : ''}>All Sectors</option>
            ${sectors.map(s => `<option value="${s}" ${_sectorFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>

          <select class="stock-select" onchange="window.LM_StockPortfolioUI.handleSort(this.value)">
            <option value="value_desc" ${_sortField === 'value' && _sortOrder === 'desc' ? 'selected' : ''}>Value: High to Low</option>
            <option value="value_asc" ${_sortField === 'value' && _sortOrder === 'asc' ? 'selected' : ''}>Value: Low to High</option>
            <option value="pl_desc" ${_sortField === 'pl' && _sortOrder === 'desc' ? 'selected' : ''}>P&L: Highest Gain</option>
            <option value="pl_asc" ${_sortField === 'pl' && _sortOrder === 'asc' ? 'selected' : ''}>P&L: Highest Loss</option>
            <option value="name_asc" ${_sortField === 'name' && _sortOrder === 'asc' ? 'selected' : ''}>Stock Name (A-Z)</option>
            <option value="day_change_desc" ${_sortField === 'day_change' && _sortOrder === 'desc' ? 'selected' : ''}>Day Change (%)</option>
          </select>
        </div>
      </div>

      <!-- ── Desktop / Tablet Holdings Table ── -->
      <div class="stocks-table-container">
        <table class="stocks-table">
          <thead>
            <tr>
              <th>Stock / Symbol</th>
              <th>Quantity</th>
              <th>Avg Price</th>
              <th>Invested</th>
              <th>Current Price</th>
              <th>Current Value</th>
              <th>Day Change</th>
              <th>Unrealized P&L</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(function (h) {
              var m = h.metrics;
              var isPlPos = m.unrealizedPL >= 0;
              var isDayPos = m.dayChange >= 0;

              return `
                <tr>
                  <td>
                    <div class="stock-meta-cell">
                      <div class="stock-sym-row">
                        <span style="cursor:pointer;color:var(--text1,#e6eaf3);" onclick="window.LM_StockPortfolioUI.openStockDetailModal('${h.id}')">
                          ${h.symbol}
                        </span>
                        <span class="stock-badge-${(h.exchange || 'NSE').toLowerCase()}">${h.exchange || 'NSE'}</span>
                      </div>
                      <div class="stock-company-name" title="${h.company_name}">${h.company_name}</div>
                    </div>
                  </td>
                  <td><strong style="font-family:'JetBrains Mono',monospace;">${calc.formatQty(m.quantity)}</strong></td>
                  <td><span style="font-family:'JetBrains Mono',monospace;">${calc.formatINR(m.averageBuyPrice)}</span></td>
                  <td><span style="font-family:'JetBrains Mono',monospace;">${calc.formatINR(m.investedAmount)}</span></td>
                  <td>
                    ${m.currentPrice ? `
                      <div style="display:flex;align-items:center;gap:5px;">
                        <strong style="font-family:'JetBrains Mono',monospace;">${calc.formatINR(m.currentPrice)}</strong>
                        <span style="font-size:9px;padding:1px 4px;border-radius:3px;font-weight:700;${m.isLive ? 'background:rgba(16,185,129,0.15);color:#10b981;' : 'background:rgba(245,158,11,0.15);color:#f59e0b;'}" title="${m.isLive ? 'Live NSE/BSE quote' : 'Offline / Market closed. Using last buy price.'}">
                          ${m.isLive ? 'LIVE' : 'LAST BUY'}
                        </span>
                      </div>
                    ` : `
                      <span style="font-size:11px;color:var(--text3,#9ca3af);">Unavailable</span>
                    `}
                  </td>
                  <td><strong style="font-family:'JetBrains Mono',monospace;">${calc.formatINR(m.currentValue)}</strong></td>
                  <td>
                    ${m.hasLivePrice ? `
                      <span class="${isDayPos ? 'stock-pill-gain' : 'stock-pill-loss'}">
                        ${calc.formatINR(m.dayChange, { showSign: true })} (${calc.formatPercent(m.dayChangePct)})
                      </span>
                    ` : '—'}
                  </td>
                  <td>
                    ${m.hasLivePrice ? `
                      <div style="display:flex;flex-direction:column;">
                        <strong class="${isPlPos ? 'stock-pill-gain' : 'stock-pill-loss'}">
                          ${calc.formatINR(m.unrealizedPL, { showSign: true })}
                        </strong>
                        <small class="${isPlPos ? 'stock-pill-gain' : 'stock-pill-loss'}">
                          ${calc.formatPercent(m.unrealizedPLPct)}
                        </small>
                      </div>
                    ` : '—'}
                  </td>
                  <td>
                    <div class="stock-row-actions">
                      <button class="btn-stock-mini" title="View details & transactions" onclick="window.LM_StockPortfolioUI.openStockDetailModal('${h.id}')">
                        🔍 View
                      </button>
                      <button class="btn-stock-mini" title="Add Buy/Sell order for this stock" onclick="window.LM_StockPortfolioUI.openAddTransactionModal({ symbol: '${h.symbol}', exchange: '${h.exchange}', company_name: '${h.company_name.replace(/'/g, "\\'")}', sector: '${h.sector}' })">
                        + Tx
                      </button>
                      <button class="btn-stock-mini danger" title="Delete holding" onclick="window.LM_StockPortfolioUI.confirmDeleteHolding('${h.id}')">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- ── Mobile Card List ── -->
      <div class="stocks-mobile-cards">
        ${filtered.map(function (h) {
          var m = h.metrics;
          var isPlPos = m.unrealizedPL >= 0;
          var isDayPos = m.dayChange >= 0;

          return `
            <div class="stock-holding-card">
              <div class="stock-card-head">
                <div>
                  <div class="stock-sym-row">
                    <span style="font-size:15px;" onclick="window.LM_StockPortfolioUI.openStockDetailModal('${h.id}')">${h.symbol}</span>
                    <span class="stock-badge-${(h.exchange || 'NSE').toLowerCase()}">${h.exchange || 'NSE'}</span>
                  </div>
                  <div class="stock-company-name">${h.company_name}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-family:'JetBrains Mono',monospace;font-weight:800;font-size:15px;">
                    ${calc.formatINR(m.currentValue)}
                  </div>
                  ${m.hasLivePrice ? `
                    <div class="${isPlPos ? 'stock-pill-gain' : 'stock-pill-loss'}" style="font-size:11px;">
                      ${calc.formatINR(m.unrealizedPL, { showSign: true })} (${calc.formatPercent(m.unrealizedPLPct)})
                    </div>
                  ` : ''}
                </div>
              </div>

              <div class="stock-card-row">
                <span>Holdings:</span>
                <span>${calc.formatQty(m.quantity)} shares @ ${calc.formatINR(m.averageBuyPrice)}</span>
              </div>

              <div class="stock-card-row">
                <span>Invested:</span>
                <span>${calc.formatINR(m.investedAmount)}</span>
              </div>

              <div class="stock-card-row">
                <span>CMP (Day Chg):</span>
                <span>
                  ${m.currentPrice ? `
                    <b>${calc.formatINR(m.currentPrice)}</b>
                    <span style="font-size:9px;padding:1px 4px;border-radius:3px;font-weight:700;${m.isLive ? 'background:rgba(16,185,129,0.15);color:#10b981;' : 'background:rgba(245,158,11,0.15);color:#f59e0b;'}">
                      ${m.isLive ? 'LIVE' : 'LAST BUY'}
                    </span>
                    ${m.isLive ? `(<span class="${isDayPos ? 'stock-pill-gain' : 'stock-pill-loss'}">${calc.formatPercent(m.dayChangePct)}</span>)` : ''}
                  ` : 'Unavailable'}
                </span>
              </div>

              <div class="stock-card-actions">
                <button class="btn-stock-secondary" onclick="window.LM_StockPortfolioUI.openStockDetailModal('${h.id}')">
                  🔍 View History
                </button>
                <button class="btn-stock-primary" onclick="window.LM_StockPortfolioUI.openAddTransactionModal({ symbol: '${h.symbol}', exchange: '${h.exchange}', company_name: '${h.company_name.replace(/'/g, "\\'")}', sector: '${h.sector}' })">
                  + Add Tx
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Render All Transactions History Ledger
   */
  function renderTransactionsTab() {
    var service = getService();
    var calc = getCalculations();
    var allTxs = service ? service.getAllTransactions() : [];

    if (allTxs.length === 0) {
      return `
        <div class="stocks-empty-state">
          <div class="stocks-empty-icon">📜</div>
          <div class="stocks-empty-title">No transactions recorded yet</div>
          <div class="stocks-empty-sub">
            Add your first stock purchase or sale to start tracking your trading history.
          </div>
          <button class="btn-stock-primary" onclick="window.LM_StockPortfolioUI.openAddTransactionModal()">
            + Record Transaction
          </button>
        </div>
      `;
    }

    var filtered = allTxs.filter(function (t) {
      var matchType = (_txTypeFilter === 'ALL' || t.transaction_type === _txTypeFilter);
      var matchEx = (_txExchangeFilter === 'ALL' || t.exchange === _txExchangeFilter);
      return matchType && matchEx;
    });

    return `
      <!-- Toolbar -->
      <div class="stocks-toolbar">
        <div class="stocks-filters-wrap">
          <select class="stock-select" onchange="window.LM_StockPortfolioUI.handleTxTypeFilter(this.value)">
            <option value="ALL" ${_txTypeFilter === 'ALL' ? 'selected' : ''}>All Types (BUY & SELL)</option>
            <option value="BUY" ${_txTypeFilter === 'BUY' ? 'selected' : ''}>BUY Orders Only</option>
            <option value="SELL" ${_txTypeFilter === 'SELL' ? 'selected' : ''}>SELL Orders Only</option>
          </select>

          <select class="stock-select" onchange="window.LM_StockPortfolioUI.handleTxExchangeFilter(this.value)">
            <option value="ALL" ${_txExchangeFilter === 'ALL' ? 'selected' : ''}>All Exchanges</option>
            <option value="NSE" ${_txExchangeFilter === 'NSE' ? 'selected' : ''}>NSE</option>
            <option value="BSE" ${_txExchangeFilter === 'BSE' ? 'selected' : ''}>BSE</option>
          </select>
        </div>

        <button class="btn-stock-secondary" onclick="window.LM_StockPortfolioUI.exportTransactionsCSV()">
          📥 Export CSV
        </button>
      </div>

      <!-- Transaction Table -->
      <div class="stocks-table-container">
        <table class="stocks-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Stock / Symbol</th>
              <th>Exchange</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Gross Amount</th>
              <th>Charges (Tax+Brok)</th>
              <th>Net Amount</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(function (tx) {
              return `
                <tr>
                  <td style="font-family:'JetBrains Mono',monospace;white-space:nowrap;">${tx.transaction_date}</td>
                  <td>
                    <strong>${tx.symbol}</strong>
                    <div style="font-size:11px;color:var(--text3,#9ca3af);">${tx.company_name}</div>
                  </td>
                  <td><span class="stock-badge-${tx.exchange.toLowerCase()}">${tx.exchange}</span></td>
                  <td><span class="tx-badge-${tx.transaction_type.toLowerCase()}">${tx.transaction_type}</span></td>
                  <td style="font-family:'JetBrains Mono',monospace;">${calc.formatQty(tx.quantity)}</td>
                  <td style="font-family:'JetBrains Mono',monospace;">${calc.formatINR(tx.price)}</td>
                  <td style="font-family:'JetBrains Mono',monospace;">${calc.formatINR(tx.gross_amount)}</td>
                  <td style="font-family:'JetBrains Mono',monospace;color:var(--text3,#9ca3af);">${calc.formatINR(tx.brokerage + tx.taxes)}</td>
                  <td><strong style="font-family:'JetBrains Mono',monospace;">${calc.formatINR(tx.net_amount)}</strong></td>
                  <td>
                    <div class="stock-row-actions">
                      <button class="btn-stock-mini" title="Edit transaction" onclick="window.LM_StockPortfolioUI.openEditTransactionModal('${tx.id}')">
                        ✏️ Edit
                      </button>
                      <button class="btn-stock-mini danger" title="Delete transaction" onclick="window.LM_StockPortfolioUI.confirmDeleteTransaction('${tx.id}')">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render Analytics & Visualizations Tab
   */
  function renderAnalyticsTab(allHoldings, summary) {
    var openHoldings = allHoldings.filter(h => h.metrics.isOpen);

    if (openHoldings.length === 0) {
      return `
        <div class="stocks-empty-state">
          <div class="stocks-empty-icon">📊</div>
          <div class="stocks-empty-title">No portfolio analytics yet</div>
          <div class="stocks-empty-sub">Add stocks to your portfolio to view sector diversification and performance charts.</div>
        </div>
      `;
    }

    return `
      <div class="stocks-analytics-grid">
        <!-- Chart 1: Sector Diversification -->
        <div class="stocks-chart-card">
          <div class="stocks-chart-head">
            <div class="stocks-chart-title">🏷️ Sector Allocation</div>
          </div>
          <div class="stocks-chart-wrap">
            <canvas id="stockSectorChart"></canvas>
          </div>
        </div>

        <!-- Chart 2: Holding Distribution -->
        <div class="stocks-chart-card">
          <div class="stocks-chart-head">
            <div class="stocks-chart-title">💼 Stock Allocation (% of Portfolio)</div>
          </div>
          <div class="stocks-chart-wrap">
            <canvas id="stockHoldingChart"></canvas>
          </div>
        </div>

        <!-- Chart 3: Stock-wise Profit / Loss -->
        <div class="stocks-chart-card" style="grid-column:1 / -1;">
          <div class="stocks-chart-head">
            <div class="stocks-chart-title">📊 Stock-Wise Profit & Loss (₹)</div>
          </div>
          <div class="stocks-chart-wrap" style="height:280px;">
            <canvas id="stockPLBarChart"></canvas>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render Chart.js charts on analytics tab
   */
  function renderAnalyticsCharts() {
    if (typeof Chart === 'undefined') return;

    var service = getService();
    if (!service) return;

    var holdings = service.getHoldingsWithMetrics().filter(h => h.metrics.isOpen);
    if (holdings.length === 0) return;

    var summary = service.getPortfolioSummary();

    // 1. Sector Allocation Donut Chart
    var sectorCanvas = document.getElementById('stockSectorChart');
    if (sectorCanvas) {
      if (_allocationChartInstance) _allocationChartInstance.destroy();

      var sectorLabels = summary.sectorAllocation.map(s => s.sector);
      var sectorValues = summary.sectorAllocation.map(s => s.value);
      var colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#64748b'];

      _allocationChartInstance = new Chart(sectorCanvas, {
        type: 'doughnut',
        data: {
          labels: sectorLabels,
          datasets: [{
            data: sectorValues,
            backgroundColor: colors.slice(0, sectorLabels.length),
            borderWidth: 2,
            borderColor: '#11151f'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, color: '#9ca3af', font: { size: 11 } } }
          }
        }
      });
    }

    // 2. Stock Allocation Donut Chart
    var holdingCanvas = document.getElementById('stockHoldingChart');
    if (holdingCanvas) {
      var holdingLabels = holdings.map(h => h.symbol);
      var holdingValues = holdings.map(h => h.metrics.currentValue);
      var hColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#14b8a6', '#6366f1', '#f97316'];

      new Chart(holdingCanvas, {
        type: 'doughnut',
        data: {
          labels: holdingLabels,
          datasets: [{
            data: holdingValues,
            backgroundColor: hColors.slice(0, holdingLabels.length),
            borderWidth: 2,
            borderColor: '#11151f'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, color: '#9ca3af', font: { size: 11 } } }
          }
        }
      });
    }

    // 3. Stock-Wise P/L Bar Chart
    var plCanvas = document.getElementById('stockPLBarChart');
    if (plCanvas) {
      if (_plChartInstance) _plChartInstance.destroy();

      var plLabels = holdings.map(h => h.symbol);
      var plValues = holdings.map(h => h.metrics.unrealizedPL);
      var bgColors = plValues.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(239, 68, 68, 0.75)');

      _plChartInstance = new Chart(plCanvas, {
        type: 'bar',
        data: {
          labels: plLabels,
          datasets: [{
            label: 'Unrealized P&L (₹)',
            data: plValues,
            backgroundColor: bgColors,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { grid: { color: '#1e2436' }, ticks: { color: '#9ca3af' } },
            y: { grid: { color: '#1e2436' }, ticks: { color: '#9ca3af' } }
          }
        }
      });
    }
  }

  /**
   * Open Modal to Add Stock / Transaction
   */
  function openAddTransactionModal(preset) {
    var modalContainer = document.getElementById('stockModalContainer');
  /**
   * Helper to ensure the modal container exists directly on document.body for true viewport centering
   */
  function ensureModalContainer() {
    var el = document.getElementById('stockModalContainer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'stockModalContainer';
      document.body.appendChild(el);
    } else if (el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * Open Modal to Add Stock / Transaction
   */
  function openAddTransactionModal(preset) {
    var modalContainer = ensureModalContainer();
    var p = preset || {};
    var defaultDate = new Date().toISOString().split('T')[0];

    modalContainer.innerHTML = `
      <div class="stock-modal-backdrop open" id="addTxBackdrop" onclick="if(event.target===this) window.LM_StockPortfolioUI.closeModal()">
        <div class="stock-modal">
          <div class="stock-modal-head">
            <div class="stock-modal-title">Record Stock Transaction</div>
            <button class="stock-modal-close" onclick="window.LM_StockPortfolioUI.closeModal()">✕</button>
          </div>

          <form id="stockTxForm" onsubmit="window.LM_StockPortfolioUI.submitAddTransaction(event)">
            <!-- Transaction Type Switcher -->
            <div style="display:flex;gap:10px;margin-bottom:16px;">
              <label style="flex:1;padding:10px;background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);border-radius:10px;text-align:center;cursor:pointer;">
                <input type="radio" name="txType" value="BUY" checked onchange="window.LM_StockPortfolioUI.updateFormPreview()">
                <strong style="color:var(--stock-green,#10b981);margin-left:6px;">BUY (Purchase)</strong>
              </label>
              <label style="flex:1;padding:10px;background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);border-radius:10px;text-align:center;cursor:pointer;">
                <input type="radio" name="txType" value="SELL" ${p.type === 'SELL' ? 'checked' : ''} onchange="window.LM_StockPortfolioUI.updateFormPreview()">
                <strong style="color:var(--stock-red,#ef4444);margin-left:6px;">SELL (Book Profit)</strong>
              </label>
            </div>

            <!-- Stock Symbol Search with Autocomplete -->
            <div class="stock-form-field stock-form-full" style="margin-bottom:14px;">
              <label>Indian Stock Symbol / Company Name *</label>
              <div class="stock-autocomplete-box">
                <input type="text" id="stkSymInput" placeholder="e.g. RELIANCE, TCS, HDFCBANK, Tata Motors" value="${p.symbol || ''}" autocomplete="off" required oninput="window.LM_StockPortfolioUI.handleSymbolSearch(this.value)" onblur="window.LM_StockPortfolioUI.autofetchStockPrice(this.value)">
                <div class="stock-suggestions-list" id="stkSuggestions"></div>
              </div>
            </div>

            <div class="stock-form-grid">
              <div class="stock-form-field">
                <label>Company Name</label>
                <input type="text" id="stkNameInput" placeholder="Company Full Name" value="${p.company_name || ''}">
              </div>

              <div class="stock-form-field">
                <label>Exchange</label>
                <select id="stkExInput" class="stock-select" onchange="window.LM_StockPortfolioUI.autofetchStockPrice(document.getElementById('stkSymInput')?.value)">
                  <option value="NSE" ${(!p.exchange || p.exchange === 'NSE') ? 'selected' : ''}>NSE (National Stock Exchange)</option>
                  <option value="BSE" ${p.exchange === 'BSE' ? 'selected' : ''}>BSE (Bombay Stock Exchange)</option>
                </select>
              </div>

              <div class="stock-form-field">
                <label>Sector / Category</label>
                <input type="text" id="stkSectorInput" placeholder="e.g. IT, Banking, FMCG" value="${p.sector || 'General'}">
              </div>

              <div class="stock-form-field">
                <label>Transaction Date *</label>
                <input type="date" id="stkDateInput" value="${p.date || defaultDate}" required>
              </div>

              <div class="stock-form-field">
                <label>Quantity (Shares) *</label>
                <input type="number" id="stkQtyInput" step="any" min="0.0001" placeholder="e.g. 10" required oninput="window.LM_StockPortfolioUI.updateFormPreview()">
              </div>

              <div class="stock-form-field">
                <label>Price per Share (₹) *</label>
                <input type="number" id="stkPriceInput" step="0.01" min="0.01" placeholder="e.g. 2500.00" required oninput="window.LM_StockPortfolioUI.updateFormPreview()">
              </div>

              <div class="stock-form-field">
                <label>Brokerage (₹)</label>
                <input type="number" id="stkBrokInput" step="0.01" min="0" value="0.00" oninput="window.LM_StockPortfolioUI.updateFormPreview()">
              </div>

              <div class="stock-form-field">
                <label>Taxes & Charges (₹ STT/GST)</label>
                <input type="number" id="stkTaxInput" step="0.01" min="0" value="0.00" oninput="window.LM_StockPortfolioUI.updateFormPreview()">
              </div>

              <div class="stock-form-field stock-form-full">
                <label>Notes (Optional)</label>
                <textarea id="stkNotesInput" rows="2" placeholder="e.g. Long-term SIP, Swing trade on breakout..."></textarea>
              </div>
            </div>

            <!-- Real-time Cost Calculation Preview Box -->
            <div class="stock-calc-preview" id="stkCalcPreview">
              <div class="stock-calc-row">
                <span>Gross Amount (Qty × Price):</span>
                <span id="prevGross">₹0.00</span>
              </div>
              <div class="stock-calc-row">
                <span>Total Charges (Brokerage + Tax):</span>
                <span id="prevCharges">₹0.00</span>
              </div>
              <div class="stock-calc-row total">
                <span id="prevTotalLabel">Net Outflow / Cost:</span>
                <span id="prevNet">₹0.00</span>
              </div>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
              <button type="button" class="btn-stock-secondary" onclick="window.LM_StockPortfolioUI.closeModal()">Cancel</button>
              <button type="submit" class="btn-stock-primary" id="btnSubmitTx">💾 Save Transaction</button>
            </div>
          </form>
        </div>
      </div>
    `;

    setTimeout(function () {
      var symInput = document.getElementById('stkSymInput');
      if (symInput && !p.symbol) {
        symInput.focus();
      } else if (p.symbol) {
        autofetchStockPrice(p.symbol);
      }
    }, 100);
  }

  /**
   * Handle dynamic autocomplete for stock symbol
   */
  function handleSymbolSearch(val) {
    var listEl = document.getElementById('stkSuggestions');
    if (!listEl) return;

    if (!val || val.trim().length === 0) {
      listEl.classList.remove('open');
      listEl.innerHTML = '';
      return;
    }

    var results = window.LM_StockRegistry ? window.LM_StockRegistry.search(val, 8) : [];
    if (results.length === 0) {
      listEl.classList.remove('open');
      listEl.innerHTML = '';
      return;
    }

    listEl.innerHTML = results.map(function (s) {
      return `
        <div class="stock-suggestion-item" onclick="window.LM_StockPortfolioUI.selectStockSuggestion('${s.symbol}', '${(s.name || '').replace(/'/g, "\\'")}', '${s.exchange || 'NSE'}', '${s.sector || 'General'}')">
          <div class="stock-sug-left">
            <span class="stock-sug-sym">${s.symbol}</span>
            <span class="stock-sug-name">${s.name}</span>
          </div>
          <div class="stock-sug-right">
            <span class="stock-badge-${(s.exchange || 'NSE').toLowerCase()}">${s.exchange || 'NSE'}</span>
            <span style="font-size:10px;color:var(--text3,#9ca3af);">${s.sector || 'General'}</span>
          </div>
        </div>
      `;
    }).join('');

    listEl.classList.add('open');
  }

  function selectStockSuggestion(symbol, name, exchange, sector) {
    var symInput = document.getElementById('stkSymInput');
    var nameInput = document.getElementById('stkNameInput');
    var exInput = document.getElementById('stkExInput');
    var sectorInput = document.getElementById('stkSectorInput');
    var listEl = document.getElementById('stkSuggestions');

    if (symInput) symInput.value = symbol;
    if (nameInput) nameInput.value = name;
    if (exInput) exInput.value = exchange;
    if (sectorInput) sectorInput.value = sector;
    if (listEl) {
      listEl.classList.remove('open');
      listEl.innerHTML = '';
    }

    autofetchStockPrice(symbol);
  }

  /**
   * Automatically fetch and prefill live/reference stock price for any stock name or symbol
   */
  async function autofetchStockPrice(symbol) {
    if (!symbol) return;
    var sym = symbol.trim().toUpperCase();
    var exInput = document.getElementById('stkExInput');
    var exchange = exInput ? exInput.value : 'NSE';
    var nameInput = document.getElementById('stkNameInput');
    var priceInput = document.getElementById('stkPriceInput');
    var sectorInput = document.getElementById('stkSectorInput');

    // If company name empty, auto-fill from registry
    if (window.LM_StockRegistry && nameInput && (!nameInput.value || nameInput.value === sym)) {
      var match = window.LM_StockRegistry.getBySymbol(sym, exchange);
      if (match && match.name && match.name !== sym) {
        nameInput.value = match.name;
        if (sectorInput && (!sectorInput.value || sectorInput.value === 'General')) {
          sectorInput.value = match.sector || 'General';
        }
      }
    }

    if (window.LM_MarketDataService) {
      var quote = window.LM_MarketDataService.getCachedQuote(sym, exchange);
      if (quote && quote.price && priceInput && !priceInput.value) {
        priceInput.value = quote.price;
        updateFormPreview();
      }

      window.LM_MarketDataService.fetchQuote(sym, exchange, true).then(function (fresh) {
        if (fresh && fresh.price && priceInput && (!priceInput.value || priceInput.dataset.autofilled === 'true')) {
          priceInput.value = fresh.price;
          priceInput.dataset.autofilled = 'true';
          updateFormPreview();
        }
      }).catch(function () {});
    }
  }

  /**
   * Update real-time calculation preview in modal
   */
  function updateFormPreview() {
    var calc = getCalculations();
    var qty = Number(document.getElementById('stkQtyInput')?.value) || 0;
    var price = Number(document.getElementById('stkPriceInput')?.value) || 0;
    var brok = Number(document.getElementById('stkBrokInput')?.value) || 0;
    var tax = Number(document.getElementById('stkTaxInput')?.value) || 0;

    var txTypeRadio = document.querySelector('input[name="txType"]:checked');
    var isBuy = !txTypeRadio || txTypeRadio.value === 'BUY';

    var gross = qty * price;
    var charges = brok + tax;
    var net = isBuy ? (gross + charges) : (gross - charges);

    var prevGross = document.getElementById('prevGross');
    var prevCharges = document.getElementById('prevCharges');
    var prevNet = document.getElementById('prevNet');
    var prevTotalLabel = document.getElementById('prevTotalLabel');

    if (prevGross) prevGross.textContent = calc.formatINR(gross);
    if (prevCharges) prevCharges.textContent = calc.formatINR(charges);
    if (prevNet) prevNet.textContent = calc.formatINR(net);
    if (prevTotalLabel) prevTotalLabel.textContent = isBuy ? 'Net Outflow / Total Cost:' : 'Net Inflow / Realized Revenue:';
  }

  /**
   * Submit Add Transaction Form
   */
  async function submitAddTransaction(e) {
    e.preventDefault();
    var btn = document.getElementById('btnSubmitTx');
    if (btn) btn.disabled = true;

    try {
      var symbol = document.getElementById('stkSymInput')?.value;
      var name = document.getElementById('stkNameInput')?.value;
      var exchange = document.getElementById('stkExInput')?.value;
      var sector = document.getElementById('stkSectorInput')?.value;
      var txDate = document.getElementById('stkDateInput')?.value;
      var qty = document.getElementById('stkQtyInput')?.value;
      var price = document.getElementById('stkPriceInput')?.value;
      var brok = document.getElementById('stkBrokInput')?.value;
      var tax = document.getElementById('stkTaxInput')?.value;
      var notes = document.getElementById('stkNotesInput')?.value || '';

      var txTypeRadio = document.querySelector('input[name="txType"]:checked');
      var txType = txTypeRadio ? txTypeRadio.value : 'BUY';

      var service = getService();
      if (!service) throw new Error('Stock service unavailable');

      await service.addTransaction({
        symbol: symbol,
        company_name: name,
        exchange: exchange,
        sector: sector,
        transaction_type: txType,
        quantity: qty,
        price: price,
        brokerage: brok,
        taxes: tax,
        transaction_date: txDate,
        notes: notes
      });

      closeModal();
      toast('✅ Transaction for ' + symbol.toUpperCase() + ' saved successfully!', 'success');
      render();

      if (window.LM_MarketDataService) {
        window.LM_MarketDataService.fetchQuote(symbol, exchange, true).catch(function () {});
      }
    } catch (err) {
      toast('❌ Error: ' + err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Open Modal to Edit Stock Holding Info (Company Name, Exchange, Sector, Notes)
   */
  function openEditHoldingModal(holdingId) {
    var service = getService();
    if (!service) return;
    var holding = service.getHoldingById(holdingId);
    if (!holding) {
      toast('Stock holding not found', 'warning');
      return;
    }

    var modalContainer = ensureModalContainer();
    modalContainer.innerHTML = `
      <div class="stock-modal-backdrop open" onclick="if(event.target===this) window.LM_StockPortfolioUI.closeModal()">
        <div class="stock-modal">
          <div class="stock-modal-head">
            <div class="stock-modal-title">✏️ Edit Stock: ${holding.symbol}</div>
            <button class="stock-modal-close" onclick="window.LM_StockPortfolioUI.closeModal()">✕</button>
          </div>

          <form id="stockEditHoldingForm" onsubmit="window.LM_StockPortfolioUI.submitEditHolding(event, '${holding.id}')">
            <div class="stock-form-grid">
              <div class="stock-form-field">
                <label>Stock Symbol</label>
                <input type="text" value="${holding.symbol}" disabled style="opacity:0.7;cursor:not-allowed;background:rgba(255,255,255,0.05);">
              </div>

              <div class="stock-form-field">
                <label>Exchange *</label>
                <select id="editHoldExInput" class="stock-select">
                  <option value="NSE" ${holding.exchange === 'NSE' ? 'selected' : ''}>NSE (National Stock Exchange)</option>
                  <option value="BSE" ${holding.exchange === 'BSE' ? 'selected' : ''}>BSE (Bombay Stock Exchange)</option>
                </select>
              </div>

              <div class="stock-form-field stock-form-full">
                <label>Company / Stock Name *</label>
                <input type="text" id="editHoldNameInput" value="${(holding.company_name || '').replace(/"/g, '&quot;')}" placeholder="e.g. Reliance Industries Ltd" required>
              </div>

              <div class="stock-form-field stock-form-full">
                <label>Sector / Category</label>
                <input type="text" id="editHoldSectorInput" value="${(holding.sector || 'General').replace(/"/g, '&quot;')}" placeholder="e.g. IT, Banking, Energy">
              </div>

              <div class="stock-form-field stock-form-full">
                <label>Holding Notes</label>
                <textarea id="editHoldNotesInput" rows="2" placeholder="e.g. Core long-term holding, target price 3500">${(holding.notes || '').replace(/</g, '&lt;')}</textarea>
              </div>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
              <button type="button" class="btn-stock-secondary" onclick="window.LM_StockPortfolioUI.closeModal()">Cancel</button>
              <button type="submit" class="btn-stock-primary" id="btnSubmitEditHold">💾 Update Holding</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  async function submitEditHolding(e, holdingId) {
    e.preventDefault();
    var btn = document.getElementById('btnSubmitEditHold');
    if (btn) btn.disabled = true;

    try {
      var service = getService();
      if (!service) throw new Error('Stock service unavailable');

      var name = document.getElementById('editHoldNameInput')?.value;
      var exchange = document.getElementById('editHoldExInput')?.value;
      var sector = document.getElementById('editHoldSectorInput')?.value;
      var notes = document.getElementById('editHoldNotesInput')?.value || '';

      await service.updateHolding(holdingId, {
        company_name: name,
        exchange: exchange,
        sector: sector,
        notes: notes
      });

      closeModal();
      toast('✅ Stock holding updated successfully', 'success');
      render();
    } catch (err) {
      toast('❌ Error: ' + err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Open Modal to Edit an Existing Transaction
   */
  function openEditTransactionModal(txId) {
    var service = getService();
    if (!service) return;
    var allTxs = service.getAllTransactions();
    var tx = allTxs.find(t => t.id === txId);
    if (!tx) {
      toast('Transaction not found', 'warning');
      return;
    }

    var defaultDate = tx.transaction_date || new Date().toISOString().split('T')[0];
    var modalContainer = ensureModalContainer();

    modalContainer.innerHTML = `
      <div class="stock-modal-backdrop open" onclick="if(event.target===this) window.LM_StockPortfolioUI.closeModal()">
        <div class="stock-modal">
          <div class="stock-modal-head">
            <div class="stock-modal-title">✏️ Edit Transaction: ${tx.symbol}</div>
            <button class="stock-modal-close" onclick="window.LM_StockPortfolioUI.closeModal()">✕</button>
          </div>

          <form id="stockEditTxForm" onsubmit="window.LM_StockPortfolioUI.submitEditTransaction(event, '${tx.id}')">
            <!-- Transaction Type Switcher -->
            <div style="display:flex;gap:10px;margin-bottom:16px;">
              <label style="flex:1;padding:10px;background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);border-radius:10px;text-align:center;cursor:pointer;">
                <input type="radio" name="editTxType" value="BUY" ${tx.transaction_type === 'BUY' ? 'checked' : ''} onchange="window.LM_StockPortfolioUI.updateEditFormPreview()">
                <strong style="color:var(--stock-green,#10b981);margin-left:6px;">BUY (Purchase)</strong>
              </label>
              <label style="flex:1;padding:10px;background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);border-radius:10px;text-align:center;cursor:pointer;">
                <input type="radio" name="editTxType" value="SELL" ${tx.transaction_type === 'SELL' ? 'checked' : ''} onchange="window.LM_StockPortfolioUI.updateEditFormPreview()">
                <strong style="color:var(--stock-red,#ef4444);margin-left:6px;">SELL (Book Profit)</strong>
              </label>
            </div>

            <div class="stock-form-grid">
              <div class="stock-form-field">
                <label>Stock Symbol</label>
                <input type="text" value="${tx.symbol} (${tx.exchange})" disabled style="opacity:0.7;cursor:not-allowed;background:rgba(255,255,255,0.05);">
              </div>

              <div class="stock-form-field">
                <label>Transaction Date *</label>
                <input type="date" id="editTxDateInput" value="${defaultDate}" required>
              </div>

              <div class="stock-form-field">
                <label>Quantity (Shares) *</label>
                <input type="number" id="editTxQtyInput" step="any" min="0.0001" value="${tx.quantity}" required oninput="window.LM_StockPortfolioUI.updateEditFormPreview()">
              </div>

              <div class="stock-form-field">
                <label>Price per Share (₹) *</label>
                <input type="number" id="editTxPriceInput" step="0.01" min="0.01" value="${tx.price}" required oninput="window.LM_StockPortfolioUI.updateEditFormPreview()">
              </div>

              <div class="stock-form-field">
                <label>Brokerage (₹)</label>
                <input type="number" id="editTxBrokInput" step="0.01" min="0" value="${tx.brokerage || 0}" oninput="window.LM_StockPortfolioUI.updateEditFormPreview()">
              </div>

              <div class="stock-form-field">
                <label>Taxes & Charges (₹ STT/GST)</label>
                <input type="number" id="editTxTaxInput" step="0.01" min="0" value="${tx.taxes || 0}" oninput="window.LM_StockPortfolioUI.updateEditFormPreview()">
              </div>

              <div class="stock-form-field stock-form-full">
                <label>Notes (Optional)</label>
                <textarea id="editTxNotesInput" rows="2" placeholder="e.g. Dividend reinvestment, Profit booked">${(tx.notes || '').replace(/</g, '&lt;')}</textarea>
              </div>
            </div>

            <!-- Real-time Cost Calculation Preview Box -->
            <div class="stock-calc-preview" id="editTxCalcPreview">
              <div class="stock-calc-row">
                <span>Gross Amount (Qty × Price):</span>
                <span id="prevEditGross">₹0.00</span>
              </div>
              <div class="stock-calc-row">
                <span>Total Charges (Brokerage + Tax):</span>
                <span id="prevEditCharges">₹0.00</span>
              </div>
              <div class="stock-calc-row total">
                <span id="prevEditTotalLabel">Net Outflow / Cost:</span>
                <span id="prevEditNet">₹0.00</span>
              </div>
            </div>

            <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
              <button type="button" class="btn-stock-secondary" onclick="window.LM_StockPortfolioUI.closeModal()">Cancel</button>
              <button type="submit" class="btn-stock-primary" id="btnSubmitEditTx">💾 Update Transaction</button>
            </div>
          </form>
        </div>
      </div>
    `;

    setTimeout(updateEditFormPreview, 50);
  }

  function updateEditFormPreview() {
    var calc = getCalculations();
    var qty = Number(document.getElementById('editTxQtyInput')?.value) || 0;
    var price = Number(document.getElementById('editTxPriceInput')?.value) || 0;
    var brok = Number(document.getElementById('editTxBrokInput')?.value) || 0;
    var tax = Number(document.getElementById('editTxTaxInput')?.value) || 0;

    var txTypeRadio = document.querySelector('input[name="editTxType"]:checked');
    var isBuy = !txTypeRadio || txTypeRadio.value === 'BUY';

    var gross = qty * price;
    var charges = brok + tax;
    var net = isBuy ? (gross + charges) : (gross - charges);

    var prevGross = document.getElementById('prevEditGross');
    var prevCharges = document.getElementById('prevEditCharges');
    var prevNet = document.getElementById('prevEditNet');
    var prevTotalLabel = document.getElementById('prevEditTotalLabel');

    if (prevGross) prevGross.textContent = calc.formatINR(gross);
    if (prevCharges) prevCharges.textContent = calc.formatINR(charges);
    if (prevNet) prevNet.textContent = calc.formatINR(net);
    if (prevTotalLabel) prevTotalLabel.textContent = isBuy ? 'Net Outflow / Total Cost:' : 'Net Inflow / Realized Revenue:';
  }

  async function submitEditTransaction(e, txId) {
    e.preventDefault();
    var btn = document.getElementById('btnSubmitEditTx');
    if (btn) btn.disabled = true;

    try {
      var service = getService();
      if (!service) throw new Error('Stock service unavailable');

      var txTypeRadio = document.querySelector('input[name="editTxType"]:checked');
      var txType = txTypeRadio ? txTypeRadio.value : 'BUY';
      var txDate = document.getElementById('editTxDateInput')?.value;
      var qty = document.getElementById('editTxQtyInput')?.value;
      var price = document.getElementById('editTxPriceInput')?.value;
      var brok = document.getElementById('editTxBrokInput')?.value;
      var tax = document.getElementById('editTxTaxInput')?.value;
      var notes = document.getElementById('editTxNotesInput')?.value || '';

      await service.updateTransaction(txId, {
        transaction_type: txType,
        quantity: qty,
        price: price,
        brokerage: brok,
        taxes: tax,
        transaction_date: txDate,
        notes: notes
      });

      closeModal();
      toast('✅ Transaction updated successfully', 'success');
      render();
    } catch (err) {
      toast('❌ Error: ' + err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  /**
   * Open Stock Detail Modal (Holdings, Metrics & Transactions Timeline)
   */
  function openStockDetailModal(holdingId) {
    var service = getService();
    if (!service) return;

    var holding = service.getHoldingById(holdingId);
    if (!holding) return;

    var calc = getCalculations();
    var m = holding.metrics;
    var isPlPos = m.unrealizedPL >= 0;
    var modalContainer = ensureModalContainer();

    modalContainer.innerHTML = `
      <div class="stock-modal-backdrop open" onclick="if(event.target===this) window.LM_StockPortfolioUI.closeModal()">
        <div class="stock-modal" style="max-width:680px;">
          <div class="stock-modal-head">
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="stock-modal-title">${holding.symbol}</span>
                <span class="stock-badge-${holding.exchange.toLowerCase()}">${holding.exchange}</span>
                <span style="font-size:12px;color:var(--text3,#9ca3af);">· ${holding.sector}</span>
              </div>
              <div style="font-size:12px;color:var(--text3,#9ca3af);margin-top:2px;">${holding.company_name}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button class="btn-stock-secondary" style="padding:4px 10px;font-size:12px;" onclick="window.LM_StockPortfolioUI.openEditHoldingModal('${holding.id}')">
                ✏️ Edit Stock
              </button>
              <button class="stock-modal-close" onclick="window.LM_StockPortfolioUI.closeModal()">✕</button>
            </div>
          </div>

          <!-- Performance Metrics Card -->
          <div style="background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);border-radius:14px;padding:16px;margin-bottom:20px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;">
              <div>
                <div style="font-size:11px;color:var(--text3,#9ca3af);">Current Holding</div>
                <div style="font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;">${calc.formatQty(m.quantity)} shares</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text3,#9ca3af);">Avg Buy Price</div>
                <div style="font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;">${calc.formatINR(m.averageBuyPrice)}</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text3,#9ca3af);">Invested Value</div>
                <div style="font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;">${calc.formatINR(m.investedAmount)}</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text3,#9ca3af);">Current Value</div>
                <div style="font-size:16px;font-weight:700;font-family:'JetBrains Mono',monospace;">${calc.formatINR(m.currentValue)}</div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text3,#9ca3af);">Unrealized P&L</div>
                <div class="${isPlPos ? 'stock-pill-gain' : 'stock-pill-loss'}" style="font-size:16px;">
                  ${calc.formatINR(m.unrealizedPL, { showSign: true })} (${calc.formatPercent(m.unrealizedPLPct)})
                </div>
              </div>
              <div>
                <div style="font-size:11px;color:var(--text3,#9ca3af);">Realized P&L</div>
                <div class="${m.realizedPL >= 0 ? 'stock-pill-gain' : 'stock-pill-loss'}" style="font-size:16px;">
                  ${calc.formatINR(m.realizedPL, { showSign: true })}
                </div>
              </div>
            </div>
          </div>

          <!-- Transactions Timeline -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <strong style="font-size:14px;color:var(--text1,#e6eaf3);">Transaction History (${holding.transactions.length})</strong>
            <button class="btn-stock-primary" style="padding:5px 12px;font-size:12px;" onclick="window.LM_StockPortfolioUI.openAddTransactionModal({ symbol: '${holding.symbol}', exchange: '${holding.exchange}', company_name: '${holding.company_name.replace(/'/g, "\\'")}', sector: '${holding.sector}' })">
              + Add Transaction
            </button>
          </div>

          <div style="max-height:260px;overflow-y:auto;border:1px solid var(--border,#1e2436);border-radius:10px;background:var(--bg2,#11151f);">
            <table class="stocks-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Net Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${holding.transactions.slice().reverse().map(function (tx) {
                  var gross = tx.quantity * tx.price;
                  var charges = (Number(tx.brokerage) || 0) + (Number(tx.taxes) || 0);
                  var net = tx.transaction_type === 'BUY' ? (gross + charges) : (gross - charges);

                  return `
                    <tr>
                      <td style="font-family:'JetBrains Mono',monospace;">${tx.transaction_date}</td>
                      <td><span class="tx-badge-${tx.transaction_type.toLowerCase()}">${tx.transaction_type}</span></td>
                      <td style="font-family:'JetBrains Mono',monospace;">${calc.formatQty(tx.quantity)}</td>
                      <td style="font-family:'JetBrains Mono',monospace;">${calc.formatINR(tx.price)}</td>
                      <td style="font-family:'JetBrains Mono',monospace;"><strong>${calc.formatINR(net)}</strong></td>
                      <td>
                        <div class="stock-row-actions">
                          <button class="btn-stock-mini" title="Edit transaction" onclick="window.LM_StockPortfolioUI.openEditTransactionModal('${tx.id}')">
                            ✏️ Edit
                          </button>
                          <button class="btn-stock-mini danger" title="Delete transaction" onclick="window.LM_StockPortfolioUI.confirmDeleteTransaction('${tx.id}')">
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Confirmation dialog before deleting a transaction
   */
  function confirmDeleteTransaction(txId) {
    if (!confirm('Are you sure you want to delete this transaction?\n\nDeleting this record will recalculate your stock holdings, average price, and portfolio P&L.')) {
      return;
    }

    var service = getService();
    if (!service) return;

    service.deleteTransaction(txId)
      .then(function () {
        toast('🗑️ Transaction deleted and portfolio recalculated', 'info');
        closeModal();
        render();
      })
      .catch(function (err) {
        toast('❌ Error: ' + err.message, 'error');
      });
  }

  /**
   * Confirmation dialog before deleting an entire holding
   */
  function confirmDeleteHolding(holdingId) {
    if (!confirm('Are you sure you want to delete this stock holding and all associated buy/sell records?')) {
      return;
    }

    var service = getService();
    if (!service) return;

    service.deleteHolding(holdingId)
      .then(function () {
        toast('🗑️ Holding deleted from portfolio', 'info');
        render();
      })
      .catch(function (err) {
        toast('❌ Error: ' + err.message, 'error');
      });
  }

  /**
   * Export transactions to CSV
   */
  function exportTransactionsCSV() {
    var service = getService();
    var txs = service ? service.getAllTransactions() : [];
    if (txs.length === 0) {
      toast('No transactions to export', 'warning');
      return;
    }

    var headers = ['Date', 'Symbol', 'Company', 'Exchange', 'Sector', 'Type', 'Quantity', 'Price (INR)', 'Gross Amount', 'Brokerage', 'Taxes', 'Net Amount', 'Notes'];
    var rows = txs.map(t => [
      t.transaction_date,
      t.symbol,
      `"${(t.company_name || '').replace(/"/g, '""')}"`,
      t.exchange,
      t.sector,
      t.transaction_type,
      t.quantity,
      t.price,
      t.gross_amount,
      t.brokerage,
      t.taxes,
      t.net_amount,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    var csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(',')].concat(rows.map(r => r.join(','))).join('\n');
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'LedgerMate_Stock_Transactions_' + new Date().toISOString().split('T')[0] + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('📥 Transactions exported to CSV', 'success');
  }

  /**
   * Refresh Live Market Quotes handler
   */
  async function handleRefreshPrices() {
    var btn = document.getElementById('btnRefreshPrices');
    if (btn) {
      btn.classList.add('loading');
      btn.disabled = true;
    }

    try {
      var service = getService();
      if (service) {
        await service.refreshMarketQuotes(true);
        toast('🔄 Live Indian stock prices updated', 'success');
      }
    } catch (e) {
      toast('Market price refresh notice: using latest cached data', 'info');
    } finally {
      if (btn) {
        btn.classList.remove('loading');
        btn.disabled = false;
      }
      render();
    }
  }

  function closeModal() {
    var modalContainer = ensureModalContainer();
    if (modalContainer) modalContainer.innerHTML = '';
  }

  var LM_StockPortfolioUI = {
    init: function () {
      var service = getService();
      if (service) {
        service.init().then(function () {
          render();
          service.refreshMarketQuotes(true);
        });
      }

      if (window.LM_Bus) {
        window.LM_Bus.on('lm:stocks:changed', render);
        window.LM_Bus.on('lm:stocks:quotes_updated', render);
      }
    },

    render: render,
    switchTab: function (tab) {
      _activeTab = tab;
      render();
    },
    handleSearch: function (val) {
      _searchQuery = val || '';
      render();
    },
    handleSectorFilter: function (sector) {
      _sectorFilter = sector || 'ALL';
      render();
    },
    handleSort: function (val) {
      var parts = (val || 'value_desc').split('_');
      _sortField = parts[0];
      _sortOrder = parts[1] || 'desc';
      render();
    },
    handleTxTypeFilter: function (type) {
      _txTypeFilter = type || 'ALL';
      render();
    },
    handleTxExchangeFilter: function (ex) {
      _txExchangeFilter = ex || 'ALL';
      render();
    },
    openAddTransactionModal: openAddTransactionModal,
    openEditHoldingModal: openEditHoldingModal,
    submitEditHolding: submitEditHolding,
    openEditTransactionModal: openEditTransactionModal,
    updateEditFormPreview: updateEditFormPreview,
    submitEditTransaction: submitEditTransaction,
    autofetchStockPrice: autofetchStockPrice,
    openStockDetailModal: openStockDetailModal,
    handleSymbolSearch: handleSymbolSearch,
    selectStockSuggestion: selectStockSuggestion,
    updateFormPreview: updateFormPreview,
    submitAddTransaction: submitAddTransaction,
    confirmDeleteTransaction: confirmDeleteTransaction,
    confirmDeleteHolding: confirmDeleteHolding,
    exportTransactionsCSV: exportTransactionsCSV,
    handleRefreshPrices: handleRefreshPrices,
    closeModal: closeModal
  };

  window.LM_StockPortfolioUI = LM_StockPortfolioUI;
})();
