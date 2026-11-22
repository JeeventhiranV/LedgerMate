/**
 * LedgerMate – UnifiedDuesTimeline.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified Upcoming Dues & Financial Commitments Timeline.
 * Aggregates credit card bills, loan EMIs, and utility reminders with 1-tap payment logging.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  function getUpcomingDues(daysAhead = 30) {
    const list = [];
    const now = new Date();
    const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    // 1. Credit Cards Statement Dues
    const cards = (window.state && Array.isArray(window.state.credit_cards)) ? window.state.credit_cards : [];
    for (const c of cards) {
      const dueAmt = parseFloat(c.statementDue) || parseFloat(c.currentBalance) || 0;
      if (dueAmt > 0) {
        let dueDate = null;
        if (c.paymentDueDate) {
          dueDate = new Date(c.paymentDueDate);
        } else {
          // Estimate due date based on dueDay
          const dueDay = parseInt(c.dueDay || c.dueDate || 5, 10);
          dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
          if (dueDate < now) {
            dueDate = new Date(now.getFullYear(), now.getMonth() + 1, dueDay);
          }
        }
        if (dueDate <= cutoff) {
          list.push({
            id: 'cc_' + (c.id || c.name),
            type: 'Credit Card',
            title: (c.name || 'Credit Card') + ' Bill Due',
            amount: dueAmt,
            dueDate: dueDate.toISOString(),
            icon: '💳',
            raw: c
          });
        }
      }
    }

    // 2. Reminders
    const reminders = (window.state && Array.isArray(window.state.reminders)) ? window.state.reminders : [];
    for (const r of reminders) {
      if (!r.paid && r.dueDate) {
        const d = new Date(r.dueDate);
        if (d <= cutoff) {
          list.push({
            id: 'rem_' + r.id,
            type: 'Bill / Utility',
            title: r.title || 'Bill Payment',
            amount: parseFloat(r.amount) || 0,
            dueDate: d.toISOString(),
            icon: '🔔',
            raw: r
          });
        }
      }
    }

    // 3. Loans & EMIs
    const loans = (window.state && Array.isArray(window.state.loans)) ? window.state.loans : [];
    for (const l of loans) {
      if (l.type === 'taken' && l.pendingAmount > 0 && l.nextDueDate) {
        const d = new Date(l.nextDueDate);
        if (d <= cutoff) {
          list.push({
            id: 'loan_' + l.id,
            type: 'Loan EMI',
            title: (l.borrower || 'Loan') + ' EMI Due',
            amount: parseFloat(l.emiAmount) || parseFloat(l.pendingAmount) || 0,
            dueDate: d.toISOString(),
            icon: '🏦',
            raw: l
          });
        }
      }
    }

    // Sort chronologically
    list.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    return list;
  }

  async function settleDue(id) {
    const dues = getUpcomingDues(60);
    const item = dues.find(d => d.id === id);
    if (!item) return;

    if (!confirm(`Mark "${item.title}" for ₹${item.amount.toLocaleString('en-IN')} as Paid and create transaction?`)) return;

    try {
      // 1. Create Transaction
      const newTx = {
        id: 'tx_due_' + Date.now(),
        title: item.title,
        amount: item.amount,
        type: 'expense',
        category: item.type === 'Credit Card' ? 'Credit Card' : (item.type === 'Loan EMI' ? 'Loan / EMI' : 'Utilities'),
        mode: item.type === 'Credit Card' ? 'Bank Transfer' : 'UPI',
        date: new Date().toISOString().slice(0, 10),
        notes: `Paid via Unified Dues Timeline (${item.type})`
      };

      if (typeof window.put === 'function') {
        await window.put('transactions', newTx);
      }
      if (window.state && Array.isArray(window.state.transactions)) {
        window.state.transactions.unshift(newTx);
      }

      // 2. Mark Reminder / Card paid
      if (item.type === 'Bill / Utility' && item.raw) {
        item.raw.paid = true;
        if (typeof window.put === 'function') await window.put('reminders', item.raw);
      }

      if (typeof showToast === 'function') {
        showToast(`✅ "${item.title}" marked as paid & transaction logged!`, 'success');
      }

      if (window.LM_Bus) {
        LM_Bus.emit('lm:data:changed', { store: 'transactions' });
      }

      if (typeof renderAll === 'function') renderAll();
      renderTimeline();
    } catch (e) {
      if (typeof showToast === 'function') showToast('❌ Settle failed: ' + e.message, 'error');
    }
  }

  function renderTimeline(containerId = 'duesTimelineContainer') {
    let wrap = document.getElementById(containerId);
    if (!wrap) return;

    const dues = getUpcomingDues(21);
    if (!dues.length) {
      wrap.innerHTML = `
        <div style="padding:18px;text-align:center;color:var(--text-3,#94a3b8);font-size:12px;">
          🎉 No pending dues or bill commitments in the next 21 days!
        </div>
      `;
      return;
    }

    const html = dues.map(d => {
      const dateObj = new Date(d.dueDate);
      const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
      const isOverdue = dateObj < new Date();
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--border2,rgba(255,255,255,0.06));gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="font-size:18px;">${d.icon}</div>
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--text,#f8fafc);">${d.title}</div>
              <div style="font-size:11px;color:${isOverdue ? '#fb7185' : 'var(--text-3,#94a3b8)'};">
                ${isOverdue ? '⚠️ Overdue since ' : 'Due on '}${dateStr}
              </div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:14px;font-weight:700;color:var(--text,#f8fafc);">₹${Math.round(d.amount).toLocaleString('en-IN')}</div>
            <button type="button" class="btn-submit" onclick="window.LM_UnifiedDues.settle('${d.id}')" style="padding:5px 10px;font-size:11px;border-radius:8px;background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);cursor:pointer;font-weight:600;">
              Pay Now
            </button>
          </div>
        </div>
      `;
    }).join('');

    wrap.innerHTML = html;
  }

  window.LM_UnifiedDues = {
    getUpcomingDues,
    settle: settleDue,
    render: renderTimeline
  };
  window.LM_UnifiedDuesTimeline = window.LM_UnifiedDues;

  if (window.LM_Bus) {
    LM_Bus.on('lm:data:changed', function () {
      setTimeout(renderTimeline, 500);
    });
  }

})();
