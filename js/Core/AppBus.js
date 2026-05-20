/**
 * LedgerMate – AppBus.js
 * ─────────────────────────────────────────────────────────────
 * Lightweight pub/sub event bus for decoupled inter-module
 * communication. Replaces scattered setTimeout() polling with
 * reliable event-driven hooks.
 *
 * Events emitted by the system:
 *  lm:app:ready       – DB open + data loaded, app fully booted
 *  lm:auth:login      – user successfully logged in  { user }
 *  lm:auth:logout     – user logged out
 *  lm:data:changed    – any state mutation             { store }
 *  lm:theme:changed   – theme toggled                 { theme }
 *  lm:render:request  – debounced render requested
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const _listeners = Object.create(null);
  let   _appReady  = false;

  const LM_Bus = {

    /* ── Subscribe ────────────────────────────────────── */
    on(event, fn) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(fn);
      /* If app already booted and listener for lm:app:ready added late,
         fire immediately so the caller doesn't miss it */
      if (event === 'lm:app:ready' && _appReady) {
        try { fn({ late: true }); } catch (e) { console.error('[LM_Bus]', e); }
      }
      return () => this.off(event, fn);
    },

    /* ── Subscribe once ───────────────────────────────── */
    once(event, fn) {
      const off = this.on(event, function wrapper(...args) {
        off(); fn(...args);
      });
    },

    /* ── Unsubscribe ──────────────────────────────────── */
    off(event, fn) {
      if (!_listeners[event]) return;
      _listeners[event] = _listeners[event].filter(f => f !== fn);
    },

    /* ── Publish ──────────────────────────────────────── */
    emit(event, data) {
      if (event === 'lm:app:ready') _appReady = true;
      const fns = _listeners[event];
      if (fns && fns.length) {
        fns.forEach(fn => {
          try { fn(data); } catch (e) { console.error('[LM_Bus] Error in listener for', event, e); }
        });
      }
      /* Also dispatch as DOM CustomEvent for external listeners */
      try {
        document.dispatchEvent(new CustomEvent(event, { detail: data, bubbles: false }));
      } catch {}
    },

    /* ── State query ──────────────────────────────────── */
    isReady() { return _appReady; },

    /* ── Utility: debounced emit ──────────────────────── */
    _debounceTimers: Object.create(null),
    emitDebounced(event, data, ms = 80) {
      clearTimeout(this._debounceTimers[event]);
      this._debounceTimers[event] = setTimeout(() => this.emit(event, data), ms);
    }
  };

  window.LM_Bus = LM_Bus;

})();
