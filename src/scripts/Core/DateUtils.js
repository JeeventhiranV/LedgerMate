/**
 * LedgerMate – DateUtils.js
 * ─────────────────────────────────────────────────────────────
 * Comprehensive date manipulation, Indian calendar formatters,
 * relative humanized times, and financial year / month calculators.
 * Exposes: window.LM_Date, window.nowISO, window.formatDate
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  /**
   * Return current date in YYYY-MM-DD local format
   */
  function nowISO() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  /**
   * Format date into readable Indian English (e.g. "15 Oct 2026")
   * @param {string|Date} dateVal 
   * @param {boolean} includeYear default true
   */
  function formatDate(dateVal, includeYear = true) {
    if (!dateVal) return '—';
    var d = typeof dateVal === 'string' ? new Date(dateVal + (dateVal.length === 10 ? 'T00:00:00' : '')) : dateVal;
    if (isNaN(d.getTime())) return String(dateVal);
    var day = d.getDate();
    var mon = MONTH_NAMES[d.getMonth()];
    var yr = d.getFullYear();
    return includeYear ? day + ' ' + mon + ' ' + yr : day + ' ' + mon;
  }

  /**
   * Difference in calendar days between two dates (d2 - d1)
   */
  function daysBetween(date1, date2) {
    var d1 = new Date(date1);
    var d2 = new Date(date2);
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);
    var diffMs = d2.getTime() - d1.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Add calendar days to a date string (YYYY-MM-DD)
   */
  function addDays(dateStr, numDays) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + numDays);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  /**
   * Format relative time string ("Today", "Tomorrow", "In 3 days", "2 days ago")
   */
  function getRelativeTimeString(targetDate) {
    if (!targetDate) return '';
    var today = nowISO();
    var diff = daysBetween(today, targetDate);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1) return 'In ' + diff + ' days';
    return Math.abs(diff) + ' days ago';
  }

  /**
   * Get Indian Financial Year string (e.g. "FY 2026-27") for a date
   */
  function getFinancialYear(dateVal) {
    var d = dateVal ? new Date(dateVal) : new Date();
    var y = d.getFullYear();
    var m = d.getMonth() + 1; // 1-12
    if (m >= 4) {
      return 'FY ' + y + '-' + String(y + 1).slice(2);
    } else {
      return 'FY ' + (y - 1) + '-' + String(y).slice(2);
    }
  }

  var DateModule = {
    MONTH_NAMES: MONTH_NAMES,
    FULL_MONTH_NAMES: FULL_MONTH_NAMES,
    nowISO: nowISO,
    formatDate: formatDate,
    daysBetween: daysBetween,
    addDays: addDays,
    getRelativeTimeString: getRelativeTimeString,
    getFinancialYear: getFinancialYear
  };

  window.LM_Date = DateModule;

  if (typeof window.nowISO !== 'function') {
    window.nowISO = nowISO;
  }
  if (typeof window.formatDate !== 'function') {
    window.formatDate = formatDate;
  }
})();
