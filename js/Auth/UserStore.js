/**
 * LedgerMate – UserStore.js
 * ─────────────────────────────────────────────────────────────
 * User CRUD, activity log, storage utilities.
 * Loads immediately after AuthManager.js.
 * Users are stored in localStorage for reliability;
 * they are also mirrored into IDB users store when available.
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const USERS_KEY    = 'lm_users';
  const ACTIVITY_KEY = 'lm_activity';

  /* ── Helpers ─────────────────────────────────────────── */
  function uid() {
    return 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ══════════════════════════════════════════════════════
     USER PERSISTENCE
  ══════════════════════════════════════════════════════ */
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function getUser(id) {
    return getUsers().find(u => u.id === id) || null;
  }

  /* ══════════════════════════════════════════════════════
     DEFAULT ADMIN (first-run bootstrap)
  ══════════════════════════════════════════════════════ */
  async function ensureDefaultAdmin() {
    if (getUsers().length > 0) return;
    const { hash, salt } = await window.LM_Auth.hashPassword('admin123');
    const admin = {
      id            : uid(),
      username      : 'admin',
      displayName   : 'Administrator',
      email         : '',
      role          : 'admin',
      active        : true,
      createdAt     : new Date().toISOString(),
      lastLogin     : null,
      loginCount    : 0,
      passwordHash  : hash,
      passwordSalt  : salt,
      allowedModules: [],           // empty = all modules
      preferences   : { theme: 'dark', currency: 'INR' }
    };
    saveUsers([admin]);
    console.log('[LM] Default admin created – username: admin, password: admin123');
  }

  /* ══════════════════════════════════════════════════════
     CREATE USER
  ══════════════════════════════════════════════════════ */
  async function createUser(data) {
    const users = getUsers();
    if (!data.username || data.username.length < 3) {
      throw new Error('Username must be at least 3 characters.');
    }
    if (users.find(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      throw new Error('Username already exists.');
    }
    if (!data.password || data.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    const { hash, salt } = await window.LM_Auth.hashPassword(data.password);
    const newUser = {
      id            : uid(),
      username      : data.username.trim(),
      displayName   : (data.displayName || data.username).trim(),
      email         : (data.email || '').trim(),
      role          : data.role === 'admin' ? 'admin' : 'user',
      active        : data.active !== false,
      createdAt     : new Date().toISOString(),
      lastLogin     : null,
      loginCount    : 0,
      passwordHash  : hash,
      passwordSalt  : salt,
      allowedModules: data.allowedModules || [],
      preferences   : data.preferences || {}
    };
    users.push(newUser);
    saveUsers(users);
    logActivity(window.LM_Auth.getCurrentUserId(), 'create_user', `Created user: ${newUser.username}`);
    return newUser;
  }

  /* ══════════════════════════════════════════════════════
     UPDATE USER
  ══════════════════════════════════════════════════════ */
  function updateUser(id, data) {
    const users = getUsers();
    const idx   = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found.');

    if (data.username && data.username !== users[idx].username) {
      if (users.find(u => u.id !== id && u.username.toLowerCase() === data.username.toLowerCase())) {
        throw new Error('Username already taken.');
      }
    }

    /* Never overwrite hashed password fields via this function */
    const { password, passwordHash, passwordSalt, id: _id, createdAt, loginCount, lastLogin, ...safe } = data;
    users[idx] = { ...users[idx], ...safe };
    saveUsers(users);
    logActivity(window.LM_Auth.getCurrentUserId(), 'update_user', `Updated user: ${users[idx].username}`);
    return users[idx];
  }

  /* ══════════════════════════════════════════════════════
     RESET PASSWORD
  ══════════════════════════════════════════════════════ */
  async function resetPassword(id, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }
    const users = getUsers();
    const idx   = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found.');
    const { hash, salt } = await window.LM_Auth.hashPassword(newPassword);
    users[idx].passwordHash = hash;
    users[idx].passwordSalt = salt;
    saveUsers(users);
    logActivity(window.LM_Auth.getCurrentUserId(), 'reset_password', `Password reset: ${users[idx].username}`);
  }

  /* ══════════════════════════════════════════════════════
     DELETE USER
  ══════════════════════════════════════════════════════ */
  function deleteUser(id) {
    const users = getUsers();
    const user  = users.find(u => u.id === id);
    if (!user) throw new Error('User not found.');
    if (user.role === 'admin' && users.filter(u => u.role === 'admin' && u.active).length <= 1) {
      throw new Error('Cannot delete the last active admin account.');
    }
    const filtered = users.filter(u => u.id !== id);
    saveUsers(filtered);
    logActivity(window.LM_Auth.getCurrentUserId(), 'delete_user', `Deleted user: ${user.username}`);
  }

  /* ══════════════════════════════════════════════════════
     ACTIVATE / DEACTIVATE
  ══════════════════════════════════════════════════════ */
  function setActive(id, active) {
    const users = getUsers();
    const idx   = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found.');
    if (!active && users[idx].role === 'admin' &&
        users.filter(u => u.role === 'admin' && u.active).length <= 1) {
      throw new Error('Cannot deactivate the last active admin.');
    }
    users[idx].active = active;
    saveUsers(users);
    const action = active ? 'activate_user' : 'deactivate_user';
    logActivity(window.LM_Auth.getCurrentUserId(), action, `${active ? 'Activated' : 'Deactivated'}: ${users[idx].username}`);
    return users[idx];
  }

  /* ══════════════════════════════════════════════════════
     USER-SCOPED PREFERENCES
  ══════════════════════════════════════════════════════ */
  function getUserPreference(userId, key, defaultVal) {
    try {
      const raw = localStorage.getItem(window.LM_Auth.userKey(userId, 'pref_' + key));
      return raw !== null ? JSON.parse(raw) : defaultVal;
    } catch { return defaultVal; }
  }

  function setUserPreference(userId, key, value) {
    localStorage.setItem(window.LM_Auth.userKey(userId, 'pref_' + key), JSON.stringify(value));
  }

  /* ══════════════════════════════════════════════════════
     ACTIVITY LOG  (last 1000 entries in localStorage)
  ══════════════════════════════════════════════════════ */
  function logActivity(userId, action, detail) {
    try {
      const logs = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
      logs.push({
        id        : Date.now() + '_' + Math.random().toString(36).slice(2),
        userId    : userId || 'system',
        action,
        detail,
        timestamp : new Date().toISOString()
      });
      if (logs.length > 1000) logs.splice(0, logs.length - 1000);
      localStorage.setItem(ACTIVITY_KEY, JSON.stringify(logs));
    } catch {}
  }

  function getActivityLogs(userId) {
    try {
      const logs = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || '[]');
      return userId ? logs.filter(l => l.userId === userId).reverse() : [...logs].reverse();
    } catch { return []; }
  }

  function clearActivityLogs() {
    localStorage.removeItem(ACTIVITY_KEY);
  }

  /* ══════════════════════════════════════════════════════
     STORAGE STATS
  ══════════════════════════════════════════════════════ */
  function getStorageStats() {
    let lsBytes = 0;
    for (const k of Object.keys(localStorage)) {
      lsBytes += (localStorage[k].length + k.length) * 2;
    }
    return { localStorageBytes: lsBytes };
  }

  function getUserDataSize(userId) {
    let bytes = 0;
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(`lm_u_${userId}_`)) {
        bytes += (localStorage[k].length + k.length) * 2;
      }
    }
    return bytes;
  }

  /* ══════════════════════════════════════════════════════
     MIGRATION HELPER  (existing single-user data)
  ══════════════════════════════════════════════════════ */
  function markMigrationComplete(adminId) {
    localStorage.setItem('lm_migration_done', adminId);
  }

  function isMigrationDone() {
    return !!localStorage.getItem('lm_migration_done');
  }

  /* ══════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════ */
  window.LM_UserStore = {
    getUsers,
    saveUsers,
    getUser,
    ensureDefaultAdmin,
    createUser,
    updateUser,
    resetPassword,
    deleteUser,
    setActive,
    getUserPreference,
    setUserPreference,
    logActivity,
    getActivityLogs,
    clearActivityLogs,
    getStorageStats,
    getUserDataSize,
    markMigrationComplete,
    isMigrationDone
  };

})();
