/**
 * LedgerMate – ModalController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Accessible Modal Controller with WCAG 2.1 Focus Trap & Keyboard Navigation.
 * Encapsulates:
 *  • Standardized Modal Lifecycle (open, close, closeAll)
 *  • Focus Trapping & Restoration on Dismissal
 *  • Global Escape Key & Backdrop Click Handling
 *  • Modular Open/Close Hook Registry
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const _hooks = Object.create(null);
  const _openStack = [];
  let _lastFocusedElement = null;

  const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const ModalController = {

    /* ── Hook Registration ── */
    registerHook(modalId, callbacks = {}) {
      _hooks[modalId] = callbacks;
    },

    /* ── Open Modal ── */
    open(id) {
      if (!id || typeof document === 'undefined') return;
      const el = document.getElementById(id);
      if (!el) {
        console.warn(`[LM_ModalController] Modal with id "${id}" not found`);
        return;
      }

      // Save previous focus
      if (document.activeElement && document.activeElement !== document.body) {
        _lastFocusedElement = document.activeElement;
      }

      // Add show class
      el.classList.add('show');
      el.classList.add('open');
      el.setAttribute('aria-hidden', 'false');

      // Track open stack
      const idx = _openStack.indexOf(id);
      if (idx !== -1) _openStack.splice(idx, 1);
      _openStack.push(id);

      // Focus first focusable element inside modal
      const focusables = el.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusables.length > 0) {
        try { focusables[0].focus(); } catch (e) {}
      }

      // Invoke registered open hook
      if (_hooks[id] && typeof _hooks[id].onOpen === 'function') {
        try { _hooks[id].onOpen(el); } catch (e) { console.error('[LM_ModalController]', e); }
      }

      // Fallback: Populate legacy built-in modal lists if functions exist
      try {
        if (id === 'budgetModal' && typeof window.renderBudgetModalList === 'function') {
          window.renderBudgetModalList();
        } else if (id === 'loanModal' && typeof window.renderLoanList === 'function') {
          window.renderLoanList();
        } else if (id === 'goalModal' && typeof window.renderGoalList === 'function') {
          window.renderGoalList();
        } else if (id === 'investModal' && typeof window.renderInvestList === 'function') {
          window.renderInvestList();
        }
      } catch (err) {
        console.error('[LM_ModalController] Legacy hook error:', err);
      }
    },

    /* ── Close Modal ── */
    close(id) {
      if (typeof document === 'undefined') return;

      if (!id) {
        this.closeAll();
        return;
      }

      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('show');
        el.classList.remove('open');
        el.setAttribute('aria-hidden', 'true');
      }

      // Remove from open stack
      const idx = _openStack.indexOf(id);
      if (idx !== -1) _openStack.splice(idx, 1);

      // Invoke registered close hook
      if (_hooks[id] && typeof _hooks[id].onClose === 'function') {
        try { _hooks[id].onClose(el); } catch (e) { console.error('[LM_ModalController]', e); }
      }

      // Restore previous focus if no other modal is open
      if (_openStack.length === 0 && _lastFocusedElement && typeof _lastFocusedElement.focus === 'function') {
        try { _lastFocusedElement.focus(); } catch (e) {}
        _lastFocusedElement = null;
      }
    },

    /* ── Close All Modals ── */
    closeAll() {
      if (typeof document === 'undefined') return;
      const openModals = document.querySelectorAll('.modal-overlay.show, .stock-modal-backdrop.open, [data-modal].show');
      openModals.forEach(m => {
        m.classList.remove('show', 'open');
        m.setAttribute('aria-hidden', 'true');
      });
      _openStack.length = 0;

      if (_lastFocusedElement && typeof _lastFocusedElement.focus === 'function') {
        try { _lastFocusedElement.focus(); } catch (e) {}
        _lastFocusedElement = null;
      }
    },

    /* ── Focus Trap & Keydown Handler ── */
    handleKeyDown(e) {
      if (_openStack.length === 0) return;
      const topModalId = _openStack[_openStack.length - 1];
      const modalEl = document.getElementById(topModalId);
      if (!modalEl) return;

      // Handle Escape Key
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        ModalController.close(topModalId);
        return;
      }

      // Handle Tab Key for Focus Trap
      if (e.key === 'Tab' || e.keyCode === 9) {
        const focusables = Array.from(modalEl.querySelectorAll(FOCUSABLE_SELECTOR));
        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },

    /* ── Attach Backdrop Click Listeners ── */
    attachBackdropListeners() {
      if (typeof document === 'undefined') return;
      document.querySelectorAll('.modal-overlay, .stock-modal-backdrop').forEach(el => {
        el.addEventListener('click', e => {
          if (e.target === el) {
            const id = el.id || el.getAttribute('data-modal-id');
            if (id) ModalController.close(id);
            else el.classList.remove('show', 'open');
          }
        });
      });
    }
  };

  // Attach global keyboard and backdrop listeners in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('keydown', e => ModalController.handleKeyDown(e));
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => ModalController.attachBackdropListeners());
    } else {
      ModalController.attachBackdropListeners();
    }
    window.LM_ModalController = ModalController;
  }

  // Node export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalController;
  }
})();
