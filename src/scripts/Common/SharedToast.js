/**
 * LedgerMate Unified Toast System (SharedToast.js)
 * ─────────────────────────────────────────────────────────────
 * Cross-platform modern toast notification system for LedgerMate & Study Hub.
 * Exposes: window.showToast, window.LMToast
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var ICONS = {
    success: '✅',
    ok:      '✅',
    error:   '❌',
    err:     '❌',
    warning: '⚠️',
    warn:    '⚠️',
    info:    'ℹ️',
    cloud:   '☁️'
  };

  function _injectStyles() {
    if (document.getElementById('lm-shared-toast-style')) return;
    var style = document.createElement('style');
    style.id = 'lm-shared-toast-style';
    style.textContent = `
      #lm-toast-container {
        position: fixed;
        top: calc(58px + env(safe-area-inset-top, 0px));
        right: 12px;
        left: auto;
        bottom: auto;
        transform: none;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        pointer-events: none;
        max-width: 280px;
        width: auto;
      }
      @media (max-width: 480px) {
        #lm-toast-container {
          top: calc(56px + env(safe-area-inset-top, 0px));
          right: 10px;
          max-width: 260px;
        }
      }
      .lm-toast-item {
        background: rgba(18, 22, 34, 0.95);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #f1f5f9;
        border-radius: 12px;
        padding: 8px 12px;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.35;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
        display: flex;
        align-items: center;
        gap: 8px;
        pointer-events: auto;
        opacity: 0;
        transform: translateX(30px) scale(0.96);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        min-width: 180px;
        max-width: 270px;
        width: auto;
        box-sizing: border-box;
      }
      .lm-toast-item.lm-toast-show {
        opacity: 1;
        transform: translateX(0) scale(1);
      }
      .lm-toast-item.lm-toast-hide {
        opacity: 0;
        transform: translateX(30px) scale(0.94);
      }
      .lm-toast-success { border-left: 4px solid #10b981; }
      .lm-toast-error   { border-left: 4px solid #f43f5e; }
      .lm-toast-warning { border-left: 4px solid #f59e0b; }
      .lm-toast-info    { border-left: 4px solid #3b82f6; }
      .lm-toast-cloud   { border-left: 4px solid #06b6d4; }
      .lm-toast-icon    { font-size: 16px; flex-shrink: 0; }
      .lm-toast-msg     { flex: 1; word-break: break-word; }
      .lm-toast-close   {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 16px;
        cursor: pointer;
        padding: 0 4px;
        line-height: 1;
        transition: color 0.15s;
      }
      .lm-toast-close:hover { color: #f1f5f9; }
    `;
    document.head.appendChild(style);
  }

  function _getContainer() {
    _injectStyles();
    var c = document.getElementById('lm-toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'lm-toast-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function show(message, type, duration) {
    if (!message) return;
    type = (type || 'info').toLowerCase();
    duration = duration || (type === 'error' || type === 'err' ? 4500 : 3200);

    var container = _getContainer();
    var toast = document.createElement('div');
    var normalizedType = (type === 'ok' || type === 'success') ? 'success' :
                         (type === 'err' || type === 'error') ? 'error' :
                         (type === 'warn' || type === 'warning') ? 'warning' :
                         (type === 'cloud') ? 'cloud' : 'info';

    toast.className = 'lm-toast-item lm-toast-' + normalizedType;
    var icon = ICONS[type] || ICONS[normalizedType] || '💡';

    // Normalize message & strip leading emoji to prevent duplicate icons (e.g. ✅ ✅)
    var cleanMsg = String(message).trim();
    var leadingEmojiMatch = cleanMsg.match(/^([\u2300-\u23FF\u2600-\u27BF\uFE00-\uFE0F\uD83C-\uDBFF\uDC00-\uDFFF\u200D]+)\s*/);
    if (leadingEmojiMatch) {
      icon = leadingEmojiMatch[1];
      cleanMsg = cleanMsg.slice(leadingEmojiMatch[0].length);
    }

    toast.innerHTML = `
      <span class="lm-toast-icon">${icon}</span>
      <span class="lm-toast-msg">${cleanMsg}</span>
      <button class="lm-toast-close" aria-label="Dismiss">&times;</button>
    `;

    toast.querySelector('.lm-toast-close').onclick = function () {
      _dismiss(toast);
    };

    container.appendChild(toast);
    requestAnimationFrame(function () {
      toast.classList.add('lm-toast-show');
    });

    var timer = setTimeout(function () {
      _dismiss(toast);
    }, duration);

    toast.addEventListener('mouseenter', function () { clearTimeout(timer); });
    toast.addEventListener('mouseleave', function () {
      timer = setTimeout(function () { _dismiss(toast); }, 1500);
    });
  }

  function _dismiss(toast) {
    if (!toast || !toast.parentElement) return;
    toast.classList.remove('lm-toast-show');
    toast.classList.add('lm-toast-hide');
    setTimeout(function () {
      if (toast.parentElement) toast.parentElement.removeChild(toast);
    }, 250);
  }

  // Global exports for backward compatibility
  window.showToast = function (msg, type, ms) { show(msg, type, ms); };
  window.LMToast = {
    show: show,
    ok:   function (m, ms) { show(m, 'success', ms); },
    err:  function (m, ms) { show(m, 'error', ms); },
    warn: function (m, ms) { show(m, 'warning', ms); },
    info: function (m, ms) { show(m, 'info', ms); }
  };
})();
