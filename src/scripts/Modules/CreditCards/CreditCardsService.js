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
      return _cards;
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

      _cards.push(newCard);
      if (typeof state === 'object') {
        state.credit_cards = _cards;
      }

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

      var updated = Object.assign({}, existing, data, {
        credit_limit: limit,
        current_due: due,
        min_due: minDue,
        available_limit: avail,
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

      if (typeof window.del === 'function') {
        try {
          await window.del('credit_cards', id);
        } catch (e) {
          console.warn('[CreditCardsService] del error:', e);
        }
      } else if (window.db) {
        try {
          var t = window.db.transaction('credit_cards', 'readwrite');
          t.objectStore('credit_cards').delete(id);
        } catch (e) {}
      }

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:data:changed', { store: 'credit_cards' });
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

      await this.updateCard(card.id, {
        current_due: newDue,
        available_limit: newAvail,
        min_due: newMinDue
      });

      // Optionally record an expense or bill payment transaction
      if (recordAsTransaction) {
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
          try {
            await window.put('transactions', tx);
          } catch (e) {
            console.warn('[CreditCardsService] tx put error:', e);
          }
        }

        if (typeof state === 'object' && Array.isArray(state.transactions)) {
          state.transactions.push(tx);
        }

        if (window.LM_Bus) {
          window.LM_Bus.emit('lm:data:changed', { store: 'transactions' });
        }

        if (typeof renderAll === 'function') {
          renderAll();
        }
      }

      if (typeof showToast === 'function') {
        showToast('✅ Bill payment of ₹' + amount.toLocaleString('en-IN') + ' recorded for ' + card.card_name, 'success');
      }

      return { success: true, remainingDue: newDue };
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
      if (window.LM_Bus) {
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
