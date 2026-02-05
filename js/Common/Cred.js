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
/* ================== GLOBAL STATE ================== */
// 1️⃣ Vault Session
const VaultSession = {
  masterPwd: null,
  unlocked: false
};

// 2️⃣ Password Strength helpers
function passwordStrength(pwd) {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { text: 'Weak', cls: 'text-red-500' };
  if (score === 2) return { text: 'Medium', cls: 'text-yellow-400' };
  return { text: 'Strong', cls: 'text-green-400' };
}

function bindStrength(input, meter) {
  input.oninput = () => {
    const s = passwordStrength(input.value);
    meter.textContent = s.text;
    meter.className = `text-xs ${s.cls}`;
  };
}
const CryptoVault = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function deriveKey(pwd, salt) {
    const base = await crypto.subtle.importKey(
      'raw', enc.encode(pwd), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encrypt(text, pwd) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(pwd, salt);
    const buf = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, enc.encode(text)
    );
    return {
      cipher: btoa(String.fromCharCode(...new Uint8Array(buf))),
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...salt))
    };
  }

  async function decrypt(obj, pwd) {
    const iv = Uint8Array.from(atob(obj.iv), c => c.charCodeAt(0));
    const salt = Uint8Array.from(atob(obj.salt), c => c.charCodeAt(0));
    const cipher = Uint8Array.from(atob(obj.cipher), c => c.charCodeAt(0));
    const key = await deriveKey(pwd, salt);
    const buf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, cipher
    );
    return dec.decode(buf);
  }

  return { encrypt, decrypt };
})();
function secureClipboardCopy(text) {
  navigator.clipboard.writeText(text);
  showToast('Copied (auto-clears in 10s)', 'success');

  setTimeout(async () => {
    const cur = await navigator.clipboard.readText();
    if (cur === text) await navigator.clipboard.writeText('');
  }, 10000);
}

function copyToClipboard(txt) {
  secureClipboardCopy(txt);
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
async function changeMasterPassword() {
  const oldPwd = await askMasterPassword('🔑 Current Master Password');
  const newPwd = await askMasterPassword('🔐 New Master Password');

  for (const c of state.credentials) {
    for (const e of c.entries) {
      const plain = await CryptoVault.decrypt(e.password, oldPwd);
      e.password = await CryptoVault.encrypt(plain, newPwd);
    }
    c.modifiedAt = nowISO1();
    await put('credentials', c);
  }

  VaultSession.masterPwd = newPwd;
  showToast('Master password updated', 'success');
}
async function exportVault() {
  try {
    const pwd = VaultSession.unlocked
      ? VaultSession.masterPwd
      : await askMasterPassword('🔐 Export Vault');

    const payload = JSON.stringify(state.credentials);
    const encrypted = await CryptoVault.encrypt(payload, pwd);

    const blob = new Blob(
      [JSON.stringify(encrypted, null, 2)],
      { type: 'application/json' }
    );

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `credentials-vault-${Date.now()}.enc.json`;
    a.click();

    showToast('Vault exported securely', 'success');
  } catch (err) {
    showToast('Export failed', 'error');
  }
}function mergeVaults(local = [], incoming = []) {
  const map = new Map();

  // Load local first
  for (const c of local) {
    map.set(c.id, c);
  }

  // Merge incoming
  for (const inc of incoming) {
    const cur = map.get(inc.id);

    if (!cur) {
      map.set(inc.id, inc);
      continue;
    }

    // Compare modifiedAt
    const curTime = new Date(cur.modifiedAt || cur.createdAt).getTime();
    const incTime = new Date(inc.modifiedAt || inc.createdAt).getTime();

    if (incTime > curTime) {
      map.set(inc.id, inc);
    }
  }

  return Array.from(map.values());
}
async function importVaultMerge(file) {
  if (!file) return;

  try {
    const pwd = await askMasterPassword('🔐 Import & Merge Vault');

    // Decrypt imported vault
    const encryptedText = await file.text();
    const decrypted = await CryptoVault.decrypt(
      JSON.parse(encryptedText),
      pwd
    );
    const incoming = JSON.parse(decrypted);

    if (!Array.isArray(incoming)) {
      showToast('Invalid vault file', 'error');
      return;
    }

    // Decrypt local vault for merge
    const local = state.credentials || [];

    // Merge
    const merged = mergeVaults(local, incoming);

    // Save merged vault
    for (const c of merged) {
      await put('credentials', c);
    }

    state.credentials = merged;
    showToast('Vault merged successfully', 'success');
    showCredentialsVault();

  } catch (err) {
    showToast('Merge failed (wrong password or invalid file)', 'error');
    VaultSession.unlocked = false;
  }
}
async function copyPrimaryDecryptedPassword(credId) {
  try {
    const pwd = VaultSession.unlocked
      ? VaultSession.masterPwd
      : await askMasterPassword();

    const cred = state.credentials.find(c => c.id === credId);
    if (!cred || !cred.entries || cred.entries.length === 0) {
      showToast('No credentials found', 'error');
      return;
    }

    const entry = cred.entries[0]; // ✅ primary entry
    const plain = await CryptoVault.decrypt(entry.password, pwd);

    secureClipboardCopy(plain);
  } catch (err) {
    VaultSession.unlocked = false;
    showToast('Unable to copy password', 'error');
  }
}


/* -------------------- Main Vault -------------------- */
async function showCredentialsVault() {
  if (!await askMasterPassword()) return;

  const creds = (state.credentials || []).filter(c => !c.deleted);
const rows = creds.map(c => `
  <div class="glass p-4 rounded-xl mb-3" data-cred="${c.id}">
    <div class="flex justify-between">
      <div>
        <h3 class="font-semibold">${c.websiteName}</h3>
        <a href="${c.websiteUrl}" target="_blank"
          class="text-xs text-indigo-400 underline">Go to Website</a>
        <p class="text-xs text-gray-400 mt-1">${c.remark || ''}</p>
        <p class="text-[10px] mt-1">
          📅 ${formatDateSafe(c.createdAt || c.modifiedAt)}
        </p>
      </div>
      <div class="flex gap-1">
        <button onclick="viewCredential('${c.id}')">👁️</button>
        <button title="Copy Password"
          onclick="copyPrimaryDecryptedPassword('${c.id}')">📋</button>
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

     <div class="space-y-2 text-center">

  <a onclick="showCredentialAudit()"
    class="block text-xs text-indigo-400 underline cursor-pointer">
    📜 View Audit Logs / Restore
  </a>

  <div class="flex justify-center gap-4 text-xs">
    <button onclick="exportVault()"
      class="text-emerald-400 hover:underline">
      📤 Export (Encrypted)
    </button>

    <label class="text-indigo-400 hover:underline cursor-pointer">
      📥 Import
      <input type="file"
        accept=".json"
        hidden
        onchange="importVaultMerge(this.files[0])" />
    </label>
  </div>

</div>

      <button onclick="changeMasterPassword()"
  class="w-full mt-2 py-2 text-xs rounded-xl
         bg-indigo-500/10 text-indigo-400">
  🔑 Change Master Password
</button> 
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
/* ===================== MASTER PASSWORD PROMPT ===================== */
async function askMasterPassword(title = '🔐 Master Password') {

  // ✅ Already unlocked → reuse
  if (VaultSession.unlocked && VaultSession.masterPwd) {
    return VaultSession.masterPwd;
  }

  return new Promise(resolve => {
    showSimpleModal(title, `
      <div class="p-4 space-y-3">
        <input id="mpwd" type="password"
          class="w-full p-3 rounded border border-white/10 bg-transparent"
          placeholder="Enter master password" />
        <div id="mpwdMeter" class="text-xs"></div>
        <button id="unlockBtn"
          class="w-full py-2 bg-indigo-600 text-white rounded">
          Unlock
        </button>
      </div>
    `);

    const inp = document.getElementById('mpwd');
    const meter = document.getElementById('mpwdMeter');

    // strength meter
    inp.addEventListener('input', () => {
      const v = inp.value;
      let s = 0;
      if (v.length >= 8) s++;
      if (/[A-Z]/.test(v)) s++;
      if (/[0-9]/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v)) s++;

      meter.textContent =
        s <= 1 ? 'Weak' : s === 2 ? 'Medium' : 'Strong';
      meter.className =
        'text-xs ' + (s <= 1 ? 'text-red-500' : s === 2 ? 'text-yellow-400' : 'text-green-400');
    });

    document.getElementById('unlockBtn').onclick = () => {
      if (!inp.value) {
        showToast('Master password required', 'error');
        return;
      }

      // ✅ Cache for session
      VaultSession.masterPwd = inp.value;
      VaultSession.unlocked = true;

      resolve(inp.value);
    };
  });
}

async function decryptAndShow(btn, credId, entryId) {
  try {
    const pwd = VaultSession.unlocked
      ? VaultSession.masterPwd
      : await askMasterPassword();

    const c = state.credentials.find(x => x.id === credId);
    const e = c.entries.find(x => x.entryId === entryId);

    const plain = await CryptoVault.decrypt(e.password, pwd);
    const input = btn.previousElementSibling;
    input.value = plain;
    input.type = 'text';
  } catch {
    showToast('Invalid master password', 'error');
    VaultSession.unlocked = false;
  }
}

async function copyDecryptedPassword(credId, entryId) {
  try {
    const pwd = VaultSession.unlocked
      ? VaultSession.masterPwd
      : await askMasterPassword();

    const c = state.credentials.find(x => x.id === credId);
    const e = c.entries.find(x => x.entryId === entryId);

    const plain = await CryptoVault.decrypt(e.password, pwd);
    secureClipboardCopy(plain);
  } catch {
    showToast('Invalid master password', 'error');
    VaultSession.unlocked = false;
  }
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
           <input type="password" readonly
  class="pwd flex-1 p-2 rounded-lg bg-transparent border border-white/10" /> 
<button onclick="decryptAndShow(this,'${c.id}','${e.entryId}')">👁️</button>
<button onclick="copyDecryptedPassword('${c.id}','${e.entryId}')">📋</button>

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
          ${(c.entries || []).map(e => credentialEntryCard(e,c)).join('')}
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

function credentialEntryCard(e = {}, c = {}) {
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
          onclick="decryptAndShow(this,'${c.id}','${e.entryId}')">👁️</button> 
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

  const websiteNameEl = document.getElementById('websiteName');
  const websiteUrlEl  = document.getElementById('websiteUrl');
  const remarkEl      = document.getElementById('remark');

  if (!websiteNameEl || !websiteUrlEl || !remarkEl) {
    showToast('Form not ready. Please reopen Add Credentials.', 'error');
    return;
  }

  const masterPwd = VaultSession.unlocked
    ? VaultSession.masterPwd
    : await askMasterPassword();

  const existing = id
    ? state.credentials.find(c => c.id === id)
    : null;

  // 🔑 FIXED ENTRY COLLECTION
  const entryEls = document.querySelectorAll('#credEntries .username');

  if (entryEls.length === 0) {
    showToast('Please add at least one login', 'error');
    return;
  }

  const entries = await Promise.all(
    [...entryEls].map(async usernameEl => {
      const card = usernameEl.closest('div');
      const pwdEl = card.querySelector('.password');
      const noteEl = card.querySelector('.note');

      return {
        entryId: uid('entry'),
        username: usernameEl.value.trim(),
        password: await CryptoVault.encrypt(
          pwdEl?.value || '',
          masterPwd
        ),
        note: noteEl?.value || '',
        createdAt: nowISO1()
      };
    })
  );

  const data = {
    id: id || uid('cred'),
    websiteName: websiteNameEl.value.trim(),
    websiteUrl: websiteUrlEl.value.trim(),
    remark: remarkEl.value.trim(),
    entries,
    createdAt: existing?.createdAt || nowISO1(),
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
