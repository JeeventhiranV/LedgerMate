/**
 * LedgerMate – Investments Module (Next-Gen Digital Banking Experience)
 * ──────────────────────────────────────────────────────────────────
 * Multi-asset wealth management, SIP compounding projections,
 * FD/RD maturity schedules, Gold/SGB tracking, Section 80C tax tracker,
 * and executive visual analytics.
 * Exposes: window.LM_InvestmentsUI
 * ──────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _activeFilter = 'all';
  var _searchQuery = '';
  var _showSimulator = true;
  var _chartInstance = null;

  // ── Helpers & Formatting ──────────────────────────────────────────
  function _fmtINR(num) {
    if (typeof fmtINR === 'function') return fmtINR(num);
    var n = Number(num) || 0;
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  function _toNum(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function _escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function _getCompoundingFreq(freq) {
    switch ((freq || '').toLowerCase()) {
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'half-yearly': return 2;
      case 'yearly': return 1;
      default: return 4; // default Indian bank FD = quarterly compounding
    }
  }

  // ── Financial Calculation Algorithms ──────────────────────────────
  function calculateMaturity(inv) {
    if (!inv || !inv.type) return 0;
    var P = _toNum(inv.principal || inv.amount);
    var r = _toNum(inv.rate) / 100;
    var months = Math.max(0, _toNum(inv.tenureMonths));
    var t = months / 12;
    var add = _toNum(inv.additionalDeposit);

    if (inv.type === 'FD') {
      var n = _getCompoundingFreq(inv.compounding || 'quarterly');
      var matFD = P * Math.pow(1 + r / n, n * t);
      return Number(matFD.toFixed(2));
    }

    if (inv.type === 'RD') {
      var nRD = 12;
      var deposit = add > 0 ? add : P;
      if (deposit <= 0 || months <= 0) return 0;
      var rp = r / nRD;
      var matRD = deposit * ((Math.pow(1 + rp, months) - 1) / rp) * (1 + rp);
      return Number(matRD.toFixed(2));
    }

    if (inv.type === 'SIP') {
      var sip = _toNum(inv.sipMonthly || add || P);
      var expRet = _toNum(inv.sipReturn || inv.rate || 12) / 100;
      var i = expRet / 12;
      if (sip <= 0 || months <= 0) return 0;
      // Future Value of Annuity Due: P * [((1+i)^n - 1) / i] * (1+i)
      var fv = sip * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
      return Number(fv.toFixed(2));
    }

    if (inv.type === 'GOLD' || inv.type === 'SGB') {
      var grams = _toNum(inv.goldGrams || inv.qty || 1);
      var buyPrice = _toNum(inv.stockBuyPrice || inv.principal || 6500);
      var curPrice = _toNum(inv.stockCurrentPrice || inv.currentPrice || buyPrice);
      var goldVal = grams * curPrice;
      // If SGB, add 2.5% p.a. sovereign coupon interest
      if (inv.type === 'SGB' && t > 0) {
        var couponInterest = grams * buyPrice * 0.025 * t;
        goldVal += couponInterest;
      }
      return Number(goldVal.toFixed(2));
    }

    if (inv.type === 'PPF' || inv.type === 'EPF' || inv.type === 'NPS') {
      var annual = _toNum(inv.additionalDeposit || inv.principal);
      var ratePPF = _toNum(inv.rate || 7.1) / 100;
      var fvPPF = P;
      for (var y = 1; y <= Math.ceil(t); y++) {
        fvPPF = (fvPPF + annual) * (1 + ratePPF);
      }
      return Number(fvPPF.toFixed(2));
    }

    if (inv.type === 'STOCK') {
      var qty = _toNum(inv.stockQty);
      var cur = _toNum(inv.stockCurrentPrice);
      var buy = _toNum(inv.stockBuyPrice);
      var price = cur > 0 ? cur : buy;
      return Number((qty * price).toFixed(2));
    }

    // Default Fallback
    var defaultVal = P * (1 + r * t);
    return Number(defaultVal.toFixed(2));
  }

  function calculateMaturityDate(inv) {
    if (!inv || !inv.startDate || !inv.tenureMonths) return '';
    var start = new Date(inv.startDate);
    if (isNaN(start.getTime())) return '';
    start.setMonth(start.getMonth() + _toNum(inv.tenureMonths));
    return start.toISOString().split('T')[0];
  }

  function calculateDaysLeft(maturityDate) {
    if (!maturityDate) return 0;
    var today = new Date();
    var mat = new Date(maturityDate);
    if (isNaN(mat.getTime())) return 0;
    var diff = Math.ceil((mat - today) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  }

  function isClosedOrMatured(inv) {
    if (!inv) return false;
    var status = String(inv.status || '').toLowerCase().trim();
    if (['closed', 'matured', 'liquidated', 'redeemed', 'completed', 'inactive', 'sold', 'exited'].includes(status)) {
      return true;
    }
    if (inv.isClosed === true || inv.closed === true || inv.isMatured === true || inv.matured === true) {
      return true;
    }
    var matDate = inv.maturityDate || calculateMaturityDate(inv);
    if (!matDate && inv.startDate && inv.tenureMonths) {
      var start = new Date(inv.startDate);
      if (!isNaN(start.getTime())) {
        start.setMonth(start.getMonth() + _toNum(inv.tenureMonths));
        matDate = start.toISOString().split('T')[0];
      }
    }
    if (matDate) {
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var mat = new Date(matDate);
      if (!isNaN(mat.getTime()) && mat < today) {
        return true;
      }
    }
    return false;
  }

  function calculateInvestedSoFar(inv, allowClosed) {
    if (!inv) return 0;
    if (!allowClosed && isClosedOrMatured(inv)) return 0;
    var P = _toNum(inv.principal || inv.amount);
    var add = _toNum(inv.additionalDeposit);
    var months = _toNum(inv.tenureMonths);

    if (inv.type === 'FD') return P;
    if (inv.type === 'RD') return (add > 0 ? add : P) * months;
    if (inv.type === 'SIP') return _toNum(inv.sipMonthly || add || P) * months;
    if (inv.type === 'STOCK') return _toNum(inv.stockQty) * _toNum(inv.stockBuyPrice);
    if (inv.type === 'GOLD' || inv.type === 'SGB') return _toNum(inv.goldGrams || inv.qty || 1) * _toNum(inv.stockBuyPrice || P);
    if (inv.type === 'PPF' || inv.type === 'EPF' || inv.type === 'NPS') return P + (add * (months / 12));
    return P;
  }

  function calculateHistoricalInvested(inv) {
    return calculateInvestedSoFar(inv, true);
  }

  function calculateInterestSoFar(inv) {
    if (!inv || !inv.startDate) return 0;
    var start = new Date(inv.startDate);
    var today = new Date();
    if (isNaN(start.getTime())) return 0;

    var diffMs = today - start;
    if (diffMs <= 0) return 0;

    var elapsedMonths = Math.min(_toNum(inv.tenureMonths || 120), Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
    if (elapsedMonths <= 0) return 0;

    var r = _toNum(inv.rate) / 100;
    var P = _toNum(inv.principal || inv.amount);
    var add = _toNum(inv.additionalDeposit);

    if (inv.type === 'FD') {
      var n = _getCompoundingFreq(inv.compounding || 'quarterly');
      var valElapsed = P * Math.pow(1 + r / n, n * (elapsedMonths / 12));
      return Number(Math.max(0, valElapsed - P).toFixed(2));
    }

    if (inv.type === 'RD') {
      var nRD = 12;
      var deposit = add > 0 ? add : P;
      if (deposit <= 0) return 0;
      var rp = r / nRD;
      var valRDElapsed = deposit * ((Math.pow(1 + rp, elapsedMonths) - 1) / rp) * (1 + rp);
      var investedRD = deposit * elapsedMonths;
      return Number(Math.max(0, valRDElapsed - investedRD).toFixed(2));
    }

    if (inv.type === 'SIP') {
      var sip = _toNum(inv.sipMonthly || add || P);
      var ret = _toNum(inv.sipReturn || inv.rate || 12) / 100;
      if (sip <= 0) return 0;
      var i = ret / 12;
      var fvElapsed = sip * ((Math.pow(1 + i, elapsedMonths) - 1) / i) * (1 + i);
      var investedSIP = sip * elapsedMonths;
      return Number(Math.max(0, fvElapsed - investedSIP).toFixed(2));
    }

    if (inv.type === 'GOLD' || inv.type === 'SGB') {
      var grams = _toNum(inv.goldGrams || inv.qty || 1);
      var buy = _toNum(inv.stockBuyPrice || P);
      var cur = _toNum(inv.stockCurrentPrice || buy);
      var gain = grams * (cur - buy);
      if (inv.type === 'SGB') {
        gain += (grams * buy * 0.025 * (elapsedMonths / 12));
      }
      return Number(gain.toFixed(2));
    }

    if (inv.type === 'STOCK') {
      var qty = _toNum(inv.stockQty);
      var curP = _toNum(inv.stockCurrentPrice);
      var buyP = _toNum(inv.stockBuyPrice);
      return Number((qty * ((curP || buyP) - buyP)).toFixed(2));
    }

    return Number((P * r * (elapsedMonths / 12)).toFixed(2));
  }

  // ── Asset Type Metas ──────────────────────────────────────────────
  var ASSET_TYPES = {
    SIP:  { label: 'Mutual Fund / SIP', icon: '📈', badgeCls: 'type-badge-sip',  color: '#10b981', category: 'Equities' },
    FD:   { label: 'Fixed Deposit (FD)', icon: '🏛️', badgeCls: 'type-badge-fd',   color: '#3b82f6', category: 'Fixed Income' },
    RD:   { label: 'Recurring Deposit',  icon: '🔄', badgeCls: 'type-badge-rd',   color: '#8b5cf6', category: 'Fixed Income' },
    GOLD: { label: 'Gold & SGB',         icon: '🥇', badgeCls: 'type-badge-gold', color: '#f59e0b', category: 'Commodities' },
    SGB:  { label: 'Sovereign Gold Bond',icon: '📜', badgeCls: 'type-badge-gold', color: '#f59e0b', category: 'Commodities' },
    PPF:  { label: 'PPF / EPF / NPS',    icon: '🛡️', badgeCls: 'type-badge-ppf',  color: '#14b8a6', category: 'Retirement' },
    STOCK:{ label: 'Direct Stocks',      icon: '📊', badgeCls: 'type-badge-sip',  color: '#00f0ff', category: 'Equities' },
    BONDS:{ label: 'Bonds & NCDs',       icon: '📄', badgeCls: 'type-badge-oth',  color: '#6366f1', category: 'Fixed Income' },
    OTHER:{ label: 'Real Estate / Other',icon: '💎', badgeCls: 'type-badge-oth',  color: '#94a3b8', category: 'Alternates' }
  };

  // ── UI Controller ─────────────────────────────────────────────────
  var InvestmentsUI = {
    /**
     * Main Render Method for #page-investments
     */
    render: function () {
      var container = document.getElementById('page-investments');
      if (!container) return;

      var invs = Array.isArray(state.investments) ? state.investments : [];

      // Calculate Portfolio Totals (Only Active Investments count towards invested capital)
      var totalInvested = 0;
      var totalMaturity = 0;
      var totalInterestSoFar = 0;
      var monthlySIPInflow = 0;
      var tax80CTotal = 0;
      var activeCount = 0;
      var maturedCount = 0;

      var categoryMap = { 'Equities': 0, 'Fixed Income': 0, 'Commodities': 0, 'Retirement': 0, 'Alternates': 0 };

      invs.forEach(function (inv) {
        var isClosed = isClosedOrMatured(inv);
        var invested = calculateInvestedSoFar(inv);
        var mat = calculateMaturity(inv);
        var interest = calculateInterestSoFar(inv);

        if (isClosed) {
          maturedCount++;
        } else {
          activeCount++;
          // Only active investments are counted in active invested capital & valuation
          totalInvested += invested;
          totalMaturity += mat;
          totalInterestSoFar += interest;

          if (inv.type === 'SIP') {
            monthlySIPInflow += _toNum(inv.sipMonthly || inv.additionalDeposit || inv.principal);
          } else if (inv.type === 'RD') {
            monthlySIPInflow += _toNum(inv.additionalDeposit);
          }

          // 80C Tax-Saver estimation (active only)
          if (inv.is80C || inv.type === 'PPF' || inv.type === 'EPF' || (inv.name && /elss|tax saver|ppf|epf/i.test(inv.name))) {
            tax80CTotal += invested;
          }

          var meta = ASSET_TYPES[inv.type] || ASSET_TYPES.OTHER;
          var cat = meta.category || 'Alternates';
          categoryMap[cat] = (categoryMap[cat] || 0) + (mat > 0 ? mat : invested);
        }
      });

      var currentPortfolioValue = totalInvested + totalInterestSoFar;
      var netProfit = currentPortfolioValue - totalInvested;
      var avgROI = totalInvested > 0 ? ((netProfit / totalInvested) * 100).toFixed(2) : '0.00';
      var gainCls = netProfit >= 0 ? 'badge-gain' : 'badge-loss';
      var gainSign = netProfit >= 0 ? '+' : '';

      // Filter and Search
      var filteredInvs = invs.filter(function (inv) {
        var isClosed = isClosedOrMatured(inv);
        if (_activeFilter === 'active' && isClosed) return false;
        if (_activeFilter === 'closed' && !isClosed) return false;
        if (_activeFilter === 'sip' && inv.type !== 'SIP') return false;
        if (_activeFilter === 'fd_rd' && inv.type !== 'FD' && inv.type !== 'RD') return false;
        if (_activeFilter === 'gold' && inv.type !== 'GOLD' && inv.type !== 'SGB') return false;
        if (_activeFilter === 'ppf' && inv.type !== 'PPF' && inv.type !== 'EPF' && inv.type !== 'NPS') return false;
        if (_activeFilter === 'maturing_soon') {
          if (isClosed) return false;
          var days = calculateDaysLeft(calculateMaturityDate(inv));
          if (days > 60 || days === 0) return false;
        }

        if (_searchQuery) {
          var q = _searchQuery.toLowerCase();
          var name = (inv.name || inv.bankName || inv.bank_name || '').toLowerCase();
          var type = (inv.type || '').toLowerCase();
          var notes = (inv.notes || '').toLowerCase();
          if (!name.includes(q) && !type.includes(q) && !notes.includes(q)) return false;
        }

        return true;
      });

      var html = `
        <div class="inv-container">

          <!-- ─── Header ─── -->
          <div class="inv-header">
            <div class="inv-title-area">
              <h1><span>📊</span> Investment Portfolio &amp; Wealth Engine</h1>
              <p>Track Mutual Funds, FDs, RDs, Gold, PPF &amp; Compound Wealth Projections</p>
            </div>
            <div class="inv-header-actions">
              <button class="inv-calc-toggle-btn" onclick="window.LM_InvestmentsUI.toggleSimulator()">
                <span>🧮</span> ${_showSimulator ? 'Hide SIP Simulator' : 'Show SIP Simulator'}
              </button>
              <button class="inv-add-btn" onclick="window.LM_InvestmentsUI.showAddEditModal()">
                <span>＋</span> Add Investment
              </button>
            </div>
          </div>

          <!-- ─── Executive KPI Grid ─── -->
          <div class="inv-kpi-grid">
            <div class="inv-kpi-card" style="--kpi-accent: var(--teal);">
              <div class="inv-kpi-header">
                <span class="inv-kpi-label">Active Portfolio Value</span>
                <span class="inv-kpi-icon">💼</span>
              </div>
              <div class="inv-kpi-val">${_fmtINR(currentPortfolioValue)}</div>
              <div class="inv-kpi-sub">
                <span class="inv-badge-pill ${gainCls}">${gainSign}${_fmtINR(netProfit)} (${gainSign}${avgROI}%)</span>
                <span>active returns</span>
              </div>
            </div>

            <div class="inv-kpi-card" style="--kpi-accent: var(--blue, #38bdf8);">
              <div class="inv-kpi-header">
                <span class="inv-kpi-label">Active Invested Capital</span>
                <span class="inv-kpi-icon">💰</span>
              </div>
              <div class="inv-kpi-val">${_fmtINR(totalInvested)}</div>
              <div class="inv-kpi-sub">Across ${activeCount} active assets ${maturedCount > 0 ? `(${maturedCount} matured)` : ''}</div>
            </div>

            <div class="inv-kpi-card" style="--kpi-accent: var(--emerald);">
              <div class="inv-kpi-header">
                <span class="inv-kpi-label">Projected Maturity Wealth</span>
                <span class="inv-kpi-icon">🏆</span>
              </div>
              <div class="inv-kpi-val" style="color: var(--emerald);">${_fmtINR(totalMaturity)}</div>
              <div class="inv-kpi-sub">
                <span>Accrued so far: </span>
                <strong style="color:var(--text);">${_fmtINR(totalInterestSoFar)}</strong>
              </div>
            </div>

            <div class="inv-kpi-card" style="--kpi-accent: var(--violet);">
              <div class="inv-kpi-header">
                <span class="inv-kpi-label">Monthly SIP Commitment</span>
                <span class="inv-kpi-icon">🔄</span>
              </div>
              <div class="inv-kpi-val" style="color: var(--violet);">${_fmtINR(monthlySIPInflow)}/mo</div>
              <div class="inv-kpi-sub">Annual run-rate: ${_fmtINR(monthlySIPInflow * 12)}</div>
            </div>
          </div>

          <!-- ─── Interactive SIP & Wealth Simulator (Collapsible) ─── -->
          ${_showSimulator ? this.renderSimulatorHTML() : ''}

          <!-- ─── Analytics & Allocation Row ─── -->
          <div class="inv-analytics-row">
            
            <!-- Asset Allocation Donut -->
            <div class="inv-analytics-card">
              <div class="inv-card-header">
                <div class="inv-card-title"><span>🥧</span> Active Asset Diversification</div>
                <span style="font-size:12px; color:var(--text-3);">${activeCount} active holdings</span>
              </div>
              <div class="inv-chart-container">
                <canvas id="invAssetChart" style="max-height: 220px;"></canvas>
              </div>
            </div>

            <!-- Tax Saving 80C & Milestone Health -->
            <div class="inv-analytics-card">
              <div class="inv-card-header">
                <div class="inv-card-title"><span>🛡️</span> Tax Saving (80C) &amp; Milestones</div>
                <span style="font-size:12px; color:var(--emerald); font-weight:700;">FY 2026-27</span>
              </div>

              <!-- 80C Progress -->
              <div class="inv-tax-box">
                <div class="inv-tax-header">
                  <span>Section 80C Limit (₹1.50 Lakh)</span>
                  <span style="color:var(--text); font-weight:700;">${_fmtINR(Math.min(150000, tax80CTotal))} / ₹1,50,000</span>
                </div>
                <div class="inv-tax-progress-bar">
                  <div class="inv-tax-fill" style="width: ${Math.min(100, (tax80CTotal / 150000) * 100)}%;"></div>
                </div>
                <div style="font-size: 11px; color: var(--text-3); display: flex; justify-content: space-between;">
                  <span>${tax80CTotal >= 150000 ? '✅ 100% 80C Limit Utilized' : 'Remaining: ' + _fmtINR(Math.max(0, 150000 - tax80CTotal))}</span>
                  <span>PPF, ELSS, EPF, Tax FD</span>
                </div>
              </div>

              <!-- Upcoming Maturities Alert -->
              <div style="background:var(--surface, rgba(255,255,255,0.03)); border:1px solid var(--border); border-radius:14px; padding:14px;">
                <div style="font-size:12px; font-weight:700; color:var(--text-2); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                  <span>🔔</span> Upcoming Maturity Schedule (Next 90 Days)
                </div>
                ${this.renderUpcomingMaturitiesHTML(invs)}
              </div>

            </div>

          </div>

          <!-- ─── Toolbar & Filters ─── -->
          <div class="inv-toolbar">
            <div class="inv-filters">
              <button class="inv-filter-pill ${_activeFilter === 'all' ? 'active' : ''}" onclick="window.LM_InvestmentsUI.setFilter('all')">
                All (${invs.length})
              </button>
              <button class="inv-filter-pill ${_activeFilter === 'active' ? 'active' : ''}" onclick="window.LM_InvestmentsUI.setFilter('active')">
                ✅ Active (${activeCount})
              </button>
              <button class="inv-filter-pill ${_activeFilter === 'sip' ? 'active' : ''}" onclick="window.LM_InvestmentsUI.setFilter('sip')">
                📈 SIP &amp; MF
              </button>
              <button class="inv-filter-pill ${_activeFilter === 'fd_rd' ? 'active' : ''}" onclick="window.LM_InvestmentsUI.setFilter('fd_rd')">
                🏛️ FD / RD
              </button>
              <button class="inv-filter-pill ${_activeFilter === 'gold' ? 'active' : ''}" onclick="window.LM_InvestmentsUI.setFilter('gold')">
                🥇 Gold &amp; SGB
              </button>
              <button class="inv-filter-pill ${_activeFilter === 'ppf' ? 'active' : ''}" onclick="window.LM_InvestmentsUI.setFilter('ppf')">
                🛡️ PPF / EPF
              </button>
              <button class="inv-filter-pill ${_activeFilter === 'maturing_soon' ? 'active' : ''}" onclick="window.LM_InvestmentsUI.setFilter('maturing_soon')">
                ⏳ Maturing Soon
              </button>
              ${maturedCount > 0 ? `
                <button class="inv-filter-pill ${_activeFilter === 'closed' ? 'active' : ''}" onclick="window.LM_InvestmentsUI.setFilter('closed')">
                  🔒 Closed / Matured (${maturedCount})
                </button>
              ` : ''}
            </div>

            <div class="inv-search-wrap">
              <span class="inv-search-icon">🔍</span>
              <input type="text" class="inv-search-input" placeholder="Search investments, bank, fund..." value="${_escape(_searchQuery)}" oninput="window.LM_InvestmentsUI.handleSearch(this.value)">
            </div>
          </div>

          <!-- ─── Holdings Cards Grid ─── -->
          ${filteredInvs.length === 0 ? this.renderEmptyStateHTML() : `
            <div class="inv-grid">
              ${filteredInvs.map(inv => this.renderInvestmentCardHTML(inv)).join('')}
            </div>
          `}

        </div>
      `;

      container.innerHTML = html;

      // Render Asset Allocation Donut
      this.initAssetChart(categoryMap);
      if (_showSimulator) {
        this.updateSimulatorCalc();
      }
    },

    /**
     * Render Interactive SIP Compounding Simulator
     */
    renderSimulatorHTML: function () {
      return `
        <div class="inv-simulator-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px;">
            <div>
              <h3 style="font-size:1.15rem; font-weight:700; color:var(--text); margin:0; font-family:var(--font-h);">
                🚀 Smart SIP &amp; Wealth Compounding Simulator
              </h3>
              <p style="font-size:0.8rem; color:var(--text-3); margin:3px 0 0 0;">
                Project your future corpus growth with monthly compounding power
              </p>
            </div>
            <span class="inv-badge-pill badge-gain" style="padding:4px 10px; font-size:11px;">8th Wonder: Compounding</span>
          </div>

          <div class="inv-sim-grid">
            <div>
              <!-- Monthly SIP Slider -->
              <div class="inv-slider-group">
                <div class="inv-slider-label-row">
                  <span>Monthly Investment</span>
                  <span class="inv-slider-val" id="simMonthlyLabel">₹10,000</span>
                </div>
                <input type="range" class="inv-range-input" id="simMonthlyInput" min="500" max="200000" step="500" value="10000" oninput="window.LM_InvestmentsUI.updateSimulatorCalc()">
              </div>

              <!-- Expected Annual Return Slider -->
              <div class="inv-slider-group">
                <div class="inv-slider-label-row">
                  <span>Expected Annual Return (CAGR)</span>
                  <span class="inv-slider-val" id="simRateLabel">12% p.a.</span>
                </div>
                <input type="range" class="inv-range-input" id="simRateInput" min="4" max="25" step="0.5" value="12" oninput="window.LM_InvestmentsUI.updateSimulatorCalc()">
              </div>

              <!-- Time Horizon Slider -->
              <div class="inv-slider-group" style="margin-bottom:0;">
                <div class="inv-slider-label-row">
                  <span>Time Horizon (Tenure)</span>
                  <span class="inv-slider-val" id="simYearsLabel">10 Years</span>
                </div>
                <input type="range" class="inv-range-input" id="simYearsInput" min="1" max="30" step="1" value="10" oninput="window.LM_InvestmentsUI.updateSimulatorCalc()">
              </div>
            </div>

            <div class="inv-sim-result-box">
              <div style="font-size:0.75rem; text-transform:uppercase; color:var(--text-3); font-weight:700; letter-spacing:0.05em;">
                Estimated Maturity Corpus
              </div>
              <div class="inv-sim-result-highlight" id="simCorpusResult">₹23,23,391</div>

              <div class="inv-sim-ratio-bar">
                <div class="ratio-invested" id="simRatioInvested" style="width: 51%;"></div>
                <div class="ratio-wealth" id="simRatioWealth" style="width: 49%;"></div>
              </div>

              <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px; text-align:left;">
                <div style="background:var(--bg3); padding:8px 10px; border-radius:10px;">
                  <div style="color:var(--text-3); font-size:11px;">Total Invested</div>
                  <div style="font-weight:700; color:var(--teal); font-family:var(--font-m);" id="simTotalInvested">₹12,00,000</div>
                </div>
                <div style="background:var(--bg3); padding:8px 10px; border-radius:10px;">
                  <div style="color:var(--text-3); font-size:11px;">Wealth Gain (Profit)</div>
                  <div style="font-weight:700; color:var(--emerald); font-family:var(--font-m);" id="simWealthGain">₹11,23,391</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    /**
     * Update SIP Simulator Calculations in real-time
     */
    updateSimulatorCalc: function () {
      var monthly = parseFloat(document.getElementById('simMonthlyInput')?.value) || 10000;
      var rate = parseFloat(document.getElementById('simRateInput')?.value) || 12;
      var years = parseInt(document.getElementById('simYearsInput')?.value, 10) || 10;

      var monthlyLabel = document.getElementById('simMonthlyLabel');
      var rateLabel = document.getElementById('simRateLabel');
      var yearsLabel = document.getElementById('simYearsLabel');

      if (monthlyLabel) monthlyLabel.textContent = _fmtINR(monthly);
      if (rateLabel) rateLabel.textContent = rate + '% p.a.';
      if (yearsLabel) yearsLabel.textContent = years + (years === 1 ? ' Year' : ' Years');

      var months = years * 12;
      var i = (rate / 100) / 12;
      var maturityCorpus = monthly * ((Math.pow(1 + i, months) - 1) / i) * (1 + i);
      var investedAmount = monthly * months;
      var wealthGain = Math.max(0, maturityCorpus - investedAmount);

      var corpusEl = document.getElementById('simCorpusResult');
      var invEl = document.getElementById('simTotalInvested');
      var gainEl = document.getElementById('simWealthGain');
      var barInv = document.getElementById('simRatioInvested');
      var barGain = document.getElementById('simRatioWealth');

      if (corpusEl) corpusEl.textContent = _fmtINR(maturityCorpus);
      if (invEl) invEl.textContent = _fmtINR(investedAmount);
      if (gainEl) gainEl.textContent = '+' + _fmtINR(wealthGain);

      var pctInv = Math.round((investedAmount / Math.max(1, maturityCorpus)) * 100);
      var pctGain = 100 - pctInv;

      if (barInv) barInv.style.width = pctInv + '%';
      if (barGain) barGain.style.width = pctGain + '%';
    },

    /**
     * Render Upcoming Maturities schedule
     */
    renderUpcomingMaturitiesHTML: function (invs) {
      var upcoming = [];
      invs.forEach(function (inv) {
        if (isClosedOrMatured(inv)) return; // Skip already closed or matured
        var matDate = calculateMaturityDate(inv);
        var days = calculateDaysLeft(matDate);
        if (days > 0 && days <= 90) {
          upcoming.push({ inv: inv, matDate: matDate, days: days, maturity: calculateMaturity(inv) });
        }
      });

      if (upcoming.length === 0) {
        return `<div style="font-size:12px; color:var(--text-3); padding:4px 0;">No active deposits or bonds maturing in next 90 days. All schemes healthy.</div>`;
      }

      upcoming.sort(function (a, b) { return a.days - b.days; });

      return `
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${upcoming.slice(0, 3).map(u => `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:4px 0; border-bottom:1px dashed var(--border-subtle);">
              <div>
                <strong style="color:var(--text);">${_escape(u.inv.name || u.inv.bankName || 'Deposit')}</strong>
                <span style="color:var(--text-3); font-size:11px; margin-left:4px;">(${u.days} days left)</span>
              </div>
              <div style="color:var(--emerald); font-weight:700; font-family:var(--font-m);">
                ${_fmtINR(u.maturity)}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    },

    /**
     * Render Single Investment Holding Card
     */
    renderInvestmentCardHTML: function (inv) {
      var meta = ASSET_TYPES[inv.type] || ASSET_TYPES.OTHER;
      var isClosed = isClosedOrMatured(inv);
      var invested = calculateInvestedSoFar(inv);
      var maturity = calculateMaturity(inv);
      var interest = calculateInterestSoFar(inv);
      var matDate = calculateMaturityDate(inv);
      var daysLeft = calculateDaysLeft(matDate);

      var progress = 0;
      if (inv.tenureMonths && inv.startDate) {
        var start = new Date(inv.startDate);
        var today = new Date();
        if (!isNaN(start.getTime())) {
          var elapsedMonths = Math.max(0, Math.floor((today - start) / (1000 * 60 * 60 * 24 * 30.4375)));
          progress = Math.min(100, Math.max(0, Math.round((elapsedMonths / _toNum(inv.tenureMonths)) * 100)));
        }
      }

      var rateDisplay = inv.rate ? inv.rate + '% p.a.' : (inv.sipReturn ? inv.sipReturn + '% Exp' : '-');
      var titleName = inv.name || inv.bankName || inv.fundName || (meta.label + ' Item');
      var institution = inv.institution || inv.bank || (inv.type === 'FD' || inv.type === 'RD' ? 'Bank Deposit' : 'Portfolio Asset');

      var historicalInvested = calculateHistoricalInvested(inv);

      return `
        <div class="inv-card ${isClosed ? 'inv-card-closed' : ''}" style="${isClosed ? 'opacity: 0.82; border-color: rgba(239,68,68,0.25);' : ''}">
          <div>
            <div class="inv-card-top">
              <div class="inv-card-badge-wrap">
                <div class="inv-type-avatar">${meta.icon}</div>
                <div>
                  <h3 class="inv-card-name">${_escape(titleName)}</h3>
                  <div class="inv-card-sub">
                    ${_escape(institution)} · 
                    ${isClosed 
                      ? '<span class="inv-type-badge type-badge-closed" style="background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3);padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;">🔒 Matured / Closed</span>' 
                      : `<span class="inv-type-badge ${meta.badgeCls}">${meta.label}</span>`}
                  </div>
                </div>
              </div>
              <span class="inv-badge-pill ${isClosed ? 'badge-loss' : (interest >= 0 ? 'badge-gain' : 'badge-loss')}">
                ${isClosed ? 'Closed / Matured' : rateDisplay}
              </span>
            </div>

            <!-- Financial Metrics Grid -->
            <div class="inv-card-metrics" style="margin-top:14px;">
              <div>
                <div class="inv-metric-label">Invested Capital</div>
                <div class="inv-metric-val" style="${isClosed ? 'color:var(--text-3);text-decoration:line-through;' : ''}">${_fmtINR(isClosed ? historicalInvested : invested)}</div>
                ${isClosed ? '<div style="font-size:10px;color:var(--rose,#fb7185);font-weight:600;margin-top:2px;">₹0 Active (Closed)</div>' : ''}
              </div>
              <div>
                <div class="inv-metric-label">Maturity / Current</div>
                <div class="inv-metric-val gain">${_fmtINR(maturity)}</div>
              </div>
              <div>
                <div class="inv-metric-label">Interest Earned</div>
                <div class="inv-metric-val gold">+${_fmtINR(interest)}</div>
              </div>
              <div>
                <div class="inv-metric-label">Maturity Date</div>
                <div class="inv-metric-val" style="font-size:0.82rem;">${matDate || 'Ongoing'}</div>
              </div>
            </div>

            <!-- Maturity Progress Bar -->
            ${inv.tenureMonths ? `
              <div class="inv-progress-wrap" style="margin-top:12px;">
                <div class="inv-progress-header">
                  <span>Tenure Progress: ${progress}%</span>
                  <span>${isClosed ? '🔒 Matured / Closed' : (daysLeft > 0 ? daysLeft + ' days left' : 'Matured')}</span>
                </div>
                <div class="inv-progress-track">
                  <div class="inv-progress-fill" style="width: ${progress}%; ${isClosed ? 'background:var(--rose,#fb7185);' : ''}"></div>
                </div>
              </div>
            ` : ''}

            ${inv.notes ? `
              <div style="font-size:11px; color:var(--text-3); margin-top:8px; font-style:italic;">
                📝 ${_escape(inv.notes)}
              </div>
            ` : ''}
          </div>

          <!-- Actions -->
          <div class="inv-card-actions">
            <span style="font-size:11px; color:var(--text-3);">${inv.startDate ? 'Started: ' + inv.startDate : ''}</span>
            <div style="display:flex; gap:6px; align-items:center;">
              <button type="button" class="inv-action-btn" onclick="window.LM_InvestmentsUI.toggleStatus('${inv.id}')" title="${isClosed ? 'Reactivate Investment' : 'Mark as Closed / Matured'}" style="font-size:11px; padding:4px 8px;">
                ${isClosed ? '🔓 Activate' : '🔒 Close'}
              </button>
              <button type="button" class="inv-action-btn" onclick="window.LM_InvestmentsUI.showAddEditModal('${inv.id}')" title="Edit Investment">
                ✏️
              </button>
              <button type="button" class="inv-action-btn delete" onclick="window.LM_InvestmentsUI.confirmDelete('${inv.id}')" title="Delete Investment">
                🗑️
              </button>
            </div>
          </div>
        </div>
      `;
    },

    /**
     * Render Empty State
     */
    renderEmptyStateHTML: function () {
      return `
        <div class="inv-empty-state">
          <div class="inv-empty-icon">📈</div>
          <h2 class="inv-empty-title">No Investments Added Yet</h2>
          <p class="inv-empty-desc">
            Start building your digital wealth portfolio. Track Mutual Funds, Fixed Deposits, Gold, PPF, and Sovereign Bonds in one unified dashboard.
          </p>
          <button class="inv-add-btn" onclick="window.LM_InvestmentsUI.showAddEditModal()">
            <span>＋</span> Add Your First Investment
          </button>
        </div>
      `;
    },

    /**
     * Initialize Asset Allocation Chart
     */
    initAssetChart: function (categoryMap) {
      var canvas = document.getElementById('invAssetChart');
      if (!canvas || typeof Chart === 'undefined') return;

      if (_chartInstance) {
        _chartInstance.destroy();
      }

      var labels = Object.keys(categoryMap).filter(k => categoryMap[k] > 0);
      var data = labels.map(k => categoryMap[k]);

      if (labels.length === 0) {
        labels = ['No Assets Yet'];
        data = [1];
      }

      var colors = {
        'Equities': '#10b981',
        'Fixed Income': '#3b82f6',
        'Commodities': '#f59e0b',
        'Retirement': '#14b8a6',
        'Alternates': '#8b5cf6',
        'No Assets Yet': '#334155'
      };

      var bgColors = labels.map(l => colors[l] || '#64748b');

      _chartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: bgColors,
            borderColor: 'rgba(7, 9, 20, 0.8)',
            borderWidth: 2,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 12,
                color: document.documentElement.getAttribute('data-theme') === 'light' ? '#334155' : '#94a3b8',
                font: { size: 11, family: 'Plus Jakarta Sans' }
              }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  var v = ctx.raw || 0;
                  return ' ' + ctx.label + ': ' + _fmtINR(v);
                }
              }
            }
          },
          cutout: '68%'
        }
      });
    },

    /**
     * Filter & Search Handlers
     */
    setFilter: function (filter) {
      _activeFilter = filter;
      this.render();
    },

    handleSearch: function (query) {
      _searchQuery = query || '';
      this.render();
    },

    toggleSimulator: function () {
      _showSimulator = !_showSimulator;
      this.render();
    },

    /**
     * Show Add / Edit Investment Modal
     */
    showAddEditModal: function (invId) {
      var inv = invId && Array.isArray(state.investments) ? state.investments.find(i => String(i.id) === String(invId)) : null;
      var isEdit = !!inv;

      var modalContainer = document.getElementById('investmentModals');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'investmentModals';
        document.body.appendChild(modalContainer);
      } else if (modalContainer.parentNode !== document.body) {
        document.body.appendChild(modalContainer);
      }

      var selectedType = inv?.type || 'FD';
      var todayISO = new Date().toISOString().split('T')[0];

      modalContainer.innerHTML = `
        <div class="inv-modal-overlay show" id="invFormModal">
          <div class="inv-modal-box glass">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
              <h2 style="font-size: 1.25rem; font-weight:700; color:var(--text); margin:0; font-family:var(--font-h);">
                ${isEdit ? '✏️ Edit Investment' : '＋ Add New Investment'}
              </h2>
              <button type="button" onclick="window.LM_InvestmentsUI.closeModal()" style="background:none; border:none; font-size:24px; color:var(--text-3); cursor:pointer; padding:4px 8px;" aria-label="Close">&times;</button>
            </div>

            <form id="invCardForm" onsubmit="window.LM_InvestmentsUI.handleSaveInvestment(event, '${invId || ''}')">
              
              <!-- Asset Type Selector -->
              <div style="margin-bottom: 14px;">
                <label style="font-size:12px; font-weight:600; color:var(--text-2); margin-bottom:6px; display:block;">Select Asset Type *</label>
                <div class="inv-type-selector">
                  <div class="inv-type-opt ${selectedType === 'FD' ? 'selected' : ''}" onclick="window.LM_InvestmentsUI.selectType('FD')">
                    <span>🏛️</span><span>Fixed Deposit</span>
                  </div>
                  <div class="inv-type-opt ${selectedType === 'SIP' ? 'selected' : ''}" onclick="window.LM_InvestmentsUI.selectType('SIP')">
                    <span>📈</span><span>Mutual Fund/SIP</span>
                  </div>
                  <div class="inv-type-opt ${selectedType === 'RD' ? 'selected' : ''}" onclick="window.LM_InvestmentsUI.selectType('RD')">
                    <span>🔄</span><span>Recurring Dep</span>
                  </div>
                  <div class="inv-type-opt ${selectedType === 'GOLD' || selectedType === 'SGB' ? 'selected' : ''}" onclick="window.LM_InvestmentsUI.selectType('GOLD')">
                    <span>🥇</span><span>Gold &amp; SGB</span>
                  </div>
                  <div class="inv-type-opt ${selectedType === 'PPF' ? 'selected' : ''}" onclick="window.LM_InvestmentsUI.selectType('PPF')">
                    <span>🛡️</span><span>PPF / EPF / NPS</span>
                  </div>
                  <div class="inv-type-opt ${selectedType === 'OTHER' ? 'selected' : ''}" onclick="window.LM_InvestmentsUI.selectType('OTHER')">
                    <span>💎</span><span>Bonds &amp; Other</span>
                  </div>
                </div>
                <input type="hidden" id="invTypeInput" value="${selectedType}">
              </div>

              <div class="inv-form-grid">

                <div class="inv-form-group">
                  <label for="invName">Investment / Fund / Scheme Name *</label>
                  <input type="text" id="invName" class="inv-input" placeholder="e.g. HDFC 2-Year Tax Saver, Parag Parikh Flexi Cap" required value="${_escape(inv?.name || inv?.bankName || '')}">
                </div>

                <div class="inv-form-group">
                  <label for="invInstitution">Bank / AMC / Platform</label>
                  <input type="text" id="invInstitution" class="inv-input" placeholder="e.g. SBI, Groww, Zerodha, Post Office" value="${_escape(inv?.institution || inv?.bank || '')}">
                </div>

                <div class="inv-form-group">
                  <label for="invPrincipal" id="lblPrincipal">Principal Amount (₹) *</label>
                  <input type="number" id="invPrincipal" class="inv-input" step="100" min="0" placeholder="e.g. 100000" required value="${inv?.principal || inv?.amount || ''}" oninput="window.LM_InvestmentsUI.updateModalPreview()">
                </div>

                <div class="inv-form-group">
                  <label for="invRate" id="lblRate">Interest Rate / Exp Return (%) *</label>
                  <input type="number" id="invRate" class="inv-input" step="0.05" min="0" max="100" placeholder="e.g. 7.5" required value="${inv?.rate || inv?.sipReturn || 7.5}" oninput="window.LM_InvestmentsUI.updateModalPreview()">
                </div>

                <div class="inv-form-group">
                  <label for="invStartDate">Start Date *</label>
                  <input type="date" id="invStartDate" class="inv-input" required value="${inv?.startDate || todayISO}" oninput="window.LM_InvestmentsUI.updateModalPreview()">
                </div>

                <div class="inv-form-group">
                  <label for="invTenure">Tenure in Months *</label>
                  <input type="number" id="invTenure" class="inv-input" min="1" max="600" placeholder="e.g. 24" required value="${inv?.tenureMonths || 24}" oninput="window.LM_InvestmentsUI.updateModalPreview()">
                </div>

                <div class="inv-form-group" id="groupCompounding">
                  <label for="invCompounding">Compounding Frequency</label>
                  <select id="invCompounding" class="inv-input" onchange="window.LM_InvestmentsUI.updateModalPreview()">
                    <option value="quarterly" ${(inv?.compounding || 'quarterly') === 'quarterly' ? 'selected' : ''}>Quarterly (Bank Default)</option>
                    <option value="monthly" ${inv?.compounding === 'monthly' ? 'selected' : ''}>Monthly</option>
                    <option value="half-yearly" ${inv?.compounding === 'half-yearly' ? 'selected' : ''}>Half-Yearly</option>
                    <option value="yearly" ${inv?.compounding === 'yearly' ? 'selected' : ''}>Yearly</option>
                  </select>
                </div>

                <div class="inv-form-group" id="groupAdditional">
                  <label for="invAdditional" id="lblAdditional">Monthly Installment (₹)</label>
                  <input type="number" id="invAdditional" class="inv-input" step="100" min="0" placeholder="e.g. 5000" value="${inv?.additionalDeposit || inv?.sipMonthly || ''}" oninput="window.LM_InvestmentsUI.updateModalPreview()">
                </div>

                <div class="inv-form-group">
                  <label for="invStatus">Holding Status</label>
                  <select id="invStatus" class="inv-input">
                    <option value="active" ${(!inv?.status || inv?.status === 'active') && !isClosedOrMatured(inv) ? 'selected' : ''}>✅ Active Holding</option>
                    <option value="closed" ${(inv?.status === 'closed' || inv?.status === 'matured' || (inv && isClosedOrMatured(inv))) ? 'selected' : ''}>🔒 Closed / Matured</option>
                  </select>
                </div>

                <div class="inv-form-group full-width">
                  <label for="invNotes">Notes / Folio / Account No. (Optional)</label>
                  <input type="text" id="invNotes" class="inv-input" placeholder="e.g. Folio 9182312, 80C Tax saving deduction" value="${_escape(inv?.notes || '')}">
                </div>

              </div>

              <!-- Live Preview Box -->
              <div class="inv-preview-box" id="invModalPreview">
                <div>
                  <div style="font-size:11px; color:var(--text-3); text-transform:uppercase; font-weight:600;">Estimated Maturity Value</div>
                  <div style="font-size:1.35rem; font-weight:700; color:var(--emerald); font-family:var(--font-m);" id="previewMaturityVal">₹1,16,054</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:11px; color:var(--text-3); text-transform:uppercase; font-weight:600;">Est. Profit / Interest</div>
                  <div style="font-size:1.15rem; font-weight:700; color:var(--teal); font-family:var(--font-m);" id="previewInterestVal">+₹16,054</div>
                </div>
              </div>

              <div class="inv-modal-actions">
                <button type="button" class="inv-action-btn" onclick="window.LM_InvestmentsUI.closeModal()">Cancel</button>
                <button type="submit" class="inv-add-btn" id="btnSaveInvestment">${isEdit ? 'Save Changes' : '＋ Add Investment'}</button>
              </div>

            </form>
          </div>
        </div>
      `;

      this.adaptFormForType(selectedType);
      this.updateModalPreview();
    },

    /**
     * Type selection inside modal
     */
    selectType: function (type) {
      var input = document.getElementById('invTypeInput');
      if (input) input.value = type;

      document.querySelectorAll('.inv-type-opt').forEach(function (el) {
        el.classList.toggle('selected', el.getAttribute('onclick')?.includes("'" + type + "'"));
      });

      this.adaptFormForType(type);
      this.updateModalPreview();
    },

    adaptFormForType: function (type) {
      var lblP = document.getElementById('lblPrincipal');
      var groupC = document.getElementById('groupCompounding');
      var groupA = document.getElementById('groupAdditional');
      var lblA = document.getElementById('lblAdditional');

      if (type === 'SIP') {
        if (lblP) lblP.textContent = 'Initial Lumpsum Amount (₹)';
        if (groupC) groupC.style.display = 'none';
        if (groupA) { groupA.style.display = 'flex'; }
        if (lblA) lblA.textContent = 'Monthly SIP Amount (₹) *';
      } else if (type === 'RD') {
        if (lblP) lblP.textContent = 'Initial Opening Deposit (₹)';
        if (groupC) groupC.style.display = 'none';
        if (groupA) { groupA.style.display = 'flex'; }
        if (lblA) lblA.textContent = 'Monthly RD Installment (₹) *';
      } else if (type === 'GOLD' || type === 'SGB') {
        if (lblP) lblP.textContent = 'Total Gold Investment Value (₹) *';
        if (groupC) groupC.style.display = 'none';
        if (groupA) groupA.style.display = 'none';
      } else if (type === 'PPF' || type === 'EPF' || type === 'NPS') {
        if (lblP) lblP.textContent = 'Current Account Balance (₹) *';
        if (groupC) groupC.style.display = 'none';
        if (groupA) { groupA.style.display = 'flex'; }
        if (lblA) lblA.textContent = 'Annual Contribution (₹)';
      } else {
        // FD default
        if (lblP) lblP.textContent = 'Deposit Principal Amount (₹) *';
        if (groupC) groupC.style.display = 'flex';
        if (groupA) groupA.style.display = 'none';
      }
    },

    updateModalPreview: function () {
      var type = document.getElementById('invTypeInput')?.value || 'FD';
      var principal = parseFloat(document.getElementById('invPrincipal')?.value) || 0;
      var rate = parseFloat(document.getElementById('invRate')?.value) || 0;
      var tenure = parseInt(document.getElementById('invTenure')?.value, 10) || 12;
      var compounding = document.getElementById('invCompounding')?.value || 'quarterly';
      var additional = parseFloat(document.getElementById('invAdditional')?.value) || 0;
      var startDate = document.getElementById('invStartDate')?.value || new Date().toISOString().split('T')[0];

      var tempInv = {
        type: type,
        principal: principal,
        rate: rate,
        sipReturn: rate,
        tenureMonths: tenure,
        compounding: compounding,
        additionalDeposit: additional,
        sipMonthly: additional,
        startDate: startDate
      };

      var invested = calculateInvestedSoFar(tempInv);
      var maturity = calculateMaturity(tempInv);
      var interest = Math.max(0, maturity - invested);

      var pMat = document.getElementById('previewMaturityVal');
      var pInt = document.getElementById('previewInterestVal');

      if (pMat) pMat.textContent = _fmtINR(maturity);
      if (pInt) pInt.textContent = '+' + _fmtINR(interest);
    },

    /**
     * Handle Save Investment
     */
    handleSaveInvestment: async function (e, invId) {
      if (e && e.preventDefault) e.preventDefault();

      var type = document.getElementById('invTypeInput')?.value || 'FD';
      var name = document.getElementById('invName')?.value?.trim();
      var institution = document.getElementById('invInstitution')?.value?.trim();
      var principal = parseFloat(document.getElementById('invPrincipal')?.value) || 0;
      var rate = parseFloat(document.getElementById('invRate')?.value) || 0;
      var tenureMonths = parseInt(document.getElementById('invTenure')?.value, 10) || 12;
      var compounding = document.getElementById('invCompounding')?.value || 'quarterly';
      var additional = parseFloat(document.getElementById('invAdditional')?.value) || 0;
      var startDate = document.getElementById('invStartDate')?.value || new Date().toISOString().split('T')[0];
      var status = document.getElementById('invStatus')?.value || 'active';
      var notes = document.getElementById('invNotes')?.value?.trim();

      if (!name) {
        if (typeof showToast === 'function') showToast('❌ Please enter Investment Name', 'error');
        return;
      }
      if (principal <= 0 && additional <= 0) {
        if (typeof showToast === 'function') showToast('❌ Please enter a valid Investment Amount', 'error');
        return;
      }

      var isClosed = status === 'closed' || status === 'matured';

      var invData = {
        id: invId ? (isNaN(invId) ? invId : Number(invId)) : Date.now(),
        type: type,
        name: name,
        bankName: name,
        institution: institution,
        bank: institution,
        principal: principal,
        amount: principal,
        rate: rate,
        sipReturn: rate,
        tenureMonths: tenureMonths,
        compounding: compounding,
        additionalDeposit: additional,
        sipMonthly: type === 'SIP' ? additional : 0,
        startDate: startDate,
        status: status,
        isClosed: isClosed,
        notes: notes,
        updatedAt: new Date().toISOString()
      };

      try {
        if (typeof window.put === 'function') {
          await window.put('investments', invData);
        }

        if (!Array.isArray(state.investments)) state.investments = [];
        var idx = state.investments.findIndex(i => String(i.id) === String(invData.id));
        if (idx !== -1) {
          state.investments[idx] = invData;
        } else {
          state.investments.push(invData);
        }

        if (window.LM_Bus) {
          window.LM_Bus.emit('lm:data:changed', { store: 'investments' });
        }

        if (typeof showToast === 'function') {
          showToast(invId ? '✅ Investment updated successfully' : '✅ Investment added to portfolio', 'success');
        }

        this.closeModal();
        this.render();

        if (typeof renderDashboardWealthWidget === 'function') {
          renderDashboardWealthWidget();
        }
        if (typeof renderAll === 'function') {
          renderAll();
        }
      } catch (err) {
        console.error('[InvestmentsUI] Save error:', err);
        if (typeof showToast === 'function') showToast('❌ Error saving investment: ' + err.message, 'error');
      }
    },

    /**
     * Toggle status between active and closed/matured
     */
    toggleStatus: async function (invId) {
      if (!Array.isArray(state.investments)) return;
      var inv = state.investments.find(i => String(i.id) === String(invId));
      if (!inv) return;
      var wasClosed = isClosedOrMatured(inv);
      inv.status = wasClosed ? 'active' : 'closed';
      inv.isClosed = !wasClosed;
      inv.updatedAt = new Date().toISOString();

      try {
        if (typeof window.put === 'function') {
          await window.put('investments', inv);
        }
        if (window.LM_Bus) {
          window.LM_Bus.emit('lm:data:changed', { store: 'investments' });
        }
        if (typeof showToast === 'function') {
          showToast(inv.status === 'active' ? '✅ Investment marked as Active' : '🔒 Investment marked as Closed / Matured', 'info');
        }
        this.render();
        if (typeof renderDashboardWealthWidget === 'function') {
          renderDashboardWealthWidget();
        }
        if (typeof renderAll === 'function') {
          renderAll();
        }
      } catch (err) {
        console.error('[InvestmentsUI] Error toggling status:', err);
      }
    },

    /**
     * Delete Investment
     */
    confirmDelete: async function (id) {
      if (!confirm('Are you sure you want to delete this investment from your portfolio?')) return;

      try {
        if (typeof window.del === 'function') {
          await window.del('investments', isNaN(id) ? id : Number(id));
        }
        if (Array.isArray(state.investments)) {
          state.investments = state.investments.filter(i => String(i.id) !== String(id));
        }

        if (window.LM_Bus) {
          window.LM_Bus.emit('lm:data:changed', { store: 'investments' });
        }

        if (typeof showToast === 'function') showToast('Investment removed', 'info');
        this.render();

        if (typeof renderDashboardWealthWidget === 'function') {
          renderDashboardWealthWidget();
        }
        if (typeof renderAll === 'function') {
          renderAll();
        }
      } catch (err) {
        console.error('[InvestmentsUI] Delete error:', err);
        if (typeof showToast === 'function') showToast('❌ Delete failed: ' + err.message, 'error');
      }
    },

    /**
     * Close Modal
     */
    closeModal: function () {
      var modal = document.getElementById('invFormModal');
      if (modal) {
        modal.classList.remove('show');
        try { modal.remove(); } catch(e) {}
      }
      var container = document.getElementById('investmentModals');
      if (container) container.innerHTML = '';
    }
  };

  // Legacy fallback and Global exposure
  window.LM_InvestmentsUI = InvestmentsUI;
  window.showInvestmentsModal = function() {
    if (typeof showPage === 'function') {
      showPage('investments');
    } else {
      InvestmentsUI.render();
    }
  };
})();
