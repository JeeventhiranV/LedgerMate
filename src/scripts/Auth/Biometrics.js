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

  // Check if platform authenticator (TouchID / FaceID / Windows Hello / Android Biometrics) is supported
  async function isBiometricsAvailable() {
    if (!window.PublicKeyCredential) return false;
    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      return false;
    }
  }

  function hasRegisteredCredential() {
    var uid = window.LM_Auth?.getCurrentUserId() || 'default';
    var key = `lm_u_${uid}_${CRED_ID_KEY}`;
    return !!(localStorage.getItem(key) || localStorage.getItem(CRED_ID_KEY));
  }

  // Register new Biometric Passkey
  async function registerBiometrics() {
    var available = await isBiometricsAvailable();
    if (!available) {
      if (typeof showToast === 'function') showToast('Biometrics not supported on this device/browser.', 'warning');
      return false;
    }

    var uid = window.LM_Auth?.getCurrentUserId() || 'default';
    var userEmail = window.LM_Auth?.getCurrentUser()?.email || 'user@ledgermate.local';

    var challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    var userIdBytes = new TextEncoder().encode(uid);

    var createOptions = {
      publicKey: {
        challenge: challenge,
        rp: { name: 'LedgerMate Finance & Study', id: window.location.hostname || 'localhost' },
        user: {
          id: userIdBytes,
          name: userEmail,
          displayName: userEmail.split('@')[0]
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 } // RS256
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
      if (credential && credential.id) {
        var key = `lm_u_${uid}_${CRED_ID_KEY}`;
        localStorage.setItem(key, credential.id);
        if (typeof showToast === 'function') showToast('🔐 Biometrics registered successfully!', 'success');
        return true;
      }
    } catch (err) {
      console.warn('[Biometrics] Registration error:', err);
      if (typeof showToast === 'function') showToast('Biometric registration cancelled or failed.', 'error');
    }
    return false;
  }

  // Verify Biometric Authentication
  async function verifyBiometrics() {
    var available = await isBiometricsAvailable();
    if (!available) return false;

    var uid = window.LM_Auth?.getCurrentUserId() || 'default';
    var key = `lm_u_${uid}_${CRED_ID_KEY}`;
    var credId = localStorage.getItem(key) || localStorage.getItem(CRED_ID_KEY);

    var challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    var getOptions = {
      publicKey: {
        challenge: challenge,
        timeout: 60000,
        userVerification: 'required'
      }
    };

    if (credId) {
      getOptions.publicKey.allowCredentials = [{
        type: 'public-key',
        id: Uint8Array.from(atob(credId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
      }];
    }

    try {
      var assertion = await navigator.credentials.get(getOptions);
      if (assertion) {
        console.log('[Biometrics] ✅ Biometric verification successful');
        return true;
      }
    } catch (err) {
      console.warn('[Biometrics] Verification failed:', err);
    }
    return false;
  }

  // Remove registered biometrics
  function removeBiometrics() {
    var uid = window.LM_Auth?.getCurrentUserId() || 'default';
    var key = `lm_u_${uid}_${CRED_ID_KEY}`;
    localStorage.removeItem(key);
    localStorage.removeItem(CRED_ID_KEY);
    if (typeof showToast === 'function') showToast('Biometrics unlinked.', 'info');
  }

  window.LM_Biometrics = {
    isAvailable: isBiometricsAvailable,
    isRegistered: hasRegisteredCredential,
    register: registerBiometrics,
    verify: verifyBiometrics,
    remove: removeBiometrics
  };

  console.log('[LM] Biometrics WebAuthn module initialized.');
})();
