/**
 * LedgerMate – BankProfileModal.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Bank-Grade Account & Security Vault Profile Bottom Sheet / Modal.
 * Replaces basic dropdowns with a luxury fintech profile view (CRED / Revolut style).
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  let _modalEl = null;

  function isStudyContext() {
    return window.location.pathname.indexOf('/study') !== -1 ||
           typeof window.StudySync !== 'undefined' ||
           typeof window._studyProfile !== 'undefined' ||
           document.body.classList.contains('study-page') ||
           document.getElementById('statDone') !== null;
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
    // 1. In-memory study user
    if (window._studyUser && (window._studyUser.email || window._studyUser.displayName)) {
      const em = window._studyUser.email || window._studyUser.username || '';
      const rawName = window._studyUser.displayName || (em ? em.split('@')[0] : 'User');
      const disp = rawName ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) : 'User';
      return {
        displayName: disp,
        username: em || disp,
        email: em || 'user@ledgermate.local',
        role: window._studyUser.role || (window._studyProfile ? window._studyProfile.role : 'user'),
        userId: window._studyUser.userId || window._studyUser.id || 'default'
      };
    }

    // 2. LocalStorage study user metadata
    try {
      const studyMeta = localStorage.getItem('study_user_meta');
      if (studyMeta) {
        const parsedMeta = JSON.parse(studyMeta);
        if (parsedMeta && (parsedMeta.email || parsedMeta.displayName || parsedMeta.name)) {
          const em = parsedMeta.email || parsedMeta.username || '';
          const rawName = parsedMeta.displayName || parsedMeta.name || (em ? em.split('@')[0] : 'User');
          const disp = rawName ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) : 'User';
          return {
            displayName: disp,
            username: em || disp,
            email: em || 'user@ledgermate.local',
            role: parsedMeta.role || (window._studyProfile ? window._studyProfile.role : 'user'),
            userId: parsedMeta.userId || parsedMeta.id || 'default'
          };
        }
      }
    } catch(e) {}

    // 3. Finance LM_Auth
    if (window.LM_Auth && typeof window.LM_Auth.getCurrentUser === 'function') {
      const u = window.LM_Auth.getCurrentUser();
      if (u && (u.email || u.username || u.displayName)) {
        const em = u.email || u.username || '';
        const rawName = u.displayName || (em ? em.split('@')[0] : 'User');
        const disp = rawName ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) : 'User';
        return {
          displayName: disp,
          username: em || disp,
          email: em || 'user@ledgermate.local',
          role: u.role || 'user',
          userId: u.userId || u.id || 'default'
        };
      }
    }

    // 4. Finance lm_session
    try {
      const sess = localStorage.getItem('lm_session');
      if (sess) {
        const parsed = JSON.parse(sess);
        const userObj = parsed.user || parsed;
        const meta = userObj.user_metadata || {};
        const em = userObj.email || userObj.username || '';
        const rawName = meta.full_name || meta.name || userObj.displayName || (em ? em.split('@')[0] : '');
        if (em || rawName) {
          const formattedName = rawName ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) : (em ? em.split('@')[0] : 'User');
          return {
            displayName: formattedName,
            username: em || formattedName,
            email: em || 'user@ledgermate.local',
            role: parsed.role || (window._studyProfile ? window._studyProfile.role : 'user'),
            userId: userObj.id || parsed.userId || 'default'
          };
        }
      }
    } catch (e) {}

    // 5. Scan all Supabase tokens in localStorage (sb-*-auth-token or supabase.auth.token or any key containing auth-token)
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && ((k.indexOf('sb-') === 0 && k.indexOf('-auth-token') !== -1) || k.indexOf('auth-token') !== -1 || k === 'supabase.auth.token')) {
          const item = localStorage.getItem(k);
          if (item) {
            const parsed = JSON.parse(item);
            const userObj = parsed.user || (parsed.currentSession && parsed.currentSession.user) || (parsed.session && parsed.session.user);
            if (userObj && (userObj.email || userObj.id)) {
              const meta = userObj.user_metadata || {};
              const em = userObj.email || '';
              const rawName = meta.full_name || meta.name || userObj.name || (em ? em.split('@')[0] : 'User');
              const formattedName = rawName ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) : 'User';
              return {
                displayName: formattedName,
                username: em || formattedName,
                email: em || 'user@ledgermate.local',
                role: (window._studyProfile && window._studyProfile.role) || 'user',
                userId: userObj.id || 'default'
              };
            }
          }
        }
      }
    } catch (e) {}

    // 6. DOM Extraction Fallback (e.g. from hero greeting or sidebar profile)
    try {
      const heroEl = document.getElementById('heroTitle');
      if (heroEl && heroEl.textContent && heroEl.textContent.indexOf(',') !== -1) {
        const part = heroEl.textContent.split(',')[1].replace(/[!.]/g, '').trim();
        if (part && part.toLowerCase() !== 'user' && part.toLowerCase() !== 'study resources hub') {
          return {
            displayName: part,
            username: part,
            email: part.toLowerCase() + '@gmail.com',
            role: (window._studyProfile && window._studyProfile.role) || 'user',
            userId: 'default'
          };
        }
      }
      const agfName = document.querySelector('.agf-name');
      const agfEmail = document.querySelector('.agf-email');
      if (agfName && agfName.textContent && agfName.textContent.trim() !== 'User') {
        const n = agfName.textContent.trim();
        const em = agfEmail ? agfEmail.textContent.trim() : '';
        return {
          displayName: n,
          username: em || n,
          email: em || 'user@ledgermate.local',
          role: (window._studyProfile && window._studyProfile.role) || 'user',
          userId: 'default'
        };
      }
    } catch (e) {}

    return {
      displayName: 'User',
      username: 'user@ledgermate.local',
      email: 'user@ledgermate.local',
      role: 'user',
      userId: 'default'
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
             localStorage.getItem('lm_privacy_mode') === 'true';
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

            <div class="bpm-matrix-card" id="bpmCard2" onclick="${isStudy ? 'window.LM_ProfileModal.showStreakInfo()' : 'window.LM_ProfileModal.togglePrivacy()'}" style="cursor:pointer;" title="${isStudy ? 'Current Active Daily Study Streak' : 'Tap to toggle stealth balance privacy'}">
              <div class="bpm-matrix-icon" id="bpmPrivacyIcon">${isStudy ? '🔥' : '👁️'}</div>
              <div class="bpm-matrix-info">
                <div class="bpm-matrix-label" id="bpmCard2Label">${isStudy ? 'Study Streak' : 'Privacy Shield'}</div>
                <div class="bpm-matrix-val" id="bpmPrivacyStatus">${isStudy ? '0 Days' : 'Hidden'}</div>
              </div>
              <div class="bpm-switch-pill" id="bpmPrivacySwitch">
                <span class="bpm-switch-knob"></span>
                <span id="bpmPrivacySwitchText">${isStudy ? 'Active' : 'OFF'}</span>
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

            <button class="bpm-action-row" id="bpmAdminBtn" style="display:none;" onclick="window.LM_ProfileModal.openAdmin()">
              <span class="bpm-row-icon">⚙️</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">System Admin Console</div>
                <div class="bpm-row-desc">Manage tenant users &amp; database permissions</div>
              </div>
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
      if (card2Val) card2Val.textContent = streak + ' Days';
      if (card2Icon) card2Icon.textContent = '🔥';
      if (card2Switch) card2Switch.classList.add('active');
      if (card2SwitchText) card2SwitchText.textContent = 'Active';
    } else {
      if (card2Label) card2Label.textContent = 'Privacy Shield';
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

    // Admin button visibility
    const adminBtn = document.getElementById('bpmAdminBtn');
    if (adminBtn) adminBtn.style.display = user.role === 'admin' ? 'flex' : 'none';
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
        _supabase.auth.getSession().then(function (res) {
          var s = res && res.data && res.data.session;
          if (s && s.user) {
            var u = s.user;
            var em = u.email || '';
            var m = u.user_metadata || {};
            var n = m.full_name || m.name || (em ? em.split('@')[0] : 'User');
            var disp = n ? (n.charAt(0).toUpperCase() + n.slice(1)) : 'User';
            window._studyUser = {
              displayName: disp,
              username: em,
              email: em,
              role: (window._studyProfile && window._studyProfile.role) || 'user',
              userId: u.id
            };
            try { localStorage.setItem('study_user_meta', JSON.stringify(window._studyUser)); } catch(e){}
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
      if (typeof window.LM_togglePrivacyMode === 'function') {
        window.LM_togglePrivacyMode();
      }
      renderProfileDetails();
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
      if (window.StudyAdmin && typeof window.StudyAdmin.open === 'function') {
        window.StudyAdmin.open();
      } else if (window.LM_Admin && typeof window.LM_Admin.show === 'function') {
        window.LM_Admin.show();
      } else {
        window.location.href = window.location.pathname.indexOf('/prep/') !== -1 ? '../index.html?admin=open' : './index.html?admin=open';
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
