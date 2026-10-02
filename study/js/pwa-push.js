/* pwa-push.js — notification permission + study reminders
   Exposes: window.LMPush = { request, schedule, cancel, getState, show, testNotification, syncDailyAlerts }
   Works seamlessly in both Web / PWA browsers and Native Android APK via AndroidBridge.
*/
(function () {
  'use strict';

  var LS_KEY     = 'lm_study_push_prefs';
  var ICON       = '../assets/icon-192.png';
  var _scheduler = null;

  /* ── Persistence ───────────────────────────────────────── */
  function _load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) {
        var leg = localStorage.getItem('lm_push_prefs');
        return leg ? JSON.parse(leg) : { enabled: false, hour: 9, minute: 0, streakAlert: true, srsAlert: true };
      }
      return JSON.parse(raw);
    } catch (e) {
      return { enabled: false, hour: 9, minute: 0, streakAlert: true, srsAlert: true };
    }
  }

  function _save(patch) {
    var st = Object.assign(_load(), patch);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(st));
      localStorage.setItem('lm_push_prefs', JSON.stringify(st));
    } catch (e) {}
    return st;
  }

  /* ── Native Bridge Check ───────────────────────────────── */
  function isNativeAndroid() {
    return typeof window.AndroidBridge !== 'undefined' &&
           typeof window.AndroidBridge.isNativeApp === 'function' &&
           window.AndroidBridge.isNativeApp();
  }

  /* ── Public: request browser notification permission ────── */
  function request() {
    if (isNativeAndroid()) {
      return Promise.resolve('granted');
    }
    if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
    if (Notification.permission === 'granted') return Promise.resolve('granted');
    return Notification.requestPermission();
  }

  /* ── Public: show a notification via AndroidBridge or SW/Web ── */
  function show(title, body, tag, url) {
    var targetTag = tag || 'lm-study-' + Date.now();
    var targetUrl = url || './index.html';

    // 1. Android APK Native Notification
    if (isNativeAndroid() && typeof window.AndroidBridge.showNativeNotification === 'function') {
      try {
        window.AndroidBridge.showNativeNotification(title, body || '', targetTag, targetUrl);
        return;
      } catch (e) {
        console.warn('[LMPush] Native notification failed, falling back:', e);
      }
    }

    // 2. Web Browser Notification
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    var opts = {
      body: body || '',
      icon: ICON,
      badge: ICON,
      tag: targetTag,
      renotify: true,
      data: { url: targetUrl }
    };

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready
        .then(function (reg) { reg.showNotification(title, opts); })
        .catch(function () {
          try { new Notification(title, opts); } catch (err) {}
        });
    } else {
      try { new Notification(title, opts); } catch (err) {}
    }
  }

  /* ── Test Notification Dispatch ──────────────────────────── */
  function testNotification() {
    return request().then(function (perm) {
      if (perm !== 'granted' && !isNativeAndroid()) {
        if (window.LMToast) window.LMToast.show('Please allow notification permissions in your browser.', 'warn');
        return false;
      }

      var streak = 0;
      try {
        streak = Number(localStorage.getItem('study_streak_count') || 0);
      } catch (e) {}

      var title = '📚 Study Hub · Test Notification';
      var body = streak > 0
        ? '🔥 ' + streak + '-day streak active! Keep up the great momentum.'
        : '🧠 Time for a quick DSA & Java revision session today!';

      show(title, body, 'lm-study-test', './index.html');
      if (window.LMToast) window.LMToast.show('Notification dispatched successfully! 🔔', 'success');
      return true;
    });
  }

  /* ── Evaluate and trigger smart alerts ─────────────────── */
  function syncDailyAlerts() {
    var p = _load();
    if (!p.enabled) return;

    var todayStr = new Date().toISOString().slice(0, 10);

    // Due flashcards check
    var dueCardsCount = 0;
    if (window.StudySRS && typeof window.StudySRS.getDueCards === 'function') {
      try {
        var due = window.StudySRS.getDueCards();
        dueCardsCount = due ? due.length : 0;
      } catch (e) {}
    }

    // Check if user already studied today
    var studiedToday = false;
    try {
      var lastStudy = localStorage.getItem('study_last_completed_date');
      if (lastStudy === todayStr) studiedToday = true;
    } catch (e) {}

    var streak = 0;
    try {
      streak = Number(localStorage.getItem('study_streak_count') || 0);
    } catch (e) {}

    var title = '📚 Study Time';
    var body = 'Daily practice keeps your engineering skills sharp.';

    if (p.srsAlert && dueCardsCount > 0) {
      title = '🧠 ' + dueCardsCount + ' Flashcard' + (dueCardsCount > 1 ? 's' : '') + ' Ready for Review';
      body = 'Spaced repetition works best when reviewed on schedule.';
    } else if (p.streakAlert && streak > 0 && !studiedToday) {
      title = '🔥 Don\'t lose your ' + streak + '-day streak!';
      body = 'Solve or review 1 question today to maintain your streak.';
    }

    show(title, body, 'lm-study-daily-' + todayStr, './index.html');
    localStorage.setItem('lm_last_study_alert_date', todayStr);
  }

  /* ── Schedule daily reminder timer ───────────────────────── */
  function schedule(hour, minute, options) {
    var opts = options || {};
    var p = _save({
      enabled: true,
      hour: hour != null ? hour : 9,
      minute: minute != null ? minute : 0,
      streakAlert: opts.streakAlert !== undefined ? !!opts.streakAlert : true,
      srsAlert: opts.srsAlert !== undefined ? !!opts.srsAlert : true
    });
    _startScheduler();
    return p;
  }

  function cancel() {
    if (_scheduler) {
      clearTimeout(_scheduler);
      _scheduler = null;
    }
    _save({ enabled: false });
  }

  function getState() {
    var p = _load();
    return {
      permission : isNativeAndroid() ? 'granted' : (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'),
      enabled    : !!p.enabled,
      hour       : p.hour != null ? p.hour : 9,
      minute     : p.minute != null ? p.minute : 0,
      streakAlert: p.streakAlert !== false,
      srsAlert   : p.srsAlert !== false,
      isNative   : isNativeAndroid()
    };
  }

  function _startScheduler() {
    if (_scheduler) {
      clearTimeout(_scheduler);
      _scheduler = null;
    }

    var p = _load();
    if (!p.enabled || p.hour == null) return;
    if (!isNativeAndroid() && (typeof Notification === 'undefined' || Notification.permission !== 'granted')) return;

    var now = new Date();
    var target = new Date();
    target.setHours(p.hour, p.minute || 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);

    var delay = target.getTime() - now.getTime();

    _scheduler = setTimeout(function () {
      _scheduler = null;
      syncDailyAlerts();
      _startScheduler();
    }, delay);
  }

  /* ── Boot on DOM Ready ───────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    _startScheduler();
  });

  window.LMPush = {
    request: request,
    show: show,
    notify: show,
    testNotification: testNotification,
    syncDailyAlerts: syncDailyAlerts,
    schedule: schedule,
    cancel: cancel,
    getState: getState
  };
}());
