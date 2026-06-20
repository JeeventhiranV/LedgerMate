// StudySync.js — Supabase ↔ localStorage sync for study progress
// Load order: supabase CDN → supabase-config.js → auth-guard.js → THIS FILE
// Exposes: window.StudySync

var StudySync = (function () {
  var _cachedUid = null;

  function _uid() {
    if (_cachedUid) return Promise.resolve(_cachedUid);
    return _supabase.auth.getSession().then(function (r) {
      _cachedUid = r.data && r.data.session ? r.data.session.user.id : null;
      return _cachedUid;
    }).catch(function () { return null; });
  }

  // ── Relative time helper ───────────────────────────────────────────────
  function ago(ts) {
    if (!ts) return '';
    var diff = Date.now() - new Date(ts).getTime();
    var m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    var d = Math.floor(h / 24);
    if (d === 1) return 'yesterday';
    if (d < 7)  return d + 'd ago';
    if (d < 30) return Math.floor(d / 7) + 'w ago';
    return Math.floor(d / 30) + 'mo ago';
  }

  // ── Load all items for a module from Supabase ──────────────────────────
  // Returns { status, favs, notes, timestamps } or null on error.
  function load(module) {
    return _uid().then(function (uid) {
      if (!uid) return null;
      return _supabase
        .from('study_progress')
        .select('item_id, status, is_fav, note, status_changed_at')
        .eq('user_id', uid)
        .eq('module', module)
        .then(function (res) {
          if (res.error) return null;
          var status = {}, favs = new Set(), notes = {}, timestamps = {};
          (res.data || []).forEach(function (row) {
            if (row.status)            status[row.item_id]     = row.status;
            if (row.is_fav)            favs.add(row.item_id);
            if (row.note)              notes[row.item_id]      = row.note;
            if (row.status_changed_at) timestamps[row.item_id] = row.status_changed_at;
          });
          return { status: status, favs: favs, notes: notes, timestamps: timestamps };
        });
    }).catch(function () { return null; });
  }

  // ── Load all modules at once (for dashboard) ───────────────────────────
  // Returns { byModule:{module:{done,inprog,last}}, streak, recent, rawProgress } or null.
  function loadAll() {
    return _uid().then(function (uid) {
      if (!uid) return null;
      return Promise.all([
        _supabase.from('study_progress')
          .select('module, item_id, status, is_fav, status_changed_at')
          .eq('user_id', uid)
          .order('status_changed_at', { ascending: false }),
        _supabase.from('study_streak')
          .select('last_date, streak, longest')
          .eq('user_id', uid)
          .single()
      ]).then(function (results) {
        var prog = results[0], st = results[1];
        if (prog.error) return null;

        var byModule = {};
        (prog.data || []).forEach(function (row) {
          var m = byModule[row.module] || (byModule[row.module] = { done: 0, inprog: 0, last: null });
          if (row.status === 'done')       m.done++;
          if (row.status === 'inprogress') m.inprog++;
          if (row.status_changed_at && (!m.last || row.status_changed_at > m.last))
            m.last = row.status_changed_at;
        });

        var streakData = (!st.error && st.data) ? st.data : null;
        var recent = (prog.data || []).filter(function (r) { return !!r.status; }).slice(0, 12);

        return { byModule: byModule, streak: streakData, recent: recent, rawProgress: prog.data || [] };
      });
    }).catch(function () { return null; });
  }

  // ── Fire-and-forget upsert ─────────────────────────────────────────────
  // NOTE: Supabase postgrest-js uses a lazy promise — the HTTP request is only
  // sent when .then() is called. Without it the upsert is silently discarded.
  function _upsert(module, itemId, patch) {
    _uid().then(function (uid) {
      if (!uid) return;
      _supabase.from('study_progress').upsert(
        Object.assign(
          { user_id: uid, module: module, item_id: String(itemId), updated_at: new Date().toISOString() },
          patch
        ),
        { onConflict: 'user_id,module,item_id' }
      ).then(function (res) {
        if (res.error) {
          console.warn('[StudySync] upsert error:', res.error.message, res.error);
          if (window.LMToast) LMToast.err('Sync failed — check connection');
        }
      });
    }).catch(function () {});
  }

  // ── Public write API ───────────────────────────────────────────────────

  function saveStatus(module, itemId, val) {
    _upsert(module, itemId, {
      status: val || null,
      status_changed_at: val ? new Date().toISOString() : null
    });
  }

  function saveFav(module, itemId, isFav) {
    _upsert(module, itemId, { is_fav: !!isFav });
  }

  var _noteTimers = {};
  function saveNote(module, itemId, text) {
    var k = module + ':' + itemId;
    clearTimeout(_noteTimers[k]);
    _noteTimers[k] = setTimeout(function () {
      _upsert(module, itemId, { note: text || null });
    }, 600);
  }

  // ── Streak ─────────────────────────────────────────────────────────────

  function loadStreak() {
    return _uid().then(function (uid) {
      if (!uid) return null;
      return _supabase
        .from('study_streak')
        .select('last_date, streak, longest')
        .eq('user_id', uid)
        .single()
        .then(function (res) {
          if (res.error || !res.data) return null;
          return { date: res.data.last_date, streak: res.data.streak, longest: res.data.longest };
        });
    }).catch(function () { return null; });
  }

  function saveStreak(date, streak, longest) {
    _uid().then(function (uid) {
      if (!uid) return;
      _supabase.from('study_streak').upsert(
        { user_id: uid, last_date: date, streak: streak, longest: longest, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      ).then(function (res) {
        if (res.error) {
          console.warn('[StudySync] streak upsert error:', res.error.message, res.error);
          if (window.LMToast) LMToast.err('Sync failed — check connection');
        }
      });
    }).catch(function () {});
  }

  // ── TAT label injection ────────────────────────────────────────────────
  // Call after DB sync + DOM restore to stamp relative timestamps on status buttons.
  // selector: CSS selector for each question's action container element
  // getTs: fn(el) → ISO timestamp string or undefined
  (function _injectTatStyles() {
    var s = document.createElement('style');
    s.textContent = '.tat-lbl{display:inline-block;font-size:10px;font-family:"JetBrains Mono",monospace;color:var(--text3,#8891b8);background:rgba(100,116,139,.1);border-radius:4px;padding:1px 6px;white-space:nowrap;margin-left:6px;vertical-align:middle;letter-spacing:.02em}';
    document.head.appendChild(s);
  })();

  return {
    load: load,
    loadAll: loadAll,
    saveStatus: saveStatus,
    saveFav: saveFav,
    saveNote: saveNote,
    loadStreak: loadStreak,
    saveStreak: saveStreak,
    ago: ago
  };
}());
