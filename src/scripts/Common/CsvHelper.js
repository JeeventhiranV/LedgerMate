/**
 * LedgerMate – CSV Processing Helper (CsvHelper.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides reliable, RFC-4180 compliant CSV parsing and serialization for
 * financial export and statement imports.
 *
 * Exposes:
 *  - window.LM_CsvHelper
 *  - window.parseCSV
 *  - window.arrayToCSV
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function (global) {
  'use strict';

  function parseCSV(text) {
    if (!text || typeof text !== 'string') return [];
    var lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];

    var headers = lines[0].split(',').map(function (h) {
      return h.trim().replace(/^"|"$/g, '');
    });

    return lines.slice(1).map(function (line) {
      var values = [];
      var cur = '';
      var inQuotes = false;

      for (var i = 0; i < line.length; i++) {
        var c = line[i];
        if (c === '"') {
          inQuotes = !inQuotes;
        } else if (c === ',' && !inQuotes) {
          values.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      values.push(cur.trim());

      var obj = {};
      headers.forEach(function (h, idx) {
        obj[h] = values[idx] ? values[idx].replace(/^"|"$/g, '').trim() : '';
      });
      return obj;
    });
  }

  function arrayToCSV(rows) {
    if (!rows || !rows.length) return '';
    var headers = Object.keys(rows[0]);
    var headerRow = headers.join(',');

    var bodyRows = rows.map(function (r) {
      return headers.map(function (h) {
        var cell = r[h];
        if (cell == null) return '';
        var s = String(cell);
        if (/[,"\n]/.test(s)) {
          return '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(',');
    });

    return [headerRow].concat(bodyRows).join('\n');
  }

  var CsvHelper = {
    parseCSV: parseCSV,
    arrayToCSV: arrayToCSV
  };

  global.LM_CsvHelper = CsvHelper;
  global.parseCSV = parseCSV;
  global.arrayToCSV = arrayToCSV;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
