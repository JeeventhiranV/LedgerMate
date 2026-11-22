/**
 * Test Suite 08: Authentication, Multi-Tenant Profile Isolation & MasterCrypto E2EE
 * Validates MasterCrypto (PBKDF2/AES-GCM), StorePatch Profile Isolation, and Unassigned Record Claiming.
 */
const path = require('path');
const nodeCrypto = require('crypto');
const { TestSuite, setupMockBrowser, assert } = require('./test_helper');

const suite = new TestSuite('08: Authentication, Multi-Tenant Profile Isolation & MasterCrypto E2EE');
const ROOT = path.resolve(__dirname, '..');

// Setup mock browser environment
setupMockBrowser();

// Ensure Web Crypto API is available in Node
if (!global.crypto || !global.crypto.subtle) {
  global.crypto = nodeCrypto.webcrypto;
}
if (typeof global.btoa === 'undefined') {
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
}
if (typeof global.atob === 'undefined') {
  global.atob = (b64) => Buffer.from(b64, 'base64').toString('binary');
}

// Mock LM_Auth
let currentProfileId = 'user_alice_123';
window.LM_Auth = {
  getCurrentUserId: () => currentProfileId,
  getCurrentUser: () => ({ id: currentProfileId, email: 'alice@example.com' }),
  isAdmin: () => false
};

// Load modules
require(path.resolve(ROOT, 'src/scripts/Core/CurrencyFormatter.js'));
require(path.resolve(ROOT, 'src/scripts/Core/DateUtils.js'));
require(path.resolve(ROOT, 'src/scripts/Auth/MasterCrypto.js'));
require(path.resolve(ROOT, 'src/scripts/Auth/StorePatch.js'));

(async () => {
  // ── MasterCrypto E2EE Zero-Knowledge Encryption Tests ──────────────────
  await suite.it('MasterCrypto: derives AES-256-GCM key and performs E2EE encrypt/decrypt round-trip', async () => {
    assert(window.LM_MasterCrypto, 'LM_MasterCrypto must be exported');

    // 1. Initialize vault with user master passphrase
    const passphrase = 'UltraSecurePin9876!';
    const initRes = await window.LM_MasterCrypto.initMasterKey(passphrase);
    assert(initRes && initRes.salt, 'Should return salt during initialization');
    assert.strictEqual(window.LM_MasterCrypto.isUnlocked(), true);

    // 2. Encrypt sensitive financial note
    const sensitiveSecret = 'Bank Account ATM PIN: 4829, Locker Key: SafeBox-04';
    const encryptedPkg = await window.LM_MasterCrypto.encryptText(sensitiveSecret);

    assert(encryptedPkg && encryptedPkg._e2ee === true, 'Package must have _e2ee flag');
    assert(encryptedPkg.iv, 'Encrypted package must contain IV');
    assert(encryptedPkg.data, 'Encrypted package must contain ciphertext');
    assert(!encryptedPkg.data.includes('4829'), 'Plaintext must not be visible in ciphertext');

    // 3. Decrypt ciphertext back to plaintext
    const decrypted = await window.LM_MasterCrypto.decryptText(encryptedPkg);
    assert.strictEqual(decrypted, sensitiveSecret, 'Decrypted text must match original plaintext');
  });

  await suite.it('MasterCrypto: lockVault locks encryption and prevents unauthorized decryption', async () => {
    const sensitiveSecret = 'Secret Password XYZ';
    const encryptedPkg = await window.LM_MasterCrypto.encryptText(sensitiveSecret);

    // Lock vault
    window.LM_MasterCrypto.lockVault();
    assert.strictEqual(window.LM_MasterCrypto.isUnlocked(), false);

    const lockedResult = await window.LM_MasterCrypto.decryptText(encryptedPkg);
    assert.strictEqual(lockedResult, '[Locked Vault Record]');

    // Re-unlock with same passphrase & salt
    await window.LM_MasterCrypto.initMasterKey('UltraSecurePin9876!', window.LM_MasterCrypto.getSalt());
    const unlockedAgain = await window.LM_MasterCrypto.decryptText(encryptedPkg);
    assert.strictEqual(unlockedAgain, sensitiveSecret);
  });

  // ── StorePatch Scoped LocalStorage & Profile Isolation Tests ────────────
  await suite.it('StorePatch: isolates localStorage keys per active user profile', () => {
    assert(typeof window.LM_lsSet === 'function');
    assert(typeof window.LM_lsGet === 'function');

    // Alice stores a private setting
    currentProfileId = 'user_alice_123';
    window.LM_lsSet('dashboard_theme', 'theme-emerald');
    assert.strictEqual(window.LM_lsGet('dashboard_theme'), 'theme-emerald');

    // Bob logs in
    currentProfileId = 'user_bob_456';
    assert.strictEqual(window.LM_lsGet('dashboard_theme'), null, "Bob must not see Alice's scoped setting");

    // Bob sets his own setting
    window.LM_lsSet('dashboard_theme', 'theme-midnight');
    assert.strictEqual(window.LM_lsGet('dashboard_theme'), 'theme-midnight');

    // Switch back to Alice
    currentProfileId = 'user_alice_123';
    assert.strictEqual(window.LM_lsGet('dashboard_theme'), 'theme-emerald');
  });

  await suite.it('StorePatch: ensures all 24+ core stores are registered in isolation set', () => {
    // Read StorePatch code to verify registered stores
    const fs = require('fs');
    const storePatchCode = fs.readFileSync(path.resolve(ROOT, 'src/scripts/Auth/StorePatch.js'), 'utf8');

    const criticalStores = [
      'transactions', 'budgets', 'loans', 'credit_cards',
      'vehicles', 'businesses', 'business_transactions',
      'stock_holdings', 'category_rules_store', 'bill_splits_store'
    ];

    criticalStores.forEach(s => {
      assert(storePatchCode.includes(`'${s}'`), `Store ${s} must be in USER_DATA_STORES`);
    });
  });

  suite.summary();
})();
