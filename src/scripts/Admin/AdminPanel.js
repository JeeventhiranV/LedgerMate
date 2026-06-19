/**
 * LedgerMate – AdminPanel.js
 * Tabs: Users | Statistics | App Settings | Backup
 * Users tab is fully Supabase-backed (user_profiles table).
 */
(function () {
  'use strict';

  const ALL_MODULES = [
    { key: 'transactions', label: '↕️ Transactions' },
    { key: 'analytics',    label: '📈 Analytics'    },
    { key: 'gold',         label: '🏅 Gold Rates'   },
    { key: 'wealth',       label: '📊 Wealth'       },
    { key: 'essentials',   label: '🛡️ Essentials'  },
    { key: 'loans',        label: '💰 Loans'        },
    { key: 'investments',  label: '📈 Investments'  },
    { key: 'budgets',      label: '🎯 Budgets'      },
    { key: 'trips',        label: '✈️ Trips'        },
    { key: 'notes',        label: '📝 Notes'        },
    { key: 'credentials',  label: '🔐 Vault'        },
  ];

  const STUDY_MODULES = [
    { key: 'java',    label: '☕ Java Prep Kit'      },
    { key: 'dsa',     label: '🧠 DSA Master Hub'     },
    { key: 'react',   label: '⚛️ React Prep Hub'     },
    { key: 'hr',      label: '🤝 HR Questions'        },
    { key: 'ipk',     label: '📚 Interview Prep Kit'  },
    { key: 'tracker', label: '🎯 Interview Tracker'   },
  ];

  /* ══════════════════════════════════════════════════════
     ENTRY / EXIT
  ══════════════════════════════════════════════════════ */
  function showAdminPanel() {
    if (!window.LM_Auth?.isAdmin()) {
      if (typeof showToast === 'function') showToast('Access denied', 'error');
      return;
    }
    _renderPanel();
  }

  function closeAdminPanel() {
    document.getElementById('adminPanelOverlay')?.remove();
  }

  /* ══════════════════════════════════════════════════════
     PANEL SHELL
  ══════════════════════════════════════════════════════ */
  function _renderPanel() {
    document.getElementById('adminPanelOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'adminPanelOverlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAdminPanel();
    });
    overlay.innerHTML = `
<div id="adminPanel">
  <div class="admin-header">
    <div style="display:flex;align-items:center;gap:12px;">
      <span style="font-size:24px;">⚙️</span>
      <div>
        <div class="admin-title">Admin Panel</div>
        <div class="admin-sub">LedgerMate System Settings</div>
      </div>
    </div>
    <button onclick="window.LM_Admin.close()" class="modal-close" title="Close">✕</button>
  </div>

  <div class="admin-body">
    <nav class="admin-tabs">
      <button class="admin-nav-item active" data-tab="users"       onclick="window.LM_Admin.switchTab('users')">       👥 Users</button>
      <button class="admin-nav-item"        data-tab="stats"       onclick="window.LM_Admin.switchTab('stats')">       📊 Statistics</button>
      <button class="admin-nav-item"        data-tab="appsettings" onclick="window.LM_Admin.switchTab('appsettings')"> 🔧 App Settings</button>
      <button class="admin-nav-item"        data-tab="backup"      onclick="window.LM_Admin.switchTab('backup')">      🗄️ Backup</button>
    </nav>
    <div class="admin-content" id="adminContent"></div>
  </div>
</div>`;
    document.body.appendChild(overlay);
    _switchTab('users');
  }

  /* ══════════════════════════════════════════════════════
     TAB SWITCHER
  ══════════════════════════════════════════════════════ */
  function _switchTab(tab) {
    document.querySelectorAll('.admin-nav-item').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === tab)
    );
    const content = document.getElementById('adminContent');
    if (!content) return;
    switch (tab) {
      case 'users':       _renderUsersTab(content);       break;
      case 'stats':       _renderStats(content);          break;
      case 'appsettings': content.innerHTML = _tabAppSettings(); _bindAppSettings(); break;
      case 'backup':      content.innerHTML = _tabBackup(); _bindBackupTab();        break;
    }
  }

  /* ══════════════════════════════════════════════════════
     TAB: USERS  (Supabase-backed)
  ══════════════════════════════════════════════════════ */
  async function _renderUsersTab(container) {
    container.innerHTML = `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
  <div class="admin-section-title" style="margin:0;">👥 User Management</div>
  <button class="btn-submit" onclick="window.LM_Admin.showCreateUserForm()">＋ Create User</button>
</div>
<div id="userFormArea"></div>
<div id="userListArea"><div style="padding:40px;text-align:center;color:var(--text-3);">Loading users…</div></div>`;

    await _refreshUserList();
  }

  async function _refreshUserList() {
    const area = document.getElementById('userListArea');
    if (!area) return;

    let profiles = [];
    let loadErr  = null;
    try {
      const { data, error } = await _supabase.from('user_profiles').select('*').order('created_at');
      if (error) throw error;
      profiles = data || [];
    } catch (e) {
      loadErr = e.message || String(e);
    }

    if (loadErr) {
      area.innerHTML = `<div style="padding:32px;text-align:center;color:#fb7185;">Failed to load users: ${_esc(loadErr)}</div>`;
      return;
    }

    const pending = profiles.filter(u => !u.active);
    const active  = profiles.filter(u =>  u.active);
    const currentUid = window.LM_Auth.getCurrentUser()?.userId;

    const _row = (u) => `
<tr>
  <td>
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--teal-dim,rgba(0,212,180,0.15));
           display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--teal);font-size:13px;flex-shrink:0;">
        ${_esc((u.display_name || u.email).charAt(0).toUpperCase())}
      </div>
      <div>
        <div style="font-weight:600;color:var(--text);">${_esc(u.display_name || u.email.split('@')[0])}</div>
        <div style="font-size:11px;color:var(--text-3);">${_esc(u.email)}</div>
      </div>
    </div>
  </td>
  <td><span class="admin-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
  <td><span class="admin-badge ${u.active ? 'badge-active' : 'badge-inactive'}">${u.active ? 'Active' : 'Pending'}</span></td>
  <td style="font-size:11px;color:var(--text-3);">${new Date(u.created_at).toLocaleDateString()}</td>
  <td>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      ${!u.active ? `<button class="admin-btn admin-btn-success admin-btn-sm" onclick="window.LM_Admin.approveUser('${u.id}')">✅ Approve</button>` : ''}
      ${u.active  ? `<button class="admin-btn admin-btn-warn admin-btn-sm"    onclick="window.LM_Admin.deactivateUser('${u.id}')">⏸ Deactivate</button>` : ''}
      <button class="admin-btn admin-btn-sm" onclick="window.LM_Admin.toggleRole('${u.id}','${u.role === 'admin' ? 'user' : 'admin'}','${_esc(u.display_name || u.email)}')">
        ${u.role === 'admin' ? '👤 Make User' : '⭐ Make Admin'}
      </button>
      <button class="admin-btn admin-btn-sm" style="border-color:rgba(139,92,246,.4);color:#8b5cf6;" onclick="window.LM_Admin.showStudyAccess('${u.id}','${_esc(u.display_name || u.email)}','${JSON.stringify(u.study_modules !== undefined ? u.study_modules : null)}')">📚 Study</button>
      ${u.id !== currentUid ? `<button class="admin-btn admin-btn-danger admin-btn-sm" onclick="window.LM_Admin.deleteUser('${u.id}','${_esc(u.display_name || u.email)}')">🗑 Delete</button>` : ''}
    </div>
  </td>
</tr>`;

    let html = '';

    if (pending.length > 0) {
      html += `
<div style="background:rgba(251,113,133,0.08);border:1px solid rgba(251,113,133,0.2);border-radius:12px;padding:16px;margin-bottom:16px;">
  <div style="font-size:13px;font-weight:700;color:#fb7185;margin-bottom:12px;">⏳ Pending Approval (${pending.length})</div>
  <div class="admin-table-wrap">
    <table class="admin-table">
      <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
      <tbody>${pending.map(_row).join('')}</tbody>
    </table>
  </div>
</div>`;
    }

    html += `
<div class="admin-table-wrap">
  <table class="admin-table">
    <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
    <tbody>
      ${active.length ? active.map(_row).join('') : '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-3);">No active users yet</td></tr>'}
    </tbody>
  </table>
</div>`;

    area.innerHTML = html;
  }

  /* ── Create User Form ──────────────────────────────── */
  function _showCreateUserForm() {
    const area = document.getElementById('userFormArea');
    if (!area) return;

    const moduleCheckboxes = ALL_MODULES.map(m => `
<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:3px 0;">
  <input type="checkbox" name="mod_${m.key}" value="${m.key}" checked> ${m.label}
</label>`).join('');

    area.innerHTML = `
<div class="admin-form-card" id="userFormCard" style="margin-bottom:16px;">
  <div class="admin-section-title" style="margin-bottom:16px;">➕ Create New User</div>
  <div class="admin-form-grid">
    <div>
      <label class="admin-label">Email *</label>
      <input id="uf_email" class="form-input" type="email" placeholder="user@example.com">
    </div>
    <div>
      <label class="admin-label">Display Name</label>
      <input id="uf_displayName" class="form-input" placeholder="Full name">
    </div>
    <div>
      <label class="admin-label">Password *</label>
      <input id="uf_password" class="form-input" type="password" placeholder="min 6 characters">
    </div>
    <div>
      <label class="admin-label">Confirm Password *</label>
      <input id="uf_password2" class="form-input" type="password" placeholder="repeat password">
    </div>
    <div>
      <label class="admin-label">Role</label>
      <select id="uf_role" class="form-input">
        <option value="user">👤 Normal User</option>
        <option value="admin">⭐ Admin</option>
      </select>
    </div>
    <div>
      <label class="admin-label">Activate Immediately</label>
      <select id="uf_active" class="form-input">
        <option value="true">✅ Yes — active on first login</option>
        <option value="false">⏸ No — pending approval</option>
      </select>
    </div>
  </div>

  <div style="margin-top:16px;">
    <label class="admin-label">Module Access (uncheck to restrict)</label>
    <div class="admin-module-grid">${moduleCheckboxes}</div>
    <div style="font-size:11px;color:var(--text-3);margin-top:4px;">Admins always have full access regardless of selection.</div>
  </div>

  <div id="userFormError" style="display:none;color:#fb7185;font-size:13px;margin-top:12px;padding:10px;background:rgba(251,113,133,0.1);border-radius:8px;"></div>

  <div style="display:flex;gap:10px;margin-top:18px;">
    <button class="btn-submit" onclick="window.LM_Admin.submitCreateUser()">✅ Create User</button>
    <button class="admin-btn" onclick="document.getElementById('userFormArea').innerHTML=''">Cancel</button>
  </div>
</div>`;

    area.scrollIntoView({ behavior: 'smooth' });
  }

  async function _submitCreateUser() {
    const errEl   = document.getElementById('userFormError');
    const showErr = (msg) => { if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; } };

    const email       = document.getElementById('uf_email')?.value.trim();
    const displayName = document.getElementById('uf_displayName')?.value.trim();
    const password    = document.getElementById('uf_password')?.value;
    const password2   = document.getElementById('uf_password2')?.value;
    const role        = document.getElementById('uf_role')?.value || 'user';
    const active      = document.getElementById('uf_active')?.value === 'true';
    const modules     = Array.from(document.querySelectorAll('[name^="mod_"]:checked')).map(c => c.value);

    if (!email)                       { showErr('Email is required.'); return; }
    if (!password || password.length < 6) { showErr('Password must be at least 6 characters.'); return; }
    if (password !== password2)       { showErr('Passwords do not match.'); return; }

    const btn = document.querySelector('[onclick="window.LM_Admin.submitCreateUser()"]');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Creating…'; }

    try {
      const { data, error } = await _supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: displayName || email.split('@')[0] } }
      });
      if (error) throw new Error(error.message);

      const newUserId = data.user?.id;
      if (!newUserId) throw new Error('User created but ID missing. Check Supabase Dashboard.');

      /* Upsert profile with correct role/active (overrides trigger defaults) */
      const { error: profErr } = await _supabase.from('user_profiles').upsert({
        id           : newUserId,
        email        : email,
        display_name : displayName || email.split('@')[0],
        role         : role,
        active       : active,
        allowed_modules: modules.length === ALL_MODULES.length ? [] : modules,
        updated_at   : new Date().toISOString()
      }, { onConflict: 'id' });

      if (profErr) throw new Error('User auth created, but profile update failed: ' + profErr.message);

      if (typeof showToast === 'function') showToast('✅ User created!', 'success');
      document.getElementById('userFormArea').innerHTML = '';
      await _refreshUserList();

    } catch (err) {
      showErr(err.message || String(err));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '✅ Create User'; }
    }
  }

  /* ── User Actions ──────────────────────────────────── */
  async function _approveUser(id) {
    await _updateProfile(id, { active: true, updated_at: new Date().toISOString() }, 'User approved');
  }

  async function _deactivateUser(id) {
    await _updateProfile(id, { active: false, updated_at: new Date().toISOString() }, 'User deactivated');
  }

  async function _toggleRole(id, newRole, name) {
    if (!confirm(`Change ${name}'s role to "${newRole}"?`)) return;
    await _updateProfile(id, { role: newRole, updated_at: new Date().toISOString() }, `Role set to ${newRole}`);
  }

  /* ── Study Module Access ───────────────────────────────── */
  function _showStudyAccess(userId, userName, modulesJson) {
    document.getElementById('lm-study-modal')?.remove();

    var currentModules;
    try { currentModules = JSON.parse(modulesJson); } catch { currentModules = null; }

    // null = all allowed; [] = no access; [...] = specific modules
    var hasAccess = currentModules === null || (Array.isArray(currentModules) && currentModules.length > 0);
    var allowedKeys = currentModules === null
      ? STUDY_MODULES.map(function(m){ return m.key; })
      : (Array.isArray(currentModules) ? currentModules : []);

    var moduleCheckboxes = STUDY_MODULES.map(function(m) {
      var checked = currentModules === null || allowedKeys.indexOf(m.key) !== -1;
      return '<label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;padding:5px 0;">' +
        '<input type="checkbox" id="study_mod_' + m.key + '" value="' + m.key + '"' + (checked ? ' checked' : '') +
        ' style="width:15px;height:15px;cursor:pointer;accent-color:#8b5cf6;"> ' + m.label +
      '</label>';
    }).join('');

    var modal = document.createElement('div');
    modal.id = 'lm-study-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);padding:20px;';
    modal.innerHTML = `
      <div style="background:var(--card,#151922);border:1px solid rgba(139,92,246,.3);border-radius:16px;padding:28px 26px;max-width:460px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.9);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
          <div style="font-size:16px;font-weight:700;color:var(--text,#e8eaf6);">📚 Study Module Access</div>
          <button onclick="document.getElementById('lm-study-modal').remove()" style="background:none;border:none;color:var(--text-2,#7c87a8);cursor:pointer;font-size:20px;line-height:1;padding:0 2px;">✕</button>
        </div>
        <div style="font-size:12px;color:var(--text-2,#7c87a8);margin-bottom:14px;">${_esc(userName)}</div>
        <p style="font-size:13px;color:var(--text-2,#7c87a8);line-height:1.55;margin-bottom:18px;">
          Choose which Study Hub modules this user can open. Admins always have full access regardless of this setting.
        </p>

        <label style="display:flex;align-items:center;gap:12px;cursor:pointer;padding:12px 14px;background:rgba(139,92,246,.06);border:1px solid rgba(139,92,246,.2);border-radius:10px;margin-bottom:16px;">
          <input type="checkbox" id="study_access_enabled" ${hasAccess ? 'checked' : ''} style="width:17px;height:17px;cursor:pointer;accent-color:#8b5cf6;flex-shrink:0;">
          <div>
            <div style="font-size:13px;font-weight:600;color:var(--text,#e8eaf6);">Enable Study Hub access</div>
            <div style="font-size:11px;color:var(--text-2,#7c87a8);">Uncheck to block all study modules for this user</div>
          </div>
        </label>

        <div id="study_module_section" style="transition:opacity .2s;${hasAccess ? '' : 'opacity:.35;pointer-events:none'}">
          <div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3,#454d6a);margin-bottom:10px;">Module Permissions</div>
          <div class="admin-module-grid">${moduleCheckboxes}</div>
          <div style="font-size:11px;color:var(--text-3,#454d6a);margin-top:6px;">All modules checked = full access. Uncheck specific modules to restrict.</div>
        </div>

        <div style="display:flex;gap:10px;margin-top:22px;">
          <button class="btn-submit" onclick="window.LM_Admin.saveStudyAccess('${userId}')">💾 Save Access</button>
          <button class="admin-btn" onclick="document.getElementById('lm-study-modal').remove()">Cancel</button>
        </div>
      </div>`;

    document.body.appendChild(modal);

    document.getElementById('study_access_enabled').addEventListener('change', function() {
      var sec = document.getElementById('study_module_section');
      if (sec) { sec.style.opacity = this.checked ? '1' : '.35'; sec.style.pointerEvents = this.checked ? '' : 'none'; }
    });
  }

  async function _saveStudyAccess(userId) {
    var enabledEl = document.getElementById('study_access_enabled');
    var enabled   = enabledEl && enabledEl.checked;

    var studyModules;
    if (!enabled) {
      studyModules = [];   // empty array = no access
    } else {
      var checked = STUDY_MODULES
        .filter(function(m){ return document.getElementById('study_mod_' + m.key)?.checked; })
        .map(function(m){ return m.key; });
      // All checked → null (all modules, forward-compat); subset → specific keys
      studyModules = checked.length === STUDY_MODULES.length ? null : checked;
    }

    document.getElementById('lm-study-modal')?.remove();
    await _updateProfile(userId, { study_modules: studyModules, updated_at: new Date().toISOString() }, 'Study access updated');
  }

  function _deleteUser(id, name) {
    _showDeleteModal(id, name);
  }

  function _showDeleteModal(id, name) {
    document.getElementById('lm-del-modal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'lm-del-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(4px);padding:20px;';
    modal.innerHTML = `
      <div style="background:var(--card,#151922);border:1px solid rgba(244,63,94,.3);border-radius:16px;padding:28px 26px;max-width:420px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.9);">
        <div style="font-size:32px;text-align:center;margin-bottom:10px;">⚠️</div>
        <div style="font-size:16px;font-weight:700;color:var(--text,#e8eaf6);text-align:center;margin-bottom:6px;">Delete User Permanently</div>
        <div style="font-size:13px;color:var(--text-2,#7c87a8);text-align:center;margin-bottom:18px;">
          Deleting <strong style="color:#f87171;">${_esc(name)}</strong>
        </div>
        <div style="background:rgba(244,63,94,.06);border:1px solid rgba(244,63,94,.15);border-radius:10px;padding:14px;margin-bottom:20px;font-size:12px;color:var(--text-2,#7c87a8);line-height:2;">
          <div>✗ &nbsp;LedgerMate — transactions, budgets, loans, savings</div>
          <div>✗ &nbsp;Notes, credentials vault, investments, trips</div>
          <div>✗ &nbsp;Reminders, subscriptions, FD/RD, templates</div>
          <div>✗ &nbsp;Study Resources — account access</div>
          <div>✗ &nbsp;Cloud-synced data (Supabase ledger_data)</div>
          <div>✗ &nbsp;User profile &amp; authentication account</div>
          <div style="margin-top:8px;color:#fb7185;font-weight:600;">⚠️ This cannot be undone.</div>
        </div>
        <div id="lm-del-progress" style="display:none;font-size:12px;color:var(--text-2,#7c87a8);margin-bottom:14px;line-height:1.9;padding:10px 12px;background:var(--surface,#111420);border-radius:8px;border:1px solid var(--border,#1f2535);"></div>
        <div style="display:flex;gap:10px;">
          <button id="lm-del-cancel"
                  onclick="document.getElementById('lm-del-modal').remove()"
                  style="flex:1;padding:11px;background:var(--surface,#111420);border:1px solid var(--border,#1f2535);border-radius:10px;color:var(--text-2,#7c87a8);cursor:pointer;font-size:14px;font-family:inherit;">
            Cancel
          </button>
          <button id="lm-del-confirm-btn"
                  onclick="window.LM_Admin.executeDelete('${id}','${_esc(name)}')"
                  style="flex:1;padding:11px;background:linear-gradient(135deg,#f43f5e,#b91c1c);border:none;border-radius:10px;color:#fff;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit;">
            🗑 Delete Permanently
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  async function _executeDelete(id, name) {
    const btn       = document.getElementById('lm-del-confirm-btn');
    const cancelBtn = document.getElementById('lm-del-cancel');
    const progress  = document.getElementById('lm-del-progress');

    if (btn)       { btn.disabled = true; btn.textContent = '⏳ Deleting…'; }
    if (cancelBtn) { cancelBtn.disabled = true; }
    if (progress)  { progress.style.display = 'block'; progress.textContent = ''; }

    const log = (line) => { if (progress) progress.innerHTML += line + '<br>'; };

    const USER_DATA_STORES = [
      'transactions','budgets','loans','reminders','savings','investments',
      'recurringTransactions','audit_logs','auditLog','trips','trip_routes',
      'credentials','notes','note_versions','note_attachments','note_folders',
      'emi_loans','net_worth_snapshots','allocation_targets','sip_plan',
      'essentials_settings','savings_goals','subscriptions','fd_rd','tx_templates'
    ];

    let allOk = true;

    /* Step 1: wipe local IndexedDB records tagged with this user's profile ID */
    if (typeof window.LM_delByProfile === 'function') {
      let failCount = 0;
      for (const store of USER_DATA_STORES) {
        try { await window.LM_delByProfile(store, id); } catch { failCount++; }
      }
      log(failCount === 0 ? '✅ Local cached data cleared' : `⚠️ Local cache: ${failCount} stores skipped`);
    } else {
      log('ℹ️ Local cache: skipped (StorePatch not loaded)');
    }

    /* Step 2: delete cloud account — SECURITY DEFINER RPC cascades to
       user_profiles and ledger_data via FK ON DELETE CASCADE */
    try {
      const { error } = await _supabase.rpc('delete_user', { user_id: id });
      if (error) throw error;
      log('✅ Cloud data &amp; account deleted');
    } catch (e) {
      log('❌ Account deletion: ' + _esc(e.message || String(e)));
      allOk = false;
    }

    await new Promise(r => setTimeout(r, 900));
    document.getElementById('lm-del-modal')?.remove();

    if (allOk) {
      if (typeof showToast === 'function') showToast(`🗑 "${name}" and all their data deleted`, 'success');
    } else {
      if (typeof showToast === 'function') showToast('⚠️ Deletion may be incomplete — check Supabase logs', 'error');
    }
    await _refreshUserList();
  }

  async function _updateProfile(id, patch, successMsg) {
    try {
      const { error } = await _supabase.from('user_profiles').update(patch).eq('id', id);
      if (error) throw error;
      if (typeof showToast === 'function') showToast('✅ ' + successMsg, 'success');
      await _refreshUserList();
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ ' + (e.message || String(e)), 'error');
    }
  }

  /* ══════════════════════════════════════════════════════
     TAB: STATISTICS
  ══════════════════════════════════════════════════════ */
  async function _renderStats(container) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-3);">Loading statistics…</div>';

    let profiles = [], statsErr = null;
    try {
      const { data, error } = await _supabase.from('user_profiles').select('role,active,created_at');
      if (error) throw error;
      profiles = data || [];
    } catch (e) {
      statsErr = e.message;
    }

    const totalUsers  = profiles.length;
    const activeUsers = profiles.filter(u => u.active).length;
    const pendingUsers = profiles.filter(u => !u.active).length;
    const adminCount  = profiles.filter(u => u.role === 'admin').length;

    let txCount = 0, budgetCount = 0, loanCount = 0, noteCount = 0;
    try {
      if (window.state) {
        txCount     = (window.state.transactions   || []).length;
        budgetCount = (window.state.budgets        || []).length;
        loanCount   = (window.state.loans          || []).length;
        noteCount   = (window.state.notes          || []).length;
      }
    } catch {}

    const stat = (icon, val, label, cls) =>
      `<div class="kpi-card ${cls||''}">
        <div style="font-size:22px;margin-bottom:8px;">${icon}</div>
        <div class="kpi-value">${val}</div>
        <div class="kpi-label">${label}</div>
       </div>`;

    container.innerHTML = `
<div class="admin-section-title">📊 Application Statistics</div>
${statsErr ? `<div style="color:#fb7185;font-size:13px;margin-bottom:12px;">⚠️ Could not load user stats: ${_esc(statsErr)}</div>` : ''}
<div class="kpi-grid" style="margin-bottom:24px;">
  ${stat('👥', totalUsers,   'Total Users',       'teal')}
  ${stat('✅', activeUsers,  'Active Users',       'emerald')}
  ${stat('⏳', pendingUsers, 'Pending Approval',   pendingUsers > 0 ? 'gold' : '')}
  ${stat('⭐', adminCount,   'Admins',             'violet')}
  ${stat('↕️', txCount,      'Transactions (you)', '')}
  ${stat('🎯', budgetCount,  'Budgets (you)',       '')}
  ${stat('💰', loanCount,    'Loans (you)',         '')}
  ${stat('📝', noteCount,    'Notes (you)',         '')}
</div>`;
  }

  /* ══════════════════════════════════════════════════════
     TAB: APP SETTINGS
  ══════════════════════════════════════════════════════ */
  function _tabAppSettings() {
    const s = _loadAppSettings();
    return `
<div class="admin-section-title">🔧 Application Settings</div>
<div class="admin-form-card">
  <div class="admin-form-grid">
    <div>
      <label class="admin-label">App Name</label>
      <input id="as_appName" class="form-input" value="${_esc(s.appName||'LedgerMate')}">
    </div>
    <div>
      <label class="admin-label">Default Currency</label>
      <select id="as_currency" class="form-input">
        <option value="INR" ${s.currency==='INR'?'selected':''}>₹ INR</option>
        <option value="USD" ${s.currency==='USD'?'selected':''}>$ USD</option>
        <option value="EUR" ${s.currency==='EUR'?'selected':''}>€ EUR</option>
        <option value="GBP" ${s.currency==='GBP'?'selected':''}>£ GBP</option>
      </select>
    </div>
    <div>
      <label class="admin-label">Default Theme</label>
      <select id="as_theme" class="form-input">
        <option value="dark"  ${s.theme!=='light'?'selected':''}>🌙 Dark</option>
        <option value="light" ${s.theme==='light'?'selected':''}>☀️ Light</option>
      </select>
    </div>
    <div>
      <label class="admin-label">Session Timeout (minutes, 0=never)</label>
      <input id="as_sessionTTL" class="form-input" type="number" min="0" max="10080" value="${s.sessionTTL||0}">
    </div>
  </div>
  <div style="margin-top:18px;">
    <button class="btn-submit" onclick="window.LM_Admin.saveAppSettings()">💾 Save Settings</button>
  </div>
</div>`;
  }

  function _bindAppSettings() {}

  function _loadAppSettings() {
    try { return JSON.parse(localStorage.getItem('lm_app_settings') || '{}'); }
    catch { return {}; }
  }

  function _saveAppSettings() {
    const settings = {
      appName   : document.getElementById('as_appName')?.value.trim() || 'LedgerMate',
      currency  : document.getElementById('as_currency')?.value || 'INR',
      theme     : document.getElementById('as_theme')?.value || 'dark',
      sessionTTL: parseInt(document.getElementById('as_sessionTTL')?.value || '0') || 0
    };

    localStorage.setItem('lm_app_settings', JSON.stringify(settings));

    const newTheme = settings.theme;
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    if (window.state) window.state.settings = { ...(window.state.settings || {}), ...settings };

    ['themeIcon', 'themeBtn'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    });

    const merged = { ...(window.state?.settings || {}), ...settings };
    if (window.db) {
      try {
        const t = window.db.transaction(['settings'], 'readwrite').objectStore('settings');
        t.put({ key: 'appSettings', value: merged });
        t.put({ key: 'meta',        value: merged });
      } catch {}
    }
    localStorage.setItem('appSettings', JSON.stringify(merged));
    const uid = window.LM_Auth?.getCurrentUserId?.();
    if (uid) localStorage.setItem(`lm_u_${uid}_appSettings`, JSON.stringify(merged));
    if (window.state) window.state.settings = merged;

    if (typeof showToast === 'function') showToast('✅ Settings saved!', 'success');
  }

  /* ══════════════════════════════════════════════════════
     TAB: BACKUP
  ══════════════════════════════════════════════════════ */
  function _tabBackup() {
    return `
<div class="admin-section-title">🗄️ Data Backup &amp; Restore</div>

<div class="admin-form-card" style="margin-bottom:16px;">
  <div class="admin-section-title" style="font-size:13px;margin-bottom:12px;">📤 Export My Data</div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <button class="btn-submit" onclick="window.LM_Admin.exportBackup()">📤 Download Backup</button>
    <button class="admin-btn" onclick="window.LM_Admin.syncToCloud()" style="gap:6px;">☁️ Sync to Cloud Now</button>
  </div>
  <div style="font-size:11px;color:var(--text-3);margin-top:8px;">Exports all IndexedDB data as JSON. Cloud sync pushes your data to your account.</div>
</div>

<div class="admin-form-card" style="margin-bottom:16px;">
  <div class="admin-section-title" style="font-size:13px;margin-bottom:12px;">📥 Restore / Import</div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <input type="file" id="restoreFile" accept=".json" class="form-input" style="max-width:320px;">
    <button id="adminImportBtn" class="btn-submit" onclick="window.LM_Admin.importBackup()">📥 Restore</button>
  </div>
  <div style="font-size:11px;color:var(--text-3);margin-top:8px;">Merges backup into current database. Existing records are preserved.</div>
</div>

<div class="admin-form-card">
  <div class="admin-section-title" style="font-size:13px;margin-bottom:12px;">🗑 Danger Zone</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="admin-btn admin-btn-danger" onclick="window.LM_Admin.clearUserData()">🗑 Clear MY Data</button>
    <button class="admin-btn admin-btn-danger" onclick="window.LM_Admin.resetFactory()">⚠️ Factory Reset (ALL data)</button>
  </div>
  <div style="font-size:11px;color:var(--text-3);margin-top:8px;">Factory reset clears all local data. Cannot be undone.</div>
</div>`;
  }

  function _bindBackupTab() {}

  async function _exportBackup() {
    let payload = {};
    try {
      if (typeof window.FinalJson === 'function') payload = JSON.parse(await window.FinalJson());
    } catch {}
    payload._exportedBy = window.LM_Auth.getCurrentUser()?.username;
    payload._exportedAt = new Date().toISOString();

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ledgermate_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (typeof showToast === 'function') showToast('✅ Backup downloaded!', 'success');
  }

  async function _syncToCloud() {
    if (!window.LM_CloudSync) {
      if (typeof showToast === 'function') showToast('Cloud sync not available', 'error');
      return;
    }
    try {
      await window.LM_CloudSync.save();
      if (typeof showToast === 'function') showToast('☁️ Synced to cloud!', 'success');
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ Sync failed: ' + e.message, 'error');
    }
  }

  async function _importBackup() {
    const file = document.getElementById('restoreFile')?.files[0];
    if (!file) {
      if (typeof showToast === 'function') showToast('Please select a backup file first.', 'error');
      return;
    }
    const btn = document.getElementById('adminImportBtn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Restoring…'; }
    try {
      const text = await file.text();
      let payload;
      try { payload = JSON.parse(text); } catch (e) { throw new Error('Not valid JSON: ' + e.message); }
      if (!payload || typeof payload !== 'object') throw new Error('Empty or unreadable file.');
      if (typeof window.fullImportJSONText === 'function') {
        await window.fullImportJSONText(text, 'AdminPanel');
      } else if (typeof window.mergeRestore === 'function') {
        await window.mergeRestore(payload);
      } else {
        throw new Error('No restore function available.');
      }
      if (typeof showToast === 'function') showToast('✅ Backup restored!', 'success');
      const fi = document.getElementById('restoreFile');
      if (fi) fi.value = '';
    } catch (err) {
      if (typeof showToast === 'function') showToast('❌ Restore failed: ' + (err.message || String(err)), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📥 Restore'; }
    }
  }

  function _clearUserData() {
    if (!confirm('Delete all YOUR transactions, budgets, loans and other data?')) return;
    if (!confirm('Final confirmation — this cannot be undone.')) return;
    if (typeof clearAllData === 'function') clearAllData();
    if (typeof showToast === 'function') showToast('✅ Your data cleared', 'success');
  }

  function _resetFactory() {
    if (!confirm('⚠️ FACTORY RESET — This clears all local data. Are you absolutely sure?')) return;
    if (!confirm('Final warning: this is irreversible.')) return;
    localStorage.clear();
    if (window.db) {
      Array.from(window.db.objectStoreNames).forEach(s => {
        try { window.db.transaction(s, 'readwrite').objectStore(s).clear(); } catch {}
      });
    }
    if (typeof showToast === 'function') showToast('Factory reset complete. Reloading…', 'info');
    setTimeout(() => location.reload(), 1500);
  }

  /* ══════════════════════════════════════════════════════
     HELPERS
  ══════════════════════════════════════════════════════ */
  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ══════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════ */
  window.LM_Admin = {
    show              : showAdminPanel,
    close             : closeAdminPanel,
    switchTab         : _switchTab,
    showCreateUserForm: _showCreateUserForm,
    submitCreateUser  : _submitCreateUser,
    approveUser       : _approveUser,
    deactivateUser    : _deactivateUser,
    toggleRole        : _toggleRole,
    showStudyAccess   : _showStudyAccess,
    saveStudyAccess   : _saveStudyAccess,
    deleteUser        : _deleteUser,
    executeDelete     : _executeDelete,
    saveAppSettings   : _saveAppSettings,
    exportBackup      : _exportBackup,
    syncToCloud       : _syncToCloud,
    importBackup      : _importBackup,
    clearUserData     : _clearUserData,
    resetFactory      : _resetFactory
  };

})();
