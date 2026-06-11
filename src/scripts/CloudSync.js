/**
 * LedgerMate – CloudSync.js
 * ─────────────────────────────────────────────────────────────
 * Supabase cloud backup + restore.
 * Depends on: _supabase (auth/supabase-config.js, loaded first)
 * Requires:   window.FinalJson, window.fullImportJSONText (Common.js)
 * Exposes:    window.LM_CloudSync
 * ─────────────────────────────────────────────────────────────
 * Save strategy:
 *   • lm:data:changed AppBus event → debounced 4 s save
 *   • Periodic fallback every 60 s while app running
 *   • saveOnLogout() called before state is wiped
 *   • beforeunload → best-effort fire-and-forget
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var TABLE = 'ledger_data';
  var _saveTimer = null;
  var _saving    = false;
  var _dirty     = false;

  // ── Supabase user ID ────────────────────────────────────────
  function _uid() {
    return _supabase.auth.getSession().then(function (r) {
      return (r.data && r.data.session && r.data.session.user)
        ? r.data.session.user.id : null;
    }).catch(function () { return null; });
  }

  // ── Capture state snapshot (sync-safe async) ────────────────
  function _snapshot() {
    if (!window.FinalJson) return Promise.resolve(null);
    return Promise.resolve().then(function () {
      // FinalJson reads window.state synchronously before any await
      return window.FinalJson();
    });
  }

  // ── Push a JSON string to Supabase ──────────────────────────
  function _push(jsonStr) {
    var data;
    try { data = JSON.parse(jsonStr); } catch { return Promise.resolve(); }
    return _uid().then(function (uid) {
      if (!uid) return;
      return _supabase
        .from(TABLE)
        .upsert(
          { user_id: uid, data: data, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        )
        .then(function (r) {
          if (r.error) {
            console.warn('[CloudSync] save error:', r.error.message);
          } else {
            console.log('[CloudSync] ✅ saved to cloud');
            if (window.LM_Bus) LM_Bus.emit('lm:cloud:saved', {});
          }
        });
    });
  }

  // ── Public: save current state now ──────────────────────────
  function save() {
    if (_saving) { _dirty = true; return Promise.resolve(); }
    if (!window.LM_DB_READY) return Promise.resolve();

    _saving = true;
    _dirty  = false;

    return _snapshot()
      .then(function (jsonStr) {
        if (!jsonStr) return;
        return _push(jsonStr);
      })
      .catch(function (e) {
        console.warn('[CloudSync] save exception:', e && e.message || e);
        _dirty = true;
      })
      .then(function () {
        _saving = false;
        if (_dirty) queueSave(5000);
      });
  }

  // ── Public: debounced save (call after any mutation) ────────
  function queueSave(ms) {
    _dirty = true;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(save, ms != null ? ms : 4000);
  }

  // ── Public: save immediately (used on logout, before wipe) ──
  // Returns a Promise so callers can await it.
  function saveOnLogout() {
    clearTimeout(_saveTimer);
    return save();
  }

  // ── Data stores to wipe before a fresh cloud load ───────────
  var DATA_STORES = [
    'transactions','budgets','loans','reminders','investments','savings',
    'trips','trip_routes','credentials','notes','note_folders',
    'note_attachments','note_versions','audit_logs','emi_loans',
    'net_worth_snapshots','allocation_targets','sip_plan',
    'essentials_settings','savings_goals','subscriptions',
    'fd_rd','tx_templates','users','dropdowns'
  ];

  // Clear all user-data stores so cloud import is always a full replace
  function _clearDataStores() {
    return new Promise(function (resolve) {
      if (!window.db) { resolve(); return; }
      var present = DATA_STORES.filter(function (s) {
        return window.db.objectStoreNames.contains(s);
      });
      if (!present.length) { resolve(); return; }
      try {
        var tx = window.db.transaction(present, 'readwrite');
        present.forEach(function (s) { tx.objectStore(s).clear(); });
        tx.oncomplete = function () { resolve(); };
        tx.onerror    = function () { resolve(); };
      } catch (e) {
        console.warn('[CloudSync] clearDataStores failed:', e && e.message || e);
        resolve();
      }
    });
  }

  // ── Public: fetch cloud data and import into IndexedDB ──────
  // Clears stale local data FIRST so cloud is always the source of truth.
  function load() {
    return _uid().then(function (uid) {
      if (!uid) return false;
      return _supabase
        .from(TABLE)
        .select('data, updated_at')
        .eq('user_id', uid)
        .single()
        .then(function (r) {
          if (r.error || !r.data || !r.data.data) {
            console.log('[CloudSync] No cloud data — starting fresh');
            return false;
          }
          var ts = r.data.updated_at
            ? new Date(r.data.updated_at).toLocaleString()
            : 'unknown time';
          console.log('[CloudSync] 📥 loading from cloud (saved ' + ts + ')');

          var payload = r.data.data;
          var jsonStr = JSON.stringify(payload);

          // Wipe IndexedDB first — guarantees no stale local rows survive
          return _clearDataStores().then(function () {
            if (typeof window.fullImportJSONText === 'function') {
              return window.fullImportJSONText(jsonStr, 'CloudSync')
                .then(function () { return true; });
            }
            if (typeof window.mergeRestore === 'function') {
              return window.mergeRestore(payload).then(function () { return true; });
            }
            return false;
          });
        });
    }).catch(function (e) {
      console.warn('[CloudSync] load exception:', e && e.message || e);
      return false;
    });
  }

  // ── Public: start AppBus hook + periodic + beforeunload ─────
  function startAutoSave(intervalMs) {
    // React to every data-changed event
    if (window.LM_Bus) {
      LM_Bus.on('lm:data:changed', function () { queueSave(3000); });
    }

    // Periodic fallback (catches mutations that don't emit the event)
    setInterval(function () {
      if (window.LM_DB_READY && _dirty) save();
    }, intervalMs || 60000);

    // Best-effort save on tab close / navigation away
    window.addEventListener('beforeunload', function () {
      if (window.LM_DB_READY && _dirty) save();
    });

    // Save when tab becomes hidden (e.g. user switches tabs)
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && window.LM_DB_READY && _dirty) {
        save();
      }
    });

    console.log('[CloudSync] 🔄 auto-save active');
  }

  // ── Expose ───────────────────────────────────────────────────
  window.LM_CloudSync = {
    save        : save,
    load        : load,
    queueSave   : queueSave,
    saveOnLogout: saveOnLogout,
    startAutoSave: startAutoSave
  };

}());
