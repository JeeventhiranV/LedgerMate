/**
 * LedgerMate – StatementParser.js
 * ─────────────────────────────────────────────────────────────
 * Smart Bank Statement (CSV & Password-Protected PDF) Importer
 * with Automated Bank Reconciliation & Discrepancy Detection.
 *
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

  // Main CSV Statement Parser
  function parseStatement(csvContent) {
    var rows = parseCSV(csvContent);
    if (!rows || rows.length < 2) {
      return { error: 'File is empty or contains insufficient data rows.' };
    }

    var headerIdx = -1;
    var colMap = null;
    for (var r = 0; r < Math.min(rows.length, 15); r++) {
      var map = detectColumns(rows[r]);
      if (map.date !== -1 && (map.amount !== -1 || (map.debit !== -1 && map.credit !== -1) || map.desc !== -1)) {
        headerIdx = r;
        colMap = map;
        break;
      }
    }

    if (headerIdx === -1 || !colMap) {
      return { error: 'Could not automatically identify bank statement headers. Please ensure Date and Amount columns are present.' };
    }

    var transactions = [];
    var existingTxs = (window.state && Array.isArray(window.state.transactions)) ? window.state.transactions : [];

    for (var i = headerIdx + 1; i < rows.length; i++) {
      var row = rows[i];
      if (row.length <= 1 || !row[colMap.date]) continue;

      var date = parseFlexibleDate(row[colMap.date]);
      var desc = colMap.desc !== -1 ? (row[colMap.desc] || 'Bank Transaction').trim() : 'Bank Transaction';

      var amount = 0;
      var type = 'out';

      if (colMap.debit !== -1 && colMap.credit !== -1) {
        var deb = cleanAmount(row[colMap.debit]);
        var cred = cleanAmount(row[colMap.credit]);
        if (cred > 0 && deb === 0) {
          amount = cred;
          type = 'in';
        } else {
          amount = deb;
          type = 'out';
        }
      } else if (colMap.amount !== -1) {
        amount = cleanAmount(row[colMap.amount]);
        if (colMap.type !== -1) {
          var tStr = (row[colMap.type] || '').toLowerCase();
          if (tStr.includes('cr') || tStr.includes('credit') || tStr.includes('deposit') || tStr.includes('in')) {
            type = 'in';
          }
        }
      }

      if (amount <= 0) continue;

      var category = 'Other';
      if (window.LM_CategoryRules) {
        if (typeof window.LM_CategoryRules.suggestCategory === 'function') {
          category = window.LM_CategoryRules.suggestCategory(desc, type);
        } else if (typeof window.LM_CategoryRules.categorize === 'function') {
          category = window.LM_CategoryRules.categorize(desc, amount);
        }
      }
      if ((!category || category === 'Other') && window.LM_PDFStatementParser && typeof window.LM_PDFStatementParser.guessCategory === 'function') {
        category = window.LM_PDFStatementParser.guessCategory(desc);
      }

      var isDuplicate = existingTxs.some(t => {
        return (
          t.date === date &&
          Math.abs(Number(t.amount) - amount) < 0.01 &&
          (t.type || 'out') === type
        );
      });

      transactions.push({
        id: 'stmt_tx_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36),
        date: date,
        name: desc,
        amount: amount,
        type: type,
        category: category,
        notes: `Imported via Bank Statement`,
        tags: 'Statement Import',
        isDuplicate: isDuplicate,
        selected: !isDuplicate
      });
    }

    if (!transactions.length) {
      return { error: 'No valid transaction records found in statement.' };
    }

    return {
      totalRows: rows.length,
      parsedTransactions: transactions.length,
      duplicates: transactions.filter(t => t.isDuplicate).length,
      transactions: transactions
    };
  }

  // Show Password Prompt for Encrypted PDFs
  function showPasswordModal(onUnlock) {
    var modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.id = 'lm-stmt-password-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;';

    modal.innerHTML = `
      <div style="background:var(--surface-card,#0c1026);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:18px;max-width:440px;width:100%;padding:24px;box-shadow:0 16px 40px rgba(0,0,0,0.6);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <h3 style="margin:0;font-size:17px;font-weight:700;color:var(--text,#f1f5f9);display:flex;align-items:center;gap:8px;">
            <span>🔒</span> Password-Protected Statement
          </h3>
          <button id="lm-pwd-close" style="background:none;border:none;color:var(--text-3,#64748b);font-size:20px;cursor:pointer;">×</button>
        </div>
        <p style="font-size:13px;color:var(--text-2,#94a3b8);line-height:1.5;margin-bottom:16px;">
          This PDF statement is encrypted by your bank. Your password is processed 100% in your browser and never leaves your device.
        </p>
        <div style="background:rgba(0,240,255,0.06);border:1px solid rgba(0,240,255,0.2);border-radius:10px;padding:12px;margin-bottom:16px;font-size:12px;color:var(--teal,#00f0ff);line-height:1.4;">
          <strong>💡 Standard Bank Password Formats:</strong><br>
          • <strong>HDFC/ICICI:</strong> PAN in UPPERCASE + DOB (DDMMYYYY)<br>
          • <strong>SBI:</strong> Last 5 digits of Account + DOB (DDMMYYYY)<br>
          • <strong>Axis/Kotak:</strong> First 4 letters of name + DOB (DDMM)
        </div>
        <div style="margin-bottom:20px;">
          <label style="display:block;font-size:12px;font-weight:600;color:var(--text-2,#94a3b8);margin-bottom:6px;">Statement Password</label>
          <input type="password" id="lm-pwd-input" placeholder="Enter bank PDF password" style="width:100%;box-sizing:border-box;padding:10px 14px;background:var(--bg3,#111736);border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:8px;color:#fff;font-size:14px;outline:none;" />
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;">
          <button id="lm-pwd-cancel" style="padding:8px 16px;background:transparent;border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:8px;color:var(--text-2,#94a3b8);cursor:pointer;">Cancel</button>
          <button id="lm-pwd-submit" style="padding:8px 20px;background:linear-gradient(135deg,#00f0ff,#38bdf8);border:none;border-radius:8px;color:#070914;font-weight:700;cursor:pointer;">Unlock & Parse</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('lm-pwd-input');
    input.focus();

    function close() { modal.remove(); }
    document.getElementById('lm-pwd-close').onclick = close;
    document.getElementById('lm-pwd-cancel').onclick = close;

    document.getElementById('lm-pwd-submit').onclick = function () {
      const pwd = input.value.trim();
      if (!pwd) {
        if (typeof showToast === 'function') showToast('Please enter password', 'warning');
        return;
      }
      close();
      if (typeof onUnlock === 'function') onUnlock(pwd);
    };

    input.onkeydown = function(e) {
      if (e.key === 'Enter') document.getElementById('lm-pwd-submit').click();
    };
  }

  // Show Import Modal with Preview and Reconciliation Trigger
  function showImportModal(parsedResult) {
    var txs = parsedResult.transactions;
    var modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.id = 'lm-stmt-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

    modal.innerHTML = `
      <div style="background:var(--surface-card,#0c1026);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:16px;max-width:880px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 12px 36px rgba(0,0,0,0.5);overflow:hidden;">
        
        <div style="padding:16px 24px;border-bottom:1px solid var(--border,rgba(255,255,255,0.1));display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h3 style="margin:0;font-size:18px;font-weight:700;color:var(--text,#f1f5f9);display:flex;align-items:center;gap:8px;">
              <span>📄</span> Statement Preview (${txs.length} transactions)
            </h3>
            <div style="font-size:12px;color:var(--text-2,#94a3b8);margin-top:4px;">
              Found ${parsedResult.duplicates || 0} potential duplicates (pre-deselected).
            </div>
          </div>
          <button id="lm-stmt-close" style="background:none;border:none;color:var(--text-3,#64748b);font-size:24px;cursor:pointer;">×</button>
        </div>

        <div style="padding:12px 24px;background:rgba(0,0,0,0.2);display:flex;justify-content:space-between;align-items:center;font-size:12px;border-bottom:1px solid var(--border,rgba(255,255,255,0.06));">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:var(--text,#f1f5f9);font-weight:600;">
            <input type="checkbox" id="lm-stmt-select-all" checked style="cursor:pointer;" /> Select All Non-Duplicates
          </label>
          <span id="lm-stmt-selected-summary" style="color:var(--teal,#00f0ff);font-weight:600;">
            Selected: ${txs.filter(t => t.selected).length} / ${txs.length}
          </span>
        </div>

        <div style="flex:1;overflow-y:auto;padding:12px 24px;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;color:var(--text,#f1f5f9);">
            <thead>
              <tr style="border-bottom:1px solid var(--border,rgba(255,255,255,0.1));text-align:left;color:var(--text-3,#64748b);">
                <th style="padding:8px 4px;width:32px;"></th>
                <th style="padding:8px 6px;">Date</th>
                <th style="padding:8px 6px;">Description</th>
                <th style="padding:8px 6px;">Category</th>
                <th style="padding:8px 6px;text-align:right;">Amount</th>
                <th style="padding:8px 6px;text-align:center;">Type</th>
              </tr>
            </thead>
            <tbody>
              ${txs.map((t, idx) => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);${t.isDuplicate ? 'opacity:0.45;background:rgba(239,68,68,0.04);' : ''}">
                  <td style="padding:8px 4px;">
                    <input type="checkbox" class="lm-stmt-row-cb" data-idx="${idx}" ${t.selected ? 'checked' : ''} style="cursor:pointer;" />
                  </td>
                  <td style="padding:8px 6px;white-space:nowrap;font-family:var(--font-m,monospace);">${t.date}</td>
                  <td style="padding:8px 6px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.name}">
                    ${t.name}
                    ${t.isDuplicate ? '<span style="margin-left:6px;font-size:10px;color:var(--rose,#f43f5e);font-weight:600;">⚠️ Exists</span>' : ''}
                  </td>
                  <td style="padding:8px 6px;">
                    <input type="text" class="lm-stmt-cat-input" data-idx="${idx}" value="${t.category}" style="background:var(--bg3,#111736);border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:4px;color:#fff;padding:2px 6px;font-size:11px;width:95px;" />
                  </td>
                  <td style="padding:8px 6px;text-align:right;font-weight:600;font-family:var(--font-m,monospace);color:${t.type === 'in' ? 'var(--emerald,#10b981)' : 'var(--rose,#f43f5e)'};">
                    ${t.type === 'in' ? '+' : '−'}₹${t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style="padding:8px 6px;text-align:center;">
                    <span style="padding:2px 6px;border-radius:6px;font-size:10px;font-weight:600;background:${t.type === 'in' ? 'rgba(16,185,129,0.15);color:#10b981' : 'rgba(244,63,94,0.15);color:#f43f5e'}">${t.type === 'in' ? 'INCOME' : 'EXPENSE'}</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="padding:16px 24px;border-top:1px solid var(--border,rgba(255,255,255,0.1));display:flex;justify-content:space-between;align-items:center;">
          <button id="lm-stmt-cancel" style="padding:8px 16px;background:transparent;border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:8px;color:var(--text-2,#94a3b8);cursor:pointer;">Cancel</button>
          
          <div style="display:flex;gap:10px;">
            <button id="lm-stmt-reconcile-btn" style="padding:9px 18px;background:rgba(0,240,255,0.1);border:1px solid rgba(0,240,255,0.35);border-radius:8px;color:var(--teal,#00f0ff);font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;">
              <span>⚖️</span> Reconcile with Ledger
            </button>
            <button id="lm-stmt-commit" style="padding:9px 22px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,0.3);">
              Import Selected Transactions
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

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

    // Reconcile Button
    document.getElementById('lm-stmt-reconcile-btn').onclick = function () {
      modal.remove();
      showReconciliationModal(parsedResult);
    };

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
            id: t.id || ('tx_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36)),
            date: t.date,
            amount: t.amount,
            type: t.type,
            category: t.category,
            account: 'Bank Account',
            note: t.name,
            refNo: t.refNo || '',
            createdAt: new Date().toISOString()
          };
          if (typeof window.put === 'function') {
            await window.put('transactions', newTx);
            if (window.state && Array.isArray(window.state.transactions)) {
              window.state.transactions.push(newTx);
            }
            count++;
          }
        }

        if (typeof showToast === 'function') {
          showToast(`✅ Successfully imported ${count} transactions!`, 'success');
        }

        modal.remove();

        // Broadcast mutation across tabs
        if (typeof window !== 'undefined' && window.LM_Bus) {
          window.LM_Bus.broadcast('lm:data:changed', { store: 'transactions', action: 'import', count: count });
        }

        // Refresh UI
        if (typeof window.renderAll === 'function') {
          window.renderAll();
        }
        if (typeof window.refreshRecentList === 'function') {
          window.refreshRecentList();
        }
      } catch (err) {
        console.error('[StatementParser] Import failed:', err);
        if (typeof showToast === 'function') showToast('Import failed: ' + err.message, 'error');
        modal.remove();
      }
    };
  }

  // Show Automated Bank Reconciliation Modal
  function showReconciliationModal(parsedResult) {
    if (!window.LM_ReconciliationEngine) {
      if (typeof showToast === 'function') showToast('Reconciliation engine not loaded', 'error');
      return;
    }

    const ledgerTxs = (window.state && Array.isArray(window.state.transactions)) ? window.state.transactions : [];
    const report = window.LM_ReconciliationEngine.reconcile(parsedResult.transactions, ledgerTxs);
    const sum = report.summary;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay show';
    modal.id = 'lm-reconciliation-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

    const fmtMoney = num => '₹' + Math.abs(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    modal.innerHTML = `
      <div style="background:var(--surface-card,#0c1026);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:18px;max-width:960px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,0.6);overflow:hidden;">
        
        <!-- Header -->
        <div style="padding:16px 24px;border-bottom:1px solid var(--border,rgba(255,255,255,0.1));display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h3 style="margin:0;font-size:18px;font-weight:700;color:var(--text,#f1f5f9);display:flex;align-items:center;gap:8px;">
              <span>⚖️</span> Bank Statement Reconciliation Matrix
            </h3>
            <div style="font-size:12px;color:var(--text-2,#94a3b8);margin-top:3px;">
              Reconciled against ${ledgerTxs.length} ledger transactions · Settlement grace ±2 days
            </div>
          </div>
          <button id="lm-rec-close" style="background:none;border:none;color:var(--text-3,#64748b);font-size:24px;cursor:pointer;">×</button>
        </div>

        <!-- Telemetry & KPI Strip -->
        <div style="padding:14px 24px;background:rgba(0,0,0,0.25);display:grid;grid-template-columns:repeat(4,1fr);gap:12px;border-bottom:1px solid var(--border,rgba(255,255,255,0.08));">
          <div style="background:var(--bg3,#111736);padding:10px 14px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,0.06));">
            <div style="font-size:11px;color:var(--text-3,#64748b);text-transform:uppercase;font-weight:600;">Statement Net</div>
            <div style="font-size:15px;font-weight:700;color:${sum.statementNet >= 0 ? 'var(--emerald,#10b981)' : 'var(--rose,#f43f5e)'};font-family:var(--font-m,monospace);margin-top:2px;">
              ${sum.statementNet >= 0 ? '+' : '−'}${fmtMoney(sum.statementNet)}
            </div>
            <div style="font-size:10px;color:var(--text-3,#64748b);margin-top:2px;">${sum.totalStatementTransactions} items</div>
          </div>

          <div style="background:var(--bg3,#111736);padding:10px 14px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,0.06));">
            <div style="font-size:11px;color:var(--text-3,#64748b);text-transform:uppercase;font-weight:600;">Ledger Net</div>
            <div style="font-size:15px;font-weight:700;color:${sum.ledgerNet >= 0 ? 'var(--emerald,#10b981)' : 'var(--rose,#f43f5e)'};font-family:var(--font-m,monospace);margin-top:2px;">
              ${sum.ledgerNet >= 0 ? '+' : '−'}${fmtMoney(sum.ledgerNet)}
            </div>
            <div style="font-size:10px;color:var(--text-3,#64748b);margin-top:2px;">${ledgerTxs.length} items</div>
          </div>

          <div style="background:var(--bg3,#111736);padding:10px 14px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,0.06));">
            <div style="font-size:11px;color:var(--text-3,#64748b);text-transform:uppercase;font-weight:600;">Variance</div>
            <div style="font-size:15px;font-weight:700;color:${sum.variance === 0 ? 'var(--emerald,#10b981)' : 'var(--amber,#f59e0b)'};font-family:var(--font-m,monospace);margin-top:2px;">
              ${sum.variance === 0 ? 'Balanced (₹0)' : fmtMoney(sum.variance)}
            </div>
            <div style="font-size:10px;color:var(--text-3,#64748b);margin-top:2px;">Difference</div>
          </div>

          <div style="background:var(--bg3,#111736);padding:10px 14px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,0.06));">
            <div style="font-size:11px;color:var(--text-3,#64748b);text-transform:uppercase;font-weight:600;">Match Rate</div>
            <div style="font-size:15px;font-weight:700;color:var(--teal,#00f0ff);font-family:var(--font-m,monospace);margin-top:2px;">
              ${sum.reconciliationRate}%
            </div>
            <div style="font-size:10px;color:var(--text-3,#64748b);margin-top:2px;">${sum.matchedCount} of ${sum.totalStatementTransactions} matched</div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div style="padding:10px 24px;border-bottom:1px solid var(--border,rgba(255,255,255,0.06));display:flex;gap:8px;">
          <button class="lm-rec-tab active" data-tab="all" style="padding:5px 12px;background:rgba(0,240,255,0.15);color:var(--teal,#00f0ff);border:1px solid rgba(0,240,255,0.3);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">
            All (${sum.totalStatementTransactions})
          </button>
          <button class="lm-rec-tab" data-tab="matched" style="padding:5px 12px;background:transparent;color:var(--text-2,#94a3b8);border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">
            ✅ Matched (${sum.matchedCount})
          </button>
          <button class="lm-rec-tab" data-tab="missing_ledger" style="padding:5px 12px;background:transparent;color:var(--text-2,#94a3b8);border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">
            ⚠️ Missing in Ledger (${sum.unmatchedStatementCount})
          </button>
          <button class="lm-rec-tab" data-tab="uncleared" style="padding:5px 12px;background:transparent;color:var(--text-2,#94a3b8);border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">
            🕒 Uncleared in Stmt (${sum.unmatchedLedgerCount})
          </button>
          ${sum.discrepancyCount > 0 ? `
            <button class="lm-rec-tab" data-tab="discrepancies" style="padding:5px 12px;background:transparent;color:var(--rose,#f43f5e);border:1px solid rgba(244,63,94,0.3);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">
              ⚡ Discrepancies (${sum.discrepancyCount})
            </button>
          ` : ''}
        </div>

        <!-- Table View Container -->
        <div id="lm-rec-table-wrap" style="flex:1;overflow-y:auto;padding:12px 24px;">
          <!-- Dynamically populated by renderTabContent -->
        </div>

        <!-- Footer Actions -->
        <div style="padding:14px 24px;border-top:1px solid var(--border,rgba(255,255,255,0.1));display:flex;justify-content:space-between;align-items:center;">
          <button id="lm-rec-cancel" style="padding:8px 16px;background:transparent;border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:8px;color:var(--text-2,#94a3b8);cursor:pointer;">Close</button>
          
          <div style="display:flex;gap:10px;">
            ${sum.unmatchedStatementCount > 0 ? `
              <button id="lm-rec-import-missing" style="padding:8px 18px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);border-radius:8px;color:var(--amber,#f59e0b);font-weight:600;cursor:pointer;">
                📥 Import ${sum.unmatchedStatementCount} Missing into Ledger
              </button>
            ` : ''}
            <button id="lm-rec-apply-matched" style="padding:9px 22px;background:linear-gradient(135deg,#00f0ff,#38bdf8);border:none;border-radius:8px;color:#070914;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,240,255,0.25);">
              ✅ Mark ${sum.matchedCount} as Reconciled
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    function renderTabContent(tab) {
      const wrap = document.getElementById('lm-rec-table-wrap');
      if (!wrap) return;

      let html = `
        <table style="width:100%;border-collapse:collapse;font-size:12px;color:var(--text,#f1f5f9);">
          <thead>
            <tr style="border-bottom:1px solid var(--border,rgba(255,255,255,0.1));text-align:left;color:var(--text-3,#64748b);">
              <th style="padding:8px 6px;">Status</th>
              <th style="padding:8px 6px;">Date</th>
              <th style="padding:8px 6px;">Statement Narration</th>
              <th style="padding:8px 6px;">Ledger Note</th>
              <th style="padding:8px 6px;text-align:right;">Amount</th>
            </tr>
          </thead>
          <tbody>
      `;

      // 1. Matched rows
      if (tab === 'all' || tab === 'matched') {
        report.matched.forEach(p => {
          const s = p.statementTx;
          const l = p.ledgerTx;
          html += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
              <td style="padding:8px 6px;">
                <span style="background:rgba(16,185,129,0.15);color:#10b981;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">
                  ✅ Matched (${p.matchType === 'exact' ? 'Exact' : '±' + p.dateDiff + 'd'})
                </span>
              </td>
              <td style="padding:8px 6px;font-family:var(--font-m,monospace);">${s.date}</td>
              <td style="padding:8px 6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${s.name}">${s.name}</td>
              <td style="padding:8px 6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${l.note || l.category}">${l.note || l.category}</td>
              <td style="padding:8px 6px;text-align:right;font-family:var(--font-m,monospace);font-weight:600;color:${s.type === 'in' ? 'var(--emerald,#10b981)' : 'var(--rose,#f43f5e)'};">
                ${s.type === 'in' ? '+' : '−'}${fmtMoney(s.amount)}
              </td>
            </tr>
          `;
        });
      }

      // 2. Missing in Ledger rows
      if (tab === 'all' || tab === 'missing_ledger') {
        report.unmatchedStatement.forEach(s => {
          html += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);background:rgba(245,158,11,0.04);">
              <td style="padding:8px 6px;">
                <span style="background:rgba(245,158,11,0.15);color:#f59e0b;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">
                  ⚠️ Missing in Ledger
                </span>
              </td>
              <td style="padding:8px 6px;font-family:var(--font-m,monospace);">${s.date}</td>
              <td style="padding:8px 6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${s.name}">${s.name}</td>
              <td style="padding:8px 6px;color:var(--text-3,#64748b);font-style:italic;">Not recorded</td>
              <td style="padding:8px 6px;text-align:right;font-family:var(--font-m,monospace);font-weight:600;color:${s.type === 'in' ? 'var(--emerald,#10b981)' : 'var(--rose,#f43f5e)'};">
                ${s.type === 'in' ? '+' : '−'}${fmtMoney(s.amount)}
              </td>
            </tr>
          `;
        });
      }

      // 3. Uncleared in Statement rows
      if (tab === 'all' || tab === 'uncleared') {
        report.unmatchedLedger.forEach(l => {
          html += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);background:rgba(148,163,184,0.04);">
              <td style="padding:8px 6px;">
                <span style="background:rgba(148,163,184,0.15);color:#94a3b8;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;">
                  🕒 Uncleared
                </span>
              </td>
              <td style="padding:8px 6px;font-family:var(--font-m,monospace);">${l.date}</td>
              <td style="padding:8px 6px;color:var(--text-3,#64748b);font-style:italic;">Not cleared by bank</td>
              <td style="padding:8px 6px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${l.note || l.category}">${l.note || l.category}</td>
              <td style="padding:8px 6px;text-align:right;font-family:var(--font-m,monospace);font-weight:600;color:${l.type === 'in' ? 'var(--emerald,#10b981)' : 'var(--rose,#f43f5e)'};">
                ${l.type === 'in' ? '+' : '−'}${fmtMoney(l.amount)}
              </td>
            </tr>
          `;
        });
      }

      html += `</tbody></table>`;
      wrap.innerHTML = html;
    }

    renderTabContent('all');

    // Tab switcher events
    modal.querySelectorAll('.lm-rec-tab').forEach(btn => {
      btn.onclick = function() {
        modal.querySelectorAll('.lm-rec-tab').forEach(b => {
          b.style.background = 'transparent';
          b.style.color = 'var(--text-2,#94a3b8)';
          b.style.borderColor = 'var(--border,rgba(255,255,255,0.08))';
        });
        this.style.background = 'rgba(0,240,255,0.15)';
        this.style.color = 'var(--teal,#00f0ff)';
        this.style.borderColor = 'rgba(0,240,255,0.3)';
        renderTabContent(this.dataset.tab);
      };
    });

    // Close actions
    document.getElementById('lm-rec-close').onclick = () => modal.remove();
    document.getElementById('lm-rec-cancel').onclick = () => modal.remove();

    // Mark matched as reconciled action
    document.getElementById('lm-rec-apply-matched').onclick = async function () {
      this.disabled = true;
      this.textContent = 'Reconciling...';
      const count = await window.LM_ReconciliationEngine.applyReconciliation(report.matched);
      if (typeof showToast === 'function') {
        showToast(`✅ Successfully stamped ${count} transactions as Reconciled!`, 'success');
      }
      modal.remove();
      if (typeof window.renderAll === 'function') window.renderAll();
      if (typeof window.refreshRecentList === 'function') window.refreshRecentList();
    };

    // Import missing items action
    const importMissingBtn = document.getElementById('lm-rec-import-missing');
    if (importMissingBtn) {
      importMissingBtn.onclick = async function () {
        this.disabled = true;
        this.textContent = 'Importing...';
        const imported = await window.LM_ReconciliationEngine.importMissingToLedger(report.unmatchedStatement);
        if (typeof showToast === 'function') {
          showToast(`📥 Successfully imported ${imported.length} missing transactions!`, 'success');
        }
        modal.remove();
        if (typeof window.renderAll === 'function') window.renderAll();
        if (typeof window.refreshRecentList === 'function') window.refreshRecentList();
      };
    }
  }

  // Universal File Picker Handler (CSV, TXT, TSV & PDF)
  function openStatementFilePicker() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt,.tsv,.pdf';
    input.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;

      const isPDF = file.name.toLowerCase().endsWith('.pdf');

      if (isPDF) {
        var reader = new FileReader();
        reader.onload = async function (evt) {
          var arrayBuffer = evt.target.result;
          if (!window.LM_PDFStatementParser) {
            if (typeof showToast === 'function') showToast('PDF parser engine not loaded', 'error');
            return;
          }

          try {
            var res = await window.LM_PDFStatementParser.parsePDFBuffer(arrayBuffer);
            if (res.requiresPassword) {
              showPasswordModal(async function(password) {
                try {
                  var unlockedRes = await window.LM_PDFStatementParser.parsePDFBuffer(arrayBuffer, password);
                  if (unlockedRes.requiresPassword) {
                    if (typeof showToast === 'function') showToast('Incorrect password for this statement', 'error');
                    return;
                  }
                  showImportModal(unlockedRes);
                } catch (err) {
                  if (typeof showToast === 'function') showToast('PDF Decryption Error: ' + err.message, 'error');
                }
              });
              return;
            }

            if (!res.transactions || res.transactions.length === 0) {
              if (typeof showToast === 'function') showToast('No transaction tables found in this PDF.', 'warning');
              return;
            }

            showImportModal(res);
          } catch (pdfErr) {
            console.error('[StatementParser] PDF parse error:', pdfErr);
            if (typeof showToast === 'function') showToast('Failed to parse PDF statement: ' + pdfErr.message, 'error');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        // Standard CSV / Text
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
      }
    };
    input.click();
  }

  const StatementParser = {
    cleanAmount: cleanAmount,
    parseFlexibleDate: parseFlexibleDate,
    parseCSV: parseCSV,
    parseStatement: parseStatement,
    showImportModal: showImportModal,
    showReconciliationModal: showReconciliationModal,
    showPasswordModal: showPasswordModal,
    openFilePicker: openStatementFilePicker
  };

  if (typeof window !== 'undefined') {
    window.LM_StatementParser = StatementParser;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatementParser;
  }

  console.log('[LM] StatementParser module initialized with PDF & Reconciliation Engine.');
})();
