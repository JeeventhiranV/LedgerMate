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
            </div>
          </div>
          <button class="bank-profile-close-btn" onclick="window.LM_ProfileModal.close()" title="Close">✕</button>
        </div>

        <div class="bank-profile-body">
          <!-- ── Micro Status Matrix ── -->
          <div class="bank-profile-matrix">
            <div class="bpm-matrix-card" onclick="window.LM_ProfileModal.toggleSyncMode()" style="cursor:pointer;" title="Tap to toggle Cloud Sync / Offline Mode">
              <div class="bpm-matrix-icon" id="bpmSyncIcon">☁️</div>
              <div class="bpm-matrix-info">
                <div class="bpm-matrix-label" id="bpmSyncLabel">Cloud Sync</div>
                <div class="bpm-matrix-val" id="bpmSyncStatus">Synced</div>
              </div>
              <div class="bpm-switch-pill" id="bpmSyncSwitch">
                <span class="bpm-switch-knob"></span>
                <span id="bpmSyncSwitchText">Cloud</span>
              </div>
            </div>

            <div class="bpm-matrix-card" onclick="window.LM_ProfileModal.togglePrivacy()" style="cursor:pointer;" title="Tap to toggle stealth balance privacy">
              <div class="bpm-matrix-icon" id="bpmPrivacyIcon">👁️</div>
              <div class="bpm-matrix-info">
                <div class="bpm-matrix-label">Privacy Shield</div>
                <div class="bpm-matrix-val" id="bpmPrivacyStatus">Hidden</div>
              </div>
              <div class="bpm-switch-pill" id="bpmPrivacySwitch">
                <span class="bpm-switch-knob"></span>
                <span id="bpmPrivacySwitchText">OFF</span>
              </div>
            </div>

            <div class="bpm-matrix-card" onclick="window.LM_ProfileModal.openSecurity()" style="cursor:pointer;">
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

          <div class="bpm-section-group">
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
            <span>LedgerMate Finance OS</span> · <span>Secure Financial Intelligence</span>
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
    const isOffline = (window.LM_CloudSync && typeof window.LM_CloudSync.isOfflineMode === 'function')
      ? window.LM_CloudSync.isOfflineMode()
      : (localStorage.getItem('lm_sync_mode') === 'offline');

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
    const syncIcon = document.getElementById('bpmSyncIcon');
    if (syncIcon) syncIcon.textContent = isOffline ? '💾' : '☁️';

    const syncLabel = document.getElementById('bpmSyncLabel');
    if (syncLabel) syncLabel.textContent = isOffline ? 'Offline Mode' : 'Cloud Sync';

    const syncStatus = document.getElementById('bpmSyncStatus');
    if (syncStatus) syncStatus.textContent = isOffline ? 'Local Vault' : getCloudSyncText();

    const syncSwitch = document.getElementById('bpmSyncSwitch');
    const syncSwitchText = document.getElementById('bpmSyncSwitchText');
    if (syncSwitch) {
      syncSwitch.classList.toggle('active', !isOffline);
    }
    if (syncSwitchText) {
      syncSwitchText.textContent = !isOffline ? 'Cloud' : 'Offline';
    }

    const privStatus = document.getElementById('bpmPrivacyStatus');
    if (privStatus) privStatus.textContent = isPrivacy ? 'Masked' : 'Visible';

    const privIcon = document.getElementById('bpmPrivacyIcon');
    if (privIcon) privIcon.textContent = isPrivacy ? '🙈' : '👁️';

    const privSwitch = document.getElementById('bpmPrivacySwitch');
    const privSwitchText = document.getElementById('bpmPrivacySwitchText');
    if (privSwitch) {
      privSwitch.classList.toggle('active', isPrivacy);
    }
    if (privSwitchText) {
      privSwitchText.textContent = isPrivacy ? 'ON' : 'OFF';
    }

    const lockStatus = document.getElementById('bpmLockStatus');
    if (lockStatus) lockStatus.textContent = isLock ? 'Protected' : 'Off';

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

    // Local Backup badge & desc
    const isLocalAuto = (window.LM_LocalBackup && typeof window.LM_LocalBackup.isLocalBackupEnabled === 'function')
      ? window.LM_LocalBackup.isLocalBackupEnabled()
      : (localStorage.getItem('lm_local_backup_enabled') === 'true');
    const localBadge = document.getElementById('bpmLocalBackupBadge');
    if (localBadge) {
      localBadge.textContent = isLocalAuto ? 'Active' : 'Disabled';
      localBadge.style.color = isLocalAuto ? 'var(--teal,#00d4b4)' : 'var(--text-3)';
    }

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

    toggleSyncMode: function () {
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

    handleSyncCardClick: async function () {
      const isOffline = (window.LM_CloudSync && typeof window.LM_CloudSync.isOfflineMode === 'function')
        ? window.LM_CloudSync.isOfflineMode()
        : (localStorage.getItem('lm_sync_mode') === 'offline');

      if (isOffline) {
        // In Offline mode: execute local backup or request folder permission
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
        // In Cloud mode: execute direct cloud sync
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
      if (theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        try { localStorage.setItem('ledgerMate_theme', 'light'); } catch (e) {}
      } else {
        document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem('ledgerMate_theme', 'dark'); } catch (e) {}
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
