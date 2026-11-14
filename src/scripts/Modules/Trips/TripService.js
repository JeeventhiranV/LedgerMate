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

  const DEFAULT_FX_RATES = {
    INR: 1.0,
    USD: 86.5,
    EUR: 92.0,
    GBP: 110.5,
    AED: 23.55,
    THB: 2.55,
    SGD: 65.2,
    JPY: 0.58,
    IDR: 0.0055,
    CAD: 63.8,
    AUD: 57.2
  };

  const CURRENCY_SYMBOLS = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED ',
    THB: '฿',
    SGD: 'S$',
    JPY: '¥',
    IDR: 'Rp ',
    CAD: 'C$',
    AUD: 'A$'
  };

  try {
    if (typeof localStorage !== 'undefined') {
      const cachedFx = localStorage.getItem('lm_cached_fx_rates');
      if (cachedFx) {
        const parsed = JSON.parse(cachedFx);
        if (parsed && parsed.rates) Object.assign(DEFAULT_FX_RATES, parsed.rates);
      }
    }
  } catch (e) {}

  const WMO_WEATHER_MAP = {
    0: { emoji: '☀️', desc: 'Clear sky' },
    1: { emoji: '🌤️', desc: 'Mainly clear' },
    2: { emoji: '⛅', desc: 'Partly cloudy' },
    3: { emoji: '☁️', desc: 'Overcast' },
    45: { emoji: '🌫️', desc: 'Fog' },
    48: { emoji: '🌫️', desc: 'Depositing rime fog' },
    51: { emoji: '🌦️', desc: 'Light drizzle' },
    53: { emoji: '🌦️', desc: 'Moderate drizzle' },
    55: { emoji: '🌧️', desc: 'Dense drizzle' },
    61: { emoji: '🌧️', desc: 'Slight rain' },
    63: { emoji: '🌧️', desc: 'Moderate rain' },
    65: { emoji: '🌧️', desc: 'Heavy rain' },
    71: { emoji: '🌨️', desc: 'Slight snow' },
    73: { emoji: '🌨️', desc: 'Moderate snow' },
    75: { emoji: '❄️', desc: 'Heavy snow' },
    80: { emoji: '🌦️', desc: 'Rain showers' },
    81: { emoji: '🌧️', desc: 'Moderate rain showers' },
    82: { emoji: '⛈️', desc: 'Violent rain showers' },
    95: { emoji: '⛈️', desc: 'Thunderstorm' },
    96: { emoji: '⛈️', desc: 'Thunderstorm with hail' },
    99: { emoji: '⛈️', desc: 'Heavy thunderstorm' }
  };

  function _fmtCurrency(amount, currency = 'INR') {
    const curr = (currency || 'INR').toUpperCase();
    const sym = CURRENCY_SYMBOLS[curr] || (curr + ' ');
    const n = Number(amount) || 0;
    if (curr === 'INR') {
      return _fmtINR(n);
    }
    return sym + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const PACKING_PRESETS = {
    beach: [
      { item: 'Swimwear / Beach Outfits', category: 'clothing' },
      { item: 'Sunscreen Lotion (SPF 50+)', category: 'toiletries' },
      { item: 'Polarized Sunglasses', category: 'gear' },
      { item: 'Quick-Dry Beach Towel & Flip-Flops', category: 'clothing' },
      { item: 'Waterproof Phone Pouch', category: 'electronics' },
      { item: 'Aloe Vera / After-Sun Gel', category: 'toiletries' },
      { item: 'Sun Hat / Beach Cap', category: 'clothing' },
      { item: 'Power Bank & Water-Resistant Speaker', category: 'electronics' }
    ],
    trek: [
      { item: 'Trekking Boots & Extra Socks', category: 'clothing' },
      { item: 'Thermal Innerwear & Fleece Jacket', category: 'clothing' },
      { item: 'Waterproof Rain Poncho / Windcheater', category: 'gear' },
      { item: 'Headlamp & Spare Batteries', category: 'electronics' },
      { item: 'Hydration Flask & Water Purification Drops', category: 'gear' },
      { item: 'First Aid Kit & Blister Tape', category: 'medical' },
      { item: 'Energy Bars & Electrolyte Packets (ORS)', category: 'medical' },
      { item: 'Trekking Pole & Daypack', category: 'gear' }
    ],
    international: [
      { item: 'Passport & Physical Visa Copies', category: 'documents' },
      { item: 'Forex Multi-Currency Card & Local Cash', category: 'documents' },
      { item: 'Universal Travel Power Adapter', category: 'electronics' },
      { item: 'e-SIM / Roaming Package Setup', category: 'electronics' },
      { item: 'Travel Insurance Policy Copy', category: 'documents' },
      { item: 'Prescription Medicines with Doctor Note', category: 'medical' },
      { item: 'Noise-Cancelling Headphones', category: 'electronics' },
      { item: 'Memory Foam Neck Pillow', category: 'gear' }
    ],
    roadtrip: [
      { item: 'Driving License, Vehicle RC & Insurance', category: 'documents' },
      { item: 'Fastag Balance Recharged', category: 'documents' },
      { item: 'Tubeless Tyre Puncture Kit & Electric Pump', category: 'gear' },
      { item: 'Car Mobile Mount & Fast Car Charger', category: 'electronics' },
      { item: 'Thermos Flask & Roadside Snacks', category: 'gear' },
      { item: 'Motion Sickness / Vomistop Tablets', category: 'medical' },
      { item: 'Emergency High-Beam Torch & Jumper Cables', category: 'gear' }
    ],
    general: [
      { item: 'Daily Clothes & Undergarments', category: 'clothing' },
      { item: 'Toothbrush, Toothpaste & Floss', category: 'toiletries' },
      { item: 'Shampoo, Body Wash & Moisturizer', category: 'toiletries' },
      { item: 'Mobile Charger & Cables', category: 'electronics' },
      { item: 'Emergency Meds (Paracetamol, Antacid, Band-Aids)', category: 'medical' },
      { item: 'Government ID Proof (Aadhaar / Voter ID)', category: 'documents' },
      { item: 'Cash Wallet & Primary Credit Cards', category: 'documents' }
    ]
  };

  const TripService = {
    DEFAULT_FX_RATES: DEFAULT_FX_RATES,
    CURRENCY_SYMBOLS: CURRENCY_SYMBOLS,
    PACKING_PRESETS: PACKING_PRESETS,
    fmtCurrency: _fmtCurrency,
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

      const currency = (data.currency || 'INR').toUpperCase();
      const exchangeRate = Number(data.exchangeRate) || DEFAULT_FX_RATES[currency] || 1.0;

      const trip = {
        id: tripId,
        name: data.name.trim(),
        destination: (data.destination || '').trim(),
        startDate: data.startDate || _todayISO(),
        endDate: data.endDate || data.startDate || _todayISO(),
        status: data.status || 'planning', // 'wishlist' | 'planning' | 'booked' | 'ongoing' | 'completed'
        travelMode: data.travelMode || 'car', // 'car' | 'bike' | 'flight' | 'train' | 'bus' | 'mixed'
        budgetCap: _round2(data.budgetCap || 0),
        currency: currency,
        exchangeRate: exchangeRate,
        coverEmoji: data.coverEmoji || '✈️',
        notes: (data.notes || '').trim(),
        persons: persons,
        wishlist: Array.isArray(data.wishlist) ? data.wishlist : [],
        plans: Array.isArray(data.plans) ? data.plans : [],
        expenses: Array.isArray(data.expenses) ? data.expenses : [],
        settlements: Array.isArray(data.settlements) ? data.settlements : [],
        packingList: Array.isArray(data.packingList) ? data.packingList : [],
        documents: Array.isArray(data.documents) ? data.documents : [],
        vehicleId: data.vehicleId || null,
        startOdometer: data.startOdometer !== undefined && data.startOdometer !== null ? Number(data.startOdometer) : null,
        endOdometer: data.endOdometer !== undefined && data.endOdometer !== null ? Number(data.endOdometer) : null,
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
      if (updates.currency !== undefined) trip.currency = updates.currency.toUpperCase();
      if (updates.exchangeRate !== undefined) trip.exchangeRate = Number(updates.exchangeRate) || 1.0;
      if (updates.coverEmoji !== undefined) trip.coverEmoji = updates.coverEmoji;
      if (updates.notes !== undefined) trip.notes = updates.notes.trim();
      if (updates.completed !== undefined) trip.completed = Boolean(updates.completed);
      if (updates.packingList !== undefined) trip.packingList = updates.packingList;
      if (updates.documents !== undefined) trip.documents = updates.documents;
      if (updates.vehicleId !== undefined) trip.vehicleId = updates.vehicleId;
      if (updates.startOdometer !== undefined) trip.startOdometer = updates.startOdometer !== null ? Number(updates.startOdometer) : null;
      if (updates.endOdometer !== undefined) trip.endOdometer = updates.endOdometer !== null ? Number(updates.endOdometer) : null;

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
    // 2B. COMPANION / FRIEND MANAGEMENT ("Split with Friends")
    // ─────────────────────────────────────────────────────────────
    addPerson: async function (tripId, personData) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      if (!Array.isArray(trip.persons)) trip.persons = [];

      const name = (personData && (personData.name || personData.title || '')).trim();
      if (!name) throw new Error('Companion name is required');

      // Check if duplicate name
      const existing = trip.persons.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;

      const pid = personData.id || _generateId('p');
      const newPerson = {
        id: pid,
        name: name,
        phone: (personData.phone || '').trim(),
        upiId: (personData.upiId || personData.upi || '').trim(),
        avatarEmoji: personData.avatarEmoji || '👤',
        defaultShare: Number(personData.defaultShare) || 1
      };

      trip.persons.push(newPerson);
      await this.saveTripToDB(trip);
      return newPerson;
    },

    updatePerson: async function (tripId, personId, updates) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      if (!Array.isArray(trip.persons)) throw new Error('No persons found');

      const person = trip.persons.find(p => String(p.id) === String(personId));
      if (!person) throw new Error('Companion not found');

      if (updates.name !== undefined && updates.name.trim()) person.name = updates.name.trim();
      if (updates.phone !== undefined) person.phone = updates.phone.trim();
      if (updates.upiId !== undefined) person.upiId = updates.upiId.trim();
      if (updates.avatarEmoji !== undefined) person.avatarEmoji = updates.avatarEmoji;
      if (updates.defaultShare !== undefined) person.defaultShare = Math.max(0.1, Number(updates.defaultShare) || 1);

      await this.saveTripToDB(trip);
      return person;
    },

    deletePerson: async function (tripId, personId) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      if (!Array.isArray(trip.persons)) return false;

      // Safety check: ensure person is not the only traveler
      if (trip.persons.length <= 1) {
        throw new Error('Trip must have at least one traveler');
      }

      // Check if person has paid any expenses
      const allExpenses = [];
      (trip.plans || []).forEach(p => (p.expenses || []).forEach(e => allExpenses.push(e)));
      (trip.expenses || []).forEach(e => allExpenses.push(e));

      const hasPaid = allExpenses.some(e => String(e.paidBy) === String(personId));
      if (hasPaid) {
        throw new Error('Cannot remove companion who has logged expenses. Reassign or delete their expenses first.');
      }

      trip.persons = trip.persons.filter(p => String(p.id) !== String(personId));

      // Clean up split exclusions and shares for this person in existing expenses
      allExpenses.forEach(e => {
        if (Array.isArray(e.sharedWith)) {
          e.sharedWith = e.sharedWith.filter(id => String(id) !== String(personId));
        }
        if (Array.isArray(e.excludedMembers)) {
          e.excludedMembers = e.excludedMembers.filter(id => String(id) !== String(personId));
        }
        if (e.splitDetails && typeof e.splitDetails === 'object') {
          delete e.splitDetails[personId];
        }
      });

      // Remove from settlements if any
      if (Array.isArray(trip.settlements)) {
        trip.settlements = trip.settlements.filter(s => String(s.from) !== String(personId) && String(s.to) !== String(personId));
      }

      await this.saveTripToDB(trip);
      return true;
    },

    getPersonFinancials: function (tripId, personId) {
      const trip = this.getTrip(tripId);
      if (!trip) return { totalPaid: 0, totalShare: 0, netBalance: 0, expensesCount: 0 };

      const allExpenses = [];
      (trip.plans || []).forEach(p => (p.expenses || []).forEach(e => allExpenses.push(e)));
      (trip.expenses || []).forEach(e => allExpenses.push(e));

      let totalPaid = 0;
      let totalShare = 0;
      let count = 0;

      const persons = trip.persons || [];
      const pidStr = String(personId);

      allExpenses.forEach(e => {
        const amt = Number(e.amount) || 0;
        const payerId = String(e.paidBy);
        if (payerId === pidStr) {
          totalPaid += amt;
          count++;
        }

        // Calculate this person's share in this expense
        const shared = (Array.isArray(e.sharedWith) && e.sharedWith.length
          ? e.sharedWith
          : persons.map(p => p.id)
        ).map(String);

        if (e.splitType === 'exact' && e.splitDetails && typeof e.splitDetails === 'object') {
          if (e.splitDetails[personId] !== undefined) {
            totalShare += (Number(e.splitDetails[personId]) || 0);
          }
        } else if (e.splitType === 'shares' && e.splitDetails && typeof e.splitDetails === 'object') {
          let totalShares = 0;
          Object.keys(e.splitDetails).forEach(k => { totalShares += (Number(e.splitDetails[k]) || 0); });
          if (totalShares > 0 && e.splitDetails[personId] !== undefined) {
            const userShares = Number(e.splitDetails[personId]) || 0;
            totalShare += _round2(amt * (userShares / totalShares));
          } else if (shared.includes(pidStr)) {
            totalShare += _round2(amt / (shared.length || 1));
          }
        } else {
          // Equal split
          if (shared.includes(pidStr)) {
            totalShare += _round2(amt / (shared.length || 1));
          }
        }
      });

      totalPaid = _round2(totalPaid);
      totalShare = _round2(totalShare);
      const netBalance = _round2(totalPaid - totalShare);

      return {
        totalPaid: totalPaid,
        paidTotal: totalPaid,
        totalShare: totalShare,
        shareTotal: totalShare,
        netBalance: netBalance,
        isOwed: netBalance > 0.01,
        owes: netBalance < -0.01,
        isEven: Math.abs(netBalance) <= 0.01,
        expensesCount: count
      };
    },

    generatePersonSettlementWhatsAppMessage: function (tripId, personId) {
      const trip = this.getTrip(tripId);
      if (!trip) return '';

      const person = (trip.persons || []).find(p => String(p.id) === String(personId));
      if (!person) return '';

      const pf = this.getPersonFinancials(tripId, personId);
      const settlements = this.calculateSettlements(tripId);

      // What this person owes to others
      const debtsToPay = settlements.filter(s => String(s.fromId) === String(personId) || String(s.from) === String(person.name) || String(s.from) === String(personId));
      // What others owe to this person
      const creditsToReceive = settlements.filter(s => String(s.toId) === String(personId) || String(s.to) === String(person.name) || String(s.to) === String(personId));

      let msg = `👋 *Hey ${person.name}!*\n`;
      msg += `Here is your spending & settlement summary for *${trip.name}* (${trip.destination || ''}):\n\n`;
      msg += `💰 *Total You Paid:* ${_fmtINR(pf.totalPaid)}\n`;
      msg += `📊 *Your Calculated Share:* ${_fmtINR(pf.totalShare)}\n`;

      if (pf.netBalance > 0) {
        msg += `🟢 *Net Position:* You are owed *${_fmtINR(pf.netBalance)}*\n\n`;
        if (creditsToReceive.length) {
          msg += `*Pending settlements to receive from:*\n`;
          creditsToReceive.forEach(c => {
            msg += `• *${c.fromName}*: ${_fmtINR(c.amount)}\n`;
          });
        }
      } else if (pf.netBalance < 0) {
        msg += `🔴 *Net Position:* You owe *${_fmtINR(Math.abs(pf.netBalance))}*\n\n`;
        if (debtsToPay.length) {
          msg += `*Please settle with:*\n`;
          debtsToPay.forEach(d => {
            const upiUrl = this.getUpiIntentUrl(tripId, d.toId || d.to, d.amount);
            msg += `• *${d.toName}*: ${_fmtINR(d.amount)}\n`;
            if (upiUrl) {
              msg += `  👉 Pay via UPI: ${upiUrl}\n`;
            }
          });
        }
      } else {
        msg += `✅ *All Settled:* Your balance is zero!\n`;
      }

      msg += `\n_Generated via LedgerMate Travel Financial Intelligence_ ✈️`;
      return msg;
    },

    duplicateTrip: async function (tripId, options = {}) {
      const original = this.getTrip(tripId);
      if (!original) throw new Error('Trip not found');

      let newName = typeof options === 'string' ? options : (options && options.newName);
      let startDate = (options && options.startDate) || original.startDate;
      let endDate = (options && options.endDate) || original.endDate;
      let resetExpenses = (options && options.resetExpenses !== undefined) ? options.resetExpenses : true;
      let resetVisitStatus = (options && options.resetVisitStatus !== undefined) ? options.resetVisitStatus : true;

      const cloned = JSON.parse(JSON.stringify(original));
      const newTripId = _generateId('trip');
      const now = new Date().toISOString();

      cloned.id = newTripId;
      cloned.name = (newName && typeof newName === 'string' && newName.trim()) ? newName.trim() : `${original.name} (Copy)`;
      cloned.startDate = startDate;
      cloned.endDate = endDate;
      cloned.createdAt = now;
      cloned.updatedAt = now;
      cloned.completed = false;
      cloned.status = 'planning';

      if (resetExpenses) {
        cloned.expenses = [];
        cloned.settlements = [];
      }
      (cloned.plans || []).forEach(p => {
        p.id = _generateId('plan');
        if (resetExpenses) p.expenses = [];
        if (resetVisitStatus) p.status = 'planned';
      });
      (cloned.wishlist || []).forEach(w => {
        w.id = _generateId('wish');
        w.scheduledPlanId = null;
      });
      (cloned.documents || []).forEach(d => {
        d.id = _generateId('doc');
      });

      await this.saveTripToDB(cloned);
      return cloned;
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
        mapUrl: (itemData.mapUrl || itemData.mapsUrl || '').trim(),
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
      if (updates.mapUrl !== undefined) wish.mapUrl = updates.mapUrl.trim();
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

      let mapUrl = (planOptions?.mapUrl || wish.mapUrl || '').trim();
      if (!mapUrl && wish.sourceUrl && (wish.sourceUrl.includes('google.com/maps') || wish.sourceUrl.includes('maps.app.goo.gl') || wish.sourceUrl.includes('goo.gl/maps'))) {
        mapUrl = wish.sourceUrl.trim();
      }

      const planData = {
        title: planOptions?.title || wish.title,
        category: planOptions?.category || wish.category,
        location: planOptions?.location || wish.location,
        mapUrl: mapUrl,
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
        mapUrl: (planData.mapUrl || planData.mapsUrl || planData.mapsLink || planData.mapLink || '').trim(),
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
      if (updates.mapUrl !== undefined || updates.mapsUrl !== undefined || updates.mapsLink !== undefined || updates.mapLink !== undefined) {
        plan.mapUrl = (updates.mapUrl || updates.mapsUrl || updates.mapsLink || updates.mapLink || '').trim();
      }
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

    togglePlanStatus: async function (tripId, planId) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.plans)) throw new Error('Trip or plans not found');

      const plan = trip.plans.find(p => String(p.id) === String(planId));
      if (!plan) throw new Error('Plan item not found');

      const isCompleted = plan.status === 'completed' || plan.status === 'visited';
      plan.status = isCompleted ? 'planned' : 'completed';

      await this.saveTripToDB(trip);
      return plan;
    },

    convertPlanToWishlist: async function (tripId, planId) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.plans)) throw new Error('Trip or plans not found');

      const planIdx = trip.plans.findIndex(p => String(p.id) === String(planId));
      if (planIdx === -1) throw new Error('Plan item not found');

      const plan = trip.plans[planIdx];

      // Add to wishlist
      if (!Array.isArray(trip.wishlist)) trip.wishlist = [];
      const wishId = _generateId('wish');
      const wishItem = {
        id: wishId,
        title: plan.title,
        category: plan.category || 'Sightseeing',
        location: plan.location || '',
        mapUrl: plan.mapUrl || '',
        sourceUrl: '',
        sourcePlatform: '',
        notes: plan.notes || '',
        estimatedCost: plan.estimatedCost || 0,
        priority: 'medium',
        scheduledPlanId: null
      };

      trip.wishlist.push(wishItem);

      // Preserve any expenses logged under this plan by moving them to general expenses
      if (Array.isArray(plan.expenses) && plan.expenses.length > 0) {
        if (!Array.isArray(trip.expenses)) trip.expenses = [];
        plan.expenses.forEach(e => {
          e.title = `[From: ${plan.title}] ${e.title}`;
          trip.expenses.push(e);
        });
      }

      // Remove from plans
      trip.plans.splice(planIdx, 1);

      await this.saveTripToDB(trip);
      return wishItem;
    },

    getItineraryStats: function (tripId) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.plans)) {
        return { total: 0, pending: 0, visited: 0, percent: 0, byDay: {} };
      }

      const total = trip.plans.length;
      let visited = 0;
      const byDay = {};

      trip.plans.forEach(p => {
        const d = Number(p.dayNumber) || 1;
        if (!byDay[d]) byDay[d] = { total: 0, pending: 0, visited: 0 };
        byDay[d].total++;

        const isDone = p.status === 'completed' || p.status === 'visited';
        if (isDone) {
          visited++;
          byDay[d].visited++;
        } else {
          byDay[d].pending++;
        }
      });

      const pending = total - visited;
      const percent = total > 0 ? Math.round((visited / total) * 100) : 0;

      return {
        total: total,
        pending: pending,
        visited: visited,
        percent: percent,
        byDay: byDay
      };
    },

    getMapsUrl: function (item) {
      if (!item) return '';
      // 1. Direct explicit map link (e.g. maps.app.goo.gl, goo.gl/maps, google.com/maps)
      const direct = (item.mapUrl || item.mapsUrl || item.mapsLink || item.mapLink || '').trim();
      if (direct && /^https?:\/\//i.test(direct)) {
        return direct;
      }
      // 2. If sourceUrl is a Google Maps link (e.g. from wishlist or inspiration)
      const src = (item.sourceUrl || item.url || '').trim();
      if (src && /^https?:\/\//i.test(src) && (src.includes('google.com/maps') || src.includes('maps.app.goo.gl') || src.includes('goo.gl/maps'))) {
        return src;
      }
      // 3. If location itself is a URL
      const loc = (item.location || '').trim();
      if (loc && /^https?:\/\//i.test(loc)) {
        return loc;
      }
      // 4. Construct Google Maps search query
      const query = (loc ? (loc + (item.title ? ' ' + item.title : '')) : (item.title || '')).trim();
      if (query) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      }
      return '';
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
      // Multi-Currency & FX
      const expenseCurrency = (expenseData.currency || trip.currency || 'INR').toUpperCase();
      let exchangeRate = Number(expenseData.exchangeRate);
      if (!exchangeRate || exchangeRate <= 0) {
        exchangeRate = expenseCurrency === trip.currency ? (trip.exchangeRate || 1.0) : (DEFAULT_FX_RATES[expenseCurrency] || 1.0);
      }
      
      let localAmount = _round2(expenseData.localAmount !== undefined ? expenseData.localAmount : expenseData.amount);
      if (localAmount <= 0) throw new Error('Amount must be greater than zero');

      let amount = expenseCurrency === 'INR' ? localAmount : _round2(localAmount * exchangeRate);

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
              currency: expenseCurrency,
              localAmount: localAmount,
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
        currency: expenseCurrency,
        localAmount: localAmount,
        exchangeRate: exchangeRate,
        receiptId: expenseData.receiptId || null,
        receiptUrl: expenseData.receiptUrl || null,
        date: expenseData.date || _todayISO(),
        paidBy: resolvePerson(expenseData.paidBy),
        sharedWith: rawShared.map(resolvePerson),
        paymentMethod: expenseData.paymentMethod || expenseData.paymentMode || 'Cash',
        category: expenseData.category || plan.category || 'General',
        splitType: expenseData.splitType || 'equal', // 'equal' | 'exact' | 'shares'
        splitDetails: (expenseData.splitDetails && typeof expenseData.splitDetails === 'object') ? expenseData.splitDetails : null,
        linkedTxId: linkedTxId
      };

      plan.expenses.push(expense);

      // Auto-sync fuel log to linked vehicle if applicable
      if ((expense.category === 'Fuel' || String(expense.category).toLowerCase() === 'transit' || options.syncFuelToVehicle) && trip.vehicleId) {
        try {
          await this.syncFuelExpenseToVehicle(tripId, expense);
        } catch (e) {
          console.warn('[TripService] Fuel sync error:', e);
        }
      }

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
      
      // Multi-Currency & FX
      const expenseCurrency = (expenseData.currency || trip.currency || 'INR').toUpperCase();
      let exchangeRate = Number(expenseData.exchangeRate);
      if (!exchangeRate || exchangeRate <= 0) {
        exchangeRate = expenseCurrency === trip.currency ? (trip.exchangeRate || 1.0) : (DEFAULT_FX_RATES[expenseCurrency] || 1.0);
      }
      
      let localAmount = _round2(expenseData.localAmount !== undefined ? expenseData.localAmount : expenseData.amount);
      if (localAmount <= 0) throw new Error('Amount must be positive');

      let amount = expenseCurrency === 'INR' ? localAmount : _round2(localAmount * exchangeRate);

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
            subDetails: {
              tripId: trip.id,
              tripName: trip.name,
              currency: expenseCurrency,
              localAmount: localAmount
            }
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
        currency: expenseCurrency,
        localAmount: localAmount,
        exchangeRate: exchangeRate,
        receiptId: expenseData.receiptId || null,
        receiptUrl: expenseData.receiptUrl || null,
        date: expenseData.date || _todayISO(),
        paidBy: resolvePerson(expenseData.paidBy),
        sharedWith: rawShared.map(resolvePerson),
        paymentMethod: expenseData.paymentMethod || expenseData.paymentMode || 'Cash',
        category: expenseData.category || 'General',
        splitType: expenseData.splitType || 'equal', // 'equal' | 'exact' | 'shares'
        splitDetails: (expenseData.splitDetails && typeof expenseData.splitDetails === 'object') ? expenseData.splitDetails : null,
        linkedTxId: linkedTxId
      };

      // Auto-sync fuel log to linked vehicle if applicable
      if ((expense.category === 'Fuel' || String(expense.category).toLowerCase() === 'transit' || options.syncFuelToVehicle) && trip.vehicleId) {
        try {
          await this.syncFuelExpenseToVehicle(tripId, expense);
        } catch (e) {
          console.warn('[TripService] Fuel sync error:', e);
        }
      }

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

      // Pacing & Burn Velocity
      const tripDays = this.calculateTripDays(trip.startDate, trip.endDate) || 1;
      const dailyBudgetCap = budgetCap > 0 ? _round2(budgetCap / tripDays) : (totalPlanned > 0 ? _round2(totalPlanned / tripDays) : 0);

      const now = new Date();
      const start = new Date(trip.startDate);
      const daysElapsed = Math.max(1, Math.min(tripDays, Math.ceil((now - start) / 864e5)));
      const avgDailySpend = _round2(totalActual / daysElapsed);
      const projectedTotal = _round2(avgDailySpend * tripDays);
      const pacingVariance = targetBudget > 0 ? _round2(targetBudget - projectedTotal) : 0;
      const pacingStatus = targetBudget > 0 ? (pacingVariance >= 0 ? 'on_track' : 'over_pacing') : 'unbudgeted';

      return {
        currency: trip.currency || 'INR',
        exchangeRate: trip.exchangeRate || 1.0,
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
        tripDays: tripDays,
        dailyBudgetCap: dailyBudgetCap,
        daysElapsed: daysElapsed,
        avgDailySpend: avgDailySpend,
        projectedTotal: projectedTotal,
        pacingVariance: pacingVariance,
        pacingStatus: pacingStatus,
        categoryBreakdown: categoryBreakdown,
        dayBreakdown: dayBreakdown,
        planItemsCount: plans.length,
        wishlistCount: (trip.wishlist || []).length,
        documentsCount: (trip.documents || []).length,
        packingStats: this.getPackingStats(tripId)
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
        if (e.splitType === 'exact' && e.splitDetails && typeof e.splitDetails === 'object') {
          Object.keys(e.splitDetails).forEach(k => {
            const pid = resolvePersonId(k);
            const userOwes = Number(e.splitDetails[k]) || 0;
            if (totals[pid] !== undefined) totals[pid] -= userOwes;
          });
        } else if (e.splitType === 'shares' && e.splitDetails && typeof e.splitDetails === 'object') {
          let totalShares = 0;
          Object.keys(e.splitDetails).forEach(k => {
            totalShares += (Number(e.splitDetails[k]) || 0);
          });
          if (totalShares > 0) {
            Object.keys(e.splitDetails).forEach(k => {
              const pid = resolvePersonId(k);
              const userShares = Number(e.splitDetails[k]) || 0;
              const userOwes = _round2(amt * (userShares / totalShares));
              if (totals[pid] !== undefined) totals[pid] -= userOwes;
            });
          } else {
            const perPerson = amt / (shared.length || 1);
            shared.forEach(id => {
              if (totals[id] !== undefined) totals[id] -= perPerson;
            });
          }
        } else {
          // Default equal split
          const perPerson = amt / (shared.length || 1);
          shared.forEach(id => {
            if (totals[id] !== undefined) totals[id] -= perPerson;
          });
        }

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
          upiUrl: this.getUpiIntentUrl(trip.id, c.id, amt),
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

    getUpiIntentUrl: function (fromNameOrTripId, toNameOrId, amount, tripName = '') {
      amount = _round2(amount);
      let toName = toNameOrId;
      let fromName = fromNameOrTripId;
      let tName = tripName;

      // If first argument is a trip ID
      const trip = this.getTrip(fromNameOrTripId);
      let upiPa = 'trip.settle@upi';
      if (trip) {
        tName = trip.name;
        const target = (trip.persons || []).find(p => p.id === toNameOrId || p.name === toNameOrId);
        if (target) {
          toName = target.name;
          if (target.upiId && target.upiId.trim()) upiPa = target.upiId.trim();
        }
        fromName = 'Trip Partner';
      }

      const note = encodeURIComponent(`Settlement: ${tName || 'Trip'} - ${fromName} to ${toName}`);
      const cleanName = encodeURIComponent(toName || 'Trip Partner');
      return `upi://pay?pa=${upiPa}&pn=${cleanName}&am=${amount}&tn=${note}&cu=INR`;
    },

    // ─────────────────────────────────────────────────────────────
    // 9. MULTI-CURRENCY & FX ENGINE
    // ─────────────────────────────────────────────────────────────
    SUPPORTED_CURRENCIES: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'THB', 'SGD', 'JPY', 'IDR', 'CAD', 'AUD'],

    convertCurrency: function (amount, fromCurrency, toCurrency = 'INR', customRate = null) {
      fromCurrency = (fromCurrency || 'INR').toUpperCase();
      toCurrency = (toCurrency || 'INR').toUpperCase();
      if (fromCurrency === toCurrency) return _round2(amount);

      let inrAmount = Number(amount) || 0;
      if (customRate && customRate > 0) {
        if (toCurrency === 'INR') return _round2(amount * customRate);
        if (fromCurrency === 'INR') return _round2(amount / customRate);
      }

      const fromRate = DEFAULT_FX_RATES[fromCurrency] || 1.0;
      const toRate = DEFAULT_FX_RATES[toCurrency] || 1.0;

      inrAmount = (Number(amount) || 0) * fromRate;
      return _round2(inrAmount / toRate);
    },

    setTripCurrency: async function (tripId, currency, exchangeRate = null) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      trip.currency = (currency || 'INR').toUpperCase();
      trip.exchangeRate = exchangeRate ? Number(exchangeRate) : (DEFAULT_FX_RATES[trip.currency] || 1.0);
      await this.saveTripToDB(trip);
      return trip;
    },

    // ─────────────────────────────────────────────────────────────
    // 10. PACKING CHECKLIST MANAGEMENT & PRESETS
    // ─────────────────────────────────────────────────────────────
    getPackingStats: function (tripId) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.packingList)) {
        return { total: 0, packed: 0, pending: 0, percent: 0 };
      }
      const total = trip.packingList.length;
      const packed = trip.packingList.filter(i => i.packed).length;
      const pending = total - packed;
      const percent = total > 0 ? Math.round((packed / total) * 100) : 0;
      return { total, packed, pending, percent };
    },

    addPackingItem: async function (tripId, itemData) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      if (!itemData || !itemData.item) throw new Error('Item name is required');

      if (!Array.isArray(trip.packingList)) trip.packingList = [];

      const newItem = {
        id: itemData.id || _generateId('pack'),
        item: itemData.item.trim(),
        category: itemData.category || 'general', // 'clothing' | 'toiletries' | 'electronics' | 'documents' | 'medical' | 'gear'
        packed: Boolean(itemData.packed),
        createdAt: new Date().toISOString()
      };

      trip.packingList.push(newItem);
      await this.saveTripToDB(trip);
      return newItem;
    },

    togglePackingItem: async function (tripId, itemId) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.packingList)) throw new Error('Trip or packing list not found');

      const item = trip.packingList.find(i => String(i.id) === String(itemId));
      if (!item) throw new Error('Packing item not found');

      item.packed = !item.packed;
      await this.saveTripToDB(trip);
      return item;
    },

    deletePackingItem: async function (tripId, itemId) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.packingList)) return false;

      trip.packingList = trip.packingList.filter(i => String(i.id) !== String(itemId));
      await this.saveTripToDB(trip);
      return true;
    },

    populatePackingPreset: async function (tripId, presetKey = 'general') {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');

      const presetItems = PACKING_PRESETS[presetKey] || PACKING_PRESETS.general;
      if (!Array.isArray(trip.packingList)) trip.packingList = [];

      let addedCount = 0;
      presetItems.forEach(p => {
        const exists = trip.packingList.some(existing => existing.item.toLowerCase() === p.item.toLowerCase());
        if (!exists) {
          trip.packingList.push({
            id: _generateId('pack'),
            item: p.item,
            category: p.category || 'general',
            packed: false,
            createdAt: new Date().toISOString()
          });
          addedCount++;
        }
      });

      await this.saveTripToDB(trip);
      return { addedCount, total: trip.packingList.length };
    },

    // ─────────────────────────────────────────────────────────────
    // 11. DIGITAL DOCUMENT LOCKER
    // ─────────────────────────────────────────────────────────────
    addDocument: async function (tripId, docData) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      if (!docData || !docData.title) throw new Error('Document title is required');

      if (!Array.isArray(trip.documents)) trip.documents = [];

      const doc = {
        id: docData.id || _generateId('doc'),
        title: docData.title.trim(),
        type: docData.type || 'other', // 'flight' | 'hotel' | 'visa' | 'insurance' | 'contact' | 'other'
        refCode: (docData.refCode || '').trim(),
        notes: (docData.notes || '').trim(),
        attachmentUrl: docData.attachmentUrl || null,
        createdAt: new Date().toISOString()
      };

      trip.documents.push(doc);
      await this.saveTripToDB(trip);
      return doc;
    },

    updateDocument: async function (tripId, docId, updates) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.documents)) throw new Error('Trip or documents not found');

      const doc = trip.documents.find(d => String(d.id) === String(docId));
      if (!doc) throw new Error('Document not found');

      if (updates.title !== undefined) doc.title = updates.title.trim();
      if (updates.type !== undefined) doc.type = updates.type;
      if (updates.refCode !== undefined) doc.refCode = updates.refCode.trim();
      if (updates.notes !== undefined) doc.notes = updates.notes.trim();
      if (updates.attachmentUrl !== undefined) doc.attachmentUrl = updates.attachmentUrl;

      await this.saveTripToDB(trip);
      return doc;
    },

    deleteDocument: async function (tripId, docId) {
      const trip = this.getTrip(tripId);
      if (!trip || !Array.isArray(trip.documents)) return false;

      trip.documents = trip.documents.filter(d => String(d.id) !== String(docId));
      await this.saveTripToDB(trip);
      return true;
    },

    // ─────────────────────────────────────────────────────────────
    // 12. VEHICLE FLEET & ROAD TRIP SYNC
    // ─────────────────────────────────────────────────────────────
    linkVehicle: async function (tripId, vehicleId, startOdo = null) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      trip.vehicleId = vehicleId;
      if (startOdo !== null) trip.startOdometer = Number(startOdo);
      await this.saveTripToDB(trip);
      return trip;
    },

    updateOdometer: async function (tripId, startOdo, endOdo) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');
      if (startOdo !== undefined) trip.startOdometer = startOdo !== null ? Number(startOdo) : null;
      if (endOdo !== undefined) trip.endOdometer = endOdo !== null ? Number(endOdo) : null;
      await this.saveTripToDB(trip);
      return trip;
    },

    syncFuelExpenseToVehicle: async function (tripId, fuelExpenseData) {
      const trip = this.getTrip(tripId);
      if (!trip || !trip.vehicleId) return null;
      if (window.LM_VehicleService && typeof window.LM_VehicleService.addFuelLog === 'function') {
        try {
          return await window.LM_VehicleService.addFuelLog(trip.vehicleId, {
            date: fuelExpenseData.date || _todayISO(),
            amount: fuelExpenseData.amount,
            odometer: fuelExpenseData.odometer || trip.startOdometer || 0,
            liters: fuelExpenseData.liters || 0,
            pricePerLiter: fuelExpenseData.pricePerLiter || 0,
            fuelType: fuelExpenseData.fuelType || 'Petrol',
            fuelStation: fuelExpenseData.fuelStation || (trip.destination + ' Fuel Station'),
            notes: `Auto-synced from trip: ${trip.name}`
          });
        } catch (e) {
          console.warn('[TripService] Fuel log auto-sync error:', e);
        }
      }
      return null;
    },

    // ─────────────────────────────────────────────────────────────
    // 13. EXPORT & SHARE SUMMARY
    // ─────────────────────────────────────────────────────────────
    generateWhatsAppText: function (tripId, options = {}) {
      const trip = this.getTrip(tripId);
      if (!trip) return '';

      const mode = (options && options.mode) ? options.mode : 'full'; // 'full' | 'settlement_only' | 'itinerary_only'
      const fin = this.getTripFinancials(tripId);
      const days = this.calculateTripDays(trip.startDate, trip.endDate);
      const persons = trip.persons || [];
      const settlements = this.calculateSettlements(tripId);

      // Collect all expenses
      const allExpenses = [];
      (trip.plans || []).forEach(p => {
        (p.expenses || []).forEach(e => {
          allExpenses.push({
            title: `${p.title} · ${e.title || 'Expense'}`,
            amount: Number(e.amount) || 0,
            currency: e.currency || 'INR',
            localAmount: e.localAmount,
            paidBy: e.paidBy,
            category: p.category || 'Plan',
            date: e.date || p.date || trip.startDate
          });
        });
      });
      (trip.expenses || []).forEach(e => {
        allExpenses.push({
          title: e.title || 'General Expense',
          amount: Number(e.amount) || 0,
          currency: e.currency || 'INR',
          localAmount: e.localAmount,
          paidBy: e.paidBy,
          category: e.category || 'General',
          date: e.date || trip.startDate
        });
      });

      function resolveName(pid) {
        const found = persons.find(p => String(p.id) === String(pid) || p.name === pid);
        return found ? found.name : (pid || 'Partner');
      }

      if (mode === 'settlement_only') {
        let text = `✈️ *${trip.name} · Group Settlement & Math Summary*\n`;
        text += `📍 *Destination:* ${trip.destination || 'Unspecified'}\n`;
        text += `📅 *Dates:* ${trip.startDate} → ${trip.endDate}\n\n`;

        text += `💰 *FINANCIAL OVERVIEW:*\n`;
        text += `• Total Group Spend: *${_fmtINR(fin.totalActualExpenses)}*\n`;
        text += `• Total Expenses Logged: *${allExpenses.length}*\n`;
        text += `• Travelers (${persons.length}): ${persons.map(p => p.name).join(', ')}\n\n`;

        text += `💳 *WHO PAID WHAT:*\n`;
        persons.forEach(p => {
          const pf = this.getPersonFinancials(tripId, p.id);
          text += `• *${p.name}:* ${_fmtINR(pf.totalPaid)} (${pf.expensesCount} items)\n`;
        });
        text += `\n`;

        text += `⚖️ *INDIVIDUAL SHARE & NET BALANCES:*\n`;
        persons.forEach(p => {
          const pf = this.getPersonFinancials(tripId, p.id);
          const sign = pf.netBalance >= 0 ? '+' : '';
          const statusEmoji = pf.netBalance > 0 ? '🟢 Gets back' : (pf.netBalance < 0 ? '🔴 Owes' : '✅ Settled');
          text += `• *${p.name}:* Paid ${_fmtINR(pf.totalPaid)} · Share ${_fmtINR(pf.totalShare)} ➔ *${sign}${_fmtINR(pf.netBalance)}* (${statusEmoji})\n`;
        });
        text += `\n`;

        if (settlements.length > 0) {
          text += `💸 *SETTLEMENT TRANSFERS (Minimum Cash Flow):*\n`;
          settlements.forEach((s, idx) => {
            text += `${idx + 1}. *${s.fromName}* owes *${s.toName}*: *${_fmtINR(s.amount)}*\n`;
            if (s.upiUrl) {
              text += `   👉 1-Tap UPI: ${s.upiUrl}\n`;
            }
          });
        } else {
          text += `🎉 *All group expenses are completely balanced and settled!*\n`;
        }

        text += `\n_Generated via LedgerMate Travel Financial Intelligence_ 🌴`;
        return text;
      }

      if (mode === 'itinerary_only') {
        let text = `✈️ *${trip.name} · Complete Itinerary*\n`;
        text += `📍 *Destination:* ${trip.destination || 'Unspecified'}\n`;
        text += `📅 *Dates:* ${trip.startDate} → ${trip.endDate} (${days} Days)\n\n`;

        const plans = Array.isArray(trip.plans) ? trip.plans : [];
        let currentDay = -1;

        plans.forEach(plan => {
          if (plan.dayNumber !== currentDay) {
            currentDay = plan.dayNumber;
            text += `\n*── DAY ${currentDay} ──*\n`;
          }
          const isDone = plan.status === 'completed' || plan.status === 'visited';
          const statusMark = isDone ? '✅ [Visited]' : '⏳ [Pending]';
          const timeStr = plan.time ? ` ⏰ ${plan.time}` : '';
          text += `• ${statusMark} *${plan.title}* [${plan.category || 'Activity'}]${timeStr}\n`;
          if (plan.location) text += `  📍 Location: ${plan.location}\n`;
          const planMapUrl = this.getMapsUrl(plan);
          if (planMapUrl) text += `  🧭 Maps: ${planMapUrl}\n`;
          if (plan.notes) text += `  📝 Notes: ${plan.notes}\n`;
        });

        text += `\n_Generated via LedgerMate Travel Financial Intelligence_ 🌴`;
        return text;
      }

      // Default: Mode 'full'
      let text = `✈️ *${trip.name} · Executive Travel & Financial Audit Report*\n`;
      text += `📍 *Destination:* ${trip.destination || 'Unspecified'}\n`;
      text += `📅 *Dates:* ${trip.startDate} → ${trip.endDate} (${days} Days)\n`;
      text += `👥 *Travelers (${persons.length}):* ${persons.map(p => p.name).join(', ')}\n\n`;

      text += `💰 *EXECUTIVE FINANCIAL SUMMARY:*\n`;
      text += `• Total Budget: *${_fmtINR(fin.budgetCap || fin.totalPlannedCost)}*\n`;
      text += `• Total Spent: *${_fmtINR(fin.totalActualExpenses)}*\n`;
      text += `• Remaining Safe Balance: *${_fmtINR(fin.remainingBudget)}*\n`;
      if (fin.dailyBudgetCap > 0) {
        text += `• Daily Burn Allowance: *${_fmtINR(fin.dailyBudgetCap)}/day*\n`;
      }
      text += `\n`;

      if (fin.categoryBreakdown && Object.keys(fin.categoryBreakdown).length > 0) {
        text += `📊 *SPENDING BY CATEGORY:*\n`;
        Object.keys(fin.categoryBreakdown).forEach(cat => {
          const item = fin.categoryBreakdown[cat];
          text += `• ${cat}: *${_fmtINR(item.actual || 0)}*\n`;
        });
        text += `\n`;
      }

      text += `💳 *WHO PAID WHAT:*\n`;
      persons.forEach(p => {
        const pf = this.getPersonFinancials(tripId, p.id);
        text += `• *${p.name}:* ${_fmtINR(pf.totalPaid)} (${pf.expensesCount} expenses)\n`;
      });
      text += `\n`;

      text += `⚖️ *INDIVIDUAL SHARE & NET BALANCES:*\n`;
      persons.forEach(p => {
        const pf = this.getPersonFinancials(tripId, p.id);
        const sign = pf.netBalance >= 0 ? '+' : '';
        const statusEmoji = pf.netBalance > 0 ? '🟢 Gets back' : (pf.netBalance < 0 ? '🔴 Owes' : '✅ Settled');
        text += `• *${p.name}:* Paid ${_fmtINR(pf.totalPaid)} · Share ${_fmtINR(pf.totalShare)} ➔ *${sign}${_fmtINR(pf.netBalance)}* (${statusEmoji})\n`;
      });
      text += `\n`;

      if (settlements.length > 0) {
        text += `💸 *SETTLEMENT TRANSFERS:*\n`;
        settlements.forEach((s, idx) => {
          text += `${idx + 1}. *${s.fromName}* owes *${s.toName}*: *${_fmtINR(s.amount)}*\n`;
          if (s.upiUrl) {
            text += `   👉 UPI Intent: ${s.upiUrl}\n`;
          }
        });
        text += `\n`;
      }

      if (allExpenses.length > 0) {
        text += `📝 *ITEMIZED EXPENSE LEDGER (${allExpenses.length} transactions):*\n`;
        allExpenses.forEach((e, idx) => {
          const payer = resolveName(e.paidBy);
          const fxStr = (e.currency && e.currency !== 'INR' && e.localAmount) ? ` (${window.LM_TripService.fmtCurrency(e.localAmount, e.currency)})` : '';
          text += `${idx + 1}. [${e.date || ''}] ${e.title} [${e.category}] - *${_fmtINR(e.amount)}*${fxStr} (Paid by ${payer})\n`;
        });
        text += `\n`;
      }

      text += `🗺️ *ITINERARY SCHEDULE:*\n`;
      const plans = Array.isArray(trip.plans) ? trip.plans : [];
      let curDay = -1;
      plans.forEach(plan => {
        if (plan.dayNumber !== curDay) {
          curDay = plan.dayNumber;
          text += `\n*── DAY ${curDay} ──*\n`;
        }
        const isDone = plan.status === 'completed' || plan.status === 'visited';
        const statusMark = isDone ? '✅' : '⏳';
        const timeStr = plan.time ? ` ⏰ ${plan.time}` : '';
        text += `• ${statusMark} ${plan.title}${timeStr}`;
        const planMapUrl = this.getMapsUrl(plan);
        if (planMapUrl) text += `\n  📍 Maps: ${planMapUrl}`;
        text += `\n`;
      });

      text += `\n_Report generated via LedgerMate Travel Financial Intelligence_ 🌴`;
      return text;
    },

    // ─────────────────────────────────────────────────────────────
    // 14. ICALENDAR (.ICS) GENERATOR
    // ─────────────────────────────────────────────────────────────
    generateICalendar: function (tripId) {
      const trip = this.getTrip(tripId);
      if (!trip) return '';

      const nowUtc = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const cleanTripName = (trip.name || 'Trip').replace(/[^\w\s-]/g, '');
      const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//LedgerMate//Trip Planner//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${cleanTripName}`,
        'X-WR-TIMEZONE:Asia/Kolkata'
      ];

      function formatIcalDate(dateStr, timeStr) {
        if (!dateStr) return '';
        const cleanDate = dateStr.replace(/-/g, '');
        if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
          const cleanTime = timeStr.replace(':', '') + '00';
          return `${cleanDate}T${cleanTime}`;
        }
        return `${cleanDate}`;
      }

      function addMinutes(dateStr, timeStr, mins) {
        const d = new Date(dateStr + (timeStr ? `T${timeStr}:00` : 'T10:00:00'));
        d.setMinutes(d.getMinutes() + mins);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${y}${m}${day}T${h}${min}00`;
      }

      const tripStartDate = trip.startDate || new Date().toISOString().split('T')[0];

      // Add Plans
      (trip.plans || []).forEach(p => {
        const dayNum = Number(p.dayNumber) || 1;
        const planDateObj = new Date(tripStartDate);
        planDateObj.setDate(planDateObj.getDate() + (dayNum - 1));
        const planDate = planDateObj.toISOString().split('T')[0];

        const hasTime = Boolean(p.time && /^\d{2}:\d{2}$/.test(p.time));
        const dtStart = hasTime ? formatIcalDate(planDate, p.time) : formatIcalDate(planDate);
        const dtEnd = hasTime ? addMinutes(planDate, p.time, 120) : formatIcalDate(planDate);

        const mapUrl = this.getMapsUrl(p);
        let desc = `Category: ${p.category || 'Activity'}\\nEstimated Cost: ₹${p.estimatedCost || 0}`;
        if (p.bookingRef) desc += `\\nBooking Ref: ${p.bookingRef}`;
        if (p.notes) desc += `\\nNotes: ${p.notes.replace(/\n/g, '\\n')}`;
        if (mapUrl) desc += `\\nMaps Link: ${mapUrl}`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:plan_${p.id}_${trip.id}@ledgermate`);
        lines.push(`DTSTAMP:${nowUtc}`);
        if (hasTime) {
          lines.push(`DTSTART:${dtStart}`);
          lines.push(`DTEND:${dtEnd}`);
        } else {
          lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
          lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
        }
        lines.push(`SUMMARY:${(p.title || 'Plan').replace(/[^\w\s-]/g, '')} [${p.category || 'Plan'}]`);
        if (desc) lines.push(`DESCRIPTION:${desc}`);
        if (p.location) lines.push(`LOCATION:${p.location.replace(/[^\w\s,-]/g, '')}`);
        if (mapUrl) lines.push(`URL:${mapUrl}`);

        // 1-hour alarm before activity
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-PT60M');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:Reminder: ${p.title} in 1 hour`);
        lines.push('END:VALARM');

        lines.push('END:VEVENT');
      });

      // Add Flight / Booking documents as calendar events
      (trip.documents || []).forEach(doc => {
        if (doc.type === 'flight' || doc.type === 'hotel') {
          lines.push('BEGIN:VEVENT');
          lines.push(`UID:doc_${doc.id}_${trip.id}@ledgermate`);
          lines.push(`DTSTAMP:${nowUtc}`);
          lines.push(`DTSTART;VALUE=DATE:${tripStartDate.replace(/-/g, '')}`);
          lines.push(`SUMMARY:${doc.type === 'flight' ? '✈️ Flight' : '🏨 Hotel'}: ${(doc.title || 'Booking').replace(/[^\w\s-]/g, '')}${doc.refCode ? ` (Ref: ${doc.refCode})` : ''}`);
          lines.push(`DESCRIPTION:${(doc.notes || '').replace(/\n/g, '\\n')}\\nRef Code: ${doc.refCode || 'N/A'}`);
          lines.push('END:VEVENT');
        }
      });

      lines.push('END:VCALENDAR');
      return lines.join('\r\n');
    },

    // ─────────────────────────────────────────────────────────────
    // 15. LIVE WEATHER FORECAST (OPEN-METEO)
    // ─────────────────────────────────────────────────────────────
    _weatherCache: {},

    fetchWeatherForecast: async function (destination) {
      if (!destination || typeof destination !== 'string') return null;
      const key = destination.trim().toLowerCase();
      const now = Date.now();

      if (this._weatherCache[key] && (now - this._weatherCache[key].timestamp < 3 * 3600 * 1000)) {
        return this._weatherCache[key].data;
      }

      if (typeof fetch === 'undefined') return null;

      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination.trim())}&count=1&language=en&format=json`);
        if (!geoRes.ok) return null;
        const geoData = await geoRes.json();
        if (!geoData.results || !geoData.results.length) return null;

        const loc = geoData.results[0];
        const lat = loc.latitude;
        const lon = loc.longitude;

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`);
        if (!weatherRes.ok) return null;
        const wData = await weatherRes.json();
        if (!wData.daily || !Array.isArray(wData.daily.time)) return null;

        const forecastMap = {};
        wData.daily.time.forEach((dateStr, idx) => {
          const code = wData.daily.weathercode?.[idx] ?? 0;
          const info = WMO_WEATHER_MAP[code] || { emoji: '⛅', desc: 'Partly cloudy' };
          forecastMap[dateStr] = {
            date: dateStr,
            code: code,
            emoji: info.emoji,
            desc: info.desc,
            tempMax: Math.round(wData.daily.temperature_2m_max?.[idx] ?? 28),
            tempMin: Math.round(wData.daily.temperature_2m_min?.[idx] ?? 20),
            rainProb: wData.daily.precipitation_probability_max?.[idx] ?? 0
          };
        });

        this._weatherCache[key] = {
          timestamp: now,
          data: forecastMap
        };

        return forecastMap;
      } catch (e) {
        console.warn('[TripService] Weather fetch failed:', e);
        return null;
      }
    },

    // ─────────────────────────────────────────────────────────────
    // 16. DASHBOARD ACTIVE / UPCOMING TRIP TELEMETRY
    // ─────────────────────────────────────────────────────────────
    getActiveOrUpcomingTrip: function () {
      const trips = this.getTrips();
      if (!trips.length) return null;
      const today = new Date().toISOString().split('T')[0];

      // 1. Actively ongoing trip
      const active = trips.find(t => t.startDate && t.endDate && t.startDate <= today && t.endDate >= today);
      if (active) {
        const startD = new Date(active.startDate);
        const curD = new Date(today);
        const dayNum = Math.min(this.calculateTripDays(active.startDate, active.endDate), Math.max(1, Math.ceil((curD - startD) / 864e5) + 1));
        return { trip: active, status: 'active', currentDay: dayNum, daysUntil: 0 };
      }

      // 2. Upcoming trip within next 7 days
      const upcoming = trips
        .filter(t => t.startDate && t.startDate > today)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];

      if (upcoming) {
        const diffDays = Math.ceil((new Date(upcoming.startDate) - new Date(today)) / (864e5));
        if (diffDays <= 7) {
          return { trip: upcoming, status: 'upcoming', currentDay: 0, daysUntil: diffDays };
        }
      }

      return null;
    },

    // ─────────────────────────────────────────────────────────────
    // 17. PORTABLE TRIP PACKAGE EXPORT & IMPORT (.LM_TRIP)
    // ─────────────────────────────────────────────────────────────
    exportTripPackage: function (tripId, options = {}) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');

      const clone = JSON.parse(JSON.stringify(trip));
      if (!options.includeLedgerLinks) {
        (clone.plans || []).forEach(p => {
          (p.expenses || []).forEach(e => {
            delete e.linkedTxId;
          });
        });
        (clone.expenses || []).forEach(e => {
          delete e.linkedTxId;
        });
      }

      return JSON.stringify({
        format: 'ledgermate_trip_v1',
        version: '2.0',
        exportedAt: new Date().toISOString(),
        trip: clone
      }, null, 2);
    },

    importTripPackage: async function (rawContent) {
      let payload;
      if (typeof rawContent === 'string') {
        payload = JSON.parse(rawContent);
      } else {
        payload = rawContent;
      }

      const importedTrip = payload.trip || payload;
      if (!importedTrip || !importedTrip.name) {
        throw new Error('Invalid trip package payload');
      }

      const newTripId = _generateId('trip');
      importedTrip.id = newTripId;
      importedTrip.name = (importedTrip.name + ' (Imported)').trim();
      importedTrip.createdAt = new Date().toISOString();
      importedTrip.updatedAt = new Date().toISOString();

      const planIdMap = {};
      (importedTrip.plans || []).forEach(p => {
        const oldId = p.id;
        p.id = _generateId('plan');
        planIdMap[oldId] = p.id;
        (p.expenses || []).forEach(e => {
          e.id = _generateId('pexp');
          delete e.linkedTxId;
        });
      });

      (importedTrip.wishlist || []).forEach(w => {
        w.id = _generateId('wish');
        if (w.scheduledPlanId && planIdMap[w.scheduledPlanId]) {
          w.scheduledPlanId = planIdMap[w.scheduledPlanId];
        }
      });

      (importedTrip.documents || []).forEach(d => {
        d.id = _generateId('doc');
      });

      (importedTrip.packingList || []).forEach(item => {
        item.id = _generateId('pack');
      });

      (importedTrip.expenses || []).forEach(e => {
        e.id = _generateId('gexp');
        delete e.linkedTxId;
      });

      const trips = this.getTrips();
      trips.unshift(importedTrip);
      await this.saveTripToDB(importedTrip);
      return importedTrip;
    },

    // ─────────────────────────────────────────────────────────────
    // 18. LIVE FX EXCHANGE RATES REFRESH
    // ─────────────────────────────────────────────────────────────
    fetchLiveFXRates: async function (baseCurrency = 'INR') {
      if (typeof fetch === 'undefined') return { success: false, rates: DEFAULT_FX_RATES };
      try {
        const res = await fetch(`https://api.frankfurter.app/latest?from=INR`);
        if (!res.ok) throw new Error('FX API returned ' + res.status);
        const data = await res.json();
        if (data && data.rates) {
          Object.keys(DEFAULT_FX_RATES).forEach(curr => {
            if (data.rates[curr] && data.rates[curr] > 0) {
              DEFAULT_FX_RATES[curr] = _round2(1 / data.rates[curr]);
            }
          });
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('lm_cached_fx_rates', JSON.stringify({
                timestamp: Date.now(),
                rates: DEFAULT_FX_RATES
              }));
            }
          } catch (e) {}
          return { success: true, rates: DEFAULT_FX_RATES, date: data.date };
        }
      } catch (e) {
        console.warn('[TripService] Live FX fetch error, using default/cached rates:', e);
      }
      return { success: false, rates: DEFAULT_FX_RATES };
    },

    // ─────────────────────────────────────────────────────────────
    // 19. NEAREST NEIGHBOR ROUTE OPTIMIZER & MAPS COORDINATE SEQUENCING
    // ─────────────────────────────────────────────────────────────
    _geoCoordsCache: {},

    extractCoordinates: function (item) {
      if (!item) return null;
      // 1. Direct lat/lng numeric properties on item
      if (typeof item === 'object') {
        const directLat = Number(item.lat ?? item.latitude);
        const directLng = Number(item.lng ?? item.longitude ?? item.lon);
        if (!isNaN(directLat) && !isNaN(directLng) && Math.abs(directLat) <= 90 && Math.abs(directLng) <= 180 && (directLat !== 0 || directLng !== 0)) {
          return { lat: directLat, lng: directLng };
        }
      }

      // 2. Candidate strings to search for coordinates
      const candidates = [];
      if (typeof item === 'string') {
        candidates.push(item);
      } else if (typeof item === 'object') {
        ['mapUrl', 'mapsUrl', 'mapsLink', 'mapLink', 'sourceUrl', 'url', 'location'].forEach(k => {
          if (item[k] && typeof item[k] === 'string') candidates.push(item[k]);
        });
      }

      for (const text of candidates) {
        if (!text || typeof text !== 'string') continue;
        const trimmed = text.trim();

        // Pattern A: @lat,lng (e.g. google.com/maps/@15.549112,73.753544,15z)
        const matchAt = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (matchAt) {
          const lat = parseFloat(matchAt[1]);
          const lng = parseFloat(matchAt[2]);
          if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
        }

        // Pattern B: ?q=lat,lng or &q=lat,lng or ?query=lat,lng or ?ll=lat,lng
        const matchQ = trimmed.match(/[?&](?:q|query|ll|center|destination|origin)=(-?\d+\.\d+),(-?\d+\.\d+)/i);
        if (matchQ) {
          const lat = parseFloat(matchQ[1]);
          const lng = parseFloat(matchQ[2]);
          if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
        }

        // Pattern C: /dir/.../lat,lng or /search/.../lat,lng or /place/lat,lng
        const matchDir = trimmed.match(/\/(?:dir|search|place|maps)\/.*?(-?\d+\.\d+),(-?\d+\.\d+)/i);
        if (matchDir) {
          const lat = parseFloat(matchDir[1]);
          const lng = parseFloat(matchDir[2]);
          if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
        }

        // Pattern D: Raw comma-separated coordinates, e.g. "15.549112, 73.753544" or "15.549112,73.753544"
        const matchRaw = trimmed.match(/^[-+]?([1-8]?\d(?:\.\d+)?|90(?:\.0+)?),\s*[-+]?(180(?:\.0+)?|(?:1[0-7]\d|\d{1,2})(?:\.\d+)?)$/);
        if (matchRaw) {
          const lat = parseFloat(matchRaw[1]);
          const lng = parseFloat(matchRaw[2]);
          if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
        }
      }

      return null;
    },

    resolvePlanCoordinates: async function (plan, tripDestination = '') {
      if (!plan) return null;
      // 1. Check if already extracted
      const extracted = this.extractCoordinates(plan);
      if (extracted) {
        plan.lat = extracted.lat;
        plan.lng = extracted.lng;
        return extracted;
      }

      // 2. Location name or title for geocoding lookup
      const placeName = (plan.location && !/^https?:\/\//i.test(plan.location)) ? plan.location : plan.title;
      if (!placeName || typeof placeName !== 'string') return null;

      const cacheKey = (placeName + '|' + (tripDestination || '')).toLowerCase().trim();
      if (this._geoCoordsCache[cacheKey]) {
        plan.lat = this._geoCoordsCache[cacheKey].lat;
        plan.lng = this._geoCoordsCache[cacheKey].lng;
        return this._geoCoordsCache[cacheKey];
      }

      // Check localStorage cache if available
      try {
        if (typeof localStorage !== 'undefined') {
          const savedCache = localStorage.getItem('lm_geo_coords_cache');
          if (savedCache) {
            const parsed = JSON.parse(savedCache);
            if (parsed && parsed[cacheKey]) {
              this._geoCoordsCache[cacheKey] = parsed[cacheKey];
              plan.lat = parsed[cacheKey].lat;
              plan.lng = parsed[cacheKey].lng;
              return parsed[cacheKey];
            }
          }
        }
      } catch (e) {}

      // 3. Geocode with Open-Meteo or Nominatim
      if (typeof fetch === 'undefined') return null;

      try {
        const query = (tripDestination && !placeName.toLowerCase().includes(tripDestination.toLowerCase()))
          ? `${placeName}, ${tripDestination}`
          : placeName;
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.results && data.results.length > 0) {
            const coords = { lat: Number(data.results[0].latitude), lng: Number(data.results[0].longitude) };
            this._geoCoordsCache[cacheKey] = coords;
            plan.lat = coords.lat;
            plan.lng = coords.lng;
            this._persistGeoCache();
            return coords;
          }
        }
      } catch (e) {
        console.warn('[TripService] Open-Meteo geocoding fallback failed:', e);
      }

      // Secondary fallback: OpenStreetMap Nominatim
      try {
        const query = (tripDestination && !placeName.toLowerCase().includes(tripDestination.toLowerCase()))
          ? `${placeName}, ${tripDestination}`
          : placeName;
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
            this._geoCoordsCache[cacheKey] = coords;
            plan.lat = coords.lat;
            plan.lng = coords.lng;
            this._persistGeoCache();
            return coords;
          }
        }
      } catch (e) {
        console.warn('[TripService] Nominatim geocoding fallback failed:', e);
      }

      return null;
    },

    _persistGeoCache: function () {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('lm_geo_coords_cache', JSON.stringify(this._geoCoordsCache));
        }
      } catch (e) {}
    },

    calculateHaversineDistance: function (lat1, lon1, lat2, lon2) {
      if (lat1 === lat2 && lon1 === lon2) return 0;
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return Math.round(R * c * 100) / 100;
    },

    calculateRouteTotalDistance: function (plans) {
      if (!Array.isArray(plans) || plans.length < 2) {
        return { totalKm: 0, legs: [] };
      }
      let totalKm = 0;
      const legs = [];

      for (let i = 0; i < plans.length - 1; i++) {
        const p1 = plans[i];
        const p2 = plans[i + 1];
        const c1 = this.extractCoordinates(p1);
        const c2 = this.extractCoordinates(p2);

        if (c1 && c2) {
          const d = this.calculateHaversineDistance(c1.lat, c1.lng, c2.lat, c2.lng);
          totalKm += d;
          legs.push({
            fromIndex: i,
            toIndex: i + 1,
            fromTitle: p1.title,
            toTitle: p2.title,
            distanceKm: d,
            estMinutes: Math.max(5, Math.round((d / 35) * 60))
          });
        }
      }

      return {
        totalKm: Math.round(totalKm * 100) / 100,
        legs: legs
      };
    },

    buildMultiStopRouteUrl: function (plans) {
      if (!Array.isArray(plans) || plans.length === 0) return '';

      const stops = [];
      for (const p of plans) {
        if (!p) continue;

        // 1. Check coordinates first (most accurate and universally supported across mobile & desktop)
        const coords = this.extractCoordinates(p);
        if (coords && coords.lat && coords.lng) {
          stops.push(`${coords.lat},${coords.lng}`);
          continue;
        }

        // 2. Location name or title (strictly non-URL to prevent malformed queries)
        let loc = '';
        if (typeof p === 'string') {
          loc = p.trim();
        } else if (typeof p === 'object') {
          if (p.location && typeof p.location === 'string' && !/^https?:\/\//i.test(p.location.trim())) {
            loc = p.location.trim();
          } else if (p.title && typeof p.title === 'string') {
            loc = p.title.trim();
          }
        }

        if (loc) {
          loc = loc.replace(/^https?:\/\/\S+/gi, '').replace(/[\r\n]+/g, ' ').trim();
          if (loc) stops.push(loc);
        }
      }

      if (stops.length === 0) return '';

      // Single stop -> Search view
      if (stops.length === 1) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stops[0])}`;
      }

      // 2 stops -> Direct origin and destination
      const origin = stops[0];
      const destination = stops[stops.length - 1];

      if (stops.length === 2) {
        return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
      }

      // 3 or more stops -> Cross-platform universal Google Maps URL with waypoints
      // Google Maps URLs API supports up to 9 intermediate waypoints
      const intermediate = stops.slice(1, -1).slice(0, 9);
      const waypointsParam = intermediate.join('|');

      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypointsParam)}&travelmode=driving`;
    },

    optimizeDayItineraryRoute: async function (tripId, dayNumber, options = {}) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');

      const dNum = Number(dayNumber);
      const allPlans = trip.plans || [];
      const dayPlans = allPlans.filter(p => (p.dayNumber || p.day || 1) === dNum);

      if (dayPlans.length === 0) {
        return {
          canOptimize: false,
          reason: 'No plans found for Day ' + dNum,
          dayNumber: dNum,
          originalPlans: [],
          optimizedPlans: [],
          distanceBefore: 0,
          distanceAfter: 0,
          distanceSaved: 0,
          timeSavedMinutes: 0
        };
      }

      // Resolve coordinates for all day plans
      for (const p of dayPlans) {
        await this.resolvePlanCoordinates(p, trip.destination);
      }

      const withCoords = [];
      const withoutCoords = [];
      dayPlans.forEach(p => {
        const c = this.extractCoordinates(p);
        if (c) {
          withCoords.push({ plan: p, coords: c });
        } else {
          withoutCoords.push(p);
        }
      });

      if (withCoords.length < 2) {
        const origDistance = this.calculateRouteTotalDistance(dayPlans).totalKm;
        return {
          canOptimize: false,
          reason: 'At least 2 plans need map links or recognizable locations to calculate nearest route',
          dayNumber: dNum,
          originalPlans: dayPlans,
          optimizedPlans: dayPlans,
          distanceBefore: origDistance,
          distanceAfter: origDistance,
          distanceSaved: 0,
          timeSavedMinutes: 0
        };
      }

      // Pick start plan
      let startIdx = 0;
      if (options.startPlanId) {
        const foundIdx = withCoords.findIndex(item => String(item.plan.id) === String(options.startPlanId));
        if (foundIdx !== -1) startIdx = foundIdx;
      } else {
        // Look for stay/hotel category
        const stayIdx = withCoords.findIndex(item => {
          const cat = (item.plan.category || '').toLowerCase();
          const title = (item.plan.title || '').toLowerCase();
          return cat === 'stay' || cat === 'hotel' || title.includes('hotel') || title.includes('resort');
        });
        if (stayIdx !== -1) startIdx = stayIdx;
      }

      // Nearest Neighbor Greedy Selection
      const unvisited = [...withCoords];
      const startNode = unvisited.splice(startIdx, 1)[0];
      const orderedNodes = [startNode];

      while (unvisited.length > 0) {
        const current = orderedNodes[orderedNodes.length - 1];
        let nearestIdx = 0;
        let minDistance = Infinity;

        for (let i = 0; i < unvisited.length; i++) {
          const candidate = unvisited[i];
          const dist = this.calculateHaversineDistance(
            current.coords.lat,
            current.coords.lng,
            candidate.coords.lat,
            candidate.coords.lng
          );
          if (dist < minDistance) {
            minDistance = dist;
            nearestIdx = i;
          }
        }

        orderedNodes.push(unvisited.splice(nearestIdx, 1)[0]);
      }

      // 2-Opt Refinement Pass to untangle any crossed edges
      if (orderedNodes.length >= 4) {
        let improved = true;
        let iter = 0;
        while (improved && iter < 50) {
          improved = false;
          iter++;
          for (let i = 1; i < orderedNodes.length - 1; i++) {
            for (let k = i + 1; k < orderedNodes.length; k++) {
              const pA = orderedNodes[i - 1].coords;
              const pB = orderedNodes[i].coords;
              const pC = orderedNodes[k].coords;
              const pD = (k + 1 < orderedNodes.length) ? orderedNodes[k + 1].coords : null;

              const curDist = this.calculateHaversineDistance(pA.lat, pA.lng, pB.lat, pB.lng) +
                (pD ? this.calculateHaversineDistance(pC.lat, pC.lng, pD.lat, pD.lng) : 0);
              const newDist = this.calculateHaversineDistance(pA.lat, pA.lng, pC.lat, pC.lng) +
                (pD ? this.calculateHaversineDistance(pB.lat, pB.lng, pD.lat, pD.lng) : 0);

              if (newDist < curDist - 0.05) { // At least 50m improvement
                const segment = orderedNodes.slice(i, k + 1).reverse();
                orderedNodes.splice(i, segment.length, ...segment);
                improved = true;
                break;
              }
            }
            if (improved) break;
          }
        }
      }

      // Combine optimized stops + non-geocoded stops (kept at the end)
      const optimizedPlans = orderedNodes.map(item => item.plan).concat(withoutCoords);

      const beforeMetrics = this.calculateRouteTotalDistance(dayPlans);
      const afterMetrics = this.calculateRouteTotalDistance(optimizedPlans);

      const distanceSaved = Math.max(0, Math.round((beforeMetrics.totalKm - afterMetrics.totalKm) * 100) / 100);
      const timeSavedMinutes = Math.max(0, Math.round((distanceSaved / 35) * 60));

      // Build Cross-Platform Universal Google Maps Multi-stop directions URL
      const googleMapsDirUrl = this.buildMultiStopRouteUrl(optimizedPlans);

      return {
        success: true,
        canOptimize: true,
        dayNumber: dNum,
        originalPlans: dayPlans,
        optimizedPlans: optimizedPlans,
        distanceBefore: beforeMetrics.totalKm,
        distanceAfter: afterMetrics.totalKm,
        distanceSaved: distanceSaved,
        timeSavedMinutes: timeSavedMinutes,
        legsBefore: beforeMetrics.legs,
        legsAfter: afterMetrics.legs,
        googleMapsDirUrl: googleMapsDirUrl,
        stopsCount: optimizedPlans.length,
        geocodedCount: withCoords.length
      };
    },

    applyOptimizedDayRoute: async function (tripId, dayNumber, orderedPlanIds, options = {}) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');

      const dNum = Number(dayNumber);
      trip.plans = trip.plans || [];

      // Save backup for 1-click revert
      trip._itineraryBackup = {
        dayNumber: dNum,
        timestamp: Date.now(),
        plans: JSON.parse(JSON.stringify(trip.plans))
      };

      // Collect day plans and other plans
      const dayPlans = trip.plans.filter(p => (p.dayNumber || p.day || 1) === dNum);
      const otherPlans = trip.plans.filter(p => (p.dayNumber || p.day || 1) !== dNum);

      // Map day plans by id
      const planMap = new Map();
      dayPlans.forEach(p => planMap.set(String(p.id), p));

      const reorderedDayPlans = [];
      const seenIds = new Set();

      (orderedPlanIds || []).forEach(id => {
        const sId = String(id);
        if (planMap.has(sId)) {
          reorderedDayPlans.push(planMap.get(sId));
          seenIds.add(sId);
        }
      });

      // Add any remaining day plans that weren't in orderedPlanIds
      dayPlans.forEach(p => {
        if (!seenIds.has(String(p.id))) {
          reorderedDayPlans.push(p);
        }
      });

      // Optionally re-assign chronological sequential times if options.rescheduleTimes !== false
      if (options.rescheduleTimes !== false && reorderedDayPlans.length > 0) {
        let currentTimeMinutes = 9 * 60 + 30; // default 09:30 AM
        const firstTime = reorderedDayPlans[0].time;
        if (firstTime && /^\d{2}:\d{2}$/.test(firstTime)) {
          const [hh, mm] = firstTime.split(':').map(Number);
          currentTimeMinutes = hh * 60 + mm;
        }

        reorderedDayPlans.forEach((plan, idx) => {
          if (idx === 0) {
            const h = String(Math.floor(currentTimeMinutes / 60) % 24).padStart(2, '0');
            const m = String(currentTimeMinutes % 60).padStart(2, '0');
            plan.time = `${h}:${m}`;
          } else {
            const prevPlan = reorderedDayPlans[idx - 1];
            let transitMins = 30;
            const c1 = this.extractCoordinates(prevPlan);
            const c2 = this.extractCoordinates(plan);
            if (c1 && c2) {
              const dist = this.calculateHaversineDistance(c1.lat, c1.lng, c2.lat, c2.lng);
              transitMins = Math.max(15, Math.round((dist / 35) * 60));
            }
            const visitMins = (plan.category === 'Stay' || plan.category === 'Hotel') ? 60 : 90;
            currentTimeMinutes += (transitMins + visitMins);
            const h = String(Math.floor(currentTimeMinutes / 60) % 24).padStart(2, '0');
            const m = String(currentTimeMinutes % 60).padStart(2, '0');
            plan.time = `${h}:${m}`;
          }
        });
      }

      // Update trip.plans with reordered day plans
      trip.plans = [...otherPlans, ...reorderedDayPlans];
      trip.updatedAt = new Date().toISOString();

      await this.saveTripToDB(trip);
      return {
        success: true,
        trip: trip,
        reorderedCount: reorderedDayPlans.length
      };
    },

    revertOptimizedDayRoute: async function (tripId) {
      const trip = this.getTrip(tripId);
      if (!trip) throw new Error('Trip not found');

      if (!trip._itineraryBackup || !Array.isArray(trip._itineraryBackup.plans)) {
        return { success: false, reason: 'No previous route backup available to revert' };
      }

      trip.plans = trip._itineraryBackup.plans;
      delete trip._itineraryBackup;
      trip.updatedAt = new Date().toISOString();

      await this.saveTripToDB(trip);
      return { success: true, trip };
    },

    WMO_WEATHER_MAP: WMO_WEATHER_MAP
  };

  window.LM_TripService = TripService;
})();
