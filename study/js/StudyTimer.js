/* StudyTimer.js – Persistent real-time study session tracker
   DB  : study_sessions { id, user_id, started_at, ended_at, duration_seconds, page }
   LS  : lm_study_session { running, sessionId, startedAt, page, topic }
   API : window.StudyTimer = { start, stop, toggle, getState, getSessions, openPanel, onTick, fmt,
                                getTopics, setTopics, startWithPrompt }
*/
(function () {
  'use strict';

  var LS_KEY     = 'lm_study_session';
  var TOPICS_KEY = 'lm_study_topics';
  var _tick      = null;
  var _onTick    = null;

  var DEFAULT_TOPICS = [
    'DSA', 'Java', 'React', 'System Design',
    'Spring Boot', 'Microservices', 'HR Prep', 'SQL / DB'
  ];

  /* ── Supabase + page helpers ──────────────────────────── */
  function _sb()   { return window._supabase || window.supabase || null; }
  function _page() { return window.location.pathname.split('/').pop() || 'index.html'; }

  /* ── Topics master list ───────────────────────────────── */
  function getTopics() {
    try {
      var saved = JSON.parse(localStorage.getItem(TOPICS_KEY));
      return Array.isArray(saved) && saved.length ? saved : DEFAULT_TOPICS.slice();
    } catch (e) { return DEFAULT_TOPICS.slice(); }
  }

  function setTopics(arr) {
    try { localStorage.setItem(TOPICS_KEY, JSON.stringify(arr)); } catch (e) {}
  }

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

  /* ── Public: start (with topic) ─────────────────────── */
  function start(topic) {
    var st = _load();
    if (st.running) return Promise.resolve(getState());

    var now      = new Date().toISOString();
    var page     = topic || _page();
    var topicVal = topic || '';
    _save({ running: true, sessionId: null, startedAt: now, page: page, topic: topicVal });
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
    var snapshot = { sessionId: st.sessionId, startedAt: st.startedAt, endedAt: now, duration: duration, topic: st.topic };

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

  /* ── Public: toggle (stop immediately; start shows picker) */
  function toggle() {
    if (_load().running) return stop();
    return startWithPrompt();
  }

  /* ── Public: getState ────────────────────────────────── */
  function getState() {
    var st = _load();
    if (!st.running) {
      return { running: false, elapsed: 0, startedAt: null, display: '00:00:00', topic: '' };
    }
    var secs = _elapsed(st.startedAt);
    return { running: true, elapsed: secs, startedAt: st.startedAt, display: fmt(secs), topic: st.topic || '' };
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

  /* ── Injected styles ─────────────────────────────────── */
  function _injectStyles() {
    if (document.getElementById('st-stp-styles')) return;
    var s = document.createElement('style');
    s.id = 'st-stp-styles';
    s.textContent = [
      /* panel layout */
      '.stp-wrap{font-family:"Inter",sans-serif}',
      '.stp-today{text-align:center;padding:16px 0 12px;border-bottom:1px solid var(--border,#1e2436);margin-bottom:12px}',
      '.stp-today-val{font-size:30px;font-weight:700;font-family:"JetBrains Mono",monospace;background:linear-gradient(135deg,#06d6a0,#4f8ef7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}',
      '.stp-today-lbl{font-size:11px;color:var(--text2,#8a95b8);margin-top:4px;text-transform:uppercase;letter-spacing:.06em}',
      '.stp-list{display:flex;flex-direction:column;gap:8px}',
      '.stp-group{background:var(--bg3,#141820);border:1px solid var(--border,#1e2436);border-radius:10px;overflow:hidden}',
      '.stp-date-row{display:flex;justify-content:space-between;padding:8px 12px;background:var(--bg4,#1a1f2e);font-size:12px;font-weight:600;color:var(--text2,#8a95b8)}',
      '.stp-total{color:var(--teal,#06d6a0);font-family:"JetBrains Mono",monospace}',
      '.stp-row{display:flex;align-items:center;padding:7px 12px;gap:8px;border-top:1px solid var(--border,#1e2436);font-size:12px}',
      '.stp-topic{display:inline-flex;align-items:center;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;background:rgba(6,214,160,.12);color:var(--teal,#06d6a0);border:1px solid rgba(6,214,160,.25);white-space:nowrap;min-width:50px;justify-content:center}',
      '.stp-range{flex:1;color:var(--text2,#8a95b8)}',
      '.stp-arrow{color:var(--text3,#535d7e)}',
      '.stp-dur{color:var(--teal,#06d6a0);font-family:"JetBrains Mono",monospace;font-weight:600;white-space:nowrap}',
      '.stp-empty{text-align:center;padding:32px;color:var(--text3,#535d7e);font-size:13px}',
      /* modal shell */
      '#st-modal-ov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9900;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)}',
      '#st-modal-box{background:var(--bg2,#0e1117);border:1px solid var(--border,#1e2436);border-radius:16px;width:100%;max-width:520px;max-height:82vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.8)}',
      '#st-modal-head{padding:14px 18px;border-bottom:1px solid var(--border,#1e2436);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}',
      '#st-modal-title{font-size:14px;font-weight:700;color:var(--text,#e2e8f8)}',
      '#st-modal-close{background:none;border:none;color:var(--text2,#8a95b8);font-size:20px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:6px}',
      '#st-modal-close:hover{color:var(--text,#e2e8f8);background:var(--bg4,#1a1f2e)}',
      '#st-modal-body{overflow-y:auto;padding:16px 18px;flex:1}',
      /* topic picker */
      '.stp-picker-heading{font-size:12px;font-weight:600;color:var(--text2,#8a95b8);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}',
      '.stp-topic-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}',
      '.stp-tc{padding:7px 14px;border-radius:20px;border:1px solid var(--border,#1e2436);background:var(--bg3,#141820);color:var(--text2,#8a95b8);font-size:13px;cursor:pointer;transition:all .15s;font-family:inherit}',
      '.stp-tc:hover{border-color:var(--teal,#06d6a0);color:var(--teal,#06d6a0)}',
      '.stp-tc.selected{border-color:var(--teal,#06d6a0);background:rgba(6,214,160,.12);color:var(--teal,#06d6a0);font-weight:600}',
      '.stp-custom-row{display:flex;gap:8px;margin-bottom:14px}',
      '.stp-custom-inp{flex:1;background:var(--bg3,#141820);border:1px solid var(--border,#1e2436);border-radius:8px;padding:8px 12px;color:var(--text,#e2e8f8);font-size:13px;font-family:inherit;outline:none}',
      '.stp-custom-inp:focus{border-color:var(--teal,#06d6a0)}',
      '.stp-picker-footer{display:flex;gap:8px;justify-content:flex-end;padding-top:4px;border-top:1px solid var(--border,#1e2436)}',
      '.stp-btn{padding:8px 18px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:opacity .15s}',
      '.stp-btn.primary{background:var(--teal,#06d6a0);color:#000}',
      '.stp-btn.primary:hover{opacity:.85}',
      '.stp-btn.ghost{background:var(--bg3,#141820);color:var(--text2,#8a95b8);border:1px solid var(--border,#1e2436)}',
      '.stp-btn.ghost:hover{color:var(--text,#e2e8f8)}',
      '.stp-cfg-link{font-size:11px;color:var(--text3,#535d7e);cursor:pointer;text-decoration:underline;text-underline-offset:3px;padding:4px 0;display:inline-block}',
      '.stp-cfg-link:hover{color:var(--text2,#8a95b8)}',
      /* topics config */
      '.stp-cfg-list{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}',
      '.stp-cfg-item{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--bg3,#141820);border:1px solid var(--border,#1e2436);border-radius:8px;font-size:13px;color:var(--text,#e2e8f8)}',
      '.stp-cfg-item span{flex:1}',
      '.stp-cfg-del{background:none;border:none;color:var(--text3,#535d7e);cursor:pointer;font-size:14px;padding:0 4px;line-height:1}',
      '.stp-cfg-del:hover{color:var(--rose,#f43f5e)}',
      '.stp-cfg-add-row{display:flex;gap:8px}',
      '.stp-sessions-cfg-btn{font-size:11px;color:var(--text3,#535d7e);cursor:pointer;border:none;background:none;font-family:inherit;padding:0;text-decoration:underline;text-underline-offset:3px}',
      '.stp-sessions-cfg-btn:hover{color:var(--text2,#8a95b8)}',
    ].join('');
    document.head.appendChild(s);
  }

  function _showModal(title, html, extraHeadHtml) {
    _injectStyles();
    var existing = document.getElementById('st-modal-ov');
    if (existing) existing.remove();

    var ov  = document.createElement('div'); ov.id = 'st-modal-ov';
    var box = document.createElement('div'); box.id = 'st-modal-box';
    var hd  = document.createElement('div'); hd.id = 'st-modal-head';
    var ttl = document.createElement('span'); ttl.id = 'st-modal-title'; ttl.textContent = title;
    var cls = document.createElement('button'); cls.id = 'st-modal-close'; cls.textContent = '✕';
    var bd  = document.createElement('div'); bd.id = 'st-modal-body'; bd.innerHTML = html;

    hd.appendChild(ttl);
    if (extraHeadHtml) {
      var extraWrap = document.createElement('span');
      extraWrap.innerHTML = extraHeadHtml;
      hd.appendChild(extraWrap);
    }
    hd.appendChild(cls);
    box.appendChild(hd); box.appendChild(bd);
    ov.appendChild(box);
    document.body.appendChild(ov);

    function close() { ov.remove(); }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    cls.addEventListener('click', close);
    return { ov: ov, box: box, bd: bd, close: close };
  }

  /* ── Topic picker modal ──────────────────────────────── */
  function _showTopicPicker(onStart) {
    _injectStyles();
    var topics = getTopics();
    var selected = '';

    var chipsHtml = topics.map(function (t) {
      return '<button class="stp-tc" data-topic="' + _esc(t) + '">' + _esc(t) + '</button>';
    }).join('');

    var html = '<div class="stp-picker-heading">Select a topic</div>' +
      '<div class="stp-topic-chips" id="stpChips">' + chipsHtml + '</div>' +
      '<div class="stp-picker-heading">Or type a custom topic</div>' +
      '<div class="stp-custom-row">' +
        '<input class="stp-custom-inp" id="stpCustomInp" placeholder="e.g. Kafka, AWS, SQL Joins…" autocomplete="off" maxlength="40"/>' +
      '</div>' +
      '<div class="stp-picker-footer">' +
        '<button class="stp-btn ghost" id="stpCancel">Cancel</button>' +
        '<button class="stp-btn primary" id="stpStart">▶ Start Session</button>' +
      '</div>';

    var m = _showModal('📚 What are you studying?', html);

    var chipsWrap = m.bd.querySelector('#stpChips');
    var customInp = m.bd.querySelector('#stpCustomInp');
    var startBtn  = m.bd.querySelector('#stpStart');
    var cancelBtn = m.bd.querySelector('#stpCancel');

    chipsWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.stp-tc');
      if (!btn) return;
      selected = btn.dataset.topic;
      customInp.value = '';
      chipsWrap.querySelectorAll('.stp-tc').forEach(function (b) { b.classList.remove('selected'); });
      btn.classList.add('selected');
    });

    customInp.addEventListener('input', function () {
      selected = '';
      chipsWrap.querySelectorAll('.stp-tc').forEach(function (b) { b.classList.remove('selected'); });
    });

    customInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); startBtn.click(); }
    });

    startBtn.addEventListener('click', function () {
      var topic = customInp.value.trim() || selected;
      m.close();
      onStart(topic || 'Study Session');
    });

    cancelBtn.addEventListener('click', m.close);

    setTimeout(function () { customInp.focus(); }, 80);
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── Public: startWithPrompt ─────────────────────────── */
  function startWithPrompt() {
    var st = _load();
    if (st.running) return Promise.resolve(getState());
    return new Promise(function (resolve) {
      _showTopicPicker(function (topic) {
        start(topic).then(resolve);
      });
    });
  }

  /* ── Topics config modal ─────────────────────────────── */
  function _showTopicsConfig(onDone) {
    function _render(m) {
      var topics = getTopics();
      var listHtml = topics.map(function (t, i) {
        return '<div class="stp-cfg-item">' +
          '<span>' + _esc(t) + '</span>' +
          '<button class="stp-cfg-del" data-idx="' + i + '" title="Remove">✕</button>' +
        '</div>';
      }).join('');

      m.bd.innerHTML =
        '<div class="stp-cfg-list" id="stpCfgList">' + (listHtml || '<div style="color:var(--text3);font-size:12px;text-align:center;padding:8px 0">No topics — add some below</div>') + '</div>' +
        '<div class="stp-cfg-add-row">' +
          '<input class="stp-custom-inp" id="stpCfgNewInp" placeholder="New topic name…" maxlength="40" autocomplete="off"/>' +
          '<button class="stp-btn primary" id="stpCfgAddBtn" style="padding:8px 14px">+ Add</button>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;border-top:1px solid var(--border,#1e2436);padding-top:12px">' +
          '<button class="stp-btn ghost" id="stpCfgReset">Reset to defaults</button>' +
          '<button class="stp-btn primary" id="stpCfgDone">Done</button>' +
        '</div>';

      m.bd.querySelector('#stpCfgList').addEventListener('click', function (e) {
        var btn = e.target.closest('.stp-cfg-del');
        if (!btn) return;
        var idx = parseInt(btn.dataset.idx);
        var t = getTopics();
        t.splice(idx, 1);
        setTopics(t);
        _render(m);
      });

      var newInp = m.bd.querySelector('#stpCfgNewInp');
      function addTopic() {
        var v = newInp.value.trim();
        if (!v) return;
        var t = getTopics();
        if (t.indexOf(v) === -1) { t.push(v); setTopics(t); }
        newInp.value = '';
        _render(m);
      }

      newInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addTopic(); } });
      m.bd.querySelector('#stpCfgAddBtn').addEventListener('click', addTopic);
      m.bd.querySelector('#stpCfgReset').addEventListener('click', function () {
        setTopics(DEFAULT_TOPICS.slice());
        _render(m);
      });
      m.bd.querySelector('#stpCfgDone').addEventListener('click', function () {
        m.close();
        if (typeof onDone === 'function') onDone();
      });
    }

    var m = _showModal('⚙ Manage Study Topics', '');
    _render(m);
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
          var topicLabel = s.page && !s.page.match(/\.html?$/i) ? s.page : (s.page || 'Study');
          return '<div class="stp-row">' +
            '<span class="stp-topic">' + _esc(topicLabel) + '</span>' +
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

      var m = _showModal('📊 Study Sessions', html,
        '<button class="stp-sessions-cfg-btn" style="margin-right:10px" id="stpOpenCfgFromPanel">⚙ Topics</button>');

      m.bd.parentNode.querySelector('#stpOpenCfgFromPanel').addEventListener('click', function () {
        m.close();
        _showTopicsConfig(function () { openPanel(); });
      });
    });
  }

  /* ── Public: onTick ──────────────────────────────────── */
  function onTick(fn) { _onTick = fn; }

  /* ── Boot: resume tick if a session was active ───────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (_load().running) _startTick();
    });
  } else {
    if (_load().running) _startTick();
  }

  window.StudyTimer = {
    start          : start,
    startWithPrompt: startWithPrompt,
    stop           : stop,
    toggle         : toggle,
    getState       : getState,
    getSessions    : getSessions,
    openPanel      : openPanel,
    onTick         : onTick,
    fmt            : fmt,
    getTopics      : getTopics,
    setTopics      : setTopics,
  };
}());
