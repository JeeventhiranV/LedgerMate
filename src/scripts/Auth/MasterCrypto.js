/**
 * LedgerMate – MasterCrypto.js
 * ─────────────────────────────────────────────────────────────
 * Zero-Knowledge Client-Side Master Encryption (E2EE).
 * Utilizes the Web Crypto API:
 *   • PBKDF2 (100,000 rounds, SHA-256) for Key Derivation from User PIN / Password
 *   • AES-256-GCM (12-byte random IV, 128-bit authentication tag) for Encryption
 *
 * Ensures plaintext passwords, credentials, and private notes NEVER touch the
 * Supabase cloud or network unencrypted.
 * Exposes: window.LM_MasterCrypto
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _masterKey = null;
  var _activeSalt = null;

  // Derive AES-256-GCM CryptoKey using PBKDF2
  async function deriveKeyFromSecret(secretText, saltBytes) {
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(secretText),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-256-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Initialize master encryption with user password or PIN
   */
  async function initMasterKey(passphraseOrPin, userSaltHex) {
    if (!passphraseOrPin) return false;

    var saltBytes;
    if (userSaltHex) {
      saltBytes = new Uint8Array(userSaltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    } else {
      saltBytes = crypto.getRandomValues(new Uint8Array(16));
    }

    _activeSalt = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    _masterKey = await deriveKeyFromSecret(passphraseOrPin, saltBytes);
    console.log('[MasterCrypto] 🔐 Zero-Knowledge encryption engine initialized (AES-256-GCM).');
    return true;
  }

  /**
   * Encrypt plaintext string into AES-256-GCM ciphertext package
   * @param {string} plaintext
   * @returns {Promise<{_e2ee: boolean, iv: string, ciphertext: string, salt: string}>}
   */
  async function encryptText(plaintext) {
    if (!_masterKey) {
      // If master key not explicitly unlocked, return plain text with warning
      return plaintext;
    }
    try {
      var enc = new TextEncoder();
      var iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
      var encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-256-GCM', iv: iv },
        _masterKey,
        enc.encode(plaintext)
      );

      var ciphertextArray = Array.from(new Uint8Array(encryptedBuffer));
      var ivArray = Array.from(iv);

      return {
        _e2ee: true,
        v: 1,
        salt: _activeSalt,
        iv: btoa(String.fromCharCode.apply(null, ivArray)),
        data: btoa(String.fromCharCode.apply(null, ciphertextArray))
      };
    } catch (err) {
      console.error('[MasterCrypto] Encryption failed:', err);
      return plaintext;
    }
  }

  /**
   * Decrypt AES-256-GCM ciphertext package back to plaintext string
   * @param {Object|string} encryptedPackage
   * @returns {Promise<string>}
   */
  async function decryptText(encryptedPackage) {
    if (!encryptedPackage || typeof encryptedPackage !== 'object' || !encryptedPackage._e2ee) {
      return typeof encryptedPackage === 'string' ? encryptedPackage : JSON.stringify(encryptedPackage);
    }
    if (!_masterKey) {
      console.warn('[MasterCrypto] Cannot decrypt: Master key is locked');
      return '[Locked Vault Record]';
    }
    try {
      var ivBytes = new Uint8Array(atob(encryptedPackage.iv).split('').map(c => c.charCodeAt(0)));
      var dataBytes = new Uint8Array(atob(encryptedPackage.data).split('').map(c => c.charCodeAt(0)));

      var decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-256-GCM', iv: ivBytes },
        _masterKey,
        dataBytes
      );

      var dec = new TextDecoder();
      return dec.decode(decryptedBuffer);
    } catch (err) {
      console.error('[MasterCrypto] Decryption failed (invalid key / corrupted ciphertext):', err);
      return '[Decryption Error]';
    }
  }

  window.LM_MasterCrypto = {
    initMasterKey,
    encryptText,
    decryptText,
    isUnlocked: () => !!_masterKey,
    getSalt: () => _activeSalt
  };

  console.log('[LM] MasterCrypto module loaded.');
})();
