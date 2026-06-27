/**
 * Progress + bookmark + note indicator for the static DSA_Navigator.html home page.
 * Shares localStorage + API keys with the React app (dsa_anon_progress_v1, dsa_note_v1::, dsa_progress_snapshot_v1).
 * Depends on globals from the inline script: getToken, apiUrl, getVizPathForProblemCard.
 */
(function () {
  'use strict';

  const ANON_KEY   = 'dsa_anon_progress_v1';
  const CACHE_KEY  = 'dsa_progress_snapshot_v1';
  const NOTE_PREFIX = 'dsa_note_v1::';
  const ANON_LIMIT = 30;

  const STATUS_CYCLE = {
    '': 'IN_PROGRESS',
    IN_PROGRESS: 'PRACTICE_PENDING',
    PRACTICE_PENDING: 'SOLVED',
    SOLVED: 'NEEDS_REVISION',
    NEEDS_REVISION: '',
  };

  /* Card border is the only visual for status; button is an invisible hit target. */
  const STATUS_A11Y = {
    IN_PROGRESS: { title: 'In progress' },
    PRACTICE_PENDING: { title: 'Practice pending' },
    SOLVED: { title: 'Solved' },
    NEEDS_REVISION: { title: 'Needs revision' },
  };

  var _map = Object.create(null);
  var _migrating = false;

  function itemsToMap(items) {
    var m = Object.create(null);
    (items || []).forEach(function (it) {
      if (!it || !it.problemKey) return;
      m[it.problemKey] = {
        status: it.status || null,
        bookmarked: !!it.bookmarked,
        hasNote: !!it.hasNote,
      };
    });
    return m;
  }

  function hasGlobal(fn) {
    return typeof window[fn] === 'function';
  }

  /** Re-run DSA_Navigator.html visibility filters after status/data-dsa-status changes. */
  function navRefilter() {
    if (typeof window.applyNavFilters === 'function') {
      try { window.applyNavFilters(); } catch (e) { /* ignore */ }
    }
  }

  function getAnonNoteKeys() {
    var out = new Set();
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(NOTE_PREFIX) !== 0) continue;
        var raw = localStorage.getItem(k);
        try {
          var o = raw ? JSON.parse(raw) : null;
          if (o && o.content && String(o.content).trim().length) {
            out.add(k.slice(NOTE_PREFIX.length));
          }
        } catch (e) { /* ignore */ }
      }
    } catch (e) { /* ignore */ }
    return out;
  }

  function buildAnonMap() {
    var m = Object.create(null);
    try {
      var raw = localStorage.getItem(ANON_KEY);
      var j = raw ? JSON.parse(raw) : null;
      var items = (j && j.items) || {};
      Object.keys(items).forEach(function (k) {
        m[k] = {
          status: items[k].status || null,
          bookmarked: !!items[k].bookmarked,
          hasNote: false,
        };
      });
    } catch (e) { /* ignore */ }
    getAnonNoteKeys().forEach(function (pk) {
      if (!m[pk]) m[pk] = { status: null, bookmarked: false, hasNote: true };
      else m[pk].hasNote = true;
    });
    return m;
  }

  function writeAnonFromMap() {
    var out = Object.create(null);
    Object.keys(_map).forEach(function (k) {
      var v = _map[k];
      if (v && (v.status || v.bookmarked)) {
        out[k] = { status: v.status || null, bookmarked: !!v.bookmarked };
      }
    });
    try {
      localStorage.setItem(ANON_KEY, JSON.stringify({ items: out }));
    } catch (e) { /* ignore */ }
  }

  function countAnonTracked() {
    var n = 0;
    Object.keys(_map).forEach(function (k) {
      var v = _map[k];
      if (v && (v.status || v.bookmarked)) n++;
    });
    return n;
  }

  function fetchNavProgress() {
    if (!hasGlobal('getToken') || !hasGlobal('apiUrl')) return Promise.resolve(null);
    var t = getToken();
    if (!t) return Promise.resolve(null);
    return fetch(apiUrl('/me/progress'), { headers: { 'Authorization': 'Bearer ' + t } })
      .then(function (r) {
        if (r.status === 401) return null;
        if (!r.ok) return null;
        return r.json();
      })
      .catch(function () { return null; });
  }

  function migrateIfNeeded() {
    if (!hasGlobal('getToken') || !hasGlobal('apiUrl') || _migrating) return Promise.resolve();
    var t = getToken();
    if (!t) return Promise.resolve();

    var anon = {};
    try {
      var raw = localStorage.getItem(ANON_KEY);
      var j = raw ? JSON.parse(raw) : null;
      anon = (j && j.items) || {};
    } catch (e) { /* ignore */ }

    var notes = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf(NOTE_PREFIX) !== 0) continue;
        var o = JSON.parse(localStorage.getItem(k) || 'null');
        if (o && o.content && String(o.content).trim()) {
          notes.push({ problemKey: k.slice(NOTE_PREFIX.length), content: o.content });
        }
      }
    } catch (e) { /* ignore */ }

    if (Object.keys(anon).length === 0 && notes.length === 0) return Promise.resolve();

    _migrating = true;
    var progress = Object.keys(anon).map(function (key) {
      return { problemKey: key, status: anon[key] && anon[key].status, bookmarked: !!(anon[key] && anon[key].bookmarked) };
    });

    return fetch(apiUrl('/me/migrate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
      body: JSON.stringify({ progress: progress, notes: notes }),
    })
      .then(function (r) {
        if (!r.ok) return;
        try { localStorage.removeItem(ANON_KEY); } catch (e) { /* ignore */ }
        notes.forEach(function (n) {
          try { localStorage.removeItem(NOTE_PREFIX + n.problemKey); } catch (e) { /* ignore */ }
        });
      })
      .catch(function () { /* keep anon data for retry */ })
      .then(function () { _migrating = false; });
  }

  function loadProgressMap() {
    if (hasGlobal('getToken') && getToken()) {
      return migrateIfNeeded()
        .then(function () { return fetchNavProgress(); })
        .then(function (data) {
          if (data && data.items) {
            _map = itemsToMap(data.items);
            try {
              var v = data.version != null ? data.version : Date.now();
              localStorage.setItem(CACHE_KEY, JSON.stringify({ version: v, items: _map, cachedAt: Date.now() }));
            } catch (e) { /* ignore */ }
          } else {
            try {
              var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
              if (cached && cached.items) _map = cached.items;
              else _map = Object.create(null);
            } catch (e2) {
              _map = Object.create(null);
            }
          }
        });
    }
    _map = buildAnonMap();
    return Promise.resolve();
  }

  function persistCloudCache() {
    if (!hasGlobal('getToken') || !getToken()) return;
    try {
      var v = Date.now();
      var cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.version) v = cached.version;
      localStorage.setItem(CACHE_KEY, JSON.stringify({ version: v, items: _map, cachedAt: Date.now() }));
    } catch (e) { /* ignore */ }
  }

  function putProgressApi(key, body) {
    return fetch(apiUrl('/me/progress?key=' + encodeURIComponent(key)), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (getToken() || '') },
      body: JSON.stringify(body || {}),
    });
  }

  function cardByKey(key) {
    return document.querySelector('.problem-card[data-problem-key="' + String(key).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]');
  }

  function applyEntryToMap(key, entry) {
    if (!entry) return;
    var st = entry.status || null;
    var bm = !!entry.bookmarked;
    var hn = !!entry.hasNote;
    if (!st && !bm && !hn) {
      delete _map[key];
    } else {
      _map[key] = { status: st, bookmarked: bm, hasNote: hn };
    }
  }

  function updateCardStatusBorder(card, status) {
    if (!card) return;
    var s = status || '';
    if (s === 'IN_PROGRESS' || s === 'PRACTICE_PENDING' || s === 'SOLVED' || s === 'NEEDS_REVISION') {
      card.setAttribute('data-dsa-status', s);
    } else {
      card.removeAttribute('data-dsa-status');
    }
  }

  function refreshCard(card) {
    var key = card.dataset.problemKey;
    if (!key) return;
    var entry = _map[key] || { status: null, bookmarked: false, hasNote: false };

    updateCardStatusBorder(card, entry.status);

    var bm = card.querySelector('.dsa-nav-bookmark');
    if (bm) {
      bm.classList.toggle('on', !!entry.bookmarked);
      bm.textContent = entry.bookmarked ? '★' : '☆';
    }
    var pill = card.querySelector('.dsa-nav-status-pill');
    if (pill) {
      pill.className = 'dsa-nav-status-pill';
      pill.textContent = '';
      var st = entry.status;
      if (st && STATUS_A11Y[st]) {
        var meta = STATUS_A11Y[st];
        pill.setAttribute('title', meta.title + ' — click to change');
        pill.setAttribute('aria-label', meta.title + ', change status');
      } else {
        pill.setAttribute('title', 'Set progress');
        pill.setAttribute('aria-label', 'Set progress');
      }
    }
    var nind = card.querySelector('.dsa-nav-note-ind');
    if (nind) nind.classList.toggle('dsa-shown', !!entry.hasNote);
  }

  function mountCard(card) {
    if (card.dataset.dsaProgressMounted) return;
    if (!hasGlobal('getVizPathForProblemCard')) return;
    var key = getVizPathForProblemCard(card);
    if (!key) return;
    card.dataset.dsaProgressMounted = '1';
    card.dataset.problemKey = key;

    var bm = document.createElement('button');
    bm.type = 'button';
    bm.className = 'dsa-nav-bookmark';
    bm.setAttribute('aria-label', 'Bookmark');
    card.insertBefore(bm, card.firstChild);

    var diff = card.querySelector('.diff-badge');
    var pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'dsa-nav-status-pill';
    pill.textContent = '';
    if (diff) card.insertBefore(pill, diff);
    else card.appendChild(pill);

    var links = card.querySelector('.problem-links');
    if (links) {
      var noteInd = document.createElement('span');
      noteInd.className = 'dsa-nav-note-ind';
      noteInd.setAttribute('title', 'You have a note (open viz page)');
      noteInd.setAttribute('aria-hidden', 'true');
      noteInd.textContent = '📝';
      links.insertBefore(noteInd, links.firstChild);
    }

    refreshCard(card);

    bm.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      onBookmark(key);
    });
    pill.addEventListener('click', function (e) {
      e.stopPropagation();
      e.preventDefault();
      onStatusCycle(key);
    });
  }

  function mountAllCards() {
    document.querySelectorAll('.problem-card').forEach(mountCard);
  }

  function onBookmark(key) {
    var ent = _map[key] || { status: null, bookmarked: false, hasNote: false };
    var next = !ent.bookmarked;
    var wasTracked = !!(ent.status || ent.bookmarked);
    if (!hasGlobal('getToken') || !getToken()) {
      if (next && !wasTracked && countAnonTracked() >= ANON_LIMIT) {
        alert('You\'ve reached the limit of ' + ANON_LIMIT + ' tracked problems. Sign in to keep going.');
        if (hasGlobal('openAuthModal')) openAuthModal();
        return;
      }
    }

    if (hasGlobal('getToken') && getToken()) {
      putProgressApi(key, { bookmarked: next })
        .then(function (r) {
          if (!r.ok) throw new Error('update failed');
          return r.json();
        })
        .then(function (item) {
          applyEntryToMap(key, item);
          persistCloudCache();
          var card = cardByKey(key);
          if (card) refreshCard(card);
          navRefilter();
        })
        .catch(function () {
          return loadProgressMap().then(function () {
            document.querySelectorAll('.problem-card[data-dsa-progress-mounted="1"]').forEach(refreshCard);
            navRefilter();
          });
        });
    } else {
      if (!next && !ent.status) {
        if (!ent.hasNote) delete _map[key];
        else _map[key] = { status: null, bookmarked: false, hasNote: true };
      } else {
        _map[key] = { status: ent.status, bookmarked: next, hasNote: !!ent.hasNote };
      }
      writeAnonFromMap();
      var c = cardByKey(key);
      if (c) refreshCard(c);
      navRefilter();
    }
  }

  function onStatusCycle(key) {
    var ent = _map[key] || { status: null, bookmarked: false, hasNote: false };
    var cur = ent.status == null ? '' : ent.status;
    var next = Object.prototype.hasOwnProperty.call(STATUS_CYCLE, cur) ? STATUS_CYCLE[cur] : 'IN_PROGRESS';
    if (!hasGlobal('getToken') || !getToken()) {
      if (next && next.length && !ent.status && !ent.bookmarked && countAnonTracked() >= ANON_LIMIT) {
        alert('You\'ve reached the limit of ' + ANON_LIMIT + ' tracked problems. Sign in to keep going.');
        if (hasGlobal('openAuthModal')) openAuthModal();
        return;
      }
    }

    var statusToSend = next === '' ? 'NOT_STARTED' : next;
    if (hasGlobal('getToken') && getToken()) {
      putProgressApi(key, { status: statusToSend })
        .then(function (r) {
          if (!r.ok) throw new Error('update failed');
          return r.json();
        })
        .then(function (item) {
          applyEntryToMap(key, item);
          persistCloudCache();
          var card = cardByKey(key);
          if (card) refreshCard(card);
          navRefilter();
        })
        .catch(function () { /* ignore */ });
    } else {
      if (next === '' || next == null) {
        if (ent.bookmarked) {
          _map[key] = { status: null, bookmarked: true, hasNote: !!ent.hasNote };
        } else if (ent.hasNote) {
          _map[key] = { status: null, bookmarked: false, hasNote: true };
        } else {
          delete _map[key];
        }
      } else {
        _map[key] = { status: next, bookmarked: !!ent.bookmarked, hasNote: !!ent.hasNote };
      }
      writeAnonFromMap();
      var c2 = cardByKey(key);
      if (c2) refreshCard(c2);
      navRefilter();
    }
  }

  window.dsaNavOnAuthChange = function () {
    return loadProgressMap()
      .then(function () {
        document.querySelectorAll('.problem-card[data-dsa-progress-mounted="1"]').forEach(refreshCard);
        navRefilter();
      });
  };

  function onStorage(e) {
    if (!e.key) return;
    if (e.key.indexOf(NOTE_PREFIX) === 0) {
      var pk = e.key.slice(NOTE_PREFIX.length);
      if (hasGlobal('getToken') && getToken()) {
        loadProgressMap().then(function () {
          var card = cardByKey(pk);
          if (card) refreshCard(card);
          navRefilter();
        });
        return;
      }
      _map = buildAnonMap();
      var card2 = cardByKey(pk);
      if (card2) refreshCard(card2);
      navRefilter();
    } else if (e.key === ANON_KEY) {
      _map = buildAnonMap();
      document.querySelectorAll('.problem-card[data-dsa-progress-mounted="1"]').forEach(refreshCard);
      navRefilter();
    } else if (e.key === CACHE_KEY) {
      try {
        var c = e.newValue ? JSON.parse(e.newValue) : null;
        if (c && c.items) _map = c.items;
        document.querySelectorAll('.problem-card[data-dsa-progress-mounted="1"]').forEach(refreshCard);
        navRefilter();
      } catch (err) { /* ignore */ }
    }
  }
  window.addEventListener('storage', onStorage);

  function boot() {
    loadProgressMap()
      .then(function () {
        mountAllCards();
      })
      .then(function () {
        navRefilter();
      });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
