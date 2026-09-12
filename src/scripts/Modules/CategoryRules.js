/**
 * LedgerMate – CategoryRules.js
 * ─────────────────────────────────────────────────────────────
 * Auto-Categorization & Smart Rule Engine with Keyword/Regex
 * pattern matching and auto-learning from manual transaction edits.
 * Exposes: window.LM_CategoryRules
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'category_rules_v1';

  var DEFAULT_RULES = [
    { pattern: 'swiggy|zomato|mcdonalds|kfc|starbucks|dominos|burger|pizza|diner|restaurant|cafe', category: 'Food & Dining', type: 'out' },
    { pattern: 'blinkit|zepto|instamart|dmart|bigbasket|supermarket|grocery|nature basket', category: 'Groceries', type: 'out' },
    { pattern: 'uber|ola|rapido|petrol|diesel|fuel|shell|bpcl|hpcl|metro|irctc|flight|indigo', category: 'Transport & Fuel', type: 'out' },
    { pattern: 'amazon|flipkart|myntra|ajio|zara|h&m|nykaa|croma|reliance digital', category: 'Shopping', type: 'out' },
    { pattern: 'netflix|spotify|youtube|hotstar|prime video|apple|icloud|playstation|steam', category: 'Subscriptions', type: 'out' },
    { pattern: 'electricity|bescom|tneb|airtel|jio|vodafone|wifi|broadband|gas|water bill', category: 'Bills & Utilities', type: 'out' },
    { pattern: 'pharmacy|apollo|medplus|hospital|clinic|doctor|dentist|practo|1mg', category: 'Healthcare', type: 'out' },
    { pattern: 'zerodha|groww|kuvera|coin|sip|mutual fund|nse|bse|upstox|indmoney', category: 'Investments', type: 'out' },
    { pattern: 'salary|payroll|stipend|bonus|employer|credited by', category: 'Salary', type: 'in' },
    { pattern: 'dividend|interest|cashback|reward|refund', category: 'Interest & Rewards', type: 'in' }
  ];

  function getRules() {
    if (typeof window.LM_lsGet === 'function') {
      var saved = window.LM_lsGet(STORAGE_KEY, null);
      if (saved && Array.isArray(saved) && saved.length) return saved;
    }
    return DEFAULT_RULES.slice();
  }

  function saveRules(rules) {
    if (typeof window.LM_lsSet === 'function') {
      window.LM_lsSet(STORAGE_KEY, rules);
    } else {
      localStorage.setItem('lm_' + STORAGE_KEY, JSON.stringify(rules));
    }
  }

  // Suggest category for a given payee description and type
  function suggestCategory(desc, txType) {
    if (!desc) return txType === 'in' ? 'Salary' : 'Other';
    var text = String(desc).trim().toLowerCase();
    var rules = getRules();

    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.type && txType && r.type !== txType) continue;
      try {
        var re = new RegExp(r.pattern, 'i');
        if (re.test(text)) {
          return r.category;
        }
      } catch (e) {
        if (text.includes(r.pattern.toLowerCase())) {
          return r.category;
        }
      }
    }

    return txType === 'in' ? 'Salary' : 'Other';
  }

  // Learn from a manual transaction entry: auto-register rule if repeated
  function learnFromTransaction(name, category, txType) {
    if (!name || !category || category === 'Other') return;
    var cleanName = name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    if (cleanName.length < 3) return;

    var rules = getRules();
    var existing = rules.find(r => r.category.toLowerCase() === category.toLowerCase() && (r.type === txType || !r.type));

    if (existing) {
      var patterns = existing.pattern.split('|').map(p => p.trim().toLowerCase());
      if (!patterns.includes(cleanName)) {
        existing.pattern += '|' + cleanName;
        saveRules(rules);
        console.log(`[CategoryRules] Learned new pattern "${cleanName}" -> ${category}`);
      }
    } else {
      rules.push({ pattern: cleanName, category: category, type: txType || 'out' });
      saveRules(rules);
      console.log(`[CategoryRules] Created new rule "${cleanName}" -> ${category}`);
    }
  }

  // Add rule manually
  function addRule(pattern, category, type) {
    if (!pattern || !category) return;
    var rules = getRules();
    rules.unshift({ pattern: pattern.trim(), category: category.trim(), type: type || 'out' });
    saveRules(rules);
  }

  // Delete rule
  function deleteRule(idx) {
    var rules = getRules();
    if (idx >= 0 && idx < rules.length) {
      rules.splice(idx, 1);
      saveRules(rules);
    }
  }

  // Show UI Manager Modal
  function showRulesModal() {
    var existing = document.getElementById('lm-cat-rules-modal');
    if (existing) existing.remove();

    var rules = getRules();
    var modal = document.createElement('div');
    modal.id = 'lm-cat-rules-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:12px;backdrop-filter:blur(4px);';

    function renderContent() {
      modal.innerHTML = `
        <div style="background:var(--card,#151922);border:1px solid var(--border,#262f45);border-radius:16px;max-width:680px;width:100%;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.6);color:var(--text,#e8eaf6);font-family:Inter,sans-serif;">
          <div style="padding:14px 18px;border-bottom:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;">
            <div>
              <h3 style="font-size:16px;font-weight:700;">🏷️ Auto-Categorization Rules</h3>
              <p style="font-size:11px;color:var(--text2,#8896b8);margin-top:2px;">Transactions matching these keywords or regex patterns will be auto-categorized.</p>
            </div>
            <button id="lm-cat-close" style="background:none;border:none;color:var(--text2,#8896b8);font-size:22px;cursor:pointer;">&times;</button>
          </div>

          <!-- Add new rule (Responsive Wrap) -->
          <div style="padding:12px 18px;background:rgba(255,255,255,0.02);border-bottom:1px solid var(--border,#262f45);display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
            <input type="text" id="lm-rule-pattern" placeholder="Pattern (e.g. uber|ola|fuel)" style="flex:2;min-width:140px;background:rgba(0,0,0,.3);border:1px solid var(--border,#262f45);border-radius:8px;padding:8px 10px;color:var(--text,#e8eaf6);font-size:12px;"/>
            <input type="text" id="lm-rule-category" placeholder="Category" style="flex:1.5;min-width:120px;background:rgba(0,0,0,.3);border:1px solid var(--border,#262f45);border-radius:8px;padding:8px 10px;color:var(--text,#e8eaf6);font-size:12px;"/>
            <select id="lm-rule-type" style="flex:1;min-width:90px;background:rgba(0,0,0,.3);border:1px solid var(--border,#262f45);border-radius:8px;padding:8px;color:var(--text,#e8eaf6);font-size:12px;">
              <option value="out">Expense</option>
              <option value="in">Income</option>
            </select>
            <button id="lm-rule-add" style="padding:8px 16px;background:#00d4b4;color:#000;font-weight:600;border:none;border-radius:8px;cursor:pointer;font-size:12px;margin-left:auto;">+ Add</button>
          </div>

          <!-- Rules list -->
          <div style="flex:1;overflow-y:auto;padding:12px 18px;-webkit-overflow-scrolling:touch;">
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${rules.map((r, i) => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.03);border:1px solid var(--border,#262f45);border-radius:10px;font-size:11px;flex-wrap:wrap;gap:6px;">
                  <div style="flex:1;min-width:180px;overflow:hidden;">
                    <div style="font-family:monospace;color:#4f8ef7;font-size:11px;word-break:break-all;">${r.pattern}</div>
                    <div style="color:var(--text2,#8896b8);font-size:10px;margin-top:2px;">Assigns to: <strong style="color:var(--text,#e8eaf6);">${r.category}</strong> (${r.type === 'in' ? 'Income' : 'Expense'})</div>
                  </div>
                  <button class="lm-rule-del" data-idx="${i}" style="background:none;border:none;color:#f43f5e;font-size:15px;cursor:pointer;padding:4px;" title="Delete Rule">🗑️</button>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="padding:14px 24px;border-top:1px solid var(--border,#262f45);display:flex;justify-content:space-between;align-items:center;">
            <button id="lm-rule-reset" style="background:none;border:1px solid var(--border,#262f45);color:var(--text2,#8896b8);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;">Reset Defaults</button>
            <button id="lm-rule-done" style="padding:8px 20px;background:linear-gradient(135deg,#00d4b4,#4f8ef7);border:none;border-radius:8px;color:#fff;font-weight:600;cursor:pointer;font-size:12px;">Done</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      document.getElementById('lm-cat-close').onclick = () => modal.remove();
      document.getElementById('lm-rule-done').onclick = () => modal.remove();

      document.getElementById('lm-rule-add').onclick = function () {
        var pat = document.getElementById('lm-rule-pattern').value.trim();
        var cat = document.getElementById('lm-rule-category').value.trim();
        var typ = document.getElementById('lm-rule-type').value;
        if (!pat || !cat) {
          if (typeof showToast === 'function') showToast('Please enter both pattern and category.', 'warning');
          return;
        }
        addRule(pat, cat, typ);
        rules = getRules();
        renderContent();
      };

      document.getElementById('lm-rule-reset').onclick = function () {
        saveRules(DEFAULT_RULES.slice());
        rules = getRules();
        renderContent();
        if (typeof showToast === 'function') showToast('Reset rules to default presets.', 'info');
      };

      modal.querySelectorAll('.lm-rule-del').forEach(btn => {
        btn.onclick = function () {
          var idx = parseInt(this.dataset.idx, 10);
          deleteRule(idx);
          rules = getRules();
          renderContent();
        };
      });
    }

    renderContent();
  }

  window.LM_CategoryRules = {
    getRules: getRules,
    suggestCategory: suggestCategory,
    learnFromTransaction: learnFromTransaction,
    addRule: addRule,
    deleteRule: deleteRule,
    showRulesModal: showRulesModal
  };

  console.log('[LM] CategoryRules module initialized.');
})();
