/**
 * LedgerMate – CreditCardsService.js
 * ─────────────────────────────────────────────────────────────
 * Credit Cards Service Layer.
 * Manages cards state, CRUD operations, statement & due date countdowns,
 * credit utilization metrics, bill payments, and cloud/IndexedDB persistence.
 * Exposes: window.LM_CreditCardsService
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _cards = [];
  var _isInitialized = false;

  function _getProfileId() {
    return window.LM_Auth?.getCurrentUserId?.() || 'default';
  }

  function _generateId() {
    return 'cc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  function _round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  var CreditCardsService = {
    /**
     * Initialize service from IndexedDB or state cache
     */
    init: async function () {
      try {
        if (typeof window.getAll === 'function') {
          var loaded = await window.getAll('credit_cards');
          if (Array.isArray(loaded)) {
            _cards = loaded;
            if (typeof state === 'object') {
              state.credit_cards = _cards;
            }
          }
        } else if (typeof state === 'object' && Array.isArray(state.credit_cards)) {
          _cards = state.credit_cards;
        }
      } catch (err) {
        console.warn('[CreditCardsService] init error, falling back to state:', err);
        if (typeof state === 'object' && Array.isArray(state.credit_cards)) {
          _cards = state.credit_cards;
        }
      }
      _isInitialized = true;
      try {
        await this.syncReminders();
      } catch (e) {
        console.warn('[CreditCardsService] syncReminders error during init:', e);
      }
      return _cards;
    },

    /**
     * Get all credit cards that have pending dues (current_due > 0)
     */
    getPendingCards: function () {
      var self = this;
      return _cards.filter(function (c) {
        return Number(c.current_due || 0) > 0;
      }).sort(function (a, b) {
        var dueA = self.getDueCountdown(a);
        var dueB = self.getDueCountdown(b);
        if (dueA.isOverdue && !dueB.isOverdue) return -1;
        if (!dueA.isOverdue && dueB.isOverdue) return 1;
        return (dueA.daysUntilDue || 999) - (dueB.daysUntilDue || 999);
      });
    },

    /**
     * Get pending summary metrics for dashboard and notifications
     */
    getPendingSummary: function () {
      var pendingCards = this.getPendingCards();
      var totalPendingDue = 0;
      var totalMinDue = 0;
      var overdueCount = 0;
      var dueSoonCount = 0;
      var earliestDueCard = pendingCards[0] || null;
      var earliestDueInfo = earliestDueCard ? this.getDueCountdown(earliestDueCard) : null;

      var self = this;
      pendingCards.forEach(function (c) {
        totalPendingDue += Number(c.current_due || 0);
        totalMinDue += Number(c.min_due || Math.round(Number(c.current_due || 0) * 0.05));
        var cd = self.getDueCountdown(c);
        if (cd.isOverdue) overdueCount++;
        else if (cd.isDueSoon || cd.isDueToday) dueSoonCount++;
      });

      return {
        pendingCards: pendingCards,
        pendingCount: pendingCards.length,
        totalPendingDue: _round2(totalPendingDue),
        totalMinDue: _round2(totalMinDue),
        overdueCount: overdueCount,
        dueSoonCount: dueSoonCount,
        earliestDueCard: earliestDueCard,
        earliestDueInfo: earliestDueInfo,
        hasPendingDues: pendingCards.length > 0,
        hasUrgentDues: overdueCount > 0 || dueSoonCount > 0
      };
    },

    /**
     * Synchronize credit card payment reminders with global reminders store
     */
    syncReminders: async function () {
      if (!Array.isArray(_cards)) return [];
      var self = this;
      var existingReminders = [];
      if (typeof window.getAll === 'function') {
        try {
          var loaded = await window.getAll('reminders');
          if (Array.isArray(loaded)) existingReminders = loaded;
        } catch (e) {
          existingReminders = (typeof state === 'object' && Array.isArray(state.reminders)) ? state.reminders : [];
        }
      } else if (typeof state === 'object' && Array.isArray(state.reminders)) {
        existingReminders = state.reminders;
      }

      var remindersMap = new Map();
      existingReminders.forEach(function (r) {
        if (r && r.id) remindersMap.set(String(r.id), r);
      });

      var changed = false;

      for (var i = 0; i < _cards.length; i++) {
        var card = _cards[i];
        var remId = 'rem_cc_' + card.id;
        var currentDue = Number(card.current_due || 0);
        var dueInfo = self.getDueCountdown(card);

        if (currentDue > 0 && dueInfo.nextDueDate && dueInfo.nextDueDate !== 'N/A' && dueInfo.nextDueDate !== 'Cleared') {
          var priority = (dueInfo.isOverdue || dueInfo.isDueToday) ? 'high' : dueInfo.isDueSoon ? 'medium' : 'low';
          var title = 'Pay ' + (card.card_name || 'Card') + ' (' + (card.bank_name || 'Bank') + ') Bill';
          var note = 'Outstanding Due: ₹' + Math.round(currentDue).toLocaleString('en-IN') + ' (Min Due: ₹' + (Number(card.min_due) || Math.round(currentDue * 0.05)).toLocaleString('en-IN') + ') • Card ending in •••• ' + (card.last_4_digits || '0000');

          var existing = remindersMap.get(remId);
          var updatedRem = {
            id: remId,
            cardId: card.id,
            title: title,
            dueDate: dueInfo.nextDueDate,
            time: '10:00',
            priority: priority,
            tag: 'Credit Card',
            category: 'Bills',
            note: note,
            completed: false,
            autoRepeat: false,
            recurrence: 'none',
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          remindersMap.set(remId, updatedRem);
          if (typeof window.put === 'function') {
            try { await window.put('reminders', updatedRem); } catch (e) {}
          }
          changed = true;
        } else {
          // Card has zero or cleared due — mark corresponding reminder done
          var existingRem = remindersMap.get(remId);
          if (existingRem && !existingRem.completed) {
            existingRem.completed = true;
            existingRem.completedAt = new Date().toISOString();
            remindersMap.set(remId, existingRem);
            if (typeof window.put === 'function') {
              try { await window.put('reminders', existingRem); } catch (e) {}
            }
            changed = true;
          }
        }
      }

      var allReminders = Array.from(remindersMap.values());
      if (typeof state === 'object') {
        state.reminders = allReminders;
      }

      if (changed && window.LM_Bus) {
        window.LM_Bus.emit('lm:data:changed', { store: 'reminders' });
      }

      return allReminders;
    },

    /**
     * Get all credit cards sorted by urgency: Overdue -> Due Soon -> Utilization High-to-Low
     */
    getAllCards: function () {
      var self = this;
      return _cards.slice().sort(function (a, b) {
        var dueA = self.getDueCountdown(a);
        var dueB = self.getDueCountdown(b);

        // Overdue first
        if (dueA.isOverdue && !dueB.isOverdue) return -1;
        if (!dueA.isOverdue && dueB.isOverdue) return 1;

        // Due soon (< 5 days) next
        if (dueA.isDueSoon && !dueB.isDueSoon) return -1;
        if (!dueA.isDueSoon && dueB.isDueSoon) return 1;

        // Paid / no due cards last
        if (dueA.isPaid && !dueB.isPaid) return 1;
        if (!dueA.isPaid && dueB.isPaid) return -1;

        // Otherwise higher utilization first
        var utilA = (Number(a.current_due || 0) / Math.max(1, Number(a.credit_limit || 1)));
        var utilB = (Number(b.current_due || 0) / Math.max(1, Number(b.credit_limit || 1)));
        return utilB - utilA;
      });
    },

    /**
     * Get single card by ID
     */
    getCardById: function (id) {
      return _cards.find(function (c) { return String(c.id) === String(id); }) || null;
    },

    /**
     * Calculate Statement countdown and next statement date
     */
    getStatementCountdown: function (card) {
      if (!card || !card.statement_day) {
        return { nextStatementDate: 'N/A', daysUntilStatement: null };
      }

      var day = Math.min(31, Math.max(1, parseInt(card.statement_day, 10) || 1));
      var now = new Date();
      var currentYear = now.getFullYear();
      var currentMonth = now.getMonth();

      // Statement this month
      var thisMonthStatement = new Date(currentYear, currentMonth, day);
      var nextStatement;

      if (now.getDate() <= day) {
        nextStatement = thisMonthStatement;
      } else {
        nextStatement = new Date(currentYear, currentMonth + 1, day);
      }

      var startOfToday = new Date(currentYear, currentMonth, now.getDate());
      var diffDays = Math.ceil((nextStatement.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

      var yyyy = nextStatement.getFullYear();
      var mm = String(nextStatement.getMonth() + 1).padStart(2, '0');
      var dd = String(nextStatement.getDate()).padStart(2, '0');

      return {
        nextStatementDate: yyyy + '-' + mm + '-' + dd,
        daysUntilStatement: diffDays
      };
    },

    /**
     * Calculate Payment Due countdown, overdue status, and formatted labels
     */
    getDueCountdown: function (card) {
      var currentDue = Number(card?.current_due || 0);
      var isPaid = currentDue <= 0;

      if (!card || !card.due_day) {
        return {
          nextDueDate: 'N/A',
          daysUntilDue: 999,
          isOverdue: false,
          isDueToday: false,
          isDueSoon: false,
          isPaid: isPaid,
          statusText: isPaid ? 'No Due / Cleared' : 'Due date not set'
        };
      }

      if (isPaid) {
        return {
          nextDueDate: 'Cleared',
          daysUntilDue: 999,
          isOverdue: false,
          isDueToday: false,
          isDueSoon: false,
          isPaid: true,
          statusText: 'No Due / Cleared'
        };
      }

      var day = Math.min(31, Math.max(1, parseInt(card.due_day, 10) || 1));
      var now = new Date();
      var currentYear = now.getFullYear();
      var currentMonth = now.getMonth();
      var todayDate = now.getDate();

      // Next due date calculation
      var dueDate;
      if (todayDate <= day) {
        dueDate = new Date(currentYear, currentMonth, day);
      } else {
        // If today is past the due day and has outstanding due:
        // If within 15 days past due_day, this bill is OVERDUE for current month!
        var currentCycleDue = new Date(currentYear, currentMonth, day);
        var daysPast = Math.floor((now.getTime() - currentCycleDue.getTime()) / (1000 * 60 * 60 * 24));

        if (daysPast <= 25) {
          dueDate = currentCycleDue; // Flag as overdue!
        } else {
          dueDate = new Date(currentYear, currentMonth + 1, day);
        }
      }

      var startOfToday = new Date(currentYear, currentMonth, todayDate);
      var diffDays = Math.ceil((dueDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));

      var isOverdue = diffDays < 0;
      var isDueToday = diffDays === 0;
      var isDueSoon = diffDays > 0 && diffDays <= 5;

      var statusText = '';
      if (isOverdue) {
        statusText = Math.abs(diffDays) + 'd OVERDUE';
      } else if (isDueToday) {
        statusText = 'Due TODAY';
      } else if (diffDays === 1) {
        statusText = 'Due TOMORROW';
      } else {
        statusText = 'Due in ' + diffDays + ' days';
      }

      var yyyy = dueDate.getFullYear();
      var mm = String(dueDate.getMonth() + 1).padStart(2, '0');
      var dd = String(dueDate.getDate()).padStart(2, '0');

      return {
        nextDueDate: yyyy + '-' + mm + '-' + dd,
        daysUntilDue: diffDays,
        isOverdue: isOverdue,
        isDueToday: isDueToday,
        isDueSoon: isDueSoon,
        isPaid: false,
        statusText: statusText
      };
    },

    /**
     * Add a new Credit Card
     */
    addCard: async function (data) {
      var limit = _round2(data.credit_limit || 0);
      var due = _round2(data.current_due || 0);
      var minDue = _round2(data.min_due || Math.round(due * 0.05));
      var avail = _round2(data.available_limit !== undefined ? data.available_limit : (limit - due));

      var perksList = [];
      if (Array.isArray(data.perks)) {
        perksList = data.perks;
      } else if (typeof data.perks === 'string' && data.perks.trim()) {
        perksList = data.perks.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      }

      var newCard = {
        id: data.id || _generateId(),
        profile: _getProfileId(),
        card_name: (data.card_name || 'My Credit Card').trim(),
        bank_name: (data.bank_name || 'Bank').trim(),
        card_network: data.card_network || 'Visa',
        last_4_digits: String(data.last_4_digits || '0000').slice(-4),
        credit_limit: limit,
        available_limit: avail,
        current_due: due,
        min_due: minDue,
        statement_day: parseInt(data.statement_day, 10) || 15,
        due_day: parseInt(data.due_day, 10) || 5,
        color_theme: data.color_theme || 'theme-midnight',
        notes: (data.notes || '').trim(),
        cvv: (data.cvv || '').trim(),
        contactless_enabled: data.contactless_enabled !== false,
        international_enabled: !!data.international_enabled,
        lounge_total: parseInt(data.lounge_total, 10) || 0,
        lounge_used: parseInt(data.lounge_used, 10) || 0,
        milestone_target: _round2(data.milestone_target || 0),
        milestone_spent: _round2(data.milestone_spent || 0),
        milestone_reward: (data.milestone_reward || '').trim(),
        perks: perksList,
        payment_history: Array.isArray(data.payment_history) ? data.payment_history : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (typeof window.put === 'function') {
        try {
          await window.put('credit_cards', newCard);
        } catch (e) {
          console.warn('[CreditCardsService] put error:', e);
        }
      }

      var existingIdx = _cards.findIndex(function (c) { return String(c.id) === String(newCard.id); });
      if (existingIdx >= 0) {
        _cards[existingIdx] = newCard;
      } else {
        _cards.push(newCard);
      }
      if (typeof state === 'object') {
        state.credit_cards = _cards;
      }

      try {
        await this.syncReminders();
      } catch (e) {}

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:data:changed', { store: 'credit_cards' });
      }

      return newCard;
    },

    /**
     * Update an existing Credit Card
     */
    updateCard: async function (id, data) {
      var index = _cards.findIndex(function (c) { return String(c.id) === String(id); });
      if (index === -1) throw new Error('Card not found');

      var existing = _cards[index];
      var limit = data.credit_limit !== undefined ? _round2(data.credit_limit) : existing.credit_limit;
      var due = data.current_due !== undefined ? _round2(data.current_due) : existing.current_due;
      var minDue = data.min_due !== undefined ? _round2(data.min_due) : existing.min_due;
      var avail = data.available_limit !== undefined ? _round2(data.available_limit) : (limit - due);

      var perksList = existing.perks || [];
      if (data.perks !== undefined) {
        if (Array.isArray(data.perks)) {
          perksList = data.perks;
        } else if (typeof data.perks === 'string') {
          perksList = data.perks.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        }
      }

      var updated = Object.assign({}, existing, data, {
        credit_limit: limit,
        current_due: due,
        min_due: minDue,
        available_limit: avail,
        perks: perksList,
        payment_history: Array.isArray(data.payment_history) ? data.payment_history : (existing.payment_history || []),
        updated_at: new Date().toISOString()
      });

      if (typeof window.put === 'function') {
        try {
          await window.put('credit_cards', updated);
        } catch (e) {
          console.warn('[CreditCardsService] put update error:', e);
        }
      }

      _cards[index] = updated;
      if (typeof state === 'object') {
        state.credit_cards = _cards;
      }

      try {
        await this.syncReminders();
      } catch (e) {}

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:data:changed', { store: 'credit_cards' });
      }

      return updated;
    },

    /**
     * Delete a Credit Card
     */
    deleteCard: async function (id) {
      _cards = _cards.filter(function (c) { return String(c.id) !== String(id); });
      if (typeof state === 'object') {
        state.credit_cards = _cards;
      }

      var remId = 'rem_cc_' + id;
      if (typeof window.del === 'function') {
        try {
          await window.del('credit_cards', id);
          await window.del('reminders', remId);
        } catch (e) {
          console.warn('[CreditCardsService] del error:', e);
        }
      } else if (window.db) {
        try {
          var t = window.db.transaction('credit_cards', 'readwrite');
          t.objectStore('credit_cards').delete(id);
        } catch (e) {}
        try {
          var tr = window.db.transaction('reminders', 'readwrite');
          tr.objectStore('reminders').delete(remId);
        } catch (e) {}
      }

      if (typeof state === 'object' && Array.isArray(state.reminders)) {
        state.reminders = state.reminders.filter(function (r) {
          return String(r.id) !== remId && String(r.cardId) !== String(id);
        });
      }

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:data:changed', { store: 'credit_cards' });
        window.LM_Bus.emit('lm:data:changed', { store: 'reminders' });
      }

      return true;
    },

    /**
     * Pay Credit Card Bill
     * Optionally creates a transaction in 'transactions' store to deduct bank balance
     */
    payCardBill: async function (paymentInfo) {
      var cardId = paymentInfo.cardId;
      var amount = _round2(paymentInfo.amount || 0);
      var paymentDate = paymentInfo.paymentDate || new Date().toISOString().split('T')[0];
      var accountId = paymentInfo.accountId || (state.dropdowns?.accounts?.[0] || 'Bank');
      var recordAsTransaction = paymentInfo.recordAsTransaction !== false;

      var card = this.getCardById(cardId);
      if (!card) throw new Error('Card not found for bill payment');
      if (amount <= 0) throw new Error('Payment amount must be greater than ₹0');

      var newDue = Math.max(0, _round2(Number(card.current_due || 0) - amount));
      var newAvail = _round2(Number(card.credit_limit || 0) - newDue);
      var newMinDue = newDue <= 0 ? 0 : Math.min(newDue, _round2(newDue * 0.05));

      var history = Array.isArray(card.payment_history) ? card.payment_history.slice() : [];
      history.unshift({
        id: 'pay_' + Date.now(),
        date: paymentDate,
        amount: amount,
        accountId: accountId,
        remainingDue: newDue,
        timestamp: new Date().toISOString()
      });
      if (history.length > 20) history = history.slice(0, 20);

      await this.updateCard(card.id, {
        current_due: newDue,
        available_limit: newAvail,
        min_due: newMinDue,
        payment_history: history
      });

      // Optionally record an expense or bill payment transaction
      if (recordAsTransaction) {
        if (window.LM_InterlinkEngine && typeof window.LM_InterlinkEngine.recordInterlinkedTx === 'function') {
          await window.LM_InterlinkEngine.recordInterlinkedTx({
            sourceModule: window.LM_InterlinkEngine.MODULES.CREDIT_CARDS,
            sourceId: card.id,
            refType: window.LM_InterlinkEngine.REF_TYPES.CARD_BILL,
            entityName: (card.card_name || 'Credit Card') + ' (•••• ' + (card.last_4_digits || '0000') + ')',
            date: paymentDate,
            type: 'out',
            amount: amount,
            category: 'Credit Card Payment',
            account: accountId,
            note: 'Credit Card Bill Payment - ' + (card.card_name || 'Card') + ' (•••• ' + (card.last_4_digits || '0000') + ')',
            extraData: { cardId: card.id, last4: card.last_4_digits, remainingDue: newDue }
          });
        } else {
          var tx = {
            id: typeof uid === 'function' ? uid('tx') : ('tx_' + Date.now()),
            date: paymentDate,
            type: 'out',
            amount: amount,
            category: 'Bills',
            account: accountId,
            note: 'Credit Card Bill Payment - ' + (card.card_name || 'Card') + ' (•••• ' + (card.last_4_digits || '0000') + ')',
            profile: _getProfileId(),
            createdAt: new Date().toISOString()
          };

          if (typeof window.put === 'function') {
            try { await window.put('transactions', tx); } catch (e) {}
          }
          if (typeof state === 'object' && Array.isArray(state.transactions)) {
            state.transactions.push(tx);
          }
          if (window.LM_Bus) window.LM_Bus.emit('lm:data:changed', { store: 'transactions' });
        }

        var _lmUid = window.LM_Auth?.getCurrentUserId() || 'default';
        var _activePage = localStorage.getItem('lm_u_' + _lmUid + '_lastPage') || localStorage.getItem('ledgerMate_lastPage') || 'credit-cards';
        if (_activePage === 'dashboard' && typeof renderAll === 'function') {
          renderAll();
        } else if (typeof refreshRecentList === 'function') {
          try { refreshRecentList(); } catch(e) {}
        }
      }

      if (typeof showToast === 'function') {
        showToast('✅ Bill payment of ₹' + amount.toLocaleString('en-IN') + ' recorded for ' + card.card_name, 'success');
      }

      return { success: true, remainingDue: newDue, card: this.getCardById(cardId) };
    },

    /**
     * Log an airport lounge visit on a credit card
     */
    logLoungeVisit: async function (cardId) {
      var card = this.getCardById(cardId);
      if (!card) return null;
      var total = parseInt(card.lounge_total, 10) || 0;
      var used = parseInt(card.lounge_used, 10) || 0;
      if (total > 0 && used >= total) {
        if (typeof showToast === 'function') showToast('⚠️ All ' + total + ' lounge visits already used for ' + card.card_name, 'warning');
        return card;
      }
      var newUsed = used + 1;
      await this.updateCard(cardId, { lounge_used: newUsed });
      if (typeof showToast === 'function') {
        showToast('✈️ Lounge visit logged! (' + newUsed + '/' + (total || '∞') + ' used)', 'success');
      }
      return this.getCardById(cardId);
    },

    /**
     * Reset lounge visits (e.g. at start of new quarter or year)
     */
    resetLoungeVisits: async function (cardId) {
      var card = this.getCardById(cardId);
      if (!card) return null;
      await this.updateCard(cardId, { lounge_used: 0 });
      if (typeof showToast === 'function') showToast('🔄 Lounge visits reset to 0 for ' + card.card_name, 'info');
      return this.getCardById(cardId);
    },

    /**
     * Update milestone progress
     */
    updateMilestoneProgress: async function (cardId, addedAmount) {
      var card = this.getCardById(cardId);
      if (!card) return null;
      var spent = _round2(Number(card.milestone_spent || 0) + Number(addedAmount || 0));
      await this.updateCard(cardId, { milestone_spent: spent });
      return this.getCardById(cardId);
    },

    /**
     * Get payment history for card
     */
    getCardPaymentHistory: function (cardId) {
      var card = this.getCardById(cardId);
      return (card && Array.isArray(card.payment_history)) ? card.payment_history : [];
    },

    /**
     * Find related transactions recorded in LedgerMate for this card
     */
    getCardTransactions: function (cardId) {
      var card = this.getCardById(cardId);
      if (!card) return [];
      var txs = (typeof state === 'object' && Array.isArray(state.transactions)) ? state.transactions : [];
      var last4 = card.last_4_digits || '';
      var cardName = (card.card_name || '').toLowerCase();
      var bankName = (card.bank_name || '').toLowerCase();

      return txs.filter(function (t) {
        if (!t) return false;
        var note = (t.note || '').toLowerCase();
        var account = (t.account || '').toLowerCase();
        if (last4 && (note.includes(last4) || account.includes(last4))) return true;
        if (cardName && (note.includes(cardName) || account.includes(cardName))) return true;
        if (t.cardId && String(t.cardId) === String(cardId)) return true;
        return false;
      }).sort(function (a, b) {
        return (b.date || '').localeCompare(a.date || '');
      });
    },

    /**
     * Real-time Spend Simulator: simulates spend and projects utilization, health, and grace impact
     */
    simulateSpend: function (cardId, spendAmount, category) {
      var card = this.getCardById(cardId);
      if (!card) return null;
      var amt = Number(spendAmount) || 0;
      var summary = this.getSummary();

      var curDue = Number(card.current_due || 0);
      var limit = Math.max(1, Number(card.credit_limit || 1));
      var newDue = curDue + amt;
      var curUtil = Math.round((curDue / limit) * 1000) / 10;
      var newUtil = Math.round((newDue / limit) * 1000) / 10;

      var newTotalDue = summary.totalCurrentDue + amt;
      var totalLimit = Math.max(1, summary.totalLimit);
      var curPortUtil = summary.utilizationPct;
      var newPortUtil = Math.round((newTotalDue / totalLimit) * 1000) / 10;

      var graceDays = 30;
      var rewardMultiplier = 1.0;
      var perkDesc = 'Standard Rewards';
      if (window.LM_CardOptimizer) {
        graceDays = window.LM_CardOptimizer.calculateRemainingGraceDays(card.statement_day, card.due_day);
        var rEval = window.LM_CardOptimizer.evaluateCardCategoryReward(card, category || 'Shopping');
        rewardMultiplier = rEval.multiplier;
        perkDesc = rEval.perkDesc;
      }

      var healthStatus = newPortUtil < 10 ? 'Excellent' : newPortUtil <= 30 ? 'Optimal' : newPortUtil <= 50 ? 'Caution' : 'Critical';
      var healthColor = newPortUtil <= 30 ? 'var(--emerald)' : newPortUtil <= 50 ? 'var(--gold)' : 'var(--rose)';

      return {
        card: card,
        spendAmount: amt,
        category: category || 'Shopping',
        currentCardUtil: curUtil,
        newCardUtil: newUtil,
        currentPortfolioUtil: curPortUtil,
        newPortfolioUtil: newPortUtil,
        graceDays: graceDays,
        rewardMultiplier: rewardMultiplier,
        perkDesc: perkDesc,
        projectedCashback: _round2(amt * (rewardMultiplier * 0.01)),
        healthStatus: healthStatus,
        healthColor: healthColor,
        isOverLimit: newDue > limit
      };
    },

    /**
     * Record payment shorthand
     */
    recordPayment: async function (cardId, amount, accountId) {
      await this.payCardBill({ cardId: cardId, amount: amount, accountId: accountId });
      return this.getCardById(cardId);
    },

    /**
     * Get Total Outstanding Due across all cards
     */
    getTotalOutstandingDue: function () {
      return _cards.reduce(function (sum, card) {
        return sum + (Number(card.current_due) || 0);
      }, 0);
    },

    /**
     * Get Summary Metrics across portfolio of credit cards
     */
    getSummary: function () {
      var self = this;
      var totalLimit = 0;
      var totalCurrentDue = 0;
      var totalMinDue = 0;
      var overdueCount = 0;
      var dueSoonCount = 0;

      _cards.forEach(function (c) {
        totalLimit += (Number(c.credit_limit) || 0);
        totalCurrentDue += (Number(c.current_due) || 0);
        totalMinDue += (Number(c.min_due) || 0);

        var countdown = self.getDueCountdown(c);
        if (countdown.isOverdue) overdueCount++;
        else if (countdown.isDueSoon || countdown.isDueToday) dueSoonCount++;
      });

      var totalAvailable = Math.max(0, totalLimit - totalCurrentDue);
      var utilizationPct = totalLimit > 0 ? Math.round((totalCurrentDue / totalLimit) * 1000) / 10 : 0;

      return {
        totalLimit: _round2(totalLimit),
        totalCurrentDue: _round2(totalCurrentDue),
        totalAvailable: _round2(totalAvailable),
        totalMinDue: _round2(totalMinDue),
        utilizationPct: utilizationPct,
        overdueCount: overdueCount,
        dueSoonCount: dueSoonCount,
        cardsCount: _cards.length
      };
    },

    /**
     * Export all credit cards data for JSON backup
     */
    exportData: function () {
      return _cards.slice();
    },

    /**
     * Import credit cards data from JSON backup
     */
    importData: async function (cardsArray) {
      if (!Array.isArray(cardsArray)) return;
      _cards = cardsArray.slice();
      if (typeof state === 'object') {
        state.credit_cards = _cards;
      }
      for (var i = 0; i < _cards.length; i++) {
        if (typeof window.put === 'function') {
          try {
            await window.put('credit_cards', _cards[i]);
          } catch (e) {}
        }
      }
      try {
        await this.syncReminders();
      } catch (e) {}
      if (window.LM_Bus && (!window.LM_CloudSync || !window.LM_CloudSync.isImporting || !window.LM_CloudSync.isImporting())) {
        window.LM_Bus.emit('lm:data:changed', { store: 'credit_cards' });
      }
    }
  };

  window.LM_CreditCardsService = CreditCardsService;

  // Auto-init on app ready
  document.addEventListener('lm:app:ready', function () {
    CreditCardsService.init();
  });

  // Re-sync on data changes
  if (window.LM_Bus) {
    window.LM_Bus.on('lm:data:changed', function (data) {
      if (data && data.store === 'credit_cards' && !_isInitialized) {
        CreditCardsService.init();
      }
    });
  }
})();
