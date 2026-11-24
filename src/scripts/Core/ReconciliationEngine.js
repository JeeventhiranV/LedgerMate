/**
 * LedgerMate – ReconciliationEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise Automated Bank Statement Reconciliation Engine.
 * Compares parsed bank statements with ledger transactions, detects:
 *  • Exact Matches (date, amount, type, account)
 *  • Date-Tolerance Matches (settlement grace period ±2 days)
 *  • Missing in Ledger (statement records not yet recorded in LedgerMate)
 *  • Uncleared Transactions (ledger records not cleared by the bank)
 *  • Discrepancies & Variances
 *
 * Provides 1-click batch reconciliation and automatic missing transaction import.
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  // Helper: calculate date difference in days (d1 - d2)
  function getDaysDiff(dateStr1, dateStr2) {
    try {
      const d1 = new Date(dateStr1);
      const d2 = new Date(dateStr2);
      if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 999;
      return Math.round(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
    } catch (e) {
      return 999;
    }
  }

  // Helper: token overlap similarity for fuzzy description matching (0 to 1)
  function getSimilarityScore(str1 = '', str2 = '') {
    const s1 = String(str1).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const s2 = String(str2).toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    if (!s1 || !s2) return 0;
    if (s1 === s2) return 1;

    const t1 = new Set(s1.split(/\s+/).filter(w => w.length > 2));
    const t2 = new Set(s2.split(/\s+/).filter(w => w.length > 2));
    if (t1.size === 0 || t2.size === 0) return 0;

    let overlap = 0;
    t1.forEach(word => { if (t2.has(word)) overlap++; });
    return (2 * overlap) / (t1.size + t2.size);
  }

  const ReconciliationEngine = {

    /* ── Main Reconciliation Processor ── */
    reconcile(statementTxs = [], ledgerTxs = [], options = {}) {
      const dateTolerance = Number(options.dateToleranceDays) >= 0 ? Number(options.dateToleranceDays) : 2;
      const targetAccount = options.account || 'all';

      const matched = [];
      const discrepancies = [];
      const remainingStatement = [];
      const remainingLedger = [...ledgerTxs];

      // Filter ledger by account if requested
      const eligibleLedger = ledgerTxs.filter(t => {
        if (targetAccount !== 'all' && t.account && t.account !== targetAccount) return false;
        return true;
      });

      const matchedLedgerIds = new Set();

      // Pass 1: Exact Matches (Same Date, Same Amount, Same Type)
      statementTxs.forEach(s => {
        const sAmt = Math.round(Number(s.amount) * 100);
        const exactMatchIdx = eligibleLedger.findIndex(l => {
          if (matchedLedgerIds.has(l.id)) return false;
          const lAmt = Math.round(Number(l.amount) * 100);
          return (
            sAmt === lAmt &&
            s.type === l.type &&
            s.date === l.date
          );
        });

        if (exactMatchIdx !== -1) {
          const l = eligibleLedger[exactMatchIdx];
          matchedLedgerIds.add(l.id);
          matched.push({
            statementTx: s,
            ledgerTx: l,
            matchType: 'exact',
            confidence: 1.0,
            dateDiff: 0
          });
        } else {
          remainingStatement.push(s);
        }
      });

      // Pass 2: Date-Tolerance Matches (Within ±dateTolerance days, Same Amount, Same Type)
      const stillUnmatchedStatement = [];
      remainingStatement.forEach(s => {
        const sAmt = Math.round(Number(s.amount) * 100);
        let bestMatch = null;
        let bestDiff = 999;

        eligibleLedger.forEach(l => {
          if (matchedLedgerIds.has(l.id)) return;
          const lAmt = Math.round(Number(l.amount) * 100);
          if (sAmt === lAmt && s.type === l.type) {
            const diff = getDaysDiff(s.date, l.date);
            if (diff <= dateTolerance && diff < bestDiff) {
              bestDiff = diff;
              bestMatch = l;
            }
          }
        });

        if (bestMatch) {
          matchedLedgerIds.add(bestMatch.id);
          const descSim = getSimilarityScore(s.name, bestMatch.note || bestMatch.category);
          matched.push({
            statementTx: s,
            ledgerTx: bestMatch,
            matchType: 'date_grace',
            confidence: Math.max(0.7, 0.95 - (bestDiff * 0.05) + (descSim * 0.05)),
            dateDiff: bestDiff
          });
        } else {
          stillUnmatchedStatement.push(s);
        }
      });

      // Pass 3: Fuzzy Description + Date Match Check for Discrepancies
      const finalUnmatchedStatement = [];
      stillUnmatchedStatement.forEach(s => {
        let candidateDiscrepancy = null;
        let highestSim = 0;

        eligibleLedger.forEach(l => {
          if (matchedLedgerIds.has(l.id)) return;
          if (s.type === l.type && getDaysDiff(s.date, l.date) <= dateTolerance) {
            const sim = getSimilarityScore(s.name, l.note || l.category);
            if (sim > 0.4 && sim > highestSim) {
              highestSim = sim;
              candidateDiscrepancy = l;
            }
          }
        });

        if (candidateDiscrepancy && highestSim > 0.4) {
          discrepancies.push({
            statementTx: s,
            candidateLedgerTx: candidateDiscrepancy,
            similarity: highestSim,
            amountDiff: Math.abs(Number(s.amount) - Number(candidateDiscrepancy.amount)),
            reason: 'Amount mismatch with matching description & date'
          });
        } else {
          finalUnmatchedStatement.push(s);
        }
      });

      // Compute Unmatched in Ledger (Uncleared)
      const unmatchedLedger = eligibleLedger.filter(l => !matchedLedgerIds.has(l.id));

      // Calculate Financial Aggregates & Variances
      let stmtDebits = 0;
      let stmtCredits = 0;
      statementTxs.forEach(s => {
        const amt = Number(s.amount) || 0;
        if (s.type === 'out') stmtDebits += amt;
        else if (s.type === 'in') stmtCredits += amt;
      });

      let ledgerDebits = 0;
      let ledgerCredits = 0;
      eligibleLedger.forEach(l => {
        const amt = Number(l.amount) || 0;
        if (l.type === 'out') ledgerDebits += amt;
        else if (l.type === 'in') ledgerCredits += amt;
      });

      const stmtNet = stmtCredits - stmtDebits;
      const ledgerNet = ledgerCredits - ledgerDebits;
      const variance = Math.abs(stmtNet - ledgerNet);

      const totalStmt = statementTxs.length;
      const reconciliationRate = totalStmt > 0 ? Math.round((matched.length / totalStmt) * 100) : 100;

      return {
        matched,
        unmatchedStatement: finalUnmatchedStatement,
        unmatchedLedger,
        discrepancies,
        summary: {
          totalStatementTransactions: totalStmt,
          matchedCount: matched.length,
          unmatchedStatementCount: finalUnmatchedStatement.length,
          unmatchedLedgerCount: unmatchedLedger.length,
          discrepancyCount: discrepancies.length,
          reconciliationRate,
          statementDebits: stmtDebits,
          statementCredits: stmtCredits,
          statementNet: stmtNet,
          ledgerDebits,
          ledgerCredits,
          ledgerNet,
          variance
        }
      };
    },

    /* ── Apply Batch Reconciliation Stamps to Matched Ledger Transactions ── */
    async applyReconciliation(matchedPairs = [], batchId = '') {
      if (!Array.isArray(matchedPairs) || matchedPairs.length === 0) return 0;
      const bId = batchId || 'rec_batch_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now();
      const reconciledAt = new Date().toISOString();
      let updatedCount = 0;

      for (const pair of matchedPairs) {
        const lTx = pair.ledgerTx;
        if (!lTx) continue;

        lTx.reconciled = true;
        lTx.reconciledAt = reconciledAt;
        lTx.reconciliationBatchId = bId;
        lTx.statementRefNo = pair.statementTx?.refNo || pair.statementTx?.id || '';

        if (typeof window !== 'undefined' && typeof window.put === 'function') {
          await window.put('transactions', lTx);
          updatedCount++;
        }
      }

      // Broadcast update across tabs
      if (typeof window !== 'undefined' && window.LM_Bus) {
        window.LM_Bus.broadcast('lm:data:changed', { store: 'transactions', action: 'reconcile', batchId: bId });
      }

      return updatedCount;
    },

    /* ── 1-Click Import of Unmatched Statement Transactions into Ledger ── */
    async importMissingToLedger(unmatchedStatementTxs = [], defaultAccount = 'Bank Account') {
      if (!Array.isArray(unmatchedStatementTxs) || unmatchedStatementTxs.length === 0) return [];
      const imported = [];
      const now = new Date().toISOString();

      for (const s of unmatchedStatementTxs) {
        const newTx = {
          id: 'tx_rec_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36),
          date: s.date || now.slice(0, 10),
          amount: Number(s.amount) || 0,
          type: s.type || 'out',
          account: s.account || defaultAccount,
          category: s.category || 'Other',
          note: s.name || s.rawDescription || 'Imported from Bank Statement',
          refNo: s.refNo || '',
          reconciled: true,
          reconciledAt: now,
          source: 'reconciliation_import',
          createdAt: now
        };

        if (typeof window !== 'undefined' && typeof window.put === 'function') {
          await window.put('transactions', newTx);
          if (window.state && Array.isArray(window.state.transactions)) {
            window.state.transactions.push(newTx);
          }
        }
        imported.push(newTx);
      }

      // Broadcast update across tabs
      if (typeof window !== 'undefined' && window.LM_Bus) {
        window.LM_Bus.broadcast('lm:data:changed', { store: 'transactions', action: 'import_reconciled', count: imported.length });
      }

      return imported;
    }
  };

  // Browser global
  if (typeof window !== 'undefined') {
    window.LM_ReconciliationEngine = ReconciliationEngine;
  }

  // Node export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ReconciliationEngine;
  }
})();
