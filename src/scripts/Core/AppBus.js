/**
 * LedgerMate – AppBus.js
 * ─────────────────────────────────────────────────────────────
 * Lightweight pub/sub event bus for decoupled inter-module
 * communication with Native Multi-Tab Live Synchronization
 * via BroadcastChannel API ('lm_multi_tab_sync').
 *
 * Events emitted by the system:
 *  lm:app:ready       – DB open + data loaded, app fully booted
 *  lm:auth:login      – user successfully logged in  { user }
 *  lm:auth:logout     – user logged out
 *  lm:data:changed    – any state mutation             { store }
 *  lm:theme:changed   – theme toggled                 { theme }
 *  lm:render:request  – debounced render requested
 *  lm:tab:sync        – explicit cross-tab sync message
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const _listeners = Object.create(null);
  let   _appReady  = false;

  // Generate unique ID for this browser tab session
  const _tabId = 'tab_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);

  // Cross-tab broadcast channel
  let _channel = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      _channel = new BroadcastChannel('lm_multi_tab_sync');
      if (typeof _channel.unref === 'function') {
        try { _channel.unref(); } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('[LM_Bus] BroadcastChannel not supported in this environment', e);
  }

  const LM_Bus = {

    /* ── Tab ID ────────────────────────────────────────── */
    getTabId() {
      return _tabId;
    },

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

    /* ── Publish locally ──────────────────────────────── */
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
        if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
          document.dispatchEvent(new CustomEvent(event, { detail: data, bubbles: false }));
        }
      } catch {}
    },

    /* ── Cross-tab Broadcast ──────────────────────────── */
    broadcast(event, payload = {}) {
      // 1. Fire locally
      this.emit(event, payload);

      // 2. Broadcast to other tabs
      if (_channel) {
        try {
          _channel.postMessage({
            type: event,
            payload: payload,
            senderId: _tabId,
            timestamp: Date.now()
          });
        } catch (err) {
          console.warn('[LM_Bus] Broadcast failed:', err);
        }
      }
    },

    /* ── State query ──────────────────────────────────── */
    isReady() { return _appReady; },

    /* ── Utility: debounced emit ──────────────────────── */
    _debounceTimers: Object.create(null),
    emitDebounced(event, data, ms = 80) {
      clearTimeout(this._debounceTimers[event]);
      this._debounceTimers[event] = setTimeout(() => this.emit(event, data), ms);
    },

    /* ── Internal Remote Sync Handler ─────────────────── */
    _handleRemoteSync(msg) {
      try {
        if (typeof window === 'undefined') return;

        const _lmUid = window.LM_Auth?.getCurrentUserId?.() || 'default';
        const curPage = window.curPage || (window.localStorage ? window.localStorage.getItem(`lm_u_${_lmUid}_lastPage`) || window.localStorage.getItem('ledgerMate_lastPage') : null);

        // If transactions or budgets changed remotely, reload and re-render
        if (typeof window.getAll === 'function' && window.state) {
          const store = msg.payload?.store;
          if (!store || store === 'transactions' || store === 'budgets') {
            window.getAll('transactions').then(txs => {
              if (window.state) window.state.transactions = txs;
              if (curPage === 'transactions' && typeof window.refreshRecentList === 'function') {
                window.refreshRecentList();
              }
              if ((curPage === 'dashboard' || !curPage) && typeof window.renderAll === 'function') {
                window.renderAll();
              }
            }).catch(() => {});
          }
        }
      } catch (e) {
        console.error('[LM_Bus] Error handling remote sync:', e);
      }
    },

    /* ── Cleanup / Lifecycle ──────────────────────────── */
    destroy() {
      if (_channel) {
        try { _channel.close(); } catch (e) {}
        _channel = null;
      }
    }
  };

  // Wire up incoming cross-tab messages
  if (_channel) {
    _channel.onmessage = (event) => {
      try {
        const msg = event.data;
        if (!msg || typeof msg !== 'object') return;
        // Never process messages originating from this same tab
        if (msg.senderId === _tabId) return;

        const enrichedData = Object.assign({}, msg.payload, {
          _remote: true,
          _senderId: msg.senderId,
          _timestamp: msg.timestamp
        });

        // Fire local listeners
        LM_Bus.emit(msg.type, enrichedData);

        // Automatic state sync on mutation
        if (msg.type === 'lm:data:changed' || msg.type === 'lm:tab:sync' || msg.type === 'tx:mutated') {
          LM_Bus._handleRemoteSync(msg);
        }
      } catch (err) {
        console.error('[LM_Bus] Error receiving broadcast:', err);
      }
    };
  }

  // Hook into window if in browser environment
  if (typeof window !== 'undefined') {
    window.LM_Bus = LM_Bus;
  }

  // CommonJS export for Node test runners
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LM_Bus;
  }

})();
