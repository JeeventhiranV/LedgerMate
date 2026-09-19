/**
 * LedgerMate – CreditCardsUI.js
 * ─────────────────────────────────────────────────────────────
 * User Interface for Credit Cards Module.
 * Renders glassmorphic cards, utilization meters, due countdown badges,
 * filter toolbars, Add/Edit modals, and quick Pay Bill modals.
 * Exposes: window.LM_CreditCardsUI
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _activeFilter = 'all';

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
    { id: 'theme-midnight', name: 'Midnight', color: '#0f172a' },
    { id: 'theme-sapphire', name: 'Sapphire', color: '#1e3a8a' },
    { id: 'theme-emerald',  name: 'Emerald',  color: '#064e3b' },
    { id: 'theme-ruby',     name: 'Ruby',     color: '#881337' },
    { id: 'theme-gold',     name: 'Gold',     color: '#b45309' },
    { id: 'theme-platinum', name: 'Platinum', color: '#374151' },
    { id: 'theme-amethyst', name: 'Amethyst', color: '#5b21b6' }
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

      var html = `
        <div class="cc-container">

          <!-- ─── Header ─── -->
          <div class="cc-header">
            <div class="cc-title-area">
              <h1><span>💳</span> Credit Cards &amp; Bills</h1>
              <p>Track statement dates, payment deadlines, credit limits &amp; bill reminders</p>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button class="overview-tool-btn privacy-toggle-btn" style="background:var(--bg2,#11151f);border:1px solid var(--border,#1e2436);border-radius:10px;padding:7px 12px;" title="Toggle Balance Privacy (Stealth Mode)" onclick="window.LM_togglePrivacyMode()" aria-label="Privacy Mode">
                ${document.body.classList.contains('privacy-mode') ? '🙈' : '👁️'} <span class="overview-tool-label">Privacy</span>
              </button>
              <button class="cc-add-btn" onclick="window.LM_CreditCardsUI.showAddEditModal()">
                <span>＋</span> Add Credit Card
              </button>
            </div>
          </div>

          <!-- ─── KPI Summary Grid ─── -->
          <div class="cc-kpi-grid">
            <div class="cc-kpi-card" style="--kpi-accent: var(--teal);">
              <div class="cc-kpi-label">Total Credit Limit</div>
              <div class="cc-kpi-val">${_fmtINR(summary.totalLimit)}</div>
              <div class="cc-kpi-sub">Across ${summary.cardsCount} cards</div>
            </div>

            <div class="cc-kpi-card" style="--kpi-accent: ${summary.totalCurrentDue > 0 ? 'var(--rose)' : 'var(--emerald)'};">
              <div class="cc-kpi-label">Total Outstanding Due</div>
              <div class="cc-kpi-val" style="color: ${summary.totalCurrentDue > 0 ? 'var(--rose)' : 'var(--emerald)'};">
                ${_fmtINR(summary.totalCurrentDue)}
              </div>
              <div class="cc-kpi-sub">Min Due: ${_fmtINR(summary.totalMinDue)}</div>
            </div>

            <div class="cc-kpi-card" style="--kpi-accent: var(--emerald);">
              <div class="cc-kpi-label">Available Credit</div>
              <div class="cc-kpi-val" style="color: var(--emerald);">${_fmtINR(summary.totalAvailable)}</div>
              <div class="cc-kpi-sub">Ready to use</div>
            </div>

            <div class="cc-kpi-card" style="--kpi-accent: ${utilColor};">
              <div class="cc-kpi-label">Total Utilization</div>
              <div class="cc-kpi-val" style="color: ${utilColor};">${summary.utilizationPct}%</div>
              <div class="cc-kpi-sub">Status: ${dueSoonBadge}</div>
            </div>
          </div>

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
     * Render individual realistic credit card item
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
      var badgeCls = dueInfo.isPaid ? 'badge-paid'
        : dueInfo.isOverdue ? 'badge-overdue'
        : (dueInfo.isDueSoon || dueInfo.isDueToday) ? 'badge-duesoon' : 'badge-dueok';

      var badgeIcon = dueInfo.isPaid ? '✅' : dueInfo.isOverdue ? '🚨' : dueInfo.isDueSoon ? '⏳' : '📅';

      var holderName = window.LM_Auth?.getCurrentUser?.()?.username || 'CARDMEMBER';

      return `
        <div class="cc-card-item">
          <!-- Visual Glassmorphic Credit Card -->
          <div class="cc-card-art ${card.color_theme || 'theme-midnight'}">
            <!-- Top Bank & Network -->
            <div class="cc-card-top">
              <div>
                <div class="cc-bank-name">${_escape(card.bank_name || 'BANK')}</div>
                <div class="cc-card-model">${_escape(card.card_name || 'Credit Card')}</div>
              </div>
              <div class="cc-network-badge">${_escape(card.card_network || 'VISA')}</div>
            </div>

            <!-- EMV Chip & NFC -->
            <div class="cc-chip-row">
              <div class="cc-emv-chip"></div>
              <div class="cc-nfc-icon">📶</div>
            </div>

            <!-- Masked Card Number -->
            <div class="cc-number">•••• •••• •••• ${_escape(card.last_4_digits || '0000')}</div>

            <!-- Bottom Info -->
            <div class="cc-card-bottom">
              <div>
                <div class="cc-holder-label">CARDHOLDER</div>
                <div class="cc-holder-name">${_escape(holderName)}</div>
              </div>
              <div style="text-align:right;">
                <div class="cc-dates-label">DUE / STMT</div>
                <div class="cc-dates-val">${card.due_day || '05'}th · ${card.statement_day || '15'}th</div>
              </div>
            </div>
          </div>

          <!-- Card Details & Actions Container -->
          <div class="cc-details-card">
            <!-- Outstanding Due & Countdown Badge -->
            <div class="cc-dues-row">
              <div class="cc-due-amount-wrap">
                <span class="cc-due-label">Current Outstanding</span>
                <span class="cc-due-val" style="color: ${currentDue > 0 ? 'var(--rose)' : 'var(--emerald)'};">
                  ${_fmtINR(currentDue)}
                </span>
              </div>
              <div class="cc-countdown-badge ${badgeCls}">
                <span>${badgeIcon}</span>
                <span>${dueInfo.statusText}</span>
              </div>
            </div>

            <!-- Statement & Due Dates Metadata -->
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 11px; color: var(--text-3); background: var(--bg); padding: 8px 10px; border-radius: 8px;">
              <div>
                <span>Statement Date:</span>
                <strong style="color:var(--text); display:block;">${card.statement_day ? card.statement_day + 'th of month' : 'N/A'}</strong>
                <span style="font-size:10px;">(Next: ${stmtInfo.nextStatementDate})</span>
              </div>
              <div>
                <span>Payment Due Date:</span>
                <strong style="color:var(--text); display:block;">${card.due_day ? card.due_day + 'th of month' : 'N/A'}</strong>
                <span style="font-size:10px;">(Min Due: ${_fmtINR(minDue)})</span>
              </div>
            </div>

            <!-- Utilization Progress Bar -->
            <div class="cc-util-wrap">
              <div class="cc-util-header">
                <span>Credit Utilization: <strong>${utilPct}%</strong></span>
                <span>Avail: <strong>${_fmtINR(available)}</strong> / ${_fmtINR(limit)}</span>
              </div>
              <div class="cc-util-track">
                <div class="cc-util-fill ${utilCls}" style="width: ${utilPct}%;"></div>
              </div>
            </div>

            ${card.notes ? `
              <div style="font-size: 11px; color: var(--text-3); background: var(--bg); padding: 6px 10px; border-radius: 6px; font-style: italic;">
                💡 ${_escape(card.notes)}
              </div>
            ` : ''}

            <!-- Card Actions -->
            <div class="cc-actions-row">
              <button class="cc-btn-pay" onclick="window.LM_CreditCardsUI.showPayBillModal('${card.id}')">
                💳 Pay Bill
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
      }

      var selectedTheme = card?.color_theme || 'theme-midnight';

      modalContainer.innerHTML = `
        <div class="modal-overlay show" id="ccFormModal" style="display:flex;">
          <div class="modal-box glass" style="max-width: 540px; width: 95%; max-height: 90vh; overflow-y: auto; padding: 24px; border-radius: 18px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 18px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
              <h2 style="font-size: 1.25rem; font-weight:700; color:var(--text); margin:0;">
                ${isEdit ? '✏️ Edit Credit Card' : '＋ Add New Credit Card'}
              </h2>
              <button onclick="window.LM_CreditCardsUI.closeModal('ccFormModal')" style="background:none; border:none; font-size:24px; color:var(--text-3); cursor:pointer;">&times;</button>
            </div>

            <form id="ccCardForm" onsubmit="window.LM_CreditCardsUI.handleSaveCard(event, '${cardId || ''}')">
              <div class="cc-form-grid">

                <div class="cc-form-group">
                  <label>Bank Name *</label>
                  <input type="text" id="ccBankName" class="cc-input" placeholder="e.g. HDFC Bank, SBI, ICICI" required value="${_escape(card?.bank_name || '')}">
                </div>

                <div class="cc-form-group">
                  <label>Card Name / Variant *</label>
                  <input type="text" id="ccCardName" class="cc-input" placeholder="e.g. Millennia, Regalia, Amazon Pay" required value="${_escape(card?.card_name || '')}">
                </div>

                <div class="cc-form-group">
                  <label>Card Network *</label>
                  <select id="ccNetwork" class="cc-input">
                    <option value="Visa" ${card?.card_network === 'Visa' ? 'selected' : ''}>Visa</option>
                    <option value="Mastercard" ${card?.card_network === 'Mastercard' ? 'selected' : ''}>Mastercard</option>
                    <option value="RuPay" ${card?.card_network === 'RuPay' ? 'selected' : ''}>RuPay</option>
                    <option value="Amex" ${card?.card_network === 'Amex' ? 'selected' : ''}>American Express</option>
                    <option value="Diners" ${card?.card_network === 'Diners' ? 'selected' : ''}>Diners Club</option>
                  </select>
                </div>

                <div class="cc-form-group">
                  <label>Last 4 Digits</label>
                  <input type="text" id="ccLast4" class="cc-input" maxlength="4" placeholder="e.g. 4829" value="${_escape(card?.last_4_digits || '')}">
                </div>

                <div class="cc-form-group">
                  <label>Total Credit Limit (₹) *</label>
                  <input type="number" id="ccLimit" class="cc-input" step="1000" min="0" placeholder="e.g. 150000" required value="${card?.credit_limit || ''}">
                </div>

                <div class="cc-form-group">
                  <label>Current Outstanding Due (₹)</label>
                  <input type="number" id="ccCurrentDue" class="cc-input" step="1" min="0" placeholder="e.g. 24500" value="${card?.current_due || 0}">
                </div>

                <div class="cc-form-group">
                  <label>Statement Generation Day (1-31) *</label>
                  <input type="number" id="ccStmtDay" class="cc-input" min="1" max="31" placeholder="e.g. 15" required value="${card?.statement_day || 15}">
                </div>

                <div class="cc-form-group">
                  <label>Payment Due Day (1-31) *</label>
                  <input type="number" id="ccDueDay" class="cc-input" min="1" max="31" placeholder="e.g. 5" required value="${card?.due_day || 5}">
                </div>

                <div class="cc-form-group full-width">
                  <label>Card Color Gradient Theme</label>
                  <div class="cc-theme-picker" id="ccThemePicker">
                    ${THEMES.map(t => `
                      <div class="cc-theme-opt ${t.id === selectedTheme ? 'selected' : ''}"
                           style="background:${t.color};"
                           data-theme-id="${t.id}"
                           title="${t.name}"
                           onclick="window.LM_CreditCardsUI.selectTheme('${t.id}')">
                      </div>
                    `).join('')}
                  </div>
                  <input type="hidden" id="ccSelectedTheme" value="${selectedTheme}">
                </div>

                <div class="cc-form-group full-width">
                  <label>Perks / Notes (Optional)</label>
                  <input type="text" id="ccNotes" class="cc-input" placeholder="e.g. 5% cashback on Flipkart, 4 lounge visits" value="${_escape(card?.notes || '')}">
                </div>

              </div>

              <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 24px;">
                <button type="button" class="cc-btn-edit" onclick="window.LM_CreditCardsUI.closeModal('ccFormModal')">Cancel</button>
                <button type="submit" class="cc-add-btn">${isEdit ? 'Save Changes' : '＋ Add Card'}</button>
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
        el.classList.toggle('selected', el.getAttribute('data-theme-id') === themeId);
      });
    },

    /**
     * Handle Save Card submit
     */
    handleSaveCard: async function (e, cardId) {
      e.preventDefault();
      var bankName = document.getElementById('ccBankName')?.value?.trim();
      var cardName = document.getElementById('ccCardName')?.value?.trim();
      var network = document.getElementById('ccNetwork')?.value;
      var last4 = document.getElementById('ccLast4')?.value?.trim();
      var limit = parseFloat(document.getElementById('ccLimit')?.value) || 0;
      var currentDue = parseFloat(document.getElementById('ccCurrentDue')?.value) || 0;
      var stmtDay = parseInt(document.getElementById('ccStmtDay')?.value, 10) || 15;
      var dueDay = parseInt(document.getElementById('ccDueDay')?.value, 10) || 5;
      var theme = document.getElementById('ccSelectedTheme')?.value || 'theme-midnight';
      var notes = document.getElementById('ccNotes')?.value?.trim();

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
        notes: notes
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
      } catch (err) {
        console.error('[CreditCardsUI] save error:', err);
        if (typeof showToast === 'function') showToast('❌ Error saving card: ' + err.message, 'error');
      }
    },

    /**
     * Show Pay Bill Modal
     */
    showPayBillModal: function (cardId) {
      var card = window.LM_CreditCardsService?.getCardById(cardId);
      if (!card) return;

      var currentDue = Number(card.current_due || 0);
      var minDue = Number(card.min_due || Math.round(currentDue * 0.05));

      var accounts = state.dropdowns?.accounts || ['Bank', 'Cash'];

      var modalContainer = document.getElementById('creditCardModals');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'creditCardModals';
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
              <button onclick="window.LM_CreditCardsUI.closeModal('ccPayModal')" style="background:none; border:none; font-size:24px; color:var(--text-3); cursor:pointer;">&times;</button>
            </div>

            <!-- Dues Info Box -->
            <div style="background: var(--bg2); border: 1px solid var(--border); border-radius: 12px; padding: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; color: var(--text-3);">Total Outstanding</div>
                <div style="font-size: 1.4rem; font-weight: 700; color: ${currentDue > 0 ? 'var(--rose)' : 'var(--emerald)'}; font-family: var(--font-m);">
                  ${_fmtINR(currentDue)}
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size: 11px; color: var(--text-3);">Minimum Due</div>
                <div style="font-size: 1.1rem; font-weight: 600; color: var(--text);">
                  ${_fmtINR(minDue)}
                </div>
              </div>
            </div>

            <form onsubmit="window.LM_CreditCardsUI.handlePaySubmit(event, '${card.id}')">
              <!-- Quick Amount Pills -->
              <div style="margin-bottom: 14px;">
                <label style="font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 6px; display:block;">Quick Select Amount</label>
                <div style="display:flex; gap: 8px; flex-wrap:wrap;">
                  <button type="button" class="cc-filter-pill active" onclick="document.getElementById('ccPayAmount').value = '${currentDue}';">
                    Full Due (${_fmtINR(currentDue)})
                  </button>
                  ${minDue > 0 && minDue < currentDue ? `
                    <button type="button" class="cc-filter-pill" onclick="document.getElementById('ccPayAmount').value = '${minDue}';">
                      Min Due (${_fmtINR(minDue)})
                    </button>
                  ` : ''}
                </div>
              </div>

              <div class="cc-form-group" style="margin-bottom: 14px;">
                <label>Payment Amount (₹) *</label>
                <input type="number" id="ccPayAmount" class="cc-input" step="1" min="1" max="${Math.max(1, currentDue * 2)}" value="${currentDue}" required>
              </div>

              <div class="cc-form-group" style="margin-bottom: 14px;">
                <label>Pay From Account *</label>
                <select id="ccPayAccount" class="cc-input">
                  ${accounts.map(acc => `<option value="${_escape(acc)}">${_escape(acc)}</option>`).join('')}
                </select>
              </div>

              <div class="cc-form-group" style="margin-bottom: 14px;">
                <label>Payment Date *</label>
                <input type="date" id="ccPayDate" class="cc-input" value="${todayISO}" required>
              </div>

              <div style="margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="ccRecordTx" checked style="accent-color: var(--teal); width: 16px; height: 16px;">
                <label for="ccRecordTx" style="font-size: 12px; color: var(--text-2); cursor:pointer;">
                  Record as bill payment transaction in Expense history
                </label>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:10px;">
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
      e.preventDefault();
      var amount = parseFloat(document.getElementById('ccPayAmount')?.value) || 0;
      var account = document.getElementById('ccPayAccount')?.value;
      var paymentDate = document.getElementById('ccPayDate')?.value;
      var recordTx = document.getElementById('ccRecordTx')?.checked !== false;

      if (amount <= 0) {
        if (typeof showToast === 'function') showToast('❌ Please enter a valid payment amount', 'error');
        return;
      }

      try {
        await window.LM_CreditCardsService.payCardBill({
          cardId: cardId,
          amount: amount,
          paymentDate: paymentDate,
          accountId: account,
          recordAsTransaction: recordTx
        });
        this.closeModal('ccPayModal');
        this.render();
      } catch (err) {
        console.error('[CreditCardsUI] payment error:', err);
        if (typeof showToast === 'function') showToast('❌ Payment failed: ' + err.message, 'error');
      }
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
      }
    }
  };

  window.LM_CreditCardsUI = CreditCardsUI;
})();
