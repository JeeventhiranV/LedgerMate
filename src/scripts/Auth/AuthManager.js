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
  async function login(email, password) {
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
      await _supabase.auth.signOut();
      throw new Error('Account profile not found. Contact your administrator.');
    }

    if (!profile.active) {
      await _supabase.auth.signOut();
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
  }

  async function logout() {
    stopInactivityWatcher();

    /* ── Save to cloud BEFORE wiping state ──────────────── */
    if (window.LM_CloudSync) {
      try { await window.LM_CloudSync.saveOnLogout(); } catch (e) {}
    }

    /* ── Supabase sign out (fire and forget) ─────────────── */
    try { _supabase.auth.signOut(); } catch (e) {}

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
    const ALL_MODULES = ['transactions','analytics','gold','wealth','essentials','loans','investments','budgets','trips','notes','credentials'];

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
     PIN / BIOMETRIC LOCK
  ══════════════════════════════════════════════════════ */
  function getPinKey(userId) { return `lm_u_${userId}_pin_hash`; }

  function hashPin(pin) {
    // Simple deterministic hash for 4-digit PIN (no salt needed — short secret)
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

  function showPinScreen(onSuccess) {
    let entered = '';
    const el = document.createElement('div');
    el.id = 'pinLockScreen';
    el.style.cssText = `
      position:fixed;inset:0;background:var(--bg,#07091a);z-index:99999;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    `;
    const render = (err) => {
      el.innerHTML = `
        <div style="text-align:center;max-width:300px;width:100%;padding:24px;">
          <div style="font-size:32px;margin-bottom:8px;">🔐</div>
          <div style="font-size:20px;font-weight:700;color:var(--text,#f0f2ff);margin-bottom:4px;">Enter PIN</div>
          <div style="font-size:13px;color:var(--text-3,#5c6484);margin-bottom:28px);">LedgerMate is locked</div>
          ${err ? `<div style="font-size:12px;color:#fb7185;margin-bottom:8px;">${err}</div>` : ''}
          <!-- Dots -->
          <div style="display:flex;gap:14px;justify-content:center;margin:20px 0 28px;">
            ${[0,1,2,3].map(i=>`<div style="width:14px;height:14px;border-radius:50%;border:2px solid ${i<entered.length?'var(--teal,#00d4b4)':'rgba(255,255,255,0.2)'};background:${i<entered.length?'var(--teal,#00d4b4)':'transparent'};transition:all 0.15s;"></div>`).join('')}
          </div>
          <!-- Numpad -->
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:240px;margin:0 auto;">
            ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k=>`
              <button onclick="window._pinPress('${k}')" style="
                height:56px;border-radius:14px;border:1px solid rgba(255,255,255,0.1);
                background:${k===''?'transparent':'rgba(255,255,255,0.06)'};
                color:var(--text,#f0f2ff);font-size:${k==='⌫'?'18px':'20px'};font-weight:600;
                cursor:${k===''?'default':'pointer'};pointer-events:${k===''?'none':'auto'};
                transition:all 0.12s;
              " ${k===''?'disabled':''} onmouseenter="if(this.style.background!='transparent')this.style.background='rgba(0,212,180,0.12)'" onmouseleave="if(this.style.background!='transparent')this.style.background='rgba(255,255,255,0.06)'">${k}</button>
            `).join('')}
          </div>
          <div style="margin-top:24px;">
            <button onclick="window._pinUsePw()" style="background:none;border:none;color:var(--text-3,#5c6484);font-size:12px;cursor:pointer;text-decoration:underline;">Use password instead</button>
          </div>
        </div>`;
    };

    render();
    document.body.appendChild(el);

    window._pinPress = (k) => {
      if (k === '⌫') { entered = entered.slice(0,-1); render(); return; }
      if (k === '' || entered.length >= 4) return;
      entered += k;
      render();
      if (entered.length === 4) {
        if (verifyPin(entered, getCurrentUserId())) {
          el.remove();
          delete window._pinPress;
          delete window._pinUsePw;
          onSuccess();
        } else {
          entered = '';
          render('Wrong PIN. Try again.');
        }
      }
    };

    window._pinUsePw = () => {
      el.remove();
      delete window._pinPress;
      delete window._pinUsePw;
      logout();
    };

    // Keyboard support
    el._keyHandler = (e) => {
      if (e.key >= '0' && e.key <= '9') window._pinPress(e.key);
      if (e.key === 'Backspace') window._pinPress('⌫');
    };
    document.addEventListener('keydown', el._keyHandler);
  }

  // After successful app boot, check if PIN should gate re-entry
  function _maybeLockWithPin(onSuccess) {
    const userId = getCurrentUserId();
    if (userId && isPinSet(userId)) {
      showPinScreen(onSuccess);
    } else {
      onSuccess();
    }
  }

  /* ── Public PIN helpers ── */
  function openPinSetupModal() {
    const userId = getCurrentUserId();
    const hasPIN = isPinSet(userId);
    let step = 'enter', firstPin = '';

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';

    const render = (msg, err) => {
      modal.innerHTML = `
        <div style="background:var(--bg2,#0d1024);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:24px;max-width:320px;width:90%;text-align:center;">
          <div style="font-size:24px;margin-bottom:8px;">🔐</div>
          <div style="font-size:16px;font-weight:700;color:var(--text,#f0f2ff);margin-bottom:4px;">${msg}</div>
          ${err ? `<div style="font-size:12px;color:#fb7185;margin:8px 0;">${err}</div>` : ''}
          <div style="display:flex;gap:10px;justify-content:center;margin:16px 0;">
            ${[0,1,2,3].map(i=>`<div style="width:12px;height:12px;border-radius:50%;background:rgba(255,255,255,0.15);"></div>`).join('')}
          </div>
          <input id="pinInput" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]*"
            style="width:120px;height:48px;text-align:center;font-size:24px;letter-spacing:12px;background:var(--bg3,#1a1f35);border:1.5px solid rgba(255,255,255,0.15);border-radius:12px;color:var(--text,#f0f2ff);outline:none;"
            placeholder="••••">
          <div style="display:flex;gap:8px;margin-top:16px;justify-content:center;">
            <button id="pinConfirmBtn" style="padding:10px 24px;border-radius:10px;border:none;background:var(--teal,#00d4b4);color:#07091a;font-weight:700;cursor:pointer;font-size:14px;">Confirm</button>
            ${hasPIN && step==='enter' ? `<button id="pinRemoveBtn" style="padding:10px 20px;border-radius:10px;border:1px solid rgba(251,113,133,0.3);background:rgba(251,113,133,0.1);color:#fb7185;font-weight:700;cursor:pointer;font-size:14px;">Remove PIN</button>` : ''}
            <button id="pinCancelBtn" style="padding:10px 20px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:var(--text-2,#9ba3c4);font-weight:600;cursor:pointer;font-size:14px;">Cancel</button>
          </div>
        </div>`;

      document.getElementById('pinInput').focus();
      document.getElementById('pinConfirmBtn').onclick = () => {
        const v = document.getElementById('pinInput').value;
        if (v.length !== 4 || !/^\d{4}$/.test(v)) { render(msg, 'Enter a 4-digit PIN'); return; }
        if (step === 'enter') { firstPin = v; step = 'confirm'; render('Confirm your PIN'); }
        else if (step === 'confirm') {
          if (v !== firstPin) { step = 'enter'; firstPin = ''; render('Set a 4-digit PIN', 'PINs did not match'); return; }
          setPin(v, userId);
          modal.remove();
          if (typeof showToast === 'function') showToast('PIN set successfully!', 'success');
        }
      };
      const rb = document.getElementById('pinRemoveBtn');
      if (rb) rb.onclick = () => { removePin(userId); modal.remove(); if (typeof showToast === 'function') showToast('PIN removed', 'info'); };
      document.getElementById('pinCancelBtn').onclick = () => modal.remove();
    };

    render(hasPIN ? 'Change PIN — Enter new PIN' : 'Set a 4-digit PIN');
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
  ══════════════════════════════════════════════════════ */
  async function init() {
    /* ── Check Supabase session ──────────────────────────── */
    let sbSession = null;
    try {
      const { data } = await _supabase.auth.getSession();
      sbSession = data && data.session ? data.session : null;
    } catch (e) {
      console.warn('[Auth] Supabase session check failed:', e.message);
    }

    if (sbSession) {
      const sbUser = sbSession.user;

      /* Fetch actual role + active status */
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
        /* Profile missing or inactive — sign out and show login */
        await _supabase.auth.signOut();
        clearSession();
        showLoginScreen();
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
        if (typeof window.LM_StartApp === 'function') {
          await window.LM_StartApp();
        }
      }
    } else {
      clearSession();
      showLoginScreen();
      _bindLoginForm();
    }

    /* ── Cross-tab sign-out sync ─────────────────────────── */
    _supabase.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT' && isLoggedIn()) logout();
    });
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
    // PIN lock
    isPinSet,
    setPin,
    removePin,
    verifyPin,
    showPinScreen,
    openPinSetupModal
  };

  // Global shortcut for PIN setup from preferences
  window.openPinSetupModal = openPinSetupModal;

})();
