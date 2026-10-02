/**
 * LedgerMate – CardOptimizer.js
 * ─────────────────────────────────────────────────────────────
 * Smart Credit Card Grace Period Arbitrage & Reward Points Maximizer.
 * Recommends which credit card to swipe today based on billing cycle dates,
 * remaining interest-free grace days (up to 50 days), and category reward multipliers.
 * Exposes: window.LM_CardOptimizer
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  /**
   * Calculate interest-free days remaining for a card given statement billing day & due day
   * @param {number} billingDay - Day of the month billing statement generates (1-31)
   * @param {number} dueDay - Day of the month payment is due (1-31)
   * @returns {number} Days of interest-free credit remaining if swiped today
   */
  function calculateRemainingGraceDays(billingDay, dueDay) {
    if (!billingDay) return 30; // fallback standard

    const today = new Date();
    const curDate = today.getDate();
    let nextStatementDate = new Date(today.getFullYear(), today.getMonth(), billingDay);

    if (curDate >= billingDay) {
      nextStatementDate = new Date(today.getFullYear(), today.getMonth() + 1, billingDay);
    }

    let dueDate = new Date(nextStatementDate.getFullYear(), nextStatementDate.getMonth(), dueDay || (billingDay + 20));
    if (dueDay < billingDay) {
      dueDate = new Date(nextStatementDate.getFullYear(), nextStatementDate.getMonth() + 1, dueDay);
    }

    const diffMs = dueDate.getTime() - today.getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Find the optimal credit card for a specific spend category
   * @param {string} category - Spend category (e.g. Dining, Fuel, Travel, Online)
   * @param {Array} cardsList - Array of user credit cards
   */
  function getBestCardForCategory(category, cardsList) {
    const cards = cardsList || (window.state && window.state.credit_cards) || [];
    if (!cards.length) return null;

    const scored = cards.map(c => {
      const graceDays = calculateRemainingGraceDays(parseInt(c.billingDay || c.statementDate || 1), parseInt(c.dueDay || c.dueDate || 20));
      let rewardMultiplier = 1.0;
      const catLower = (category || '').toLowerCase();

      // Check card custom reward perks
      const nameLower = (c.cardName || c.name || '').toLowerCase();
      if (/fuel|hpcl|bpcl|ioc/i.test(nameLower) && /fuel/i.test(catLower)) rewardMultiplier = 4.0;
      else if (/swiggy|zomato|dining|eats/i.test(nameLower) && /food|dining/i.test(catLower)) rewardMultiplier = 5.0;
      else if (/amazon|flipkart|online/i.test(nameLower) && /shopping/i.test(catLower)) rewardMultiplier = 3.5;
      else if (/travel|miles|vistara|air/i.test(nameLower) && /travel|flight/i.test(catLower)) rewardMultiplier = 4.5;
      else if (/cashback/i.test(nameLower)) rewardMultiplier = 2.0;

      // Score = Reward Multiplier * 20 + Grace Days Remaining
      const score = (rewardMultiplier * 25) + graceDays;

      return {
        card: c,
        graceDays,
        rewardMultiplier,
        score
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0];
  }

  /**
   * UI Card Recommendation Widget (Renders on Dashboard & Credit Card page)
   */
  function renderCardRecommendationWidget(containerId = 'cardOptimizerWidgetWrap') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cards = (window.state && window.state.credit_cards) || [];
    if (!cards.length) {
      container.innerHTML = `
        <div style="background:rgba(255,255,255,0.02);border:1px dashed var(--border,#262f45);border-radius:12px;padding:12px;text-align:center;font-size:11px;color:var(--text-3,#8896b8);">
          💳 Add credit cards in Credit Cards module to get instant grace period & cashback recommendations.
        </div>
      `;
      return;
    }

    const bestDining = getBestCardForCategory('Dining', cards);
    const bestFuel = getBestCardForCategory('Fuel', cards);
    const bestShopping = getBestCardForCategory('Shopping', cards);
    const maxGraceCard = cards.map(c => ({
      card: c,
      days: calculateRemainingGraceDays(parseInt(c.billingDay || 1), parseInt(c.dueDay || 20))
    })).sort((a, b) => b.days - a.days)[0];

    container.innerHTML = `
      <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(79,142,247,0.05));border:1px solid rgba(16,185,129,0.25);border-radius:14px;padding:14px;color:var(--text,#f1f4fd);font-family:Inter,-apple-system,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:16px;">💡</span>
            <span style="font-size:12px;font-weight:700;">Smart Card Recommendations Today</span>
          </div>
          <span style="font-size:10px;background:rgba(16,185,129,0.2);color:#10b981;padding:2px 8px;border-radius:10px;font-weight:700;">0% Interest Arbitrage</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:8px;font-size:11px;">
          <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border,#262f45);border-radius:8px;padding:8px 10px;">
            <div style="color:var(--text-3,#8896b8);font-size:9px;">Longest Grace Period:</div>
            <strong style="color:#10b981;font-size:12px;">${maxGraceCard?.card?.cardName || 'Card'}</strong>
            <div style="font-size:10px;color:#f59e0b;font-weight:600;">⚡ ${maxGraceCard?.days} Days Interest-Free</div>
          </div>
          <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border,#262f45);border-radius:8px;padding:8px 10px;">
            <div style="color:var(--text-3,#8896b8);font-size:9px;">Best for Food & Dining:</div>
            <strong style="color:#4f8ef7;font-size:12px;">${bestDining?.card?.cardName || 'Card'}</strong>
            <div style="font-size:10px;color:#10b981;font-weight:600;">✨ ${bestDining?.rewardMultiplier}x Rewards (${bestDining?.graceDays}d)</div>
          </div>
          <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border,#262f45);border-radius:8px;padding:8px 10px;">
            <div style="color:var(--text-3,#8896b8);font-size:9px;">Best for Shopping / Fuel:</div>
            <strong style="color:#a855f7;font-size:12px;">${bestShopping?.card?.cardName || 'Card'}</strong>
            <div style="font-size:10px;color:#10b981;font-weight:600;">🛍️ ${bestShopping?.rewardMultiplier}x Points</div>
          </div>
        </div>
      </div>
    `;
  }

  window.LM_CardOptimizer = {
    calculateRemainingGraceDays,
    getBestCardForCategory,
    renderCardRecommendationWidget
  };

  console.log('[LM] CardOptimizer module initialized.');
})();
