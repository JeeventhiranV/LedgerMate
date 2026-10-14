/* pwa-install.js — smart universal app install & APK download router
   Strategy:
     1. If inside native Android APK (window.AndroidBridge.isNativeApp):
        Hide install button (user is already running the installed app).
     2. If Mobile Web (Android):
        Show "Install App" trigger. Clicking directly downloads the latest
        Android APK (LedgerMate.apk) from GitHub releases and guides the user.
     3. If Mobile Web (iOS):
        Show guide on how to Add to Home Screen via Safari Share menu.
     4. If Laptop / Desktop Web:
        Standard PWA install prompt via beforeinstallprompt.
*/
(function () {
  'use strict';

  var _deferred = null;
  var LATEST_APK_URL = 'https://github.com/JeeventhiranV/LedgerMate/releases/download/latest/app-release.apk';

  function isNativeApp() {
    return !!(window.AndroidBridge && typeof window.AndroidBridge.isNativeApp === 'function' && window.AndroidBridge.isNativeApp());
  }

  function isAndroidDevice() {
    return /Android/i.test(navigator.userAgent);
  }

  function isIosDevice() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function isMobileDevice() {
    return isAndroidDevice() || isIosDevice() || /webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
  }

  function _updateTriggers(show) {
    if (isNativeApp()) {
      show = false; // Never show install button inside the native app itself
    }

    var triggers = document.querySelectorAll('#pwaInstallBtn, .pwa-install-trigger, [data-pwa-install]');
    triggers.forEach(function (el) {
      if (show) {
        el.style.display = '';
        el.classList.add('visible');

        // Enhance label on mobile if desired
        var labelEl = el.querySelector('.nav-label');
        if (labelEl && isAndroidDevice()) {
          labelEl.textContent = 'Install App (APK)';
        }
      } else {
        el.style.display = 'none';
        el.classList.remove('visible');
      }
    });
  }

  function _downloadAndroidApk() {
    if (window.LMToast) {
      LMToast.ok('Downloading LedgerMate Android APK... Once downloaded, tap to install.');
    } else if (typeof showToast === 'function') {
      showToast('Downloading LedgerMate APK...', 'success');
    }

    var a = document.createElement('a');
    a.href = LATEST_APK_URL;
    a.download = 'LedgerMate.apk';
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
    }, 1000);
  }

  function _triggerInstall() {
    // 1. If inside native app
    if (isNativeApp()) {
      if (window.LMToast) LMToast.info('LedgerMate is already installed and running.');
      return;
    }

    // 2. If Android Mobile Web -> download latest APK
    if (isAndroidDevice()) {
      _downloadAndroidApk();
      return;
    }

    // 3. If iOS Mobile Web -> show Add to Home Screen instructions
    if (isIosDevice()) {
      if (window.LMToast) {
        LMToast.info('To install LedgerMate on iOS: tap the Share button ⎋ at bottom of Safari, then tap "Add to Home Screen" ➕.');
      } else if (typeof showToast === 'function') {
        showToast('Tap Share ⎋ ➔ Add to Home Screen ➕ to install.', 'info');
      }
      return;
    }

    // 4. Laptop / Desktop Web -> trigger standard PWA prompt
    if (!_deferred) {
      if (window.LMToast) {
        LMToast.info('Click the install icon ⊕ in your browser address bar or menu (⋮) to install LedgerMate.');
      } else if (typeof showToast === 'function') {
        showToast('Install via your browser address bar or menu.', 'info');
      }
      return;
    }

    _deferred.prompt();
    _deferred.userChoice.then(function (choice) {
      if (choice && choice.outcome === 'accepted') {
        _updateTriggers(false);
      }
      _deferred = null;
    });
  }

  function _init() {
    // If native APK, hide install triggers and bail early
    if (isNativeApp()) {
      _updateTriggers(false);
      return;
    }

    // If mobile (Android or iOS), triggers are visible by default
    if (isMobileDevice()) {
      _updateTriggers(true);
    }

    // Listen for BeforeInstallPrompt (primarily desktop/laptop PWA)
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      _deferred = e;
      _updateTriggers(true);
    });

    // Attach click handlers to any present install triggers
    document.addEventListener('click', function (e) {
      var target = e.target.closest('#pwaInstallBtn, .pwa-install-trigger, [data-pwa-install]');
      if (target) {
        e.preventDefault();
        _triggerInstall();
      }
    });

    // On successful install
    window.addEventListener('appinstalled', function () {
      _updateTriggers(false);
      _deferred = null;
      if (window.LMToast) {
        LMToast.ok('LedgerMate installed! Launch it anytime from your desktop or home screen.');
      } else if (typeof showToast === 'function') {
        showToast('App installed to your device!', 'success');
      }
    });
  }

  window.LM_PWA = {
    install: _triggerInstall,
    isInstallable: function () { return !!_deferred || isMobileDevice(); },
    downloadApk: _downloadAndroidApk,
    isNativeApp: isNativeApp,
    isMobileDevice: isMobileDevice,
    isAndroidDevice: isAndroidDevice
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
