// # Dropdown Manager Modal
function renderDropdownManager() {
  const dv = state.dropdowns || { accounts: [], categories: [], persons: [], recurrences: [] };

  const makeList = (title, arrKey) => {
    const rows = (dv[arrKey] || []).map((item, idx) => `
      <div class="flex items-center justify-between px-2 py-1 rounded glass">
        <div class="flex-1 text-sm text-[var(--text)] truncate">${item}</div>
        <div class="flex gap-1">
          <button data-idx="${idx}" data-key="${arrKey}" 
            class="editDd text-xs px-2 py-1 rounded bg-[var(--btn-blue)] text-[var(--text)] hover:opacity-80 transition">
            ✏️
          </button>
          <button data-idx="${idx}" data-key="${arrKey}" 
            class="delDd text-xs px-2 py-1 rounded bg-rose-600 text-white hover:opacity-80 transition">
            🗑️
          </button>
        </div>
      </div>
    `).join('');

    return `
      <div class="glass p-3 rounded-xl mb-3">
        <div class="font-semibold text-indigo-500 mb-2">${title}</div>
        <div class="space-y-1">${rows || `<div class="text-sm text-gray-400 italic">No items yet</div>`}</div>
        <div class="flex gap-2 mt-3">
          <input placeholder="Add new ${title}" data-key="${arrKey}"
            class="flex-1 p-2 rounded glass text-sm border border-gray-300 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-400 outline-none text-[var(--text)]"/>
          <button class="addDd px-3 py-1 rounded bg-emerald-500 text-slate-900 font-semibold hover:bg-emerald-600 transition">
            ➕ Add
          </button>
        </div>
      </div>
    `;
  };

  // 🔹 Main modal content
  const html = `
    <div class="max-h-[80vh] overflow-y-auto space-y-3 p-2 md:p-4">
      ${makeList('🏦 Accounts', 'accounts')}
      ${makeList('📂 Categories', 'categories')}
      ${makeList('👤 Persons (Loans)', 'persons')}
      ${makeList('🔁 Recurrences', 'recurrences')}
    </div>
  `;

  // 🔹 Show modal using LedgerMate style
  showSimpleModal('🔽 Manage Dropdowns', html);

  // --- Handlers after modal render ---
  setTimeout(() => {
    document.querySelectorAll('.addDd').forEach(btn => {
      btn.onclick = async (e) => {
        const ip = e.target.previousElementSibling;
        const key = ip.dataset.key;
        const v = ip.value.trim();
        if (!v) return showToast('Please enter a value', 'error');

        try {
          state.dropdowns[key] = state.dropdowns[key] || [];
          if (state.dropdowns[key].includes(v)) {
            showToast('Already exists!', 'warning');
            return;
          }
          state.dropdowns[key].push(v);
          await put('dropdowns', state.dropdowns);
          autoBackup();
          showToast('Added successfully', 'success');
          renderDropdownManager(); // refresh modal
        } catch (err) {
          console.error(err);
          showToast('Failed to add item', 'error');
        }
      };
    });

    document.querySelectorAll('.delDd').forEach(btn => {
      btn.onclick = async (e) => {
        const key = e.target.dataset.key;
        const idx = Number(e.target.dataset.idx);
        if (!confirm('Delete this item?')) return;

        try {
          state.dropdowns[key].splice(idx, 1);
          await put('dropdowns', state.dropdowns);
          autoBackup();
          showToast('Deleted', 'success');
          renderDropdownManager();
        } catch (err) {
          console.error(err);
          showToast('Failed to delete', 'error');
        }
      };
    });

    document.querySelectorAll('.editDd').forEach(btn => {
      btn.onclick = async (e) => {
        const key = e.target.dataset.key;
        const idx = Number(e.target.dataset.idx);
        const oldVal = state.dropdowns[key][idx];
        const newVal = prompt('Rename item:', oldVal);
        if (!newVal || newVal === oldVal) return;

        try {
          state.dropdowns[key][idx] = newVal;
          await put('dropdowns', state.dropdowns);
          autoBackup();
          showToast('Renamed successfully', 'success');
          renderDropdownManager();
        } catch (err) {
          console.error(err);
          showToast('Failed to rename', 'error');
        }
      };
    });
  }, 100);
}
 document.getElementById("openDropdownManagerBtn").onclick = () => renderDropdownManager();