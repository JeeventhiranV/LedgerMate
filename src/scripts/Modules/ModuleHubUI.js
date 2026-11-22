/**
 * LedgerMate – ModuleHubUI.js
 * ─────────────────────────────────────────────────────────────
 * Executive Modular Financial Cockpit & Application Launcher.
 * Organizes LedgerMate's 40+ financial tools, calculators, wealth
 * trackers, lifestyle planners, and intelligence engines into a
 * clean, search-driven, card-based launchpad with live telemetry.
 *
 * Exposes: window.LM_ModuleHubUI
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _activeCategory = 'all';
  var _searchQuery = '';
  var _viewMode = 'grid'; // 'grid' | 'list'
  var _sortMode = 'pinned'; // 'pinned' | 'recent' | 'name' | 'telemetry' | 'category'
  var _focusedIndex = -1;
  var _pinnedModules = null;
  var _recentModules = null;

  function _getUid() {
    return (window.LM_Auth && typeof window.LM_Auth.getCurrentUserId === 'function')
      ? window.LM_Auth.getCurrentUserId()
      : 'default';
  }

  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _highlightMatch(text, query) {
    if (!text) return '';
    if (!query) return _esc(text);
    var q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var regex = new RegExp('(' + q + ')', 'gi');
    return text.split(regex).map(function (part) {
      if (part.toLowerCase() === query.toLowerCase()) {
        return '<mark class="mod-search-highlight">' + _esc(part) + '</mark>';
      }
      return _esc(part);
    }).join('');
  }

  function _loadViewMode() {
    try {
      return localStorage.getItem('lm_module_view_mode_' + _getUid()) || 'grid';
    } catch (e) { return 'grid'; }
  }

  function _saveViewMode(mode) {
    try {
      localStorage.setItem('lm_module_view_mode_' + _getUid(), mode);
    } catch (e) {}
  }

  function _loadSortMode() {
    try {
      return localStorage.getItem('lm_module_sort_mode_' + _getUid()) || 'pinned';
    } catch (e) { return 'pinned'; }
  }

  function _saveSortMode(mode) {
    try {
      localStorage.setItem('lm_module_sort_mode_' + _getUid(), mode);
    } catch (e) {}
  }

  function _loadPinned() {
    try {
      var key = 'lm_pinned_modules_' + _getUid();
      var raw = localStorage.getItem(key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    // Default sensible pins
    return ['business', 'credit-cards', 'stocks', 'trips', 'vehicles', 'loans'];
  }

  function _savePinned(arr) {
    try {
      var key = 'lm_pinned_modules_' + _getUid();
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {}
  }

  function _loadRecents() {
    try {
      var key = 'lm_recent_modules_' + _getUid();
      var raw = localStorage.getItem(key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return ['business', 'credit-cards', 'trips', 'stocks'];
  }

  function _recordRecent(modId) {
    var recents = _loadRecents();
    recents = recents.filter(function (id) { return id !== modId; });
    recents.unshift(modId);
    if (recents.length > 5) recents = recents.slice(0, 5);
    try {
      localStorage.setItem('lm_recent_modules_' + _getUid(), JSON.stringify(recents));
    } catch (e) {}
  }

  var CATEGORIES = [
    { id: 'all', label: 'All Modules', icon: '⊞' },
    { id: 'pinned', label: 'Pinned & Starred', icon: '⭐' },
    { id: 'banking', label: 'Banking & Credit', icon: '💳' },
    { id: 'wealth', label: 'Wealth & Markets', icon: '📈' },
    { id: 'debt', label: 'Debt & Borrowing', icon: '🏦' },
    { id: 'business', label: 'Enterprise & Business', icon: '🏢' },
    { id: 'lifestyle', label: 'Lifestyle & Travel', icon: '✈️' },
    { id: 'reports', label: 'Reports & Analytics', icon: '📊' },
    { id: 'vault', label: 'Vault & System', icon: '⚙️' }
  ];

  var MODULES = [
    // ── 1. BANKING & CREDIT ───────────────────────────────────
    {
      id: 'transactions',
      title: 'Transactions Ledger',
      category: 'banking',
      icon: '↕️',
      desc: 'Master cashflow ledger of inflows, outflows, splits, accounts and category tagging.',
      tags: ['transactions', 'income', 'expense', 'ledger', 'cashflow', 'history'],
      badge: 'Core Ledger',
      badgeType: 'info',
      route: function () { showPage('transactions'); },
      quickAction: {
        label: '+ Add Tx',
        title: 'Quick Record Transaction',
        action: function () {
          if (typeof openAddTransactionModal === 'function') openAddTransactionModal();
        }
      }
    },
    {
      id: 'credit-cards',
      title: 'Credit Cards Hub',
      category: 'banking',
      icon: '💳',
      desc: 'Card billing cycles, due date alerts, cash-back optimizer and 1-tap bill reminders.',
      tags: ['credit', 'cards', 'statement', 'rewards', 'due date', 'limit'],
      badge: 'Bill Alerts',
      badgeType: 'warning',
      route: function () { showPage('credit-cards'); },
      quickAction: {
        label: '+ Add Card',
        title: 'Add New Credit Card',
        action: function () {
          if (window.LM_CreditCardsUI && typeof window.LM_CreditCardsUI.showAddEditModal === 'function') {
            window.LM_CreditCardsUI.showAddEditModal();
          } else {
            showPage('credit-cards');
          }
        }
      }
    },
    {
      id: 'budgets',
      title: 'Budget Envelopes',
      category: 'banking',
      icon: '🎯',
      desc: 'Monthly category budget limits, burn rate pacing and automated overspend warnings.',
      tags: ['budget', 'envelopes', 'limits', 'pacing', 'spending'],
      badge: 'Pacing Guard',
      badgeType: 'info',
      route: function () {
        var el = document.getElementById('openBudgets');
        if (el) el.click();
        else if (typeof openBudgetsModal === 'function') openBudgetsModal();
      },
      quickAction: {
        label: '🎯 Limits',
        title: 'Open Budget Limits',
        action: function () {
          if (typeof openBudgetsModal === 'function') openBudgetsModal();
        }
      }
    },
    {
      id: 'subscriptions',
      title: 'Subscription Manager',
      category: 'banking',
      icon: '🔄',
      desc: 'Recurring OTT, SaaS, membership cycles, price-hike alerts and renewal tracker.',
      tags: ['subscriptions', 'recurring', 'bills', 'netflix', 'spotify', 'saas'],
      badge: 'Renewals',
      badgeType: 'info',
      route: function () { showPage('subscriptions'); }
    },
    {
      id: 'templates',
      title: 'Tx Quick Templates',
      category: 'banking',
      icon: '📋',
      desc: 'One-click pre-configured transaction stamps for frequent daily transactions.',
      tags: ['templates', 'quick', 'shortcuts', 'presets'],
      badge: 'Fast Record',
      badgeType: 'info',
      route: function () { showPage('templates'); }
    },
    {
      id: 'dropdowns',
      title: 'Dropdown Manager',
      category: 'banking',
      icon: '🔽',
      desc: 'Custom account lists, payment modes, custom labels, tags and category trees.',
      tags: ['dropdowns', 'accounts', 'modes', 'tags', 'settings'],
      badge: 'Config',
      badgeType: 'info',
      route: function () {
        var el = document.getElementById('openDropdownManagerBtn');
        if (el) el.click();
      }
    },

    // ── 2. WEALTH & MARKETS ───────────────────────────────────
    {
      id: 'stocks',
      title: 'Stocks & Portfolio',
      category: 'wealth',
      icon: '📈',
      desc: 'Live stock prices, portfolio gain/loss, equity holdings, dividends and indices.',
      tags: ['stocks', 'portfolio', 'shares', 'nifty', 'sensex', 'equity'],
      badge: 'Live Market',
      badgeType: 'success',
      route: function () { showPage('stocks'); },
      quickAction: {
        label: '+ Buy/Sell',
        title: 'Record Stock Order',
        action: function () {
          if (window.LM_StockPortfolioUI && typeof window.LM_StockPortfolioUI.openAddTransactionModal === 'function') {
            window.LM_StockPortfolioUI.openAddTransactionModal();
          } else {
            showPage('stocks');
          }
        }
      }
    },
    {
      id: 'investments',
      title: 'Mutual Funds & Assets',
      category: 'wealth',
      icon: '💼',
      desc: 'SIPs, Fixed Deposits, Sovereign Gold Bonds, Real Estate, and PPF allocations.',
      tags: ['investments', 'mutual funds', 'fd', 'sip', 'sgb', 'ppf'],
      badge: 'Asset Growth',
      badgeType: 'info',
      route: function () { showPage('investments'); }
    },
    {
      id: 'wealth',
      title: 'Net Worth Intelligence',
      category: 'wealth',
      icon: '💎',
      desc: 'Consolidated balance sheet: total assets minus liabilities and liquidity telemetry.',
      tags: ['wealth', 'net worth', 'assets', 'liabilities', 'liquidity'],
      badge: 'Balance Sheet',
      badgeType: 'success',
      route: function () { showPage('wealth'); }
    },
    {
      id: 'gold',
      title: 'Gold & Silver Rates',
      category: 'wealth',
      icon: '🪙',
      desc: 'Real-time 24K/22K bullion rates, purity calculations, and precious metal holdings.',
      tags: ['gold', 'silver', 'bullion', 'jewellery', 'purity', 'metal'],
      badge: 'Live Bullion',
      badgeType: 'warning',
      route: function () { showPage('gold'); }
    },
    {
      id: 'wealth-goals',
      title: 'Financial Milestones',
      category: 'wealth',
      icon: '🎖️',
      desc: 'Multi-year milestones (First 10L, 50L, 1 Crore) with projected compound growth.',
      tags: ['milestones', 'wealth', 'long term', 'growth', 'target'],
      badge: 'Milestones',
      badgeType: 'info',
      route: function () { showPage('wealth-goals'); }
    },
    {
      id: 'savings-goals',
      title: 'Target Savings Goals',
      category: 'wealth',
      icon: '🏆',
      desc: 'Bucket savings for specific goals (gadgets, car down payment, dream vacation).',
      tags: ['savings', 'goals', 'target', 'vacation', 'bucket'],
      badge: 'Goal Progress',
      badgeType: 'info',
      route: function () { showPage('savings-goals'); }
    },
    {
      id: 'emergency-fund',
      title: 'Emergency Runway',
      category: 'wealth',
      icon: '🛡️',
      desc: 'Calculate 3 to 12 months liquid survival buffer based on exact monthly burn.',
      tags: ['emergency', 'safety net', 'runway', 'survival', 'liquidity'],
      badge: 'Runway Guard',
      badgeType: 'success',
      route: function () { showPage('emergency-fund'); }
    },
    {
      id: 'essentials',
      title: 'Needs vs Wants Basket',
      category: 'wealth',
      icon: '📦',
      desc: '50-30-20 rule analyzer measuring essential living vs discretionary consumption.',
      tags: ['essentials', 'needs', 'wants', 'lifestyle', '50-30-20'],
      badge: '50/30/20 Rule',
      badgeType: 'info',
      route: function () { showPage('essentials'); }
    },

    // ── 3. DEBT & BORROWING ───────────────────────────────────
    {
      id: 'loans',
      title: 'Loans & EMIs',
      category: 'debt',
      icon: '🏦',
      desc: 'Home loans, auto loans, personal loans, principal amortization and payment logs.',
      tags: ['loans', 'emi', 'borrowing', 'interest', 'amortization', 'mortgage'],
      badge: 'Active Debt',
      badgeType: 'danger',
      route: function () { showPage('loans'); }
    },
    {
      id: 'debt-payoff',
      title: 'Debt Payoff Engine',
      category: 'debt',
      icon: '⚡',
      desc: 'Snowball vs Avalanche acceleration visualizer to become 100% debt-free faster.',
      tags: ['debt payoff', 'snowball', 'avalanche', 'freedom', 'repayment'],
      badge: 'Accelerate',
      badgeType: 'info',
      route: function () { showPage('debt-payoff'); }
    },
    {
      id: 'debt-optimizer',
      title: 'Debt Optimizer',
      category: 'debt',
      icon: '🎯',
      desc: 'Interest rate minimization, balance transfers and debt restructuring analysis.',
      tags: ['debt optimizer', 'consolidation', 'refinance', 'interest rate'],
      badge: 'Save Interest',
      badgeType: 'info',
      route: function () {
        if (window.LM_DebtOptimizer && typeof window.LM_DebtOptimizer.showModal === 'function') {
          window.LM_DebtOptimizer.showModal();
        } else if (typeof openDebtOptimizerModal === 'function') {
          openDebtOptimizerModal();
        }
      },
      quickAction: {
        label: '⚡ Optimize',
        title: 'Run Debt Snowball Optimizer',
        action: function () {
          if (window.LM_DebtOptimizer && typeof window.LM_DebtOptimizer.showModal === 'function') {
            window.LM_DebtOptimizer.showModal();
          } else if (typeof openDebtOptimizerModal === 'function') {
            openDebtOptimizerModal();
          }
        }
      }
    },
    {
      id: 'emi-calc',
      title: 'EMI Calculator',
      category: 'debt',
      icon: '🧮',
      desc: 'Instant interactive EMI, interest breakdown, and prepayments impact simulator.',
      tags: ['emi calculator', 'interest', 'tenure', 'prepayment', 'math'],
      badge: 'Calculator',
      badgeType: 'info',
      route: function () {
        if (typeof openEMIModal === 'function') openEMIModal();
      },
      quickAction: {
        label: '🧮 Calc EMI',
        title: 'Calculate Loan EMI',
        action: function () {
          if (typeof openEMIModal === 'function') openEMIModal();
        }
      }
    },

    // ── 4. ENTERPRISE & BUSINESS ──────────────────────────────
    {
      id: 'business',
      title: 'Business Hub',
      category: 'business',
      icon: '🏢',
      desc: 'Revenue credits, debits, gateway fees, P&L analytics, and zero-data-loss vault.',
      tags: ['business', 'pnl', 'revenue', 'expenses', 'enterprise', 'charges'],
      badge: 'P&L Hub',
      badgeType: 'success',
      route: function () { showPage('business'); },
      quickAction: {
        label: '🤝 Khata',
        title: 'Open Business Khata & Reminders',
        action: function () {
          showPage('business');
          setTimeout(function () {
            if (window.LM_BusinessUI && typeof window.LM_BusinessUI.setTab === 'function') {
              window.LM_BusinessUI.setTab('parties');
            }
          }, 150);
        }
      }
    },
    {
      id: 'khata',
      title: 'Party Book (Khata)',
      category: 'business',
      icon: '👥',
      desc: 'Customer & vendor ledgers with automated 1-click WhatsApp payment reminders with UPI.',
      tags: ['khata', 'party book', 'vendors', 'customers', 'receivables', 'whatsapp'],
      badge: 'WhatsApp UPI',
      badgeType: 'info',
      route: function () {
        showPage('business');
        setTimeout(function () {
          if (window.LM_BusinessUI && typeof window.LM_BusinessUI.setTab === 'function') {
            window.LM_BusinessUI.setTab('parties');
          }
        }, 80);
      }
    },
    {
      id: 'invoicing',
      title: 'Tax Invoices & Billing',
      category: 'business',
      icon: '📄',
      desc: 'Official GST tax receipts and customer billing invoices with clean 1-tap print/PDF.',
      tags: ['invoice', 'receipt', 'gst', 'billing', 'print', 'tax'],
      badge: 'Print Ready',
      badgeType: 'info',
      route: function () {
        showPage('business');
        setTimeout(function () {
          if (window.LM_BusinessUI && typeof window.LM_BusinessUI.setTab === 'function') {
            window.LM_BusinessUI.setTab('ledger');
          }
        }, 80);
      }
    },
    {
      id: 'tax-planner',
      title: 'Tax Planner (FY 26)',
      category: 'business',
      icon: '📑',
      desc: 'Old vs New Tax Regime comparator, 80C/80D deductions, and tax liability calculator.',
      tags: ['tax', 'regime', '80c', 'tds', 'deductions', 'income tax'],
      badge: 'Tax Saver',
      badgeType: 'info',
      route: function () { showPage('tax-planner'); }
    },
    {
      id: 'category-rules',
      title: 'Auto-Category Rules',
      category: 'business',
      icon: '🏷️',
      desc: 'Merchant keyword rules that automatically categorize imported transactions.',
      tags: ['rules', 'automation', 'keywords', 'merchant', 'categorization'],
      badge: 'Automation',
      badgeType: 'info',
      route: function () {
        if (window.LM_CategoryRules && typeof window.LM_CategoryRules.showRulesModal === 'function') {
          window.LM_CategoryRules.showRulesModal();
        }
      },
      quickAction: {
        label: '🏷️ Rules',
        title: 'Configure Automated Category Rules',
        action: function () {
          if (window.LM_CategoryRules && typeof window.LM_CategoryRules.showRulesModal === 'function') {
            window.LM_CategoryRules.showRulesModal();
          }
        }
      }
    },

    // ── 5. LIFESTYLE & TRAVEL ─────────────────────────────────
    {
      id: 'trips',
      title: 'Trip Planner & Itinerary',
      category: 'lifestyle',
      icon: '✈️',
      desc: 'Multi-city route optimizer, 2-opt untangling, expense split & WhatsApp trip audit.',
      tags: ['trip', 'travel', 'itinerary', 'vacation', 'route optimizer', 'split'],
      badge: 'Smart Routes',
      badgeType: 'success',
      route: function () { showPage('trips'); },
      quickAction: {
        label: '+ Plan Trip',
        title: 'Create New Trip',
        action: function () {
          if (window.LM_TripUI && typeof window.LM_TripUI.openAddTripModal === 'function') {
            window.LM_TripUI.openAddTripModal();
          } else {
            showPage('trips');
          }
        }
      }
    },
    {
      id: 'vehicles',
      title: 'Bike & Vehicle Tracker',
      category: 'lifestyle',
      icon: '🏍️',
      desc: 'Fuel economy (km/L), service history, odometer telemetry & insurance reminders.',
      tags: ['vehicle', 'bike', 'car', 'fuel', 'mileage', 'service', 'odometer'],
      badge: 'Fleet Log',
      badgeType: 'info',
      route: function () { showPage('vehicles'); }
    },
    {
      id: 'media-compressor',
      title: 'Media Compressor',
      category: 'lifestyle',
      icon: '🗜️',
      desc: 'Zero-loss photo & video compressor with complete EXIF and timestamp retention.',
      tags: ['media', 'compressor', 'photos', 'videos', 'exif', 'storage'],
      badge: 'EXIF Retain',
      badgeType: 'info',
      route: function () { showPage('media-compressor'); }
    },
    {
      id: 'notes',
      title: 'Encrypted Quick Notes',
      category: 'lifestyle',
      icon: '📝',
      desc: 'Private scratchpad, travel checklists, account notes and instant pasteboard.',
      tags: ['notes', 'scratchpad', 'todo', 'checklist', 'memo'],
      badge: 'Scratchpad',
      badgeType: 'info',
      route: function () {
        if (typeof showNotesModal === 'function') showNotesModal();
      },
      quickAction: {
        label: '+ New Note',
        title: 'Create Quick Note',
        action: function () {
          if (typeof showNotesModal === 'function') showNotesModal();
        }
      }
    },
    {
      id: 'bill-splitter',
      title: 'Group Bill Splitter',
      category: 'lifestyle',
      icon: '👥',
      desc: 'Equal or custom share calculator for dinners, outings, and shared house bills.',
      tags: ['split', 'bills', 'friends', 'calculator', 'share'],
      badge: 'Split Math',
      badgeType: 'info',
      route: function () {
        if (window.LM_BillSplitter && typeof window.LM_BillSplitter.open === 'function') {
          window.LM_BillSplitter.open();
        } else if (window.LM_BillSplitter && typeof window.LM_BillSplitter.openBillSplitterModal === 'function') {
          window.LM_BillSplitter.openBillSplitterModal();
        }
      },
      quickAction: {
        label: '⚡ Split Bill',
        title: 'Open Group Bill Splitter',
        action: function () {
          if (window.LM_BillSplitter && typeof window.LM_BillSplitter.openBillSplitterModal === 'function') {
            window.LM_BillSplitter.openBillSplitterModal();
          } else if (window.LM_BillSplitter && typeof window.LM_BillSplitter.open === 'function') {
            window.LM_BillSplitter.open();
          }
        }
      }
    },
    {
      id: 'study',
      title: 'Study Hub & Resources',
      category: 'lifestyle',
      icon: '📚',
      desc: 'Software architecture, algorithms, interview preparation and engineering notes.',
      tags: ['study', 'dsa', 'engineering', 'resources', 'learning'],
      badge: 'Engineering',
      badgeType: 'info',
      route: function () { window.open('./study/index.html', '_self'); }
    },
    {
      id: 'widget',
      title: 'PWA Home Widget',
      category: 'lifestyle',
      icon: '📱',
      desc: 'Standalone minimal widget for glanceable cash balance and quick transaction entry.',
      tags: ['widget', 'home screen', 'minimal', 'quick log'],
      badge: 'Glanceable',
      badgeType: 'info',
      route: function () {
        if (typeof openWidgetPage === 'function') openWidgetPage();
      }
    },

    // ── 6. INTELLIGENCE & REPORTS ─────────────────────────────
    {
      id: 'analytics',
      title: 'Financial Analytics',
      category: 'reports',
      icon: '📊',
      desc: 'Cashflow trends, category spending donuts, monthly growth curves and financial health.',
      tags: ['analytics', 'charts', 'trends', 'burn rate', 'breakdown'],
      badge: 'Trends',
      badgeType: 'info',
      route: function () { showPage('analytics'); }
    },
    {
      id: 'sankey',
      title: 'Cashflow Flow (Sankey)',
      category: 'reports',
      icon: '🌊',
      desc: 'Dynamic alluvial flow visualization mapping total income through expenses to savings.',
      tags: ['sankey', 'cashflow', 'alluvial', 'diagram', 'flow'],
      badge: 'Interactive Flow',
      badgeType: 'success',
      route: function () {
        if (window.LM_Sankey && typeof window.LM_Sankey.showModal === 'function') {
          window.LM_Sankey.showModal();
        } else if (typeof openSankeyModal === 'function') {
          openSankeyModal();
        }
      },
      quickAction: {
        label: '🌊 Flow',
        title: 'Open Cashflow Flow Diagram',
        action: function () {
          if (window.LM_Sankey && typeof window.LM_Sankey.showModal === 'function') {
            window.LM_Sankey.showModal();
          } else if (typeof openSankeyModal === 'function') {
            openSankeyModal();
          }
        }
      }
    },
    {
      id: 'spending-heatmap',
      title: 'Daily Spend Heatmap',
      category: 'reports',
      icon: '🗓️',
      desc: 'GitHub-style yearly calendar matrix showing spending intensity by day of the year.',
      tags: ['heatmap', 'calendar', 'daily spend', 'matrix', 'intensity'],
      badge: 'Matrix View',
      badgeType: 'info',
      route: function () { showPage('spending-heatmap'); }
    },
    {
      id: 'cash-flow-calendar',
      title: 'Cash Flow Calendar',
      category: 'reports',
      icon: '📆',
      desc: 'Month-at-a-glance view of recurring paydays, bill dues, EMIs, and cash forecasts.',
      tags: ['calendar', 'cash flow', 'forecast', 'bills due', 'schedule'],
      badge: 'Forecast',
      badgeType: 'info',
      route: function () { showPage('cash-flow-calendar'); }
    },
    {
      id: 'fy-summary',
      title: 'FY Annual Summary',
      category: 'reports',
      icon: '📋',
      desc: 'Fiscal year executive reporting, Q1-Q4 quarterly performance, and tax records.',
      tags: ['fy summary', 'annual report', 'fiscal year', 'quarters'],
      badge: 'Annual Report',
      badgeType: 'info',
      route: function () { showPage('fy-summary'); }
    },
    {
      id: 'month-comparison',
      title: 'Month vs Month Delta',
      category: 'reports',
      icon: '⚖️',
      desc: 'Comparative variance analysis highlighting budget inflation and savings drops.',
      tags: ['comparison', 'variance', 'delta', 'monthly change'],
      badge: 'Variance',
      badgeType: 'info',
      route: function () { showPage('month-comparison'); }
    },
    {
      id: 'what-if',
      title: 'What-If Simulator',
      category: 'reports',
      icon: '🔮',
      desc: 'Simulate the financial impact of salary increments, buying a house, or new loans.',
      tags: ['simulator', 'what if', 'scenarios', 'forecast', 'future'],
      badge: 'Scenario Model',
      badgeType: 'info',
      route: function () {
        if (typeof openWhatIfModal === 'function') openWhatIfModal();
      },
      quickAction: {
        label: '🔮 Model',
        title: 'Run What-If Scenario',
        action: function () {
          if (typeof openWhatIfModal === 'function') openWhatIfModal();
        }
      }
    },
    {
      id: 'fire-sim',
      title: 'FIRE Retirement Engine',
      category: 'reports',
      icon: '🔥',
      desc: 'Monte Carlo simulation of retirement readiness, safe withdrawal rates & inflation.',
      tags: ['fire', 'retirement', 'monte carlo', 'financial freedom', 'swr'],
      badge: 'Monte Carlo',
      badgeType: 'success',
      route: function () {
        if (window.LM_MonteCarloFIRE && typeof window.LM_MonteCarloFIRE.open === 'function') {
          window.LM_MonteCarloFIRE.open();
        }
      },
      quickAction: {
        label: '🔥 Simulate',
        title: 'Monte Carlo FIRE Simulator',
        action: function () {
          if (window.LM_MonteCarloFIRE && typeof window.LM_MonteCarloFIRE.open === 'function') {
            window.LM_MonteCarloFIRE.open();
          }
        }
      }
    },

    // ── 7. VAULT & SECURITY ───────────────────────────────────
    {
      id: 'app-lock',
      title: 'App Security & Lock',
      category: 'vault',
      icon: '🛡️',
      desc: 'Master passcode, WebAuthn biometrics, timeout auto-lock, and balance privacy.',
      tags: ['security', 'pin', 'biometrics', 'privacy', 'lock', 'vault'],
      badge: 'Biometric / PIN',
      badgeType: 'success',
      route: function () {
        if (typeof openAppLockSettingsModal === 'function') openAppLockSettingsModal();
      }
    },
    {
      id: 'statement-parser',
      title: 'Universal CSV Parser',
      category: 'vault',
      icon: '📄',
      desc: 'Import and normalize bank account statements from HDFC, SBI, ICICI, Axis and more.',
      tags: ['csv', 'statement', 'import', 'bank import', 'parser'],
      badge: 'Universal CSV',
      badgeType: 'info',
      route: function () {
        if (window.LM_StatementParser && typeof window.LM_StatementParser.openFilePicker === 'function') {
          window.LM_StatementParser.openFilePicker();
        }
      },
      quickAction: {
        label: '📄 Import',
        title: 'Import Bank Statement CSV',
        action: function () {
          if (window.LM_StatementParser && typeof window.LM_StatementParser.openFilePicker === 'function') {
            window.LM_StatementParser.openFilePicker();
          }
        }
      }
    },
    {
      id: 'receipt-vault',
      title: 'Receipts & OCR Vault',
      category: 'vault',
      icon: '🔒',
      desc: 'Encrypted receipt bills vault with automated AI optical text and amount extraction.',
      tags: ['receipts', 'ocr', 'bills', 'camera', 'vault', 'attachments'],
      badge: 'AI OCR',
      badgeType: 'info',
      route: function () {
        if (window.LM_ReceiptVault && typeof window.LM_ReceiptVault.open === 'function') {
          window.LM_ReceiptVault.open();
        }
      },
      quickAction: {
        label: '📷 Scan OCR',
        title: 'Scan Receipt OCR',
        action: function () {
          if (window.LM_ReceiptOCR && typeof window.LM_ReceiptOCR.openReceiptScannerModal === 'function') {
            window.LM_ReceiptOCR.openReceiptScannerModal();
          }
        }
      }
    },
    {
      id: 'dashboard-customizer',
      title: 'Customize Dashboard',
      category: 'vault',
      icon: '🎛️',
      desc: 'Re-order, show or hide KPI widgets, charts and telemetry on your executive home screen.',
      tags: ['customize', 'dashboard', 'widgets', 'layout', 'settings'],
      badge: 'Widgets Config',
      badgeType: 'info',
      route: function () {
        if (typeof openDashboardCustomizer === 'function') openDashboardCustomizer();
      }
    },
    {
      id: 'admin-center',
      title: 'Admin Command Center',
      category: 'vault',
      icon: '⚙️',
      desc: 'User management, account approvals, database telemetry, and diagnostic logs.',
      tags: ['admin', 'users', 'approvals', 'diagnostics', 'telemetry'],
      badge: 'Admin Only',
      badgeType: 'warning',
      route: function () {
        if (window.LM_Admin && typeof window.LM_Admin.show === 'function') {
          window.LM_Admin.show('approvals');
        }
      }
    },
    {
      id: 'command-palette',
      title: 'Command Palette (⌘K)',
      category: 'vault',
      icon: '⚡',
      desc: 'Superfast universal launcher: jump between any page, search transactions, or run actions.',
      tags: ['command palette', 'shortcuts', 'search', 'hotkey', 'quick'],
      badge: '⌘K / Ctrl+K',
      badgeType: 'info',
      route: function () {
        if (window.LM_CommandPalette && typeof window.LM_CommandPalette.open === 'function') {
          window.LM_CommandPalette.open();
        }
      },
      quickAction: {
        label: '⌘K Open',
        title: 'Open Command Palette',
        action: function () {
          if (window.LM_CommandPalette && typeof window.LM_CommandPalette.open === 'function') {
            window.LM_CommandPalette.open();
          }
        }
      }
    }
  ];

  var ModuleHubUI = {
    modules: MODULES,
    categories: CATEGORIES,
    getPinned: function () { return _loadPinned(); },
    isPinned: function (id) { return _loadPinned().indexOf(id) !== -1; },
    getRecentModules: function () {
      var recents = _loadRecents();
      return recents.map(function (id) {
        return MODULES.find(function (m) { return m.id === id; });
      }).filter(Boolean);
    },
    markRecentlyUsed: function (id) {
      _recordRecent(id);
    },
    getTelemetry: function (mod) {
      return this.getLiveTelemetry(mod);
    },
    /**
     * Get real-time badge for a module
     */
    getLiveTelemetry: function (mod) {
      try {
        if (mod.id === 'credit-cards' && window.LM_CreditCardsService) {
          var cards = window.LM_CreditCardsService.getCards();
          if (cards && cards.length > 0) {
            var unpaid = cards.filter(function (c) { return c.billDue && (c.status === 'unpaid' || c.unpaid); });
            if (unpaid.length > 0) {
              return { text: unpaid.length + ' Bill Due', type: 'danger' };
            }
            return { text: cards.length + ' Cards', type: 'info' };
          }
        }
        if (mod.id === 'business' && window.LM_BusinessService) {
          var bizs = typeof window.LM_BusinessService.getBusinesses === 'function' ? window.LM_BusinessService.getBusinesses() : [];
          var m = typeof window.LM_BusinessService.getMetrics === 'function' ? window.LM_BusinessService.getMetrics('all') :
                  (typeof window.LM_BusinessService.calcTotals === 'function' ? window.LM_BusinessService.calcTotals() : null);
          if (m && (m.totalCredits > 0 || typeof m.netProfit === 'number')) {
            var np = typeof m.netProfit === 'number' ? m.netProfit : 0;
            return { text: '₹' + Math.round(np).toLocaleString('en-IN') + ' P&L', type: np >= 0 ? 'success' : 'danger' };
          }
          if (bizs && bizs.length > 0) {
            return { text: bizs.length + ' Profile(s)', type: 'info' };
          }
        }
        if (mod.id === 'trips' && window.LM_TripService) {
          var trips = window.LM_TripService.getTrips();
          if (trips && trips.length > 0) {
            return { text: trips.length + ' Trip(s)', type: 'success' };
          }
        }
        if (mod.id === 'vehicles' && window.LM_VehicleService) {
          var vehs = window.LM_VehicleService.getVehicles();
          if (vehs && vehs.length > 0) {
            return { text: vehs.length + ' Vehicle(s)', type: 'info' };
          }
        }
        if (mod.id === 'stocks' && window.LM_StockPortfolioService) {
          var holdings = window.LM_StockPortfolioService.getHoldings();
          if (holdings && holdings.length > 0) {
            return { text: holdings.length + ' Stocks', type: 'success' };
          }
        }
        if (mod.id === 'loans') {
          var loans = window.state?.loans || window.loans;
          if (Array.isArray(loans) && loans.length > 0) {
            return { text: loans.length + ' Loans', type: 'danger' };
          }
        }
      } catch (e) {}
      return { text: mod.badge || 'Tool', type: mod.badgeType || 'info' };
    },

    init: function () {
      _viewMode = _loadViewMode();
      _sortMode = _loadSortMode();
      _pinnedModules = _loadPinned();
      _recentModules = _loadRecents();
      _focusedIndex = -1;
      this.render();
      this.syncSidebarPinned();
      this._bindKeyboardEvents();
    },

    setViewMode: function (mode) {
      if (mode !== 'grid' && mode !== 'list') return;
      _viewMode = mode;
      _saveViewMode(mode);
      _focusedIndex = -1;
      if (typeof showToast === 'function') {
        showToast(mode === 'grid' ? '▦ Switched to Executive Grid View' : '☰ Switched to Compact List View', 'info');
      }
      this.render();
    },

    setSortMode: function (mode) {
      _sortMode = mode;
      _saveSortMode(mode);
      _focusedIndex = -1;
      var sortLabels = {
        pinned: '⭐ Starred First',
        recent: '⚡ Recently Used',
        name: '🔤 Name (A–Z)',
        telemetry: '🔔 Action Alerts First',
        category: '📁 By Category'
      };
      if (typeof showToast === 'function') {
        showToast('Sorted by: ' + (sortLabels[mode] || mode), 'info');
      }
      this.render();
    },

    setCategory: function (catId) {
      _activeCategory = catId;
      _focusedIndex = -1;
      this.render();
    },

    setSearch: function (q) {
      _searchQuery = (q || '').toLowerCase().trim();
      _focusedIndex = -1;
      this.render();
      var input = document.getElementById('modHubSearchInput');
      if (input) {
        input.value = q;
        input.focus();
        // place cursor at end
        var len = input.value.length;
        input.setSelectionRange(len, len);
      }
    },

    clearSearch: function () {
      _searchQuery = '';
      _focusedIndex = -1;
      this.render();
      var input = document.getElementById('modHubSearchInput');
      if (input) {
        input.value = '';
        input.focus();
      }
    },

    triggerQuickAction: function (modId, ev) {
      if (ev) ev.stopPropagation();
      var mod = MODULES.find(function (m) { return m.id === modId; });
      if (!mod || !mod.quickAction) return;
      _recordRecent(modId);
      if (typeof mod.quickAction.action === 'function') {
        try {
          mod.quickAction.action();
        } catch (err) {
          console.error('[ModuleHub] Quick action error:', err);
        }
      }
    },

    togglePin: function (modId, ev) {
      if (ev) ev.stopPropagation();
      _pinnedModules = _loadPinned();
      var idx = _pinnedModules.indexOf(modId);
      if (idx !== -1) {
        _pinnedModules.splice(idx, 1);
        if (typeof showToast === 'function') showToast('Unpinned module from favorites', 'info');
      } else {
        _pinnedModules.push(modId);
        if (typeof showToast === 'function') showToast('⭐ Pinned to favorite modules!', 'success');
      }
      _savePinned(_pinnedModules);
      this.render();
      this.syncSidebarPinned();
    },

    launch: function (modId) {
      var mod = MODULES.find(function (m) { return m.id === modId; });
      if (!mod) return;
      _recordRecent(modId);
      if (typeof mod.route === 'function') {
        mod.route();
      }
    },

    /**
     * Keep sidebar pinned section dynamically in sync
     */
    syncSidebarPinned: function () {
      var container = document.getElementById('sidebarPinnedList');
      if (!container) return;
      var pinned = _loadPinned();
      if (pinned.length === 0) {
        container.innerHTML = '<div style="font-size:11px;color:var(--text-3);padding:6px 12px;">No pinned modules. Tap ⭐ on any module in Hub.</div>';
        return;
      }
      var html = pinned.map(function (id) {
        var m = MODULES.find(function (item) { return item.id === id; });
        if (!m) return '';
        return '<button class="sidebar-nav-item" onclick="window.LM_ModuleHubUI.launch(\'' + m.id + '\')">' +
          '<span class="nav-icon">' + m.icon + '</span> ' +
          '<span class="nav-label">' + _esc(m.title) + '</span>' +
        '</button>';
      }).join('');
      container.innerHTML = html;
    },

    /**
     * Sort items helper
     */
    _sortItems: function (items, sortMode, pinned, recents, self) {
      var arr = items.slice();
      if (sortMode === 'pinned') {
        arr.sort(function (a, b) {
          var aPin = pinned.indexOf(a.id) !== -1 ? 1 : 0;
          var bPin = pinned.indexOf(b.id) !== -1 ? 1 : 0;
          if (bPin !== aPin) return bPin - aPin;
          return a.title.localeCompare(b.title);
        });
      } else if (sortMode === 'recent') {
        arr.sort(function (a, b) {
          var aIdx = recents.indexOf(a.id);
          var bIdx = recents.indexOf(b.id);
          if (aIdx === -1 && bIdx === -1) return a.title.localeCompare(b.title);
          if (aIdx === -1) return 1;
          if (bIdx === -1) return -1;
          return aIdx - bIdx;
        });
      } else if (sortMode === 'name') {
        arr.sort(function (a, b) {
          return a.title.localeCompare(b.title);
        });
      } else if (sortMode === 'telemetry') {
        var weight = { danger: 4, warning: 3, success: 2, info: 1, muted: 0 };
        arr.sort(function (a, b) {
          var ta = self.getLiveTelemetry(a);
          var tb = self.getLiveTelemetry(b);
          var wa = weight[ta.type] || 0;
          var wb = weight[tb.type] || 0;
          if (wb !== wa) return wb - wa;
          return a.title.localeCompare(b.title);
        });
      } else if (sortMode === 'category') {
        arr.sort(function (a, b) {
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          return a.title.localeCompare(b.title);
        });
      }
      return arr;
    },

    /**
     * Keyboard navigation bindings (Arrow keys, Enter, Esc)
     */
    _bindKeyboardEvents: function () {
      if (this._kbdBound) return;
      this._kbdBound = true;
      var self = this;
      document.addEventListener('keydown', function (e) {
        var page = document.getElementById('page-modules');
        if (!page || page.classList.contains('hidden') || page.style.display === 'none') {
          return;
        }
        var searchInput = document.getElementById('modHubSearchInput');
        var isSearchFocused = document.activeElement === searchInput;

        if (e.key === 'Escape') {
          if (isSearchFocused && searchInput && searchInput.value) {
            e.preventDefault();
            self.clearSearch();
          }
          return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          var cards = page.querySelectorAll('.mod-card, .mod-list-row');
          if (!cards || cards.length === 0) return;
          e.preventDefault();
          if (e.key === 'ArrowDown') {
            _focusedIndex = (_focusedIndex + 1) % cards.length;
          } else {
            _focusedIndex = (_focusedIndex - 1 + cards.length) % cards.length;
          }
          cards.forEach(function (c, idx) {
            if (idx === _focusedIndex) {
              c.classList.add('is-keyboard-focused');
              c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
              c.classList.remove('is-keyboard-focused');
            }
          });
        } else if (e.key === 'Enter') {
          var cards = page.querySelectorAll('.mod-card, .mod-list-row');
          if (_focusedIndex >= 0 && _focusedIndex < cards.length) {
            var activeCard = cards[_focusedIndex];
            var modId = activeCard.getAttribute('data-mod-id');
            if (modId) {
              e.preventDefault();
              self.launch(modId);
            }
          }
        }
      });
    },

    /**
     * Main Renderer for #page-modules
     */
    render: function () {
      var container = document.getElementById('page-modules');
      if (!container) return;

      var self = this;
      _viewMode = _loadViewMode();
      _sortMode = _loadSortMode();
      var pinned = _loadPinned();
      var recents = _loadRecents();

      // Filter modules by search and category
      var filtered = MODULES.filter(function (m) {
        var matchCat = true;
        if (_activeCategory === 'pinned') {
          matchCat = pinned.indexOf(m.id) !== -1;
        } else if (_activeCategory !== 'all') {
          matchCat = m.category === _activeCategory;
        }

        var matchSearch = true;
        if (_searchQuery) {
          var hay = (m.title + ' ' + m.desc + ' ' + (m.tags || []).join(' ')).toLowerCase();
          matchSearch = hay.indexOf(_searchQuery) !== -1;
        }

        return matchCat && matchSearch;
      });

      // Group modules by category or unified sort presentation
      var categoriesToRender = [];
      if (_activeCategory === 'all' && !_searchQuery && _sortMode === 'category') {
        var catOrder = ['banking', 'wealth', 'debt', 'business', 'lifestyle', 'reports', 'vault'];
        catOrder.forEach(function (cId) {
          var catDef = CATEGORIES.find(function (c) { return c.id === cId; });
          var items = MODULES.filter(function (m) { return m.category === cId; });
          if (items.length > 0) {
            categoriesToRender.push({ def: catDef, items: items });
          }
        });
      } else {
        var sorted = self._sortItems(filtered, _sortMode, pinned, recents, self);
        var label = 'Modules';
        var icon = '⊞';
        if (_searchQuery) {
          label = 'Search Results for "' + _searchQuery + '"';
          icon = '🔍';
        } else if (_activeCategory !== 'all') {
          var curCat = CATEGORIES.find(function (c) { return c.id === _activeCategory; });
          if (curCat) { label = curCat.label; icon = curCat.icon; }
        } else {
          var sortLabels = {
            pinned: 'Starred & Favorite Modules First',
            recent: 'Recently Used Modules First',
            name: 'Alphabetical (A–Z)',
            telemetry: 'Action & Telemetry Alerts First'
          };
          label = sortLabels[_sortMode] || 'All Modules';
        }
        categoriesToRender.push({ def: { label: label, icon: icon }, items: sorted });
      }

      // Recent chips
      var recentItems = recents.map(function (id) {
        return MODULES.find(function (m) { return m.id === id; });
      }).filter(Boolean);

      var html = `
        <div class="mod-hub-container">
          <!-- ── COMMAND HERO HEADER ── -->
          <div class="mod-hub-header">
            <div class="mod-hub-header-left">
              <div class="mod-hub-avatar">⊞</div>
              <div>
                <h1 class="mod-hub-title">Executive Modules &amp; Cockpit</h1>
                <div class="mod-hub-subtitle">
                  <span>` + MODULES.length + ` financial tools &amp; intelligence engines</span>
                  <span class="mod-hub-stat-pill">✨ Modular OS</span>
                </div>
              </div>
            </div>

            <div class="mod-hub-header-actions">
              <button class="mod-category-pill" onclick="window.LM_CommandPalette?.open()" title="Open Universal Command Palette (⌘K)">
                <span>⚡</span> Command Palette <span style="font-size:10px;color:var(--text-3);margin-left:4px;">⌘K</span>
              </button>
            </div>
          </div>

          <!-- ── SEARCH BAR & CONTROLS ── -->
          <div class="mod-hub-controls">
            <div class="mod-search-bar">
              <span class="mod-search-icon">🔍</span>
              <input type="text" id="modHubSearchInput" class="mod-search-input"
                placeholder="Search modules, tools, calculators, reports (e.g. 'stocks', 'sankey', 'emi', 'khata')…"
                value="` + _esc(_searchQuery) + `"
                oninput="window.LM_ModuleHubUI.setSearch(this.value)" />
              ` + (_searchQuery ? `
                <button class="mod-search-clear-btn" onclick="window.LM_ModuleHubUI.clearSearch()" title="Clear Search (Esc)">✕</button>
              ` : '') + `
              <span class="mod-search-kbd">⌘M</span>
            </div>

            <!-- Categories & View/Sort Toolbar -->
            <div class="mod-hub-toolbar">
              <div class="mod-categories-bar">
                ` + CATEGORIES.map(function (cat) {
                  var isAct = _activeCategory === cat.id;
                  var count = (cat.id === 'all')
                    ? MODULES.length
                    : (cat.id === 'pinned'
                        ? pinned.length
                        : MODULES.filter(function (m) { return m.category === cat.id; }).length);
                  return `
                    <button class="mod-category-pill` + (isAct ? ' active' : '') + `" onclick="window.LM_ModuleHubUI.setCategory('` + cat.id + `')">
                      <span>` + cat.icon + `</span>
                      <span>` + cat.label + `</span>
                      <span class="mod-category-count">` + count + `</span>
                    </button>
                  `;
                }).join('') + `
              </div>

              <div class="mod-toolbar-right">
                <div class="mod-sort-wrap">
                  <span class="mod-sort-label">Sort:</span>
                  <select class="mod-sort-select" onchange="window.LM_ModuleHubUI.setSortMode(this.value)">
                    <option value="pinned"` + (_sortMode === 'pinned' ? ' selected' : '') + `>⭐ Starred First</option>
                    <option value="recent"` + (_sortMode === 'recent' ? ' selected' : '') + `>⚡ Recently Used</option>
                    <option value="name"` + (_sortMode === 'name' ? ' selected' : '') + `>🔤 Name (A–Z)</option>
                    <option value="telemetry"` + (_sortMode === 'telemetry' ? ' selected' : '') + `>🔔 Action Alerts First</option>
                    <option value="category"` + (_sortMode === 'category' ? ' selected' : '') + `>📁 By Category</option>
                  </select>
                </div>

                <div class="mod-view-switcher" role="group" aria-label="View Mode">
                  <button class="mod-view-btn` + (_viewMode === 'grid' ? ' active' : '') + `"
                    onclick="window.LM_ModuleHubUI.setViewMode('grid')" title="Executive Grid View">
                    ▦ Grid
                  </button>
                  <button class="mod-view-btn` + (_viewMode === 'list' ? ' active' : '') + `"
                    onclick="window.LM_ModuleHubUI.setViewMode('list')" title="Compact Power-User List View">
                    ☰ List
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Search Status Bar -->
          ` + (_searchQuery ? `
            <div class="mod-search-status">
              <span>Found <strong>` + filtered.length + `</strong> matching module` + (filtered.length === 1 ? '' : 's') + ` for "<em>` + _esc(_searchQuery) + `</em>"</span>
              <button class="mod-search-status-clear" onclick="window.LM_ModuleHubUI.clearSearch()">Clear Filter ✕</button>
            </div>
          ` : '') + `

          <!-- ── RECENTLY LAUNCHED STRIP ── -->
          ` + (!_searchQuery && recentItems.length > 0 ? `
            <div class="mod-recent-strip">
              <span class="mod-recent-label">⚡ Recent:</span>
              ` + recentItems.map(function (rm) {
                return `
                  <button class="mod-recent-chip" onclick="window.LM_ModuleHubUI.launch('` + rm.id + `')">
                    <span>` + rm.icon + `</span>
                    <span>` + _esc(rm.title) + `</span>
                  </button>
                `;
              }).join('') + `
            </div>
          ` : '') + `

          <!-- ── MODULE SECTIONS & GRIDS / LISTS ── -->
          ` + (filtered.length === 0 ? `
            <div style="background:var(--hub-card-bg);border:1px solid var(--hub-border);border-radius:18px;padding:48px 24px;text-align:center;color:var(--text-2);">
              <div style="font-size:36px;margin-bottom:12px;">🔍</div>
              <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px;">No matching modules found</div>
              <div style="font-size:13px;color:var(--text-3);margin-bottom:16px;">Try adjusting your search terms or browse all categories.</div>
              <button class="mod-category-pill active" onclick="window.LM_ModuleHubUI.setSearch(''); window.LM_ModuleHubUI.setCategory('all');">
                Show All ` + MODULES.length + ` Modules
              </button>
            </div>
          ` : categoriesToRender.map(function (sec) {
            return `
              <div class="mod-section">
                <div class="mod-section-header">
                  <div class="mod-section-title">
                    <span>` + sec.def.icon + `</span>
                    <span>` + sec.def.label + `</span>
                  </div>
                  <span class="mod-section-badge">` + sec.items.length + ` apps</span>
                </div>

                ` + (_viewMode === 'list' ? `
                  <div class="mod-list-view">
                    ` + sec.items.map(function (m) {
                      var isPinned = pinned.indexOf(m.id) !== -1;
                      var telemetry = self.getLiveTelemetry(m);
                      var titleHl = _highlightMatch(m.title, _searchQuery);
                      var descHl = _highlightMatch(m.desc, _searchQuery);
                      return `
                        <div class="mod-list-row cat-` + m.category + (isPinned ? ' pinned' : '') + `"
                          data-mod-id="` + m.id + `"
                          onclick="window.LM_ModuleHubUI.launch('` + m.id + `')">
                          <div class="mod-list-left">
                            <div class="mod-list-icon">` + m.icon + `</div>
                            <div class="mod-list-meta">
                              <div class="mod-list-title">
                                <span>` + titleHl + `</span>
                                <span class="mod-list-cat-pill">` + m.category + `</span>
                              </div>
                              <div class="mod-list-desc">` + descHl + `</div>
                            </div>
                          </div>

                          <div class="mod-list-right">
                            <span class="mod-card-badge ` + telemetry.type + `">` + _esc(telemetry.text) + `</span>
                            ` + (m.quickAction ? `
                              <button class="mod-list-action-btn"
                                onclick="window.LM_ModuleHubUI.triggerQuickAction('` + m.id + `', event)"
                                title="` + _esc(m.quickAction.title || m.quickAction.label) + `">
                                ` + _esc(m.quickAction.label) + `
                              </button>
                            ` : '') + `
                            <button class="mod-card-pin-btn` + (isPinned ? ' pinned' : '') + `"
                              onclick="window.LM_ModuleHubUI.togglePin('` + m.id + `', event)"
                              title="` + (isPinned ? 'Unpin from favorites' : 'Pin to favorites') + `">
                              ` + (isPinned ? '⭐' : '☆') + `
                            </button>
                            <span class="mod-card-arrow">→</span>
                          </div>
                        </div>
                      `;
                    }).join('') + `
                  </div>
                ` : `
                  <div class="mod-grid">
                    ` + sec.items.map(function (m) {
                      var isPinned = pinned.indexOf(m.id) !== -1;
                      var telemetry = self.getLiveTelemetry(m);
                      var titleHl = _highlightMatch(m.title, _searchQuery);
                      var descHl = _highlightMatch(m.desc, _searchQuery);
                      return `
                        <div class="mod-card cat-` + m.category + (isPinned ? ' pinned' : '') + `"
                          data-mod-id="` + m.id + `"
                          onclick="window.LM_ModuleHubUI.launch('` + m.id + `')">
                          <div>
                            <div class="mod-card-top">
                              <div class="mod-card-icon-wrap">` + m.icon + `</div>
                              <div class="mod-card-top-actions">
                                ` + (m.quickAction ? `
                                  <button class="mod-card-action-btn"
                                    onclick="window.LM_ModuleHubUI.triggerQuickAction('` + m.id + `', event)"
                                    title="` + _esc(m.quickAction.title || m.quickAction.label) + `">
                                    ` + _esc(m.quickAction.label) + `
                                  </button>
                                ` : '') + `
                                <button class="mod-card-pin-btn` + (isPinned ? ' pinned' : '') + `"
                                  onclick="window.LM_ModuleHubUI.togglePin('` + m.id + `', event)"
                                  title="` + (isPinned ? 'Unpin from favorites' : 'Pin to favorites') + `">
                                  ` + (isPinned ? '⭐' : '☆') + `
                                </button>
                              </div>
                            </div>

                            <div class="mod-card-title">` + titleHl + `</div>
                            <div class="mod-card-desc">` + descHl + `</div>
                          </div>

                          <div class="mod-card-footer">
                            <span class="mod-card-badge ` + telemetry.type + `">` + _esc(telemetry.text) + `</span>
                            <span class="mod-card-arrow">→</span>
                          </div>
                        </div>
                      `;
                    }).join('') + `
                  </div>
                `) + `
              </div>
            `;
          }).join('')) + `

        </div>
      `;

      container.innerHTML = html;
    }
  };

  window.LM_ModuleHubUI = ModuleHubUI;
})();
