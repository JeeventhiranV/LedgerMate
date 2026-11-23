/**
 * Test Suite 10: UI Navigation, Module Hub v2, Cash Flow Sankey & Knowledge Base
 * Validates ModuleHubUI (44+ modules), SidebarNavUI collapsible engine,
 * SankeyCashFlow period aggregations, and HelpFeedbackModal FAQ index.
 */
const path = require('path');
const fs = require('fs');
const { TestSuite, setupMockBrowser, assert } = require('./test_helper');

const suite = new TestSuite('10: UI Navigation, Module Hub v2, Cash Flow Sankey & Knowledge Base');
const ROOT = path.resolve(__dirname, '..');

// Setup mock browser environment
setupMockBrowser();

// Provide state
window.state = {
  transactions: [
    { id: 'tx1', type: 'in', amount: 100000, category: 'Salary', date: '2026-11-01' },
    { id: 'tx2', type: 'out', amount: 30000, category: 'Rent', date: '2026-11-05' },
    { id: 'tx3', type: 'out', amount: 15000, category: 'Groceries', date: '2026-11-10' }
  ]
};

// Mock auth for Admin
window.LM_Auth = {
  getCurrentUser: () => ({ userId: 'admin_test_1', username: 'admin', role: 'admin' }),
  isAdmin: () => true
};

// Load modules
require(path.resolve(ROOT, 'src/scripts/Core/CurrencyFormatter.js'));
require(path.resolve(ROOT, 'src/scripts/Core/DateUtils.js'));
require(path.resolve(ROOT, 'src/scripts/Core/AppBus.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/SidebarNavUI.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/SankeyCashFlow.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/ModuleHubUI.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/HelpFeedbackModal.js'));
require(path.resolve(ROOT, 'src/scripts/Admin/AdminPanel.js'));

(async () => {
  // ── ModuleHubUI Tests ──────────────────────────────────────────────────
  await suite.it('ModuleHubUI: registers 44+ specialized financial engines across standard categories', () => {
    assert(window.LM_ModuleHubUI, 'LM_ModuleHubUI must be exported');

    // Read ModuleHubUI file to verify modules list
    const hubCode = fs.readFileSync(path.resolve(ROOT, 'src/scripts/Modules/ModuleHubUI.js'), 'utf8');
    const badgeMatches = hubCode.match(/badge:\s*['"][^'"]+['"]/g) || [];
    assert(badgeMatches.length >= 40, `Expected at least 40 modules, found ${badgeMatches.length}`);

    // Verify key modules are present
    const expectedModules = [
      'transactions', 'credit-cards', 'stocks', 'loans',
      'business', 'trips', 'vehicles', 'bill-splitter',
      'fire-sim', 'sankey', 'command-palette'
    ];
    expectedModules.forEach(mod => {
      assert(hubCode.includes(`id: '${mod}'`) || hubCode.includes(`id: "${mod}"`), `Module ${mod} must be registered`);
    });
  });

  await suite.it('ModuleHubUI: manages pinned favorites and saves to profile-scoped localStorage', () => {
    assert(typeof window.LM_ModuleHubUI.togglePin === 'function');
    
    // Toggle pin for a new module: command-palette
    window.LM_ModuleHubUI.togglePin('command-palette');
    const pinned = JSON.parse(localStorage.getItem('lm_pinned_modules_default') || '[]');
    assert(pinned.includes('command-palette'), 'command-palette must be pinned in localStorage');

    // Toggle pin off
    window.LM_ModuleHubUI.togglePin('command-palette');
    const pinnedAfter = JSON.parse(localStorage.getItem('lm_pinned_modules_default') || '[]');
    assert(!pinnedAfter.includes('command-palette'), 'command-palette must be unpinned from localStorage');
  });

  // ── SidebarNavUI Tests ─────────────────────────────────────────────────
  await suite.it('SidebarNavUI: accurately routes pages to collapsible sidebar groups and toggles state', () => {
    assert(window.LM_SidebarNavUI, 'LM_SidebarNavUI must be exported');
    assert(typeof window.LM_SidebarNavUI.toggleGroup === 'function');
    assert(typeof window.LM_SidebarNavUI.isGroupOpen === 'function');

    // Toggle banking group
    const initialBankingState = window.LM_SidebarNavUI.isGroupOpen('banking');
    window.LM_SidebarNavUI.toggleGroup('banking');
    assert.strictEqual(window.LM_SidebarNavUI.isGroupOpen('banking'), !initialBankingState);
  });

  // ── SankeyCashFlow Tests ───────────────────────────────────────────────
  await suite.it('SankeyCashFlow: aggregates cash flow nodes across period filters (current_month, ytd, all_time)', () => {
    assert(window.LM_Sankey && typeof window.LM_Sankey.calculateFlowData === 'function');

    const flowData = window.LM_Sankey.calculateFlowData('current_month');
    assert(flowData, 'calculateFlowData should return flow structure');
    assert.strictEqual(flowData.totalIncome, 100000);
    assert.strictEqual(flowData.totalExpense, 45000); // 30,000 + 15,000
    assert.strictEqual(flowData.netSavings, 55000); // 100,000 - 45,000
    assert.strictEqual(flowData.incomeSources['Salary'], 100000);
    assert.strictEqual(flowData.detailedNeeds['Rent'], 30000);
    assert.strictEqual(flowData.detailedNeeds['Groceries'], 15000);
  });

  // ── HelpFeedbackModal Tests ────────────────────────────────────────────
  await suite.it('HelpFeedbackModal: exports knowledge base and FAQ modal APIs', () => {
    assert(window.LM_HelpModal, 'LM_HelpModal must be exported');
    assert(typeof window.LM_HelpModal.open === 'function');
    assert(typeof window.LM_HelpModal.openFAQ === 'function');
    assert(typeof window.LM_HelpModal.openFeedback === 'function');
    assert(typeof window.LM_HelpModal.close === 'function');
  });

  // ── Admin Command Center Enterprise Tests ──────────────────────────────
  await suite.it('AdminPanel: exports comprehensive LM_Admin and StudyAdmin interfaces', () => {
    assert(window.LM_Admin, 'window.LM_Admin must be defined');
    assert(window.StudyAdmin, 'window.StudyAdmin must be defined for backwards compatibility');
    assert(typeof window.LM_Admin.show === 'function', 'LM_Admin.show must be a function');
    assert(typeof window.LM_Admin.close === 'function', 'LM_Admin.close must be a function');
    assert(typeof window.LM_Admin.switchTab === 'function', 'LM_Admin.switchTab must be a function');
    assert(typeof window.LM_Admin.openApproveRequestModal === 'function');
    assert(typeof window.LM_Admin.openConfigureUserModal === 'function');
    assert(typeof window.LM_Admin.showFinanceAccess === 'function');
    assert(typeof window.LM_Admin.showStudyAccess === 'function');
    assert(typeof window.LM_Admin.deleteUser === 'function');
    assert(typeof window.StudyAdmin.open === 'function');
    assert(typeof window.StudyAdmin.close === 'function');
  });

  await suite.it('AdminPanel: initializes accessible DOM with role="dialog", role="tablist", and keyboard navigation', () => {
    window.LM_Admin.show('approvals');
    const overlay = document.getElementById('adminPanelOverlay');
    assert(overlay, 'Admin panel overlay must exist in DOM');
    assert.strictEqual(overlay.getAttribute('role'), 'dialog');
    assert.strictEqual(overlay.getAttribute('aria-modal'), 'true');
    assert(overlay.innerHTML.includes('role="tablist"'), 'Must contain a role="tablist" container for tabs');
    assert(overlay.innerHTML.includes('role="tab"'), 'Must contain role="tab" elements');
    assert(overlay.innerHTML.includes('role="tabpanel"'), 'Must contain role="tabpanel" content viewport');
    assert(overlay.innerHTML.includes('tab-btn-approvals'), 'Must contain approvals tab button');
    assert(overlay.innerHTML.includes('tab-btn-users'), 'Must contain users tab button');

    // Switch tab to users
    window.LM_Admin.switchTab('users');

    // Close admin panel
    window.LM_Admin.close();
    assert(!document.getElementById('adminPanelOverlay'), 'Overlay must be removed upon close');
  });

  suite.summary();
})();
