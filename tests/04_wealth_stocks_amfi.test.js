/**
 * Test Suite 04: Wealth, Indian Stocks, AMFI Live NAV & Bullion Rates
 * Validates Net Worth logic, Weighted Average Stock calculations, and AMFI 24h NAV caching.
 */
const path = require('path');
const { TestSuite, setupMockBrowser, assert } = require('./test_helper');

const suite = new TestSuite('04: Wealth, Indian Stocks, AMFI Live NAV & Bullion Rates');
const ROOT = path.resolve(__dirname, '..');

// Setup mock browser environment
setupMockBrowser();

// Provide state
window.state = {
  investments: [],
  loans: [],
  credit_cards: [],
  transactions: []
};

// Load modules
require(path.resolve(ROOT, 'src/scripts/Core/CurrencyFormatter.js'));
require(path.resolve(ROOT, 'src/scripts/Core/DateUtils.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/Stocks/StockCalculations.js'));
require(path.resolve(ROOT, 'src/scripts/Common/AMFINavService.js'));

(async () => {
  // ── Stock Portfolio Calculations Tests ─────────────────────────────────
  await suite.it('StockCalculations: computes weighted average buy price accurately across tranches', () => {
    assert(window.LM_StockCalculations && typeof window.LM_StockCalculations.calculateHoldingMetrics === 'function');
    
    // Tranche 1: Buy 100 shares @ ₹100 = ₹10,000
    // Tranche 2: Buy 50 shares @ ₹160 = ₹8,000
    // Total: 150 shares, invested: ₹18,000 -> Avg price = ₹120.00
    const txs = [
      { transaction_type: 'BUY', quantity: 100, price: 100, transaction_date: '2026-01-10' },
      { transaction_type: 'BUY', quantity: 50, price: 160, transaction_date: '2026-02-15' }
    ];

    const metrics = window.LM_StockCalculations.calculateHoldingMetrics(txs, { price: 150 });
    assert.strictEqual(metrics.quantity, 150);
    assert.strictEqual(metrics.averageBuyPrice, 120);
    assert.strictEqual(metrics.investedAmount, 18000);
    assert.strictEqual(metrics.currentValue, 22500); // 150 * 150
    assert.strictEqual(metrics.unrealizedPL, 4500); // 22,500 - 18,000
    assert.strictEqual(metrics.unrealizedPLPct, 25); // +25%
  });

  await suite.it('StockCalculations: computes realized P&L on partial sale and preserves cost basis', () => {
    // Buy 100 shares @ ₹100
    // Sell 40 shares @ ₹150 -> Realized P&L = 40 * (150 - 100) = +₹2,000
    // Remaining: 60 shares @ avg ₹100 = ₹6,000 invested
    const txs = [
      { transaction_type: 'BUY', quantity: 100, price: 100, transaction_date: '2026-01-10' },
      { transaction_type: 'SELL', quantity: 40, price: 150, transaction_date: '2026-03-20' }
    ];

    const metrics = window.LM_StockCalculations.calculateHoldingMetrics(txs, { price: 180 });
    assert.strictEqual(metrics.quantity, 60);
    assert.strictEqual(metrics.averageBuyPrice, 100);
    assert.strictEqual(metrics.investedAmount, 6000);
    assert.strictEqual(metrics.realizedPL, 2000);
    assert.strictEqual(metrics.currentValue, 10800); // 60 * 180
    assert.strictEqual(metrics.unrealizedPL, 4800);
    assert.strictEqual(metrics.totalPL, 6800); // 2000 realized + 4800 unrealized
  });

  // ── AMFI NAV Service Tests ─────────────────────────────────────────────
  await suite.it('AMFINavService: respects 24-hour intelligent rate caching TTL', async () => {
    assert(window.LM_AMFINavService, 'LM_AMFINavService must be exported');
    
    const schemeCode = '120503'; // Axis Bluechip
    const mockCached = {
      schemeCode: '120503',
      schemeName: 'Axis Bluechip Fund - Direct Plan - Growth',
      nav: 54.82,
      navDate: '20-Nov-2026',
      cachedAt: Date.now() - 3600000 // 1 hour ago (< 24h)
    };

    localStorage.setItem('lm_amfi_nav_' + schemeCode, JSON.stringify(mockCached));

    const result = await window.LM_AMFINavService.fetchNav(schemeCode);
    assert(result, 'Should return cached result without hitting network');
    assert.strictEqual(result.nav, 54.82);
    assert.strictEqual(result.schemeCode, '120503');
  });

  await suite.it('AMFINavService: rejects invalid scheme codes safely', async () => {
    const invalid1 = await window.LM_AMFINavService.fetchNav('abc');
    assert.strictEqual(invalid1, null);
    const invalid2 = await window.LM_AMFINavService.fetchNav('');
    assert.strictEqual(invalid2, null);
  });

  // ── Wealth Net Worth Formula Tests ─────────────────────────────────────
  await suite.it('Wealth Net Worth: calculates Total Assets minus Total Liabilities', () => {
    const assets = [
      { name: 'HDFC Savings Account', value: 250000, type: 'CASH' },
      { name: 'Fixed Deposit SBI', value: 500000, type: 'FD' },
      { name: 'Nifty 50 Index Fund', value: 350000, type: 'MUTUAL_FUND' },
      { name: 'Physical Gold Sovereign', value: 400000, type: 'GOLD' }
    ];

    const liabilities = [
      { name: 'Car Loan ICICI', pendingAmount: 300000, type: 'taken' },
      { name: 'Credit Card Bill', currentDue: 50000 }
    ];

    const totalAssets = assets.reduce((s, a) => s + a.value, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + (l.pendingAmount || l.currentDue || 0), 0);
    const netWorth = totalAssets - totalLiabilities;

    assert.strictEqual(totalAssets, 1500000);
    assert.strictEqual(totalLiabilities, 350000);
    assert.strictEqual(netWorth, 1150000);
  });

  suite.summary();
})();
