/**
 * LedgerMate – LiveMarket.js
 * ─────────────────────────────────────────────────────────────
 * Real-Time Multi-Currency Forex Rates & Currency Converter
 * Exposes: window.LM_LiveMarket
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _forexRates = {
    USD: 83.5,
    EUR: 90.2,
    GBP: 106.8,
    AED: 22.7,
    SGD: 62.4,
    CAD: 61.1,
    AUD: 55.3,
    JPY: 0.54,
    INR: 1.0
  };

  // ── Forex Rates Fetcher ───────────────────────────────────────
  async function fetchForexRates() {
    try {
      // Primary: Open Exchange Rates API (public, CORS enabled, no API key required)
      var res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        var data = await res.json();
        if (data && data.rates && data.rates.INR) {
          var usdInr = data.rates.INR;
          _forexRates.USD = usdInr;
          _forexRates.EUR = usdInr / (data.rates.EUR || 1);
          _forexRates.GBP = usdInr / (data.rates.GBP || 1);
          _forexRates.CAD = usdInr / (data.rates.CAD || 1);
          _forexRates.AUD = usdInr / (data.rates.AUD || 1);
          _forexRates.SGD = usdInr / (data.rates.SGD || 1);
          _forexRates.AED = usdInr / (data.rates.AED || 1);
          _forexRates.JPY = usdInr / (data.rates.JPY || 1);
          _forexRates.INR = 1.0;
          console.log('[LiveMarket] 💱 Live Forex rates updated:', _forexRates);
          return _forexRates;
        }
      }
    } catch (e) {
      console.warn('[LiveMarket] Primary forex fetch failed, trying secondary fallback...', e);
    }

    try {
      // Secondary: Free Currency API via jsdelivr CDN
      var res2 = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json');
      if (res2.ok) {
        var d2 = await res2.json();
        var usdRates = d2 && d2.usd;
        if (usdRates && usdRates.inr) {
          var uInr = usdRates.inr;
          _forexRates.USD = uInr;
          _forexRates.EUR = uInr / (usdRates.eur || 1);
          _forexRates.GBP = uInr / (usdRates.gbp || 1);
          _forexRates.CAD = uInr / (usdRates.cad || 1);
          _forexRates.AUD = uInr / (usdRates.aud || 1);
          _forexRates.SGD = uInr / (usdRates.sgd || 1);
          _forexRates.AED = uInr / (usdRates.aed || 1);
          _forexRates.JPY = uInr / (usdRates.jpy || 1);
          _forexRates.INR = 1.0;
          console.log('[LiveMarket] 💱 Forex rates updated via fallback:', _forexRates);
        }
      }
    } catch (err) {
      console.warn('[LiveMarket] Forex fetch offline fallback active (using cached rates):', err);
    }
    return _forexRates;
  }

  // Convert amount from foreign currency to target (default INR)
  function convertCurrency(amount, fromCur, toCur = 'INR') {
    fromCur = (fromCur || 'INR').toUpperCase();
    toCur = (toCur || 'INR').toUpperCase();
    if (fromCur === toCur) return amount;
    var fromRateInr = _forexRates[fromCur] || 1;
    var toRateInr = _forexRates[toCur] || 1;
    var amountInInr = amount * fromRateInr;
    return amountInInr / toRateInr;
  }

  // Auto-init forex rates in background
  fetchForexRates();

  window.LM_LiveMarket = {
    fetchForexRates: fetchForexRates,
    convertCurrency: convertCurrency,
    getForexRates: () => _forexRates
  };

  console.log('[LM] LiveMarket Forex module initialized.');
})();
