/**
 * LedgerMate – BestCardEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Credit Card Grace Period & Cycle Optimizer.
 * Analyzes active cards and calculates which card provides the maximum
 * interest-free credit window starting today.
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  function getBestCardToday() {
    const cards = (window.state && Array.isArray(window.state.credit_cards))
      ? window.state.credit_cards
      : ((window.LM_CreditCardsService && typeof window.LM_CreditCardsService.getCards === 'function')
          ? window.LM_CreditCardsService.getCards()
          : []);

    if (!cards || !cards.length) return null;

    const today = new Date();
    const currentDay = today.getDate();

    let bestCard = null;
    let maxGraceDays = -1;

    const evaluatedCards = cards.map(c => {
      const stmtDay = parseInt(c.statementDate || c.statementDay || 15, 10);
      const dueDay = parseInt(c.dueDate || c.dueDay || (stmtDay > 10 ? stmtDay - 10 : stmtDay + 20), 10);

      // Estimate grace days:
      // If purchase made today:
      // When does the next statement generate?
      let daysUntilNextStatement = 0;
      if (currentDay > stmtDay) {
        // Next statement is next month
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        daysUntilNextStatement = (daysInMonth - currentDay) + stmtDay;
      } else {
        // Next statement is later this month
        daysUntilNextStatement = stmtDay - currentDay;
      }

      // Standard payment window after statement generation is ~18–22 days
      const paymentWindow = 20;
      const totalGraceDays = daysUntilNextStatement + paymentWindow;

      if (totalGraceDays > maxGraceDays) {
        maxGraceDays = totalGraceDays;
        bestCard = {
          card: c,
          graceDays: totalGraceDays,
          nextStatementDay: stmtDay
        };
      }

      return {
        card: c,
        graceDays: totalGraceDays,
        nextStatementDay: stmtDay
      };
    });

    return {
      best: bestCard,
      all: evaluatedCards
    };
  }

  function render(containerId = 'bestCardBannerWrap') {
    let wrap = document.getElementById(containerId);
    if (!wrap) {
      const targetParent = document.getElementById('creditCardsContainer') || document.getElementById('ccSummarySection');
      if (!targetParent) return;
      wrap = document.createElement('div');
      wrap.id = containerId;
      wrap.style.marginBottom = '14px';
      targetParent.prepend(wrap);
    }

    const result = getBestCardToday();
    if (!result || !result.best) {
      wrap.innerHTML = '';
      return;
    }

    const { card, graceDays, nextStatementDay } = result.best;
    const cardTitle = card.name || card.cardName || `${card.bank || 'Credit'} Card`;

    wrap.innerHTML = `
      <div style="background:linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.06));border:1px solid rgba(16,185,129,0.25);border-radius:14px;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:38px;height:38px;border-radius:10px;background:#10b981;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;">💳</div>
          <div>
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.5px;">Best Card To Use Today</span>
              <span style="font-size:10px;padding:1px 6px;border-radius:6px;background:rgba(16,185,129,0.2);color:#10b981;font-weight:600;">Max Grace</span>
            </div>
            <div style="font-size:14px;font-weight:700;color:var(--text,#f8fafc);margin-top:2px;">
              ${cardTitle} — <span style="color:#00f0ff;">${graceDays} Days Interest-Free</span>
            </div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text-3,#94a3b8);text-align:right;">
          Statement closes on <strong>${nextStatementDay}th</strong>
        </div>
      </div>
    `;
  }

  window.LM_BestCardEngine = {
    getBestCardToday,
    render
  };

  if (window.LM_Bus) {
    LM_Bus.on('lm:data:changed', function () {
      setTimeout(render, 400);
    });
  }

})();
