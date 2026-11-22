/**
 * LedgerMate – SmartQuickAdd.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Intelligent Quick Transaction Capture & Bank SMS Parser.
 * Capabilities:
 *  1. Parses Indian & International Bank SMS texts (HDFC, SBI, ICICI, Axis, UPI, etc.)
 *  2. Generates Frequent Payee / Quick Action chips from transaction history.
 *  3. Injects interactive SMS paste helper and quick chips into Add Transaction modal.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── 1. Bank SMS Regex Parser Engine ────────────────────────
  function parseBankSMS(text) {
    if (!text || typeof text !== 'string') return null;
    const cleanText = text.trim();

    // Regex for Amount: INR 450, Rs. 1,250.00, Rs 500, ₹350.50, USD 25
    const amountRegex = /(?:INR|Rs\.?|₹|USD|EUR|GBP)\s*([\d,]+(?:\.\d{1,2})?)/i;
    const amountMatch = cleanText.match(amountRegex);
    if (!amountMatch) return null;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) return null;

    // Detect Type: Debited / Spent / Sent / Paid vs Credited / Received
    let type = 'expense';
    if (/credited|received|deposited|refunded/i.test(cleanText)) {
      type = 'income';
    }

    // Detect Merchant / Payee
    let payee = '';
    const atMatch = cleanText.match(/(?:at|to|info[:\s]|VPA)\s+([A-Za-z0-9\s*._-]+?)(?:\s+(?:on|ref|avl|bal|ending|via|\.|\,)|$)/i);
    if (atMatch && atMatch[1]) {
      payee = atMatch[1].replace(/\*/g, '').trim();
    }
    if (!payee || payee.length > 35) {
      payee = type === 'expense' ? 'Bank Expense' : 'Bank Credit';
    }

    // Detect Payment Mode
    let mode = 'UPI';
    if (/credit\s*card/i.test(cleanText)) {
      mode = 'Credit Card';
    } else if (/debit\s*card/i.test(cleanText)) {
      mode = 'Debit Card';
    } else if (/netbanking|neft|rtgs|imps/i.test(cleanText)) {
      mode = 'Bank Transfer';
    } else if (/cash/i.test(cleanText)) {
      mode = 'Cash';
    }

    // Auto-infer Category based on common Indian merchants
    let category = 'Other';
    const lowerText = cleanText.toLowerCase();
    if (/swiggy|zomato|mcdonald|kfc|starbucks|chai|tea|restaurant|cafe|food/i.test(lowerText)) {
      category = 'Food & Dining';
    } else if (/uber|ola|rapido|metro|petrol|fuel|shell|hpcl|bpcl|transport/i.test(lowerText)) {
      category = 'Transportation';
    } else if (/blinkit|zepto|instamart|dmart|grocery|supermarket/i.test(lowerText)) {
      category = 'Groceries';
    } else if (/amazon|flipkart|myntra|ajio|shopping|zara/i.test(lowerText)) {
      category = 'Shopping';
    } else if (/netflix|spotify|prime|youtube|hotstar|subscription/i.test(lowerText)) {
      category = 'Entertainment';
    } else if (/electricity|bescom|airtel|jio|broadband|water|utility/i.test(lowerText)) {
      category = 'Utilities';
    } else if (/hospital|pharmacy|apollo|medplus|doctor|health/i.test(lowerText)) {
      category = 'Healthcare';
    } else if (type === 'income') {
      category = /salary|payroll/i.test(lowerText) ? 'Salary' : 'Other Income';
    }

    return {
      amount,
      type,
      payee,
      mode,
      category,
      raw: cleanText
    };
  }

  // ── 2. Frequent Quick Action Chips ─────────────────────────
  function getFrequentChips(limit = 6) {
    const txs = (window.state && Array.isArray(window.state.transactions)) ? window.state.transactions : [];
    if (!txs.length) {
      return [
        { label: '☕ Chai / Coffee', amount: 20, category: 'Food & Dining', mode: 'UPI' },
        { label: '🍱 Lunch / Dinner', amount: 150, category: 'Food & Dining', mode: 'UPI' },
        { label: '🛒 Groceries', amount: 350, category: 'Groceries', mode: 'UPI' },
        { label: '⛽ Fuel / Petrol', amount: 500, category: 'Transportation', mode: 'UPI' }
      ];
    }

    // Count frequency of title + amount
    const freqMap = new Map();
    const recent = txs.slice(-150); // check last 150 transactions
    for (const t of recent) {
      if (!t.title || !t.amount) continue;
      const key = `${t.title.trim()}:::${t.amount}:::${t.category || 'Other'}:::${t.mode || 'UPI'}`;
      freqMap.set(key, (freqMap.get(key) || 0) + 1);
    }

    const sorted = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    if (!sorted.length) {
      return [
        { label: '☕ Chai', amount: 20, category: 'Food & Dining', mode: 'UPI' },
        { label: '🍱 Lunch', amount: 150, category: 'Food & Dining', mode: 'UPI' }
      ];
    }

    return sorted.map(([k]) => {
      const parts = k.split(':::');
      return {
        label: parts[0],
        amount: parseFloat(parts[1]),
        category: parts[2],
        mode: parts[3]
      };
    });
  }

  // ── 3. Apply Chip or Parsed Data to Add Modal ──────────────
  function applyToForm(data) {
    if (!data) return;

    const amountEl = document.getElementById('tx_amount') || document.getElementById('txAmount') || document.getElementById('amount');
    if (amountEl && data.amount) {
      amountEl.value = data.amount;
    }

    const noteEl = document.getElementById('tx_note') || document.getElementById('txTitle') || document.getElementById('title');
    if (noteEl && (data.payee || data.label)) {
      noteEl.value = data.payee || data.label;
    }

    const typeEl = document.getElementById('tx_type') || document.getElementById('txType') || document.getElementById('type');
    if (typeEl && data.type) {
      const normalizedType = (data.type === 'expense' || data.type === 'out') ? 'out' : 'in';
      typeEl.value = (typeEl.id === 'tx_type') ? normalizedType : data.type;
      const typeBtn = document.querySelector(`.atx-type-btn[data-val="${normalizedType}"]`);
      if (typeBtn) {
        document.querySelectorAll('.atx-type-btn').forEach(b => b.classList.remove('active'));
        typeBtn.classList.add('active');
      }
    }

    const catEl = document.getElementById('tx_category') || document.getElementById('txCategory') || document.getElementById('category');
    if (catEl && data.category) {
      if (catEl.tagName === 'SELECT') {
        for (let i = 0; i < catEl.options.length; i++) {
          if (catEl.options[i].text.toLowerCase().includes(data.category.toLowerCase()) ||
              catEl.options[i].value.toLowerCase().includes(data.category.toLowerCase())) {
            catEl.selectedIndex = i;
            break;
          }
        }
      } else {
        catEl.value = data.category;
      }
      const chip = Array.from(document.querySelectorAll('.atx-cat-chip')).find(c =>
        (c.dataset.cat || '').toLowerCase().includes(data.category.toLowerCase())
      );
      if (chip) {
        document.querySelectorAll('.atx-cat-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        if (catEl) catEl.value = chip.dataset.cat;
      }
    }

    const accEl = document.getElementById('tx_account') || document.getElementById('txMode') || document.getElementById('mode');
    if (accEl && (data.account || data.mode)) {
      const targetVal = data.account || data.mode;
      if (accEl.tagName === 'SELECT') {
        for (let i = 0; i < accEl.options.length; i++) {
          if (accEl.options[i].text.toLowerCase().includes(targetVal.toLowerCase()) ||
              accEl.options[i].value.toLowerCase().includes(targetVal.toLowerCase())) {
            accEl.selectedIndex = i;
            break;
          }
        }
      } else {
        accEl.value = targetVal;
      }
    }

    if (typeof showToast === 'function') {
      showToast(`⚡ Filled: ${data.payee || data.label} - ₹${data.amount}`, 'success');
    }
  }

  // ── 4. In-Modal UI Enhancements Hook ───────────────────────
  function injectQuickAddBar() {
    const modal = document.querySelector('.atx-modal') || document.getElementById('txModal') || document.getElementById('addTxModal');
    if (!modal) return;

    let bar = document.getElementById('smartQuickAddBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'smartQuickAddBar';
      bar.style.padding = '10px 14px';
      bar.style.background = 'rgba(0, 240, 255, 0.04)';
      bar.style.borderBottom = '1px solid var(--border2, rgba(255,255,255,0.06))';
      bar.style.borderRadius = '14px 14px 0 0';

      const header = modal.querySelector('.modal-header') || modal.querySelector('h3');
      if (header && header.nextSibling) {
        header.parentNode.insertBefore(bar, header.nextSibling);
      } else {
        modal.prepend(bar);
      }
    }

    const chips = getFrequentChips(5);
    let chipsHtml = chips.map(c => `
      <button type="button" class="quick-chip-btn" onclick="window.LM_SmartQuickAdd.applyChip('${encodeURIComponent(JSON.stringify(c))}')" style="background:var(--bg3,#1e293b);border:1px solid var(--border2,rgba(255,255,255,0.08));color:var(--text,#f8fafc);padding:5px 10px;border-radius:18px;font-size:11px;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:4px;">
        <span>${c.label}</span>
        <span style="color:#00f0ff;font-weight:700;">₹${c.amount}</span>
      </button>
    `).join('');

    bar.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
        <span style="font-size:11px;font-weight:700;color:var(--text-3,#94a3b8);text-transform:uppercase;letter-spacing:0.5px;">⚡ Quick Presets</span>
        <button type="button" onclick="window.LM_SmartQuickAdd.promptPasteSMS()" style="background:transparent;border:none;color:#38bdf8;font-size:11px;cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-weight:600;">
          <span>📋 Paste Bank SMS</span>
        </button>
      </div>
      <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;" class="custom-scroll">
        ${chipsHtml}
      </div>
    `;
  }

  async function promptPasteSMS() {
    let text = '';
    if (navigator.clipboard && navigator.clipboard.readText) {
      try {
        text = await navigator.clipboard.readText();
      } catch (e) {}
    }
    if (!text || !parseBankSMS(text)) {
      text = prompt('Paste your Bank SMS here to auto-fill amount, payee, and payment mode:');
    }
    if (!text) return;

    const parsed = parseBankSMS(text);
    if (parsed) {
      applyToForm(parsed);
    } else {
      if (typeof showToast === 'function') {
        showToast('⚠️ Could not extract amount from the provided SMS text', 'warning');
      }
    }
  }

  function applyChip(encodedChip) {
    try {
      const chip = JSON.parse(decodeURIComponent(encodedChip));
      applyToForm(chip);
    } catch (e) {}
  }

  window.LM_SmartQuickAdd = {
    parseBankSMS,
    getFrequentChips,
    applyToForm,
    injectQuickAddBar,
    promptPasteSMS,
    applyChip
  };

})();
