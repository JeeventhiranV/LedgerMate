/**
 * LedgerMate – AuthManager.js
 * ─────────────────────────────────────────────────────────────
 * Offline-first authentication layer.
 * Handles: session persistence, login, logout, UI gating,
 *          module access control, per-user key namespacing.
 * Loads BEFORE Common.js so LM_Auth is available globally.
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* ── Storage keys ─────────────────────────────────────── */
  const SESSION_KEY   = 'lm_session';
  const LAST_PAGE_KEY = 'lm_lastPage';

  /* ── Per-user localStorage key helper ─────────────────── */
  function userKey(userId, key) {
    return `lm_u_${userId}_${key}`;
  }

  /* ══════════════════════════════════════════════════════
     PASSWORD CRYPTO  (Web Crypto API – PBKDF2 / SHA-256)
  ══════════════════════════════════════════════════════ */
  async function hashPassword(password, salt) {
    const enc = new TextEncoder();
    if (!salt) {
      const saltBytes = crypto.getRandomValues(new Uint8Array(16));
      salt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    const keyMat = await crypto.subtle.importKey(
      'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
      keyMat, 256
    );
    const hash = Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    return { hash, salt };
  }

  async function verifyPassword(password, storedHash, storedSalt) {
    const { hash } = await hashPassword(password, storedSalt);
    return hash === storedHash;
  }

  /* ══════════════════════════════════════════════════════
     SESSION  (localStorage – survives refresh)
  ══════════════════════════════════════════════════════ */
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
    catch { return null; }
  }

  function setSession(user) {
    const session = {
      userId      : user.id,
      username    : user.username,
      displayName : user.displayName || user.username,
      role        : user.role,
      loginAt     : Date.now()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function isLoggedIn() {
    const s = getSession();
    return !!(s && s.userId);
  }

  function getCurrentUser() { return getSession(); }

  function getCurrentUserId() {
    return getSession()?.userId || 'default';
  }

  function isAdmin() {
    return getSession()?.role === 'admin';
  }

  /* ══════════════════════════════════════════════════════
     UI GATING
  ══════════════════════════════════════════════════════ */
  function showLoginScreen() {
    const ls = document.getElementById('loginScreen');
    const ap = document.getElementById('app');
    if (ls) { ls.style.display = 'flex'; requestAnimationFrame(() => ls.classList.add('show')); }
    if (ap) ap.style.display = 'none';
    /* Reset app-ready flag on logout */
    window.LM_DB_READY = false;
  }

  function hideLoginScreen() {
    const ls = document.getElementById('loginScreen');
    const ap = document.getElementById('app');
    if (ls) { ls.style.display = 'none'; ls.classList.remove('show'); }
    if (ap) ap.style.display = 'flex';
  }

  /* ══════════════════════════════════════════════════════
     LOGIN / LOGOUT
  ══════════════════════════════════════════════════════ */
  async function login(username, password) {
    const users = window.LM_UserStore.getUsers();
    const user  = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim());

    if (!user)         throw new Error('User not found.');
    if (!user.active)  throw new Error('Account is deactivated. Contact admin.');

    const valid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!valid)        throw new Error('Incorrect password.');

    /* Update meta */
    user.lastLogin  = new Date().toISOString();
    user.loginCount = (user.loginCount || 0) + 1;
    window.LM_UserStore.saveUsers(users);
    window.LM_UserStore.logActivity(user.id, 'login', 'Logged in');

    const session = setSession(user);
    hideLoginScreen();
    updateUIForUser(session);

    /* Boot application */
    if (typeof window.LM_StartApp === 'function') {
      await window.LM_StartApp();
    }

    return session;
  }

  function logout() {
    const session = getSession();
    if (session) window.LM_UserStore.logActivity(session.userId, 'logout', 'Logged out');

    /* Emit logout event before wiping state */
    if (window.LM_Bus) LM_Bus.emit('lm:auth:logout', { userId: session?.userId });

    /* Wipe sensitive in-memory state */
    if (window.state) {
      ['transactions','budgets','loans','reminders','savings','investments',
       'credentials','notes','note_folders','note_attachments','note_versions',
       'trips','routes','emi_loans','net_worth_snapshots','allocation_targets',
       'sip_plan','audit_logs','savings_goals'].forEach(k => {
        if (Array.isArray(window.state[k])) window.state[k] = [];
      });
      window.state.essentials_settings = {};
      window.state.settings = {};
    }

    /* Reset DB – use the exposed reset function from Common.js which also resets the module-level `let db` */
    if (typeof window.LM_resetDB === 'function') {
      window.LM_resetDB();
    } else {
      /* Fallback if LM_resetDB not yet defined */
      try { if (window.db) { window.db.close(); } } catch {}
      window.db = null;
      window.LM_DB_READY = false;
    }

    clearSession();
    showLoginScreen();
    _renderLoginError('');
    /* Re-bind login form for next session */
    setTimeout(_bindLoginForm, 100);
  }

  /* ══════════════════════════════════════════════════════
     SIDEBAR / UI PERSONALISATION
  ══════════════════════════════════════════════════════ */
  function updateUIForUser(user) {
    /* Logo subtitle */
    const sub = document.querySelector('.sidebar-logo-sub');
    if (sub) sub.textContent = user.displayName || user.username;

    /* Topbar user chip */
    const chip = document.getElementById('topbarUserChip');
    if (chip) chip.textContent = (user.displayName || user.username).charAt(0).toUpperCase();
    const name = document.getElementById('topbarUserName');
    if (name) name.textContent = user.displayName || user.username;
    const roleTag = document.getElementById('topbarUserRole');
    if (roleTag) {
      roleTag.textContent = user.role === 'admin' ? '⭐ Admin' : '👤 User';
      roleTag.style.color  = user.role === 'admin' ? 'var(--gold)' : 'var(--text-3)';
    }

    /* Admin section visibility */
    const adminSec = document.getElementById('adminSidebarSection');
    if (adminSec) adminSec.style.display = user.role === 'admin' ? 'block' : 'none';

    /* Module access */
    _applyModuleAccess(user);
  }

  function _applyModuleAccess(user) {
    if (user.role === 'admin') {
      /* Restore all hidden items for admin */
      document.querySelectorAll('.sidebar-nav-item[data-module]').forEach(el => {
        el.style.display = '';
      });
      return;
    }
    const users  = window.LM_UserStore.getUsers();
    const dbUser = users.find(u => u.id === user.userId);
    if (!dbUser || !dbUser.allowedModules || dbUser.allowedModules.length === 0) return;

    const ALL_MODULES = ['analytics','gold','wealth','essentials','loans','investments','budgets'];
    ALL_MODULES.forEach(mod => {
      const el = document.querySelector(`.sidebar-nav-item[data-module="${mod}"]`);
      if (!el) return;
      el.style.display = dbUser.allowedModules.includes(mod) ? '' : 'none';
    });
  }

  /* ══════════════════════════════════════════════════════
     LOGIN SCREEN RENDERING
  ══════════════════════════════════════════════════════ */
  function _renderLoginError(msg) {
    const el = document.getElementById('loginError');
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
  }

  function _bindLoginForm() {
    const form     = document.getElementById('loginForm');
    const btnLogin = document.getElementById('btnLogin');
    const pwInput  = document.getElementById('loginPassword');
    const togglePw = document.getElementById('toggleLoginPw');

    if (togglePw && pwInput) {
      togglePw.addEventListener('click', () => {
        const isText = pwInput.type === 'text';
        pwInput.type = isText ? 'password' : 'text';
        togglePw.textContent = isText ? '👁' : '🙈';
      });
    }

    async function doLogin(e) {
      if (e) e.preventDefault();
      const username = document.getElementById('loginUsername')?.value.trim() || '';
      const password = document.getElementById('loginPassword')?.value || '';

      if (!username || !password) {
        _renderLoginError('Please enter both username and password.');
        return;
      }

      btnLogin && (btnLogin.disabled = true);
      btnLogin && (btnLogin.textContent = 'Signing in…');
      _renderLoginError('');

      try {
        await login(username, password);
      } catch (err) {
        _renderLoginError(err.message || 'Login failed.');
        btnLogin && (btnLogin.disabled = false);
        btnLogin && (btnLogin.textContent = 'Sign In');
      }
    }

    if (form)     form.addEventListener('submit', doLogin);
    if (btnLogin) btnLogin.addEventListener('click', doLogin);

    /* Press Enter in any field */
    document.querySelectorAll('#loginUsername,#loginPassword').forEach(el => {
      el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(e); });
    });
  }

  /* ══════════════════════════════════════════════════════
     BOOTSTRAP
  ══════════════════════════════════════════════════════ */
  async function init() {
    /* Ensure a default admin exists on first launch */
    await window.LM_UserStore.ensureDefaultAdmin();

    if (isLoggedIn()) {
      const session = getCurrentUser();
      /* Validate session still exists and is active */
      const users  = window.LM_UserStore.getUsers();
      const dbUser = users.find(u => u.id === session.userId);
      if (!dbUser || !dbUser.active) {
        clearSession();
        showLoginScreen();
        _bindLoginForm();
        return;
      }
      hideLoginScreen();
      updateUIForUser(session);
      if (typeof window.LM_StartApp === 'function') {
        await window.LM_StartApp();
      }
    } else {
      showLoginScreen();
      _bindLoginForm();
    }
  }

  /* ══════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════ */
  window.LM_Auth = {
    init,
    login,
    logout,
    isLoggedIn,
    getCurrentUser,
    getCurrentUserId,
    isAdmin,
    showLoginScreen,
    hideLoginScreen,
    updateUIForUser,
    hashPassword,
    verifyPassword,
    userKey,
    bindLoginForm: _bindLoginForm
  };

})();
