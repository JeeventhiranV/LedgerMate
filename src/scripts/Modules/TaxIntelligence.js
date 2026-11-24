/**
 * LedgerMate – TaxIntelligence.js
 * ─────────────────────────────────────────────────────────────
 * Advanced Indian Tax & Capital Gains Harvesting Engine.
 * Built for Budget 2024 compliance (FY 2024-25 / AY 2025-26 & FY 2025-26).
 * Features:
 *   1. New vs Old Regime Comparator with Section 87A rebate & marginal relief.
 *   2. Capital Gains Harvester: STCG (20%) & LTCG (12.5% with ₹1.25L exemption).
 *   3. Tax-Gain & Tax-Loss Harvesting recommendations for stock/MF portfolios.
 *   4. Advance Tax quarterly installment schedule & Section 234B/234C penalties.
 * Exposes: window.LM_TaxIntelligence
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // FY 2024-25 / AY 2025-26 Standard Deductions
  var STD_DEDUCTION_NEW = 75000;
  var STD_DEDUCTION_OLD = 50000;

  // Capital Gains Tax Parameters (Budget 2024 post-July 23, 2024)
  var LTCG_EQUITY_EXEMPTION = 125000; // ₹1.25 Lakhs per FY
  var LTCG_EQUITY_RATE = 0.125;       // 12.5%
  var STCG_EQUITY_RATE = 0.20;        // 20.0%

  /**
   * Helper to format money amounts in INR notation
   */
  function fmtMoney(amount) {
    if (typeof window !== 'undefined' && window.LM_Currency && typeof window.LM_Currency.formatINR === 'function') {
      return window.LM_Currency.formatINR(amount);
    }
    var num = parseFloat(amount || 0);
    return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  /**
   * Computes New Tax Regime (Section 115BAC) under Budget 2024
   * @param {number} taxableIncome - Income after standard deduction
   * @returns {number} Tax before rebate & cess
   */
  function computeNewRegimeTax(taxableIncome) {
    if (taxableIncome <= 300000) return 0;
    var tax = 0;
    var bands = [
      [300000, 700000, 0.05],
      [700000, 1000000, 0.10],
      [1000000, 1200000, 0.15],
      [1200000, 1500000, 0.20],
      [1500000, Infinity, 0.30]
    ];
    for (var i = 0; i < bands.length; i++) {
      var lo = bands[i][0];
      var hi = bands[i][1];
      var rate = bands[i][2];
      if (taxableIncome > lo) {
        tax += (Math.min(taxableIncome, hi) - lo) * rate;
      }
    }
    return tax;
  }

  /**
   * Computes Old Tax Regime
   * @param {number} taxableIncome 
   * @param {string} ageGroup - 'below60', 'senior' (60-79), 'super' (80+)
   * @returns {number} Tax before rebate & cess
   */
  function computeOldRegimeTax(taxableIncome, ageGroup) {
    var exempt = (ageGroup === 'super') ? 500000 : (ageGroup === 'senior') ? 300000 : 250000;
    if (taxableIncome <= exempt) return 0;
    var tax = 0;
    var bands = [
      [exempt, 500000, 0.05],
      [500000, 1000000, 0.20],
      [1000000, Infinity, 0.30]
    ];
    for (var i = 0; i < bands.length; i++) {
      var lo = bands[i][0];
      var hi = bands[i][1];
      var rate = bands[i][2];
      if (taxableIncome > lo) {
        tax += (Math.min(taxableIncome, hi) - lo) * rate;
      }
    }
    return tax;
  }

  /**
   * Computes high-income surcharge
   */
  function computeSurcharge(tax, income, isNewRegime) {
    if (income <= 5000000) return 0;
    if (income <= 10000000) return tax * 0.10;
    if (income <= 20000000) return tax * 0.15;
    // In New Regime, surcharge is capped at 25% for income > 2 Cr
    if (isNewRegime) return tax * 0.25;
    if (income <= 50000000) return tax * 0.25;
    return tax * 0.37;
  }

  /**
   * Full Income Tax comparison between Old and New Regimes
   * @param {number} grossIncome 
   * @param {Object} deductions - { c80C, c80D, c80CCD, hra, homeLoanInterest, other }
   * @param {Object} options - { ageGroup: 'below60'|'senior'|'super', isSalaried: true }
   * @returns {Object} Comprehensive tax comparison result
   */
  function calculateIncomeTax(grossIncome, deductions, options) {
    grossIncome = Math.max(0, parseFloat(grossIncome) || 0);
    deductions = deductions || {};
    options = options || {};
    var ageGroup = options.ageGroup || 'below60';
    var isSalaried = options.isSalaried !== false; // Default true

    // --- 1. NEW REGIME CALCULATION ---
    var stdNew = isSalaried ? STD_DEDUCTION_NEW : 0;
    var taxableNew = Math.max(0, grossIncome - stdNew);
    var rawNewTax = computeNewRegimeTax(taxableNew);

    // Section 87A Rebate for New Regime:
    // If taxable income <= ₹7,00,000, rebate is full tax (up to ₹25,000)
    var rebateNew = 0;
    if (taxableNew <= 700000) {
      rebateNew = Math.min(rawNewTax, 25000);
    }
    var taxAfterRebateNew = Math.max(0, rawNewTax - rebateNew);

    // Marginal Relief for New Regime (if income marginally exceeds ₹7 Lakhs)
    if (taxableNew > 700000 && taxableNew <= 727777) {
      var excessIncome = taxableNew - 700000;
      if (taxAfterRebateNew > excessIncome) {
        taxAfterRebateNew = excessIncome;
      }
    }

    var surchargeNew = computeSurcharge(taxAfterRebateNew, grossIncome, true);
    var cessNew = (taxAfterRebateNew + surchargeNew) * 0.04;
    var finalNewTax = Math.round(taxAfterRebateNew + surchargeNew + cessNew);
    var effRateNew = grossIncome > 0 ? (finalNewTax / grossIncome * 100).toFixed(2) : '0.00';

    // --- 2. OLD REGIME CALCULATION ---
    var stdOld = isSalaried ? STD_DEDUCTION_OLD : 0;
    var c80C = Math.min(parseFloat(deductions.c80C || 0), 150000);
    var max80D = (ageGroup === 'senior' || ageGroup === 'super') ? 50000 : 25000;
    var c80D = Math.min(parseFloat(deductions.c80D || 0), max80D);
    var c80CCD = Math.min(parseFloat(deductions.c80CCD || 0), 50000); // NPS
    var homeLoanInt = Math.min(parseFloat(deductions.homeLoanInterest || 0), 200000);
    var hra = parseFloat(deductions.hra || 0);
    var other = parseFloat(deductions.other || 0);

    var totalOldDeductions = stdOld + c80C + c80D + c80CCD + homeLoanInt + hra + other;
    var taxableOld = Math.max(0, grossIncome - totalOldDeductions);
    var rawOldTax = computeOldRegimeTax(taxableOld, ageGroup);

    // Section 87A Rebate for Old Regime (taxable income <= ₹5,00,000)
    var rebateOld = 0;
    if (taxableOld <= 500000) {
      rebateOld = Math.min(rawOldTax, 12500);
    }
    var taxAfterRebateOld = Math.max(0, rawOldTax - rebateOld);
    var surchargeOld = computeSurcharge(taxAfterRebateOld, grossIncome, false);
    var cessOld = (taxAfterRebateOld + surchargeOld) * 0.04;
    var finalOldTax = Math.round(taxAfterRebateOld + surchargeOld + cessOld);
    var effRateOld = grossIncome > 0 ? (finalOldTax / grossIncome * 100).toFixed(2) : '0.00';

    // Comparison & Recommendation
    var savings = finalOldTax - finalNewTax;
    var recommendedRegime = 'same';
    if (savings > 50) {
      recommendedRegime = 'new';
    } else if (savings < -50) {
      recommendedRegime = 'old';
    }

    return {
      grossIncome: grossIncome,
      ageGroup: ageGroup,
      isSalaried: isSalaried,
      newRegime: {
        standardDeduction: stdNew,
        taxableIncome: taxableNew,
        rawTax: rawNewTax,
        rebate87A: rebateNew,
        surcharge: surchargeNew,
        cess: cessNew,
        finalTax: finalNewTax,
        effectiveRate: effRateNew
      },
      oldRegime: {
        standardDeduction: stdOld,
        deductions80C: c80C,
        deductions80D: c80D,
        deductions80CCD: c80CCD,
        homeLoanInterest: homeLoanInt,
        hra: hra,
        otherDeductions: other,
        totalDeductions: totalOldDeductions,
        taxableIncome: taxableOld,
        rawTax: rawOldTax,
        rebate87A: rebateOld,
        surcharge: surchargeOld,
        cess: cessOld,
        finalTax: finalOldTax,
        effectiveRate: effRateOld
      },
      comparison: {
        recommendedRegime: recommendedRegime,
        taxSavings: Math.abs(savings),
        cheaperBy: Math.abs(savings),
        headroom80C: Math.max(0, 150000 - c80C)
      }
    };
  }

  /**
   * Capital Gains Tax Calculation & Harvesting Advisor
   * Post Budget 2024:
   *   STCG (Equity < 12m): 20%
   *   LTCG (Equity >= 12m): 12.5% on gains exceeding ₹1.25 Lakh exemption
   * @param {Array} stocks - Stock positions or sales
   * @param {Array} investments - Mutual fund or asset holdings
   * @returns {Object} Capital gains audit and harvesting insights
   */
  function getCapitalGainsSummary(stocks, investments) {
    var realizedSTCG = 0;
    var realizedLTCG = 0;
    var unrealizedSTCG = 0;
    var unrealizedLTCG = 0;

    var unrealizedGainsList = [];
    var unrealizedLossList = [];

    // Analyze stocks
    (stocks || []).forEach(function (s) {
      var qty = parseFloat(s.quantity || s.qty || 0);
      var buyPrice = parseFloat(s.avgBuyPrice || s.buyPrice || 0);
      var curPrice = parseFloat(s.currentPrice || s.price || buyPrice);
      var holdingPeriodDays = parseInt(s.holdingPeriodDays || 0, 10);

      // If holding period is not recorded, estimate from purchase date
      if (!holdingPeriodDays && s.buyDate) {
        var d = new Date(s.buyDate);
        if (!isNaN(d.getTime())) {
          holdingPeriodDays = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
        }
      }

      var isLongTerm = holdingPeriodDays >= 365;
      var pnl = (curPrice - buyPrice) * qty;

      if (pnl > 0) {
        if (isLongTerm) {
          unrealizedLTCG += pnl;
          unrealizedGainsList.push({ name: s.symbol || s.name, type: 'LTCG', gain: pnl, days: holdingPeriodDays });
        } else {
          unrealizedSTCG += pnl;
          unrealizedGainsList.push({ name: s.symbol || s.name, type: 'STCG', gain: pnl, days: holdingPeriodDays });
        }
      } else if (pnl < 0) {
        unrealizedLossList.push({
          name: s.symbol || s.name,
          type: isLongTerm ? 'LTCL' : 'STCL',
          loss: Math.abs(pnl),
          days: holdingPeriodDays
        });
      }

      // Check for realized P&L records
      if (s.realizedPnL !== undefined) {
        var rPnl = parseFloat(s.realizedPnL || 0);
        if (isLongTerm) realizedLTCG += rPnl;
        else realizedSTCG += rPnl;
      }
    });

    // Analyze mutual funds and other investments
    (investments || []).forEach(function (inv) {
      var invested = parseFloat(inv.amount || inv.invested || 0);
      var currentVal = parseFloat(inv.currentValue || invested);
      var pnl = currentVal - invested;
      var isLongTerm = inv.holdingType === 'LTCG' || (inv.tenureMonths && inv.tenureMonths >= 12);

      if (pnl > 0) {
        if (isLongTerm) unrealizedLTCG += pnl;
        else unrealizedSTCG += pnl;
      } else if (pnl < 0) {
        unrealizedLossList.push({
          name: inv.name || 'Mutual Fund',
          type: isLongTerm ? 'LTCL' : 'STCL',
          loss: Math.abs(pnl),
          days: 0
        });
      }
    });

    // Realized Taxes
    var taxableRealizedLTCG = Math.max(0, realizedLTCG - LTCG_EQUITY_EXEMPTION);
    var taxLTCG = taxableRealizedLTCG * LTCG_EQUITY_RATE;
    var taxSTCG = Math.max(0, realizedSTCG) * STCG_EQUITY_RATE;
    var totalCapitalGainsTax = Math.round((taxLTCG + taxSTCG) * 1.04); // including 4% cess

    // Harvesting Capacity:
    // User can book up to ₹1.25L LTCG every financial year completely tax-free!
    var exemptionUsed = Math.min(Math.max(0, realizedLTCG), LTCG_EQUITY_EXEMPTION);
    var remainingExemption = Math.max(0, LTCG_EQUITY_EXEMPTION - exemptionUsed);
    var harvestableTaxFreeLTCG = Math.min(unrealizedLTCG, remainingExemption);
    var taxSavedByHarvesting = Math.round(harvestableTaxFreeLTCG * LTCG_EQUITY_RATE * 1.04);

    return {
      realized: {
        stcg: Math.round(realizedSTCG * 100) / 100,
        ltcg: Math.round(realizedLTCG * 100) / 100,
        taxableLtcg: Math.round(taxableRealizedLTCG * 100) / 100,
        taxStcg: Math.round(taxSTCG * 100) / 100,
        taxLtcg: Math.round(taxLTCG * 100) / 100,
        totalTax: totalCapitalGainsTax
      },
      unrealized: {
        stcg: Math.round(unrealizedSTCG * 100) / 100,
        ltcg: Math.round(unrealizedLTCG * 100) / 100,
        totalGains: Math.round((unrealizedSTCG + unrealizedLTCG) * 100) / 100
      },
      harvesting: {
        annualExemptionLimit: LTCG_EQUITY_EXEMPTION,
        exemptionUsed: exemptionUsed,
        remainingExemption: remainingExemption,
        recommendedLtcgToHarvest: Math.round(harvestableTaxFreeLTCG * 100) / 100,
        potentialTaxSaved: taxSavedByHarvesting,
        taxLossHarvestingOpportunities: unrealizedLossList
      }
    };
  }

  /**
   * Advance Tax Schedule & Section 234B/234C Penalty Estimator
   * Applicable if total net tax liability after TDS exceeds ₹10,000.
   * Installments:
   *   1. 15% by 15th June
   *   2. 45% by 15th September
   *   3. 75% by 15th December
   *   4. 100% by 15th March
   * @param {number} totalEstimatedTax 
   * @param {number} tdsPaid 
   * @returns {Object} Installments breakdown, due dates, and penalty forecasts
   */
  function getAdvanceTaxSchedule(totalEstimatedTax, tdsPaid) {
    totalEstimatedTax = Math.max(0, parseFloat(totalEstimatedTax) || 0);
    tdsPaid = Math.max(0, parseFloat(tdsPaid) || 0);
    var netTax = Math.max(0, totalEstimatedTax - tdsPaid);
    var isApplicable = netTax >= 10000;

    var currentYear = (new Date()).getFullYear();
    var currentMonth = (new Date()).getMonth(); // 0-indexed (0=Jan, 2=Mar, 5=Jun)
    var fyYear = currentMonth >= 3 ? currentYear : currentYear - 1;

    var installments = [
      {
        quarter: 'Q1',
        name: '1st Installment (15%)',
        targetPct: 0.15,
        targetAmount: Math.round(netTax * 0.15),
        dueDate: `${fyYear}-06-15`,
        displayDate: `15 June ${fyYear}`
      },
      {
        quarter: 'Q2',
        name: '2nd Installment (45%)',
        targetPct: 0.45,
        targetAmount: Math.round(netTax * 0.45),
        dueDate: `${fyYear}-09-15`,
        displayDate: `15 September ${fyYear}`
      },
      {
        quarter: 'Q3',
        name: '3rd Installment (75%)',
        targetPct: 0.75,
        targetAmount: Math.round(netTax * 0.75),
        dueDate: `${fyYear}-12-15`,
        displayDate: `15 December ${fyYear}`
      },
      {
        quarter: 'Q4',
        name: '4th Installment (100%)',
        targetPct: 1.00,
        targetAmount: Math.round(netTax * 1.00),
        dueDate: `${fyYear + 1}-03-15`,
        displayDate: `15 March ${fyYear + 1}`
      }
    ];

    // Find next upcoming milestone
    var todayStr = (new Date()).toISOString().slice(0, 10);
    var nextMilestone = installments.find(inst => inst.dueDate >= todayStr) || installments[3];

    return {
      totalEstimatedTax: totalEstimatedTax,
      tdsPaid: tdsPaid,
      netAdvanceTaxLiability: netTax,
      isApplicable: isApplicable,
      installments: installments,
      nextMilestone: nextMilestone,
      section234CNote: 'Section 234C applies simple interest @ 1% per month for shortfall in any quarterly installment.',
      section234BNote: 'Section 234B applies simple interest @ 1% per month if advance tax paid before March 31 is below 90% of assessed tax.'
    };
  }

  /**
   * UI: Render comprehensive 3-tab Tax Planner in LedgerMate
   * @param {string} containerId - Element ID (default 'taxPlannerContent')
   */
  function renderTaxPlannerUI(containerId) {
    if (typeof document === 'undefined') return;
    var el = document.getElementById(containerId || 'taxPlannerContent');
    if (!el) return;

    var txs = (typeof window !== 'undefined' && window.state && Array.isArray(window.state.transactions))
      ? window.state.transactions
      : [];

    var now = new Date();
    var fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    var fyStart = `${fy}-04-01`, fyEnd = `${fy + 1}-03-31`;

    var annualIncome = txs
      .filter(t => t.type === 'income' || t.type === 'in')
      .filter(t => t.date >= fyStart && t.date <= fyEnd)
      .reduce((s, t) => s + parseFloat(t.amount || 0), 0);

    el.innerHTML = `
      <div style="display:flex; gap:8px; margin-bottom:16px; border-bottom:1px solid var(--border,rgba(255,255,255,0.08)); padding-bottom:10px;">
        <button class="lm-tax-tab-btn active" data-tax-tab="comparator" style="padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; border:1px solid rgba(0,240,255,0.3); background:rgba(0,240,255,0.15); color:var(--teal,#00f0ff); cursor:pointer;">
          📊 Income Tax Comparator (Budget 2024)
        </button>
        <button class="lm-tax-tab-btn" data-tax-tab="capital-gains" style="padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; border:1px solid var(--border,rgba(255,255,255,0.08)); background:transparent; color:var(--text-2,#94a3b8); cursor:pointer;">
          🌾 Capital Gains &amp; Harvesting
        </button>
        <button class="lm-tax-tab-btn" data-tax-tab="advance-tax" style="padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; border:1px solid var(--border,rgba(255,255,255,0.08)); background:transparent; color:var(--text-2,#94a3b8); cursor:pointer;">
          📅 Advance Tax Calendar
        </button>
      </div>

      <div id="lm-tax-tab-content"></div>
    `;

    function renderComparatorTab() {
      var content = document.getElementById('lm-tax-tab-content');
      if (!content) return;

      content.innerHTML = `
        <div class="tx-card" style="margin-bottom:16px; background:var(--bg2,#0d122b); border:1px solid var(--border,rgba(255,255,255,0.08)); border-radius:12px; padding:18px;">
          <div class="section-heading" style="margin-bottom:14px;">
            <div class="section-title" style="font-size:15px; font-weight:700; color:#fff;">
              <span class="dot" style="background:var(--gold,#fbbf24)"></span>Income &amp; Deductions (FY ${fy}-${fy + 1})
            </div>
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
            <div>
              <label class="form-label" style="font-size:11px; color:var(--text-3,#64748b);">Gross Annual Income (₹)</label>
              <input type="number" id="taxIncome" class="form-input" value="${Math.round(annualIncome || 1200000)}" style="width:100%;" placeholder="Gross annual income">
            </div>
            <div>
              <label class="form-label" style="font-size:11px; color:var(--text-3,#64748b);">Age Category</label>
              <select id="taxAge" class="form-input" style="width:100%;">
                <option value="below60">Below 60 (Standard)</option>
                <option value="senior">60–79 (Senior Citizen)</option>
                <option value="super">80+ (Super Senior)</option>
              </select>
            </div>
            <div>
              <label class="form-label" style="font-size:11px; color:var(--text-3,#64748b);">Section 80C (PPF, ELSS, PF, etc. max ₹1.5L)</label>
              <input type="number" id="tax80C" class="form-input" value="150000" style="width:100%;">
            </div>
            <div>
              <label class="form-label" style="font-size:11px; color:var(--text-3,#64748b);">Section 80D Health Insurance (₹)</label>
              <input type="number" id="tax80D" class="form-input" value="25000" style="width:100%;">
            </div>
            <div>
              <label class="form-label" style="font-size:11px; color:var(--text-3,#64748b);">80CCD(1B) NPS Additional (max ₹50k)</label>
              <input type="number" id="tax80CCD" class="form-input" value="50000" style="width:100%;">
            </div>
            <div>
              <label class="form-label" style="font-size:11px; color:var(--text-3,#64748b);">HRA / Rent Exemption (₹)</label>
              <input type="number" id="taxHRA" class="form-input" value="0" style="width:100%;">
            </div>
            <div>
              <label class="form-label" style="font-size:11px; color:var(--text-3,#64748b);">Sec 24 Home Loan Interest (max ₹2L)</label>
              <input type="number" id="taxHomeLoan" class="form-input" value="0" style="width:100%;">
            </div>
            <div>
              <label class="form-label" style="font-size:11px; color:var(--text-3,#64748b);">Other Deductions (80E, 80G, etc.)</label>
              <input type="number" id="taxOther" class="form-input" value="0" style="width:100%;">
            </div>
          </div>
        </div>

        <div id="taxResult"></div>
      `;

      function updateResults() {
        var inc = parseFloat(document.getElementById('taxIncome')?.value || 0);
        var age = document.getElementById('taxAge')?.value || 'below60';
        var c80C = parseFloat(document.getElementById('tax80C')?.value || 0);
        var c80D = parseFloat(document.getElementById('tax80D')?.value || 0);
        var c80CCD = parseFloat(document.getElementById('tax80CCD')?.value || 0);
        var hra = parseFloat(document.getElementById('taxHRA')?.value || 0);
        var homeLoan = parseFloat(document.getElementById('taxHomeLoan')?.value || 0);
        var other = parseFloat(document.getElementById('taxOther')?.value || 0);

        var res = calculateIncomeTax(inc, {
          c80C: c80C,
          c80D: c80D,
          c80CCD: c80CCD,
          hra: hra,
          homeLoanInterest: homeLoan,
          other: other
        }, { ageGroup: age });

        var resEl = document.getElementById('taxResult');
        if (!resEl) return;

        var rec = res.comparison.recommendedRegime;
        var diff = res.comparison.taxSavings;

        resEl.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
            <div class="tx-card" style="padding:16px; border-radius:12px; background:var(--bg2,#0d122b); border: ${rec === 'new' ? '2px solid var(--emerald,#10b981)' : '1px solid var(--border,rgba(255,255,255,0.08))'};">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0; font-size:15px; font-weight:700; color:#fff;">📗 New Regime (Budget 2024)</h3>
                ${rec === 'new' ? `<span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; background:rgba(16,185,129,0.15); color:var(--emerald,#10b981);">✓ Saves ${fmtMoney(diff)}</span>` : ''}
              </div>
              <div style="font-size:12px; color:var(--text-3); margin-bottom:12px;">
                Taxable: <b style="color:var(--text-1); font-family:var(--font-m,monospace);">${fmtMoney(res.newRegime.taxableIncome)}</b> (Standard Deduction: ₹75,000)
              </div>
              <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between;"><span>Basic Tax</span><span>${fmtMoney(res.newRegime.rawTax)}</span></div>
                ${res.newRegime.rebate87A > 0 ? `<div style="display:flex; justify-content:space-between; color:var(--emerald);"><span>Sec 87A Rebate</span><span>−${fmtMoney(res.newRegime.rebate87A)}</span></div>` : ''}
                <div style="display:flex; justify-content:space-between;"><span>4% Cess</span><span>${fmtMoney(res.newRegime.cess)}</span></div>
                <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid var(--border); font-weight:700; font-size:15px;">
                  <span>Final Tax Payable</span><span style="color:var(--rose,#f43f5e); font-family:var(--font-m,monospace);">${fmtMoney(res.newRegime.finalTax)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-3);">
                  <span>Effective Tax Rate</span><span>${res.newRegime.effectiveRate}%</span>
                </div>
              </div>
            </div>

            <div class="tx-card" style="padding:16px; border-radius:12px; background:var(--bg2,#0d122b); border: ${rec === 'old' ? '2px solid var(--emerald,#10b981)' : '1px solid var(--border,rgba(255,255,255,0.08))'};">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0; font-size:15px; font-weight:700; color:#fff;">📘 Old Regime (With Deductions)</h3>
                ${rec === 'old' ? `<span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:6px; background:rgba(16,185,129,0.15); color:var(--emerald,#10b981);">✓ Saves ${fmtMoney(diff)}</span>` : ''}
              </div>
              <div style="font-size:12px; color:var(--text-3); margin-bottom:12px;">
                Taxable: <b style="color:var(--text-1); font-family:var(--font-m,monospace);">${fmtMoney(res.oldRegime.taxableIncome)}</b> (Total Deductions: ${fmtMoney(res.oldRegime.totalDeductions)})
              </div>
              <div style="font-size:12px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between;"><span>Basic Tax</span><span>${fmtMoney(res.oldRegime.rawTax)}</span></div>
                ${res.oldRegime.rebate87A > 0 ? `<div style="display:flex; justify-content:space-between; color:var(--emerald);"><span>Sec 87A Rebate</span><span>−${fmtMoney(res.oldRegime.rebate87A)}</span></div>` : ''}
                <div style="display:flex; justify-content:space-between;"><span>4% Cess</span><span>${fmtMoney(res.oldRegime.cess)}</span></div>
                <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px solid var(--border); font-weight:700; font-size:15px;">
                  <span>Final Tax Payable</span><span style="color:var(--rose,#f43f5e); font-family:var(--font-m,monospace);">${fmtMoney(res.oldRegime.finalTax)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; color:var(--text-3);">
                  <span>Effective Tax Rate</span><span>${res.oldRegime.effectiveRate}%</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      ['taxIncome', 'taxAge', 'tax80C', 'tax80D', 'tax80CCD', 'taxHRA', 'taxHomeLoan', 'taxOther'].forEach(id => {
        var elem = document.getElementById(id);
        if (elem) elem.oninput = updateResults;
        if (elem && elem.tagName === 'SELECT') elem.onchange = updateResults;
      });

      updateResults();
    }

    function renderCapitalGainsTab() {
      var content = document.getElementById('lm-tax-tab-content');
      if (!content) return;

      var stocks = (typeof window !== 'undefined' && window.state && Array.isArray(window.state.stocks))
        ? window.state.stocks
        : [];
      var investments = (typeof window !== 'undefined' && window.state && Array.isArray(window.state.investments))
        ? window.state.investments
        : [];

      var cg = getCapitalGainsSummary(stocks, investments);

      content.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:16px;">
          <div style="background:var(--bg2,#0d122b); padding:16px; border-radius:12px; border:1px solid var(--border);">
            <div style="font-size:11px; color:var(--text-3);">Annual LTCG Exemption Limit</div>
            <div style="font-size:18px; font-weight:700; font-family:var(--font-m,monospace); color:var(--emerald); margin-top:4px;">
              ${fmtMoney(cg.harvesting.annualExemptionLimit)}
            </div>
            <div style="font-size:11px; color:var(--text-2); margin-top:2px;">Sec 112A (Budget 2024)</div>
          </div>
          <div style="background:var(--bg2,#0d122b); padding:16px; border-radius:12px; border:1px solid var(--border);">
            <div style="font-size:11px; color:var(--text-3);">Remaining Tax-Free Exemption</div>
            <div style="font-size:18px; font-weight:700; font-family:var(--font-m,monospace); color:var(--teal); margin-top:4px;">
              ${fmtMoney(cg.harvesting.remainingExemption)}
            </div>
            <div style="font-size:11px; color:var(--text-2); margin-top:2px;">Available before March 31</div>
          </div>
          <div style="background:var(--bg2,#0d122b); padding:16px; border-radius:12px; border:1px solid var(--border);">
            <div style="font-size:11px; color:var(--text-3);">Tax-Free Harvest Capacity</div>
            <div style="font-size:18px; font-weight:700; font-family:var(--font-m,monospace); color:var(--gold,#fbbf24); margin-top:4px;">
              ${fmtMoney(cg.harvesting.recommendedLtcgToHarvest)}
            </div>
            <div style="font-size:11px; color:var(--text-2); margin-top:2px;">Saves up to ${fmtMoney(cg.harvesting.potentialTaxSaved)}</div>
          </div>
          <div style="background:var(--bg2,#0d122b); padding:16px; border-radius:12px; border:1px solid var(--border);">
            <div style="font-size:11px; color:var(--text-3);">Realized Capital Gains Tax</div>
            <div style="font-size:18px; font-weight:700; font-family:var(--font-m,monospace); color:var(--rose); margin-top:4px;">
              ${fmtMoney(cg.realized.totalTax)}
            </div>
            <div style="font-size:11px; color:var(--text-2); margin-top:2px;">STCG @ 20% + LTCG @ 12.5%</div>
          </div>
        </div>

        <div class="tx-card" style="padding:16px; border-radius:12px; background:var(--bg2,#0d122b); border:1px solid var(--border);">
          <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:8px;">💡 Tax-Gain Harvesting Strategy</div>
          <p style="font-size:12px; color:var(--text-2); margin:0 0 10px; line-height:1.5;">
            By selling and immediately repurchasing long-term equity holdings before March 31 up to the <b>₹1,25,000 exemption limit</b>, you step up your purchase cost basis without paying any capital gains tax.
          </p>
          <div style="font-size:12px; color:var(--emerald); font-weight:600;">
            ✓ Potential Tax Saving this Financial Year: ${fmtMoney(cg.harvesting.potentialTaxSaved)}
          </div>
        </div>
      `;
    }

    function renderAdvanceTaxTab() {
      var content = document.getElementById('lm-tax-tab-content');
      if (!content) return;

      var sched = getAdvanceTaxSchedule(annualIncome * 0.15, 0);

      content.innerHTML = `
        <div style="background:var(--bg2,#0d122b); border:1px solid var(--border); border-radius:12px; padding:18px; margin-bottom:16px;">
          <div style="font-size:14px; font-weight:700; color:#fff; margin-bottom:4px;">Quarterly Advance Tax Schedule</div>
          <p style="font-size:12px; color:var(--text-3); margin:0 0 14px;">Mandatory for individuals if net annual tax liability exceeds ₹10,000.</p>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
            ${sched.installments.map(inst => `
              <div style="background:var(--bg3,#111736); padding:14px; border-radius:10px; border:1px solid var(--border);">
                <div style="font-size:12px; font-weight:700; color:var(--teal);">${inst.name}</div>
                <div style="font-size:11px; color:var(--text-3); margin-top:2px;">Due: ${inst.displayDate}</div>
                <div style="font-size:16px; font-weight:700; font-family:var(--font-m,monospace); color:#fff; margin-top:6px;">
                  ${fmtMoney(inst.targetAmount)}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="background:rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); border-radius:12px; padding:16px;">
          <div style="font-size:13px; font-weight:700; color:var(--rose,#f43f5e); margin-bottom:6px;">⚠️ Section 234B &amp; 234C Interest Risk</div>
          <div style="font-size:12px; color:var(--text-2); line-height:1.5;">
            • <b>Section 234C:</b> 1% per month simple interest is charged for any delay or shortfall in quarterly advance tax installments.<br>
            • <b>Section 234B:</b> 1% per month interest is charged if less than 90% of assessed tax is deposited before March 31.
          </div>
        </div>
      `;
    }

    renderComparatorTab();

    el.querySelectorAll('.lm-tax-tab-btn').forEach(btn => {
      btn.onclick = function () {
        el.querySelectorAll('.lm-tax-tab-btn').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--text-2,#94a3b8)';
          b.style.borderColor = 'var(--border,rgba(255,255,255,0.08))';
        });
        this.style.background = 'rgba(0,240,255,0.15)';
        this.style.color = 'var(--teal,#00f0ff)';
        this.style.borderColor = 'rgba(0,240,255,0.3)';

        var tab = this.dataset.taxTab;
        if (tab === 'comparator') renderComparatorTab();
        else if (tab === 'capital-gains') renderCapitalGainsTab();
        else if (tab === 'advance-tax') renderAdvanceTaxTab();
      };
    });
  }

  var TaxIntelligenceModule = {
    STD_DEDUCTION_NEW: STD_DEDUCTION_NEW,
    STD_DEDUCTION_OLD: STD_DEDUCTION_OLD,
    LTCG_EQUITY_EXEMPTION: LTCG_EQUITY_EXEMPTION,
    LTCG_EQUITY_RATE: LTCG_EQUITY_RATE,
    STCG_EQUITY_RATE: STCG_EQUITY_RATE,
    calculateIncomeTax: calculateIncomeTax,
    getCapitalGainsSummary: getCapitalGainsSummary,
    getAdvanceTaxSchedule: getAdvanceTaxSchedule,
    renderTaxPlannerUI: renderTaxPlannerUI
  };

  if (typeof window !== 'undefined') {
    window.LM_TaxIntelligence = TaxIntelligenceModule;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaxIntelligenceModule;
  }

  console.log('[LM] TaxIntelligence module initialized (Budget 2024 ready).');
})();
