/**
 * LedgerMate – Biometrics.js
 * ─────────────────────────────────────────────────────────────
 * WebAuthn Hardware Biometrics (Fingerprint / Face ID / Touch ID)
 * Allows fast biometric unlock for sessions & credentials vault.
 * Exposes: window.LM_Biometrics
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var CRED_ID_KEY = 'lm_webauthn_cred_id';

  function isNativeAndroid() {
    return typeof window.AndroidBridge !== 'undefined' &&
           typeof window.AndroidBridge.canAuthenticateBiometrics === 'function';
  }

  function callNativeBridge(methodName, ...args) {
    return new Promise((resolve) => {
      const callbackId = 'bio_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      if (!window.LM_NativeBridgeCallbacks) window.LM_NativeBridgeCallbacks = {};
      window.LM_NativeBridgeCallbacks[callbackId] = (data) => {
        delete window.LM_NativeBridgeCallbacks[callbackId];
        resolve(data);
      };
      try {
        window.AndroidBridge[methodName](...args, callbackId);
      } catch (e) {
        delete window.LM_NativeBridgeCallbacks[callbackId];
        resolve({ status: 'error', message: e.message });
      }
    });
  }

  function _bufferToBase64(buffer) {
    var binary = '';
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  function _base64ToBuffer(base64) {
    try {
      var binary = window.atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
      var len = binary.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (e) {
      return null;
    }
  }

  // Check if platform authenticator (Android Biometrics / TouchID / FaceID / Windows Hello) is supported
  async function isBiometricsAvailable() {
    if (isNativeAndroid()) {
      try {
        const res = await callNativeBridge('canAuthenticateBiometrics');
        return !!(res && res.status === 'success' && res.available);
      } catch (e) {
        return false;
      }
    }
    if (!window.PublicKeyCredential) return false;
    try {
      if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  function hasRegisteredCredential(userId) {
    var uid = userId || window.LM_Auth?.getCurrentUserId() || 'default';
    var key = `lm_u_${uid}_${CRED_ID_KEY}`;
    return !!(localStorage.getItem(key) || localStorage.getItem(CRED_ID_KEY));
  }

  // Register new Biometric Passkey
  async function registerBiometrics(silent) {
    var available = await isBiometricsAvailable();
    if (!available) {
      if (!silent && typeof showToast === 'function') {
        showToast('Biometrics not supported on this device/browser.', 'warning');
      }
      return false;
    }

    var uid = window.LM_Auth?.getCurrentUserId() || 'default';

    if (isNativeAndroid()) {
      const res = await callNativeBridge('authenticateBiometrics', 'Enroll Biometrics', 'Confirm fingerprint / face unlock for LedgerMate');
      if (res && res.status === 'success' && res.authenticated) {
        var key = `lm_u_${uid}_${CRED_ID_KEY}`;
        localStorage.setItem(key, 'native_android_enrolled');
        if (!silent && typeof showToast === 'function') {
          showToast('🔐 Biometrics enrolled successfully!', 'success');
        }
        return true;
      } else {
        if (!silent && typeof showToast === 'function') {
          showToast('Biometric authentication cancelled or failed.', 'error');
        }
        return false;
      }
    }

    var userEmail = window.LM_Auth?.getCurrentUser()?.email || 'user@ledgermate.local';

    var challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    var userIdBytes = new TextEncoder().encode(uid);

    var rpConfig = { name: 'LedgerMate Security' };
    if (window.location.hostname && window.location.hostname !== '' && window.location.hostname !== 'localhost') {
      rpConfig.id = window.location.hostname;
    }

    var createOptions = {
      publicKey: {
        challenge: challenge,
        rp: rpConfig,
        user: {
          id: userIdBytes,
          name: userEmail,
          displayName: userEmail.split('@')[0]
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 },  // RS256
          { type: 'public-key', alg: -8 }    // Ed25519
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
      }
    };

    try {
      var credential = await navigator.credentials.create(createOptions);
      if (credential && credential.rawId) {
        var rawIdB64 = _bufferToBase64(credential.rawId);
        var key = `lm_u_${uid}_${CRED_ID_KEY}`;
        localStorage.setItem(key, rawIdB64);
        if (!silent && typeof showToast === 'function') {
          showToast('🔐 Biometrics enrolled successfully!', 'success');
        }
        return true;
      } else if (credential && credential.id) {
        var keyFallback = `lm_u_${uid}_${CRED_ID_KEY}`;
        localStorage.setItem(keyFallback, credential.id);
        if (!silent && typeof showToast === 'function') {
          showToast('🔐 Biometrics enrolled successfully!', 'success');
        }
        return true;
      }
    } catch (err) {
      console.warn('[Biometrics] Registration error:', err);
      if (!silent && typeof showToast === 'function') {
        showToast('Biometric registration was cancelled or failed.', 'error');
      }
    }
    return false;
  }

  // Verify Biometric Authentication
  async function verifyBiometrics() {
    var available = await isBiometricsAvailable();
    if (!available) return false;

    if (isNativeAndroid()) {
      const res = await callNativeBridge('authenticateBiometrics', 'LedgerMate Security', 'Verify identity to unlock');
      if (res && res.status === 'success' && res.authenticated) {
        return true;
      }
      return false;
    }

    var uid = window.LM_Auth?.getCurrentUserId() || 'default';
    var key = `lm_u_${uid}_${CRED_ID_KEY}`;
    var credIdRaw = localStorage.getItem(key) || localStorage.getItem(CRED_ID_KEY);

    var challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    var rpConfigId = (window.location.hostname && window.location.hostname !== '' && window.location.hostname !== 'localhost')
      ? window.location.hostname
      : undefined;

    var getOptions = {
      publicKey: {
        challenge: challenge,
        timeout: 60000,
        userVerification: 'required'
      }
    };
    if (rpConfigId) {
      getOptions.publicKey.rpId = rpConfigId;
    }

    if (credIdRaw) {
      var credBuffer = _base64ToBuffer(credIdRaw);
      if (credBuffer) {
        getOptions.publicKey.allowCredentials = [{
          type: 'public-key',
          id: credBuffer
        }];
      }
    }

    try {
      var assertion = await navigator.credentials.get(getOptions);
      if (assertion) {
        console.log('[Biometrics] ✅ Biometric verification successful');
        return true;
      }
    } catch (err) {
      console.warn('[Biometrics] Verification failed or cancelled:', err);
    }
    return false;
  }

  // Remove registered biometrics
  function removeBiometrics(userId) {
    var uid = userId || window.LM_Auth?.getCurrentUserId() || 'default';
    var key = `lm_u_${uid}_${CRED_ID_KEY}`;
    localStorage.removeItem(key);
    localStorage.removeItem(CRED_ID_KEY);
    if (typeof showToast === 'function') showToast('Biometrics unlinked.', 'info');
  }

  window.LM_Biometrics = {
    isAvailable: isBiometricsAvailable,
    isRegistered: hasRegisteredCredential,
    isEnrolled: hasRegisteredCredential,
    register: registerBiometrics,
    verify: verifyBiometrics,
    remove: removeBiometrics
  };

  console.log('[LM] Biometrics WebAuthn module initialized.');
})();
