/**
 * LedgerMate – BudgetService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise Budget Calculation, Monitoring & Rollover Engine.
 * Encapsulates:
 *  • Actual vs Limit Aggregation per Category
 *  • Over-Budget and Near-Limit Alert Detection
 *  • Budget Rollover Computation across Months
 *  • CRUD operations & Cross-Tab Mutation Broadcasting
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  const BudgetService = {

    /* ── Current Month Helper ── */
    getCurrentMonth() {
      return new Date().toISOString().slice(0, 7);
    },

    /* ── Category Spend Aggregation ── */
    getCategoryActuals(month, transactions = []) {
      const targetMonth = month || this.getCurrentMonth();
      const actuals = Object.create(null);

      if (!Array.isArray(transactions)) return actuals;

      for (const t of transactions) {
        if (t.type === 'out' && t.category && t.date && t.date.startsWith(targetMonth)) {
          const cat = t.category.trim();
          actuals[cat] = (actuals[cat] || 0) + (Number(t.amount) || 0);
        }
      }

      return actuals;
    },

    /* ── Single Budget Health Status ── */
    getBudgetStatus(budget, actualAmount = 0) {
      const limit = Number(budget?.limit) || 0;
      const actual = Number(actualAmount) || 0;

      if (limit <= 0) {
        return {
          rawPct: 0,
          pct: 0,
          cls: 'safe',
          remaining: 0,
          isOver: false,
          actual,
          limit
        };
      }

      const rawPct = Math.round((actual / limit) * 100);
      const pct = Math.min(rawPct, 100);
      const isOver = rawPct >= 100;
      const remaining = limit - actual;

      let cls = 'safe';
      if (rawPct >= 100) cls = 'over';
      else if (pct > 90)  cls = 'danger';
      else if (pct > 70)  cls = 'warning';

      return {
        rawPct,
        pct,
        cls,
        remaining,
        isOver,
        actual,
        limit
      };
    },

    /* ── Over-Budget Alerts Detection ── */
    getOverBudgetItems(month, budgets = [], transactions = []) {
      const targetMonth = month || this.getCurrentMonth();
      const monthBudgets = budgets.filter(b => b.month === targetMonth);
      const actuals = this.getCategoryActuals(targetMonth, transactions);

      return monthBudgets
        .map(b => {
          const actual = actuals[b.category] || 0;
          const status = this.getBudgetStatus(b, actual);
          return { budget: b, actual, status };
        })
        .filter(item => item.status.isOver);
    },

    /* ── Near-Limit (Warning) Alerts ── */
    getNearLimitBudgets(month, budgets = [], transactions = [], thresholdPct = 80) {
      const targetMonth = month || this.getCurrentMonth();
      const monthBudgets = budgets.filter(b => b.month === targetMonth);
      const actuals = this.getCategoryActuals(targetMonth, transactions);

      return monthBudgets
        .map(b => {
          const actual = actuals[b.category] || 0;
          const status = this.getBudgetStatus(b, actual);
          return { budget: b, actual, status };
        })
        .filter(item => item.status.rawPct >= thresholdPct && item.status.rawPct < 100);
    },

    /* ── Rollover Calculation ── */
    calculateRollover(budgets = [], transactions = [], prevMonth, currentMonth) {
      if (!prevMonth || !currentMonth) return [];

      const prevBudgets = budgets.filter(b => b.month === prevMonth && b.rollover);
      const prevActuals = this.getCategoryActuals(prevMonth, transactions);

      const adjustments = [];
      for (const b of prevBudgets) {
        const actual = prevActuals[b.category] || 0;
        const unspent = Math.max(0, (Number(b.limit) || 0) - actual);
        if (unspent > 0) {
          adjustments.push({
            category: b.category,
            unspentRollover: unspent,
            fromMonth: prevMonth,
            toMonth: currentMonth
          });
        }
      }

      return adjustments;
    },

    /* ── Mutation Helpers ── */
    async deleteBudget(id) {
      if (!id) return false;

      if (typeof window !== 'undefined' && typeof window.del === 'function') {
        await window.del('budgets', id);
        if (window.state && Array.isArray(window.state.budgets)) {
          window.state.budgets = window.state.budgets.filter(b => b.id !== id);
        }
      }

      // Broadcast cross-tab mutation
      if (typeof window !== 'undefined' && window.LM_Bus) {
        window.LM_Bus.broadcast('lm:data:changed', { store: 'budgets', action: 'delete', id });
      }

      return true;
    }
  };

  // Browser global
  if (typeof window !== 'undefined') {
    window.LM_BudgetService = BudgetService;
  }

  // Node export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BudgetService;
  }
})();
