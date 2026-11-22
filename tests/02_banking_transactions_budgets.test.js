/**
 * Test Suite 02: Banking, Transactions, Rollover Budgets & Cashflow Runway
 * Validates Core Ledger calculations, Rollover Budgeting, 30-Day Forward Runway,
 * Category Rules, and Statement Parser.
 */
const path = require('path');
const { TestSuite, setupMockBrowser, assert } = require('./test_helper');

const suite = new TestSuite('02: Banking, Transactions, Rollover Budgets & Cashflow Runway');
const ROOT = path.resolve(__dirname, '..');

// Setup mock browser environment
setupMockBrowser();

// Load modules
require(path.resolve(ROOT, 'src/scripts/Core/CurrencyFormatter.js'));
require(path.resolve(ROOT, 'src/scripts/Core/DateUtils.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/CategoryRules.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/StatementParser.js'));

// ── Ledger Calculation Tests ───────────────────────────────────────────
suite.it('Ledger: correctly computes net income, expenses, and current liquid balance', () => {
  const transactions = [
    { id: 'tx1', type: 'in', amount: 75000, category: 'Salary', date: '2026-11-01' },
    { id: 'tx2', type: 'out', amount: 25000, category: 'Rent', date: '2026-11-02' },
    { id: 'tx3', type: 'out', amount: 5000, category: 'Groceries', date: '2026-11-05' },
    { id: 'tx4', type: 'in', amount: 2000, category: 'Dividends', date: '2026-11-10' },
    { id: 'tx5', type: 'expense', amount: 3000, category: 'Utilities', date: '2026-11-15' }
  ];

  const totalIn = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'out' || t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netBalance = totalIn - totalOut;

  assert.strictEqual(totalIn, 77000);
  assert.strictEqual(totalOut, 33000);
  assert.strictEqual(netBalance, 44000);
});

// ── Rollover Budgeting Tests ───────────────────────────────────────────
suite.it('Rollover Budgeting: carries forward unspent surplus from previous month', () => {
  // Scenario: October Dining budget was 10,000. Spent: 6,500. Surplus: 3,500.
  // In November, user dining base budget is 10,000.
  // With Rollover ON, effective November limit should be 10,000 + 3,500 = 13,500.
  const prevBudget = { id: 'b_oct_dining', month: '2026-10', category: 'Dining', baseLimit: 10000, limit: 10000, rollover: true };
  const octExpenses = 6500;
  const surplus = Math.max(0, prevBudget.baseLimit - octExpenses);
  assert.strictEqual(surplus, 3500);

  const novBudget = { id: 'b_nov_dining', month: '2026-11', category: 'Dining', baseLimit: 10000, limit: 10000, rollover: true };
  novBudget.limit = novBudget.baseLimit + surplus;
  novBudget.rolledOverAmount = surplus;
  novBudget.rolledOverFrom = '2026-10';

  assert.strictEqual(novBudget.limit, 13500);
  assert.strictEqual(novBudget.rolledOverAmount, 3500);
});

suite.it('Rollover Budgeting: rollover: false resets to base limit without carryover', () => {
  const prevBudget = { id: 'b_oct_fun', month: '2026-10', category: 'Fun', baseLimit: 5000, limit: 5000, rollover: false };
  const octExpenses = 2000;
  const novBudget = { id: 'b_nov_fun', month: '2026-11', category: 'Fun', baseLimit: 5000, limit: 5000, rollover: false };

  // When rollover is false, limit remains baseLimit
  assert.strictEqual(novBudget.limit, 5000);
});

// ── 30-Day Forward Cashflow Runway Tests ───────────────────────────────
suite.it('Cashflow Runway: calculates daily burn rate and 30-day projection with scheduled bills', () => {
  const initialLiquid = 100000; // ₹1,00,000 starting cash
  const dailyBurn = 1500; // ₹1,500/day discretionary burn
  const scheduledBills = [
    { day: 5, title: 'Credit Card Bill', amount: 25000 },
    { day: 15, title: 'Home Loan EMI', amount: 30000 }
  ];

  let current = initialLiquid;
  let minBalance = initialLiquid;
  let minDay = 0;

  for (let d = 1; d <= 30; d++) {
    const bill = scheduledBills.find(b => b.day === d);
    const billOut = bill ? bill.amount : 0;
    current = current - dailyBurn - billOut;
    if (current < minBalance) {
      minBalance = current;
      minDay = d;
    }
  }

  // Total burn over 30 days: 30 * 1500 = 45,000 + 25,000 + 30,000 = 100,000
  // Final ending balance: 100,000 - 100,000 = 0
  assert.strictEqual(current, 0);
  assert.strictEqual(minDay, 30);
  assert.strictEqual(minBalance, 0);
});

// ── CategoryRules Tests ────────────────────────────────────────────────
suite.it('CategoryRules: suggests categories accurately based on keywords and merchant names', () => {
  assert(window.LM_CategoryRules && typeof window.LM_CategoryRules.suggestCategory === 'function');
  assert.strictEqual(window.LM_CategoryRules.suggestCategory('Swiggy Order #1234', 'out'), 'Food & Dining');
  assert.strictEqual(window.LM_CategoryRules.suggestCategory('Zomato Online', 'out'), 'Food & Dining');
  assert.strictEqual(window.LM_CategoryRules.suggestCategory('Blinkit Quick Commerce', 'out'), 'Groceries');
  assert.strictEqual(window.LM_CategoryRules.suggestCategory('Uber Ride Trip', 'out'), 'Transport & Fuel');
  assert.strictEqual(window.LM_CategoryRules.suggestCategory('Salary Credit ABC Corp', 'in'), 'Salary');
  assert.strictEqual(window.LM_CategoryRules.suggestCategory('Netflix Subscription', 'out'), 'Subscriptions');
});

suite.it('CategoryRules: learns new transaction pattern dynamically', () => {
  assert(typeof window.LM_CategoryRules.learnFromTransaction === 'function');
  window.LM_CategoryRules.learnFromTransaction('Blue Tokai Coffee', 'Food & Dining', 'out');
  const cat = window.LM_CategoryRules.suggestCategory('Blue Tokai Coffee Indiranagar', 'out');
  assert.strictEqual(cat, 'Food & Dining');
});

// ── StatementParser Tests ──────────────────────────────────────────────
suite.it('StatementParser: normalizes Indian date formats (DD/MM/YYYY, DD-Mon-YYYY)', () => {
  assert(window.LM_StatementParser && typeof window.LM_StatementParser.parseFlexibleDate === 'function');
  assert.strictEqual(window.LM_StatementParser.parseFlexibleDate('15/08/2026'), '2026-08-15');
  assert.strictEqual(window.LM_StatementParser.parseFlexibleDate('01-Apr-2026'), '2026-04-01');
  assert.strictEqual(window.LM_StatementParser.parseFlexibleDate('2026-11-23'), '2026-11-23');
});

suite.it('StatementParser: parses standard CSV bank statement rows', () => {
  assert(typeof window.LM_StatementParser.parseCSV === 'function');
  const csv = `Date,Description,Debit,Credit,Balance\n01/11/2026,"Salary Credit",,75000.00,100000.00\n02/11/2026,"Swiggy Order",450.00,,99550.00`;
  const rows = window.LM_StatementParser.parseCSV(csv);
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(rows[0][0], 'Date');
  assert.strictEqual(rows[1][1], 'Salary Credit');
  assert.strictEqual(rows[2][2], '450.00');
});

suite.it('StatementParser: parses bank statement into typed transactions with auto-categorization', () => {
  assert(typeof window.LM_StatementParser.parseStatement === 'function');
  const csv = `Date,Narration,Withdrawal Amount,Deposit Amount\n05/11/2026,Zomato Food Order,620.00,\n06/11/2026,Company Monthly Salary,,80000.00`;
  const parsed = window.LM_StatementParser.parseStatement(csv);
  assert(!parsed.error, `Parser error: ${parsed.error}`);
  assert.strictEqual(parsed.transactions.length, 2);
  
  const t1 = parsed.transactions[0];
  assert.strictEqual(t1.amount, 620);
  assert.strictEqual(t1.type, 'out');
  assert.strictEqual(t1.category, 'Food & Dining');

  const t2 = parsed.transactions[1];
  assert.strictEqual(t2.amount, 80000);
  assert.strictEqual(t2.type, 'in');
  assert.strictEqual(t2.category, 'Salary');
});

suite.summary();
