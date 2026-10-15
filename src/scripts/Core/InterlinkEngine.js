/**
 * LedgerMate – InterlinkEngine.js
 * ─────────────────────────────────────────────────────────────
 * Central Interlinking & Financial Intelligence Engine.
 * Provides bi-directional integration between:
 *  - Transactions & Bank Accounts
 *  - Credit Cards (Bill payments, card purchases)
 *  - Loans & EMIs (Disbursements, repayments)
 *  - Stocks & Demat (Buy, sell, dividends)
 *  - Investments (SIPs, FDs, Gold)
 *  - Business Hub (Client invoices, operating expenses)
 *  - Bike & Vehicles (Fuel refills, maintenance, insurance)
 *
 * Plus Consolidated Balance Sheet, Cross-Module Money Flow Matrix,
 * and 30-Day Obligations Runway for the Dashboard screen.
 *
 * Exposes: window.LM_InterlinkEngine
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  function _getProfileId() {
    return window.LM_Auth?.getCurrentUserId?.() || 'default';
  }

  function _round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  function _todayISO() {
    return new Date().toISOString().split('T')[0];
  }

  function _generateTxId(prefix) {
    return (prefix || 'tx_il') + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  function _fmtINR(num) {
    if (typeof fmtINR === 'function') return fmtINR(num);
    var n = Number(num) || 0;
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  var InterlinkEngine = {
    MODULES: {
      CREDIT_CARDS: 'credit_cards',
      LOANS: 'loans',
      STOCKS: 'stocks',
      INVESTMENTS: 'investments',
      BUSINESS: 'business',
      VEHICLES: 'vehicles'
    },

    REF_TYPES: {
      CARD_BILL: 'card_bill_payment',
      CARD_SWIPE: 'card_swipe_purchase',
      LOAN_EMI: 'loan_emi_payment',
      LOAN_DISBURSEMENT: 'loan_disbursement',
      LOAN_REPAYMENT: 'loan_repayment',
      STOCK_BUY: 'stock_buy_order',
      STOCK_SELL: 'stock_sell_order',
      STOCK_DIVIDEND: 'stock_dividend',
      SIP_INSTALLMENT: 'sip_installment',
      FD_CREATE: 'fd_creation',
      FD_MATURE: 'fd_maturity',
      GOLD_BUY: 'gold_purchase',
      BIZ_INVOICE: 'business_invoice_paid',
      BIZ_EXPENSE: 'business_expense',
      OWNER_DRAWING: 'business_owner_drawing',
      VEH_FUEL: 'vehicle_fuel_refill',
      VEH_SERVICE: 'vehicle_maintenance',
      VEH_INSURANCE: 'vehicle_insurance_renewal'
    },

    // ─────────────────────────────────────────────────────────────
    // 1. RECORD INTERLINKED TRANSACTION
    // ─────────────────────────────────────────────────────────────
    recordInterlinkedTx: async function (params) {
      if (!params) throw new Error('[InterlinkEngine] Transaction parameters required');
      var sourceModule = params.sourceModule;
      var refType = params.refType;
      var amount = _round2(params.amount);
      if (amount <= 0) {
        console.warn('[InterlinkEngine] Skipping transaction with non-positive amount:', amount);
        return null;
      }

      var txId = params.id || _generateTxId('tx_il');
      var date = params.date || _todayISO();
      var type = params.type || 'out'; // 'out' | 'in' | 'transfer'
      var category = params.category || this._getDefaultCategory(sourceModule, refType);
      var account = params.account || this._getDefaultAccount(params);
      var note = params.note || this._generateDefaultNote(params);

      var tx = {
        id: txId,
        profile: _getProfileId(),
        date: date,
        type: type,
        amount: amount,
        category: category,
        account: account,
        note: note,
        interlink: {
          sourceModule: sourceModule,
          sourceId: params.sourceId || '',
          refType: refType,
          entityName: params.entityName || '',
          subDetails: params.extraData || {},
          timestamp: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Persist to IndexedDB
      if (typeof window.put === 'function') {
        try {
          await window.put('transactions', tx);
        } catch (err) {
          console.warn('[InterlinkEngine] window.put transactions error:', err);
        }
      }

      // Sync in-memory state
      if (typeof state === 'object' && Array.isArray(state.transactions)) {
        var existingIdx = state.transactions.findIndex(t => t.id === tx.id);
        if (existingIdx !== -1) {
          state.transactions[existingIdx] = tx;
        } else {
          state.transactions.unshift(tx);
        }
      }

      // Notify AppBus
      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:interlink:tx-created', { tx: tx, sourceModule: sourceModule, refType: refType });
        window.LM_Bus.emit('lm:data:changed', { source: 'transactions' });
      }

      // Update UI components
      try {
        if (typeof refreshRecentList === 'function') refreshRecentList();
        if (typeof renderAll === 'function') renderAll();
      } catch (e) {}

      return tx;
    },

    // ─────────────────────────────────────────────────────────────
    // 2. REVERT / ROLLBACK INTERLINKED TRANSACTION
    // ─────────────────────────────────────────────────────────────
    checkLinkedReversal: async function (txId) {
      if (!txId || typeof state !== 'object' || !Array.isArray(state.transactions)) return null;
      var tx = state.transactions.find(t => t.id === txId);
      if (!tx || !tx.interlink || !tx.interlink.sourceModule) return null;
      return tx;
    },

    revertInterlinkedTx: async function (txId, shouldRollbackSource) {
      var tx = await this.checkLinkedReversal(txId);
      if (!tx) return false;

      var link = tx.interlink;
      var sourceModule = link.sourceModule;
      var sourceId = link.sourceId;
      var amount = Number(tx.amount) || 0;

      if (shouldRollbackSource) {
        try {
          if (sourceModule === this.MODULES.CREDIT_CARDS && link.refType === this.REF_TYPES.CARD_BILL) {
            // Restore credit card pending due
            if (window.LM_CreditCardsService) {
              var card = window.LM_CreditCardsService.getCardById(sourceId);
              if (card) {
                var restoredDue = _round2(Number(card.current_due || 0) + amount);
                var restoredAvail = Math.max(0, _round2(Number(card.credit_limit || 0) - restoredDue));
                await window.LM_CreditCardsService.updateCard(card.id, {
                  current_due: restoredDue,
                  available_limit: restoredAvail
                });
              }
            }
          } else if (sourceModule === this.MODULES.CREDIT_CARDS && link.refType === this.REF_TYPES.CARD_SWIPE) {
            // Remove card purchase from current_due
            if (window.LM_CreditCardsService) {
              var cardSwiped = window.LM_CreditCardsService.getCardById(sourceId);
              if (cardSwiped) {
                var reducedDue = Math.max(0, _round2(Number(cardSwiped.current_due || 0) - amount));
                var restoredAvailLimit = _round2(Number(cardSwiped.credit_limit || 0) - reducedDue);
                await window.LM_CreditCardsService.updateCard(cardSwiped.id, {
                  current_due: reducedDue,
                  available_limit: restoredAvailLimit
                });
              }
            }
          } else if (sourceModule === this.MODULES.LOANS && link.refType === this.REF_TYPES.LOAN_EMI) {
            // Restore loan remaining balance
            if (typeof state === 'object' && Array.isArray(state.loans)) {
              var loan = state.loans.find(l => l.id === sourceId);
              if (loan) {
                loan.remainingAmount = _round2((Number(loan.remainingAmount || loan.amount) || 0) + amount);
                if (typeof window.put === 'function') await window.put('loans', loan);
              }
            }
          }
        } catch (rollErr) {
          console.warn('[InterlinkEngine] Rollback source error:', rollErr);
        }
      }

      // Remove transaction from DB
      if (typeof window.del === 'function') {
        try { await window.del('transactions', txId); } catch (e) {}
      }
      if (typeof state === 'object' && Array.isArray(state.transactions)) {
        state.transactions = state.transactions.filter(t => t.id !== txId);
      }

      if (window.LM_Bus) {
        window.LM_Bus.emit('lm:interlink:tx-reverted', { txId: txId, link: link });
        window.LM_Bus.emit('lm:data:changed', { source: 'transactions' });
      }

      return true;
    },

    // ─────────────────────────────────────────────────────────────
    // 3. CONSOLIDATED BALANCE SHEET (ASSETS VS LIABILITIES)
    // ─────────────────────────────────────────────────────────────
    getConsolidatedBalanceSheet: function () {
      var txs = (typeof state === 'object' && Array.isArray(state.transactions)) ? state.transactions : [];

      // 1. Liquid Capital (Cash, Bank Accounts)
      var liquidTotal = 0;
      var accountBreakdown = {};
      var accounts = state?.dropdowns?.accounts || ['Bank', 'Cash'];
      accounts.forEach(acc => { accountBreakdown[acc] = 0; });

      txs.forEach(t => {
        if (!t || !t.amount) return;
        var amt = Number(t.amount) || 0;
        var acc = t.account || 'Bank';
        if (accountBreakdown[acc] === undefined) accountBreakdown[acc] = 0;

        if (t.type === 'in') {
          accountBreakdown[acc] += amt;
          liquidTotal += amt;
        } else if (t.type === 'out') {
          accountBreakdown[acc] -= amt;
          liquidTotal -= amt;
        } else if (t.type === 'transfer' && t.toAccount) {
          accountBreakdown[acc] -= amt;
          if (accountBreakdown[t.toAccount] === undefined) accountBreakdown[t.toAccount] = 0;
          accountBreakdown[t.toAccount] += amt;
        }
      });

      // 2. Invested Assets
      var stocksTotal = 0;
      if (window.LM_StockPortfolioService) {
        try {
          if (typeof window.LM_StockPortfolioService.getPortfolioSummary === 'function') {
            var summary = window.LM_StockPortfolioService.getPortfolioSummary();
            stocksTotal = _round2(summary.totalCurrentValue || summary.current_value || summary.currentPortfolioValue || summary.totalInvested || summary.total_invested || 0);
          } else if (typeof window.LM_StockPortfolioService.getPortfolioMetrics === 'function') {
            var metrics = window.LM_StockPortfolioService.getPortfolioMetrics();
            stocksTotal = _round2(metrics.currentValue || metrics.totalInvested || 0);
          }
        } catch (e) {}
      }

      var mutualFundsTotal = 0;
      var fdsTotal = 0;
      var goldTotal = 0;
      var investments = (typeof state === 'object' && Array.isArray(state.investments)) ? state.investments : [];
      investments.forEach(inv => {
        var val = Number(inv.currentPrice || inv.amount || inv.principal || 0);
        var type = (inv.type || '').toUpperCase();
        if (type === 'SIP' || type === 'MUTUAL_FUND') mutualFundsTotal += val;
        else if (type === 'FD' || type === 'RD') fdsTotal += val;
        else if (type === 'GOLD' || type === 'SGB') goldTotal += val;
        else mutualFundsTotal += val;
      });

      var totalInvestedAssets = _round2(stocksTotal + mutualFundsTotal + fdsTotal + goldTotal);

      // 3. Business Equity & Receivables
      var businessReceivables = 0;
      var businessPayables = 0;
      if (window.LM_BusinessService && window.LM_BusinessService.getDashboardMetrics) {
        try {
          var bMetrics = window.LM_BusinessService.getDashboardMetrics();
          businessReceivables = _round2(bMetrics.unpaidInvoicesTotal || bMetrics.totalReceivables || 0);
          businessPayables = _round2(bMetrics.unpaidExpensesTotal || bMetrics.totalPayables || 0);
        } catch (e) {}
      }

      // 4. Active Liabilities
      var creditCardDues = 0;
      if (window.LM_CreditCardsService && typeof window.LM_CreditCardsService.getTotalOutstandingDue === 'function') {
        try {
          creditCardDues = _round2(window.LM_CreditCardsService.getTotalOutstandingDue() || 0);
        } catch (e) {}
      } else if (typeof state === 'object' && Array.isArray(state.credit_cards)) {
        creditCardDues = _round2(state.credit_cards.reduce((sum, c) => sum + (c.is_active !== false ? Number(c.current_due || 0) : 0), 0));
      }

      var loanPrincipalRemaining = 0;
      var loans = (typeof state === 'object' && Array.isArray(state.loans)) ? state.loans : [];
      loans.forEach(l => {
        if (l.type === 'taken' || !l.type) {
          loanPrincipalRemaining += Number(l.remainingAmount || l.amount || 0);
        }
      });
      loanPrincipalRemaining = _round2(loanPrincipalRemaining);

      var totalLiabilities = _round2(creditCardDues + loanPrincipalRemaining + businessPayables);
      var totalRealAssets = _round2(liquidTotal + totalInvestedAssets + businessReceivables);
      var netWorth = _round2(totalRealAssets - totalLiabilities);

      return {
        liquidTotal: _round2(liquidTotal),
        accountBreakdown: accountBreakdown,
        stocksTotal: stocksTotal,
        mutualFundsTotal: _round2(mutualFundsTotal),
        fdsTotal: _round2(fdsTotal),
        goldTotal: _round2(goldTotal),
        totalInvestedAssets: totalInvestedAssets,
        businessReceivables: businessReceivables,
        businessPayables: businessPayables,
        totalRealAssets: totalRealAssets,
        creditCardDues: creditCardDues,
        loanPrincipalRemaining: loanPrincipalRemaining,
        totalLiabilities: totalLiabilities,
        netWorth: netWorth,
        debtToAssetRatio: totalRealAssets > 0 ? Math.round((totalLiabilities / totalRealAssets) * 100) : 0
      };
    },

    // ─────────────────────────────────────────────────────────────
    // 4. CROSS-MODULE MONEY FLOW MATRIX
    // ─────────────────────────────────────────────────────────────
    getCrossModuleMoneyFlow: function (days) {
      days = days || 30;
      var txs = (typeof state === 'object' && Array.isArray(state.transactions)) ? state.transactions : [];
      var cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      var flow = {
        creditCards: 0,
        loans: 0,
        stocks: 0,
        investments: 0,
        business: 0,
        vehicles: 0,
        living: 0,
        totalOutflow: 0,
        totalInflow: 0
      };

      txs.forEach(t => {
        if (!t || !t.amount) return;
        var tDate = new Date(t.date || t.createdAt || 0);
        if (tDate < cutoff) return;

        var amt = Number(t.amount) || 0;
        if (t.type === 'in') {
          flow.totalInflow += amt;
          return;
        }
        if (t.type !== 'out') return;

        flow.totalOutflow += amt;
        var mod = t.interlink?.sourceModule;
        var cat = (t.category || '').toLowerCase();
        var note = (t.note || '').toLowerCase();

        if (mod === this.MODULES.CREDIT_CARDS || cat.includes('credit card') || note.includes('credit card bill')) {
          flow.creditCards += amt;
        } else if (mod === this.MODULES.LOANS || cat.includes('loan') || cat.includes('emi') || note.includes('emi')) {
          flow.loans += amt;
        } else if (mod === this.MODULES.STOCKS || cat.includes('stock') || cat.includes('equity') || note.includes('shares')) {
          flow.stocks += amt;
        } else if (mod === this.MODULES.INVESTMENTS || cat.includes('sip') || cat.includes('mutual fund') || cat.includes('fd')) {
          flow.investments += amt;
        } else if (mod === this.MODULES.BUSINESS || cat.includes('business') || note.includes('business')) {
          flow.business += amt;
        } else if (mod === this.MODULES.VEHICLES || cat.includes('fuel') || cat.includes('automobile') || cat.includes('vehicle')) {
          flow.vehicles += amt;
        } else {
          flow.living += amt;
        }
      });

      flow.totalOutflow = _round2(flow.totalOutflow);
      flow.totalInflow = _round2(flow.totalInflow);
      flow.creditCards = _round2(flow.creditCards);
      flow.loans = _round2(flow.loans);
      flow.stocks = _round2(flow.stocks);
      flow.investments = _round2(flow.investments);
      flow.business = _round2(flow.business);
      flow.vehicles = _round2(flow.vehicles);
      flow.living = _round2(flow.living);

      return flow;
    },

    // ─────────────────────────────────────────────────────────────
    // 5. 30-DAY OBLIGATIONS & "SAFE-TO-SPEND" RUNWAY
    // ─────────────────────────────────────────────────────────────
    getUpcomingObligations: function (daysAhead) {
      daysAhead = daysAhead || 30;
      var today = new Date();
      var obligations = [];
      var totalDue = 0;

      // 1. Credit Card bills
      if (window.LM_CreditCardsService && typeof window.LM_CreditCardsService.getPendingCards === 'function') {
        try {
          var pendingCards = window.LM_CreditCardsService.getPendingCards() || [];
          pendingCards.forEach(c => {
            var cd = window.LM_CreditCardsService.getDueCountdown(c);
            var dueAmt = Number(c.current_due) || 0;
            if (dueAmt > 0 && cd.daysUntilDue <= daysAhead) {
              obligations.push({
                type: 'credit_card',
                title: (c.card_name || 'Credit Card') + ' (•••• ' + (c.last_4_digits || '0000') + ')',
                amount: dueAmt,
                daysUntilDue: cd.daysUntilDue,
                dueDateStr: cd.targetDateStr,
                isOverdue: cd.isOverdue,
                badge: '💳 Card Bill',
                color: 'var(--rose)'
              });
              totalDue += dueAmt;
            }
          });
        } catch (e) {}
      } else if (typeof state === 'object' && Array.isArray(state.credit_cards)) {
        state.credit_cards.forEach(c => {
          var dueAmt = Number(c.current_due) || 0;
          if (dueAmt > 0 && c.payment_due_date) {
            var dDate = new Date(c.payment_due_date);
            var diffDays = Math.ceil((dDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (diffDays <= daysAhead) {
              obligations.push({
                type: 'credit_card',
                title: (c.card_name || 'Credit Card') + (c.last_4_digits ? ' (•••• ' + c.last_4_digits + ')' : ''),
                amount: dueAmt,
                daysUntilDue: diffDays,
                dueDateStr: c.payment_due_date,
                isOverdue: diffDays < 0,
                badge: '💳 Card Bill',
                color: 'var(--rose)'
              });
              totalDue += dueAmt;
            }
          }
        });
      }

      // 2. Loan EMIs
      var loans = (typeof state === 'object' && Array.isArray(state.loans)) ? state.loans : [];
      loans.forEach(l => {
        if (l.type === 'taken' || !l.type) {
          var emiAmt = Number(l.emi || l.emiAmount || l.amount) || 0;
          if (emiAmt > 0 && l.dueDate) {
            var dDate = new Date(l.dueDate);
            var diffDays = Math.ceil((dDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (diffDays >= -10 && diffDays <= daysAhead) {
              obligations.push({
                type: 'loan',
                title: (l.person || l.name || 'Loan') + ' EMI',
                amount: emiAmt,
                daysUntilDue: diffDays,
                dueDateStr: l.dueDate,
                isOverdue: diffDays < 0,
                badge: '🏦 Loan EMI',
                color: 'var(--amber)'
              });
              totalDue += emiAmt;
            }
          }
        }
      });

      // 3. Vehicle Insurance / Expiries
      if (window.LM_VehicleService) {
        try {
          var vehicles = window.LM_VehicleService.getVehicles() || [];
          vehicles.forEach(v => {
            var ins = window.LM_VehicleService.getInsuranceCountdown(v);
            if (ins && ins.daysRemaining <= daysAhead && ins.daysRemaining >= -15) {
              obligations.push({
                type: 'vehicle_insurance',
                title: (v.name || 'Vehicle') + ' Insurance Renewal',
                amount: Number(v.insurancePremium) || 2000,
                daysUntilDue: ins.daysRemaining,
                dueDateStr: v.insuranceExpiry,
                isOverdue: ins.isExpired,
                badge: '🏍️ Vehicle',
                color: 'var(--blue)'
              });
              totalDue += Number(v.insurancePremium) || 2000;
            }
          });
        } catch (e) {}
      }

      // 4. Subscriptions
      var subs = (typeof state === 'object' && Array.isArray(state.subscriptions)) ? state.subscriptions : [];
      subs.forEach(s => {
        var sAmt = Number(s.amount) || 0;
        if (sAmt > 0 && s.nextRenewal) {
          var rDate = new Date(s.nextRenewal);
          var sDiff = Math.ceil((rDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          if (sDiff >= 0 && sDiff <= daysAhead) {
            obligations.push({
              type: 'subscription',
              title: s.name + ' Subscription',
              amount: sAmt,
              daysUntilDue: sDiff,
              dueDateStr: s.nextRenewal,
              isOverdue: false,
              badge: '🔄 Sub',
              color: 'var(--purple)'
            });
            totalDue += sAmt;
          }
        }
      });

      // Sort by days until due ascending
      obligations.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      var sheet = this.getConsolidatedBalanceSheet();
      var liquidCash = sheet.liquidTotal;
      var safeToSpend = _round2(liquidCash - totalDue);
      var status = safeToSpend >= 0 ? (safeToSpend > liquidCash * 0.2 ? 'safe' : 'moderate') : 'critical';

      return {
        obligations: obligations,
        totalObligations: _round2(totalDue),
        liquidCash: liquidCash,
        safeToSpend: safeToSpend,
        status: status
      };
    },

    // ─────────────────────────────────────────────────────────────
    // 6. DASHBOARD INTERLINKED RENDERER
    // ─────────────────────────────────────────────────────────────
    renderDashboardInterlinkAnalysis: function () {
      var container = document.getElementById('dashInterlinkSection');
      if (!container) return;

      var sheet = this.getConsolidatedBalanceSheet();
      var flow = this.getCrossModuleMoneyFlow(30);
      var runway = this.getUpcomingObligations(30);

      var flowTotal = Math.max(1, flow.totalOutflow);
      var pCC = Math.round((flow.creditCards / flowTotal) * 100);
      var pLoan = Math.round((flow.loans / flowTotal) * 100);
      var pInvest = Math.round(((flow.stocks + flow.investments) / flowTotal) * 100);
      var pBiz = Math.round((flow.business / flowTotal) * 100);
      var pVeh = Math.round((flow.vehicles / flowTotal) * 100);
      var pLiving = Math.round((flow.living / flowTotal) * 100);

      var statusColor = runway.status === 'safe' ? '#10b981' : (runway.status === 'moderate' ? '#f59e0b' : '#ef4444');
      var statusText = runway.status === 'safe' ? 'Healthy Surplus' : (runway.status === 'moderate' ? 'Tight Buffer' : 'Commitment Deficit Alert');

      var html = `
        <div class="dash-interlink-wrap fade-up fade-up-2">
          <!-- SECTION 1: CONSOLIDATED BALANCE SHEET -->
          <div class="dash-il-card card">
            <div class="dash-il-header">
              <div class="dash-il-title-wrap">
                <span class="dash-il-icon">🏛️</span>
                <div>
                  <h3 class="dash-il-title">Executive Consolidated Balance Sheet</h3>
                  <p class="dash-il-sub">Live Net Worth across Liquid Cash, Stocks, Business, and Active Liabilities</p>
                </div>
              </div>
              <div class="dash-il-badge" style="background:rgba(0, 212, 180, 0.12); color:var(--teal); border:1px solid rgba(0, 212, 180, 0.3);">
                True Net Worth: ${_fmtINR(sheet.netWorth)}
              </div>
            </div>

            <div class="dash-bs-grid">
              <!-- ASSETS COLUMN -->
              <div class="dash-bs-col assets">
                <div class="dash-bs-col-head">
                  <span class="text-success font-bold">TOTAL REAL ASSETS</span>
                  <span class="font-bold text-success">${_fmtINR(sheet.totalRealAssets)}</span>
                </div>
                <div class="dash-bs-item clickable" onclick="window.LM_DashboardUpgrade?.setViewMode('daily'); document.getElementById('dashAccountSummariesSection')?.scrollIntoView({behavior:'smooth'});" title="View Liquid Bank Accounts">
                  <span>💼 Liquid Cash (Bank &amp; Wallets)</span>
                  <span class="font-bold">${_fmtINR(sheet.liquidTotal)} →</span>
                </div>
                <div class="dash-bs-item clickable" onclick="showPage('stocks')" title="View Stock Portfolio">
                  <span>📈 Indian Equities &amp; Stocks</span>
                  <span class="font-bold">${_fmtINR(sheet.stocksTotal)} →</span>
                </div>
                <div class="dash-bs-item clickable" onclick="showPage('investments')" title="View Mutual Funds &amp; FDs">
                  <span>💎 Mutual Funds, Gold &amp; FDs</span>
                  <span class="font-bold">${_fmtINR(sheet.mutualFundsTotal + sheet.goldTotal + sheet.fdsTotal)} →</span>
                </div>
                <div class="dash-bs-item clickable" onclick="showPage('business')" title="View Business Hub">
                  <span>🏢 Business Uncollected Receivables</span>
                  <span class="font-bold">${_fmtINR(sheet.businessReceivables)} →</span>
                </div>
              </div>

              <!-- LIABILITIES COLUMN -->
              <div class="dash-bs-col liabilities">
                <div class="dash-bs-col-head">
                  <span class="text-danger font-bold">ACTIVE LIABILITIES</span>
                  <span class="font-bold text-danger">${_fmtINR(sheet.totalLiabilities)}</span>
                </div>
                <div class="dash-bs-item clickable" onclick="showPage('credit-cards')" title="View Credit Card Dues">
                  <span>💳 Credit Card Outstanding Dues</span>
                  <span class="font-bold text-danger">${_fmtINR(sheet.creditCardDues)} →</span>
                </div>
                <div class="dash-bs-item clickable" onclick="showPage('loans')" title="View Loan Balances">
                  <span>🏦 Loan &amp; EMI Principal Balances</span>
                  <span class="font-bold text-danger">${_fmtINR(sheet.loanPrincipalRemaining)} →</span>
                </div>
                <div class="dash-bs-item clickable" onclick="showPage('business')" title="View Business Hub">
                  <span>🏢 Business Vendor Payables</span>
                  <span class="font-bold text-danger">${_fmtINR(sheet.businessPayables)} →</span>
                </div>
                <div class="dash-bs-item total-debt-ratio">
                  <span>Debt-to-Asset Leverage Ratio</span>
                  <span class="font-bold ${sheet.debtToAssetRatio > 40 ? 'text-danger' : 'text-success'}">${sheet.debtToAssetRatio}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- SECTION 2 & 3: TWO COLUMN (MONEY FLOW MATRIX + 30-DAY RUNWAY) -->
          <div class="dash-il-two-col">
            <!-- MONEY FLOW MATRIX -->
            <div class="dash-il-card card">
              <div class="dash-il-header">
                <div class="dash-il-title-wrap">
                  <span class="dash-il-icon">🌊</span>
                  <div>
                    <h3 class="dash-il-title">Cross-Module Money Flow (30d)</h3>
                    <p class="dash-il-sub">How income was distributed across modules</p>
                  </div>
                </div>
                <div class="dash-il-badge font-bold">Total: ${_fmtINR(flow.totalOutflow)}</div>
              </div>

              <!-- Visual Proportion Bar -->
              <div class="dash-flow-multi-bar">
                <div class="dash-flow-seg cc" style="width:${pCC}%;" title="Credit Cards: ${_fmtINR(flow.creditCards)} (${pCC}%)"></div>
                <div class="dash-flow-seg loan" style="width:${pLoan}%;" title="Loans & EMIs: ${_fmtINR(flow.loans)} (${pLoan}%)"></div>
                <div class="dash-flow-seg invest" style="width:${pInvest}%;" title="Wealth & Stocks: ${_fmtINR(flow.stocks + flow.investments)} (${pInvest}%)"></div>
                <div class="dash-flow-seg biz" style="width:${pBiz}%;" title="Business: ${_fmtINR(flow.business)} (${pBiz}%)"></div>
                <div class="dash-flow-seg veh" style="width:${pVeh}%;" title="Vehicles: ${_fmtINR(flow.vehicles)} (${pVeh}%)"></div>
                <div class="dash-flow-seg living" style="width:${pLiving}%;" title="Living: ${_fmtINR(flow.living)} (${pLiving}%)"></div>
              </div>

              <div class="dash-flow-legend-grid">
                <div class="dash-flow-legend-item" onclick="showPage('credit-cards')">
                  <span class="dash-flow-dot cc"></span>
                  <span class="dash-flow-name">Credit Cards</span>
                  <span class="dash-flow-val">${_fmtINR(flow.creditCards)} <small>(${pCC}%)</small></span>
                </div>
                <div class="dash-flow-legend-item" onclick="showPage('loans')">
                  <span class="dash-flow-dot loan"></span>
                  <span class="dash-flow-name">Loan EMIs</span>
                  <span class="dash-flow-val">${_fmtINR(flow.loans)} <small>(${pLoan}%)</small></span>
                </div>
                <div class="dash-flow-legend-item" onclick="showPage('stocks')">
                  <span class="dash-flow-dot invest"></span>
                  <span class="dash-flow-name">Stocks &amp; Wealth</span>
                  <span class="dash-flow-val">${_fmtINR(flow.stocks + flow.investments)} <small>(${pInvest}%)</small></span>
                </div>
                <div class="dash-flow-legend-item" onclick="showPage('business')">
                  <span class="dash-flow-dot biz"></span>
                  <span class="dash-flow-name">Business Operations</span>
                  <span class="dash-flow-val">${_fmtINR(flow.business)} <small>(${pBiz}%)</small></span>
                </div>
                <div class="dash-flow-legend-item" onclick="showPage('vehicles')">
                  <span class="dash-flow-dot veh"></span>
                  <span class="dash-flow-name">Vehicles &amp; Fuel</span>
                  <span class="dash-flow-val">${_fmtINR(flow.vehicles)} <small>(${pVeh}%)</small></span>
                </div>
                <div class="dash-flow-legend-item" onclick="showPage('transactions')">
                  <span class="dash-flow-dot living"></span>
                  <span class="dash-flow-name">Living Expenses</span>
                  <span class="dash-flow-val">${_fmtINR(flow.living)} <small>(${pLiving}%)</small></span>
                </div>
              </div>
            </div>

            <!-- 30-DAY COMMITMENTS & RUNWAY GAUGE -->
            <div class="dash-il-card card">
              <div class="dash-il-header">
                <div class="dash-il-title-wrap">
                  <span class="dash-il-icon">🎯</span>
                  <div>
                    <h3 class="dash-il-title">30-Day Obligations &amp; Runway</h3>
                    <p class="dash-il-sub">Upcoming bills vs. liquid cash reserves</p>
                  </div>
                </div>
                <div class="dash-il-badge" style="background:rgba(255, 255, 255, 0.05); color:${statusColor}; border:1px solid ${statusColor};">
                  ● ${statusText}
                </div>
              </div>

              <!-- Safe-to-Spend Metric Box -->
              <div class="dash-runway-metric-box">
                <div class="dash-runway-col">
                  <span class="dash-runway-sub">Liquid Bank Cash</span>
                  <span class="dash-runway-val font-bold">${_fmtINR(runway.liquidCash)}</span>
                </div>
                <div class="dash-runway-minus">−</div>
                <div class="dash-runway-col">
                  <span class="dash-runway-sub">30d Total Obligations</span>
                  <span class="dash-runway-val font-bold text-danger">${_fmtINR(runway.totalObligations)}</span>
                </div>
                <div class="dash-runway-equals">=</div>
                <div class="dash-runway-col highlight">
                  <span class="dash-runway-sub">Safe-to-Spend Surplus</span>
                  <span class="dash-runway-val font-bold" style="color:${statusColor};">${_fmtINR(runway.safeToSpend)}</span>
                </div>
              </div>

              <!-- Upcoming Commitments List -->
              <div class="dash-commitments-list">
                ${runway.obligations.length === 0 ? `
                  <div class="dash-no-commitments">✅ No pending dues or EMIs scheduled for the next 30 days!</div>
                ` : runway.obligations.slice(0, 4).map(ob => `
                  <div class="dash-commitment-row">
                    <span class="dash-commitment-badge" style="color:${ob.color}; background:rgba(255,255,255,0.05);">${ob.badge}</span>
                    <span class="dash-commitment-title" title="${ob.title}">${ob.title}</span>
                    <span class="dash-commitment-days ${ob.isOverdue ? 'overdue' : ''}">${ob.isOverdue ? '⚠️ Overdue' : ('In ' + ob.daysUntilDue + 'd')}</span>
                    <span class="dash-commitment-amt font-bold">${_fmtINR(ob.amount)}</span>
                    <button class="dash-obligation-pay-btn" onclick="window.LM_InterlinkEngine.handleQuickPayObligation('${ob.type}', '${ob.title.replace(/'/g, "\\'")}', ${ob.amount})" title="Pay or settle this commitment">⚡ Pay</button>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;
    },

    // ─────────────────────────────────────────────────────────────
    // 7. HELPER METHODS
    // ─────────────────────────────────────────────────────────────
    _getDefaultCategory: function (mod, refType) {
      if (mod === this.MODULES.CREDIT_CARDS) return 'Bills';
      if (mod === this.MODULES.LOANS) return 'Loans';
      if (mod === this.MODULES.STOCKS) return 'Investment';
      if (mod === this.MODULES.INVESTMENTS) return 'Mutual Funds';
      if (mod === this.MODULES.BUSINESS) return 'Business';
      if (mod === this.MODULES.VEHICLES) {
        if (refType === this.REF_TYPES.VEH_FUEL) return 'Fuel';
        if (refType === this.REF_TYPES.VEH_INSURANCE) return 'Insurance';
        return 'Automobile';
      }
      return 'Other';
    },

    _getDefaultAccount: function (params) {
      if (params.account) return params.account;
      var accs = state?.dropdowns?.accounts || [];
      return accs[0] || 'Bank';
    },

    _generateDefaultNote: function (params) {
      var mod = params.sourceModule;
      var ent = params.entityName || '';
      var ref = params.refType;
      if (mod === this.MODULES.CREDIT_CARDS) return 'Credit Card Payment - ' + ent;
      if (mod === this.MODULES.LOANS) return 'Loan EMI Payment - ' + ent;
      if (mod === this.MODULES.STOCKS) return 'Stock Order - ' + ent;
      if (mod === this.MODULES.INVESTMENTS) return 'Investment SIP - ' + ent;
      if (mod === this.MODULES.BUSINESS) return 'Business Ledger - ' + ent;
      if (mod === this.MODULES.VEHICLES) return 'Vehicle Expense - ' + ent;
      return 'Linked Transaction - ' + ent;
    },

    handleQuickPayObligation: function (type, title, amount) {
      amount = Number(amount) || 0;
      try { if (window.LM_Haptic) window.LM_Haptic.light(); } catch (e) {}

      if (type === 'credit_card') {
        if (window.LM_CreditCardsService && typeof window.LM_CreditCardsService.getAllCards === 'function') {
          var cards = window.LM_CreditCardsService.getAllCards() || [];
          var tLower = (title || '').toLowerCase();
          var matched = cards.find(function (c) {
            return tLower.includes((c.card_name || '').toLowerCase()) ||
                   (c.last_4_digits && tLower.includes(c.last_4_digits));
          });
          if (matched && window.LM_CreditCardsUI && typeof window.LM_CreditCardsUI.openPayModal === 'function') {
            window.LM_CreditCardsUI.openPayModal(matched.id);
            return;
          }
        }
        if (typeof showPage === 'function') showPage('credit-cards');
        return;
      }

      if (type === 'loan') {
        if (typeof openAddTransactionModal === 'function') {
          openAddTransactionModal({
            type: 'out',
            category: 'Loan',
            amount: amount,
            note: 'Loan EMI Payment - ' + title,
            date: _todayISO()
          });
          return;
        }
        if (typeof showPage === 'function') showPage('loans');
        return;
      }

      if (typeof openAddTransactionModal === 'function') {
        openAddTransactionModal({
          type: 'out',
          category: type === 'vehicle_insurance' ? 'Insurance' : 'Bills',
          amount: amount,
          note: title,
          date: _todayISO()
        });
      }
    }
  };

  window.LM_InterlinkEngine = InterlinkEngine;

})();
