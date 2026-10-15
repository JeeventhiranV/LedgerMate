/**
 * LedgerMate – Executive Dashboard 2.0 Upgrade Engine
 * ──────────────────────────────────────────────────────────────────
 * Provides:
 * 1. Smart Focus Dock (Segmented view switching: Executive, Daily, Wealth, Analytics, All)
 * 2. Smart Daily Financial Briefing (Morning Digest, Safe Daily Allowance, 48h-7d Dues)
 * 3. Daily Pulse Recent Activity Stream
 * 4. Interactive Telemetry & Drilldowns (Click-to-filter / Click-to-pay)
 * 5. Full Balance Privacy & Customizer Integration
 *
 * Exposes: window.LM_DashboardUpgrade
 * ──────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  function _fmtINR(num) {
    if (typeof fmtINR === 'function') return fmtINR(num);
    var n = Number(num) || 0;
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  function _round2(num) {
    return Math.round((Number(num) || 0) * 100) / 100;
  }

  var DashboardUpgrade = {
    activeView: 'executive',

    VIEW_MAPPINGS: {
      executive: [
        'dashDailyBriefing',
        'dashHeroCard',
        'dashQuickActionsWrap',
        'cardOptimizerWidgetWrap',
        'dashCcUrgentBanner',
        'kpiCards',
        'healthScoreWidget',
        'dashInterlinkSection'
      ],
      daily: [
        'dashDailyBriefing',
        'dashQuickActionsWrap',
        'dashAccountSummariesSection',
        'dashRecentActivitySection',
        'dashCcRemindersSection',
        'dashVehicleWidget',
        'dashBudgetOverviewSection'
      ],
      wealth: [
        'dashHeroCard',
        'dashInterlinkSection',
        'dashWealthWidgetSection',
        'dashNwSparklineSection'
      ],
      analytics: [
        'healthScoreWidget',
        'dashChartsSection',
        'dashTopCategoriesForecastSection',
        'dashHeatmapSection',
        'dashMomSection'
      ],
      all: null
    },

    ALL_DASHBOARD_SECTIONS: [
      'dashDailyBriefing',
      'dashHeroCard',
      'dashQuickActionsWrap',
      'cardOptimizerWidgetWrap',
      'dashCcUrgentBanner',
      'kpiCards',
      'healthScoreWidget',
      'dashInterlinkSection',
      'dashCcRemindersSection',
      'dashVehicleWidget',
      'dashAccountSummariesSection',
      'dashRecentActivitySection',
      'dashChartsSection',
      'dashTopCategoriesForecastSection',
      'dashHeatmapSection',
      'dashWealthWidgetSection',
      'dashNwSparklineSection',
      'dashMomSection',
      'dashBudgetOverviewSection'
    ],

    init: function () {
      var saved = localStorage.getItem('lm_dash_focus_view');
      if (saved && (saved in this.VIEW_MAPPINGS)) {
        this.activeView = saved;
      } else {
        this.activeView = 'executive';
      }

      this.updateDockButtons();
      this.renderDailyBriefing();
      this.renderDailyRecentActivity();
      this.applyViewFilter();
      this.initInteractiveDrilldowns();
    },

    refresh: function () {
      this.renderDailyBriefing();
      this.renderDailyRecentActivity();
      this.applyViewFilter();
    },

    setViewMode: function (mode) {
      if (!mode || !(mode in this.VIEW_MAPPINGS)) mode = 'executive';
      this.activeView = mode;
      try {
        localStorage.setItem('lm_dash_focus_view', mode);
      } catch (e) {}

      this.updateDockButtons();
      this.applyViewFilter();

      try {
        if (window.LM_Haptic) window.LM_Haptic.light();
      } catch (err) {}
    },

    updateDockButtons: function () {
      var pills = document.querySelectorAll('.dash-focus-pill');
      var cur = this.activeView;
      pills.forEach(function (pill) {
        var view = pill.dataset.view;
        var isActive = view === cur;
        pill.classList.toggle('active', isActive);
        pill.setAttribute('aria-selected', isActive ? 'true' : 'false');
        if (isActive && typeof pill.scrollIntoView === 'function') {
          try {
            pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
          } catch (e) {}
        }
      });
    },

    applyViewFilter: function () {
      var active = this.activeView;
      var allowed = this.VIEW_MAPPINGS[active];
      var cfg = (typeof state === 'object' && state.dashboard_config && state.dashboard_config.widgets)
        ? state.dashboard_config.widgets
        : {};

      this.ALL_DASHBOARD_SECTIONS.forEach(function (secId) {
        var el = document.getElementById(secId);
        if (!el) return;

        // Check if explicitly hidden by user in customizer
        if (cfg[secId] === false) {
          el.style.display = 'none';
          return;
        }

        // Focus mode filter
        if (active === 'all' || !allowed) {
          el.style.display = '';
        } else {
          var shouldShow = allowed.indexOf(secId) !== -1;
          el.style.display = shouldShow ? '' : 'none';
        }
      });
    },

    // ─────────────────────────────────────────────────────────────
    // 🌅 SMART DAILY FINANCIAL BRIEFING STRIP
    // ─────────────────────────────────────────────────────────────
    renderDailyBriefing: function () {
      var container = document.getElementById('dashDailyBriefing');
      if (!container) return;

      var now = new Date();
      var hours = now.getHours();
      var timeGreeting = hours < 12 ? 'Morning' : (hours < 17 ? 'Afternoon' : 'Evening');
      var dateStr = now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

      // 1. Safe Daily Spend Runway
      var safeDailyStr = '₹0/day';
      var safeStatusColor = 'var(--emerald)';
      var safeStatusText = 'Healthy';
      var liquidTotal = 0;

      if (window.LM_InterlinkEngine && typeof window.LM_InterlinkEngine.getUpcomingObligations === 'function') {
        var runway = window.LM_InterlinkEngine.getUpcomingObligations(30);
        var lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        var daysLeft = Math.max(1, lastDayOfMonth - now.getDate() + 1);
        var safeTotal = runway.safeToSpend;
        liquidTotal = runway.liquidCash;
        var safePerDay = Math.max(0, Math.round(safeTotal / daysLeft));
        safeDailyStr = _fmtINR(safePerDay) + '/day';

        if (runway.status === 'moderate') {
          safeStatusColor = 'var(--gold)';
          safeStatusText = 'Tight Buffer';
        } else if (runway.status === 'critical') {
          safeStatusColor = 'var(--rose)';
          safeStatusText = 'Deficit Warning';
        }
      }

      // 2. Upcoming Commitments (Next 7 Days)
      var duesCount = 0;
      var dueMsg = 'All commitments clear this week! 🎉';
      var dueBadge = '✅ Clear';
      var dueBadgeColor = 'var(--emerald)';
      var hasUrgentDue = false;
      var firstDue = null;

      if (window.LM_InterlinkEngine && typeof window.LM_InterlinkEngine.getUpcomingObligations === 'function') {
        var weekRunway = window.LM_InterlinkEngine.getUpcomingObligations(7);
        if (weekRunway && Array.isArray(weekRunway.obligations) && weekRunway.obligations.length > 0) {
          duesCount = weekRunway.obligations.length;
          firstDue = weekRunway.obligations[0];
          hasUrgentDue = true;
          dueBadgeColor = firstDue.isOverdue ? 'var(--rose)' : 'var(--gold)';
          dueBadge = firstDue.isOverdue ? '⚠️ Overdue' : ('In ' + firstDue.daysUntilDue + 'd');
          dueMsg = firstDue.title + ' (' + _fmtINR(firstDue.amount) + ')';
        }
      }

      // 3. Active Budget & Spending Pace
      var budgetMsg = 'Budgets on track 👍';
      var budgetBadgeColor = 'var(--teal)';
      var budgetBadgeText = 'Optimal';

      if (typeof state === 'object' && Array.isArray(state.budgets) && state.budgets.length > 0 && Array.isArray(state.transactions)) {
        var txs = state.transactions;
        var curMonth = now.getMonth();
        var curYear = now.getFullYear();
        var worstPct = 0;
        var worstCat = '';

        state.budgets.forEach(function (b) {
          var bAmt = Number(b.amount) || 0;
          if (bAmt <= 0) return;
          var spent = txs.reduce(function (sum, t) {
            if (t.type !== 'out') return sum;
            var d = new Date(t.date || t.createdAt);
            if (d.getMonth() === curMonth && d.getFullYear() === curYear && (t.category || '').toLowerCase() === (b.category || '').toLowerCase()) {
              return sum + (Number(t.amount) || 0);
            }
            return sum;
          }, 0);
          var pct = Math.round((spent / bAmt) * 100);
          if (pct > worstPct) {
            worstPct = pct;
            worstCat = b.category;
          }
        });

        if (worstPct >= 100) {
          budgetMsg = worstCat + ' exceeded budget (' + worstPct + '%)';
          budgetBadgeColor = 'var(--rose)';
          budgetBadgeText = 'Overspent';
        } else if (worstPct >= 80) {
          budgetMsg = worstCat + ' reached ' + worstPct + '% of budget';
          budgetBadgeColor = 'var(--gold)';
          budgetBadgeText = 'Warning';
        } else if (worstPct > 0) {
          budgetMsg = worstCat + ' highest at ' + worstPct + '% used';
          budgetBadgeColor = 'var(--teal)';
          budgetBadgeText = 'Tracked';
        }
      }

      var html = `
        <div class="dash-briefing-card card">
          <div class="dash-briefing-header">
            <div class="dash-briefing-title-wrap">
              <span class="live-radar-dot"></span>
              <span class="dash-briefing-head-title">${timeGreeting} Briefing · ${dateStr}</span>
            </div>
            <div class="dash-briefing-meta">
              <span class="dash-briefing-tag" style="background:rgba(0, 240, 255, 0.08); color:var(--teal); border:1px solid rgba(0, 240, 255, 0.2);">
                Liquid: ${_fmtINR(liquidTotal)}
              </span>
            </div>
          </div>

          <div class="dash-briefing-grid">
            <!-- PILL 1: SAFE SPEND RUNWAY -->
            <div class="dash-briefing-item" onclick="window.LM_DashboardUpgrade?.setViewMode('executive')">
              <div class="dash-briefing-icon-wrap" style="background:rgba(16, 185, 129, 0.1); color:var(--emerald);">🛡️</div>
              <div class="dash-briefing-data">
                <span class="dash-briefing-label">Safe Daily Spend</span>
                <span class="dash-briefing-val acc-bal" style="color:${safeStatusColor}; font-weight:700;">${safeDailyStr}</span>
                <span class="dash-briefing-sub">${safeStatusText} buffer remaining</span>
              </div>
            </div>

            <!-- PILL 2: COMMITMENTS COUNTDOWN -->
            <div class="dash-briefing-item ${hasUrgentDue ? 'urgent' : ''}" onclick="${firstDue ? `window.LM_InterlinkEngine?.handleQuickPayObligation('${firstDue.type}', '${firstDue.title.replace(/'/g, "\\'")}', ${firstDue.amount})` : `window.LM_DashboardUpgrade?.setViewMode('daily')`}">
              <div class="dash-briefing-icon-wrap" style="background:${dueBadgeColor}1a; color:${dueBadgeColor};">🚨</div>
              <div class="dash-briefing-data">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="dash-briefing-label">7-Day Dues</span>
                  <span class="dash-briefing-mini-badge" style="color:${dueBadgeColor};">${dueBadge}</span>
                </div>
                <span class="dash-briefing-val" title="${dueMsg}" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${dueMsg}</span>
                <span class="dash-briefing-sub" style="color:var(--teal);">${hasUrgentDue ? '⚡ Tap to Pay / Settle' : 'Zero pending dues'}</span>
              </div>
            </div>

            <!-- PILL 3: BUDGET INTELLIGENCE -->
            <div class="dash-briefing-item" onclick="if(typeof showBudgetsModal==='function')showBudgetsModal();">
              <div class="dash-briefing-icon-wrap" style="background:rgba(139, 92, 246, 0.1); color:var(--violet);">🎯</div>
              <div class="dash-briefing-data">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="dash-briefing-label">Budget Pulse</span>
                  <span class="dash-briefing-mini-badge" style="color:${budgetBadgeColor};">${budgetBadgeText}</span>
                </div>
                <span class="dash-briefing-val" title="${budgetMsg}" style="font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${budgetMsg}</span>
                <span class="dash-briefing-sub">Tap to inspect limits →</span>
              </div>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;
    },

    // ─────────────────────────────────────────────────────────────
    // 📝 DAILY PULSE RECENT ACTIVITY FEED
    // ─────────────────────────────────────────────────────────────
    renderDailyRecentActivity: function () {
      var container = document.getElementById('dashRecentActivityList');
      if (!container) return;

      var txs = (typeof state === 'object' && Array.isArray(state.transactions)) ? state.transactions : [];
      var recent = txs.slice().sort(function (a, b) {
        return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
      }).slice(0, 5);

      if (recent.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:16px; color:var(--text-3); font-size:12px;">No transactions logged yet. Tap + Expense to get started!</div>';
        return;
      }

      var html = recent.map(function (t) {
        var isIncome = t.type === 'in';
        var typeCls = isIncome ? 'income' : 'expense';
        var sign = isIncome ? '+' : '−';
        var note = t.note || t.category || 'Transaction';

        var interlinkTag = '';
        if (t.interlink && t.interlink.sourceModule) {
          interlinkTag = `<span class="tx-badge-interlink" style="font-size:9px; padding:1px 5px;" title="Linked to ${t.interlink.sourceModule}">🔗 ${t.interlink.sourceModule}</span>`;
        }

        return `
          <div class="tx-row" style="padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <div class="tx-left" style="display:flex; align-items:center; gap:8px;">
              <div class="tx-text">
                <div class="tx-title font-bold" style="font-size:13px; color:var(--text);">${note}</div>
                <div class="tx-meta" style="font-size:11px; color:var(--text-2); display:flex; gap:6px; align-items:center;">
                  <span>${t.category || 'General'}</span>
                  <span>·</span>
                  <span>${t.account || 'Bank'}</span>
                  <span>·</span>
                  <span>${t.date || ''}</span>
                  ${interlinkTag}
                </div>
              </div>
            </div>
            <div class="tx-right" style="text-align:right;">
              <div class="tx-amount ${typeCls} font-bold" style="font-size:13px; font-family:var(--font-m);">${sign}${_fmtINR(t.amount)}</div>
            </div>
          </div>
        `;
      }).join('');

      container.innerHTML = html;
    },

    // ─────────────────────────────────────────────────────────────
    // 🎯 INTERACTIVE DRILLDOWNS
    // ─────────────────────────────────────────────────────────────
    initInteractiveDrilldowns: function () {
      var el = document.getElementById('dashTelemLiquid');
      var telemLiquid = (el && typeof el.closest === 'function') ? el.closest('.dash-telem-item') : null;
      if (telemLiquid) {
        telemLiquid.onclick = function () {
          window.LM_DashboardUpgrade.setViewMode('daily');
          var accSec = document.getElementById('dashAccountSummariesSection');
          if (accSec && typeof accSec.scrollIntoView === 'function') {
            accSec.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        };
      }
    }
  };

  window.LM_DashboardUpgrade = DashboardUpgrade;

})();
