/**
 * Test Suite 06: Business Hub, Multi-Entity Accounting & Digital Khata
 * Validates BusinessService, Khata Ledger balances, and WhatsApp UPI Payment Reminders.
 */
const path = require('path');
const { TestSuite, setupMockBrowser, assert } = require('./test_helper');

const suite = new TestSuite('06: Business Hub, Multi-Entity Accounting & Digital Khata');
const ROOT = path.resolve(__dirname, '..');

// Setup mock browser environment
setupMockBrowser();

// Provide state
window.state = {
  businesses: [],
  business_transactions: [],
  settings: {
    upiId: 'merchant@upi'
  }
};

// Load modules
require(path.resolve(ROOT, 'src/scripts/Core/CurrencyFormatter.js'));
require(path.resolve(ROOT, 'src/scripts/Core/DateUtils.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/Business/BusinessService.js'));

(async () => {
  // ── BusinessService Multi-Entity Tests ─────────────────────────────────
  await suite.it('BusinessService: creates and manages multi-business profiles via saveBusiness', async () => {
    assert(window.LM_BusinessService, 'LM_BusinessService must be exported');

    const biz = {
      id: 'biz_tech_corp',
      name: 'TechSphere Solutions',
      category: 'IT Services',
      currencySymbol: '₹',
      bankDetails: {
        upiId: 'techsphere@okaxis',
        bankName: 'HDFC Bank',
        accountNumber: '50100123456789',
        ifsc: 'HDFC0001234',
        holderName: 'TechSphere Solutions LLP'
      }
    };

    await window.LM_BusinessService.saveBusiness(biz);
    const retrieved = window.LM_BusinessService.getBusinessById('biz_tech_corp');
    assert(retrieved, 'Should retrieve created business entity');
    assert.strictEqual(retrieved.name, 'TechSphere Solutions');
    assert.strictEqual(retrieved.bankDetails.upiId, 'techsphere@okaxis');
  });

  await suite.it('BusinessService: computes P&L metrics (Credits, Debits, Net Profit) via getMetrics', async () => {
    // Add Credit (Income/Sales)
    await window.LM_BusinessService.saveTransaction({
      businessId: 'biz_tech_corp',
      type: 'credit',
      amount: 150000,
      category: 'Software Development',
      partyName: 'Apex Retailers',
      paymentStatus: 'paid',
      paidAmount: 150000,
      date: '2026-11-05'
    });

    // Add Debit (Operating Expense)
    await window.LM_BusinessService.saveTransaction({
      businessId: 'biz_tech_corp',
      type: 'debit',
      amount: 40000,
      category: 'Cloud Hosting AWS',
      partyName: 'Amazon Web Services',
      paymentStatus: 'paid',
      paidAmount: 40000,
      date: '2026-11-10'
    });

    const metrics = window.LM_BusinessService.getMetrics('biz_tech_corp');
    assert.strictEqual(metrics.totalCredits, 150000);
    assert.strictEqual(metrics.totalDebits, 40000);
    assert.strictEqual(metrics.netProfit, 110000);
    assert.strictEqual(metrics.profitMargin, 73.33); // (110000 / 150000) * 100
  });

  // ── Digital Khata Party Ledger Tests ───────────────────────────────────
  await suite.it('Digital Khata: calculates customer outstanding balance and invoice trail', async () => {
    // Invoice customer ₹50,000 pending payment (paid 20,000)
    await window.LM_BusinessService.saveTransaction({
      businessId: 'biz_tech_corp',
      type: 'credit',
      amount: 50000,
      paidAmount: 20000,
      paymentStatus: 'partial',
      partyName: 'Apex Retailers',
      partyPhone: '9876543210',
      invoiceNumber: 'INV-2026-001',
      date: '2026-11-15'
    });

    const partyStmt = window.LM_BusinessService.getPartyStatement('Apex Retailers', 'biz_tech_corp');
    assert(partyStmt, 'Should generate party statement');
    assert.strictEqual(partyStmt.partyName, 'Apex Retailers');
    assert.strictEqual(partyStmt.pendingReceivable, 30000); // 50,000 - 20,000
    assert.strictEqual(partyStmt.netBalance, 30000); // Net receivable
  });

  // ── WhatsApp UPI Payment Reminder Generator Tests ──────────────────────
  await suite.it('Digital Khata: generates valid WhatsApp reminder message with dynamic upi://pay link', () => {
    assert(typeof window.LM_BusinessService.generatePartyWhatsAppReminder === 'function');

    const msg = window.LM_BusinessService.generatePartyWhatsAppReminder('Apex Retailers', 'biz_tech_corp');
    assert(msg.includes('Apex Retailers'), 'Message should address party name');
    assert(msg.includes('30,000'), 'Message should include outstanding amount');
    assert(msg.includes('upi://pay'), 'Message must contain upi://pay intent link');
    assert(msg.includes('pa=techsphere%40okaxis') || msg.includes('pa=techsphere@okaxis'), 'UPI link must have payee VPA');
    assert(msg.includes('am=30000.00'), 'UPI link must have exact amount');
    assert(msg.includes('cu=INR'), 'UPI link must specify currency INR');
  });

  suite.summary();
})();
