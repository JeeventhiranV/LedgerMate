/* =========================================================
   🔐 Credentials Vault – FINAL VERSION
   =========================================================
   Depends on:
   - showSimpleModal(title, html)
   - showToast(msg, type)
   - uid(prefix)
   - nowISO1()
   - put(store, data)
   - state.credentials
   - state.audit_logs
========================================================= */

/* -------------------- Helpers -------------------- */
function copyToClipboard(txt) {
  navigator.clipboard.writeText(txt);
  showToast('Copied', 'success');
}

function logAudit(refId, action, snapshot) {
  const log = {
    id: uid('audit'),
    refId,
    action,
    snapshot: JSON.parse(JSON.stringify(snapshot)),
    date: nowISO1()
  };
  put('audit_logs', log);
  state.audit_logs.push(log);
}
function formatDateSafe(d) {
  if (!d) return '-';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? '-'
    : dt.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
}
function copyPrimaryPassword(credId) {
  const c = state.credentials.find(x => x.id === credId);
  if (!c || !c.entries || c.entries.length === 0) {
    showToast('No password found', 'error');
    return;
  }

  const pwd = c.entries[0].password;
  if (!pwd) {
    showToast('Password empty', 'error');
    return;
  }

  navigator.clipboard.writeText(pwd);
  showToast('Password copied', 'success');
}

/* -------------------- Main Vault -------------------- */
function showCredentialsVault() {
  const creds = (state.credentials || []).filter(c => !c.deleted);

  const rows = creds.map(c => `
    <div class="glass p-4 rounded-xl mb-3" data-cred="${c.id}">
      <div class="flex justify-between">
        <div>
          <h3 class="font-semibold">${c.websiteName}</h3>
          <a href="${c.websiteUrl}" target="_blank"
            class="text-xs text-indigo-400 underline">${c.websiteUrl}</a>
          <p class="text-xs text-gray-400 mt-1">${c.remark || ''}</p>
          <p class="text-[10px] mt-1">📅 ${formatDateSafe(c.createdAt || c.modifiedAt)}</p>
        </div>
        <div class="flex gap-1">
          <button onclick="viewCredential('${c.id}')">👁️</button>
           <button title="Copy Password" onclick="copyPrimaryPassword('${c.id}')">📋</button>
          <button onclick="editCredential('${c.id}')">✏️</button>
          <button onclick="deleteCredential('${c.id}')">🗑️</button>
        </div>
      </div>
    </div>
  `).join('');

  showSimpleModal(
    '🔐 Credentials Vault',
    `
    <div class="p-3 space-y-3 max-h-[80vh] overflow-y-auto">
      <input id="credSearch"
        placeholder="🔍 Search website"
        class="w-full p-3 rounded-lg bg-transparent border border-white/10" />

      ${rows || `<p class="text-center text-gray-500">No credentials saved</p>`}

      <button onclick="openCredentialForm()"
        class="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold">
        ➕ Add Credentials
      </button>

      <a onclick="showCredentialAudit()"
        class="block text-center text-xs text-indigo-400 underline cursor-pointer">
        View Audit Logs / Restore
      </a>
    </div>
    `
  );

  document.getElementById('credSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('[data-cred]').forEach(el => {
      el.style.display = el.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

/* -------------------- View -------------------- */
function viewCredential(id) {
  const c = state.credentials.find(x => x.id === id);
  if (!c) return;

  showSimpleModal(
    `🔐 ${c.websiteName}`,
    `
    <div class="p-4 space-y-3">
      ${c.entries.map(e => `
        <div class="glass rounded-xl p-3">
          <div class="text-sm font-medium">${e.username}</div>
          <div class="flex items-center gap-2 mt-1">
            <input type="password"
              value="${e.password}"
              readonly
              class="pwd flex-1 p-2 rounded-lg bg-transparent border border-white/10" />
            <button onclick="togglePwd(this)">👁️</button>
            <button onclick="copyToClipboard('${e.password}')">📋</button>
          </div>
          <p class="text-xs text-gray-400 mt-1">${e.note || ''}</p>
        </div>
      `).join('')}
    </div>
    `
  );
}

function togglePwd(btn) {
  const input = btn.previousElementSibling;
  input.type = input.type === 'password' ? 'text' : 'password';
}

/* -------------------- Add / Edit -------------------- */
function openCredentialForm(existing) {
  const c = existing || { entries: [] };

  showSimpleModal(
    '🔐 Credential Details',
    `
    <form id="credForm" class="space-y-5 p-4 text-sm">

      <!-- Website -->
      <div class="glass rounded-xl p-4 space-y-3">
        <h3 class="text-xs font-semibold text-indigo-400">🌐 WEBSITE</h3>
        <input id="websiteName"
          class="w-full p-3 rounded-lg bg-transparent border border-white/10"
          placeholder="Website Name"
          value="${c.websiteName || ''}"
          required />
        <input id="websiteUrl"
          class="w-full p-3 rounded-lg bg-transparent border border-white/10"
          placeholder="https://example.com"
          value="${c.websiteUrl || ''}"
          required />
        <textarea id="remark"
          class="w-full p-3 rounded-lg bg-transparent border border-white/10 resize-none"
          rows="2"
          placeholder="Remarks">${c.remark || ''}</textarea>
      </div>

      <!-- Logins -->
      <div class="glass rounded-xl p-4 space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-xs font-semibold text-emerald-400">🔑 LOGINS</h3>
          <button type="button"
            onclick="addCredentialEntry()"
            class="text-xs text-indigo-400 underline">
            ➕ Add Login
          </button>
        </div>

        <div id="credEntries" class="space-y-3">
          ${(c.entries || []).map(e => credentialEntryCard(e)).join('')}
        </div>
      </div>

      <button
        class="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600
               text-white font-semibold">
        💾 Save Credentials
      </button>
    </form>
    `
  );

  document.getElementById('credForm').onsubmit = e => {
    e.preventDefault();
    saveCredential(c.id);
  };
}

function credentialEntryCard(e = {}) {
  return `
    <div class="rounded-xl border border-white/10 p-3 bg-black/20 space-y-2">
      <input class="username w-full p-2 rounded-lg bg-transparent border border-white/10"
        placeholder="Username / Email"
        value="${e.username || ''}" />
      <div class="flex gap-2">
        <input class="password flex-1 p-2 rounded-lg bg-transparent border border-white/10"
          placeholder="Password"
          type="password"
          value="${e.password || ''}" />
        <button type="button"
          class="px-3 rounded-lg bg-white/5"
          onclick="togglePwd(this)">👁️</button>
      </div>
      <input class="note w-full p-2 rounded-lg bg-transparent border border-white/10"
        placeholder="Note (optional)"
        value="${e.note || ''}" />
    </div>
  `;
}

function addCredentialEntry() {
  document.getElementById('credEntries')
    .insertAdjacentHTML('beforeend', credentialEntryCard());
}

/* -------------------- Save / Delete -------------------- */
async function saveCredential(id) {
  const data = {
    id: id || uid('cred'),
    websiteName: websiteName.value.trim(),
    websiteUrl: websiteUrl.value.trim(),
    remark: remark.value.trim(),
    entries: [...document.querySelectorAll('#credEntries > div')].map(d => ({
      entryId: uid('entry'),
      username: d.querySelector('.username').value,
      password: d.querySelector('.password').value,
      note: d.querySelector('.note').value,
      createdAt: nowISO1()
    })),
   createdAt: id ? (existing?.createdAt || nowISO1()) : nowISO1(),
    modifiedAt: nowISO1(),
    deleted: false
  };

  await put('credentials', data);
  logAudit(data.id, id ? 'UPDATE' : 'ADD', data);

  state.credentials = state.credentials.filter(c => c.id !== data.id);
  state.credentials.push(data);

  showToast('Saved successfully', 'success');
  showCredentialsVault();
}

function editCredential(id) {
  const c = state.credentials.find(x => x.id === id);
  if (c) openCredentialForm(c);
}

async function deleteCredential(id) {
  const c = state.credentials.find(x => x.id === id);
  if (!c || !confirm('Delete this credential?')) return;

  c.deleted = true;
  c.modifiedAt = nowISO1();
  await put('credentials', c);
  logAudit(id, 'DELETE', c);

  showToast('Deleted (can be restored)', 'info');
  showCredentialsVault();
}

/* -------------------- Audit & Restore -------------------- */
function showCredentialAudit() {
  const logs = state.audit_logs || [];

  showSimpleModal(
    '📜 Credential Audit',
    `
    <div class="p-4 space-y-3 max-h-[70vh] overflow-y-auto">

      ${logs.length === 0
        ? `<p class="text-center text-gray-500">No audit logs</p>`
        : logs.map(l => `
          <div class="glass p-3 rounded text-xs flex justify-between items-start gap-2">
            <div>
              <b>${l.action}</b>
              <div class="text-[10px] text-gray-400">
                ${formatDateSafe(l.date)}
              </div>

              ${l.action === 'DELETE'
                ? `<button
                     onclick="restoreCredential('${l.refId}')"
                     class="mt-1 text-indigo-400 underline">
                     Restore
                   </button>`
                : ''}
            </div>

            <button
              title="Delete audit log"
              onclick="deleteAuditLog('${l.id}')"
              class="text-red-400 hover:text-red-600">
              🗑️
            </button>
          </div>
        `).join('')
      }

      ${logs.length > 0 ? `
        <button
          onclick="clearAllAuditLogs()"
          class="w-full mt-3 py-2 text-xs rounded-xl
                 bg-red-500/10 text-red-400 hover:bg-red-500/20">
          🧹 Clear All Audit Logs
        </button>
      ` : ''}

    </div>
    `
  );
}
async function deleteAuditLog(auditId) {
  if (!confirm('Delete this audit entry?')) return;

  await del('audit_logs', auditId);
  state.audit_logs = state.audit_logs.filter(a => a.id !== auditId);

  showToast('Audit entry deleted', 'success');
  showCredentialAudit();
}
async function clearAllAuditLogs() {
  if (!confirm('Clear all audit logs? This cannot be undone.')) return;

  for (const a of state.audit_logs) {
    await del('audit_logs', a.id);
  }

  state.audit_logs = [];
  showToast('All audit logs cleared', 'success');
  showCredentialAudit();
}

function restoreCredential(id) {
  const c = state.credentials.find(x => x.id === id);
  if (!c) return;

  c.deleted = false;
  c.modifiedAt = nowISO1();
  put('credentials', c);
  logAudit(id, 'RESTORE', c);

  showToast('Restored', 'success');
  showCredentialsVault();
}

/* ================= END ================= */
