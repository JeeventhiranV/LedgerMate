/**
 * LedgerMate – StockCalculations.js
 * ─────────────────────────────────────────────────────────────
 * Financial Calculation Engine for Indian Stock Portfolio.
 * Implements Weighted Average Cost Basis, Realized/Unrealized P&L,
 * Day Change Aggregation, and Indian Currency (INR) Formatting.
 * Exposes: window.LM_StockCalculations
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // ── Precision & Math Helpers ─────────────────────────────────
  function round2(val) {
    var n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  function round4(val) {
    var n = Number(val);
    if (!Number.isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 10000) / 10000;
  }

  /**
   * Format numbers to standard Indian Rupee representation (e.g. ₹2,50,000.00)
   */
  function formatINR(amount, options) {
    var num = Number(amount);
    if (!Number.isFinite(num)) num = 0;

    var opts = options || {};
    var showSign = opts.showSign || false;
    var hideSymbol = opts.hideSymbol || false;
    var decimals = typeof opts.decimals === 'number' ? opts.decimals : 2;

    var isNegative = num < 0;
    var isPositive = num > 0;
    var absVal = Math.abs(num);

    // Indian numbering format conversion
    var fixed = absVal.toFixed(decimals);
    var parts = fixed.split('.');
    var intPart = parts[0];
    var decPart = parts.length > 1 ? '.' + parts[1] : '';

    var lastThree = intPart.substring(intPart.length - 3);
    var otherNumbers = intPart.substring(0, intPart.length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    var formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    var formattedNumber = formattedInt + decPart;

    var symbol = hideSymbol ? '' : '₹';
    var signPrefix = '';
    if (isNegative) {
      signPrefix = '-';
    } else if (isPositive && showSign) {
      signPrefix = '+';
    }

    return signPrefix + symbol + formattedNumber;
  }

  /**
   * Format percentage with +/- sign (e.g. +8.45% or -2.10%)
   */
  function formatPercent(pct, options) {
    var num = Number(pct);
    if (!Number.isFinite(num)) num = 0;
    var opts = options || {};
    var decimals = typeof opts.decimals === 'number' ? opts.decimals : 2;
    var sign = num > 0 ? '+' : '';
    return sign + num.toFixed(decimals) + '%';
  }

  /**
   * Format Quantity
   */
  function formatQty(qty) {
    var num = Number(qty);
    if (!Number.isFinite(num)) return '0';
    if (Math.floor(num) === num) return num.toString();
    return num.toFixed(2);
  }

  /**
   * Calculate Weighted Average Cost Basis and Performance for a single stock holding
   * from its chronological BUY & SELL transaction history.
   *
   * @param {Array} transactions List of transaction objects
   * @param {Object} marketQuote Quote object { price, previous_close, change, change_percent }
   * @returns {Object} Calculated holding metrics
   */
  function calculateHoldingMetrics(transactions, marketQuote) {
    var txList = (transactions || []).slice().sort(function (a, b) {
      var dateA = new Date(a.transaction_date || a.created_at || 0).getTime();
      var dateB = new Date(b.transaction_date || b.created_at || 0).getTime();
      return dateA - dateB;
    });

    var qty = 0;
    var invested = 0;
    var weightedAvgBuyPrice = 0;
    var realizedPL = 0;
    var totalBoughtQty = 0;
    var totalSoldQty = 0;
    var totalBrokerage = 0;
    var totalTaxes = 0;

    txList.forEach(function (tx) {
      var txType = (tx.transaction_type || 'BUY').toUpperCase();
      var txQty = Math.max(0, Number(tx.quantity) || 0);
      var txPrice = Math.max(0, Number(tx.price) || 0);
      var brokerage = Math.max(0, Number(tx.brokerage) || 0);
      var taxes = Math.max(0, Number(tx.taxes) || 0);
      var charges = brokerage + taxes;

      totalBrokerage += brokerage;
      totalTaxes += taxes;

      if (txType === 'BUY') {
        var grossCost = txQty * txPrice;
        var totalCost = grossCost + charges;
        var newQty = qty + txQty;
        var newInvested = invested + totalCost;

        weightedAvgBuyPrice = newQty > 0 ? (newInvested / newQty) : 0;
        qty = newQty;
        invested = newInvested;
        totalBoughtQty += txQty;
      } else if (txType === 'SELL') {
        var effectiveSellQty = Math.min(qty, txQty);
        var grossRevenue = effectiveSellQty * txPrice;
        var costBasisOfSold = effectiveSellQty * weightedAvgBuyPrice;
        var txGain = grossRevenue - costBasisOfSold - charges;

        realizedPL += txGain;
        qty = Math.max(0, qty - effectiveSellQty);
        invested = qty > 0 ? (qty * weightedAvgBuyPrice) : 0;
        totalSoldQty += effectiveSellQty;
      }
    });

    qty = round4(qty);
    invested = round2(invested);
    weightedAvgBuyPrice = round2(weightedAvgBuyPrice);
    realizedPL = round2(realizedPL);

    // Current Market Price evaluation
    var currentPrice = null;
    var previousClose = null;
    var dayChange = 0;
    var dayChangePct = 0;
    var hasLivePrice = false;

    if (marketQuote && typeof marketQuote.price === 'number' && marketQuote.price > 0) {
      currentPrice = round2(marketQuote.price);
      hasLivePrice = true;
      if (typeof marketQuote.previous_close === 'number' && marketQuote.previous_close > 0) {
        previousClose = round2(marketQuote.previous_close);
      }
      if (typeof marketQuote.change === 'number') {
        dayChange = round2(marketQuote.change);
      } else if (previousClose) {
        dayChange = round2(currentPrice - previousClose);
      }
      if (typeof marketQuote.change_percent === 'number') {
        dayChangePct = round2(marketQuote.change_percent);
      } else if (previousClose && previousClose > 0) {
        dayChangePct = round2((dayChange / previousClose) * 100);
      }
    }

    var currentValue = hasLivePrice ? round2(qty * currentPrice) : invested;
    var unrealizedPL = hasLivePrice ? round2(currentValue - invested) : 0;
    var unrealizedPLPct = (invested > 0 && hasLivePrice) ? round2((unrealizedPL / invested) * 100) : 0;
    var totalPL = round2(realizedPL + unrealizedPL);
    var dayChangeTotal = hasLivePrice ? round2(qty * dayChange) : 0;

    return {
      quantity: qty,
      averageBuyPrice: weightedAvgBuyPrice,
      investedAmount: invested,
      currentPrice: currentPrice,
      previousClose: previousClose,
      currentValue: currentValue,
      hasLivePrice: hasLivePrice,
      dayChange: dayChange,
      dayChangePct: dayChangePct,
      dayChangeTotal: dayChangeTotal,
      unrealizedPL: unrealizedPL,
      unrealizedPLPct: unrealizedPLPct,
      realizedPL: realizedPL,
      totalPL: totalPL,
      totalBoughtQty: round4(totalBoughtQty),
      totalSoldQty: round4(totalSoldQty),
      totalBrokerage: round2(totalBrokerage),
      totalTaxes: round2(totalTaxes),
      transactionCount: txList.length,
      isOpen: qty > 0
    };
  }

  /**
   * Aggregate Portfolio-level metrics across all active and historical holdings
   *
   * @param {Array} holdingsWithMetrics List of holdings enriched with metrics
   * @returns {Object} Portfolio summary metrics
   */
  function calculatePortfolioSummary(holdingsWithMetrics) {
    var totalInvested = 0;
    var currentPortfolioValue = 0;
    var totalUnrealizedPL = 0;
    var totalRealizedPL = 0;
    var todayChangeAmount = 0;
    var totalHoldingsCount = 0;
    var profitableCount = 0;
    var lossCount = 0;
    var breakEvenCount = 0;

    var openHoldings = [];
    var sectorMap = {};

    (holdingsWithMetrics || []).forEach(function (h) {
      var m = h.metrics || {};
      totalRealizedPL += (m.realizedPL || 0);

      if (m.isOpen) {
        totalHoldingsCount++;
        totalInvested += (m.investedAmount || 0);
        currentPortfolioValue += (m.currentValue || 0);
        totalUnrealizedPL += (m.unrealizedPL || 0);
        todayChangeAmount += (m.dayChangeTotal || 0);

        if (m.unrealizedPL > 0) {
          profitableCount++;
        } else if (m.unrealizedPL < 0) {
          lossCount++;
        } else {
          breakEvenCount++;
        }

        openHoldings.push(h);

        var sec = h.sector || 'General';
        if (!sectorMap[sec]) {
          sectorMap[sec] = { sector: sec, value: 0, invested: 0, holdingsCount: 0 };
        }
        sectorMap[sec].value += (m.currentValue || 0);
        sectorMap[sec].invested += (m.investedAmount || 0);
        sectorMap[sec].holdingsCount++;
      }
    });

    totalInvested = round2(totalInvested);
    currentPortfolioValue = round2(currentPortfolioValue);
    totalUnrealizedPL = round2(totalUnrealizedPL);
    totalRealizedPL = round2(totalRealizedPL);
    var totalPortfolioPL = round2(totalUnrealizedPL + totalRealizedPL);

    var totalReturnPct = totalInvested > 0 ? round2((totalUnrealizedPL / totalInvested) * 100) : 0;
    var prevDayValue = currentPortfolioValue - todayChangeAmount;
    var todayChangePct = prevDayValue > 0 ? round2((todayChangeAmount / prevDayValue) * 100) : 0;

    // Top performers analysis
    var bestPerformer = null;
    var worstPerformer = null;
    var highestAllocation = null;
    var largestGain = null;
    var largestLoss = null;

    if (openHoldings.length > 0) {
      var sortedByReturn = openHoldings.slice().sort(function (a, b) {
        return (b.metrics.unrealizedPLPct || 0) - (a.metrics.unrealizedPLPct || 0);
      });
      bestPerformer = sortedByReturn[0];
      worstPerformer = sortedByReturn[sortedByReturn.length - 1];

      var sortedByValue = openHoldings.slice().sort(function (a, b) {
        return (b.metrics.currentValue || 0) - (a.metrics.currentValue || 0);
      });
      highestAllocation = sortedByValue[0];

      var sortedByPL = openHoldings.slice().sort(function (a, b) {
        return (b.metrics.unrealizedPL || 0) - (a.metrics.unrealizedPL || 0);
      });
      largestGain = sortedByPL[0];
      largestLoss = sortedByPL[sortedByPL.length - 1];
    }

    // Convert sector map to sorted array with percentage allocation
    var sectorAllocation = Object.keys(sectorMap).map(function (k) {
      var s = sectorMap[k];
      s.value = round2(s.value);
      s.invested = round2(s.invested);
      s.percentage = currentPortfolioValue > 0 ? round2((s.value / currentPortfolioValue) * 100) : 0;
      return s;
    }).sort(function (a, b) {
      return b.value - a.value;
    });

    return {
      totalInvested: totalInvested,
      currentPortfolioValue: currentPortfolioValue,
      totalUnrealizedPL: totalUnrealizedPL,
      totalRealizedPL: totalRealizedPL,
      totalPortfolioPL: totalPortfolioPL,
      totalReturnPct: totalReturnPct,
      todayChangeAmount: round2(todayChangeAmount),
      todayChangePct: todayChangePct,
      totalHoldingsCount: totalHoldingsCount,
      profitableCount: profitableCount,
      lossCount: lossCount,
      breakEvenCount: breakEvenCount,
      sectorAllocation: sectorAllocation,
      bestPerformer: bestPerformer,
      worstPerformer: worstPerformer,
      highestAllocation: highestAllocation,
      largestGain: largestGain,
      largestLoss: largestLoss
    };
  }

  var LM_StockCalculations = {
    round2: round2,
    round4: round4,
    formatINR: formatINR,
    formatPercent: formatPercent,
    formatQty: formatQty,
    calculateHoldingMetrics: calculateHoldingMetrics,
    calculatePortfolioSummary: calculatePortfolioSummary
  };

  window.LM_StockCalculations = LM_StockCalculations;
})();
