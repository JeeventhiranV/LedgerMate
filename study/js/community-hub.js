/* ══════════════════════════════════════════════════════════════════════════
   CommunityHub v1.0 — Floating Learning Community
   ─────────────────────────────────────────────────────────────────────────
   Load after: supabase-config.js, auth-guard.js, StudySync.js
   Usage: CommunityHub.init({ module:'dsa', moduleName:'DSA & Algorithms' })
══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── State ───────────────────────────────────────────────────────────── */
  var _cfg = { module: 'general', moduleName: 'Interview Prep' };
  var _me = null;           // { id, display_name, avatar_color }
  var _expanded = false;
  var _activeTab = 'chat';
  var _unread = { notifications: 0, messages: 0 };
  var _onlineCount = 0;
  var _realtimeChannel = null;
  var _chatChannel = null;
  var _activeRoomId = null;
  var _activeRoomSlug = 'general';
  var _typingTimer = null;
  var _typingUsers = {};
  var _chatMessages = [];
  var _chatPage = 0;
  var _chatLoading = false;
  var _discussions = [];
  var _questions = [];
  var _activeDiscussion = null;
  var _activeQuestion = null;
  var _dragState = null;
  var _position = null;
  var _topics = [];
  var _rooms = [];

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function _ago(ts) {
    if (!ts) return '';
    var d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (d < 60) return 'just now';
    if (d < 3600) return Math.floor(d/60) + 'm ago';
    if (d < 86400) return Math.floor(d/3600) + 'h ago';
    return Math.floor(d/86400) + 'd ago';
  }
  function _uid() {
    if (typeof _supabase === 'undefined') return Promise.resolve(null);
    return _supabase.auth.getSession()
      .then(function(r){ return r.data&&r.data.session ? r.data.session.user.id : null; })
      .catch(function(){ return null; });
  }
  function _avatar(name, color) {
    var initials = (name||'?').split(' ').map(function(w){return w[0]||'';}).slice(0,2).join('').toUpperCase();
    return '<div class="ch-avatar" style="background:' + _esc(color||'#4f8ef7') + '">' + _esc(initials) + '</div>';
  }
  function _toast(msg, type) {
    var tw = document.getElementById('ch-toast-wrap');
    if (!tw) { tw = document.createElement('div'); tw.id='ch-toast-wrap'; tw.className='ch-toast-wrap'; document.body.appendChild(tw); }
    var el = document.createElement('div');
    el.className = 'ch-toast' + (type==='ok'?' ok':type==='err'?' err':'');
    el.textContent = msg;
    tw.appendChild(el);
    setTimeout(function(){ el.style.opacity='0'; setTimeout(function(){el.remove();},300); }, 3000);
  }
  /* Batch-fetch helpers — avoids PostgREST embedded-join (requires FK) */
  function _fetchProfiles(ids) {
    var uniq = (ids||[]).filter(function(id,i,a){ return id && a.indexOf(id)===i; });
    if (!uniq.length) return Promise.resolve({});
    return _supabase.from('community_profiles').select('user_id,display_name,avatar_color')
      .in('user_id', uniq)
      .then(function(r){ var m={}; (r.data||[]).forEach(function(p){ m[p.user_id]=p; }); return m; })
      .catch(function(){ return {}; });
  }
  function _fetchTopics(ids) {
    var uniq = (ids||[]).filter(function(id,i,a){ return id && a.indexOf(id)===i; });
    if (!uniq.length) return Promise.resolve({});
    return _supabase.from('community_topics').select('id,label,color,icon')
      .in('id', uniq)
      .then(function(r){ var m={}; (r.data||[]).forEach(function(t){ m[t.id]=t; }); return m; })
      .catch(function(){ return {}; });
  }

  function _savePosition(x, y) {
    localStorage.setItem('ch_pos', JSON.stringify({x:x,y:y}));
  }
  function _loadPosition() {
    try { return JSON.parse(localStorage.getItem('ch_pos')); } catch { return null; }
  }

  /* ══════════════════════════════════════════════════════════════════════
     CSS INJECTION
  ══════════════════════════════════════════════════════════════════════ */
  function _injectStyles() {
    if (document.getElementById('ch-styles')) return;
    var s = document.createElement('style');
    s.id = 'ch-styles';
    s.textContent = `
/* ── Collapsed Widget ── */
.ch-widget{position:fixed;bottom:24px;right:24px;z-index:9500;display:flex;flex-direction:column;align-items:flex-end;gap:8px;user-select:none}
.ch-fab{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--blue,#4f8ef7),var(--purple,#8b5cf6));border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 4px 20px rgba(79,142,247,.4);transition:transform .2s,box-shadow .2s;position:relative;flex-shrink:0}
.ch-fab:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(79,142,247,.55)}
.ch-fab-badge{position:absolute;top:-3px;right:-3px;background:var(--rose,#f43f5e);color:#fff;border-radius:20px;font-size:9px;font-weight:700;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid var(--bg,#07090f)}
.ch-fab-pill{background:var(--bg2,#0e1117);border:1px solid var(--border,#1e2436);border-radius:20px;padding:4px 10px;font-size:11px;color:var(--text2,#8a95b8);white-space:nowrap;display:flex;align-items:center;gap:5px}
.ch-online-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0;animation:chPulse 2s infinite}
@keyframes chPulse{0%,100%{opacity:1}50%{opacity:.5}}

/* ── Panel ── */
.ch-panel{position:fixed;bottom:90px;right:24px;z-index:9490;width:420px;max-width:calc(100vw - 32px);height:580px;max-height:calc(100vh - 120px);background:var(--bg2,#0e1117);border:1px solid var(--border2,#2a3148);border-radius:18px;display:flex;flex-direction:column;box-shadow:0 16px 48px rgba(0,0,0,.7);overflow:hidden;transition:opacity .18s,transform .18s;transform-origin:bottom right}
.ch-panel.hidden{opacity:0;transform:scale(.92);pointer-events:none}
.ch-panel-hdr{display:flex;align-items:center;gap:10px;padding:12px 16px 10px;border-bottom:1px solid var(--border,#1e2436);cursor:grab;flex-shrink:0}
.ch-panel-hdr:active{cursor:grabbing}
.ch-panel-title{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:var(--text,#e2e8f8);flex:1}
.ch-panel-meta{font-size:10px;color:var(--text3,#535d7e);margin-top:1px}
.ch-hdr-btn{background:none;border:none;cursor:pointer;color:var(--text3,#535d7e);padding:4px 5px;border-radius:5px;font-size:13px;transition:color .14s;line-height:1}
.ch-hdr-btn:hover{color:var(--text,#e2e8f8)}

/* ── Tabs ── */
.ch-tabs{display:flex;border-bottom:1px solid var(--border,#1e2436);flex-shrink:0;overflow-x:auto;scrollbar-width:none}
.ch-tabs::-webkit-scrollbar{display:none}
.ch-tab{flex:1;min-width:60px;background:none;border:none;cursor:pointer;padding:9px 6px;font-size:11px;font-weight:500;color:var(--text3,#535d7e);border-bottom:2px solid transparent;transition:all .14s;white-space:nowrap;position:relative}
.ch-tab:hover{color:var(--text2,#8a95b8)}
.ch-tab.active{color:var(--blue,#4f8ef7);border-bottom-color:var(--blue,#4f8ef7);font-weight:600}
.ch-tab-badge{background:var(--rose,#f43f5e);color:#fff;border-radius:20px;font-size:9px;font-weight:700;padding:0 4px;min-width:14px;line-height:14px;display:inline-block;text-align:center;vertical-align:middle;margin-left:3px}

/* ── Content area ── */
.ch-body{flex:1;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--border2,#2a3148) transparent}
.ch-body::-webkit-scrollbar{width:4px}
.ch-body::-webkit-scrollbar-thumb{background:var(--border2,#2a3148);border-radius:4px}

/* ── Avatar ── */
.ch-avatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;font-family:'JetBrains Mono',monospace}
.ch-avatar.sm{width:24px;height:24px;font-size:9px}
.ch-avatar.lg{width:38px;height:38px;font-size:14px}

/* ── Discussion list ── */
.ch-list-item{display:flex;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border,#1e2436);cursor:pointer;transition:background .12s}
.ch-list-item:hover{background:var(--bg3,#141820)}
.ch-list-body{flex:1;min-width:0}
.ch-list-title{font-size:13px;font-weight:600;color:var(--text,#e2e8f8);margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ch-list-meta{font-size:11px;color:var(--text3,#535d7e);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.ch-topic-chip{font-size:10px;font-weight:600;border-radius:20px;padding:1px 7px;font-family:'JetBrains Mono',monospace}
.ch-diff-chip{font-size:10px;font-weight:600;border-radius:20px;padding:1px 7px}
.ch-diff-chip.beginner{background:rgba(6,214,160,.12);color:#06d6a0}
.ch-diff-chip.intermediate{background:rgba(245,158,11,.12);color:#f59e0b}
.ch-diff-chip.advanced{background:rgba(244,63,94,.12);color:#f43f5e}

/* ── Detail view ── */
.ch-detail-hdr{padding:12px 14px 10px;border-bottom:1px solid var(--border,#1e2436)}
.ch-back-btn{background:none;border:none;cursor:pointer;color:var(--blue,#4f8ef7);font-size:12px;margin-bottom:8px;padding:0;display:flex;align-items:center;gap:4px}
.ch-detail-title{font-size:14px;font-weight:700;color:var(--text,#e2e8f8);line-height:1.5;margin-bottom:6px}
.ch-detail-body{font-size:13px;color:var(--text2,#8a95b8);line-height:1.65;padding:12px 14px;border-bottom:1px solid var(--border,#1e2436);white-space:pre-wrap;word-break:break-word}

/* ── Answers (Stack Overflow style) ── */
.ch-answer{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border,#1e2436)}
.ch-answer.accepted{background:rgba(6,214,160,.04);border-left:3px solid #06d6a0}
.ch-vote-col{display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;min-width:32px}
.ch-vote-btn{background:none;border:1px solid var(--border,#1e2436);border-radius:4px;width:26px;height:22px;cursor:pointer;color:var(--text3,#535d7e);font-size:11px;transition:all .12s;display:flex;align-items:center;justify-content:center}
.ch-vote-btn:hover{border-color:var(--blue,#4f8ef7);color:var(--blue,#4f8ef7)}
.ch-vote-btn.active{background:var(--blue,#4f8ef7);color:#fff;border-color:var(--blue,#4f8ef7)}
.ch-vote-score{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--text,#e2e8f8)}
.ch-answer-body{flex:1;min-width:0}
.ch-ans-badge{font-size:10px;font-weight:600;border-radius:20px;padding:2px 7px;margin-bottom:6px;display:inline-flex;align-items:center;gap:4px}
.ch-ans-badge.accepted{background:rgba(6,214,160,.12);color:#06d6a0}
.ch-ans-badge.best{background:rgba(245,158,11,.12);color:#f59e0b}
.ch-ans-badge.popular{background:rgba(251,146,60,.12);color:#fb923c}
.ch-ans-text{font-size:13px;color:var(--text2,#8a95b8);line-height:1.65;margin-bottom:8px;white-space:pre-wrap;word-break:break-word}
.ch-ans-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.ch-ans-author{font-size:11px;color:var(--text3,#535d7e)}
.ch-accept-btn{font-size:11px;background:none;border:1px solid var(--teal,#06d6a0);color:var(--teal,#06d6a0);border-radius:5px;padding:2px 8px;cursor:pointer;transition:all .12s}
.ch-accept-btn:hover{background:rgba(6,214,160,.1)}

/* ── Comments (Instagram style) ── */
.ch-comments{padding:0 14px}
.ch-comment{display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--border,#1e2436)}
.ch-comment:last-child{border:none}
.ch-comment-body{flex:1;min-width:0}
.ch-comment-header{display:flex;align-items:baseline;gap:6px;margin-bottom:3px;flex-wrap:wrap}
.ch-comment-name{font-size:12px;font-weight:600;color:var(--text,#e2e8f8)}
.ch-comment-time{font-size:10px;color:var(--text3,#535d7e)}
.ch-comment-text{font-size:12px;color:var(--text2,#8a95b8);line-height:1.6;word-break:break-word}
.ch-comment-actions{display:flex;align-items:center;gap:8px;margin-top:4px}
.ch-comment-act-btn{background:none;border:none;cursor:pointer;font-size:11px;color:var(--text3,#535d7e);padding:1px 0;transition:color .12s}
.ch-comment-act-btn:hover{color:var(--blue,#4f8ef7)}
.ch-comment-act-btn.liked{color:var(--rose,#f43f5e)}
.ch-replies{margin-left:38px;border-left:2px solid var(--border,#1e2436);padding-left:10px;margin-top:4px}
.ch-reply{display:flex;gap:7px;padding:6px 0}
.ch-reply-body{flex:1;min-width:0}
.ch-mention{color:var(--blue,#4f8ef7);font-weight:600}
.ch-expand-replies{background:none;border:none;cursor:pointer;font-size:11px;color:var(--blue,#4f8ef7);padding:3px 0;margin-left:38px;display:block}

/* ── Chat ── */
.ch-room-bar{display:flex;gap:4px;padding:8px 10px 8px;border-bottom:none;overflow-x:auto;flex-shrink:0;scrollbar-width:none;align-items:center}
.ch-room-bar::-webkit-scrollbar{display:none}
.ch-room-btn{background:var(--bg3,#141820);border:1px solid var(--border,#1e2436);border-radius:20px;padding:3px 10px;font-size:11px;color:var(--text2,#8a95b8);cursor:pointer;white-space:nowrap;transition:all .12s;flex-shrink:0}
.ch-room-btn:hover{border-color:var(--blue,#4f8ef7);color:var(--blue,#4f8ef7)}
.ch-room-btn.active{background:rgba(79,142,247,.1);border-color:var(--blue,#4f8ef7);color:var(--blue,#4f8ef7);font-weight:600}
.ch-clear-bar{display:flex;align-items:center;justify-content:space-between;padding:4px 10px 6px;border-bottom:1px solid var(--border,#1e2436);flex-shrink:0;gap:6px}
.ch-clear-room-name{font-size:11px;color:var(--text3,#535d7e);font-family:'JetBrains Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}
.ch-clear-btn{background:none;border:1px solid rgba(244,63,94,.25);border-radius:6px;padding:3px 9px;font-size:11px;color:rgba(244,63,94,.7);cursor:pointer;white-space:nowrap;transition:all .14s;flex-shrink:0}
.ch-clear-btn:hover{background:rgba(244,63,94,.08);border-color:var(--rose,#f43f5e);color:var(--rose,#f43f5e)}
.ch-clear-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9600;display:flex;align-items:center;justify-content:center}
.ch-clear-modal{background:var(--bg2,#0e1117);border:1px solid var(--border2,#2a3148);border-radius:14px;padding:24px 20px;width:300px;text-align:center}
.ch-clear-modal-icon{font-size:28px;margin-bottom:10px}
.ch-clear-modal-title{font-size:14px;font-weight:700;color:var(--text,#e2e8f8);margin-bottom:6px}
.ch-clear-modal-sub{font-size:12px;color:var(--text3,#535d7e);margin-bottom:18px;line-height:1.5}
.ch-clear-modal-btns{display:flex;gap:8px;justify-content:center}
.ch-clear-modal-confirm{background:var(--rose,#f43f5e);border:none;border-radius:8px;padding:8px 18px;font-size:12px;font-weight:600;color:#fff;cursor:pointer;transition:opacity .14s}
.ch-clear-modal-confirm:hover{opacity:.85}
.ch-clear-modal-cancel{background:none;border:1px solid var(--border,#1e2436);border-radius:8px;padding:8px 14px;font-size:12px;color:var(--text2,#8a95b8);cursor:pointer;transition:all .14s}
.ch-clear-modal-cancel:hover{border-color:var(--blue,#4f8ef7);color:var(--blue,#4f8ef7)}
.ch-chat-msgs{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:2px;scrollbar-width:thin;scrollbar-color:var(--border2,#2a3148) transparent}
.ch-chat-msgs::-webkit-scrollbar{width:3px}
.ch-msg-group{display:flex;gap:8px;margin-bottom:8px;align-items:flex-end}
.ch-msg-group.mine{flex-direction:row-reverse}
.ch-msg-bubble{max-width:75%;background:var(--bg3,#141820);border:1px solid var(--border,#1e2436);border-radius:12px 12px 12px 3px;padding:7px 11px;font-size:12px;color:var(--text,#e2e8f8);line-height:1.55;word-break:break-word;position:relative}
.ch-msg-bubble.mine{background:linear-gradient(135deg,rgba(79,142,247,.2),rgba(139,92,246,.2));border-color:rgba(79,142,247,.3);border-radius:12px 12px 3px 12px}
.ch-msg-name{font-size:10px;font-weight:600;color:var(--text3,#535d7e);margin-bottom:2px}
.ch-msg-time{font-size:9px;color:var(--text3,#535d7e);margin-top:3px;text-align:right}
.ch-msg-reactions{display:flex;gap:3px;flex-wrap:wrap;margin-top:4px}
.ch-reaction{background:var(--bg4,#1a1f2e);border:1px solid var(--border,#1e2436);border-radius:20px;padding:1px 6px;font-size:11px;cursor:pointer;transition:all .12s}
.ch-reaction:hover,.ch-reaction.mine{background:rgba(79,142,247,.1);border-color:var(--blue,#4f8ef7)}
.ch-reply-preview{background:var(--bg4,#1a1f2e);border-left:3px solid var(--blue,#4f8ef7);border-radius:4px;padding:4px 8px;font-size:10px;color:var(--text3,#535d7e);margin-bottom:5px;cursor:pointer}
.ch-typing{font-size:11px;color:var(--text3,#535d7e);padding:4px 12px;font-style:italic;min-height:20px;flex-shrink:0}
.ch-chat-input-row{display:flex;gap:6px;padding:8px 10px;border-top:1px solid var(--border,#1e2436);flex-shrink:0;align-items:flex-end}
.ch-chat-reply-banner{background:var(--bg3,#141820);border-left:3px solid var(--blue,#4f8ef7);padding:5px 10px;font-size:11px;color:var(--text2,#8a95b8);display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.ch-emoji-btn{background:none;border:none;cursor:pointer;font-size:18px;padding:4px;line-height:1;color:var(--text3,#535d7e);transition:transform .12s,opacity .12s;flex-shrink:0;width:28px;text-align:center}
.ch-emoji-btn:hover{transform:scale(1.15)}
.ch-emoji-btn.open{font-size:14px;color:var(--rose,#f43f5e)}
.ch-chat-inp{flex:1;background:var(--bg3,#141820);border:1px solid var(--border,#1e2436);border-radius:20px;padding:7px 14px;font-size:12px;color:var(--text,#e2e8f8);outline:none;font-family:'Inter',sans-serif;resize:none;max-height:80px;overflow-y:auto;line-height:1.5;transition:border .14s}
.ch-chat-inp:focus{border-color:var(--blue,#4f8ef7)}
.ch-send-btn{background:linear-gradient(135deg,var(--blue,#4f8ef7),var(--purple,#8b5cf6));border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:15px;color:#fff;flex-shrink:0;transition:opacity .14s}
.ch-send-btn:hover{opacity:.85}
.ch-send-btn:disabled{opacity:.4;cursor:default}

/* ── Emoji picker ── */
.ch-emoji-picker{position:absolute;bottom:52px;left:0;background:var(--bg3,#141820);border:1px solid var(--border2,#2a3148);border-radius:10px;padding:8px;display:flex;flex-wrap:wrap;gap:4px;z-index:9999;max-width:calc(100% - 50px);width:220px}
.ch-emoji-item{background:none;border:none;cursor:pointer;font-size:20px;padding:3px;border-radius:5px;transition:background .1s;line-height:1}
.ch-emoji-item:hover{background:var(--bg4,#1a1f2e)}

/* ── Notification ── */
.ch-notif-item{display:flex;gap:10px;padding:11px 14px;border-bottom:1px solid var(--border,#1e2436);cursor:pointer;transition:background .12s}
.ch-notif-item:hover{background:var(--bg3,#141820)}
.ch-notif-item.unread{background:rgba(79,142,247,.04)}
.ch-notif-icon{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;background:var(--bg3,#141820)}
.ch-notif-body{flex:1;min-width:0}
.ch-notif-text{font-size:12px;color:var(--text2,#8a95b8);line-height:1.5}
.ch-notif-time{font-size:10px;color:var(--text3,#535d7e);margin-top:2px}
.ch-unread-dot{width:7px;height:7px;border-radius:50%;background:var(--blue,#4f8ef7);flex-shrink:0;margin-top:3px}

/* ── Leaderboard ── */
.ch-lb-row{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border,#1e2436)}
.ch-lb-rank{width:24px;height:24px;border-radius:50%;background:var(--bg3,#141820);display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--text3,#535d7e);flex-shrink:0}
.ch-lb-rank.g{background:rgba(245,158,11,.2);color:#f59e0b}
.ch-lb-rank.s{background:rgba(148,163,184,.15);color:#94a3b8}
.ch-lb-rank.b{background:rgba(205,127,50,.15);color:#cd7f32}
.ch-lb-info{flex:1;min-width:0}
.ch-lb-name{font-size:13px;font-weight:600;color:var(--text,#e2e8f8)}
.ch-lb-name.me{color:var(--blue,#4f8ef7)}
.ch-lb-sub{font-size:11px;color:var(--text3,#535d7e)}
.ch-lb-rep{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:var(--teal,#06d6a0)}

/* ── Compose forms ── */
.ch-compose{padding:12px 14px}
.ch-field{margin-bottom:10px}
.ch-field-lbl{font-size:11px;font-weight:600;color:var(--text3,#535d7e);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
.ch-inp{width:100%;background:var(--bg3,#141820);border:1px solid var(--border,#1e2436);border-radius:8px;padding:7px 11px;font-size:13px;color:var(--text,#e2e8f8);outline:none;font-family:'Inter',sans-serif;transition:border .14s;box-sizing:border-box}
.ch-inp:focus{border-color:var(--blue,#4f8ef7)}
.ch-ta{min-height:80px;resize:vertical}
.ch-sel{background:var(--bg3,#141820);border:1px solid var(--border,#1e2436);border-radius:8px;padding:6px 10px;font-size:12px;color:var(--text,#e2e8f8);outline:none;cursor:pointer;font-family:'Inter',sans-serif}
.ch-inline-btns{display:flex;gap:6px;flex-wrap:wrap}
.ch-btn-prim{background:linear-gradient(135deg,var(--blue,#4f8ef7),var(--purple,#8b5cf6));border:none;border-radius:8px;padding:7px 16px;font-size:12px;font-weight:600;color:#fff;cursor:pointer;transition:opacity .14s}
.ch-btn-prim:hover{opacity:.85}
.ch-btn-prim:disabled{opacity:.38;cursor:default}
.ch-btn-sec{background:none;border:1px solid var(--border,#1e2436);border-radius:8px;padding:7px 12px;font-size:12px;color:var(--text2,#8a95b8);cursor:pointer;transition:all .14s}
.ch-btn-sec:hover{border-color:var(--blue,#4f8ef7);color:var(--blue,#4f8ef7)}
.ch-tag-inp-row{display:flex;gap:5px;align-items:center}
.ch-tags-list{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.ch-tag{background:rgba(79,142,247,.1);border:1px solid rgba(79,142,247,.25);border-radius:20px;padding:2px 8px;font-size:11px;color:var(--blue,#4f8ef7);display:flex;align-items:center;gap:4px}
.ch-tag-x{background:none;border:none;cursor:pointer;color:var(--text3,#535d7e);padding:0;font-size:12px;line-height:1}

/* ── Empty state ── */
.ch-empty{text-align:center;padding:36px 20px;color:var(--text3,#535d7e)}
.ch-empty-icon{font-size:32px;margin-bottom:8px}
.ch-empty-title{font-size:14px;font-weight:600;color:var(--text2,#8a95b8);margin-bottom:4px}
.ch-empty-sub{font-size:12px}

/* ── Loading spinner ── */
.ch-spinner{display:flex;justify-content:center;padding:24px}
.ch-spin{width:22px;height:22px;border:2px solid var(--border,#1e2436);border-top-color:var(--blue,#4f8ef7);border-radius:50%;animation:chSpin .7s linear infinite}
@keyframes chSpin{to{transform:rotate(360deg)}}

/* ── Code inline ── */
.ch-code{background:var(--bg4,#1a1f2e);border:1px solid var(--border,#1e2436);border-radius:4px;padding:1px 5px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--cyan,#22d3ee)}

/* ── Toast (scoped) ── */
.ch-toast-wrap{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:5px;pointer-events:none;min-width:200px}
.ch-toast{background:var(--bg3,#141820);border:1px solid var(--border2,#2a3148);border-radius:8px;padding:8px 14px;font-size:12px;color:var(--text,#e2e8f8);text-align:center;pointer-events:auto;transition:opacity .25s}
.ch-toast.ok{border-color:rgba(6,214,160,.4)}.ch-toast.err{border-color:rgba(244,63,94,.4)}

/* ── Mobile ── */
@media(max-width:640px){
  .ch-panel{width:100vw;max-width:100vw;height:70vh;bottom:0;right:0;border-radius:18px 18px 0 0;border-left:none;border-right:none;border-bottom:none}
  .ch-widget{bottom:16px;right:16px}
}
`;
    document.head.appendChild(s);
  }

  /* ══════════════════════════════════════════════════════════════════════
     BUILD WIDGET + PANEL
  ══════════════════════════════════════════════════════════════════════ */
  function _buildWidget() {
    if (document.getElementById('ch-widget')) return;

    // Widget (collapsed)
    var widget = document.createElement('div');
    widget.className = 'ch-widget';
    widget.id = 'ch-widget';
    widget.innerHTML =
      '<div class="ch-fab-pill" id="ch-pill"><span class="ch-online-dot"></span><span id="ch-online-lbl">0 online</span></div>' +
      '<button class="ch-fab" id="ch-fab" title="Community Hub" aria-label="Open Community Hub">' +
        '💬<span class="ch-fab-badge" id="ch-fab-badge" style="display:none">0</span>' +
      '</button>';
    document.body.appendChild(widget);

    // Panel (expanded)
    var panel = document.createElement('div');
    panel.className = 'ch-panel hidden';
    panel.id = 'ch-panel';
    panel.innerHTML =
      '<div class="ch-panel-hdr" id="ch-panel-hdr">' +
        '<div>' +
          '<div class="ch-panel-title">💬 Interview Community</div>' +
          '<div class="ch-panel-meta" id="ch-panel-meta">Loading…</div>' +
        '</div>' +
        '<button class="ch-hdr-btn" onclick="CommunityHub._resetPosition()" title="Reset position">⊙</button>' +
        '<button class="ch-hdr-btn" onclick="CommunityHub._minimize()" title="Minimize">⎯</button>' +
        '<button class="ch-hdr-btn" onclick="CommunityHub._close()" title="Close">✕</button>' +
      '</div>' +
      '<div class="ch-tabs" id="ch-tabs">' +
        '<button class="ch-tab" data-tab="chat" onclick="CommunityHub._switchTab(\'chat\')">💬 Chat</button>' +
        '<button class="ch-tab" data-tab="discussions" onclick="CommunityHub._switchTab(\'discussions\')">🗣 Discuss</button>' +
        '<button class="ch-tab" data-tab="doubts" onclick="CommunityHub._switchTab(\'doubts\')">❓ Doubts</button>' +
        '<button class="ch-tab" data-tab="notifications" onclick="CommunityHub._switchTab(\'notifications\')">🔔 <span id="ch-notif-badge" class="ch-tab-badge" style="display:none">0</span></button>' +
        '<button class="ch-tab" data-tab="leaderboard" onclick="CommunityHub._switchTab(\'leaderboard\')">🏆 Top</button>' +
      '</div>' +
      '<div class="ch-body" id="ch-tab-body"></div>';
    document.body.appendChild(panel);

    // Apply saved position (pos = panel top-left)
    var pos = _loadPosition();
    if (pos) {
      var vw = window.innerWidth, vh = window.innerHeight;
      var PW = 420, PH = 580;
      // Discard invalid / off-screen saved positions
      if (pos.x >= 0 && pos.y >= 0 && pos.x + PW <= vw + 20 && pos.y + PH <= vh + 20) {
        var px = Math.max(0, Math.min(pos.x, vw - PW));
        var py = Math.max(0, Math.min(pos.y, vh - PH));
        var p = document.getElementById('ch-panel');
        var w = document.getElementById('ch-widget');
        p.style.right = 'auto'; p.style.bottom = 'auto';
        p.style.left = px + 'px'; p.style.top = py + 'px';
        // Widget centred below the panel
        var wx = Math.max(8, px + PW / 2 - 40);
        var wy = Math.min(py + PH + 10, vh - 80);
        w.style.right = 'auto'; w.style.bottom = 'auto';
        w.style.left = wx + 'px'; w.style.top = wy + 'px';
      } else {
        localStorage.removeItem('ch_pos');
      }
    }

    document.getElementById('ch-fab').addEventListener('click', _togglePanel);
    _initDrag();
  }

  function _setWidgetVisible(visible) {
    var w = document.getElementById('ch-widget');
    if (!w) return;
    // On mobile (panel is full-width bottom sheet), hide FAB while panel is open
    // so it doesn't float over the chat input / send button
    if (window.innerWidth <= 640) {
      w.style.display = visible ? '' : 'none';
    }
  }

  function _togglePanel() {
    _expanded = !_expanded;
    var panel = document.getElementById('ch-panel');
    panel.classList.toggle('hidden', !_expanded);
    _setWidgetVisible(!_expanded);
    if (_expanded) {
      _switchTab(_activeTab);
      _refreshUnread();
    }
  }

  function _close() {
    _expanded = false;
    var panel = document.getElementById('ch-panel');
    if (panel) panel.classList.add('hidden');
    _setWidgetVisible(true);
  }

  function _resetPosition() {
    localStorage.removeItem('ch_pos');
    var w = document.getElementById('ch-widget');
    var p = document.getElementById('ch-panel');
    if (w) { w.style.left=''; w.style.top=''; w.style.right='24px'; w.style.bottom='24px'; }
    if (p) { p.style.left=''; p.style.top=''; p.style.right='24px'; p.style.bottom='90px'; }
  }

  function _minimize() { _close(); }

  /* ── Drag ────────────────────────────────────────────────────────────── */
  function _initDrag() {
    var hdr = document.getElementById('ch-panel-hdr');
    if (!hdr) return;
    hdr.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'BUTTON') return;
      var panel = document.getElementById('ch-panel');
      var widget = document.getElementById('ch-widget');
      var pr = panel.getBoundingClientRect();
      var wr = widget.getBoundingClientRect();
      _dragState = { ox: e.clientX - pr.left, oy: e.clientY - pr.top, pw: pr.width, ph: pr.height, ww: wr.width, wh: wr.height };
      document.addEventListener('mousemove', _onDragMove);
      document.addEventListener('mouseup', _onDragEnd);
    });
  }

  function _onDragMove(e) {
    if (!_dragState) return;
    var x = e.clientX - _dragState.ox;
    var y = e.clientY - _dragState.oy;
    x = Math.max(0, Math.min(x, window.innerWidth - _dragState.pw));
    y = Math.max(0, Math.min(y, window.innerHeight - _dragState.ph));
    var panel = document.getElementById('ch-panel');
    var widget = document.getElementById('ch-widget');
    panel.style.cssText += ';position:fixed;left:' + x + 'px;top:' + y + 'px;right:auto;bottom:auto';
    var wx = x + _dragState.pw / 2 - _dragState.ww / 2;
    var wy = y + _dragState.ph + 10;
    widget.style.cssText += ';position:fixed;left:' + wx + 'px;top:' + wy + 'px;right:auto;bottom:auto';
  }

  function _onDragEnd(e) {
    if (_dragState) {
      var panel = document.getElementById('ch-panel');
      var pr = panel.getBoundingClientRect();
      _savePosition(pr.left, pr.top);
    }
    _dragState = null;
    document.removeEventListener('mousemove', _onDragMove);
    document.removeEventListener('mouseup', _onDragEnd);
  }

  /* ══════════════════════════════════════════════════════════════════════
     TABS
  ══════════════════════════════════════════════════════════════════════ */
  function _switchTab(tab) {
    _activeTab = tab;
    // Reset detail views when switching tabs
    if (tab !== 'discussions') _activeDiscussion = null;
    if (tab !== 'doubts') _activeQuestion = null;

    document.querySelectorAll('.ch-tab').forEach(function(t) {
      t.classList.toggle('active', t.dataset.tab === tab);
    });

    var body = document.getElementById('ch-tab-body');
    if (!body) return;

    switch (tab) {
      case 'chat':          _renderChat(body); break;
      case 'discussions':   _renderDiscussions(body); break;
      case 'doubts':        _renderDoubts(body); break;
      case 'notifications': _renderNotifications(body); break;
      case 'leaderboard':   _renderLeaderboard(body); break;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     CHAT TAB
  ══════════════════════════════════════════════════════════════════════ */
  var _replyingTo = null;
  var EMOJI_LIST = ['👍','❤️','😂','🔥','💡','✅','🤔','😮','👏','🎯','💪','🚀'];

  function _renderChat(body) {
    if (typeof _supabase === 'undefined' || !_me) {
      body.innerHTML = '<div class="ch-empty"><div class="ch-empty-icon">🔒</div><div class="ch-empty-title">Sign in required</div><div class="ch-empty-sub">Please sign in to join the chat</div></div>';
      return;
    }

    // Load rooms and render
    _loadRooms().then(function(rooms) {
      _rooms = rooms;
      if (!_activeRoomId && rooms.length) {
        _activeRoomId = rooms[0].id;
        _activeRoomSlug = rooms[0].slug;
      }
      var roomBar = rooms.map(function(r) {
        return '<button class="ch-room-btn' + (r.id === _activeRoomId ? ' active' : '') + '" data-room="' + _esc(r.id) + '" onclick="CommunityHub._joinRoom(\'' + _esc(r.id) + '\',\'' + _esc(r.slug) + '\')">' + _esc(r.icon) + ' ' + _esc(r.name) + '</button>';
      }).join('');

      body.style.display = 'flex';
      body.style.flexDirection = 'column';
      body.style.overflow = 'hidden';
      body.style.height = '100%';
      var activeRoom = rooms.find(function(r){ return r.id === _activeRoomId; }) || rooms[0] || {};
      body.innerHTML =
        '<div class="ch-room-bar">' + roomBar + '</div>' +
        '<div class="ch-clear-bar">' +
          '<span class="ch-clear-room-name" id="ch-room-label">' + _esc(activeRoom.icon||'💬') + ' ' + _esc(activeRoom.name||'Chat') + '</span>' +
          '<button class="ch-clear-btn" onclick="CommunityHub._confirmClear(\'room\')" title="Clear this room">🗑 Clear Room</button>' +
          '<button class="ch-clear-btn" onclick="CommunityHub._confirmClear(\'all\')" title="Clear all rooms in this module" style="border-color:rgba(245,158,11,.25);color:rgba(245,158,11,.7)">🗑 Clear All</button>' +
        '</div>' +
        '<div class="ch-chat-msgs" id="ch-msgs"></div>' +
        '<div class="ch-typing" id="ch-typing"></div>' +
        '<div id="ch-chat-reply-banner" style="display:none" class="ch-chat-reply-banner">' +
          '<span id="ch-reply-preview-text"></span>' +
          '<button class="ch-hdr-btn" onclick="CommunityHub._clearReply()">✕</button>' +
        '</div>' +
        '<div class="ch-chat-input-row" style="position:relative">' +
          '<button class="ch-emoji-btn" id="ch-emoji-toggle" onclick="CommunityHub._toggleEmoji()" title="Emoji">😊</button>' +
          '<div id="ch-emoji-picker" class="ch-emoji-picker" style="display:none">' +
            EMOJI_LIST.map(function(e){ return '<button class="ch-emoji-item" onclick="CommunityHub._insertEmoji(\'' + e + '\')">' + e + '</button>'; }).join('') +
          '</div>' +
          '<div class="ch-chat-inp" id="ch-chat-inp" contenteditable="true" data-placeholder="Message…" ' +
               'onkeydown="CommunityHub._chatKeydown(event)" oninput="CommunityHub._chatInput()"></div>' +
          '<button class="ch-send-btn" id="ch-send-btn" onclick="CommunityHub._sendMessage()" title="Send">➤</button>' +
        '</div>';

      _loadMessages();
      _subscribeChat();
    });
  }

  function _loadRooms() {
    if (typeof _supabase === 'undefined') return Promise.resolve([]);
    return _supabase.from('community_chat_rooms').select('id,slug,name,icon,color,modules')
      .then(function(r) { return r.data || []; }).catch(function() { return []; });
  }

  function _joinRoom(roomId, roomSlug) {
    if (roomId === _activeRoomId) return;
    _activeRoomId = roomId;
    _activeRoomSlug = roomSlug;
    _chatMessages = [];
    _replyingTo = null;
    if (_chatChannel) { _supabase.removeChannel(_chatChannel); _chatChannel = null; }
    var body = document.getElementById('ch-tab-body');
    if (body) _renderChat(body);
  }

  /* ── Clear chat ── */
  function _confirmClear(scope) {
    var existing = document.getElementById('ch-clear-modal-overlay');
    if (existing) existing.remove();

    var room = _rooms.find(function(r){ return r.id === _activeRoomId; }) || {};
    var isAll = scope === 'all';
    var title = isAll ? 'Clear All Rooms' : 'Clear ' + (room.name || 'Room');
    var sub = isAll
      ? 'Delete ALL messages across every chat room in <strong>' + _esc(_cfg.moduleName) + '</strong>? This cannot be undone.'
      : 'Delete ALL messages in <strong>' + _esc(room.icon||'💬') + ' ' + _esc(room.name||'this room') + '</strong>? This cannot be undone.';

    var ov = document.createElement('div');
    ov.id = 'ch-clear-modal-overlay';
    ov.className = 'ch-clear-modal-overlay';
    ov.innerHTML =
      '<div class="ch-clear-modal">' +
        '<div class="ch-clear-modal-icon">🗑️</div>' +
        '<div class="ch-clear-modal-title">' + _esc(title) + '</div>' +
        '<div class="ch-clear-modal-sub">' + sub + '</div>' +
        '<div class="ch-clear-modal-btns">' +
          '<button class="ch-clear-modal-cancel" onclick="document.getElementById(\'ch-clear-modal-overlay\').remove()">Cancel</button>' +
          '<button class="ch-clear-modal-confirm" onclick="CommunityHub._executeClear(\'' + scope + '\')">' +
            (isAll ? 'Clear All Rooms' : 'Clear Room') +
          '</button>' +
        '</div>' +
      '</div>';
    ov.addEventListener('click', function(e){ if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  function _executeClear(scope) {
    var ov = document.getElementById('ch-clear-modal-overlay');
    if (ov) ov.remove();

    if (!_me) { _toast('Sign in required', 'err'); return; }

    var confirmBtn = null; // spinner feedback handled by toast

    if (scope === 'room') {
      if (!_activeRoomId) return;
      _supabase.from('community_messages').delete().eq('room_id', _activeRoomId)
        .then(function() {
          _chatMessages = [];
          _renderMessages();
          _toast('Room cleared', 'ok');
        })
        .catch(function(e) { _toast('Error: ' + (e.message || 'Failed to clear'), 'err'); });

    } else {
      // Clear all rooms for this module
      var roomIds = _rooms.map(function(r){ return r.id; });
      if (!roomIds.length) { _toast('No rooms found', 'err'); return; }
      _supabase.from('community_messages').delete().in('room_id', roomIds)
        .then(function() {
          _chatMessages = [];
          _renderMessages();
          _toast('All rooms cleared', 'ok');
        })
        .catch(function(e) { _toast('Error: ' + (e.message || 'Failed to clear'), 'err'); });
    }
  }

  function _loadMessages() {
    if (!_activeRoomId || typeof _supabase === 'undefined') return;
    var msgsEl = document.getElementById('ch-msgs');
    if (msgsEl) msgsEl.innerHTML = '<div class="ch-spinner"><div class="ch-spin"></div></div>';

    _supabase.from('community_messages')
      .select('id,body,author_id,reply_to_id,reactions,created_at,edited')
      .eq('room_id', _activeRoomId)
      .order('created_at', { ascending: true })
      .limit(60)
      .then(function(r) {
        var msgs = r.data || [];
        return _fetchProfiles(msgs.map(function(m){ return m.author_id; })).then(function(pm) {
          msgs.forEach(function(msg){ msg.community_profiles = pm[msg.author_id] || {}; });
          _chatMessages = msgs;
          _renderMessages();
          _scrollToBottom();
          _markRoomRead();
        });
      }).catch(function(e) {
        if (msgsEl) msgsEl.innerHTML = '<div class="ch-empty"><div class="ch-empty-icon">⚠️</div><div class="ch-empty-sub">' + _esc(e.message||'Failed to load') + '</div></div>';
      });
  }

  function _renderMessages() {
    var el = document.getElementById('ch-msgs');
    if (!el) return;
    if (!_chatMessages.length) {
      el.innerHTML = '<div class="ch-empty"><div class="ch-empty-icon">💬</div><div class="ch-empty-title">No messages yet</div><div class="ch-empty-sub">Start the conversation!</div></div>';
      return;
    }
    el.innerHTML = _chatMessages.map(function(msg) { return _buildMsgBubble(msg); }).join('');
  }

  function _buildMsgBubble(msg) {
    var isMine = _me && msg.author_id === _me.id;
    var profile = msg.community_profiles || {};
    var name = profile.display_name || 'Learner';
    var color = profile.avatar_color || '#4f8ef7';
    var reactions = msg.reactions && typeof msg.reactions === 'object' ? msg.reactions : {};
    var reactionHtml = Object.keys(reactions).map(function(emoji) {
      var count = reactions[emoji];
      if (!count) return '';
      return '<span class="ch-reaction" onclick="CommunityHub._reactMsg(\'' + _esc(msg.id) + '\',\'' + emoji + '\')">' + emoji + ' ' + count + '</span>';
    }).join('');

    var replyHtml = '';
    if (msg.reply_to_id) {
      var orig = _chatMessages.find(function(m){ return m.id === msg.reply_to_id; });
      if (orig) replyHtml = '<div class="ch-reply-preview" onclick="CommunityHub._scrollToMsg(\'' + _esc(msg.reply_to_id) + '\')">' + _esc((orig.body||'').slice(0,60)) + (orig.body&&orig.body.length>60?'…':'') + '</div>';
    }

    return '<div class="ch-msg-group' + (isMine?' mine':'') + '" id="msg-' + _esc(msg.id) + '">' +
      (!isMine ? _avatar(name, color) : '') +
      '<div>' +
        (!isMine ? '<div class="ch-msg-name">' + _esc(name) + '</div>' : '') +
        '<div class="ch-msg-bubble' + (isMine?' mine':'') + '">' +
          replyHtml +
          '<div>' + _renderMsgText(msg.body) + '</div>' +
          (msg.edited ? '<span style="font-size:9px;color:var(--text3,#535d7e)"> (edited)</span>' : '') +
          '<div class="ch-msg-time">' + _ago(msg.created_at) +
            ' <span onclick="CommunityHub._replyToMsg(\'' + _esc(msg.id) + '\')" style="cursor:pointer;margin-left:6px;color:var(--text3,#535d7e);font-size:10px">↩</span>' +
            ' <span onclick="CommunityHub._reactMsg(\'' + _esc(msg.id) + '\',null)" style="cursor:pointer;margin-left:4px;font-size:12px">😊</span>' +
          '</div>' +
          (reactionHtml ? '<div class="ch-msg-reactions">' + reactionHtml + '</div>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function _renderMsgText(text) {
    return _esc(text || '')
      .replace(/`([^`]+)`/g, '<span class="ch-code">$1</span>')
      .replace(/@(\w+)/g, '<span class="ch-mention">@$1</span>');
  }

  function _chatKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _sendMessage(); }
  }

  function _chatInput() {
    _broadcastTyping();
  }

  function _broadcastTyping() {
    if (!_chatChannel || !_me) return;
    clearTimeout(_typingTimer);
    _chatChannel.send({ type:'broadcast', event:'typing', payload:{ user: _me.display_name } });
    _typingTimer = setTimeout(function() {
      _chatChannel.send({ type:'broadcast', event:'typing_stop', payload:{ user: _me.display_name } });
    }, 2000);
  }

  function _sendMessage() {
    if (!_me || !_activeRoomId) return;
    var inp = document.getElementById('ch-chat-inp');
    if (!inp) return;
    var text = (inp.textContent || '').trim();
    if (!text) return;

    inp.textContent = '';
    var btn = document.getElementById('ch-send-btn');
    if (btn) btn.disabled = true;

    var row = { room_id: _activeRoomId, author_id: _me.id, body: text };
    if (_replyingTo) row.reply_to_id = _replyingTo.id;

    _supabase.from('community_messages').insert(row)
      .select('id,body,author_id,reply_to_id,reactions,created_at,edited')
      .then(function(r) {
        var msg = r.data && r.data[0];
        if (msg) {
          msg.community_profiles = { display_name: _me.display_name, avatar_color: _me.avatar_color };
          _chatMessages.push(msg);
          var el = document.getElementById('ch-msgs');
          if (el) {
            var emptyEl = el.querySelector('.ch-empty');
            if (emptyEl) el.innerHTML = '';
            var div = document.createElement('div');
            div.innerHTML = _buildMsgBubble(msg);
            if (div.firstElementChild) el.appendChild(div.firstElementChild);
            _scrollToBottom();
          }
        }
        _replyingTo = null;
        var banner = document.getElementById('ch-chat-reply-banner');
        if (banner) banner.style.display = 'none';
        if (btn) btn.disabled = false;
      })
      .catch(function(e) {
        _toast('Failed to send: ' + (e.message||''), 'err');
        inp.textContent = text;
        if (btn) btn.disabled = false;
      });
  }

  function _replyToMsg(msgId) {
    _replyingTo = _chatMessages.find(function(m){ return m.id === msgId; });
    if (!_replyingTo) return;
    var banner = document.getElementById('ch-chat-reply-banner');
    var prev = document.getElementById('ch-reply-preview-text');
    if (banner) banner.style.display = 'flex';
    if (prev) prev.textContent = 'Replying to: ' + (_replyingTo.body||'').slice(0,50);
    var inp = document.getElementById('ch-chat-inp');
    if (inp) inp.focus();
  }

  function _clearReply() {
    _replyingTo = null;
    var banner = document.getElementById('ch-chat-reply-banner');
    if (banner) banner.style.display = 'none';
  }

  function _reactMsg(msgId, emoji) {
    if (!_me || !msgId) return;
    if (!emoji) { /* show mini emoji picker next to message */ return; }
    var msg = _chatMessages.find(function(m){ return m.id === msgId; });
    if (!msg) return;
    var reactions = msg.reactions && typeof msg.reactions === 'object' ? Object.assign({}, msg.reactions) : {};
    reactions[emoji] = (reactions[emoji] || 0) + 1;
    _supabase.from('community_messages').update({ reactions: reactions }).eq('id', msgId).then(function() {}).catch(function(){});
  }

  function _closeEmoji() {
    var picker = document.getElementById('ch-emoji-picker');
    var btn    = document.getElementById('ch-emoji-toggle');
    if (picker) picker.style.display = 'none';
    if (btn)  { btn.textContent = '😊'; btn.classList.remove('open'); }
    document.removeEventListener('click', _emojiClickOutside, true);
  }

  function _emojiClickOutside(e) {
    var picker = document.getElementById('ch-emoji-picker');
    var btn    = document.getElementById('ch-emoji-toggle');
    if (picker && !picker.contains(e.target) && btn && !btn.contains(e.target)) {
      _closeEmoji();
    }
  }

  function _toggleEmoji() {
    var picker = document.getElementById('ch-emoji-picker');
    var btn    = document.getElementById('ch-emoji-toggle');
    if (!picker) return;
    var isOpen = picker.style.display !== 'none';
    if (isOpen) {
      _closeEmoji();
    } else {
      picker.style.display = 'flex';
      if (btn) { btn.textContent = '✕'; btn.classList.add('open'); }
      // close on next outside tap (use capture so it fires before bubbling)
      setTimeout(function() {
        document.addEventListener('click', _emojiClickOutside, true);
      }, 0);
    }
  }

  function _insertEmoji(emoji) {
    var inp = document.getElementById('ch-chat-inp');
    if (inp) inp.textContent += emoji;
    _closeEmoji();
    if (inp) inp.focus();
  }

  function _scrollToBottom() {
    var el = document.getElementById('ch-msgs');
    if (el) setTimeout(function(){ el.scrollTop = el.scrollHeight; }, 50);
  }

  function _scrollToMsg(id) {
    var el = document.getElementById('msg-' + id);
    if (el) el.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }

  function _markRoomRead() {
    if (!_me || !_activeRoomId) return;
    _supabase.from('community_read_receipts').upsert(
      { user_id: _me.id, room_id: _activeRoomId, last_read_at: new Date().toISOString() },
      { onConflict: 'user_id,room_id' }
    ).then(function(){}).catch(function(){});
  }

  function _subscribeChat() {
    if (typeof _supabase === 'undefined' || !_activeRoomId) return;
    if (_chatChannel) { _supabase.removeChannel(_chatChannel); }

    _chatChannel = _supabase.channel('chat:' + _activeRoomId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_messages', filter: 'room_id=eq.' + _activeRoomId }, function(payload) {
        var msg = payload.new;
        // Skip if already added locally (our own send via _sendMessage)
        if (_chatMessages.some(function(m){ return m.id === msg.id; })) return;
        _supabase.from('community_profiles').select('display_name,avatar_color').eq('user_id', msg.author_id).maybeSingle()
          .then(function(r) {
            msg.community_profiles = r.data || {};
            _chatMessages.push(msg);
            var el = document.getElementById('ch-msgs');
            if (el) {
              var div = document.createElement('div');
              div.innerHTML = _buildMsgBubble(msg);
              if (div.firstElementChild) el.appendChild(div.firstElementChild);
              _scrollToBottom();
            }
            _markRoomRead();
          });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_messages', filter: 'room_id=eq.' + _activeRoomId }, function(payload) {
        var updated = payload.new;
        var idx = _chatMessages.findIndex(function(m){ return m.id === updated.id; });
        if (idx >= 0) {
          _chatMessages[idx] = Object.assign(_chatMessages[idx], updated);
          _renderMessages();
        }
      })
      .on('broadcast', { event: 'typing' }, function(payload) {
        if (!payload.payload || !payload.payload.user) return;
        _typingUsers[payload.payload.user] = true;
        _updateTyping();
        setTimeout(function(){ delete _typingUsers[payload.payload.user]; _updateTyping(); }, 2500);
      })
      .on('broadcast', { event: 'typing_stop' }, function(payload) {
        if (payload.payload) delete _typingUsers[payload.payload.user];
        _updateTyping();
      })
      .on('presence', { event: 'sync' }, function() {
        var state = _chatChannel.presenceState();
        _onlineCount = Object.keys(state).length;
        _updateOnlineLabel();
      })
      .subscribe(function() {
        if (_me) _chatChannel.track({ user: _me.display_name });
      });
  }

  function _updateTyping() {
    var el = document.getElementById('ch-typing');
    if (!el) return;
    var users = Object.keys(_typingUsers).filter(function(u){ return !_me || u !== _me.display_name; });
    if (!users.length) { el.textContent = ''; return; }
    el.textContent = users.join(', ') + (users.length === 1 ? ' is' : ' are') + ' typing…';
  }

  function _updateOnlineLabel() {
    var el = document.getElementById('ch-online-lbl');
    if (el) el.textContent = _onlineCount + ' online';
    var meta = document.getElementById('ch-panel-meta');
    if (meta) meta.textContent = '🟢 ' + _onlineCount + ' online · ' + (_cfg.moduleName || 'General');
  }

  /* ══════════════════════════════════════════════════════════════════════
     DISCUSSIONS TAB
  ══════════════════════════════════════════════════════════════════════ */
  function _renderDiscussions(body) {
    if (_activeDiscussion) { _renderDiscussionDetail(body, _activeDiscussion); return; }
    body.style.display = ''; body.style.flexDirection = '';
    body.innerHTML = '<div class="ch-spinner"><div class="ch-spin"></div></div>';

    _supabase.from('community_discussions')
      .select('id,title,body,module,created_at,like_count,views,author_id,topic_id')
      .eq('module', _cfg.module)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(function(r) {
        var items = r.data || [];
        return Promise.all([
          _fetchProfiles(items.map(function(d){ return d.author_id; })),
          _fetchTopics(items.map(function(d){ return d.topic_id; }).filter(Boolean))
        ]).then(function(res) {
          items.forEach(function(d){
            d.community_profiles = res[0][d.author_id] || {};
            d.community_topics   = d.topic_id ? (res[1][d.topic_id] || {}) : {};
          });
          _discussions = items;
          _buildDiscussionsList(body);
        });
      }).catch(function() { _discussions = []; _buildDiscussionsList(body); });
  }

  function _buildDiscussionsList(body) {
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border,#1e2436)">' +
      '<span style="font-size:12px;font-weight:600;color:var(--text2,#8a95b8)">' + _discussions.length + ' Discussions</span>' +
      '<button class="ch-btn-prim" style="padding:5px 12px;font-size:11px" onclick="CommunityHub._showNewDiscussion()">+ New</button>' +
    '</div>';

    if (!_discussions.length) {
      html += '<div class="ch-empty"><div class="ch-empty-icon">🗣️</div><div class="ch-empty-title">No discussions yet</div><div class="ch-empty-sub">Start a conversation about ' + _esc(_cfg.moduleName) + '</div></div>';
    } else {
      html += _discussions.map(function(d) {
        var profile = d.community_profiles || {};
        var topic = d.community_topics || {};
        return '<div class="ch-list-item" onclick="CommunityHub._openDiscussion(\'' + _esc(d.id) + '\')">' +
          _avatar(profile.display_name, profile.avatar_color) +
          '<div class="ch-list-body">' +
            '<div class="ch-list-title">' + _esc(d.title) + '</div>' +
            '<div class="ch-list-meta">' +
              (topic.label ? '<span class="ch-topic-chip" style="background:' + _esc(topic.color||'#4f8ef7') + '22;color:' + _esc(topic.color||'#4f8ef7') + '">' + _esc(topic.icon||'') + ' ' + _esc(topic.label) + '</span>' : '') +
              '<span>' + _esc(profile.display_name||'Learner') + '</span>' +
              '<span>·</span><span>' + _ago(d.created_at) + '</span>' +
              '<span>· 👍 ' + (d.like_count||0) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    body.innerHTML = html;
  }

  function _openDiscussion(id) {
    var d = _discussions.find(function(x){ return x.id === id; });
    if (!d) return;
    _activeDiscussion = d;
    var body = document.getElementById('ch-tab-body');
    if (body) _renderDiscussionDetail(body, d);
  }

  function _renderDiscussionDetail(body, d) {
    var profile = d.community_profiles || {};
    var topic = d.community_topics || {};
    body.innerHTML =
      '<div class="ch-detail-hdr">' +
        '<button class="ch-back-btn" onclick="CommunityHub._backDiscussions()">← Back</button>' +
        '<div class="ch-detail-title">' + _esc(d.title) + '</div>' +
        '<div class="ch-list-meta">' +
          (topic.label ? '<span class="ch-topic-chip" style="background:' + _esc(topic.color||'#4f8ef7') + '22;color:' + _esc(topic.color||'#4f8ef7') + '">' + _esc(topic.icon||'') + ' ' + _esc(topic.label) + '</span>' : '') +
          '<span>' + _esc(profile.display_name||'Learner') + '</span><span>·</span><span>' + _ago(d.created_at) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="ch-detail-body">' + _renderMsgText(d.body) + '</div>' +
      '<div style="padding:8px 14px;display:flex;gap:8px;border-bottom:1px solid var(--border,#1e2436)">' +
        '<button class="ch-btn-sec" style="font-size:11px;padding:4px 10px" onclick="CommunityHub._voteTarget(\'discussion\',\'' + _esc(d.id) + '\',1)">👍 ' + (d.like_count||0) + '</button>' +
      '</div>' +
      '<div id="ch-disc-comments"><div class="ch-spinner"><div class="ch-spin"></div></div></div>' +
      '<div style="padding:8px 14px;border-top:1px solid var(--border,#1e2436)">' +
        '<textarea class="ch-inp ch-ta" id="ch-disc-comment-inp" placeholder="Write a comment…" style="min-height:56px"></textarea>' +
        '<div style="margin-top:6px;text-align:right"><button class="ch-btn-prim" onclick="CommunityHub._postComment(\'discussion\',\'' + _esc(d.id) + '\')">Comment</button></div>' +
      '</div>';
    _loadComments('discussion', d.id, document.getElementById('ch-disc-comments'));
  }

  function _backDiscussions() {
    _activeDiscussion = null;
    var body = document.getElementById('ch-tab-body');
    if (body) _renderDiscussions(body);
  }

  function _showNewDiscussion() {
    var body = document.getElementById('ch-tab-body');
    if (!body) return;
    body.innerHTML =
      '<div style="padding:10px 14px;border-bottom:1px solid var(--border,#1e2436);display:flex;align-items:center;gap:8px">' +
        '<button class="ch-back-btn" onclick="CommunityHub._backDiscussions()" style="margin-bottom:0">← Back</button>' +
        '<span style="font-size:13px;font-weight:600;color:var(--text,#e2e8f8)">New Discussion</span>' +
      '</div>' +
      '<div class="ch-compose">' +
        '<div class="ch-field"><div class="ch-field-lbl">Title</div><input class="ch-inp" id="ch-disc-title" placeholder="What do you want to discuss?" maxlength="120"/></div>' +
        '<div class="ch-field"><div class="ch-field-lbl">Topic</div>' + _topicSelect('ch-disc-topic') + '</div>' +
        '<div class="ch-field"><div class="ch-field-lbl">Description</div><textarea class="ch-inp ch-ta" id="ch-disc-body" placeholder="Share your thoughts, code, or question…"></textarea></div>' +
        '<div class="ch-inline-btns"><button class="ch-btn-prim" onclick="CommunityHub._submitDiscussion()">Post Discussion</button><button class="ch-btn-sec" onclick="CommunityHub._backDiscussions()">Cancel</button></div>' +
      '</div>';
  }

  function _topicSelect(id) {
    return '<select class="ch-sel" id="' + id + '">' +
      '<option value="">— Select topic —</option>' +
      _topics.map(function(t){ return '<option value="' + t.id + '">' + _esc(t.icon) + ' ' + _esc(t.label) + '</option>'; }).join('') +
      '</select>';
  }

  function _submitDiscussion() {
    if (!_me) { _toast('Sign in required', 'err'); return; }
    var title = (document.getElementById('ch-disc-title')||{}).value||'';
    var body  = (document.getElementById('ch-disc-body')||{}).value||'';
    var topicId = (document.getElementById('ch-disc-topic')||{}).value||null;
    if (!title.trim() || !body.trim()) { _toast('Title and description required', 'err'); return; }
    var btn = document.querySelector('.ch-compose .ch-btn-prim');
    if (btn) btn.disabled = true;
    _supabase.from('community_discussions').insert({ author_id:_me.id, module:_cfg.module, title:title.trim(), body:body.trim(), topic_id:topicId||null })
      .then(function() { _toast('Discussion posted!', 'ok'); _backDiscussions(); })
      .catch(function(e) { _toast('Error: ' + (e.message||''), 'err'); if(btn) btn.disabled=false; });
  }

  /* ══════════════════════════════════════════════════════════════════════
     DOUBTS TAB
  ══════════════════════════════════════════════════════════════════════ */
  var _doubtTags = [];

  function _renderDoubts(body) {
    if (_activeQuestion) { _renderQuestionDetail(body, _activeQuestion); return; }
    body.style.display = ''; body.style.flexDirection = '';
    body.innerHTML = '<div class="ch-spinner"><div class="ch-spin"></div></div>';

    _supabase.from('community_questions')
      .select('id,title,body,difficulty,tags,status,vote_score,views,created_at,author_id,topic_id,accepted_answer_id')
      .eq('module', _cfg.module)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(function(r) {
        var items = r.data || [];
        return Promise.all([
          _fetchProfiles(items.map(function(q){ return q.author_id; })),
          _fetchTopics(items.map(function(q){ return q.topic_id; }).filter(Boolean))
        ]).then(function(res) {
          items.forEach(function(q){
            q.community_profiles = res[0][q.author_id] || {};
            q.community_topics   = q.topic_id ? (res[1][q.topic_id] || {}) : {};
          });
          _questions = items;
          _buildDoubtsList(body);
        });
      }).catch(function() { _questions = []; _buildDoubtsList(body); });
  }

  function _buildDoubtsList(body) {
    var html = '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border,#1e2436)">' +
      '<span style="font-size:12px;font-weight:600;color:var(--text2,#8a95b8)">' + _questions.length + ' Doubts</span>' +
      '<button class="ch-btn-prim" style="padding:5px 12px;font-size:11px" onclick="CommunityHub._showAskDoubt()">+ Ask Doubt</button>' +
    '</div>';

    if (!_questions.length) {
      html += '<div class="ch-empty"><div class="ch-empty-icon">❓</div><div class="ch-empty-title">No doubts posted yet</div><div class="ch-empty-sub">Ask your first question about ' + _esc(_cfg.moduleName) + '</div></div>';
    } else {
      html += _questions.map(function(q) {
        var profile = q.community_profiles || {};
        var statusIcon = q.status === 'answered' ? '✅' : q.status === 'closed' ? '🔒' : '❓';
        return '<div class="ch-list-item" onclick="CommunityHub._openQuestion(\'' + _esc(q.id) + '\')">' +
          '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;min-width:32px">' +
            '<div style="font-size:16px">' + statusIcon + '</div>' +
            '<div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;font-weight:700;color:var(--teal,#06d6a0)">' + (q.vote_score||0) + '</div>' +
          '</div>' +
          '<div class="ch-list-body">' +
            '<div class="ch-list-title">' + _esc(q.title) + '</div>' +
            '<div class="ch-list-meta">' +
              '<span class="ch-diff-chip ' + _esc(q.difficulty) + '">' + _esc(q.difficulty) + '</span>' +
              (q.tags||[]).slice(0,2).map(function(t){ return '<span class="ch-tag" style="font-size:10px;padding:1px 6px">' + _esc(t) + '</span>'; }).join('') +
              '<span>' + _esc(profile.display_name||'Learner') + ' · ' + _ago(q.created_at) + '</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    body.innerHTML = html;
  }

  function _openQuestion(id) {
    var q = _questions.find(function(x){ return x.id === id; });
    if (!q) return;
    _activeQuestion = q;
    var body = document.getElementById('ch-tab-body');
    if (body) _renderQuestionDetail(body, q);
    // Increment view
    _supabase.from('community_questions').update({ views: (q.views||0)+1 }).eq('id', id).then(function(){}).catch(function(){});
  }

  function _renderQuestionDetail(body, q) {
    var profile = q.community_profiles || {};
    var topic = q.community_topics || {};
    var isOwner = _me && q.author_id === _me.id;

    body.innerHTML =
      '<div class="ch-detail-hdr">' +
        '<button class="ch-back-btn" onclick="CommunityHub._backDoubts()">← Back</button>' +
        '<div class="ch-detail-title">' + _esc(q.title) + '</div>' +
        '<div class="ch-list-meta" style="margin-top:5px">' +
          '<span class="ch-diff-chip ' + _esc(q.difficulty) + '">' + _esc(q.difficulty) + '</span>' +
          (q.tags||[]).map(function(t){ return '<span class="ch-tag" style="font-size:10px;padding:1px 6px">' + _esc(t) + '</span>'; }).join('') +
          '<span>' + _esc(profile.display_name||'Learner') + ' · ' + _ago(q.created_at) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="ch-detail-body">' + _renderMsgText(q.body) + '</div>' +
      '<div id="ch-answers-section"><div class="ch-spinner"><div class="ch-spin"></div></div></div>' +
      '<div style="padding:10px 14px;border-top:1px solid var(--border,#1e2436)">' +
        '<div style="font-size:12px;font-weight:600;color:var(--text2,#8a95b8);margin-bottom:8px">Your Answer</div>' +
        '<textarea class="ch-inp ch-ta" id="ch-ans-inp" placeholder="Share your knowledge…"></textarea>' +
        '<div style="margin-top:6px;text-align:right"><button class="ch-btn-prim" onclick="CommunityHub._postAnswer(\'' + _esc(q.id) + '\')">Post Answer</button></div>' +
      '</div>';

    _loadAnswers(q.id, document.getElementById('ch-answers-section'), isOwner, q.accepted_answer_id);
  }

  function _loadAnswers(questionId, container, isOwner, acceptedId) {
    _supabase.from('community_answers')
      .select('id,body,vote_score,is_accepted,is_best,created_at,author_id')
      .eq('question_id', questionId)
      .order('is_accepted', { ascending: false })
      .order('vote_score', { ascending: false })
      .then(function(r) {
        var answers = r.data || [];
        if (!answers.length) {
          container.innerHTML = '<div class="ch-empty" style="padding:16px"><div class="ch-empty-icon">💬</div><div class="ch-empty-sub">No answers yet — be the first!</div></div>';
          return;
        }
        return _fetchProfiles(answers.map(function(a){ return a.author_id; })).then(function(pm) {
          var html = '<div style="padding:8px 14px;font-size:12px;font-weight:600;color:var(--text2,#8a95b8);border-bottom:1px solid var(--border,#1e2436)">' + answers.length + ' Answer' + (answers.length>1?'s':'') + '</div>';
          answers.forEach(function(a) {
            var ap = pm[a.author_id] || {};
            var badgeHtml = '';
            if (a.is_accepted) badgeHtml += '<span class="ch-ans-badge accepted">✔ Accepted</span>';
            else if (a.is_best) badgeHtml += '<span class="ch-ans-badge best">⭐ Most Helpful</span>';
            else if (a.vote_score >= 3) badgeHtml += '<span class="ch-ans-badge popular">🔥 Popular</span>';
            var canAccept = isOwner && !a.is_accepted && _me;
            html += '<div class="ch-answer' + (a.is_accepted?' accepted':'') + '" id="ans-' + _esc(a.id) + '">' +
              '<div class="ch-vote-col">' +
                '<button class="ch-vote-btn" onclick="CommunityHub._voteTarget(\'answer\',\'' + _esc(a.id) + '\',1)">▲</button>' +
                '<div class="ch-vote-score">' + (a.vote_score||0) + '</div>' +
                '<button class="ch-vote-btn" onclick="CommunityHub._voteTarget(\'answer\',\'' + _esc(a.id) + '\',-1)">▼</button>' +
              '</div>' +
              '<div class="ch-answer-body">' +
                (badgeHtml ? '<div style="margin-bottom:8px">' + badgeHtml + '</div>' : '') +
                '<div class="ch-ans-text">' + _renderMsgText(a.body) + '</div>' +
                '<div class="ch-ans-foot">' +
                  '<span class="ch-ans-author">' + _esc(ap.display_name||'Learner') + ' · ' + _ago(a.created_at) + '</span>' +
                  (canAccept ? '<button class="ch-accept-btn" onclick="CommunityHub._acceptAnswer(\'' + _esc(a.id) + '\',\'' + _esc(questionId) + '\')">✔ Accept</button>' : '') +
                '</div>' +
              '</div>' +
            '</div>';
          });
          container.innerHTML = html;
        });
      }).catch(function() {
        container.innerHTML = '<div class="ch-empty" style="padding:16px"><div class="ch-empty-sub">Failed to load answers</div></div>';
      });
  }

  function _acceptAnswer(answerId, questionId) {
    _supabase.rpc('community_accept_answer', { p_answer_id: answerId })
      .then(function() {
        _toast('Answer accepted!', 'ok');
        // Refresh answers
        var container = document.getElementById('ch-answers-section');
        if (container && _activeQuestion) _loadAnswers(questionId, container, true, answerId);
        // Notify answerer
        _supabase.from('community_answers').select('author_id').eq('id', answerId).single().then(function(r){
          if (r.data) _sendNotification(r.data.author_id, 'answer_accepted', 'answer', answerId, 'Your answer was accepted! ✔');
        });
      }).catch(function(e) { _toast('Error: ' + (e.message||''), 'err'); });
  }

  function _postAnswer(questionId) {
    if (!_me) { _toast('Sign in required', 'err'); return; }
    var inp = document.getElementById('ch-ans-inp');
    var text = (inp ? inp.value : '').trim();
    if (!text) { _toast('Answer cannot be empty', 'err'); return; }
    var btn = document.querySelector('#ch-tab-body .ch-btn-prim:last-child');
    if (btn) btn.disabled = true;
    _supabase.from('community_answers').insert({ question_id: questionId, author_id: _me.id, body: text })
      .then(function() {
        if (inp) inp.value = '';
        _toast('Answer posted!', 'ok');
        var container = document.getElementById('ch-answers-section');
        if (container && _activeQuestion) _loadAnswers(questionId, container, false, _activeQuestion.accepted_answer_id);
        // Update reputation
        _supabase.from('community_profiles').update({ reputation: (_me.reputation||0)+2 }).eq('user_id', _me.id).then(function(){}).catch(function(){});
        // Notify question author
        if (_activeQuestion && _activeQuestion.author_id !== _me.id) _sendNotification(_activeQuestion.author_id, 'new_answer', 'question', questionId, _me.display_name + ' answered your doubt');
        if (btn) btn.disabled = false;
      }).catch(function(e) { _toast('Error: ' + (e.message||''), 'err'); if(btn) btn.disabled=false; });
  }

  function _showAskDoubt() {
    _doubtTags = [];
    var body = document.getElementById('ch-tab-body');
    if (!body) return;
    body.innerHTML =
      '<div style="padding:10px 14px;border-bottom:1px solid var(--border,#1e2436);display:flex;align-items:center;gap:8px">' +
        '<button class="ch-back-btn" onclick="CommunityHub._backDoubts()" style="margin-bottom:0">← Back</button>' +
        '<span style="font-size:13px;font-weight:600;color:var(--text,#e2e8f8)">Ask a Doubt</span>' +
      '</div>' +
      '<div class="ch-compose">' +
        '<div class="ch-field"><div class="ch-field-lbl">Title</div><input class="ch-inp" id="ch-q-title" placeholder="e.g. Difference between HashMap and ConcurrentHashMap?" maxlength="150"/></div>' +
        '<div class="ch-field"><div class="ch-field-lbl">Topic & Difficulty</div>' +
          '<div style="display:flex;gap:6px">' + _topicSelect('ch-q-topic') +
          '<select class="ch-sel" id="ch-q-diff"><option value="beginner">Beginner</option><option value="intermediate" selected>Intermediate</option><option value="advanced">Advanced</option></select></div>' +
        '</div>' +
        '<div class="ch-field"><div class="ch-field-lbl">Tags</div>' +
          '<div class="ch-tag-inp-row"><input class="ch-inp" id="ch-q-tag-inp" placeholder="Add tag, press Enter" style="flex:1" onkeydown="CommunityHub._addTag(event)"/></div>' +
          '<div class="ch-tags-list" id="ch-tags-list"></div>' +
        '</div>' +
        '<div class="ch-field"><div class="ch-field-lbl">Description</div><textarea class="ch-inp ch-ta" id="ch-q-body" placeholder="Describe your doubt in detail. Code snippets welcome!"></textarea></div>' +
        '<div class="ch-inline-btns"><button class="ch-btn-prim" onclick="CommunityHub._submitDoubt()">Post Doubt</button><button class="ch-btn-sec" onclick="CommunityHub._backDoubts()">Cancel</button></div>' +
      '</div>';
  }

  function _addTag(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var inp = document.getElementById('ch-q-tag-inp');
    var val = (inp ? inp.value : '').trim().toLowerCase();
    if (!val || _doubtTags.includes(val) || _doubtTags.length >= 5) return;
    _doubtTags.push(val);
    if (inp) inp.value = '';
    var list = document.getElementById('ch-tags-list');
    if (list) list.innerHTML = _doubtTags.map(function(t,i){ return '<span class="ch-tag">' + _esc(t) + '<button class="ch-tag-x" onclick="CommunityHub._removeTag(' + i + ')">✕</button></span>'; }).join('');
  }

  function _removeTag(i) {
    _doubtTags.splice(i, 1);
    var list = document.getElementById('ch-tags-list');
    if (list) list.innerHTML = _doubtTags.map(function(t,j){ return '<span class="ch-tag">' + _esc(t) + '<button class="ch-tag-x" onclick="CommunityHub._removeTag(' + j + ')">✕</button></span>'; }).join('');
  }

  function _submitDoubt() {
    if (!_me) { _toast('Sign in required', 'err'); return; }
    var title = (document.getElementById('ch-q-title')||{}).value||'';
    var body  = (document.getElementById('ch-q-body')||{}).value||'';
    var diff  = (document.getElementById('ch-q-diff')||{}).value||'intermediate';
    var topicId = (document.getElementById('ch-q-topic')||{}).value||null;
    if (!title.trim() || !body.trim()) { _toast('Title and description required', 'err'); return; }
    var btn = document.querySelector('.ch-compose .ch-btn-prim');
    if (btn) btn.disabled = true;
    _supabase.from('community_questions').insert({ author_id:_me.id, module:_cfg.module, title:title.trim(), body:body.trim(), difficulty:diff, tags:_doubtTags, topic_id:topicId||null })
      .then(function() { _toast('Doubt posted!', 'ok'); _doubtTags=[]; _backDoubts(); })
      .catch(function(e) { _toast('Error: ' + (e.message||''), 'err'); if(btn) btn.disabled=false; });
  }

  function _backDoubts() {
    _activeQuestion = null;
    var body = document.getElementById('ch-tab-body');
    if (body) _renderDoubts(body);
  }

  /* ══════════════════════════════════════════════════════════════════════
     COMMENTS (shared: discussions + answers)
  ══════════════════════════════════════════════════════════════════════ */
  function _loadComments(parentType, parentId, container) {
    if (!container) return;
    _supabase.from('community_comments')
      .select('id,body,like_count,created_at,author_id')
      .eq('parent_type', parentType).eq('parent_id', parentId)
      .order('created_at', { ascending: true })
      .then(function(r) {
        var comments = r.data || [];
        if (!comments.length) { container.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:var(--text3,#535d7e)">No comments yet</div>'; return; }
        return _fetchProfiles(comments.map(function(c){ return c.author_id; })).then(function(pm) {
          comments.forEach(function(c){ c.community_profiles = pm[c.author_id] || {}; });
          container.innerHTML = '<div style="padding:8px 14px;font-size:11px;font-weight:600;color:var(--text3,#535d7e);text-transform:uppercase;letter-spacing:.06em">' + comments.length + ' Comments</div>' +
            '<div class="ch-comments">' + comments.map(function(c){ return _buildComment(c, parentType, parentId); }).join('') + '</div>';
        });
      }).catch(function() { container.innerHTML = ''; });
  }

  function _buildComment(c, parentType, parentId) {
    var profile = c.community_profiles || {};
    var isMine = _me && c.author_id === _me.id;
    return '<div class="ch-comment" id="cmt-' + _esc(c.id) + '">' +
      _avatar(profile.display_name, profile.avatar_color, 'sm') +
      '<div class="ch-comment-body">' +
        '<div class="ch-comment-header">' +
          '<span class="ch-comment-name">' + _esc(profile.display_name||'Learner') + '</span>' +
          '<span class="ch-comment-time">' + _ago(c.created_at) + '</span>' +
        '</div>' +
        '<div class="ch-comment-text">' + _renderMsgText(c.body) + '</div>' +
        '<div class="ch-comment-actions">' +
          '<button class="ch-comment-act-btn" onclick="CommunityHub._likeTarget(\'comment\',\'' + _esc(c.id) + '\',this)">❤️ ' + (c.like_count||0) + '</button>' +
          '<button class="ch-comment-act-btn" onclick="CommunityHub._showReplyBox(\'' + _esc(c.id) + '\',\'' + _esc(profile.display_name||'') + '\')">Reply</button>' +
          (isMine ? '<button class="ch-comment-act-btn" onclick="CommunityHub._deleteComment(\'' + _esc(c.id) + '\',\'' + _esc(parentType) + '\',\'' + _esc(parentId) + '\')">Delete</button>' : '') +
        '</div>' +
        '<div id="replies-' + _esc(c.id) + '"></div>' +
      '</div>' +
    '</div>';
  }

  function _showReplyBox(commentId, mentionName) {
    var existing = document.getElementById('reply-box-' + commentId);
    if (existing) { existing.remove(); return; }
    var box = document.createElement('div');
    box.id = 'reply-box-' + commentId;
    box.style.cssText = 'display:flex;gap:6px;padding:6px 0;margin-left:38px';
    box.innerHTML = '<input class="ch-inp" style="flex:1;font-size:12px;padding:5px 9px" placeholder="@' + _esc(mentionName) + ' …" value="@' + _esc(mentionName) + ' " id="ri-' + _esc(commentId) + '"/>' +
      '<button class="ch-btn-prim" style="font-size:11px;padding:5px 10px;flex-shrink:0" onclick="CommunityHub._submitReply(\'' + _esc(commentId) + '\')">Reply</button>';
    var cmt = document.getElementById('cmt-' + commentId);
    if (cmt) cmt.appendChild(box);
    var inp = document.getElementById('ri-' + commentId);
    if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
  }

  function _submitReply(commentId) {
    if (!_me) return;
    var inp = document.getElementById('ri-' + commentId);
    var text = (inp ? inp.value : '').trim();
    if (!text) return;
    var mentions = (text.match(/@(\w+)/g)||[]).map(function(m){ return m.slice(1); });
    _supabase.from('community_replies').insert({ comment_id: commentId, author_id: _me.id, body: text, mentions: mentions })
      .then(function() {
        var box = document.getElementById('reply-box-' + commentId);
        if (box) box.remove();
        _loadReplies(commentId, document.getElementById('replies-' + commentId));
        _toast('Reply posted', 'ok');
      }).catch(function(e){ _toast('Error: ' + (e.message||''), 'err'); });
  }

  function _loadReplies(commentId, container) {
    if (!container) return;
    _supabase.from('community_replies')
      .select('id,body,like_count,created_at,author_id')
      .eq('comment_id', commentId)
      .order('created_at', { ascending: true })
      .then(function(r) {
        var replies = r.data || [];
        if (!replies.length) { container.innerHTML = ''; return; }
        return _fetchProfiles(replies.map(function(rep){ return rep.author_id; })).then(function(pm) {
        container.innerHTML = replies.map(function(rep) {
          var rp = pm[rep.author_id] || {};
          var isMine = _me && rep.author_id === _me.id;
          return '<div class="ch-reply" id="rep-' + _esc(rep.id) + '">' +
            _avatar(rp.display_name, rp.avatar_color) +
            '<div class="ch-reply-body">' +
              '<span style="font-size:12px;font-weight:600;color:var(--text,#e2e8f8)">' + _esc(rp.display_name||'Learner') + '</span>' +
              '<span style="font-size:10px;color:var(--text3,#535d7e);margin-left:5px">' + _ago(rep.created_at) + '</span>' +
              '<div style="font-size:12px;color:var(--text2,#8a95b8);margin-top:2px;word-break:break-word">' + _renderMsgText(rep.body) + '</div>' +
              '<div style="display:flex;gap:8px;margin-top:3px">' +
                '<button class="ch-comment-act-btn" onclick="CommunityHub._likeTarget(\'reply\',\'' + _esc(rep.id) + '\',this)">❤️ ' + (rep.like_count||0) + '</button>' +
                (isMine ? '<button class="ch-comment-act-btn" onclick="CommunityHub._deleteReply(\'' + _esc(rep.id) + '\',\'' + _esc(commentId) + '\')">Delete</button>' : '') +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');
        }); // end _fetchProfiles
      });
  }

  function _postComment(parentType, parentId) {
    if (!_me) { _toast('Sign in required', 'err'); return; }
    var inpId = parentType === 'discussion' ? 'ch-disc-comment-inp' : 'ch-q-comment-inp';
    var inp = document.getElementById(inpId);
    var text = (inp ? inp.value : '').trim();
    if (!text) { _toast('Comment cannot be empty', 'err'); return; }
    _supabase.from('community_comments').insert({ parent_type: parentType, parent_id: parentId, author_id: _me.id, body: text })
      .then(function() {
        if (inp) inp.value = '';
        _toast('Comment posted!', 'ok');
        var container = parentType === 'discussion' ? document.getElementById('ch-disc-comments') : document.getElementById('ch-q-comments');
        if (container) _loadComments(parentType, parentId, container);
      }).catch(function(e){ _toast('Error: ' + (e.message||''), 'err'); });
  }

  function _deleteComment(commentId, parentType, parentId) {
    if (!confirm('Delete this comment?')) return;
    _supabase.from('community_comments').delete().eq('id', commentId)
      .then(function() {
        _toast('Deleted', 'ok');
        var container = parentType === 'discussion' ? document.getElementById('ch-disc-comments') : document.getElementById('ch-q-comments');
        if (container) _loadComments(parentType, parentId, container);
      }).catch(function(e){ _toast('Error: ' + (e.message||''), 'err'); });
  }

  function _deleteReply(replyId, commentId) {
    if (!confirm('Delete this reply?')) return;
    _supabase.from('community_replies').delete().eq('id', replyId)
      .then(function() { _loadReplies(commentId, document.getElementById('replies-' + commentId)); })
      .catch(function(e){ _toast('Error: ' + (e.message||''), 'err'); });
  }

  /* ══════════════════════════════════════════════════════════════════════
     VOTES + LIKES
  ══════════════════════════════════════════════════════════════════════ */
  function _voteTarget(targetType, targetId, value) {
    if (!_me) { _toast('Sign in required', 'err'); return; }
    _supabase.rpc('community_cast_vote', { p_target_type: targetType, p_target_id: targetId, p_value: value })
      .then(function() { _toast(value > 0 ? '👍 Upvoted' : '👎 Downvoted', 'ok'); })
      .catch(function(e) { _toast('Error: ' + (e.message||''), 'err'); });
  }

  function _likeTarget(targetType, targetId, btn) {
    if (!_me) { _toast('Sign in required', 'err'); return; }
    _supabase.from('community_likes')
      .select('user_id').eq('user_id', _me.id).eq('target_type', targetType).eq('target_id', targetId)
      .maybeSingle()
      .then(function(r) {
        if (r.data) {
          return _supabase.from('community_likes').delete().eq('user_id', _me.id).eq('target_type', targetType).eq('target_id', targetId)
            .then(function() { if(btn) { btn.classList.remove('liked'); } });
        } else {
          return _supabase.from('community_likes').insert({ user_id: _me.id, target_type: targetType, target_id: targetId })
            .then(function() { if(btn) btn.classList.add('liked'); });
        }
      }).catch(function(){});
  }

  /* ══════════════════════════════════════════════════════════════════════
     NOTIFICATIONS TAB
  ══════════════════════════════════════════════════════════════════════ */
  var NOTIF_ICONS = {
    new_answer: '💬', answer_accepted: '✅', new_reply: '↩️', new_mention: '@',
    new_like: '❤️', new_message: '📨', new_comment: '💬'
  };

  function _renderNotifications(body) {
    body.style.display = ''; body.style.flexDirection = '';
    body.innerHTML = '<div class="ch-spinner"><div class="ch-spin"></div></div>';
    if (typeof _supabase === 'undefined' || !_me) {
      body.innerHTML = '<div class="ch-empty"><div class="ch-empty-icon">🔒</div><div class="ch-empty-title">Sign in required</div></div>';
      return;
    }
    _supabase.from('community_notifications')
      .select('id,type,message,read,created_at,actor_id')
      .eq('user_id', _me.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(function(r) {
        var notifs = r.data || [];
        var unread = notifs.filter(function(n){ return !n.read; }).length;
        var html = '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid var(--border,#1e2436)">' +
          '<span style="font-size:12px;font-weight:600;color:var(--text2,#8a95b8)">' + notifs.length + ' Notifications</span>' +
          (unread > 0 ? '<button class="ch-btn-sec" style="font-size:11px;padding:4px 10px" onclick="CommunityHub._markAllRead()">Mark all read</button>' : '') +
        '</div>';
        if (!notifs.length) {
          html += '<div class="ch-empty"><div class="ch-empty-icon">🔔</div><div class="ch-empty-title">No notifications</div><div class="ch-empty-sub">You\'re all caught up!</div></div>';
        } else {
          html += notifs.map(function(n) {
            var ap = (n.community_profiles) || {};
            var icon = NOTIF_ICONS[n.type] || '🔔';
            return '<div class="ch-notif-item' + (!n.read ? ' unread' : '') + '" onclick="CommunityHub._markRead(\'' + _esc(n.id) + '\',this)">' +
              '<div class="ch-notif-icon">' + icon + '</div>' +
              '<div class="ch-notif-body">' +
                '<div class="ch-notif-text">' + _esc(n.message) + '</div>' +
                '<div class="ch-notif-time">' + _ago(n.created_at) + '</div>' +
              '</div>' +
              (!n.read ? '<div class="ch-unread-dot"></div>' : '') +
            '</div>';
          }).join('');
        }
        body.innerHTML = html;
        // Update badge
        _unread.notifications = unread;
        _updateBadges();
      }).catch(function() { body.innerHTML = '<div class="ch-empty"><div class="ch-empty-sub">Failed to load notifications</div></div>'; });
  }

  function _markRead(id, el) {
    _supabase.from('community_notifications').update({ read: true }).eq('id', id)
      .then(function() { if(el) { el.classList.remove('unread'); var dot = el.querySelector('.ch-unread-dot'); if(dot) dot.remove(); } })
      .catch(function(){});
  }

  function _markAllRead() {
    _supabase.rpc('community_mark_all_read')
      .then(function() { _toast('All marked read', 'ok'); var body = document.getElementById('ch-tab-body'); if (body) _renderNotifications(body); })
      .catch(function(){});
  }

  function _sendNotification(userId, type, targetType, targetId, message) {
    if (!userId || !_me || userId === _me.id) return;
    _supabase.from('community_notifications').insert({ user_id: userId, type: type, actor_id: _me.id, target_type: targetType, target_id: targetId, message: message })
      .then(function(){}).catch(function(){});
  }

  /* ══════════════════════════════════════════════════════════════════════
     LEADERBOARD TAB
  ══════════════════════════════════════════════════════════════════════ */
  function _renderLeaderboard(body) {
    body.style.display = ''; body.style.flexDirection = '';
    body.innerHTML = '<div class="ch-spinner"><div class="ch-spin"></div></div>';
    if (typeof _supabase === 'undefined') {
      body.innerHTML = '<div class="ch-empty"><div class="ch-empty-sub">Supabase not configured</div></div>';
      return;
    }
    _supabase.rpc('community_top_contributors', { p_module: _cfg.module, p_limit: 10 })
      .then(function(r) {
        var rows = r.data || [];
        var html = '<div style="padding:10px 14px;border-bottom:1px solid var(--border,#1e2436)">' +
          '<div style="font-size:12px;font-weight:600;color:var(--text2,#8a95b8)">Top Contributors · ' + _esc(_cfg.moduleName) + '</div>' +
        '</div>';
        if (!rows.length) {
          html += '<div class="ch-empty"><div class="ch-empty-icon">🌱</div><div class="ch-empty-title">No contributors yet</div><div class="ch-empty-sub">Answer doubts to climb the board!</div></div>';
        } else {
          html += rows.map(function(row) {
            var rankN = Number(row.rank);
            var rankCls = rankN===1?' g':rankN===2?' s':rankN===3?' b':'';
            var rankIcon = rankN===1?'🥇':rankN===2?'🥈':rankN===3?'🥉':rankN;
            return '<div class="ch-lb-row">' +
              '<div class="ch-lb-rank' + rankCls + '">' + rankIcon + '</div>' +
              _avatar(row.display_name, row.avatar_color) +
              '<div class="ch-lb-info">' +
                '<div class="ch-lb-name' + (row.is_me?' me':'') + '">' + _esc(row.display_name||'Learner') + (row.is_me?' 👈':'') + '</div>' +
                '<div class="ch-lb-sub">' + (row.answer_count||0) + ' answers · ' + (row.badge_count||0) + ' badges</div>' +
              '</div>' +
              '<div class="ch-lb-rep">' + (row.reputation||0) + ' pts</div>' +
            '</div>';
          }).join('');
        }
        body.innerHTML = html;
      }).catch(function() { body.innerHTML = '<div class="ch-empty"><div class="ch-empty-sub">Failed to load leaderboard</div></div>'; });
  }

  /* ══════════════════════════════════════════════════════════════════════
     UNREAD BADGE + REALTIME NOTIFICATIONS
  ══════════════════════════════════════════════════════════════════════ */
  function _refreshUnread() {
    if (typeof _supabase === 'undefined' || !_me) return;
    _supabase.rpc('community_unread_counts').then(function(r) {
      if (!r.data || !r.data[0]) return;
      _unread.notifications = Number(r.data[0].notifications) || 0;
      _unread.messages = Number(r.data[0].messages) || 0;
      _updateBadges();
    }).catch(function(){});
  }

  function _updateBadges() {
    var total = (_unread.notifications||0) + (_unread.messages||0);
    var badge = document.getElementById('ch-fab-badge');
    if (badge) { badge.textContent = total; badge.style.display = total > 0 ? 'flex' : 'none'; }
    var notifBadge = document.getElementById('ch-notif-badge');
    if (notifBadge) { notifBadge.textContent = _unread.notifications; notifBadge.style.display = _unread.notifications > 0 ? 'inline-block' : 'none'; }
  }

  function _subscribeNotifications() {
    if (typeof _supabase === 'undefined' || !_me) return;
    if (_realtimeChannel) return;
    _realtimeChannel = _supabase.channel('notif:' + _me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_notifications', filter: 'user_id=eq.' + _me.id }, function() {
        _unread.notifications++;
        _updateBadges();
      })
      .subscribe();
  }

  /* ── Chat access check ───────────────────────────────────────────── */
  function _hasChatAccess(profile) {
    if (!profile) return false;
    var mods = profile.study_modules;
    if (mods === null || mods === undefined) return true; // null = all-access (includes admin with null modules)
    return Array.isArray(mods) && mods.indexOf('chat') !== -1;
  }

  /* ══════════════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════════════ */
  function init(config) {
    _cfg = Object.assign({ module: 'general', moduleName: 'Interview Prep' }, config || {});
    _injectStyles();
    _buildWidget();

    // Hide widget immediately; DB calls deferred until access confirmed
    var widget = document.getElementById('ch-widget');
    if (widget) widget.style.display = 'none';

    function _onProfileReady(profile) {
      if (!_hasChatAccess(profile)) return; // no access — widget stays hidden, no DB calls

      // Show widget
      if (widget) widget.style.display = '';

      // Resolve current user (only if chat is accessible)
      _uid().then(function(uid) {
      if (!uid) return;
      var profilePromise = _supabase.from('community_profiles')
        .select('user_id,display_name,avatar_color,reputation')
        .eq('user_id', uid).maybeSingle();
      return profilePromise.then(function(r) {
        var d = r && r.data;
        _me = d
          ? { id: uid, display_name: d.display_name, avatar_color: d.avatar_color, reputation: d.reputation||0 }
          : { id: uid, display_name: 'Learner', avatar_color: '#4f8ef7', reputation: 0 };
        // If no profile row yet, create one (SQL trigger may not have fired)
        if (!d) {
          _supabase.from('community_profiles')
            .upsert({ user_id: uid, display_name: 'Learner', avatar_color: '#4f8ef7' }, { onConflict: 'user_id', ignoreDuplicates: true })
            .then(function(){}).catch(function(){});
        }
        _updateOnlineLabel();
        _refreshUnread();
        _subscribeNotifications();
        return _supabase.from('community_topics').select('id,slug,label,icon,color').order('id');
      }).then(function(r) { if (r && r.data) _topics = r.data; });
    }).catch(function(){});
    } // end _onProfileReady

    // Wire to profile — DB calls only fire when access is confirmed
    if (window._studyProfile) {
      _onProfileReady(window._studyProfile);
    } else {
      document.addEventListener('studyAccessReady', function (e) {
        _onProfileReady(e && e.detail && e.detail.profile);
      }, { once: true });
    }
  }

  /* ── Public API ───────────────────────────────────────────────────── */
  window.CommunityHub = {
    init              : init,
    _switchTab        : _switchTab,
    _togglePanel      : _togglePanel,
    _close            : _close,
    _minimize         : _minimize,
    _resetPosition    : _resetPosition,
    // Chat
    _joinRoom         : _joinRoom,
    _confirmClear     : _confirmClear,
    _executeClear     : _executeClear,
    _sendMessage      : _sendMessage,
    _replyToMsg       : _replyToMsg,
    _clearReply       : _clearReply,
    _reactMsg         : _reactMsg,
    _toggleEmoji      : _toggleEmoji,
    _insertEmoji      : _insertEmoji,
    _scrollToMsg      : _scrollToMsg,
    _chatKeydown      : _chatKeydown,
    _chatInput        : _chatInput,
    // Discussions
    _openDiscussion   : _openDiscussion,
    _backDiscussions  : _backDiscussions,
    _showNewDiscussion: _showNewDiscussion,
    _submitDiscussion : _submitDiscussion,
    // Doubts
    _openQuestion     : _openQuestion,
    _backDoubts       : _backDoubts,
    _showAskDoubt     : _showAskDoubt,
    _addTag           : _addTag,
    _removeTag        : _removeTag,
    _submitDoubt      : _submitDoubt,
    _postAnswer       : _postAnswer,
    _acceptAnswer     : _acceptAnswer,
    // Comments & Replies
    _postComment      : _postComment,
    _deleteComment    : _deleteComment,
    _showReplyBox     : _showReplyBox,
    _submitReply      : _submitReply,
    _deleteReply      : _deleteReply,
    // Votes
    _voteTarget       : _voteTarget,
    _likeTarget       : _likeTarget,
    // Notifications
    _markRead         : _markRead,
    _markAllRead      : _markAllRead,
  };

}());
