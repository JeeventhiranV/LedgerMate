/**
 * LedgerMate – StorePatch.js
 * ─────────────────────────────────────────────────────────────
 * Monkey-patches Common.js's `put` and `getAll` functions to
 * automatically scope every record to the current user's profile.
 *
 * Load order: Auth/*.js  →  Common.js  →  StorePatch.js  →  rest
 *
 * STRATEGY
 *  • getAll(store)  → filters results where record.profile matches
 *                     current user ID (or record has no profile field
 *                     yet, i.e. pre-migration legacy data).
 *  • put(store,obj) → auto-injects profile = currentUserId before save.
 *  • Admin users    → bypass filter to see ALL records.
 *  • Shared stores  → excluded from isolation (dropdowns only).
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /* Stores that get profile-scoped */
  const USER_DATA_STORES = new Set([
    'transactions', 'budgets', 'loans', 'reminders',
    'savings', 'investments', 'recurringTransactions',
    'audit_logs', 'auditLog',
    'trips', 'trip_routes', 'credentials',
    'notes', 'note_versions', 'note_attachments', 'note_folders',
    'emi_loans', 'net_worth_snapshots', 'allocation_targets', 'sip_plan',
    'essentials_settings', 'savings_goals'   /* user-specific config & goals */
  ]);

  /* Stores shared between all users (categories, etc.) */
  const SHARED_STORES = new Set(['dropdowns', 'settings', 'users']);

  function getCurrentProfile() {
    return window.LM_Auth?.getCurrentUserId() || 'default';
  }

  function isAdminSession() {
    return window.LM_Auth?.isAdmin?.() === true;
  }

  /* ── Patch installer ────────────────────────────────── */
  function applyPatches() {
    if (typeof window.getAll !== 'function' || typeof window.put !== 'function') {
      setTimeout(applyPatches, 50);
      return;
    }

    /* Avoid double-patching */
    if (window._LM_StorePatchActive) return;

    const _origGetAll = window.getAll;
    const _origPut    = window.put;

    /* ─── Patched getAll ─────────────────────────────── */
    window.getAll = async function patchedGetAll(storeName) {
      /* If DB not ready, return empty array – same as getAll's own null guard */
      if (!window.db) return [];

      let all;
      try {
        all = await _origGetAll(storeName);
      } catch (e) {
        /* DB access failed (e.g. store doesn't exist yet) – degrade gracefully */
        if (e && e.message && e.message.includes('not ready')) return [];
        throw e;
      }

      /* Shared stores pass through untouched */
      if (SHARED_STORES.has(storeName)) return all;
      /* Non-user stores pass through untouched */
      if (!USER_DATA_STORES.has(storeName)) return all;

      const profileId = getCurrentProfile();

      /* Admins see all records */
      if (isAdminSession()) return all;

      /* Users see only their own records + legacy untagged records */
      return all.filter(r => !r.profile || r.profile === profileId);
    };

    /* ─── Patched put ────────────────────────────────── */
    window.put = async function patchedPut(storeName, obj) {
      /* Profile injection only – null-db guard is in the original _origPut */
      if (USER_DATA_STORES.has(storeName) && obj && typeof obj === 'object') {
        if (!obj.profile) {
          obj = { ...obj, profile: getCurrentProfile() };
        }
      }
      return _origPut(storeName, obj);
    };

    /* ─── Patched del (expose global) ─────────────────
       del() is already in global scope; no change needed,
       but we expose a convenience helper for admin-side
       selective deletion by profile. */
    window.LM_delByProfile = async function(storeName, userId) {
      if (!window.db) return;
      return new Promise((res, rej) => {
        const t   = window.db.transaction(storeName, 'readwrite');
        const s   = t.objectStore(storeName);
        const req = s.openCursor();
        req.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor) {
            if (cursor.value.profile === userId) cursor.delete();
            cursor.continue();
          } else { res(); }
        };
        req.onerror = () => rej(req.error);
      });
    };

    console.log('[LM] StorePatch applied – multi-user isolation active.');
    window._LM_StorePatchActive = true;
  }

  /* ── User-scoped localStorage helpers ──────────────── */
  function lsGet(key, fallback = null) {
    const uid   = window.LM_Auth?.getCurrentUserId() || 'default';
    const uKey  = `lm_u_${uid}_${key}`;
    const raw   = localStorage.getItem(uKey) ?? localStorage.getItem(key);
    if (raw === null) return fallback;
    try { return JSON.parse(raw); } catch { return raw; }
  }

  function lsSet(key, value) {
    const uid  = window.LM_Auth?.getCurrentUserId() || 'default';
    const uKey = `lm_u_${uid}_${key}`;
    try { localStorage.setItem(uKey, JSON.stringify(value)); } catch {}
  }

  function lsRemove(key) {
    const uid  = window.LM_Auth?.getCurrentUserId() || 'default';
    localStorage.removeItem(`lm_u_${uid}_${key}`);
    localStorage.removeItem(key); /* also clear legacy key */
  }

  /* Expose scoped LS helpers globally */
  window.LM_lsGet    = lsGet;
  window.LM_lsSet    = lsSet;
  window.LM_lsRemove = lsRemove;

  /* ── Kick off once DOM is ready ─────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyPatches);
  } else {
    applyPatches();
  }

  /* Also export for manual call if needed */
  window.LM_applyStorePatch = applyPatches;

})();
