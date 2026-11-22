/**
 * LedgerMate – AmortizationCalc.js
 * ─────────────────────────────────────────────────────────────
 * Bank-grade Loan Amortization & Part-Payment Prepayment Simulator.
 * Computes exact monthly EMI, amortization breakdowns, tenure reduction,
 * interest savings from lump-sum or recurring prepayments.
 * Exposes: window.LM_Amortization, window.calculateEMI
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /**
   * Calculate standard Equated Monthly Installment (EMI)
   * @param {number} principal 
   * @param {number} annualRate in percent (e.g. 8.5 for 8.5% p.a.)
   * @param {number} tenureMonths 
   * @returns {number} monthly EMI rounded to 2 decimal places
   */
  function calculateEMI(principal, annualRate, tenureMonths) {
    var p = parseFloat(principal) || 0;
    var r = (parseFloat(annualRate) || 0) / 12 / 100;
    var n = parseInt(tenureMonths) || 0;

    if (p <= 0 || n <= 0) return 0;
    if (r === 0) return Number((p / n).toFixed(2));

    var emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return Number(emi.toFixed(2));
  }

  /**
   * Generate complete month-by-month amortization schedule
   * @param {number} principal 
   * @param {number} annualRate 
   * @param {number} tenureMonths 
   * @param {string} startDate YYYY-MM-DD
   */
  function generateSchedule(principal, annualRate, tenureMonths, startDate) {
    var p = parseFloat(principal) || 0;
    var r = (parseFloat(annualRate) || 0) / 12 / 100;
    var n = parseInt(tenureMonths) || 0;
    var emi = calculateEMI(p, annualRate, n);

    var balance = p;
    var schedule = [];
    var totalInterest = 0;
    var curDate = startDate ? new Date(startDate) : new Date();

    for (var m = 1; m <= n; m++) {
      var interest = balance * r;
      var principalPortion = Math.min(balance, emi - interest);
      if (m === n) {
        // Final adjustment to zero out balance perfectly
        principalPortion = balance;
      }
      balance = Math.max(0, balance - principalPortion);
      totalInterest += interest;

      schedule.push({
        month: m,
        date: curDate.toISOString().slice(0, 7),
        emi: Number((principalPortion + interest).toFixed(2)),
        principal: Number(principalPortion.toFixed(2)),
        interest: Number(interest.toFixed(2)),
        balance: Number(balance.toFixed(2))
      });

      curDate.setMonth(curDate.getMonth() + 1);
      if (balance <= 0) break;
    }

    return {
      emi: emi,
      totalPayment: Number((p + totalInterest).toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2)),
      schedule: schedule
    };
  }

  /**
   * Calculate Prepayment / Part-Payment impact and savings
   * @param {Object} params
   * @param {number} params.principal Original or current outstanding principal
   * @param {number} params.annualRate Annual interest rate in %
   * @param {number} params.tenureMonths Remaining tenure in months
   * @param {number} params.lumpSum Prepayment amount to pay immediately
   * @param {number} params.monthlyExtra Optional extra recurring monthly payment
   * @param {string} params.strategy 'reduce_tenure' (default) or 'reduce_emi'
   */
  function calculatePrepaymentSavings(params) {
    var p = parseFloat(params.principal) || 0;
    var annualRate = parseFloat(params.annualRate) || 0;
    var n = parseInt(params.tenureMonths) || 0;
    var lumpSum = parseFloat(params.lumpSum) || 0;
    var monthlyExtra = parseFloat(params.monthlyExtra) || 0;
    var strategy = params.strategy || 'reduce_tenure';

    var r = annualRate / 12 / 100;
    var originalEmi = calculateEMI(p, annualRate, n);
    var originalBaseline = generateSchedule(p, annualRate, n);
    var originalTotalInterest = originalBaseline.totalInterest;

    if (p <= 0 || n <= 0 || (lumpSum <= 0 && monthlyExtra <= 0)) {
      return {
        originalEmi: originalEmi,
        originalInterest: originalTotalInterest,
        originalTenure: n,
        newEmi: originalEmi,
        newInterest: originalTotalInterest,
        newTenure: n,
        interestSaved: 0,
        monthsSaved: 0,
        strategy: strategy
      };
    }

    // Apply lump sum immediately to principal
    var adjPrincipal = Math.max(0, p - lumpSum);

    if (strategy === 'reduce_emi') {
      // Keep tenure constant, recalculate lower EMI
      var newEmi = calculateEMI(adjPrincipal, annualRate, n);
      var newBaseline = generateSchedule(adjPrincipal, annualRate, n);
      var interestSaved = Math.max(0, originalTotalInterest - newBaseline.totalInterest);

      return {
        originalEmi: originalEmi,
        originalInterest: originalTotalInterest,
        originalTenure: n,
        newEmi: newEmi,
        newInterest: newBaseline.totalInterest,
        newTenure: n,
        interestSaved: Number(interestSaved.toFixed(2)),
        monthlySavings: Number((originalEmi - newEmi).toFixed(2)),
        monthsSaved: 0,
        strategy: strategy
      };
    } else {
      // Default: 'reduce_tenure' – keep original EMI (plus optional monthly extra), pay off faster
      var effPayment = originalEmi + monthlyExtra;
      var curBal = adjPrincipal;
      var newMonths = 0;
      var newTotalInterest = 0;

      while (curBal > 0 && newMonths < 600) {
        newMonths++;
        var monthlyInterest = curBal * r;
        newTotalInterest += monthlyInterest;
        var pPaid = effPayment - monthlyInterest;

        if (pPaid >= curBal) {
          curBal = 0;
          break;
        } else {
          curBal -= pPaid;
        }
      }

      var monthsSaved = Math.max(0, n - newMonths);
      var interestSavedTenure = Math.max(0, originalTotalInterest - newTotalInterest);

      return {
        originalEmi: originalEmi,
        originalInterest: originalTotalInterest,
        originalTenure: n,
        newEmi: originalEmi,
        newInterest: Number(newTotalInterest.toFixed(2)),
        newTenure: newMonths,
        interestSaved: Number(interestSavedTenure.toFixed(2)),
        monthsSaved: monthsSaved,
        strategy: strategy
      };
    }
  }

  var AmortizationModule = {
    calculateEMI: calculateEMI,
    generateSchedule: generateSchedule,
    calculatePrepaymentSavings: calculatePrepaymentSavings
  };

  window.LM_Amortization = AmortizationModule;

  if (typeof window.calculateEMI !== 'function') {
    window.calculateEMI = calculateEMI;
  }
})();
