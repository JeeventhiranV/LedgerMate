/**
 * LedgerMate – CreditCardsUI.js
 * ─────────────────────────────────────────────────────────────
 * User Interface for Credit Cards Module.
 * Features 3D dual-sided flip cards, dynamic holographic glint,
 * real-time billing cycle progress timelines, credit utilization
 * speedometer gauge, smart arbitrage ("Which card to swipe today?"),
 * interactive spend simulator, airport lounge & milestone trackers,
 * celebratory bill payments, and payment history drawer.
 * Exposes: window.LM_CreditCardsUI
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _activeFilter = 'all';
  var _activeCategory = 'Dining';
  var _revealedCvv = {};

  function _fmtINR(num) {
    if (typeof fmtINR === 'function') return fmtINR(num);
    var n = Number(num) || 0;
    return '₹' + Math.round(n).toLocaleString('en-IN');
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

  var THEMES = [
    { id: 'theme-obsidian', name: 'Obsidian Titanium', color: '#090d16' },
    { id: 'theme-midnight', name: 'Midnight Classic', color: '#0f172a' },
    { id: 'theme-sapphire', name: 'Sapphire Cobalt', color: '#1e3a8a' },
    { id: 'theme-emerald',  name: 'Emerald Sovereign', color: '#064e3b' },
    { id: 'theme-ruby',     name: 'Imperial Ruby',    color: '#881337' },
    { id: 'theme-gold',     name: 'Gold & Amber',     color: '#b45309' },
    { id: 'theme-carbon',   name: 'Carbon Fiber',     color: '#1e293b' },
    { id: 'theme-cyberpunk',name: 'Cyberpunk Neon',   color: '#1a0b2e' },
    { id: 'theme-platinum', name: 'Platinum Steel',   color: '#374151' },
    { id: 'theme-amethyst', name: 'Amethyst Royal',   color: '#5b21b6' }
  ];

  var CreditCardsUI = {
    /**
     * Initialize UI and render page
     */
    init: async function () {
      if (window.LM_CreditCardsService) {
        await window.LM_CreditCardsService.init();
      }
      this.render();
    },

    /**
     * Set active card filter
     */
    setFilter: function (filter) {
      _activeFilter = filter;
      this.render();
    },

    /**
     * Set active category for "Which card to swipe today?" smart arbitrage bar
     */
    setSwipeCategory: function (cat) {
      _activeCategory = cat;
      var el = document.getElementById('ccSmartWinnerWrap');
      if (el) {
        el.innerHTML = this._renderSmartWinnerContent();
      } else {
        this.render();
      }
      if (window.LM_Haptics) window.LM_Haptics.light();
    },

    /**
     * Toggle 3D Card Flip (Front / Back)
     */
    toggleFlip: function (cardId) {
      var flipper = document.getElementById('ccFlipper_' + cardId);
      if (flipper) {
        flipper.classList.toggle('is-flipped');
        if (window.LM_Haptics) window.LM_Haptics.selection();
      }
    },

    /**
     * Toggle CVV stealth reveal (unmasks for 6 seconds)
     */
    toggleCvv: function (cardId) {
      var el = document.getElementById('ccCvv_' + cardId);
      var card = window.LM_CreditCardsService?.getCardById(cardId);
      if (!el || !card) return;

      if (_revealedCvv[cardId]) {
        delete _revealedCvv[cardId];
        el.textContent = '•••';
      } else {
        _revealedCvv[cardId] = true;
        el.textContent = card.cvv || '842';
        setTimeout(function () {
          delete _revealedCvv[cardId];
          var curEl = document.getElementById('ccCvv_' + cardId);
          if (curEl) curEl.textContent = '•••';
        }, 6000);
      }
      if (window.LM_Haptics) window.LM_Haptics.light();
    },

    /**
     * Trigger festive confetti burst upon bill payment
     */
    _triggerConfetti: function () {
      try {
        var colors = ['#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#a855f7', '#6366f1'];
        var container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.inset = '0';
        container.style.pointerEvents = 'none';
        container.style.zIndex = '9999';
        container.style.overflow = 'hidden';
        document.body.appendChild(container);

        for (var i = 0; i < 48; i++) {
          var p = document.createElement('div');
          p.className = 'cc-confetti-piece';
          p.style.left = (Math.random() * 100) + 'vw';
          p.style.top = (Math.random() * 30 + 10) + 'vh';
          p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          p.style.animationDelay = (Math.random() * 0.4) + 's';
          p.style.animationDuration = (0.9 + Math.random() * 0.6) + 's';
          container.appendChild(p);
        }

        setTimeout(function () {
          try { container.remove(); } catch (e) {}
        }, 2200);
      } catch (e) {}
    },

    /**
     * Main Render Method
     */
    render: function () {
      var container = document.getElementById('page-credit-cards');
      if (!container) return;

      var service = window.LM_CreditCardsService;
      if (!service) {
        container.innerHTML = '<div class="p-4 text-center">Credit cards service unavailable</div>';
        return;
      }

      var summary = service.getSummary();
      var allCards = service.getAllCards();

      // Apply filter
      var filteredCards = allCards.filter(function (card) {
        var cd = service.getDueCountdown(card);
        var util = (Number(card.current_due || 0) / Math.max(1, Number(card.credit_limit || 1))) * 100;

        if (_activeFilter === 'due_soon') {
          return !cd.isPaid && (cd.isDueSoon || cd.isDueToday || cd.isOverdue);
        }
        if (_activeFilter === 'high_util') {
          return util > 30;
        }
        if (_activeFilter === 'cleared') {
          return cd.isPaid;
        }
        return true;
      });

      var utilColor = summary.utilizationPct > 50 ? 'var(--rose)' : summary.utilizationPct > 30 ? 'var(--gold)' : 'var(--emerald)';
      var dueSoonBadge = summary.overdueCount > 0
        ? '<span style="color:var(--rose); font-weight:700;">' + summary.overdueCount + ' OVERDUE</span>'
        : summary.dueSoonCount > 0
          ? '<span style="color:var(--gold); font-weight:700;">' + summary.dueSoonCount + ' Due Soon</span>'
          : '<span style="color:var(--emerald);">All Clear</span>';

      // Speedometer calculations (Circumference ~ 175.93 for R=28)
      var circ = 175.93;
      var gaugeOffset = circ * (1 - Math.min(100, summary.utilizationPct) / 100);
      var gaugeTier = summary.utilizationPct < 10 ? 'Excellent' : summary.utilizationPct <= 30 ? 'Optimal' : summary.utilizationPct <= 50 ? 'Caution' : 'Critical';

      var html = `
        <div class="cc-container">

          <!-- ─── Header ─── -->
          <div class="cc-header">
            <div class="cc-title-area">
              <h1><span>💳</span> Credit Cards &amp; Dues</h1>
              <p>Real-time billing cycles, 50-day interest-free grace periods, smart perks &amp; reminders</p>
            </div>
            <div class="cc-header-actions" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <button class="overview-tool-btn" style="background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);border-radius:10px;padding:7px 12px;color:var(--text);font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;" onclick="window.LM_CreditCardsUI.showSpendSimulator()" title="Simulate spend impact on credit score and utilization">
                <span>⚡</span> Spend Simulator
              </button>

              <button class="overview-tool-btn privacy-toggle-btn" style="background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);border-radius:10px;padding:7px 12px;" title="Toggle Balance Privacy (Stealth Mode)" onclick="window.LM_togglePrivacyMode()" aria-label="Privacy Mode">
                <span class="privacy-btn-icon">${document.body.classList.contains('privacy-mode') ? '🙈' : '👁️'}</span>
                <span class="overview-tool-label">Privacy</span>
                <div class="bpm-switch-pill ${document.body.classList.contains('privacy-mode') ? 'active' : ''}">
                  <span class="bpm-switch-knob"></span>
                  <span class="bpm-switch-label">${document.body.classList.contains('privacy-mode') ? 'ON' : 'OFF'}</span>
                </div>
              </button>

              <button class="cc-add-btn" onclick="window.LM_CreditCardsUI.showAddEditModal()">
                <span>＋</span> Add Credit Card
              </button>
            </div>
          </div>

          <!-- ─── KPI Summary Grid & Speedometer Gauge ─── -->
          <div class="cc-kpi-grid">
            <div class="cc-kpi-card" style="--kpi-accent: var(--teal);">
              <div class="cc-kpi-label">Total Credit Limit</div>
              <div class="cc-kpi-val blur-val">${_fmtINR(summary.totalLimit)}</div>
              <div class="cc-kpi-sub">Across ${summary.cardsCount} cards</div>
            </div>

            <div class="cc-kpi-card" style="--kpi-accent: ${summary.totalCurrentDue > 0 ? 'var(--rose)' : 'var(--emerald)'};">
              <div class="cc-kpi-label">Total Outstanding Due</div>
              <div class="cc-kpi-val blur-val" style="color: ${summary.totalCurrentDue > 0 ? 'var(--rose)' : 'var(--emerald)'};">
                ${_fmtINR(summary.totalCurrentDue)}
              </div>
              <div class="cc-kpi-sub">Min Due: <span class="blur-val">${_fmtINR(summary.totalMinDue)}</span></div>
            </div>

            <div class="cc-kpi-card" style="--kpi-accent: var(--emerald);">
              <div class="cc-kpi-label">Available Credit</div>
              <div class="cc-kpi-val blur-val" style="color: var(--emerald);">${_fmtINR(summary.totalAvailable)}</div>
              <div class="cc-kpi-sub">Ready to swipe</div>
            </div>

            <!-- Credit Health Speedometer Gauge Card -->
            <div class="cc-speedometer-box">
              <div class="cc-gauge-svg-wrap">
                <svg class="cc-gauge-svg" viewBox="0 0 70 70">
                  <circle class="cc-gauge-bg-circle" cx="35" cy="35" r="28" />
                  <circle class="cc-gauge-val-circle" cx="35" cy="35" r="28"
                          stroke="${utilColor}"
                          stroke-dasharray="${circ}"
                          stroke-dashoffset="${gaugeOffset}" />
                </svg>
                <div class="cc-gauge-center-text">
                  <span>${summary.utilizationPct}%</span>
                </div>
              </div>
              <div>
                <div style="font-size: 11px; text-transform: uppercase; color: var(--text-3); font-weight: 700; letter-spacing: 0.05em;">Credit Health</div>
                <div style="font-size: 14px; font-weight: 800; color: ${utilColor}; margin: 1px 0;">${gaugeTier} Tier</div>
                <div style="font-size: 11px; color: var(--text-3);">${dueSoonBadge}</div>
              </div>
            </div>
          </div>

          <!-- ─── "Which Card to Swipe Today?" Smart Grace Arbitrage Bar ─── -->
          ${allCards.length > 0 ? `
            <div class="cc-smart-swipe-container">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px; flex-wrap:wrap; gap:6px;">
                <div style="display:flex; align-items:center; gap:6px; font-size:12.5px; font-weight:700; color:var(--text);">
                  <span>⚡</span> Which card to swipe today?
                  <span style="font-size:10px; background:rgba(6,182,212,0.2); color:#06b6d4; padding:2px 7px; border-radius:10px; font-weight:700;">Interest-Free Arbitrage</span>
                </div>
                <div class="cc-smart-chips-row">
                  ${['Dining', 'Shopping', 'Fuel', 'Travel', 'Groceries', 'Utilities'].map(cat => `
                    <button class="cc-smart-chip ${_activeCategory === cat ? 'active' : ''}" onclick="window.LM_CreditCardsUI.setSwipeCategory('${cat}')">
                      ${cat === 'Dining' ? '🍔' : cat === 'Shopping' ? '🛍️' : cat === 'Fuel' ? '⛽' : cat === 'Travel' ? '✈️' : cat === 'Groceries' ? '🛒' : '💡'} ${cat}
                    </button>
                  `).join('')}
                </div>
              </div>
              <div id="ccSmartWinnerWrap">
                ${this._renderSmartWinnerContent()}
              </div>
            </div>
          ` : ''}

          <!-- ─── Toolbar & Filters ─── -->
          <div class="cc-toolbar">
            <div class="cc-filters">
              <button class="cc-filter-pill ${_activeFilter === 'all' ? 'active' : ''}"
                      onclick="window.LM_CreditCardsUI.setFilter('all')">
                All Cards (${allCards.length})
              </button>
              <button class="cc-filter-pill ${_activeFilter === 'due_soon' ? 'active' : ''}"
                      onclick="window.LM_CreditCardsUI.setFilter('due_soon')">
                ⚠️ Due Soon / Overdue (${allCards.filter(c => { var d = service.getDueCountdown(c); return !d.isPaid && (d.isDueSoon || d.isDueToday || d.isOverdue); }).length})
              </button>
              <button class="cc-filter-pill ${_activeFilter === 'high_util' ? 'active' : ''}"
                      onclick="window.LM_CreditCardsUI.setFilter('high_util')">
                🔥 High Utilization (&gt;30%) (${allCards.filter(c => (Number(c.current_due || 0) / Math.max(1, Number(c.credit_limit || 1))) > 0.3).length})
              </button>
              <button class="cc-filter-pill ${_activeFilter === 'cleared' ? 'active' : ''}"
                      onclick="window.LM_CreditCardsUI.setFilter('cleared')">
                ✅ Cleared / Zero Due (${allCards.filter(c => Number(c.current_due || 0) <= 0).length})
              </button>
            </div>
          </div>

          <!-- ─── Cards Grid ─── -->
          ${filteredCards.length === 0 ? this._renderEmptyState() : `
            <div class="cc-grid">
              ${filteredCards.map(c => this._renderCardItem(c)).join('')}
            </div>
          `}

        </div>
      `;

      container.innerHTML = html;
      if (window.LM_attachCardPhysics) {
        setTimeout(window.LM_attachCardPhysics, 50);
      }
    },

    /**
     * Render smart winner content inside arbitrage box
     */
    _renderSmartWinnerContent: function () {
      var service = window.LM_CreditCardsService;
      var cards = service ? service.getAllCards() : [];
      if (!cards.length) return '';

      var best = null;
      if (window.LM_CardOptimizer) {
        best = window.LM_CardOptimizer.getBestCardForCategory(_activeCategory, cards);
      }

      if (!best || !best.card) {
        best = {
          card: cards[0],
          normalized: { cardName: cards[0].card_name, bankName: cards[0].bank_name },
          graceDays: 30,
          rewardMultiplier: 2.0,
          perkDesc: 'Standard Rewards'
        };
      }

      var card = best.card;
      return `
        <div class="cc-smart-winner-card">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:38px; height:26px; border-radius:5px; background:linear-gradient(135deg,#1e293b,#0f172a); border:1px solid rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:12px;">
              💳
            </div>
            <div>
              <div style="font-size:11px; color:var(--text-3);">Recommended for ${_escape(_activeCategory)}:</div>
              <div style="font-size:13.5px; font-weight:800; color:#38bdf8;">
                ${_escape(card.card_name)} <span style="font-size:11px; opacity:0.8; font-weight:500;">(${_escape(card.bank_name || 'Bank')})</span>
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:14px;">
            <div style="text-align:right;">
              <span style="display:inline-block; font-size:11px; font-weight:700; color:#10b981; background:rgba(16,185,129,0.15); padding:2px 8px; border-radius:6px;">
                ✨ ${best.perkDesc || (best.rewardMultiplier + 'x Rewards')}
              </span>
              <div style="font-size:11px; color:#f59e0b; font-weight:600; margin-top:2px;">
                ⚡ ${best.graceDays} Days Interest-Free Active
              </div>
            </div>
            <button style="background:linear-gradient(135deg,var(--teal),#0d9488); border:none; color:#fff; border-radius:8px; padding:6px 12px; font-size:11px; font-weight:700; cursor:pointer;" onclick="window.LM_CreditCardsUI.showSpendSimulator('${card.id}')">
              Simulate Swipe →
            </button>
          </div>
        </div>
      `;
    },

    /**
     * Render empty state
     */
    _renderEmptyState: function () {
      return `
        <div class="cc-empty-state">
          <div class="cc-empty-icon">💳</div>
          <div class="cc-empty-title">No Credit Cards Found</div>
          <div class="cc-empty-desc">
            ${_activeFilter !== 'all' ? 'No cards match this filter. Try selecting "All Cards".' : 'Add your credit cards to effortlessly monitor billing cycles, due dates, limits, and timely payment reminders.'}
          </div>
          ${_activeFilter !== 'all' ? `
            <button class="cc-filter-pill active" onclick="window.LM_CreditCardsUI.setFilter('all')">View All Cards</button>
          ` : `
            <button class="cc-add-btn" onclick="window.LM_CreditCardsUI.showAddEditModal()">＋ Add Your First Card</button>
          `}
        </div>
      `;
    },

    /**
     * Render individual realistic credit card item with 3D Flip
     */
    _renderCardItem: function (card) {
      var service = window.LM_CreditCardsService;
      var dueInfo = service.getDueCountdown(card);
      var stmtInfo = service.getStatementCountdown(card);

      var limit = Number(card.credit_limit || 0);
      var currentDue = Number(card.current_due || 0);
      var available = Number(card.available_limit !== undefined ? card.available_limit : (limit - currentDue));
      var minDue = Number(card.min_due || 0);

      var utilPct = limit > 0 ? Math.min(100, Math.round((currentDue / limit) * 1000) / 10) : 0;
      var utilCls = utilPct > 50 ? 'util-danger' : utilPct > 30 ? 'util-moderate' : 'util-safe';

      // Badge styling
      var badgeCls = dueInfo.isPaid ? 'cleared'
        : dueInfo.isOverdue ? 'overdue'
        : (dueInfo.isDueSoon || dueInfo.isDueToday) ? 'duesoon' : 'active-grace';

      var badgeIcon = dueInfo.isPaid ? '✅' : dueInfo.isOverdue ? '🚨' : dueInfo.isDueSoon ? '⏳' : '📅';

      var holderName = window.LM_Auth?.getCurrentUser?.()?.username || 'CARDMEMBER';
      var theme = card.color_theme || 'theme-midnight';

      // Billing Cycle Timeline Calculations
      var now = new Date();
      var curDay = now.getDate();
      var stmtDay = parseInt(card.statement_day, 10) || 15;
      var dueDay = parseInt(card.due_day, 10) || 5;

      var graceRemaining = 30;
      if (window.LM_CardOptimizer) {
        graceRemaining = window.LM_CardOptimizer.calculateRemainingGraceDays(stmtDay, dueDay);
      }

      // Cycle progress estimation (0 to 100%)
      var cycleProgressPct = Math.min(100, Math.max(5, Math.round((curDay / 30) * 100)));

      // Network badge styling
      var network = card.card_network || 'Visa';
      var networkSymbol = network === 'Mastercard' ? '🔴🟠' : network === 'RuPay' ? '🇮🇳' : network === 'Amex' ? '🟦' : '💳';

      // Perks & Lounge
      var perks = Array.isArray(card.perks) ? card.perks : (card.notes ? [card.notes] : []);
      var loungeTotal = parseInt(card.lounge_total, 10) || 0;
      var loungeUsed = parseInt(card.lounge_used, 10) || 0;
      var milestoneTarget = Number(card.milestone_target || 0);
      var milestoneSpent = Number(card.milestone_spent || 0);
      var milestonePct = milestoneTarget > 0 ? Math.min(100, Math.round((milestoneSpent / milestoneTarget) * 100)) : 0;

      return `
        <div class="cc-card-item">
          <!-- ─── 3D Dual-Sided Flip Container ─── -->
          <div class="cc-flip-container" id="ccFlipContainer_${card.id}">
            <div class="cc-flipper cc-flipper-target" id="ccFlipper_${card.id}">

              <!-- ─── FRONT FACE ─── -->
              <div class="cc-card-front cc-card-art ${theme}">
                <div class="cc-holographic-glare"></div>

                <!-- Top Row: Bank, Model, Live Badge & Flip Button -->
                <div class="cc-card-top">
                  <div>
                    <div class="cc-bank-name">${_escape(card.bank_name || 'BANK')}</div>
                    <div class="cc-card-model">${_escape(card.card_name || 'Credit Card')}</div>
                  </div>
                  <div style="display:flex; align-items:center; gap:8px;">
                    <div class="cc-card-live-badge ${badgeCls}">
                      <span>${badgeIcon}</span>
                      <span>${dueInfo.statusText}</span>
                    </div>
                    <button class="cc-flip-toggle-btn" onclick="event.stopPropagation(); window.LM_CreditCardsUI.toggleFlip('${card.id}')" title="Flip to see back details">
                      🔄 Flip
                    </button>
                  </div>
                </div>

                <!-- Middle: EMV Chip & NFC Contactless -->
                <div class="cc-chip-row">
                  <div class="cc-emv-chip"></div>
                  <div class="cc-nfc-icon">📶</div>
                  <div style="margin-left:auto; font-size:11px; font-weight:800; background:rgba(255,255,255,0.18); padding:3px 9px; border-radius:6px; letter-spacing:0.05em; text-transform:uppercase;">
                    ${networkSymbol} ${_escape(network)}
                  </div>
                </div>

                <!-- Masked Card Number -->
                <div class="cc-number">•••• •••• •••• ${_escape(card.last_4_digits || '0000')}</div>

                <!-- Bottom Row: Cardholder, Available, Due/Stmt -->
                <div class="cc-card-bottom">
                  <div>
                    <div class="cc-holder-label">CARDHOLDER</div>
                    <div class="cc-holder-name">${_escape(holderName)}</div>
                  </div>
                  <div style="text-align:center;">
                    <div class="cc-holder-label">AVAILABLE LIMIT</div>
                    <div class="cc-dates-val blur-val" style="color:#34d399;">${_fmtINR(available)}</div>
                  </div>
                  <div style="text-align:right;">
                    <div class="cc-dates-label">DUE / STMT</div>
                    <div class="cc-dates-val">${card.due_day || '05'}th · ${card.statement_day || '15'}th</div>
                  </div>
                </div>
              </div>

              <!-- ─── BACK FACE ─── -->
              <div class="cc-card-back cc-card-art ${theme}">
                <div class="cc-holographic-glare"></div>

                <!-- Magstripe -->
                <div class="cc-back-magstripe"></div>

                <!-- Signature panel & CVV box -->
                <div class="cc-back-signature-row">
                  <div class="cc-back-sig-panel">
                    <span>${_escape(holderName)}</span>
                  </div>
                  <div class="cc-back-cvv-box" onclick="event.stopPropagation(); window.LM_CreditCardsUI.toggleCvv('${card.id}')" title="Click to reveal/hide CVV">
                    <span style="font-size:10px; color:#64748b; font-weight:700;">CVV</span>
                    <span id="ccCvv_${card.id}">${card.cvv ? '•••' : '842'}</span>
                    <span style="font-size:11px;">👁️</span>
                  </div>
                </div>

                <!-- Perks Overview & Customer Care -->
                <div class="cc-back-perks-list">
                  <div style="font-weight:700; color:#38bdf8; display:flex; justify-content:space-between;">
                    <span>Security &amp; Benefits</span>
                    <span>${card.international_enabled ? '🌐 International' : '🇮🇳 Domestic Only'}</span>
                  </div>
                  <div>• 24x7 Bank Helpline: <strong>1800-425-0018</strong></div>
                  <div>• Contactless Tap &amp; Pay: <strong>${card.contactless_enabled !== false ? 'Active' : 'Disabled'}</strong></div>
                  ${perks.length > 0 ? `<div>• Perks: <strong>${_escape(perks[0])}</strong></div>` : ''}
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                  <span style="font-size:10px; opacity:0.75;">Authorized Signature Required</span>
                  <button class="cc-flip-toggle-btn" onclick="event.stopPropagation(); window.LM_CreditCardsUI.toggleFlip('${card.id}')">
                    🔄 Flip Back
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- ─── Card Details & Interactive Controls Container ─── -->
          <div class="cc-details-card">

            <!-- Real-Time Billing Cycle Progress Timeline -->
            <div class="cc-cycle-timeline-wrap">
              <div class="cc-cycle-header">
                <span class="cc-cycle-title">
                  <span>📅</span> Billing Cycle Timeline
                </span>
                <span class="cc-cycle-countdown" style="background:${dueInfo.isOverdue ? 'rgba(251,113,133,0.2)' : 'rgba(56,189,248,0.15)'}; color:${dueInfo.isOverdue ? '#fb7185' : '#38bdf8'};">
                  ${dueInfo.isOverdue ? dueInfo.statusText : (graceRemaining + 'd 0% Interest Window')}
                </span>
              </div>
              <div class="cc-cycle-track">
                <div class="cc-cycle-fill" style="width:${cycleProgressPct}%;"></div>
                <div class="cc-cycle-marker-dot" style="left:${cycleProgressPct}%;" title="Today is day ${curDay}"></div>
              </div>
              <div class="cc-cycle-steps">
                <span>Stmt: <strong>${stmtDay}th</strong></span>
                <span>Active 0% Credit</span>
                <span>Due: <strong>${dueDay}th</strong> (Min ${_fmtINR(minDue)})</span>
              </div>
            </div>

            <!-- Outstanding Due & Countdown Badge -->
            <div class="cc-dues-row" style="margin-top:4px;">
              <div class="cc-due-amount-wrap">
                <span class="cc-due-label">Current Outstanding</span>
                <span class="cc-due-val blur-val" style="color: ${currentDue > 0 ? 'var(--rose)' : 'var(--emerald)'};">
                  ${_fmtINR(currentDue)}
                </span>
              </div>
              <div class="cc-countdown-badge ${dueInfo.isPaid ? 'badge-paid' : dueInfo.isOverdue ? 'badge-overdue' : (dueInfo.isDueSoon || dueInfo.isDueToday) ? 'badge-duesoon' : 'badge-dueok'}">
                <span>${badgeIcon}</span>
                <span>${dueInfo.statusText}</span>
              </div>
            </div>

            <!-- Utilization Progress Bar -->
            <div class="cc-util-wrap">
              <div class="cc-util-header">
                <span>Credit Utilization: <strong>${utilPct}%</strong></span>
                <span>Avail: <strong class="blur-val">${_fmtINR(available)}</strong> / <span class="blur-val">${_fmtINR(limit)}</span></span>
              </div>
              <div class="cc-util-track">
                <div class="cc-util-fill ${utilCls}" style="width: ${utilPct}%;"></div>
              </div>
            </div>

            <!-- Airport Lounge & Milestone Trackers -->
            ${(loungeTotal > 0 || milestoneTarget > 0) ? `
              <div class="cc-perks-widget">
                ${loungeTotal > 0 ? `
                  <div class="cc-perk-box">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="color:var(--text-3);">✈️ Lounge Visits</span>
                      <strong style="color:var(--teal);">${loungeUsed}/${loungeTotal} Used</strong>
                    </div>
                    <div class="cc-lounge-dots">
                      ${Array.from({ length: loungeTotal }).map((_, idx) => `
                        <div class="cc-lounge-dot ${idx < loungeUsed ? 'used' : ''}"></div>
                      `).join('')}
                    </div>
                    <div style="display:flex; gap:6px; margin-top:4px;">
                      <button style="flex:1; background:rgba(6,182,212,0.15); border:1px solid rgba(6,182,212,0.3); color:#06b6d4; border-radius:6px; padding:3px 6px; font-size:10px; font-weight:700; cursor:pointer;" onclick="window.LM_CreditCardsUI.logLoungeVisit('${card.id}')">
                        +1 Visit
                      </button>
                      <button style="background:rgba(255,255,255,0.06); border:1px solid var(--border); color:var(--text-3); border-radius:6px; padding:3px 6px; font-size:10px; cursor:pointer;" onclick="window.LM_CreditCardsUI.resetLoungeVisits('${card.id}')" title="Reset for new quarter">
                        🔄
                      </button>
                    </div>
                  </div>
                ` : ''}

                ${milestoneTarget > 0 ? `
                  <div class="cc-perk-box">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="color:var(--text-3);">🎯 Milestone Target</span>
                      <strong style="color:#f59e0b;">${milestonePct}%</strong>
                    </div>
                    <div class="cc-util-track" style="height:5px; margin:4px 0;">
                      <div class="cc-util-fill util-safe" style="width:${milestonePct}%; background:#f59e0b;"></div>
                    </div>
                    <div style="font-size:10px; color:var(--text-3);">
                      <span class="blur-val">${_fmtINR(milestoneSpent)}</span> / <span class="blur-val">${_fmtINR(milestoneTarget)}</span>
                      ${card.milestone_reward ? `• 🎁 ${_escape(card.milestone_reward)}` : ''}
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}

            ${card.notes ? `
              <div style="font-size: 11px; color: var(--text-3); background: var(--bg); padding: 6px 10px; border-radius: 6px; font-style: italic; margin-top: 6px;">
                💡 ${_escape(card.notes)}
              </div>
            ` : ''}

            <!-- Card Actions Row -->
            <div class="cc-actions-row">
              <button class="cc-btn-pay" onclick="window.LM_CreditCardsUI.showPayBillModal('${card.id}')">
                💳 Pay Bill
              </button>
              <button class="cc-btn-edit" onclick="window.LM_CreditCardsUI.showSpendSimulator('${card.id}')" title="Simulate Spend on this Card">
                ⚡ Simulate
              </button>
              <button class="cc-btn-edit" onclick="window.LM_CreditCardsUI.showHistoryModal('${card.id}')" title="Payment History">
                📜 History
              </button>
              <button class="cc-btn-edit" onclick="window.LM_CreditCardsUI.showAddEditModal('${card.id}')" title="Edit Card">
                ✏️ Edit
              </button>
              <button class="cc-btn-delete" onclick="window.LM_CreditCardsUI.confirmDelete('${card.id}')" title="Delete Card">
                🗑️
              </button>
            </div>

          </div>
        </div>
      `;
    },

    /**
     * Log an airport lounge visit on card
     */
    logLoungeVisit: async function (cardId) {
      if (window.LM_CreditCardsService) {
        await window.LM_CreditCardsService.logLoungeVisit(cardId);
        this.render();
        if (window.LM_Haptics) window.LM_Haptics.success();
      }
    },

    /**
     * Reset lounge visits on card
     */
    resetLoungeVisits: async function (cardId) {
      if (confirm('Reset lounge visits to 0 for a new quarter?')) {
        if (window.LM_CreditCardsService) {
          await window.LM_CreditCardsService.resetLoungeVisits(cardId);
          this.render();
        }
      }
    },

    /**
     * Show Spend Simulator Modal
     */
    showSpendSimulator: function (preselectedCardId) {
      var service = window.LM_CreditCardsService;
      var cards = service ? service.getAllCards() : [];
      if (!cards.length) {
        if (typeof showToast === 'function') showToast('Please add at least one credit card first', 'info');
        return;
      }

      var activeId = preselectedCardId || cards[0].id;
      var card = service.getCardById(activeId) || cards[0];

      var modalContainer = document.getElementById('creditCardModals');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'creditCardModals';
        document.body.appendChild(modalContainer);
      }

      modalContainer.innerHTML = `
        <div class="modal-overlay show" id="ccSimulatorModal" style="display:flex;">
          <div class="modal-box glass" style="max-width: 500px; width: 95%; padding: 24px; border-radius: 18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
              <div>
                <h2 style="font-size: 1.25rem; font-weight:700; color:var(--text); margin:0;">
                  ⚡ Credit Spend Simulator
                </h2>
                <div style="font-size: 12px; color:var(--text-3); margin-top:2px;">
                  Test prospective purchase impacts on utilization, credit score &amp; reward yields
                </div>
              </div>
              <button type="button" onclick="window.LM_CreditCardsUI.closeModal('ccSimulatorModal')" style="background:none; border:none; font-size:24px; color:var(--text-3); cursor:pointer;" aria-label="Close">&times;</button>
            </div>

            <div style="margin-bottom: 14px;">
              <label style="font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 6px; display:block;">Select Card to Test</label>
              <select id="simCardSelect" class="cc-input" onchange="window.LM_CreditCardsUI.handleSpendSimulation()">
                ${cards.map(c => `
                  <option value="${c.id}" ${c.id === activeId ? 'selected' : ''}>
                    ${_escape(c.bank_name)} ${_escape(c.card_name)} (Avail: ${_fmtINR(c.available_limit || (c.credit_limit - c.current_due))})
                  </option>
                `).join('')}
              </select>
            </div>

            <div style="margin-bottom: 14px;">
              <label style="font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 6px; display:block;">Simulated Spend Amount (₹)</label>
              <input type="number" id="simSpendAmount" class="cc-input" min="100" step="500" value="15000" oninput="window.LM_CreditCardsUI.handleSpendSimulation()">
              <input type="range" id="simSpendSlider" min="500" max="100000" step="500" value="15000" style="width:100%; margin-top:8px; accent-color:var(--teal);" oninput="document.getElementById('simSpendAmount').value = this.value; window.LM_CreditCardsUI.handleSpendSimulation();">
            </div>

            <div style="margin-bottom: 16px;">
              <label style="font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 6px; display:block;">Spend Category</label>
              <select id="simCategorySelect" class="cc-input" onchange="window.LM_CreditCardsUI.handleSpendSimulation()">
                <option value="Shopping">🛍️ Online Shopping</option>
                <option value="Dining">🍔 Food &amp; Dining</option>
                <option value="Fuel">⛽ Fuel &amp; Gas</option>
                <option value="Travel">✈️ Travel &amp; Flights</option>
                <option value="Groceries">🛒 Groceries &amp; Supermarket</option>
                <option value="Utilities">💡 Utilities &amp; Bills</option>
              </select>
            </div>

            <!-- Dynamic Simulation Output Box -->
            <div id="simResultsBox"></div>

            <div class="cc-modal-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
              <button type="button" class="cc-btn-edit" onclick="window.LM_CreditCardsUI.closeModal('ccSimulatorModal')">Close</button>
              <button type="button" class="cc-add-btn" onclick="window.LM_CreditCardsUI.applySimulatedSpend()">
                📝 Record as Transaction
              </button>
            </div>
          </div>
        </div>
      `;

      this.handleSpendSimulation();
    },

    /**
     * Compute and render spend simulation outcomes in real-time
     */
    handleSpendSimulation: function () {
      var cardId = document.getElementById('simCardSelect')?.value;
      var amt = parseFloat(document.getElementById('simSpendAmount')?.value) || 0;
      var cat = document.getElementById('simCategorySelect')?.value || 'Shopping';
      var box = document.getElementById('simResultsBox');
      if (!box || !cardId) return;

      var sim = window.LM_CreditCardsService?.simulateSpend(cardId, amt, cat);
      if (!sim) return;

      box.innerHTML = `
        <div style="background:var(--bg2,#11151f); border:1px solid var(--border); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; color:var(--text-3);">Card Utilization:</span>
            <span style="font-size:13px; font-weight:700;">
              ${sim.currentCardUtil}% → <strong style="color:${sim.newCardUtil > 50 ? 'var(--rose)' : sim.newCardUtil > 30 ? 'var(--gold)' : 'var(--emerald)'};">${sim.newCardUtil}%</strong>
            </span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; color:var(--text-3);">Portfolio Credit Health:</span>
            <span style="font-size:11px; font-weight:700; color:${sim.healthColor}; background:rgba(0,0,0,0.3); padding:3px 8px; border-radius:6px;">
              ${sim.healthStatus} (${sim.newPortfolioUtil}%)
            </span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:12px; color:var(--text-3);">0% Interest Grace Window:</span>
            <span style="font-size:13px; font-weight:700; color:#38bdf8;">
              ⚡ ${sim.graceDays} Days before payment
            </span>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px dashed var(--border); padding-top:8px;">
            <span style="font-size:12px; color:var(--text-3);">Projected Rewards:</span>
            <span style="font-size:13px; font-weight:800; color:#10b981;">
              ✨ ${_fmtINR(sim.projectedCashback)} (${sim.perkDesc})
            </span>
          </div>
          ${sim.isOverLimit ? `
            <div style="color:var(--rose); font-size:11px; font-weight:700; margin-top:4px;">
              ⚠️ Warning: This purchase exceeds the available credit limit on this card!
            </div>
          ` : ''}
        </div>
      `;
    },

    /**
     * Convert simulated spend into a real recorded transaction
     */
    applySimulatedSpend: async function () {
      var cardId = document.getElementById('simCardSelect')?.value;
      var amt = parseFloat(document.getElementById('simSpendAmount')?.value) || 0;
      var cat = document.getElementById('simCategorySelect')?.value || 'Shopping';
      var card = window.LM_CreditCardsService?.getCardById(cardId);
      if (!card || amt <= 0) return;

      var newDue = Number(card.current_due || 0) + amt;
      var newAvail = Number(card.credit_limit || 0) - newDue;
      await window.LM_CreditCardsService.updateCard(cardId, {
        current_due: newDue,
        available_limit: newAvail
      });

      var tx = {
        id: typeof uid === 'function' ? uid('tx') : ('tx_' + Date.now()),
        date: new Date().toISOString().split('T')[0],
        type: 'out',
        amount: amt,
        category: cat,
        account: card.card_name || 'Credit Card',
        note: 'Credit Card Swipe - ' + card.card_name + ' (•••• ' + (card.last_4_digits || '0000') + ')',
        profile: window.LM_Auth?.getCurrentUserId?.() || 'default',
        createdAt: new Date().toISOString()
      };

      if (typeof window.put === 'function') {
        try { await window.put('transactions', tx); } catch (e) {}
      }
      if (typeof state === 'object' && Array.isArray(state.transactions)) {
        state.transactions.push(tx);
      }
      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:data:changed', { store: 'transactions' });
      }

      this.closeModal('ccSimulatorModal');
      this.render();
      if (typeof showToast === 'function') {
        showToast('✅ Recorded ₹' + amt.toLocaleString('en-IN') + ' spend on ' + card.card_name, 'success');
      }
    },

    /**
     * Show Payment History Modal
     */
    showHistoryModal: function (cardId) {
      var card = window.LM_CreditCardsService?.getCardById(cardId);
      if (!card) return;
      var history = window.LM_CreditCardsService?.getCardPaymentHistory(cardId) || [];

      var modalContainer = document.getElementById('creditCardModals');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'creditCardModals';
        document.body.appendChild(modalContainer);
      }

      modalContainer.innerHTML = `
        <div class="modal-overlay show" id="ccHistoryModal" style="display:flex;">
          <div class="modal-box glass" style="max-width: 480px; width: 95%; max-height: 85vh; overflow-y:auto; padding: 24px; border-radius: 18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
              <div>
                <h2 style="font-size: 1.25rem; font-weight:700; color:var(--text); margin:0;">
                  📜 Bill Payment History
                </h2>
                <div style="font-size: 12px; color:var(--text-3); margin-top:2px;">
                  ${_escape(card.bank_name)} ${_escape(card.card_name)} (•••• ${_escape(card.last_4_digits || '0000')})
                </div>
              </div>
              <button type="button" onclick="window.LM_CreditCardsUI.closeModal('ccHistoryModal')" style="background:none; border:none; font-size:24px; color:var(--text-3); cursor:pointer;" aria-label="Close">&times;</button>
            </div>

            ${history.length === 0 ? `
              <div style="text-align:center; padding:30px 10px; color:var(--text-3); font-size:12px;">
                No payments logged yet on this card. When you pay bills using the Pay Bill modal, records will appear here.
              </div>
            ` : `
              <div style="display:flex; flex-direction:column; gap:8px;">
                ${history.map(item => `
                  <div style="background:var(--bg2,#11151f); border:1px solid var(--border); border-radius:10px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                      <div style="font-size:13px; font-weight:700; color:var(--emerald);">${_fmtINR(item.amount)}</div>
                      <div style="font-size:11px; color:var(--text-3);">From: ${_escape(item.accountId || 'Bank')} · ${_escape(item.date)}</div>
                    </div>
                    <div style="text-align:right;">
                      <div style="font-size:10px; color:var(--text-3);">Remaining Due:</div>
                      <div style="font-size:12px; font-weight:600; color:var(--text);">${_fmtINR(item.remainingDue)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}

            <div style="display:flex; justify-content:flex-end; margin-top:20px;">
              <button type="button" class="cc-btn-edit" onclick="window.LM_CreditCardsUI.closeModal('ccHistoryModal')">Close</button>
            </div>
          </div>
        </div>
      `;
    },

    /**
     * Show Add / Edit Credit Card Modal
     */
    showAddEditModal: function (cardId) {
      var card = cardId ? window.LM_CreditCardsService?.getCardById(cardId) : null;
      var isEdit = !!card;

      var modalContainer = document.getElementById('creditCardModals');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'creditCardModals';
        document.body.appendChild(modalContainer);
      } else if (modalContainer.parentNode !== document.body) {
        document.body.appendChild(modalContainer);
      }

      var selectedTheme = card?.color_theme || 'theme-midnight';
      var perksStr = Array.isArray(card?.perks) ? card.perks.join(', ') : (card?.notes || '');

      modalContainer.innerHTML = `
        <div class="modal-overlay show" id="ccFormModal" style="display:flex;">
          <div class="modal-box glass" style="max-width: 540px; width: 95%; max-height: 90vh; overflow-y: auto; padding: 24px; border-radius: 18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
              <h2 style="font-size: 1.25rem; font-weight:700; color:var(--text); margin:0;">
                ${isEdit ? '✏️ Edit Credit Card' : '＋ Add New Credit Card'}
              </h2>
              <button type="button" onclick="window.LM_CreditCardsUI.closeModal('ccFormModal')" style="background:none; border:none; font-size:24px; color:var(--text-3); cursor:pointer; padding:4px 8px;" aria-label="Close">&times;</button>
            </div>

            <form id="ccCardForm" onsubmit="window.LM_CreditCardsUI.handleSaveCard(event, '${cardId || ''}')">
              <div class="cc-form-grid">

                <div class="cc-form-group">
                  <label for="ccBankName">Bank Name *</label>
                  <input type="text" id="ccBankName" class="cc-input" placeholder="e.g. HDFC Bank, SBI, ICICI" required value="${_escape(card?.bank_name || '')}">
                </div>

                <div class="cc-form-group">
                  <label for="ccCardName">Card Name / Variant *</label>
                  <input type="text" id="ccCardName" class="cc-input" placeholder="e.g. Millennia, Regalia, Amazon Pay" required value="${_escape(card?.card_name || '')}">
                </div>

                <div class="cc-form-group">
                  <label for="ccNetwork">Card Network *</label>
                  <select id="ccNetwork" class="cc-input">
                    <option value="Visa" ${card?.card_network === 'Visa' ? 'selected' : ''}>Visa</option>
                    <option value="Mastercard" ${card?.card_network === 'Mastercard' ? 'selected' : ''}>Mastercard</option>
                    <option value="RuPay" ${card?.card_network === 'RuPay' ? 'selected' : ''}>RuPay</option>
                    <option value="Amex" ${card?.card_network === 'Amex' ? 'selected' : ''}>American Express</option>
                    <option value="Diners" ${card?.card_network === 'Diners' ? 'selected' : ''}>Diners Club</option>
                  </select>
                </div>

                <div class="cc-form-group">
                  <label for="ccLast4">Last 4 Digits</label>
                  <input type="text" id="ccLast4" class="cc-input" maxlength="4" placeholder="e.g. 4829" value="${_escape(card?.last_4_digits || '')}">
                </div>

                <div class="cc-form-group">
                  <label for="ccLimit">Total Credit Limit (₹) *</label>
                  <input type="number" id="ccLimit" class="cc-input" step="1000" min="0" placeholder="e.g. 150000" required value="${card?.credit_limit || ''}">
                </div>

                <div class="cc-form-group">
                  <label for="ccCurrentDue">Current Outstanding Due (₹)</label>
                  <input type="number" id="ccCurrentDue" class="cc-input" step="1" min="0" placeholder="e.g. 24500" value="${card?.current_due || 0}">
                </div>

                <div class="cc-form-group">
                  <label for="ccStmtDay">Statement Generation Day (1-31) *</label>
                  <input type="number" id="ccStmtDay" class="cc-input" min="1" max="31" placeholder="e.g. 15" required value="${card?.statement_day || 15}">
                </div>

                <div class="cc-form-group">
                  <label for="ccDueDay">Payment Due Day (1-31) *</label>
                  <input type="number" id="ccDueDay" class="cc-input" min="1" max="31" placeholder="e.g. 5" required value="${card?.due_day || 5}">
                </div>

                <!-- Luxury Perks & Lounge Fields -->
                <div class="cc-form-group">
                  <label for="ccLoungeTotal">Quarterly Lounge Visits</label>
                  <input type="number" id="ccLoungeTotal" class="cc-input" min="0" max="20" placeholder="e.g. 4" value="${card?.lounge_total || 0}">
                </div>

                <div class="cc-form-group">
                  <label for="ccMilestoneTarget">Milestone Spend Target (₹)</label>
                  <input type="number" id="ccMilestoneTarget" class="cc-input" step="5000" min="0" placeholder="e.g. 100000" value="${card?.milestone_target || 0}">
                </div>

                <div class="cc-form-group full-width">
                  <label for="ccMilestoneReward">Milestone Reward Note</label>
                  <input type="text" id="ccMilestoneReward" class="cc-input" placeholder="e.g. ₹1,500 Amazon Gift Voucher" value="${_escape(card?.milestone_reward || '')}">
                </div>

                <div class="cc-form-group full-width">
                  <label for="ccPerks">Key Perks &amp; Cashback (comma-separated)</label>
                  <input type="text" id="ccPerks" class="cc-input" placeholder="e.g. 5% on Amazon, 4% Swiggy, 1% Fuel Waiver" value="${_escape(perksStr)}">
                </div>

                <div class="cc-form-group full-width">
                  <label>Card Color Texture Theme</label>
                  <div class="cc-theme-picker" id="ccThemePicker" style="display:flex; gap:8px; flex-wrap:wrap;">
                    ${THEMES.map(t => `
                      <div class="cc-theme-opt ${t.id === selectedTheme ? 'selected' : ''}"
                           style="background:${t.color}; width:32px; height:32px; border-radius:8px; cursor:pointer; border:2px solid ${t.id === selectedTheme ? '#38bdf8' : 'rgba(255,255,255,0.2)'};"
                           data-theme-id="${t.id}"
                           title="${t.name}"
                           onclick="window.LM_CreditCardsUI.selectTheme('${t.id}')">
                      </div>
                    `).join('')}
                  </div>
                  <input type="hidden" id="ccSelectedTheme" value="${selectedTheme}">
                </div>

                <div class="cc-form-group">
                  <label for="ccCvv">Card CVV (Optional / Masked)</label>
                  <input type="password" id="ccCvv" class="cc-input" maxlength="4" placeholder="•••" value="${_escape(card?.cvv || '')}">
                </div>

                <div class="cc-form-group">
                  <label for="ccNotes">Notes (Optional)</label>
                  <input type="text" id="ccNotes" class="cc-input" placeholder="e.g. Primary salary card" value="${_escape(card?.notes || '')}">
                </div>

              </div>

              <div class="cc-modal-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top: 24px; padding-bottom: 8px;">
                <button type="button" class="cc-btn-edit" onclick="window.LM_CreditCardsUI.closeModal('ccFormModal')">Cancel</button>
                <button type="submit" class="cc-add-btn" id="btnSaveCreditCard">${isEdit ? 'Save Changes' : '＋ Add Card'}</button>
              </div>
            </form>
          </div>
        </div>
      `;
    },

    /**
     * Select theme in modal
     */
    selectTheme: function (themeId) {
      var input = document.getElementById('ccSelectedTheme');
      if (input) input.value = themeId;

      document.querySelectorAll('#ccThemePicker .cc-theme-opt').forEach(function (el) {
        var isMatch = el.getAttribute('data-theme-id') === themeId;
        el.classList.toggle('selected', isMatch);
        el.style.borderColor = isMatch ? '#38bdf8' : 'rgba(255,255,255,0.2)';
      });
    },

    /**
     * Handle Save Card submit
     */
    handleSaveCard: async function (e, cardId) {
      if (e && e.preventDefault) e.preventDefault();
      var bankName = document.getElementById('ccBankName')?.value?.trim();
      var cardName = document.getElementById('ccCardName')?.value?.trim();
      var network = document.getElementById('ccNetwork')?.value || 'Visa';
      var last4 = document.getElementById('ccLast4')?.value?.trim();
      var limit = parseFloat(document.getElementById('ccLimit')?.value) || 0;
      var currentDue = parseFloat(document.getElementById('ccCurrentDue')?.value) || 0;
      var stmtDay = parseInt(document.getElementById('ccStmtDay')?.value, 10) || 15;
      var dueDay = parseInt(document.getElementById('ccDueDay')?.value, 10) || 5;
      var theme = document.getElementById('ccSelectedTheme')?.value || 'theme-midnight';
      var notes = document.getElementById('ccNotes')?.value?.trim();
      var cvv = document.getElementById('ccCvv')?.value?.trim();
      var loungeTotal = parseInt(document.getElementById('ccLoungeTotal')?.value, 10) || 0;
      var milestoneTarget = parseFloat(document.getElementById('ccMilestoneTarget')?.value) || 0;
      var milestoneReward = document.getElementById('ccMilestoneReward')?.value?.trim();
      var perksStr = document.getElementById('ccPerks')?.value?.trim();

      if (!bankName) {
        if (typeof showToast === 'function') showToast('❌ Please enter Bank Name', 'error');
        return;
      }
      if (!cardName) {
        if (typeof showToast === 'function') showToast('❌ Please enter Card Name / Variant', 'error');
        return;
      }
      if (!limit || limit <= 0) {
        if (typeof showToast === 'function') showToast('❌ Please enter a valid Credit Limit', 'error');
        return;
      }

      var cardData = {
        bank_name: bankName,
        card_name: cardName,
        card_network: network,
        last_4_digits: last4,
        credit_limit: limit,
        current_due: currentDue,
        min_due: Math.round(currentDue * 0.05),
        statement_day: stmtDay,
        due_day: dueDay,
        color_theme: theme,
        notes: notes,
        cvv: cvv,
        lounge_total: loungeTotal,
        milestone_target: milestoneTarget,
        milestone_reward: milestoneReward,
        perks: perksStr
      };

      try {
        if (cardId) {
          await window.LM_CreditCardsService.updateCard(cardId, cardData);
          if (typeof showToast === 'function') showToast('✅ Card updated successfully', 'success');
        } else {
          await window.LM_CreditCardsService.addCard(cardData);
          if (typeof showToast === 'function') showToast('✅ Credit card added', 'success');
        }
        this.closeModal('ccFormModal');
        this.render();
        if (typeof renderAll === 'function') renderAll();
        if (typeof window.renderDashboardCreditCardReminders === 'function') window.renderDashboardCreditCardReminders();
      } catch (err) {
        console.error('[CreditCardsUI] save error:', err);
        if (typeof showToast === 'function') showToast('❌ Error saving card: ' + err.message, 'error');
      }
    },

    /**
     * Show Pay Bill Modal with Celebratory Potential
     */
    showPayBillModal: function (cardId) {
      var card = window.LM_CreditCardsService?.getCardById(cardId);
      if (!card) return;

      var currentDue = Number(card.current_due || 0);
      var minDue = Number(card.min_due || Math.round(currentDue * 0.05));
      var halfDue = Math.round(currentDue / 2);

      var accounts = (typeof state === 'object' && state.dropdowns?.accounts) || ['Bank', 'Cash'];

      var modalContainer = document.getElementById('creditCardModals');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'creditCardModals';
        document.body.appendChild(modalContainer);
      } else if (modalContainer.parentNode !== document.body) {
        document.body.appendChild(modalContainer);
      }

      var todayISO = new Date().toISOString().split('T')[0];

      modalContainer.innerHTML = `
        <div class="modal-overlay show" id="ccPayModal" style="display:flex;">
          <div class="modal-box glass" style="max-width: 480px; width: 95%; padding: 24px; border-radius: 18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
              <div>
                <h2 style="font-size: 1.25rem; font-weight:700; color:var(--text); margin:0;">
                  💳 Pay Credit Card Bill
                </h2>
                <div style="font-size: 12px; color:var(--text-3); margin-top:2px;">
                  ${_escape(card.bank_name)} ${_escape(card.card_name)} (•••• ${_escape(card.last_4_digits || '0000')})
                </div>
              </div>
              <button type="button" onclick="window.LM_CreditCardsUI.closeModal('ccPayModal')" style="background:none; border:none; font-size:24px; color:var(--text-3); cursor:pointer; padding:4px 8px;" aria-label="Close">&times;</button>
            </div>

            <!-- Dues Info Box -->
            <div style="background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; color: var(--text-3);">Total Outstanding</div>
                <div class="blur-val" style="font-size: 1.4rem; font-weight: 700; color: ${currentDue > 0 ? 'var(--rose)' : 'var(--emerald)'}; font-family: var(--font-m);">
                  ${_fmtINR(currentDue)}
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size: 11px; color: var(--text-3);">Minimum Due</div>
                <div class="blur-val" style="font-size: 1.1rem; font-weight: 600; color: var(--text);">
                  ${_fmtINR(minDue)}
                </div>
              </div>
            </div>

            <form onsubmit="window.LM_CreditCardsUI.handlePaySubmit(event, '${card.id}')">
              <!-- Quick Amount Pills -->
              <div style="margin-bottom: 14px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 6px; display:block;">Quick Select Presets</label>
                <div style="display:flex; gap: 8px; flex-wrap:wrap;">
                  <button type="button" class="cc-filter-pill active" onclick="document.getElementById('ccPayAmount').value = '${currentDue}';">
                    Full Due (${_fmtINR(currentDue)})
                  </button>
                  ${minDue > 0 && minDue < currentDue ? `
                    <button type="button" class="cc-filter-pill" onclick="document.getElementById('ccPayAmount').value = '${minDue}';">
                      Min Due (${_fmtINR(minDue)})
                    </button>
                  ` : ''}
                  ${halfDue > 0 && halfDue < currentDue ? `
                    <button type="button" class="cc-filter-pill" onclick="document.getElementById('ccPayAmount').value = '${halfDue}';">
                      50% (${_fmtINR(halfDue)})
                    </button>
                  ` : ''}
                </div>
              </div>

              <div class="cc-form-group" style="margin-bottom: 14px;">
                <label for="ccPayAmount">Payment Amount (₹) *</label>
                <input type="number" id="ccPayAmount" class="cc-input" step="1" min="1" max="${Math.max(1, currentDue * 2)}" value="${currentDue}" required>
              </div>

              <div class="cc-form-group" style="margin-bottom: 14px;">
                <label for="ccPayAccount">Pay From Account *</label>
                <select id="ccPayAccount" class="cc-input">
                  ${accounts.map(acc => `<option value="${_escape(acc)}">${_escape(acc)}</option>`).join('')}
                </select>
              </div>

              <div class="cc-form-group" style="margin-bottom: 14px;">
                <label for="ccPayDate">Payment Date *</label>
                <input type="date" id="ccPayDate" class="cc-input" value="${todayISO}" required>
              </div>

              <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="ccRecordTx" checked style="accent-color: var(--teal); width: 16px; height: 16px;">
                <label for="ccRecordTx" style="font-size: 12px; color: var(--text-2); cursor:pointer;">
                  Record as bill payment transaction in Expense history
                </label>
              </div>

              <div class="cc-modal-actions" style="display:flex; justify-content:flex-end; gap:10px; padding-bottom: 8px;">
                <button type="button" class="cc-btn-edit" onclick="window.LM_CreditCardsUI.closeModal('ccPayModal')">Cancel</button>
                <button type="submit" class="cc-btn-pay" style="padding: 8px 20px;">Confirm &amp; Pay Bill</button>
              </div>
            </form>
          </div>
        </div>
      `;
    },

    /**
     * Handle Pay Bill submit
     */
    handlePaySubmit: async function (e, cardId) {
      if (e && e.preventDefault) e.preventDefault();
      var amount = parseFloat(document.getElementById('ccPayAmount')?.value) || 0;
      var account = document.getElementById('ccPayAccount')?.value;
      var paymentDate = document.getElementById('ccPayDate')?.value;
      var recordTx = document.getElementById('ccRecordTx')?.checked !== false;

      if (amount <= 0) {
        if (typeof showToast === 'function') showToast('❌ Please enter a valid payment amount', 'error');
        return;
      }

      try {
        var res = await window.LM_CreditCardsService.payCardBill({
          cardId: cardId,
          amount: amount,
          paymentDate: paymentDate,
          accountId: account,
          recordAsTransaction: recordTx
        });

        this.closeModal('ccPayModal');

        // Check if bill has been cleared to 0 for celebration!
        if (res && res.remainingDue <= 0) {
          this._triggerConfetti();
          if (window.LM_Haptics) window.LM_Haptics.success();
          if (typeof showToast === 'function') {
            showToast('🎉 Outstanding balance cleared to ₹0! Congratulations!', 'success');
          }
        }

        this.render();
        if (typeof renderAll === 'function') renderAll();
        if (typeof window.renderDashboardCreditCardReminders === 'function') window.renderDashboardCreditCardReminders();
      } catch (err) {
        console.error('[CreditCardsUI] payment error:', err);
        if (typeof showToast === 'function') showToast('❌ Payment failed: ' + err.message, 'error');
      }
    },

    /**
     * Open or create reminder for specific credit card
     */
    openCardReminder: function (cardId) {
      var card = window.LM_CreditCardsService?.getCardById(cardId);
      if (!card) return;

      var dueInfo = window.LM_CreditCardsService?.getDueCountdown(card);
      var currentDue = Number(card.current_due || 0);
      var minDue = Number(card.min_due || Math.round(currentDue * 0.05));

      var existingRem = (state.reminders || []).find(function (r) {
        return String(r.id) === 'rem_cc_' + cardId || String(r.cardId) === String(cardId);
      });

      var prefill = existingRem || {
        id: 'rem_cc_' + card.id,
        cardId: card.id,
        title: 'Pay ' + (card.card_name || 'Card') + ' (' + (card.bank_name || 'Bank') + ') Bill',
        dueDate: (dueInfo && dueInfo.nextDueDate !== 'N/A' && dueInfo.nextDueDate !== 'Cleared') ? dueInfo.nextDueDate : new Date().toISOString().split('T')[0],
        time: '10:00',
        priority: (dueInfo && (dueInfo.isOverdue || dueInfo.isDueToday)) ? 'high' : (dueInfo && dueInfo.isDueSoon) ? 'medium' : 'low',
        tag: 'Credit Card',
        category: 'Bills',
        note: 'Outstanding Due: ' + _fmtINR(currentDue) + ' (Min Due: ' + _fmtINR(minDue) + ') • Card ending in •••• ' + (card.last_4_digits || '0000')
      };

      if (typeof window.showRemindersModal === 'function') {
        window.showRemindersModal(prefill);
      } else {
        if (typeof showToast === 'function') showToast('Reminder due date: ' + prefill.dueDate, 'info');
      }
    },

    /**
     * Render Credit Card Bill Reminders & Pending Payments Widget on Dashboard
     */
    renderDashboardWidget: function (containerEl) {
      var container = containerEl || document.getElementById('dashCcRemindersWidget');
      if (!container) return;

      var service = window.LM_CreditCardsService;
      if (!service) {
        container.innerHTML = '';
        return;
      }

      var allCards = service.getAllCards();
      var pendingSummary = service.getPendingSummary();
      var pendingCards = pendingSummary.pendingCards;

      // Update section badge if element exists
      var badgeEl = document.getElementById('dashCcPendingBadge');
      if (badgeEl) {
        if (pendingSummary.overdueCount > 0) {
          badgeEl.className = 'dash-cc-header-badge overdue';
          badgeEl.textContent = pendingSummary.overdueCount + ' OVERDUE';
          badgeEl.style.display = 'inline-block';
        } else if (pendingSummary.dueSoonCount > 0) {
          badgeEl.className = 'dash-cc-header-badge duesoon';
          badgeEl.textContent = pendingSummary.dueSoonCount + ' Due Soon';
          badgeEl.style.display = 'inline-block';
        } else if (pendingSummary.pendingCount > 0) {
          badgeEl.className = 'dash-cc-header-badge pending';
          badgeEl.textContent = pendingSummary.pendingCount + ' Pending';
          badgeEl.style.display = 'inline-block';
        } else if (allCards.length > 0) {
          badgeEl.className = 'dash-cc-header-badge allclear';
          badgeEl.textContent = 'All Cleared';
          badgeEl.style.display = 'inline-block';
        } else {
          badgeEl.style.display = 'none';
        }
      }

      // 1. Pending Dues State
      if (pendingSummary.hasPendingDues) {
        var html = `
          <div class="dash-cc-container">
            <!-- Dues Summary Highlight Header -->
            <div class="dash-cc-summary-banner ${pendingSummary.overdueCount > 0 ? 'is-overdue' : pendingSummary.dueSoonCount > 0 ? 'is-duesoon' : ''}">
              <div class="dash-cc-sum-item">
                <div class="dash-cc-sum-label">Total Pending Bills</div>
                <div class="dash-cc-sum-val blur-val" style="color:var(--rose);">${_fmtINR(pendingSummary.totalPendingDue)}</div>
              </div>
              <div class="dash-cc-sum-divider"></div>
              <div class="dash-cc-sum-item">
                <div class="dash-cc-sum-label">Total Min Due</div>
                <div class="dash-cc-sum-val blur-val" style="color:var(--gold);">${_fmtINR(pendingSummary.totalMinDue)}</div>
              </div>
              <div class="dash-cc-sum-divider"></div>
              <div class="dash-cc-sum-item">
                <div class="dash-cc-sum-label">Urgent Status</div>
                <div class="dash-cc-sum-status">
                  ${pendingSummary.overdueCount > 0
                    ? `<span class="dash-cc-tag overdue">🚨 ${pendingSummary.overdueCount} Overdue Bill(s)</span>`
                    : pendingSummary.dueSoonCount > 0
                      ? `<span class="dash-cc-tag duesoon">⏳ ${pendingSummary.dueSoonCount} Due Soon</span>`
                      : `<span class="dash-cc-tag normal">📅 ${pendingSummary.pendingCount} Active Bill(s)</span>`}
                </div>
              </div>
            </div>

            <!-- Pending Cards Grid -->
            <div class="dash-cc-grid">
              ${pendingCards.map(function (card) {
                var cd = service.getDueCountdown(card);
                var curDue = Number(card.current_due || 0);
                var minDue = Number(card.min_due || Math.round(curDue * 0.05));
                var limit = Number(card.credit_limit || 0);
                var utilPct = limit > 0 ? Math.min(100, Math.round((curDue / limit) * 100)) : 0;
                var badgeCls = cd.isOverdue ? 'overdue' : (cd.isDueSoon || cd.isDueToday) ? 'duesoon' : 'dueok';
                var badgeIcon = cd.isOverdue ? '🚨' : cd.isDueSoon ? '⏳' : cd.isDueToday ? '⚠️' : '📅';

                return `
                  <div class="dash-cc-card ${card.color_theme || 'theme-midnight'}">
                    <div class="dash-cc-card-header">
                      <div class="dash-cc-card-bank">
                        <div class="dash-cc-bank-title">${_escape(card.bank_name || 'Bank')}</div>
                        <div class="dash-cc-card-name">${_escape(card.card_name || 'Card')} <span class="dash-cc-last4">•••• ${_escape(card.last_4_digits || '0000')}</span></div>
                      </div>
                      <div class="dash-cc-badge ${badgeCls}">
                        <span>${badgeIcon}</span> <span>${cd.statusText}</span>
                      </div>
                    </div>

                    <div class="dash-cc-due-row">
                      <div>
                        <div class="dash-cc-due-lbl">Amount Due</div>
                        <div class="dash-cc-due-amount blur-val">${_fmtINR(curDue)}</div>
                      </div>
                      <div style="text-align:right;">
                        <div class="dash-cc-due-lbl">Min Due</div>
                        <div class="dash-cc-min-amount blur-val">${_fmtINR(minDue)}</div>
                      </div>
                    </div>

                    <div class="dash-cc-meta-row">
                      <span>Due: <strong>${cd.nextDueDate}</strong></span>
                      <span>Stmt: <strong>${card.statement_day ? card.statement_day + 'th' : 'N/A'}</strong></span>
                      <span>Util: <strong>${utilPct}%</strong></span>
                    </div>

                    <div class="dash-cc-util-track">
                      <div class="dash-cc-util-bar ${utilPct > 50 ? 'danger' : utilPct > 30 ? 'warning' : 'safe'}" style="width:${utilPct}%;"></div>
                    </div>

                    <div class="dash-cc-card-actions">
                      <button class="dash-cc-btn-pay" onclick="window.LM_CreditCardsUI.showPayBillModal('${card.id}')">
                        💳 Pay Bill
                      </button>
                      <button class="dash-cc-btn-remind" onclick="window.LM_CreditCardsUI.openCardReminder('${card.id}')" title="Snooze or Set Custom Reminder">
                        ⏰ Remind
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
        container.innerHTML = html;
        return;
      }

      // 2. All Cards Cleared State
      if (allCards.length > 0) {
        var summary = service.getSummary();
        container.innerHTML = `
          <div class="dash-cc-all-clear">
            <div class="dash-cc-clear-icon">🎉</div>
            <div class="dash-cc-clear-content">
              <div class="dash-cc-clear-title">All Credit Card Bills Cleared!</div>
              <div class="dash-cc-clear-desc">
                You have zero pending credit card dues across <strong>${allCards.length}</strong> active cards. Total available credit: <strong class="blur-val">${_fmtINR(summary.totalAvailable)}</strong>.
              </div>
            </div>
            <button class="dash-cc-btn-manage" onclick="showPage('credit-cards')">
              View Cards →
            </button>
          </div>
        `;
        return;
      }

      // 3. Empty State (No cards registered)
      container.innerHTML = `
        <div class="dash-cc-empty">
          <div class="dash-cc-empty-icon">💳</div>
          <div class="dash-cc-empty-content">
            <div class="dash-cc-empty-title">Track Credit Cards &amp; Payment Deadlines</div>
            <div class="dash-cc-empty-desc">
              Add your credit cards to receive automated payment reminders, prevent late fees, and monitor bill statement dates.
            </div>
          </div>
          <button class="dash-cc-btn-pay" onclick="window.LM_CreditCardsUI.showAddEditModal()">
            ＋ Add Credit Card
          </button>
        </div>
      `;
    },

    /**
     * Render Top Urgent Reminder Banner on Dashboard (Overdue / Due within 5 days)
     */
    renderUrgentBanner: function (containerEl) {
      var container = containerEl || document.getElementById('dashCcUrgentBanner');
      if (!container) return;

      var service = window.LM_CreditCardsService;
      if (!service) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
      }

      var pendingSummary = service.getPendingSummary();
      if (!pendingSummary.hasUrgentDues) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
      }

      var isOverdue = pendingSummary.overdueCount > 0;
      var bannerCls = isOverdue ? 'banner-overdue' : 'banner-duesoon';
      var icon = isOverdue ? '🚨' : '⏳';
      var title = isOverdue
        ? `<strong>Urgent:</strong> You have ${pendingSummary.overdueCount} overdue credit card payment(s)`
        : `<strong>Payment Reminder:</strong> ${pendingSummary.dueSoonCount} credit card bill(s) due soon`;

      var earliest = pendingSummary.earliestDueCard;
      var earliestInfo = pendingSummary.earliestDueInfo;
      var subtitle = earliest
        ? `Total Pending: <strong class="blur-val">${_fmtINR(pendingSummary.totalPendingDue)}</strong> · Next due: <strong>${_escape(earliest.card_name)}</strong> (${earliestInfo?.statusText || ''})`
        : `Total Pending: <strong class="blur-val">${_fmtINR(pendingSummary.totalPendingDue)}</strong>`;

      container.innerHTML = `
        <div class="dash-cc-urgent-alert ${bannerCls}">
          <div class="dash-cc-urgent-left">
            <span class="dash-cc-urgent-icon">${icon}</span>
            <div class="dash-cc-urgent-text">
              <div class="dash-cc-urgent-title">${title}</div>
              <div class="dash-cc-urgent-sub">${subtitle}</div>
            </div>
          </div>
          <div class="dash-cc-urgent-actions">
            ${earliest ? `
              <button class="dash-cc-urgent-btn-pay" onclick="window.LM_CreditCardsUI.showPayBillModal('${earliest.id}')">
                💳 Pay Now
              </button>
            ` : ''}
            <button class="dash-cc-urgent-btn-view" onclick="showPage('credit-cards')">
              View All
            </button>
          </div>
        </div>
      `;
      container.style.display = 'block';
    },

    /**
     * Confirm and delete card
     */
    confirmDelete: async function (cardId) {
      var card = window.LM_CreditCardsService?.getCardById(cardId);
      if (!card) return;

      var confirmed = confirm('Are you sure you want to delete ' + card.card_name + ' (' + (card.bank_name || 'Card') + ')? This will remove it from your credit card tracker.');
      if (!confirmed) return;

      try {
        await window.LM_CreditCardsService.deleteCard(cardId);
        if (typeof showToast === 'function') showToast('Card deleted', 'info');
        this.render();
        if (typeof renderAll === 'function') renderAll();
        if (typeof window.renderDashboardCreditCardReminders === 'function') window.renderDashboardCreditCardReminders();
      } catch (err) {
        console.error('[CreditCardsUI] delete error:', err);
        if (typeof showToast === 'function') showToast('❌ Delete failed: ' + err.message, 'error');
      }
    },

    /**
     * Close modal by ID
     */
    closeModal: function (modalId) {
      var el = document.getElementById(modalId);
      if (el) {
        el.classList.remove('show');
        el.style.display = 'none';
        try { el.remove(); } catch(e) {}
      }
      var container = document.getElementById('creditCardModals');
      if (container) container.innerHTML = '';
      if (window.LM_syncModalState) {
        window.LM_syncModalState();
      }
    }
  };

  window.LM_CreditCardsUI = CreditCardsUI;
})();
