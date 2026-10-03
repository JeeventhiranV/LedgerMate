/**
 * LedgerMate Universal Resilient Haptic Feedback Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides responsive tactile micro-feedback across Web, Android WebView, and PWA.
 * 
 * Features & Resilience:
 * • Multi-layer driver: AndroidBridge, AndroidInterface, iOS WebKit, W3C navigator.vibrate
 * • Complete alias support: light, medium, heavy, selection, success, warning, error
 * • Supports all casing variations: impactLight, impactlight, notificationSuccess, etc.
 * • Bulletproof Proxy fallback: Any unknown or misspelled method safely executes without throwing TypeError.
 * • Negative scenario handling: Gracefully no-ops in unsupported browsers (iOS/Desktop), iframe sandboxes, and permission blocks.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function (global) {
  'use strict';
  if (typeof global === 'undefined') return;

  function _vibrateRaw(pattern) {
    try {
      // Check user preference
      if (global.localStorage && global.localStorage.getItem('lm_haptic_enabled') === 'false') {
        return false;
      }

      // 1. Android WebView Native Bridge
      if (global.AndroidBridge && typeof global.AndroidBridge.vibrate === 'function') {
        var duration = Array.isArray(pattern) ? (pattern[0] || 15) : (Number(pattern) || 15);
        global.AndroidBridge.vibrate(duration);
        return true;
      }
      if (global.AndroidInterface && typeof global.AndroidInterface.vibrate === 'function') {
        var duration2 = Array.isArray(pattern) ? (pattern[0] || 15) : (Number(pattern) || 15);
        global.AndroidInterface.vibrate(duration2);
        return true;
      }

      // 2. iOS WebKit message handler bridge (if embedded in native container)
      if (global.webkit && global.webkit.messageHandlers && global.webkit.messageHandlers.haptic && typeof global.webkit.messageHandlers.haptic.postMessage === 'function') {
        global.webkit.messageHandlers.haptic.postMessage(pattern);
        return true;
      }

      // 3. Standard W3C Vibration API (Modern Android Browsers, Chrome, Firefox)
      var nav = global.navigator || (typeof navigator !== 'undefined' ? navigator : null);
      if (nav && typeof nav.vibrate === 'function') {
        return nav.vibrate(pattern);
      }
    } catch (e) {
      // Silent fail on permission restrictions or iframe policy blocks
    }
    return false;
  }

  var baseHaptic = {
    // ── Primary Actions ──
    light: function () { return _vibrateRaw(10); },
    medium: function () { return _vibrateRaw(25); },
    heavy: function () { return _vibrateRaw(45); },
    selection: function () { return _vibrateRaw(6); },

    // ── Notification Patterns ──
    success: function () { return _vibrateRaw([15, 50, 15]); },
    warning: function () { return _vibrateRaw([35, 45, 35]); },
    error: function () { return _vibrateRaw([50, 60, 50, 60]); },

    // ── Custom Pattern ──
    vibrate: function (pattern) { return _vibrateRaw(pattern || 15); },

    // ── Generic Impact & Notification Router ──
    impact: function (style) {
      var s = String(style || 'light').toLowerCase();
      if (s === 'medium' || s === 'med') return this.medium();
      if (s === 'heavy' || s === 'strong') return this.heavy();
      if (s === 'selection') return this.selection();
      return this.light();
    },
    notification: function (type) {
      var t = String(type || 'success').toLowerCase();
      if (t === 'warning' || t === 'warn') return this.warning();
      if (t === 'error' || t === 'err' || t === 'danger') return this.error();
      return this.success();
    },

    // ── Aliases covering camelCase, lowercase, and snake_case ──
    impactLight: function () { return this.light(); },
    impactlight: function () { return this.light(); },
    impact_light: function () { return this.light(); },

    impactMedium: function () { return this.medium(); },
    impactmedium: function () { return this.medium(); },
    impact_medium: function () { return this.medium(); },

    impactHeavy: function () { return this.heavy(); },
    impactheavy: function () { return this.heavy(); },
    impact_heavy: function () { return this.heavy(); },

    selectionChange: function () { return this.selection(); },
    selectionchange: function () { return this.selection(); },
    selection_change: function () { return this.selection(); },
    click: function () { return this.light(); },

    notificationSuccess: function () { return this.success(); },
    notificationsuccess: function () { return this.success(); },
    notification_success: function () { return this.success(); },

    notificationWarning: function () { return this.warning(); },
    notificationwarning: function () { return this.warning(); },
    notification_warning: function () { return this.warning(); },

    notificationError: function () { return this.error(); },
    notificationerror: function () { return this.error(); },
    notification_error: function () { return this.error(); },

    // ── Diagnostic & Settings Utilities ──
    isSupported: function () {
      try {
        var nav = global.navigator || (typeof navigator !== 'undefined' ? navigator : null);
        return !!(
          (global.AndroidBridge && typeof global.AndroidBridge.vibrate === 'function') ||
          (global.AndroidInterface && typeof global.AndroidInterface.vibrate === 'function') ||
          (global.webkit && global.webkit.messageHandlers && global.webkit.messageHandlers.haptic) ||
          (nav && typeof nav.vibrate === 'function')
        );
      } catch (e) {
        return false;
      }
    },
    isEnabled: function () {
      try {
        return global.localStorage ? global.localStorage.getItem('lm_haptic_enabled') !== 'false' : true;
      } catch (e) {
        return true;
      }
    },
    setEnabled: function (enabled) {
      try {
        if (global.localStorage) global.localStorage.setItem('lm_haptic_enabled', enabled ? 'true' : 'false');
      } catch (e) {}
    },
    toggle: function () {
      var next = !this.isEnabled();
      this.setEnabled(next);
      if (next) this.light();
      return next;
    }
  };

  // Safe Proxy layer so arbitrary or misspelled property accesses never throw "is not a function"
  var safeHaptic = null;
  if (typeof Proxy !== 'undefined') {
    safeHaptic = new Proxy(baseHaptic, {
      get: function (target, prop) {
        if (prop in target) {
          return target[prop];
        }
        // Standard JS object methods / properties
        if (typeof prop === 'symbol' || prop === 'then' || prop === 'toJSON' || prop === 'valueOf' || prop === 'toString') {
          return undefined;
        }
        // Fuzzy / normalized match (e.g. impactLight vs impactlight vs impact_light)
        var lower = String(prop).toLowerCase().replace(/[^a-z0-9]/g, '');
        for (var key in target) {
          if (key.toLowerCase().replace(/[^a-z0-9]/g, '') === lower) {
            return target[key];
          }
        }
        // Graceful fallback for unhandled function calls
        return function () {
          try {
            return target.light();
          } catch (e) {
            return false;
          }
        };
      }
    });
  } else {
    safeHaptic = baseHaptic;
  }

  global.LM_Haptic = safeHaptic;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
