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
      userId         : user.id,
      username       : user.username,
      displayName    : user.displayName || user.username,
      role           : user.role,
      allowedModules : user.allowedModules || [],
      loginAt        : Date.now()
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
    window.LM_DB_READY = false;
    /* Redirect to the unified login page */
    var base = window.location.href.split('/').slice(0, -1).join('/');
    window.location.replace(base + '/login.html?action=logout');
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
  async function login(email, password) {
    if (typeof _supabase !== 'undefined' && _supabase?.auth) {
      /* ── Supabase authentication ─────────────────────────── */
      const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);

      const sbUser = data.user;

      /* ── Fetch actual profile (role + active status) ─────── */
      const { data: profile, error: profErr } = await _supabase
        .from('user_profiles')
        .select('role, active, display_name, allowed_modules')
        .eq('id', sbUser.id)
        .single();

      if (profErr || !profile) {
        try { await _supabase.auth.signOut(); } catch (e) {}
        throw new Error('Account profile not found. Contact your administrator.');
      }

      if (!profile.active) {
        try { await _supabase.auth.signOut(); } catch (e) {}
        throw new Error('Your account is pending approval by an administrator.');
      }

      const user = {
        id             : sbUser.id,
        username       : sbUser.email,
        displayName    : profile.display_name || sbUser.email.split('@')[0],
        role           : profile.role || 'user',
        email          : sbUser.email,
        active         : profile.active,
        allowedModules : profile.allowed_modules || []
      };

      const session = setSession(user);
      hideLoginScreen();
      updateUIForUser(session);
      startInactivityWatcher();

      if (typeof window.LM_StartApp === 'function') {
        await window.LM_StartApp();
      }

      return session;
    } else {
      /* ── Offline / Local fallback authentication ────────── */
      const displayName = email.split('@')[0] || 'User';
      const user = {
        id             : 'u_' + Math.random().toString(36).substring(2, 9),
        username       : email,
        displayName    : displayName.charAt(0).toUpperCase() + displayName.slice(1),
        role           : 'admin',
        email          : email,
        active         : true,
        allowedModules : []
      };

      const session = setSession(user);
      hideLoginScreen();
      updateUIForUser(session);
      startInactivityWatcher();

      if (typeof window.LM_StartApp === 'function') {
        await window.LM_StartApp();
      }

      return session;
    }
  }

  async function logout() {
    stopInactivityWatcher();

    /* ── Save to cloud BEFORE wiping state ──────────────── */
    if (window.LM_CloudSync) {
      try { await window.LM_CloudSync.saveOnLogout(); } catch (e) {}
    }

    /* ── Supabase sign out (must complete before redirect) ── */
    if (typeof _supabase !== 'undefined' && _supabase?.auth) {
      try { await _supabase.auth.signOut(); } catch (e) {}
    }

    const session = getSession();
    if (session) {
      try { window.LM_UserStore.logActivity(session.userId, 'logout', 'Logged out'); } catch {}
    }

    /* Emit logout event before wiping state */
    if (window.LM_Bus) LM_Bus.emit('lm:auth:logout', { userId: session?.userId });

    /* Wipe sensitive in-memory state */
    if (window.state) {
      ['transactions','budgets','loans','reminders','savings','investments',
       'credentials','notes','note_folders','note_attachments','note_versions',
       'trips','routes','emi_loans','net_worth_snapshots','allocation_targets',
       'sip_plan','audit_logs','savings_goals','subscriptions'].forEach(k => {
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
    const initial = (user.displayName || user.username).charAt(0).toUpperCase();
    const chip = document.getElementById('topbarUserChip');
    if (chip) chip.textContent = initial;
    const chipMenu = document.getElementById('topbarUserChipMenu');
    if (chipMenu) chipMenu.textContent = initial;
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
    const ALL_MODULES = [
      'transactions','analytics','gold','wealth','essentials','loans','investments',
      'budgets','trips','notes','credentials',
      'subscriptions','savings-goals','emergency-fund','debt-payoff','wealth-goals',
      'tax-planner','fy-summary','month-comparison','spending-heatmap',
      'cash-flow-calendar','templates','dashboard-config'
    ];

    if (user.role === 'admin') {
      document.querySelectorAll('.sidebar-nav-item[data-module]').forEach(el => { el.style.display = ''; });
      return;
    }

    /* allowedModules comes from session (set during login from user_profiles) */
    const allowed = user.allowedModules || getSession()?.allowedModules || [];
    if (!allowed || allowed.length === 0) return; /* empty = all modules allowed */

    ALL_MODULES.forEach(mod => {
      const el = document.querySelector(`.sidebar-nav-item[data-module="${mod}"]`);
      if (!el) return;
      el.style.display = allowed.includes(mod) ? '' : 'none';
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
     PIN / BIOMETRIC APP LOCK
  ══════════════════════════════════════════════════════ */
  function getPinKey(userId) { return userKey(userId || getCurrentUserId(), 'pin_hash'); }
  function getAppLockKey(userId) { return userKey(userId || getCurrentUserId(), 'app_lock_enabled'); }
  function getBiometricKey(userId) { return userKey(userId || getCurrentUserId(), 'biometric_enabled'); }
  function getLockTimeoutKey(userId) { return userKey(userId || getCurrentUserId(), 'lock_timeout'); }

  function hashPin(pin) {
    // Simple deterministic hash for 4-digit PIN
    let h = 0;
    for (let i = 0; i < pin.length; i++) {
      h = (Math.imul(31, h) + pin.charCodeAt(i)) | 0;
    }
    return 'pin_' + Math.abs(h).toString(36) + '_' + pin.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  }

  function isPinSet(userId) {
    return !!localStorage.getItem(getPinKey(userId || getCurrentUserId()));
  }

  function setPin(pin, userId) {
    localStorage.setItem(getPinKey(userId || getCurrentUserId()), hashPin(pin));
  }

  function removePin(userId) {
    localStorage.removeItem(getPinKey(userId || getCurrentUserId()));
  }

  function verifyPin(pin, userId) {
    const stored = localStorage.getItem(getPinKey(userId || getCurrentUserId()));
    return stored === hashPin(pin);
  }

  function _syncNativeScreenSecurity() {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.setScreenSecurityEnabled === 'function') {
        const uid = getCurrentUserId();
        const appLock = isAppLockEnabled(uid);
        const privacy = localStorage.getItem('lm_privacy_mode') === '1';
        window.AndroidBridge.setScreenSecurityEnabled(appLock || privacy);
      }
    } catch (e) {
      console.warn('[Auth] Error syncing screen security:', e);
    }
  }

  function isAppLockEnabled(userId) {
    const uid = userId || getCurrentUserId();
    return localStorage.getItem(getAppLockKey(uid)) === 'true' && isPinSet(uid);
  }

  function setAppLockEnabled(enabled, userId) {
    const uid = userId || getCurrentUserId();
    localStorage.setItem(getAppLockKey(uid), enabled ? 'true' : 'false');
    _syncNativeScreenSecurity();
    try {
      if (window.LM_ProfileModal && typeof window.LM_ProfileModal.refresh === 'function') {
        window.LM_ProfileModal.refresh();
      }
    } catch (e) {}
  }

  function isBiometricEnabled(userId) {
    const uid = userId || getCurrentUserId();
    return localStorage.getItem(getBiometricKey(uid)) === 'true';
  }

  function setBiometricEnabled(enabled, userId) {
    const uid = userId || getCurrentUserId();
    localStorage.setItem(getBiometricKey(uid), enabled ? 'true' : 'false');
  }

  function getLockTimeout(userId) {
    const uid = userId || getCurrentUserId();
    const val = localStorage.getItem(getLockTimeoutKey(uid));
    return val !== null ? parseInt(val, 10) : 60000; // default 1 min
  }

  function setLockTimeout(ms, userId) {
    const uid = userId || getCurrentUserId();
    localStorage.setItem(getLockTimeoutKey(uid), String(ms));
  }

  let _isAppLockScreenActive = false;

  /* ── Modern Glassmorphism App Lock Screen ── */
  /* ── Modern Glassmorphism App Lock Screen ── */
  function showAppLockScreen(onSuccess) {
    if (_isAppLockScreenActive) return;
    const existing = document.getElementById('pinLockScreen');
    if (existing) existing.remove();

    _isAppLockScreenActive = true;
    const uid = getCurrentUserId();
    const userObj = getCurrentUser();
    const displayName = userObj?.displayName || userObj?.username || 'LedgerMate User';
    const biometricActive = isBiometricEnabled(uid) && typeof window.LM_Biometrics !== 'undefined';

    let entered = '';
    const el = document.createElement('div');
    el.id = 'pinLockScreen';
    el.className = 'lm-lock-screen-overlay';

    el.innerHTML = `
      <div class="lm-lock-card">
        <div class="lm-lock-logo">
          <div class="lm-lock-avatar">${displayName.charAt(0).toUpperCase()}</div>
        </div>
        <div class="lm-lock-title">Welcome Back</div>
        <div class="lm-lock-sub">${displayName}</div>
        <div class="lm-lock-instruction">${biometricActive ? 'Use Fingerprint / Face ID or enter 4-digit PIN' : 'Enter 4-digit security PIN to unlock'}</div>
        
        <div class="lm-lock-error" id="lockScreenErr" style="display:none;"></div>

        <!-- 4 Dots Indicator -->
        <div class="lm-lock-dots" id="lockScreenDots">
          ${[0, 1, 2, 3].map(() => `<div class="lm-lock-dot"></div>`).join('')}
        </div>

        <!-- Touch Numpad -->
        <div class="lm-lock-numpad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
            <button type="button" class="lm-numpad-btn" data-key="${num}">${num}</button>
          `).join('')}
          <!-- Bottom row: Biometrics button, 0, Backspace -->
          <button type="button" class="lm-numpad-btn lm-numpad-bio ${biometricActive ? 'active' : 'disabled'}" data-key="bio" title="Scan Biometrics">
            <span style="font-size:22px;line-height:1;">👆</span>
          </button>
          <button type="button" class="lm-numpad-btn" data-key="0">0</button>
          <button type="button" class="lm-numpad-btn lm-numpad-back" data-key="del" title="Delete">
            <span style="font-size:20px;line-height:1;">⌫</span>
          </button>
        </div>

        <!-- Bottom Safe Option -->
        <div class="lm-lock-footer">
          <button type="button" class="lm-lock-pw-btn" id="lockUsePwBtn">🚪 Sign out / Use Password</button>
        </div>
      </div>
    `;

    function updateLockUI(err, isSuccess) {
      const errEl = el.querySelector('#lockScreenErr');
      if (errEl) {
        if (err) {
          errEl.textContent = err;
          errEl.style.display = 'block';
        } else {
          errEl.textContent = '';
          errEl.style.display = 'none';
        }
      }

      const dotsWrap = el.querySelector('#lockScreenDots');
      if (dotsWrap) {
        if (err) {
          dotsWrap.classList.add('shake');
          setTimeout(() => dotsWrap.classList.remove('shake'), 500);
        }
        const dots = dotsWrap.querySelectorAll('.lm-lock-dot');
        dots.forEach((dot, i) => {
          dot.classList.toggle('filled', i < entered.length);
          dot.classList.toggle('success', !!isSuccess);
        });
      }
    }

    el.querySelectorAll('.lm-numpad-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const k = btn.getAttribute('data-key');
        if (k === 'bio') {
          triggerBiometricUnlock();
        } else if (k === 'del') {
          handlePinKey('⌫');
        } else if (k !== null) {
          handlePinKey(k);
        }
      });
    });

    const pwBtn = el.querySelector('#lockUsePwBtn');
    if (pwBtn) {
      pwBtn.addEventListener('click', () => {
        unlockCleanup();
        logout();
      });
    }

    function unlockCleanup() {
      _isAppLockScreenActive = false;
      document.removeEventListener('keydown', keyHandler);
      if (el.parentNode) el.remove();
    }

    function grantUnlock() {
      updateLockUI(null, true);
      try { navigator.vibrate?.(40); } catch (e) {}
      setTimeout(() => {
        unlockCleanup();
        if (typeof onSuccess === 'function') onSuccess();
      }, 250);
    }

    function handlePinKey(k) {
      if (k === '⌫') {
        if (entered.length > 0) {
          entered = entered.slice(0, -1);
          updateLockUI();
        }
        return;
      }
      if (entered.length >= 4) return;
      entered += k;
      updateLockUI();

      if (entered.length === 4) {
        if (verifyPin(entered, uid)) {
          grantUnlock();
        } else {
          try { navigator.vibrate?.([50, 50, 50]); } catch (e) {}
          entered = '';
          updateLockUI('Incorrect PIN. Please try again.');
        }
      }
    }

    async function triggerBiometricUnlock() {
      if (!window.LM_Biometrics) return;
      try {
        const ok = await window.LM_Biometrics.verify();
        if (ok) {
          grantUnlock();
        }
      } catch (e) {
        console.warn('[LockScreen] Biometric verification error:', e);
      }
    }

    const keyHandler = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handlePinKey(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handlePinKey('⌫');
      }
    };

    updateLockUI();
    document.body.appendChild(el);
    document.addEventListener('keydown', keyHandler);

    // Auto-trigger biometric verification if active
    if (biometricActive) {
      setTimeout(() => {
        triggerBiometricUnlock();
      }, 350);
    }
  }

  /* ── Background / Inactive App Lock Watcher ── */
  let _lastHiddenTime = 0;
  function _setupAppLockResumeWatcher() {
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        _lastHiddenTime = Date.now();
      } else if (document.visibilityState === 'visible') {
        if (!_isAppLockScreenActive && isLoggedIn()) {
          const uid = getCurrentUserId();
          if (isAppLockEnabled(uid)) {
            const timeout = getLockTimeout(uid);
            if (_lastHiddenTime > 0 && (Date.now() - _lastHiddenTime >= timeout)) {
              showAppLockScreen();
            }
          }
        }
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', (e) => {
      if (e.persisted && !_isAppLockScreenActive && isLoggedIn()) {
        const uid = getCurrentUserId();
        if (isAppLockEnabled(uid)) {
          showAppLockScreen();
        }
      }
    });
  }
  _setupAppLockResumeWatcher();

  /* ── Modern App Security (PIN & Biometrics) Settings Modal ── */
  async function openAppLockSettingsModal(initialView) {
    const uid = getCurrentUserId();
    let lockEnabled = isAppLockEnabled(uid);
    let bioEnabled = isBiometricEnabled(uid);
    let currentTimeout = getLockTimeout(uid);
    let hasPin = isPinSet(uid);

    let bioSupported = false;
    if (window.LM_Biometrics && typeof window.LM_Biometrics.isAvailable === 'function') {
      try { bioSupported = await window.LM_Biometrics.isAvailable(); } catch (e) { bioSupported = false; }
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'appLockSettingsModal';
    modal.style.display = 'flex';
    modal.style.zIndex = '10005';

    function renderModal(view, viewData) {
      if (view === 'setPin' || view === 'changePin' || view === 'verifyToDisable') {
        renderPinFlow(view, viewData);
        return;
      }

      lockEnabled = isAppLockEnabled(uid);
      bioEnabled = isBiometricEnabled(uid);
      hasPin = isPinSet(uid);

      modal.innerHTML = `
        <div class="modal" style="max-width:440px;width:92%;background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:0;overflow:hidden;box-shadow:var(--shadow), 0 10px 40px rgba(0,0,0,0.5);">
          <div class="modal-header" style="padding:18px 22px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,rgba(0,212,180,0.08),rgba(167,139,250,0.05));display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:22px;">🛡️</span>
              <div>
                <div style="font-size:16px;font-weight:700;color:var(--text);">App Security & Lock</div>
                <div style="font-size:11px;color:var(--text-3);">Protect LedgerMate with Biometrics & PIN</div>
              </div>
            </div>
            <button type="button" class="modal-close" id="closeSecurityModalBtn" style="background:none;border:none;color:var(--text-3);font-size:20px;cursor:pointer;">&times;</button>
          </div>

          <div class="modal-body" style="padding:22px;display:flex;flex-direction:column;gap:16px;max-height:75vh;overflow-y:auto;">
            <!-- Master Lock Toggle Card -->
            <div style="background:var(--surface);border:1px solid ${lockEnabled ? 'rgba(0,212,180,0.3)' : 'var(--border)'};border-radius:14px;padding:16px;display:flex;align-items:center;justify-content:space-between;transition:all 0.2s;">
              <div style="max-width:75%;">
                <div style="font-size:14px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px;">
                  <span>🔒 App Lock</span>
                  <span style="font-size:10px;padding:2px 8px;border-radius:99px;font-weight:700;${lockEnabled ? 'background:rgba(52,211,153,0.15);color:var(--emerald);border:1px solid rgba(52,211,153,0.3);' : 'background:rgba(255,255,255,0.06);color:var(--text-3);'}">${lockEnabled ? 'ENABLED' : 'DISABLED'}</span>
                </div>
                <div style="font-size:12px;color:var(--text-3);margin-top:4px;">Require authentication when opening or resuming LedgerMate</div>
              </div>
              <label class="lm-toggle-switch">
                <input type="checkbox" id="appLockToggle" ${lockEnabled ? 'checked' : ''}>
                <span class="lm-toggle-slider"></span>
              </label>
            </div>

            <!-- Biometrics Card -->
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;opacity:${lockEnabled ? '1' : '0.5'};pointer-events:${lockEnabled ? 'auto' : 'none'};transition:all 0.2s;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="max-width:75%;">
                  <div style="font-size:14px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px;">
                    <span>👆 Biometric Unlock</span>
                    <span style="font-size:10px;padding:2px 8px;border-radius:99px;font-weight:700;${bioSupported ? (bioEnabled ? 'background:rgba(52,211,153,0.15);color:var(--emerald);border:1px solid rgba(52,211,153,0.3);' : 'background:rgba(0,212,180,0.1);color:var(--teal);') : 'background:rgba(251,113,133,0.1);color:var(--rose);'}">
                      ${bioSupported ? (bioEnabled ? 'ACTIVE' : 'READY') : 'NOT SUPPORTED'}
                    </span>
                  </div>
                  <div style="font-size:12px;color:var(--text-3);margin-top:4px;">
                    ${bioSupported ? 'Unlock with Fingerprint / Touch ID / Face ID' : 'Hardware platform authenticator not available on this device'}
                  </div>
                </div>
                <label class="lm-toggle-switch">
                  <input type="checkbox" id="bioLockToggle" ${bioEnabled && bioSupported ? 'checked' : ''} ${!bioSupported ? 'disabled' : ''}>
                  <span class="lm-toggle-slider"></span>
                </label>
              </div>
            </div>

            <!-- PIN Management Card -->
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;opacity:${lockEnabled ? '1' : '0.5'};pointer-events:${lockEnabled ? 'auto' : 'none'};">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <div style="font-size:14px;font-weight:700;color:var(--text);">🔢 4-Digit Security PIN</div>
                  <div style="font-size:12px;color:var(--text-3);margin-top:4px;">${hasPin ? 'PIN is set and active as primary/fallback' : 'No PIN configured yet'}</div>
                </div>
                <button type="button" id="changePinBtn" class="btn btn-secondary btn-sm" style="font-size:12px;padding:6px 14px;">
                  ${hasPin ? 'Change PIN' : 'Set PIN'}
                </button>
              </div>
            </div>

            <!-- Auto-Lock Timeout Selector -->
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;opacity:${lockEnabled ? '1' : '0.5'};pointer-events:${lockEnabled ? 'auto' : 'none'};">
              <div style="font-size:14px;font-weight:700;color:var(--text);margin-bottom:8px;">⏱️ Auto-Lock Delay</div>
              <div style="font-size:12px;color:var(--text-3);margin-bottom:12px;">Lock LedgerMate after being in the background for:</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
                ${[
                  { label: 'Immediate', ms: 0 },
                  { label: '1 Minute', ms: 60000 },
                  { label: '5 Minutes', ms: 300000 }
                ].map(opt => `
                  <button type="button" class="lm-timeout-pill ${currentTimeout === opt.ms ? 'active' : ''}" data-timeout="${opt.ms}">
                    ${opt.label}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Android Screenshot Protection & Screen Privacy -->
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="max-width:82%;">
                  <div style="font-size:14px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px;">
                    <span>🛡️ Screenshot &amp; App Switcher Protection</span>
                    <span style="font-size:10px;padding:2px 8px;border-radius:99px;font-weight:700;${lockEnabled || (localStorage.getItem('lm_privacy_mode') === '1') ? 'background:rgba(52,211,153,0.15);color:var(--emerald);' : 'background:rgba(255,255,255,0.06);color:var(--text-3);'}">
                      ${lockEnabled || (localStorage.getItem('lm_privacy_mode') === '1') ? 'ACTIVE (FLAG_SECURE)' : 'STANDBY'}
                    </span>
                  </div>
                  <div style="font-size:12px;color:var(--text-3);margin-top:4px;">
                    Prevents Android screen captures and masks recents preview switcher when App Lock or Stealth Mode is engaged.
                  </div>
                </div>
              </div>
            </div>

            <!-- Lock Now Quick Test -->
            ${lockEnabled ? `
              <div style="text-align:center;margin-top:4px;">
                <button type="button" id="lockNowTestBtn" class="btn btn-ghost" style="font-size:12px;color:var(--teal);border:1px dashed rgba(0,212,180,0.3);width:100%;padding:10px;">
                  🔒 Lock LedgerMate Now (Test Screen)
                </button>
              </div>
            ` : ''}

            <!-- Panic Emergency Reset -->
            <div style="background:rgba(239,68,68,0.04);border:1px dashed rgba(239,68,68,0.25);border-radius:14px;padding:14px;margin-top:4px;">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <div>
                  <div style="font-size:13px;font-weight:700;color:var(--rose);">⚠️ Emergency Local Data Wipe</div>
                  <div style="font-size:11px;color:var(--text-3);margin-top:2px;">Purge all local session data, cached balances &amp; offline storage on this device</div>
                </div>
                <button type="button" id="panicWipeBtn" class="btn btn-danger btn-sm" style="font-size:11px;padding:6px 12px;white-space:nowrap;background:rgba(239,68,68,0.2);color:var(--rose);border:1px solid rgba(239,68,68,0.4);">
                  Wipe Data
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      // Event Bindings
      modal.querySelector('#closeSecurityModalBtn')?.addEventListener('click', () => modal.remove());

      // Master App Lock Toggle
      const appLockToggle = modal.querySelector('#appLockToggle');
      if (appLockToggle) {
        appLockToggle.addEventListener('change', async (e) => {
          const checked = e.target.checked;
          if (checked) {
            if (!isPinSet(uid)) {
              renderModal('setPin', {
                onComplete: () => {
                  setAppLockEnabled(true, uid);
                  renderModal();
                  if (typeof showToast === 'function') showToast('🛡️ App Lock enabled successfully!', 'success');
                },
                onCancel: () => {
                  renderModal();
                }
              });
            } else {
              setAppLockEnabled(true, uid);
              renderModal();
              if (typeof showToast === 'function') showToast('🛡️ App Lock enabled!', 'success');
            }
          } else {
            // Confirm with PIN before disabling
            if (isPinSet(uid)) {
              renderModal('verifyToDisable', {
                onComplete: () => {
                  setAppLockEnabled(false, uid);
                  renderModal();
                  if (typeof showToast === 'function') showToast('App Lock disabled.', 'info');
                },
                onCancel: () => {
                  renderModal();
                }
              });
            } else {
              setAppLockEnabled(false, uid);
              renderModal();
            }
          }
        });
      }

      // Biometrics Toggle
      const bioToggle = modal.querySelector('#bioLockToggle');
      if (bioToggle) {
        bioToggle.addEventListener('change', async (e) => {
          const checked = e.target.checked;
          if (checked) {
            if (window.LM_Biometrics) {
              const enrolled = await window.LM_Biometrics.register();
              if (enrolled) {
                setBiometricEnabled(true, uid);
                renderModal();
              } else {
                bioToggle.checked = false;
              }
            }
          } else {
            setBiometricEnabled(false, uid);
            renderModal();
            if (typeof showToast === 'function') showToast('Biometric unlock disabled.', 'info');
          }
        });
      }

      // Change / Set PIN button
      modal.querySelector('#changePinBtn')?.addEventListener('click', () => {
        if (isPinSet(uid)) {
          renderModal('changePin', {
            onComplete: () => {
              renderModal();
              if (typeof showToast === 'function') showToast('✅ PIN updated successfully!', 'success');
            },
            onCancel: () => renderModal()
          });
        } else {
          renderModal('setPin', {
            onComplete: () => {
              renderModal();
              if (typeof showToast === 'function') showToast('PIN configured successfully!', 'success');
            },
            onCancel: () => renderModal()
          });
        }
      });

      // Timeout pills
      modal.querySelectorAll('.lm-timeout-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const ms = parseInt(pill.getAttribute('data-timeout'), 10);
          setLockTimeout(ms, uid);
          currentTimeout = ms;
          renderModal();
          if (typeof showToast === 'function') showToast('Auto-lock delay updated.', 'success');
        });
      });

      // Lock Now test button
      modal.querySelector('#lockNowTestBtn')?.addEventListener('click', () => {
        modal.remove();
        showAppLockScreen();
      });

      // Panic Local Data Wipe
      modal.querySelector('#panicWipeBtn')?.addEventListener('click', async () => {
        const confirmed = confirm('⚠️ DANGER: Are you sure you want to completely wipe all local data and sign out from this device?\n\nThis cannot be undone.');
        if (!confirmed) return;
        const doubleConfirmed = prompt('Type WIPE to confirm immediate data purge:');
        if (doubleConfirmed !== 'WIPE') {
          if (typeof showToast === 'function') showToast('Data wipe cancelled.', 'info');
          return;
        }

        modal.remove();
        if (typeof showToast === 'function') showToast('Purging local data...', 'warning');

        try {
          if (window.indexedDB && window.indexedDB.databases) {
            const dbs = await window.indexedDB.databases();
            dbs.forEach(db => { if (db.name) window.indexedDB.deleteDatabase(db.name); });
          }
        } catch (e) {}

        try { localStorage.clear(); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}

        if (typeof _supabase !== 'undefined' && _supabase?.auth) {
          try { await _supabase.auth.signOut(); } catch (e) {}
        }

        window.location.replace(window.location.pathname + '?action=logout');
      });
    }

    function renderPinFlow(mode, flowData) {
      let step = (mode === 'changePin' ? 'verifyCurrent' : (mode === 'verifyToDisable' ? 'verifyToDisable' : 'enterNew'));
      let firstPin = '';
      let entered = '';

      function getStepInfo() {
        if (mode === 'verifyToDisable' || step === 'verifyToDisable') {
          return { title: 'Turn Off App Lock', sub: 'Enter your 4-digit PIN to disable App Lock' };
        }
        if (step === 'verifyCurrent') {
          return { title: 'Verify Current PIN', sub: 'Enter your current PIN to continue' };
        }
        if (step === 'confirmNew') {
          return { title: 'Confirm PIN', sub: 'Re-enter your 4-digit PIN to confirm' };
        }
        return { title: mode === 'changePin' ? 'Create New PIN' : 'Create 4-Digit PIN', sub: 'Enter a 4-digit PIN for App Lock' };
      }

      function updateUI(errorText) {
        const info = getStepInfo();
        const titleEl = modal.querySelector('#pinFlowTitle');
        const subEl = modal.querySelector('#pinFlowSub');
        const errEl = modal.querySelector('#pinFlowError');
        const dotsWrap = modal.querySelector('#pinFlowDots');

        if (titleEl) titleEl.textContent = info.title;
        if (subEl) subEl.textContent = info.sub;

        if (errEl) {
          if (errorText) {
            errEl.textContent = errorText;
            errEl.style.display = 'block';
          } else {
            errEl.textContent = '';
            errEl.style.display = 'none';
          }
        }

        if (dotsWrap) {
          if (errorText) {
            dotsWrap.classList.add('shake');
            setTimeout(() => dotsWrap.classList.remove('shake'), 500);
          }
          const dots = dotsWrap.querySelectorAll('.lm-lock-dot');
          dots.forEach((dot, i) => {
            dot.classList.toggle('filled', i < entered.length);
          });
        }
      }

      function setupDOM() {
        const info = getStepInfo();
        modal.innerHTML = `
          <div class="modal" style="max-width:340px;width:90%;background:var(--bg2);border:1px solid var(--border);border-radius:20px;padding:24px;text-align:center;box-shadow:var(--shadow), 0 10px 40px rgba(0,0,0,0.5);">
            <div style="font-size:32px;margin-bottom:8px;">🔐</div>
            <div id="pinFlowTitle" style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px;">${info.title}</div>
            <div id="pinFlowSub" style="font-size:12px;color:var(--text-3);margin-bottom:16px;">${info.sub}</div>

            <div id="pinFlowError" style="display:none;font-size:12px;color:var(--rose);margin-bottom:12px;background:rgba(251,113,133,0.1);padding:6px 10px;border-radius:8px;"></div>

            <!-- 4 Dots -->
            <div id="pinFlowDots" class="lm-lock-dots" style="margin:16px auto 20px;">
              ${[0, 1, 2, 3].map(() => `<div class="lm-lock-dot"></div>`).join('')}
            </div>

            <!-- Mini Numpad -->
            <div class="lm-lock-numpad" style="max-width:240px;margin:0 auto 16px;">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map(k => `
                <button type="button" class="lm-numpad-btn" data-key="${k}" style="${k === '' ? 'opacity:0;pointer-events:none;' : ''}">
                  ${k}
                </button>
              `).join('')}
            </div>

            <div style="display:flex;gap:8px;justify-content:center;">
              <button type="button" id="pinFlowCancelBtn" class="btn btn-secondary btn-sm" style="padding:8px 18px;">Cancel</button>
            </div>
          </div>
        `;

        modal.querySelectorAll('.lm-numpad-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const k = btn.getAttribute('data-key');
            if (k === '⌫') {
              if (entered.length > 0) {
                entered = entered.slice(0, -1);
                updateUI();
              }
            } else if (k !== '' && k !== null && entered.length < 4) {
              entered += k;
              updateUI();
              if (entered.length === 4) {
                setTimeout(() => processPinStep(entered), 50);
              }
            }
          });
        });

        modal.querySelector('#pinFlowCancelBtn')?.addEventListener('click', () => {
          if (flowData?.onCancel) flowData.onCancel();
          else renderModal();
        });
      }

      function processPinStep(pinVal) {
        if (mode === 'verifyToDisable' || step === 'verifyToDisable') {
          if (verifyPin(pinVal, uid)) {
            if (flowData?.onComplete) {
              flowData.onComplete();
            } else {
              setAppLockEnabled(false, uid);
              renderModal();
              if (typeof showToast === 'function') showToast('App Lock disabled.', 'info');
            }
          } else {
            try { navigator.vibrate?.([50, 50, 50]); } catch (e) {}
            entered = '';
            updateUI('Incorrect PIN. Try again.');
          }
          return;
        }

        if (step === 'verifyCurrent') {
          if (verifyPin(pinVal, uid)) {
            step = 'enterNew';
            entered = '';
            updateUI();
          } else {
            try { navigator.vibrate?.([50, 50, 50]); } catch (e) {}
            entered = '';
            updateUI('Incorrect PIN. Try again.');
          }
        } else if (step === 'enterNew') {
          firstPin = pinVal;
          step = 'confirmNew';
          entered = '';
          updateUI();
        } else if (step === 'confirmNew') {
          if (pinVal === firstPin) {
            setPin(pinVal, uid);
            if (flowData?.onComplete) flowData.onComplete();
            else {
              renderModal();
              if (typeof showToast === 'function') showToast('✅ PIN updated successfully!', 'success');
            }
          } else {
            try { navigator.vibrate?.([50, 50, 50]); } catch (e) {}
            step = 'enterNew';
            firstPin = '';
            entered = '';
            updateUI('PINs did not match. Please try again.');
          }
        }
      }

      setupDOM();
    }

    if (initialView === 'verifyToDisable') {
      renderModal('verifyToDisable', {
        onComplete: () => {
          setAppLockEnabled(false, uid);
          modal.remove();
          if (typeof showToast === 'function') showToast('Vault Lock disabled.', 'info');
        },
        onCancel: () => {
          modal.remove();
        }
      });
    } else if (initialView === 'setPin') {
      renderModal('setPin', {
        onComplete: () => {
          setAppLockEnabled(true, uid);
          modal.remove();
          if (typeof showToast === 'function') showToast('🛡️ Vault Lock configured and enabled!', 'success');
        },
        onCancel: () => {
          modal.remove();
        }
      });
    } else if (initialView === 'changePin') {
      renderModal('changePin', {
        onComplete: () => {
          modal.remove();
          if (typeof showToast === 'function') showToast('✅ PIN updated successfully!', 'success');
        },
        onCancel: () => {
          modal.remove();
        }
      });
    } else {
      renderModal();
    }
    document.body.appendChild(modal);
  }

  /* ══════════════════════════════════════════════════════
     SESSION INACTIVITY TIMEOUT (30 min)
  ══════════════════════════════════════════════════════ */
  const INACTIVITY_MS_DEFAULT = 30 * 60 * 1000;
  let _inactivityTimer = null;

  function getInactivityMs() {
    if (window._LM_InactivityOverride === null) return null; // never timeout
    if (window._LM_InactivityOverride > 0) return window._LM_InactivityOverride;
    const mins = window.state?.settings?.sessionTimeoutMins;
    if (mins === 0 || mins === null) return null;
    return (mins > 0 ? mins * 60 * 1000 : INACTIVITY_MS_DEFAULT);
  }

  function resetInactivityTimer() {
    if (!isLoggedIn()) return;
    clearTimeout(_inactivityTimer);
    const ms = getInactivityMs();
    if (!ms) return; // timeout disabled
    _inactivityTimer = setTimeout(() => {
      if (isLoggedIn()) {
        alert('You have been logged out due to inactivity.');
        logout();
      }
    }, ms);
  }

  function startInactivityWatcher() {
    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(evt =>
      document.addEventListener(evt, resetInactivityTimer, { passive: true })
    );
    resetInactivityTimer();
  }

  function stopInactivityWatcher() {
    clearTimeout(_inactivityTimer);
    _inactivityTimer = null;
  }

  /* ══════════════════════════════════════════════════════
     BOOTSTRAP
  /* ══════════════════════════════════════════════════════
     BOOTSTRAP (Optimistic Instant Auth & Background Validation)
  ══════════════════════════════════════════════════════ */
  async function init() {
    /* ── Check Commit Deployment ID (Preserve user session) ── */
    const currentDeploy = window.LM_DEPLOY_ID || null;
    if (currentDeploy) {
      localStorage.setItem('lm_active_deploy_commit', currentDeploy);
    }

    const cachedSession = getSession();

    // ── Optimistic Path: Local session exists → Unhide & Hydrate Instantly (< 5ms) ──
    if (cachedSession && cachedSession.userId) {
      hideLoginScreen();
      updateUIForUser(cachedSession);
      startInactivityWatcher();
      _syncNativeScreenSecurity();

      if (isAppLockEnabled(cachedSession.userId)) {
        showAppLockScreen(async () => {
          if (typeof window.LM_StartApp === 'function') {
            await window.LM_StartApp();
          }
        });
      } else {
        if (typeof window.LM_StartApp === 'function') {
          await window.LM_StartApp();
        }
      }

      // Background Validation: Verify Supabase session & user profile non-blockingly
      if (typeof _supabase !== 'undefined' && _supabase?.auth) {
        setTimeout(async () => {
          try {
            const { data } = await _supabase.auth.getSession();
            const sbSession = data && data.session ? data.session : null;

            if (sbSession) {
              const { data: profile } = await _supabase
                .from('user_profiles')
                .select('role, active, display_name, allowed_modules')
                .eq('id', sbSession.user.id)
                .single();

              if (!profile || !profile.active) {
                try { await _supabase.auth.signOut(); } catch (e) {}
                clearSession();
                var _msgCode   = profile ? 'pending' : 'noprofile';
                var _loginBase = window.location.href.split('/').slice(0, -1).join('/');
                window.location.replace(_loginBase + '/login.html?action=logout&msg=' + _msgCode);
                return;
              }

              // Update session metadata seamlessly in background
              const refreshedUser = {
                id             : sbSession.user.id,
                username       : sbSession.user.email,
                displayName    : profile.display_name || sbSession.user.email.split('@')[0],
                role           : profile.role || 'user',
                email          : sbSession.user.email,
                active         : profile.active,
                allowedModules : profile.allowed_modules || []
              };
              const newSess = setSession(refreshedUser);
              updateUIForUser(newSess);
            }
          } catch (err) {
            console.warn('[Auth] Background session revalidation skipped (offline / transient error):', err.message);
          }
        }, 600);
      }
    } else {
      // ── Cold Path: No local session → Check Supabase before showing login ──
      let sbSession = null;
      if (typeof _supabase !== 'undefined' && _supabase?.auth) {
        try {
          const { data } = await _supabase.auth.getSession();
          sbSession = data && data.session ? data.session : null;
        } catch (e) {
          console.warn('[Auth] Supabase session check failed:', e.message);
        }
      }

      if (sbSession) {
        const sbUser = sbSession.user;
        let profile = null;
        try {
          const { data } = await _supabase
            .from('user_profiles')
            .select('role, active, display_name, allowed_modules')
            .eq('id', sbUser.id)
            .single();
          profile = data;
        } catch {}

        if (!profile || !profile.active) {
          if (typeof _supabase !== 'undefined' && _supabase?.auth) {
            try { await _supabase.auth.signOut(); } catch (e) {}
          }
          clearSession();
          var _msgCode   = profile ? 'pending' : 'noprofile';
          var _loginBase = window.location.href.split('/').slice(0, -1).join('/');
          window.location.replace(_loginBase + '/login.html?action=logout&msg=' + _msgCode);
          _bindLoginForm();
        } else {
          const user = {
            id             : sbUser.id,
            username       : sbUser.email,
            displayName    : profile.display_name || sbUser.email.split('@')[0],
            role           : profile.role || 'user',
            email          : sbUser.email,
            active         : profile.active,
            allowedModules : profile.allowed_modules || []
          };
          const session = setSession(user);
          hideLoginScreen();
          updateUIForUser(session);
          startInactivityWatcher();
          _syncNativeScreenSecurity();

          if (isAppLockEnabled(user.id)) {
            showAppLockScreen(async () => {
              if (typeof window.LM_StartApp === 'function') {
                await window.LM_StartApp();
              }
            });
          } else {
            if (typeof window.LM_StartApp === 'function') {
              await window.LM_StartApp();
            }
          }
        }
      } else {
        clearSession();
        showLoginScreen();
        _bindLoginForm();
      }
    }

    /* ── Cross-tab sign-out sync ─────────────────────────── */
    if (typeof _supabase !== 'undefined' && _supabase?.auth) {
      _supabase.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT' && isLoggedIn()) logout();
      });
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
    bindLoginForm: _bindLoginForm,
    resetInactivityTimer,
    startInactivityWatcher,
    stopInactivityWatcher,
    // App Lock & PIN / Biometrics
    isPinSet,
    setPin,
    removePin,
    verifyPin,
    isAppLockEnabled,
    setAppLockEnabled,
    isBiometricEnabled,
    setBiometricEnabled,
    getLockTimeout,
    setLockTimeout,
    showAppLockScreen,
    showPinScreen: showAppLockScreen,
    openAppLockSettingsModal,
    openPinSetupModal: openAppLockSettingsModal
  };

  // Global shortcuts
  window.openAppLockSettingsModal = openAppLockSettingsModal;
  window.openPinSetupModal = openAppLockSettingsModal;

})();
