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

  function isNativeAndroid() {
    return typeof window.AndroidBridge !== 'undefined' &&
           typeof window.AndroidBridge.isNativeApp === 'function' &&
           window.AndroidBridge.isNativeApp();
  }

  function getInstalledVersion() {
    if (!isNativeAndroid() || typeof window.AndroidBridge.getAppVersion !== 'function') {
      return { versionCode: 1, versionName: '1.0.0' };
    }
    try {
      const verJson = window.AndroidBridge.getAppVersion();
      return typeof verJson === 'string' ? JSON.parse(verJson) : verJson;
    } catch (e) {
      return { versionCode: 1, versionName: '1.0.0' };
    }
  }

  function getUserData() {
    if (window.LM_Auth && typeof window.LM_Auth.getCurrentUser === 'function') {
      const u = window.LM_Auth.getCurrentUser();
      if (u) return u;
    }
    try {
      const sess = localStorage.getItem('lm_session');
      if (sess) return JSON.parse(sess);
    } catch (e) {}
    return {
      displayName: 'User',
      username: 'user@ledgermate.local',
      role: 'user',
      userId: 'default'
    };
  }

  function isAppLockEnabled() {
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
    try {
      const lastSync = localStorage.getItem('lm_last_cloud_sync_time');
      if (lastSync) {
        const d = new Date(Number(lastSync));
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      }
    } catch (e) {}
    return 'Active';
  }

  function createModalDOM() {
    if (document.getElementById('bankProfileModal')) {
      return document.getElementById('bankProfileModal');
    }

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
              <div class="bank-profile-verified-badge" title="Verified Vault Account">✓</div>
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
              <div class="bank-profile-vault-tag">
                <span class="bpm-sec-icon">🛡️</span>
                <span>256-Bit Encrypted Vault · Offline First</span>
              </div>
            </div>
          </div>
          <button class="bank-profile-close-btn" onclick="window.LM_ProfileModal.close()" title="Close">✕</button>
        </div>

        <div class="bank-profile-body">
          <!-- ── Micro Status Matrix ── -->
          <div class="bank-profile-matrix">
            <div class="bpm-matrix-card" onclick="window.LM_ProfileModal.triggerSync()">
              <div class="bpm-matrix-icon">☁️</div>
              <div class="bpm-matrix-info">
                <div class="bpm-matrix-label">Cloud Sync</div>
                <div class="bpm-matrix-val" id="bpmSyncStatus">Synced</div>
              </div>
              <span class="bpm-matrix-action">Sync</span>
            </div>

            <div class="bpm-matrix-card" onclick="window.LM_ProfileModal.togglePrivacy()">
              <div class="bpm-matrix-icon">👁️</div>
              <div class="bpm-matrix-info">
                <div class="bpm-matrix-label">Privacy Shield</div>
                <div class="bpm-matrix-val" id="bpmPrivacyStatus">Hidden</div>
              </div>
              <div class="bpm-toggle-indicator" id="bpmPrivacyToggle"></div>
            </div>

            <div class="bpm-matrix-card" onclick="window.LM_ProfileModal.openSecurity()">
              <div class="bpm-matrix-icon">🔒</div>
              <div class="bpm-matrix-info">
                <div class="bpm-matrix-label">Vault Lock</div>
                <div class="bpm-matrix-val" id="bpmLockStatus">PIN Protected</div>
              </div>
              <span class="bpm-matrix-arrow">›</span>
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
            <div class="bpm-group-title">EXPERIENCE &amp; ALERTS</div>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.toggleTheme()">
              <span class="bpm-row-icon" id="bpmThemeIcon">🌓</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Theme Interface</div>
                <div class="bpm-row-desc" id="bpmThemeDesc">Switch between Dark &amp; Light palette</div>
              </div>
              <span class="bpm-badge" id="bpmThemeBadge">Dark Mode</span>
            </button>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.openPreferences()">
              <span class="bpm-row-icon">🔔</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">Preferences &amp; Bill Reminders</div>
                <div class="bpm-row-desc">Notification thresholds &amp; alert timings</div>
              </div>
              <span class="bpm-row-arrow">›</span>
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

          <div class="bpm-section-group">
            <div class="bpm-group-title">DATA BACKUP &amp; UPDATES</div>

            <button class="bpm-action-row" onclick="window.LM_ProfileModal.checkUpdates()">
              <span class="bpm-row-icon" id="bpmUpdateIcon">🔄</span>
              <div class="bpm-row-text">
                <div class="bpm-row-title">App Version &amp; Updates</div>
                <div class="bpm-row-desc" id="bpmVersionDesc">Version v1.0.0</div>
              </div>
              <span class="bpm-badge" id="bpmUpdateBadge">Check</span>
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
                <div class="bpm-row-title" style="color:var(--rose);">Sign Out of Vault</div>
                <div class="bpm-row-desc">Securely lock session &amp; sign out</div>
              </div>
              <span class="bpm-row-arrow" style="color:var(--rose);">→</span>
            </button>
          </div>

          <div class="bpm-footer-meta">
            <span>LedgerMate Finance OS</span> · <span>Zero-Knowledge Secure Vault</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
  }

  function renderProfileDetails() {
    const user = getUserData();
    const isLock = isAppLockEnabled();
    const isPrivacy = isPrivacyModeActive();
    const ver = getInstalledVersion();
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';

    // Avatar initial
    const initial = (user.displayName || user.username || 'A').charAt(0).toUpperCase();
    const av = document.getElementById('bpmAvatar');
    if (av) av.textContent = initial;

    // Display Name
    const nameEl = document.getElementById('bpmDisplayName');
    if (nameEl) nameEl.textContent = user.displayName || user.username || 'Account Holder';

    // Role Pill
    const rolePill = document.getElementById('bpmRolePill');
    if (rolePill) {
      const isAdmin = user.role === 'admin';
      rolePill.textContent = isAdmin ? 'ADMIN' : 'PERSONAL';
      rolePill.className = 'bank-profile-role-pill ' + (isAdmin ? 'admin' : 'user');
    }

    // Email
    const emailEl = document.getElementById('bpmEmail');
    if (emailEl) emailEl.textContent = user.username || user.email || 'user@ledgermate.local';

    // Matrix status
    const syncStatus = document.getElementById('bpmSyncStatus');
    if (syncStatus) syncStatus.textContent = getCloudSyncText();

    const privStatus = document.getElementById('bpmPrivacyStatus');
    if (privStatus) privStatus.textContent = isPrivacy ? 'Masked' : 'Visible';

    const privToggle = document.getElementById('bpmPrivacyToggle');
    if (privToggle) privToggle.classList.toggle('active', isPrivacy);

    const lockStatus = document.getElementById('bpmLockStatus');
    if (lockStatus) lockStatus.textContent = isLock ? 'Protected' : 'Off';

    // Theme info
    const themeIcon = document.getElementById('bpmThemeIcon');
    if (themeIcon) themeIcon.textContent = isDark ? '🌙' : '☀️';

    const themeBadge = document.getElementById('bpmThemeBadge');
    if (themeBadge) themeBadge.textContent = isDark ? 'Dark' : 'Light';

    const themeDesc = document.getElementById('bpmThemeDesc');
    if (themeDesc) themeDesc.textContent = isDark ? 'Obsidian Fintech Dark Theme' : 'Clean Porcelain Light Theme';

    // Version
    const verDesc = document.getElementById('bpmVersionDesc');
    if (verDesc) verDesc.textContent = `Version ${ver.versionName || 'v1.0.0'} (${ver.versionCode || 1})`;

    // Admin button visibility
    const adminBtn = document.getElementById('bpmAdminBtn');
    if (adminBtn) adminBtn.style.display = user.role === 'admin' ? 'flex' : 'none';
  }

  const BankProfileModal = {
    open: function () {
      _modalEl = createModalDOM();
      renderProfileDetails();
      _modalEl.style.display = 'flex';
      requestAnimationFrame(() => {
        _modalEl.classList.add('open');
        document.body.classList.add('bpm-modal-open');
      });
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
      }
      if (window.LM_Haptic) window.LM_Haptic.notificationSuccess();
    },

    triggerSync: async function () {
      const btn = document.getElementById('bpmSyncStatus');
      if (btn) btn.textContent = 'Syncing...';
      if (typeof window.LM_manualSync === 'function') {
        await window.LM_manualSync();
      }
      if (btn) btn.textContent = 'Synced';
      if (window.LM_Haptic) window.LM_Haptic.notificationSuccess();
    },

    togglePrivacy: function () {
      if (typeof window.LM_togglePrivacyMode === 'function') {
        window.LM_togglePrivacyMode();
      }
      renderProfileDetails();
      if (window.LM_Haptic) window.LM_Haptic.impactLight();
    },

    openSecurity: function () {
      BankProfileModal.close();
      if (typeof window.openAppLockSettingsModal === 'function') {
        window.openAppLockSettingsModal();
      }
    },

    openCredentials: function () {
      BankProfileModal.close();
      if (typeof window.showCredentialsVault === 'function') {
        window.showCredentialsVault();
      }
    },

    toggleTheme: function () {
      if (typeof window.toggleTheme === 'function') {
        window.toggleTheme();
      }
      renderProfileDetails();
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
        window.LM_Admin.show();
      }
    },

    checkUpdates: function () {
      BankProfileModal.close();
      if (window.LM_AppUpdateService && typeof window.LM_AppUpdateService.checkForUpdates === 'function') {
        window.LM_AppUpdateService.checkForUpdates(true);
      }
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
      if (confirm('Sign out of LedgerMate?')) {
        if (window.LM_Auth && typeof window.LM_Auth.logout === 'function') {
          window.LM_Auth.logout();
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

  window.LM_ProfileModal = BankProfileModal;
  window.openBankProfileModal = BankProfileModal.open;
})();
