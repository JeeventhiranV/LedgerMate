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
                <button class="tp-btn-secondary" style="color:var(--teal);" onclick="window.LM_TripUI.startVoiceLog('${trip.id}')" title="Voice Expense / Note">🎙️ Voice</button>
                <button class="tp-btn-secondary" onclick="window.LM_TripUI.printTripItinerary('${trip.id}')" title="Printable / PDF Itinerary">📄 PDF</button>
                <button class="tp-btn-secondary" onclick="window.LM_TripUI.shareTrip('${trip.id}')" title="Copy WhatsApp Formatted Itinerary">💬 WhatsApp</button>
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
                    </div>
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
                                ${mapUrl ? `<a class="tp-icon-btn" href="${mapUrl}" target="_blank" rel="noopener noreferrer" title="Navigate on Google Maps">🧭</a>` : ''}
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
    // 7. TAB 5: GROUP BILL SPLIT, UPI DEEP-LINK & QR SETTLEMENTS
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
      `;
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

            <!-- SPLIT OPTIONS & CUSTOM SHARES -->
            <div class="tp-split-section" style="background:rgba(255, 255, 255, 0.03); border:1px solid rgba(255, 255, 255, 0.08); border-radius:10px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                <label class="text-xs font-semibold text-muted" style="margin:0;">Split Between Travelers</label>
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

            <!-- SPLIT OPTIONS & CUSTOM SHARES -->
            <div class="tp-split-section" style="background:rgba(255, 255, 255, 0.03); border:1px solid rgba(255, 255, 255, 0.08); border-radius:10px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
                <label class="text-xs font-semibold text-muted" style="margin:0;">Split Between Travelers</label>
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
      window.print();
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
    }
  };

  window.LM_TripUI = TripUI;
})();
