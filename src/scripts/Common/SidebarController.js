/**
 * LedgerMate – Sidebar Navigation Controller (SidebarController.js)
 * ─────────────────────────────────────────────────────────────────────────────
 * Controls opening, closing, overlay backdrop, and touch click-outside dismissal
 * for the responsive sidebar.
 *
 * Exposes:
 *  - window.LM_SidebarController
 *  - window.toggleSidebar
 *  - window.closeSidebar
 * ─────────────────────────────────────────────────────────────────────────────
 */

(function (global) {
  'use strict';

  function toggleSidebar() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('sidebarOverlay');
    if (!sb) return;
    var isOpen = sb.classList.toggle('open');
    if (ov) ov.classList.toggle('show', isOpen);
    document.body.classList.toggle('sidebar-open', isOpen);
  }

  function closeSidebar() {
    var sb = document.getElementById('sidebar');
    var ov = document.getElementById('sidebarOverlay');
    if (sb) sb.classList.remove('open');
    if (ov) ov.classList.remove('show');
    document.body.classList.remove('sidebar-open');
  }

  function initListeners() {
    if (typeof document === 'undefined') return;

    var ov = document.getElementById('sidebarOverlay');
    if (ov) {
      ov.addEventListener('click', closeSidebar);
    }

    document.addEventListener('click', function (e) {
      var sidebar = document.getElementById('sidebar');
      if (!sidebar || !sidebar.classList.contains('open')) return;

      var isMenuClick = !!e.target.closest('#menuBtn');
      var isMoreClick = !!e.target.closest('#bnav-more');
      var isSidebarClick = !!e.target.closest('#sidebar');

      if (!isMenuClick && !isMoreClick && !isSidebarClick) {
        closeSidebar();
      }
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initListeners);
    } else {
      initListeners();
    }
  }

  var SidebarController = {
    toggleSidebar: toggleSidebar,
    closeSidebar: closeSidebar,
    initListeners: initListeners
  };

  global.LM_SidebarController = SidebarController;
  global.toggleSidebar = toggleSidebar;
  global.closeSidebar = closeSidebar;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
