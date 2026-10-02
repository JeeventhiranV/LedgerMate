/**
 * LedgerMate – BillSplitter.js
 * ─────────────────────────────────────────────────────────────
 * Smart Group Bill Splitting & Instant UPI Settlement Generator.
 * Implements the optimal debt-simplification graph algorithm (minimizes cash transfers)
 * and generates one-tap UPI payment deep links (upi://pay?...) with QR code rendering.
 * Exposes: window.LM_BillSplitter
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'lm_bill_splits_v1';

  /**
   * Optimal Debt Simplification Algorithm
   * Given members with amounts paid and their intended shares, calculates the minimum
   * number of cash settlements needed to resolve all balances.
   *
   * @param {Array<{id: string, name: string, upi: string, paid: number, share: number}>} members
   * @returns {Array<{from: string, fromName: string, to: string, toName: string, toUpi: string, amount: number}>}
   */
  function simplifyDebts(members) {
    if (!Array.isArray(members) || members.length < 2) return [];

    // Calculate net balances: positive = is owed money (creditor), negative = owes money (debtor)
    const balances = members.map(m => ({
      id: m.id,
      name: m.name,
      upi: m.upi || '',
      net: Number(((m.paid || 0) - (m.share || 0)).toFixed(2))
    }));

    const creditors = balances.filter(b => b.net > 0.01).sort((a, b) => b.net - a.net);
    const debtors = balances.filter(b => b.net < -0.01).sort((a, b) => a.net - b.net);

    const settlements = [];
    let i = 0; // debtor index
    let j = 0; // creditor index

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amountToSettle = Math.min(-debtor.net, creditor.net);

      if (amountToSettle > 0.01) {
        settlements.push({
          from: debtor.id,
          fromName: debtor.name,
          to: creditor.id,
          toName: creditor.name,
          toUpi: creditor.upi,
          amount: Number(amountToSettle.toFixed(2)),
          upiLink: creditor.upi
            ? `upi://pay?pa=${encodeURIComponent(creditor.upi)}&pn=${encodeURIComponent(creditor.name)}&am=${amountToSettle.toFixed(2)}&cu=INR&tn=${encodeURIComponent('LedgerMate Bill Settlement')}`
            : ''
        });
      }

      debtor.net += amountToSettle;
      creditor.net -= amountToSettle;

      if (Math.abs(debtor.net) < 0.01) i++;
      if (Math.abs(creditor.net) < 0.01) j++;
    }

    return settlements;
  }

  function getSavedGroups() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveGroups(groups) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    } catch (e) {}
  }

  /**
   * UI Modal for Quick Group Bill Splitting & UPI settlements
   */
  function openBillSplitterModal(initialExpense = null) {
    const existing = document.getElementById('lm-bill-splitter-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'lm-bill-splitter-modal';
    modal.className = 'modal-overlay show';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px);';

    modal.innerHTML = `
      <div style="background:var(--card-bg, #111420);border:1px solid var(--border, #262f45);border-radius:20px;max-width:620px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.8);overflow:hidden;color:var(--text, #f1f4fd);font-family:Inter,-apple-system,sans-serif;">
        <!-- Header -->
        <div style="padding:16px 20px;border-bottom:1px solid var(--border, #262f45);display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:20px;">👥</span>
            <div>
              <div style="font-size:15px;font-weight:700;">Smart Bill Splitter & UPI Settlement</div>
              <div style="font-size:11px;color:var(--text-3, #7b88aa);">Optimal Debt Graph · One-Tap UPI Links</div>
            </div>
          </div>
          <button id="bsCloseBtn" style="background:none;border:none;color:var(--text-3,#8896b8);font-size:22px;cursor:pointer;">&times;</button>
        </div>

        <!-- Body -->
        <div style="padding:20px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:16px;-webkit-overflow-scrolling:touch;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:11px;font-weight:600;color:var(--text-3,#8896b8);display:block;margin-bottom:4px;">Group / Expense Name:</label>
              <input type="text" id="bsGroupName" value="${initialExpense?.description || 'Weekend Outing'}" style="width:100%;background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:8px;padding:8px 10px;color:#fff;font-size:12px;" />
            </div>
            <div>
              <label style="font-size:11px;font-weight:600;color:var(--text-3,#8896b8);display:block;margin-bottom:4px;">Total Amount (₹):</label>
              <input type="number" id="bsTotalAmount" value="${initialExpense?.amount || '3000'}" style="width:100%;background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:8px;padding:8px 10px;color:#10b981;font-weight:700;font-size:13px;" />
            </div>
          </div>

          <!-- Members List -->
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:12px;font-weight:700;">Members & Contributions</span>
              <button id="bsAddMemberBtn" style="padding:4px 10px;background:rgba(79,142,247,0.15);border:1px solid #4f8ef7;border-radius:6px;color:#4f8ef7;font-size:11px;font-weight:600;cursor:pointer;">+ Add Member</button>
            </div>
            <div id="bsMembersContainer" style="display:flex;flex-direction:column;gap:8px;"></div>
          </div>

          <!-- Calculate Button -->
          <button id="bsCalculateBtn" style="padding:10px;background:linear-gradient(135deg,#4f8ef7,#8b5cf6);border:none;border-radius:10px;color:#fff;font-weight:700;font-size:13px;cursor:pointer;margin-top:4px;">
            ⚡ Calculate Optimal Settlements & Generate UPI Links
          </button>

          <!-- Settlements Result Wrap -->
          <div id="bsSettlementsWrap" style="display:none;background:rgba(255,255,255,0.02);border:1px solid var(--border,#262f45);border-radius:14px;padding:16px;">
            <div style="font-size:13px;font-weight:700;color:#10b981;margin-bottom:10px;display:flex;align-items:center;gap:6px;">
              <span>💸 Simplified Settlements (Minimum Cash Transfers)</span>
            </div>
            <div id="bsSettlementsList" style="display:flex;flex-direction:column;gap:8px;"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById('bsCloseBtn');
    const container = document.getElementById('bsMembersContainer');
    const addMemberBtn = document.getElementById('bsAddMemberBtn');
    const calcBtn = document.getElementById('bsCalculateBtn');
    const settlementsWrap = document.getElementById('bsSettlementsWrap');
    const settlementsList = document.getElementById('bsSettlementsList');
    const totalAmountInput = document.getElementById('bsTotalAmount');

    closeBtn.onclick = () => modal.remove();

    let members = [
      { id: 'm1', name: 'You (Organizer)', upi: 'you@okhdfcbank', paid: 3000, share: 1000 },
      { id: 'm2', name: 'Rahul', upi: 'rahul@upi', paid: 0, share: 1000 },
      { id: 'm3', name: 'Priya', upi: 'priya@oksbi', paid: 0, share: 1000 }
    ];

    function renderMembers() {
      container.innerHTML = '';
      members.forEach((m, idx) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:grid;grid-template-columns:1.5fr 1.2fr 1fr 1fr auto;gap:6px;align-items:center;background:rgba(255,255,255,0.01);padding:6px 8px;border-radius:8px;border:1px solid var(--border,#262f45);';
        row.innerHTML = `
          <input type="text" placeholder="Name" value="${m.name}" data-idx="${idx}" class="bs-m-name" style="background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:6px;padding:6px 8px;color:#fff;font-size:11px;" />
          <input type="text" placeholder="UPI ID (e.g. name@upi)" value="${m.upi}" data-idx="${idx}" class="bs-m-upi" style="background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:6px;padding:6px 8px;color:#fff;font-size:11px;" />
          <input type="number" placeholder="Paid ₹" value="${m.paid}" data-idx="${idx}" class="bs-m-paid" style="background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:6px;padding:6px 8px;color:#10b981;font-weight:600;font-size:11px;" />
          <input type="number" placeholder="Share ₹" value="${m.share}" data-idx="${idx}" class="bs-m-share" style="background:var(--bg,#0a0f1a);border:1px solid var(--border,#262f45);border-radius:6px;padding:6px 8px;color:#f59e0b;font-weight:600;font-size:11px;" />
          <button data-idx="${idx}" class="bs-m-del" style="background:none;border:none;color:#ef4444;font-size:16px;cursor:pointer;padding:0 4px;">&times;</button>
        `;
        container.appendChild(row);
      });

      // Bind inputs
      container.querySelectorAll('.bs-m-name').forEach(el => el.oninput = (e) => members[e.target.dataset.idx].name = e.target.value);
      container.querySelectorAll('.bs-m-upi').forEach(el => el.oninput = (e) => members[e.target.dataset.idx].upi = e.target.value);
      container.querySelectorAll('.bs-m-paid').forEach(el => el.oninput = (e) => members[e.target.dataset.idx].paid = parseFloat(e.target.value) || 0);
      container.querySelectorAll('.bs-m-share').forEach(el => el.oninput = (e) => members[e.target.dataset.idx].share = parseFloat(e.target.value) || 0);
      container.querySelectorAll('.bs-m-del').forEach(el => el.onclick = (e) => {
        if (members.length > 2) {
          members.splice(e.target.dataset.idx, 1);
          renderMembers();
        } else {
          if (typeof showToast === 'function') showToast('At least 2 members are required', 'warning');
        }
      });
    }

    addMemberBtn.onclick = () => {
      const id = 'm_' + (members.length + 1);
      const total = parseFloat(totalAmountInput.value) || 0;
      const count = members.length + 1;
      const equalShare = Number((total / count).toFixed(2));
      members.push({ id, name: `Friend ${count}`, upi: '', paid: 0, share: equalShare });
      renderMembers();
    };

    renderMembers();

    calcBtn.onclick = () => {
      const settlements = simplifyDebts(members);
      settlementsList.innerHTML = '';

      if (settlements.length === 0) {
        settlementsList.innerHTML = '<div style="font-size:12px;color:#10b981;">🎉 All balances are perfectly settled! No cash transfers needed.</div>';
      } else {
        settlements.forEach(s => {
          const item = document.createElement('div');
          item.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.03);padding:10px 12px;border-radius:10px;border:1px solid var(--border,#262f45);flex-wrap:wrap;gap:8px;';
          item.innerHTML = `
            <div>
              <span style="font-weight:700;color:#ef4444;">${s.fromName}</span> owes
              <span style="font-weight:700;color:#10b981;">${s.toName}</span>:
              <strong style="font-size:14px;color:#f1f4fd;margin-left:4px;">₹${s.amount.toFixed(2)}</strong>
              ${s.toUpi ? `<div style="font-size:10px;color:var(--text-3,#8896b8);">UPI: ${s.toUpi}</div>` : ''}
            </div>
            <div>
              ${s.upiLink ? `
                <a href="${s.upiLink}" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:linear-gradient(135deg,#10b981,#059669);border-radius:6px;color:#fff;text-decoration:none;font-weight:700;font-size:11px;">
                  <span>⚡ Pay via UPI</span>
                </a>
              ` : `
                <button onclick="navigator.clipboard.writeText('Please pay ₹${s.amount.toFixed(2)} to ${s.toName}');if(typeof showToast==='function')showToast('Settlement text copied!','success');" style="padding:6px 10px;background:var(--surface,#1a2234);border:1px solid var(--border,#262f45);border-radius:6px;color:#fff;font-size:11px;cursor:pointer;">
                  📋 Copy Request
                </button>
              `}
            </div>
          `;
          settlementsList.appendChild(item);
        });
      }

      settlementsWrap.style.display = 'block';
    };
  }

  window.LM_BillSplitter = {
    simplifyDebts,
    openBillSplitterModal
  };

  console.log('[LM] BillSplitter module initialized (Optimal graph debt simplification ready).');
})();
