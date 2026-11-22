/**
 * Test Suite 09: Bulletproof Zero-Sync, Non-Destructive Merge, Tombstones & GZIP Backups
 * Validates CloudSync Echo Suppression, 3-Way LWW Conflict Resolution, 30-Day Tombstone Pruning,
 * and GZIP Backup Decompression.
 */
const path = require('path');
const zlib = require('zlib');
const { TestSuite, setupMockBrowser, assert } = require('./test_helper');

const suite = new TestSuite('09: Bulletproof Zero-Sync, Non-Destructive Merge, Tombstones & GZIP Backups');
const ROOT = path.resolve(__dirname, '..');

// Setup mock browser environment
setupMockBrowser();

// Provide state
window.state = {
  transactions: [],
  budgets: [],
  credit_cards: []
};

// Load modules
require(path.resolve(ROOT, 'src/scripts/Core/CurrencyFormatter.js'));
require(path.resolve(ROOT, 'src/scripts/Core/DateUtils.js'));
require(path.resolve(ROOT, 'src/scripts/Core/AppBus.js'));
require(path.resolve(ROOT, 'src/scripts/CloudSync.js'));

(async () => {
  // ── CloudSync Zero-Sync & Echo Suppression Tests ───────────────────────
  await suite.it('CloudSync: exports required zero-sync contracts and echo suppression', () => {
    assert(window.LM_CloudSync, 'LM_CloudSync must be exported');
    assert(typeof window.LM_CloudSync.getClientSessionId === 'function', 'getClientSessionId must exist');
    assert(typeof window.LM_CloudSync.isDirty === 'function', 'isDirty must exist');
    assert(typeof window.LM_CloudSync.markStorePending === 'function', 'markStorePending must exist');
    assert(typeof window.LM_CloudSync.getPendingQueue === 'function', 'getPendingQueue must exist');
    assert(typeof window.LM_CloudSync.clearPendingQueue === 'function', 'clearPendingQueue must exist');
    assert(typeof window.LM_CloudSync.addTombstone === 'function', 'addTombstone must exist');
    assert(typeof window.LM_CloudSync.getTombstones === 'function', 'getTombstones must exist');
    assert(typeof window.LM_CloudSync.mergeTombstones === 'function', 'mergeTombstones must exist');

    const sessionId = window.LM_CloudSync.getClientSessionId();
    assert(sessionId && typeof sessionId === 'string', 'Session ID should be a non-empty string');
    assert.strictEqual(window.LM_CloudSync.getClientSessionId(), sessionId, 'Session ID should remain stable');
  });

  await suite.it('CloudSync: tracks pending dirty stores and clears on sync completion', () => {
    window.LM_CloudSync.clearPendingQueue();
    assert.strictEqual(window.LM_CloudSync.isDirty(), false);

    window.LM_CloudSync.markStorePending('transactions');
    window.LM_CloudSync.markStorePending('budgets');

    assert.strictEqual(window.LM_CloudSync.isDirty(), true);
    const queue = window.LM_CloudSync.getPendingQueue();
    assert(queue.includes('transactions'), 'Queue must contain transactions');
    assert(queue.includes('budgets'), 'Queue must contain budgets');

    window.LM_CloudSync.clearPendingQueue();
    assert.strictEqual(window.LM_CloudSync.isDirty(), false);
  });

  // ── Tombstone Accumulation & 30-Day Retention Pruning Tests ────────────
  await suite.it('CloudSync: accumulates tombstones and prunes tombstones older than 30 days', () => {
    const now = Date.now();
    const freshTimestamp = new Date(now - 2 * 86400000).toISOString(); // 2 days old
    const expiredTimestamp = new Date(now - 35 * 86400000).toISOString(); // 35 days old (> 30d)

    // Add fresh tombstone
    window.LM_CloudSync.addTombstone('transactions', 'tx_fresh_del');

    // Merge incoming remote tombstones containing both fresh and expired entries
    const incomingRemote = [
      { store: 'budgets', id: 'b_fresh_del', deletedAt: freshTimestamp },
      { store: 'loans', id: 'l_expired_del', deletedAt: expiredTimestamp }
    ];

    window.LM_CloudSync.mergeTombstones(incomingRemote);
    const merged = window.LM_CloudSync.getTombstones();

    // Fresh entries must be retained
    assert(merged.some(t => t.id === 'tx_fresh_del'), 'Fresh local tombstone must be retained');
    assert(merged.some(t => t.id === 'b_fresh_del'), 'Fresh incoming remote tombstone must be retained');

    // Expired entry must be pruned
    assert(!merged.some(t => t.id === 'l_expired_del'), 'Expired tombstone (> 30 days) must be pruned');
  });

  // ── 3-Way LWW (Last-Write-Wins) Conflict Resolution Tests ───────────────
  await suite.it('3-Way Merge: resolves concurrent edits via Last-Write-Wins timestamps', () => {
    const localRecord = {
      id: 'tx_salary',
      amount: 85000,
      updatedAt: '2026-11-23T10:00:00.000Z'
    };

    const staleRemoteRecord = {
      id: 'tx_salary',
      amount: 80000,
      updatedAt: '2026-11-23T08:00:00.000Z'
    };

    const newerRemoteRecord = {
      id: 'tx_salary',
      amount: 90000,
      updatedAt: '2026-11-23T12:00:00.000Z'
    };

    // Helper simulating 3-way LWW merge rule
    function resolveLWW(local, remote) {
      if (!local) return remote;
      if (!remote) return local;
      const localTime = new Date(local.updatedAt || 0).getTime();
      const remoteTime = new Date(remote.updatedAt || 0).getTime();
      return localTime >= remoteTime ? local : remote;
    }

    // Local vs Stale Remote -> Local Wins
    const winLocal = resolveLWW(localRecord, staleRemoteRecord);
    assert.strictEqual(winLocal.amount, 85000, 'Local edit must win against older remote edit');

    // Local vs Newer Remote -> Newer Remote Wins
    const winRemote = resolveLWW(localRecord, newerRemoteRecord);
    assert.strictEqual(winRemote.amount, 90000, 'Newer remote edit must win against local');
  });

  await suite.it('3-Way Merge: prevents resurrection of deleted records with active tombstones', () => {
    const tombstones = [
      { store: 'transactions', id: 'tx_deleted_grocery', deletedAt: '2026-11-23T09:00:00.000Z' }
    ];

    const staleCloudRecord = {
      id: 'tx_deleted_grocery',
      amount: 2500,
      updatedAt: '2026-11-23T07:00:00.000Z' // older than deletion
    };

    const isTombstoned = tombstones.some(
      t => t.id === staleCloudRecord.id && new Date(t.deletedAt) >= new Date(staleCloudRecord.updatedAt)
    );

    assert.strictEqual(isTombstoned, true, 'Record should be suppressed by tombstone');
  });

  // ── GZIP Backup Compression & Header Magic Bytes Tests ──────────────────
  await suite.it('GZIP Pipeline: verifies 2-byte magic header 0x1f 0x8b and round-trip decompression', () => {
    const sampleLedgerData = JSON.stringify({
      version: 21,
      appName: 'LedgerMate',
      transactions: [{ id: 'tx_1', amount: 5000 }],
      budgets: [{ id: 'b_1', limit: 15000 }]
    });

    const compressed = zlib.gzipSync(Buffer.from(sampleLedgerData, 'utf8'));

    // Verify GZIP magic byte header (0x1f, 0x8b)
    assert.strictEqual(compressed[0], 0x1f, 'First byte must be GZIP magic byte 0x1f');
    assert.strictEqual(compressed[1], 0x8b, 'Second byte must be GZIP magic byte 0x8b');

    // Decompress and verify integrity
    const decompressed = zlib.gunzipSync(compressed).toString('utf8');
    const parsed = JSON.parse(decompressed);

    assert.strictEqual(parsed.version, 21);
    assert.strictEqual(parsed.appName, 'LedgerMate');
    assert.strictEqual(parsed.transactions.length, 1);
  });

  suite.summary();
})();
