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
   * Normalize card properties across variations
   */
  function _normalizeCard(card) {
    if (!card) return null;
    return {
      id: card.id,
      cardName: card.card_name || card.cardName || card.name || 'Credit Card',
      bankName: card.bank_name || card.bankName || card.bank || 'Bank',
      statementDay: parseInt(card.statement_day || card.billingDay || card.statementDate || 15, 10),
      dueDay: parseInt(card.due_day || card.dueDay || card.dueDate || 5, 10),
      creditLimit: Number(card.credit_limit || card.creditLimit || 0),
      currentDue: Number(card.current_due || card.currentDue || 0),
      availableLimit: Number(card.available_limit !== undefined ? card.available_limit : ((card.credit_limit || 0) - (card.current_due || 0))),
      colorTheme: card.color_theme || card.colorTheme || 'theme-midnight',
      notes: card.notes || '',
      perks: Array.isArray(card.perks) ? card.perks : (card.notes ? [card.notes] : []),
      raw: card
    };
  }

  /**
   * Calculate interest-free days remaining for a card given statement billing day & due day
   * @param {number} billingDay - Day of the month billing statement generates (1-31)
   * @param {number} dueDay - Day of the month payment is due (1-31)
   * @returns {number} Days of interest-free credit remaining if swiped today
   */
  function calculateRemainingGraceDays(billingDay, dueDay) {
    var bDay = Math.min(31, Math.max(1, parseInt(billingDay, 10) || 15));
    var dDay = Math.min(31, Math.max(1, parseInt(dueDay, 10) || 5));

    var today = new Date();
    var curYear = today.getFullYear();
    var curMonth = today.getMonth();
    var curDate = today.getDate();

    // Determine when a purchase made TODAY will generate its statement
    var targetStatementDate;
    if (curDate <= bDay) {
      // Swiped before or on statement day -> included in THIS month's statement
      targetStatementDate = new Date(curYear, curMonth, bDay);
    } else {
      // Swiped after statement day -> included in NEXT month's statement (MAX GRACE PERIOD!)
      targetStatementDate = new Date(curYear, curMonth + 1, bDay);
    }

    // Determine the due date corresponding to targetStatementDate
    var targetDueDate;
    if (dDay > bDay) {
      // Due day is later in the same month as statement (e.g. stmt 5th, due 25th)
      targetDueDate = new Date(targetStatementDate.getFullYear(), targetStatementDate.getMonth(), dDay);
    } else {
      // Due day is in the following month (e.g. stmt 15th, due 5th of next month)
      targetDueDate = new Date(targetStatementDate.getFullYear(), targetStatementDate.getMonth() + 1, dDay);
    }

    var startOfToday = new Date(curYear, curMonth, curDate);
    var diffMs = targetDueDate.getTime() - startOfToday.getTime();
    var diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(1, diffDays);
  }

  /**
   * Calculate category reward multiplier and perks evaluation for a given card
   */
  function evaluateCardCategoryReward(card, category) {
    var c = _normalizeCard(card);
    if (!c) return { multiplier: 1.0, perkDesc: '1x Base Rewards' };

    var cat = (category || '').toLowerCase();
    var nameLower = (c.cardName + ' ' + c.bankName + ' ' + (c.notes || '')).toLowerCase();
    var perksText = (c.perks || []).join(' ').toLowerCase();
    var combined = nameLower + ' ' + perksText;

    var multiplier = 1.0;
    var perkDesc = '1x Base Rewards';

    if (/food|dining|restaurant|eats|cafe/.test(cat)) {
      if (/swiggy|zomato/.test(combined)) {
        multiplier = 5.0; perkDesc = '5x Cashback on Food delivery';
      } else if (/millennia|regalia|infinia|amethyst/.test(combined)) {
        multiplier = 4.0; perkDesc = '4x Reward points on Dining';
      } else if (/sapphire|tata neu|cashback/.test(combined)) {
        multiplier = 3.0; perkDesc = '3x Rewards on Dining';
      } else {
        multiplier = 1.5; perkDesc = '1.5x Rewards';
      }
    } else if (/fuel|petrol|diesel|gas/.test(cat)) {
      if (/hpcl|bpcl|ioc|indianoil|fuel|octane/.test(combined)) {
        multiplier = 5.0; perkDesc = '5% Valueback + Fuel Surcharge Waiver';
      } else if (/cashback|millennia/.test(combined)) {
        multiplier = 2.0; perkDesc = 'Surcharge Waiver + 1% Back';
      } else {
        multiplier = 1.0; perkDesc = '1% Fuel Surcharge Waiver';
      }
    } else if (/shopping|online|ecommerce|retail|store/.test(cat)) {
      if (/amazon/.test(combined)) {
        multiplier = 5.0; perkDesc = '5% Unlimited Cashback on Amazon';
      } else if (/flipkart/.test(combined)) {
        multiplier = 5.0; perkDesc = '5% Unlimited Cashback on Flipkart';
      } else if (/millennia|simplyclick/.test(combined)) {
        multiplier = 5.0; perkDesc = '5% Cashback on Partner Merchants';
      } else if (/cashback|tata neu/.test(combined)) {
        multiplier = 5.0; perkDesc = '5% NeuCoins / Direct Cashback';
      } else if (/infinia|regalia|magnus|amex/.test(combined)) {
        multiplier = 3.5; perkDesc = 'Accelerated Online Reward Points';
      } else {
        multiplier = 2.0; perkDesc = '2x Online Shopping Points';
      }
    } else if (/travel|flight|hotel|holiday|vacation/.test(cat)) {
      if (/vistara|atlas|miles|air|infinia|magnus/.test(combined)) {
        multiplier = 5.0; perkDesc = '5x Travel Miles / Air Points';
      } else if (/regalia|platinum|amex/.test(combined)) {
        multiplier = 4.0; perkDesc = '4x Rewards on Flight/Hotel bookings';
      } else if (/lounge/.test(combined)) {
        multiplier = 3.0; perkDesc = 'Complimentary Lounge + Travel Rewards';
      } else {
        multiplier = 1.5; perkDesc = '1.5x Travel Points';
      }
    } else if (/groceries|supermarket|grocery|daily/.test(cat)) {
      if (/tata neu|blinkit|zepto|instamart/.test(combined)) {
        multiplier = 5.0; perkDesc = '5% Back on Grocery orders';
      } else if (/airtel|axis ace|cashback/.test(combined)) {
        multiplier = 4.0; perkDesc = '4% Cashback on Supermarkets';
      } else {
        multiplier = 2.0; perkDesc = '2x Grocery Points';
      }
    } else if (/utilities|bills|recharge|electricity|water/.test(cat)) {
      if (/airtel|ace|select/.test(combined)) {
        multiplier = 5.0; perkDesc = '5% Cashback on Utility Bills';
      } else if (/cashback/.test(combined)) {
        multiplier = 2.0; perkDesc = '2% Valueback on Utilities';
      } else {
        multiplier = 1.0; perkDesc = '1x Base Utility Points';
      }
    }

    return { multiplier: multiplier, perkDesc: perkDesc };
  }

  /**
   * Find the optimal credit card for a specific spend category
   * @param {string} category - Spend category (e.g. Dining, Fuel, Travel, Online)
   * @param {Array} cardsList - Array of user credit cards
   */
  function getBestCardForCategory(category, cardsList) {
    var rawCards = cardsList || (window.LM_CreditCardsService?.getAllCards?.()) || (window.state && window.state.credit_cards) || [];
    if (!rawCards.length) return null;

    var scored = rawCards.map(function (c) {
      var norm = _normalizeCard(c);
      var graceDays = calculateRemainingGraceDays(norm.statementDay, norm.dueDay);
      var evalReward = evaluateCardCategoryReward(norm, category);

      // Score = (Reward Multiplier * 20) + Grace Days Remaining + Available Limit factor
      var availRatio = norm.creditLimit > 0 ? (norm.availableLimit / norm.creditLimit) : 1;
      var score = (evalReward.multiplier * 22) + (graceDays * 1.1) + (availRatio * 10);

      return {
        card: norm.raw,
        normalized: norm,
        graceDays: graceDays,
        rewardMultiplier: evalReward.multiplier,
        perkDesc: evalReward.perkDesc,
        score: score
      };
    });

    scored.sort(function (a, b) { return b.score - a.score; });
    return scored[0] || null;
  }

  /**
   * Get recommendations across all major categories
   */
  function getAllCategoryRecommendations(cardsList) {
    var categories = ['Dining', 'Shopping', 'Fuel', 'Travel', 'Groceries', 'Utilities'];
    var results = {};
    categories.forEach(function (cat) {
      results[cat] = getBestCardForCategory(cat, cardsList);
    });
    return results;
  }

  /**
   * UI Card Recommendation Widget (Renders on Dashboard & Credit Card page)
   */
  function renderCardRecommendationWidget(containerId) {
    var targetId = containerId || 'cardOptimizerWidgetWrap';
    var container = document.getElementById(targetId);
    if (!container) return;

    var cards = (window.LM_CreditCardsService?.getAllCards?.()) || (window.state && window.state.credit_cards) || [];
    if (!cards.length) {
      container.innerHTML = `
        <div style="background:rgba(255,255,255,0.02);border:1px dashed var(--border,#262f45);border-radius:12px;padding:12px;text-align:center;font-size:11px;color:var(--text-3,#8896b8);">
          💳 Add credit cards in Credit Cards module to get instant grace period &amp; cashback recommendations.
        </div>
      `;
      return;
    }

    var bestDining = getBestCardForCategory('Dining', cards);
    var bestShopping = getBestCardForCategory('Shopping', cards);
    var bestFuel = getBestCardForCategory('Fuel', cards);

    var maxGraceCard = cards.map(function (c) {
      var norm = _normalizeCard(c);
      return {
        card: norm.raw,
        name: norm.cardName,
        days: calculateRemainingGraceDays(norm.statementDay, norm.dueDay)
      };
    }).sort(function (a, b) { return b.days - a.days; })[0];

    container.innerHTML = `
      <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08),rgba(79,142,247,0.05));border:1px solid rgba(16,185,129,0.25);border-radius:14px;padding:14px;color:var(--text,#f1f4fd);font-family:'Plus Jakarta Sans',Inter,-apple-system,sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:16px;">⚡</span>
            <span style="font-size:12px;font-weight:700;">Smart Card Recommendations Today</span>
          </div>
          <span style="font-size:10px;background:rgba(16,185,129,0.2);color:#10b981;padding:2px 8px;border-radius:10px;font-weight:700;">0% Interest Arbitrage</span>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:8px;font-size:11px;">
          <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border,#262f45);border-radius:10px;padding:10px;">
            <div style="color:var(--text-3,#8896b8);font-size:10px;">Longest Grace Period:</div>
            <strong style="color:#10b981;font-size:12.5px;display:block;margin:2px 0;">${maxGraceCard?.name || 'Card'}</strong>
            <div style="font-size:10.5px;color:#f59e0b;font-weight:600;">⚡ ${maxGraceCard?.days} Days Interest-Free</div>
          </div>
          <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border,#262f45);border-radius:10px;padding:10px;">
            <div style="color:var(--text-3,#8896b8);font-size:10px;">Best for Food &amp; Dining:</div>
            <strong style="color:#38bdf8;font-size:12.5px;display:block;margin:2px 0;">${bestDining?.normalized?.cardName || 'Card'}</strong>
            <div style="font-size:10.5px;color:#10b981;font-weight:600;">✨ ${bestDining?.perkDesc || 'Top Rewards'} (${bestDining?.graceDays}d)</div>
          </div>
          <div style="background:rgba(0,0,0,0.3);border:1px solid var(--border,#262f45);border-radius:10px;padding:10px;">
            <div style="color:var(--text-3,#8896b8);font-size:10px;">Best for Shopping:</div>
            <strong style="color:#c084fc;font-size:12.5px;display:block;margin:2px 0;">${bestShopping?.normalized?.cardName || 'Card'}</strong>
            <div style="font-size:10.5px;color:#10b981;font-weight:600;">🛍️ ${bestShopping?.perkDesc || 'Top Points'}</div>
          </div>
        </div>
      </div>
    `;
  }

  window.LM_CardOptimizer = {
    calculateRemainingGraceDays: calculateRemainingGraceDays,
    evaluateCardCategoryReward: evaluateCardCategoryReward,
    getBestCardForCategory: getBestCardForCategory,
    getAllCategoryRecommendations: getAllCategoryRecommendations,
    renderCardRecommendationWidget: renderCardRecommendationWidget
  };

  console.log('[LM] CardOptimizer upgraded with comprehensive arbitrage & normalized schema.');
})();
