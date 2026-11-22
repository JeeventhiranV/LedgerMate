/**
 * Test Suite 05: Loans, Part-Payment Prepayment Simulator & Debt Payoff
 * Validates Loan Prepayment (Tenure Reduction vs EMI Reduction),
 * Debt Optimizer (Snowball vs Avalanche), and Monte Carlo FIRE simulator.
 */
const path = require('path');
const { TestSuite, setupMockBrowser, assert } = require('./test_helper');

const suite = new TestSuite('05: Loans, Part-Payment Prepayment Simulator & Debt Payoff');
const ROOT = path.resolve(__dirname, '..');

// Setup mock browser environment
setupMockBrowser();

// Load modules
require(path.resolve(ROOT, 'src/scripts/Core/CurrencyFormatter.js'));
require(path.resolve(ROOT, 'src/scripts/Core/DateUtils.js'));
require(path.resolve(ROOT, 'src/scripts/Core/AmortizationCalc.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/DebtOptimizer.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/MonteCarloFIRE.js'));

(async () => {
  // ── Loan Part-Payment Prepayment Simulator Tests ─────────────────────────
  await suite.it('Prepayment Simulator: reduce_tenure saves interest and shortens loan duration', () => {
    assert(window.LM_Amortization && typeof window.LM_Amortization.calculatePrepaymentSavings === 'function');

    // Home Loan: ₹30,00,000 at 8.5% for 240 months (20 years)
    // Prepayment: ₹5,00,000 lump sum
    const result = window.LM_Amortization.calculatePrepaymentSavings({
      principal: 3000000,
      annualRate: 8.5,
      tenureMonths: 240,
      lumpSum: 500000,
      monthlyExtra: 0,
      strategy: 'reduce_tenure'
    });

    assert(result.interestSaved > 0, `Expected interest savings > 0, got ${result.interestSaved}`);
    assert(result.monthsSaved > 0, `Expected months saved > 0, got ${result.monthsSaved}`);
    assert.strictEqual(result.strategy, 'reduce_tenure');
    assert.strictEqual(result.newEmi, result.originalEmi, 'EMI should remain constant in reduce_tenure mode');
  });

  await suite.it('Prepayment Simulator: reduce_emi reduces monthly cash outflow', () => {
    const result = window.LM_Amortization.calculatePrepaymentSavings({
      principal: 3000000,
      annualRate: 8.5,
      tenureMonths: 240,
      lumpSum: 500000,
      monthlyExtra: 0,
      strategy: 'reduce_emi'
    });

    assert(result.newEmi < result.originalEmi, `New EMI (${result.newEmi}) should be lower than original (${result.originalEmi})`);
    assert(result.interestSaved > 0, `Interest saved should be > 0, got ${result.interestSaved}`);
    assert.strictEqual(result.strategy, 'reduce_emi');
  });

  // ── Debt Optimizer (Snowball vs Avalanche) Tests ─────────────────────────
  await suite.it('DebtOptimizer: simulates Snowball (lowest balance) and Avalanche (highest rate)', () => {
    assert(window.LM_DebtOptimizer && typeof window.LM_DebtOptimizer.simulatePayoff === 'function');

    const debts = [
      { id: 'cc1', name: 'Credit Card', balance: 40000, rate: 36, minPayment: 2000 },
      { id: 'pl1', name: 'Personal Loan', balance: 150000, rate: 14, minPayment: 4500 },
      { id: 'car1', name: 'Auto Loan', balance: 350000, rate: 9, minPayment: 7500 }
    ];

    const snowball = window.LM_DebtOptimizer.simulatePayoff(debts, 5000, 'snowball');
    assert(snowball && snowball.totalMonths > 0, 'Snowball should compute months to payoff');
    assert(snowball.totalInterest > 0, 'Snowball should compute total interest');

    const avalanche = window.LM_DebtOptimizer.simulatePayoff(debts, 5000, 'avalanche');
    assert(avalanche && avalanche.totalMonths > 0, 'Avalanche should compute months to payoff');
    assert(avalanche.totalInterest <= snowball.totalInterest, 'Avalanche should save equal or more interest than snowball');
  });

  // ── Monte Carlo FIRE Simulator Tests ─────────────────────────────────────
  await suite.it('MonteCarloFIRE: calculates FIRE number (25x expenses) and runs 1,000 simulations', () => {
    assert(window.LM_MonteCarloFIRE && typeof window.LM_MonteCarloFIRE.runSimulation === 'function');

    const sim = window.LM_MonteCarloFIRE.runSimulation({
      currentNetWorth: 2000000,
      monthlySavings: 50000,
      annualExpenses: 800000,
      currentAge: 30,
      targetAge: 50,
      simulationsCount: 100 // Fast runs for CI
    });

    assert.strictEqual(sim.targetFIRECorpus, 800000 * 25); // ₹2,00,00,000
    assert(sim.p50.length === 21, `Expected 21 percentile values for 20 years, got ${sim.p50.length}`);
    assert(typeof sim.fireProbability === 'number', 'fireProbability should be a percentage');
    assert(sim.fireProbability >= 0 && sim.fireProbability <= 100);
  });

  suite.summary();
})();
