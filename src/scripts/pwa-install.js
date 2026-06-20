/* pwa-install.js — universal PWA install prompt for every page
   Drop this script into any page and it handles the rest.
   Strategy:
     1. If the page has a #pwaInstallBtn element → show/hide it.
     2. Otherwise → inject a floating "Install App" pill button automatically.
   Works on: index.html, study/index.html, any future page.
*/
(function () {
  'use strict';

  var _deferred = null;  // the captured BeforeInstallPromptEvent

  /* ── Inject floating button (fallback when no #pwaInstallBtn exists) ── */
  function _injectFloatingBtn() {
    if (document.getElementById('pwaInstallBtn')) return; // page already has one
    var style = document.createElement('style');
    style.textContent =
      '#pwaInstallBtn{position:fixed;bottom:80px;right:18px;z-index:9000;' +
      'display:none;align-items:center;gap:7px;' +
      'background:linear-gradient(135deg,#4f8ef7,#8b5cf6);' +
      'color:#fff;border:none;border-radius:24px;' +
      'padding:10px 18px;font-size:13px;font-weight:700;' +
      'font-family:Inter,sans-serif;cursor:pointer;' +
      'box-shadow:0 4px 20px rgba(79,142,247,.45);' +
      'transition:opacity .2s,transform .2s;}' +
      '#pwaInstallBtn.visible{display:inline-flex;}' +
      '#pwaInstallBtn:hover{opacity:.88;transform:scale(1.04);}';
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.id = 'pwaInstallBtn';
    btn.innerHTML = '⬇&nbsp; Install App';
    btn.setAttribute('aria-label', 'Install LedgerMate as an app');
    document.body.appendChild(btn);
  }

  /* ── Core logic ── */
  function _init() {
    _injectFloatingBtn();

    var btn = document.getElementById('pwaInstallBtn');

    /* capture the browser's install prompt */
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      _deferred = e;
      if (btn) btn.classList.add('visible');
    });

    /* trigger the native prompt on click */
    if (btn) {
      btn.addEventListener('click', function () {
        if (!_deferred) return;
        _deferred.prompt();
        _deferred.userChoice.then(function (choice) {
          if (choice.outcome === 'accepted') btn.classList.remove('visible');
          _deferred = null;
        });
      });
    }

    /* clean up after a successful install */
    window.addEventListener('appinstalled', function () {
      if (btn) btn.classList.remove('visible');
      _deferred = null;
      /* show a toast if LMToast is available on this page */
      if (window.LMToast) {
        LMToast.ok('App installed! Open from your home screen.');
      } else if (typeof showToast === 'function') {
        showToast('App installed! Open from your home screen.', 'success');
      }
    });
  }

  /* Run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
}());
