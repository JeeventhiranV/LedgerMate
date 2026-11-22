/**
 * Test Suite 03: Credit Cards, Grace Period Arbitrage, and Unified Dues Timeline
 * Validates CreditCardsService, CardOptimizer, and UnifiedDuesTimeline.
 */
const path = require('path');
const { TestSuite, setupMockBrowser, assert } = require('./test_helper');

const suite = new TestSuite('03: Credit Cards, Grace Period Arbitrage, and Unified Dues Timeline');
const ROOT = path.resolve(__dirname, '..');

// Setup mock browser environment
setupMockBrowser();

// Provide state object on window
window.state = {
  credit_cards: [],
  reminders: [],
  loans: [],
  transactions: []
};

// Load modules
require(path.resolve(ROOT, 'src/scripts/Core/CurrencyFormatter.js'));
require(path.resolve(ROOT, 'src/scripts/Core/DateUtils.js'));
require(path.resolve(ROOT, 'src/scripts/Core/AppBus.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/CreditCards/CreditCardsService.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/CreditCards/CardOptimizer.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/UnifiedDuesTimeline.js'));

(async () => {
  // ── CreditCardsService Tests ───────────────────────────────────────────
  await suite.it('CreditCardsService: initializes and handles addCard and card countdown', async () => {
    assert(window.LM_CreditCardsService, 'CreditCardsService must be exported');
    
    const testCard = {
      id: 'cc_hdfc_regalia',
      card_name: 'Regalia Gold',
      bank_name: 'HDFC Bank',
      credit_limit: 300000,
      current_due: 45000,
      statement_day: 15,
      due_day: 5,
      perks: ['Dining 5X', 'Flights 10X']
    };

    await window.LM_CreditCardsService.addCard(testCard);
    const retrieved = window.LM_CreditCardsService.getCardById('cc_hdfc_regalia');
    assert(retrieved, 'Card should be found by id');
    assert.strictEqual(retrieved.current_due, 45000);
    assert.strictEqual(retrieved.credit_limit, 300000);

    // Check utilization calculation
    const util = (retrieved.current_due / retrieved.credit_limit) * 100;
    assert.strictEqual(util, 15); // 15% utilization (safe threshold)

    // Due countdown check
    const countdown = window.LM_CreditCardsService.getDueCountdown(retrieved);
    assert(countdown.nextDueDate, 'Next due date should be calculated');
    assert(typeof countdown.daysUntilDue === 'number', 'Days until due should be a number');
  });

  await suite.it('CreditCardsService: getPendingCards filters only cards with outstanding dues', async () => {
    const paidCard = {
      id: 'cc_icici_amazon',
      card_name: 'Amazon Pay ICICI',
      bank_name: 'ICICI Bank',
      credit_limit: 150000,
      current_due: 0,
      due_day: 10
    };
    await window.LM_CreditCardsService.addCard(paidCard);

    const pending = window.LM_CreditCardsService.getPendingCards();
    assert(pending.some(c => c.id === 'cc_hdfc_regalia'), 'Card with 45000 due must be in pending');
    assert(!pending.some(c => c.id === 'cc_icici_amazon'), 'Card with 0 due must NOT be in pending');

    const summary = window.LM_CreditCardsService.getPendingSummary();
    assert.strictEqual(summary.pendingCount, 1);
    assert.strictEqual(summary.totalPendingDue, 45000);
  });

  // ── CardOptimizer Tests ────────────────────────────────────────────────
  await suite.it('CardOptimizer: computes interest-free grace days remaining up to 50 days', () => {
    assert(window.LM_CardOptimizer && typeof window.LM_CardOptimizer.calculateRemainingGraceDays === 'function');
    
    // Test grace days calculation
    const graceDays = window.LM_CardOptimizer.calculateRemainingGraceDays(15, 5);
    assert(typeof graceDays === 'number', 'Grace days should be a number');
    assert(graceDays >= 15 && graceDays <= 55, `Grace days ${graceDays} should be in realistic grace range`);
  });

  await suite.it('CardOptimizer: recommends best card for merchant category reward', () => {
    assert(typeof window.LM_CardOptimizer.getBestCardForCategory === 'function');
    
    const cards = [
      {
        id: 'c1',
        card_name: 'HDFC Millennia',
        notes: '5% cashback on Amazon, Flipkart, Myntra, Swiggy, Zomato',
        statement_day: 1,
        due_day: 20
      },
      {
        id: 'c2',
        card_name: 'SBI BPCL Octane',
        notes: '7.25% value back on BPCL fuel petrol pump stations',
        statement_day: 15,
        due_day: 5
      }
    ];

    const bestFood = window.LM_CardOptimizer.getBestCardForCategory('Dining', cards);
    assert(bestFood && bestFood.card, 'Should recommend a card for Dining');
    assert(bestFood.card.card_name.includes('Millennia'), 'Millennia should win for Dining/Swiggy');

    const bestFuel = window.LM_CardOptimizer.getBestCardForCategory('Fuel', cards);
    assert(bestFuel && bestFuel.card, 'Should recommend a card for Fuel');
    assert(bestFuel.card.card_name.includes('BPCL'), 'BPCL Octane should win for Fuel');
  });

  // ── UnifiedDuesTimeline Tests ──────────────────────────────────────────
  await suite.it('UnifiedDuesTimeline: aggregates upcoming dues across credit cards, reminders, and loans', () => {
    assert(window.LM_UnifiedDues && typeof window.LM_UnifiedDues.getUpcomingDues === 'function');
    
    window.state.credit_cards = [
      { id: 'c1', name: 'Axis Bank Atlas', statementDue: 18500, dueDay: 18 }
    ];
    window.state.reminders = [
      { id: 'r1', title: 'Airtel Broadband Fiber', amount: 1179, dueDate: new Date(Date.now() + 3 * 86400000).toISOString(), paid: false }
    ];

    const dues = window.LM_UnifiedDues.getUpcomingDues(30);
    assert(Array.isArray(dues), 'getUpcomingDues must return an array');
    assert(dues.length >= 2, `Expected at least 2 dues, got ${dues.length}`);
    
    const ccDue = dues.find(d => d.type === 'Credit Card');
    const remDue = dues.find(d => d.type.includes('Bill'));
    assert(ccDue && ccDue.amount === 18500, 'CC due should be 18500');
    assert(remDue && remDue.amount === 1179, 'Reminder due should be 1179');
  });

  suite.summary();
})();
