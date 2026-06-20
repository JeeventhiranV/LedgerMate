/* pwa-push.js — notification permission + local study reminders
   Exposes: window.LMPush = { request, schedule(h, m), cancel, getState, show }
   Load after DOM is ready. Works without a push server — uses local scheduling
   and service-worker showNotification for reliable delivery.
*/
(function () {
  'use strict';

  var LS_KEY      = 'lm_push_prefs';
  var ICON        = '../assets/icon-study-192.png';
  var _scheduled  = false;

  /* ── Persistence ───────────────────────────────────────── */
  function _load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
  }
  function _save(patch) {
    var st = Object.assign(_load(), patch);
    localStorage.setItem(LS_KEY, JSON.stringify(st));
    return st;
  }

  /* ── Public: request browser notification permission ────── */
  function request() {
    if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
    if (Notification.permission === 'granted') return Promise.resolve('granted');
    return Notification.requestPermission();
  }

  /* ── Public: show a notification via SW or fallback ──────── */
  function show(title, body) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    var opts = { body: body || '', icon: ICON, badge: ICON, tag: 'lm-study', renotify: true };
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then(function (reg) { reg.showNotification(title, opts); })
        .catch(function () { new Notification(title, opts); });
    } else {
      new Notification(title, opts);
    }
  }

  /* ── Schedule a daily reminder ────────────────────────────── */
  function schedule(hour, minute) {
    _save({ enabled: true, hour: hour, minute: minute != null ? minute : 0 });
    _startScheduler();
  }

  function cancel() {
    _save({ enabled: false });
  }

  function getState() {
    var p = _load();
    return {
      permission : typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
      enabled    : !!p.enabled,
      hour       : p.hour,
      minute     : p.minute
    };
  }

  /* ── Internal: single-shot per-day scheduler ─────────────── */
  function _startScheduler() {
    if (_scheduled) return;
    var p = _load();
    if (!p.enabled || p.hour == null) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    _scheduled = true;
    var now    = new Date();
    var target = new Date();
    target.setHours(p.hour, p.minute || 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    var delay = target.getTime() - now.getTime();

    setTimeout(function () {
      _scheduled = false;
      show('Study Reminder 📚', 'Time to study! Keep your streak going.');
      _startScheduler(); // reschedule for next day
    }, delay);
  }

  /* ── Boot ─────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    _startScheduler();
  });

  window.LMPush = { request: request, show: show, notify: show, schedule: schedule, cancel: cancel, getState: getState };
}());
