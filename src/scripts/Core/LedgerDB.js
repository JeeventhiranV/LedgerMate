/**
 * LedgerMate – Core IndexedDB Storage Engine (LedgerDB.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Provides enterprise-grade IndexedDB access, automatic schema versioning,
 * store creation, indexes, and async transaction wrappers.
 *
 * Exposes:
 *  - window.LM_LedgerDB
 *  - window.openDB, window.getAll, window.put, window.del, window.tx, window.LM_resetDB, window.db
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function (global) {
  'use strict';

  var DB_NAME = 'ledgermate_db';
  var DB_VERSION = 21;
  var db = null;

  var ALL_STORES = [
    { name: 'transactions', options: { keyPath: 'id', autoIncrement: true }, indexes: ['date', 'profile'] },
    { name: 'budgets', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile'] },
    { name: 'loans', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile', 'dueDate'] },
    { name: 'reminders', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile', 'date'] },
    { name: 'dropdowns', options: { keyPath: 'id', autoIncrement: true } },
    { name: 'settings', options: { keyPath: 'key' } },
    { name: 'users', options: { keyPath: 'id', autoIncrement: true } },
    { name: 'savings', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile'] },
    { name: 'investments', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile'] },
    { name: 'recurringTransactions', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile'] },
    { name: 'auditLog', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile', 'timestamp'] },
    { name: 'trips', options: { keyPath: 'id', autoIncrement: true } },
    { name: 'trip_routes', options: { keyPath: 'id', autoIncrement: true }, indexes: ['tripId'] },
    { name: 'credentials', options: { keyPath: 'id', autoIncrement: true } },
    { name: 'audit_logs', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile', 'timestamp'] },
    { name: 'notes', options: { keyPath: 'id', autoIncrement: true }, indexes: ['title', 'folderId', 'pinned', 'modified'] },
    { name: 'note_versions', options: { keyPath: 'id', autoIncrement: true }, indexes: ['noteId', 'timestamp'] },
    { name: 'note_attachments', options: { keyPath: 'id', autoIncrement: true }, indexes: ['noteId'] },
    { name: 'note_folders', options: { keyPath: 'id', autoIncrement: true }, indexes: ['parentId'] },
    { name: 'emi_loans', options: { keyPath: 'id', autoIncrement: true } },
    { name: 'net_worth_snapshots', options: { keyPath: 'id', autoIncrement: true }, indexes: ['date'] },
    { name: 'allocation_targets', options: { keyPath: 'id' } },
    { name: 'sip_plan', options: { keyPath: 'id', autoIncrement: true } },
    { name: 'essentials_settings', options: { keyPath: 'id', autoIncrement: true }, indexes: ['key', 'profile'] },
    { name: 'savings_goals', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile', 'targetDate'] },
    { name: 'subscriptions', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile'] },
    { name: 'fd_rd', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile'] },
    { name: 'tx_templates', options: { keyPath: 'id', autoIncrement: true }, indexes: ['profile'] },
    { name: 'dashboard_config', options: { keyPath: 'id' } },
    { name: 'credit_cards', options: { keyPath: 'id' }, indexes: ['profile', 'statement_day', 'due_day'] },
    { name: 'vehicles', options: { keyPath: 'id' }, indexes: ['profile', 'regNumber', 'type'] },
    { name: 'receipt_attachments', options: { keyPath: 'id' }, indexes: ['userId', 'transactionId', 'profile'] },
    { name: 'businesses', options: { keyPath: 'id' }, indexes: ['profile', 'name', 'category'] },
    { name: 'business_transactions', options: { keyPath: 'id' }, indexes: ['profile', 'businessId', 'type', 'date', 'partyName', 'paymentStatus'] },
    { name: 'stock_holdings', options: { keyPath: 'id' }, indexes: ['profile'] },
    { name: 'category_rules_store', options: { keyPath: 'id' }, indexes: ['profile'] },
    { name: 'bill_splits_store', options: { keyPath: 'id' }, indexes: ['profile'] }
  ];

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }

      var req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onerror = function (e) {
        console.error('❌ IndexedDB error:', e.target.error);
        if (typeof global.showToast === 'function') {
          global.showToast('❌ DB error: ' + (e.target.error ? e.target.error.message : e.target.error), 'error');
        }
        reject(e.target.error);
      };

      req.onsuccess = function (e) {
        db = e.target.result;
        global.db = db;
        global.LM_DB_READY = true;
        db.onerror = function (err) {
          console.error('DB runtime error:', err.target ? err.target.error : err);
        };
        resolve(db);
      };

      req.onupgradeneeded = function (e) {
        var d = e.target.result;
        console.log('⚙️ Upgrading DB schema to v' + DB_VERSION + '...');
        if (typeof global.showToast === 'function') {
          global.showToast('⚙️ Upgrading database schema...', 'info');
        }

        var ensureStore = function (name, options, indexes) {
          var store;
          if (!d.objectStoreNames.contains(name)) {
            store = d.createObjectStore(name, options);
            console.log('🆕 Created store: ' + name);
          } else {
            store = e.currentTarget.transaction.objectStore(name);
          }
          if (indexes && Array.isArray(indexes)) {
            indexes.forEach(function (idx) {
              if (!store.indexNames.contains(idx)) {
                store.createIndex(idx, idx);
                console.log("📌 Added index '" + idx + "' in " + name);
              }
            });
          }
          return store;
        };

        ALL_STORES.forEach(function (def) {
          ensureStore(def.name, def.options, def.indexes || []);
        });

        console.log('✅ DB schema upgrade complete');
      };
    });
  }

  function LM_resetDB() {
    try {
      if (db) { db.close(); }
    } catch (e) {}
    db = null;
    global.db = null;
    global.LM_DB_READY = false;
  }

  function tx(store, mode) {
    mode = mode || 'readonly';
    var targetDb = db || global.db;
    if (!targetDb) throw new Error('[LM] IndexedDB not ready – openDB() not yet called');
    return targetDb.transaction(store, mode).objectStore(store);
  }

  function getAll(storeName) {
    var targetDb = db || global.db;
    if (!targetDb) return Promise.resolve([]);
    return new Promise(function (res, rej) {
      try {
        var store = tx(storeName);
        var req = store.getAll();
        req.onsuccess = function () { res(req.result || []); };
        req.onerror = function () { rej(req.error); };
      } catch (e) { rej(e); }
    });
  }

  function put(storeName, obj) {
    var targetDb = db || global.db;
    if (!targetDb) throw new Error('[LM] IndexedDB not ready');
    return new Promise(function (res, rej) {
      try {
        var t = targetDb.transaction(storeName, 'readwrite');
        var s = t.objectStore(storeName);
        var req = s.put(obj);
        req.onsuccess = function () { res(req.result); };
        req.onerror = function () { rej(req.error); };
      } catch (e) { rej(e); }
    });
  }

  function del(storeName, key) {
    var targetDb = db || global.db;
    if (!targetDb) throw new Error('[LM] IndexedDB not ready');
    return new Promise(function (res, rej) {
      try {
        var t = targetDb.transaction(storeName, 'readwrite');
        var s = t.objectStore(storeName);
        var req = s.delete(key);
        req.onsuccess = function () { res(); };
        req.onerror = function () { rej(req.error); };
      } catch (e) { rej(e); }
    });
  }

  function clearStore(storeName) {
    var targetDb = db || global.db;
    if (!targetDb) throw new Error('[LM] IndexedDB not ready');
    return new Promise(function (res, rej) {
      try {
        var t = targetDb.transaction(storeName, 'readwrite');
        var s = t.objectStore(storeName);
        var req = s.clear();
        req.onsuccess = function () { res(); };
        req.onerror = function () { rej(req.error); };
      } catch (e) { rej(e); }
    });
  }

  var LedgerDB = {
    openDB: openDB,
    resetDB: LM_resetDB,
    tx: tx,
    getAll: getAll,
    put: put,
    del: del,
    clearStore: clearStore,
    ALL_STORES: ALL_STORES
  };

  // Expose on global window object
  global.LM_LedgerDB = LedgerDB;
  global.openDB = openDB;
  global.LM_resetDB = LM_resetDB;
  global.tx = tx;
  global.getAll = getAll;
  global.put = put;
  global.del = del;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
