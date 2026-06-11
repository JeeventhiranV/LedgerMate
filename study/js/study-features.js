/* ══════════════════════════════════════════════════════════════════════════
   StudyFeatures — Production-Ready Learning Suite v1.0
   ─────────────────────────────────────────────────────────────────────────
   Features: Spaced Repetition · Mock Interview · Notes Export · Playlists
             Analytics · Bulk Mark · Leaderboard · Daily Goal
             Keyboard Shortcuts · Revision Reminders · Print/Cheat Sheet
   ─────────────────────────────────────────────────────────────────────────
   Load after: supabase-config.js, auth-guard.js, StudySync.js
   Usage: StudyFeatures.init(config) — see config definition below
══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Config shape (filled by init()) ──────────────────────────────────────
    {
      module       : 'dsa',                   // module name in Supabase
      getQuestions : () => [{id, title, diff?, tags?, hint?, category?}],
      getStatus    : (id) => 'done'|'inprogress'|null,
      setStatus    : (id, status) => void,    // null to clear
      getFavIds    : () => Set<id>,
      setFav       : (id, bool) => void,
      getNotes     : () => {id: text},
      setNote      : (id, text) => void,
      getTimestamps: () => {id: ISO_string},  // status_changed_at per question
      cardSelector : '.dsa-card',             // CSS selector for question cards
      cardIdAttr   : 'data-id',              // attr on card holding ID; null = index
      refreshUI    : () => void,             // called after bulk operations
    }
  ──────────────────────────────────────────────────────────────────────── */

  var _cfg = null;
  var _bulkActive = false;
  var _bulkSelected = new Set();
  var _mockState = null;
  var _mockTimer = null;
  var _focusIdx = -1;       // keyboard navigation: currently focused card index
  var _toastWrap = null;

  // ── Today's date string ──────────────────────────────────────────────────
  function _today() { return new Date().toISOString().split('T')[0]; }

  // ── HTML escape ──────────────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Supabase UID ─────────────────────────────────────────────────────────
  function _uid() {
    if (typeof _supabase === 'undefined' || !_supabase) return Promise.resolve(null);
    return _supabase.auth.getSession().then(function (r) {
      return r.data && r.data.session ? r.data.session.user.id : null;
    }).catch(function () { return null; });
  }

  // ── Get questions from config ────────────────────────────────────────────
  function _q() { return _cfg ? _cfg.getQuestions() : []; }

  /* ════════════════════════════════════════════════════════════════════════
     CSS — injected once into <head>
  ════════════════════════════════════════════════════════════════════════ */
  function _injectStyles() {
    if (document.getElementById('sf-styles')) return;
    var s = document.createElement('style');
    s.id = 'sf-styles';
    s.textContent = [
      /* ─── Toolbar ─── */
      '.sf-toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:7px 20px;background:var(--bg2,#111318);border-bottom:1px solid var(--border,#252b3a);position:sticky;top:57px;z-index:95}',
      '.sf-toolbar-label{font-size:10px;color:var(--text3,#6b7494);text-transform:uppercase;letter-spacing:.07em;font-weight:600;flex-shrink:0}',
      '.sf-btn{background:none;border:1px solid var(--border,#252b3a);border-radius:7px;padding:4px 9px;font-size:11px;font-weight:500;color:var(--text2,#9aa3bf);cursor:pointer;display:inline-flex;align-items:center;gap:4px;transition:all .14s;white-space:nowrap;position:relative}',
      '.sf-btn:hover{border-color:var(--blue,#4f8ef7);color:var(--blue,#4f8ef7);background:rgba(79,142,247,.07)}',
      '.sf-btn.sf-on{border-color:var(--blue,#4f8ef7);color:var(--blue,#4f8ef7);background:rgba(79,142,247,.12)}',
      '.sf-badge{background:var(--rose,#f43f5e);color:#fff;border-radius:20px;padding:0 4px;font-size:9px;font-weight:700;min-width:14px;text-align:center;line-height:14px;display:inline-block}',
      /* ─── Goal widget ─── */
      '.sf-goal-w{display:flex;align-items:center;gap:6px;margin-left:auto;background:var(--bg3,#181c24);border:1px solid var(--border,#252b3a);border-radius:20px;padding:4px 12px;cursor:pointer;font-size:11px;color:var(--text2,#9aa3bf);transition:border .14s;white-space:nowrap}',
      '.sf-goal-w:hover{border-color:var(--blue,#4f8ef7)}',
      '.sf-gtrack{width:60px;height:4px;background:var(--bg4,#1e2330);border-radius:4px;overflow:hidden}',
      '.sf-gfill{height:100%;background:linear-gradient(90deg,var(--teal,#06d6a0),var(--blue,#4f8ef7));border-radius:4px;transition:width .4s}',
      /* ─── Modal overlay ─── */
      '.sf-ov{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:9100;display:flex;align-items:flex-start;justify-content:center;padding:36px 14px;overflow-y:auto;backdrop-filter:blur(4px);animation:sfFadeIn .14s both}',
      '@keyframes sfFadeIn{from{opacity:0}to{opacity:1}}',
      '.sf-modal{background:var(--bg2,#111318);border:1px solid var(--border2,#2e3650);border-radius:16px;width:100%;max-width:600px;animation:sfSlideUp .18s both;flex-shrink:0}',
      '.sf-modal.wide{max-width:840px}',
      '@keyframes sfSlideUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}',
      '.sf-mhdr{display:flex;align-items:center;gap:10px;padding:18px 22px 14px;border-bottom:1px solid var(--border,#252b3a)}',
      '.sf-mtitle{font-family:"Syne",sans-serif;font-size:15px;font-weight:700;color:var(--text,#e8eaf2);flex:1}',
      '.sf-mclose{background:none;border:none;cursor:pointer;color:var(--text3,#6b7494);font-size:17px;line-height:1;padding:3px 5px;border-radius:5px;transition:color .14s}',
      '.sf-mclose:hover{color:var(--rose,#f43f5e)}',
      '.sf-mbody{padding:18px 22px}',
      '.sf-mfoot{display:flex;justify-content:flex-end;gap:8px;padding:14px 22px;border-top:1px solid var(--border,#252b3a)}',
      /* ─── Modal buttons ─── */
      '.sf-bprim{background:linear-gradient(135deg,var(--blue,#4f8ef7),var(--purple,#8b5cf6));border:none;border-radius:8px;padding:7px 18px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;transition:opacity .14s}',
      '.sf-bprim:hover{opacity:.85}.sf-bprim:disabled{opacity:.38;cursor:default}',
      '.sf-bsec{background:none;border:1px solid var(--border,#252b3a);border-radius:8px;padding:7px 14px;font-size:13px;color:var(--text2,#9aa3bf);cursor:pointer;transition:all .14s}',
      '.sf-bsec:hover{border-color:var(--blue,#4f8ef7);color:var(--blue,#4f8ef7)}',
      '.sf-bdanger{background:none;border:1px solid var(--rose,#f43f5e);border-radius:8px;padding:7px 14px;font-size:13px;color:var(--rose,#f43f5e);cursor:pointer;transition:all .14s}',
      '.sf-bdanger:hover{background:rgba(244,63,94,.1)}',
      /* ─── Toast ─── */
      '.sf-twrap{position:fixed;top:14px;right:14px;z-index:9999;display:flex;flex-direction:column;gap:6px;pointer-events:none}',
      '.sf-toast{background:var(--bg3,#181c24);border:1px solid var(--border2,#2e3650);border-radius:10px;padding:9px 15px;font-size:12px;color:var(--text,#e8eaf2);max-width:300px;animation:sfToastIn .18s both;pointer-events:auto;display:flex;align-items:center;gap:7px}',
      '.sf-toast.ok{border-color:rgba(6,214,160,.4)}.sf-toast.err{border-color:rgba(244,63,94,.4)}',
      '@keyframes sfToastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}',
      /* ─── Form helpers ─── */
      '.sf-row{display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap}',
      '.sf-lbl{font-size:12px;color:var(--text3,#6b7494);min-width:100px;flex-shrink:0}',
      '.sf-inp{flex:1;background:var(--bg3,#181c24);border:1px solid var(--border,#252b3a);border-radius:8px;padding:7px 11px;font-size:13px;color:var(--text,#e8eaf2);outline:none;font-family:inherit;transition:border .14s}',
      '.sf-inp:focus{border-color:var(--blue,#4f8ef7)}',
      '.sf-sel{background:var(--bg3,#181c24);border:1px solid var(--border,#252b3a);border-radius:8px;padding:6px 10px;font-size:13px;color:var(--text,#e8eaf2);outline:none;cursor:pointer}',
      '.sf-chips{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}',
      '.sf-chip{background:var(--bg3,#181c24);border:1px solid var(--border,#252b3a);border-radius:20px;padding:3px 11px;font-size:11px;color:var(--text2,#9aa3bf);cursor:pointer;transition:all .14s}',
      '.sf-chip:hover,.sf-chip.on{background:rgba(79,142,247,.1);border-color:var(--blue,#4f8ef7);color:var(--blue,#4f8ef7)}',
      /* ─── Analytics bars ─── */
      '.sf-arow{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:12px}',
      '.sf-albl{min-width:128px;color:var(--text2,#9aa3bf);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}',
      '.sf-atrack{flex:1;height:7px;background:var(--bg4,#1e2330);border-radius:4px;overflow:hidden}',
      '.sf-abar{height:100%;border-radius:4px;transition:width .6s cubic-bezier(.4,0,.2,1)}',
      '.sf-apct{min-width:34px;text-align:right;color:var(--text3,#6b7494);font-family:"JetBrains Mono",monospace;font-size:10px}',
      /* ─── Mock Interview ─── */
      '.sf-mock-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}',
      '.sf-timer{font-family:"JetBrains Mono",monospace;font-size:26px;font-weight:700;background:linear-gradient(135deg,var(--blue,#4f8ef7),var(--purple,#8b5cf6));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}',
      '.sf-timer.warn{background:linear-gradient(135deg,var(--rose,#f43f5e),var(--orange,#fb923c));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}',
      '.sf-mprog{font-size:12px;color:var(--text3,#6b7494);font-family:"JetBrains Mono",monospace}',
      '.sf-mqcard{background:var(--bg3,#181c24);border:1px solid var(--border2,#2e3650);border-radius:12px;padding:18px;margin-bottom:14px}',
      '.sf-mqtitle{font-size:15px;font-weight:600;color:var(--text,#e8eaf2);margin-bottom:8px;line-height:1.5}',
      '.sf-mqdiff{font-size:10px;font-weight:600;border-radius:20px;padding:2px 8px;font-family:"JetBrains Mono",monospace;margin-right:4px}',
      '.sf-mqdiff.easy{background:rgba(6,214,160,.12);color:var(--teal,#06d6a0)}',
      '.sf-mqdiff.medium{background:rgba(245,158,11,.12);color:var(--gold,#f59e0b)}',
      '.sf-mqdiff.hard{background:rgba(244,63,94,.12);color:var(--rose,#f43f5e)}',
      '.sf-mqans{margin-top:12px;padding:12px;background:var(--bg4,#1e2330);border-radius:8px;font-size:13px;color:var(--text2,#9aa3bf);line-height:1.65;display:none}',
      '.sf-mqans.show{display:block}',
      '.sf-mqans-lbl{font-size:10px;font-weight:600;color:var(--blue,#4f8ef7);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}',
      '.sf-mqact{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}',
      '.sf-result-center{text-align:center;padding:20px 0}',
      '.sf-big-score{font-family:"Syne",sans-serif;font-size:52px;font-weight:800;margin-bottom:6px;background:linear-gradient(135deg,var(--blue,#4f8ef7),var(--teal,#06d6a0));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}',
      '.sf-result-sub{font-size:13px;color:var(--text3,#6b7494)}',
      '.sf-result-rows{margin-top:16px;text-align:left}',
      '.sf-result-row{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border,#252b3a);font-size:12px}',
      '.sf-result-row:last-child{border:none}',
      '.sf-result-tag{font-size:10px;font-weight:600;padding:1px 7px;border-radius:20px;font-family:"JetBrains Mono",monospace}',
      '.sf-result-tag.correct{background:rgba(6,214,160,.12);color:var(--teal,#06d6a0)}',
      '.sf-result-tag.skipped{background:rgba(148,163,184,.1);color:#94a3b8}',
      /* ─── Bulk Mark bar ─── */
      '.sf-bulk-bar{position:fixed;bottom:0;left:0;right:0;z-index:8000;background:var(--bg2,#111318);border-top:1px solid var(--border2,#2e3650);padding:10px 22px;display:none;align-items:center;gap:10px;flex-wrap:wrap}',
      '.sf-bulk-bar.show{display:flex}',
      '.sf-bulk-cnt{font-size:13px;font-weight:600;color:var(--text,#e8eaf2)}',
      '.sf-bulk-sep{color:var(--border2,#2e3650)}',
      '.sf-cb{width:17px;height:17px;cursor:pointer;accent-color:var(--blue,#4f8ef7);flex-shrink:0}',
      '.sf-card-cb{position:absolute;top:12px;left:12px;z-index:20;display:none;width:17px;height:17px;cursor:pointer;accent-color:var(--blue,#4f8ef7)}',
      '.sf-bulk-mode .sf-card-cb{display:block}',
      '.sf-bulk-mode [data-sf-id]{position:relative}',
      /* ─── Leaderboard ─── */
      '.sf-lb-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border,#252b3a)}',
      '.sf-lb-row:last-child{border:none}',
      '.sf-lb-rank{width:26px;height:26px;border-radius:50%;background:var(--bg4,#1e2330);display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--text3,#6b7494);flex-shrink:0}',
      '.sf-lb-rank.g{background:rgba(245,158,11,.2);color:var(--gold,#f59e0b)}',
      '.sf-lb-rank.s{background:rgba(148,163,184,.18);color:#94a3b8}',
      '.sf-lb-rank.b{background:rgba(205,127,50,.18);color:#cd7f32}',
      '.sf-lb-name{flex:1;font-size:13px;color:var(--text2,#9aa3bf)}',
      '.sf-lb-name.me{color:var(--blue,#4f8ef7);font-weight:600}',
      '.sf-lb-score{font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:600;color:var(--teal,#06d6a0)}',
      /* ─── Spaced Repetition ─── */
      '.sf-srcard{background:var(--bg3,#181c24);border:1px solid var(--border,#252b3a);border-radius:10px;padding:11px 15px;margin-bottom:7px;display:flex;align-items:center;gap:10px}',
      '.sf-srcard.ov{border-color:rgba(244,63,94,.35)}.sf-srcard.tod{border-color:rgba(245,158,11,.35)}',
      '.sf-srinfo{flex:1}.sf-srtitle{font-size:13px;font-weight:600;color:var(--text,#e8eaf2);margin-bottom:2px}',
      '.sf-srdue{font-size:11px;color:var(--text3,#6b7494)}',
      '.sf-srbadge{font-size:10px;font-weight:600;border-radius:20px;padding:2px 7px;font-family:"JetBrains Mono",monospace}',
      '.sf-srbadge.ov{background:rgba(244,63,94,.12);color:var(--rose,#f43f5e)}',
      '.sf-srbadge.tod{background:rgba(245,158,11,.12);color:var(--gold,#f59e0b)}',
      /* ─── Playlist rows ─── */
      '.sf-plrow{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--border,#252b3a)}',
      '.sf-plrow:last-child{border:none}',
      '.sf-plname{flex:1;font-size:13px;color:var(--text,#e8eaf2);cursor:pointer}',
      '.sf-plname:hover{color:var(--blue,#4f8ef7)}',
      '.sf-plcnt{font-size:11px;color:var(--text3,#6b7494)}',
      /* ─── Keyboard shortcuts ─── */
      '.sf-kgrid{display:grid;grid-template-columns:1fr 1fr;gap:4px}',
      '.sf-krow{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border,#252b3a)}',
      '.sf-krow:last-child{border:none}',
      '.sf-kbd{background:var(--bg4,#1e2330);border:1px solid var(--border2,#2e3650);border-radius:4px;padding:2px 7px;font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--text2,#9aa3bf)}',
      '.sf-klbl{font-size:12px;color:var(--text2,#9aa3bf);flex:1}',
      /* ─── Reminder banner ─── */
      '.sf-reminder{margin:7px 22px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.22);border-radius:9px;padding:9px 14px;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--gold,#f59e0b)}',
      '.sf-rclose{background:none;border:none;cursor:pointer;color:var(--text3,#6b7494);font-size:15px;margin-left:auto;padding:2px}',
      '.sf-rclose:hover{color:var(--text,#e8eaf2)}',
      /* ─── Print ─── */
      '@media print{',
        '.sf-toolbar,.sf-bulk-bar,.sidebar,.topbar,.progress-section,.filter-bar,.roadmap-banner,',
        '.card-actions,.q-actions,.btn-mark,.btn-hint,.btn-code,.q-fav-btn,.q-note-btn,',
        '.menu-btn,.theme-btn,.clear-btn,.back-btn,.cat-btn,.overlay,.sf-no-print{display:none!important}',
        '.main{margin-left:0!important}',
        'body{background:#fff!important;color:#000!important}',
        '.sf-pblock{break-inside:avoid;margin-bottom:16px;border:1px solid #ccc;padding:12px;border-radius:6px}',
        '.sf-ptitle{font-weight:700;font-size:14px;margin-bottom:4px}',
        '.sf-pmeta{font-size:11px;color:#666;margin-bottom:4px}',
        '.sf-pnote{font-size:13px;line-height:1.65;color:#333;white-space:pre-wrap}',
        '@page{margin:18mm}',
      '}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ════════════════════════════════════════════════════════════════════════
     TOAST
  ════════════════════════════════════════════════════════════════════════ */
  function _toast(msg, type) {
    if (!_toastWrap) {
      _toastWrap = document.createElement('div');
      _toastWrap.className = 'sf-twrap';
      document.body.appendChild(_toastWrap);
    }
    var el = document.createElement('div');
    el.className = 'sf-toast' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
    el.textContent = msg;
    _toastWrap.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 300);
    }, 3000);
  }

  /* ════════════════════════════════════════════════════════════════════════
     MODAL SYSTEM
  ════════════════════════════════════════════════════════════════════════ */
  function _modal(id, title, bodyFn, footerFn, wide) {
    _closeModal(id);
    var ov = document.createElement('div');
    ov.className = 'sf-ov';
    ov.id = 'sf-ov-' + id;
    var modal = document.createElement('div');
    modal.className = 'sf-modal' + (wide ? ' wide' : '');
    modal.id = 'sf-modal-' + id;
    modal.innerHTML = '<div class="sf-mhdr">' +
      '<div class="sf-mtitle">' + title + '</div>' +
      '<button class="sf-mclose" onclick="window.StudyFeatures._close(\'' + id + '\')">✕</button>' +
      '</div>' +
      '<div class="sf-mbody" id="sf-body-' + id + '"></div>' +
      '<div class="sf-mfoot" id="sf-foot-' + id + '"></div>';
    ov.appendChild(modal);
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) _closeModal(id); });
    if (bodyFn) bodyFn(document.getElementById('sf-body-' + id));
    if (footerFn) footerFn(document.getElementById('sf-foot-' + id));
  }

  function _closeModal(id) {
    var el = document.getElementById('sf-ov-' + id);
    if (el) el.remove();
  }

  /* ════════════════════════════════════════════════════════════════════════
     TOOLBAR
  ════════════════════════════════════════════════════════════════════════ */
  function _buildToolbar() {
    var ref = document.querySelector('.topbar, .top-bar, header.topbar');
    if (!ref) return;
    if (document.getElementById('sf-toolbar')) return;

    var tb = document.createElement('div');
    tb.className = 'sf-toolbar';
    tb.id = 'sf-toolbar';

    var btns = [
      ['⏱️ Mock', 'StudyFeatures.mock()', 'mock', 'Mock Interview Mode'],
      ['📅 Due', 'StudyFeatures.spaced()', 'sr', 'Spaced Repetition'],
      ['📊 Analytics', 'StudyFeatures.analytics()', 'ana', 'Analytics Dashboard'],
      ['🏆 Board', 'StudyFeatures.leaderboard()', 'lb', 'Peer Leaderboard'],
      ['📚 Playlists', 'StudyFeatures.playlists()', 'pl', 'Custom Playlists'],
      ['☑️ Bulk', 'StudyFeatures.bulk()', 'bulk', 'Bulk Mark Questions'],
      ['📤 Export', 'StudyFeatures.exportMenu()', 'exp', 'Export Notes'],
      ['🖨️ Print', 'StudyFeatures.print()', 'prt', 'Print Cheat Sheet'],
      ['⌨️', 'StudyFeatures.shortcuts()', 'kbd', 'Keyboard Shortcuts (?)'],
    ];

    tb.innerHTML = '<span class="sf-toolbar-label">🚀 Features</span>' +
      btns.map(function (b) {
        return '<button class="sf-btn" id="sf-b-' + b[2] + '" onclick="' + b[1] + '" title="' + b[3] + '">' + b[0] + '</button>';
      }).join('') +
      '<div class="sf-goal-w sf-no-print" id="sf-gw" onclick="StudyFeatures.goal()" title="Daily Goal">' +
      '🎯 <span id="sf-gd">0</span>/<span id="sf-gt">5</span>' +
      '<div class="sf-gtrack"><div class="sf-gfill" id="sf-gf" style="width:0%"></div></div>' +
      '</div>';

    ref.insertAdjacentElement('afterend', tb);
    _updateGoalBar();
    _updateSRBadge();
  }

  /* ════════════════════════════════════════════════════════════════════════
     1. SPACED REPETITION
     Intervals: 1 → 3 → 7 → 14 → 30 days after status_changed_at
  ════════════════════════════════════════════════════════════════════════ */
  var SR_INT = [1, 3, 7, 14, 30];

  function _srDaysUntil(ts) {
    if (!ts) return null;
    var daysSince = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
    for (var i = 0; i < SR_INT.length; i++) {
      if (daysSince < SR_INT[i]) return SR_INT[i] - daysSince;
    }
    return 0; // past all intervals → overdue
  }

  function _srItems() {
    var questions = _q();
    var timestamps = (_cfg && _cfg.getTimestamps) ? _cfg.getTimestamps() : {};
    var out = [];
    questions.forEach(function (q) {
      if (_cfg.getStatus(q.id) !== 'done') return;
      var ts = timestamps[q.id];
      if (!ts) return;
      var d = _srDaysUntil(ts);
      if (d !== null && d <= 1) out.push({ id: q.id, title: q.title, d: d, ts: ts });
    });
    return out.sort(function (a, b) { return a.d - b.d; });
  }

  function _updateSRBadge() {
    var btn = document.getElementById('sf-b-sr');
    if (!btn) return;
    var items = _srItems();
    var old = btn.querySelector('.sf-badge');
    if (old) old.remove();
    if (items.length > 0) {
      var sp = document.createElement('span');
      sp.className = 'sf-badge';
      sp.textContent = items.length;
      btn.appendChild(sp);
    }
  }

  function _showSpaced() {
    var items = _srItems();
    _modal('sr', '📅 Spaced Repetition — Due for Review', function (body) {
      if (!items.length) {
        body.innerHTML = '<div style="text-align:center;padding:32px"><div style="font-size:32px;margin-bottom:8px">🎉</div><div style="font-size:14px;font-weight:600;color:var(--teal,#06d6a0)">You\'re up to date!</div><div style="font-size:12px;color:var(--text3,#6b7494);margin-top:6px">No items due for review right now.</div></div>';
        return;
      }
      var html = '<p style="font-size:12px;color:var(--text3,#6b7494);margin-bottom:14px">Intervals: 1→3→7→14→30 days after last review. Re-study these to strengthen recall.</p>';
      items.forEach(function (item) {
        var ov = item.d <= 0;
        html += '<div class="sf-srcard ' + (ov ? 'ov' : 'tod') + '">' +
          '<div class="sf-srinfo"><div class="sf-srtitle">' + _esc(item.title) + '</div>' +
          '<div class="sf-srdue">Last reviewed: ' + (typeof StudySync !== 'undefined' ? StudySync.ago(item.ts) : 'recently') + '</div></div>' +
          '<span class="sf-srbadge ' + (ov ? 'ov' : 'tod') + '">' + (ov ? 'Overdue' : 'Due today') + '</span>' +
          '</div>';
      });
      body.innerHTML = html;
    }, function (foot) {
      foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'sr\')">Close</button>';
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     2. MOCK INTERVIEW MODE
  ════════════════════════════════════════════════════════════════════════ */
  function _mock() {
    var qs = _q();
    if (!qs.length) { _toast('No questions found', 'err'); return; }

    // Config modal
    var cats = {};
    qs.forEach(function (q) { if (q.category) cats[q.category] = true; });
    var catKeys = Object.keys(cats);

    _modal('mock-cfg', '⏱️ Mock Interview Setup', function (body) {
      body.innerHTML = '<div class="sf-row">' +
        '<span class="sf-lbl">Questions</span>' +
        '<input class="sf-inp" id="sf-mn" type="number" min="1" max="' + Math.min(30, qs.length) + '" value="' + Math.min(10, qs.length) + '" style="width:70px;flex:none"/>' +
        '</div>' +
        '<div class="sf-row"><span class="sf-lbl">Time limit</span>' +
        '<select class="sf-sel" id="sf-mt"><option value="0">Untimed</option><option value="15">15 min</option><option value="30" selected>30 min</option><option value="45">45 min</option><option value="60">60 min</option></select>' +
        '</div>' +
        '<div class="sf-row"><span class="sf-lbl">Difficulty</span>' +
        '<div class="sf-chips" id="sf-mdiff">' +
        ['all','easy','medium','hard'].map(function(d,i){return '<div class="sf-chip'+(i===0?' on':'')+'" data-v="'+d+'">'+_esc(d.charAt(0).toUpperCase()+d.slice(1))+'</div>';}).join('') +
        '</div></div>' +
        (catKeys.length ? '<div class="sf-row"><span class="sf-lbl">Category</span>' +
        '<div class="sf-chips" id="sf-mcat">' +
        '<div class="sf-chip on" data-v="all">All</div>' +
        catKeys.map(function(c){return '<div class="sf-chip" data-v="'+_esc(c)+'">'+_esc(c)+'</div>';}).join('') +
        '</div></div>' : '');

      body.querySelectorAll('.sf-chips').forEach(function (row) {
        row.querySelectorAll('.sf-chip').forEach(function (chip) {
          chip.addEventListener('click', function () {
            row.querySelectorAll('.sf-chip').forEach(function (c) { c.classList.remove('on'); });
            chip.classList.add('on');
          });
        });
      });
    }, function (foot) {
      foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'mock-cfg\')">Cancel</button>' +
        '<button class="sf-bprim" onclick="StudyFeatures._runMock()">Start →</button>';
    });
  }

  function _runMock() {
    var n = parseInt(document.getElementById('sf-mn').value, 10) || 10;
    var t = parseInt(document.getElementById('sf-mt').value, 10);
    var diffEl = document.querySelector('#sf-mdiff .sf-chip.on');
    var catEl = document.querySelector('#sf-mcat .sf-chip.on');
    var diff = diffEl ? diffEl.dataset.v : 'all';
    var cat = catEl ? catEl.dataset.v : 'all';

    var pool = _q().filter(function (q) {
      if (diff !== 'all' && q.diff !== diff) return false;
      if (cat !== 'all' && q.category !== cat) return false;
      return true;
    });
    if (!pool.length) { _toast('No questions match those filters', 'err'); return; }
    // shuffle
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
    }
    pool = pool.slice(0, Math.min(n, pool.length));

    _mockState = { qs: pool, idx: 0, results: [], timeLeft: t * 60, timed: t > 0 };
    _closeModal('mock-cfg');
    _renderMockQ();
  }

  function _renderMockQ() {
    if (!_mockState) return;
    var st = _mockState;
    if (st.idx >= st.qs.length) { _showMockResult(); return; }
    var q = st.qs[st.idx];

    _modal('mock', '⏱️ Mock Interview', function (body) {
      body.innerHTML = '<div class="sf-mock-hdr">' +
        '<div class="sf-timer" id="sf-timer">' + (st.timed ? _fmtTime(st.timeLeft) : '∞') + '</div>' +
        '<div class="sf-mprog">Q ' + (st.idx + 1) + ' / ' + st.qs.length + '</div>' +
        '</div>' +
        '<div class="sf-mqcard">' +
        '<div class="sf-mqtitle">' + _esc(q.title) + '</div>' +
        '<div>' + (q.diff ? '<span class="sf-mqdiff '+_esc(q.diff)+'">'+_esc(q.diff)+'</span>' : '') +
        (q.tags ? q.tags.slice(0,3).map(function(t){return '<span class="sf-mqdiff" style="background:var(--bg4,#1e2330);color:var(--text2,#9aa3bf)">'+_esc(t)+'</span>';}).join('') : '') +
        '</div>' +
        '<div class="sf-mqans" id="sf-mqans" style="display:none">' +
        '<div class="sf-mqans-lbl">💡 Hint / Approach</div>' +
        '<div>' + _esc(q.hint || 'Think through the problem systematically.') + '</div>' +
        (q.approach ? '<div style="margin-top:8px;font-size:12px;opacity:.85">' + _esc(q.approach) + '</div>' : '') +
        '</div>' +
        '<div class="sf-mqact">' +
        '<button class="sf-bsec" onclick="StudyFeatures._mockReveal()">Reveal Answer</button>' +
        '<button class="sf-bprim" onclick="StudyFeatures._mockDone()">✓ Got it</button>' +
        '<button class="sf-bsec" onclick="StudyFeatures._mockSkip()">Skip →</button>' +
        '<button class="sf-bdanger" onclick="StudyFeatures._mockEnd()">End</button>' +
        '</div>' +
        '</div>';
    }, null);

    // Remove default footer
    var foot = document.getElementById('sf-foot-mock');
    if (foot) foot.style.display = 'none';

    // Timer
    clearInterval(_mockTimer);
    if (st.timed) {
      _mockTimer = setInterval(function () {
        if (!_mockState) { clearInterval(_mockTimer); return; }
        _mockState.timeLeft--;
        var timerEl = document.getElementById('sf-timer');
        if (timerEl) {
          timerEl.textContent = _fmtTime(_mockState.timeLeft);
          if (_mockState.timeLeft <= 60) timerEl.classList.add('warn');
        }
        if (_mockState.timeLeft <= 0) { clearInterval(_mockTimer); _showMockResult(); }
      }, 1000);
    }
  }

  function _fmtTime(s) {
    var m = Math.floor(s / 60), sec = s % 60;
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  function _mockReveal() {
    var el = document.getElementById('sf-mqans');
    if (!el) return;
    el.style.display = 'block';
    el.classList.add('show');
    // Hide the reveal button so user can't click it again
    var btn = document.querySelector('.sf-mqact .sf-bsec');
    if (btn && btn.textContent.trim() === 'Reveal Answer') btn.style.display = 'none';
  }

  function _mockDone() {
    if (!_mockState) return;
    var q = _mockState.qs[_mockState.idx];
    _mockState.results.push({ id: q.id, title: q.title, result: 'correct' });
    _mockState.idx++;
    _renderMockQ();
  }

  function _mockSkip() {
    if (!_mockState) return;
    var q = _mockState.qs[_mockState.idx];
    _mockState.results.push({ id: q.id, title: q.title, result: 'skipped' });
    _mockState.idx++;
    _renderMockQ();
  }

  function _mockEnd() {
    clearInterval(_mockTimer);
    // fill remaining as skipped
    if (_mockState) {
      for (var i = _mockState.idx; i < _mockState.qs.length; i++) {
        _mockState.results.push({ id: _mockState.qs[i].id, title: _mockState.qs[i].title, result: 'skipped' });
      }
      _mockState.idx = _mockState.qs.length;
    }
    _showMockResult();
  }

  function _showMockResult() {
    clearInterval(_mockTimer);
    if (!_mockState) return;
    var results = _mockState.results;
    var correct = results.filter(function (r) { return r.result === 'correct'; }).length;
    var pct = results.length ? Math.round((correct / results.length) * 100) : 0;
    var emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : pct >= 40 ? '📖' : '💪';

    _modal('mock', '⏱️ Interview Result', function (body) {
      body.innerHTML = '<div class="sf-result-center">' +
        '<div class="sf-big-score">' + emoji + ' ' + correct + '/' + results.length + '</div>' +
        '<div class="sf-result-sub">' + pct + '% correct' + (pct >= 70 ? ' — Great job!' : ' — Keep practising!') + '</div>' +
        '</div>' +
        '<div class="sf-result-rows">' +
        results.map(function (r) {
          return '<div class="sf-result-row"><span class="sf-result-tag ' + r.result + '">' + r.result + '</span>' +
            '<span style="font-size:12px;color:var(--text2,#9aa3bf);flex:1">' + _esc(r.title) + '</span></div>';
        }).join('') +
        '</div>';
    }, function (foot) {
      foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'mock\')">Close</button>' +
        '<button class="sf-bprim" onclick="StudyFeatures.mock()">Try Again</button>';
    });
    _mockState = null;
  }

  /* ════════════════════════════════════════════════════════════════════════
     3. ANALYTICS DASHBOARD
  ════════════════════════════════════════════════════════════════════════ */
  function _analytics() {
    var qs = _q();
    var total = qs.length;
    var done = 0, inprog = 0, todo = 0;
    var byDiff = { easy: { t: 0, d: 0 }, medium: { t: 0, d: 0 }, hard: { t: 0, d: 0 } };
    var byCat = {};

    qs.forEach(function (q) {
      var st = _cfg.getStatus(q.id);
      if (st === 'done') done++; else if (st === 'inprogress') inprog++; else todo++;
      if (q.diff && byDiff[q.diff]) { byDiff[q.diff].t++; if (st === 'done') byDiff[q.diff].d++; }
      var cat = q.category || 'General';
      if (!byCat[cat]) byCat[cat] = { t: 0, d: 0 };
      byCat[cat].t++;
      if (st === 'done') byCat[cat].d++;
    });

    var pct = total ? Math.round((done / total) * 100) : 0;

    _modal('ana', '📊 Analytics Dashboard', function (body) {
      // Summary row
      var sumHtml = '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">' +
        _anaChip('Total', total, '#4f8ef7') +
        _anaChip('Done ✓', done, '#06d6a0') +
        _anaChip('In Progress', inprog, '#f59e0b') +
        _anaChip('Todo', todo, '#8a95b8') +
        _anaChip('Completion', pct + '%', pct >= 75 ? '#06d6a0' : pct >= 40 ? '#f59e0b' : '#f43f5e') +
        '</div>';

      // Difficulty breakdown
      var diffHtml = '<div style="font-size:11px;font-weight:600;color:var(--text3,#6b7494);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">By Difficulty</div>';
      ['easy', 'medium', 'hard'].forEach(function (d) {
        var info = byDiff[d];
        if (!info.t) return;
        var p = Math.round((info.d / info.t) * 100);
        var color = d === 'easy' ? '#06d6a0' : d === 'medium' ? '#f59e0b' : '#f43f5e';
        diffHtml += _anaBar(_esc(d.charAt(0).toUpperCase() + d.slice(1)), p, info.d + '/' + info.t, color);
      });

      // Category breakdown
      var catKeys = Object.keys(byCat).sort(function (a, b) { return byCat[b].d - byCat[a].d; });
      var catHtml = '<div style="font-size:11px;font-weight:600;color:var(--text3,#6b7494);text-transform:uppercase;letter-spacing:.06em;margin:16px 0 8px">By Category</div>';
      catKeys.forEach(function (cat) {
        var info = byCat[cat];
        var p = Math.round((info.d / info.t) * 100);
        var color = p >= 75 ? '#06d6a0' : p >= 40 ? '#4f8ef7' : '#f59e0b';
        catHtml += _anaBar(_esc(cat), p, info.d + '/' + info.t, color);
      });

      body.innerHTML = sumHtml + diffHtml + catHtml;
    }, function (foot) {
      foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'ana\')">Close</button>';
    }, true);
  }

  function _anaChip(label, val, color) {
    return '<div style="background:var(--bg3,#181c24);border:1px solid var(--border,#252b3a);border-radius:10px;padding:10px 16px;text-align:center;min-width:80px">' +
      '<div style="font-family:\'JetBrains Mono\',monospace;font-size:18px;font-weight:700;color:' + color + '">' + val + '</div>' +
      '<div style="font-size:11px;color:var(--text3,#6b7494);margin-top:2px">' + label + '</div>' +
      '</div>';
  }

  function _anaBar(label, pct, sub, color) {
    return '<div class="sf-arow">' +
      '<div class="sf-albl" title="' + label + '">' + label + '</div>' +
      '<div class="sf-atrack"><div class="sf-abar" style="width:' + pct + '%;background:' + color + '"></div></div>' +
      '<div class="sf-apct">' + sub + '</div>' +
      '</div>';
  }

  /* ════════════════════════════════════════════════════════════════════════
     4. PEER LEADERBOARD
  ════════════════════════════════════════════════════════════════════════ */
  function _leaderboard() {
    _modal('lb', '🏆 Peer Leaderboard', function (body) {
      body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3,#6b7494);font-size:13px">Loading…</div>';
      if (typeof _supabase === 'undefined' || !_supabase) {
        body.innerHTML = '<div style="padding:20px;color:var(--text3,#6b7494);font-size:13px;text-align:center">Supabase not configured.</div>';
        return;
      }
      _supabase.rpc('study_leaderboard', { p_module: _cfg.module })
        .then(function (res) {
          if (res.error || !res.data || !res.data.length) {
            body.innerHTML = '<div style="padding:24px;text-align:center"><div style="font-size:24px;margin-bottom:8px">🌱</div><div style="font-size:13px;color:var(--text3,#6b7494)">No data yet — be the first to complete questions!</div></div>';
            return;
          }
          var total = _q().length;
          var html = '<div style="font-size:12px;color:var(--text3,#6b7494);margin-bottom:14px">Anonymised completion counts for <strong style="color:var(--text,#e8eaf2)">' + _cfg.module.toUpperCase() + '</strong>. Only users who completed at least one question are shown.</div>';
          res.data.forEach(function (row) {
            var rank = Number(row.rank);
            var rankCls = rank === 1 ? ' g' : rank === 2 ? ' s' : rank === 3 ? ' b' : '';
            var rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
            var pct = total ? Math.round((row.done_count / total) * 100) : 0;
            html += '<div class="sf-lb-row">' +
              '<div class="sf-lb-rank' + rankCls + '">' + rankIcon + '</div>' +
              '<div class="sf-lb-name' + (row.is_me ? ' me' : '') + '">' + (row.is_me ? 'You 👈' : 'User #' + rank) + '</div>' +
              '<div class="sf-lb-score">' + row.done_count + ' done (' + pct + '%)</div>' +
              '</div>';
          });
          body.innerHTML = html;
        }).catch(function (e) {
          body.innerHTML = '<div style="padding:20px;color:var(--rose,#f43f5e);font-size:13px;text-align:center">Error loading leaderboard: ' + _esc(e.message || 'Unknown error') + '</div>';
        });
    }, function (foot) {
      foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'lb\')">Close</button>';
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     5. CUSTOM PLAYLISTS (Supabase CRUD)
  ════════════════════════════════════════════════════════════════════════ */
  function _playlists() {
    _modal('pl', '📚 Custom Playlists', function (body) {
      body.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3,#6b7494);font-size:13px">Loading…</div>';
      _loadPlaylists().then(function (rows) { _renderPlaylists(body, rows); }).catch(function () { _renderPlaylists(body, []); });
    }, function (foot) {
      foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'pl\')">Close</button>' +
        '<button class="sf-bprim" onclick="StudyFeatures._newPlaylist()">+ New Playlist</button>';
    });
  }

  function _loadPlaylists() {
    if (typeof _supabase === 'undefined' || !_supabase) return Promise.resolve([]);
    return _supabase.from('study_playlists').select('id,name,items').order('created_at', { ascending: false })
      .then(function (res) { return res.data || []; }).catch(function () { return []; });
  }

  function _renderPlaylists(body, rows) {
    if (!rows.length) {
      body.innerHTML = '<div style="text-align:center;padding:24px"><div style="font-size:28px;margin-bottom:8px">📁</div>' +
        '<div style="font-size:13px;color:var(--text3,#6b7494)">No playlists yet. Create one to group questions for focused review.</div></div>';
      return;
    }
    body.innerHTML = rows.map(function (pl) {
      var cnt = Array.isArray(pl.items) ? pl.items.filter(function (i) { return i.module === _cfg.module; }).length : 0;
      return '<div class="sf-plrow">' +
        '<div class="sf-plname" onclick="StudyFeatures._viewPlaylist(\'' + _esc(pl.id) + '\')">' + _esc(pl.name) + '</div>' +
        '<div class="sf-plcnt">' + cnt + ' in this module</div>' +
        '<button class="sf-btn" title="Delete" onclick="StudyFeatures._deletePlaylist(\'' + _esc(pl.id) + '\',\'' + _esc(pl.name) + '\')">🗑️</button>' +
        '</div>';
    }).join('');
  }

  function _newPlaylist() {
    _modal('pl-new', 'New Playlist', function (body) {
      body.innerHTML = '<div class="sf-row"><span class="sf-lbl">Name</span>' +
        '<input class="sf-inp" id="sf-pln" placeholder="e.g. Weak Areas, Review Before Interview" maxlength="60"/></div>';
      setTimeout(function () { var el = document.getElementById('sf-pln'); if (el) el.focus(); }, 50);
    }, function (foot) {
      foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'pl-new\')">Cancel</button>' +
        '<button class="sf-bprim" onclick="StudyFeatures._createPlaylist()">Create</button>';
    });
  }

  function _createPlaylist() {
    var nameEl = document.getElementById('sf-pln');
    var name = (nameEl ? nameEl.value : '').trim();
    if (!name) { _toast('Enter a playlist name', 'err'); return; }
    if (typeof _supabase === 'undefined') { _toast('Supabase not configured', 'err'); return; }
    _uid().then(function (uid) {
      if (!uid) { _toast('Not signed in', 'err'); return; }
      return _supabase.from('study_playlists').insert({ user_id: uid, name: name, items: [] });
    }).then(function (res) {
      if (res && res.error) throw new Error(res.error.message);
      _closeModal('pl-new');
      _toast('Playlist "' + name + '" created', 'ok');
      _playlists();
    }).catch(function (e) { _toast('Error: ' + (e.message || 'Could not create'), 'err'); });
  }

  function _deletePlaylist(id, name) {
    if (!confirm('Delete playlist "' + name + '"? This cannot be undone.')) return;
    _supabase.from('study_playlists').delete().eq('id', id)
      .then(function () { _toast('Deleted "' + name + '"', 'ok'); _playlists(); })
      .catch(function (e) { _toast('Error: ' + e.message, 'err'); });
  }

  function _viewPlaylist(id) {
    _loadPlaylists().then(function (rows) {
      var pl = rows.find(function (r) { return r.id === id; });
      if (!pl) return;
      var moduleItems = (pl.items || []).filter(function (i) { return i.module === _cfg.module; });
      _modal('pl-view', '📚 ' + _esc(pl.name), function (body) {
        if (!moduleItems.length) {
          body.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3,#6b7494);font-size:13px">No questions from <strong>' + _esc(_cfg.module.toUpperCase()) + '</strong> in this playlist yet.<br>Use "Add to Playlist" on any question card.</div>';
          return;
        }
        var qs = _q();
        var qMap = {};
        qs.forEach(function (q) { qMap[q.id] = q; });
        body.innerHTML = moduleItems.map(function (item) {
          var q = qMap[item.id];
          if (!q) return '';
          var st = _cfg.getStatus(item.id);
          return '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border,#252b3a)">' +
            (st === 'done' ? '<span style="color:var(--teal,#06d6a0);font-size:13px">✓</span>' : st === 'inprogress' ? '<span style="color:var(--gold,#f59e0b);font-size:12px">⏳</span>' : '<span style="font-size:12px;color:var(--text3,#6b7494)">○</span>') +
            '<span style="font-size:13px;color:var(--text,#e8eaf2);flex:1">' + _esc(q.title) + '</span>' +
            '<button class="sf-btn" onclick="StudyFeatures._removeFromPlaylist(\'' + _esc(id) + '\',\'' + _esc(item.id) + '\')" title="Remove">✕</button>' +
            '</div>';
        }).join('');
      }, function (foot) {
        foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'pl-view\')">Close</button>';
      });
    });
  }

  // Add question to a playlist — called from card context menu
  function _addToPlaylist(qId) {
    _loadPlaylists().then(function (rows) {
      if (!rows.length) { _toast('Create a playlist first', ''); return; }
      _modal('pl-add', 'Add to Playlist', function (body) {
        body.innerHTML = '<div style="font-size:13px;color:var(--text2,#9aa3bf);margin-bottom:12px">Select a playlist:</div>' +
          rows.map(function (pl) {
            return '<div class="sf-plrow"><div class="sf-plname" onclick="StudyFeatures._doAddToPlaylist(\'' + _esc(pl.id) + '\',\'' + _esc(qId) + '\')">' + _esc(pl.name) + '</div></div>';
          }).join('');
      }, function (foot) {
        foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'pl-add\')">Cancel</button>';
      });
    });
  }

  function _doAddToPlaylist(plId, qId) {
    _loadPlaylists().then(function (rows) {
      var pl = rows.find(function (r) { return r.id === plId; });
      if (!pl) return;
      var items = pl.items || [];
      var exists = items.some(function (i) { return i.module === _cfg.module && i.id === qId; });
      if (exists) { _toast('Already in this playlist', ''); _closeModal('pl-add'); return; }
      items.push({ module: _cfg.module, id: qId });
      return _supabase.from('study_playlists').update({ items: items, updated_at: new Date().toISOString() }).eq('id', plId);
    }).then(function () {
      _closeModal('pl-add');
      _toast('Added to playlist', 'ok');
    }).catch(function (e) { _toast('Error: ' + (e ? e.message : ''), 'err'); });
  }

  function _removeFromPlaylist(plId, qId) {
    _loadPlaylists().then(function (rows) {
      var pl = rows.find(function (r) { return r.id === plId; });
      if (!pl) return;
      var items = (pl.items || []).filter(function (i) { return !(i.module === _cfg.module && i.id === qId); });
      return _supabase.from('study_playlists').update({ items: items, updated_at: new Date().toISOString() }).eq('id', plId);
    }).then(function () {
      _toast('Removed from playlist', 'ok');
      _closeModal('pl-view');
    }).catch(function (e) { _toast('Error: ' + (e ? e.message : ''), 'err'); });
  }

  /* ════════════════════════════════════════════════════════════════════════
     6. BULK MARK
  ════════════════════════════════════════════════════════════════════════ */
  function _toggleBulk() {
    _bulkActive = !_bulkActive;
    _bulkSelected.clear();
    document.getElementById('sf-b-bulk').classList.toggle('sf-on', _bulkActive);

    var container = document.querySelector('.content, main, .main-content, #mainContent');
    if (container) container.classList.toggle('sf-bulk-mode', _bulkActive);

    if (_bulkActive) {
      _injectCheckboxes();
      _showBulkBar();
    } else {
      _removeCheckboxes();
      _hideBulkBar();
    }
  }

  function _injectCheckboxes() {
    if (!_cfg.cardSelector) return;
    var cards = document.querySelectorAll(_cfg.cardSelector);
    cards.forEach(function (card, idx) {
      if (card.querySelector('.sf-card-cb')) return;
      var id = _cfg.cardIdAttr ? card.getAttribute(_cfg.cardIdAttr) : String(idx);
      if (!id) return;
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'sf-card-cb';
      cb.dataset.sfId = id;
      cb.addEventListener('change', function () {
        if (cb.checked) _bulkSelected.add(id); else _bulkSelected.delete(id);
        _updateBulkCount();
      });
      card.style.position = 'relative';
      card.insertBefore(cb, card.firstChild);
    });
  }

  function _removeCheckboxes() {
    document.querySelectorAll('.sf-card-cb').forEach(function (cb) { cb.remove(); });
  }

  function _showBulkBar() {
    var bar = document.getElementById('sf-bulk-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'sf-bulk-bar';
      bar.className = 'sf-bulk-bar';
      bar.innerHTML = '<span class="sf-bulk-cnt" id="sf-bulk-cnt">0 selected</span>' +
        '<span class="sf-bulk-sep">|</span>' +
        '<span style="font-size:12px;color:var(--text3,#6b7494)">Mark as:</span>' +
        '<button class="sf-btn" onclick="StudyFeatures._bulkMark(\'done\')">✓ Done</button>' +
        '<button class="sf-btn" onclick="StudyFeatures._bulkMark(\'inprogress\')">⏳ In Progress</button>' +
        '<button class="sf-btn" onclick="StudyFeatures._bulkMark(null)">✕ Clear</button>' +
        '<button class="sf-btn" onclick="StudyFeatures._selectAll()">Select All</button>' +
        '<button class="sf-bsec" style="margin-left:auto" onclick="StudyFeatures.bulk()">Done</button>';
      document.body.appendChild(bar);
    }
    bar.classList.add('show');
    _updateBulkCount();
  }

  function _hideBulkBar() {
    var bar = document.getElementById('sf-bulk-bar');
    if (bar) bar.classList.remove('show');
  }

  function _updateBulkCount() {
    var el = document.getElementById('sf-bulk-cnt');
    if (el) el.textContent = _bulkSelected.size + ' selected';
  }

  function _selectAll() {
    document.querySelectorAll('.sf-card-cb').forEach(function (cb) {
      cb.checked = true;
      _bulkSelected.add(cb.dataset.sfId);
    });
    _updateBulkCount();
  }

  function _bulkMark(status) {
    if (!_bulkSelected.size) { _toast('Select questions first', ''); return; }
    var ids = Array.from(_bulkSelected);
    ids.forEach(function (id) { _cfg.setStatus(id, status); });
    if (_cfg.refreshUI) _cfg.refreshUI();
    _toast('Marked ' + ids.size + ' questions', 'ok');
    // uncheck all
    document.querySelectorAll('.sf-card-cb').forEach(function (cb) { cb.checked = false; });
    _bulkSelected.clear();
    _updateBulkCount();
    _updateGoalBar();
  }

  /* ════════════════════════════════════════════════════════════════════════
     7. DAILY GOAL
  ════════════════════════════════════════════════════════════════════════ */
  var _GOAL_KEY = 'sf_goal_';

  function _goalKey() { return _GOAL_KEY + (_cfg ? _cfg.module : 'global'); }

  function _loadGoal() {
    try { return JSON.parse(localStorage.getItem(_goalKey()) || '{"target":5}'); } catch { return { target: 5 }; }
  }

  function _saveGoalTarget(n) {
    var g = _loadGoal();
    g.target = n;
    localStorage.setItem(_goalKey(), JSON.stringify(g));
    // Persist to Supabase (fire & forget)
    if (typeof _supabase !== 'undefined' && _supabase && _cfg) {
      _uid().then(function (uid) {
        if (!uid) return;
        _supabase.from('study_goals').upsert(
          { user_id: uid, module: _cfg.module, daily_target: n, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,module' }
        ).then(function () {});
      }).catch(function () {});
    }
  }

  function _todayDone() {
    var ts = (_cfg && _cfg.getTimestamps) ? _cfg.getTimestamps() : {};
    var today = _today();
    var count = 0;
    Object.keys(ts).forEach(function (id) {
      if (ts[id] && ts[id].startsWith(today) && _cfg.getStatus(id) === 'done') count++;
    });
    return count;
  }

  function _updateGoalBar() {
    var g = _loadGoal();
    var done = _todayDone();
    var pct = g.target > 0 ? Math.min(100, Math.round((done / g.target) * 100)) : 0;
    var dEl = document.getElementById('sf-gd');
    var tEl = document.getElementById('sf-gt');
    var fEl = document.getElementById('sf-gf');
    if (dEl) dEl.textContent = done;
    if (tEl) tEl.textContent = g.target;
    if (fEl) fEl.style.width = pct + '%';
  }

  function _showGoal() {
    var g = _loadGoal();
    var done = _todayDone();
    _modal('goal', '🎯 Daily Study Goal', function (body) {
      body.innerHTML = '<div style="text-align:center;padding:12px 0 20px">' +
        '<div style="font-family:\'JetBrains Mono\',monospace;font-size:40px;font-weight:700;background:linear-gradient(135deg,var(--blue,#4f8ef7),var(--teal,#06d6a0));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">' + done + ' / ' + g.target + '</div>' +
        '<div style="font-size:12px;color:var(--text3,#6b7494);margin-top:4px">questions done today</div>' +
        '<div style="margin:14px auto;max-width:280px;height:8px;background:var(--bg4,#1e2330);border-radius:4px;overflow:hidden">' +
        '<div style="height:100%;background:linear-gradient(90deg,var(--teal,#06d6a0),var(--blue,#4f8ef7));border-radius:4px;transition:width .4s;width:' + Math.min(100, Math.round(done/g.target*100)) + '%"></div>' +
        '</div>' +
        (done >= g.target ? '<div style="color:var(--teal,#06d6a0);font-size:14px;font-weight:600">🎉 Goal reached! Great work!</div>' : '') +
        '</div>' +
        '<div class="sf-row"><span class="sf-lbl">Daily target</span>' +
        '<input class="sf-inp" id="sf-gtarget" type="number" min="1" max="50" value="' + g.target + '" style="width:70px;flex:none"/>' +
        '<span style="font-size:12px;color:var(--text3,#6b7494)">questions/day</span>' +
        '</div>';
    }, function (foot) {
      foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'goal\')">Cancel</button>' +
        '<button class="sf-bprim" onclick="StudyFeatures._saveGoal()">Save Goal</button>';
    });
  }

  function _saveGoal() {
    var el = document.getElementById('sf-gtarget');
    var n = parseInt(el ? el.value : '5', 10);
    if (!n || n < 1 || n > 50) { _toast('Enter a number between 1 and 50', 'err'); return; }
    _saveGoalTarget(n);
    _closeModal('goal');
    _updateGoalBar();
    _toast('Daily goal set to ' + n + ' questions', 'ok');
  }

  /* ════════════════════════════════════════════════════════════════════════
     8. NOTES EXPORT (Markdown + PDF via print)
  ════════════════════════════════════════════════════════════════════════ */
  function _exportMenu() {
    _modal('exp', '📤 Export Notes', function (body) {
      var notes = _cfg ? _cfg.getNotes() : {};
      var count = Object.keys(notes).filter(function (id) { return !!notes[id]; }).length;
      body.innerHTML = '<p style="font-size:13px;color:var(--text2,#9aa3bf);margin-bottom:16px">' +
        'You have <strong style="color:var(--text,#e8eaf2)">' + count + '</strong> personal notes in this module.</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px">' +
        '<button class="sf-bprim" onclick="StudyFeatures._exportMD()">⬇️ Download as Markdown (.md)</button>' +
        '<button class="sf-bsec" onclick="StudyFeatures._exportPDF()">🖨️ Save as PDF (Print dialog)</button>' +
        '</div>';
    }, function (foot) {
      foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'exp\')">Cancel</button>';
    });
  }

  function _exportMD() {
    var notes = _cfg ? _cfg.getNotes() : {};
    var qs = _q();
    var qMap = {};
    qs.forEach(function (q) { qMap[q.id] = q; });

    var lines = ['# ' + (_cfg ? _cfg.module.toUpperCase() : 'Study') + ' Notes', '',
      '> Exported ' + new Date().toLocaleDateString(), ''];

    Object.keys(notes).forEach(function (id) {
      var text = notes[id];
      if (!text || !text.trim()) return;
      var q = qMap[id];
      lines.push('## ' + (q ? q.title : id));
      if (q && q.diff) lines.push('> Difficulty: ' + q.diff);
      if (q && q.category) lines.push('> Category: ' + q.category);
      lines.push('');
      lines.push(text.trim());
      lines.push('');
      lines.push('---');
      lines.push('');
    });

    if (lines.length <= 4) { _toast('No notes to export', ''); return; }

    var blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (_cfg ? _cfg.module : 'study') + '-notes-' + _today() + '.md';
    a.click();
    URL.revokeObjectURL(url);
    _closeModal('exp');
    _toast('Markdown downloaded', 'ok');
  }

  function _exportPDF() {
    _closeModal('exp');
    _doPrint(true);
  }

  /* ════════════════════════════════════════════════════════════════════════
     9. PRINT / CHEAT SHEET
  ════════════════════════════════════════════════════════════════════════ */
  function _print() { _doPrint(false); }

  function _doPrint(onlyNotes) {
    var notes = _cfg ? _cfg.getNotes() : {};
    var qs = _q();
    var qMap = {};
    qs.forEach(function (q) { qMap[q.id] = q; });

    // Build a hidden print-only section
    var old = document.getElementById('sf-print-area');
    if (old) old.remove();

    var div = document.createElement('div');
    div.id = 'sf-print-area';
    div.style.cssText = 'display:none';

    var html = '<div style="font-family:serif;padding:20px">' +
      '<h1 style="font-size:20px;margin-bottom:4px">' + (_cfg ? _cfg.module.toUpperCase() : 'Study') + ' Cheat Sheet</h1>' +
      '<p style="font-size:12px;color:#666;margin-bottom:20px">Generated ' + new Date().toLocaleString() + '</p>';

    var noteCount = 0;
    var statusSections = { done: [], inprogress: [] };

    qs.forEach(function (q) {
      var st = _cfg.getStatus(q.id);
      var note = notes[q.id];
      if (note && note.trim()) {
        html += '<div class="sf-pblock">' +
          '<div class="sf-ptitle">' + _esc(q.title) + '</div>' +
          '<div class="sf-pmeta">' + (q.category || '') + (q.diff ? ' · ' + q.diff : '') + '</div>' +
          '<div class="sf-pnote">' + _esc(note) + '</div>' +
          '</div>';
        noteCount++;
      }
      if (!onlyNotes && st) statusSections[st] && statusSections[st].push(q.title);
    });

    if (!onlyNotes && statusSections.done.length) {
      html += '<div class="sf-pblock"><div class="sf-ptitle">✓ Completed Questions (' + statusSections.done.length + ')</div>' +
        '<div class="sf-pnote">' + statusSections.done.map(function (t) { return '• ' + t; }).join('\n') + '</div></div>';
    }

    html += '</div>';
    div.innerHTML = html;
    document.body.appendChild(div);

    // Override display for print
    var style = document.createElement('style');
    style.id = 'sf-print-style';
    style.textContent = '@media print{#sf-print-area{display:block!important}}';
    document.head.appendChild(style);

    if (!noteCount && onlyNotes) { _toast('No notes to print', ''); div.remove(); style.remove(); return; }

    window.print();
    setTimeout(function () { div.remove(); style.remove(); }, 1000);
  }

  /* ════════════════════════════════════════════════════════════════════════
     10. KEYBOARD SHORTCUTS
  ════════════════════════════════════════════════════════════════════════ */
  var _kbEnabled = true;

  function _initKeyboard() {
    document.addEventListener('keydown', function (e) {
      // Don't fire when typing in inputs
      var tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (!_kbEnabled || !_cfg) return;

      var key = e.key;

      if (key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        _showShortcuts();
        return;
      }
      if (key === 'Escape') {
        // Close top-most modal
        var ovs = document.querySelectorAll('.sf-ov');
        if (ovs.length) { ovs[ovs.length - 1].remove(); return; }
        if (_bulkActive) _toggleBulk();
        return;
      }

      // Card navigation (J/K or arrow keys)
      var cards = document.querySelectorAll(_cfg.cardSelector || '.q-card');
      if (!cards.length) return;

      if (key === 'ArrowDown' || key === 'j') {
        e.preventDefault();
        _focusIdx = Math.min(_focusIdx + 1, cards.length - 1);
        cards[_focusIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        cards[_focusIdx].style.outline = '2px solid var(--blue,#4f8ef7)';
        setTimeout(function () { if (cards[_focusIdx]) cards[_focusIdx].style.outline = ''; }, 800);
        return;
      }
      if (key === 'ArrowUp' || key === 'k') {
        e.preventDefault();
        _focusIdx = Math.max(_focusIdx - 1, 0);
        cards[_focusIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }

      if (_focusIdx < 0 || _focusIdx >= cards.length) return;
      var card = cards[_focusIdx];
      var id = _cfg.cardIdAttr ? card.getAttribute(_cfg.cardIdAttr) : String(_focusIdx);
      if (!id) return;

      if (key === 'd' || key === 'D') {
        e.preventDefault();
        var cur = _cfg.getStatus(id);
        _cfg.setStatus(id, cur === 'done' ? null : 'done');
        if (_cfg.refreshUI) _cfg.refreshUI();
        _updateGoalBar();
        _toast(cur === 'done' ? 'Cleared' : '✓ Marked done', 'ok');
      } else if (key === 'f' || key === 'F') {
        e.preventDefault();
        var favs = _cfg.getFavIds();
        var isFav = favs instanceof Set ? favs.has(id) : Array.isArray(favs) ? favs.indexOf(id) >= 0 : false;
        _cfg.setFav(id, !isFav);
        _toast(isFav ? '☆ Unfavorited' : '⭐ Favorited', '');
      } else if (key === 'n' || key === 'N') {
        e.preventDefault();
        var noteBtn = card.querySelector('.q-note-btn, .q-status-btn, [onclick*="Note"]');
        if (noteBtn) noteBtn.click();
        else {
          var noteArea = card.querySelector('textarea');
          if (noteArea) noteArea.focus();
        }
      } else if (key === 'h' || key === 'H') {
        e.preventDefault();
        var hintBtn = card.querySelector('.btn-hint, .btn-toggle, [onclick*="hint"]');
        if (hintBtn) hintBtn.click();
      }
    });
  }

  function _showShortcuts() {
    var shortcuts = [
      ['D', 'Toggle Done on focused card'],
      ['F', 'Toggle Favorite on focused card'],
      ['N', 'Open note on focused card'],
      ['H', 'Show hint on focused card'],
      ['↓ / J', 'Next card'],
      ['↑ / K', 'Previous card'],
      ['?', 'Show shortcuts'],
      ['Esc', 'Close modal / Exit bulk mode'],
      ['Ctrl+K', 'Focus search bar'],
    ];
    _modal('kbd', '⌨️ Keyboard Shortcuts', function (body) {
      body.innerHTML = '<div class="sf-kgrid">' +
        shortcuts.map(function (s) {
          return '<div class="sf-krow"><span class="sf-kbd">' + _esc(s[0]) + '</span><span class="sf-klbl">' + _esc(s[1]) + '</span></div>';
        }).join('') +
        '</div>';
    }, function (foot) {
      foot.innerHTML = '<button class="sf-bsec" onclick="StudyFeatures._close(\'kbd\')">Close</button>';
    });
  }

  /* ════════════════════════════════════════════════════════════════════════
     11. REVISION REMINDERS
     Checks if user hasn't reviewed in >3 days (via Supabase RPC).
     Shows a dismissible banner at the top; optionally requests browser notif.
  ════════════════════════════════════════════════════════════════════════ */
  var _REMIND_KEY = 'sf_remind_dismiss_';
  function _remindKey() { return _REMIND_KEY + (_cfg ? _cfg.module : 'global'); }

  function _checkReminder() {
    // Don't re-show if dismissed today
    var dismissed = localStorage.getItem(_remindKey());
    if (dismissed === _today()) return;

    if (typeof _supabase === 'undefined' || !_supabase || !_cfg) return;

    _supabase.rpc('study_needs_reminder', { p_module: _cfg.module, p_threshold_days: 3 })
      .then(function (res) {
        if (!res.error && res.data === true) _showReminder();
      }).catch(function () {});
  }

  function _showReminder() {
    var ref = document.getElementById('sf-toolbar');
    if (!ref || document.getElementById('sf-reminder')) return;

    var div = document.createElement('div');
    div.id = 'sf-reminder';
    div.className = 'sf-reminder sf-no-print';
    div.innerHTML = '🔔 <strong>Revision reminder:</strong> You haven\'t studied ' +
      (_cfg ? _cfg.module.toUpperCase() : 'this module') + ' in over 3 days — a quick review now will strengthen your recall.' +
      '<button class="sf-rclose" id="sf-rdismiss">✕</button>';
    ref.insertAdjacentElement('afterend', div);

    document.getElementById('sf-rdismiss').addEventListener('click', function () {
      div.remove();
      localStorage.setItem(_remindKey(), _today());
    });

    // Also try browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(function () {
        Notification.requestPermission().then(function (perm) {
          if (perm === 'granted') {
            new Notification('Study Reminder 📚', {
              body: 'You haven\'t reviewed ' + (_cfg ? _cfg.module.toUpperCase() : 'your study materials') + ' in 3+ days. Time for a quick session!',
              icon: '/assets/icons/icon-192.png'
            });
          }
        }).catch(function () {});
      }, 2000);
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════════════════════════════ */
  function init(config) {
    _cfg = config;
    _injectStyles();
    _buildToolbar();
    _initKeyboard();
    // Defer reminder check until after page loads
    setTimeout(function () {
      _checkReminder();
      _updateSRBadge();
      _updateGoalBar();
    }, 1200);
  }

  /* ════════════════════════════════════════════════════════════════════════
     PUBLIC API
  ════════════════════════════════════════════════════════════════════════ */
  window.StudyFeatures = {
    init         : init,
    // Features
    mock         : _mock,
    _runMock     : _runMock,
    _mockReveal  : _mockReveal,
    _mockDone    : _mockDone,
    _mockSkip    : _mockSkip,
    _mockEnd     : _mockEnd,
    spaced       : _showSpaced,
    analytics    : _analytics,
    leaderboard  : _leaderboard,
    playlists    : _playlists,
    _newPlaylist : _newPlaylist,
    _createPlaylist: _createPlaylist,
    _deletePlaylist: _deletePlaylist,
    _viewPlaylist: _viewPlaylist,
    _addToPlaylist: _addToPlaylist,
    _doAddToPlaylist: _doAddToPlaylist,
    _removeFromPlaylist: _removeFromPlaylist,
    bulk         : _toggleBulk,
    _bulkMark    : _bulkMark,
    _selectAll   : _selectAll,
    exportMenu   : _exportMenu,
    _exportMD    : _exportMD,
    _exportPDF   : _exportPDF,
    print        : _print,
    goal         : _showGoal,
    _saveGoal    : _saveGoal,
    shortcuts    : _showShortcuts,
    // Utilities
    _close       : _closeModal,
    toast        : _toast,
    // Called from other pages to add a question to a playlist
    addToPlaylist: _addToPlaylist,
    // Refresh goal bar (call after marking questions)
    refreshGoal  : _updateGoalBar,
    refreshSR    : _updateSRBadge,
  };

}());
