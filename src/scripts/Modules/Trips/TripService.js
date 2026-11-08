/**
 * LedgerMate – TripService.js
 * ──────────────────────────────────────────────────────────────────
 * Core service managing Trip Planner business logic & persistence:
 * 1. Trip CRUD & Lifecycle (Wishlist, Planning, Booked, Ongoing, Completed)
 * 2. Seen & Discovered Places Collector (Bucket List / Ideas from reels, blogs, maps)
 * 3. Day-by-Day & Stage Itinerary Plans
 * 4. Granular Per-Plan Expense Tracking (Estimated vs Actual, Variance Math)
 * 5. Interlinking with Central Ledger (Bank accounts, Credit cards)
 * 6. Minimum Cash-Flow Group Debt Simplification
 *
 * Exposes: window.LM_TripService
 * ──────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  const STORE_NAME = 'trips';

  function _getProfileId() {
    return window.LM_Auth?.getCurrentUserId?.() || 'default';
  }

  function _todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  function _generateId(prefix) {
    return (prefix || 'id') + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  function _round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function _fmtINR(num) {
    if (typeof fmtINR === 'function') return fmtINR(num);
    const n = Number(num) || 0;
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  const TripService = {
    // ─────────────────────────────────────────────────────────────
    // 1. STATE & PERSISTENCE
    // ─────────────────────────────────────────────────────────────
    getTrips: function () {
      if (typeof state === 'object' && Array.isArray(state.trips)) {
        return state.trips;
      }
      return [];
    },

    getTrip: function (tripId) {
      const trips = this.getTrips();
      return trips.find(t => String(t.id) === String(tripId)) || null;
    },

    getTripById: function (tripId) {
      return this.getTrip(tripId);
    },

    saveTripToDB: async function (trip) {
      if (!trip || !trip.id) throw new Error('[TripService] Invalid trip object');
      trip.updatedAt = new Date().toISOString();

      if (typeof put === 'function') {
        try {
          await put(STORE_NAME, trip);
        } catch (e) {
          console.warn('[TripService] IndexedDB put error:', e);
        }
      }

      // Update in-memory state
      if (typeof state === 'object') {
        if (!Array.isArray(state.trips)) state.trips = [];
        const idx = state.trips.findIndex(t => String(t.id) === String(trip.id));
        if (idx > -1) {
          state.trips[idx] = trip;
        } else {
          state.trips.push(trip);
        }
      }

      if (typeof autoBackup === 'function') {
        try { autoBackup(); } catch (e) {}
      }

      return trip;
    },

    deleteTripFromDB: async function (tripId) {
      if (typeof del === 'function') {
        try {
          await del(STORE_NAME, tripId);
        } catch (e) {
          console.warn('[TripService] IndexedDB del error:', e);
        }
      }

      if (typeof state === 'object' && Array.isArray(state.trips)) {
        state.trips = state.trips.filter(t => String(t.id) !== String(tripId));
      }

      if (typeof autoBackup === 'function') {
        try { autoBackup(); } catch (e) {}
      }
      return true;
    },

    // ─────────────────────────────────────────────────────────────
    // 2. TRIP CRUD
    // ─────────────────────────────────────────────────────────────
    createTrip: async function (data) {
      if (!data || !data.name) throw new Error('Trip name is required');
      const tripId = data.id || _generateId('trip');
      const now = new Date().toISOString();

      // Normalize persons (support array of strings, objects, or comma-separated string)
      let persons = [];
      if (Array.isArray(data.persons)) {
        persons = data.persons.map((p, idx) => {
          if (typeof p === 'string') return { id: 'p_' + (idx + 1), name: p.trim() };
          if (p && typeof p === 'object' && p.name) return { id: p.id || ('p_' + (idx + 1)), name: String(p.name).trim() };
          return null;
        }).filter(p => p && p.name);
      } else if (typeof data.persons === 'string') {
        persons = data.persons.split(',').map((s, idx) => ({ id: 'p_' + (idx + 1), name: s.trim() })).filter(p => p.name);
      }
      if (!persons.length) {
        persons = [{ id: 'p1', name: 'You' }];
      }

      const trip = {
        id: tripId,
        name: data.name.trim(),
        destination: (data.destination || '').trim(),
        startDate: data.startDate || _todayISO(),
        endDate: data.endDate || data.startDate || _todayISO(),
        status: data.status || 'planning', // 'wishlist' | 'planning' | 'booked' | 'ongoing' | 'completed'
        travelMode: data.travelMode || 'car', // 'car' | 'bike' | 'flight' | 'train' | 'bus' | 'mixed'
        budgetCap: _round2(data.budgetCap || 0),
        coverEmoji: data.coverEmoji || '✈️',
        notes: (data.notes || '').trim(),
        persons: persons,
        wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
        plans: Array.isArray(data.plans) ? data.plans : [],
        expenses: Array.isArray(data.expenses) ? data.expenses : [],
        settlements: Array.isArray(data.settlements) ? data.settlements : [],
        completed: Boolean(data.completed),
        createdAt: now,
        updatedAt: now
      };

      await this.saveTripToDB(trip);
      return trip;
    },

    updateTrip: async function (tripId, updates) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');

      if (updates.name !== undefined) trip.name = updates.name.trim();
      if (updates.destination !== undefined) trip.destination = updates.destination.trim();
      if (updates.startDate !== undefined) trip.startDate = updates.startDate;
      if (updates.endDate !== undefined) trip.endDate = updates.endDate;
      if (updates.status !== undefined) trip.status = updates.status;
      if (updates.travelMode !== undefined) trip.travelMode = updates.travelMode;
      if (updates.budgetCap !== undefined) trip.budgetCap = _round2(updates.budgetCap);
      if (updates.coverEmoji !== undefined) trip.coverEmoji = updates.coverEmoji;
      if (updates.notes !== undefined) trip.notes = updates.notes.trim();
      if (updates.completed !== undefined) trip.completed = Boolean(updates.completed);

      if (updates.persons !== undefined) {
        if (Array.isArray(updates.persons)) {
          trip.persons = updates.persons.map((p, idx) => {
            if (typeof p === 'string') return { id: 'p_' + (idx + 1), name: p.trim() };
            if (p && typeof p === 'object' && p.name) return { id: p.id || ('p_' + (idx + 1)), name: String(p.name).trim() };
            return null;
          }).filter(p => p && p.name);
        } else if (typeof updates.persons === 'string') {
          trip.persons = updates.persons.split(',').map((s, idx) => ({ id: 'p_' + (idx + 1), name: s.trim() })).filter(p => p.name);
        }
        if (!trip.persons.length) trip.persons = [{ id: 'p1', name: 'You' }];
      }

      await this.saveTripToDB(trip);
      return trip;
    },

    calculateTripDays: function (startDate, endDate) {
      if (!startDate || !endDate) return 1;
      const s = new Date(startDate);
      const e = new Date(endDate);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
      const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(1, diff);
    },

    // ─────────────────────────────────────────────────────────────
    // 3. TIER 1: SEEN & DISCOVERED PLACES (WISHLIST COLLECTOR)
    // ─────────────────────────────────────────────────────────────
    addWishlistItem: async function (tripId, itemData) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      const title = (itemData && (itemData.title || itemData.placeName || itemData.name || '')).trim();
      if (!title) throw new Error('Spot/activity title is required');

      if (!Array.isArray(trip.wishlist)) trip.wishlist = [];

      const wishId = itemData.id || _generateId('wish');
      const wishItem = {
        id: wishId,
        title: title,
        category: itemData.category || 'Sightseeing', // 'Stay' | 'Food' | 'Activity' | 'Sightseeing' | 'Transit' | 'Shopping' | 'Other'
        location: (itemData.location || '').trim(),
        sourceUrl: (itemData.sourceUrl || itemData.inspirationUrl || '').trim(),
        sourcePlatform: (itemData.sourcePlatform || '').trim(),
        notes: (itemData.notes || '').trim(),
        estimatedCost: _round2(itemData.estimatedCost || 0),
        priority: itemData.priority || 'recommended', // 'must_do' | 'recommended' | 'backup'
        status: itemData.status || 'idea', // 'idea' | 'scheduled'
        scheduledPlanId: itemData.scheduledPlanId || null,
        createdAt: new Date().toISOString()
      };

      trip.wishlist.unshift(wishItem);
      await this.saveTripToDB(trip);
      return wishItem;
    },

    updateWishlistItem: async function (tripId, wishId, updates) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.wishlist)) throw new Error('Trip or wishlist not found');

      const wish = trip.wishlist.find(w => String(w.id) === String(wishId));
      if (!wish) throw new Error('Wishlist item not found');

      if (updates.title !== undefined) wish.title = updates.title.trim();
      if (updates.category !== undefined) wish.category = updates.category;
      if (updates.location !== undefined) wish.location = updates.location.trim();
      if (updates.sourceUrl !== undefined) wish.sourceUrl = updates.sourceUrl.trim();
      if (updates.notes !== undefined) wish.notes = updates.notes.trim();
      if (updates.estimatedCost !== undefined) wish.estimatedCost = _round2(updates.estimatedCost);
      if (updates.priority !== undefined) wish.priority = updates.priority;
      if (updates.status !== undefined) wish.status = updates.status;
      if (updates.scheduledPlanId !== undefined) wish.scheduledPlanId = updates.scheduledPlanId;

      await this.saveTripToDB(trip);
      return wish;
    },

    deleteWishlistItem: async function (tripId, wishId) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.wishlist)) return false;

      trip.wishlist = trip.wishlist.filter(w => String(w.id) !== String(wishId));
      await this.saveTripToDB(trip);
      return true;
    },

    convertWishlistToPlan: async function (tripId, wishId, planOptions) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.wishlist)) throw new Error('Trip not found');

      const wish = trip.wishlist.find(w => String(w.id) === String(wishId));
      if (!wish) throw new Error('Wishlist item not found');

      const planData = {
        title: planOptions?.title || wish.title,
        category: planOptions?.category || wish.category,
        location: planOptions?.location || wish.location,
        notes: (planOptions?.notes || wish.notes) + (wish.sourceUrl && !planOptions?.notes ? `\n(Inspiration: ${wish.sourceUrl})` : ''),
        estimatedCost: planOptions?.estimatedCost !== undefined ? _round2(planOptions.estimatedCost) : wish.estimatedCost,
        dayNumber: planOptions?.dayNumber || 1,
        timeSlot: planOptions?.timeSlot || 'morning',
        time: planOptions?.time || '',
        date: planOptions?.date || '',
        status: planOptions?.status || 'planned'
      };

      const newPlan = await this.addPlanItem(tripId, planData);
      wish.status = 'scheduled';
      wish.scheduledPlanId = newPlan.id;

      await this.saveTripToDB(trip);
      return newPlan;
    },

    // ─────────────────────────────────────────────────────────────
    // 4. TIER 2: STRUCTURED ITINERARY PLANS
    // ─────────────────────────────────────────────────────────────
    addPlanItem: async function (tripId, planData) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      if (!planData || !planData.title) throw new Error('Plan title is required');

      if (!Array.isArray(trip.plans)) trip.plans = [];

      const planId = planData.id || _generateId('plan');
      const planItem = {
        id: planId,
        dayNumber: Number(planData.dayNumber) || 1,
        date: planData.date || '',
        timeSlot: planData.timeSlot || 'all_day', // 'morning' | 'afternoon' | 'evening' | 'night' | 'all_day'
        time: planData.time || '',
        title: planData.title.trim(),
        category: planData.category || 'Activity', // 'Stay' | 'Food' | 'Activity' | 'Sightseeing' | 'Transit' | 'Shopping' | 'Other'
        location: (planData.location || '').trim(),
        notes: (planData.notes || '').trim(),
        bookingRef: (planData.bookingRef || '').trim(),
        status: planData.status || 'planned', // 'planned' | 'booked' | 'completed'
        estimatedCost: _round2(planData.estimatedCost || 0),
        expenses: Array.isArray(planData.expenses) ? planData.expenses : []
      };

      trip.plans.push(planItem);
      // Sort plans by dayNumber then time
      trip.plans.sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return (a.time || '99:99').localeCompare(b.time || '99:99');
      });

      await this.saveTripToDB(trip);
      return planItem;
    },

    updatePlanItem: async function (tripId, planId, updates) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.plans)) throw new Error('Trip or plans not found');

      const plan = trip.plans.find(p => String(p.id) === String(planId));
      if (!plan) throw new Error('Plan item not found');

      if (updates.title !== undefined) plan.title = updates.title.trim();
      if (updates.dayNumber !== undefined) plan.dayNumber = Number(updates.dayNumber) || 1;
      if (updates.date !== undefined) plan.date = updates.date;
      if (updates.timeSlot !== undefined) plan.timeSlot = updates.timeSlot;
      if (updates.time !== undefined) plan.time = updates.time;
      if (updates.category !== undefined) plan.category = updates.category;
      if (updates.location !== undefined) plan.location = updates.location.trim();
      if (updates.notes !== undefined) plan.notes = updates.notes.trim();
      if (updates.bookingRef !== undefined) plan.bookingRef = updates.bookingRef.trim();
      if (updates.status !== undefined) plan.status = updates.status;
      if (updates.estimatedCost !== undefined) plan.estimatedCost = _round2(updates.estimatedCost);

      trip.plans.sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return (a.time || '99:99').localeCompare(b.time || '99:99');
      });

      await this.saveTripToDB(trip);
      return plan;
    },

    deletePlanItem: async function (tripId, planId, shouldRollbackTxs = false) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.plans)) return false;

      const plan = trip.plans.find(p => String(p.id) === String(planId));
      if (plan && Array.isArray(plan.expenses) && shouldRollbackTxs) {
        for (const exp of plan.expenses) {
          if (exp.linkedTxId && window.LM_InterlinkEngine?.revertInterlinkedTx) {
            try {
              await window.LM_InterlinkEngine.revertInterlinkedTx(exp.linkedTxId, true);
            } catch (e) {
              console.warn('[TripService] Error rolling back linked tx:', e);
            }
          }
        }
      }

      trip.plans = trip.plans.filter(p => String(p.id) !== String(planId));
      await this.saveTripToDB(trip);
      return true;
    },

    // ─────────────────────────────────────────────────────────────
    // 5. GRANULAR PLAN EXPENSES & INTERLINKING
    // ─────────────────────────────────────────────────────────────
    addPlanExpense: async function (tripId, planId, expenseData, options = {}) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.plans)) throw new Error('Trip not found');

      const plan = trip.plans.find(p => String(p.id) === String(planId));
      if (!plan) throw new Error('Plan item not found');

      const title = (expenseData && (expenseData.title || expenseData.description || expenseData.name || plan.title || 'Expense')).trim();
      const amount = _round2(expenseData.amount);
      if (amount <= 0) throw new Error('Amount must be greater than zero');

      if (!Array.isArray(plan.expenses)) plan.expenses = [];

      const expId = expenseData.id || _generateId('pexp');
      let linkedTxId = null;

      const shouldLink = Boolean(options.linkToCentralLedger || expenseData.linkToCentralLedger);
      const chosenAccount = options.account || expenseData.paymentMode || expenseData.account || 'Bank';

      // Interlink with LedgerMate Central Bank / Cards if requested
      if (shouldLink && window.LM_InterlinkEngine && typeof window.LM_InterlinkEngine.recordInterlinkedTx === 'function') {
        try {
          const interlinkParams = {
            sourceModule: 'trips',
            refType: 'trip_expense',
            sourceId: plan.id,
            planId: plan.id,
            tripId: trip.id,
            entityName: `${trip.name} - ${plan.title}`,
            amount: amount,
            date: expenseData.date || _todayISO(),
            type: 'out',
            category: 'Travel',
            account: chosenAccount,
            note: `Trip: ${trip.name} · ${plan.title} · ${title}`,
            subDetails: {
              tripId: trip.id,
              tripName: trip.name,
              planId: plan.id,
              planTitle: plan.title,
              paymentMethod: expenseData.paymentMethod || expenseData.paymentMode || 'UPI'
            }
          };

          const recordedTx = await window.LM_InterlinkEngine.recordInterlinkedTx(interlinkParams);
          if (recordedTx && recordedTx.id) {
            linkedTxId = recordedTx.id;
          }
        } catch (e) {
          console.warn('[TripService] Failed to record interlinked transaction:', e);
        }
      }

      function resolvePerson(identifier) {
        if (!identifier) return trip.persons[0]?.id || 'p1';
        const p = trip.persons.find(x => x.id === identifier || x.name === identifier || (x.name && x.name.toLowerCase() === String(identifier).toLowerCase()));
        return p ? p.id : identifier;
      }

      const rawShared = Array.isArray(expenseData.sharedWith) && expenseData.sharedWith.length
        ? expenseData.sharedWith
        : (Array.isArray(expenseData.splitBetween) && expenseData.splitBetween.length ? expenseData.splitBetween : trip.persons.map(p => p.id));

      const expense = {
        id: expId,
        title: title,
        amount: amount,
        date: expenseData.date || _todayISO(),
        paidBy: resolvePerson(expenseData.paidBy),
        sharedWith: rawShared.map(resolvePerson),
        paymentMethod: expenseData.paymentMethod || expenseData.paymentMode || 'Cash',
        category: expenseData.category || plan.category || 'General',
        linkedTxId: linkedTxId
      };

      plan.expenses.push(expense);
      await this.saveTripToDB(trip);
      return expense;
    },

    deletePlanExpense: async function (tripId, planId, expId, shouldRollbackTx = true) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.plans)) return false;

      const plan = trip.plans.find(p => String(p.id) === String(planId));
      if (!plan || !Array.isArray(plan.expenses)) return false;

      const exp = plan.expenses.find(e => String(e.id) === String(expId));
      if (exp && exp.linkedTxId && shouldRollbackTx && window.LM_InterlinkEngine?.revertInterlinkedTx) {
        try {
          await window.LM_InterlinkEngine.revertInterlinkedTx(exp.linkedTxId, true);
        } catch (e) {
          console.warn('[TripService] Error rolling back linked tx:', e);
        }
      }

      plan.expenses = plan.expenses.filter(e => String(e.id) !== String(expId));
      await this.saveTripToDB(trip);
      return true;
    },

    getPlanFinancials: function (planOrTripId, maybePlanId) {
      let plan = planOrTripId;
      if (typeof planOrTripId === 'string' && maybePlanId) {
        const trip = this.getTrip(planOrTripId);
        plan = (trip?.plans || []).find(p => String(p.id) === String(maybePlanId));
      } else if (typeof planOrTripId === 'string' && !maybePlanId) {
        for (const t of this.getTrips()) {
          const found = (t.plans || []).find(p => String(p.id) === String(planOrTripId));
          if (found) { plan = found; break; }
        }
      }
      if (!plan) return { estimatedCost: 0, actualTotal: 0, variance: 0, isOverBudget: false, isUnderBudget: false, percentUsed: 0 };
      const estimated = Number(plan.estimatedCost) || 0;
      const actual = (plan.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const variance = _round2(estimated - actual); // positive = under budget / savings, negative = over budget
      const isOverBudget = estimated > 0 && actual > estimated;
      const isUnderBudget = estimated > 0 && actual > 0 && actual < estimated;
      const percentUsed = estimated > 0 ? Math.round((actual / estimated) * 100) : 0;

      return {
        estimatedCost: estimated,
        actualTotal: _round2(actual),
        variance: variance,
        isOverBudget: isOverBudget,
        isUnderBudget: isUnderBudget,
        percentUsed: percentUsed
      };
    },

    // ─────────────────────────────────────────────────────────────
    // 6. GENERAL TRIP EXPENSES
    // ─────────────────────────────────────────────────────────────
    addGeneralExpense: async function (tripId, expenseData, options = {}) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');

      const title = (expenseData && (expenseData.title || expenseData.description || expenseData.name || 'Trip Expense')).trim();
      const amount = _round2(expenseData.amount);
      if (amount <= 0) throw new Error('Amount must be positive');

      if (!Array.isArray(trip.expenses)) trip.expenses = [];

      const expId = expenseData.id || _generateId('gexp');
      let linkedTxId = null;

      const shouldLink = Boolean(options.linkToCentralLedger || expenseData.linkToCentralLedger);
      const chosenAccount = options.account || expenseData.paymentMode || expenseData.account || 'Bank';

      if (shouldLink && window.LM_InterlinkEngine?.recordInterlinkedTx) {
        try {
          const recorded = await window.LM_InterlinkEngine.recordInterlinkedTx({
            sourceModule: 'trips',
            refType: 'trip_expense',
            amount: amount,
            date: expenseData.date || _todayISO(),
            type: 'out',
            category: 'Travel',
            account: chosenAccount,
            note: `Trip: ${trip.name} · ${title}`,
            subDetails: { tripId: trip.id, tripName: trip.name }
          });
          if (recorded && recorded.id) linkedTxId = recorded.id;
        } catch (e) {
          console.warn('[TripService] Failed to record general expense interlink:', e);
        }
      }

      function resolvePerson(identifier) {
        if (!identifier) return trip.persons[0]?.id || 'p1';
        const p = trip.persons.find(x => x.id === identifier || x.name === identifier || (x.name && x.name.toLowerCase() === String(identifier).toLowerCase()));
        return p ? p.id : identifier;
      }

      const rawShared = Array.isArray(expenseData.sharedWith) && expenseData.sharedWith.length
        ? expenseData.sharedWith
        : (Array.isArray(expenseData.splitBetween) && expenseData.splitBetween.length ? expenseData.splitBetween : trip.persons.map(p => p.id));

      const expense = {
        id: expId,
        title: title,
        amount: amount,
        date: expenseData.date || _todayISO(),
        paidBy: resolvePerson(expenseData.paidBy),
        sharedWith: rawShared.map(resolvePerson),
        paymentMethod: expenseData.paymentMethod || expenseData.paymentMode || 'Cash',
        category: expenseData.category || 'General',
        linkedTxId: linkedTxId
      };

      trip.expenses.push(expense);
      await this.saveTripToDB(trip);
      return expense;
    },

    deleteGeneralExpense: async function (tripId, expId, shouldRollbackTx = true) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.expenses)) return false;

      const exp = trip.expenses.find(e => String(e.id) === String(expId));
      if (exp && exp.linkedTxId && shouldRollbackTx && window.LM_InterlinkEngine?.revertInterlinkedTx) {
        try {
          await window.LM_InterlinkEngine.revertInterlinkedTx(exp.linkedTxId, true);
        } catch (e) {
          console.warn('[TripService] Error rolling back linked tx:', e);
        }
      }

      trip.expenses = trip.expenses.filter(e => String(e.id) !== String(expId));
      await this.saveTripToDB(trip);
      return true;
    },

    // ─────────────────────────────────────────────────────────────
    // 7. COMPREHENSIVE TRIP FINANCIAL ROLLUP
    // ─────────────────────────────────────────────────────────────
    getTripFinancials: function (tripId) {
      const trip = this.getTrip(tripId);
      if (!trip) {
        return {
          budgetCap: 0,
          totalPlannedCost: 0,
          totalPlanExpenses: 0,
          totalGeneralExpenses: 0,
          totalActualExpenses: 0,
          remainingBudget: 0,
          plannedVariance: 0,
          budgetUsagePercent: 0,
          categoryBreakdown: {},
          dayBreakdown: {},
          planItemsCount: 0,
          wishlistCount: 0
        };
      }

      const budgetCap = Number(trip.budgetCap) || 0;
      let totalPlanned = 0;
      let totalPlanActual = 0;
      const categoryBreakdown = {};
      const dayBreakdown = {};

      const plans = Array.isArray(trip.plans) ? trip.plans : [];
      plans.forEach(plan => {
        const est = Number(plan.estimatedCost) || 0;
        totalPlanned += est;

        const actual = (plan.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
        totalPlanActual += actual;

        // Category breakdown
        const cat = plan.category || 'General';
        if (!categoryBreakdown[cat]) {
          categoryBreakdown[cat] = { planned: 0, actual: 0 };
        }
        categoryBreakdown[cat].planned += est;
        categoryBreakdown[cat].actual += actual;

        // Day breakdown
        const day = plan.dayNumber || 1;
        if (!dayBreakdown[day]) {
          dayBreakdown[day] = { planned: 0, actual: 0 };
        }
        dayBreakdown[day].planned += est;
        dayBreakdown[day].actual += actual;
      });

      const generalExpenses = Array.isArray(trip.expenses) ? trip.expenses : [];
      const totalGeneral = generalExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      // Add general expenses to category breakdown
      generalExpenses.forEach(e => {
        const cat = e.category || 'General';
        if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { planned: 0, actual: 0 };
        categoryBreakdown[cat].actual += (Number(e.amount) || 0);
      });

      const totalActual = totalPlanActual + totalGeneral;
      const targetBudget = budgetCap > 0 ? budgetCap : totalPlanned;
      const remainingBudget = _round2(targetBudget - totalActual);
      const plannedVariance = _round2(totalPlanned - totalPlanActual);
      const usagePct = targetBudget > 0 ? _round2((totalActual / targetBudget) * 100) : 0;

      return {
        budgetCap: _round2(budgetCap),
        totalPlannedCost: _round2(totalPlanned),
        plannedTotal: _round2(totalPlanned),
        totalPlanExpenses: _round2(totalPlanActual),
        totalGeneralExpenses: _round2(totalGeneral),
        totalActualExpenses: _round2(totalActual),
        actualTotal: _round2(totalActual),
        remainingBudget: remainingBudget,
        plannedVariance: plannedVariance,
        variance: plannedVariance,
        budgetUsagePercent: usagePct,
        percentBudgetUsed: usagePct,
        categoryBreakdown: categoryBreakdown,
        dayBreakdown: dayBreakdown,
        planItemsCount: plans.length,
        wishlistCount: (trip.wishlist || []).length
      };
    },

    // ─────────────────────────────────────────────────────────────
    // 8. MINIMUM CASH FLOW GROUP DEBT SETTLEMENT
    // ─────────────────────────────────────────────────────────────
    calculateSettlements: function (tripId) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.persons) || trip.persons.length === 0) return [];

      const persons = trip.persons;
      const totals = {};
      persons.forEach(p => totals[p.id] = 0);

      function resolvePersonId(identifier) {
        if (!identifier) return persons[0]?.id;
        const p = persons.find(x => x.id === identifier || x.name === identifier || (x.name && x.name.toLowerCase() === String(identifier).toLowerCase()));
        return p ? p.id : identifier;
      }

      // Collect all expenses (plan expenses + general expenses)
      const allExpenses = [];
      (trip.plans || []).forEach(p => {
        (p.expenses || []).forEach(e => allExpenses.push(e));
      });
      (trip.expenses || []).forEach(e => allExpenses.push(e));

      allExpenses.forEach(e => {
        const amt = Number(e.amount) || 0;
        const shared = (Array.isArray(e.sharedWith) && e.sharedWith.length
          ? e.sharedWith
          : (Array.isArray(e.splitBetween) && e.splitBetween.length ? e.splitBetween : persons.map(p => p.id))
        ).map(resolvePersonId);
        const perPerson = amt / (shared.length || 1);

        shared.forEach(id => {
          if (totals[id] !== undefined) totals[id] -= perPerson;
        });

        const payerId = resolvePersonId(e.paidBy);
        if (totals[payerId] !== undefined) {
          totals[payerId] += amt;
        }
      });

      const debtors = [];
      const creditors = [];

      persons.forEach(p => {
        const net = _round2(totals[p.id] || 0);
        if (net < -0.01) {
          debtors.push({ id: p.id, name: p.name, balance: -net });
        } else if (net > 0.01) {
          creditors.push({ id: p.id, name: p.name, balance: net });
        }
      });

      const payments = [];
      let i = 0, j = 0;
      while (i < debtors.length && j < creditors.length) {
        const d = debtors[i];
        const c = creditors[j];
        const amt = _round2(Math.min(d.balance, c.balance));

        const settlementId = `settle_${d.id}_${c.id}`;
        const existingRecord = (trip.settlements || []).find(x => 
          (x.id === settlementId) || 
          (x.from === d.id && x.to === c.id) ||
          (x.from === d.name && x.to === c.name)
        );
        const isSettled = existingRecord && (existingRecord.status === 'collected' || existingRecord.status === 'settled');

        payments.push({
          id: settlementId,
          from: d.name || d.id,
          to: c.name || c.id,
          fromId: d.id,
          toId: c.id,
          fromName: d.name,
          toName: c.name,
          amount: amt,
          status: isSettled ? 'settled' : 'pending'
        });

        d.balance = _round2(d.balance - amt);
        c.balance = _round2(c.balance - amt);

        if (d.balance <= 0.01) i++;
        if (c.balance <= 0.01) j++;
      }

      return payments;
    },

    calculateGroupSettlement: function (tripId) {
      return this.calculateSettlements(tripId);
    },

    markSettlementPaid: async function (tripId, settlementIdOrFrom, toIdOrBool = true) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      if (!Array.isArray(trip.settlements)) trip.settlements = [];

      let item = trip.settlements.find(s => s.id === settlementIdOrFrom || (s.from === settlementIdOrFrom && s.to === toIdOrBool));
      if (!item) {
        item = { id: settlementIdOrFrom, from: settlementIdOrFrom, to: toIdOrBool, status: 'collected', confirmedAmount: 0 };
        trip.settlements.push(item);
      }
      item.status = 'collected';
      await this.saveTripToDB(trip);
      return true;
    },

    updateSettlementPayment: async function (tripId, fromId, toId, confirmedAmount) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');

      if (!Array.isArray(trip.settlements)) trip.settlements = [];
      let s = trip.settlements.find(x => x.from === fromId && x.to === toId);
      if (!s) {
        s = { from: fromId, to: toId, amount: confirmedAmount, confirmedAmount: 0, status: 'uncollected' };
        trip.settlements.push(s);
      }

      s.confirmedAmount = _round2(Number(confirmedAmount) || 0);
      s.status = s.confirmedAmount >= (s.amount || confirmedAmount) ? 'collected' : 'uncollected';

      await this.saveTripToDB(trip);
      return s;
    },

    markAllSettled: async function (tripId) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');

      const payments = this.calculateSettlements(tripId);
      trip.settlements = payments.map(p => ({
        from: p.from,
        to: p.to,
        amount: p.amount,
        confirmedAmount: p.amount,
        status: 'collected'
      }));

      await this.saveTripToDB(trip);
      return trip.settlements;
    },

    // ─────────────────────────────────────────────────────────────
    // 9. EXPORT & SHARE SUMMARY
    // ─────────────────────────────────────────────────────────────
    generateWhatsAppText: function (tripId) {
      const trip = this.getTrip(tripId);
      if (!trip) return '';

      const fin = this.getTripFinancials(tripId);
      const days = this.calculateTripDays(trip.startDate, trip.endDate);

      let text = `✈️ *${trip.name}*\n`;
      text += `📍 *Destination:* ${trip.destination || 'Unspecified'}\n`;
      text += `📅 *Dates:* ${trip.startDate} → ${trip.endDate} (${days} Days)\n`;
      text += `💰 *Budget:* ${_fmtINR(fin.budgetCap || fin.totalPlannedCost)} | *Spent:* ${_fmtINR(fin.totalActualExpenses)}\n\n`;

      text += `🗺️ *ITINERARY & PLAN EXPENSES:*\n`;
      const plans = Array.isArray(trip.plans) ? trip.plans : [];
      let currentDay = -1;

      plans.forEach(plan => {
        if (plan.dayNumber !== currentDay) {
          currentDay = plan.dayNumber;
          text += `\n*── DAY ${currentDay} ──*\n`;
        }
        const pf = this.getPlanFinancials(plan);
        text += `• ${plan.title} [${plan.category}]`;
        if (pf.estimatedCost > 0 || pf.actualTotal > 0) {
          text += ` (Est: ${_fmtINR(pf.estimatedCost)} | Actual: ${_fmtINR(pf.actualTotal)})`;
        }
        text += `\n`;
      });

      if (trip.wishlist && trip.wishlist.length) {
        text += `\n💡 *DISCOVERED SPOTS / WISHLIST:*\n`;
        trip.wishlist.slice(0, 5).forEach(w => {
          text += `• ${w.title} (${_fmtINR(w.estimatedCost)})\n`;
        });
      }

      const settlements = this.calculateSettlements(tripId);
      if (settlements.length) {
        text += `\n🤝 *SETTLEMENTS:*\n`;
        settlements.forEach(s => {
          text += `• ${s.fromName} owes ${s.toName}: ${_fmtINR(s.amount)}\n`;
        });
      }

      return text;
    }
  };

  window.LM_TripService = TripService;
})();
