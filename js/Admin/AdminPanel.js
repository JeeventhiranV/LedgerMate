/**
 * LedgerMate – AdminPanel.js
 * ─────────────────────────────────────────────────────────────
 * Complete Admin Panel:
 *  • User management (create, edit, delete, activate, reset pw)
 *  • Role & module access assignment
 *  • Activity / audit log
 *  • Dashboard statistics
 *  • Storage usage summary
 *  • App-wide settings
 *  • Per-user data backup & restore
 *  • IndexedDB data preview
 * All UI uses existing CSS variables – no external styles added.
 * ─────────────────────────────────────────────────────────────
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

  /* ══════════════════════════════════════════════════════
     ENTRY POINT
  ══════════════════════════════════════════════════════ */
  function showAdminPanel() {
    if (!window.LM_Auth?.isAdmin()) {
      if (typeof showToast === 'function') showToast('Access denied', 'error');
      return;
    }
    _renderPanel();
  }

  function closeAdminPanel() {
    const panel = document.getElementById('adminPanelOverlay');
    if (panel) panel.remove();
  }

  /* ══════════════════════════════════════════════════════
     PANEL SHELL
  ══════════════════════════════════════════════════════ */
  function _renderPanel() {
    document.getElementById('adminPanelOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id    = 'adminPanelOverlay';
    overlay.innerHTML = `
<div id="adminPanel">
  <!-- HEADER -->
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

  <!-- BODY -->
  <div class="admin-body">
    <!-- LEFT NAV -->
    <nav class="admin-nav">
      <button class="admin-nav-item active" data-tab="users"     onclick="window.LM_Admin.switchTab('users')">    👥 Users</button>
      <button class="admin-nav-item"        data-tab="activity"  onclick="window.LM_Admin.switchTab('activity')"> 📋 Activity Log</button>
      <button class="admin-nav-item"        data-tab="stats"     onclick="window.LM_Admin.switchTab('stats')">    📊 Statistics</button>
      <button class="admin-nav-item"        data-tab="storage"   onclick="window.LM_Admin.switchTab('storage')">  💾 Storage</button>
      <button class="admin-nav-item"        data-tab="appsettings" onclick="window.LM_Admin.switchTab('appsettings')">🔧 App Settings</button>
      <button class="admin-nav-item"        data-tab="backup"    onclick="window.LM_Admin.switchTab('backup')">   🗄️ Backup</button>
    </nav>

    <!-- CONTENT AREA -->
    <div class="admin-content" id="adminContent">
      <!-- dynamically rendered -->
    </div>
  </div>
</div>
`;
    document.body.appendChild(overlay);
    _switchTab('users');
  }

  /* ══════════════════════════════════════════════════════
     TAB SWITCHER
  ══════════════════════════════════════════════════════ */
  function _switchTab(tab) {
    document.querySelectorAll('.admin-nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    const content = document.getElementById('adminContent');
    if (!content) return;
    switch (tab) {
      case 'users':       content.innerHTML = _tabUsers();       _bindUsersTab();        break;
      case 'activity':    content.innerHTML = _tabActivity();                             break;
      case 'stats':       _renderStats(content);                                          break;
      case 'storage':     _renderStorage(content);                                        break;
      case 'appsettings': content.innerHTML = _tabAppSettings(); _bindAppSettings();     break;
      case 'backup':      content.innerHTML = _tabBackup();      _bindBackupTab();       break;
    }
  }

  /* ══════════════════════════════════════════════════════
     TAB: USERS
  ══════════════════════════════════════════════════════ */
  function _tabUsers() {
    const users = window.LM_UserStore.getUsers();
    const rows  = users.map(u => `
<tr>
  <td>
    <div style="font-weight:600;color:var(--text);">${_esc(u.displayName || u.username)}</div>
    <div style="font-size:11px;color:var(--text-3);">@${_esc(u.username)}</div>
  </td>
  <td><span class="admin-badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span></td>
  <td><span class="admin-badge ${u.active ? 'badge-active' : 'badge-inactive'}">${u.active ? 'Active' : 'Inactive'}</span></td>
  <td style="font-size:11px;color:var(--text-3);">${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</td>
  <td style="font-size:11px;color:var(--text-3);">${u.loginCount || 0}</td>
  <td>
    <div style="display:flex;gap:6px;flex-wrap:wrap;">
      <button class="admin-btn admin-btn-sm" onclick="window.LM_Admin.editUser('${u.id}')">✏️ Edit</button>
      <button class="admin-btn admin-btn-sm admin-btn-warn" onclick="window.LM_Admin.resetPw('${u.id}')">🔑 Reset PW</button>
      <button class="admin-btn admin-btn-sm ${u.active ? 'admin-btn-warn' : 'admin-btn-success'}"
              onclick="window.LM_Admin.toggleActive('${u.id}',${!u.active})">
        ${u.active ? '⏸ Disable' : '▶ Enable'}
      </button>
      <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="window.LM_Admin.deleteUser('${u.id}')">🗑 Delete</button>
    </div>
  </td>
</tr>`).join('');

    return `
<div class="admin-section-title">👥 User Management</div>
<button class="btn-submit admin-btn-create" onclick="window.LM_Admin.showCreateUserForm()">＋ Create User</button>

<div id="userFormArea"></div>

<div class="admin-table-wrap">
  <table class="admin-table">
    <thead>
      <tr>
        <th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Logins</th><th>Actions</th>
      </tr>
    </thead>
    <tbody id="userTableBody">${rows || '<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-3)">No users found</td></tr>'}</tbody>
  </table>
</div>`;
  }

  function _bindUsersTab() { /* no extra binds needed – all use onclick */ }

  function _refreshUserTable() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = _tabUsers();
    const newTbody = tmp.querySelector('#userTableBody');
    if (newTbody) tbody.innerHTML = newTbody.innerHTML;
  }

  /* ── Create / Edit User Form ───────────────────────── */
  function _showCreateUserForm(existingUser) {
    const isEdit = !!existingUser;
    const u      = existingUser || {};
    const moduleCheckboxes = ALL_MODULES.map(m => `
<label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;padding:3px 0;">
  <input type="checkbox" name="mod_${m.key}" value="${m.key}"
    ${(!u.allowedModules || u.allowedModules.length === 0 || u.allowedModules.includes(m.key)) ? 'checked' : ''}>
  ${m.label}
</label>`).join('');

    const area = document.getElementById('userFormArea');
    if (!area) return;
    area.innerHTML = `
<div class="admin-form-card" id="userFormCard">
  <div class="admin-section-title" style="margin-bottom:16px;">${isEdit ? '✏️ Edit User' : '➕ Create New User'}</div>
  <div class="admin-form-grid">
    <div>
      <label class="admin-label">Username *</label>
      <input id="uf_username" class="form-input" value="${_esc(u.username || '')}" placeholder="username" ${isEdit ? 'readonly style="opacity:0.6"' : ''}>
    </div>
    <div>
      <label class="admin-label">Display Name</label>
      <input id="uf_displayName" class="form-input" value="${_esc(u.displayName || '')}" placeholder="Full name">
    </div>
    <div>
      <label class="admin-label">Email</label>
      <input id="uf_email" class="form-input" value="${_esc(u.email || '')}" placeholder="email@example.com" type="email">
    </div>
    <div>
      <label class="admin-label">Role</label>
      <select id="uf_role" class="form-input">
        <option value="user"  ${u.role !== 'admin' ? 'selected' : ''}>👤 Normal User</option>
        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>⭐ Admin</option>
      </select>
    </div>
    ${!isEdit ? `
    <div>
      <label class="admin-label">Password *</label>
      <input id="uf_password" class="form-input" type="password" placeholder="min 6 characters">
    </div>
    <div>
      <label class="admin-label">Confirm Password *</label>
      <input id="uf_password2" class="form-input" type="password" placeholder="repeat password">
    </div>` : ''}
    <div>
      <label class="admin-label">Status</label>
      <select id="uf_active" class="form-input">
        <option value="true"  ${u.active !== false ? 'selected' : ''}>✅ Active</option>
        <option value="false" ${u.active === false  ? 'selected' : ''}>⏸ Inactive</option>
      </select>
    </div>
  </div>

  <div style="margin-top:16px;">
    <label class="admin-label">Module Access (uncheck to restrict)</label>
    <div class="admin-module-grid">${moduleCheckboxes}</div>
    <div style="font-size:11px;color:var(--text-3);margin-top:4px;">Admins always have full access regardless of selection.</div>
  </div>

  <div id="userFormError" class="admin-error" style="display:none;"></div>

  <div style="display:flex;gap:10px;margin-top:18px;">
    <button class="btn-submit" onclick="window.LM_Admin.submitUserForm('${u.id || ''}')">
      ${isEdit ? '💾 Save Changes' : '✅ Create User'}
    </button>
    <button class="admin-btn" onclick="document.getElementById('userFormArea').innerHTML='';document.getElementById('userFormCard')?.remove()">
      Cancel
    </button>
  </div>
</div>`;

    area.scrollIntoView({ behavior: 'smooth' });
  }

  async function _submitUserForm(existingId) {
    const isEdit = !!existingId;
    const errEl  = document.getElementById('userFormError');
    const showErr = msg => {
      if (errEl) { errEl.textContent = msg; errEl.style.display = 'block'; }
    };

    const username    = document.getElementById('uf_username')?.value.trim();
    const displayName = document.getElementById('uf_displayName')?.value.trim();
    const email       = document.getElementById('uf_email')?.value.trim();
    const role        = document.getElementById('uf_role')?.value;
    const active      = document.getElementById('uf_active')?.value === 'true';
    const modules     = Array.from(document.querySelectorAll('[name^="mod_"]:checked')).map(c => c.value);
    const password    = document.getElementById('uf_password')?.value;
    const password2   = document.getElementById('uf_password2')?.value;

    try {
      if (!isEdit) {
        if (password !== password2) { showErr('Passwords do not match.'); return; }
        await window.LM_UserStore.createUser({ username, displayName, email, role, active, allowedModules: modules, password });
        if (typeof showToast === 'function') showToast('✅ User created!', 'success');
      } else {
        window.LM_UserStore.updateUser(existingId, { displayName, email, role, active, allowedModules: modules });
        if (typeof showToast === 'function') showToast('✅ User updated!', 'success');
      }
      document.getElementById('userFormArea').innerHTML = '';
      _refreshUserTable();
    } catch (err) {
      showErr(err.message);
    }
  }

  async function _resetPw(userId) {
    const user = window.LM_UserStore.getUser(userId);
    if (!user) return;
    const pw = prompt(`Set new password for "${user.username}" (min 6 chars):`);
    if (!pw) return;
    try {
      await window.LM_UserStore.resetPassword(userId, pw);
      if (typeof showToast === 'function') showToast('✅ Password reset!', 'success');
    } catch (err) {
      if (typeof showToast === 'function') showToast('❌ ' + err.message, 'error');
    }
  }

  function _toggleActive(userId, active) {
    try {
      window.LM_UserStore.setActive(userId, active);
      _refreshUserTable();
      if (typeof showToast === 'function') showToast(active ? '✅ User activated' : '⏸ User deactivated', 'success');
    } catch (err) {
      if (typeof showToast === 'function') showToast('❌ ' + err.message, 'error');
    }
  }

  function _deleteUser(userId) {
    const user = window.LM_UserStore.getUser(userId);
    if (!user) return;
    if (!confirm(`Delete user "${user.username}"? Their data in the database will remain but become inaccessible.`)) return;
    try {
      window.LM_UserStore.deleteUser(userId);
      _refreshUserTable();
      if (typeof showToast === 'function') showToast('🗑 User deleted', 'success');
    } catch (err) {
      if (typeof showToast === 'function') showToast('❌ ' + err.message, 'error');
    }
  }

  /* ══════════════════════════════════════════════════════
     TAB: ACTIVITY LOG
  ══════════════════════════════════════════════════════ */
  function _tabActivity() {
    const logs  = window.LM_UserStore.getActivityLogs();
    const users = window.LM_UserStore.getUsers();
    const uMap  = Object.fromEntries(users.map(u => [u.id, u.username]));

    const rows = logs.slice(0, 200).map(l => `
<tr>
  <td style="font-size:11px;color:var(--text-3);">${new Date(l.timestamp).toLocaleString()}</td>
  <td style="font-size:12px;">${_esc(uMap[l.userId] || l.userId)}</td>
  <td><span class="admin-badge badge-action">${_esc(l.action)}</span></td>
  <td style="font-size:12px;color:var(--text-2);">${_esc(l.detail || '')}</td>
</tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-3)">No activity yet</td></tr>';

    return `
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
  <div class="admin-section-title" style="margin:0;">📋 Activity Log</div>
  <button class="admin-btn admin-btn-warn" onclick="if(confirm('Clear all activity logs?')){window.LM_UserStore.clearActivityLogs();window.LM_Admin.switchTab('activity');}">
    🗑 Clear Logs
  </button>
</div>
<div class="admin-table-wrap">
  <table class="admin-table">
    <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
  }

  /* ══════════════════════════════════════════════════════
     TAB: STATISTICS
  ══════════════════════════════════════════════════════ */
  async function _renderStats(container) {
    container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-3);">Loading statistics…</div>';
    const users  = window.LM_UserStore.getUsers();
    const active = users.filter(u => u.active).length;
    const admins = users.filter(u => u.role === 'admin').length;
    const logs   = window.LM_UserStore.getActivityLogs();
    const today  = new Date().toISOString().slice(0, 10);
    const logins24h = logs.filter(l => l.action === 'login' && l.timestamp.startsWith(today)).length;

    /* IDB counts */
    let txCount = 0, budgetCount = 0, loanCount = 0, noteCount = 0;
    try {
      if (window.db) {
        txCount     = (await getAll('transactions')).length;
        budgetCount = (await getAll('budgets')).length;
        loanCount   = (await getAll('loans')).length;
        noteCount   = (await getAll('notes')).length;
      }
    } catch {}

    const stat = (icon, val, label, cls) =>
      `<div class="kpi-card ${cls||''}">
        <div class="kpi-icon ${cls||''}" style="font-size:22px;margin-bottom:8px;">${icon}</div>
        <div class="kpi-value">${val}</div>
        <div class="kpi-label">${label}</div>
       </div>`;

    container.innerHTML = `
<div class="admin-section-title">📊 Application Statistics</div>
<div class="kpi-grid" style="margin-bottom:24px;">
  ${stat('👥', users.length,   'Total Users',         'teal')}
  ${stat('✅', active,         'Active Users',         'emerald')}
  ${stat('⭐', admins,         'Admins',               'violet')}
  ${stat('🔐', logins24h,      'Logins Today',         'gold')}
  ${stat('↕️', txCount,        'Transactions (you)',    '')}
  ${stat('🎯', budgetCount,    'Budgets (you)',         '')}
  ${stat('💰', loanCount,      'Loans (you)',           '')}
  ${stat('📝', noteCount,      'Notes (you)',           '')}
</div>

<div class="admin-section-title">👤 User Breakdown</div>
<div class="admin-table-wrap">
  <table class="admin-table">
    <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Logins</th><th>Last Active</th></tr></thead>
    <tbody>
    ${users.map(u => `<tr>
      <td>${_esc(u.displayName || u.username)}</td>
      <td><span class="admin-badge ${u.role==='admin'?'badge-admin':'badge-user'}">${u.role}</span></td>
      <td><span class="admin-badge ${u.active?'badge-active':'badge-inactive'}">${u.active?'Active':'Inactive'}</span></td>
      <td>${u.loginCount||0}</td>
      <td style="font-size:11px;color:var(--text-3);">${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}</td>
    </tr>`).join('')}
    </tbody>
  </table>
</div>`;
  }

  /* ══════════════════════════════════════════════════════
     TAB: STORAGE
  ══════════════════════════════════════════════════════ */
  async function _renderStorage(container) {
    container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-3);">Calculating storage…</div>';
    const stats = window.LM_UserStore.getStorageStats();
    const users = window.LM_UserStore.getUsers();
    const fmt   = b => b > 1048576 ? (b/1048576).toFixed(2)+' MB' : (b/1024).toFixed(1)+' KB';

    /* IDB estimate */
    let idbEstimate = null;
    try {
      if (navigator.storage?.estimate) {
        const est  = await navigator.storage.estimate();
        idbEstimate = `${fmt(est.usage||0)} / ${fmt(est.quota||0)}`;
      }
    } catch {}

    const userRows = users.map(u => {
      const sz = window.LM_UserStore.getUserDataSize(u.id);
      return `<tr>
        <td>${_esc(u.displayName || u.username)}</td>
        <td style="font-size:11px;color:var(--text-3);">@${_esc(u.username)}</td>
        <td>${sz > 0 ? fmt(sz) : '—'}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
<div class="admin-section-title">💾 Storage Summary</div>
<div class="kpi-grid" style="margin-bottom:24px;">
  <div class="kpi-card teal">
    <div class="kpi-label">localStorage Total</div>
    <div class="kpi-value">${fmt(stats.localStorageBytes)}</div>
  </div>
  ${idbEstimate ? `<div class="kpi-card violet">
    <div class="kpi-label">IndexedDB Usage / Quota</div>
    <div class="kpi-value" style="font-size:14px;">${idbEstimate}</div>
  </div>` : ''}
</div>

<div class="admin-section-title">Per-user localStorage</div>
<div class="admin-table-wrap">
  <table class="admin-table">
    <thead><tr><th>Name</th><th>Username</th><th>LS Data Size</th></tr></thead>
    <tbody>${userRows || '<tr><td colspan="3" style="text-align:center;padding:20px;color:var(--text-3)">No data</td></tr>'}</tbody>
  </table>
</div>

<div class="admin-section-title" style="margin-top:20px;">All localStorage Keys</div>
<div class="admin-table-wrap" style="max-height:240px;">
  <table class="admin-table">
    <thead><tr><th>Key</th><th>Size</th></tr></thead>
    <tbody>
    ${Object.keys(localStorage).sort().map(k =>
      `<tr><td style="font-size:11px;font-family:monospace;">${_esc(k)}</td><td style="font-size:11px;">${fmt((localStorage[k].length+k.length)*2)}</td></tr>`
    ).join('')}
    </tbody>
  </table>
</div>`;
  }

  /* ══════════════════════════════════════════════════════
     TAB: APP SETTINGS
  ══════════════════════════════════════════════════════ */
  function _tabAppSettings() {
    const settings = _loadAppSettings();
    return `
<div class="admin-section-title">🔧 Application Settings</div>
<div class="admin-form-card">
  <div class="admin-form-grid">
    <div>
      <label class="admin-label">App Name</label>
      <input id="as_appName" class="form-input" value="${_esc(settings.appName||'LedgerMate')}">
    </div>
    <div>
      <label class="admin-label">Default Currency</label>
      <select id="as_currency" class="form-input">
        <option value="INR" ${settings.currency==='INR'?'selected':''}>₹ INR</option>
        <option value="USD" ${settings.currency==='USD'?'selected':''}>$ USD</option>
        <option value="EUR" ${settings.currency==='EUR'?'selected':''}>€ EUR</option>
        <option value="GBP" ${settings.currency==='GBP'?'selected':''}>£ GBP</option>
      </select>
    </div>
    <div>
      <label class="admin-label">Default Theme</label>
      <select id="as_theme" class="form-input">
        <option value="dark"  ${settings.theme!=='light'?'selected':''}>🌙 Dark</option>
        <option value="light" ${settings.theme==='light'?'selected':''}>☀️ Light</option>
      </select>
    </div>
    <div>
      <label class="admin-label">Allow Self-Registration</label>
      <select id="as_selfReg" class="form-input">
        <option value="false" ${!settings.selfRegistration?'selected':''}>❌ No (admin only)</option>
        <option value="true"  ${settings.selfRegistration?'selected':''}>✅ Yes</option>
      </select>
    </div>
    <div>
      <label class="admin-label">Session Timeout (hours, 0=never)</label>
      <input id="as_sessionTTL" class="form-input" type="number" min="0" max="168" value="${settings.sessionTTL||0}">
    </div>
  </div>
  <div style="margin-top:18px;display:flex;gap:10px;">
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
      appName          : document.getElementById('as_appName')?.value.trim() || 'LedgerMate',
      currency         : document.getElementById('as_currency')?.value || 'INR',
      theme            : document.getElementById('as_theme')?.value || 'dark',
      selfRegistration : document.getElementById('as_selfReg')?.value === 'true',
      sessionTTL       : parseInt(document.getElementById('as_sessionTTL')?.value || '0') || 0
    };
    localStorage.setItem('lm_app_settings', JSON.stringify(settings));
    if (typeof showToast === 'function') showToast('✅ Settings saved!', 'success');
    window.LM_UserStore.logActivity(window.LM_Auth.getCurrentUserId(), 'app_settings', 'Updated app settings');
  }

  /* ══════════════════════════════════════════════════════
     TAB: BACKUP / RESTORE
  ══════════════════════════════════════════════════════ */
  function _tabBackup() {
    const users = window.LM_UserStore.getUsers();
    const userOpts = users.map(u =>
      `<option value="${u.id}">${_esc(u.displayName || u.username)} (@${_esc(u.username)})</option>`
    ).join('');

    return `
<div class="admin-section-title">🗄️ Data Backup &amp; Restore</div>

<div class="admin-form-card" style="margin-bottom:16px;">
  <div class="admin-section-title" style="font-size:13px;margin-bottom:12px;">📤 Export User Data</div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <select id="backupUserSel" class="form-input" style="max-width:260px;">
      <option value="all">— All Users (full backup) —</option>
      ${userOpts}
    </select>
    <button class="btn-submit" onclick="window.LM_Admin.exportBackup()">📤 Download Backup</button>
  </div>
  <div style="font-size:11px;color:var(--text-3);margin-top:8px;">Exports all IndexedDB data + user settings as JSON.</div>
</div>

<div class="admin-form-card" style="margin-bottom:16px;">
  <div class="admin-section-title" style="font-size:13px;margin-bottom:12px;">📥 Restore / Import</div>
  <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
    <input type="file" id="restoreFile" accept=".json" class="form-input" style="max-width:320px;">
    <button class="btn-submit" onclick="window.LM_Admin.importBackup()">📥 Restore</button>
  </div>
  <div style="font-size:11px;color:var(--text-3);margin-top:8px;">Merges backup into current database. Existing records are preserved.</div>
</div>

<div class="admin-form-card">
  <div class="admin-section-title" style="font-size:13px;margin-bottom:12px;">🗑 Danger Zone</div>
  <div style="display:flex;gap:10px;flex-wrap:wrap;">
    <button class="admin-btn admin-btn-danger" onclick="window.LM_Admin.clearUserData()">🗑 Clear MY Data</button>
    <button class="admin-btn admin-btn-danger" onclick="window.LM_Admin.resetFactory()">⚠️ Factory Reset (ALL data)</button>
  </div>
  <div style="font-size:11px;color:var(--text-3);margin-top:8px;">Factory reset removes ALL users and data. Cannot be undone.</div>
</div>`;
  }

  function _bindBackupTab() {}

  async function _exportBackup() {
    const sel    = document.getElementById('backupUserSel')?.value;
    const isAll  = !sel || sel === 'all';
    let payload  = {};

    if (typeof window.FinalJson === 'function') {
      const json = await window.FinalJson();
      payload    = JSON.parse(json);
    }

    payload.users       = window.LM_UserStore.getUsers();
    payload.activityLog = window.LM_UserStore.getActivityLogs();
    payload._exportedBy = window.LM_Auth.getCurrentUser()?.username;
    payload._exportedAt = new Date().toISOString();
    payload._scope      = isAll ? 'all' : sel;

    const blob  = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = `ledgermate_backup_${isAll ? 'full' : 'user'}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('✅ Backup downloaded!', 'success');
    window.LM_UserStore.logActivity(window.LM_Auth.getCurrentUserId(), 'export_backup', `Exported ${isAll?'full':'user'} backup`);
  }

  async function _importBackup() {
    const file = document.getElementById('restoreFile')?.files[0];
    if (!file) {
      if (typeof showToast === 'function') showToast('Please select a backup file first.', 'error');
      return;
    }

    const btn = document.querySelector('[onclick="window.LM_Admin.importBackup()"]');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Restoring…'; }

    try {
      const text = await file.text();

      /* Parse JSON */
      let payload;
      try { payload = JSON.parse(text); }
      catch (e) { throw new Error('File is not valid JSON: ' + e.message); }

      if (!payload || typeof payload !== 'object') {
        throw new Error('Backup file is empty or unreadable.');
      }

      /* Route: use fullImportJSONText for all formats (it's the most flexible) */
      if (typeof window.fullImportJSONText === 'function') {
        await window.fullImportJSONText(text, 'AdminPanel');
      } else if (typeof window.mergeRestore === 'function') {
        await window.mergeRestore(payload);
      } else {
        throw new Error('No restore function available.');
      }

      /* Merge lm_users from backup into localStorage (admin-only field) */
      if (payload.users && Array.isArray(payload.users)) {
        const existing = window.LM_UserStore.getUsers();
        let added = 0;
        payload.users.forEach(u => {
          if (u && u.id && !existing.find(e => e.id === u.id)) {
            existing.push(u);
            added++;
          }
        });
        if (added > 0) window.LM_UserStore.saveUsers(existing);
      }

      if (typeof showToast === 'function') showToast('✅ Backup restored successfully!', 'success');
      window.LM_UserStore.logActivity(
        window.LM_Auth.getCurrentUserId(),
        'import_backup',
        `Restored: ${file.name}`
      );

      /* Reset file input */
      const fi = document.getElementById('restoreFile');
      if (fi) fi.value = '';

    } catch (err) {
      console.error('[LM Admin] Restore failed:', err);
      if (typeof showToast === 'function') {
        showToast('❌ Restore failed: ' + (err.message || String(err)), 'error');
      }
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📥 Restore'; }
    }
  }

  function _clearUserData() {
    if (!confirm('Delete all YOUR transactions, budgets, loans and other data? This cannot be undone.')) return;
    if (!confirm('Last confirmation – this will permanently erase your financial data.')) return;
    if (typeof clearAllData === 'function') clearAllData();
    if (typeof showToast === 'function') showToast('✅ Your data cleared', 'success');
  }

  function _resetFactory() {
    if (!confirm('⚠️ FACTORY RESET – This will delete ALL users, ALL data, everything. Are you absolutely sure?')) return;
    if (!confirm('Final warning: this is irreversible.')) return;
    localStorage.clear();
    if (window.db) {
      const stores = Array.from(window.db.objectStoreNames);
      stores.forEach(s => {
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
    show           : showAdminPanel,
    close          : closeAdminPanel,
    switchTab      : _switchTab,
    showCreateUserForm: () => _showCreateUserForm(null),
    editUser       : (id) => _showCreateUserForm(window.LM_UserStore.getUser(id)),
    submitUserForm : _submitUserForm,
    resetPw        : _resetPw,
    toggleActive   : _toggleActive,
    deleteUser     : _deleteUser,
    saveAppSettings: _saveAppSettings,
    exportBackup   : _exportBackup,
    importBackup   : _importBackup,
    clearUserData  : _clearUserData,
    resetFactory   : _resetFactory
  };

})();
