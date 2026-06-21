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

  /* ── Self-contained modal ────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('st-stp-styles')) return;
    var s = document.createElement('style');
    s.id = 'st-stp-styles';
    s.textContent = [
      '.stp-wrap{font-family:"Inter",sans-serif}',
      '.stp-today{text-align:center;padding:16px 0 12px;border-bottom:1px solid var(--border,#1e2436);margin-bottom:12px}',
      '.stp-today-val{font-size:30px;font-weight:700;font-family:"JetBrains Mono",monospace;background:linear-gradient(135deg,#06d6a0,#4f8ef7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}',
      '.stp-today-lbl{font-size:11px;color:var(--text2,#8a95b8);margin-top:4px;text-transform:uppercase;letter-spacing:.06em}',
      '.stp-list{display:flex;flex-direction:column;gap:8px}',
      '.stp-group{background:var(--bg3,#141820);border:1px solid var(--border,#1e2436);border-radius:10px;overflow:hidden}',
      '.stp-date-row{display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg4,#1a1f2e);font-size:12px;font-weight:600;color:var(--text2,#8a95b8)}',
      '.stp-total{color:var(--teal,#06d6a0);font-family:"JetBrains Mono",monospace}',
      '.stp-row{display:flex;align-items:center;padding:7px 12px;gap:8px;border-top:1px solid var(--border,#1e2436);font-size:12px}',
      '.stp-page{color:var(--text3,#535d7e);font-size:11px;min-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.stp-range{flex:1;color:var(--text2,#8a95b8)}',
      '.stp-arrow{color:var(--text3,#535d7e)}',
      '.stp-dur{color:var(--teal,#06d6a0);font-family:"JetBrains Mono",monospace;font-weight:600;white-space:nowrap}',
      '.stp-empty{text-align:center;padding:32px;color:var(--text3,#535d7e);font-size:13px}',
      '#st-modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9900;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)}',
      '#st-modal-box{background:var(--bg2,#0e1117);border:1px solid var(--border,#1e2436);border-radius:16px;width:100%;max-width:520px;max-height:82vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.8)}',
      '#st-modal-head{padding:14px 18px;border-bottom:1px solid var(--border,#1e2436);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}',
      '#st-modal-title{font-size:14px;font-weight:700;color:var(--text,#e2e8f8)}',
      '#st-modal-close{background:none;border:none;color:var(--text2,#8a95b8);font-size:20px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:6px}',
      '#st-modal-close:hover{color:var(--text,#e2e8f8);background:var(--bg4,#1a1f2e)}',
      '#st-modal-body{overflow-y:auto;padding:16px 18px;flex:1}',
    ].join('');
    document.head.appendChild(s);
  }

  function _showModal(title, html) {
    _injectStyles();
    var existing = document.getElementById('st-modal-ov');
    if (existing) existing.remove();

    var ov  = document.createElement('div'); ov.id = 'st-modal-ov';
    var box = document.createElement('div'); box.id = 'st-modal-box';
    var hd  = document.createElement('div'); hd.id = 'st-modal-head';
    var ttl = document.createElement('span'); ttl.id = 'st-modal-title'; ttl.textContent = title;
    var cls = document.createElement('button'); cls.id = 'st-modal-close'; cls.textContent = '✕';
    var bd  = document.createElement('div'); bd.id = 'st-modal-body'; bd.innerHTML = html;

    hd.appendChild(ttl); hd.appendChild(cls);
    box.appendChild(hd); box.appendChild(bd);
    ov.appendChild(box);
    document.body.appendChild(ov);

    function close() { ov.remove(); }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    cls.addEventListener('click', close);
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

      _showModal('📊 Study Sessions', html);
    });
  }

  /* ── Public: onTick ──────────────────────────────────── */
  function onTick(fn) { _onTick = fn; }

  /* ── Boot: resume tick if a session was active ───────── */
  /* If loaded dynamically (auth-guard injection), DOMContentLoaded has already
     fired — start immediately. Otherwise wait for it. */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (_load().running) _startTick();
    });
  } else {
    if (_load().running) _startTick();
  }

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
