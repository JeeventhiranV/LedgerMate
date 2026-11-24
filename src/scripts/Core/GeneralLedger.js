/**
 * LedgerMate – GeneralLedger.js
 * ─────────────────────────────────────────────────────────────
 * Double-Entry Accounting & Financial Integrity Engine.
 * Converts single-entry personal finance transactions into balanced
 * GAAP/IFRS double-entry journal postings (Debit = Credit).
 * Generates automated Trial Balance, Balance Sheet integrity proofs,
 * and formal Profit & Loss reports.
 * Exposes: window.LM_GeneralLedger
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // 5 Standard GAAP/IFRS Account Types
  var ACCOUNT_TYPES = {
    ASSET: 'ASSET',
    LIABILITY: 'LIABILITY',
    EQUITY: 'EQUITY',
    REVENUE: 'REVENUE',
    EXPENSE: 'EXPENSE'
  };

  // Normal balance orientation
  // ASSET and EXPENSE increase with DEBIT.
  // LIABILITY, EQUITY, and REVENUE increase with CREDIT.
  var NORMAL_BALANCES = {
    ASSET: 'DEBIT',
    EXPENSE: 'DEBIT',
    LIABILITY: 'CREDIT',
    EQUITY: 'CREDIT',
    REVENUE: 'CREDIT'
  };

  // Standard Default Chart of Accounts
  var DEFAULT_CHART_OF_ACCOUNTS = [
    // 1000 - Assets
    { code: '1010', name: 'Assets:Cash', type: ACCOUNT_TYPES.ASSET, desc: 'Physical cash and wallet funds' },
    { code: '1020', name: 'Assets:Bank', type: ACCOUNT_TYPES.ASSET, desc: 'Primary liquid savings and checking accounts' },
    { code: '1030', name: 'Assets:Savings', type: ACCOUNT_TYPES.ASSET, desc: 'Dedicated savings and emergency reserves' },
    { code: '1040', name: 'Assets:Investments', type: ACCOUNT_TYPES.ASSET, desc: 'Equity stocks, mutual funds, gold, and FDs' },

    // 2000 - Liabilities
    { code: '2010', name: 'Liabilities:CreditCards', type: ACCOUNT_TYPES.LIABILITY, desc: 'Outstanding revolving credit card balances' },
    { code: '2020', name: 'Liabilities:Loans', type: ACCOUNT_TYPES.LIABILITY, desc: 'Personal, auto, and home loan debts' },

    // 3000 - Equity
    { code: '3010', name: 'Equity:OpeningBalance', type: ACCOUNT_TYPES.EQUITY, desc: 'Historical opening net worth' },
    { code: '3020', name: 'Equity:RetainedEarnings', type: ACCOUNT_TYPES.EQUITY, desc: 'Accumulated net surplus across all periods' },

    // 4000 - Revenue
    { code: '4010', name: 'Revenue:Salary', type: ACCOUNT_TYPES.REVENUE, desc: 'Primary professional employment compensation' },
    { code: '4020', name: 'Revenue:Dividends', type: ACCOUNT_TYPES.REVENUE, desc: 'Investment dividends and capital payouts' },
    { code: '4030', name: 'Revenue:Interest', type: ACCOUNT_TYPES.REVENUE, desc: 'Bank account and fixed deposit interest' },
    { code: '4040', name: 'Revenue:OtherIncome', type: ACCOUNT_TYPES.REVENUE, desc: 'Consulting, cashback, gifts, and refunds' },

    // 5000 - Expenses
    { code: '5010', name: 'Expenses:Food & Dining', type: ACCOUNT_TYPES.EXPENSE, desc: 'Groceries, restaurants, cafes, and food delivery' },
    { code: '5020', name: 'Expenses:Groceries', type: ACCOUNT_TYPES.EXPENSE, desc: 'Supermarket and daily household supplies' },
    { code: '5030', name: 'Expenses:Transport & Fuel', type: ACCOUNT_TYPES.EXPENSE, desc: 'Cab rides, petrol, diesel, and metro transit' },
    { code: '5040', name: 'Expenses:Rent', type: ACCOUNT_TYPES.EXPENSE, desc: 'Residential rent and society maintenance' },
    { code: '5050', name: 'Expenses:Bills & Utilities', type: ACCOUNT_TYPES.EXPENSE, desc: 'Electricity, mobile, internet, and piped gas' },
    { code: '5060', name: 'Expenses:Subscriptions', type: ACCOUNT_TYPES.EXPENSE, desc: 'Software, streaming media, and memberships' },
    { code: '5070', name: 'Expenses:Shopping', type: ACCOUNT_TYPES.EXPENSE, desc: 'Apparel, electronics, and lifestyle goods' },
    { code: '5080', name: 'Expenses:Healthcare', type: ACCOUNT_TYPES.EXPENSE, desc: 'Medical, pharmacy, and diagnostic expenses' },
    { code: '5090', name: 'Expenses:General', type: ACCOUNT_TYPES.EXPENSE, desc: 'Miscellaneous and unclassified expenses' }
  ];

  /**
   * Helper to format currency for ledger tables
   */
  function fmtMoney(amount) {
    if (typeof window !== 'undefined' && window.LM_Currency && typeof window.LM_Currency.formatINR === 'function') {
      return window.LM_Currency.formatINR(amount);
    }
    var num = parseFloat(amount || 0);
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  /**
   * Resolve an account name to an account type and full path
   */
  function resolveAccount(name, defaultType) {
    name = (name || '').trim();
    if (!name) return { name: 'Assets:Bank', type: ACCOUNT_TYPES.ASSET };

    // Already namespaced
    if (name.startsWith('Assets:')) return { name: name, type: ACCOUNT_TYPES.ASSET };
    if (name.startsWith('Liabilities:')) return { name: name, type: ACCOUNT_TYPES.LIABILITY };
    if (name.startsWith('Equity:')) return { name: name, type: ACCOUNT_TYPES.EQUITY };
    if (name.startsWith('Revenue:')) return { name: name, type: ACCOUNT_TYPES.REVENUE };
    if (name.startsWith('Expenses:')) return { name: name, type: ACCOUNT_TYPES.EXPENSE };

    var lower = name.toLowerCase();
    if (lower.includes('card') || lower.includes('loan') || lower.includes('debt') || lower.includes('emi')) {
      return { name: 'Liabilities:' + name, type: ACCOUNT_TYPES.LIABILITY };
    }
    if (defaultType === ACCOUNT_TYPES.EXPENSE) {
      return { name: 'Expenses:' + name, type: ACCOUNT_TYPES.EXPENSE };
    }
    if (defaultType === ACCOUNT_TYPES.REVENUE) {
      return { name: 'Revenue:' + name, type: ACCOUNT_TYPES.REVENUE };
    }
    return { name: 'Assets:' + name, type: ACCOUNT_TYPES.ASSET };
  }

  /**
   * Converts a single-entry transaction into a balanced double-entry Journal Entry.
   * In double-entry accounting: Every transaction has equal DEBITS and CREDITS.
   * @param {Object} tx - LedgerMate transaction
   * @returns {Object} Balanced Journal Entry
   */
  function journalize(tx) {
    if (!tx) return null;
    var amt = Math.abs(parseFloat(tx.amount || 0));
    if (isNaN(amt) || amt === 0) return null;

    var type = String(tx.type || 'out').toLowerCase();
    var date = tx.date || (new Date()).toISOString().slice(0, 10);
    var description = tx.name || tx.notes || tx.description || 'Transaction';
    var cat = tx.category || 'General';
    var rawAcc = tx.account || tx.accountName || 'Bank';

    var entries = [];

    // Case 1: Expense / Outflow
    if (type === 'out' || type === 'expense' || type === 'debit' || type === 'dr') {
      var expenseAcc = resolveAccount(cat, ACCOUNT_TYPES.EXPENSE);
      var sourceAcc = resolveAccount(rawAcc, ACCOUNT_TYPES.ASSET);

      // Debit Expense (increases expense), Credit Asset (decreases asset) or Credit Liability (increases card debt)
      entries.push({
        account: expenseAcc.name,
        accountType: expenseAcc.type,
        type: 'debit',
        debit: amt,
        credit: 0
      });
      entries.push({
        account: sourceAcc.name,
        accountType: sourceAcc.type,
        type: 'credit',
        debit: 0,
        credit: amt
      });
    }
    // Case 2: Income / Inflow
    else if (type === 'in' || type === 'income' || type === 'credit' || type === 'cr') {
      var destAcc = resolveAccount(rawAcc, ACCOUNT_TYPES.ASSET);
      var revenueAcc = resolveAccount(cat, ACCOUNT_TYPES.REVENUE);

      // Debit Asset (increases asset cash/bank), Credit Revenue (increases income)
      entries.push({
        account: destAcc.name,
        accountType: destAcc.type,
        type: 'debit',
        debit: amt,
        credit: 0
      });
      entries.push({
        account: revenueAcc.name,
        accountType: revenueAcc.type,
        type: 'credit',
        debit: 0,
        credit: amt
      });
    }
    // Case 3: Transfer between accounts
    else if (type === 'transfer') {
      var srcAcc = resolveAccount(rawAcc, ACCOUNT_TYPES.ASSET);
      var toAccName = tx.toAccount || tx.transferTo || 'Cash';
      var dstAcc = resolveAccount(toAccName, ACCOUNT_TYPES.ASSET);

      // Debit destination asset (increases dest), Credit source asset (decreases src)
      entries.push({
        account: dstAcc.name,
        accountType: dstAcc.type,
        type: 'debit',
        debit: amt,
        credit: 0
      });
      entries.push({
        account: srcAcc.name,
        accountType: srcAcc.type,
        type: 'credit',
        debit: 0,
        credit: amt
      });
    }

    var totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    var totalCredit = entries.reduce((s, e) => s + e.credit, 0);
    var isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

    return {
      id: 'je_' + (tx.id || Math.random().toString(36).slice(2, 9)),
      date: date,
      txId: tx.id || null,
      description: description,
      totalAmount: amt,
      entries: entries,
      totalDebit: totalDebit,
      totalCredit: totalCredit,
      isBalanced: isBalanced
    };
  }

  /**
   * Generates a complete Trial Balance from a list of transactions.
   * A Trial Balance lists all accounts and their net debit or credit balances.
   * If double-entry principles hold, Total Debits MUST EQUAL Total Credits.
   * @param {Array} transactions 
   * @param {Array} [customAccounts] 
   * @returns {Object} Trial balance report
   */
  function generateTrialBalance(transactions, customAccounts) {
    var accountsMap = {};

    // Initialize with default chart of accounts
    (customAccounts || DEFAULT_CHART_OF_ACCOUNTS).forEach(function (acc) {
      accountsMap[acc.name] = {
        name: acc.name,
        type: acc.type,
        totalDebits: 0,
        totalCredits: 0,
        netDebit: 0,
        netCredit: 0
      };
    });

    var journalEntries = [];
    var unjournalized = 0;

    (transactions || []).forEach(function (tx) {
      var je = journalize(tx);
      if (!je) {
        unjournalized++;
        return;
      }
      journalEntries.push(je);

      je.entries.forEach(function (entry) {
        if (!accountsMap[entry.account]) {
          accountsMap[entry.account] = {
            name: entry.account,
            type: entry.accountType,
            totalDebits: 0,
            totalCredits: 0,
            netDebit: 0,
            netCredit: 0
          };
        }
        accountsMap[entry.account].totalDebits += entry.debit;
        accountsMap[entry.account].totalCredits += entry.credit;
      });
    });

    var overallDebits = 0;
    var overallCredits = 0;
    var rows = [];

    Object.keys(accountsMap).forEach(function (accName) {
      var item = accountsMap[accName];
      var debits = item.totalDebits;
      var credits = item.totalCredits;

      // Only display accounts that have activity
      if (debits === 0 && credits === 0) return;

      var normal = NORMAL_BALANCES[item.type] || 'DEBIT';
      var netDebit = 0;
      var netCredit = 0;

      if (normal === 'DEBIT') {
        var diff = debits - credits;
        if (diff >= 0) {
          netDebit = diff;
        } else {
          netCredit = Math.abs(diff);
        }
      } else {
        var diffCredit = credits - debits;
        if (diffCredit >= 0) {
          netCredit = diffCredit;
        } else {
          netDebit = Math.abs(diffCredit);
        }
      }

      overallDebits += netDebit;
      overallCredits += netCredit;

      rows.push({
        account: accName,
        type: item.type,
        normalBalance: normal,
        grossDebits: Math.round(debits * 100) / 100,
        grossCredits: Math.round(credits * 100) / 100,
        debit: Math.round(netDebit * 100) / 100,
        credit: Math.round(netCredit * 100) / 100
      });
    });

    // Sort by type: Asset, Liability, Equity, Revenue, Expense
    var typeOrder = { ASSET: 1, LIABILITY: 2, EQUITY: 3, REVENUE: 4, EXPENSE: 5 };
    rows.sort(function (a, b) {
      var diff = (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
      if (diff !== 0) return diff;
      return a.account.localeCompare(b.account);
    });

    var variance = Math.abs(overallDebits - overallCredits);
    var isBalanced = variance < 0.01;

    return {
      asOfDate: (new Date()).toISOString().slice(0, 10),
      journalEntriesCount: journalEntries.length,
      totalDebits: Math.round(overallDebits * 100) / 100,
      totalCredits: Math.round(overallCredits * 100) / 100,
      variance: Math.round(variance * 100) / 100,
      isBalanced: isBalanced,
      accounts: rows,
      journalEntries: journalEntries
    };
  }

  /**
   * Generates a formal Profit and Loss (Income Statement)
   * Formula: Net Income = Total Revenue - Total Expenses
   */
  function generateProfitAndLoss(transactions) {
    var tb = generateTrialBalance(transactions);
    var revenueRows = tb.accounts.filter(a => a.type === ACCOUNT_TYPES.REVENUE);
    var expenseRows = tb.accounts.filter(a => a.type === ACCOUNT_TYPES.EXPENSE);

    var totalRevenue = revenueRows.reduce((s, r) => s + r.credit, 0);
    var totalExpenses = expenseRows.reduce((s, r) => s + r.debit, 0);
    var netIncome = totalRevenue - totalExpenses;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netIncome: Math.round(netIncome * 100) / 100,
      isProfitable: netIncome >= 0,
      revenueBreakdown: revenueRows,
      expenseBreakdown: expenseRows
    };
  }

  /**
   * Generates a formal Balance Sheet
   * Formula: Assets = Liabilities + Equity (including closed Net Income)
   */
  function generateBalanceSheet(transactions, startingEquity) {
    var tb = generateTrialBalance(transactions);
    var pnl = generateProfitAndLoss(transactions);

    var assetRows = tb.accounts.filter(a => a.type === ACCOUNT_TYPES.ASSET);
    var liabilityRows = tb.accounts.filter(a => a.type === ACCOUNT_TYPES.LIABILITY);
    var equityRows = tb.accounts.filter(a => a.type === ACCOUNT_TYPES.EQUITY);

    var totalAssets = assetRows.reduce((s, r) => s + r.debit - r.credit, 0);
    var totalLiabilities = liabilityRows.reduce((s, r) => s + r.credit - r.debit, 0);
    var baseEquity = equityRows.reduce((s, r) => s + r.credit - r.debit, 0) + (parseFloat(startingEquity) || 0);

    // Closing the period: Net income flows into Retained Earnings (Equity)
    var totalEquity = baseEquity + pnl.netIncome;

    var equationDiff = Math.abs(totalAssets - (totalLiabilities + totalEquity));
    var isBalanced = equationDiff < 0.01;

    return {
      asOfDate: (new Date()).toISOString().slice(0, 10),
      totalAssets: Math.round(totalAssets * 100) / 100,
      totalLiabilities: Math.round(totalLiabilities * 100) / 100,
      totalEquity: Math.round(totalEquity * 100) / 100,
      retainedEarningsFromPnL: pnl.netIncome,
      equationVariance: Math.round(equationDiff * 100) / 100,
      isBalanced: isBalanced,
      assets: assetRows,
      liabilities: liabilityRows,
      equity: equityRows
    };
  }

  /**
   * UI: Show interactive General Ledger & Trial Balance Audit Modal
   */
  function showGeneralLedgerModal() {
    if (typeof document === 'undefined') return;
    var existing = document.getElementById('lm-general-ledger-modal');
    if (existing) existing.remove();

    var txs = (typeof window !== 'undefined' && window.state && Array.isArray(window.state.transactions))
      ? window.state.transactions
      : [];

    var tb = generateTrialBalance(txs);
    var pnl = generateProfitAndLoss(txs);
    var bs = generateBalanceSheet(txs);

    var modal = document.createElement('div');
    modal.id = 'lm-general-ledger-modal';
    modal.className = 'modal-backdrop';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(5,7,20,0.88);
      backdrop-filter: blur(8px); z-index: 10000;
      display: flex; align-items: center; justify-content: center; padding: 16px;
    `;

    modal.innerHTML = `
      <div class="modal-box" style="
        background: var(--bg2, #0d122b); border: 1px solid var(--border, rgba(255,255,255,0.08));
        border-radius: var(--lm-radius-lg, 16px); width: 100%; max-width: 860px; max-height: 90vh;
        display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
      ">
        <div style="padding: 18px 24px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.08)); display: flex; align-items: center; justify-content: space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:10px; background:rgba(0,240,255,0.12); display:flex; align-items:center; justify-content:center; font-size:18px;">⚖️</div>
            <div>
              <h2 style="font-size:17px; font-weight:700; color:#fff; margin:0;">Double-Entry General Ledger</h2>
              <p style="font-size:12px; color:var(--text-3, #64748b); margin:2px 0 0;">GAAP/IFRS Double-Entry Integrity &amp; Trial Balance Proof</p>
            </div>
          </div>
          <button id="lm-gl-close" style="background:none; border:none; color:var(--text-2,#94a3b8); font-size:22px; cursor:pointer; line-height:1;">✕</button>
        </div>

        <div style="padding: 16px 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; background: var(--bg3, #111736); border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));">
          <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border, rgba(255,255,255,0.06));">
            <div style="font-size:11px; color:var(--text-3,#64748b);">Total Debits</div>
            <div style="font-size:17px; font-weight:700; font-family:var(--font-m,monospace); color:var(--teal,#00f0ff);">${fmtMoney(tb.totalDebits)}</div>
          </div>
          <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border, rgba(255,255,255,0.06));">
            <div style="font-size:11px; color:var(--text-3,#64748b);">Total Credits</div>
            <div style="font-size:17px; font-weight:700; font-family:var(--font-m,monospace); color:var(--teal,#00f0ff);">${fmtMoney(tb.totalCredits)}</div>
          </div>
          <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border, rgba(255,255,255,0.06));">
            <div style="font-size:11px; color:var(--text-3,#64748b);">Trial Balance Status</div>
            <div style="font-size:14px; font-weight:700; margin-top:2px; color:${tb.isBalanced ? 'var(--emerald,#10b981)' : 'var(--rose,#f43f5e)'};">
              ${tb.isBalanced ? '✓ 100% In Balance' : `⚠ Variance: ${fmtMoney(tb.variance)}`}
            </div>
          </div>
          <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid var(--border, rgba(255,255,255,0.06));">
            <div style="font-size:11px; color:var(--text-3,#64748b);">Accounting Equation</div>
            <div style="font-size:13px; font-weight:600; margin-top:2px; color:var(--text-1,#e2e8f0);">
              Assets = Liab + Equity
            </div>
          </div>
        </div>

        <div style="padding: 12px 24px; display:flex; gap:8px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));">
          <button class="lm-gl-tab active" data-tab="tb" style="padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; border:1px solid rgba(0,240,255,0.3); background:rgba(0,240,255,0.15); color:var(--teal,#00f0ff); cursor:pointer;">Trial Balance</button>
          <button class="lm-gl-tab" data-tab="bs" style="padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; border:1px solid var(--border,rgba(255,255,255,0.08)); background:transparent; color:var(--text-2,#94a3b8); cursor:pointer;">Balance Sheet</button>
          <button class="lm-gl-tab" data-tab="pnl" style="padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; border:1px solid var(--border,rgba(255,255,255,0.08)); background:transparent; color:var(--text-2,#94a3b8); cursor:pointer;">P&amp;L Statement</button>
        </div>

        <div id="lm-gl-content" style="padding: 20px 24px; overflow-y: auto; flex: 1;">
        </div>

        <div style="padding: 14px 24px; border-top: 1px solid var(--border, rgba(255,255,255,0.08)); display: flex; justify-content: flex-end;">
          <button id="lm-gl-done" style="padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; background: var(--bg3,#111736); border: 1px solid var(--border,rgba(255,255,255,0.15)); color: #fff; cursor: pointer;">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    function renderTab(tab) {
      var container = document.getElementById('lm-gl-content');
      if (!container) return;

      if (tab === 'tb') {
        var rowsHtml = tb.accounts.map(function (a) {
          return `
            <tr style="border-bottom: 1px solid var(--border, rgba(255,255,255,0.04));">
              <td style="padding: 8px 10px; font-weight: 600; color: #fff;">${a.account}</td>
              <td style="padding: 8px 10px; font-size: 11px;"><span style="padding:2px 6px; border-radius:4px; background:rgba(255,255,255,0.05); color:var(--text-2,#94a3b8);">${a.type}</span></td>
              <td style="padding: 8px 10px; text-align: right; font-family: var(--font-m, monospace); font-weight: 600; color: ${a.debit > 0 ? 'var(--teal,#00f0ff)' : 'var(--text-3,#64748b)'};">
                ${a.debit > 0 ? fmtMoney(a.debit) : '—'}
              </td>
              <td style="padding: 8px 10px; text-align: right; font-family: var(--font-m, monospace); font-weight: 600; color: ${a.credit > 0 ? 'var(--emerald,#10b981)' : 'var(--text-3,#64748b)'};">
                ${a.credit > 0 ? fmtMoney(a.credit) : '—'}
              </td>
            </tr>
          `;
        }).join('');

        container.innerHTML = `
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border, rgba(255,255,255,0.1)); color: var(--text-3, #64748b); font-size: 11px; text-transform: uppercase;">
                <th style="padding: 8px 10px; text-align: left;">Account Name</th>
                <th style="padding: 8px 10px; text-align: left;">Category</th>
                <th style="padding: 8px 10px; text-align: right;">Debit (₹)</th>
                <th style="padding: 8px 10px; text-align: right;">Credit (₹)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr style="border-top: 2px solid var(--border, rgba(255,255,255,0.15)); font-weight: 700;">
                <td style="padding: 10px; color: #fff;" colspan="2">Trial Balance Totals</td>
                <td style="padding: 10px; text-align: right; font-family: var(--font-m, monospace); color: var(--teal, #00f0ff);">${fmtMoney(tb.totalDebits)}</td>
                <td style="padding: 10px; text-align: right; font-family: var(--font-m, monospace); color: var(--emerald, #10b981);">${fmtMoney(tb.totalCredits)}</td>
              </tr>
            </tfoot>
          </table>
        `;
      } else if (tab === 'bs') {
        container.innerHTML = `
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div style="background:var(--bg3,#111736); padding:16px; border-radius:12px; border:1px solid var(--border,rgba(255,255,255,0.06));">
              <div style="font-size:14px; font-weight:700; color:var(--teal,#00f0ff); margin-bottom:12px;">Assets</div>
              ${bs.assets.map(a => `<div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0;"><span>${a.account}</span><b style="font-family:var(--font-m,monospace);">${fmtMoney(a.debit)}</b></div>`).join('')}
              <div style="border-top:1px solid var(--border); margin-top:10px; padding-top:8px; display:flex; justify-content:space-between; font-weight:700;"><span>Total Assets</span><span style="color:var(--teal);">${fmtMoney(bs.totalAssets)}</span></div>
            </div>
            <div style="background:var(--bg3,#111736); padding:16px; border-radius:12px; border:1px solid var(--border,rgba(255,255,255,0.06));">
              <div style="font-size:14px; font-weight:700; color:var(--rose,#f43f5e); margin-bottom:12px;">Liabilities &amp; Equity</div>
              ${bs.liabilities.map(l => `<div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0;"><span>${l.account}</span><b style="font-family:var(--font-m,monospace);">${fmtMoney(l.credit)}</b></div>`).join('')}
              <div style="margin:8px 0; border-top:1px dashed var(--border); padding-top:6px; font-size:12px; display:flex; justify-content:space-between; color:var(--emerald);">
                <span>Net Surplus (Retained Earnings)</span>
                <b style="font-family:var(--font-m,monospace);">${fmtMoney(bs.retainedEarningsFromPnL)}</b>
              </div>
              <div style="border-top:1px solid var(--border); margin-top:10px; padding-top:8px; display:flex; justify-content:space-between; font-weight:700;">
                <span>Total Liab + Equity</span>
                <span style="color:var(--rose);">${fmtMoney(bs.totalLiabilities + bs.totalEquity)}</span>
              </div>
            </div>
          </div>
        `;
      } else if (tab === 'pnl') {
        container.innerHTML = `
          <div style="background:var(--bg3,#111736); padding:16px; border-radius:12px; border:1px solid var(--border,rgba(255,255,255,0.06));">
            <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:12px;">Profit &amp; Loss Statement</div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px;">
              <span>Total Revenue / Inflows</span>
              <b style="color:var(--emerald); font-family:var(--font-m,monospace);">${fmtMoney(pnl.totalRevenue)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border); font-size:13px;">
              <span>Total Operating Expenses</span>
              <b style="color:var(--rose); font-family:var(--font-m,monospace);">${fmtMoney(pnl.totalExpenses)}</b>
            </div>
            <div style="display:flex; justify-content:space-between; padding:12px 0 4px; font-size:15px; font-weight:700;">
              <span>Net Income</span>
              <b style="color:${pnl.isProfitable ? 'var(--emerald)' : 'var(--rose)'}; font-family:var(--font-m,monospace);">${pnl.isProfitable ? '+' : ''}${fmtMoney(pnl.netIncome)}</b>
            </div>
          </div>
        `;
      }
    }

    renderTab('tb');

    modal.querySelectorAll('.lm-gl-tab').forEach(btn => {
      btn.onclick = function () {
        modal.querySelectorAll('.lm-gl-tab').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--text-2,#94a3b8)';
          b.style.borderColor = 'var(--border,rgba(255,255,255,0.08))';
        });
        this.style.background = 'rgba(0,240,255,0.15)';
        this.style.color = 'var(--teal,#00f0ff)';
        this.style.borderColor = 'rgba(0,240,255,0.3)';
        renderTab(this.dataset.tab);
      };
    });

    document.getElementById('lm-gl-close').onclick = () => modal.remove();
    document.getElementById('lm-gl-done').onclick = () => modal.remove();
  }

  var GeneralLedgerModule = {
    ACCOUNT_TYPES: ACCOUNT_TYPES,
    NORMAL_BALANCES: NORMAL_BALANCES,
    DEFAULT_CHART_OF_ACCOUNTS: DEFAULT_CHART_OF_ACCOUNTS,
    journalize: journalize,
    generateTrialBalance: generateTrialBalance,
    generateProfitAndLoss: generateProfitAndLoss,
    generateBalanceSheet: generateBalanceSheet,
    showGeneralLedgerModal: showGeneralLedgerModal
  };

  if (typeof window !== 'undefined') {
    window.LM_GeneralLedger = GeneralLedgerModule;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeneralLedgerModule;
  }

  console.log('[LM] GeneralLedger module initialized (Double-Entry Engine ready).');
})();
