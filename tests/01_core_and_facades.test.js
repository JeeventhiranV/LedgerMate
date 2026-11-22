/**
 * Test Suite 01: Core Mathematical Utilities & Architectural Facades
 * Validates CurrencyFormatter, DateUtils, AmortizationCalc, AppBus, InterlinkEngine
 */
const path = require('path');
const { TestSuite, setupMockBrowser, assert } = require('./test_helper');

const suite = new TestSuite('01: Core Mathematical Utilities & Architectural Facades');
const ROOT = path.resolve(__dirname, '..');

// Setup mock browser environment
setupMockBrowser();

// Load modules
require(path.resolve(ROOT, 'src/scripts/Core/CurrencyFormatter.js'));
require(path.resolve(ROOT, 'src/scripts/Core/DateUtils.js'));
require(path.resolve(ROOT, 'src/scripts/Core/AmortizationCalc.js'));
require(path.resolve(ROOT, 'src/scripts/Core/AppBus.js'));

// ── CurrencyFormatter Tests ─────────────────────────────────────────────
suite.it('CurrencyFormatter: formats standard Indian Rupee notation (1,50,000)', () => {
  assert(window.LM_Currency && typeof window.LM_Currency.formatINR === 'function');
  assert.strictEqual(window.LM_Currency.formatINR(0), '₹0');
  assert.strictEqual(window.LM_Currency.formatINR(100), '₹100');
  assert.strictEqual(window.LM_Currency.formatINR(1000), '₹1,000');
  assert.strictEqual(window.LM_Currency.formatINR(150000), '₹1,50,000');
  assert.strictEqual(window.LM_Currency.formatINR(10000000), '₹1,00,00,000');
  assert.strictEqual(window.LM_Currency.formatINR(-5000), '-₹5,000');
});

suite.it('CurrencyFormatter: formats compact Indian financial notation (Lakhs & Crores)', () => {
  assert(typeof window.LM_Currency.formatINRCompact === 'function');
  assert.strictEqual(window.LM_Currency.formatINRCompact(0), '₹0');
  assert.strictEqual(window.LM_Currency.formatINRCompact(950), '₹950');
  assert.strictEqual(window.LM_Currency.formatINRCompact(15000), '₹15 K');
  assert.strictEqual(window.LM_Currency.formatINRCompact(250000), '₹2.5 L');
  assert.strictEqual(window.LM_Currency.formatINRCompact(15000000), '₹1.5 Cr');
  assert.strictEqual(window.LM_Currency.formatINRCompact(-15000000), '-₹1.5 Cr');
});

suite.it('CurrencyFormatter: parses messy currency strings to numeric values', () => {
  assert(typeof window.LM_Currency.parseAmount === 'function');
  assert.strictEqual(window.LM_Currency.parseAmount('₹ 1,23,450.50'), 123450.5);
  assert.strictEqual(window.LM_Currency.parseAmount('10,000'), 10000);
  assert.strictEqual(window.LM_Currency.parseAmount('-₹ 5,000'), -5000);
  assert.strictEqual(window.LM_Currency.parseAmount('abc'), 0);
  assert.strictEqual(window.LM_Currency.parseAmount(''), 0);
});

suite.it('CurrencyFormatter: backward compatibility global aliases match LM_Currency', () => {
  assert.strictEqual(window.fmtINR(250000), window.LM_Currency.formatINR(250000));
  assert.strictEqual(window.fmtINRCompact(15000000), window.LM_Currency.formatINRCompact(15000000));
});

// ── DateUtils Tests ─────────────────────────────────────────────────────
suite.it('DateUtils: nowISO returns valid local date string (YYYY-MM-DD)', () => {
  assert(window.LM_Date && typeof window.LM_Date.nowISO === 'function');
  const now = window.LM_Date.nowISO();
  assert(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(now), `Invalid YYYY-MM-DD format: ${now}`);
  assert.strictEqual(window.nowISO(), now);
});

suite.it('DateUtils: daysBetween accurately computes calendar date differences', () => {
  assert(typeof window.LM_Date.daysBetween === 'function');
  assert.strictEqual(window.LM_Date.daysBetween('2026-04-01', '2026-04-10'), 9);
  assert.strictEqual(window.LM_Date.daysBetween('2026-01-01', '2026-01-01'), 0);
  assert.strictEqual(window.LM_Date.daysBetween('2026-03-01', '2026-02-28'), -1);
});

suite.it('DateUtils: Indian Financial Year correctly maps across April boundary', () => {
  assert(typeof window.LM_Date.getFinancialYear === 'function');
  assert.strictEqual(window.LM_Date.getFinancialYear('2026-03-31'), 'FY 2025-26');
  assert.strictEqual(window.LM_Date.getFinancialYear('2026-04-01'), 'FY 2026-27');
  assert.strictEqual(window.LM_Date.getFinancialYear('2026-11-23'), 'FY 2026-27');
});

// ── AmortizationCalc Tests ──────────────────────────────────────────────
suite.it('AmortizationCalc: calculates accurate monthly EMI', () => {
  assert(window.LM_Amortization && typeof window.LM_Amortization.calculateEMI === 'function');
  // ₹10,00,000 at 8.5% for 120 months (10 yrs)
  const emi = window.LM_Amortization.calculateEMI(1000000, 8.5, 120);
  assert(emi > 12390 && emi < 12410, `EMI calculated was ${emi}, expected ~12398.57`);
  assert.strictEqual(window.calculateEMI(1000000, 8.5, 120), emi);
});

suite.it('AmortizationCalc: generates exact amortization schedule and amortizes to 0 balance', () => {
  assert(typeof window.LM_Amortization.generateSchedule === 'function');
  const result = window.LM_Amortization.generateSchedule(100000, 10, 12);
  assert(result && Array.isArray(result.schedule), 'Should return schedule array');
  assert.strictEqual(result.schedule.length, 12);
  const lastMonth = result.schedule[result.schedule.length - 1];
  assert.strictEqual(lastMonth.balance, 0, `Ending balance should be 0, got ${lastMonth.balance}`);
  const totalPrincipal = result.schedule.reduce((sum, row) => sum + row.principal, 0);
  assert(Math.abs(totalPrincipal - 100000) < 1, `Total principal should equal loan amount`);
});

// ── AppBus Tests ────────────────────────────────────────────────────────
suite.it('AppBus: handles event subscriptions, emissions, and unsubscriptions', () => {
  assert(window.LM_Bus, 'window.LM_Bus must be defined');
  const bus = window.LM_Bus;
  let receivedData = null;
  const handler = (data) => { receivedData = data; };

  bus.on('test:event', handler);
  bus.emit('test:event', { foo: 'bar' });
  assert.deepStrictEqual(receivedData, { foo: 'bar' });

  // Unsubscribe
  bus.off('test:event', handler);
  bus.emit('test:event', { foo: 'baz' });
  assert.deepStrictEqual(receivedData, { foo: 'bar' }, 'Should not receive event after off()');
});

suite.summary();
