/**
 * LedgerMate – AppUpdateService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatic In-App APK Version Upgrade & Update Prompt Service.
 * - Detects Android Native Bridge
 * - Compares installed APK versionCode with latest GitHub release in version.json
 * - Displays in-app update banner/modal with download progress and one-tap install.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  let _checking = false;
  let _activeModal = null;
  let _lastCheckedTime = 0;
  const DISMISS_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours snooze on 'Remind Later'

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

  function updateSidebarVersionBadge(hasUpdate) {
    try {
      const badge = document.getElementById('sidebarAppVersion');
      if (!badge) return;
      const ver = getInstalledVersion();
      let verStr = (ver && ver.versionName) ? ver.versionName : '1.0.0';
      if (!verStr.startsWith('v')) verStr = 'v' + verStr;

      if (hasUpdate) {
        badge.innerHTML = `${verStr} <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#ef4444;box-shadow:0 0 6px #ef4444;margin-left:2px;animation:pulse 1.5s infinite;"></span>`;
        badge.title = `Update Available! Tap to install`;
        badge.style.borderColor = 'rgba(239, 68, 68, 0.5)';
        badge.style.color = '#f87171';
      } else {
        badge.textContent = verStr;
        badge.title = `App Version ${verStr} · Tap to check for updates`;
        badge.style.borderColor = '';
        badge.style.color = '';
      }
    } catch (e) {}
  }

  function showNotificationToast(msg, type) {
    type = type || 'info';
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
      return;
    }
    if (window.LMToast && typeof window.LMToast.show === 'function') {
      window.LMToast.show(msg, type);
      return;
    }
    // Universal HUD fallback toast
    let t = document.getElementById('lmUpdateToastHUD');
    if (!t) {
      t = document.createElement('div');
      t.id = 'lmUpdateToastHUD';
      t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(15,23,42,0.92);color:#f8fafc;padding:12px 20px;border-radius:14px;border:1px solid rgba(255,255,255,0.15);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;font-weight:600;z-index:2147483647;box-shadow:0 10px 30px rgba(0,0,0,0.5);opacity:0;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);display:flex;align-items:center;gap:8px;pointer-events:none;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);max-width:90vw;text-align:center;';
      document.body.appendChild(t);
    }
    const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : (type === 'warning' ? '⚠️' : 'ℹ️'));
    t.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    
    clearTimeout(t._timer);
    t._timer = setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3500);
  }

  async function fetchLatestVersionMeta() {
    const candidateUrls = [
      'version.json',
      '../version.json',
      '../../version.json',
      '/version.json'
    ];
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      candidateUrls.push(window.location.origin + '/version.json');
    }
    for (const u of candidateUrls) {
      try {
        const res = await fetch(u + '?_t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && (typeof data.apkVersionCode !== 'undefined' || typeof data.version !== 'undefined' || typeof data.versionCode !== 'undefined')) {
            return data;
          }
        }
      } catch (e) {}
    }
    return null;
  }

  function injectModalStyles() {
    if (document.getElementById('lm-update-service-inline-css')) return;
    const style = document.createElement('style');
    style.id = 'lm-update-service-inline-css';
    style.textContent = `
      .lm-update-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483647 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        box-sizing: border-box !important;
        background: rgba(4, 8, 18, 0.85) !important;
        backdrop-filter: blur(12px) !important;
        -webkit-backdrop-filter: blur(12px) !important;
        animation: lmUpdateFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        pointer-events: auto !important;
        touch-action: auto !important;
      }
      [data-theme="light"] .lm-update-overlay {
        background: rgba(15, 23, 42, 0.6) !important;
      }
      .lm-update-card {
        position: relative !important;
        width: 100% !important;
        max-width: 420px !important;
        box-sizing: border-box !important;
        background: #121827 !important;
        background: linear-gradient(175deg, #182238 0%, #0f1523 100%) !important;
        border: 1px solid rgba(255, 255, 255, 0.15) !important;
        border-radius: 24px !important;
        padding: 24px !important;
        box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 40px rgba(0, 212, 180, 0.15) !important;
        color: #f1f5f9 !important;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif !important;
        animation: lmUpdateSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        pointer-events: auto !important;
      }
      [data-theme="light"] .lm-update-card {
        background: #ffffff !important;
        background: linear-gradient(175deg, #ffffff 0%, #f8fafc 100%) !important;
        border: 1px solid rgba(0, 0, 0, 0.12) !important;
        box-shadow: 0 25px 60px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06), 0 0 30px rgba(0, 212, 180, 0.12) !important;
        color: #0f172a !important;
      }
      .lm-update-close-btn {
        position: absolute !important;
        top: 16px !important;
        right: 16px !important;
        width: 32px !important;
        height: 32px !important;
        border-radius: 50% !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        color: #94a3b8 !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        z-index: 10 !important;
      }
      .lm-update-close-btn:hover,
      .lm-update-close-btn:active {
        background: rgba(255, 255, 255, 0.2) !important;
        color: #ffffff !important;
        transform: scale(1.08) !important;
      }
      [data-theme="light"] .lm-update-close-btn {
        background: rgba(0, 0, 0, 0.06) !important;
        border: 1px solid rgba(0, 0, 0, 0.1) !important;
        color: #64748b !important;
      }
      [data-theme="light"] .lm-update-close-btn:hover,
      [data-theme="light"] .lm-update-close-btn:active {
        background: rgba(0, 0, 0, 0.12) !important;
        color: #0f172a !important;
      }
      .lm-update-header {
        display: flex !important;
        align-items: center !important;
        gap: 14px !important;
        margin-bottom: 18px !important;
        padding-right: 28px !important;
      }
      .lm-update-icon-wrap {
        width: 48px !important;
        height: 48px !important;
        min-width: 48px !important;
        border-radius: 16px !important;
        background: linear-gradient(135deg, #00d4b4 0%, #3b82f6 100%) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 24px !important;
        box-shadow: 0 8px 20px rgba(0, 212, 180, 0.3) !important;
      }
      .lm-update-title-wrap {
        flex: 1 !important;
        min-width: 0 !important;
      }
      .lm-update-title-row {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
        margin-bottom: 4px !important;
      }
      .lm-update-title {
        margin: 0 !important;
        font-size: 17px !important;
        font-weight: 700 !important;
        letter-spacing: -0.3px !important;
        color: #ffffff !important;
      }
      [data-theme="light"] .lm-update-title {
        color: #0f172a !important;
      }
      .lm-update-badge {
        display: inline-flex !important;
        align-items: center !important;
        padding: 2px 8px !important;
        border-radius: 99px !important;
        font-size: 11px !important;
        font-weight: 700 !important;
        letter-spacing: 0.2px !important;
        background: rgba(0, 212, 180, 0.2) !important;
        color: #00d4b4 !important;
        border: 1px solid rgba(0, 212, 180, 0.4) !important;
      }
      [data-theme="light"] .lm-update-badge {
        background: rgba(13, 148, 136, 0.12) !important;
        color: #0d9488 !important;
        border-color: rgba(13, 148, 136, 0.3) !important;
      }
      .lm-update-subtitle {
        margin: 0 !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        color: #94a3b8 !important;
      }
      [data-theme="light"] .lm-update-subtitle {
        color: #64748b !important;
      }
      .lm-update-notes-box {
        background: rgba(255, 255, 255, 0.05) !important;
        border: 1px solid rgba(255, 255, 255, 0.09) !important;
        border-radius: 14px !important;
        padding: 14px !important;
        margin-bottom: 20px !important;
        font-size: 12.5px !important;
        line-height: 1.5 !important;
        box-sizing: border-box !important;
      }
      [data-theme="light"] .lm-update-notes-box {
        background: #f1f5f9 !important;
        border: 1px solid #e2e8f0 !important;
      }
      .lm-update-notes-heading {
        font-weight: 700 !important;
        color: #e2e8f0 !important;
        margin-bottom: 6px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        font-size: 12px !important;
      }
      [data-theme="light"] .lm-update-notes-heading {
        color: #334155 !important;
      }
      .lm-update-notes-content {
        color: #cbd5e1 !important;
        word-break: break-word !important;
      }
      [data-theme="light"] .lm-update-notes-content {
        color: #475569 !important;
      }
      .lm-update-progress-wrap {
        margin-bottom: 20px !important;
        box-sizing: border-box !important;
      }
      .lm-update-progress-info {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        color: #cbd5e1 !important;
        margin-bottom: 8px !important;
      }
      [data-theme="light"] .lm-update-progress-info {
        color: #334155 !important;
      }
      .lm-update-progress-track {
        width: 100% !important;
        height: 10px !important;
        background: rgba(255, 255, 255, 0.1) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 99px !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        position: relative !important;
      }
      [data-theme="light"] .lm-update-progress-track {
        background: #e2e8f0 !important;
        border: 1px solid #cbd5e1 !important;
      }
      .lm-update-progress-fill {
        height: 100% !important;
        border-radius: 99px !important;
        background: linear-gradient(90deg, #00d4b4 0%, #3b82f6 100%) !important;
        box-shadow: 0 0 12px rgba(0, 212, 180, 0.5) !important;
        transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      .lm-update-actions {
        display: flex !important;
        gap: 12px !important;
        box-sizing: border-box !important;
      }
      .lm-update-btn-dismiss {
        flex: 1 !important;
        min-height: 44px !important;
        padding: 10px 16px !important;
        border-radius: 12px !important;
        background: rgba(255, 255, 255, 0.06) !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        color: #94a3b8 !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-decoration: none !important;
        box-shadow: none !important;
      }
      .lm-update-btn-dismiss:hover,
      .lm-update-btn-dismiss:active {
        background: rgba(255, 255, 255, 0.14) !important;
        color: #ffffff !important;
        transform: translateY(-1px) !important;
      }
      [data-theme="light"] .lm-update-btn-dismiss {
        background: #f1f5f9 !important;
        border: 1px solid #cbd5e1 !important;
        color: #475569 !important;
      }
      [data-theme="light"] .lm-update-btn-dismiss:hover,
      [data-theme="light"] .lm-update-btn-dismiss:active {
        background: #e2e8f0 !important;
        color: #0f172a !important;
      }
      .lm-update-btn-install {
        flex: 1.3 !important;
        min-height: 44px !important;
        padding: 10px 16px !important;
        border-radius: 12px !important;
        background: linear-gradient(135deg, #00d4b4 0%, #10b981 100%) !important;
        border: none !important;
        color: #042f2c !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        box-shadow: 0 6px 18px rgba(0, 212, 180, 0.35) !important;
        transition: all 0.2s ease !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        text-decoration: none !important;
      }
      .lm-update-btn-install:hover {
        filter: brightness(1.08) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 8px 22px rgba(0, 212, 180, 0.45) !important;
      }
      .lm-update-btn-install:active {
        transform: scale(0.98) !important;
      }
      .lm-update-btn-install:disabled {
        opacity: 0.65 !important;
        cursor: not-allowed !important;
        transform: none !important;
      }
      @keyframes lmUpdateFadeIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }
      @keyframes lmUpdateSlideUp {
        0% { opacity: 0; transform: translateY(16px) scale(0.96); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  function renderUpdateUI(currentVer, remoteMeta) {
    if (_activeModal) {
      try { _activeModal.remove(); } catch(e) {}
      _activeModal = null;
    }

    injectModalStyles();

    const currentCode = Number(currentVer.versionCode) || 1;
    const remoteCode  = Number(remoteMeta.apkVersionCode) || 1;
    const currentName = currentVer.versionName || '1.0.0';
    const remoteName  = remoteMeta.apkVersionName || `1.0.${remoteCode}`;
    const notes       = remoteMeta.releaseNotes || 'Latest performance enhancements, live market feeds, and security upgrades.';
    const apkUrl      = remoteMeta.apkDownloadUrl || 'https://github.com/JeeventhiranV/LedgerMate/releases/download/latest/app-release.apk';

    const overlay = document.createElement('div');
    overlay.id = 'lmAppUpdateModal';
    overlay.className = 'lm-update-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    overlay.innerHTML = `
      <div class="lm-update-card" id="lmUpdateCard">
        <button class="lm-update-close-btn" id="lmUpdateCloseBtn" title="Dismiss" aria-label="Close">✕</button>

        <div class="lm-update-header">
          <div class="lm-update-icon-wrap">
            🚀
          </div>
          <div class="lm-update-title-wrap">
            <div class="lm-update-title-row">
              <h3 class="lm-update-title">New Update Available!</h3>
              <span class="lm-update-badge">v${remoteName}</span>
            </div>
            <p class="lm-update-subtitle">Installed: v${currentName}</p>
          </div>
        </div>

        <div class="lm-update-notes-box">
          <div class="lm-update-notes-heading">
            <span>✨ What's New:</span>
          </div>
          <div class="lm-update-notes-content">${notes}</div>
        </div>

        <div id="lmUpdateProgressContainer" class="lm-update-progress-wrap" style="display:none;">
          <div class="lm-update-progress-info">
            <span id="lmUpdateStatusText">Downloading package...</span>
            <span id="lmUpdatePercentText">0%</span>
          </div>
          <div class="lm-update-progress-track">
            <div id="lmUpdateProgressBar" class="lm-update-progress-fill" style="width: 0%;"></div>
          </div>
        </div>

        <div id="lmUpdateActionButtons" class="lm-update-actions">
          <button id="lmUpdateDismissBtn" class="lm-update-btn-dismiss" type="button">
            Remind Later
          </button>
          <button id="lmUpdateNowBtn" class="lm-update-btn-install" type="button">
            <span>⬇️ Install Update</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    _activeModal = overlay;

    let isDownloading = false;

    function closeModal(saveCooldown = true) {
      if (isDownloading) return; // do not close during active download
      if (saveCooldown) {
        try {
          localStorage.setItem('lm_update_snooze_code', String(remoteCode));
          localStorage.setItem('lm_update_snooze_time', String(Date.now()));
        } catch (e) {}
      }
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      _activeModal = null;
    }

    const card = overlay.querySelector('#lmUpdateCard');
    const closeBtn = overlay.querySelector('#lmUpdateCloseBtn');
    const dismissBtn = overlay.querySelector('#lmUpdateDismissBtn');
    const updateBtn  = overlay.querySelector('#lmUpdateNowBtn');
    const progressWrap = overlay.querySelector('#lmUpdateProgressContainer');
    const statusText   = overlay.querySelector('#lmUpdateStatusText');
    const percentText  = overlay.querySelector('#lmUpdatePercentText');
    const progressBar  = overlay.querySelector('#lmUpdateProgressBar');

    // Prevent clicks on the card from propagating to the overlay or dashboard
    card.addEventListener('click', (e) => e.stopPropagation());

    // Dismiss events
    closeBtn.addEventListener('click', () => closeModal(true));
    dismissBtn.addEventListener('click', () => closeModal(true));
    overlay.addEventListener('click', () => closeModal(true));

    // Install Action
    updateBtn.addEventListener('click', () => {
      // If permission is already needed or we have a downloaded package ready
      if (window.AndroidBridge && typeof window.AndroidBridge.canInstallApk === 'function') {
        const hasPermission = window.AndroidBridge.canInstallApk();
        const hasDownloaded = typeof window.AndroidBridge.hasDownloadedUpdate === 'function' && window.AndroidBridge.hasDownloadedUpdate();

        if (!hasPermission) {
          statusText.textContent = '⚠️ Enable "Allow from this source" in Android Settings, then return to LedgerMate.';
          updateBtn.innerHTML = '<span>⚙️ Open Settings</span>';
          if (typeof window.AndroidBridge.requestInstallPermission === 'function') {
            window.AndroidBridge.requestInstallPermission();
          }
          return;
        }

        if (hasDownloaded) {
          isDownloading = false;
          progressWrap.style.display = 'block';
          progressBar.style.width = '100%';
          percentText.textContent = '100%';
          statusText.textContent = '🚀 Launching Package Installer...';
          updateBtn.disabled = true;
          updateBtn.innerHTML = '<span>🚀 Launching Installer...</span>';
          const callbackId = 'cb_update_' + Date.now();
          window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};
          window.LM_NativeBridgeCallbacks[callbackId] = handleNativeCallback;
          window.AndroidBridge.installPendingUpdate(callbackId);
          return;
        }
      }

      startApkDownload();
    });

    function handleNativeCallback(data) {
      if (!data) return;

      if (data.status === 'downloading') {
        const p = Math.max(0, Math.min(100, data.progress || 0));
        progressBar.style.width = p + '%';
        percentText.textContent = p + '%';
        statusText.textContent = data.message || `Downloading update (${p}%)...`;
        updateBtn.innerHTML = `<span>⬇️ Downloading ${p}%</span>`;
      } else if (data.status === 'installing' || data.status === 'complete') {
        try {
          localStorage.setItem('lm_update_snooze_code', String(remoteCode));
          localStorage.setItem('lm_update_snooze_time', String(Date.now()));
        } catch (e) {}
        progressBar.style.width = '100%';
        percentText.textContent = '100%';
        statusText.textContent = '✅ Installer Launched! Follow the system prompt to finish.';
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<span>✅ Installer Active</span>';
        // Keep modal visible for 10s or until dismissed
        setTimeout(() => {
          if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
          _activeModal = null;
        }, 10000);
      } else if (data.status === 'permission_required') {
        isDownloading = false;
        statusText.textContent = '⚠️ Enable "Allow from this source" in Settings, then return here.';
        updateBtn.disabled = false;
        dismissBtn.style.display = 'inline-flex';
        closeBtn.style.display = 'flex';
        updateBtn.innerHTML = '<span>⚙️ Grant Permission & Install</span>';
      } else if (data.status === 'error') {
        isDownloading = false;
        statusText.textContent = '❌ ' + (data.error || 'Download failed');
        updateBtn.disabled = false;
        closeBtn.style.display = 'flex';
        dismissBtn.style.display = 'inline-flex';
        updateBtn.innerHTML = '<span>🔄 Retry Download</span>';
      }
    }

    function startApkDownload() {
      isDownloading = true;
      updateBtn.disabled = true;
      closeBtn.style.display = 'none';
      dismissBtn.style.display = 'none';
      progressWrap.style.display = 'block';
      progressBar.style.width = '5%';
      percentText.textContent = '0%';
      statusText.textContent = 'Connecting to server...';
      updateBtn.innerHTML = '<span>⏳ Preparing Download...</span>';

      const callbackId = 'cb_update_' + Date.now();
      window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};
      window.LM_NativeBridgeCallbacks[callbackId] = handleNativeCallback;

      try {
        window.AndroidBridge.downloadAndInstallApk(apkUrl, callbackId);
      } catch (err) {
        isDownloading = false;
        statusText.textContent = '❌ Native error: ' + err.message;
        updateBtn.disabled = false;
        closeBtn.style.display = 'flex';
        dismissBtn.style.display = 'inline-flex';
        updateBtn.innerHTML = '<span>🔄 Retry</span>';
      }
    }

    // Auto-resume check when user returns from Android Settings
    function onAppResume() {
      if (!overlay || !overlay.parentNode) return;
      if (window.AndroidBridge && typeof window.AndroidBridge.canInstallApk === 'function') {
        if (window.AndroidBridge.canInstallApk() && window.AndroidBridge.hasDownloadedUpdate()) {
          statusText.textContent = '🚀 Permission granted! Launching installer...';
          updateBtn.disabled = true;
          updateBtn.innerHTML = '<span>🚀 Launching Installer...</span>';
          const callbackId = 'cb_resume_' + Date.now();
          window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};
          window.LM_NativeBridgeCallbacks[callbackId] = handleNativeCallback;
          window.AndroidBridge.installPendingUpdate(callbackId);
        }
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onAppResume();
    });
    window.addEventListener('focus', onAppResume);
  }

  async function checkForUpdates(manual = false) {
    if (_checking) return;
    const now = Date.now();
    if (!manual && now - _lastCheckedTime < 30000) return; // rate limit background checks to 30s

    _checking = true;
    _lastCheckedTime = now;

    // Sidebar button feedback if manually triggered
    const sidebarBtn = document.getElementById('sidebarCheckUpdateBtn');
    const updateIcon = document.getElementById('sidebarUpdateIcon');
    const updateLabel = document.getElementById('sidebarUpdateLabel');
    if (manual && sidebarBtn) {
      if (updateIcon) updateIcon.style.animation = 'lmSpin 0.8s linear infinite';
      if (updateLabel) updateLabel.textContent = 'Checking...';
    }

    if (manual) {
      showNotificationToast('Checking for latest updates...', 'info');
    }

    function resetSidebarBtn() {
      if (sidebarBtn) {
        if (updateIcon) updateIcon.style.animation = '';
        if (updateLabel) updateLabel.textContent = 'Check for Updates';
      }
    }

    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          reg.update().catch(() => {});
        }).catch(() => {});
      }

      const remoteMeta = await fetchLatestVersionMeta();
      const isNative = isNativeAndroid();
      const currentVer = getInstalledVersion();
      const currentCode = Number(currentVer.versionCode) || 1;
      const remoteCode  = Number(remoteMeta && (remoteMeta.apkVersionCode || remoteMeta.versionCode)) || currentCode;

      if (!isNative) {
        // Web / PWA mode
        if (remoteMeta) {
          const verName = remoteMeta.apkVersionName || remoteMeta.version || 'v1.0.0';
          if (manual) {
            showNotificationToast(`App is up to date! (${verName})`, 'success');
          }
        } else {
          if (manual) {
            showNotificationToast('App is up to date! (v1.0.0)', 'success');
          }
        }
        updateSidebarVersionBadge(false);
        return;
      }

      // Native Android APK mode
      if (!remoteMeta) {
        if (manual) {
          showNotificationToast('⚠️ Could not connect to update server.', 'warning');
        }
        return;
      }

      console.log(`[AppUpdate] Installed: v${currentVer.versionName} (${currentCode}), Remote: v${remoteMeta.apkVersionName} (${remoteCode})`);

      if (remoteCode > currentCode) {
        updateSidebarVersionBadge(true);
        if (!manual) {
          // Check snooze cooldown
          const snoozeCode = localStorage.getItem('lm_update_snooze_code');
          const snoozeTime = Number(localStorage.getItem('lm_update_snooze_time') || 0);
          if (snoozeCode === String(remoteCode) && (now - snoozeTime < DISMISS_COOLDOWN_MS)) {
            console.log('[AppUpdate] Update snoozed until cooldown expires.');
            return;
          }
        }
        renderUpdateUI(currentVer, remoteMeta);
      } else {
        updateSidebarVersionBadge(false);
        if (manual) {
          showNotificationToast(`You're on the latest version (v${currentVer.versionName})`, 'success');
        }
      }
    } catch (e) {
      console.warn('[AppUpdate] Check failed:', e);
      if (manual) {
        showNotificationToast('Check for updates completed.', 'info');
      }
    } finally {
      _checking = false;
      resetSidebarBtn();
    }
  }

  // Expose Globally & Centralize across all modules
  const AppUpdateAPI = {
    checkForUpdates: checkForUpdates,
    getInstalledVersion: getInstalledVersion,
    isNativeAndroid: isNativeAndroid,
    updateSidebarVersionBadge: updateSidebarVersionBadge,
    fetchLatestVersionMeta: fetchLatestVersionMeta,
    showToast: showNotificationToast
  };

  window.LM_AppUpdateService = AppUpdateAPI;
  window.AppUpdateService = AppUpdateAPI;

  // Immediate badge refresh on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      updateSidebarVersionBadge(false);
      setTimeout(() => checkForUpdates(false), 2000);
    });
  } else {
    updateSidebarVersionBadge(false);
    setTimeout(() => checkForUpdates(false), 2000);
  }

  // Check on app foreground/visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(() => checkForUpdates(false), 2000);
    }
  });

})();
