/* StudyTimer.js – Persistent real-time study session tracker
   DB  : study_sessions { id, user_id, started_at, ended_at, duration_seconds, page }
   LS  : lm_study_session { running, sessionId, startedAt, page }
   API : window.StudyTimer = { start, stop, toggle, getState, getSessions, openPanel, onTick, fmt }
*/
(function () {
  'use strict';

  var LS_KEY  = 'lm_study_session';
  var _tick   = null;
  var _onTick = null;

  /* ── Supabase + page helpers ──────────────────────────── */
  function _sb()   { return window._supabase || window.supabase || null; }
  function _page() { return window.location.pathname.split('/').pop() || 'index.html'; }

  /* ── localStorage ────────────────────────────────────── */
  function _save(patch) {
    try {
      var s = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      localStorage.setItem(LS_KEY, JSON.stringify(Object.assign(s, patch)));
    } catch (e) {}
  }
  function _load() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function _clearLS() {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
  }

  /* ── Formatting ───────────────────────────────────────── */
  function fmt(secs) {
    var h = Math.floor(secs / 3600);
    var m = Math.floor((secs % 3600) / 60);
    var s = secs % 60;
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return (h ? p(h) + ':' : '') + p(m) + ':' + p(s);
  }

  function _fmtTime(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function _fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso), today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    var y = new Date(today); y.setDate(today.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function _elapsed(startedAt) {
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  }

  /* ── Tick ─────────────────────────────────────────────── */
  function _startTick() {
    if (_tick) return;
    _tick = setInterval(function () {
      if (typeof _onTick === 'function') _onTick(getState());
    }, 1000);
  }

  function _stopTick() {
    if (_tick) { clearInterval(_tick); _tick = null; }
  }

  /* ── Public: start ───────────────────────────────────── */
  function start() {
    var st = _load();
    if (st.running) return Promise.resolve(getState());

    var now  = new Date().toISOString();
    var page = _page();
    _save({ running: true, sessionId: null, startedAt: now, page: page });
    _startTick();

    var sb = _sb();
    if (!sb) return Promise.resolve(getState());

    return sb.auth.getSession().then(function (r) {
      var uid = r.data && r.data.session && r.data.session.user && r.data.session.user.id;
      if (!uid) return getState();
      return sb.from('study_sessions')
        .insert({ user_id: uid, started_at: now, page: page })
        .select('id').single()
        .then(function (res) {
          if (res.data && res.data.id) _save({ sessionId: res.data.id });
          return getState();
        })
        .catch(function () { return getState(); });
    }).catch(function () { return getState(); });
  }

  /* ── Public: stop ────────────────────────────────────── */
  function stop() {
    var st = _load();
    if (!st.running) return Promise.resolve(null);

    _stopTick();
    var now      = new Date().toISOString();
    var duration = st.startedAt ? _elapsed(st.startedAt) : 0;
    var snapshot = { sessionId: st.sessionId, startedAt: st.startedAt, endedAt: now, duration: duration };

    _clearLS();
    if (typeof _onTick === 'function') _onTick(getState());

    var sb = _sb();
    if (!sb || !st.sessionId) return Promise.resolve(snapshot);

    return sb.from('study_sessions')
      .update({ ended_at: now, duration_seconds: duration })
      .eq('id', st.sessionId)
      .then(function ()  { return snapshot; })
      .catch(function () { return snapshot; });
  }

  /* ── Public: toggle ──────────────────────────────────── */
  function toggle() { return _load().running ? stop() : start(); }

  /* ── Public: getState ────────────────────────────────── */
  function getState() {
    var st = _load();
    if (!st.running) {
      return { running: false, elapsed: 0, startedAt: null, display: '00:00:00' };
    }
    var secs = _elapsed(st.startedAt);
    return { running: true, elapsed: secs, startedAt: st.startedAt, display: fmt(secs) };
  }

  /* ── Public: getSessions ─────────────────────────────── */
  function getSessions(limit) {
    var sb = _sb();
    if (!sb) return Promise.resolve([]);
    return sb.auth.getSession().then(function (r) {
      var uid = r.data && r.data.session && r.data.session.user && r.data.session.user.id;
      if (!uid) return [];
      return sb.from('study_sessions')
        .select('*')
        .eq('user_id', uid)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(limit || 60)
        .then(function (res) { return res.data || []; })
        .catch(function ()   { return []; });
    }).catch(function () { return []; });
  }

  /* ── Public: openPanel ───────────────────────────────── */
  function openPanel() {
    getSessions(50).then(function (sessions) {
      var todaySecs = 0;
      var byDate = {};

      sessions.forEach(function (s) {
        var dk = new Date(s.started_at).toDateString();
        if (!byDate[dk]) byDate[dk] = { label: _fmtDate(s.started_at), items: [], total: 0 };
        byDate[dk].items.push(s);
        if (s.duration_seconds) {
          byDate[dk].total += s.duration_seconds;
          if (dk === new Date().toDateString()) todaySecs += s.duration_seconds;
        }
      });

      var rows = Object.keys(byDate).map(function (dk) {
        var grp = byDate[dk];
        var itemRows = grp.items.map(function (s) {
          return '<div class="stp-row">' +
            '<span class="stp-page">' + (s.page || 'study') + '</span>' +
            '<span class="stp-range">▶ ' + _fmtTime(s.started_at) +
              ' <span class="stp-arrow">→</span> ■ ' + _fmtTime(s.ended_at) + '</span>' +
            '<span class="stp-dur">' + (s.duration_seconds ? fmt(s.duration_seconds) : '—') + '</span>' +
          '</div>';
        }).join('');
        return '<div class="stp-group">' +
          '<div class="stp-date-row"><span>' + grp.label + '</span>' +
            '<span class="stp-total">' + fmt(grp.total) + '</span></div>' +
          itemRows + '</div>';
      }).join('');

      if (!rows) rows = '<div class="stp-empty">No completed sessions yet — press ▶ Start to begin! 📚</div>';

      var html = '<div class="stp-wrap">' +
        '<div class="stp-today">' +
          '<div class="stp-today-val">' + fmt(todaySecs) + '</div>' +
          '<div class="stp-today-lbl">Today\'s Total Study Time</div>' +
        '</div>' +
        '<div class="stp-list">' + rows + '</div>' +
      '</div>';

      if (window.showSimpleModal) showSimpleModal('📊 Study Sessions', html);
    });
  }

  /* ── Public: onTick ──────────────────────────────────── */
  function onTick(fn) { _onTick = fn; }

  /* ── Boot: resume tick if a session was active ───────── */
  document.addEventListener('DOMContentLoaded', function () {
    if (_load().running) _startTick();
  });

  window.StudyTimer = {
    start      : start,
    stop       : stop,
    toggle     : toggle,
    getState   : getState,
    getSessions: getSessions,
    openPanel  : openPanel,
    onTick     : onTick,
    fmt        : fmt
  };
}());
