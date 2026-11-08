/**
 * LedgerMate – TripUI.js
 * ──────────────────────────────────────────────────────────────────
 * User Interface & Controller for Enhanced Trip Planner:
 * - Executive Travel Dashboard & Trip Directory
 * - Full Trip Workspace with Day-by-Day Itineraries
 * - "Seen & Wishlist Places" Discovery Collector (Instagram / Maps / Blog spots)
 * - Granular Per-Plan Expense Tracking & Variance Math
 * - Central Bank & Credit Card Interlinking
 * - Minimum-Cash-Flow Group Split & Settlement
 *
 * Exposes: window.LM_TripUI
 * ──────────────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  function _fmtINR(num) {
    if (typeof fmtINR === 'function') return fmtINR(num);
    const n = Number(num) || 0;
    return '₹' + Math.round(n).toLocaleString('en-IN');
  }

  function _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const TripUI = {
    activeTripId: null,
    activeTab: 'itinerary', // 'itinerary' | 'wishlist' | 'analytics' | 'split'
    activeDayFilter: 'all', // 'all' | 1 | 2 | 3...
    activeCategoryFilter: 'all',
    searchQuery: '',

    init: function (containerId = 'tripPlannerApp') {
      const container = document.getElementById(containerId);
      if (!container) return;

      // Remember active trip
      const savedTripId = localStorage.getItem('lm_active_trip_id');
      if (savedTripId && window.LM_TripService?.getTrip(savedTripId)) {
        this.activeTripId = savedTripId;
        this.renderTripWorkspace(savedTripId, container);
      } else {
        this.activeTripId = null;
        this.renderDirectory(container);
      }
    },

    render: function (containerId) {
      return this.init(containerId);
    },

    renderSelectedTrip: function (tripId, container) {
      return this.renderTripWorkspace(tripId, container);
    },

    getContainer: function () {
      return document.getElementById('tripPlannerApp') || document.getElementById('page-trips');
    },

    // ─────────────────────────────────────────────────────────────
    // 1. TRIPS DIRECTORY VIEW
    // ─────────────────────────────────────────────────────────────
    renderDirectory: function (container) {
      if (!container) container = this.getContainer();
      if (!container) return;

      this.activeTripId = null;
      localStorage.removeItem('lm_active_trip_id');

      const trips = window.LM_TripService?.getTrips() || [];
      const totalTrips = trips.length;
      let totalBudget = 0;
      let totalActualSpent = 0;
      let totalPlanned = 0;

      trips.forEach(t => {
        const fin = window.LM_TripService.getTripFinancials(t.id);
        totalBudget += fin.budgetCap;
        totalActualSpent += fin.totalActualExpenses;
        totalPlanned += fin.totalPlannedCost;
      });

      // Filter trips
      let filtered = trips.slice();
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        filtered = filtered.filter(t =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.destination || '').toLowerCase().includes(q) ||
          (t.persons || []).some(p => (p.name || '').toLowerCase().includes(q))
        );
      }

      if (this.activeCategoryFilter === 'active') {
        filtered = filtered.filter(t => t.status === 'ongoing' || t.status === 'booked');
      } else if (this.activeCategoryFilter === 'planning') {
        filtered = filtered.filter(t => t.status === 'planning' || t.status === 'wishlist');
      } else if (this.activeCategoryFilter === 'completed') {
        filtered = filtered.filter(t => t.completed || t.status === 'completed');
      }

      container.innerHTML = `
        <div class="tp-page-container fade-up fade-up-1">
          <!-- HERO OVERVIEW BANNER -->
          <div class="tp-hero-banner">
            <div class="tp-hero-top">
              <div class="tp-hero-title-wrap">
                <div class="tp-hero-icon">✈️</div>
                <div>
                  <h1 class="tp-hero-title">Trip <em>Planner</em> &amp; Financials</h1>
                  <p class="tp-hero-subtitle">Plan destinations, collect discovered spots, and track expenses against every plan.</p>
                </div>
              </div>
              <button class="tp-btn-primary" onclick="window.LM_TripUI.openAddTripModal()">
                <span>＋</span> Add New Trip
              </button>
            </div>

            <!-- MACRO KPIS -->
            <div class="tp-kpi-grid">
              <div class="tp-kpi-card">
                <span class="tp-kpi-label">Total Trips</span>
                <span class="tp-kpi-value">${totalTrips}</span>
                <span class="tp-kpi-sub">${trips.filter(t => !t.completed).length} Upcoming / Active</span>
              </div>
              <div class="tp-kpi-card">
                <span class="tp-kpi-label">Travel Budget</span>
                <span class="tp-kpi-value" style="color:var(--teal);">${_fmtINR(totalBudget)}</span>
                <span class="tp-kpi-sub">Target across trips</span>
              </div>
              <div class="tp-kpi-card">
                <span class="tp-kpi-label">Total Spent</span>
                <span class="tp-kpi-value" style="color:var(--emerald);">${_fmtINR(totalActualSpent)}</span>
                <span class="tp-kpi-sub">${totalBudget > 0 ? Math.round((totalActualSpent / totalBudget) * 100) : 0}% of budget utilized</span>
              </div>
              <div class="tp-kpi-card">
                <span class="tp-kpi-label">Planned Itinerary Costs</span>
                <span class="tp-kpi-value" style="color:var(--gold);">${_fmtINR(totalPlanned)}</span>
                <span class="tp-kpi-sub">Committed in day plans</span>
              </div>
            </div>
          </div>

          <!-- CONTROLS: FILTER CHIPS & SEARCH -->
          <div class="tp-controls-bar">
            <div class="tp-filter-chips">
              <button class="tp-filter-chip ${this.activeCategoryFilter === 'all' ? 'active' : ''}" onclick="window.LM_TripUI.setFilter('all')">All Trips (${totalTrips})</button>
              <button class="tp-filter-chip ${this.activeCategoryFilter === 'active' ? 'active' : ''}" onclick="window.LM_TripUI.setFilter('active')">Active &amp; Booked</button>
              <button class="tp-filter-chip ${this.activeCategoryFilter === 'planning' ? 'active' : ''}" onclick="window.LM_TripUI.setFilter('planning')">Planning / Wishlist</button>
              <button class="tp-filter-chip ${this.activeCategoryFilter === 'completed' ? 'active' : ''}" onclick="window.LM_TripUI.setFilter('completed')">Completed</button>
            </div>
            <input type="text" class="tp-search-input" placeholder="🔍 Search trips or places..." value="${_esc(this.searchQuery)}" oninput="window.LM_TripUI.handleSearch(this.value)" />
          </div>

          <!-- TRIPS DIRECTORY GRID -->
          ${filtered.length === 0 ? `
            <div style="text-align:center; padding:48px 16px; background:var(--surface-card); border:1px dashed var(--border); border-radius:16px;">
              <div style="font-size:36px; margin-bottom:12px;">🗺️</div>
              <h3 style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:6px;">No trips found</h3>
              <p style="font-size:13px; color:var(--text-3); max-width:360px; margin:0 auto 16px;">Ready to explore somewhere new? Create your first trip to start collecting spots and planning expenses.</p>
              <button class="tp-btn-primary" onclick="window.LM_TripUI.openAddTripModal()">+ Plan a Trip</button>
            </div>
          ` : `
            <div class="tp-trips-grid">
              ${filtered.map(t => this._renderTripCard(t)).join('')}
            </div>
          `}
        </div>
      `;
    },

    _renderTripCard: function (trip) {
      const fin = window.LM_TripService.getTripFinancials(trip.id);
      const days = window.LM_TripService.calculateTripDays(trip.startDate, trip.endDate);
      const targetBudget = fin.budgetCap > 0 ? fin.budgetCap : fin.totalPlannedCost;
      const pct = targetBudget > 0 ? Math.min(100, Math.round((fin.totalActualExpenses / targetBudget) * 100)) : 0;
      const barColor = pct >= 100 ? 'var(--rose)' : pct >= 80 ? 'var(--gold)' : 'var(--teal)';

      let statusCls = 'tp-status-planning';
      let statusLabel = 'Planning';
      if (trip.status === 'booked') { statusCls = 'tp-status-booked'; statusLabel = 'Booked'; }
      else if (trip.status === 'ongoing') { statusCls = 'tp-status-ongoing'; statusLabel = 'Ongoing'; }
      else if (trip.status === 'completed' || trip.completed) { statusCls = 'tp-status-completed'; statusLabel = 'Completed'; }
      else if (trip.status === 'wishlist') { statusCls = 'tp-status-wishlist'; statusLabel = 'Wishlist'; }

      const modeIcons = { car: '🚗', bike: '🏍️', flight: '✈️', train: '🚆', bus: '🚌', mixed: '🗺️' };
      const modeIcon = modeIcons[trip.travelMode] || '✈️';

      return `
        <div class="tp-trip-card" onclick="window.LM_TripUI.openTrip('${trip.id}')">
          <div class="tp-trip-card-top">
            <div class="tp-trip-card-identity">
              <div class="tp-trip-card-emoji">${trip.coverEmoji || '🏖️'}</div>
              <div class="tp-trip-card-info">
                <div class="tp-trip-card-name">${_esc(trip.name)}</div>
                <div class="tp-trip-card-dest">📍 ${_esc(trip.destination || 'Unspecified')}</div>
              </div>
            </div>
            <span class="tp-status-pill ${statusCls}">${statusLabel}</span>
          </div>

          <div class="tp-trip-card-meta">
            <span class="tp-trip-meta-item">📅 ${trip.startDate || '?'} → ${trip.endDate || '?'}</span>
            <span>·</span>
            <span class="tp-trip-meta-item">⏱️ ${days} Days</span>
            <span>·</span>
            <span class="tp-trip-meta-item">${modeIcon} ${_esc(trip.travelMode || 'Trip')}</span>
            <span>·</span>
            <span class="tp-trip-meta-item">👥 ${(trip.persons || []).length} Traveler(s)</span>
          </div>

          <div class="tp-budget-progress-wrap">
            <div class="tp-budget-labels">
              <span style="color:var(--text-3);">Spent: <strong style="color:var(--text);">${_fmtINR(fin.totalActualExpenses)}</strong></span>
              <span style="color:var(--text-3);">Budget: <strong style="color:var(--teal);">${_fmtINR(targetBudget)}</strong></span>
            </div>
            <div class="tp-progress-bar-bg">
              <div class="tp-progress-bar-fill" style="width:${pct}%; background:${barColor};"></div>
            </div>
          </div>
        </div>
      `;
    },

    setFilter: function (filter) {
      this.activeCategoryFilter = filter;
      this.renderDirectory();
    },

    handleSearch: function (q) {
      this.searchQuery = q.trim();
      this.renderDirectory();
    },

    // ─────────────────────────────────────────────────────────────
    // 2. SELECTED TRIP WORKSPACE
    // ─────────────────────────────────────────────────────────────
    openTrip: function (tripId) {
      this.activeTripId = tripId;
      localStorage.setItem('lm_active_trip_id', tripId);
      this.renderTripWorkspace(tripId);
    },

    renderTripWorkspace: function (tripId, container) {
      if (!container) container = this.getContainer();
      if (!container) return;

      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) {
        this.renderDirectory(container);
        return;
      }

      const fin = window.LM_TripService.getTripFinancials(tripId);
      const days = window.LM_TripService.calculateTripDays(trip.startDate, trip.endDate);
      const targetBudget = fin.budgetCap > 0 ? fin.budgetCap : fin.totalPlannedCost;
      const pct = targetBudget > 0 ? Math.min(100, Math.round((fin.totalActualExpenses / targetBudget) * 100)) : 0;
      const barColor = pct >= 100 ? 'var(--rose)' : pct >= 80 ? 'var(--gold)' : 'var(--emerald)';

      container.innerHTML = `
        <div class="tp-page-container fade-up fade-up-1">
          <!-- WORKSPACE HEADER -->
          <div class="tp-workspace-header">
            <div class="tp-workspace-top">
              <button class="tp-back-btn" onclick="window.LM_TripUI.renderDirectory()">
                <span>←</span> All Trips
              </button>
              <div class="tp-workspace-actions">
                <button class="tp-btn-secondary" onclick="window.LM_TripUI.openAddTripModal('${trip.id}')">✏️ Edit Trip</button>
                <button class="tp-btn-secondary" onclick="window.LM_TripUI.shareTrip('${trip.id}')">📤 Share</button>
                <button class="tp-btn-secondary" style="color:var(--rose);" onclick="window.LM_TripUI.deleteTrip('${trip.id}')">🗑️</button>
              </div>
            </div>

            <div style="display:flex; align-items:flex-start; gap:14px; flex-wrap:wrap; margin-bottom:14px;">
              <div class="tp-hero-icon" style="font-size:32px;">${trip.coverEmoji || '🏖️'}</div>
              <div style="flex:1; min-width:240px;">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <h1 class="tp-hero-title" style="font-size:22px; margin:0;">${_esc(trip.name)}</h1>
                  <span class="tp-status-pill tp-status-${trip.status || 'planning'}">${_esc(trip.status || 'planning')}</span>
                </div>
                <div class="tp-trip-card-meta" style="margin-top:4px; margin-bottom:0;">
                  <span>📍 ${_esc(trip.destination || 'Unspecified')}</span>
                  <span>·</span>
                  <span>📅 ${trip.startDate || '?'} → ${trip.endDate || '?'} (${days} Days)</span>
                  <span>·</span>
                  <span>👥 ${(trip.persons || []).map(p => _esc(p.name)).join(', ')}</span>
                </div>
              </div>
            </div>

            <!-- FINANCIAL PROGRESS BAR & ROLLUP -->
            <div class="tp-kpi-grid" style="grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); margin-bottom:12px;">
              <div class="tp-kpi-card">
                <span class="tp-kpi-label">Target Budget</span>
                <span class="tp-kpi-value" style="color:var(--teal); font-size:16px;">${_fmtINR(targetBudget)}</span>
              </div>
              <div class="tp-kpi-card">
                <span class="tp-kpi-label">Planned Costs</span>
                <span class="tp-kpi-value" style="color:var(--gold); font-size:16px;">${_fmtINR(fin.totalPlannedCost)}</span>
              </div>
              <div class="tp-kpi-card">
                <span class="tp-kpi-label">Actual Spent</span>
                <span class="tp-kpi-value" style="color:var(--emerald); font-size:16px;">${_fmtINR(fin.totalActualExpenses)}</span>
              </div>
              <div class="tp-kpi-card">
                <span class="tp-kpi-label">Remaining Runway</span>
                <span class="tp-kpi-value" style="color:${fin.remainingBudget < 0 ? 'var(--rose)' : 'var(--text)'}; font-size:16px;">
                  ${_fmtINR(fin.remainingBudget)}
                </span>
              </div>
            </div>

            <div class="tp-progress-bar-bg" style="height:8px;">
              <div class="tp-progress-bar-fill" style="width:${pct}%; background:${barColor};"></div>
            </div>
          </div>

          <!-- SUB-TABS NAVIGATION -->
          <div class="tp-tabs-nav">
            <button class="tp-tab-btn ${this.activeTab === 'itinerary' ? 'active' : ''}" onclick="window.LM_TripUI.switchTab('itinerary')">
              <span>🗺️</span> Plans &amp; Itinerary
              <span class="tp-tab-badge">${(trip.plans || []).length}</span>
            </button>
            <button class="tp-tab-btn ${this.activeTab === 'wishlist' ? 'active' : ''}" onclick="window.LM_TripUI.switchTab('wishlist')">
              <span>💡</span> Seen &amp; Wishlist Places
              <span class="tp-tab-badge">${(trip.wishlist || []).length}</span>
            </button>
            <button class="tp-tab-btn ${this.activeTab === 'analytics' ? 'active' : ''}" onclick="window.LM_TripUI.switchTab('analytics')">
              <span>💰</span> Plan Expenses &amp; Analytics
            </button>
            <button class="tp-tab-btn ${this.activeTab === 'split' ? 'active' : ''}" onclick="window.LM_TripUI.switchTab('split')">
              <span>👥</span> Split &amp; Settlements
            </button>
          </div>

          <!-- TAB CONTENT CONTAINER -->
          <div id="tp_tab_content"></div>
        </div>
      `;

      this.renderTabContent(trip);
    },

    switchTab: function (tab) {
      this.activeTab = tab;
      const trip = window.LM_TripService.getTrip(this.activeTripId);
      if (trip) {
        document.querySelectorAll('.tp-tab-btn').forEach(b => b.classList.remove('active'));
        this.renderTripWorkspace(this.activeTripId);
      }
    },

    renderTabContent: function (trip) {
      const container = document.getElementById('tp_tab_content');
      if (!container) return;

      if (this.activeTab === 'itinerary') {
        this.renderItineraryTab(trip, container);
      } else if (this.activeTab === 'wishlist') {
        this.renderWishlistTab(trip, container);
      } else if (this.activeTab === 'analytics') {
        this.renderAnalyticsTab(trip, container);
      } else if (this.activeTab === 'split') {
        this.renderSplitTab(trip, container);
      }
    },

    // ─────────────────────────────────────────────────────────────
    // 3. TAB 1: ITINERARY & DAY-BY-DAY PLANS
    // ─────────────────────────────────────────────────────────────
    renderItineraryTab: function (trip, container) {
      const plans = Array.isArray(trip.plans) ? trip.plans : [];
      const days = window.LM_TripService.calculateTripDays(trip.startDate, trip.endDate);

      // Collect all days present
      const dayNumbers = [];
      for (let i = 1; i <= days; i++) dayNumbers.push(i);

      let filteredPlans = plans;
      if (this.activeDayFilter !== 'all') {
        filteredPlans = plans.filter(p => p.dayNumber === Number(this.activeDayFilter));
      }

      // Group plans by Day
      const plansByDay = {};
      dayNumbers.forEach(d => plansByDay[d] = []);
      filteredPlans.forEach(p => {
        const d = p.dayNumber || 1;
        if (!plansByDay[d]) plansByDay[d] = [];
        plansByDay[d].push(p);
      });

      const catIcons = {
        Stay: '🏨', Food: '🍽️', Activity: '🪂', Sightseeing: '🏛️',
        Transit: '🚗', Shopping: '🛍️', Other: '📌'
      };

      container.innerHTML = `
        <div class="tp-itinerary-header">
          <!-- Day Filter Selector Strip -->
          <div class="tp-day-selector-strip">
            <button class="tp-day-pill ${this.activeDayFilter === 'all' ? 'active' : ''}" onclick="window.LM_TripUI.setDayFilter('all')">
              All Days (${plans.length})
            </button>
            ${dayNumbers.map(d => `
              <button class="tp-day-pill ${this.activeDayFilter === d ? 'active' : ''}" onclick="window.LM_TripUI.setDayFilter(${d})">
                Day ${d} (${(plansByDay[d] || []).length})
              </button>
            `).join('')}
          </div>

          <button class="tp-btn-primary" onclick="window.LM_TripUI.openAddPlanModal('${trip.id}', null, ${this.activeDayFilter === 'all' ? 1 : this.activeDayFilter})">
            <span>＋</span> Add Plan Item
          </button>
        </div>

        ${plans.length === 0 ? `
          <div style="text-align:center; padding:48px 16px; background:var(--surface-card); border:1px dashed var(--border); border-radius:16px;">
            <div style="font-size:36px; margin-bottom:12px;">🗺️</div>
            <h3 style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:6px;">No itinerary plans yet</h3>
            <p style="font-size:13px; color:var(--text-3); max-width:380px; margin:0 auto 16px;">
              Add activities, resort stays, dining spots, or promote ideas from your Seen &amp; Wishlist tab!
            </p>
            <div style="display:flex; justify-content:center; gap:8px;">
              <button class="tp-btn-primary" onclick="window.LM_TripUI.openAddPlanModal('${trip.id}', null, 1)">+ Add First Plan</button>
              <button class="tp-btn-secondary" onclick="window.LM_TripUI.switchTab('wishlist')">💡 View Seen Places</button>
            </div>
          </div>
        ` : `
          <div>
            ${dayNumbers.filter(d => this.activeDayFilter === 'all' || this.activeDayFilter === d).map(d => {
              const dayPlans = plansByDay[d] || [];
              if (this.activeDayFilter === 'all' && dayPlans.length === 0) return '';

              // Calculate Day's planned vs actual
              const dayPlanned = dayPlans.reduce((s, p) => s + (p.estimatedCost || 0), 0);
              const dayActual = dayPlans.reduce((s, p) => s + (p.expenses || []).reduce((es, e) => es + e.amount, 0), 0);

              return `
                <div class="tp-day-group">
                  <div class="tp-day-title-strip">
                    <div class="tp-day-title-text">📅 DAY ${d}</div>
                    <div class="tp-day-title-meta">
                      Est: ${_fmtINR(dayPlanned)} · Spent: ${_fmtINR(dayActual)}
                    </div>
                  </div>

                  ${dayPlans.length === 0 ? `
                    <div style="padding:12px; font-size:12px; color:var(--text-3); font-style:italic;">No plans scheduled for Day ${d}. <a href="javascript:void(0)" onclick="window.LM_TripUI.openAddPlanModal('${trip.id}', null, ${d})" style="color:var(--teal);">+ Add Plan</a></div>
                  ` : `
                    <div class="space-y-2">
                      ${dayPlans.map(plan => {
                        const pf = window.LM_TripService.getPlanFinancials(plan);
                        const icon = catIcons[plan.category] || '📌';
                        const timeStr = plan.time ? ` · ⏰ ${plan.time}` : '';
                        const locStr = plan.location ? ` · 📍 ${_esc(plan.location)}` : '';

                        let varBadge = '';
                        if (pf.actualTotal === 0 && pf.estimatedCost > 0) {
                          varBadge = `<span class="tp-variance-chip tp-var-pending">🟡 Pending Payment</span>`;
                        } else if (pf.isUnderBudget) {
                          varBadge = `<span class="tp-variance-chip tp-var-under">🟢 -${_fmtINR(pf.variance)} (Within Budget)</span>`;
                        } else if (pf.isOverBudget) {
                          varBadge = `<span class="tp-variance-chip tp-var-over">🔴 +${_fmtINR(Math.abs(pf.variance))} (Over Budget)</span>`;
                        } else if (pf.actualTotal > 0) {
                          varBadge = `<span class="tp-variance-chip tp-var-under">✅ On Budget</span>`;
                        }

                        return `
                          <div class="tp-plan-card">
                            <div class="tp-plan-top">
                              <div class="tp-plan-main">
                                <div class="tp-plan-cat-icon">${icon}</div>
                                <div class="tp-plan-content">
                                  <div class="tp-plan-title">${_esc(plan.title)}</div>
                                  <div class="tp-plan-meta">
                                    <span style="font-weight:600; color:var(--teal);">${_esc(plan.category)}</span>
                                    <span>${timeStr}</span>
                                    <span>${locStr}</span>
                                    ${plan.bookingRef ? `<span style="background:rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px;">Ref: ${_esc(plan.bookingRef)}</span>` : ''}
                                  </div>
                                  ${plan.notes ? `<div style="font-size:12px; color:var(--text-2); margin-top:4px;">${_esc(plan.notes)}</div>` : ''}
                                </div>
                              </div>
                              <div class="tp-plan-actions">
                                <button class="tp-icon-btn" title="Edit Plan" onclick="window.LM_TripUI.openAddPlanModal('${trip.id}', '${plan.id}')">✏️</button>
                                <button class="tp-icon-btn" title="Delete Plan" onclick="window.LM_TripUI.deletePlan('${trip.id}', '${plan.id}')">🗑️</button>
                              </div>
                            </div>

                            <!-- GRANULAR PROPER EXPENSES STRIP -->
                            <div class="tp-plan-financials-strip">
                              <div class="tp-plan-fin-data">
                                <div class="tp-plan-fin-item">
                                  <span class="tp-plan-fin-label">Estimated:</span>
                                  <span class="tp-plan-fin-val" style="color:var(--text);">${_fmtINR(pf.estimatedCost)}</span>
                                </div>
                                <div class="tp-plan-fin-item">
                                  <span class="tp-plan-fin-label">Actual:</span>
                                  <span class="tp-plan-fin-val" style="color:var(--emerald);">${_fmtINR(pf.actualTotal)}</span>
                                </div>
                                ${varBadge}
                              </div>
                              <button class="tp-btn-log-exp" onclick="window.LM_TripUI.openPlanExpenseModal('${trip.id}', '${plan.id}')">
                                <span>⚡</span> Log Expense
                              </button>
                            </div>

                            <!-- ITEMIZED MICRO EXPENSES UNDER PLAN -->
                            ${(plan.expenses && plan.expenses.length > 0) ? `
                              <div class="tp-micro-expenses-list">
                                ${plan.expenses.map(e => `
                                  <div class="tp-micro-exp-item">
                                    <span>• ${_esc(e.title)} (${e.paymentMethod || 'Cash'}${e.linkedTxId ? ' · 🔗 Linked' : ''})</span>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                      <strong style="color:var(--text); font-family:var(--font-m);">${_fmtINR(e.amount)}</strong>
                                      <button class="tp-icon-btn" style="color:var(--rose); padding:1px 4px;" title="Delete Expense" onclick="window.LM_TripUI.deletePlanExpense('${trip.id}', '${plan.id}', '${e.id}')">×</button>
                                    </div>
                                  </div>
                                `).join('')}
                              </div>
                            ` : ''}
                          </div>
                        `;
                      }).join('')}
                    </div>
                  `}
                </div>
              `;
            }).join('')}
          </div>
        `}
      `;
    },

    setDayFilter: function (day) {
      this.activeDayFilter = day;
      const trip = window.LM_TripService.getTrip(this.activeTripId);
      if (trip) this.renderItineraryTab(trip, document.getElementById('tp_tab_content'));
    },

    // ─────────────────────────────────────────────────────────────
    // 4. TAB 2: SEEN & WISHLIST PLACES ("What I Saw & Plan To Visit")
    // ─────────────────────────────────────────────────────────────
    renderWishlistTab: function (trip, container) {
      const wishlist = Array.isArray(trip.wishlist) ? trip.wishlist : [];

      container.innerHTML = `
        <div class="tp-wishlist-header">
          <div>
            <h3 style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:2px;">
              💡 Places, Activities &amp; Spots Seen
            </h3>
            <p style="font-size:12.5px; color:var(--text-3); margin:0;">
              Saw a reel, cafe, sunset spot or trek online? Drop it here and schedule it into your day plans with one tap.
            </p>
          </div>
          <button class="tp-btn-primary" onclick="window.LM_TripUI.openAddWishlistModal('${trip.id}')">
            <span>＋</span> Add Spot I Seen
          </button>
        </div>

        ${wishlist.length === 0 ? `
          <div style="text-align:center; padding:48px 16px; background:var(--surface-card); border:1px dashed var(--border); border-radius:16px;">
            <div style="font-size:36px; margin-bottom:12px;">📌</div>
            <h3 style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:6px;">No spots collected yet</h3>
            <p style="font-size:13px; color:var(--text-3); max-width:380px; margin:0 auto 16px;">
              Capture rooftop cafes, beaches, diving spots, or hidden gems you want to do on this trip!
            </p>
            <button class="tp-btn-primary" onclick="window.LM_TripUI.openAddWishlistModal('${trip.id}')">+ Add First Spot</button>
          </div>
        ` : `
          <div class="tp-wishlist-grid">
            ${wishlist.map(w => {
              let prioBadge = `<span class="tp-priority-badge tp-prio-recom">Recommended</span>`;
              if (w.priority === 'must_do') prioBadge = `<span class="tp-priority-badge tp-prio-must">Must Do 🔥</span>`;
              else if (w.priority === 'backup') prioBadge = `<span class="tp-priority-badge tp-prio-back">Backup</span>`;

              return `
                <div class="tp-wish-card">
                  <div class="tp-wish-top">
                    <div>
                      <div class="tp-wish-title">${_esc(w.title)}</div>
                      <div class="tp-wish-meta" style="margin-top:4px;">
                        ${prioBadge}
                        <span style="color:var(--teal); font-weight:600;">${_esc(w.category)}</span>
                        ${w.location ? `<span>· 📍 ${_esc(w.location)}</span>` : ''}
                      </div>
                    </div>
                    <div style="display:flex; gap:4px;">
                      <button class="tp-icon-btn" title="Edit" onclick="window.LM_TripUI.openAddWishlistModal('${trip.id}', '${w.id}')">✏️</button>
                      <button class="tp-icon-btn" title="Delete" onclick="window.LM_TripUI.deleteWish('${trip.id}', '${w.id}')">🗑️</button>
                    </div>
                  </div>

                  ${w.notes ? `<div class="tp-wish-notes">${_esc(w.notes)}</div>` : ''}

                  ${w.sourceUrl ? `
                    <a href="${_esc(w.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="tp-wish-url-link">
                      <span>🔗</span> View Inspiration / Reel / Map ↗
                    </a>
                  ` : ''}

                  <div class="tp-wish-bottom">
                    <div>
                      <span style="font-size:10.5px; color:var(--text-3); display:block;">Est. Cost</span>
                      <span class="tp-wish-est-price">${_fmtINR(w.estimatedCost)}</span>
                    </div>

                    ${w.status === 'scheduled' ? `
                      <span style="font-size:11px; font-weight:700; color:var(--emerald); background:rgba(16,185,129,0.1); padding:4px 8px; border-radius:6px;">
                        ✓ In Itinerary
                      </span>
                    ` : `
                      <button class="tp-btn-schedule" onclick="window.LM_TripUI.openScheduleWishlistModal('${trip.id}', '${w.id}')">
                        📅 Schedule to Plan
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      `;
    },

    // ─────────────────────────────────────────────────────────────
    // 5. TAB 3: PLAN-BY-PLAN EXPENSES & FINANCIAL ANALYTICS
    // ─────────────────────────────────────────────────────────────
    renderAnalyticsTab: function (trip, container) {
      const fin = window.LM_TripService.getTripFinancials(trip.id);
      const plans = Array.isArray(trip.plans) ? trip.plans : [];
      const generalExpenses = Array.isArray(trip.expenses) ? trip.expenses : [];

      container.innerHTML = `
        <div style="margin-bottom:20px;">
          <!-- FINANCIAL SCORECARD -->
          <div class="tp-kpi-grid" style="margin-bottom:18px;">
            <div class="tp-kpi-card">
              <span class="tp-kpi-label">Target Budget</span>
              <span class="tp-kpi-value" style="color:var(--teal);">${_fmtINR(fin.budgetCap || fin.totalPlannedCost)}</span>
            </div>
            <div class="tp-kpi-card">
              <span class="tp-kpi-label">Plan Estimated Costs</span>
              <span class="tp-kpi-value" style="color:var(--gold);">${_fmtINR(fin.totalPlannedCost)}</span>
            </div>
            <div class="tp-kpi-card">
              <span class="tp-kpi-label">Plan Actual Expenses</span>
              <span class="tp-kpi-value" style="color:var(--emerald);">${_fmtINR(fin.totalPlanExpenses)}</span>
            </div>
            <div class="tp-kpi-card">
              <span class="tp-kpi-label">General Expenses</span>
              <span class="tp-kpi-value" style="color:var(--text);">${_fmtINR(fin.totalGeneralExpenses)}</span>
            </div>
          </div>

          <!-- CATEGORY BREAKDOWN BARS -->
          <div style="background:var(--surface-card); border:1px solid var(--border); border-radius:14px; padding:16px; margin-bottom:20px;">
            <h4 style="font-size:14px; font-weight:700; color:var(--text); margin-bottom:12px;">📊 Category Spending Breakdown</h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
              ${Object.keys(fin.categoryBreakdown).map(cat => {
                const data = fin.categoryBreakdown[cat];
                const pct = fin.totalActualExpenses > 0 ? Math.round((data.actual / fin.totalActualExpenses) * 100) : 0;
                return `
                  <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:10px 12px;">
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                      <span style="font-weight:600; color:var(--text);">${cat}</span>
                      <span style="font-family:var(--font-m); color:var(--teal);">${_fmtINR(data.actual)}</span>
                    </div>
                    <div style="font-size:11px; color:var(--text-3); margin-bottom:6px;">Est: ${_fmtINR(data.planned)} · ${pct}% of total</div>
                    <div class="tp-progress-bar-bg" style="height:4px;">
                      <div class="tp-progress-bar-fill" style="width:${pct}%; background:var(--teal);"></div>
                    </div>
                  </div>
                `;
              }).join('') || '<div style="color:var(--text-3); font-size:12px;">No categorized expenses yet.</div>'}
            </div>
          </div>

          <!-- FULL PLAN-BY-PLAN EXPENSES & VARIANCE TABLE -->
          <div class="tp-variance-table-wrap">
            <h4 style="font-size:14px; font-weight:700; color:var(--text); margin-bottom:12px;">
              📋 Plan-by-Plan Financial Variance Ledger
            </h4>
            <table class="tp-table">
              <thead>
                <tr>
                  <th>Plan Item</th>
                  <th>Day</th>
                  <th>Category</th>
                  <th>Estimated Cost</th>
                  <th>Actual Incurred</th>
                  <th>Variance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${plans.length === 0 ? `
                  <tr><td colspan="7" style="text-align:center; color:var(--text-3); padding:16px;">No itinerary plan items created yet.</td></tr>
                ` : plans.map(plan => {
                  const pf = window.LM_TripService.getPlanFinancials(plan);
                  let varBadge = '—';
                  if (pf.actualTotal === 0 && pf.estimatedCost > 0) {
                    varBadge = `<span class="tp-variance-chip tp-var-pending">Pending</span>`;
                  } else if (pf.isUnderBudget) {
                    varBadge = `<span class="tp-variance-chip tp-var-under">- ${_fmtINR(pf.variance)}</span>`;
                  } else if (pf.isOverBudget) {
                    varBadge = `<span class="tp-variance-chip tp-var-over">+ ${_fmtINR(Math.abs(pf.variance))}</span>`;
                  } else if (pf.actualTotal > 0) {
                    varBadge = `<span class="tp-variance-chip tp-var-under">Exact</span>`;
                  }

                  return `
                    <tr>
                      <td style="font-weight:600;">${_esc(plan.title)}</td>
                      <td>Day ${plan.dayNumber}</td>
                      <td style="color:var(--teal);">${_esc(plan.category)}</td>
                      <td style="font-family:var(--font-m);">${_fmtINR(pf.estimatedCost)}</td>
                      <td style="font-family:var(--font-m); font-weight:700; color:var(--emerald);">${_fmtINR(pf.actualTotal)}</td>
                      <td>${varBadge}</td>
                      <td><span class="tp-status-pill tp-status-${plan.status || 'planned'}">${_esc(plan.status || 'planned')}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- GENERAL TRIP EXPENSES -->
          <div style="background:var(--surface-card); border:1px solid var(--border); border-radius:14px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div>
                <h4 style="font-size:14px; font-weight:700; color:var(--text); margin:0;">
                  ⛽ General / Shared Trip Expenses
                </h4>
                <p style="font-size:11.5px; color:var(--text-3); margin:0;">Tolls, snacks, tips, fuel or unassigned costs</p>
              </div>
              <button class="tp-btn-secondary" onclick="window.LM_TripUI.openGeneralExpenseModal('${trip.id}')">
                ＋ Add General Expense
              </button>
            </div>

            ${generalExpenses.length === 0 ? `
              <div style="text-align:center; padding:16px; font-size:12px; color:var(--text-3);">No general expenses logged.</div>
            ` : `
              <div class="space-y-1">
                ${generalExpenses.map(e => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:rgba(255,255,255,0.02); border-radius:8px;">
                    <div>
                      <div style="font-size:13px; font-weight:600; color:var(--text);">${_esc(e.title)}</div>
                      <div style="font-size:11px; color:var(--text-3);">${_esc(e.category || 'General')} · ${e.date || ''} · ${_esc(e.paymentMethod || 'Cash')}${e.linkedTxId ? ' · 🔗 Linked' : ''}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="font-family:var(--font-m); font-weight:700; color:var(--emerald);">${_fmtINR(e.amount)}</span>
                      <button class="tp-icon-btn" style="color:var(--rose);" onclick="window.LM_TripUI.deleteGeneralExpense('${trip.id}', '${e.id}')">🗑️</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>
      `;
    },

    // ─────────────────────────────────────────────────────────────
    // 6. TAB 4: GROUP BILL SPLIT & SETTLEMENTS
    // ─────────────────────────────────────────────────────────────
    renderSplitTab: function (trip, container) {
      const persons = trip.persons || [];
      const payments = window.LM_TripService.calculateSettlements(trip.id);
      const settlements = trip.settlements || [];

      container.innerHTML = `
        <div style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
            <div>
              <h3 style="font-size:16px; font-weight:700; color:var(--text); margin:0;">👥 Group Expenses &amp; Settlements</h3>
              <p style="font-size:12px; color:var(--text-3); margin:0;">Minimum-cash-flow algorithm cancels cyclic debts</p>
            </div>
            <button class="tp-btn-secondary" onclick="window.LM_TripUI.markAllSettled('${trip.id}')">
              ✅ Mark All Settled
            </button>
          </div>

          <!-- SETTLEMENT PAYMENTS -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-bottom:20px;">
            ${payments.length === 0 ? `
              <div style="grid-column:1/-1; text-align:center; padding:32px; background:var(--surface-card); border-radius:12px; color:var(--text-3); font-size:13px;">
                🎉 All balances are settled or no shared expenses logged yet!
              </div>
            ` : payments.map(p => {
              const existing = settlements.find(s => s.from === p.from && s.to === p.to);
              const isSettled = existing && existing.status === 'collected';

              return `
                <div style="background:var(--surface-card); border:1px solid var(--border); border-radius:12px; padding:14px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <div style="font-size:13.5px; font-weight:700; color:var(--text);">
                      ${_esc(p.fromName)} <span style="color:var(--text-3);">➔</span> ${_esc(p.toName)}
                    </div>
                    <div style="font-family:var(--font-m); font-size:15px; font-weight:700; color:var(--teal);">
                      ${_fmtINR(p.amount)}
                    </div>
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    ${isSettled ? `
                      <span style="font-size:11.5px; font-weight:700; color:var(--emerald);">✅ Confirmed Settled</span>
                    ` : `
                      <span style="font-size:11.5px; color:var(--gold);">⚠️ Uncollected</span>
                      <button class="tp-btn-primary" style="padding:4px 10px; font-size:11px;" onclick="window.LM_TripUI.confirmSettlement('${trip.id}', '${p.from}', '${p.to}', ${p.amount})">
                        Mark Paid
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    },

    // ─────────────────────────────────────────────────────────────
    // 7. INTERACTIVE MODALS & CRUD FORMS
    // ─────────────────────────────────────────────────────────────
    openAddTripModal: function (existingTripId = null) {
      const existing = existingTripId ? window.LM_TripService.getTrip(existingTripId) : null;
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_tripModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:500px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">${existing ? '✏️ Edit Trip' : '✈️ Plan New Trip'}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <div>
              <label class="text-xs font-semibold text-muted">Trip Name *</label>
              <input id="tp_form_name" placeholder="e.g. Goa Monsoon Getaway" value="${_esc(existing?.name || '')}" class="form-input w-full" />
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Destination</label>
                <input id="tp_form_dest" placeholder="e.g. North Goa, India" value="${_esc(existing?.destination || '')}" class="form-input w-full" />
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Cover Emoji</label>
                <input id="tp_form_emoji" placeholder="🏖️" value="${_esc(existing?.coverEmoji || '✈️')}" class="form-input w-full" />
              </div>
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Start Date</label>
                <input type="date" id="tp_form_start" value="${existing?.startDate || ''}" class="form-input w-full" />
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">End Date</label>
                <input type="date" id="tp_form_end" value="${existing?.endDate || ''}" class="form-input w-full" />
              </div>
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Travel Mode</label>
                <select id="tp_form_mode" class="form-input w-full">
                  <option value="car" ${existing?.travelMode === 'car' ? 'selected' : ''}>🚗 Car / Roadtrip</option>
                  <option value="bike" ${existing?.travelMode === 'bike' ? 'selected' : ''}>🏍️ Motorcycle</option>
                  <option value="flight" ${existing?.travelMode === 'flight' ? 'selected' : ''}>✈️ Flight</option>
                  <option value="train" ${existing?.travelMode === 'train' ? 'selected' : ''}>🚆 Train</option>
                  <option value="bus" ${existing?.travelMode === 'bus' ? 'selected' : ''}>🚌 Bus</option>
                  <option value="mixed" ${existing?.travelMode === 'mixed' ? 'selected' : ''}>🗺️ Mixed Mode</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Status</label>
                <select id="tp_form_status" class="form-input w-full">
                  <option value="planning" ${existing?.status === 'planning' ? 'selected' : ''}>Planning</option>
                  <option value="booked" ${existing?.status === 'booked' ? 'selected' : ''}>Booked / Ready</option>
                  <option value="ongoing" ${existing?.status === 'ongoing' ? 'selected' : ''}>Ongoing</option>
                  <option value="completed" ${existing?.status === 'completed' ? 'selected' : ''}>Completed</option>
                  <option value="wishlist" ${existing?.status === 'wishlist' ? 'selected' : ''}>Dream / Wishlist</option>
                </select>
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Total Budget Target (₹)</label>
              <input type="number" id="tp_form_budget" placeholder="e.g. 40000" value="${existing?.budgetCap || ''}" class="form-input w-full" />
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Travelers (for splitting)</label>
              <div id="tp_form_persons" class="space-y-2 mb-2"></div>
              <button type="button" class="tp-btn-secondary" style="font-size:11.5px; padding:4px 10px;" onclick="window.LM_TripUI._addPersonRow()">+ Add Traveler</button>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Notes / Packing / Tips</label>
              <textarea id="tp_form_notes" rows="2" placeholder="Sunscreen, trekking shoes, hotel check-in info..." class="form-input w-full">${_esc(existing?.notes || '')}</textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._saveTripModal('${existing?.id || ''}')">Save Trip</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);

      // Render persons
      const pContainer = modal.querySelector('#tp_form_persons');
      const persons = (existing?.persons && existing.persons.length) ? existing.persons : [{ id: 'p1', name: 'You' }];
      persons.forEach(p => this._addPersonRow(p.name, p.id));
    },

    _addPersonRow: function (name = '', id = '') {
      const container = document.getElementById('tp_form_persons');
      if (!container) return;
      const div = document.createElement('div');
      div.className = 'flex gap-2 items-center';
      div.innerHTML = `
        <input type="text" placeholder="Traveler Name" value="${_esc(name)}" class="form-input flex-1 tp-person-input" data-id="${id || ''}" />
        <button type="button" class="tp-icon-btn" style="color:var(--rose);" onclick="this.parentElement.remove()">✕</button>
      `;
      container.appendChild(div);
    },

    _saveTripModal: async function (existingId) {
      const name = document.getElementById('tp_form_name')?.value.trim();
      if (!name) {
        alert('Please enter a trip name');
        return;
      }

      const dest = document.getElementById('tp_form_dest')?.value.trim();
      const emoji = document.getElementById('tp_form_emoji')?.value.trim() || '🏖️';
      const start = document.getElementById('tp_form_start')?.value;
      const end = document.getElementById('tp_form_end')?.value || start;
      const mode = document.getElementById('tp_form_mode')?.value || 'car';
      const status = document.getElementById('tp_form_status')?.value || 'planning';
      const budget = Number(document.getElementById('tp_form_budget')?.value) || 0;
      const notes = document.getElementById('tp_form_notes')?.value.trim() || '';

      const personInputs = Array.from(document.querySelectorAll('.tp-person-input'));
      const persons = personInputs
        .map((inp, idx) => ({ id: inp.dataset.id || `p_${idx + 1}`, name: inp.value.trim() }))
        .filter(p => p.name);

      if (!persons.length) persons.push({ id: 'p1', name: 'You' });

      try {
        if (existingId) {
          await window.LM_TripService.updateTrip(existingId, {
            name, destination: dest, coverEmoji: emoji, startDate: start, endDate: end,
            travelMode: mode, status, budgetCap: budget, notes, persons
          });
          this.openTrip(existingId);
        } else {
          const newTrip = await window.LM_TripService.createTrip({
            name, destination: dest, coverEmoji: emoji, startDate: start, endDate: end,
            travelMode: mode, status, budgetCap: budget, notes, persons
          });
          this.openTrip(newTrip.id);
        }

        document.getElementById('tp_tripModalOverlay')?.remove();
      } catch (err) {
        alert('Error saving trip: ' + err.message);
      }
    },

    deleteTrip: async function (tripId) {
      if (!confirm('Are you sure you want to delete this trip and all its plans?')) return;
      await window.LM_TripService.deleteTripFromDB(tripId);
      this.renderDirectory();
    },

    // ─────────────────────────────────────────────────────────────
    // 8. WISHLIST / SEEN PLACES MODAL
    // ─────────────────────────────────────────────────────────────
    openAddWishlistModal: function (tripId, wishId = null) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;
      const existing = wishId ? (trip.wishlist || []).find(w => w.id === wishId) : null;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_wishModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:480px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">${existing ? '✏️ Edit Seen Spot' : '💡 Add Spot / Idea You Seen'}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <div>
              <label class="text-xs font-semibold text-muted">Spot / Activity Name *</label>
              <input id="tp_wish_title" placeholder="e.g. Cliff Sunset Cafe at Anjuna" value="${_esc(existing?.title || '')}" class="form-input w-full" />
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Category</label>
                <select id="tp_wish_cat" class="form-input w-full">
                  <option value="Sightseeing" ${existing?.category === 'Sightseeing' ? 'selected' : ''}>🏛️ Sightseeing</option>
                  <option value="Food" ${existing?.category === 'Food' ? 'selected' : ''}>🍽️ Food &amp; Dining</option>
                  <option value="Activity" ${existing?.category === 'Activity' ? 'selected' : ''}>🪂 Activity / Adventure</option>
                  <option value="Stay" ${existing?.category === 'Stay' ? 'selected' : ''}>🏨 Stay / Hotel</option>
                  <option value="Transit" ${existing?.category === 'Transit' ? 'selected' : ''}>🚗 Travel / Transit</option>
                  <option value="Shopping" ${existing?.category === 'Shopping' ? 'selected' : ''}>🛍️ Shopping</option>
                  <option value="Other" ${existing?.category === 'Other' ? 'selected' : ''}>📌 Other</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Priority</label>
                <select id="tp_wish_prio" class="form-input w-full">
                  <option value="must_do" ${existing?.priority === 'must_do' ? 'selected' : ''}>Must Do 🔥</option>
                  <option value="recommended" ${existing?.priority === 'recommended' || !existing ? 'selected' : ''}>Recommended ✨</option>
                  <option value="backup" ${existing?.priority === 'backup' ? 'selected' : ''}>Backup Option 📌</option>
                </select>
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Location / Area</label>
              <input id="tp_wish_loc" placeholder="e.g. Anjuna Beach, North Goa" value="${_esc(existing?.location || '')}" class="form-input w-full" />
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Inspiration Link (Reel / Maps / YouTube / Blog)</label>
              <input id="tp_wish_url" placeholder="https://instagram.com/reel/..." value="${_esc(existing?.sourceUrl || '')}" class="form-input w-full" />
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Estimated Cost (₹)</label>
              <input type="number" id="tp_wish_cost" placeholder="e.g. 1500" value="${existing?.estimatedCost || ''}" class="form-input w-full" />
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Notes / What you saw</label>
              <textarea id="tp_wish_notes" rows="2" placeholder="Rooftop cliff table, live music on Friday, best sunset view..." class="form-input w-full">${_esc(existing?.notes || '')}</textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._saveWishModal('${trip.id}', '${existing?.id || ''}')">Save Spot</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    _saveWishModal: async function (tripId, wishId) {
      const title = document.getElementById('tp_wish_title')?.value.trim();
      if (!title) { alert('Please enter a spot name'); return; }

      const category = document.getElementById('tp_wish_cat')?.value || 'Sightseeing';
      const priority = document.getElementById('tp_wish_prio')?.value || 'recommended';
      const location = document.getElementById('tp_wish_loc')?.value.trim() || '';
      const sourceUrl = document.getElementById('tp_wish_url')?.value.trim() || '';
      const estimatedCost = Number(document.getElementById('tp_wish_cost')?.value) || 0;
      const notes = document.getElementById('tp_wish_notes')?.value.trim() || '';

      if (wishId) {
        await window.LM_TripService.updateWishlistItem(tripId, wishId, {
          title, category, priority, location, sourceUrl, estimatedCost, notes
        });
      } else {
        await window.LM_TripService.addWishlistItem(tripId, {
          title, category, priority, location, sourceUrl, estimatedCost, notes
        });
      }

      document.getElementById('tp_wishModalOverlay')?.remove();
      this.renderTripWorkspace(tripId);
    },

    deleteWish: async function (tripId, wishId) {
      if (!confirm('Remove this spot from your wishlist?')) return;
      await window.LM_TripService.deleteWishlistItem(tripId, wishId);
      this.renderTripWorkspace(tripId);
    },

    openScheduleWishlistModal: function (tripId, wishId) {
      const trip = window.LM_TripService.getTrip(tripId);
      const wish = (trip?.wishlist || []).find(w => w.id === wishId);
      if (!wish) return;

      const days = window.LM_TripService.calculateTripDays(trip.startDate, trip.endDate);
      const dayOptions = [];
      for (let i = 1; i <= days; i++) {
        dayOptions.push(`<option value="${i}">Day ${i}</option>`);
      }

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_scheduleModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:440px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">📅 Schedule to Itinerary</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <p style="font-size:13px; color:var(--text-2); margin-bottom:10px;">
              Scheduling: <strong style="color:var(--text);">${_esc(wish.title)}</strong>
            </p>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Assign to Day</label>
                <select id="tp_sch_day" class="form-input w-full">${dayOptions.join('')}</select>
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Time Slot</label>
                <select id="tp_sch_slot" class="form-input w-full">
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                  <option value="all_day">All Day</option>
                </select>
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Target Time (Optional)</label>
              <input type="time" id="tp_sch_time" value="10:00" class="form-input w-full" />
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._confirmScheduleWish('${trip.id}', '${wish.id}')">Confirm Schedule</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    _confirmScheduleWish: async function (tripId, wishId) {
      const dayNumber = Number(document.getElementById('tp_sch_day')?.value) || 1;
      const timeSlot = document.getElementById('tp_sch_slot')?.value || 'morning';
      const time = document.getElementById('tp_sch_time')?.value || '';

      await window.LM_TripService.convertWishlistToPlan(tripId, wishId, { dayNumber, timeSlot, time });
      document.getElementById('tp_scheduleModalOverlay')?.remove();
      this.activeTab = 'itinerary';
      this.renderTripWorkspace(tripId);
    },

    // ─────────────────────────────────────────────────────────────
    // 9. PLAN ITEM MODAL (ADD / EDIT)
    // ─────────────────────────────────────────────────────────────
    openAddPlanModal: function (tripId, planId = null, defaultDay = 1) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;
      const existing = planId ? (trip.plans || []).find(p => p.id === planId) : null;
      const days = window.LM_TripService.calculateTripDays(trip.startDate, trip.endDate);

      const dayOptions = [];
      for (let i = 1; i <= Math.max(days, existing?.dayNumber || 1); i++) {
        const isSel = (existing ? existing.dayNumber === i : defaultDay === i);
        dayOptions.push(`<option value="${i}" ${isSel ? 'selected' : ''}>Day ${i}</option>`);
      }

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_planModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:480px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">${existing ? '✏️ Edit Plan Item' : '📋 Add Plan Item'}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <div>
              <label class="text-xs font-semibold text-muted">Plan Title *</label>
              <input id="tp_plan_title" placeholder="e.g. Scuba Diving at Grande Island" value="${_esc(existing?.title || '')}" class="form-input w-full" />
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Day</label>
                <select id="tp_plan_day" class="form-input w-full">${dayOptions.join('')}</select>
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Time Slot</label>
                <select id="tp_plan_slot" class="form-input w-full">
                  <option value="morning" ${existing?.timeSlot === 'morning' ? 'selected' : ''}>Morning</option>
                  <option value="afternoon" ${existing?.timeSlot === 'afternoon' ? 'selected' : ''}>Afternoon</option>
                  <option value="evening" ${existing?.timeSlot === 'evening' ? 'selected' : ''}>Evening</option>
                  <option value="night" ${existing?.timeSlot === 'night' ? 'selected' : ''}>Night</option>
                  <option value="all_day" ${existing?.timeSlot === 'all_day' ? 'selected' : ''}>All Day</option>
                </select>
              </div>
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Category</label>
                <select id="tp_plan_cat" class="form-input w-full">
                  <option value="Activity" ${existing?.category === 'Activity' ? 'selected' : ''}>🪂 Activity / Adventure</option>
                  <option value="Stay" ${existing?.category === 'Stay' ? 'selected' : ''}>🏨 Stay / Hotel</option>
                  <option value="Food" ${existing?.category === 'Food' ? 'selected' : ''}>🍽️ Food &amp; Dining</option>
                  <option value="Sightseeing" ${existing?.category === 'Sightseeing' ? 'selected' : ''}>🏛️ Sightseeing</option>
                  <option value="Transit" ${existing?.category === 'Transit' ? 'selected' : ''}>🚗 Travel / Transit</option>
                  <option value="Shopping" ${existing?.category === 'Shopping' ? 'selected' : ''}>🛍️ Shopping</option>
                  <option value="Other" ${existing?.category === 'Other' ? 'selected' : ''}>📌 Other</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Status</label>
                <select id="tp_plan_status" class="form-input w-full">
                  <option value="planned" ${existing?.status === 'planned' ? 'selected' : ''}>Planned</option>
                  <option value="booked" ${existing?.status === 'booked' ? 'selected' : ''}>Booked / Confirmed</option>
                  <option value="completed" ${existing?.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
              </div>
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Target Time</label>
                <input type="time" id="tp_plan_time" value="${existing?.time || ''}" class="form-input w-full" />
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Estimated Cost (₹)</label>
                <input type="number" id="tp_plan_cost" placeholder="e.g. 3500" value="${existing?.estimatedCost || ''}" class="form-input w-full" />
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Location / Meeting Point</label>
              <input id="tp_plan_loc" placeholder="e.g. Calangute Jetty" value="${_esc(existing?.location || '')}" class="form-input w-full" />
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Booking Reference / PNR (Optional)</label>
              <input id="tp_plan_ref" placeholder="e.g. PNR-1092, Booking #44" value="${_esc(existing?.bookingRef || '')}" class="form-input w-full" />
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Notes / Packing Info</label>
              <textarea id="tp_plan_notes" rows="2" placeholder="Carry swim gear, arrive 15 min early..." class="form-input w-full">${_esc(existing?.notes || '')}</textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._savePlanModal('${trip.id}', '${existing?.id || ''}')">Save Plan Item</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    _savePlanModal: async function (tripId, planId) {
      const title = document.getElementById('tp_plan_title')?.value.trim();
      if (!title) { alert('Please enter a plan title'); return; }

      const dayNumber = Number(document.getElementById('tp_plan_day')?.value) || 1;
      const timeSlot = document.getElementById('tp_plan_slot')?.value || 'morning';
      const category = document.getElementById('tp_plan_cat')?.value || 'Activity';
      const status = document.getElementById('tp_plan_status')?.value || 'planned';
      const time = document.getElementById('tp_plan_time')?.value || '';
      const estimatedCost = Number(document.getElementById('tp_plan_cost')?.value) || 0;
      const location = document.getElementById('tp_plan_loc')?.value.trim() || '';
      const bookingRef = document.getElementById('tp_plan_ref')?.value.trim() || '';
      const notes = document.getElementById('tp_plan_notes')?.value.trim() || '';

      if (planId) {
        await window.LM_TripService.updatePlanItem(tripId, planId, {
          title, dayNumber, timeSlot, category, status, time, estimatedCost, location, bookingRef, notes
        });
      } else {
        await window.LM_TripService.addPlanItem(tripId, {
          title, dayNumber, timeSlot, category, status, time, estimatedCost, location, bookingRef, notes
        });
      }

      document.getElementById('tp_planModalOverlay')?.remove();
      this.renderTripWorkspace(tripId);
    },

    deletePlan: async function (tripId, planId) {
      if (!confirm('Delete this itinerary plan?')) return;
      await window.LM_TripService.deletePlanItem(tripId, planId, true);
      this.renderTripWorkspace(tripId);
    },

    // ─────────────────────────────────────────────────────────────
    // 10. PLAN EXPENSE MODAL (LOGGING EXPENSE AGAINST PLAN)
    // ─────────────────────────────────────────────────────────────
    openPlanExpenseModal: function (tripId, planId, existingExpId = null) {
      const trip = window.LM_TripService.getTrip(tripId);
      const plan = (trip?.plans || []).find(p => p.id === planId);
      if (!trip || !plan) return;

      const pf = window.LM_TripService.getPlanFinancials(plan);
      const defaultAmount = pf.actualTotal === 0 && pf.estimatedCost > 0 ? pf.estimatedCost : '';

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_planExpModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:460px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">⚡ Log Expense for Plan</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <p style="font-size:12.5px; color:var(--text-2); margin-bottom:10px;">
              Plan: <strong style="color:var(--text);">${_esc(plan.title)}</strong> (Estimated: ${_fmtINR(pf.estimatedCost)})
            </p>

            <div>
              <label class="text-xs font-semibold text-muted">Expense Description *</label>
              <input id="tp_pexp_title" placeholder="e.g. Scuba Advance Deposit" value="${_esc(plan.title)}" class="form-input w-full" />
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Amount (₹) *</label>
                <input type="number" id="tp_pexp_amount" placeholder="e.g. 3500" value="${defaultAmount}" class="form-input w-full" />
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Date</label>
                <input type="date" id="tp_pexp_date" value="${new Date().toISOString().split('T')[0]}" class="form-input w-full" />
              </div>
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Paid By</label>
                <select id="tp_pexp_paidby" class="form-input w-full">
                  ${(trip.persons || []).map(p => `<option value="${p.id}">${_esc(p.name)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Payment Method</label>
                <select id="tp_pexp_method" class="form-input w-full">
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="NetBanking">Net Banking</option>
                </select>
              </div>
            </div>

            <!-- Interlink with Central Ledger -->
            <div style="background:rgba(0, 240, 255, 0.05); border:1px solid rgba(0, 240, 255, 0.2); border-radius:10px; padding:10px 12px; margin-top:8px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:600; color:var(--text);">
                <input type="checkbox" id="tp_pexp_link" checked />
                <span>Record to LedgerMate Central Bank Account</span>
              </label>
              <div style="font-size:11px; color:var(--text-3); margin-top:4px;">
                Automatically records an interlinked expense in your main transactions ledger and deducts your bank balance.
              </div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._savePlanExpense('${trip.id}', '${plan.id}')">Save Expense</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    _savePlanExpense: async function (tripId, planId) {
      const title = document.getElementById('tp_pexp_title')?.value.trim();
      const amount = Number(document.getElementById('tp_pexp_amount')?.value);
      if (!title || !amount || amount <= 0) {
        alert('Please enter a valid description and positive amount');
        return;
      }

      const date = document.getElementById('tp_pexp_date')?.value;
      const paidBy = document.getElementById('tp_pexp_paidby')?.value;
      const paymentMethod = document.getElementById('tp_pexp_method')?.value;
      const linkToCentralLedger = Boolean(document.getElementById('tp_pexp_link')?.checked);

      await window.LM_TripService.addPlanExpense(tripId, planId, {
        title, amount, date, paidBy, paymentMethod
      }, { linkToCentralLedger });

      document.getElementById('tp_planExpModalOverlay')?.remove();
      this.renderTripWorkspace(tripId);
    },

    deletePlanExpense: async function (tripId, planId, expId) {
      if (!confirm('Delete this expense?')) return;
      await window.LM_TripService.deletePlanExpense(tripId, planId, expId, true);
      this.renderTripWorkspace(tripId);
    },

    // ─────────────────────────────────────────────────────────────
    // 11. GENERAL EXPENSE MODAL
    // ─────────────────────────────────────────────────────────────
    openGeneralExpenseModal: function (tripId) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_genExpModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:460px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">＋ Add General Trip Expense</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <div>
              <label class="text-xs font-semibold text-muted">Description *</label>
              <input id="tp_gexp_title" placeholder="e.g. Highway Toll / Group Snacks" class="form-input w-full" />
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Amount (₹) *</label>
                <input type="number" id="tp_gexp_amount" placeholder="e.g. 500" class="form-input w-full" />
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Category</label>
                <select id="tp_gexp_cat" class="form-input w-full">
                  <option value="Transit">🚗 Toll / Fuel / Transit</option>
                  <option value="Food">🍽️ Snacks / Food</option>
                  <option value="Shopping">🛍️ Shopping</option>
                  <option value="General">📌 General / Misc</option>
                </select>
              </div>
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Paid By</label>
                <select id="tp_gexp_paidby" class="form-input w-full">
                  ${(trip.persons || []).map(p => `<option value="${p.id}">${_esc(p.name)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Payment Method</label>
                <select id="tp_gexp_method" class="form-input w-full">
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
            </div>

            <div style="background:rgba(0, 240, 255, 0.05); border:1px solid rgba(0, 240, 255, 0.2); border-radius:10px; padding:10px 12px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:600; color:var(--text);">
                <input type="checkbox" id="tp_gexp_link" checked />
                <span>Record to LedgerMate Central Bank Account</span>
              </label>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._saveGeneralExpense('${trip.id}')">Save Expense</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    _saveGeneralExpense: async function (tripId) {
      const title = document.getElementById('tp_gexp_title')?.value.trim();
      const amount = Number(document.getElementById('tp_gexp_amount')?.value);
      if (!title || !amount || amount <= 0) {
        alert('Please enter a description and amount');
        return;
      }

      const category = document.getElementById('tp_gexp_cat')?.value || 'General';
      const paidBy = document.getElementById('tp_gexp_paidby')?.value;
      const paymentMethod = document.getElementById('tp_gexp_method')?.value;
      const linkToCentralLedger = Boolean(document.getElementById('tp_gexp_link')?.checked);

      await window.LM_TripService.addGeneralExpense(tripId, {
        title, amount, category, paidBy, paymentMethod
      }, { linkToCentralLedger });

      document.getElementById('tp_genExpModalOverlay')?.remove();
      this.renderTripWorkspace(tripId);
    },

    deleteGeneralExpense: async function (tripId, expId) {
      if (!confirm('Delete this expense?')) return;
      await window.LM_TripService.deleteGeneralExpense(tripId, expId, true);
      this.renderTripWorkspace(tripId);
    },

    confirmSettlement: async function (tripId, fromId, toId, amount) {
      await window.LM_TripService.updateSettlementPayment(tripId, fromId, toId, amount);
      this.renderTripWorkspace(tripId);
    },

    markAllSettled: async function (tripId) {
      if (!confirm('Mark all group debts as settled?')) return;
      await window.LM_TripService.markAllSettled(tripId);
      this.renderTripWorkspace(tripId);
    },

    shareTrip: function (tripId) {
      const text = window.LM_TripService.generateWhatsAppText(tripId);
      if (!text) return;
      window.open(`https://wa.me/?text=${encodeURIComponent(text.substring(0, 12000))}`, '_blank');
    }
  };

  window.LM_TripUI = TripUI;
})();
