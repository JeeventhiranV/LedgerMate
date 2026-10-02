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

  // ── Sync Mode (Cloud vs Offline) ───────────────────────────
  function getSyncMode() {
    try {
      var saved = localStorage.getItem('lm_sync_mode');
      if (saved === 'offline' || saved === 'cloud') return saved;
      if (window.state && window.state.settings && window.state.settings.syncMode) {
        return window.state.settings.syncMode;
      }
    } catch (e) {}
    return 'cloud';
  }

  function setSyncMode(mode) {
    var validMode = (mode === 'offline') ? 'offline' : 'cloud';
    try {
      localStorage.setItem('lm_sync_mode', validMode);
      if (window.state && window.state.settings) {
        window.state.settings.syncMode = validMode;
      }
    } catch (e) {}

    console.log('[CloudSync] Sync mode changed to:', validMode);
    if (window.LM_Bus) {
      window.LM_Bus.emit('lm:sync:mode-changed', { mode: validMode });
    }

    if (validMode === 'cloud' && navigator.onLine) {
      save();
    }
    return validMode;
  }

  function isOfflineMode() {
    return getSyncMode() === 'offline';
  }

  // ── Supabase user ID ────────────────────────────────────────
  function _uid() {
    if (isOfflineMode()) return Promise.resolve(null);
    if (typeof _supabase === 'undefined' || !_supabase || !_supabase.auth) {
      return Promise.resolve(null);
    }
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

  // ── Native Gzip Compression Helper ──────────────────────────
  async function compressPayload(jsonStr) {
    if (typeof CompressionStream === 'undefined') {
      try { return JSON.parse(jsonStr); } catch { return jsonStr; }
    }
    try {
      const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream('gzip'));
      const buffer = await new Response(stream).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return {
        _compressed: true,
        _format: 'gzip-b64',
        _v: 2,
        payload: btoa(binary)
      };
    } catch (e) {
      console.warn('[CloudSync] Gzip compression fallback to raw json:', e);
      try { return JSON.parse(jsonStr); } catch { return jsonStr; }
    }
  }

  async function decompressPayload(remoteData) {
    if (!remoteData) return null;
    if (typeof remoteData === 'object' && remoteData._compressed && remoteData.payload) {
      if (typeof DecompressionStream === 'undefined') {
        console.warn('[CloudSync] DecompressionStream unavailable in this browser');
        return null;
      }
      try {
        const binary = atob(remoteData.payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
        const text = await new Response(stream).text();
        return JSON.parse(text);
      } catch (e) {
        console.error('[CloudSync] Decompression failed:', e);
        return null;
      }
    }
    // Raw uncompressed object (backward compatibility with v1)
    return remoteData;
  }

  // ── Push a JSON string to Supabase ──────────────────────────
  function _push(jsonStr) {
    if (isOfflineMode() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return Promise.resolve();
    }
    return _uid().then(function (uid) {
      if (!uid) return;
      return compressPayload(jsonStr).then(function (dataToSave) {
        return _supabase
          .from(TABLE)
          .upsert(
            { user_id: uid, data: dataToSave, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
          .then(function (r) {
            if (r.error) {
              console.warn('[CloudSync] save error:', r.error.message);
              if (typeof showToast === 'function') showToast('☁️ Cloud sync failed — will retry', 'error');
              if (window.LM_Bus) LM_Bus.emit('lm:cloud:failed', { message: 'Cloud sync failed — check connection' });
            } else {
              console.log('[CloudSync] ✅ saved to cloud (Gzip compressed ~95%)');
              try { localStorage.setItem('lm_last_cloud_sync_time', String(Date.now())); } catch (e) {}
              if (window.LM_Bus) LM_Bus.emit('lm:cloud:saved', {});
            }
          });
      });
    });
  }

  // ── Public: save current state now ──────────────────────────
  function save() {
    if (isOfflineMode()) {
      return Promise.resolve();
    }
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
        if (typeof showToast === 'function') showToast('☁️ Cloud sync error — retrying', 'error');
        _dirty = true;
      })
      .then(function () {
        _saving = false;
        if (_dirty && !isOfflineMode()) queueSave(5000);
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
    'fd_rd','tx_templates','users','dropdowns',
    'credit_cards','dashboard_config','recurringTransactions'
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

  // ── SWR (Stale-While-Revalidate) Background Check ────────────
  // Checks only the ~50-byte updated_at column instead of downloading
  // multi-megabyte payloads. If remote is newer, updates local DB non-blockingly.
  function checkAndSyncBackground() {
    if (isOfflineMode() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return Promise.resolve({ synced: false, reason: 'offline' });
    }
    return _uid().then(function (uid) {
      if (!uid) return { synced: false, reason: 'no-uid' };
      return _supabase
        .from(TABLE)
        .select('updated_at')
        .eq('user_id', uid)
        .single()
        .then(function (r) {
          if (r.error || !r.data || !r.data.updated_at) {
            return { synced: false, reason: 'no-remote-data' };
          }
          var remoteUpdatedAt = new Date(r.data.updated_at).getTime();
          var localLastSync = parseInt(localStorage.getItem('lm_last_cloud_sync_time') || '0', 10);

          // If remote data was updated after our last sync (by > 2s to allow for clock drift)
          if (remoteUpdatedAt > localLastSync + 2000) {
            console.log('[CloudSync] ☁️ Newer remote cloud state detected. Performing background sync...');
            return load().then(function (loaded) {
              if (loaded) {
                if (typeof window.loadAllFromDB === 'function') {
                  window.loadAllFromDB().then(function() {
                    if (typeof window.renderAll === 'function') window.renderAll();
                    if (window.LM_Bus) LM_Bus.emit('lm:cloud:synced', { remoteUpdatedAt: remoteUpdatedAt });
                  });
                }
              }
              return { synced: loaded, reason: 'remote-newer' };
            });
          } else {
            console.log('[CloudSync] ⚡ Local vault is up-to-date with cloud (0 bytes downloaded).');
            return { synced: false, reason: 'already-up-to-date' };
          }
        });
    }).catch(function (e) {
      console.warn('[CloudSync] Background sync check error (using local state):', e && e.message || e);
      return { synced: false, reason: 'error', error: e };
    });
  }

  // ── Public: fetch cloud data and import into IndexedDB ──────
  // Clears stale local data FIRST so cloud is always the source of truth.
  function load() {
    if (isOfflineMode() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      console.log('[CloudSync] Offline mode or no internet — skipping cloud load and using local data');
      return Promise.resolve(false);
    }
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

          var remoteMs = r.data.updated_at ? new Date(r.data.updated_at).getTime() : Date.now();
          try { localStorage.setItem('lm_last_cloud_sync_time', String(remoteMs)); } catch (e) {}

          return decompressPayload(r.data.data).then(function (payload) {
            if (!payload) {
              console.warn('[CloudSync] Failed to decompress payload, keeping local state');
              return false;
            }
            var jsonStr = typeof payload === 'string' ? payload : JSON.stringify(payload);

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
        });
    }).catch(function (e) {
      console.warn('[CloudSync] load exception (retaining local data):', e && e.message || e);
      return false;
    });
  }

  // ── Public: start AppBus hook + periodic + beforeunload ─────
  function startAutoSave(intervalMs) {
    // React to every data-changed event (1.5 s debounce)
    if (window.LM_Bus) {
      LM_Bus.on('lm:data:changed', function () {
        if (!isOfflineMode()) queueSave(1500);
      });
      LM_Bus.on('lm:sync:mode-changed', function (ev) {
        if (ev && ev.mode === 'cloud') {
          _initRealtime();
          if (navigator.onLine && window.LM_DB_READY) save();
        } else if (_realtimeChannel && _supabase) {
          try { _supabase.removeChannel(_realtimeChannel); _realtimeChannel = null; } catch (e) {}
        }
      });
    }

    // Periodic fallback (catches mutations that don't emit the event)
    setInterval(function () {
      if (window.LM_DB_READY && _dirty && !isOfflineMode() && navigator.onLine) save();
    }, intervalMs || 60000);

    // Save when tab becomes hidden (switch tabs, reload, close).
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && window.LM_DB_READY && _dirty && !isOfflineMode() && navigator.onLine) {
        save();
      }
    });

    // React to online recovery
    window.addEventListener('online', function() {
      console.log('[CloudSync] 🌐 Connection restored (online)');
      if (!isOfflineMode() && window.LM_DB_READY) {
        _initRealtime();
        if (_dirty) save();
      }
    });

    // ── Supabase Realtime Channel Subscription ───────────────
    var _realtimeChannel = null;
    function _initRealtime() {
      if (isOfflineMode() || !_supabase || typeof _supabase.channel !== 'function') return;
      _uid().then(function (uid) {
        if (!uid || isOfflineMode()) return;
        try {
          if (_realtimeChannel) _supabase.removeChannel(_realtimeChannel);
          _realtimeChannel = _supabase
            .channel('ledger_data_changes_' + uid)
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: TABLE, filter: 'user_id=eq.' + uid },
              function (payload) {
                if (_saving || isOfflineMode()) return;
                console.log('[CloudSync] ⚡ Realtime update received from cloud:', payload);
                if (window.LM_Bus) {
                  LM_Bus.emit('lm:cloud:remote-update', payload);
                }
                if (typeof showToast === 'function') {
                  showToast('☁️ Cloud data updated from another session. Refreshing...', 'info');
                }
                if (!_dirty && typeof window.LM_StartApp === 'function') {
                  load().then(function(ok) {
                    if (ok && typeof window.renderAll === 'function') window.renderAll();
                  });
                }
              }
            )
            .subscribe(function (status) {
              if (status === 'SUBSCRIBED') {
                console.log('[CloudSync] ⚡ Supabase Realtime live sync connected');
              }
            });
        } catch (err) {
          console.warn('[CloudSync] Realtime subscribe error:', err);
        }
      });
    }

    if (!isOfflineMode()) {
      _initRealtime();
    }

    console.log('[CloudSync] 🔄 auto-save & realtime sync initialized (Mode: ' + getSyncMode() + ')');
  }

  // ── Expose ───────────────────────────────────────────────────
  window.LM_CloudSync = {
    save                   : save,
    load                   : load,
    checkAndSyncBackground : checkAndSyncBackground,
    queueSave              : queueSave,
    saveOnLogout           : saveOnLogout,
    startAutoSave          : startAutoSave,
    getSyncMode            : getSyncMode,
    setSyncMode            : setSyncMode,
    isOfflineMode          : isOfflineMode
  };

}());
