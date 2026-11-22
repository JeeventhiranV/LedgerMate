/**
 * ═════════════════════════════════════════════════════════════════════════
 * LedgerMate — Sidebar Collapsible Submenu Navigation OS Engine
 * File: src/scripts/Modules/SidebarNavUI.js
 * 
 * High-performance, animated collapsible side menu system with 
 * hardware-accelerated CSS Grid transitions, active route tracking,
 * localStorage state memory, and strict isolation for Loan and 
 * Transaction module toggles.
 * ═════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'lm_sidebar_open_groups';

  // Mapping of page IDs to parent group IDs for automatic expansion
  var ROUTE_TO_GROUP = {
    // Banking & Credit
    'credit-cards': 'banking',
    'budgets': 'banking',
    'subscriptions': 'banking',
    'templates': 'banking',

    // Enterprise & Business
    'business': 'business',
    'tax-planner': 'business',

    // Debt & Liabilities
    'loans': 'debt',
    'debt-payoff': 'debt',

    // Wealth & Investments
    'stocks': 'wealth',
    'investments': 'wealth',
    'wealth': 'wealth',
    'wealth-goals': 'wealth',
    'savings-goals': 'wealth',
    'emergency-fund': 'wealth',
    'essentials': 'wealth',
    'gold': 'wealth',

    // Lifestyle & Utilities
    'trips': 'lifestyle',
    'vehicles': 'lifestyle',
    'notes': 'lifestyle',
    'media-compressor': 'lifestyle',
    'widget': 'lifestyle',
    'views-browser': 'lifestyle',

    // Reports & Analytics
    'analytics': 'reports',
    'fy-summary': 'reports',
    'month-comparison': 'reports',
    'spending-heatmap': 'reports',
    'cash-flow-calendar': 'reports'
  };

  var SidebarNavUI = {
    _openGroups: new Set(),
    _initialized: false,

    init: function () {
      this.loadSavedState();
      this.renderStateToDOM();

      // Automatically sync with current active page
      var curPage = 'dashboard';
      if (typeof window.LM_getActivePage === 'function') {
        curPage = window.LM_getActivePage();
      } else if (window._currentActivePage) {
        curPage = window._currentActivePage;
      }
      this.syncActiveRoute(curPage);
      this._initialized = true;
    },

    loadSavedState: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          var arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            this._openGroups = new Set(arr);
            return;
          }
        }
      } catch (e) {}
      // Default: Banking group open for initial exploration
      this._openGroups = new Set(['banking']);
    },

    saveState: function () {
      try {
        var arr = Array.from(this._openGroups);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      } catch (e) {}
    },

    renderStateToDOM: function () {
      var self = this;
      var groups = document.querySelectorAll('#sidebar .sidebar-nav-group');
      groups.forEach(function (grp) {
        var gid = grp.dataset.group;
        var isOpen = self._openGroups.has(gid);
        grp.classList.toggle('is-open', isOpen);
        var header = grp.querySelector('.sidebar-nav-group-header');
        if (header) {
          header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
      });
      this.updateToggleAllLabel(groups.length > 0 && this._openGroups.size >= Math.ceil(groups.length / 2));
    },

    toggleAllGroups: function (event) {
      if (event) {
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
      }

      var groups = document.querySelectorAll('#sidebar .sidebar-nav-group');
      if (!groups || groups.length === 0) return;

      var allGids = [];
      groups.forEach(function (grp) {
        if (grp.dataset.group) allGids.push(grp.dataset.group);
      });

      // If at least half are open, collapse all. Otherwise, expand all.
      var openCount = 0;
      var self = this;
      allGids.forEach(function (gid) {
        if (self._openGroups.has(gid)) openCount++;
      });

      var shouldExpand = openCount < Math.ceil(allGids.length / 2);

      allGids.forEach(function (gid) {
        if (shouldExpand) {
          self._openGroups.add(gid);
        } else {
          self._openGroups.delete(gid);
        }
      });

      this.renderStateToDOM();
      this.saveState();
      this.updateToggleAllLabel(shouldExpand);

      try {
        if (window.LM_Haptic && typeof window.LM_Haptic.light === 'function') {
          window.LM_Haptic.light();
        }
      } catch (e) {}
    },

    updateToggleAllLabel: function (isExpanded) {
      var btn = document.getElementById('sidebarToggleAllBtn');
      if (btn) {
        btn.textContent = isExpanded ? '↕ Collapse All' : '↕ Expand All';
      }
    },

    toggleGroup: function (groupId, event) {
      if (event) {
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
      }

      var grp = document.getElementById('sidebarGroup-' + groupId) || document.querySelector('#sidebar .sidebar-nav-group[data-group="' + groupId + '"]');
      if (!grp) return;

      var isOpen = this._openGroups.has(groupId);
      if (isOpen) {
        this._openGroups.delete(groupId);
      } else {
        this._openGroups.add(groupId);
      }

      var nowOpen = !isOpen;
      grp.classList.toggle('is-open', nowOpen);
      var header = grp.querySelector('.sidebar-nav-group-header');
      if (header) {
        header.setAttribute('aria-expanded', nowOpen ? 'true' : 'false');
      }

      this.saveState();

      var groups = document.querySelectorAll('#sidebar .sidebar-nav-group');
      this.updateToggleAllLabel(groups.length > 0 && this._openGroups.size >= Math.ceil(groups.length / 2));

      try {
        if (window.LM_Haptic && typeof window.LM_Haptic.light === 'function') {
          window.LM_Haptic.light();
        }
      } catch (e) {}
    },

    openGroup: function (groupId, persist) {
      var grp = document.getElementById('sidebarGroup-' + groupId) || document.querySelector('#sidebar .sidebar-nav-group[data-group="' + groupId + '"]');
      if (!grp) return;

      this._openGroups.add(groupId);
      grp.classList.add('is-open');
      var header = grp.querySelector('.sidebar-nav-group-header');
      if (header) {
        header.setAttribute('aria-expanded', 'true');
      }

      if (persist !== false) {
        this.saveState();
      }
    },

    closeGroup: function (groupId) {
      var grp = document.getElementById('sidebarGroup-' + groupId) || document.querySelector('#sidebar .sidebar-nav-group[data-group="' + groupId + '"]');
      if (!grp) return;

      this._openGroups.delete(groupId);
      grp.classList.remove('is-open');
      var header = grp.querySelector('.sidebar-nav-group-header');
      if (header) {
        header.setAttribute('aria-expanded', 'false');
      }

      this.saveState();
    },

    syncActiveRoute: function (page) {
      if (!page) return;

      // 1. Remove .active from all sidebar items and subitems
      var allItems = document.querySelectorAll('#sidebar .sidebar-nav-item, #sidebar .sidebar-nav-subitem');
      allItems.forEach(function (el) {
        el.classList.remove('active');
      });

      // 2. Highlight direct sidebar-nav-item if in top section (dashboard, transactions, analytics, modules)
      var directItem = document.querySelector('#sidebar .sidebar-nav-item[data-module="' + page + '"]') ||
                       document.querySelector('#sidebar .sidebar-nav-item[onclick*="showPage(\'' + page + '\')"]');
      if (directItem) {
        directItem.classList.add('active');
      }

      // 3. Highlight matching subitem
      var subItem = document.querySelector('#sidebar .sidebar-nav-subitem[data-module="' + page + '"]') ||
                    document.querySelector('#sidebar .sidebar-nav-subitem[onclick*="showPage(\'' + page + '\')"]');
      if (subItem) {
        subItem.classList.add('active');
      }

      // 4. Auto-expand parent group if route belongs to a collapsible category
      var parentGroupId = ROUTE_TO_GROUP[page];
      if (parentGroupId) {
        this.openGroup(parentGroupId, false);
      }
    }
  };

  window.LM_SidebarNav = SidebarNavUI;

  // Auto-init on DOMContentLoaded or immediate if already ready
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        SidebarNavUI.init();
      });
    } else {
      setTimeout(function () {
        SidebarNavUI.init();
      }, 50);
    }
  }
})();
