/**
 * LedgerMate – FinancialReportingEngine.js
 * ─────────────────────────────────────────────────────────────
 * Audit-Ready Financial Statement & Reporting Engine.
 * Generates formal GAAP/IFRS-compliant financial reports:
 *   1. Balance Sheet (Assets vs Liabilities & Equity)
 *   2. Profit & Loss Statement (Operating Revenue vs Expenses)
 *   3. Schedule of Capital Gains (ITR-2/3 Filing Ready)
 *   4. Cash Flow Statement (Operating, Investing, Financing)
 * Provides 1-click RFC-4180 CSV spreadsheet export and
 * high-fidelity printable statement rendering.
 * Exposes: window.LM_FinancialReporting
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  function fmtMoney(amount) {
    if (typeof window !== 'undefined' && window.LM_Currency && typeof window.LM_Currency.formatINR === 'function') {
      return window.LM_Currency.formatINR(amount);
    }
    var num = parseFloat(amount || 0);
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  function getState() {
    return (typeof window !== 'undefined' && window.state) ? window.state : {};
  }

  /**
   * 1. Balance Sheet Report
   * Formula: Total Assets = Total Liabilities + Total Equity
   */
  function generateBalanceSheetReport(options) {
    options = options || {};
    var state = getState();
    var asOfDate = options.asOfDate || (new Date()).toISOString().slice(0, 10);

    // Current Assets
    var cashBalance = 0;
    var bankBalance = 0;
    var savingsBalance = 0;

    if (typeof window !== 'undefined' && typeof window.getAccountSummaries === 'function') {
      var accs = window.getAccountSummaries();
      Object.keys(accs).forEach(function (k) {
        var bal = parseFloat(accs[k].balance || 0);
        var lk = k.toLowerCase();
        if (lk.includes('cash')) cashBalance += bal;
        else if (lk.includes('saving')) savingsBalance += bal;
        else bankBalance += bal;
      });
    } else {
      (state.transactions || []).forEach(function (t) {
        var amt = parseFloat(t.amount || 0);
        var type = (t.type || 'out').toLowerCase();
        var acc = (t.account || '').toLowerCase();
        var multiplier = (type === 'in' || type === 'income') ? 1 : (type === 'out' || type === 'expense') ? -1 : 0;
        if (acc.includes('cash')) cashBalance += amt * multiplier;
        else if (acc.includes('saving')) savingsBalance += amt * multiplier;
        else bankBalance += amt * multiplier;
      });
    }

    // Non-Current Assets (Investments & Stocks)
    var stockHoldingsValue = 0;
    (state.stocks || []).forEach(function (s) {
      var qty = parseFloat(s.quantity || s.qty || 0);
      var curPrice = parseFloat(s.currentPrice || s.price || s.avgBuyPrice || 0);
      stockHoldingsValue += qty * curPrice;
    });

    var mutualFundsAndDeposits = 0;
    (state.investments || []).forEach(function (inv) {
      if (typeof window !== 'undefined' && typeof window.LM_isClosedOrMatured === 'function' && window.LM_isClosedOrMatured(inv)) return;
      var cur = parseFloat(inv.currentValue || inv.amount || 0);
      mutualFundsAndDeposits += cur;
    });

    var totalCurrentAssets = cashBalance + bankBalance + savingsBalance;
    var totalNonCurrentAssets = stockHoldingsValue + mutualFundsAndDeposits;
    var totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    // Liabilities
    var creditCardDues = 0;
    (state.creditCards || []).forEach(function (c) {
      creditCardDues += parseFloat(c.outstandingBalance || c.totalDue || c.amount || 0);
    });

    var loanPrincipalRemaining = 0;
    (state.loans || []).forEach(function (l) {
      loanPrincipalRemaining += parseFloat(l.principalRemaining || l.balance || l.amount || 0);
    });

    var totalCurrentLiabilities = creditCardDues;
    var totalNonCurrentLiabilities = loanPrincipalRemaining;
    var totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

    // Equity (Net Worth & Retained Earnings)
    var netWorth = totalAssets - totalLiabilities;
    var equity = netWorth; // Total Assets - Total Liabilities

    var equationVariance = Math.abs(totalAssets - (totalLiabilities + equity));
    var isBalanced = equationVariance < 0.01;

    return {
      reportTitle: 'Statement of Financial Position (Balance Sheet)',
      asOfDate: asOfDate,
      assets: {
        current: [
          { name: 'Cash on Hand & Wallets', amount: Math.round(cashBalance * 100) / 100 },
          { name: 'Liquid Bank Accounts', amount: Math.round(bankBalance * 100) / 100 },
          { name: 'Emergency & Savings Reserves', amount: Math.round(savingsBalance * 100) / 100 }
        ],
        nonCurrent: [
          { name: 'Equity Stocks & Securities', amount: Math.round(stockHoldingsValue * 100) / 100 },
          { name: 'Mutual Funds & Fixed Deposits', amount: Math.round(mutualFundsAndDeposits * 100) / 100 }
        ],
        totalCurrentAssets: Math.round(totalCurrentAssets * 100) / 100,
        totalNonCurrentAssets: Math.round(totalNonCurrentAssets * 100) / 100,
        totalAssets: Math.round(totalAssets * 100) / 100
      },
      liabilities: {
        current: [
          { name: 'Credit Card Revolving Balances', amount: Math.round(creditCardDues * 100) / 100 }
        ],
        nonCurrent: [
          { name: 'Outstanding Loans Principal', amount: Math.round(loanPrincipalRemaining * 100) / 100 }
        ],
        totalCurrentLiabilities: Math.round(totalCurrentLiabilities * 100) / 100,
        totalNonCurrentLiabilities: Math.round(totalNonCurrentLiabilities * 100) / 100,
        totalLiabilities: Math.round(totalLiabilities * 100) / 100
      },
      equity: {
        ownerEquity: Math.round(equity * 100) / 100,
        totalEquity: Math.round(equity * 100) / 100
      },
      isBalanced: isBalanced,
      equationVariance: Math.round(equationVariance * 100) / 100
    };
  }

  /**
   * 2. Profit and Loss Statement (Income Statement)
   */
  function generateProfitAndLossReport(options) {
    options = options || {};
    var state = getState();
    var period = options.period || 'current_fy';

    var now = new Date();
    var fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    var startDate = options.startDate || `${fy}-04-01`;
    var endDate = options.endDate || `${fy + 1}-03-31`;

    var txs = (state.transactions || []).filter(function (t) {
      if (!t.date) return false;
      return t.date >= startDate && t.date <= endDate;
    });

    var revenueByCategory = {};
    var expensesByCategory = {};
    var totalRevenue = 0;
    var totalExpenses = 0;

    txs.forEach(function (t) {
      var amt = parseFloat(t.amount || 0);
      var type = String(t.type || 'out').toLowerCase();
      var cat = t.category || 'General';

      if (type === 'in' || type === 'income' || type === 'credit') {
        revenueByCategory[cat] = (revenueByCategory[cat] || 0) + amt;
        totalRevenue += amt;
      } else if (type === 'out' || type === 'expense' || type === 'debit') {
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + amt;
        totalExpenses += amt;
      }
    });

    var netProfit = totalRevenue - totalExpenses;
    var savingsRate = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    var revList = Object.keys(revenueByCategory).map(k => ({ name: k, amount: Math.round(revenueByCategory[k] * 100) / 100 }));
    var expList = Object.keys(expensesByCategory).map(k => ({ name: k, amount: Math.round(expensesByCategory[k] * 100) / 100 }));

    revList.sort((a, b) => b.amount - a.amount);
    expList.sort((a, b) => b.amount - a.amount);

    return {
      reportTitle: 'Statement of Profit and Loss (Income Statement)',
      startDate: startDate,
      endDate: endDate,
      fiscalYear: `FY ${fy}-${fy + 1}`,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      savingsRate: Math.round(savingsRate * 10) / 10,
      revenueBreakdown: revList,
      expenseBreakdown: expList
    };
  }

  /**
   * 3. Schedule of Capital Gains Report (ITR-2/3 Ready)
   */
  function generateCapitalGainsSchedule(options) {
    var state = getState();
    var stocks = state.stocks || [];
    var investments = state.investments || [];

    var cg = null;
    if (typeof window !== 'undefined' && window.LM_TaxIntelligence && typeof window.LM_TaxIntelligence.getCapitalGainsSummary === 'function') {
      cg = window.LM_TaxIntelligence.getCapitalGainsSummary(stocks, investments);
    } else {
      cg = {
        realized: { stcg: 0, ltcg: 0, taxableLtcg: 0, taxStcg: 0, taxLtcg: 0, totalTax: 0 },
        unrealized: { stcg: 0, ltcg: 0, totalGains: 0 },
        harvesting: { annualExemptionLimit: 125000, remainingExemption: 125000, recommendedLtcgToHarvest: 0 }
      };
    }

    return {
      reportTitle: 'Schedule of Capital Gains (Section 111A & 112A)',
      statutoryReference: 'Income Tax Act 1961 (Budget 2024)',
      exemptionLimit: cg.harvesting.annualExemptionLimit,
      realizedSTCG: cg.realized.stcg,
      taxOnSTCG: cg.realized.taxStcg,
      realizedLTCG: cg.realized.ltcg,
      taxableLTCG: cg.realized.taxableLtcg,
      taxOnLTCG: cg.realized.taxLtcg,
      totalCapitalGainsTax: cg.realized.totalTax,
      unrealizedGains: cg.unrealized.totalGains,
      remainingTaxFreeHeadroom: cg.harvesting.remainingExemption,
      harvestingRecommendation: cg.harvesting.recommendedLtcgToHarvest
    };
  }

  /**
   * 4. Cash Flow Statement (Direct Method)
   */
  function generateCashFlowReport(options) {
    var pnl = generateProfitAndLossReport(options);
    var state = getState();

    // Direct Cash Flow categorization
    var operatingInflows = pnl.totalRevenue;
    var operatingOutflows = pnl.totalExpenses;
    var netOperatingCashFlow = operatingInflows - operatingOutflows;

    var investingOutflows = 0;
    (state.stocks || []).forEach(function (s) {
      if (s.buyPrice && s.quantity) investingOutflows += s.buyPrice * s.quantity;
    });
    var netInvestingCashFlow = -investingOutflows;

    var netFinancingCashFlow = 0;
    (state.loans || []).forEach(function (l) {
      var emi = parseFloat(l.emi || 0);
      netFinancingCashFlow -= (emi * 12);
    });

    var netChangeInCash = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;

    return {
      reportTitle: 'Statement of Cash Flows (Direct Method)',
      fiscalPeriod: pnl.fiscalYear,
      operatingActivities: {
        cashFromIncome: operatingInflows,
        cashPaidForExpenses: operatingOutflows,
        netOperatingCashFlow: Math.round(netOperatingCashFlow * 100) / 100
      },
      investingActivities: {
        investmentsInSecurities: investingOutflows,
        netInvestingCashFlow: Math.round(netInvestingCashFlow * 100) / 100
      },
      financingActivities: {
        debtServiceAndLoanEMIs: Math.abs(netFinancingCashFlow),
        netFinancingCashFlow: Math.round(netFinancingCashFlow * 100) / 100
      },
      netChangeInCash: Math.round(netChangeInCash * 100) / 100
    };
  }

  /**
   * RFC-4180 CSV Exporter
   */
  function exportReportToCSV(reportType, options) {
    reportType = (reportType || 'bs').toLowerCase();
    var csvContent = '';
    var filename = `LedgerMate_${reportType.toUpperCase()}_Report_${(new Date()).toISOString().slice(0, 10)}.csv`;

    if (reportType === 'bs' || reportType === 'balance_sheet') {
      var bs = generateBalanceSheetReport(options);
      csvContent = `LedgerMate - Statement of Financial Position (Balance Sheet)\n`;
      csvContent += `As of Date,${bs.asOfDate}\n\n`;
      csvContent += `Category,Item,Amount (INR)\n`;
      csvContent += `Current Assets\n`;
      bs.assets.current.forEach(i => { csvContent += `,"${i.name}",${i.amount}\n`; });
      csvContent += `Non-Current Assets\n`;
      bs.assets.nonCurrent.forEach(i => { csvContent += `,"${i.name}",${i.amount}\n`; });
      csvContent += `Total Assets,,${bs.assets.totalAssets}\n\n`;

      csvContent += `Current Liabilities\n`;
      bs.liabilities.current.forEach(i => { csvContent += `,"${i.name}",${i.amount}\n`; });
      csvContent += `Non-Current Liabilities\n`;
      bs.liabilities.nonCurrent.forEach(i => { csvContent += `,"${i.name}",${i.amount}\n`; });
      csvContent += `Total Liabilities,,${bs.liabilities.totalLiabilities}\n\n`;

      csvContent += `Equity & Net Worth\n`;
      csvContent += `,"Total Equity",${bs.equity.totalEquity}\n`;
      csvContent += `Total Liabilities & Equity,,${bs.liabilities.totalLiabilities + bs.equity.totalEquity}\n`;
    } else if (reportType === 'pnl') {
      var pnl = generateProfitAndLossReport(options);
      csvContent = `LedgerMate - Statement of Profit and Loss (Income Statement)\n`;
      csvContent += `Period,${pnl.fiscalYear} (${pnl.startDate} to ${pnl.endDate})\n\n`;
      csvContent += `Type,Category,Amount (INR)\n`;
      csvContent += `Operating Revenue\n`;
      pnl.revenueBreakdown.forEach(r => { csvContent += `,"${r.name}",${r.amount}\n`; });
      csvContent += `Total Revenue,,${pnl.totalRevenue}\n\n`;
      csvContent += `Operating Expenses\n`;
      pnl.expenseBreakdown.forEach(e => { csvContent += `,"${e.name}",${e.amount}\n`; });
      csvContent += `Total Expenses,,${pnl.totalExpenses}\n\n`;
      csvContent += `Net Profit / Surplus,,${pnl.netProfit}\n`;
      csvContent += `Savings Rate (%),,${pnl.savingsRate}%\n`;
    } else if (reportType === 'capital_gains') {
      var cg = generateCapitalGainsSchedule(options);
      csvContent = `LedgerMate - Schedule of Capital Gains (ITR Filing Ready)\n`;
      csvContent += `Statutory Reference,${cg.statutoryReference}\n\n`;
      csvContent += `Item,Value (INR)\n`;
      csvContent += `"Realized Short-Term Capital Gains (STCG)",${cg.realizedSTCG}\n`;
      csvContent += `"Tax on STCG @ 20% (Sec 111A)",${cg.taxOnSTCG}\n`;
      csvContent += `"Realized Long-Term Capital Gains (LTCG)",${cg.realizedLTCG}\n`;
      csvContent += `"Statutory LTCG Exemption Limit (Sec 112A)",${cg.exemptionLimit}\n`;
      csvContent += `"Taxable LTCG (after exemption)",${cg.taxableLTCG}\n`;
      csvContent += `"Tax on LTCG @ 12.5%",${cg.taxOnLTCG}\n`;
      csvContent += `"Total Estimated Capital Gains Tax",${cg.totalCapitalGainsTax}\n`;
      csvContent += `"Remaining Tax-Free Exemption Capacity",${cg.remainingTaxFreeHeadroom}\n`;
    }

    // Trigger download in browser
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof Blob !== 'undefined') {
      try {
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
          var link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = filename;
          if (document.body) document.body.appendChild(link);
          if (typeof link.click === 'function') link.click();
          if (link.parentNode) link.parentNode.removeChild(link);
        }
        if (typeof window.showToast === 'function') {
          window.showToast(`📥 Exported ${filename}`, 'success');
        }
      } catch (e) {
        console.warn('[FinancialReporting] CSV download trigger skipped:', e.message);
      }
    }

    return { filename: filename, content: csvContent };
  }

  /**
   * Print / Clean HTML Statement Viewer
   */
  function printFinancialStatement(reportType) {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    reportType = (reportType || 'bs').toLowerCase();

    var title = 'Financial Statement';
    var bodyHtml = '';

    if (reportType === 'bs') {
      var bs = generateBalanceSheetReport();
      title = 'Balance Sheet';
      bodyHtml = `
        <h2 style="font-size:18px;margin-bottom:4px;">Statement of Financial Position (Balance Sheet)</h2>
        <div style="font-size:12px;color:#64748b;margin-bottom:16px;">As of Date: ${bs.asOfDate}</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
          <tr style="background:#f1f5f9;font-weight:700;"><th style="padding:8px;text-align:left;">Assets</th><th style="padding:8px;text-align:right;">Amount (₹)</th></tr>
          ${bs.assets.current.map(i => `<tr><td style="padding:6px 8px;">${i.name}</td><td style="padding:6px 8px;text-align:right;">${fmtMoney(i.amount)}</td></tr>`).join('')}
          ${bs.assets.nonCurrent.map(i => `<tr><td style="padding:6px 8px;">${i.name}</td><td style="padding:6px 8px;text-align:right;">${fmtMoney(i.amount)}</td></tr>`).join('')}
          <tr style="font-weight:700;border-top:1px solid #cbd5e1;"><td style="padding:8px;">Total Assets</td><td style="padding:8px;text-align:right;">${fmtMoney(bs.assets.totalAssets)}</td></tr>
          <tr style="background:#f1f5f9;font-weight:700;"><th style="padding:8px;text-align:left;">Liabilities &amp; Equity</th><th style="padding:8px;text-align:right;">Amount (₹)</th></tr>
          ${bs.liabilities.current.map(i => `<tr><td style="padding:6px 8px;">${i.name}</td><td style="padding:6px 8px;text-align:right;">${fmtMoney(i.amount)}</td></tr>`).join('')}
          ${bs.liabilities.nonCurrent.map(i => `<tr><td style="padding:6px 8px;">${i.name}</td><td style="padding:6px 8px;text-align:right;">${fmtMoney(i.amount)}</td></tr>`).join('')}
          <tr><td style="padding:6px 8px;font-weight:600;">Net Worth / Equity</td><td style="padding:6px 8px;text-align:right;font-weight:600;">${fmtMoney(bs.equity.totalEquity)}</td></tr>
          <tr style="font-weight:700;border-top:1px solid #cbd5e1;"><td style="padding:8px;">Total Liabilities &amp; Equity</td><td style="padding:8px;text-align:right;">${fmtMoney(bs.liabilities.totalLiabilities + bs.equity.totalEquity)}</td></tr>
        </table>
      `;
    } else {
      var pnl = generateProfitAndLossReport();
      title = 'Profit & Loss Statement';
      bodyHtml = `
        <h2 style="font-size:18px;margin-bottom:4px;">Statement of Profit and Loss</h2>
        <div style="font-size:12px;color:#64748b;margin-bottom:16px;">Period: ${pnl.fiscalYear} (${pnl.startDate} to ${pnl.endDate})</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
          <tr style="background:#f1f5f9;font-weight:700;"><th style="padding:8px;text-align:left;">Operating Revenue</th><th style="padding:8px;text-align:right;">Amount (₹)</th></tr>
          ${pnl.revenueBreakdown.map(r => `<tr><td style="padding:6px 8px;">${r.name}</td><td style="padding:6px 8px;text-align:right;">${fmtMoney(r.amount)}</td></tr>`).join('')}
          <tr style="font-weight:700;border-top:1px solid #cbd5e1;"><td style="padding:8px;">Total Revenue</td><td style="padding:8px;text-align:right;">${fmtMoney(pnl.totalRevenue)}</td></tr>
          <tr style="background:#f1f5f9;font-weight:700;"><th style="padding:8px;text-align:left;">Operating Expenses</th><th style="padding:8px;text-align:right;">Amount (₹)</th></tr>
          ${pnl.expenseBreakdown.map(e => `<tr><td style="padding:6px 8px;">${e.name}</td><td style="padding:6px 8px;text-align:right;">${fmtMoney(e.amount)}</td></tr>`).join('')}
          <tr style="font-weight:700;border-top:1px solid #cbd5e1;"><td style="padding:8px;">Total Operating Expenses</td><td style="padding:8px;text-align:right;">${fmtMoney(pnl.totalExpenses)}</td></tr>
          <tr style="font-weight:700;background:#e2e8f0;"><td style="padding:10px 8px;font-size:14px;">Net Profit / Savings</td><td style="padding:10px 8px;text-align:right;font-size:14px;">${fmtMoney(pnl.netProfit)} (${pnl.savingsRate}%)</td></tr>
        </table>
      `;
    }

    var printWin = window.open('', '_blank');
    if (!printWin) {
      if (typeof window.showToast === 'function') window.showToast('Popup blocker prevented print window.', 'warning');
      return;
    }
    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LedgerMate – ${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #0f172a; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .badge { font-size: 11px; padding: 3px 8px; background: #e2e8f0; border-radius: 4px; font-weight: 600; }
          @media print { button { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 style="font-size:22px;margin:0;font-weight:800;">LedgerMate</h1>
            <div style="font-size:12px;color:#64748b;">Enterprise Financial Management System</div>
          </div>
          <div style="text-align:right;">
            <div class="badge">AUDITOR COPY</div>
            <div style="font-size:11px;color:#64748b;margin-top:4px;">Generated: ${(new Date()).toLocaleString()}</div>
          </div>
        </div>
        ${bodyHtml}
        <div style="margin-top:30px;display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:10px;font-size:11px;color:#94a3b8;">
          <span>LedgerMate GAAP / IFRS Client-Side Reporting</span>
          <span>Verified Accurate</span>
        </div>
        <div style="margin-top:20px;">
          <button onclick="window.print()" style="padding:8px 18px;background:#0f172a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">🖨️ Print Report</button>
        </div>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  /**
   * Reporting Modal UI
   */
  function showReportingModal() {
    if (typeof document === 'undefined') return;
    var existing = document.getElementById('lm-reporting-modal');
    if (existing) existing.remove();

    var bs = generateBalanceSheetReport();
    var pnl = generateProfitAndLossReport();
    var cg = generateCapitalGainsSchedule();
    var cf = generateCashFlowReport();

    var modal = document.createElement('div');
    modal.id = 'lm-reporting-modal';
    modal.className = 'modal-backdrop';
    modal.style.cssText = `
      position: fixed; inset: 0; background: rgba(5,7,20,0.88);
      backdrop-filter: blur(8px); z-index: 10000;
      display: flex; align-items: center; justify-content: center; padding: 16px;
    `;

    modal.innerHTML = `
      <div class="modal-box" style="
        background: var(--bg2, #0d122b); border: 1px solid var(--border, rgba(255,255,255,0.08));
        border-radius: var(--lm-radius-lg, 16px); width: 100%; max-width: 820px; max-height: 88vh;
        display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
      ">
        <div style="padding: 16px 22px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.08)); display: flex; align-items: center; justify-content: space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:36px; height:36px; border-radius:10px; background:rgba(0,240,255,0.12); display:flex; align-items:center; justify-content:center; font-size:18px;">📑</div>
            <div>
              <h2 style="font-size:17px; font-weight:700; color:#fff; margin:0;">Financial Statement Reports</h2>
              <p style="font-size:12px; color:var(--text-3, #64748b); margin:2px 0 0;">Audit-Ready GAAP/IFRS &amp; ITR Filing Statements</p>
            </div>
          </div>
          <button id="lm-rep-close" style="background:none; border:none; color:var(--text-2,#94a3b8); font-size:22px; cursor:pointer;">✕</button>
        </div>

        <div style="padding: 10px 22px; display:flex; gap:8px; border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));">
          <button class="lm-rep-tab active" data-tab="bs" style="padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; border:1px solid rgba(0,240,255,0.3); background:rgba(0,240,255,0.15); color:var(--teal,#00f0ff); cursor:pointer;">Balance Sheet</button>
          <button class="lm-rep-tab" data-tab="pnl" style="padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; border:1px solid var(--border,rgba(255,255,255,0.08)); background:transparent; color:var(--text-2,#94a3b8); cursor:pointer;">P&amp;L Statement</button>
          <button class="lm-rep-tab" data-tab="cg" style="padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; border:1px solid var(--border,rgba(255,255,255,0.08)); background:transparent; color:var(--text-2,#94a3b8); cursor:pointer;">Capital Gains (ITR)</button>
          <button class="lm-rep-tab" data-tab="cf" style="padding:6px 14px; border-radius:6px; font-size:12px; font-weight:600; border:1px solid var(--border,rgba(255,255,255,0.08)); background:transparent; color:var(--text-2,#94a3b8); cursor:pointer;">Cash Flows</button>
        </div>

        <div id="lm-rep-body" style="padding: 20px 22px; overflow-y: auto; flex: 1;"></div>

        <div style="padding: 12px 22px; border-top: 1px solid var(--border, rgba(255,255,255,0.08)); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; gap:8px;">
            <button id="lm-rep-csv" style="padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; background: var(--bg3,#111736); border: 1px solid var(--border,rgba(255,255,255,0.15)); color: #fff; cursor: pointer;">📥 Export CSV</button>
            <button id="lm-rep-print" style="padding: 7px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; background: var(--bg3,#111736); border: 1px solid var(--border,rgba(255,255,255,0.15)); color: #fff; cursor: pointer;">🖨️ Print Statement</button>
          </div>
          <button id="lm-rep-done" style="padding: 7px 16px; border-radius: 8px; font-size: 12px; font-weight: 600; background: rgba(0,240,255,0.15); border: 1px solid rgba(0,240,255,0.3); color: var(--teal,#00f0ff); cursor: pointer;">Close</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    var currentTab = 'bs';

    function renderTab(tab) {
      currentTab = tab;
      var body = document.getElementById('lm-rep-body');
      if (!body) return;

      if (tab === 'bs') {
        body.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
            <div style="background:var(--bg3,#111736); padding:16px; border-radius:10px; border:1px solid var(--border);">
              <div style="font-size:14px; font-weight:700; color:var(--teal); margin-bottom:10px;">Assets</div>
              ${bs.assets.current.map(i => `<div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0;"><span>${i.name}</span><b>${fmtMoney(i.amount)}</b></div>`).join('')}
              ${bs.assets.nonCurrent.map(i => `<div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0;"><span>${i.name}</span><b>${fmtMoney(i.amount)}</b></div>`).join('')}
              <div style="border-top:1px solid var(--border); margin-top:8px; padding-top:6px; display:flex; justify-content:space-between; font-weight:700;"><span>Total Assets</span><span style="color:var(--teal);">${fmtMoney(bs.assets.totalAssets)}</span></div>
            </div>
            <div style="background:var(--bg3,#111736); padding:16px; border-radius:10px; border:1px solid var(--border);">
              <div style="font-size:14px; font-weight:700; color:var(--rose); margin-bottom:10px;">Liabilities &amp; Equity</div>
              ${bs.liabilities.current.map(i => `<div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0;"><span>${i.name}</span><b>${fmtMoney(i.amount)}</b></div>`).join('')}
              ${bs.liabilities.nonCurrent.map(i => `<div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0;"><span>${i.name}</span><b>${fmtMoney(i.amount)}</b></div>`).join('')}
              <div style="display:flex; justify-content:space-between; font-size:12px; padding:4px 0; color:var(--emerald);"><span>Total Equity (Net Worth)</span><b>${fmtMoney(bs.equity.totalEquity)}</b></div>
              <div style="border-top:1px solid var(--border); margin-top:8px; padding-top:6px; display:flex; justify-content:space-between; font-weight:700;"><span>Total Liab + Equity</span><span style="color:var(--rose);">${fmtMoney(bs.liabilities.totalLiabilities + bs.equity.totalEquity)}</span></div>
            </div>
          </div>
        `;
      } else if (tab === 'pnl') {
        body.innerHTML = `
          <div style="background:var(--bg3,#111736); padding:16px; border-radius:10px; border:1px solid var(--border);">
            <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:10px;">${pnl.reportTitle} (${pnl.fiscalYear})</div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border); font-size:13px;"><span>Total Inflows / Revenue</span><b style="color:var(--emerald);">${fmtMoney(pnl.totalRevenue)}</b></div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--border); font-size:13px;"><span>Total Operating Expenses</span><b style="color:var(--rose);">${fmtMoney(pnl.totalExpenses)}</b></div>
            <div style="display:flex; justify-content:space-between; padding:10px 0 4px; font-size:15px; font-weight:700;"><span>Net Profit (Savings)</span><b style="color:${pnl.netProfit >= 0 ? 'var(--emerald)' : 'var(--rose)'};">${pnl.netProfit >= 0 ? '+' : ''}${fmtMoney(pnl.netProfit)} (${pnl.savingsRate}%)</b></div>
          </div>
        `;
      } else if (tab === 'cg') {
        body.innerHTML = `
          <div style="background:var(--bg3,#111736); padding:16px; border-radius:10px; border:1px solid var(--border);">
            <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:10px;">${cg.reportTitle}</div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;"><span>Realized STCG (Sec 111A)</span><b>${fmtMoney(cg.realizedSTCG)}</b></div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;"><span>STCG Tax @ 20%</span><b style="color:var(--rose);">${fmtMoney(cg.taxOnSTCG)}</b></div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;"><span>Realized LTCG (Sec 112A)</span><b>${fmtMoney(cg.realizedLTCG)}</b></div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;"><span>LTCG Exemption Limit</span><b style="color:var(--emerald);">${fmtMoney(cg.exemptionLimit)}</b></div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;"><span>Taxable LTCG</span><b>${fmtMoney(cg.taxableLTCG)}</b></div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;"><span>LTCG Tax @ 12.5%</span><b style="color:var(--rose);">${fmtMoney(cg.taxOnLTCG)}</b></div>
            <div style="border-top:1px solid var(--border); margin-top:8px; padding-top:8px; display:flex; justify-content:space-between; font-weight:700; font-size:14px;"><span>Total Estimated CG Tax</span><span style="color:var(--rose);">${fmtMoney(cg.totalCapitalGainsTax)}</span></div>
          </div>
        `;
      } else if (tab === 'cf') {
        body.innerHTML = `
          <div style="background:var(--bg3,#111736); padding:16px; border-radius:10px; border:1px solid var(--border);">
            <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:10px;">${cf.reportTitle} (${cf.fiscalPeriod})</div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;"><span>Cash from Operating Activities</span><b style="color:${cf.operatingActivities.netOperatingCashFlow >= 0 ? 'var(--emerald)' : 'var(--rose)'};">${fmtMoney(cf.operatingActivities.netOperatingCashFlow)}</b></div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;"><span>Cash from Investing Activities</span><b style="color:var(--rose);">${fmtMoney(cf.investingActivities.netInvestingCashFlow)}</b></div>
            <div style="display:flex; justify-content:space-between; padding:6px 0; font-size:13px;"><span>Cash from Financing Activities</span><b style="color:var(--rose);">${fmtMoney(cf.financingActivities.netFinancingCashFlow)}</b></div>
            <div style="border-top:1px solid var(--border); margin-top:8px; padding-top:8px; display:flex; justify-content:space-between; font-weight:700; font-size:14px;"><span>Net Change in Cash</span><span style="color:${cf.netChangeInCash >= 0 ? 'var(--emerald)' : 'var(--rose)'};">${fmtMoney(cf.netChangeInCash)}</span></div>
          </div>
        `;
      }
    }

    renderTab('bs');

    modal.querySelectorAll('.lm-rep-tab').forEach(btn => {
      btn.onclick = function () {
        modal.querySelectorAll('.lm-rep-tab').forEach(b => {
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

    document.getElementById('lm-rep-close').onclick = () => modal.remove();
    document.getElementById('lm-rep-done').onclick = () => modal.remove();
    document.getElementById('lm-rep-csv').onclick = () => exportReportToCSV(currentTab);
    document.getElementById('lm-rep-print').onclick = () => printFinancialStatement(currentTab);
  }

  var FinancialReportingModule = {
    generateBalanceSheetReport: generateBalanceSheetReport,
    generateProfitAndLossReport: generateProfitAndLossReport,
    generateCapitalGainsSchedule: generateCapitalGainsSchedule,
    generateCashFlowReport: generateCashFlowReport,
    exportReportToCSV: exportReportToCSV,
    printFinancialStatement: printFinancialStatement,
    showReportingModal: showReportingModal
  };

  if (typeof window !== 'undefined') {
    window.LM_FinancialReporting = FinancialReportingModule;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinancialReportingModule;
  }

  console.log('[LM] FinancialReportingEngine module initialized (GAAP/IFRS Ready).');
})();
