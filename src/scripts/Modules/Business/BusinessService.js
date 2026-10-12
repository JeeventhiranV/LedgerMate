/**
 * LedgerMate – BusinessService.js
 * ─────────────────────────────────────────────────────────────
 * Dedicated Business Ledger & Accounting Service Layer.
 * Manages multi-business entities, Credits (Inflows/Revenue),
 * Debits (Outflows/Operating Expenses), and Charges (Gateway fees,
 * Taxes, Surcharges), Customer/Vendor Party Ledgers (Khata),
 * P&L bottom line calculation, and encrypted persistence.
 *
 * Exposes: window.LM_BusinessService
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _businesses = [];
  var _transactions = [];
  var _isInitialized = false;

  function _getProfileId() {
    return window.LM_Auth?.getCurrentUserId?.() || 'default';
  }

  function _matchesProfile(record) {
    if (!record) return false;
    var uid = _getProfileId();
    if (window.LM_Auth?.isAdmin?.()) return true;
    if (!record.profile || record.profile === 'default' || record.profile === 'guest') return true;
    if (!uid || uid === 'default' || uid === 'guest') return true;
    if (record.profile === uid) return true;
    var user = window.LM_Auth?.getCurrentUser?.();
    if (user?.username && record.profile === user.username) return true;
    if (user?.email && record.profile === user.email) return true;
    return false;
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

  function _generateId(prefix) {
    return (prefix || 'biz') + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  function _round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  var DEFAULT_CATEGORIES = {
    credit: [
      'Client Retainer',
      'Service Invoice',
      'Product Sales',
      'Consulting & Advisory',
      'Advance Received',
      'Affiliate & Commission',
      'Project Milestone',
      'Other Revenue'
    ],
    debit: [
      'Vendor / Supplier',
      'Contractor & Freelancer',
      'Office Rent & Co-working',
      'Cloud & Software Tools',
      'Marketing & Advertising',
      'Hardware & Equipment',
      'Utilities & Electricity',
      'Travel & Logistics',
      'Packaging & Inventory',
      'Other Expense'
    ],
    charge: [
      'Payment Gateway Cut (2%)',
      'GST / VAT Collected / Paid',
      'Bank Wire / Processing Fee',
      'Platform Commission',
      'Late Payment Penalty',
      'Customs & Cross-Border Fee',
      'Courier & Handling Surcharge'
    ]
  };

  var BusinessService = {
    DEFAULT_CATEGORIES: DEFAULT_CATEGORIES,

    /**
     * Initialize service from IndexedDB or state cache
     */
    init: async function () {
      try {
        if (typeof window.getAll === 'function') {
          var bLoaded = await window.getAll('businesses');
          var tLoaded = await window.getAll('business_transactions');

          if (Array.isArray(bLoaded)) {
            _businesses = bLoaded.filter(_matchesProfile);
            if (typeof state === 'object') state.businesses = _businesses;
          }
          if (Array.isArray(tLoaded)) {
            _transactions = tLoaded.filter(_matchesProfile);
            if (typeof state === 'object') state.business_transactions = _transactions;
          }
        }
      } catch (err) {
        console.warn('[BusinessService] init error, falling back to state/cache:', err);
      }

      if ((!_businesses || _businesses.length === 0) && typeof state === 'object' && Array.isArray(state.businesses) && state.businesses.length > 0) {
        _businesses = state.businesses.filter(_matchesProfile);
      }
      if ((!_transactions || _transactions.length === 0) && typeof state === 'object' && Array.isArray(state.business_transactions) && state.business_transactions.length > 0) {
        _transactions = state.business_transactions.filter(_matchesProfile);
      }

      // Auto-seed default business if brand new user has no entities
      if (!_businesses || _businesses.length === 0) {
        var defaultBiz = {
          id: 'biz_primary_' + Date.now(),
          name: 'Primary Enterprise',
          category: 'General Business',
          currencySymbol: '₹',
          color: '#00d4b4',
          icon: '🏢',
          isDefault: true,
          profile: _getProfileId(),
          createdAt: new Date().toISOString()
        };
        _businesses = [defaultBiz];
        if (typeof window.put === 'function') {
          try { await window.put('businesses', defaultBiz); } catch (e) {}
        }
        if (typeof state === 'object') {
          state.businesses = _businesses;
        }
      }

      _isInitialized = true;
      return { businesses: _businesses, transactions: _transactions };
    },

    // ── BUSINESS ENTITY MANAGEMENT ──────────────────────────

    getBusinesses: function () {
      if ((!_businesses || _businesses.length === 0) && typeof state === 'object' && Array.isArray(state.businesses) && state.businesses.length > 0) {
        _businesses = state.businesses.filter(_matchesProfile);
      }
      return _businesses.filter(_matchesProfile);
    },

    getBusinessById: function (id) {
      if (!id) return null;
      var list = this.getBusinesses();
      return list.find(function (b) { return b.id === id; }) || null;
    },

    getActiveBusinessId: function () {
      var uid = _getProfileId();
      var list = this.getBusinesses();
      var saved = localStorage.getItem('lm_u_' + uid + '_active_biz_id');
      if (saved && list.some(function(b){ return b.id === saved; })) return saved;
      if (list.length > 0) {
        var def = list.find(function(b){ return b.isDefault; });
        return def ? def.id : list[0].id;
      }
      return null;
    },

    setActiveBusinessId: function (id) {
      var uid = _getProfileId();
      localStorage.setItem('lm_u_' + uid + '_active_biz_id', id);
      if (window.LM_Bus) window.LM_Bus.emit('lm:business:active_changed', { businessId: id });
    },

    saveBusiness: async function (bizData) {
      if (!bizData) return null;
      var uid = _getProfileId();
      var nowIso = new Date().toISOString();
      var isNew = !bizData.id;
      var id = bizData.id || _generateId('biz');
      var existing = isNew ? null : this.getBusinessById(id);

      var bDetails = bizData.bankDetails || existing?.bankDetails || {};

      var biz = {
        id: id,
        profile: existing?.profile || uid || 'default',
        name: String(bizData.name !== undefined ? bizData.name : (existing?.name || 'My Business')).trim(),
        tagline: String(bizData.tagline !== undefined ? bizData.tagline : (existing?.tagline || '')).trim(),
        regNumber: String(bizData.regNumber !== undefined ? bizData.regNumber : (existing?.regNumber || '')).toUpperCase().trim(),
        category: bizData.category || existing?.category || 'freelance',
        currency: bizData.currency || existing?.currency || 'INR',
        currencySymbol: bizData.currencySymbol || existing?.currencySymbol || (bizData.currency === 'USD' ? '$' : (bizData.currency === 'EUR' ? '€' : '₹')),
        color: bizData.color || existing?.color || '#00d4b4',
        icon: bizData.icon || existing?.icon || '🏢',
        bankDetails: {
          bankName: String(bDetails.bankName !== undefined ? bDetails.bankName : '').trim(),
          accountNumber: String(bDetails.accountNumber !== undefined ? bDetails.accountNumber : '').trim(),
          ifsc: String(bDetails.ifsc !== undefined ? bDetails.ifsc : '').toUpperCase().trim(),
          upiId: String(bDetails.upiId !== undefined ? bDetails.upiId : '').trim(),
          holderName: String(bDetails.holderName !== undefined ? bDetails.holderName : '').trim()
        },
        address: String(bizData.address !== undefined ? bizData.address : (existing?.address || '')).trim(),
        email: String(bizData.email !== undefined ? bizData.email : (existing?.email || '')).trim(),
        phone: String(bizData.phone !== undefined ? bizData.phone : (existing?.phone || '')).trim(),
        isDefault: bizData.isDefault !== undefined ? !!bizData.isDefault : (existing ? !!existing.isDefault : (_businesses.length === 0)),
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso
      };

      if (isNew) {
        _businesses.push(biz);
      } else {
        var idx = _businesses.findIndex(function (b) { return b.id === id; });
        if (idx !== -1) _businesses[idx] = biz;
        else _businesses.push(biz);
      }

      if (typeof state === 'object') state.businesses = _businesses;

      if (typeof window.put === 'function') {
        try { await window.put('businesses', biz); } catch (e) {
          console.error('[BusinessService] saveBusiness DB error:', e);
        }
      }

      if (window.LM_CloudSync && typeof window.LM_CloudSync.queueSave === 'function') {
        window.LM_CloudSync.queueSave(1000);
      }

      if (window.LM_Bus) window.LM_Bus.emit('lm:data:changed', { source: 'businesses', businessId: id });
      return biz;
    },

    deleteBusiness: async function (id) {
      if (!id) return false;
      var idx = _businesses.findIndex(function (b) { return b.id === id; });
      if (idx === -1) return false;
      _businesses.splice(idx, 1);

      // Cascade remove transactions belonging to this business
      var remainingTxs = [];
      for (var i = 0; i < _transactions.length; i++) {
        var tx = _transactions[i];
        if (tx.businessId === id) {
          if (typeof window.del === 'function') {
            try { await window.del('business_transactions', tx.id); } catch (e) {}
          } else if (window.db) {
            try {
              var t = window.db.transaction('business_transactions', 'readwrite');
              t.objectStore('business_transactions').delete(tx.id);
            } catch (e) {}
          }
        } else {
          remainingTxs.push(tx);
        }
      }
      _transactions = remainingTxs;

      if (typeof state === 'object') {
        state.businesses = _businesses;
        state.business_transactions = _transactions;
      }

      if (typeof window.del === 'function') {
        try { await window.del('businesses', id); } catch (e) {}
      } else if (window.db) {
        try {
          var tb = window.db.transaction('businesses', 'readwrite');
          tb.objectStore('businesses').delete(id);
        } catch (e) {}
      }

      if (window.LM_CloudSync && typeof window.LM_CloudSync.queueSave === 'function') {
        window.LM_CloudSync.queueSave(1000);
      }

      if (window.LM_Bus) window.LM_Bus.emit('lm:data:changed', { source: 'businesses', action: 'delete', businessId: id });
      return true;
    },

    // ── TRANSACTIONS (CREDITS, DEBITS, CHARGES) ────────────

    getTransactions: function (filters) {
      if ((!_transactions || _transactions.length === 0) && typeof state === 'object' && Array.isArray(state.business_transactions) && state.business_transactions.length > 0) {
        _transactions = state.business_transactions.filter(_matchesProfile);
      }
      var list = _transactions.filter(_matchesProfile);

      if (typeof filters === 'string') {
        filters = { businessId: filters };
      }
      filters = filters || {};
      if (filters.businessId && filters.businessId !== 'all') {
        list = list.filter(function (t) { return t.businessId === filters.businessId; });
      }
      if (filters.type && filters.type !== 'all') {
        list = list.filter(function (t) { return t.type === filters.type; });
      }
      if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        if (filters.paymentStatus === 'overdue') {
          var today = _getTodayLocalDate();
          list = list.filter(function (t) {
            return t.paymentStatus !== 'paid' && t.dueDate && t.dueDate < today;
          });
        } else {
          list = list.filter(function (t) { return t.paymentStatus === filters.paymentStatus; });
        }
      }
      if (filters.partyName && typeof filters.partyName === 'string') {
        var pSearch = filters.partyName.toLowerCase().trim();
        list = list.filter(function (t) { return (t.partyName || '').toLowerCase().includes(pSearch); });
      }
      if (filters.category && filters.category !== 'all') {
        list = list.filter(function (t) { return t.category === filters.category; });
      }
      if (filters.dateFrom) {
        list = list.filter(function (t) { return t.date >= filters.dateFrom; });
      }
      if (filters.dateTo) {
        list = list.filter(function (t) { return t.date <= filters.dateTo; });
      }
      if (filters.search && typeof filters.search === 'string') {
        var q = filters.search.toLowerCase().trim();
        list = list.filter(function (t) {
          return (t.partyName || '').toLowerCase().includes(q) ||
                 (t.category || '').toLowerCase().includes(q) ||
                 (t.invoiceNumber || '').toLowerCase().includes(q) ||
                 (t.notes || '').toLowerCase().includes(q) ||
                 (t.description || '').toLowerCase().includes(q);
        });
      }

      // Default sort by date descending
      return list.sort(function (a, b) {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
    },

    getTransactionById: function (id) {
      if (!id) return null;
      if ((!_transactions || _transactions.length === 0) && typeof state === 'object' && Array.isArray(state.business_transactions)) {
        _transactions = state.business_transactions.filter(_matchesProfile);
      }
      return _transactions.find(function (t) { return t.id === id && _matchesProfile(t); }) || null;
    },

    saveTransaction: async function (txData) {
      if (!txData) return null;
      var uid = _getProfileId();
      var nowIso = new Date().toISOString();
      var isNew = !txData.id;
      var id = txData.id || _generateId('btx');
      var existing = isNew ? null : this.getTransactionById(id);

      var type = txData.type || existing?.type || 'credit'; // 'credit' | 'debit' | 'charge'
      var rawAmount = Math.abs(Number(txData.amount != null ? txData.amount : existing?.amount) || 0);
      if (rawAmount <= 0) {
        console.warn('[BusinessService] saveTransaction: amount must be positive, received:', txData.amount);
        return null;
      }
      var rawGross = Math.abs(Number(txData.grossAmount != null ? txData.grossAmount : (existing?.grossAmount || rawAmount)) || rawAmount);
      var rawCharge = Math.max(0, Number(txData.chargeAmount != null ? txData.chargeAmount : (txData.charges != null ? txData.charges : (existing?.chargeAmount || 0))) || 0);
      var taxRate = Math.max(0, Number(txData.taxRate != null ? txData.taxRate : (existing?.taxRate || 0)) || 0);
      var taxAmount = Number(txData.taxAmount != null ? txData.taxAmount : (existing?.taxAmount != null ? existing.taxAmount : (taxRate > 0 ? _round2((rawGross * taxRate) / 100) : 0))) || 0;

      var netAmount = rawGross;
      if (type === 'credit') {
        netAmount = rawCharge > 0 ? _round2(rawGross - rawCharge) : rawGross;
      } else if (type === 'debit') {
        netAmount = rawCharge > 0 ? _round2(rawGross + rawCharge) : rawGross;
      }

      var status = txData.paymentStatus || existing?.paymentStatus || 'paid';
      var paidAmt = Number(txData.paidAmount != null ? txData.paidAmount : existing?.paidAmount);
      if (isNaN(paidAmt)) {
        paidAmt = status === 'paid' ? rawGross : (status === 'partial' ? _round2(rawGross / 2) : 0);
      }

      var defaultBizId = this.getActiveBusinessId() || (this.getBusinesses()[0]?.id) || '';
      var bId = txData.businessId || existing?.businessId || defaultBizId;

      var tx = {
        id: id,
        profile: existing?.profile || uid || 'default',
        businessId: bId,
        type: type,
        amount: _round2(rawAmount),
        netAmount: _round2(netAmount),
        grossAmount: _round2(rawGross),
        chargeAmount: _round2(rawCharge),
        charges: _round2(rawCharge),
        taxRate: taxRate,
        taxAmount: _round2(taxAmount),
        date: txData.date || existing?.date || _getTodayLocalDate(),
        dueDate: txData.dueDate !== undefined ? txData.dueDate : (existing?.dueDate || ''),
        partyName: String(txData.partyName !== undefined ? txData.partyName : (existing?.partyName || 'General')).trim() || 'General',
        partyPhone: String(txData.partyPhone !== undefined ? txData.partyPhone : (existing?.partyPhone || '')).trim(),
        partyType: txData.partyType || existing?.partyType || (type === 'credit' ? 'customer' : (type === 'debit' ? 'vendor' : 'platform')),
        category: String(txData.category !== undefined ? txData.category : (existing?.category || (type === 'credit' ? 'Other Revenue' : (type === 'debit' ? 'Operating Expense' : 'Bank Charge')))).trim(),
        paymentStatus: status,
        paidAmount: _round2(paidAmt),
        invoiceNumber: String(txData.invoiceNumber !== undefined ? txData.invoiceNumber : (existing?.invoiceNumber || '')).trim(),
        paymentMode: txData.paymentMode || existing?.paymentMode || 'Bank Transfer',
        notes: String(txData.notes !== undefined ? txData.notes : (existing?.notes || txData.description || existing?.description || '')).trim(),
        description: String(txData.description !== undefined ? txData.description : (existing?.description || txData.notes || existing?.notes || '')).trim(),
        attachment: String(txData.attachment !== undefined ? txData.attachment : (existing?.attachment || '')).trim(),
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso
      };

      if (isNew) {
        _transactions.push(tx);
      } else {
        var idx = _transactions.findIndex(function (t) { return t.id === id; });
        if (idx !== -1) _transactions[idx] = tx;
        else _transactions.push(tx);
      }

      if (typeof state === 'object') state.business_transactions = _transactions;

      if (typeof window.put === 'function') {
        try { await window.put('business_transactions', tx); } catch (e) {
          console.error('[BusinessService] saveTransaction DB error:', e);
        }
      }

      if (window.LM_CloudSync && typeof window.LM_CloudSync.queueSave === 'function') {
        window.LM_CloudSync.queueSave(1000);
      }

      if (window.LM_Bus) window.LM_Bus.emit('lm:data:changed', { source: 'business_transactions', txId: id });
      return tx;
    },

    deleteTransaction: async function (id) {
      if (!id) return false;
      var idx = _transactions.findIndex(function (t) { return t.id === id; });
      if (idx === -1) return false;
      _transactions.splice(idx, 1);

      if (typeof state === 'object') state.business_transactions = _transactions;

      if (typeof window.del === 'function') {
        try { await window.del('business_transactions', id); } catch (e) {}
      } else if (window.db) {
        try {
          var t = window.db.transaction('business_transactions', 'readwrite');
          t.objectStore('business_transactions').delete(id);
        } catch (e) {}
      }

      if (window.LM_CloudSync && typeof window.LM_CloudSync.queueSave === 'function') {
        window.LM_CloudSync.queueSave(1000);
      }

      if (window.LM_Bus) window.LM_Bus.emit('lm:data:changed', { source: 'business_transactions', action: 'delete', txId: id });
      return true;
    },

    markAsPaid: async function (id, fullPayment) {
      var tx = this.getTransactionById(id);
      if (!tx) return null;
      tx.paymentStatus = 'paid';
      tx.paidAmount = fullPayment !== undefined ? Number(fullPayment) : tx.amount;
      tx.updatedAt = new Date().toISOString();
      return this.saveTransaction(tx);
    },

    // ── FINANCIAL METRICS & P&L ENGINE ─────────────────────

    getMetrics: function (businessId, dateFilters) {
      var txs = this.getTransactions({
        businessId: businessId,
        dateFrom: dateFilters?.dateFrom,
        dateTo: dateFilters?.dateTo
      });

      var totalGrossCredits = 0;
      var totalCredits = 0;
      var paidCredits = 0;
      var pendingCredits = 0;

      var totalDebits = 0;
      var paidDebits = 0;
      var pendingDebits = 0;

      var totalCharges = 0;
      var totalTaxes = 0;

      var todayStr = _getTodayLocalDate();
      var overdueReceivablesCount = 0;
      var overdueReceivablesAmount = 0;
      var overduePayablesCount = 0;
      var overduePayablesAmount = 0;

      txs.forEach(function (t) {
        var amt = Number(t.amount) || 0;
        var gross = Number(t.grossAmount != null ? t.grossAmount : amt) || amt;
        var chg = Number(t.chargeAmount != null ? t.chargeAmount : t.charges) || 0;
        var paid = Number(t.paidAmount) || 0;
        var pending = Math.max(0, gross - paid);

        if (t.type === 'credit') {
          totalGrossCredits += gross;
          totalCredits += gross;
          paidCredits += paid;
          if (chg > 0) totalCharges += chg;
          if (t.taxAmount) totalTaxes += Number(t.taxAmount);
          if (t.paymentStatus !== 'paid') {
            pendingCredits += pending;
            if (t.dueDate && t.dueDate < todayStr) {
              overdueReceivablesCount++;
              overdueReceivablesAmount += pending;
            }
          }
        } else if (t.type === 'debit') {
          totalDebits += amt;
          paidDebits += paid;
          if (chg > 0) totalCharges += chg;
          if (t.paymentStatus !== 'paid') {
            pendingDebits += pending;
            if (t.dueDate && t.dueDate < todayStr) {
              overduePayablesCount++;
              overduePayablesAmount += pending;
            }
          }
        } else if (t.type === 'charge') {
          totalCharges += amt;
          if (t.taxAmount) totalTaxes += Number(t.taxAmount);
        }
      });

      // Bottom Line Net Profit: Gross Revenue - Debits - Charges
      var netProfit = _round2(totalGrossCredits - totalDebits - totalCharges);
      var netCashFlow = _round2(paidCredits - paidDebits - totalCharges);
      var profitMargin = totalGrossCredits > 0 ? _round2((netProfit / totalGrossCredits) * 100) : 0;

      return {
        transactionCount: txs.length,
        totalGrossCredits: _round2(totalGrossCredits),
        totalCredits: _round2(totalGrossCredits),
        paidCredits: _round2(paidCredits),
        pendingCredits: _round2(pendingCredits),
        totalReceivables: _round2(pendingCredits),
        totalDebits: _round2(totalDebits),
        paidDebits: _round2(paidDebits),
        pendingDebits: _round2(pendingDebits),
        totalPayables: _round2(pendingDebits),
        totalCharges: _round2(totalCharges),
        totalTaxes: _round2(totalTaxes),
        netProfit: netProfit,
        netCashFlow: netCashFlow,
        profitMargin: profitMargin,
        overdueReceivablesCount: overdueReceivablesCount,
        overdueReceivablesAmount: _round2(overdueReceivablesAmount),
        overduePayablesCount: overduePayablesCount,
        overduePayablesAmount: _round2(overduePayablesAmount)
      };
    },

    // ── PARTY LEDGER / KHATA BOOK ──────────────────────────

    getAllParties: function (businessId) {
      var txs = this.getTransactions({ businessId: businessId });
      var map = {};

      txs.forEach(function (t) {
        var name = (t.partyName || 'General').trim();
        if (!map[name]) {
          map[name] = {
            name: name,
            partyName: name,
            partyType: t.partyType || 'customer',
            partyPhone: t.partyPhone || '',
            phone: t.partyPhone || '',
            totalCredits: 0,
            totalDebits: 0,
            totalCharges: 0,
            pendingCredits: 0,
            pendingDebits: 0,
            txCount: 0,
            lastTxDate: t.date
          };
        }
        var p = map[name];
        if (t.partyPhone && !p.partyPhone) {
          p.partyPhone = t.partyPhone;
          p.phone = t.partyPhone;
        }
        p.txCount++;
        var amt = Number(t.grossAmount != null ? t.grossAmount : t.amount) || 0;
        var paid = Number(t.paidAmount) || 0;
        var pending = Math.max(0, amt - paid);

        if (t.type === 'credit') {
          p.totalCredits += amt;
          if (t.paymentStatus !== 'paid') p.pendingCredits += pending;
        } else if (t.type === 'debit') {
          p.totalDebits += amt;
          if (t.paymentStatus !== 'paid') p.pendingDebits += pending;
        } else if (t.type === 'charge') {
          p.totalCharges += amt;
        }

        if (t.date > p.lastTxDate) p.lastTxDate = t.date;
      });

      return Object.values(map).map(function (p) {
        // Net balance: positive means party owes business (Receivable), negative means business owes party (Payable)
        p.netReceivable = _round2(p.pendingCredits - p.pendingDebits);
        p.pendingBalance = Math.abs(p.netReceivable);
        p.direction = p.netReceivable >= 0 ? 'receivable' : 'payable';
        p.totalBilled = _round2(p.totalCredits);
        p.totalSpent = _round2(p.totalDebits);
        return p;
      }).sort(function (a, b) {
        return Math.abs(b.netReceivable) - Math.abs(a.netReceivable);
      });
    },

    getPartiesSummary: function (businessId) {
      return this.getAllParties(businessId);
    },

    generatePartyWhatsAppReminder: function (party, businessName) {
      if (!party) return '';
      var rawPhone = String(party.partyPhone || party.phone || '').replace(/[^\d]/g, '');
      var balance = party.pendingBalance != null ? party.pendingBalance : Math.abs(party.netReceivable || 0);
      var bName = businessName || 'LedgerMate';
      var text = encodeURIComponent(
        'Hello ' + (party.partyName || party.name || 'Sir/Madam') + ',\n\n' +
        'This is a friendly reminder from ' + bName + ' regarding your pending balance of ₹' + balance.toLocaleString('en-IN') + '.\n' +
        'Kindly settle at your earliest convenience. Thank you!'
      );
      return 'https://api.whatsapp.com/send?phone=' + rawPhone + '&text=' + text;
    },

    getPartyStatement: function (partyName, businessId) {
      if (!partyName) return null;
      var cleanName = partyName.trim();
      var txs = this.getTransactions({ businessId: businessId }).filter(function (t) {
        return (t.partyName || '').trim().toLowerCase() === cleanName.toLowerCase();
      });

      var totalCredits = 0;
      var totalDebits = 0;
      var pendingReceivable = 0;
      var pendingPayable = 0;

      txs.forEach(function (t) {
        var amt = Number(t.amount) || 0;
        var paid = Number(t.paidAmount) || 0;
        var pending = Math.max(0, amt - paid);

        if (t.type === 'credit') {
          totalCredits += amt;
          if (t.paymentStatus !== 'paid') pendingReceivable += pending;
        } else if (t.type === 'debit') {
          totalDebits += amt;
          if (t.paymentStatus !== 'paid') pendingPayable += pending;
        }
      });

      return {
        partyName: cleanName,
        transactions: txs,
        totalCredits: _round2(totalCredits),
        totalDebits: _round2(totalDebits),
        pendingReceivable: _round2(pendingReceivable),
        pendingPayable: _round2(pendingPayable),
        netBalance: _round2(pendingReceivable - pendingPayable) // > 0: You will get, < 0: You will give
      };
    },

    // ── CHARTS & ANALYTICS DATA PROVIDERS ──────────────────

    getMonthlyPnLTrends: function (businessId, numMonths) {
      numMonths = numMonths || 6;
      var months = [];
      var d = new Date();
      d.setDate(1);

      for (var i = numMonths - 1; i >= 0; i--) {
        var mDate = new Date(d.getFullYear(), d.getMonth() - i, 1);
        var yr = mDate.getFullYear();
        var mo = String(mDate.getMonth() + 1).padStart(2, '0');
        var key = yr + '-' + mo;
        var label = mDate.toLocaleString('default', { month: 'short' }) + ' ' + String(yr).slice(-2);
        months.push({ key: key, label: label, credits: 0, debits: 0, charges: 0, profit: 0 });
      }

      var txs = this.getTransactions({ businessId: businessId });
      var monthMap = {};
      months.forEach(function (m) { monthMap[m.key] = m; });

      txs.forEach(function (t) {
        if (!t.date) return;
        var mKey = t.date.substring(0, 7);
        if (monthMap[mKey]) {
          var amt = Number(t.amount) || 0;
          if (t.type === 'credit') monthMap[mKey].credits += amt;
          else if (t.type === 'debit') monthMap[mKey].debits += amt;
          else if (t.type === 'charge') monthMap[mKey].charges += amt;
        }
      });

      months.forEach(function (m) {
        m.credits = _round2(m.credits);
        m.debits = _round2(m.debits);
        m.charges = _round2(m.charges);
        m.profit = _round2(m.credits - m.debits - m.charges);
      });

      return {
        labels: months.map(function (m) { return m.label; }),
        credits: months.map(function (m) { return m.credits; }),
        debits: months.map(function (m) { return m.debits; }),
        charges: months.map(function (m) { return m.charges; }),
        profit: months.map(function (m) { return m.profit; })
      };
    },

    getCategoryDistribution: function (businessId, type) {
      type = type || 'debit';
      var txs = this.getTransactions({ businessId: businessId, type: type });
      var catMap = {};

      txs.forEach(function (t) {
        var cat = t.category || 'General';
        catMap[cat] = (catMap[cat] || 0) + (Number(t.amount) || 0);
      });

      var labels = Object.keys(catMap);
      var values = labels.map(function (k) { return _round2(catMap[k]); });
      return { labels: labels, values: values };
    },

    // ── BACKUP EXPORT & IMPORT HOOKS ───────────────────────

    exportBusinesses: function () {
      var list = this.getBusinesses();
      if ((!list || list.length === 0) && typeof state === 'object' && Array.isArray(state.businesses) && state.businesses.length > 0) {
        return state.businesses;
      }
      return list || [];
    },

    exportTransactions: function () {
      var list = this.getTransactions();
      if ((!list || list.length === 0) && typeof state === 'object' && Array.isArray(state.business_transactions) && state.business_transactions.length > 0) {
        return state.business_transactions.filter(_matchesProfile);
      }
      return list || [];
    },

    exportData: function () {
      return {
        businesses: this.exportBusinesses(),
        business_transactions: this.exportTransactions()
      };
    },

    importData: async function (businessesList, transactionsList) {
      var uid = _getProfileId();
      var bList = businessesList;
      var tList = transactionsList;

      if (businessesList && typeof businessesList === 'object' && !Array.isArray(businessesList)) {
        bList = businessesList.businesses || [];
        tList = businessesList.business_transactions || [];
      }

      var bCount = 0;
      var tCount = 0;

      if (Array.isArray(bList) && bList.length > 0) {
        // If local state only had an untouched default starter "Primary Enterprise", remove it so mobile's real business shines
        var dummyIdx = _businesses.findIndex(function (x) {
          return x.name === 'Primary Enterprise' && (!x.regNumber && !x.address && !x.email && !x.phone);
        });
        if (dummyIdx !== -1 && bList.some(function (b) { return b.name !== 'Primary Enterprise' || b.id !== _businesses[dummyIdx].id; })) {
          var removedDummy = _businesses.splice(dummyIdx, 1)[0];
          if (typeof window.del === 'function' && removedDummy && removedDummy.id) {
            try { await window.del('businesses', removedDummy.id); } catch (e) {}
          }
        }

        for (var i = 0; i < bList.length; i++) {
          var b = bList[i];
          if (!b.profile) b.profile = uid;
          var exB = _businesses.findIndex(function (x) { return x.id === b.id; });
          if (exB !== -1) _businesses[exB] = b;
          else _businesses.push(b);
          bCount++;
          if (typeof window.put === 'function') {
            try { await window.put('businesses', b); } catch (e) {}
          }
        }

        // Seamlessly activate the user's imported business
        var curActive = this.getActiveBusinessId();
        if (!curActive || !_businesses.some(function(b){ return b.id === curActive; })) {
          this.setActiveBusinessId(bList[0].id);
        }
      }

      if (Array.isArray(tList)) {
        for (var j = 0; j < tList.length; j++) {
          var t = tList[j];
          if (!t.profile) t.profile = uid;
          if (t.grossAmount == null && t.amount != null) t.grossAmount = Number(t.amount) || 0;
          if (t.netAmount == null && t.amount != null) {
            var rawGross = Number(t.grossAmount != null ? t.grossAmount : t.amount) || 0;
            var rawCharge = Number(t.chargeAmount != null ? t.chargeAmount : t.charges) || 0;
            if (t.type === 'credit') {
              t.netAmount = rawCharge > 0 ? _round2(rawGross - rawCharge) : rawGross;
            } else if (t.type === 'debit') {
              t.netAmount = rawCharge > 0 ? _round2(rawGross + rawCharge) : rawGross;
            } else {
              t.netAmount = rawGross;
            }
          }
          var exT = _transactions.findIndex(function (x) { return x.id === t.id; });
          if (exT !== -1) _transactions[exT] = t;
          else _transactions.push(t);
          tCount++;
          if (typeof window.put === 'function') {
            try { await window.put('business_transactions', t); } catch (e) {}
          }
        }
      }

      if (typeof state === 'object') {
        state.businesses = _businesses;
        state.business_transactions = _transactions;
      }

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:business:imported', { businessesCount: bCount, transactionsCount: tCount });
        if (!window.LM_CloudSync || !window.LM_CloudSync.isImporting || !window.LM_CloudSync.isImporting()) {
          window.LM_Bus.emit('lm:data:changed', { source: 'business_restore' });
        }
      }
      return { businessesCount: bCount, transactionsCount: tCount };
    }
  };

  window.LM_BusinessService = BusinessService;
})();
