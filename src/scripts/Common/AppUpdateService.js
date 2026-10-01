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

  async function fetchLatestVersionMeta() {
    try {
      const res = await fetch('version.json?_t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  function renderUpdateUI(currentVer, remoteMeta) {
    if (_activeModal) _activeModal.remove();

    const currentCode = Number(currentVer.versionCode) || 1;
    const remoteCode  = Number(remoteMeta.apkVersionCode) || 1;
    const currentName = currentVer.versionName || '1.0.0';
    const remoteName  = remoteMeta.apkVersionName || `1.0.${remoteCode}`;
    const notes       = remoteMeta.releaseNotes || 'Latest performance enhancements, live market feeds, and security upgrades.';
    const apkUrl      = remoteMeta.apkDownloadUrl || 'https://github.com/JeeventhiranV/LedgerMate/releases/download/latest/app-release.apk';

    const overlay = document.createElement('div');
    overlay.id = 'lmAppUpdateModal';
    overlay.className = 'fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in';
    overlay.style.animation = 'lmFadeIn 0.25s ease-out forwards';

    overlay.innerHTML = `
      <div class="w-full max-w-md bg-[#131722] border border-[#2a2e39] rounded-2xl p-6 shadow-2xl text-white relative">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-2xl shadow-lg shadow-teal-500/20">
            🚀
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-100 flex items-center gap-2">
              New Update Available!
              <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">v${remoteName}</span>
            </h3>
            <p class="text-xs text-slate-400">Current version: v${currentName}</p>
          </div>
        </div>

        <div class="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-3.5 mb-5 text-xs text-slate-300 space-y-1.5">
          <div class="font-semibold text-slate-200 flex items-center gap-1.5">
            <span>✨ What's New:</span>
          </div>
          <p class="text-slate-300 leading-relaxed">${notes}</p>
        </div>

        <div id="lmUpdateProgressContainer" class="hidden mb-5">
          <div class="flex justify-between text-xs font-medium text-slate-300 mb-1.5">
            <span id="lmUpdateStatusText">Downloading package...</span>
            <span id="lmUpdatePercentText">0%</span>
          </div>
          <div class="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div id="lmUpdateProgressBar" class="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-200" style="width: 0%"></div>
          </div>
        </div>

        <div id="lmUpdateActionButtons" class="flex gap-3">
          <button id="lmUpdateDismissBtn" class="flex-1 px-4 py-2.5 rounded-xl border border-[#2a2e39] text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-all">
            Remind Later
          </button>
          <button id="lmUpdateNowBtn" class="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-1.5">
            <span>⬇️ Install Update</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    _activeModal = overlay;

    const dismissBtn = overlay.querySelector('#lmUpdateDismissBtn');
    const updateBtn  = overlay.querySelector('#lmUpdateNowBtn');
    const progressWrap = overlay.querySelector('#lmUpdateProgressContainer');
    const statusText   = overlay.querySelector('#lmUpdateStatusText');
    const percentText  = overlay.querySelector('#lmUpdatePercentText');
    const progressBar  = overlay.querySelector('#lmUpdateProgressBar');

    dismissBtn.addEventListener('click', () => {
      overlay.remove();
      _activeModal = null;
    });

    updateBtn.addEventListener('click', () => {
      updateBtn.disabled = true;
      dismissBtn.style.display = 'none';
      progressWrap.classList.remove('hidden');
      updateBtn.textContent = 'Preparing Download...';

      const callbackId = 'cb_update_' + Date.now();
      window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};

      window.LM_NativeBridgeCallbacks[callbackId] = function (data) {
        if (!data) return;

        if (data.status === 'downloading') {
          const p = Math.max(0, Math.min(100, data.progress || 0));
          progressBar.style.width = p + '%';
          percentText.textContent = p + '%';
          statusText.textContent = data.message || `Downloading update (${p}%)...`;
          updateBtn.textContent = `Downloading ${p}%`;
        } else if (data.status === 'installing' || data.status === 'complete') {
          progressBar.style.width = '100%';
          percentText.textContent = '100%';
          statusText.textContent = 'Launching Installer...';
          updateBtn.textContent = '✅ Launching Installer...';
          setTimeout(() => {
            if (overlay && overlay.parentNode) overlay.remove();
            _activeModal = null;
          }, 4000);
        } else if (data.status === 'permission_required') {
          statusText.textContent = '⚠️ Permission required: Allow install from this source';
          updateBtn.disabled = false;
          updateBtn.textContent = '🔄 Retry Installation';
        } else if (data.status === 'error') {
          statusText.textContent = '❌ Error: ' + (data.error || 'Failed to download update');
          updateBtn.disabled = false;
          dismissBtn.style.display = 'block';
          updateBtn.textContent = '🔄 Retry';
        }
      };

      try {
        window.AndroidBridge.downloadAndInstallApk(apkUrl, callbackId);
      } catch (err) {
        statusText.textContent = '❌ Native bridge error: ' + err.message;
        updateBtn.disabled = false;
        dismissBtn.style.display = 'block';
        updateBtn.textContent = '🔄 Retry';
      }
    });
  }

  async function checkForUpdates(manual = false) {
    if (_checking) return;
    const now = Date.now();
    if (!manual && now - _lastCheckedTime < 60000) return; // rate limit background checks to 1 min

    _checking = true;
    _lastCheckedTime = now;

    try {
      if (!isNativeAndroid()) {
        if (manual && typeof window.showToast === 'function') {
          window.showToast('Web version is always up to date automatically.', 'info');
        }
        return;
      }

      const currentVer = getInstalledVersion();
      const remoteMeta = await fetchLatestVersionMeta();

      if (!remoteMeta) {
        if (manual && typeof window.showToast === 'function') {
          window.showToast('Could not fetch update information.', 'warning');
        }
        return;
      }

      const currentCode = Number(currentVer.versionCode) || 1;
      const remoteCode  = Number(remoteMeta.apkVersionCode) || 1;

      console.log(`[AppUpdate] Installed: v${currentVer.versionName} (${currentCode}), Remote: v${remoteMeta.apkVersionName} (${remoteCode})`);

      if (remoteCode > currentCode) {
        renderUpdateUI(currentVer, remoteMeta);
      } else {
        if (manual && typeof window.showToast === 'function') {
          window.showToast(`You have the latest version (v${currentVer.versionName})`, 'success');
        }
      }
    } catch (e) {
      console.warn('[AppUpdate] Check failed:', e);
    } finally {
      _checking = false;
    }
  }

  // Expose Globally
  window.LM_AppUpdateService = {
    checkForUpdates: checkForUpdates,
    getInstalledVersion: getInstalledVersion,
    isNativeAndroid: isNativeAndroid
  };

  // Auto-check on launch after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => checkForUpdates(false), 3500);
    });
  } else {
    setTimeout(() => checkForUpdates(false), 3500);
  }

  // Also check on app foreground/visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      setTimeout(() => checkForUpdates(false), 2000);
    }
  });

})();
