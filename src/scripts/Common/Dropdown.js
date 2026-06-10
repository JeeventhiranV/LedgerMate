/* ════════════════════════════════════════════════════════════
   DROPDOWN MANAGER — Premium UI with Default Value Support
════════════════════════════════════════════════════════════ */

const DD_META = {
  accounts:    { label: 'Accounts',           icon: '🏦', color: 'var(--blue)' },
  categories:  { label: 'Categories',         icon: '📂', color: 'var(--violet)' },
  persons:     { label: 'Persons (Loans)',     icon: '👤', color: 'var(--teal)' },
  recurrences: { label: 'Recurrence Types',   icon: '🔁', color: 'var(--gold)' }
};

function renderDropdownManager() {
  const dv = state.dropdowns || { accounts: [], categories: [], persons: [], recurrences: [] };
  if (!dv.defaults) dv.defaults = {};

  const makeSection = (arrKey) => {
    const meta  = DD_META[arrKey];
    const items = dv[arrKey] || [];
    const def   = dv.defaults[arrKey] || '';

    const rows = items.length
      ? items.map((item, idx) => {
          const isDefault = item === def;
          return `
            <div class="dd-row" data-key="${arrKey}" data-idx="${idx}">
              <div class="dd-row-left">
                <span class="dd-row-text">${item}</span>
                ${isDefault ? `<span class="dd-default-badge">DEFAULT</span>` : ''}
              </div>
              <div class="dd-row-actions">
                <button class="dd-btn dd-star ${isDefault ? 'active' : ''}"
                        data-key="${arrKey}" data-idx="${idx}"
                        title="${isDefault ? 'Remove default' : 'Set as default'}">
                  ${isDefault ? '⭐' : '☆'}
                </button>
                <button class="dd-btn dd-edit" data-key="${arrKey}" data-idx="${idx}" title="Rename">✏️</button>
                <button class="dd-btn dd-del dd-del-btn" data-key="${arrKey}" data-idx="${idx}" title="Delete">🗑️</button>
              </div>
            </div>`;
        }).join('')
      : `<div class="dd-empty">No items yet — add your first below</div>`;

    return `
      <div class="dd-section">
        <div class="dd-section-header">
          <span class="dd-section-icon" style="background:${meta.color}20;color:${meta.color};">${meta.icon}</span>
          <span class="dd-section-label">${meta.label}</span>
          <span class="dd-section-count">${items.length}</span>
        </div>
        ${def ? `<div class="dd-current-default">Default: <b>${def}</b> — auto-selected in new forms</div>` : ''}
        <div class="dd-rows">${rows}</div>
        <div class="dd-add-row">
          <input class="form-input dd-input" data-key="${arrKey}"
                 placeholder="Add new ${meta.label.toLowerCase()}…" autocomplete="off" />
          <button class="dd-btn-add addDd" data-key="${arrKey}">+ Add</button>
        </div>
      </div>`;
  };

  const html = `
    <div class="dd-manager">
      <div class="dd-info-banner">
        <span style="color:var(--teal);">⭐</span>
        Mark an item as <b>Default</b> — it will be pre-selected when you add new transactions, loans, or reminders.
      </div>
      ${Object.keys(DD_META).map(k => makeSection(k)).join('')}
    </div>`;

  showSimpleModal('🔽 Manage Dropdowns', html);

  setTimeout(() => {
    /* ── Add ── */
    document.querySelectorAll('.addDd').forEach(btn => {
      btn.onclick = async () => {
        const key = btn.dataset.key;
        const ip  = btn.previousElementSibling;
        const v   = ip.value.trim();
        if (!v) return showToast('Enter a value first', 'error');
        state.dropdowns[key] = state.dropdowns[key] || [];
        if (state.dropdowns[key].includes(v)) return showToast('Already exists!', 'warning');
        state.dropdowns[key].push(v);
        await put('dropdowns', state.dropdowns);
        autoBackup();
        showToast(`"${v}" added`, 'success');
        renderDropdownManager();
      };
    });

    /* ── Add on Enter ── */
    document.querySelectorAll('.dd-input').forEach(ip => {
      ip.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') ip.nextElementSibling?.click();
      });
    });

    /* ── Set Default (star) ── */
    document.querySelectorAll('.dd-star').forEach(btn => {
      btn.onclick = async () => {
        const key  = btn.dataset.key;
        const idx  = Number(btn.dataset.idx);
        const item = state.dropdowns[key][idx];
        if (!state.dropdowns.defaults) state.dropdowns.defaults = {};
        // Toggle: if already default, clear it
        state.dropdowns.defaults[key] = (state.dropdowns.defaults[key] === item) ? '' : item;
        await put('dropdowns', state.dropdowns);
        autoBackup();
        const action = state.dropdowns.defaults[key] ? `"${item}" is now the default` : 'Default cleared';
        showToast(action, 'success');
        renderDropdownManager();
      };
    });

    /* ── Inline Edit (no prompt!) ── */
    document.querySelectorAll('.dd-edit').forEach(btn => {
      btn.onclick = () => {
        const key  = btn.dataset.key;
        const idx  = Number(btn.dataset.idx);
        const row  = btn.closest('.dd-row');
        const text = row.querySelector('.dd-row-text');
        const cur  = state.dropdowns[key][idx];

        // Replace text span with inline input
        const inp = document.createElement('input');
        inp.className = 'form-input dd-inline-input';
        inp.value = cur;
        inp.style.cssText = 'flex:1;padding:4px 8px;font-size:13px;height:30px;border-radius:6px;min-width:0;';
        text.replaceWith(inp);
        inp.focus();
        inp.select();

        // Replace edit btn with save btn
        btn.textContent = '💾';
        btn.title = 'Save';

        const saveEdit = async () => {
          const nv = inp.value.trim();
          if (!nv || nv === cur) { renderDropdownManager(); return; }
          if (state.dropdowns[key].includes(nv)) { showToast('Already exists!', 'warning'); renderDropdownManager(); return; }
          // Update default if it pointed to old value
          if (state.dropdowns.defaults?.[key] === cur) state.dropdowns.defaults[key] = nv;
          state.dropdowns[key][idx] = nv;
          await put('dropdowns', state.dropdowns);
          autoBackup();
          showToast(`Renamed to "${nv}"`, 'success');
          renderDropdownManager();
        };

        btn.onclick = saveEdit;
        inp.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') saveEdit();
          if (e.key === 'Escape') renderDropdownManager();
        });
        inp.addEventListener('blur', () => setTimeout(saveEdit, 150));
      };
    });

    /* ── Delete ── */
    document.querySelectorAll('.dd-del-btn').forEach(btn => {
      btn.onclick = async () => {
        const key  = btn.dataset.key;
        const idx  = Number(btn.dataset.idx);
        const item = state.dropdowns[key][idx];
        if (!confirm(`Delete "${item}"? This won't affect existing transactions.`)) return;
        // Clear default if it was this item
        if (state.dropdowns.defaults?.[key] === item) state.dropdowns.defaults[key] = '';
        state.dropdowns[key].splice(idx, 1);
        await put('dropdowns', state.dropdowns);
        autoBackup();
        showToast(`"${item}" deleted`, 'success');
        renderDropdownManager();
      };
    });
  }, 80);
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('openDropdownManagerBtn');
  if (btn) btn.onclick = () => renderDropdownManager();
});

/* ── Expose helper: get default value for a key ── */
function getDropdownDefault(key) {
  return state.dropdowns?.defaults?.[key] || state.dropdowns?.[key]?.[0] || '';
}
window.getDropdownDefault = getDropdownDefault;
