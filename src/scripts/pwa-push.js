/* pwa-push.js — real-time push notifications for LedgerMate (main app)
   Exposes: window.LMPush = { request, notify, subscribe, getState }

   Architecture:
     1. On app-ready → subscribe browser to VAPID push
     2. Save PushSubscription to Supabase user_profiles.push_subscription
     3. LMPush.notify() → Supabase Edge Function → web-push → SW → user

   VAPID public key is safe to embed (not secret).
   Private key lives in Supabase secret: VAPID_PRIVATE_KEY
*/
(function () {
  'use strict';

  /* ── Config ───────────────────────────────────────────────── */
  /* Both values are injected at deploy time by gen_config.py from GitHub Secrets.
     VAPID_PUBLIC_KEY is safe to embed (public key, not secret).
     EDGE_FN_URL is derived from SUPABASE_URL — no extra secret needed. */
  var VAPID_PUBLIC_KEY = window['VAPID_PUBLIC_KEY'] || '';
  var EDGE_FN_URL      = window['SUPABASE_URL']
    ? window['SUPABASE_URL'].replace(/\/$/, '') + '/functions/v1/send-push'
    : null;
  var ICON             = './assets/icons/icon-512.png';
  var LS_KEY           = 'lm_push_state';

  /* ── Helpers ──────────────────────────────────────────────── */
  function _urlBase64ToUint8(b64) {
    var padded = b64.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4) padded += '=';
    var raw = atob(padded);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  function _saveState(patch) {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      Object.assign(s, patch);
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function _loadState() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
  }

  /* ── Permission request ───────────────────────────────────── */
  function request() {
    if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
    if (Notification.permission === 'granted') return subscribe().then(function () { return 'granted'; });
    return Notification.requestPermission().then(function (perm) {
      if (perm === 'granted') return subscribe().then(function () { return 'granted'; });
      return perm;
    });
  }

  /* ── VAPID subscribe + persist to Supabase ────────────────── */
  function subscribe() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return Promise.resolve();
    return navigator.serviceWorker.ready.then(function (reg) {
      /* Unsubscribe any existing subscription first — avoids InvalidStateError
         when the VAPID key has changed since the last subscription was created. */
      return reg.pushManager.getSubscription().then(function (existing) {
        if (existing) return existing.unsubscribe();
        return true;
      }).then(function () {
        return reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: _urlBase64ToUint8(VAPID_PUBLIC_KEY)
        });
      });
    }).then(function (sub) {
      _saveState({ subscription: sub.toJSON(), subscribedAt: new Date().toISOString() });
      return _persistToSupabase(sub.toJSON());
    }).catch(function (e) {
      console.warn('[LMPush] subscribe failed:', e);
    });
  }

  /* ── Save subscription to user_profiles.push_subscription ── */
  function _persistToSupabase(subJson) {
    var sb = window._supabase || window.supabase;
    if (!sb) return Promise.resolve();
    return sb.auth.getSession().then(function (r) {
      var uid = r && r.data && r.data.session && r.data.session.user.id;
      if (!uid) return;
      return sb.from('user_profiles')
        .update({ push_subscription: subJson })
        .eq('id', uid)
        .then(function (res) {
          if (res.error) console.warn('[LMPush] persist error:', res.error.message);
          else console.log('[LMPush] subscription saved to Supabase');
        });
    }).catch(function () {});
  }

  /* ── Show notification locally (SW or fallback) ───────────── */
  function _showLocal(title, body, opts) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    opts = opts || {};
    var payload = {
      body    : body || '',
      icon    : ICON,
      badge   : ICON,
      tag     : opts.tag     || 'lm-notif',
      renotify: true,
      data    : { url: opts.url || './' }
    };
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then(function (reg) { reg.showNotification(title, payload); })
        .catch(function () { new Notification(title, payload); });
    } else {
      new Notification(title, payload);
    }
  }

  /* ── Send via Supabase Edge Function (cross-device push) ──── */
  function _sendViaEdge(title, body, opts) {
    opts = opts || {};
    if (!EDGE_FN_URL) return Promise.resolve(false);
    var sb = window._supabase || window.supabase;
    if (!sb) return Promise.resolve(false);
    return sb.auth.getSession().then(function (r) {
      var session = r && r.data && r.data.session;
      if (!session) return false;
      return fetch(EDGE_FN_URL, {
        method : 'POST',
        headers: {
          'Content-Type' : 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({
          userId: session.user.id,
          title : title,
          body  : body  || '',
          url   : opts.url || './',
          tag   : opts.tag || 'lm-notif'
        })
      }).then(function (res) { return res.ok; })
        .catch(function () { return false; });
    }).catch(function () { return false; });
  }

  /* ── Public: show notification (edge function + local fallback) */
  function notify(title, body, opts) {
    _sendViaEdge(title, body, opts).then(function (sent) {
      /* Always show locally too so the current tab sees it immediately */
      _showLocal(title, body, opts);
    });
  }

  /* ── Public: state ─────────────────────────────────────────── */
  function getState() {
    var st = _loadState();
    return {
      permission  : typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
      subscribed  : !!st.subscription,
      subscribedAt: st.subscribedAt || null
    };
  }

  /* ── Wire LM_Bus events → notifications ───────────────────── */
  function _wireBusEvents() {
    if (!window.LM_Bus) return;

    /* On app ready: auto-subscribe if already granted */
    LM_Bus.on('lm:app:ready', function () {
      if (Notification.permission === 'granted') {
        subscribe();
      }
    });

    /* Cloud sync failure */
    LM_Bus.on('lm:cloud:failed', function (data) {
      _showLocal('☁️ Sync Failed', data && data.message || 'Check your connection', { tag: 'lm-sync-fail' });
    });
  }

  /* ── Boot ─────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', _wireBusEvents);

  window.LMPush = {
    request  : request,
    subscribe: subscribe,
    notify   : notify,
    getState : getState
  };

}());
