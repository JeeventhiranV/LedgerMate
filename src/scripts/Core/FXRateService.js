/**
 * LedgerMate – FXRateService.js
 * ─────────────────────────────────────────────────────────────
 * Multi-Currency & Real-Time FX Conversion Engine.
 * Supports INR (Base ₹), USD ($), EUR (€), GBP (£), AED (د.إ),
 * SGD (S$), CAD (C$), JPY (¥), and AUD (A$).
 * 100% Offline-First with resilient bundled benchmarks and
 * 24-hour intelligent cache TTL.
 * Exposes: window.LM_FX
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var BASE_CURRENCY = 'INR';
  var CACHE_KEY = 'lm_fx_rates_cache_v1';
  var CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Bundled baseline benchmark exchange rates relative to 1 INR
  // (e.g. 1 USD = 84.50 INR -> 1 INR = 0.01183 USD)
  var DEFAULT_RATES_TO_INR = {
    INR: 1.0,
    USD: 84.50,
    EUR: 91.80,
    GBP: 107.20,
    AED: 23.01,
    SGD: 63.15,
    CAD: 61.20,
    JPY: 0.555,
    AUD: 55.40,
    CHF: 96.50
  };

  var CURRENCY_SYMBOLS = {
    INR: '₹',
    USD: '$',
    EUR: '€',
    GBP: '£',
    AED: 'AED ',
    SGD: 'S$',
    CAD: 'C$',
    JPY: '¥',
    AUD: 'A$',
    CHF: 'CHF '
  };

  var _ratesToINR = Object.assign({}, DEFAULT_RATES_TO_INR);
  var _lastUpdated = null;
  var _isOnlineSource = false;

  function loadCachedRates() {
    try {
      var cached = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        var str = localStorage.getItem(CACHE_KEY);
        if (str) cached = JSON.parse(str);
      }
      if (cached && cached.rates && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        _ratesToINR = Object.assign({}, DEFAULT_RATES_TO_INR, cached.rates);
        _lastUpdated = new Date(cached.timestamp);
        _isOnlineSource = true;
        return true;
      }
    } catch (e) {
      console.warn('[FXRateService] Could not read cached rates:', e);
    }
    _ratesToINR = Object.assign({}, DEFAULT_RATES_TO_INR);
    _lastUpdated = new Date();
    _isOnlineSource = false;
    return false;
  }

  function saveRates(rates) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        var payload = {
          rates: rates,
          timestamp: Date.now()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      }
    } catch (e) {
      console.warn('[FXRateService] Could not save rates to cache:', e);
    }
  }

  /**
   * Get the exchange rate to convert 1 unit of `from` into `to`.
   * @param {string} from - Source currency code (e.g. 'USD')
   * @param {string} to - Target currency code (e.g. 'INR')
   * @returns {number}
   */
  function getRate(from, to) {
    from = (from || BASE_CURRENCY).toUpperCase().trim();
    to = (to || BASE_CURRENCY).toUpperCase().trim();
    if (from === to) return 1.0;

    var fromInINR = _ratesToINR[from] !== undefined ? _ratesToINR[from] : DEFAULT_RATES_TO_INR[from];
    var toInINR = _ratesToINR[to] !== undefined ? _ratesToINR[to] : DEFAULT_RATES_TO_INR[to];

    if (!fromInINR || !toInINR) {
      console.warn(`[FXRateService] Missing rate for ${from} or ${to}. Using 1.0 fallback.`);
      return 1.0;
    }

    // from -> INR -> to
    // 1 unit of `from` is `fromInINR` INR.
    // 1 INR is (1 / toInINR) units of `to`.
    return fromInINR / toInINR;
  }

  /**
   * Convert an amount from one currency to another.
   * @param {number|string} amount 
   * @param {string} from - Source currency
   * @param {string} to - Destination currency (defaults to INR)
   * @returns {number}
   */
  function convert(amount, from, to) {
    var val = parseFloat(amount);
    if (isNaN(val) || val === 0) return 0;
    var rate = getRate(from, to);
    var res = val * rate;
    return Math.round(res * 100) / 100;
  }

  /**
   * Format an amount with currency symbol and standard decimal notation.
   * @param {number|string} amount 
   * @param {string} currencyCode 
   * @returns {string}
   */
  function format(amount, currencyCode) {
    var num = parseFloat(amount);
    if (isNaN(num)) num = 0;
    currencyCode = (currencyCode || BASE_CURRENCY).toUpperCase().trim();

    if (currencyCode === 'INR') {
      if (typeof window !== 'undefined' && window.LM_Currency && typeof window.LM_Currency.formatINR === 'function') {
        return window.LM_Currency.formatINR(num);
      }
      return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 2 });
    }

    var sym = CURRENCY_SYMBOLS[currencyCode] || (currencyCode + ' ');
    var formatted = Math.abs(num).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return (num < 0 ? '-' : '') + sym + formatted;
  }

  /**
   * Revalues a portfolio of multi-currency assets into the target base currency.
   * @param {Array} holdings - Array of objects { amount, currency, name, originalCostInBase }
   * @param {string} targetCurrency - Defaults to 'INR'
   * @returns {Object} { totalBaseValue, totalOriginalCost, unrealizedFxPnL, items: [...] }
   */
  function revaluePortfolio(holdings, targetCurrency) {
    targetCurrency = (targetCurrency || BASE_CURRENCY).toUpperCase();
    var items = [];
    var totalBaseValue = 0;
    var totalOriginalCost = 0;

    (holdings || []).forEach(function (h) {
      var rawAmt = parseFloat(h.amount || h.currentValue || h.balance || 0);
      var cur = (h.currency || BASE_CURRENCY).toUpperCase();
      var rate = getRate(cur, targetCurrency);
      var revalued = rawAmt * rate;
      var origCost = parseFloat(h.originalCostInBase || h.costBasis || revalued);

      var fxGainLoss = revalued - origCost;
      var fxGainLossPct = origCost > 0 ? (fxGainLoss / origCost) * 100 : 0;

      totalBaseValue += revalued;
      totalOriginalCost += origCost;

      items.push({
        name: h.name || 'Asset',
        originalAmount: rawAmt,
        currency: cur,
        exchangeRate: rate,
        revaluedAmount: Math.round(revalued * 100) / 100,
        targetCurrency: targetCurrency,
        fxGainLoss: Math.round(fxGainLoss * 100) / 100,
        fxGainLossPct: Math.round(fxGainLossPct * 100) / 100
      });
    });

    var netFxPnL = totalBaseValue - totalOriginalCost;
    var netFxPnLPct = totalOriginalCost > 0 ? (netFxPnL / totalOriginalCost) * 100 : 0;

    return {
      targetCurrency: targetCurrency,
      totalBaseValue: Math.round(totalBaseValue * 100) / 100,
      totalOriginalCost: Math.round(totalOriginalCost * 100) / 100,
      unrealizedFxPnL: Math.round(netFxPnL * 100) / 100,
      unrealizedFxPnLPct: Math.round(netFxPnLPct * 100) / 100,
      items: items
    };
  }

  /**
   * Fetch latest exchange rates from open exchange API asynchronously.
   * Gracefully falls back to cached/default rates if offline.
   */
  async function fetchLiveRates() {
    if (typeof fetch === 'undefined') return _ratesToINR;
    try {
      var resp = await fetch('https://open.er-api.com/v6/latest/USD', {
        headers: { 'Accept': 'application/json' },
        signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(5000) : undefined
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      var data = await resp.json();
      if (data && data.rates && data.rates.INR) {
        var usdInr = data.rates.INR;
        var newRates = { INR: 1.0 };
        // For each currency X, 1 USD = rates[X] units of X, and 1 USD = usdInr INR.
        // Therefore, 1 unit of X = usdInr / rates[X] INR.
        Object.keys(DEFAULT_RATES_TO_INR).forEach(function (code) {
          if (code === 'INR') return;
          if (code === 'USD') {
            newRates.USD = usdInr;
          } else if (data.rates[code] && data.rates[code] > 0) {
            newRates[code] = Math.round((usdInr / data.rates[code]) * 10000) / 10000;
          }
        });
        _ratesToINR = Object.assign({}, DEFAULT_RATES_TO_INR, newRates);
        _lastUpdated = new Date();
        _isOnlineSource = true;
        saveRates(_ratesToINR);
        console.log('[FXRateService] Live FX rates updated successfully from network.');
      }
    } catch (err) {
      console.warn('[FXRateService] Network fetch failed, using offline benchmark rates:', err.message);
    }
    return _ratesToINR;
  }

  // Initialize from cache
  loadCachedRates();

  var FXModule = {
    BASE_CURRENCY: BASE_CURRENCY,
    CURRENCY_SYMBOLS: CURRENCY_SYMBOLS,
    getRate: getRate,
    convert: convert,
    format: format,
    revaluePortfolio: revaluePortfolio,
    fetchLiveRates: fetchLiveRates,
    getAllRates: function () { return Object.assign({}, _ratesToINR); },
    getMetadata: function () {
      return {
        baseCurrency: BASE_CURRENCY,
        lastUpdated: _lastUpdated,
        isOnlineSource: _isOnlineSource,
        supportedCurrencies: Object.keys(CURRENCY_SYMBOLS)
      };
    }
  };

  if (typeof window !== 'undefined') {
    window.LM_FX = FXModule;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FXModule;
  }

  console.log('[LM] FXRateService module initialized.');
})();
