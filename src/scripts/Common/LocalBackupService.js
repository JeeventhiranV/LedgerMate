/**
 * LedgerMate – LocalBackupService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Local Device Automated Backup & Retention Manager.
 * Handles:
 *  1. Android Storage Access Framework (SAF) folder picker & native JSON writing.
 *  2. Web File System Access API (showDirectoryPicker) fallback for desktop/PWA.
 *  3. Automatic debounced snapshots on data change and scheduled periodic backups.
 *  4. 30-Day (1 Month) retention policy and max 100 backups cap (oldest pruned).
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var _backupTimer = null;
  var _isBackingUp = false;
  var MAX_RETENTION_DAYS = 30;
  var MAX_BACKUP_COUNT = 100;

  function isNativeAndroid() {
    return typeof window.AndroidBridge !== 'undefined' &&
           typeof window.AndroidBridge.isNativeApp === 'function' &&
           window.AndroidBridge.isNativeApp();
  }

  function isLocalBackupEnabled() {
    try {
      var val = localStorage.getItem('lm_local_backup_enabled');
      if (val !== null) return val === 'true';
      if (window.state && window.state.settings && typeof window.state.settings.autoLocalBackupEnabled === 'boolean') {
        return window.state.settings.autoLocalBackupEnabled;
      }
    } catch (e) {}
    return false;
  }

  function setLocalBackupEnabled(enabled) {
    var boolVal = !!enabled;
    try {
      localStorage.setItem('lm_local_backup_enabled', String(boolVal));
      if (window.state && window.state.settings) {
        window.state.settings.autoLocalBackupEnabled = boolVal;
      }
    } catch (e) {}

    console.log('[LocalBackup] Auto local backup enabled:', boolVal);
    if (window.LM_Bus) {
      window.LM_Bus.emit('lm:local-backup:status-changed', { enabled: boolVal });
    }

    if (boolVal) {
      queueAutoBackup(1000);
    }
    return boolVal;
  }

  function getFolderInfo() {
    return new Promise(function (resolve) {
      if (isNativeAndroid() && typeof window.AndroidBridge.getBackupFolder === 'function') {
        var callbackId = 'cb_get_folder_' + Date.now();
        window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};
        window.LM_NativeBridgeCallbacks[callbackId] = function (res) {
          delete window.LM_NativeBridgeCallbacks[callbackId];
          if (res && res.status === 'success' && res.configured) {
            resolve({
              configured: true,
              folderName: res.folderName || 'Selected Device Folder',
              uri: res.uri
            });
          } else {
            resolve({ configured: false, folderName: null, uri: null });
          }
        };
        try {
          window.AndroidBridge.getBackupFolder(callbackId);
          setTimeout(function () {
            if (window.LM_NativeBridgeCallbacks[callbackId]) {
              delete window.LM_NativeBridgeCallbacks[callbackId];
              resolve({ configured: false, folderName: null, uri: null });
            }
          }, 2000);
        } catch (e) {
          resolve({ configured: false, folderName: null, uri: null });
        }
      } else {
        // Web / PWA File System Access
        var configured = !!(window.state && window.state.dataFolderHandle);
        var name = configured && window.state.dataFolderHandle.name ? window.state.dataFolderHandle.name : null;
        resolve({
          configured: configured,
          folderName: name || (configured ? 'Selected Browser Folder' : null),
          uri: null
        });
      }
    });
  }

  function selectFolder() {
    return new Promise(function (resolve, reject) {
      if (isNativeAndroid() && typeof window.AndroidBridge.selectBackupFolder === 'function') {
        var callbackId = 'cb_select_folder_' + Date.now();
        window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};
        window.LM_NativeBridgeCallbacks[callbackId] = function (res) {
          delete window.LM_NativeBridgeCallbacks[callbackId];
          if (res && res.status === 'success') {
            try {
              localStorage.setItem('lm_local_backup_folder_uri', res.uri || '');
              localStorage.setItem('lm_local_backup_folder_name', res.folderName || 'Selected Folder');
              setLocalBackupEnabled(true);
            } catch (e) {}

            var labelEl = document.getElementById('folderLabel');
            if (labelEl) labelEl.innerText = res.folderName ? ('📁 ' + res.folderName) : '✔';

            if (typeof window.showToast === 'function') {
              window.showToast('📁 Backup folder set: ' + (res.folderName || 'Device Storage'), 'success');
            }
            if (window.LM_Bus) {
              window.LM_Bus.emit('lm:local-backup:folder-selected', res);
            }
            performBackup({ silent: false });
            resolve(res);
          } else {
            var errMsg = (res && res.error) ? res.error : 'Folder selection cancelled';
            if (typeof window.showToast === 'function') window.showToast(errMsg, 'info');
            reject(new Error(errMsg));
          }
        };
        try {
          window.AndroidBridge.selectBackupFolder(callbackId);
        } catch (e) {
          reject(e);
        }
      } else if (typeof window.showDirectoryPicker === 'function') {
        // Web File System Access API
        window.showDirectoryPicker().then(function (dirHandle) {
          if (!dirHandle) return;
          if (window.state) {
            window.state.dataFolderHandle = dirHandle;
          }
          if (typeof window.put === 'function') {
            window.put('settings', { key: 'dataFolderHandle', value: dirHandle });
          }
          try {
            localStorage.setItem('lm_local_backup_folder_name', dirHandle.name || 'Local Folder');
            setLocalBackupEnabled(true);
          } catch (e) {}

          var labelEl = document.getElementById('folderLabel');
          if (labelEl) labelEl.innerText = dirHandle.name ? ('📁 ' + dirHandle.name) : '✔';

          if (typeof window.showToast === 'function') {
            window.showToast('📁 Backup folder set: ' + (dirHandle.name || 'Browser Folder'), 'success');
          }
          if (window.LM_Bus) {
            window.LM_Bus.emit('lm:local-backup:folder-selected', { folderName: dirHandle.name });
          }
          performBackup({ silent: false });
          resolve({ status: 'success', folderName: dirHandle.name });
        }).catch(function (err) {
          console.warn('[LocalBackup] showDirectoryPicker error:', err);
          reject(err);
        });
      } else {
        var notSupportedMsg = 'Folder selection is not supported in this environment.';
        if (typeof window.showToast === 'function') window.showToast(notSupportedMsg, 'error');
        reject(new Error(notSupportedMsg));
      }
    });
  }

  function _formatBackupFileName() {
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm   = String(d.getMonth() + 1).padStart(2, '0');
    var dd   = String(d.getDate()).padStart(2, '0');
    var hh   = String(d.getHours()).padStart(2, '0');
    var min  = String(d.getMinutes()).padStart(2, '0');
    var ss   = String(d.getSeconds()).padStart(2, '0');
    return 'LedgerMate_Backup_' + yyyy + '-' + mm + '-' + dd + '_' + hh + min + ss + '.json';
  }

  function _pruneWebFolder(dirHandle) {
    return new Promise(function (resolve) {
      if (!dirHandle || typeof dirHandle.values !== 'function') { resolve(0); return; }
      (async function () {
        try {
          var files = [];
          var now = Date.now();
          var maxAgeMs = MAX_RETENTION_DAYS * 24 * 60 * 60 * 1000;
          var deletedCount = 0;

          for await (var entry of dirHandle.values()) {
            if (entry.kind === 'file' && entry.name.startsWith('LedgerMate_Backup_') && entry.name.endsWith('.json')) {
              var f = await entry.getFile();
              if (f.lastModified && (now - f.lastModified) > maxAgeMs) {
                try {
                  await dirHandle.removeEntry(entry.name);
                  deletedCount++;
                  continue;
                } catch (e) {}
              }
              files.push({ entry: entry, lastModified: f.lastModified || 0, name: entry.name });
            }
          }

          if (files.length > MAX_BACKUP_COUNT) {
            files.sort(function (a, b) { return b.lastModified - a.lastModified; }); // newest first
            for (var i = MAX_BACKUP_COUNT; i < files.length; i++) {
              try {
                await dirHandle.removeEntry(files[i].name);
                deletedCount++;
              } catch (e) {}
            }
          }
          resolve(deletedCount);
        } catch (e) {
          console.warn('[LocalBackup] Web pruning error:', e);
          resolve(0);
        }
      })();
    });
  }

  function performBackup(opts) {
    var options = opts || {};
    var isSilent = !!options.silent;

    if (_isBackingUp) return Promise.resolve(false);
    if (!isLocalBackupEnabled() && !options.force) {
      return Promise.resolve(false);
    }
    if (!window.FinalJson) return Promise.resolve(false);

    _isBackingUp = true;

    return Promise.resolve().then(function () {
      return window.FinalJson();
    }).then(function (jsonStr) {
      if (!jsonStr) {
        _isBackingUp = false;
        return false;
      }

      var fileName = _formatBackupFileName();

      if (isNativeAndroid() && typeof window.AndroidBridge.writeBackupFile === 'function') {
        return new Promise(function (resolve) {
          var callbackId = 'cb_write_backup_' + Date.now();
          window.LM_NativeBridgeCallbacks = window.LM_NativeBridgeCallbacks || {};
          window.LM_NativeBridgeCallbacks[callbackId] = function (res) {
            delete window.LM_NativeBridgeCallbacks[callbackId];
            _isBackingUp = false;
            if (res && res.status === 'success') {
              console.log('[LocalBackup] ✅ Native backup saved:', fileName, 'Pruned:', res.prunedCount);
              try { localStorage.setItem('lm_last_local_backup_time', String(Date.now())); } catch (e) {}
              if (!isSilent && typeof window.showToast === 'function') {
                window.showToast('💾 Local backup created: ' + fileName, 'success');
              }
              if (window.LM_Bus) window.LM_Bus.emit('lm:local-backup:saved', { fileName: fileName });
              resolve(true);
            } else {
              var err = (res && res.error) ? res.error : 'Native backup failed';
              console.warn('[LocalBackup] ❌', err);
              if (!isSilent && typeof window.showToast === 'function') {
                window.showToast('❌ Local backup failed: ' + err, 'error');
              }
              resolve(false);
            }
          };

          try {
            window.AndroidBridge.writeBackupFile('', fileName, jsonStr, callbackId);
          } catch (e) {
            _isBackingUp = false;
            console.warn('[LocalBackup] Bridge error:', e);
            resolve(false);
          }
        });
      } else if (window.state && window.state.dataFolderHandle) {
        // Web File System Access API
        return (async function () {
          try {
            var dir = window.state.dataFolderHandle;
            var fh = await dir.getFileHandle(fileName, { create: true });
            var writable = await fh.createWritable();
            await writable.write(jsonStr);
            await writable.close();

            var pruned = await _pruneWebFolder(dir);
            _isBackingUp = false;

            console.log('[LocalBackup] ✅ Web backup saved:', fileName, 'Pruned:', pruned);
            try { localStorage.setItem('lm_last_local_backup_time', String(Date.now())); } catch (e) {}
            if (!isSilent && typeof window.showToast === 'function') {
              window.showToast('💾 Local backup created: ' + fileName, 'success');
            }
            if (window.LM_Bus) window.LM_Bus.emit('lm:local-backup:saved', { fileName: fileName });
            return true;
          } catch (e) {
            _isBackingUp = false;
            console.warn('[LocalBackup] Web file write error:', e);
            if (!isSilent && typeof window.showToast === 'function') {
              window.showToast('❌ Local backup error: ' + (e.message || e), 'error');
            }
            return false;
          }
        })();
      } else {
        _isBackingUp = false;
        return false;
      }
    }).catch(function (e) {
      _isBackingUp = false;
      console.warn('[LocalBackup] Exception during performBackup:', e);
      return false;
    });
  }

  function queueAutoBackup(ms) {
    if (!isLocalBackupEnabled()) return;
    clearTimeout(_backupTimer);
    _backupTimer = setTimeout(function () {
      performBackup({ silent: true });
    }, ms != null ? ms : 4000);
  }

  function startAutoBackup(intervalMs) {
    if (window.LM_Bus) {
      window.LM_Bus.on('lm:data:changed', function () {
        if (isLocalBackupEnabled()) queueAutoBackup(3000);
      });
    }

    getFolderInfo().then(function (info) {
      if (info && info.configured && info.folderName) {
        var labelEl = document.getElementById('folderLabel');
        if (labelEl) labelEl.innerText = '📁 ' + info.folderName;
      }
    }).catch(function () {});

    setInterval(function () {
      if (window.LM_DB_READY && isLocalBackupEnabled()) {
        performBackup({ silent: true });
      }
    }, intervalMs || (10 * 60 * 1000)); // Every 10 mins

    console.log('[LocalBackup] 🔄 Local backup service initialized (Enabled:', isLocalBackupEnabled(), ')');
  }

  // ── Expose ───────────────────────────────────────────────────
  window.LM_LocalBackup = {
    isNativeAndroid       : isNativeAndroid,
    isLocalBackupEnabled  : isLocalBackupEnabled,
    setLocalBackupEnabled : setLocalBackupEnabled,
    getFolderInfo         : getFolderInfo,
    selectFolder          : selectFolder,
    performBackup         : performBackup,
    queueAutoBackup       : queueAutoBackup,
    startAutoBackup       : startAutoBackup,
    MAX_RETENTION_DAYS    : MAX_RETENTION_DAYS,
    MAX_BACKUP_COUNT      : MAX_BACKUP_COUNT
  };

})();
