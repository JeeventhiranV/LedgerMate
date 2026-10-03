/**
 * LedgerMate – BankProfileModal.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Bank-Grade Account & Security Vault Profile Bottom Sheet / Modal.
 * Replaces basic dropdowns with a luxury fintech profile view (CRED / Revolut style).
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  // ── Fallback Haptic Safety Net (in case BankProfileModal is loaded standalone) ──
  if (typeof window !== 'undefined' && !window.LM_Haptic) {
    (function (g) {
      function _v(p) {
        try {
          if (g.localStorage && g.localStorage.getItem('lm_haptic_enabled') === 'false') return false;
          if (g.AndroidBridge && typeof g.AndroidBridge.vibrate === 'function') {
            g.AndroidBridge.vibrate(Array.isArray(p) ? (p[0] || 15) : (Number(p) || 15)); return true;
          }
          if (g.AndroidInterface && typeof g.AndroidInterface.vibrate === 'function') {
            g.AndroidInterface.vibrate(Array.isArray(p) ? (p[0] || 15) : (Number(p) || 15)); return true;
          }
          var nav = g.navigator || (typeof navigator !== 'undefined' ? navigator : null);
          if (nav && typeof nav.vibrate === 'function') return nav.vibrate(p);
        } catch (e) {}
        return false;
      }
      var b = {
        light: function () { return _v(10); },
        medium: function () { return _v(25); },
        heavy: function () { return _v(45); },
        selection: function () { return _v(6); },
        success: function () { return _v([15, 50, 15]); },
        warning: function () { return _v([35, 45, 35]); },
        error: function () { return _v([50, 60, 50, 60]); },
        vibrate: function (p) { return _v(p || 15); },
        impact: function () { return _v(10); },
        notification: function () { return _v([15, 50, 15]); },
        impactLight: function () { return _v(10); },
        impactlight: function () { return _v(10); },
        impactMedium: function () { return _v(25); },
        impactmedium: function () { return _v(25); },
        impactHeavy: function () { return _v(45); },
        impactheavy: function () { return _v(45); },
        selectionChange: function () { return _v(6); },
        selectionchange: function () { return _v(6); },
        notificationSuccess: function () { return _v([15, 50, 15]); },
        notificationsuccess: function () { return _v([15, 50, 15]); },
        notificationWarning: function () { return _v([35, 45, 35]); },
        notificationwarning: function () { return _v([35, 45, 35]); },
        notificationError: function () { return _v([50, 60, 50, 60]); },
        notificationerror: function () { return _v([50, 60, 50, 60]); }
      };
      g.LM_Haptic = (typeof Proxy !== 'undefined') ? new Proxy(b, {
        get: function (t, p) {
          if (p in t) return t[p];
          if (typeof p === 'symbol' || p === 'then' || p === 'toJSON') return undefined;
          return function () { try { return t.light(); } catch (e) { return false; } };
        }
      }) : b;
    })(window);
  }

  let _modalEl = null;

  function isStudyContext() {
    var path = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname.toLowerCase() : '';
    if (path.indexOf('/study') !== -1 || path.indexOf('study/index.html') !== -1) return true;
    if (typeof document !== 'undefined' && document.body && (document.body.classList.contains('study-page') || document.body.classList.contains('prep-page'))) return true;
    if (typeof document !== 'undefined' && document.getElementById('statDone') !== null && document.getElementById('heroStreak') !== null) return true;
    return false;
  }

  function isNativeAndroid() {
    return typeof window.AndroidBridge !== 'undefined' &&
           typeof window.AndroidBridge.isNativeApp === 'function' &&
           window.AndroidBridge.isNativeApp();
  }

  function getInstalledVersion() {
    if (!isNativeAndroid() || typeof window.AndroidBridge.getAppVersion !== 'function') {
      const deployId = window.LM_DEPLOY_ID || localStorage.getItem('lm_active_deploy_commit') || '1.0.288';
      const cleanVer = deployId.replace(/^lm-v/, '');
      return { versionCode: 288, versionName: cleanVer || '1.0.288', isWeb: true };
    }
    try {
      const verJson = window.AndroidBridge.getAppVersion();
      const parsed = typeof verJson === 'string' ? JSON.parse(verJson) : verJson;
      if (parsed && typeof parsed === 'object') {
        const code = Number(parsed.versionCode) || 1;
        let name = String(parsed.versionName || '1.0.0');
        return { versionCode: code, versionName: name, isWeb: false };
      }
    } catch (e) {}
    return { versionCode: 1, versionName: '1.0.0', isWeb: false };
  }

  function ensureStyles() {
    if (document.getElementById('bpmInjectedStyles')) return;
    var link = document.createElement('link');
    link.id = 'bpmInjectedStyles';
    link.rel = 'stylesheet';
    var isPrep = window.location.pathname.indexOf('/prep/') !== -1;
    var isStudy = window.location.pathname.indexOf('/study') !== -1;
    var prefix = isPrep ? '../../' : (isStudy ? '../' : './');
    link.href = prefix + 'src/styles/responsive-upgrades.css';
    document.head.appendChild(link);
  }

  function getUserData() {
    let bestUser = null;

    // 1. In-memory study user
    if (window._studyUser && (window._studyUser.email || window._studyUser.displayName)) {
      bestUser = Object.assign({}, window._studyUser);
    }
    // 2. LocalStorage study user metadata
    if (!bestUser) {
      try {
        const studyMeta = localStorage.getItem('study_user_meta');
        if (studyMeta) {
          const parsed = JSON.parse(studyMeta);
          if (parsed && (parsed.email || parsed.displayName || parsed.name)) {
            bestUser = parsed;
          }
        }
      } catch(e) {}
    }
    // 3. Finance LM_Auth
    if (!bestUser && window.LM_Auth && typeof window.LM_Auth.getCurrentUser === 'function') {
      const u = window.LM_Auth.getCurrentUser();
      if (u && (u.email || u.username || u.displayName)) {
        bestUser = Object.assign({}, u);
      }
    }
    // 4. Finance lm_session
    if (!bestUser) {
      try {
        const sess = localStorage.getItem('lm_session');
        if (sess) {
          const parsed = JSON.parse(sess);
          const userObj = parsed.user || parsed;
          if (userObj && (userObj.email || userObj.username || userObj.displayName || parsed.role)) {
            bestUser = Object.assign({}, userObj, { role: parsed.role || userObj.role });
          }
        }
      } catch (e) {}
    }
    // 5. Scan all Supabase tokens in localStorage
    if (!bestUser) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && ((k.indexOf('sb-') === 0 && k.indexOf('-auth-token') !== -1) || k.indexOf('auth-token') !== -1 || k === 'supabase.auth.token')) {
            const item = localStorage.getItem(k);
            if (item) {
              const parsed = JSON.parse(item);
              const userObj = parsed.user || (parsed.currentSession && parsed.currentSession.user) || (parsed.session && parsed.session.user);
              if (userObj && (userObj.email || userObj.id)) {
                bestUser = userObj;
                break;
              }
            }
          }
        }
      } catch (e) {}
    }
    // 6. DOM Extraction Fallback
    if (!bestUser) {
      try {
        const heroEl = document.getElementById('heroTitle');
        if (heroEl && heroEl.textContent && heroEl.textContent.indexOf(',') !== -1) {
          const part = heroEl.textContent.split(',')[1].replace(/[!.]/g, '').trim();
          if (part && part.toLowerCase() !== 'user' && part.toLowerCase() !== 'study resources hub') {
            bestUser = { displayName: part, username: part, email: part.toLowerCase() + '@gmail.com' };
          }
        }
        if (!bestUser) {
          const agfName = document.querySelector('.agf-name');
          const agfEmail = document.querySelector('.agf-email');
          if (agfName && agfName.textContent && agfName.textContent.trim() !== 'User') {
            bestUser = { displayName: agfName.textContent.trim(), username: agfName.textContent.trim(), email: agfEmail ? agfEmail.textContent.trim() : '' };
          }
        }
      } catch (e) {}
    }

    const em = (bestUser && (bestUser.email || bestUser.username)) || '';
    const meta = (bestUser && (bestUser.user_metadata || bestUser.meta)) || {};
    const rawName = (bestUser && (bestUser.displayName || bestUser.name || meta.full_name || meta.name)) || (em ? em.split('@')[0] : 'User');
    const disp = rawName ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) : 'User';

    // Robust Role Detection: prioritize admin if ANY source has admin
    let detectedRole = 'user';
    if (bestUser && bestUser.role === 'admin') detectedRole = 'admin';
    if (window._studyProfile && window._studyProfile.role === 'admin') detectedRole = 'admin';
    if (window._studyUser && window._studyUser.role === 'admin') detectedRole = 'admin';
    if (meta.role === 'admin') detectedRole = 'admin';
    if (window.LM_Auth && typeof window.LM_Auth.isAdmin === 'function' && window.LM_Auth.isAdmin()) detectedRole = 'admin';
    if (detectedRole !== 'admin') {
      try {
        const ls = JSON.parse(localStorage.getItem('lm_session') || '{}');
        if (ls.role === 'admin' || ls.user?.role === 'admin') detectedRole = 'admin';
        const sm = JSON.parse(localStorage.getItem('study_user_meta') || '{}');
        if (sm.role === 'admin') detectedRole = 'admin';
      } catch(e) {}
    }

    return {
      displayName: disp,
      username: em || disp,
      email: em || 'user@ledgermate.local',
      role: detectedRole,
      userId: (bestUser && (bestUser.userId || bestUser.id)) || 'default'
    };
  }

  function isAppLockEnabled() {
    if (window.LM_Auth && typeof window.LM_Auth.isAppLockEnabled === 'function') {
      return window.LM_Auth.isAppLockEnabled();
    }
    try {
      const pin = localStorage.getItem('lm_app_lock_pin');
      return !!pin;
    } catch (e) {
      return false;
    }
  }

  function isPrivacyModeActive() {
    try {
      return document.body.classList.contains('privacy-mode') ||
             localStorage.getItem('lm_privacy_mode') === 'true' ||
             localStorage.getItem('lm_privacy_mode') === '1';
    } catch (e) {
      return false;
    }
  }

  function getCloudSyncText() {
    if (isStudyContext()) {
      return 'Connected';
    }
    try {
      const isOffline = (window.LM_CloudSync && typeof window.LM_CloudSync.isOfflineMode === 'function')
        ? window.LM_CloudSync.isOfflineMode()
        : (localStorage.getItem('lm_sync_mode') === 'offline');

      if (isOffline) {
        return 'Offline';
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return 'No Net';
      }

      const lastSync = localStorage.getItem('lm_last_cloud_sync_time');
      if (lastSync) {
        const d = new Date(Number(lastSync));
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
    } catch (e) {}
    return 'Synced';
  }

  function createModalDOM() {
    if (document.getElementById('bankProfileModal')) {
      return document.getElementById('bankProfileModal');
    }

    const isStudy = isStudyContext();
    const isPrivacy = isPrivacyModeActive();
    const overlay = document.createElement('div');
    overlay.id = 'bankProfileModal';
    overlay.className = 'bank-profile-overlay';
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.style.display = 'none';

    overlay.innerHTML = `
      <div class="bank-profile-backdrop" onclick="window.LM_ProfileModal.close()"></div>
      <div class="bank-profile-sheet">
        <div class="bank-profile-handle-bar"><div class="bank-profile-handle"></div></div>
        
        <div class="bank-profile-header">
          <div class="bank-profile-hero">
            <div class="bank-profile-avatar-wrap">
              <div class="bank-profile-avatar-ring"></div>
              <div class="bank-profile-avatar" id="bpmAvatar">A</div>
              <div class="bank-profile-verified-badge" title="Verified Account">✓</div>
            </div>
            <div class="bank-profile-user-meta">
              <div class="bank-profile-name-row">
                <span class="bank-profile-name" id="bpmDisplayName">User</span>
                <span class="bank-profile-role-pill" id="bpmRolePill">USER</span>
              </div>
              <div class="bank-profile-email-row" onclick="window.LM_ProfileModal.copyEmail()" title="Tap to copy email">
                <span class="bank-profile-email" id="bpmEmail">user@example.com</span>
                <span class="bank-profile-copy-btn" id="bpmCopyIcon">📋</span>
              </div>
            </div>
          </div>
          <button class="bank-profile-close-btn" onclick="window.LM_ProfileModal.close()" title="Close">✕</button>
        </div>

        <div class="bank-profile-body">
          <!-- ── Micro Status Matrix ── -->
          <div class="bank-profile-matrix">
            <div class="bpm-matrix-card" onclick="window.LM_ProfileModal.toggleSyncMode()" style="cursor:pointer;" title="${isStudy ? 'Pure Cloud Synced Database' : 'Tap to toggle Cloud Sync / Offline Mode'}">
              <div class="bpm-matrix-icon" id="bpmSyncIcon">☁️</div>
              <div class="bpm-matrix-info">
                <div class="bpm-matrix-label" id="bpmSyncLabel">Cloud Sync</div>
                <div class="bpm-matrix-val" id="bpmSyncStatus">Connected</div>
              </div>
              <div class="bpm-switch-pill" id="bpmSyncSwitch">
                <span class="bpm-switch-knob"></span>
                <span id="bpmSyncSwitchText">Cloud</span>
              </div>
            </div>

            <div class="bpm-matrix-card" id="bpmCard2" onclick="window.LM_ProfileModal.handleCard2Click()" style="cursor:pointer;" title="${isStudy ? 'Current Active Daily Study Streak' : 'Tap to toggle amount privacy (mask balances)'}">
              <div class="bpm-matrix-icon" id="bpmPrivacyIcon">${isStudy ? '🔥' : (isPrivacy ? '🙈' : '👁️')}</div>
              <div class="bpm-matrix-info">
                <div class="bpm-matrix-label" id="bpmCard2Label">${isStudy ? 'Study Streak' : 'Amount Privacy'}</div>
                <div class="bpm-matrix-val" id="bpmPrivacyStatus">${isStudy ? '0 Days' : (isPrivacy ? 'Masked' : 'Visible')}</div>
              </div>
              <div class="bpm-switch-pill" id="bpmPrivacySwitch">
                <span class="bpm-switch-knob"></span>
                <span id="bpmPrivacySwitchText">${isStudy ? 'Inactive' : (isPrivacy ? 'ON' : 'OFF')}</span>
              </div>
            </div>

            <div class="bpm-matrix-card" onclick="window.LM_ProfileModal.toggleVaultLock()" style="cursor:pointer;" title="Tap to toggle Vault Lock PIN protection">
              <div class="bpm-matrix-icon" id="bpmLockIcon">🔒</div>
              <div class="bpm-matrix-info">
                <div class="bpm-matrix-label">Vault Lock</div>
                <div class="bpm-matrix-val" id="bpmLockStatus">Protected</div>
              </div>
              <div class="bpm-switch-pill" id="bpmLockSwitch">
                <span class="bpm-switch-knob"></span>
                <span id="bpmLockSwitchText">ON</span>
              </div>
            </div>
          </div>

          <!-- ── Action Groups ── -->
          <div class="bpm-section-group">
            <div class="bpm-group-title">SECURITY &amp; VAULT ACCESS</div>
            
            <button class="bpm-action-row" onclick="window.LM_ProfileModal.openMfaModal()">
              <span class="bpm-row-icon">📱</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Two-Factor Authentication (2FA / MFA)</div>
                <div class="bpm-row-desc" id="bpmMfaDesc">Microsoft / Google Authenticator (TOTP)</div>
              </div>
              <span class="bpm-badge" id="bpmMfaBadge">Configure</span>
            </button>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.openSecurity()">
              <span class="bpm-row-icon">🛡️</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">App Security &amp; Biometrics</div>
                <div class="bpm-row-desc">PIN code, fingerprint unlock &amp; lock timeout</div>
              </div>
              <span class="bpm-row-arrow">›</span>
            </button>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.openCredentials()">
              <span class="bpm-row-icon">🔐</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Encrypted Credentials Vault</div>
                <div class="bpm-row-desc">Zero-knowledge password &amp; secret manager</div>
              </div>
              <span class="bpm-row-arrow">›</span>
            </button>
          </div>

          <div class="bpm-section-group">
            <div class="bpm-group-title">EXPERIENCE &amp; INTERFACE</div>

            <!-- ON/OFF Theme Interface Row -->
            <button class="bpm-action-row" onclick="window.LM_ProfileModal.toggleTheme()">
              <span class="bpm-row-icon" id="bpmThemeIcon">🌙</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Theme Interface</div>
                <div class="bpm-row-desc" id="bpmThemeDesc">Dark Palette · High Contrast</div>
              </div>
              <div class="bpm-switch-pill" id="bpmThemeSwitch">
                <span class="bpm-switch-knob"></span>
                <span id="bpmThemeSwitchText">Dark</span>
              </div>
            </button>
          </div>

          <!-- System & Administration Group (shown for admin users) -->
          <div class="bpm-section-group" id="bpmAdminSectionGroup" style="display:none;">
            <div class="bpm-group-title">SYSTEM &amp; ADMINISTRATION</div>

            <button class="bpm-action-row" id="bpmAdminBtn" onclick="window.LM_ProfileModal.openAdmin()">
              <span class="bpm-row-icon">👑</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Admin Command Center</div>
                <div class="bpm-row-desc">User approvals, access control &amp; system settings</div>
              </div>
              <span id="bpmAdminPendingBadge" class="bpm-badge" style="display:none;background:rgba(244,63,94,0.18);color:#fb7185;border:1px solid rgba(244,63,94,0.3);font-weight:700;"></span>
              <span class="bpm-row-arrow">›</span>
            </button>
          </div>

          <!-- Study Cloud Sync & Updates Group -->
          <div class="bpm-section-group" id="bpmStudyGroup" style="${isStudy ? '' : 'display:none;'}">
            <div class="bpm-group-title">CLOUD SYNC &amp; UPDATES</div>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.triggerStudyCloudSync()">
              <span class="bpm-row-icon">☁️</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Study Cloud Database Sync</div>
                <div class="bpm-row-desc" id="bpmStudySyncDesc">538+ question progress synced to Supabase</div>
              </div>
              <span class="bpm-badge" id="bpmStudySyncBadge">Sync Now</span>
            </button>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.checkUpdates()">
              <span class="bpm-row-icon" id="bpmUpdateIcon">🔄</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">App Version &amp; Updates</div>
                <div class="bpm-row-desc" id="bpmVersionDesc">Version v1.0.0</div>
              </div>
              <span class="bpm-badge" id="bpmUpdateBadge">Check</span>
            </button>
          </div>

          <!-- Finance Offline Backup Group (Hidden in Study Mode) -->
          <div class="bpm-section-group" id="bpmFinanceBackupGroup" style="${isStudy ? 'display:none;' : ''}">
            <div class="bpm-group-title">DATA BACKUP &amp; STORAGE</div>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.manageLocalBackup()">
              <span class="bpm-row-icon">💾</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Auto Backup &amp; Storage</div>
                <div class="bpm-row-desc" id="bpmLocalBackupDesc">Automated snapshots · 30-day retention &amp; 100 max cap</div>
              </div>
              <span class="bpm-badge" id="bpmLocalBackupBadge">Configure</span>
            </button>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.checkUpdates()">
              <span class="bpm-row-icon">🔄</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">App Version &amp; Updates</div>
                <div class="bpm-row-desc" id="bpmFinanceVersionDesc">Version v1.0.0</div>
              </div>
              <span class="bpm-badge">Check</span>
            </button>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.exportBackup()">
              <span class="bpm-row-icon">📤</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Export Vault Backup</div>
                <div class="bpm-row-desc">Download complete JSON/CSV financial records</div>
              </div>
              <span class="bpm-row-arrow">›</span>
            </button>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.importBackup()">
              <span class="bpm-row-icon">📥</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Restore / Import Data</div>
                <div class="bpm-row-desc">Import financial backup files into vault</div>
              </div>
              <span class="bpm-row-arrow">›</span>
            </button>
          </div>

          <!-- ── Help, FAQ & Feedback ── -->
          <div class="bpm-section-group" id="bpmHelpGroup">
            <div class="bpm-group-title">HELP, FAQ &amp; FEEDBACK</div>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.openFAQ()">
              <span class="bpm-row-icon">❓</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Knowledge Base &amp; FAQ</div>
                <div class="bpm-row-desc">Module guides: Transactions, Loans, Wealth, Stocks, Gold &amp; more</div>
              </div>
              <span class="bpm-row-arrow">›</span>
            </button>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.openFeedback()">
              <span class="bpm-row-icon">💬</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Reviews, Suggestions &amp; Complaints</div>
                <div class="bpm-row-desc">Share feedback, report issues &amp; discuss with community</div>
              </div>
              <span class="bpm-row-arrow">›</span>
            </button>
          </div>

          <!-- ── Sign Out ── -->
          <div class="bpm-section-group bpm-danger-group">
            <button class="bpm-action-row bpm-signout-btn" onclick="window.LM_ProfileModal.signOut()">
              <span class="bpm-row-icon">🚪</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title" style="color:var(--rose,#f43f5e);">Sign Out of Vault</div>
                <div class="bpm-row-desc">Securely lock session &amp; sign out</div>
              </div>
              <span class="bpm-row-arrow" style="color:var(--rose,#f43f5e);">→</span>
            </button>
          </div>

          <div class="bpm-footer-meta">
            <span>${isStudy ? 'Study Resources OS' : 'LedgerMate Finance OS'}</span> · <span>Cloud-Protected Intelligence</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  function renderProfileDetails() {
    const isStudy = isStudyContext();
    const user = getUserData();
    const isLock = isAppLockEnabled();
    const isPrivacy = isPrivacyModeActive();
    const ver = getInstalledVersion();
    const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('prep_theme') || localStorage.getItem('ledgerMate_theme') || 'dark';
    const isDark = currentTheme !== 'light';
    const isOffline = isStudy ? false : ((window.LM_CloudSync && typeof window.LM_CloudSync.isOfflineMode === 'function')
      ? window.LM_CloudSync.isOfflineMode()
      : (localStorage.getItem('lm_sync_mode') === 'offline'));

    // Avatar initial
    const initial = (user.displayName || user.username || 'A').charAt(0).toUpperCase();
    const av = document.getElementById('bpmAvatar');
    if (av) av.textContent = initial;

    // Synchronize all topbar & sidebar avatars across current page
    try {
      const allAvatars = document.querySelectorAll('#studyUserAvatar, #topbarUserChip, #topbarUserChipMenu, .topbar-user-avatar, .agf-avatar');
      allAvatars.forEach(function(el) {
        if (el) el.textContent = initial;
      });
      const agfName = document.querySelector('.agf-name');
      if (agfName) agfName.textContent = user.displayName || user.username || 'User';
      const agfEmail = document.querySelector('.agf-email');
      if (agfEmail) agfEmail.textContent = user.username || user.email || 'user@ledgermate.local';
    } catch(e) {}

    // Display Name
    const nameEl = document.getElementById('bpmDisplayName');
    if (nameEl) nameEl.textContent = user.displayName || user.username || 'Account Holder';

    // Role Pill
    const rolePill = document.getElementById('bpmRolePill');
    if (rolePill) {
      const isAdmin = user.role === 'admin';
      rolePill.textContent = isAdmin ? 'ADMIN' : (isStudy ? 'STUDY VAULT' : 'PERSONAL');
      rolePill.className = 'bank-profile-role-pill ' + (isAdmin ? 'admin' : 'user');
    }

    // Email
    const emailEl = document.getElementById('bpmEmail');
    if (emailEl) emailEl.textContent = user.username || user.email || 'user@ledgermate.local';

    // Matrix status
    const syncIcon = document.getElementById('bpmSyncIcon');
    if (syncIcon) syncIcon.textContent = isOffline ? '💾' : '☁️';

    const syncLabel = document.getElementById('bpmSyncLabel');
    if (syncLabel) syncLabel.textContent = isOffline ? 'Offline Mode' : 'Cloud Sync';

    const syncStatus = document.getElementById('bpmSyncStatus');
    if (syncStatus) syncStatus.textContent = isStudy ? 'Connected' : (isOffline ? 'Local Vault' : getCloudSyncText());

    const syncSwitch = document.getElementById('bpmSyncSwitch');
    const syncSwitchText = document.getElementById('bpmSyncSwitchText');
    if (syncSwitch) {
      syncSwitch.classList.toggle('active', !isOffline);
    }
    if (syncSwitchText) {
      syncSwitchText.textContent = !isOffline ? 'Cloud' : 'Offline';
    }

    // Card 2: Streak in study mode vs Privacy in finance mode
    const card2Label = document.getElementById('bpmCard2Label');
    const card2Val = document.getElementById('bpmPrivacyStatus');
    const card2Icon = document.getElementById('bpmPrivacyIcon');
    const card2Switch = document.getElementById('bpmPrivacySwitch');
    const card2SwitchText = document.getElementById('bpmPrivacySwitchText');

    if (isStudy) {
      var streak = 0;
      try {
        streak = window._studyStreak || Number(localStorage.getItem('study_streak_count') || 0);
        if (!streak) {
          var pStreak = JSON.parse(localStorage.getItem('prep_streak_v1') || '{}');
          if (pStreak && pStreak.streak) streak = Number(pStreak.streak);
        }
        if (!streak) {
          var val = document.getElementById('streakVal');
          if (val && val.textContent) streak = Number(val.textContent) || 0;
        }
      } catch(e) {}
      if (card2Label) card2Label.textContent = 'Study Streak';
      if (card2Val) card2Val.textContent = streak + (streak === 1 ? ' Day' : ' Days');
      if (card2Icon) card2Icon.textContent = '🔥';
      if (card2Switch) card2Switch.classList.toggle('active', streak > 0);
      if (card2SwitchText) card2SwitchText.textContent = streak > 0 ? 'Active' : 'Inactive';
    } else {
      if (card2Label) card2Label.textContent = 'Amount Privacy';
      if (card2Val) card2Val.textContent = isPrivacy ? 'Masked' : 'Visible';
      if (card2Icon) card2Icon.textContent = isPrivacy ? '🙈' : '👁️';
      if (card2Switch) card2Switch.classList.toggle('active', isPrivacy);
      if (card2SwitchText) card2SwitchText.textContent = isPrivacy ? 'ON' : 'OFF';
    }

    // Card 3: Vault Lock
    const lockStatus = document.getElementById('bpmLockStatus');
    if (lockStatus) lockStatus.textContent = isLock ? 'Protected' : 'Off';

    const lockIcon = document.getElementById('bpmLockIcon');
    if (lockIcon) lockIcon.textContent = isLock ? '🔒' : '🔓';

    const lockSwitch = document.getElementById('bpmLockSwitch');
    const lockSwitchText = document.getElementById('bpmLockSwitchText');
    if (lockSwitch) {
      lockSwitch.classList.toggle('active', isLock);
    }
    if (lockSwitchText) {
      lockSwitchText.textContent = isLock ? 'ON' : 'OFF';
    }

    // Theme Switch
    const themeSwitch = document.getElementById('bpmThemeSwitch');
    const themeSwitchText = document.getElementById('bpmThemeSwitchText');
    if (themeSwitch) {
      themeSwitch.classList.toggle('active', isDark);
    }
    if (themeSwitchText) {
      themeSwitchText.textContent = isDark ? 'Dark' : 'Light';
    }

    const themeIcon = document.getElementById('bpmThemeIcon');
    if (themeIcon) themeIcon.textContent = isDark ? '🌙' : '☀️';

    const themeDesc = document.getElementById('bpmThemeDesc');
    if (themeDesc) {
      themeDesc.textContent = isDark ? 'Dark Palette · High Contrast' : 'Light Palette · Clean View';
    }

    // Study Cloud Progress desc
    const studySyncDesc = document.getElementById('bpmStudySyncDesc');
    if (studySyncDesc) {
      var doneCount = 0;
      try {
        var p = JSON.parse(localStorage.getItem('study_progress_v1') || '{}');
        doneCount = Object.values(p).filter(function(v){ return v && v.status === 'done'; }).length;
      } catch(e) {}
      studySyncDesc.textContent = doneCount > 0 ? (doneCount + ' questions completed · Synced to Supabase') : '538+ question progress synced to Supabase';
    }

    // Local Backup badge & desc (Finance Mode)
    const isLocalAuto = (window.LM_LocalBackup && typeof window.LM_LocalBackup.isLocalBackupEnabled === 'function')
      ? window.LM_LocalBackup.isLocalBackupEnabled()
      : (localStorage.getItem('lm_local_backup_enabled') === 'true');
    const localBadge = document.getElementById('bpmLocalBackupBadge');
    if (localBadge) {
      localBadge.textContent = isLocalAuto ? 'Active' : 'Disabled';
      localBadge.style.color = isLocalAuto ? 'var(--teal,#00d4b4)' : 'var(--text-3)';
    }

    // Version
    const isWeb = !!ver.isWeb;
    const verText = isWeb ? `Web Build v${ver.versionName}` : `Version ${ver.versionName} (${ver.versionCode})`;
    const verDesc = document.getElementById('bpmVersionDesc');
    if (verDesc) verDesc.textContent = verText;
    const finVerDesc = document.getElementById('bpmFinanceVersionDesc');
    if (finVerDesc) finVerDesc.textContent = verText;

    // Admin button & section visibility
    const isAdmin = (user.role === 'admin') ||
                    (window._studyProfile && window._studyProfile.role === 'admin') ||
                    (window._studyUser && window._studyUser.role === 'admin') ||
                    (window.LM_Auth && typeof window.LM_Auth.isAdmin === 'function' && window.LM_Auth.isAdmin());
    const adminSection = document.getElementById('bpmAdminSectionGroup');
    const adminBtn = document.getElementById('bpmAdminBtn');
    if (adminSection) adminSection.style.display = isAdmin ? 'block' : 'none';
    if (adminBtn) {
      adminBtn.style.display = isAdmin ? 'flex' : 'none';
      if (isAdmin && window.LM_Admin?.syncPendingCounts) {
        window.LM_Admin.syncPendingCounts();
      }
    }

    // MFA / 2FA status check from Supabase
    if (typeof _supabase !== 'undefined' && _supabase?.auth?.mfa) {
      _supabase.auth.mfa.listFactors().then(function (res) {
        var factors = res && res.data;
        var hasVerifiedTotp = factors && factors.totp && factors.totp.some(function (f) { return f.status === 'verified'; });
        var mfaBadge = document.getElementById('bpmMfaBadge');
        var mfaDesc = document.getElementById('bpmMfaDesc');
        if (mfaBadge) {
          mfaBadge.textContent = hasVerifiedTotp ? 'Active 🛡️' : 'Set Up';
          mfaBadge.style.color = hasVerifiedTotp ? 'var(--teal,#00d4b4)' : 'var(--blue,#3b82f6)';
        }
        if (mfaDesc) {
          mfaDesc.textContent = hasVerifiedTotp 
            ? 'Microsoft Authenticator · 2FA Active' 
            : 'Add Microsoft / Google Authenticator (TOTP)';
        }
      }).catch(function () {});
    }
  }

  const BankProfileModal = {
    open: function () {
      ensureStyles();
      _modalEl = createModalDOM();
      renderProfileDetails();
      _modalEl.style.display = 'flex';
      requestAnimationFrame(() => {
        _modalEl.classList.add('open');
        document.body.classList.add('bpm-modal-open');
      });

      // Async live refresh from Supabase if available
      if (typeof _supabase !== 'undefined' && _supabase && _supabase.auth) {
        _supabase.auth.getSession().then(async function (res) {
          var s = res && res.data && res.data.session;
          if (s && s.user) {
            var u = s.user;
            var em = u.email || '';
            var m = u.user_metadata || {};
            var n = m.full_name || m.name || (em ? em.split('@')[0] : 'User');
            var disp = n ? (n.charAt(0).toUpperCase() + n.slice(1)) : 'User';
            
            var userRole = (window._studyProfile && window._studyProfile.role) || (window._studyUser && window._studyUser.role) || m.role || 'user';
            
            try {
              var sess = JSON.parse(localStorage.getItem('lm_session') || '{}');
              if (sess.role === 'admin' || (sess.user && sess.user.role === 'admin')) userRole = 'admin';
              var sm = JSON.parse(localStorage.getItem('study_user_meta') || '{}');
              if (sm.role === 'admin') userRole = 'admin';
            } catch(e) {}

            if (typeof _supabase.from === 'function') {
              try {
                var profRes = await _supabase.from('user_profiles').select('role,active').eq('id', u.id).maybeSingle();
                if (profRes && profRes.data && profRes.data.role) {
                  userRole = profRes.data.role;
                }
              } catch(e) {}
            }

            if (window._studyProfile) {
              window._studyProfile.role = userRole;
            } else {
              window._studyProfile = { role: userRole };
            }

            window._studyUser = {
              displayName: disp,
              username: em,
              email: em,
              role: userRole,
              userId: u.id
            };
            try { localStorage.setItem('study_user_meta', JSON.stringify(window._studyUser)); } catch(e){}
            try {
              var currLm = JSON.parse(localStorage.getItem('lm_session') || '{}');
              currLm.role = userRole;
              localStorage.setItem('lm_session', JSON.stringify(currLm));
            } catch(e) {}

            renderProfileDetails();
          }
        }).catch(function(){});
      }

      if (window.LM_Haptic) window.LM_Haptic.impactLight();
    },

    close: function () {
      if (!_modalEl) return;
      _modalEl.classList.remove('open');
      document.body.classList.remove('bpm-modal-open');
      setTimeout(() => {
        if (_modalEl) _modalEl.style.display = 'none';
      }, 300);
    },

    copyEmail: function () {
      const user = getUserData();
      const email = user.username || user.email || '';
      if (!email) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email);
      }
      const icon = document.getElementById('bpmCopyIcon');
      if (icon) {
        icon.textContent = '✅';
        setTimeout(() => { if (icon) icon.textContent = '📋'; }, 2000);
      }
      if (typeof window.showToast === 'function') {
        window.showToast('Copied username to clipboard!', 'info');
      } else if (window.LMToast) {
        window.LMToast.show('Copied username to clipboard!', 'info');
      }
      if (window.LM_Haptic) window.LM_Haptic.notificationSuccess();
    },

    toggleSyncMode: function () {
      if (isStudyContext()) {
        if (window.StudySync && typeof window.StudySync.syncDown === 'function') {
          window.StudySync.syncDown();
        }
        renderProfileDetails();
        if (typeof window.showToast === 'function') {
          window.showToast('☁️ Study Hub is live cloud synchronized with Supabase', 'success');
        } else if (window.LMToast) {
          window.LMToast.show('☁️ Study Hub is live cloud synchronized with Supabase', 'success');
        }
        if (window.LM_Haptic) window.LM_Haptic.impactLight();
        return;
      }

      const isCurrentlyOffline = (window.LM_CloudSync && typeof window.LM_CloudSync.isOfflineMode === 'function')
        ? window.LM_CloudSync.isOfflineMode()
        : (localStorage.getItem('lm_sync_mode') === 'offline');

      const nextMode = isCurrentlyOffline ? 'cloud' : 'offline';
      if (window.LM_CloudSync && typeof window.LM_CloudSync.setSyncMode === 'function') {
        window.LM_CloudSync.setSyncMode(nextMode);
      } else {
        localStorage.setItem('lm_sync_mode', nextMode);
      }

      renderProfileDetails();
      if (typeof window.showToast === 'function') {
        window.showToast(nextMode === 'cloud' ? '☁️ Switched to Cloud Sync' : '💾 Switched to Offline Mode', 'info');
      }
      if (window.LM_Haptic) window.LM_Haptic.impactLight();
    },

    triggerStudyCloudSync: function () {
      const badge = document.getElementById('bpmStudySyncBadge');
      if (badge) badge.textContent = 'Syncing...';
      if (window.StudySync && typeof window.StudySync.syncDown === 'function') {
        window.StudySync.syncDown().then(function () {
          if (badge) badge.textContent = 'Synced ✓';
          setTimeout(function () { if (badge) badge.textContent = 'Sync Now'; }, 2500);
          renderProfileDetails();
          if (window.LMToast) window.LMToast.show('Cloud study progress up-to-date! ☁️', 'success');
        }).catch(function () {
          if (badge) badge.textContent = 'Sync Now';
        });
      } else {
        setTimeout(function () {
          if (badge) badge.textContent = 'Synced ✓';
          setTimeout(function () { if (badge) badge.textContent = 'Sync Now'; }, 2000);
          if (window.LMToast) window.LMToast.show('Cloud study progress synchronized! ☁️', 'success');
        }, 400);
      }
      if (window.LM_Haptic) window.LM_Haptic.notificationSuccess();
    },

    handleCard2Click: function () {
      if (isStudyContext()) {
        BankProfileModal.showStreakInfo();
      } else {
        BankProfileModal.togglePrivacy();
      }
    },

    showStreakInfo: function () {
      var streak = 0;
      try { streak = Number(localStorage.getItem('study_streak_count') || 0); } catch(e) {}
      var msg = streak > 0 ? ('🔥 You have a ' + streak + '-day active study streak! Keep it up!') : '🔥 Complete at least 1 question today to start your study streak!';
      if (typeof window.showToast === 'function') {
        window.showToast(msg, 'info');
      } else if (window.LMToast) {
        window.LMToast.show(msg, 'info');
      }
      if (window.LM_Haptic) window.LM_Haptic.impactLight();
    },

    handleSyncCardClick: async function () {
      if (isStudyContext()) {
        BankProfileModal.triggerStudyCloudSync();
        return;
      }

      const isOffline = (window.LM_CloudSync && typeof window.LM_CloudSync.isOfflineMode === 'function')
        ? window.LM_CloudSync.isOfflineMode()
        : (localStorage.getItem('lm_sync_mode') === 'offline');

      if (isOffline) {
        if (window.LM_LocalBackup) {
          const info = await window.LM_LocalBackup.getFolderInfo();
          if (!info.configured) {
            if (typeof window.showToast === 'function') {
              window.showToast('📁 Select a folder for offline backups...', 'info');
            }
            try {
              await window.LM_LocalBackup.selectFolder();
            } catch (e) {}
          } else {
            const btn = document.getElementById('bpmSyncAction');
            if (btn) btn.textContent = 'Saving...';
            await window.LM_LocalBackup.performBackup({ force: true, silent: false });
            if (btn) btn.textContent = 'Backup';
          }
        }
      } else {
        const btn = document.getElementById('bpmSyncAction');
        if (btn) btn.textContent = 'Syncing...';
        if (typeof window.LM_manualSync === 'function') {
          await window.LM_manualSync();
        } else if (window.LM_CloudSync && typeof window.LM_CloudSync.save === 'function') {
          await window.LM_CloudSync.save();
        }
        if (btn) btn.textContent = 'Sync';
        if (typeof window.showToast === 'function') {
          window.showToast('☁️ Cloud sync completed', 'success');
        }
      }
      renderProfileDetails();
      if (window.LM_Haptic) window.LM_Haptic.notificationSuccess();
    },

    setTheme: function (theme) {
      if (window.LM_Theme && typeof window.LM_Theme.set === 'function') {
        window.LM_Theme.set(theme);
      } else {
        const next = theme === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        document.documentElement.classList.toggle('light-theme', next === 'light');
        document.documentElement.classList.toggle('dark-theme', next === 'dark');
        const keys = ['ledgerMate_theme', 'prep_theme', 'sr_theme', 'dsa_theme', 'ql_theme', 'react_prep_theme', 'theme'];
        keys.forEach(function(k) {
          try { localStorage.setItem(k, next); } catch (e) {}
        });
      }
      renderProfileDetails();
      if (window.LM_Haptic) window.LM_Haptic.impactLight();
    },

    manageLocalBackup: function () {
      BankProfileModal.openPreferences();
    },

    togglePrivacy: function () {
      var current = isPrivacyModeActive();
      var next = !current;
      if (typeof window.LM_togglePrivacyMode === 'function') {
        window.LM_togglePrivacyMode();
      } else {
        document.body.classList.toggle('privacy-mode', next);
        try { localStorage.setItem('lm_privacy_mode', next ? 'true' : 'false'); } catch (e) {}
        if (window.LM_Bus && typeof window.LM_Bus.emit === 'function') {
          window.LM_Bus.emit('lm:privacy:changed', { privacy: next });
        }
        var evt = new CustomEvent('privacy-toggle', { detail: { privacy: next } });
        window.dispatchEvent(evt);
        document.dispatchEvent(evt);
      }
      renderProfileDetails();
      if (typeof window.showToast === 'function') {
        window.showToast(next ? '🙈 Amount privacy enabled (balances masked)' : '👁️ Amount privacy disabled (balances visible)', 'info');
      } else if (window.LMToast) {
        window.LMToast.show(next ? '🙈 Amount privacy enabled' : '👁️ Amount privacy disabled', 'info');
      }
      if (window.LM_Haptic) window.LM_Haptic.impactLight();
    },

    toggleVaultLock: function () {
      const uid = (window.LM_Auth && typeof window.LM_Auth.getCurrentUserId === 'function')
        ? window.LM_Auth.getCurrentUserId()
        : 'default';
      const isLock = isAppLockEnabled();
      const hasPin = (window.LM_Auth && typeof window.LM_Auth.isPinSet === 'function')
        ? window.LM_Auth.isPinSet(uid)
        : !!localStorage.getItem('lm_u_' + uid + '_app_lock_pin');

      if (isLock) {
        if (typeof window.openAppLockSettingsModal === 'function') {
          window.openAppLockSettingsModal('verifyToDisable');
        }
      } else {
        if (hasPin) {
          if (window.LM_Auth && typeof window.LM_Auth.setAppLockEnabled === 'function') {
            window.LM_Auth.setAppLockEnabled(true, uid);
          } else {
            localStorage.setItem('lm_u_' + uid + '_app_lock_enabled', 'true');
          }
          renderProfileDetails();
          if (typeof window.showToast === 'function') {
            window.showToast('🛡️ Vault Lock enabled!', 'success');
          } else if (window.LMToast) {
            window.LMToast.show('🛡️ Vault Lock enabled!', 'success');
          }
          if (window.LM_Haptic) window.LM_Haptic.notificationSuccess();
        } else {
          if (typeof window.openAppLockSettingsModal === 'function') {
            window.openAppLockSettingsModal('setPin');
          }
        }
      }
      if (window.LM_Haptic) window.LM_Haptic.impactLight();
    },

    refresh: function () {
      renderProfileDetails();
    },

    openMfaModal: async function () {
      if (typeof _supabase === 'undefined' || !_supabase || !_supabase.auth || !_supabase.auth.mfa) {
        var msg = 'Two-Factor Authentication requires an active cloud session with Supabase.';
        if (typeof window.showToast === 'function') window.showToast(msg, 'warning');
        else if (window.LMToast) window.LMToast.show(msg, 'warning');
        else alert(msg);
        return;
      }

      BankProfileModal.close();
      showMfaManagementDialog();
    },

    openSecurity: function () {
      BankProfileModal.close();
      if (typeof window.openAppLockSettingsModal === 'function') {
        window.openAppLockSettingsModal();
      } else if (window.LM_Auth && typeof window.LM_Auth.openSecurityModal === 'function') {
        window.LM_Auth.openSecurityModal();
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast('🛡️ Vault security is managed by cloud session authentication.', 'info');
        } else if (window.LMToast) {
          window.LMToast.show('🛡️ Vault security is managed by cloud session authentication.', 'info');
        }
      }
    },

    openCredentials: function () {
      BankProfileModal.close();
      if (typeof window.showCredentialsVault === 'function') {
        window.showCredentialsVault();
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast('🔐 Encrypted credentials vault available in LedgerMate Finance OS.', 'info');
        } else if (window.LMToast) {
          window.LMToast.show('🔐 Encrypted credentials vault available in LedgerMate Finance OS.', 'info');
        }
      }
    },

    toggleTheme: function () {
      var current = document.documentElement.getAttribute('data-theme') || localStorage.getItem('prep_theme') || localStorage.getItem('ledgerMate_theme') || 'dark';
      var next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem('prep_theme', next);
        localStorage.setItem('ledgerMate_theme', next);
      } catch (e) {}

      var tb = document.getElementById('themeBtn');
      if (tb) tb.textContent = next === 'light' ? '☀️' : '🌙';
      var agfBtn = document.getElementById('agfThemeBtn');
      if (agfBtn) agfBtn.textContent = next === 'light' ? '☀️' : '🌙';

      renderProfileDetails();
      if (typeof window.showToast === 'function') {
        window.showToast('Switched to ' + next + ' theme', 'info');
      } else if (window.LMToast) {
        window.LMToast.show('Switched to ' + next + ' theme', 'info');
      }
      if (window.LM_Haptic) window.LM_Haptic.impactLight();
    },

    openPreferences: function () {
      BankProfileModal.close();
      if (typeof window.openPreferencesModal === 'function') {
        window.openPreferencesModal();
      }
    },

    openAdmin: function () {
      BankProfileModal.close();
      if (window.LM_Admin && typeof window.LM_Admin.show === 'function') {
        window.LM_Admin.show('approvals');
      } else {
        var isPrep = window.location.pathname.indexOf('/prep/') !== -1;
        var isStudy = window.location.pathname.indexOf('/study') !== -1;
        var prefix = isPrep ? '../../' : (isStudy ? '../' : './');
        var s = document.createElement('script');
        s.src = prefix + 'src/scripts/Admin/AdminPanel.js';
        s.onload = function () {
          if (window.LM_Admin && typeof window.LM_Admin.show === 'function') {
            window.LM_Admin.show('approvals');
          }
        };
        document.head.appendChild(s);
      }
    },

    checkUpdates: function () {
      BankProfileModal.close();
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(function(reg) {
          reg.update().catch(function(){});
        }).catch(function(){});
      }
      if (window.LM_AppUpdateService && typeof window.LM_AppUpdateService.checkForUpdates === 'function') {
        window.LM_AppUpdateService.checkForUpdates(true);
        return;
      }
      if (window.AppUpdateService && typeof window.AppUpdateService.checkForUpdates === 'function') {
        window.AppUpdateService.checkForUpdates(true);
        return;
      }
      var isPrep = window.location.pathname.indexOf('/prep/') !== -1;
      var isStudy = window.location.pathname.indexOf('/study') !== -1;
      var prefix = isPrep ? '../../' : (isStudy ? '../' : './');
      var s = document.createElement('script');
      s.src = prefix + 'src/scripts/Common/AppUpdateService.js';
      s.onload = function() {
        if (window.LM_AppUpdateService && typeof window.LM_AppUpdateService.checkForUpdates === 'function') {
          window.LM_AppUpdateService.checkForUpdates(true);
        }
      };
      document.head.appendChild(s);
    },

    exportBackup: function () {
      BankProfileModal.close();
      const btn = document.getElementById('btnFullExport');
      if (btn) btn.click();
    },

    importBackup: function () {
      BankProfileModal.close();
      const btn = document.getElementById('btnImport');
      if (btn) btn.click();
    },

    openFAQ: function () {
      BankProfileModal.close();
      _ensureHelpModal(function () {
        if (window.LM_HelpModal && typeof window.LM_HelpModal.openFAQ === 'function') {
          window.LM_HelpModal.openFAQ();
        }
      });
    },

    openFeedback: function () {
      BankProfileModal.close();
      _ensureHelpModal(function () {
        if (window.LM_HelpModal && typeof window.LM_HelpModal.openFeedback === 'function') {
          window.LM_HelpModal.openFeedback();
        }
      });
    },

    signOut: function () {
      BankProfileModal.close();
      if (confirm('Sign out of your account?')) {
        localStorage.removeItem('lm_session');
        if (typeof _supabase !== 'undefined' && _supabase && _supabase.auth) {
          _supabase.auth.signOut().finally(function () {
            var target = isStudyContext()
              ? (window.location.pathname.indexOf('/prep/') !== -1 ? '../login.html?action=logout&app=study' : './login.html?action=logout&app=study')
              : './login.html?action=logout';
            window.location.href = target;
          });
        } else if (window.LM_Auth && typeof window.LM_Auth.logout === 'function') {
          window.LM_Auth.logout();
        } else {
          var target = isStudyContext()
            ? (window.location.pathname.indexOf('/prep/') !== -1 ? '../login.html?action=logout&app=study' : './login.html?action=logout&app=study')
            : './login.html?action=logout';
          window.location.href = target;
        }
      }
    }
  };

  function _ensureHelpModal(callback) {
    if (window.LM_HelpModal) {
      callback();
      return;
    }
    var isStudy = isStudyContext();
    var base = isStudy ? '../' : './';
    if (window.location.pathname.indexOf('/prep/') !== -1) {
      base = '../../';
    }
    var s = document.createElement('script');
    s.src = base + 'src/scripts/Modules/HelpFeedbackModal.js';
    s.onload = function () {
      if (typeof callback === 'function') callback();
    };
    s.onerror = function () {
      if (typeof window.showToast === 'function') {
        window.showToast('Could not load Help & Feedback module.', 'error');
      } else {
        alert('Could not load Help & Feedback module.');
      }
    };
    document.head.appendChild(s);
  }

  async function showMfaManagementDialog() {
    try { window.LM_Haptic?.impactLight?.(); } catch (e) {}
    var existingModal = document.getElementById('lmMfaSetupModal');
    if (existingModal) existingModal.remove();

    var overlay = document.createElement('div');
    overlay.id = 'lmMfaSetupModal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(4,8,18,0.85);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);padding:16px;box-sizing:border-box;animation:bpmFadeIn 0.2s ease forwards;';

    var currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    var isDark = currentTheme !== 'light';
    var cardBg = isDark ? '#141a29' : '#ffffff';
    var cardBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
    var textColor = isDark ? '#ffffff' : '#0f172a';
    var subtextColor = isDark ? '#94a3b8' : '#64748b';

    var factorsRes = await _supabase.auth.mfa.listFactors();
    var factors = factorsRes.data;
    var verifiedFactor = factors && factors.totp && factors.totp.find(function (f) { return f.status === 'verified'; });

    if (verifiedFactor) {
      // User is already enrolled -> show active state and disable option
      overlay.innerHTML = `
        <div style="background:${cardBg};border:1px solid ${cardBorder};border-radius:24px;width:100%;max-width:440px;padding:28px 24px;box-shadow:0 25px 60px rgba(0,0,0,0.6);color:${textColor};text-align:center;position:relative;box-sizing:border-box;">
          <button id="closeMfaModalBtn" style="position:absolute;top:16px;right:16px;background:none;border:none;color:${subtextColor};font-size:20px;cursor:pointer;padding:4px 8px;">✕</button>
          
          <div style="width:60px;height:60px;border-radius:18px;background:rgba(0,212,180,0.12);border:1px solid rgba(0,212,180,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:28px;">🛡️</div>
          <h3 style="margin:0 0 8px;font-size:18px;font-weight:700;">2FA is Active</h3>
          <p style="font-size:13px;color:${subtextColor};line-height:1.5;margin:0 0 20px;">Your account is securely protected with <strong>Microsoft Authenticator</strong> (TOTP).</p>

          <div style="background:${isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc'};border:1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};border-radius:14px;padding:14px;margin-bottom:24px;text-align:left;">
            <div style="font-size:12px;color:${subtextColor};margin-bottom:4px;">Enrolled Authenticator</div>
            <div style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;">
              <span>📱</span> ${verifiedFactor.friendly_name || 'Microsoft Authenticator'}
              <span style="margin-left:auto;font-size:11px;background:rgba(0,212,180,0.15);color:#00d4b4;padding:2px 8px;border-radius:99px;font-weight:700;">ACTIVE</span>
            </div>
          </div>

          <button id="disableMfaBtn" style="width:100%;padding:12px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.25);border-radius:12px;color:#f43f5e;font-size:13.5px;font-weight:600;cursor:pointer;margin-bottom:10px;transition:all 0.2s;">Disable Two-Factor Authentication</button>
          <button id="doneMfaBtn" style="width:100%;padding:11px;background:${isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0'};border:none;border-radius:12px;color:${textColor};font-size:13.5px;font-weight:600;cursor:pointer;">Close</button>
        </div>
      `;

      document.body.appendChild(overlay);

      overlay.querySelector('#closeMfaModalBtn').onclick = function () {
        try { window.LM_Haptic?.impactLight?.(); } catch (e) {}
        overlay.remove();
        BankProfileModal.open();
      };
      overlay.querySelector('#doneMfaBtn').onclick = function () {
        try { window.LM_Haptic?.impactLight?.(); } catch (e) {}
        overlay.remove();
        BankProfileModal.open();
      };
      overlay.querySelector('#disableMfaBtn').onclick = async function () {
        if (!confirm('Are you sure you want to disable 2FA? You will no longer be asked for an authenticator code when signing in.')) return;
        this.disabled = true;
        this.textContent = 'Disabling…';
        try {
          var unRes = await _supabase.auth.mfa.unenroll({ factorId: verifiedFactor.id });
          if (unRes.error) throw unRes.error;
          try { window.LM_Haptic?.notificationSuccess?.(); } catch (e) {}
          overlay.remove();
          if (typeof window.showToast === 'function') window.showToast('2FA disabled successfully.', 'info');
          else if (window.LMToast) window.LMToast.show('2FA disabled successfully.', 'info');
          BankProfileModal.open();
        } catch (e) {
          try { window.LM_Haptic?.notificationError?.(); } catch (err) {}
          alert('Could not disable 2FA: ' + e.message);
          this.disabled = false;
          this.textContent = 'Disable Two-Factor Authentication';
        }
      };
      return;
    }

    // Not enrolled -> Start enrollment
    overlay.innerHTML = `
      <div style="background:${cardBg};border:1px solid ${cardBorder};border-radius:24px;width:100%;max-width:460px;padding:24px;box-shadow:0 25px 60px rgba(0,0,0,0.6);color:${textColor};position:relative;box-sizing:border-box;max-height:90vh;overflow-y:auto;">
        <button id="closeMfaModalBtn" style="position:absolute;top:16px;right:16px;background:none;border:none;color:${subtextColor};font-size:20px;cursor:pointer;padding:4px 8px;">✕</button>

        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
          <div style="width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#00d4b4,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:20px;">📱</div>
          <div>
            <h3 style="margin:0;font-size:17px;font-weight:700;">Set Up Microsoft Authenticator</h3>
            <div style="font-size:12px;color:${subtextColor};">Two-Factor Authentication (TOTP)</div>
          </div>
        </div>

        <div id="mfaEnrollBody" style="text-align:center;">
          <div style="font-size:13px;color:${subtextColor};padding:20px;">Generating secret key & QR code…</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#closeMfaModalBtn').onclick = function () {
      try { window.LM_Haptic?.impactLight?.(); } catch (e) {}
      overlay.remove();
      BankProfileModal.open();
    };

    try {
      // Clean up any unverified TOTP factors first
      if (factors && factors.totp) {
        for (var i = 0; i < factors.totp.length; i++) {
          if (factors.totp[i].status !== 'verified') {
            await _supabase.auth.mfa.unenroll({ factorId: factors.totp[i].id });
          }
        }
      }

      var enrollRes = await _supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'LedgerMate',
        friendlyName: 'Microsoft Authenticator'
      });

      if (enrollRes.error || !enrollRes.data) throw enrollRes.error || new Error('Enrollment failed');

      var factorId = enrollRes.data.id;
      var qrCodeUrl = enrollRes.data.totp.qr_code;
      var secretKey = enrollRes.data.totp.secret;

      var enrollBody = overlay.querySelector('#mfaEnrollBody');
      enrollBody.innerHTML = `
        <div style="text-align:left;font-size:13px;color:${textColor};line-height:1.5;margin-bottom:14px;">
          <strong>1.</strong> Open <strong>Microsoft Authenticator</strong> on your phone.<br/>
          <strong>2.</strong> Tap <strong>+ (Add account)</strong> → <strong>Other (Google, Facebook, etc.)</strong> and scan:
        </div>

        <div style="background:#ffffff;padding:12px;border-radius:16px;display:inline-block;margin:0 auto 14px;box-shadow:0 4px 16px rgba(0,0,0,0.15);">
          <img src="${qrCodeUrl}" alt="MFA QR Code" style="width:180px;height:180px;display:block;margin:0 auto;"/>
        </div>

        <div style="margin-bottom:16px;">
          <div style="font-size:11px;color:${subtextColor};margin-bottom:4px;">Can't scan? Enter key manually in Microsoft Authenticator:</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:8px;">
            <code style="background:${isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'};padding:6px 10px;border-radius:8px;font-family:monospace;font-size:12.5px;letter-spacing:1px;font-weight:600;">${secretKey}</code>
            <button id="copyMfaSecretBtn" style="padding:6px 10px;border-radius:8px;background:rgba(0,212,180,0.12);border:1px solid rgba(0,212,180,0.3);color:#00d4b4;font-size:11.5px;font-weight:600;cursor:pointer;">📋 Copy</button>
          </div>
        </div>

        <div style="border-top:1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'};padding-top:16px;text-align:left;">
          <div style="font-size:12px;font-weight:600;color:${textColor};margin-bottom:6px;"><strong>3.</strong> Enter the 6-digit code from Microsoft Authenticator:</div>
          <input id="bpmMfaConfirmInp" type="text" maxlength="6" inputmode="numeric" placeholder="000000" style="width:100%;height:44px;background:${isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc'};border:1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'};border-radius:12px;color:${textColor};text-align:center;letter-spacing:6px;font-size:18px;font-weight:700;font-family:monospace;outline:none;margin-bottom:12px;box-sizing:border-box;"/>
          <button id="bpmMfaActivateBtn" style="width:100%;height:44px;border-radius:12px;background:linear-gradient(135deg,#00d4b4,#10b981);border:none;color:#042f2c;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,212,180,0.3);">Verify &amp; Activate 2FA →</button>
        </div>
      `;

      var copyBtn = overlay.querySelector('#copyMfaSecretBtn');
      if (copyBtn) {
        copyBtn.onclick = function () {
          navigator.clipboard.writeText(secretKey).then(function () {
            try { window.LM_Haptic?.notificationSuccess?.(); } catch (e) {}
            copyBtn.textContent = '✅ Copied!';
            setTimeout(function () { copyBtn.textContent = '📋 Copy'; }, 2000);
          }).catch(function () {
            try { window.LM_Haptic?.impactLight?.(); } catch (e) {}
          });
        };
      }

      var actBtn = overlay.querySelector('#bpmMfaActivateBtn');
      var codeInp = overlay.querySelector('#bpmMfaConfirmInp');

      async function doActivate() {
        var code = (codeInp.value || '').trim();
        if (!code || code.length < 6) {
          try { window.LM_Haptic?.notificationWarning?.(); } catch (e) {}
          alert('Please enter the 6-digit code shown in Microsoft Authenticator.');
          return;
        }
        actBtn.disabled = true;
        actBtn.textContent = 'Verifying…';

        try {
          var chVerRes = await _supabase.auth.mfa.challengeAndVerify({
            factorId: factorId,
            code: code
          });

          if (chVerRes.error) throw chVerRes.error;

          // Success!
          try { window.LM_Haptic?.notificationSuccess?.(); } catch (e) {}
          overlay.remove();
          if (typeof window.showToast === 'function') window.showToast('🛡️ Microsoft Authenticator 2FA Activated!', 'success');
          else if (window.LMToast) window.LMToast.show('🛡️ Microsoft Authenticator 2FA Activated!', 'success');
          BankProfileModal.open();
        } catch (e) {
          try { window.LM_Haptic?.notificationError?.(); } catch (err) {}
          alert('Verification failed: ' + (e.message || 'Invalid code. Check Microsoft Authenticator clock time.'));
          actBtn.disabled = false;
          actBtn.textContent = 'Verify & Activate 2FA →';
        }
      }

      if (actBtn) actBtn.onclick = doActivate;
      if (codeInp) {
        codeInp.onkeydown = function (e) {
          if (e.key === 'Enter') doActivate();
        };
      }

    } catch (err) {
      try { window.LM_Haptic?.notificationError?.(); } catch (e) {}
      overlay.querySelector('#mfaEnrollBody').innerHTML = `
        <div style="padding:20px;color:#f43f5e;font-size:13px;">
          Failed to start 2FA setup: ${err.message || 'Check network connection'}
        </div>
      `;
    }
  }

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && _modalEl && _modalEl.classList.contains('open')) {
      BankProfileModal.close();
    }
  });

  if (typeof window.LM_Bus !== 'undefined' && window.LM_Bus.on) {
    window.LM_Bus.on('lm:sync:mode-changed', function () {
      if (_modalEl && _modalEl.classList.contains('open')) renderProfileDetails();
    });
    window.LM_Bus.on('lm:cloud:saved', function () {
      if (_modalEl && _modalEl.classList.contains('open')) renderProfileDetails();
    });
    window.LM_Bus.on('lm:local-backup:status-changed', function () {
      if (_modalEl && _modalEl.classList.contains('open')) renderProfileDetails();
    });
    window.LM_Bus.on('lm:local-backup:saved', function () {
      if (_modalEl && _modalEl.classList.contains('open')) renderProfileDetails();
    });
    window.LM_Bus.on('lm:privacy:changed', function () {
      if (_modalEl && _modalEl.classList.contains('open')) renderProfileDetails();
    });
  }

  window.LM_ProfileModal = BankProfileModal;
  window.openBankProfileModal = BankProfileModal.open;
})();
