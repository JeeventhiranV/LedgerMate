/* pwa-install.js — universal PWA install prompt for every page
   Strategy:
     1. Un-hides all in-page install triggers (#pwaInstallBtn, .pwa-install-trigger, [data-pwa-install]).
     2. Provides window.LM_PWA.install() for clean invocation from Sidebar, User Menu, or Settings.
     3. Never overlaps the bottom-right action FABs (+) or bottom navigation bar.
*/
(function () {
  'use strict';

  var _deferred = null;

  function _updateTriggers(show) {
    var triggers = document.querySelectorAll('#pwaInstallBtn, .pwa-install-trigger, [data-pwa-install]');
    triggers.forEach(function (el) {
      if (show) {
        el.style.display = '';
        el.classList.add('visible');
      } else {
        el.style.display = 'none';
        el.classList.remove('visible');
      }
    });
  }

  function _triggerInstall() {
    if (!_deferred) {
      if (window.LMToast) {
        LMToast.info('App can be installed via your browser menu (⋮ / ↗ ➔ Install / Add to Home Screen).');
      } else if (typeof showToast === 'function') {
        showToast('Install via your browser menu (Add to Home Screen).', 'info');
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
    // Listen for BeforeInstallPrompt
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
        LMToast.ok('LedgerMate installed! Launch it anytime from your home screen or app drawer.');
      } else if (typeof showToast === 'function') {
        showToast('App installed to your device!', 'success');
      }
    });
  }

  window.LM_PWA = {
    install: _triggerInstall,
    isInstallable: function () { return !!_deferred; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
}());
