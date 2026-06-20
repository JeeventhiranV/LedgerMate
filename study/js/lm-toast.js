/* lm-toast.js — lightweight toast utility for study module
   Exposes: window.LMToast = { show(msg, type?, ms?), ok(msg), err(msg) }
   Load before StudySync.js so sync errors can call it immediately.
*/
(function () {
  'use strict';

  var _wrap = null;

  function _css() {
    if (document.getElementById('lmt-style')) return;
    var s = document.createElement('style');
    s.id = 'lmt-style';
    s.textContent =
      '#lmt-wrap{position:fixed;top:14px;right:14px;z-index:9998;display:flex;flex-direction:column;gap:6px;pointer-events:none}' +
      '#lmt-wrap .lmt{background:var(--bg3,#141820);border:1px solid var(--border2,#2a3148);border-radius:10px;padding:9px 15px;font-size:12px;color:var(--text,#e2e8f8);max-width:300px;pointer-events:auto;display:flex;align-items:center;gap:8px;font-family:Inter,sans-serif;line-height:1.4;animation:lmtIn .18s both}' +
      '#lmt-wrap .lmt.ok{border-color:rgba(6,214,160,.4)}' +
      '#lmt-wrap .lmt.err{border-color:rgba(244,63,94,.4)}' +
      '@keyframes lmtIn{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}';
    document.head.appendChild(s);
  }

  function _wrap_el() {
    if (_wrap && document.body.contains(_wrap)) return _wrap;
    _css();
    _wrap = document.createElement('div');
    _wrap.id = 'lmt-wrap';
    document.body.appendChild(_wrap);
    return _wrap;
  }

  function show(msg, type, ms) {
    var w = _wrap_el();
    var el = document.createElement('div');
    el.className = 'lmt' + (type === 'ok' ? ' ok' : type === 'err' ? ' err' : '');
    el.textContent = msg;
    w.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .25s';
      el.style.opacity = '0';
      setTimeout(function () { el.remove(); }, 300);
    }, ms || 3500);
  }

  window.LMToast = {
    show: show,
    ok:  function (m) { show(m, 'ok'); },
    err: function (m) { show(m, 'err'); }
  };
}());
