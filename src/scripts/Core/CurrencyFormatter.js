/**
 * LedgerMate – CurrencyFormatter.js
 * ─────────────────────────────────────────────────────────────
 * High-performance Indian Rupee (INR) and multi-currency formatter.
 * Supports compact suffixes (K, L, Cr), safe string parsing,
 * negative accounting notation, and backward-compatible facades.
 * Exposes: window.LM_Currency, window.fmtINR, window.fmtINRCompact
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var inrFormatter = null;
  try {
    inrFormatter = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
  } catch (e) {
    inrFormatter = null;
  }

  /**
   * Format a numeric amount in Indian Rupee format (e.g. ₹1,23,456.78)
   * @param {number|string} amount 
   * @param {boolean} includeSymbol default true
   * @returns {string}
   */
  function formatINR(amount, includeSymbol = true) {
    var num = parseFloat(amount);
    if (isNaN(num)) num = 0;
    var sign = num < 0 ? '-' : '';
    var abs = Math.abs(num);

    var formatted = '';
    if (inrFormatter) {
      formatted = inrFormatter.format(abs);
    } else {
      formatted = abs.toLocaleString('en-IN');
    }

    return (sign ? '-' : '') + (includeSymbol ? '₹' : '') + formatted;
  }

  /**
   * Format large currency amounts into compact Indian terms (L, Cr) or K
   * @param {number|string} amount 
   * @returns {string}
   */
  function formatINRCompact(amount) {
    var num = parseFloat(amount);
    if (isNaN(num)) num = 0;
    var sign = num < 0 ? '-' : '';
    var abs = Math.abs(num);

    if (abs >= 10000000) {
      return sign + '₹' + parseFloat((abs / 10000000).toFixed(2)) + ' Cr';
    }
    if (abs >= 100000) {
      return sign + '₹' + parseFloat((abs / 100000).toFixed(2)) + ' L';
    }
    if (abs >= 1000) {
      return sign + '₹' + parseFloat((abs / 1000).toFixed(1)) + ' K';
    }
    return formatINR(num);
  }

  /**
   * Parse numeric value safely from formatted currency strings
   * @param {string|number} str 
   * @returns {number}
   */
  function parseAmount(str) {
    if (typeof str === 'number') return isNaN(str) ? 0 : str;
    if (!str) return 0;
    var clean = String(str).replace(/[₹,\s]/g, '').trim();
    var val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
  }

  var CurrencyModule = {
    formatINR: formatINR,
    formatINRCompact: formatINRCompact,
    parseAmount: parseAmount
  };

  // Expose module namespace
  window.LM_Currency = CurrencyModule;

  // Preserve global backward-compatible facades
  if (typeof window.fmtINR !== 'function') {
    window.fmtINR = formatINR;
  }
  if (typeof window.fmtINRCompact !== 'function') {
    window.fmtINRCompact = formatINRCompact;
  }
})();
