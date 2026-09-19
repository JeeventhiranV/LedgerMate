/**
 * LedgerMate – StatementParser.js
 * ─────────────────────────────────────────────────────────────
 * Smart Bank Statement & CSV Importer with Auto-Column Detection,
 * Duplicate Prevention, and Categorization preview.
 * Exposes: window.LM_StatementParser
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // Supported Date Formats normalizer
  function parseFlexibleDate(str) {
    if (!str) return new Date().toISOString().slice(0, 10);
    str = String(str).trim();

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // DD/MM/YYYY or DD-MM-YYYY
    var ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ddmmyyyy) {
      var d = ddmmyyyy[1].padStart(2, '0');
      var m = ddmmyyyy[2].padStart(2, '0');
      var y = ddmmyyyy[3];
      return `${y}-${m}-${d}`;
    }

    // MM/DD/YYYY
    var mmddyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    // DD-Mon-YYYY (e.g., 15-Aug-2024 or 15 Aug 2024)
    var months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    var ddmon = str.match(/^(\d{1,2})[\s\-]([A-Za-z]{3})[\s\-](\d{2,4})/);
    if (ddmon) {
      var day = ddmon[1].padStart(2, '0');
      var mon = months[ddmon[2].toLowerCase()] || '01';
      var yr = ddmon[3].length === 2 ? '20' + ddmon[3] : ddmon[3];
      return `${yr}-${mon}-${day}`;
    }

    // Fallback native Date parse
    var parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return new Date().toISOString().slice(0, 10);
  }

  // Robust CSV Line Parser
  function parseCSV(text) {
    var lines = [];
    var row = [''];
    var inQuotes = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i], next = text[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') { row[row.length - 1] += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (c === ',' && !inQuotes) {
        row.push('');
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') { i++; }
        if (row.length > 1 || row[0] !== '') { lines.push(row); }
        row = [''];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== '') lines.push(row);
    return lines;
  }

  // Clean currency strings: "₹ 1,250.00 Cr" -> 1250.00
  function cleanAmount(val) {
    if (val == null) return 0;
    var s = String(val).replace(/[^0-9.-]/g, '');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : Math.abs(n);
  }

  // Detect column mapping based on header names
  function detectColumns(headers) {
    var map = { date: -1, desc: -1, debit: -1, credit: -1, amount: -1, type: -1, balance: -1 };
    headers.forEach(function (h, idx) {
      var low = h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      if (map.date === -1 && (low.includes('date') || low.includes('txn') || low.includes('value'))) {
        map.date = idx;
      } else if (map.desc === -1 && (low.includes('desc') || low.includes('narration') || low.includes('particular') || low.includes('payee') || low.includes('detail') || low.includes('remark'))) {
        map.desc = idx;
      } else if (map.debit === -1 && (low.includes('debit') || low.includes('dr') || low.includes('withdrawal') || low.includes('spent') || low.includes('paidout'))) {
        map.debit = idx;
      } else if (map.credit === -1 && (low.includes('credit') || low.includes('cr') || low.includes('deposit') || low.includes('received') || low.includes('paidin'))) {
        map.credit = idx;
      } else if (map.amount === -1 && (low.includes('amount') || low.includes('sum') || low.includes('total'))) {
        map.amount = idx;
      } else if (map.type === -1 && (low.includes('type') || low.includes('crdr') || low.includes('drcr'))) {
        map.type = idx;
      } else if (map.balance === -1 && (low.includes('balance') || low.includes('bal'))) {
        map.balance = idx;
      }
    });
    return map;
  }

  // Parse raw file content to candidate transactions
  function parseStatement(csvContent) {
    var rawRows = parseCSV(csvContent);
    if (!rawRows || rawRows.length < 2) return { error: 'File is empty or invalid format.' };

    // Find header row (first non-empty row with at least 2 columns)
    var headerIdx = 0;
    for (var i = 0; i < Math.min(rawRows.length, 10); i++) {
      var nonEmpties = rawRows[i].filter(function (c) { return c && c.trim(); });
      if (nonEmpties.length >= 3) {
        headerIdx = i;
        break;
      }
    }

    var headers = rawRows[headerIdx];
    var colMap = detectColumns(headers);
    var dataRows = rawRows.slice(headerIdx + 1);

    var existingTxs = (window.state && window.state.transactions) ? window.state.transactions : [];
    var parsedTxs = [];

    dataRows.forEach(function (row, rIdx) {
      if (!row || row.length < 2) return;
      var dateStr = colMap.date >= 0 ? row[colMap.date] : '';
      var descStr = colMap.desc >= 0 ? row[colMap.desc] : (row[1] || 'Transaction');
      if (!dateStr && !descStr) return;

      var date = parseFlexibleDate(dateStr);
      var desc = (descStr || '').trim().replace(/\s+/g, ' ');

      var amount = 0;
      var type = 'out'; // default expense

      if (colMap.debit >= 0 && colMap.credit >= 0) {
        var dr = cleanAmount(row[colMap.debit]);
        var cr = cleanAmount(row[colMap.credit]);
        if (dr > 0) {
          amount = dr;
          type = 'out';
        } else if (cr > 0) {
          amount = cr;
          type = 'in';
        }
      } else if (colMap.amount >= 0) {
        var rawAmt = row[colMap.amount];
        var clean = cleanAmount(rawAmt);
        amount = clean;
        if (colMap.type >= 0) {
          var tVal = String(row[colMap.type]).toLowerCase();
          if (tVal.includes('cr') || tVal.includes('in') || tVal.includes('deposit')) type = 'in';
          else type = 'out';
        } else {
          // Negative amount is out, positive is in
          if (String(rawAmt).includes('-')) type = 'out';
        }
      }

      if (amount <= 0) return;

      // Smart category suggestion via CategoryRules if available
      var suggestedCat = 'Other';
      if (window.LM_CategoryRules && typeof window.LM_CategoryRules.suggestCategory === 'function') {
        suggestedCat = window.LM_CategoryRules.suggestCategory(desc, type);
      } else {
        var lDesc = desc.toLowerCase();
        if (/salary|payroll|dividend|interest|refund/i.test(lDesc)) suggestedCat = 'Salary';
        else if (/swiggy|zomato|restaurant|cafe|food|grocer/i.test(lDesc)) suggestedCat = 'Food';
        else if (/uber|ola|petrol|fuel|metro|flight/i.test(lDesc)) suggestedCat = 'Transport';
        else if (/netflix|spotify|amazon prime|hotstar/i.test(lDesc)) suggestedCat = 'Subscription';
        else if (/electricity|water|wifi|broadband|recharge/i.test(lDesc)) suggestedCat = 'Bills';
      }

      // Check for duplicates (matching date + exact amount + payee description similarity)
      var isDuplicate = existingTxs.some(function (e) {
        return e.date === date &&
               Math.abs(parseFloat(e.amount) - amount) < 0.01 &&
               (e.name || '').toLowerCase() === desc.toLowerCase();
      });

      parsedTxs.push({
        id: 'stmt_' + Date.now() + '_' + rIdx,
        date: date,
        name: desc || 'Imported Transaction',
        amount: amount,
        type: type,
        category: suggestedCat,
        notes: 'Imported via Statement Parser',
        tags: 'BankImport',
        isDuplicate: isDuplicate,
        selected: !isDuplicate
      });
    });

    return {
      headers: headers,
      colMap: colMap,
      transactions: parsedTxs
    };
  }

  // UI Modal for preview & confirmation
  function showImportModal(parsedResult) {
    if (!parsedResult || !parsedResult.transactions || !parsedResult.transactions.length) {
      if (typeof showToast === 'function') showToast('No valid transactions found in file.', 'warning');
      return;
    }

    var existingModal = document.getElementById('lm-stmt-modal');
    if (existingModal) existingModal.remove();

    var txs = parsedResult.transactions;
    var dupCount = txs.filter(t => t.isDuplicate).length;

    var modal = document.createElement('div');
    modal.id = 'lm-stmt-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;backdrop-filter:blur(4px);';

    modal.innerHTML = `
      <div style="background:var(--card,#151922);border:1px solid var(--border,#262f45);border-radius:16px;max-width:820px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.6);color:var(--text,#e8eaf6);font-family:Inter,sans-serif;">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h3 style="font-size:16px;font-weight:700;display:flex;align-items:center;gap:8px;">📄 Bank Statement Import</h3>
            <p style="font-size:11px;color:var(--text2,#8896b8);margin-top:2px;">Found <strong>${txs.length}</strong> transactions (${dupCount} duplicate candidates flagged).</p>
          </div>
          <button id="lm-stmt-close" style="background:none;border:none;color:var(--text2,#8896b8);font-size:22px;cursor:pointer;">&times;</button>
        </div>

        <div style="padding:10px 18px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border,#262f45);display:flex;gap:12px;align-items:center;font-size:11px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" id="lm-stmt-select-all" checked/> Select All Non-Duplicates
          </label>
          <span style="color:var(--text3,#5a6688);">|</span>
          <span id="lm-stmt-selected-summary">Selected: ${txs.filter(t => t.selected).length} / ${txs.length}</span>
        </div>

        <div style="flex:1;overflow-y:auto;overflow-x:auto;padding:12px 18px;-webkit-overflow-scrolling:touch;">
          <table style="width:100%;min-width:540px;border-collapse:collapse;font-size:12px;text-align:left;">
            <thead>
              <tr style="border-bottom:1px solid var(--border,#262f45);color:var(--text2,#8896b8);">
                <th style="padding:8px 6px;"></th>
                <th style="padding:8px 6px;">Date</th>
                <th style="padding:8px 6px;">Description</th>
                <th style="padding:8px 6px;">Category</th>
                <th style="padding:8px 6px;text-align:right;">Amount</th>
                <th style="padding:8px 6px;text-align:center;">Type</th>
              </tr>
            </thead>
            <tbody id="lm-stmt-table-body">
              ${txs.map((t, idx) => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);${t.isDuplicate ? 'opacity:0.6;background:rgba(244,63,94,0.05);' : ''}">
                  <td style="padding:8px 6px;">
                    <input type="checkbox" class="lm-stmt-row-cb" data-idx="${idx}" ${t.selected ? 'checked' : ''}/>
                  </td>
                  <td style="padding:8px 6px;white-space:nowrap;">${t.date}</td>
                  <td style="padding:8px 6px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.name}">
                    ${t.name} ${t.isDuplicate ? '<span style="font-size:10px;background:#f43f5e;color:#fff;padding:1px 5px;border-radius:4px;margin-left:4px;">Duplicate</span>' : ''}
                  </td>
                  <td style="padding:8px 6px;">
                    <input type="text" value="${t.category}" class="lm-stmt-cat-input" data-idx="${idx}" style="background:rgba(0,0,0,0.3);border:1px solid var(--border,#262f45);border-radius:6px;padding:3px 6px;color:var(--text,#e8eaf6);font-size:11px;width:110px;"/>
                  </td>
                  <td style="padding:8px 6px;text-align:right;font-weight:600;color:${t.type === 'in' ? '#10b981' : '#f43f5e'};">
                    ${t.type === 'in' ? '+' : '-'}₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style="padding:8px 6px;text-align:center;">
                    <span style="padding:2px 6px;border-radius:6px;font-size:10px;font-weight:600;background:${t.type === 'in' ? 'rgba(16,185,129,0.15);color:#10b981' : 'rgba(244,63,94,0.15);color:#f43f5e'}">${t.type === 'in' ? 'INCOME' : 'EXPENSE'}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="padding:16px 24px;border-top:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;">
          <button id="lm-stmt-cancel" style="padding:8px 16px;background:transparent;border:1px solid var(--border,#262f45);border-radius:8px;color:var(--text2,#8896b8);cursor:pointer;">Cancel</button>
          <button id="lm-stmt-commit" style="padding:9px 22px;background:linear-gradient(135deg,#00d4b4,#4f8ef7);border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,212,180,0.3);">
            Import Selected Transactions
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners inside modal
    function updateSelectedSummary() {
      var sel = txs.filter(t => t.selected).length;
      document.getElementById('lm-stmt-selected-summary').textContent = `Selected: ${sel} / ${txs.length}`;
    }

    document.getElementById('lm-stmt-close').onclick = () => modal.remove();
    document.getElementById('lm-stmt-cancel').onclick = () => modal.remove();

    document.getElementById('lm-stmt-select-all').onchange = function (e) {
      var check = e.target.checked;
      txs.forEach(t => { if (!t.isDuplicate) t.selected = check; });
      modal.querySelectorAll('.lm-stmt-row-cb').forEach(cb => {
        var idx = parseInt(cb.dataset.idx, 10);
        if (!txs[idx].isDuplicate) cb.checked = check;
      });
      updateSelectedSummary();
    };

    modal.querySelectorAll('.lm-stmt-row-cb').forEach(cb => {
      cb.onchange = function () {
        var idx = parseInt(this.dataset.idx, 10);
        txs[idx].selected = this.checked;
        updateSelectedSummary();
      };
    });

    modal.querySelectorAll('.lm-stmt-cat-input').forEach(inp => {
      inp.onchange = function () {
        var idx = parseInt(this.dataset.idx, 10);
        txs[idx].category = this.value.trim() || 'Other';
      };
    });

    // Commit batch import to IndexedDB
    document.getElementById('lm-stmt-commit').onclick = async function () {
      var toImport = txs.filter(t => t.selected);
      if (!toImport.length) {
        if (typeof showToast === 'function') showToast('No transactions selected for import.', 'warning');
        return;
      }

      this.disabled = true;
      this.textContent = 'Importing...';

      try {
        var count = 0;
        for (var t of toImport) {
          var newTx = {
            date: t.date,
            name: t.name,
            amount: t.amount,
            type: t.type,
            category: t.category,
            notes: t.notes,
            tags: t.tags
          };
          if (typeof window.put === 'function') {
            await window.put('transactions', newTx);
            count++;
          }
        }

        if (typeof showToast === 'function') {
          showToast(`✅ Successfully imported ${count} transactions!`, 'success');
        }

        modal.remove();

        // Refresh UI
        if (typeof window.renderAll === 'function') {
          await window.loadAllFromDB?.();
          window.renderAll();
        }
      } catch (err) {
        console.error('[StatementParser] Import failed:', err);
        if (typeof showToast === 'function') showToast('Import failed: ' + err.message, 'error');
        modal.remove();
      }
    };
  }

  // File picker handler
  function openStatementFilePicker() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt,.tsv';
    input.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function (evt) {
        var content = evt.target.result;
        var res = parseStatement(content);
        if (res.error) {
          if (typeof showToast === 'function') showToast(res.error, 'error');
          return;
        }
        showImportModal(res);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  window.LM_StatementParser = {
    cleanAmount: cleanAmount,
    parseFlexibleDate: parseFlexibleDate,
    parseCSV: parseCSV,
    parseStatement: parseStatement,
    showImportModal: showImportModal,
    openFilePicker: openStatementFilePicker
  };

  console.log('[LM] StatementParser module initialized.');
})();
