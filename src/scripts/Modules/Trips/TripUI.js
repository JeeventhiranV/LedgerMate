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
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button class="tp-btn-secondary" onclick="window.LM_TripUI.openImportTripModal()" title="Import portable .lm_trip package">
                  <span>📥</span> Import Trip
                </button>
                <button class="tp-btn-primary" onclick="window.LM_TripUI.openAddTripModal()">
                  <span>＋</span> Add New Trip
                </button>
              </div>
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
                <button class="tp-btn-secondary" style="color:var(--teal);" onclick="window.LM_TripUI.downloadICalendar('${trip.id}')" title="Sync all plans, flights & hotels with Google / Apple Calendar">📅 Sync Calendar</button>
                <button class="tp-btn-secondary" onclick="window.LM_TripUI.exportTripModal('${trip.id}')" title="Export entire trip as portable package">📦 Export</button>
                <button class="tp-btn-secondary" onclick="window.LM_TripUI.cloneTripModal('${trip.id}')" title="Duplicate this trip as a template">📑 Clone</button>
                <button class="tp-btn-secondary" style="color:var(--teal);" onclick="window.LM_TripUI.openRouteMapModal('${trip.id}')" title="Interactive Day Route Map">🗺️ Map</button>
                <button class="tp-btn-secondary" style="color:var(--teal);" onclick="window.LM_TripUI.startVoiceLog('${trip.id}')" title="Voice Expense / Note">🎙️ Voice</button>
                <button class="tp-btn-secondary" onclick="window.LM_TripUI.printTripItinerary('${trip.id}')" title="Printable / PDF Statement">📄 PDF</button>
                <button class="tp-btn-secondary" onclick="window.LM_TripUI.shareTrip('${trip.id}')" title="WhatsApp Formatted Share">💬 WhatsApp</button>
                <button class="tp-btn-secondary" onclick="window.LM_TripUI.openAddTripModal('${trip.id}')">✏️ Edit</button>
                <button class="tp-btn-secondary" style="color:var(--rose);" onclick="window.LM_TripUI.deleteTrip('${trip.id}')">🗑️</button>
              </div>
            </div>

            <div style="display:flex; align-items:flex-start; gap:14px; flex-wrap:wrap; margin-bottom:14px;">
              <div class="tp-hero-icon" style="font-size:32px;">${trip.coverEmoji || '🏖️'}</div>
              <div style="flex:1; min-width:240px;">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                  <h1 class="tp-hero-title" style="font-size:22px; margin:0;">${_esc(trip.name)}</h1>
                  <span class="tp-status-pill tp-status-${trip.status || 'planning'}">${_esc(trip.status || 'planning')}</span>
                  ${trip.currency && trip.currency !== 'INR' ? `<span class="tp-currency-pill" style="background:rgba(0,240,255,0.12); color:var(--teal); font-size:11px; padding:2px 8px; border-radius:12px; font-weight:600; display:inline-flex; align-items:center; gap:4px;">💱 ${trip.currency} (1 = ₹${trip.exchangeRate || 1}) <button type="button" onclick="window.LM_TripUI.refreshLiveFX('${trip.id}')" style="background:none; border:none; color:var(--teal); cursor:pointer; padding:0 2px; font-size:11px;" title="Refresh live market FX rate">🔄</button></span>` : ''}
                </div>
                <div class="tp-trip-card-meta" style="margin-top:4px; margin-bottom:0;">
                  <span>📍 ${_esc(trip.destination || 'Unspecified')}</span>
                  <span>·</span>
                  <span>📅 ${trip.startDate || '?'} → ${trip.endDate || '?'} (${days} Days)</span>
                  <span>·</span>
                  <span>👥 ${(trip.persons || []).map(p => _esc(p.name)).join(', ')}</span>
                  ${trip.vehicleId ? `<span>·</span><span>🚗 Linked Vehicle</span>` : ''}
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
                <span class="tp-kpi-label">Plan Estimated Costs</span>
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
            <button class="tp-tab-btn ${this.activeTab === 'packing' ? 'active' : ''}" onclick="window.LM_TripUI.switchTab('packing')">
              <span>🎒</span> Packing &amp; Docs
              <span class="tp-tab-badge">${fin.packingStats?.packed || 0}/${fin.packingStats?.total || 0}</span>
            </button>
            <button class="tp-tab-btn ${this.activeTab === 'analytics' ? 'active' : ''}" onclick="window.LM_TripUI.switchTab('analytics')">
              <span>📊</span> Analytics &amp; Charts
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
      } else if (this.activeTab === 'packing') {
        this.renderPackingAndDocsTab(trip, container);
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
      this.itineraryFilter = this.itineraryFilter || 'all'; // 'all' | 'pending' | 'visited'
      const itinStats = window.LM_TripService.getItineraryStats(trip.id);

      // Collect all days present
      const dayNumbers = [];
      for (let i = 1; i <= days; i++) dayNumbers.push(i);

      let filteredPlans = plans;
      if (this.activeDayFilter !== 'all') {
        filteredPlans = filteredPlans.filter(p => p.dayNumber === Number(this.activeDayFilter));
      }
      if (this.itineraryFilter === 'pending') {
        filteredPlans = filteredPlans.filter(p => (p.status || 'planned') !== 'completed');
      } else if (this.itineraryFilter === 'visited') {
        filteredPlans = filteredPlans.filter(p => p.status === 'completed');
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
                Day ${d} (${(plans.filter(p => p.dayNumber === d)).length})
              </button>
            `).join('')}
          </div>

          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <button class="tp-btn-secondary" style="color:var(--teal);" onclick="window.LM_TripUI.openRouteMapModal('${trip.id}')" title="Interactive Day Route Map">
              🗺️ Route Map
            </button>
            <button class="tp-btn-primary" onclick="window.LM_TripUI.openAddPlanModal('${trip.id}', null, ${this.activeDayFilter === 'all' ? 1 : this.activeDayFilter})">
              <span>＋</span> Add Plan Item
            </button>
          </div>
        </div>

        <!-- Itinerary View Status Filter Strip -->
        <div class="tp-itinerary-filter-bar">
          <div class="tp-filter-pills-group">
            <button class="tp-filter-pill ${this.itineraryFilter === 'all' ? 'active' : ''}" onclick="window.LM_TripUI.setItineraryFilter('all')">
              All Spots (${itinStats.total})
            </button>
            <button class="tp-filter-pill ${this.itineraryFilter === 'pending' ? 'active' : ''}" onclick="window.LM_TripUI.setItineraryFilter('pending')" title="Show only pending spots to visit">
              ⏳ Pending Only (${itinStats.pending})
            </button>
            <button class="tp-filter-pill ${this.itineraryFilter === 'visited' ? 'active' : ''}" onclick="window.LM_TripUI.setItineraryFilter('visited')" title="Show completed spots">
              ✅ Visited (${itinStats.visited})
            </button>
          </div>
          <div class="tp-itinerary-progress-pill" title="${itinStats.visited} of ${itinStats.total} spots visited (${itinStats.percent}%)">
            <div class="tp-progress-bar-inline"><div style="width:${itinStats.percent}%;"></div></div>
            <span>${itinStats.percent}% Visited (${itinStats.visited}/${itinStats.total})</span>
          </div>
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
              if (this.activeDayFilter === 'all' && dayPlans.length === 0 && this.itineraryFilter === 'all') return '';

              // Calculate Day's planned vs actual
              const dayPlanned = dayPlans.reduce((s, p) => s + (p.estimatedCost || 0), 0);
              const dayActual = dayPlans.reduce((s, p) => s + (p.expenses || []).reduce((es, e) => es + e.amount, 0), 0);
              const dayStats = itinStats.byDay[d] || { total: 0, visited: 0, pending: 0 };
              const dayProgressStr = dayStats.total > 0 ? ` · <span style="color:var(--emerald); font-weight:600;">${dayStats.visited}/${dayStats.total} visited</span>` : '';
              const dayLocations = dayPlans.map(p => {
                if (p.location && !/^https?:\/\//i.test(p.location)) return p.location;
                return p.title;
              }).filter(Boolean);
              const routeBtn = dayLocations.length > 1
                ? `<a href="https://www.google.com/maps/dir/${dayLocations.map(encodeURIComponent).join('/')}" target="_blank" rel="noopener noreferrer" class="tp-route-link" style="color:var(--teal); font-size:11px; text-decoration:none; display:inline-flex; align-items:center; gap:3px; background:rgba(0,240,255,0.08); padding:2px 8px; border-radius:12px;">🗺️ Day Route (${dayLocations.length} stops) ↗</a>`
                : '';

              const tripStartDate = trip.startDate || new Date().toISOString().split('T')[0];
              const dayDateObj = new Date(tripStartDate);
              dayDateObj.setDate(dayDateObj.getDate() + (d - 1));
              const dayDateStr = dayDateObj.toISOString().split('T')[0];

              let weatherChip = '';
              const destKey = (trip.destination || '').trim().toLowerCase();
              const wMap = destKey ? window.LM_TripService?._weatherCache?.[destKey]?.data : null;
              const dayW = wMap ? wMap[dayDateStr] : null;
              if (dayW) {
                weatherChip = `<span class="tp-weather-chip" title="Forecast for ${dayDateStr}: ${dayW.desc}">${dayW.emoji} ${dayW.tempMax}° / ${dayW.tempMin}°C · 💧 ${dayW.rainProb}%</span>`;
                if (dayW.rainProb >= 50) {
                  weatherChip += ` <span class="tp-weather-alert-chip" title="Rain probability is ${dayW.rainProb}%">🌧️ Rain Alert (${dayW.rainProb}%)</span>`;
                }
              }

              return `
                <div class="tp-day-group">
                  <div class="tp-day-title-strip">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                      <div class="tp-day-title-text">📅 DAY ${d}</div>
                      ${weatherChip}
                      ${routeBtn}
                      ${dayPlans.length > 1 ? `
                        <button type="button" class="tp-btn-secondary tp-btn-auto-align" onclick="window.LM_TripUI.openRouteOptimizerModal('${trip.id}', ${d})" title="Auto-align itinerary to nearest order based on Maps locations">
                          ⚡ Auto-Align Nearest
                        </button>
                      ` : ''}
                    </div>
                    <div class="tp-day-title-meta">
                      Est: ${_fmtINR(dayPlanned)} · Spent: ${_fmtINR(dayActual)}${dayProgressStr}
                    </div>
                  </div>

                  ${dayPlans.length === 0 ? `
                    <div style="padding:14px; font-size:12.5px; color:var(--text-3); background:rgba(255,255,255,0.02); border-radius:8px; border:1px dashed var(--border); text-align:center;">
                      ${this.itineraryFilter === 'pending'
                        ? `🎉 All scheduled spots for Day ${d} visited! <a href="javascript:void(0)" onclick="window.LM_TripUI.setItineraryFilter('all')" style="color:var(--teal); font-weight:600;">Show All Spots</a>`
                        : (this.itineraryFilter === 'visited'
                          ? `No spots marked visited yet for Day ${d}.`
                          : `No plans scheduled for Day ${d}. <a href="javascript:void(0)" onclick="window.LM_TripUI.openAddPlanModal('${trip.id}', null, ${d})" style="color:var(--teal); font-weight:600;">+ Add Plan</a>`)
                      }
                    </div>
                  ` : `
                    <div class="space-y-2">
                      ${dayPlans.map(plan => {
                        const pf = window.LM_TripService.getPlanFinancials(plan);
                        const isVisited = plan.status === 'completed';
                        const icon = catIcons[plan.category] || '📌';
                        const timeStr = plan.time ? ` · ⏰ ${plan.time}` : '';
                        const mapUrl = window.LM_TripService.getMapsUrl(plan);
                        const locLabel = (plan.location && !/^https?:\/\//i.test(plan.location)) ? plan.location : (plan.title || 'Maps');
                        const locStr = mapUrl 
                          ? ` · <a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="tp-map-pill" title="Open in Google Maps">📍 ${_esc(locLabel)} ↗</a>` 
                          : (plan.location ? ` · 📍 ${_esc(plan.location)}` : '');

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
                          <div class="tp-plan-card ${isVisited ? 'tp-plan-visited-card' : ''}">
                            <div class="tp-plan-top">
                              <div class="tp-plan-main">
                                <div class="tp-plan-cat-icon">${isVisited ? '✅' : icon}</div>
                                <div class="tp-plan-content">
                                  <div class="tp-plan-title ${isVisited ? 'tp-title-visited' : ''}">
                                    ${_esc(plan.title)}
                                    ${isVisited ? `<span class="tp-visited-badge">✓ Visited</span>` : ''}
                                  </div>
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
                                <button class="tp-plan-status-pill ${isVisited ? 'visited' : 'pending'}" title="${isVisited ? 'Click to mark as Pending' : 'Click to mark as Visited'}" onclick="window.LM_TripUI.togglePlanStatus('${trip.id}', '${plan.id}')">
                                  ${isVisited ? '✅ Visited' : '⏳ Mark Visited'}
                                </button>
                                ${mapUrl ? `<a class="tp-icon-btn" href="${mapUrl}" target="_blank" rel="noopener noreferrer" title="Navigate on Google Maps">🧭</a>` : ''}
                                <button class="tp-icon-btn" title="Move back to Seen &amp; Wishlist places" onclick="window.LM_TripUI.movePlanToWishlist('${trip.id}', '${plan.id}')">💡</button>
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
                                    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                      <span>• ${_esc(e.title)} (${_esc(e.paymentMethod || 'Cash')}${e.linkedTxId ? ' · 🔗' : ''})</span>
                                      ${(e.currency && e.currency !== 'INR') ? `<span style="background:rgba(0,240,255,0.1); color:var(--teal); font-size:10px; padding:1px 5px; border-radius:4px; font-weight:600;">${window.LM_TripService.fmtCurrency(e.localAmount, e.currency)}</span>` : ''}
                                      ${(e.receiptUrl || e.receiptId) ? `<button type="button" class="tp-receipt-pill" style="border:none; background:rgba(168,85,247,0.18); color:var(--violet); font-size:10px; padding:1px 6px; border-radius:4px; cursor:pointer;" onclick="window.LM_TripUI.viewReceipt('${e.receiptUrl || e.receiptId}')" title="View attached bill">📎 Bill</button>` : ''}
                                    </div>
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

      // Background weather hydration if destination provided
      if (trip.destination && typeof window !== 'undefined' && window.LM_TripService) {
        const dKey = trip.destination.trim().toLowerCase();
        if (!window.LM_TripService._weatherCache?.[dKey]) {
          window.LM_TripService.fetchWeatherForecast(trip.destination).then(res => {
            if (res && this.activeTab === 'itinerary' && this.activeTripId === trip.id) {
              const cont = document.getElementById('tp_tab_content');
              if (cont) this.renderItineraryTab(trip, cont);
            }
          });
        }
      }
    },

    setDayFilter: function (day) {
      this.activeDayFilter = day;
      const trip = window.LM_TripService.getTrip(this.activeTripId);
      if (trip) this.renderItineraryTab(trip, document.getElementById('tp_tab_content'));
    },

    setItineraryFilter: function (filter) {
      this.itineraryFilter = filter;
      const trip = window.LM_TripService.getTrip(this.activeTripId);
      if (trip) this.renderItineraryTab(trip, document.getElementById('tp_tab_content'));
    },

    togglePlanStatus: async function (tripId, planId) {
      const updated = await window.LM_TripService.togglePlanStatus(tripId, planId);
      if (updated) {
        const label = updated.status === 'completed' ? 'Marked as Visited! 🎉' : 'Marked as Pending/Planned';
        if (typeof showToast === 'function') showToast(label, 'success');
        this.renderTripWorkspace(tripId);
      }
    },

    movePlanToWishlist: async function (tripId, planId) {
      if (!confirm('Move this item back to your Seen & Wishlist places?')) return;
      const res = await window.LM_TripService.convertPlanToWishlist(tripId, planId);
      if (res) {
        if (typeof showToast === 'function') showToast('Moved to Seen & Wishlist spots! 💡', 'success');
        this.renderTripWorkspace(tripId);
      }
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

              const wishMapUrl = window.LM_TripService.getMapsUrl(w);
              const locLabel = (w.location && !/^https?:\/\//i.test(w.location)) ? w.location : (w.title || 'Maps');
              const wishLocStr = wishMapUrl
                ? `<span>· <a href="${wishMapUrl}" target="_blank" rel="noopener noreferrer" class="tp-map-pill" style="color:var(--teal);" title="Open in Google Maps">📍 ${_esc(locLabel)} ↗</a></span>`
                : (w.location ? `<span>· 📍 ${_esc(w.location)}</span>` : '');

              return `
                <div class="tp-wish-card">
                  <div class="tp-wish-top">
                    <div>
                      <div class="tp-wish-title">${_esc(w.title)}</div>
                      <div class="tp-wish-meta" style="margin-top:4px;">
                        ${prioBadge}
                        <span style="color:var(--teal); font-weight:600;">${_esc(w.category)}</span>
                        ${wishLocStr}
                      </div>
                    </div>
                    <div style="display:flex; gap:4px;">
                      ${wishMapUrl ? `<a class="tp-icon-btn" href="${wishMapUrl}" target="_blank" rel="noopener noreferrer" title="Open in Google Maps">🧭</a>` : ''}
                      <button class="tp-icon-btn" title="Edit" onclick="window.LM_TripUI.openAddWishlistModal('${trip.id}', '${w.id}')">✏️</button>
                      <button class="tp-icon-btn" title="Delete" onclick="window.LM_TripUI.deleteWish('${trip.id}', '${w.id}')">🗑️</button>
                    </div>
                  </div>

                  ${w.notes ? `<div class="tp-wish-notes">${_esc(w.notes)}</div>` : ''}

                  <div style="display:flex; flex-direction:column; gap:4px; margin: 6px 0;">
                    ${wishMapUrl ? `
                      <a href="${_esc(wishMapUrl)}" target="_blank" rel="noopener noreferrer" class="tp-map-link-btn" title="Open in Google Maps">
                        <span>📍</span> Open in Google Maps ↗
                      </a>
                    ` : ''}
                    ${(w.sourceUrl && w.sourceUrl !== wishMapUrl) ? `
                      <a href="${_esc(w.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="tp-wish-url-link">
                        <span>🔗</span> View Inspiration / Reel ↗
                      </a>
                    ` : ''}
                  </div>

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
    // 5. TAB 3: SMART PACKING CHECKLIST & DIGITAL DOCUMENT LOCKER
    // ─────────────────────────────────────────────────────────────
    renderPackingAndDocsTab: function (trip, container) {
      const stats = window.LM_TripService.getPackingStats(trip.id);
      const packingList = Array.isArray(trip.packingList) ? trip.packingList : [];
      const documents = Array.isArray(trip.documents) ? trip.documents : [];

      const categories = [
        { key: 'clothing', label: '👕 Clothing & Apparel' },
        { key: 'toiletries', label: '🧴 Toiletries & Grooming' },
        { key: 'electronics', label: '🔌 Electronics & Cables' },
        { key: 'documents', label: '🛂 IDs & Travel Documents' },
        { key: 'medical', label: '💊 Health & First Aid' },
        { key: 'gear', label: '🎒 Travel Gear & Utilities' },
        { key: 'general', label: '📌 Miscellaneous Items' }
      ];

      const docIcons = {
        flight: '✈️', hotel: '🏨', visa: '🛂', insurance: '🛡️',
        contact: '📞', ticket: '🎟️', rental: '🚗', other: '📄'
      };

      container.innerHTML = `
        <div class="tp-packing-container">
          <!-- PACKING PROGRESS SUMMARY & PRESETS -->
          <div class="tp-packing-hero-card" style="background:var(--surface-card); border:1px solid var(--border); border-radius:14px; padding:16px; margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
              <div>
                <h3 style="font-size:16px; font-weight:700; color:var(--text); margin:0;">🎒 Smart Packing Checklist</h3>
                <p style="font-size:12px; color:var(--text-3); margin:2px 0 0;">Never forget essentials with 1-click curated travel presets</p>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:13px; font-weight:700; color:var(--teal); font-family:var(--font-m);">
                  ${stats.packed} of ${stats.total} Packed (${stats.percent}%)
                </span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="tp-progress-bar-bg" style="height:8px; margin-bottom:14px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden;">
              <div class="tp-progress-bar-fill" style="width:${stats.percent}%; height:100%; background:linear-gradient(90deg, var(--teal), var(--emerald)); transition:width 0.3s ease;"></div>
            </div>

            <!-- Presets Bar -->
            <div class="tp-preset-strip" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="font-size:11px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:0.04em;">Auto-Populate:</span>
              <button type="button" class="tp-btn-secondary" style="font-size:11.5px; padding:4px 10px;" onclick="window.LM_TripUI.applyPackingPreset('${trip.id}', 'general')">🎒 General</button>
              <button type="button" class="tp-btn-secondary" style="font-size:11.5px; padding:4px 10px;" onclick="window.LM_TripUI.applyPackingPreset('${trip.id}', 'beach')">🏖️ Beach</button>
              <button type="button" class="tp-btn-secondary" style="font-size:11.5px; padding:4px 10px;" onclick="window.LM_TripUI.applyPackingPreset('${trip.id}', 'trek')">🥾 Trek / Hike</button>
              <button type="button" class="tp-btn-secondary" style="font-size:11.5px; padding:4px 10px;" onclick="window.LM_TripUI.applyPackingPreset('${trip.id}', 'international')">✈️ International</button>
              <button type="button" class="tp-btn-secondary" style="font-size:11.5px; padding:4px 10px;" onclick="window.LM_TripUI.applyPackingPreset('${trip.id}', 'roadtrip')">🚗 Road Trip</button>
            </div>
          </div>

          <!-- ADD PACKING ITEM INLINE -->
          <div class="tp-pack-add-bar" style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <input type="text" id="tp_new_pack_item" placeholder="Add custom item, e.g. Extra camera battery..." class="form-input" style="flex:1; min-width:180px;" onkeydown="if(event.key==='Enter') window.LM_TripUI.addCustomPackItem('${trip.id}')" />
            <select id="tp_new_pack_cat" class="form-input" style="width:auto; min-width:140px;">
              <option value="clothing">👕 Clothing</option>
              <option value="toiletries">🧴 Toiletries</option>
              <option value="electronics">🔌 Electronics</option>
              <option value="documents">🛂 Documents</option>
              <option value="medical">💊 Medical</option>
              <option value="gear">🎒 Gear</option>
              <option value="general" selected>📌 General</option>
            </select>
            <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI.addCustomPackItem('${trip.id}')">
              ＋ Add
            </button>
          </div>

          <!-- CATEGORIZED PACKING CHECKLIST -->
          <div class="tp-packing-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-bottom:24px;">
            ${packingList.length === 0 ? `
              <div style="grid-column:1/-1; text-align:center; padding:32px 16px; background:var(--surface-card); border-radius:12px; border:1px dashed var(--border);">
                <div style="font-size:28px; margin-bottom:8px;">🎒</div>
                <div style="font-size:14px; font-weight:600; color:var(--text); margin-bottom:4px;">Checklist is empty</div>
                <p style="font-size:12px; color:var(--text-3); max-width:320px; margin:0 auto 12px;">Choose a preset above or add custom packing items to get started.</p>
              </div>
            ` : categories.map(cat => {
              const items = packingList.filter(i => (i.category || 'general').toLowerCase() === cat.key);
              if (items.length === 0) return '';
              const catPacked = items.filter(i => i.packed).length;

              return `
                <div class="tp-pack-category-card" style="background:var(--surface-card); border:1px solid var(--border); border-radius:12px; padding:12px 14px;">
                  <div class="tp-pack-cat-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:6px;">
                    <span style="font-weight:700; font-size:13px; color:var(--text);">${cat.label}</span>
                    <span style="font-size:11px; color:var(--text-3); font-family:var(--font-m);">${catPacked}/${items.length}</span>
                  </div>
                  <div class="tp-pack-items-list space-y-1">
                    ${items.map(item => `
                      <div class="tp-pack-item ${item.packed ? 'packed' : ''}" style="display:flex; align-items:center; justify-content:space-between; padding:4px 6px; border-radius:6px; background:rgba(255,255,255,0.02);">
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; flex:1; overflow:hidden;">
                          <input type="checkbox" ${item.packed ? 'checked' : ''} onchange="window.LM_TripUI.togglePackItem('${trip.id}', '${item.id}')" />
                          <span style="font-size:12.5px; ${item.packed ? 'text-decoration:line-through; color:var(--text-3);' : 'color:var(--text);'} overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${_esc(item.item)}</span>
                        </label>
                        <button type="button" class="tp-icon-btn" style="color:var(--text-3); padding:2px;" title="Delete item" onclick="window.LM_TripUI.deletePackItem('${trip.id}', '${item.id}')">✕</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- DIGITAL DOCUMENT LOCKER SECTION -->
          <div class="tp-docs-section" style="background:var(--surface-card); border:1px solid var(--border); border-radius:14px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px;">
              <div>
                <h3 style="font-size:16px; font-weight:700; color:var(--text); margin:0;">🔒 Digital Document Locker</h3>
                <p style="font-size:12px; color:var(--text-3); margin:2px 0 0;">Offline PNRs, booking codes, policies &amp; emergency contacts</p>
              </div>
              <button class="tp-btn-primary" onclick="window.LM_TripUI.openAddDocModal('${trip.id}')">
                <span>＋</span> Add Document
              </button>
            </div>

            <div class="tp-docs-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
              ${documents.length === 0 ? `
                <div style="grid-column:1/-1; text-align:center; padding:32px 16px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px dashed var(--border);">
                  <div style="font-size:28px; margin-bottom:8px;">📂</div>
                  <div style="font-size:14px; font-weight:600; color:var(--text); margin-bottom:4px;">No documents in locker</div>
                  <p style="font-size:12px; color:var(--text-3); max-width:320px; margin:0 auto 12px;">Save flight PNRs, hotel voucher codes, visa numbers or emergency contacts here.</p>
                  <button class="tp-btn-secondary" onclick="window.LM_TripUI.openAddDocModal('${trip.id}')">+ Add First Document</button>
                </div>
              ` : documents.map(doc => {
                const icon = docIcons[doc.type] || '📄';
                return `
                  <div class="tp-doc-card" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px 14px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:20px;">${icon}</span>
                        <div>
                          <div style="font-size:13.5px; font-weight:700; color:var(--text);">${_esc(doc.title)}</div>
                          <span style="font-size:10px; color:var(--teal); font-weight:600; text-transform:uppercase;">${_esc(doc.type)}</span>
                        </div>
                      </div>
                      <div style="display:flex; gap:4px;">
                        <button class="tp-icon-btn" title="Edit" onclick="window.LM_TripUI.openAddDocModal('${trip.id}', '${doc.id}')">✏️</button>
                        <button class="tp-icon-btn" style="color:var(--rose);" title="Delete" onclick="window.LM_TripUI.deleteDoc('${trip.id}', '${doc.id}')">🗑️</button>
                      </div>
                    </div>

                    ${doc.refCode ? `
                      <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,240,255,0.06); border:1px dashed rgba(0,240,255,0.25); border-radius:6px; padding:6px 10px; margin-bottom:8px;">
                        <span style="font-family:var(--font-m); font-size:12px; font-weight:700; color:var(--teal); letter-spacing:0.04em;">${_esc(doc.refCode)}</span>
                        <button type="button" class="tp-icon-btn" style="font-size:11px; padding:2px 6px; color:var(--teal);" onclick="window.LM_TripUI.copyToClipboard('${_esc(doc.refCode)}')" title="Copy Code">
                          📋 Copy
                        </button>
                      </div>
                    ` : ''}

                    ${doc.notes ? `<div style="font-size:12px; color:var(--text-2); margin-bottom:6px;">${_esc(doc.notes)}</div>` : ''}

                    ${doc.attachmentUrl ? `
                      <a href="${_esc(doc.attachmentUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:4px; font-size:11.5px; color:var(--teal); text-decoration:none;">
                        📎 View Attached File ↗
                      </a>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    },

    // ─────────────────────────────────────────────────────────────
    // 6. TAB 4: PLAN-BY-PLAN EXPENSES, BURNING VELOCITY & CHARTS
    // ─────────────────────────────────────────────────────────────
    renderAnalyticsTab: function (trip, container) {
      const fin = window.LM_TripService.getTripFinancials(trip.id);
      const plans = Array.isArray(trip.plans) ? trip.plans : [];
      const generalExpenses = Array.isArray(trip.expenses) ? trip.expenses : [];

      // 1. Burn Pacing Banner
      let pacingBanner = '';
      if (fin.pacingStatus === 'over_pacing') {
        pacingBanner = `
          <div style="background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.3); border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:22px;">⚠️</span>
              <div>
                <strong style="color:var(--rose); font-size:13.5px; display:block;">Spending Pacing Warning</strong>
                <span style="font-size:12px; color:var(--text-2);">Burning ${_fmtINR(fin.avgDailySpend)}/day vs target cap of ${_fmtINR(fin.dailyBudgetCap)}/day (${fin.daysElapsed} of ${fin.tripDays} days elapsed).</span>
              </div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:11px; color:var(--text-3); display:block;">Projected Total</span>
              <strong style="font-size:14px; color:var(--rose); font-family:var(--font-m);">${_fmtINR(fin.projectedTotal)}</strong>
            </div>
          </div>
        `;
      } else if (fin.daysElapsed > 0) {
        pacingBanner = `
          <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); border-radius:12px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:22px;">✅</span>
              <div>
                <strong style="color:var(--emerald); font-size:13.5px; display:block;">Pacing Is On Track</strong>
                <span style="font-size:12px; color:var(--text-2);">Burning ${_fmtINR(fin.avgDailySpend)}/day safely within daily target cap of ${_fmtINR(fin.dailyBudgetCap)}/day.</span>
              </div>
            </div>
            <div style="text-align:right;">
              <span style="font-size:11px; color:var(--text-3); display:block;">Projected Total</span>
              <strong style="font-size:14px; color:var(--emerald); font-family:var(--font-m);">${_fmtINR(fin.projectedTotal)}</strong>
            </div>
          </div>
        `;
      }

      // 2. Daily Burn Pacing Bar Chart Data
      const tripDays = fin.tripDays || 1;
      const dayData = [];
      let maxDayVal = fin.dailyBudgetCap || 1000;
      for (let d = 1; d <= tripDays; d++) {
        const dPlans = plans.filter(p => (p.dayNumber || 1) === d);
        const planned = dPlans.reduce((s, p) => s + (p.estimatedCost || 0), 0);
        const actual = dPlans.reduce((s, p) => s + (p.expenses || []).reduce((es, e) => es + e.amount, 0), 0);
        if (planned > maxDayVal) maxDayVal = planned;
        if (actual > maxDayVal) maxDayVal = actual;
        dayData.push({ day: d, planned, actual });
      }
      maxDayVal = Math.ceil(maxDayVal * 1.15) || 1000;

      const chartTop = 30;
      const chartBottom = 160;
      const chartHeight = chartBottom - chartTop;
      const chartLeft = 55;
      const chartRight = 585;
      const chartWidth = chartRight - chartLeft;
      const barSlotWidth = chartWidth / tripDays;
      const barWidth = Math.min(18, Math.max(8, barSlotWidth * 0.35));
      const yMid = chartTop + chartHeight / 2;
      const midVal = Math.round(maxDayVal / 2);
      const capY = fin.dailyBudgetCap > 0 ? (chartBottom - (fin.dailyBudgetCap / maxDayVal) * chartHeight) : 0;

      const barsSvg = dayData.map((dd, idx) => {
        const cx = chartLeft + (idx + 0.5) * barSlotWidth;
        const pHeight = Math.max(2, (dd.planned / maxDayVal) * chartHeight);
        const aHeight = dd.actual > 0 ? Math.max(2, (dd.actual / maxDayVal) * chartHeight) : 0;
        const pY = chartBottom - pHeight;
        const aY = chartBottom - aHeight;
        const isOver = dd.actual > dd.planned && dd.actual > 0;

        return `
          <g class="tp-chart-bar-group">
            <rect x="${cx - barWidth - 1}" y="${pY}" width="${barWidth}" height="${pHeight}" fill="rgba(234, 179, 8, 0.45)" rx="2">
              <title>Day ${dd.day} Planned: ${_fmtINR(dd.planned)}</title>
            </rect>
            ${aHeight > 0 ? `
              <rect x="${cx + 1}" y="${aY}" width="${barWidth}" height="${aHeight}" fill="${isOver ? '#f43f5e' : '#10b981'}" rx="2">
                <title>Day ${dd.day} Actual: ${_fmtINR(dd.actual)}</title>
              </rect>
            ` : ''}
            <text x="${cx}" y="${chartBottom + 16}" font-size="10" text-anchor="middle" fill="#94a3b8">D${dd.day}</text>
          </g>
        `;
      }).join('');

      const capLineSvg = (capY >= chartTop && capY <= chartBottom) ? `
        <line x1="${chartLeft}" y1="${capY}" x2="${chartRight}" y2="${capY}" stroke="#00f0ff" stroke-dasharray="4 3" stroke-width="1.5" opacity="0.8" />
        <text x="${chartRight - 4}" y="${capY - 4}" font-size="9" text-anchor="end" fill="#00f0ff" font-weight="600">Daily Cap: ${_fmtINR(fin.dailyBudgetCap)}</text>
      ` : '';

      // 3. Category Donut Slices Data
      const catColors = {
        Stay: '#38bdf8', Food: '#f59e0b', Activity: '#a855f7', Sightseeing: '#10b981',
        Transit: '#f43f5e', Shopping: '#ec4899', Other: '#94a3b8'
      };
      const catEntries = Object.entries(fin.categoryBreakdown).filter(([_, d]) => d.actual > 0);
      const totalActual = fin.totalActualExpenses || 0;
      const R = 38;
      const C = 2 * Math.PI * R; // ~238.76

      let accumulatedOffset = 0;
      const donutSlices = catEntries.map(([cat, d]) => {
        const ratio = totalActual > 0 ? (d.actual / totalActual) : 0;
        const dash = ratio * C;
        const gap = C - dash;
        const offset = -accumulatedOffset;
        accumulatedOffset += dash;
        const color = catColors[cat] || '#94a3b8';
        return `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-width="16" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${offset}"><title>${cat}: ${_fmtINR(d.actual)} (${Math.round(ratio*100)}%)</title></circle>`;
      }).join('');

      container.innerHTML = `
        <div style="margin-bottom:20px;">
          ${pacingBanner}

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

          <!-- CHARTS GRID: SVG BURN PACING + SVG DONUT -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(320px, 1fr)); gap:14px; margin-bottom:20px;">
            <!-- DAILY BURN PACING BAR CHART -->
            <div style="background:var(--surface-card); border:1px solid var(--border); border-radius:14px; padding:16px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <h4 style="font-size:14px; font-weight:700; color:var(--text); margin:0;">📈 Daily Burn Pacing vs Cap</h4>
                <div style="display:flex; align-items:center; gap:8px; font-size:11px;">
                  <span style="display:inline-flex; align-items:center; gap:3px;"><span style="display:inline-block; width:8px; height:8px; background:rgba(234,179,8,0.7); border-radius:2px;"></span> Est</span>
                  <span style="display:inline-flex; align-items:center; gap:3px;"><span style="display:inline-block; width:8px; height:8px; background:#10b981; border-radius:2px;"></span> Actual</span>
                </div>
              </div>
              <svg viewBox="0 0 600 190" style="width:100%; height:auto; display:block; overflow:visible;">
                <!-- Grid Lines -->
                <line x1="${chartLeft}" y1="${chartTop}" x2="${chartRight}" y2="${chartTop}" stroke="rgba(255,255,255,0.06)" />
                <text x="${chartLeft - 6}" y="${chartTop + 4}" font-size="9" text-anchor="end" fill="#94a3b8">${_fmtINR(maxDayVal)}</text>
                <line x1="${chartLeft}" y1="${yMid}" x2="${chartRight}" y2="${yMid}" stroke="rgba(255,255,255,0.06)" />
                <text x="${chartLeft - 6}" y="${yMid + 4}" font-size="9" text-anchor="end" fill="#94a3b8">${_fmtINR(midVal)}</text>
                <line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="rgba(255,255,255,0.12)" />
                <text x="${chartLeft - 6}" y="${chartBottom + 4}" font-size="9" text-anchor="end" fill="#94a3b8">₹0</text>
                <!-- Daily Cap Dotted Line -->
                ${capLineSvg}
                <!-- Day Bars -->
                ${barsSvg}
              </svg>
            </div>

            <!-- CATEGORY SPENDING DONUT & LEGEND -->
            <div style="background:var(--surface-card); border:1px solid var(--border); border-radius:14px; padding:16px;">
              <h4 style="font-size:14px; font-weight:700; color:var(--text); margin-bottom:12px;">🍩 Category Spending Breakdown</h4>
              ${totalActual === 0 ? `
                <div style="text-align:center; padding:36px 12px; color:var(--text-3); font-size:12.5px;">No expenses logged yet to render breakdown.</div>
              ` : `
                <div style="display:flex; align-items:center; gap:18px; flex-wrap:wrap;">
                  <div style="position:relative; width:120px; height:120px; flex-shrink:0;">
                    <svg viewBox="0 0 120 120" style="width:100%; height:100%; transform:rotate(-90deg);">
                      ${donutSlices}
                    </svg>
                    <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; pointer-events:none;">
                      <span style="font-size:10px; color:var(--text-3); text-transform:uppercase;">Total</span>
                      <strong style="font-size:11.5px; color:var(--text); font-family:var(--font-m);">${_fmtINR(totalActual)}</strong>
                    </div>
                  </div>

                  <div style="flex:1; min-width:160px;" class="space-y-1">
                    ${catEntries.map(([cat, d]) => {
                      const color = catColors[cat] || '#94a3b8';
                      const pct = Math.round((d.actual / totalActual) * 100);
                      return `
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                          <div style="display:flex; align-items:center; gap:6px;">
                            <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color};"></span>
                            <span style="color:var(--text);">${cat}</span>
                          </div>
                          <span style="font-family:var(--font-m); font-weight:600; color:var(--teal);">${_fmtINR(d.actual)} (${pct}%)</span>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `}
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
          <div style="background:var(--surface-card); border:1px solid var(--border); border-radius:14px; padding:16px; margin-top:20px;">
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
    // 7. TAB 5: GROUP BILL SPLIT, COMPANIONS & SETTLEMENTS
    // ─────────────────────────────────────────────────────────────
    renderSplitTab: function (trip, container) {
      const persons = trip.persons || [];
      const payments = window.LM_TripService.calculateSettlements(trip.id);
      const settlements = trip.settlements || [];

      container.innerHTML = `
        <div style="margin-bottom:24px;">
          <!-- HEADER & ACTIONS BAR -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
            <div>
              <h3 style="font-size:17px; font-weight:700; color:var(--text); margin:0; display:flex; align-items:center; gap:8px;">
                <span>👥</span> Travel Companions &amp; Bill Splitting
                <span style="font-size:12px; font-weight:600; background:rgba(0,240,255,0.1); color:var(--teal); padding:2px 8px; border-radius:12px;">${persons.length} Travelers</span>
              </h3>
              <p style="font-size:12.5px; color:var(--text-3); margin:3px 0 0;">
                Manage travelers, individual balances, WhatsApp reminders &amp; cyclic debt simplification
              </p>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <button class="tp-btn-primary" onclick="window.LM_TripUI.openAddFriendModal('${trip.id}')" title="Add a new friend or companion to this trip">
                <span>＋</span> Add Friend
              </button>
              <button class="tp-btn-secondary" onclick="window.LM_TripUI.openWhatsAppShareModal('${trip.id}')" title="Share settlement breakdown on WhatsApp">
                <span>💬</span> WhatsApp Audit
              </button>
              <button class="tp-btn-secondary" onclick="window.LM_TripUI.markAllSettled('${trip.id}')" title="Mark all debts settled">
                <span>✅</span> Mark All Settled
              </button>
            </div>
          </div>

          <!-- COMPANIONS DIRECTORY GRID -->
          <div style="margin-bottom:28px;">
            <div style="font-size:13px; font-weight:700; color:var(--text-2); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">
              Traveler Directory &amp; Personal Balances
            </div>

            ${persons.length === 0 ? `
              <div style="text-align:center; padding:32px; background:var(--surface-card); border:1px dashed var(--border); border-radius:12px;">
                <div style="font-size:32px; margin-bottom:8px;">👥</div>
                <div style="font-size:14px; font-weight:600; color:var(--text);">No companions added yet</div>
                <div style="font-size:12px; color:var(--text-3); margin-top:4px;">Add your travel buddies with their WhatsApp phone &amp; UPI ID for 1-click settlement reminders.</div>
                <button class="tp-btn-primary" style="margin-top:12px;" onclick="window.LM_TripUI.openAddFriendModal('${trip.id}')">＋ Add First Friend</button>
              </div>
            ` : `
              <div class="tp-friends-grid">
                ${persons.map(p => {
                  const pf = window.LM_TripService.getPersonFinancials(trip.id, p.id);
                  const isMainUser = p.isMainUser || p.id === 'p_me' || p.id === 'user_self';
                  
                  let balanceBadge = '';
                  if (pf.isOwed) {
                    balanceBadge = `<span class="tp-balance-pill gets-back" title="Gets back from group">+${_fmtINR(pf.netBalance)} (Gets back)</span>`;
                  } else if (pf.owes) {
                    balanceBadge = `<span class="tp-balance-pill owes-group" title="Owes the group">-${_fmtINR(Math.abs(pf.netBalance))} (Owes group)</span>`;
                  } else {
                    balanceBadge = `<span class="tp-balance-pill settled" title="Even / Settled">₹0 (Settled)</span>`;
                  }

                  return `
                    <div class="tp-friend-card">
                      <div class="tp-friend-top">
                        <div class="tp-friend-info">
                          <div class="tp-friend-avatar">${_esc(p.avatarEmoji || '👤')}</div>
                          <div>
                            <div class="tp-friend-name">
                              ${_esc(p.name)}
                              ${isMainUser ? `<span class="tp-me-tag">You</span>` : ''}
                            </div>
                            <div class="tp-friend-contact-row">
                              ${p.phone ? `<span class="tp-contact-chip">📱 ${_esc(p.phone)}</span>` : ''}
                              ${p.upiId ? `<span class="tp-contact-chip tp-upi-chip">⚡ ${_esc(p.upiId)}</span>` : ''}
                              ${(p.defaultShare && p.defaultShare !== 1) ? `<span class="tp-contact-chip">⚖️ ${p.defaultShare}x share</span>` : ''}
                            </div>
                          </div>
                        </div>
                        <div class="tp-friend-card-actions">
                          <button class="tp-icon-btn" title="Edit companion info" onclick="window.LM_TripUI.openAddFriendModal('${trip.id}', '${p.id}')">✏️</button>
                          ${!isMainUser ? `
                            <button class="tp-icon-btn" title="Remove companion" onclick="window.LM_TripUI.deleteFriend('${trip.id}', '${p.id}')" style="color:var(--rose);">🗑️</button>
                          ` : ''}
                        </div>
                      </div>

                      <div class="tp-friend-financials">
                        <div class="tp-friend-fin-col">
                          <span class="tp-fin-label">Paid</span>
                          <span class="tp-fin-val" style="color:var(--emerald);">${_fmtINR(pf.paidTotal)}</span>
                        </div>
                        <div class="tp-friend-fin-col">
                          <span class="tp-fin-label">Share</span>
                          <span class="tp-fin-val" style="color:var(--text);">${_fmtINR(pf.shareTotal)}</span>
                        </div>
                        <div class="tp-friend-fin-col tp-friend-net-col">
                          <span class="tp-fin-label">Net Balance</span>
                          ${balanceBadge}
                        </div>
                      </div>

                      <div class="tp-friend-footer">
                        <button class="tp-btn-wa-remind" onclick="window.LM_TripUI.sendFriendSettlementWhatsApp('${trip.id}', '${p.id}')" title="Send personalized WhatsApp balance summary & UPI link">
                          <span>💬</span> WhatsApp Reminder
                        </button>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>

          <!-- OPTIMIZED DEBT SETTLEMENTS (MINIMUM CASH FLOW) -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
              <div>
                <h4 style="font-size:14px; font-weight:700; color:var(--text); margin:0;">⚡ Optimized Debt Settlements</h4>
                <p style="font-size:11.5px; color:var(--text-3); margin:2px 0 0;">Minimum cash flow transfers that settle everyone's balances with fewest transactions</p>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:12px;">
              ${payments.length === 0 ? `
                <div style="grid-column:1/-1; text-align:center; padding:32px; background:var(--surface-card); border-radius:12px; color:var(--text-3); font-size:13px;">
                  🎉 All balances are settled or no shared expenses logged yet!
                </div>
              ` : payments.map(p => {
                const existing = settlements.find(s => s.from === p.from && s.to === p.to);
                const isSettled = existing && existing.status === 'collected';
                const upiUrl = window.LM_TripService.getUpiIntentUrl(trip.id, p.to, p.amount);

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
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                      ${isSettled ? `
                        <span style="font-size:11.5px; font-weight:700; color:var(--emerald);">✅ Confirmed Settled</span>
                      ` : `
                        <div style="display:flex; align-items:center; gap:6px;">
                          <a href="${upiUrl}" class="tp-btn-primary" style="padding:4px 10px; font-size:11px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                            ⚡ Pay UPI
                          </a>
                          <button type="button" class="tp-btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="window.LM_TripUI.openUpiQrModal('${_esc(p.fromName)}', '${_esc(p.toName)}', ${p.amount}, '${_esc(trip.name)}')">
                            📱 QR
                          </button>
                        </div>
                        <button class="tp-btn-secondary" style="padding:4px 10px; font-size:11px;" onclick="window.LM_TripUI.confirmSettlement('${trip.id}', '${p.from}', '${p.to}', ${p.amount})">
                          Mark Paid
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    },

    // ─────────────────────────────────────────────────────────────
    // 7.1 TRAVEL COMPANION (FRIEND) MANAGEMENT
    // ─────────────────────────────────────────────────────────────
    openAddFriendModal: function (tripId, existingPersonId = null, refreshExpensePrefix = null) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      const existing = existingPersonId ? (trip.persons || []).find(p => p.id === existingPersonId) : null;
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_friendModalOverlay';
      modal.style.zIndex = '100000';

      modal.innerHTML = `
        <div class="modal" style="max-width:440px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">${existing ? '✏️ Edit Travel Companion' : '👥 Add Travel Companion'}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <div class="grid-2" style="display:grid; grid-template-columns:3fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Friend Name *</label>
                <input id="tp_friend_name" placeholder="e.g. Rahul Sharma" value="${_esc(existing?.name || '')}" class="form-input w-full" autofocus />
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Avatar</label>
                <input id="tp_friend_emoji" placeholder="👤" value="${_esc(existing?.avatarEmoji || '👤')}" class="form-input w-full text-center" />
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">WhatsApp Phone Number</label>
              <input id="tp_friend_phone" placeholder="e.g. +91 98765 43210" value="${_esc(existing?.phone || '')}" class="form-input w-full" />
              <div style="font-size:11px; color:var(--text-3); margin-top:2px;">Used for 1-click WhatsApp balance reminders</div>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">UPI ID / VPA (Optional)</label>
              <input id="tp_friend_upi" placeholder="e.g. rahul@oksbi" value="${_esc(existing?.upiId || '')}" class="form-input w-full" />
              <div style="font-size:11px; color:var(--text-3); margin-top:2px;">Enables 1-tap "Pay UPI" direct payment deep-links</div>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Default Share Weight (Ratio)</label>
              <input type="number" step="0.1" id="tp_friend_share" placeholder="1.0" value="${existing?.defaultShare || 1}" class="form-input w-full" />
              <div style="font-size:11px; color:var(--text-3); margin-top:2px;">e.g. 1.0 for normal share, 0.5 for child or half share</div>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI.saveFriend('${trip.id}', ${existingPersonId ? `'${existingPersonId}'` : 'null'}, ${refreshExpensePrefix ? `'${refreshExpensePrefix}'` : 'null'})">
                ${existing ? 'Save Changes' : 'Add Companion'}
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    saveFriend: async function (tripId, existingPersonId = null, refreshExpensePrefix = null) {
      const name = (document.getElementById('tp_friend_name')?.value || '').trim();
      const avatarEmoji = (document.getElementById('tp_friend_emoji')?.value || '👤').trim();
      const phone = (document.getElementById('tp_friend_phone')?.value || '').trim();
      const upiId = (document.getElementById('tp_friend_upi')?.value || '').trim();
      const defaultShare = Number(document.getElementById('tp_friend_share')?.value) || 1;

      if (!name) {
        alert('Please enter a friend name');
        return;
      }

      if (existingPersonId) {
        await window.LM_TripService.updatePerson(tripId, existingPersonId, {
          name, avatarEmoji, phone, upiId, defaultShare
        });
        if (typeof showToast === 'function') showToast(`Updated ${name}!`, 'success');
      } else {
        await window.LM_TripService.addPerson(tripId, {
          name, avatarEmoji, phone, upiId, defaultShare
        });
        if (typeof showToast === 'function') showToast(`Added ${name} to travelers! 🎉`, 'success');
      }

      document.getElementById('tp_friendModalOverlay')?.remove();

      if (refreshExpensePrefix) {
        this._refreshExpenseModalMembers(tripId, refreshExpensePrefix);
      } else {
        this.renderTripWorkspace(tripId);
      }
    },

    deleteFriend: async function (tripId, personId) {
      const trip = window.LM_TripService.getTrip(tripId);
      const person = (trip?.persons || []).find(p => p.id === personId);
      if (!confirm(`Remove "${person?.name || 'companion'}" from this trip?`)) return;

      try {
        await window.LM_TripService.deletePerson(tripId, personId);
        if (typeof showToast === 'function') showToast('Companion removed.', 'info');
        this.renderTripWorkspace(tripId);
      } catch (err) {
        alert(err.message || 'Could not delete companion.');
      }
    },

    sendFriendSettlementWhatsApp: function (tripId, personId) {
      const msg = window.LM_TripService.generatePersonSettlementWhatsAppMessage(tripId, personId);
      if (!msg) {
        alert('Could not generate settlement reminder.');
        return;
      }
      const trip = window.LM_TripService.getTrip(tripId);
      const person = (trip?.persons || []).find(p => p.id === personId);
      const cleanPhone = (person?.phone || '').replace(/[^0-9]/g, '');

      let waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      if (cleanPhone) {
        waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
      }
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    },

    _refreshExpenseModalMembers: function (tripId, prefix) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      // Refresh "Paid By" select dropdown
      const paidBySelect = document.getElementById(`${prefix}_paidby`);
      if (paidBySelect) {
        const curVal = paidBySelect.value;
        paidBySelect.innerHTML = (trip.persons || []).map(p => `
          <option value="${p.id}" ${p.id === curVal ? 'selected' : ''}>${_esc(p.name)}</option>
        `).join('');
      }

      // Refresh split members checkboxes container
      const container = document.getElementById(`${prefix}_split_members_container`);
      if (container) {
        // preserve checked states of existing members
        const checkedMap = {};
        container.querySelectorAll('.tp-split-member-check').forEach(chk => {
          checkedMap[chk.value] = chk.checked;
        });
        const customValues = {};
        container.querySelectorAll('.tp-split-custom-input').forEach(inp => {
          customValues[inp.dataset.person] = inp.value;
        });

        const mode = document.getElementById(`${prefix}_split_mode`)?.value || 'equal';

        container.innerHTML = (trip.persons || []).map(p => {
          const isChecked = checkedMap[p.id] !== undefined ? checkedMap[p.id] : true;
          const customVal = customValues[p.id] || '';
          return `
            <div class="tp-split-member-row" style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px;">
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                <input type="checkbox" class="tp-split-member-check" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="window.LM_TripUI._updateSplitBreakdown('${prefix}')" />
                <span>${_esc(p.name)}</span>
              </label>
              <div class="tp-split-input-wrap" style="${(mode === 'exact' || mode === 'shares') ? 'block' : 'none'};">
                <input type="number" class="tp-split-custom-input form-input" data-person="${p.id}" value="${customVal}" placeholder="0" style="width:85px; padding:3px 6px; font-size:12px; text-align:right;" oninput="window.LM_TripUI._updateSplitBreakdown('${prefix}')" />
              </div>
              <span class="tp-split-computed-val text-xs text-muted font-mono">₹0</span>
            </div>
          `;
        }).join('');

        this._updateSplitBreakdown(prefix);
      }
    },

    // ─────────────────────────────────────────────────────────────
    // 8. INTERACTIVE MODALS & CRUD FORMS
    // ─────────────────────────────────────────────────────────────
    openAddTripModal: function (existingTripId = null) {
      const existing = existingTripId ? window.LM_TripService.getTrip(existingTripId) : null;
      const vehicles = (window.LM_VehicleService && typeof window.LM_VehicleService.getVehicles === 'function') ? (window.LM_VehicleService.getVehicles() || []) : [];
      const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'THB', 'SGD', 'JPY', 'IDR', 'CAD', 'AUD'];

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_tripModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:520px; width:92vw;">
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

            <!-- CURRENCY & FX RATES -->
            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Trip Currency</label>
                <select id="tp_form_currency" class="form-input w-full" onchange="window.LM_TripUI._onCurrencyChange()">
                  ${currencies.map(c => `
                    <option value="${c}" ${(existing?.currency || 'INR') === c ? 'selected' : ''}>
                      ${c} (${window.LM_TripService.CURRENCY_SYMBOLS[c] || ''})
                    </option>
                  `).join('')}
                </select>
              </div>
              <div id="tp_form_fx_wrap" style="${(existing?.currency && existing.currency !== 'INR') ? '' : 'display:none;'}">
                <label class="text-xs font-semibold text-muted">FX Rate (₹ per 1 unit)</label>
                <input type="number" step="0.01" id="tp_form_fx" value="${existing?.exchangeRate || 1}" class="form-input w-full" />
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

            <!-- VEHICLE FLEET SYNC -->
            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Linked Vehicle (Optional)</label>
                <select id="tp_form_vehicle" class="form-input w-full">
                  <option value="">None / Public Transport</option>
                  ${vehicles.map(v => `<option value="${v.id}" ${existing?.vehicleId === v.id ? 'selected' : ''}>${_esc(v.name || 'Vehicle')} (${_esc(v.regNumber || '')})</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">Start Odometer (km)</label>
                <input type="number" id="tp_form_odo" placeholder="e.g. 45200" value="${existing?.startOdometer || ''}" class="form-input w-full" />
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

    _onCurrencyChange: function () {
      const curr = document.getElementById('tp_form_currency')?.value || 'INR';
      const wrap = document.getElementById('tp_form_fx_wrap');
      const fxInp = document.getElementById('tp_form_fx');
      if (wrap) {
        wrap.style.display = (curr !== 'INR') ? 'block' : 'none';
      }
      if (fxInp && curr !== 'INR' && window.LM_TripService.DEFAULT_FX_RATES) {
        fxInp.value = window.LM_TripService.DEFAULT_FX_RATES[curr] || 1;
      }
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

      const currency = document.getElementById('tp_form_currency')?.value || 'INR';
      const exchangeRate = Number(document.getElementById('tp_form_fx')?.value) || 1;
      const vehicleId = document.getElementById('tp_form_vehicle')?.value || null;
      const startOdometer = document.getElementById('tp_form_odo')?.value ? Number(document.getElementById('tp_form_odo').value) : null;

      const personInputs = Array.from(document.querySelectorAll('.tp-person-input'));
      const persons = personInputs
        .map((inp, idx) => ({ id: inp.dataset.id || `p_${idx + 1}`, name: inp.value.trim() }))
        .filter(p => p.name);

      if (!persons.length) persons.push({ id: 'p1', name: 'You' });

      try {
        if (existingId) {
          await window.LM_TripService.updateTrip(existingId, {
            name, destination: dest, coverEmoji: emoji, startDate: start, endDate: end,
            travelMode: mode, status, budgetCap: budget, notes, persons,
            currency, exchangeRate, vehicleId, startOdometer
          });
          this.openTrip(existingId);
        } else {
          const newTrip = await window.LM_TripService.createTrip({
            name, destination: dest, coverEmoji: emoji, startDate: start, endDate: end,
            travelMode: mode, status, budgetCap: budget, notes, persons,
            currency, exchangeRate, vehicleId, startOdometer
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
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label class="text-xs font-semibold text-muted">Google Maps Link (Optional)</label>
                <button type="button" class="tp-btn-secondary" style="font-size:10.5px; padding:2px 8px; color:var(--teal);" onclick="window.LM_TripUI.searchMapsHelper('tp_wish_loc', 'tp_wish_title')" title="Search place on Google Maps">🔍 Find on Maps ↗</button>
              </div>
              <input id="tp_wish_map_url" placeholder="https://maps.app.goo.gl/... or paste Maps pin URL" value="${_esc(existing?.mapUrl || '')}" class="form-input w-full" />
              <div style="font-size:10.5px; color:var(--text-3); margin-top:2px;">Allows 1-click pin navigation to this spot</div>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Inspiration Link (Reel / YouTube / Blog)</label>
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
      let location = document.getElementById('tp_wish_loc')?.value.trim() || '';
      let mapUrl = document.getElementById('tp_wish_map_url')?.value.trim() || '';
      let sourceUrl = document.getElementById('tp_wish_url')?.value.trim() || '';
      const estimatedCost = Number(document.getElementById('tp_wish_cost')?.value) || 0;
      const notes = document.getElementById('tp_wish_notes')?.value.trim() || '';

      // Auto-detect if user pasted Maps URL into location
      if (/^https?:\/\//i.test(location) && !mapUrl) {
        mapUrl = location;
        location = title;
      }
      // If sourceUrl is a Google Maps link and mapUrl is empty, also set mapUrl
      if (!mapUrl && sourceUrl && (sourceUrl.includes('google.com/maps') || sourceUrl.includes('maps.app.goo.gl') || sourceUrl.includes('goo.gl/maps'))) {
        mapUrl = sourceUrl;
      }

      if (wishId) {
        await window.LM_TripService.updateWishlistItem(tripId, wishId, {
          title, category, priority, location, mapUrl, sourceUrl, estimatedCost, notes
        });
      } else {
        await window.LM_TripService.addWishlistItem(tripId, {
          title, category, priority, location, mapUrl, sourceUrl, estimatedCost, notes
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
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <label class="text-xs font-semibold text-muted">Google Maps Link / URL (Optional)</label>
                <button type="button" class="tp-btn-secondary" style="font-size:10.5px; padding:2px 8px; color:var(--teal);" onclick="window.LM_TripUI.searchMapsHelper('tp_plan_loc', 'tp_plan_title')" title="Search place on Google Maps">🔍 Find on Maps ↗</button>
              </div>
              <input id="tp_plan_map_url" placeholder="https://maps.app.goo.gl/... or paste Maps URL" value="${_esc(existing?.mapUrl || '')}" class="form-input w-full" />
              <div style="font-size:10.5px; color:var(--text-3); margin-top:2px;">Paste Maps link for 1-click pin navigation</div>
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
      let location = document.getElementById('tp_plan_loc')?.value.trim() || '';
      let mapUrl = document.getElementById('tp_plan_map_url')?.value.trim() || '';
      const bookingRef = document.getElementById('tp_plan_ref')?.value.trim() || '';
      const notes = document.getElementById('tp_plan_notes')?.value.trim() || '';

      // Auto-detect if user accidentally pasted URL into location input
      if (/^https?:\/\//i.test(location) && !mapUrl) {
        mapUrl = location;
        location = title;
      }

      if (planId) {
        await window.LM_TripService.updatePlanItem(tripId, planId, {
          title, dayNumber, timeSlot, category, status, time, estimatedCost, location, mapUrl, bookingRef, notes
        });
      } else {
        await window.LM_TripService.addPlanItem(tripId, {
          title, dayNumber, timeSlot, category, status, time, estimatedCost, location, mapUrl, bookingRef, notes
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
    // 10. PLAN EXPENSE MODAL (DUAL CURRENCY & RECEIPT SCAN)
    // ─────────────────────────────────────────────────────────────
    openPlanExpenseModal: function (tripId, planId, existingExpId = null) {
      const trip = window.LM_TripService.getTrip(tripId);
      const plan = (trip?.plans || []).find(p => p.id === planId);
      if (!trip || !plan) return;

      const pf = window.LM_TripService.getPlanFinancials(plan);
      const defaultAmount = pf.actualTotal === 0 && pf.estimatedCost > 0 ? pf.estimatedCost : '';
      const isForeign = trip.currency && trip.currency !== 'INR';
      const fxRate = trip.exchangeRate || 1;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_planExpModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:480px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">⚡ Log Expense for Plan</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <p style="font-size:12.5px; color:var(--text-2); margin-bottom:10px;">
              Plan: <strong style="color:var(--text);">${_esc(plan.title)}</strong> (Estimated: ${_fmtINR(pf.estimatedCost)})
            </p>

            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label class="text-xs font-semibold text-muted">Expense Description *</label>
              <button type="button" class="tp-btn-secondary" style="font-size:11px; padding:2px 8px; color:var(--teal);" onclick="window.LM_TripUI.triggerReceiptScan('tp_pexp_title', 'tp_pexp_amount', 'tp_pexp_receipt_preview', 'tp_pexp_receipt_url')">
                📷 Scan Bill / Receipt
              </button>
            </div>
            <input id="tp_pexp_title" placeholder="e.g. Scuba Advance Deposit" value="${_esc(plan.title)}" class="form-input w-full" />
            <input type="file" id="tp_receipt_hidden_file" accept="image/*" style="display:none;" onchange="window.LM_TripUI._handleReceiptFile(event, 'tp_pexp_title', 'tp_pexp_amount', 'tp_pexp_receipt_preview', 'tp_pexp_receipt_url')" />
            <input type="hidden" id="tp_pexp_receipt_url" value="" />
            <div id="tp_pexp_receipt_preview" style="display:none;"></div>

            <!-- DUAL CURRENCY FIELDS IF FOREIGN -->
            ${isForeign ? `
              <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                  <label class="text-xs font-semibold text-muted">Amount in ${trip.currency} (${window.LM_TripService.CURRENCY_SYMBOLS[trip.currency] || ''})</label>
                  <input type="number" step="0.01" id="tp_pexp_local_amt" placeholder="e.g. 50" class="form-input w-full" oninput="document.getElementById('tp_pexp_amount').value = Math.round(Number(this.value) * ${fxRate})" />
                </div>
                <div>
                  <label class="text-xs font-semibold text-muted">Amount in INR (₹) *</label>
                  <input type="number" id="tp_pexp_amount" placeholder="e.g. 4300" value="${defaultAmount}" class="form-input w-full" />
                </div>
              </div>
            ` : `
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
            `}

            ${isForeign ? `
              <div>
                <label class="text-xs font-semibold text-muted">Date</label>
                <input type="date" id="tp_pexp_date" value="${new Date().toISOString().split('T')[0]}" class="form-input w-full" />
              </div>
            ` : ''}

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label class="text-xs font-semibold text-muted">Paid By</label>
                  <button type="button" style="font-size:10.5px; color:var(--teal); background:none; border:none; cursor:pointer; padding:0;" onclick="window.LM_TripUI.openAddFriendModal('${trip.id}', null, 'tp_pexp')">＋ Add Friend</button>
                </div>
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

            <!-- SPLIT OPTIONS & CUSTOM SHARES -->
            <div class="tp-split-section" style="background:rgba(255, 255, 255, 0.03); border:1px solid rgba(255, 255, 255, 0.08); border-radius:10px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <label class="text-xs font-semibold text-muted" style="margin:0;">Split Between Travelers</label>
                  <button type="button" style="font-size:10.5px; color:var(--teal); background:none; border:none; cursor:pointer; padding:0;" onclick="window.LM_TripUI.openAddFriendModal('${trip.id}', null, 'tp_pexp')">＋ Add Friend</button>
                </div>
                <div class="tp-split-mode-pills" style="display:flex; gap:4px;">
                  <button type="button" class="tp-split-mode-btn active" data-mode="equal" onclick="window.LM_TripUI._setSplitMode(this, 'equal', 'tp_pexp')">Equal</button>
                  <button type="button" class="tp-split-mode-btn" data-mode="exact" onclick="window.LM_TripUI._setSplitMode(this, 'exact', 'tp_pexp')">Exact (₹)</button>
                  <button type="button" class="tp-split-mode-btn" data-mode="shares" onclick="window.LM_TripUI._setSplitMode(this, 'shares', 'tp_pexp')">Shares</button>
                </div>
              </div>
              <input type="hidden" id="tp_pexp_split_mode" value="equal" />
              <div id="tp_pexp_split_members_container" class="space-y-2">
                ${(trip.persons || []).map(p => `
                  <div class="tp-split-member-row" style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px;">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" class="tp-split-member-check" value="${p.id}" checked onchange="window.LM_TripUI._updateSplitBreakdown('tp_pexp')" />
                      <span>${_esc(p.name)}</span>
                    </label>
                    <div class="tp-split-input-wrap" style="display:none;">
                      <input type="number" class="tp-split-custom-input form-input" data-person="${p.id}" placeholder="0" style="width:85px; padding:3px 6px; font-size:12px; text-align:right;" oninput="window.LM_TripUI._updateSplitBreakdown('tp_pexp')" />
                    </div>
                    <span class="tp-split-computed-val text-xs text-muted font-mono">₹0</span>
                  </div>
                `).join('')}
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

            <!-- Vehicle Fuel Sync Option -->
            ${trip.vehicleId ? `
              <div style="background:rgba(234, 179, 8, 0.08); border:1px solid rgba(234, 179, 8, 0.2); border-radius:10px; padding:10px 12px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:600; color:var(--text);">
                  <input type="checkbox" id="tp_pexp_sync_fuel" ${plan.category === 'Transit' ? 'checked' : ''} />
                  <span>🚗 Auto-Sync to Linked Vehicle Fuel Log</span>
                </label>
              </div>
            ` : ''}

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._savePlanExpense('${trip.id}', '${plan.id}')">Save Expense</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => {
        modal.classList.add('show');
        this._updateSplitBreakdown('tp_pexp');
      }, 10);
    },

    _savePlanExpense: async function (tripId, planId) {
      const title = document.getElementById('tp_pexp_title')?.value.trim();
      const amount = Number(document.getElementById('tp_pexp_amount')?.value);
      if (!title || !amount || amount <= 0) {
        alert('Please enter a valid description and positive amount');
        return;
      }

      const trip = window.LM_TripService.getTrip(tripId);
      const date = document.getElementById('tp_pexp_date')?.value;
      const paidBy = document.getElementById('tp_pexp_paidby')?.value;
      const paymentMethod = document.getElementById('tp_pexp_method')?.value;
      const linkToCentralLedger = Boolean(document.getElementById('tp_pexp_link')?.checked);
      const syncFuel = Boolean(document.getElementById('tp_pexp_sync_fuel')?.checked);
      const receiptUrl = document.getElementById('tp_pexp_receipt_url')?.value || null;
      const localAmount = Number(document.getElementById('tp_pexp_local_amt')?.value) || amount;

      const splitType = document.getElementById('tp_pexp_split_mode')?.value || 'equal';
      let sharedWith = [];
      let splitDetails = null;

      if (splitType === 'exact') {
        splitDetails = {};
        let sumExact = 0;
        document.querySelectorAll('#tp_pexp_split_members_container .tp-split-custom-input').forEach(inp => {
          const pid = inp.dataset.person;
          const val = Number(inp.value) || 0;
          splitDetails[pid] = val;
          if (val > 0) sharedWith.push(pid);
          sumExact += val;
        });
        if (Math.abs(sumExact - amount) > 1) {
          alert(`The sum of exact shares (₹${sumExact}) must match total amount (₹${amount})!`);
          return;
        }
      } else if (splitType === 'shares') {
        splitDetails = {};
        document.querySelectorAll('#tp_pexp_split_members_container .tp-split-custom-input').forEach(inp => {
          const pid = inp.dataset.person;
          const s = Number(inp.value) || 0;
          splitDetails[pid] = s;
          if (s > 0) sharedWith.push(pid);
        });
        if (!sharedWith.length) {
          alert('Please allocate shares to at least one traveler');
          return;
        }
      } else {
        document.querySelectorAll('#tp_pexp_split_members_container .tp-split-member-check:checked').forEach(chk => {
          sharedWith.push(chk.value);
        });
        if (!sharedWith.length) sharedWith = (trip?.persons || []).map(p => p.id);
      }

      await window.LM_TripService.addPlanExpense(tripId, planId, {
        title,
        amount,
        date,
        paidBy,
        paymentMethod,
        currency: trip?.currency || 'INR',
        localAmount,
        exchangeRate: trip?.exchangeRate || 1,
        receiptUrl,
        sharedWith,
        splitType,
        splitDetails
      }, { linkToCentralLedger, syncFuelToVehicle: syncFuel });

      document.getElementById('tp_planExpModalOverlay')?.remove();
      this.renderTripWorkspace(tripId);
    },

    deletePlanExpense: async function (tripId, planId, expId) {
      if (!confirm('Delete this expense?')) return;
      await window.LM_TripService.deletePlanExpense(tripId, planId, expId, true);
      this.renderTripWorkspace(tripId);
    },

    // ─────────────────────────────────────────────────────────────
    // 11. GENERAL EXPENSE MODAL (WITH SCAN & DUAL CURRENCY)
    // ─────────────────────────────────────────────────────────────
    openGeneralExpenseModal: function (tripId) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      const isForeign = trip.currency && trip.currency !== 'INR';
      const fxRate = trip.exchangeRate || 1;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_genExpModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:480px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">＋ Add General Trip Expense</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <label class="text-xs font-semibold text-muted">Description *</label>
              <button type="button" class="tp-btn-secondary" style="font-size:11px; padding:2px 8px; color:var(--teal);" onclick="window.LM_TripUI.triggerReceiptScan('tp_gexp_title', 'tp_gexp_amount', 'tp_gexp_receipt_preview', 'tp_gexp_receipt_url')">
                📷 Scan Bill / Receipt
              </button>
            </div>
            <input id="tp_gexp_title" placeholder="e.g. Highway Toll / Group Snacks" class="form-input w-full" />
            <input type="file" id="tp_receipt_hidden_file" accept="image/*" style="display:none;" onchange="window.LM_TripUI._handleReceiptFile(event, 'tp_gexp_title', 'tp_gexp_amount', 'tp_gexp_receipt_preview', 'tp_gexp_receipt_url')" />
            <input type="hidden" id="tp_gexp_receipt_url" value="" />
            <div id="tp_gexp_receipt_preview" style="display:none;"></div>

            ${isForeign ? `
              <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div>
                  <label class="text-xs font-semibold text-muted">Amount in ${trip.currency} (${window.LM_TripService.CURRENCY_SYMBOLS[trip.currency] || ''})</label>
                  <input type="number" step="0.01" id="tp_gexp_local_amt" placeholder="e.g. 20" class="form-input w-full" oninput="document.getElementById('tp_gexp_amount').value = Math.round(Number(this.value) * ${fxRate})" />
                </div>
                <div>
                  <label class="text-xs font-semibold text-muted">Amount in INR (₹) *</label>
                  <input type="number" id="tp_gexp_amount" placeholder="e.g. 1720" class="form-input w-full" />
                </div>
              </div>
            ` : `
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
            `}

            ${isForeign ? `
              <div>
                <label class="text-xs font-semibold text-muted">Category</label>
                <select id="tp_gexp_cat" class="form-input w-full">
                  <option value="Transit">🚗 Toll / Fuel / Transit</option>
                  <option value="Food">🍽️ Snacks / Food</option>
                  <option value="Shopping">🛍️ Shopping</option>
                  <option value="General">📌 General / Misc</option>
                </select>
              </div>
            ` : ''}

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label class="text-xs font-semibold text-muted">Paid By</label>
                  <button type="button" style="font-size:10.5px; color:var(--teal); background:none; border:none; cursor:pointer; padding:0;" onclick="window.LM_TripUI.openAddFriendModal('${trip.id}', null, 'tp_gexp')">＋ Add Friend</button>
                </div>
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

            <!-- SPLIT OPTIONS & CUSTOM SHARES -->
            <div class="tp-split-section" style="background:rgba(255, 255, 255, 0.03); border:1px solid rgba(255, 255, 255, 0.08); border-radius:10px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <label class="text-xs font-semibold text-muted" style="margin:0;">Split Between Travelers</label>
                  <button type="button" style="font-size:10.5px; color:var(--teal); background:none; border:none; cursor:pointer; padding:0;" onclick="window.LM_TripUI.openAddFriendModal('${trip.id}', null, 'tp_gexp')">＋ Add Friend</button>
                </div>
                <div class="tp-split-mode-pills" style="display:flex; gap:4px;">
                  <button type="button" class="tp-split-mode-btn active" data-mode="equal" onclick="window.LM_TripUI._setSplitMode(this, 'equal', 'tp_gexp')">Equal</button>
                  <button type="button" class="tp-split-mode-btn" data-mode="exact" onclick="window.LM_TripUI._setSplitMode(this, 'exact', 'tp_gexp')">Exact (₹)</button>
                  <button type="button" class="tp-split-mode-btn" data-mode="shares" onclick="window.LM_TripUI._setSplitMode(this, 'shares', 'tp_gexp')">Shares</button>
                </div>
              </div>
              <input type="hidden" id="tp_gexp_split_mode" value="equal" />
              <div id="tp_gexp_split_members_container" class="space-y-2">
                ${(trip.persons || []).map(p => `
                  <div class="tp-split-member-row" style="display:flex; justify-content:space-between; align-items:center; font-size:12.5px;">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                      <input type="checkbox" class="tp-split-member-check" value="${p.id}" checked onchange="window.LM_TripUI._updateSplitBreakdown('tp_gexp')" />
                      <span>${_esc(p.name)}</span>
                    </label>
                    <div class="tp-split-input-wrap" style="display:none;">
                      <input type="number" class="tp-split-custom-input form-input" data-person="${p.id}" placeholder="0" style="width:85px; padding:3px 6px; font-size:12px; text-align:right;" oninput="window.LM_TripUI._updateSplitBreakdown('tp_gexp')" />
                    </div>
                    <span class="tp-split-computed-val text-xs text-muted font-mono">₹0</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <div style="background:rgba(0, 240, 255, 0.05); border:1px solid rgba(0, 240, 255, 0.2); border-radius:10px; padding:10px 12px;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:600; color:var(--text);">
                <input type="checkbox" id="tp_gexp_link" checked />
                <span>Record to LedgerMate Central Bank Account</span>
              </label>
            </div>

            ${trip.vehicleId ? `
              <div style="background:rgba(234, 179, 8, 0.08); border:1px solid rgba(234, 179, 8, 0.2); border-radius:10px; padding:10px 12px;">
                <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12.5px; font-weight:600; color:var(--text);">
                  <input type="checkbox" id="tp_gexp_sync_fuel" />
                  <span>🚗 Auto-Sync to Linked Vehicle Fuel Log</span>
                </label>
              </div>
            ` : ''}

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._saveGeneralExpense('${trip.id}')">Save Expense</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => {
        modal.classList.add('show');
        this._updateSplitBreakdown('tp_gexp');
      }, 10);
    },

    _saveGeneralExpense: async function (tripId) {
      const title = document.getElementById('tp_gexp_title')?.value.trim();
      const amount = Number(document.getElementById('tp_gexp_amount')?.value);
      if (!title || !amount || amount <= 0) {
        alert('Please enter a description and amount');
        return;
      }

      const trip = window.LM_TripService.getTrip(tripId);
      const category = document.getElementById('tp_gexp_cat')?.value || 'General';
      const paidBy = document.getElementById('tp_gexp_paidby')?.value;
      const paymentMethod = document.getElementById('tp_gexp_method')?.value;
      const linkToCentralLedger = Boolean(document.getElementById('tp_gexp_link')?.checked);
      const syncFuel = Boolean(document.getElementById('tp_gexp_sync_fuel')?.checked);
      const receiptUrl = document.getElementById('tp_gexp_receipt_url')?.value || null;
      const localAmount = Number(document.getElementById('tp_gexp_local_amt')?.value) || amount;

      const splitType = document.getElementById('tp_gexp_split_mode')?.value || 'equal';
      let sharedWith = [];
      let splitDetails = null;

      if (splitType === 'exact') {
        splitDetails = {};
        let sumExact = 0;
        document.querySelectorAll('#tp_gexp_split_members_container .tp-split-custom-input').forEach(inp => {
          const pid = inp.dataset.person;
          const val = Number(inp.value) || 0;
          splitDetails[pid] = val;
          if (val > 0) sharedWith.push(pid);
          sumExact += val;
        });
        if (Math.abs(sumExact - amount) > 1) {
          alert(`The sum of exact shares (₹${sumExact}) must match total amount (₹${amount})!`);
          return;
        }
      } else if (splitType === 'shares') {
        splitDetails = {};
        document.querySelectorAll('#tp_gexp_split_members_container .tp-split-custom-input').forEach(inp => {
          const pid = inp.dataset.person;
          const s = Number(inp.value) || 0;
          splitDetails[pid] = s;
          if (s > 0) sharedWith.push(pid);
        });
        if (!sharedWith.length) {
          alert('Please allocate shares to at least one traveler');
          return;
        }
      } else {
        document.querySelectorAll('#tp_gexp_split_members_container .tp-split-member-check:checked').forEach(chk => {
          sharedWith.push(chk.value);
        });
        if (!sharedWith.length) sharedWith = (trip?.persons || []).map(p => p.id);
      }

      await window.LM_TripService.addGeneralExpense(tripId, {
        title,
        amount,
        category,
        paidBy,
        paymentMethod,
        currency: trip?.currency || 'INR',
        localAmount,
        exchangeRate: trip?.exchangeRate || 1,
        receiptUrl,
        sharedWith,
        splitType,
        splitDetails
      }, { linkToCentralLedger, syncFuelToVehicle: syncFuel });

      document.getElementById('tp_genExpModalOverlay')?.remove();
      this.renderTripWorkspace(tripId);
    },

    deleteGeneralExpense: async function (tripId, expId) {
      if (!confirm('Delete this expense?')) return;
      await window.LM_TripService.deleteGeneralExpense(tripId, expId, true);
      this.renderTripWorkspace(tripId);
    },

    // ─────────────────────────────────────────────────────────────
    // 12. PACKING CHECKLIST HANDLERS
    // ─────────────────────────────────────────────────────────────
    applyPackingPreset: async function (tripId, presetKey) {
      try {
        const res = await window.LM_TripService.populatePackingPreset(tripId, presetKey);
        if (typeof showToast === 'function') {
          showToast(`🎒 Added ${res.addedCount} items to packing list!`, 'success');
        }
        this.renderTripWorkspace(tripId);
      } catch (err) {
        alert('Error applying preset: ' + err.message);
      }
    },

    addCustomPackItem: async function (tripId) {
      const itemInput = document.getElementById('tp_new_pack_item');
      const catInput = document.getElementById('tp_new_pack_cat');
      const item = itemInput?.value.trim();
      if (!item) return;
      const category = catInput?.value || 'general';
      await window.LM_TripService.addPackingItem(tripId, { item, category });
      if (itemInput) itemInput.value = '';
      this.renderTripWorkspace(tripId);
    },

    togglePackItem: async function (tripId, itemId) {
      await window.LM_TripService.togglePackingItem(tripId, itemId);
      this.renderTripWorkspace(tripId);
    },

    deletePackItem: async function (tripId, itemId) {
      await window.LM_TripService.deletePackingItem(tripId, itemId);
      this.renderTripWorkspace(tripId);
    },

    // ─────────────────────────────────────────────────────────────
    // 13. DIGITAL DOCUMENT LOCKER HANDLERS
    // ─────────────────────────────────────────────────────────────
    openAddDocModal: function (tripId, docId = null) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;
      const existing = docId ? (trip.documents || []).find(d => d.id === docId) : null;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_docModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:460px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">${existing ? '✏️ Edit Travel Document' : '🔒 Add Travel Document'}</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <div>
              <label class="text-xs font-semibold text-muted">Document / Booking Title *</label>
              <input id="tp_doc_title" placeholder="e.g. Flight to Goa (Air India) / Taj Hotel Voucher" value="${_esc(existing?.title || '')}" class="form-input w-full" />
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">Type</label>
                <select id="tp_doc_type" class="form-input w-full">
                  <option value="flight" ${existing?.type === 'flight' ? 'selected' : ''}>✈️ Flight Ticket / Boarding</option>
                  <option value="hotel" ${existing?.type === 'hotel' ? 'selected' : ''}>🏨 Hotel / Resort Voucher</option>
                  <option value="ticket" ${existing?.type === 'ticket' ? 'selected' : ''}>🎟️ Activity / Entry Pass</option>
                  <option value="visa" ${existing?.type === 'visa' ? 'selected' : ''}>🛂 Visa / Entry Permit</option>
                  <option value="insurance" ${existing?.type === 'insurance' ? 'selected' : ''}>🛡️ Travel Insurance</option>
                  <option value="rental" ${existing?.type === 'rental' ? 'selected' : ''}>🚗 Car / Scooter Rental</option>
                  <option value="contact" ${existing?.type === 'contact' ? 'selected' : ''}>📞 Emergency Contact</option>
                  <option value="other" ${existing?.type === 'other' || !existing ? 'selected' : ''}>📄 Other Document</option>
                </select>
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">PNR / Ref / Policy Code</label>
                <input id="tp_doc_code" placeholder="e.g. AI-9821, BKG-883" value="${_esc(existing?.refCode || '')}" class="form-input w-full" />
              </div>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Attachment Link / Web URL</label>
              <input id="tp_doc_url" placeholder="https://drive.google.com/... or reservation link" value="${_esc(existing?.attachmentUrl || '')}" class="form-input w-full" />
            </div>

            <div>
              <label class="text-xs font-semibold text-muted">Notes (Seat #, terminal, baggage allowance, emergency numbers)</label>
              <textarea id="tp_doc_notes" rows="2" placeholder="Terminal 2, Seat 14B, 15kg check-in..." class="form-input w-full">${_esc(existing?.notes || '')}</textarea>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._saveDocModal('${trip.id}', '${existing?.id || ''}')">Save Document</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    _saveDocModal: async function (tripId, docId) {
      const title = document.getElementById('tp_doc_title')?.value.trim();
      if (!title) { alert('Please enter a document title'); return; }

      const type = document.getElementById('tp_doc_type')?.value || 'other';
      const refCode = document.getElementById('tp_doc_code')?.value.trim() || '';
      const attachmentUrl = document.getElementById('tp_doc_url')?.value.trim() || null;
      const notes = document.getElementById('tp_doc_notes')?.value.trim() || '';

      if (docId) {
        await window.LM_TripService.updateDocument(tripId, docId, { title, type, refCode, attachmentUrl, notes });
      } else {
        await window.LM_TripService.addDocument(tripId, { title, type, refCode, attachmentUrl, notes });
      }

      document.getElementById('tp_docModalOverlay')?.remove();
      this.renderTripWorkspace(tripId);
    },

    deleteDoc: async function (tripId, docId) {
      if (!confirm('Remove this document from locker?')) return;
      await window.LM_TripService.deleteDocument(tripId, docId);
      this.renderTripWorkspace(tripId);
    },

    copyToClipboard: function (text) {
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (typeof showToast === 'function') showToast('📋 Copied to clipboard!', 'info');
        }).catch(() => {
          prompt('Copy reference code:', text);
        });
      } else {
        prompt('Copy reference code:', text);
      }
    },

    // ─────────────────────────────────────────────────────────────
    // 14. UPI QR & RECEIPT LIGHTBOX MODALS
    // ─────────────────────────────────────────────────────────────
    openUpiQrModal: function (fromName, toName, amount, tripName) {
      const vpa = 'settlement@upi';
      const upiUrl = `upi://pay?pa=${vpa}&pn=${encodeURIComponent(toName)}&am=${amount}&tn=${encodeURIComponent(tripName + ' split')}&cu=INR`;
      const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiUrl)}`;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_upiQrModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:360px; width:92vw; text-align:center;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-base">📱 UPI Settlement QR</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body" style="padding:20px 16px;">
            <div style="font-size:14px; font-weight:700; color:var(--text); margin-bottom:2px;">
              ${_esc(fromName)} ➔ ${_esc(toName)}
            </div>
            <div style="font-size:24px; font-weight:800; color:var(--teal); font-family:var(--font-m); margin-bottom:14px;">
              ${_fmtINR(amount)}
            </div>

            <div style="background:#ffffff; padding:12px; border-radius:12px; display:inline-block; margin-bottom:14px; box-shadow:0 4px 16px rgba(0,0,0,0.2);">
              <img src="${qrImgSrc}" alt="UPI QR Code" style="width:200px; height:200px; display:block;" onerror="this.alt='Unable to load QR image. Please use UPI link below.'" />
            </div>

            <p style="font-size:12px; color:var(--text-3); margin-bottom:14px;">
              Scan using any UPI App (GPay, PhonePe, Paytm, BHIM)
            </p>

            <div style="display:flex; justify-content:center; gap:8px;">
              <a href="${upiUrl}" class="tp-btn-primary" style="text-decoration:none; padding:8px 14px; font-size:12px;">⚡ Open UPI App</a>
              <button type="button" class="tp-btn-secondary" style="font-size:12px; padding:8px 12px;" onclick="window.LM_TripUI.copyToClipboard('${upiUrl}')">📋 Copy Link</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    triggerReceiptScan: function (titleInputId, amountInputId, previewId, receiptUrlInputId) {
      if (window.LM_ReceiptOCR && typeof window.LM_ReceiptOCR.openReceiptScannerModal === 'function') {
        window.LM_ReceiptOCR.openReceiptScannerModal((data) => {
          const titleEl = document.getElementById(titleInputId);
          const amtEl = document.getElementById(amountInputId);
          const previewEl = document.getElementById(previewId);
          const urlInpEl = document.getElementById(receiptUrlInputId);

          if (titleEl && data.merchant) titleEl.value = data.merchant;
          if (amtEl && data.amount > 0) amtEl.value = data.amount;
          if (data.receiptUrl || data.receiptId) {
            if (urlInpEl) urlInpEl.value = data.receiptUrl || data.receiptId;
            if (previewEl) {
              previewEl.style.display = 'block';
              previewEl.innerHTML = `<span style="font-size:11px; color:var(--emerald);">📎 Bill attached (${data.merchant || 'Receipt'})</span>`;
            }
          }
          if (typeof showToast === 'function') showToast('📷 Receipt scanned & applied!', 'success');
        });
      } else {
        const fileInput = document.getElementById('tp_receipt_hidden_file');
        if (fileInput) fileInput.click();
      }
    },

    _handleReceiptFile: function (event, titleInputId, amountInputId, previewId, receiptUrlInputId) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const urlInpEl = document.getElementById(receiptUrlInputId);
        const previewEl = document.getElementById(previewId);
        if (urlInpEl) urlInpEl.value = dataUrl;
        if (previewEl) {
          previewEl.style.display = 'block';
          previewEl.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; margin-top:4px;">
              <img src="${dataUrl}" style="width:40px; height:40px; object-fit:cover; border-radius:6px; border:1px solid var(--border);" />
              <span style="font-size:11px; color:var(--emerald);">📎 Receipt attached (${file.name})</span>
            </div>
          `;
        }
        if (typeof showToast === 'function') showToast('📷 Bill image attached!', 'success');
      };
      reader.readAsDataURL(file);
    },

    viewReceipt: function (urlOrId) {
      if (!urlOrId) return;
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_receiptLightbox';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:540px; width:94vw; padding:0; overflow:hidden;">
          <div class="modal-header" style="padding:12px 16px;">
            <h3 class="modal-title font-bold text-sm">📎 Attached Bill / Receipt</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div style="padding:16px; text-align:center; background:#0b1120; max-height:75vh; overflow-y:auto;">
            <img src="${_esc(urlOrId)}" alt="Receipt" style="max-width:100%; height:auto; border-radius:8px; display:inline-block;" onerror="this.alt='Unable to preview image file.'" />
          </div>
          <div style="padding:10px 16px; display:flex; justify-content:flex-end;">
            <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    // ─────────────────────────────────────────────────────────────
    // 15. VOICE LOGGING & OFFLINE PRINT / PDF
    // ─────────────────────────────────────────────────────────────
    startVoiceLog: function (tripId) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        const text = prompt('🎙️ Voice input not supported in this browser. Enter quick expense description & amount:\n(e.g. "Beach cafe snacks 450")');
        if (text) this._parseAndOpenQuickExpense(tripId, text);
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      if (typeof showToast === 'function') {
        showToast('🎙️ Listening... Say your expense (e.g. "Dinner at cafe 850")', 'info');
      }

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (typeof showToast === 'function') showToast(`🎙️ Heard: "${transcript}"`, 'info');
        this._parseAndOpenQuickExpense(tripId, transcript);
      };

      recognition.onerror = (e) => {
        console.warn('[TripUI] Speech recognition error:', e);
        if (typeof showToast === 'function') showToast('Voice recognition ended. Opening expense form.', 'info');
        this.openGeneralExpenseModal(tripId);
      };

      try {
        recognition.start();
      } catch (e) {
        this.openGeneralExpenseModal(tripId);
      }
    },

    _parseAndOpenQuickExpense: function (tripId, transcript) {
      const match = transcript.match(/\d+(\.\d+)?/);
      const amount = match ? Number(match[0]) : '';
      let title = transcript.replace(/\d+(\.\d+)?/g, '').replace(/\b(spent|for|rupees|rs|inr|paid)\b/gi, '').trim();
      if (!title) title = 'Trip Expense';

      this.openGeneralExpenseModal(tripId);
      setTimeout(() => {
        const tInp = document.getElementById('tp_gexp_title');
        const aInp = document.getElementById('tp_gexp_amount');
        if (tInp && title) tInp.value = title.charAt(0).toUpperCase() + title.slice(1);
        if (aInp && amount) aInp.value = amount;
      }, 150);
    },

    printTripItinerary: function (tripId) {
      this.openPrintableStatementModal(tripId);
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
      this.openWhatsAppShareModal(tripId);
    },

    // ─────────────────────────────────────────────────────────────
    // 15.1 ENTERPRISE WHATSAPP AUDIT & SHARE MODAL
    // ─────────────────────────────────────────────────────────────
    openWhatsAppShareModal: function (tripId) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_waShareModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:580px; width:94vw; max-height:90vh; display:flex; flex-direction:column;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">💬 Share Trip on WhatsApp</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px; overflow-y:auto; flex:1;">
            <p style="font-size:12.5px; color:var(--text-2); margin-bottom:10px;">
              Choose a report format to generate formatted WhatsApp messages with calculations, net balances and direct UPI links:
            </p>

            <div class="tp-wa-mode-strip" style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;">
              <button type="button" class="tp-tab-btn active" id="tp_wamode_full" onclick="window.LM_TripUI._switchWhatsAppMode('${trip.id}', 'full')">
                📊 Full Audit &amp; Split
              </button>
              <button type="button" class="tp-tab-btn" id="tp_wamode_settle" onclick="window.LM_TripUI._switchWhatsAppMode('${trip.id}', 'settlement_only')">
                👥 Split Math &amp; UPI Only
              </button>
              <button type="button" class="tp-tab-btn" id="tp_wamode_itin" onclick="window.LM_TripUI._switchWhatsAppMode('${trip.id}', 'itinerary_only')">
                📅 Itinerary Schedule Only
              </button>
            </div>

            <div>
              <label class="text-xs font-semibold text-muted" style="display:flex; justify-content:space-between;">
                <span>Message Preview</span>
                <span id="tp_wa_char_count" style="font-weight:normal; color:var(--text-3);">0 chars</span>
              </label>
              <textarea id="tp_wa_preview_box" class="form-input w-full" rows="12" style="font-family:var(--font-m); font-size:11.5px; line-height:1.45; white-space:pre-wrap; background:rgba(0,0,0,0.25);"></textarea>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="window.LM_TripUI._copyWhatsAppText()">
                📋 Copy Message
              </button>
              <div style="display:flex; gap:8px;">
                <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                <button type="button" class="tp-btn-primary" style="background:#25D366; color:#000; font-weight:700;" onclick="window.LM_TripUI._sendWhatsAppNow()">
                  💬 Open in WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => {
        modal.classList.add('show');
        this._switchWhatsAppMode(trip.id, 'full');
      }, 10);
    },

    _switchWhatsAppMode: function (tripId, mode) {
      document.querySelectorAll('.tp-wa-mode-strip .tp-tab-btn').forEach(b => b.classList.remove('active'));
      if (mode === 'full') document.getElementById('tp_wamode_full')?.classList.add('active');
      else if (mode === 'settlement_only') document.getElementById('tp_wamode_settle')?.classList.add('active');
      else if (mode === 'itinerary_only') document.getElementById('tp_wamode_itin')?.classList.add('active');

      const text = window.LM_TripService.generateWhatsAppText(tripId, { mode });
      const txtBox = document.getElementById('tp_wa_preview_box');
      if (txtBox) {
        txtBox.value = text || '';
        const cnt = document.getElementById('tp_wa_char_count');
        if (cnt) cnt.textContent = `${(text || '').length} characters`;
      }
    },

    _copyWhatsAppText: function () {
      const txt = document.getElementById('tp_wa_preview_box')?.value || '';
      if (!txt) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(() => {
          if (typeof showToast === 'function') showToast('📋 WhatsApp message copied to clipboard!', 'success');
        }).catch(() => {
          const txtBox = document.getElementById('tp_wa_preview_box');
          txtBox?.select();
          document.execCommand('copy');
          if (typeof showToast === 'function') showToast('📋 Copied!', 'success');
        });
      } else {
        const txtBox = document.getElementById('tp_wa_preview_box');
        txtBox?.select();
        document.execCommand('copy');
        if (typeof showToast === 'function') showToast('📋 Copied!', 'success');
      }
    },

    _sendWhatsAppNow: function () {
      const txt = document.getElementById('tp_wa_preview_box')?.value || '';
      if (!txt) return;
      window.open(`https://wa.me/?text=${encodeURIComponent(txt.substring(0, 12000))}`, '_blank');
    },

    // ─────────────────────────────────────────────────────────────
    // 15.2 PRINTABLE EXECUTIVE FINANCIAL STATEMENT & AUDIT (PDF)
    // ─────────────────────────────────────────────────────────────
    openPrintableStatementModal: function (tripId) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      const fin = window.LM_TripService.getTripFinancials(trip.id);
      const settlements = window.LM_TripService.calculateSettlements(trip.id);
      const itinStats = window.LM_TripService.getItineraryStats(trip.id);
      const plans = trip.plans || [];
      const generalExpenses = trip.expenses || [];
      const persons = trip.persons || [];

      // Collect all expenses into chronological itemized ledger
      const ledger = [];
      plans.forEach(p => {
        (p.expenses || []).forEach(e => {
          ledger.push({
            date: e.date || trip.startDate || '',
            title: `${p.title}: ${e.title}`,
            category: p.category || 'Plan',
            paidBy: e.paidByName || (persons.find(x => x.id === e.paidBy)?.name) || 'Self',
            paymentMethod: e.paymentMethod || 'Cash',
            amount: e.amount || 0
          });
        });
      });
      generalExpenses.forEach(e => {
        ledger.push({
          date: e.date || trip.startDate || '',
          title: e.title,
          category: e.category || 'General',
          paidBy: e.paidByName || (persons.find(x => x.id === e.paidBy)?.name) || 'Self',
          paymentMethod: e.paymentMethod || 'Cash',
          amount: e.amount || 0
        });
      });
      ledger.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_statementModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal tp-statement-modal" style="max-width:880px; width:95vw; max-height:92vh; display:flex; flex-direction:column; background:var(--bg-main, #0f172a); color:var(--text, #f8fafc);">
          <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding:12px 16px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:20px;">📄</span>
              <h3 class="modal-title font-bold text-lg" style="margin:0;">Executive Trip &amp; Financial Statement</h3>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._printStatementNow()" style="display:inline-flex; align-items:center; gap:6px;">
                <span>🖨️</span> Print / Save PDF
              </button>
              <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
          </div>
          <div class="modal-body tp-statement-body" id="tp_printable_statement_content" style="padding:24px; overflow-y:auto; flex:1;">
            
            <!-- STATEMENT HEADER -->
            <div class="tp-stmt-header" style="border-bottom:2px solid var(--border); padding-bottom:16px; margin-bottom:20px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px;">
                <div>
                  <h1 style="font-size:24px; font-weight:800; margin:0 0 4px; color:var(--text);">
                    ${_esc(trip.coverEmoji || '✈️')} ${_esc(trip.name)}
                  </h1>
                  <div style="font-size:13px; color:var(--text-2);">
                    📍 ${_esc(trip.destination || 'Not Specified')} &nbsp;·&nbsp; 
                    📅 ${_esc(trip.startDate || '')} to ${_esc(trip.endDate || '')} (${window.LM_TripService.calculateTripDays(trip.startDate, trip.endDate)} Days)
                  </div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:11px; text-transform:uppercase; color:var(--text-3); font-weight:700; letter-spacing:0.5px;">LEDGERMATE AUDIT STATEMENT</div>
                  <div style="font-size:12px; color:var(--teal); font-weight:600; margin-top:2px;">Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div style="font-size:11px; color:var(--text-3);">${persons.length} Travel Companions</div>
                </div>
              </div>
            </div>

            <!-- KPI SUMMARY STRIP -->
            <div class="tp-stmt-kpi-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; margin-bottom:24px;">
              <div class="tp-stmt-kpi-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:10px; padding:12px;">
                <div style="font-size:11px; color:var(--text-3); text-transform:uppercase; font-weight:600;">Total Budget</div>
                <div style="font-size:18px; font-weight:800; color:var(--text); font-family:var(--font-m); margin-top:4px;">${_fmtINR(fin.totalBudget)}</div>
              </div>
              <div class="tp-stmt-kpi-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:10px; padding:12px;">
                <div style="font-size:11px; color:var(--text-3); text-transform:uppercase; font-weight:600;">Total Spent</div>
                <div style="font-size:18px; font-weight:800; color:var(--emerald); font-family:var(--font-m); margin-top:4px;">${_fmtINR(fin.totalSpent)}</div>
              </div>
              <div class="tp-stmt-kpi-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:10px; padding:12px;">
                <div style="font-size:11px; color:var(--text-3); text-transform:uppercase; font-weight:600;">Budget Balance</div>
                <div style="font-size:18px; font-weight:800; color:${fin.remainingBudget >= 0 ? 'var(--emerald)' : 'var(--rose)'}; font-family:var(--font-m); margin-top:4px;">
                  ${fin.remainingBudget >= 0 ? `+${_fmtINR(fin.remainingBudget)}` : `-${_fmtINR(Math.abs(fin.remainingBudget))}`}
                </div>
              </div>
              <div class="tp-stmt-kpi-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:10px; padding:12px;">
                <div style="font-size:11px; color:var(--text-3); text-transform:uppercase; font-weight:600;">Spots Completed</div>
                <div style="font-size:18px; font-weight:800; color:var(--teal); font-family:var(--font-m); margin-top:4px;">
                  ${itinStats.visited}/${itinStats.total} (${itinStats.percent}%)
                </div>
              </div>
            </div>

            <!-- COMPANIONS & NET SPLIT BALANCES TABLE -->
            <div style="margin-bottom:24px;">
              <h3 style="font-size:14px; font-weight:700; color:var(--text); margin:0 0 10px; text-transform:uppercase; letter-spacing:0.5px;">
                👥 Travelers &amp; Net Balances Ledger
              </h3>
              <table style="width:100%; border-collapse:collapse; font-size:12.5px; border:1px solid var(--border);">
                <thead>
                  <tr style="background:rgba(255,255,255,0.05); text-align:left;">
                    <th style="padding:8px 12px; border:1px solid var(--border);">Traveler</th>
                    <th style="padding:8px 12px; border:1px solid var(--border);">UPI / Phone</th>
                    <th style="padding:8px 12px; border:1px solid var(--border); text-align:right;">Total Paid</th>
                    <th style="padding:8px 12px; border:1px solid var(--border); text-align:right;">Their Share</th>
                    <th style="padding:8px 12px; border:1px solid var(--border); text-align:right;">Net Balance</th>
                  </tr>
                </thead>
                <tbody>
                  ${persons.map(p => {
                    const pf = window.LM_TripService.getPersonFinancials(trip.id, p.id);
                    return `
                      <tr>
                        <td style="padding:8px 12px; border:1px solid var(--border); font-weight:600;">
                          ${_esc(p.avatarEmoji || '👤')} ${_esc(p.name)}
                        </td>
                        <td style="padding:8px 12px; border:1px solid var(--border); color:var(--text-2); font-family:var(--font-m); font-size:11.5px;">
                          ${_esc(p.upiId || p.phone || '—')}
                        </td>
                        <td style="padding:8px 12px; border:1px solid var(--border); text-align:right; color:var(--emerald); font-family:var(--font-m);">
                          ${_fmtINR(pf.paidTotal)}
                        </td>
                        <td style="padding:8px 12px; border:1px solid var(--border); text-align:right; font-family:var(--font-m);">
                          ${_fmtINR(pf.shareTotal)}
                        </td>
                        <td style="padding:8px 12px; border:1px solid var(--border); text-align:right; font-family:var(--font-m); font-weight:700; color:${pf.isOwed ? 'var(--emerald)' : (pf.owes ? 'var(--rose)' : 'var(--text-3)')};">
                          ${pf.isOwed ? `+${_fmtINR(pf.netBalance)}` : (pf.owes ? `-${_fmtINR(Math.abs(pf.netBalance))}` : '₹0')}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- SIMPLIFIED DEBTS MATRIX -->
            ${settlements.length > 0 ? `
              <div style="margin-bottom:24px;">
                <h3 style="font-size:14px; font-weight:700; color:var(--text); margin:0 0 10px; text-transform:uppercase; letter-spacing:0.5px;">
                  ⚡ Minimum Cash-Flow Debt Settlements
                </h3>
                <table style="width:100%; border-collapse:collapse; font-size:12.5px; border:1px solid var(--border);">
                  <thead>
                    <tr style="background:rgba(255,255,255,0.05); text-align:left;">
                      <th style="padding:8px 12px; border:1px solid var(--border);">Debtor (From)</th>
                      <th style="padding:8px 12px; border:1px solid var(--border);">Creditor (To)</th>
                      <th style="padding:8px 12px; border:1px solid var(--border); text-align:right;">Amount</th>
                      <th style="padding:8px 12px; border:1px solid var(--border);">Settlement Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${settlements.map(s => {
                      const isSettled = (trip.settlements || []).some(x => x.from === s.from && x.to === s.to && x.status === 'collected');
                      return `
                        <tr>
                          <td style="padding:8px 12px; border:1px solid var(--border); font-weight:600;">${_esc(s.fromName)}</td>
                          <td style="padding:8px 12px; border:1px solid var(--border); font-weight:600; color:var(--teal);">${_esc(s.toName)}</td>
                          <td style="padding:8px 12px; border:1px solid var(--border); text-align:right; font-weight:700; font-family:var(--font-m);">${_fmtINR(s.amount)}</td>
                          <td style="padding:8px 12px; border:1px solid var(--border); color:${isSettled ? 'var(--emerald)' : 'var(--amber)'}; font-weight:600;">
                            ${isSettled ? '✅ Confirmed Paid' : '⏳ Pending'}
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            <!-- COMPLETE ITEMIZED LEDGER -->
            <div style="margin-bottom:24px;">
              <h3 style="font-size:14px; font-weight:700; color:var(--text); margin:0 0 10px; text-transform:uppercase; letter-spacing:0.5px;">
                🧾 Complete Itemized Expense Ledger (${ledger.length} Transactions)
              </h3>
              ${ledger.length === 0 ? `
                <div style="padding:16px; font-size:12px; color:var(--text-3); font-style:italic; border:1px dashed var(--border); border-radius:8px; text-align:center;">No expenses recorded yet</div>
              ` : `
                <table style="width:100%; border-collapse:collapse; font-size:12px; border:1px solid var(--border);">
                  <thead>
                    <tr style="background:rgba(255,255,255,0.05); text-align:left;">
                      <th style="padding:6px 10px; border:1px solid var(--border);">Date</th>
                      <th style="padding:6px 10px; border:1px solid var(--border);">Description</th>
                      <th style="padding:6px 10px; border:1px solid var(--border);">Category</th>
                      <th style="padding:6px 10px; border:1px solid var(--border);">Paid By</th>
                      <th style="padding:6px 10px; border:1px solid var(--border);">Method</th>
                      <th style="padding:6px 10px; border:1px solid var(--border); text-align:right;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${ledger.map(row => `
                      <tr>
                        <td style="padding:6px 10px; border:1px solid var(--border); white-space:nowrap; font-family:var(--font-m);">${_esc(row.date)}</td>
                        <td style="padding:6px 10px; border:1px solid var(--border);">${_esc(row.title)}</td>
                        <td style="padding:6px 10px; border:1px solid var(--border); color:var(--teal);">${_esc(row.category)}</td>
                        <td style="padding:6px 10px; border:1px solid var(--border); font-weight:600;">${_esc(row.paidBy)}</td>
                        <td style="padding:6px 10px; border:1px solid var(--border);">${_esc(row.paymentMethod)}</td>
                        <td style="padding:6px 10px; border:1px solid var(--border); text-align:right; font-family:var(--font-m); font-weight:700;">${_fmtINR(row.amount)}</td>
                      </tr>
                    `).join('')}
                    <tr style="background:rgba(255,255,255,0.05); font-weight:700;">
                      <td colspan="5" style="padding:8px 10px; border:1px solid var(--border); text-align:right;">TOTAL EXPENDITURE:</td>
                      <td style="padding:8px 10px; border:1px solid var(--border); text-align:right; font-family:var(--font-m); color:var(--emerald);">${_fmtINR(fin.totalSpent)}</td>
                    </tr>
                  </tbody>
                </table>
              `}
            </div>

            <!-- ITINERARY SCHEDULE OVERVIEW -->
            <div>
              <h3 style="font-size:14px; font-weight:700; color:var(--text); margin:0 0 10px; text-transform:uppercase; letter-spacing:0.5px;">
                🗺️ Itinerary Schedule &amp; Completion Status
              </h3>
              <table style="width:100%; border-collapse:collapse; font-size:12px; border:1px solid var(--border);">
                <thead>
                  <tr style="background:rgba(255,255,255,0.05); text-align:left;">
                    <th style="padding:6px 10px; border:1px solid var(--border);">Day</th>
                    <th style="padding:6px 10px; border:1px solid var(--border);">Time</th>
                    <th style="padding:6px 10px; border:1px solid var(--border);">Spot / Activity</th>
                    <th style="padding:6px 10px; border:1px solid var(--border);">Category</th>
                    <th style="padding:6px 10px; border:1px solid var(--border);">Location</th>
                    <th style="padding:6px 10px; border:1px solid var(--border); text-align:center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${plans.map(p => `
                    <tr>
                      <td style="padding:6px 10px; border:1px solid var(--border); font-weight:600; white-space:nowrap;">Day ${p.dayNumber || 1}</td>
                      <td style="padding:6px 10px; border:1px solid var(--border); font-family:var(--font-m);">${_esc(p.time || '—')}</td>
                      <td style="padding:6px 10px; border:1px solid var(--border); font-weight:600;">${_esc(p.title)}</td>
                      <td style="padding:6px 10px; border:1px solid var(--border); color:var(--teal);">${_esc(p.category)}</td>
                      <td style="padding:6px 10px; border:1px solid var(--border);">${_esc(p.location || '—')}</td>
                      <td style="padding:6px 10px; border:1px solid var(--border); text-align:center; font-weight:600; color:${p.status === 'completed' ? 'var(--emerald)' : 'var(--amber)'};">
                        ${p.status === 'completed' ? '✅ Visited' : '⏳ Pending'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    _printStatementNow: function () {
      window.print();
    },

    // ─────────────────────────────────────────────────────────────
    // 15.3 TRIP CLONING / DUPLICATION MODAL
    // ─────────────────────────────────────────────────────────────
    cloneTripModal: function (tripId) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_cloneModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:440px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">📑 Clone Trip as Template</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px;">
            <p style="font-size:12.5px; color:var(--text-2); margin-bottom:10px;">
              Create a duplicate of <strong>${_esc(trip.name)}</strong> to plan another edition or reuse your itinerary structure.
            </p>

            <div>
              <label class="text-xs font-semibold text-muted">Cloned Trip Name *</label>
              <input id="tp_clone_name" value="${_esc(trip.name)} (Copy)" class="form-input w-full" autofocus />
            </div>

            <div class="grid-2" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="text-xs font-semibold text-muted">New Start Date</label>
                <input type="date" id="tp_clone_start" value="${trip.startDate || new Date().toISOString().split('T')[0]}" class="form-input w-full" />
              </div>
              <div>
                <label class="text-xs font-semibold text-muted">New End Date</label>
                <input type="date" id="tp_clone_end" value="${trip.endDate || new Date().toISOString().split('T')[0]}" class="form-input w-full" />
              </div>
            </div>

            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border); border-radius:8px; padding:10px; margin-top:8px;">
              <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; cursor:pointer;">
                <input type="checkbox" id="tp_clone_reset_exp" checked />
                <span>Reset all logged expenses &amp; settlements to ₹0</span>
              </label>
              <div style="font-size:11px; color:var(--text-3); margin-left:22px;">Keeps itinerary plans, packing items &amp; wishlist places without previous costs.</div>

              <label style="display:flex; align-items:center; gap:8px; font-size:12.5px; cursor:pointer; margin-top:8px;">
                <input type="checkbox" id="tp_clone_reset_vis" checked />
                <span>Reset visit status (mark all spots as Pending)</span>
              </label>
            </div>

            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" onclick="window.LM_TripUI._confirmCloneTrip('${trip.id}')">
                Clone Trip
              </button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    _confirmCloneTrip: async function (tripId) {
      const name = (document.getElementById('tp_clone_name')?.value || '').trim();
      const startDate = document.getElementById('tp_clone_start')?.value || '';
      const endDate = document.getElementById('tp_clone_end')?.value || '';
      const resetExpenses = document.getElementById('tp_clone_reset_exp')?.checked ?? true;
      const resetVisitStatus = document.getElementById('tp_clone_reset_vis')?.checked ?? true;

      if (!name) {
        alert('Please enter a name for the cloned trip.');
        return;
      }

      const cloned = await window.LM_TripService.duplicateTrip(tripId, {
        newName: name,
        startDate,
        endDate,
        resetExpenses,
        resetVisitStatus
      });

      document.getElementById('tp_cloneModalOverlay')?.remove();
      if (cloned) {
        if (typeof showToast === 'function') showToast(`🎉 Trip cloned successfully as "${cloned.name}"!`, 'success');
        this.activeTripId = cloned.id;
        this.renderTripWorkspace(cloned.id);
      }
    },

    // ─────────────────────────────────────────────────────────────
    // 15.4 INTERACTIVE MULTI-STOP ROUTE MAP MODAL
    // ─────────────────────────────────────────────────────────────
    openRouteMapModal: function (tripId) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      const plans = trip.plans || [];
      const days = window.LM_TripService.calculateTripDays(trip.startDate, trip.endDate);

      // Collect stops for all plans
      const allStops = plans.map(p => ({
        day: p.dayNumber || 1,
        title: p.title,
        location: (p.location && !/^https?:\/\//i.test(p.location)) ? p.location : p.title,
        category: p.category,
        time: p.time,
        status: p.status,
        mapsUrl: window.LM_TripService.getMapsUrl(p)
      })).filter(s => s.location);

      const dayNumbers = [];
      for (let i = 1; i <= days; i++) dayNumbers.push(i);

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_routeMapModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:640px; width:94vw; max-height:90vh; display:flex; flex-direction:column;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">🗺️ Interactive Route Map Navigator</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-3" style="padding:16px; overflow-y:auto; flex:1;">
            <p style="font-size:12.5px; color:var(--text-2); margin-bottom:12px;">
              Select a day or view all stops across <strong>${_esc(trip.name)}</strong> with 1-tap Google Maps multi-stop navigation:
            </p>

            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
              <button type="button" class="tp-day-pill active" id="tp_routemap_pill_all" onclick="window.LM_TripUI._filterRouteMapStops('${trip.id}', 'all')">
                All Stops (${allStops.length})
              </button>
              ${dayNumbers.map(d => {
                const dayCount = allStops.filter(s => s.day === d).length;
                return `
                  <button type="button" class="tp-day-pill" id="tp_routemap_pill_${d}" onclick="window.LM_TripUI._filterRouteMapStops('${trip.id}', ${d})">
                    Day ${d} (${dayCount})
                  </button>
                `;
              }).join('')}
            </div>

            <!-- ROUTE ACTION BAR -->
            <div id="tp_route_action_container" style="margin-bottom:16px;"></div>

            <!-- STOPS TIMELINE -->
            <div id="tp_route_stops_list" class="space-y-2"></div>

            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => {
        modal.classList.add('show');
        this._filterRouteMapStops(trip.id, 'all');
      }, 10);
    },

    _filterRouteMapStops: function (tripId, selectedDay) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      document.querySelectorAll('#tp_routeMapModalOverlay .tp-day-pill').forEach(b => b.classList.remove('active'));
      const activePill = document.getElementById(selectedDay === 'all' ? 'tp_routemap_pill_all' : `tp_routemap_pill_${selectedDay}`);
      if (activePill) activePill.classList.add('active');

      const plans = trip.plans || [];
      let stops = plans.map(p => ({
        day: p.dayNumber || 1,
        title: p.title,
        location: (p.location && !/^https?:\/\//i.test(p.location)) ? p.location : p.title,
        category: p.category,
        time: p.time,
        status: p.status,
        mapsUrl: window.LM_TripService.getMapsUrl(p)
      })).filter(s => s.location);

      if (selectedDay !== 'all') {
        stops = stops.filter(s => s.day === Number(selectedDay));
      }

      const actCont = document.getElementById('tp_route_action_container');
      const listCont = document.getElementById('tp_route_stops_list');
      if (!actCont || !listCont) return;

      if (stops.length > 1) {
        const dirUrl = `https://www.google.com/maps/dir/${stops.map(s => encodeURIComponent(s.location)).join('/')}`;
        actCont.innerHTML = `
          <a href="${dirUrl}" target="_blank" rel="noopener noreferrer" class="tp-btn-primary" style="display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; padding:10px 16px; font-weight:700;">
            <span>🧭</span> Open Full Multi-Stop Route in Google Maps (${stops.length} stops) ↗
          </a>
          ${selectedDay !== 'all' ? `
            <button type="button" class="tp-btn-secondary" style="margin-top:8px; width:100%; color:var(--teal); font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; padding:8px 12px;" onclick="window.LM_TripUI.openRouteOptimizerModal('${trip.id}', ${selectedDay})">
              ⚡ Auto-Align Day ${selectedDay} Nearest Route Order
            </button>
          ` : ''}
        `;
      } else if (stops.length === 1 && stops[0].mapsUrl) {
        actCont.innerHTML = `
          <a href="${stops[0].mapsUrl}" target="_blank" rel="noopener noreferrer" class="tp-btn-primary" style="display:flex; align-items:center; justify-content:center; gap:8px; text-decoration:none; padding:10px 16px; font-weight:700;">
            <span>📍</span> Navigate to ${_esc(stops[0].title)} on Google Maps ↗
          </a>
        `;
      } else {
        actCont.innerHTML = '';
      }

      if (stops.length === 0) {
        listCont.innerHTML = `
          <div style="text-align:center; padding:24px; color:var(--text-3); font-size:13px; background:rgba(255,255,255,0.02); border-radius:10px;">
            No destination stops found for this selection. Add plans with locations or titles to plot your route!
          </div>
        `;
        return;
      }

      listCont.innerHTML = stops.map((s, idx) => `
        <div style="display:flex; align-items:center; justify-content:space-between; background:var(--surface-card); border:1px solid var(--border); border-radius:10px; padding:10px 14px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:26px; height:26px; border-radius:50%; background:rgba(0,240,255,0.15); color:var(--teal); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px;">
              ${idx + 1}
            </div>
            <div>
              <div style="font-size:13.5px; font-weight:700; color:var(--text);">
                ${_esc(s.title)}
                ${s.status === 'completed' ? `<span style="font-size:11px; color:var(--emerald); margin-left:6px;">✓ Visited</span>` : ''}
              </div>
              <div style="font-size:11.5px; color:var(--text-3);">
                Day ${s.day} ${s.time ? `· ⏰ ${s.time}` : ''} · 📍 ${_esc(s.location)}
              </div>
            </div>
          </div>
          <div>
            ${s.mapsUrl ? `
              <a href="${s.mapsUrl}" target="_blank" rel="noopener noreferrer" class="tp-icon-btn" title="Open in Google Maps">🧭</a>
            ` : ''}
          </div>
        </div>
      `).join('');
    },

    searchMapsHelper: function (locInputId, titleInputId) {
      const loc = (document.getElementById(locInputId)?.value || '').trim();
      const title = (document.getElementById(titleInputId)?.value || '').trim();
      const query = loc || title;
      if (!query) {
        alert('Please enter a location or spot title first to find it on Google Maps.');
        return;
      }
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    },

    // ─────────────────────────────────────────────────────────────
    // 16. CALENDAR SYNC (.ICS) DOWNLOAD
    // ─────────────────────────────────────────────────────────────
    downloadICalendar: function (tripId) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;
      const ics = window.LM_TripService.generateICalendar(tripId);
      if (!ics) {
        if (typeof showToast === 'function') showToast('No itinerary items to sync', 'info');
        return;
      }
      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(trip.name || 'Trip').replace(/[^a-z0-9]/gi, '_')}_itinerary.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (typeof showToast === 'function') showToast('📅 Calendar .ics downloaded! Tap to sync with Google/Apple Calendar', 'success');
    },

    // ─────────────────────────────────────────────────────────────
    // 17. TRIP PACKAGE EXPORT & IMPORT
    // ─────────────────────────────────────────────────────────────
    exportTripModal: function (tripId) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;
      const jsonStr = window.LM_TripService.exportTripPackage(tripId, { includeLedgerLinks: false });
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(trip.name || 'Trip').replace(/[^a-z0-9]/gi, '_')}.lm_trip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      if (typeof showToast === 'function') showToast('📦 Trip package exported! Ready to share with companions.', 'success');
    },

    openImportTripModal: function () {
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_importModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal" style="max-width:440px; width:92vw;">
          <div class="modal-header">
            <h3 class="modal-title font-bold text-lg">📥 Import Trip Package</h3>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body space-y-4" style="padding:16px;">
            <p style="font-size:12.5px; color:var(--text-2); margin-bottom:12px;">
              Select a <strong>.lm_trip</strong> or JSON file exported by a travel companion to import their complete itinerary, packing list, and booked documents.
            </p>
            <div style="border:2px dashed rgba(255,255,255,0.15); border-radius:10px; padding:24px; text-align:center; background:rgba(255,255,255,0.02);">
              <input type="file" id="tp_import_file_input" accept=".lm_trip,.json" style="display:none;" onchange="window.LM_TripUI._handleImportFile(this.files[0])" />
              <button type="button" class="tp-btn-primary" onclick="document.getElementById('tp_import_file_input').click()">
                📂 Select Trip File
              </button>
              <div style="font-size:11px; color:var(--text-3); margin-top:8px;">Supports .lm_trip and .json files</div>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:16px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);
    },

    _handleImportFile: async function (file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target.result;
          const imported = await window.LM_TripService.importTripPackage(content);
          document.getElementById('tp_importModalOverlay')?.remove();
          if (typeof showToast === 'function') showToast(`🎉 Trip "${imported.name}" imported successfully!`, 'success');
          this.activeTripId = imported.id;
          this.renderTripWorkspace(imported.id);
        } catch (err) {
          alert('Failed to import trip: ' + err.message);
        }
      };
      reader.readAsText(file);
    },

    refreshLiveFX: async function (tripId) {
      if (typeof showToast === 'function') showToast('🔄 Refreshing live FX rates from market...', 'info');
      const res = await window.LM_TripService.fetchLiveFXRates();
      if (res && res.success) {
        if (typeof showToast === 'function') showToast(`💱 Live FX rates updated as of ${res.date || 'today'}!`, 'success');
        if (tripId) this.renderTripWorkspace(tripId);
      } else {
        if (typeof showToast === 'function') showToast('Could not reach FX service, using cached rates.', 'info');
      }
    },

    _setSplitMode: function (btn, mode, prefix = 'tp_pexp') {
      const parent = btn.closest('.tp-split-mode-pills');
      if (parent) {
        parent.querySelectorAll('.tp-split-mode-btn').forEach(b => b.classList.remove('active'));
      }
      btn.classList.add('active');
      const hiddenInp = document.getElementById(`${prefix}_split_mode`);
      if (hiddenInp) hiddenInp.value = mode;

      const container = document.getElementById(`${prefix}_split_members_container`);
      if (!container) return;

      const inputWraps = container.querySelectorAll('.tp-split-input-wrap');
      inputWraps.forEach(w => {
        w.style.display = (mode === 'exact' || mode === 'shares') ? 'block' : 'none';
        const inp = w.querySelector('.tp-split-custom-input');
        if (inp) inp.placeholder = mode === 'exact' ? '₹ amt' : 'shares';
      });

      this._updateSplitBreakdown(prefix);
    },

    _updateSplitBreakdown: function (prefix = 'tp_pexp') {
      const mode = document.getElementById(`${prefix}_split_mode`)?.value || 'equal';
      const amtInput = document.getElementById(`${prefix}_amount`);
      const totalAmt = Number(amtInput?.value) || 0;
      const container = document.getElementById(`${prefix}_split_members_container`);
      if (!container) return;

      const rows = container.querySelectorAll('.tp-split-member-row');

      if (mode === 'equal') {
        const checkedRows = Array.from(rows).filter(r => r.querySelector('.tp-split-member-check')?.checked);
        const count = checkedRows.length || 1;
        const perPerson = Math.round(totalAmt / count);

        rows.forEach(r => {
          const chk = r.querySelector('.tp-split-member-check');
          const valEl = r.querySelector('.tp-split-computed-val');
          if (chk && chk.checked) {
            if (valEl) valEl.textContent = `₹${perPerson}`;
          } else {
            if (valEl) valEl.textContent = `₹0 (excluded)`;
          }
        });
      } else if (mode === 'exact') {
        rows.forEach(r => {
          const inp = r.querySelector('.tp-split-custom-input');
          const valEl = r.querySelector('.tp-split-computed-val');
          const exactVal = Number(inp?.value) || 0;
          if (valEl) valEl.textContent = `₹${exactVal}`;
        });
      } else if (mode === 'shares') {
        let totalShares = 0;
        rows.forEach(r => {
          const inp = r.querySelector('.tp-split-custom-input');
          totalShares += (Number(inp?.value) || 0);
        });
        rows.forEach(r => {
          const inp = r.querySelector('.tp-split-custom-input');
          const valEl = r.querySelector('.tp-split-computed-val');
          const s = Number(inp?.value) || 0;
          if (totalShares > 0) {
            const calculated = Math.round(totalAmt * (s / totalShares));
            if (valEl) valEl.textContent = `₹${calculated} (${s} sh)`;
          } else {
            if (valEl) valEl.textContent = '0 sh';
          }
        });
      }
    },

    // ─────────────────────────────────────────────────────────────
    // 16. NEAREST NEIGHBOR ROUTE ALIGNMENT & OPTIMIZER MODAL
    // ─────────────────────────────────────────────────────────────
    openRouteOptimizerModal: async function (tripId, dayNumber, selectedStartPlanId = null) {
      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      const dNum = Number(dayNumber);
      const existingModal = document.getElementById('tp_routeOptimizerModalOverlay');
      if (existingModal) existingModal.remove();

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.id = 'tp_routeOptimizerModalOverlay';
      modal.style.zIndex = '99999';

      modal.innerHTML = `
        <div class="modal tp-optimizer-modal" style="max-width:760px; width:95vw; max-height:92vh; display:flex; flex-direction:column;">
          <div class="modal-header" style="border-bottom:1px solid var(--border);">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:20px;">⚡</span>
              <div>
                <h3 class="modal-title font-bold text-lg" style="margin:0;">Auto-Align Day ${dNum} Route (Nearest Distance)</h3>
                <div style="font-size:12px; color:var(--text-3);">${_esc(trip.name)} · Sequencing stops to eliminate zigzagging</div>
              </div>
            </div>
            <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body" id="tp_optimizer_modal_body" style="padding:18px; overflow-y:auto; flex:1;">
            <div style="text-align:center; padding:40px 16px;">
              <div style="font-size:32px; animation:spin 1.5s linear infinite; display:inline-block; margin-bottom:12px;">🧭</div>
              <div style="font-size:15px; font-weight:700; color:var(--text); margin-bottom:6px;">Analyzing Day ${dNum} Locations & Maps Links...</div>
              <div style="font-size:12.5px; color:var(--text-3);">Fetching coordinates and running Nearest-Neighbor + 2-Opt solver</div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add('show'), 10);

      await this._renderRouteOptimizationContent(tripId, dNum, selectedStartPlanId);
    },

    _renderRouteOptimizationContent: async function (tripId, dayNumber, selectedStartPlanId = null) {
      const bodyEl = document.getElementById('tp_optimizer_modal_body');
      if (!bodyEl) return;

      const trip = window.LM_TripService.getTrip(tripId);
      if (!trip) return;

      let result;
      try {
        result = await window.LM_TripService.optimizeDayItineraryRoute(tripId, dayNumber, {
          startPlanId: selectedStartPlanId
        });
      } catch (err) {
        bodyEl.innerHTML = `
          <div style="text-align:center; padding:32px 16px; color:var(--rose);">
            <div style="font-size:32px; margin-bottom:10px;">⚠️</div>
            <div style="font-weight:700; font-size:15px; margin-bottom:6px;">Failed to calculate route</div>
            <div style="font-size:12.5px; color:var(--text-3);">${_esc(err.message || 'Unknown error')}</div>
          </div>
        `;
        return;
      }

      if (!result.canOptimize) {
        bodyEl.innerHTML = `
          <div style="text-align:center; padding:36px 16px; background:rgba(255,255,255,0.02); border-radius:12px; border:1px dashed var(--border);">
            <div style="font-size:36px; margin-bottom:12px;">📍</div>
            <h4 style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:8px;">Insufficient Coordinates Found</h4>
            <p style="font-size:13px; color:var(--text-3); max-width:440px; margin:0 auto 16px;">
              ${_esc(result.reason || 'At least 2 plans need valid Google Maps links or locations to optimize.')}
            </p>
            <div style="background:rgba(0,240,255,0.05); border:1px solid rgba(0,240,255,0.15); border-radius:8px; padding:12px; max-width:460px; margin:0 auto; font-size:12px; text-align:left; color:var(--text-2);">
              <div style="font-weight:700; color:var(--teal); margin-bottom:4px;">💡 Quick Tip to Enable Nearest Route:</div>
              <div>• Edit each stop and paste its <strong>Google Maps link</strong> (e.g. <code>maps.app.goo.gl/...</code> or <code>@15.54,73.75</code>), OR</div>
              <div>• Enter recognizable place names (e.g. <em>"Baga Beach, Goa"</em> or <em>"Colva Beach"</em>).</div>
            </div>
            <div style="margin-top:20px;">
              <button class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
            </div>
          </div>
        `;
        return;
      }

      const originalPlans = result.originalPlans || [];
      const optimizedPlans = result.optimizedPlans || [];
      const distBefore = result.distanceBefore;
      const distAfter = result.distanceAfter;
      const distSaved = result.distanceSaved;
      const timeSaved = result.timeSavedMinutes;
      const percentSaved = distBefore > 0 ? Math.round((distSaved / distBefore) * 100) : 0;

      // Prepare start selector options
      const startOptions = originalPlans.map((p, idx) => {
        const isCurrentStart = selectedStartPlanId ? String(p.id) === String(selectedStartPlanId) : (idx === 0);
        return `<option value="${p.id}" ${isCurrentStart ? 'selected' : ''}>Stop ${idx + 1}: ${_esc(p.title)} (${p.category || 'Spot'})</option>`;
      }).join('');

      bodyEl.innerHTML = `
        <div class="space-y-4">
          <!-- METRICS KPI STRIP -->
          <div class="tp-optimizer-kpi-bar">
            <div class="tp-opt-kpi-card">
              <div class="tp-opt-kpi-label">Current Route</div>
              <div class="tp-opt-kpi-val" style="color:var(--text-2);">${distBefore} <span style="font-size:12px;">km</span></div>
              <div class="tp-opt-kpi-sub">Original sequence</div>
            </div>
            <div class="tp-opt-kpi-card highlight">
              <div class="tp-opt-kpi-label">Optimized Route</div>
              <div class="tp-opt-kpi-val" style="color:var(--teal);">${distAfter} <span style="font-size:12px;">km</span></div>
              <div class="tp-opt-kpi-sub">Shortest distance</div>
            </div>
            <div class="tp-opt-kpi-card success">
              <div class="tp-opt-kpi-label">Distance Saved</div>
              <div class="tp-opt-kpi-val" style="color:var(--emerald);">${distSaved > 0 ? '−' + distSaved : '0'} <span style="font-size:12px;">km</span></div>
              <div class="tp-opt-kpi-sub">${percentSaved > 0 ? `${percentSaved}% less driving` : 'Already optimal'}</div>
            </div>
            <div class="tp-opt-kpi-card">
              <div class="tp-opt-kpi-label">Time Saved</div>
              <div class="tp-opt-kpi-val" style="color:var(--amber);">${timeSaved > 0 ? '~' + timeSaved : '0'} <span style="font-size:12px;">mins</span></div>
              <div class="tp-opt-kpi-sub">Less road transit</div>
            </div>
          </div>

          <!-- DEPARTURE SPOT SELECTOR & CONTROLS -->
          <div style="background:var(--surface-card); border:1px solid var(--border); border-radius:10px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:8px; flex:1; min-width:240px;">
              <span style="font-size:16px;">🏨</span>
              <label for="tp_opt_start_select" style="font-size:12.5px; font-weight:700; color:var(--text); white-space:nowrap;">Start Day Route From:</label>
              <select id="tp_opt_start_select" class="form-input" style="padding:4px 8px; font-size:12px; flex:1; max-width:320px;" onchange="window.LM_TripUI._renderRouteOptimizationContent('${tripId}', ${dayNumber}, this.value)">
                ${startOptions}
              </select>
            </div>
            <div style="font-size:11.5px; color:var(--text-3); font-family:var(--font-m);">
              ${result.geocodedCount} of ${result.stopsCount} stops mapped
            </div>
          </div>

          <!-- COMPARISON TIMELINE (BEFORE vs AFTER) -->
          <div class="tp-route-comparison-grid">
            <!-- LEFT: ORIGINAL ORDER -->
            <div class="tp-opt-col">
              <div class="tp-opt-col-header" style="color:var(--text-2);">
                <span>Current Order (${originalPlans.length} stops)</span>
                <span>${distBefore} km</span>
              </div>
              <div class="tp-opt-stops-list">
                ${originalPlans.map((p, idx) => {
                  const leg = (result.legsBefore || []).find(l => l.fromIndex === idx);
                  const mapUrl = window.LM_TripService.getMapsUrl(p);
                  return `
                    <div class="tp-route-step-card current">
                      <div class="tp-step-num-pill">${idx + 1}</div>
                      <div class="tp-step-info">
                        <div class="tp-step-title">${_esc(p.title)}</div>
                        <div class="tp-step-meta">
                          <span>${p.category || 'Spot'}</span>
                          ${p.time ? `<span>· ⏰ ${p.time}</span>` : ''}
                          ${mapUrl ? `<a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="tp-map-pill">📍 Maps ↗</a>` : ''}
                        </div>
                      </div>
                    </div>
                    ${leg ? `
                      <div class="tp-transit-badge">
                        <span>🚗 ${leg.distanceKm} km (~${leg.estMinutes} mins)</span>
                      </div>
                    ` : ''}
                  `;
                }).join('')}
              </div>
            </div>

            <!-- RIGHT: OPTIMIZED ORDER -->
            <div class="tp-opt-col">
              <div class="tp-opt-col-header" style="color:var(--teal);">
                <span>⚡ Proposed Nearest Sequence (${optimizedPlans.length} stops)</span>
                <span>${distAfter} km</span>
              </div>
              <div class="tp-opt-stops-list">
                ${optimizedPlans.map((p, idx) => {
                  const leg = (result.legsAfter || []).find(l => l.fromIndex === idx);
                  const mapUrl = window.LM_TripService.getMapsUrl(p);
                  return `
                    <div class="tp-route-step-card proposed">
                      <div class="tp-step-num-pill active">${idx + 1}</div>
                      <div class="tp-step-info">
                        <div class="tp-step-title" style="color:var(--teal);">${_esc(p.title)}</div>
                        <div class="tp-step-meta">
                          <span>${p.category || 'Spot'}</span>
                          ${p.time ? `<span>· ⏰ ${p.time}</span>` : ''}
                          ${mapUrl ? `<a href="${mapUrl}" target="_blank" rel="noopener noreferrer" class="tp-map-pill">📍 Maps ↗</a>` : ''}
                        </div>
                      </div>
                    </div>
                    ${leg ? `
                      <div class="tp-transit-badge proposed">
                        <span>🚗 ${leg.distanceKm} km (~${leg.estMinutes} mins)</span>
                      </div>
                    ` : ''}
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- ACTIONS FOOTER -->
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-top:16px; border-top:1px solid var(--border); padding-top:14px;">
            <div style="display:flex; gap:8px; align-items:center;">
              ${result.googleMapsDirUrl ? `
                <a href="${result.googleMapsDirUrl}" target="_blank" rel="noopener noreferrer" class="tp-btn-secondary" style="font-size:12px; color:var(--teal); text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                  <span>🧭</span> Preview Full Directions in Google Maps ↗
                </a>
              ` : ''}
              ${trip._itineraryBackup && trip._itineraryBackup.dayNumber === dayNumber ? `
                <button type="button" class="tp-btn-secondary" style="font-size:12px; color:var(--rose);" onclick="window.LM_TripUI._revertDayRoute('${tripId}', ${dayNumber})">
                  ↩ Undo to Previous Order
                </button>
              ` : ''}
            </div>

            <div style="display:flex; gap:8px;">
              <button type="button" class="tp-btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
              <button type="button" class="tp-btn-primary" style="display:inline-flex; align-items:center; gap:6px; font-weight:700;" onclick="window.LM_TripUI._confirmApplyOptimizedRoute('${tripId}', ${dayNumber}, ${JSON.stringify(optimizedPlans.map(p => p.id)).replace(/"/g, '&quot;')})">
                <span>✅</span> Apply Nearest Sequence to Day ${dayNumber}
              </button>
            </div>
          </div>
        </div>
      `;
    },

    _confirmApplyOptimizedRoute: async function (tripId, dayNumber, orderedPlanIds) {
      try {
        await window.LM_TripService.applyOptimizedDayRoute(tripId, dayNumber, orderedPlanIds, {
          rescheduleTimes: true
        });

        const modal = document.getElementById('tp_routeOptimizerModalOverlay');
        if (modal) modal.remove();

        if (window.LM_Toast) {
          window.LM_Toast.success(`Day ${dayNumber} route aligned! Sequential schedule updated.`);
        }

        this.renderWorkspace(tripId, 'itinerary');
      } catch (err) {
        if (window.LM_Toast) {
          window.LM_Toast.error(err.message || 'Failed to apply route order');
        } else {
          alert('Failed to apply route order: ' + err.message);
        }
      }
    },

    _revertDayRoute: async function (tripId, dayNumber) {
      try {
        const res = await window.LM_TripService.revertOptimizedDayRoute(tripId);
        if (res.success) {
          const modal = document.getElementById('tp_routeOptimizerModalOverlay');
          if (modal) modal.remove();

          if (window.LM_Toast) {
            window.LM_Toast.success(`Day ${dayNumber} route reverted to previous order.`);
          }
          this.renderWorkspace(tripId, 'itinerary');
        } else {
          if (window.LM_Toast) {
            window.LM_Toast.warning(res.reason || 'Could not revert order');
          }
        }
      } catch (err) {
        alert('Error reverting route: ' + err.message);
      }
    }
  };

  window.LM_TripUI = TripUI;
})();
