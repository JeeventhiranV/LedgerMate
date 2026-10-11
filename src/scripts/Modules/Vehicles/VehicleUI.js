/**
 * LedgerMate – VehicleUI.js
 * ─────────────────────────────────────────────────────────────
 * Bike & Vehicle Tracking User Interface Layer.
 * Renders the vehicle management dashboard inside #page-vehicles,
 * multi-vehicle garage switcher, hero vehicle card, engine oil health gauge,
 * service roadmap checklist, insurance & PUC alerts, fuel mileage tracker,
 * maintenance history timeline, and benchmark recommendation explorer.
 *
 * Exposes: window.LM_VehicleUI
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _activeVehicleId = null;
  var _activeTab = 'overview'; // overview, maintenance, fuel, benchmarks

  function _esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _fmtINR(n) {
    var num = Number(n) || 0;
    return '₹' + Math.round(num).toLocaleString('en-IN');
  }

  function _getService() {
    return window.LM_VehicleService;
  }

  var VehicleUI = {
    /**
     * Set active vehicle
     */
    setActiveVehicle: function (id) {
      _activeVehicleId = id;
      this.render();
    },

    /**
     * Switch sub-tab
     */
    setTab: function (tab) {
      _activeTab = tab;
      this.render();
    },

    /**
     * Main page renderer for #page-vehicles
     */
    render: function () {
      var container = document.getElementById('page-vehicles');
      if (!container) return;

      var service = _getService();
      if (!service) {
        container.innerHTML = '<div class="p-8 text-center text-gray-400">Loading Vehicle Tracking module...</div>';
        return;
      }

      var vehicles = service.getAllVehicles();
      if (!vehicles || vehicles.length === 0) {
        this.renderEmptyState(container);
        return;
      }

      // Default active vehicle
      if (!_activeVehicleId || !vehicles.some(function (v) { return v.id === _activeVehicleId; })) {
        _activeVehicleId = vehicles[0].id;
      }

      var activeVehicle = service.getVehicleById(_activeVehicleId) || vehicles[0];
      var oilInfo = service.calculateOilHealth(activeVehicle);
      var srvInfo = service.calculateServiceDue(activeVehicle);
      var insInfo = service.calculateInsuranceStatus(activeVehicle);
      var pucInfo = service.calculatePucStatus(activeVehicle);
      var benchmark = service.getBenchmark(activeVehicle.type);

      var html = `
        <div class="vehicles-dashboard-container" style="max-width:1120px;margin:0 auto;padding:16px 14px 40px;">
          <!-- ── GARAGE SWITCHER & HEADER ── -->
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
            <div>
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="font-size:26px;">🏍️</span>
                <h1 style="font-size:22px;font-weight:800;color:var(--text,#f8fafc);margin:0;letter-spacing:-0.02em;">
                  Bike &amp; Vehicle Garage
                </h1>
              </div>
              <div style="font-size:12px;color:var(--text3,#94a3b8);margin-top:2px;">
                Maintenance intervals, engine oil health, insurance renewals &amp; mileage tracking
              </div>
            </div>

            <div style="display:flex;align-items:center;gap:8px;">
              <button class="btn-secondary" style="font-size:12px;padding:6px 14px;border-radius:10px;" onclick="window.LM_VehicleUI.openAddEditVehicleModal()">
                + Add Vehicle
              </button>
            </div>
          </div>

          <!-- Vehicle Selector Pills -->
          <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;margin-bottom:18px;-webkit-overflow-scrolling:touch;">
            ${vehicles.map(function (v) {
              var isActive = v.id === activeVehicle.id;
              var icon = v.type === 'scooter' ? '🛵' : (v.type === 'electric' ? '⚡' : (v.type === 'car' ? '🚗' : '🏍️'));
              return `
                <button onclick="window.LM_VehicleUI.setActiveVehicle('${v.id}')"
                  style="display:flex;align-items:center;gap:7px;padding:7px 14px;border-radius:20px;font-size:13px;font-weight:600;white-space:nowrap;transition:all 0.2s ease;cursor:pointer;
                    ${isActive 
                      ? 'background:linear-gradient(135deg,#0284c7,#0369a1);color:#fff;border:1px solid #38bdf8;box-shadow:0 4px 12px rgba(2,132,199,0.3);' 
                      : 'background:rgba(255,255,255,0.05);color:var(--text2,#cbd5e1);border:1px solid rgba(255,255,255,0.1);'}">
                  <span>${icon}</span>
                  <span>${_esc(v.name)}</span>
                  ${v.regNumber ? `<span style="font-size:10px;padding:1px 6px;border-radius:6px;background:rgba(0,0,0,0.3);font-family:'JetBrains Mono',monospace;">${_esc(v.regNumber)}</span>` : ''}
                </button>
              `;
            }).join('')}
          </div>

          <!-- ── HERO VEHICLE BANNER CARD ── -->
          <div class="card" style="background:linear-gradient(145deg,rgba(15,23,42,0.85),rgba(30,41,59,0.7));border:1px solid var(--border,#334155);border-radius:18px;padding:20px;margin-bottom:20px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);position:relative;overflow:hidden;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;">
              <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:62px;height:62px;border-radius:16px;background:rgba(56,189,248,0.12);border:1px solid rgba(56,189,248,0.25);display:flex;align-items:center;justify-content:center;font-size:32px;">
                  ${activeVehicle.type === 'scooter' ? '🛵' : (activeVehicle.type === 'electric' ? '⚡' : (activeVehicle.type === 'car' ? '🚗' : '🏍️'))}
                </div>
                <div>
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <h2 style="font-size:20px;font-weight:800;color:var(--text,#fff);margin:0;">${_esc(activeVehicle.name)}</h2>
                    ${activeVehicle.regNumber ? `
                      <span style="display:inline-flex;align-items:center;background:#fff;color:#000;border:1.5px solid #000;border-radius:4px;padding:1px 7px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:900;letter-spacing:0.5px;">
                        <span style="color:#0033cc;font-size:8px;margin-right:4px;">IND</span>${_esc(activeVehicle.regNumber)}
                      </span>
                    ` : ''}
                  </div>
                  <div style="font-size:12.5px;color:var(--text3,#94a3b8);margin-top:3px;">
                    ${_esc(activeVehicle.brand || '')} ${_esc(activeVehicle.model || '')} ${activeVehicle.year ? '· ' + activeVehicle.year : ''} ${activeVehicle.engineCC ? '· ' + activeVehicle.engineCC + 'cc' : ''}
                  </div>
                </div>
              </div>

              <!-- Odometer Pill & Quick Update -->
              <div style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:8px 14px;">
                <div>
                  <div style="font-size:10px;color:var(--text3,#94a3b8);text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Current Odometer</div>
                  <div style="font-size:18px;font-weight:900;color:var(--text,#f8fafc);font-family:'JetBrains Mono',monospace;">
                    ${(activeVehicle.currentOdometer || 0).toLocaleString('en-IN')} <span style="font-size:12px;font-weight:600;color:var(--text3,#94a3b8);">KM</span>
                  </div>
                </div>
                <button class="btn-secondary" style="font-size:11px;padding:5px 10px;border-radius:8px;" onclick="window.LM_VehicleUI.openUpdateOdometerModal('${activeVehicle.id}')" title="Quick Update Odometer">
                  ✏️ Edit
                </button>
              </div>
            </div>

            <!-- Quick Action Bar -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;border-top:1px solid rgba(255,255,255,0.07);padding-top:14px;">
              <button class="btn-primary" style="font-size:12px;padding:6px 14px;border-radius:10px;" onclick="window.LM_VehicleUI.openLogServiceModal('${activeVehicle.id}', 'oil_change')">
                🛢️ Log Oil Change
              </button>
              <button class="btn-secondary" style="font-size:12px;padding:6px 14px;border-radius:10px;" onclick="window.LM_VehicleUI.openLogServiceModal('${activeVehicle.id}', 'general_service')">
                🔧 Log Service
              </button>
              <button class="btn-secondary" style="font-size:12px;padding:6px 14px;border-radius:10px;" onclick="window.LM_VehicleUI.openLogFuelModal('${activeVehicle.id}')">
                ⛽ Add Fuel Fill
              </button>
              <button class="btn-secondary" style="font-size:12px;padding:6px 14px;border-radius:10px;" onclick="window.LM_VehicleUI.openAddEditVehicleModal('${activeVehicle.id}')">
                ⚙️ Vehicle Settings
              </button>
              <button class="btn-danger" style="font-size:12px;padding:6px 12px;border-radius:10px;margin-left:auto;" onclick="window.LM_VehicleUI.openDeleteConfirmModal('${activeVehicle.id}')" title="Delete Vehicle">
                🗑️
              </button>
            </div>
          </div>

          <!-- ── 4 CORE STATUS CARDS (GRID) ── -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px;margin-bottom:24px;">

            <!-- 1. ENGINE OIL HEALTH CARD -->
            <div class="card" style="background:rgba(15,23,42,0.65);border:1px solid ${oilInfo.isOverdue ? '#f43f5e' : (oilInfo.isDueSoon ? '#fbbf24' : 'var(--border,#334155)')};border-radius:16px;padding:16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">🛢️</span>
                  <strong style="font-size:14px;color:var(--text,#fff);">Engine Oil Health</strong>
                </div>
                <span class="v-badge ${oilInfo.isOverdue ? 'v-badge-danger' : (oilInfo.isDueSoon ? 'v-badge-warning' : 'v-badge-success')}">
                  ${oilInfo.isOverdue ? '🚨 OVERDUE' : (oilInfo.isDueSoon ? '⏳ DUE SOON' : '✅ HEALTHY')}
                </span>
              </div>

              <!-- Health Progress Bar -->
              <div style="margin:12px 0 6px;">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;color:var(--text2,#cbd5e1);">
                  <span>Oil Life Remaining</span>
                  <strong style="color:${oilInfo.percentRemaining < 20 ? '#f43f5e' : (oilInfo.percentRemaining < 40 ? '#fbbf24' : '#10b981')};">
                    ${oilInfo.percentRemaining}%
                  </strong>
                </div>
                <div style="height:8px;border-radius:4px;background:rgba(255,255,255,0.08);overflow:hidden;">
                  <div style="height:100%;width:${oilInfo.percentRemaining}%;background:${oilInfo.percentRemaining < 20 ? '#f43f5e' : (oilInfo.percentRemaining < 40 ? '#fbbf24' : '#10b981')};transition:width 0.4s ease;"></div>
                </div>
              </div>

              <div style="font-size:12px;color:var(--text3,#94a3b8);line-height:1.6;margin-top:8px;">
                <div>Remaining: <strong style="color:var(--text,#fff);">${oilInfo.kmRemaining <= 0 ? '0 km (' + Math.abs(oilInfo.kmRemaining) + ' km past due)' : oilInfo.kmRemaining.toLocaleString('en-IN') + ' km'}</strong></div>
                <div>Target Odo: <strong style="color:var(--text,#fff);">${oilInfo.targetOdometer.toLocaleString('en-IN')} km</strong></div>
                ${oilInfo.targetDate ? `<div>Due Forecast: <strong style="color:var(--text,#fff);">${oilInfo.targetDate}</strong></div>` : ''}
                <div style="font-size:11px;margin-top:4px;color:var(--text3,#94a3b8);">Spec: ${_esc(oilInfo.grade || benchmark.oilTypeLabel)}</div>
              </div>
            </div>

            <!-- 2. INSURANCE EXPIRY CARD -->
            <div class="card" style="background:rgba(15,23,42,0.65);border:1px solid ${insInfo.isExpired ? '#f43f5e' : (insInfo.isExpiringSoon ? '#fbbf24' : 'var(--border,#334155)')};border-radius:16px;padding:16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">🛡️</span>
                  <strong style="font-size:14px;color:var(--text,#fff);">Insurance Policy</strong>
                </div>
                <span class="v-badge ${!insInfo.hasPolicy ? 'v-badge-neutral' : (insInfo.isExpired ? 'v-badge-danger' : (insInfo.isExpiringSoon ? 'v-badge-warning' : 'v-badge-success'))}">
                  ${!insInfo.hasPolicy ? 'NO POLICY' : (insInfo.isExpired ? '🚨 EXPIRED' : (insInfo.isExpiringSoon ? '⏳ EXPIRING SOON' : '✅ ACTIVE'))}
                </span>
              </div>

              ${insInfo.hasPolicy ? `
                <div style="font-size:12px;color:var(--text3,#94a3b8);line-height:1.6;margin-top:6px;">
                  <div>Provider: <strong style="color:var(--text,#fff);">${_esc(insInfo.provider)}</strong></div>
                  ${insInfo.policyNumber ? `<div>Policy #: <strong style="color:var(--text,#fff);font-family:'JetBrains Mono';">${_esc(insInfo.policyNumber)}</strong></div>` : ''}
                  <div>Expires: <strong style="color:var(--text,#fff);">${insInfo.expiryDate}</strong></div>
                  <div style="margin-top:6px;font-size:13px;font-weight:700;color:${insInfo.isExpired ? '#f43f5e' : (insInfo.isExpiringSoon ? '#fbbf24' : '#10b981')};">
                    ${insInfo.isExpired ? 'Expired ' + Math.abs(insInfo.daysRemaining) + ' days ago!' : insInfo.daysRemaining + ' days remaining'}
                  </div>
                </div>
              ` : `
                <div style="padding:16px 0;text-align:center;font-size:12px;color:var(--text3,#94a3b8);">
                  No policy on file.<br/>Add policy details to get expiry alerts.
                </div>
              `}
            </div>

            <!-- 3. PERIODIC SERVICE CARD -->
            <div class="card" style="background:rgba(15,23,42,0.65);border:1px solid ${srvInfo.isOverdue ? '#f43f5e' : (srvInfo.isDueSoon ? '#fbbf24' : 'var(--border,#334155)')};border-radius:16px;padding:16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">🔧</span>
                  <strong style="font-size:14px;color:var(--text,#fff);">General Service</strong>
                </div>
                <span class="v-badge ${srvInfo.isOverdue ? 'v-badge-danger' : (srvInfo.isDueSoon ? 'v-badge-warning' : 'v-badge-success')}">
                  ${srvInfo.isOverdue ? '🚨 OVERDUE' : (srvInfo.isDueSoon ? '⏳ DUE SOON' : '✅ ON TRACK')}
                </span>
              </div>

              <div style="font-size:12px;color:var(--text3,#94a3b8);line-height:1.6;margin-top:6px;">
                <div>Target Odo: <strong style="color:var(--text,#fff);">${srvInfo.targetOdometer.toLocaleString('en-IN')} km</strong></div>
                <div>Due In: <strong style="color:var(--text,#fff);">${srvInfo.kmRemaining <= 0 ? '0 km (past due)' : srvInfo.kmRemaining.toLocaleString('en-IN') + ' km'}</strong></div>
                ${srvInfo.targetDate ? `<div>Date Due: <strong style="color:var(--text,#fff);">${srvInfo.targetDate}</strong></div>` : ''}
                ${activeVehicle.service?.serviceCenter ? `<div>Center: <strong style="color:var(--text,#fff);">${_esc(activeVehicle.service.serviceCenter)}</strong></div>` : ''}
              </div>
            </div>

            <!-- 4. PUC & TYRE PRESSURE CARD -->
            <div class="card" style="background:rgba(15,23,42,0.65);border:1px solid ${pucInfo.isExpired ? '#f43f5e' : (pucInfo.isExpiringSoon ? '#fbbf24' : 'var(--border,#334155)')};border-radius:16px;padding:16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:20px;">💨</span>
                  <strong style="font-size:14px;color:var(--text,#fff);">PUC &amp; Tyre Specs</strong>
                </div>
                <span class="v-badge ${!pucInfo.hasPuc ? 'v-badge-neutral' : (pucInfo.isExpired ? 'v-badge-danger' : 'v-badge-success')}">
                  ${!pucInfo.hasPuc ? 'NO PUC' : (pucInfo.isExpired ? '🚨 PUC EXPIRED' : '✅ PUC OK')}
                </span>
              </div>

              <div style="font-size:12px;color:var(--text3,#94a3b8);line-height:1.6;margin-top:6px;">
                <div>PUC Expiry: <strong style="color:var(--text,#fff);">${pucInfo.hasPuc ? pucInfo.expiryDate : 'Not set'}</strong></div>
                <div style="margin-top:6px;display:flex;gap:12px;">
                  <div style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:8px;">
                    <span style="font-size:10px;display:block;">Front Tyre</span>
                    <strong style="font-size:13px;color:#38bdf8;">${activeVehicle.tyres?.frontPressurePsi || benchmark.tyrePressureFront} PSI</strong>
                  </div>
                  <div style="background:rgba(255,255,255,0.05);padding:4px 8px;border-radius:8px;">
                    <span style="font-size:10px;display:block;">Rear Tyre</span>
                    <strong style="font-size:13px;color:#38bdf8;">${activeVehicle.tyres?.rearPressurePsi || benchmark.tyrePressureRear} PSI</strong>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- ── SUB-TABS NAVIGATION ── -->
          <div style="display:flex;gap:8px;border-bottom:1px solid var(--border,#334155);margin-bottom:18px;">
            <button onclick="window.LM_VehicleUI.setTab('overview')"
              style="padding:8px 16px;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;
                color:${_activeTab === 'overview' ? '#38bdf8' : 'var(--text3,#94a3b8)'};
                border-bottom:2px solid ${_activeTab === 'overview' ? '#38bdf8' : 'transparent'};">
              📋 Service Checklist
            </button>
            <button onclick="window.LM_VehicleUI.setTab('maintenance')"
              style="padding:8px 16px;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;
                color:${_activeTab === 'maintenance' ? '#38bdf8' : 'var(--text3,#94a3b8)'};
                border-bottom:2px solid ${_activeTab === 'maintenance' ? '#38bdf8' : 'transparent'};">
              🔧 Service History (${(activeVehicle.logs || []).length})
            </button>
            <button onclick="window.LM_VehicleUI.setTab('fuel')"
              style="padding:8px 16px;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;
                color:${_activeTab === 'fuel' ? '#38bdf8' : 'var(--text3,#94a3b8)'};
                border-bottom:2px solid ${_activeTab === 'fuel' ? '#38bdf8' : 'transparent'};">
              ⛽ Fuel &amp; Mileage (${(activeVehicle.fuelLogs || []).length})
            </button>
            <button onclick="window.LM_VehicleUI.setTab('benchmarks')"
              style="padding:8px 16px;font-size:13px;font-weight:700;border:none;background:none;cursor:pointer;
                color:${_activeTab === 'benchmarks' ? '#38bdf8' : 'var(--text3,#94a3b8)'};
                border-bottom:2px solid ${_activeTab === 'benchmarks' ? '#38bdf8' : 'transparent'};">
              📖 Recommended Presets
            </button>
          </div>

          <!-- ── TAB CONTENT ── -->
          ${this.renderTabContent(activeVehicle, benchmark)}

        </div>
      `;

      container.innerHTML = html;
    },

    /**
     * Render active sub-tab
     */
    renderTabContent: function (vehicle, benchmark) {
      if (_activeTab === 'maintenance') {
        return this.renderMaintenanceTab(vehicle);
      } else if (_activeTab === 'fuel') {
        return this.renderFuelTab(vehicle);
      } else if (_activeTab === 'benchmarks') {
        return this.renderBenchmarksTab();
      } else {
        return this.renderChecklistTab(vehicle, benchmark);
      }
    },

    /**
     * Checklist & Roadmap Tab
     */
    renderChecklistTab: function (vehicle, benchmark) {
      var checklist = benchmark.checklist || [];
      return `
        <div class="card" style="background:rgba(15,23,42,0.5);border:1px solid var(--border,#334155);border-radius:16px;padding:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <div>
              <h3 style="font-size:15px;font-weight:700;color:var(--text,#fff);margin:0;">
                Recommended ${benchmark.label} Service Checklist
              </h3>
              <div style="font-size:12px;color:var(--text3,#94a3b8);margin-top:2px;">
                Key inspections recommended every <strong>${benchmark.serviceIntervalKm.toLocaleString('en-IN')} km</strong> or <strong>${benchmark.serviceIntervalMonths} months</strong>
              </div>
            </div>
            <button class="btn-primary" style="font-size:11px;padding:6px 12px;border-radius:8px;" onclick="window.LM_VehicleUI.openLogServiceModal('${vehicle.id}', 'general_service')">
              + Log Service Complete
            </button>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;">
            ${checklist.map(function (item) {
              return `
                <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.03);padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.05);">
                  <span style="color:#10b981;font-size:16px;">✓</span>
                  <span style="font-size:12.5px;color:var(--text,#f8fafc);">${_esc(item)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    },

    /**
     * Maintenance & Service History Tab
     */
    renderMaintenanceTab: function (vehicle) {
      var logs = vehicle.logs || [];
      var totalSpent = logs.reduce(function (sum, l) { return sum + (Number(l.cost) || 0); }, 0);
      var oilChangeCount = logs.filter(function (l) { return l.type === 'oil_change'; }).length;
      var generalServiceCount = logs.filter(function (l) { return l.type === 'general_service'; }).length;

      return `
        <div class="card" style="background:rgba(15,23,42,0.5);border:1px solid var(--border,#334155);border-radius:16px;padding:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <div>
              <h3 style="font-size:15px;font-weight:700;color:var(--text,#fff);margin:0;">🔧 Service &amp; Repair History</h3>
              <div style="font-size:12px;color:var(--text3,#94a3b8);margin-top:2px;">Complete record of maintenance, oil replacements, repairs, and expenditures</div>
            </div>
            <button class="btn-primary" style="font-size:11px;padding:6px 14px;border-radius:8px;" onclick="window.LM_VehicleUI.openLogServiceModal('${vehicle.id}')">
              + Log Service / Oil Change
            </button>
          </div>

          <!-- Maintenance Expenditure Summary -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:18px;">
            <div style="background:rgba(56,189,248,0.06);border:1px solid rgba(56,189,248,0.2);padding:12px;border-radius:12px;">
              <div style="font-size:10.5px;color:var(--text3,#94a3b8);text-transform:uppercase;font-weight:600;">Total Maintenance Spent</div>
              <div style="font-size:18px;font-weight:800;color:#38bdf8;margin-top:3px;">${_fmtINR(totalSpent)}</div>
            </div>
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);padding:12px;border-radius:12px;">
              <div style="font-size:10.5px;color:var(--text3,#94a3b8);text-transform:uppercase;font-weight:600;">Services Logged</div>
              <div style="font-size:18px;font-weight:800;color:var(--text,#fff);margin-top:3px;">${logs.length} <span style="font-size:11px;font-weight:500;color:var(--text3,#94a3b8);">records</span></div>
            </div>
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);padding:12px;border-radius:12px;">
              <div style="font-size:10.5px;color:var(--text3,#94a3b8);text-transform:uppercase;font-weight:600;">Oil Changes</div>
              <div style="font-size:18px;font-weight:800;color:#fbbf24;margin-top:3px;">${oilChangeCount} <span style="font-size:11px;font-weight:500;color:var(--text3,#94a3b8);">times</span></div>
            </div>
            <div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);padding:12px;border-radius:12px;">
              <div style="font-size:10.5px;color:var(--text3,#94a3b8);text-transform:uppercase;font-weight:600;">General Services</div>
              <div style="font-size:18px;font-weight:800;color:#34d399;margin-top:3px;">${generalServiceCount} <span style="font-size:11px;font-weight:500;color:var(--text3,#94a3b8);">times</span></div>
            </div>
          </div>

          ${logs.length === 0 ? `
            <div style="padding:36px;text-align:center;color:var(--text3,#94a3b8);font-size:13px;background:rgba(255,255,255,0.01);border-radius:12px;border:1px dashed var(--border,#334155);">
              <span style="font-size:32px;display:block;margin-bottom:8px;">🛠️</span>
              No maintenance logs recorded yet.<br/>
              <span style="font-size:11.5px;color:var(--text3);">Click <strong>"+ Log Service / Oil Change"</strong> above to record oil changes, periodic services, repairs, and receipts.</span>
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:10px;">
              ${logs.map(function (l) {
                var typeIcon = l.type === 'oil_change' ? '🛢️' : (l.type === 'insurance' ? '🛡️' : (l.type === 'tyre' ? '💨' : (l.type === 'puc' ? '🌿' : '🔧')));
                var typeLabel = l.type === 'oil_change' ? 'Oil Change' : (l.type === 'insurance' ? 'Insurance' : (l.type === 'tyre' ? 'Tyres' : (l.type === 'puc' ? 'PUC' : (l.type === 'repair' ? 'Repair' : 'General Service'))));
                var parts = Array.isArray(l.partsReplaced) ? l.partsReplaced : [];

                return `
                  <div style="display:flex;align-items:flex-start;justify-content:space-between;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);padding:14px 16px;border-radius:12px;flex-wrap:wrap;gap:12px;">
                    <div style="display:flex;align-items:flex-start;gap:12px;flex:1;min-width:240px;">
                      <div style="width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">
                        ${typeIcon}
                      </div>
                      <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                          <span style="font-size:14px;font-weight:700;color:var(--text,#fff);">${_esc(l.title)}</span>
                          <span style="font-size:10px;padding:2px 7px;border-radius:6px;background:rgba(255,255,255,0.06);color:var(--text2,#cbd5e1);font-weight:600;">${typeLabel}</span>
                        </div>
                        <div style="font-size:11.5px;color:var(--text3,#94a3b8);margin-top:4px;">
                          📅 ${l.date} ${l.odometer ? ' · ⏱️ ' + l.odometer.toLocaleString('en-IN') + ' km' : ''} ${l.workshop ? ' · 🏢 ' + _esc(l.workshop) : ''}
                        </div>
                        ${l.notes ? `<div style="font-size:12px;color:var(--text2,#cbd5e1);margin-top:6px;line-height:1.4;">${_esc(l.notes)}</div>` : ''}
                        ${parts.length > 0 ? `
                          <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;">
                            ${parts.map(function(p){ return `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.25);">⚙️ ${_esc(p)}</span>`; }).join('')}
                          </div>
                        ` : ''}
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
                      ${l.cost > 0 ? `<div style="text-align:right;"><div style="font-size:15px;font-weight:800;color:#38bdf8;">${_fmtINR(l.cost)}</div><div style="font-size:9.5px;color:var(--text3,#94a3b8);">Expenditure</div></div>` : '<span style="font-size:11px;color:var(--text3,#94a3b8);">Free / DIY</span>'}
                      <button class="btn-secondary" style="font-size:11px;padding:4px 8px;color:#f43f5e;border-color:rgba(244,63,94,0.3);border-radius:6px;" title="Delete Log" onclick="window.LM_VehicleUI.deleteServiceLog('${vehicle.id}', '${l.id}')">✕</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;
    },

    /**
     * Fuel & Mileage Tab
     */
    renderFuelTab: function (vehicle) {
      var fuelLogs = vehicle.fuelLogs || [];

      // Calculate averages
      var totalSpent = fuelLogs.reduce(function (sum, f) { return sum + (Number(f.cost) || 0); }, 0);
      var totalLiters = fuelLogs.reduce(function (sum, f) { return sum + (Number(f.liters) || 0); }, 0);
      var validMileageLogs = fuelLogs.filter(function (f) { return Number(f.calculatedKmPerLiter) > 0; });
      var avgMileage = validMileageLogs.length > 0 
        ? (validMileageLogs.reduce(function (s, f) { return s + f.calculatedKmPerLiter; }, 0) / validMileageLogs.length).toFixed(1)
        : 'N/A';

      return `
        <div class="card" style="background:rgba(15,23,42,0.5);border:1px solid var(--border,#334155);border-radius:16px;padding:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
            <div>
              <h3 style="font-size:15px;font-weight:700;color:var(--text,#fff);margin:0;">Fuel Fills &amp; Mileage Tracking</h3>
              <div style="font-size:12px;color:var(--text3,#94a3b8);margin-top:2px;">Track petrol consumption and actual running economy</div>
            </div>
            <button class="btn-primary" style="font-size:11px;padding:6px 14px;border-radius:8px;" onclick="window.LM_VehicleUI.openLogFuelModal('${vehicle.id}')">
              + Log Fuel Fill
            </button>
          </div>

          <!-- Mileage KPI Summary -->
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px;">
            <div style="background:rgba(0,0,0,0.3);padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:11px;color:var(--text3,#94a3b8);text-transform:uppercase;font-weight:700;">Average Mileage</div>
              <div style="font-size:20px;font-weight:900;color:#10b981;font-family:'JetBrains Mono';margin-top:3px;">
                ${avgMileage} <span style="font-size:12px;color:var(--text3,#94a3b8);">KM/L</span>
              </div>
            </div>
            <div style="background:rgba(0,0,0,0.3);padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:11px;color:var(--text3,#94a3b8);text-transform:uppercase;font-weight:700;">Total Fuel Spend</div>
              <div style="font-size:20px;font-weight:900;color:#38bdf8;font-family:'JetBrains Mono';margin-top:3px;">
                ${_fmtINR(totalSpent)}
              </div>
            </div>
            <div style="background:rgba(0,0,0,0.3);padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);">
              <div style="font-size:11px;color:var(--text3,#94a3b8);text-transform:uppercase;font-weight:700;">Total Liters</div>
              <div style="font-size:20px;font-weight:900;color:var(--text,#fff);font-family:'JetBrains Mono';margin-top:3px;">
                ${totalLiters.toFixed(1)} <span style="font-size:12px;color:var(--text3,#94a3b8);">L</span>
              </div>
            </div>
          </div>

          <!-- Logs List -->
          ${fuelLogs.length === 0 ? `
            <div style="padding:30px;text-align:center;color:var(--text3,#94a3b8);font-size:13px;">
              No fuel logs yet. Log consecutive tank fills to automatically compute your exact km/L!
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${fuelLogs.map(function (f) {
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);padding:10px 14px;border-radius:10px;flex-wrap:wrap;gap:8px;">
                    <div>
                      <div style="font-size:13px;font-weight:700;color:var(--text,#fff);">
                        ${f.liters} Liters ${_fmtINR(f.cost)} ${f.isFullTank ? '<span class="v-badge v-badge-success" style="font-size:9px;padding:1px 6px;">Full Tank</span>' : ''}
                      </div>
                      <div style="font-size:11.5px;color:var(--text3,#94a3b8);margin-top:2px;">
                        ${f.date} · Odo: ${f.odometer ? f.odometer.toLocaleString('en-IN') + ' km' : 'N/A'} ${f.fuelStation ? '· ' + _esc(f.fuelStation) : ''}
                      </div>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;">
                      ${f.calculatedKmPerLiter > 0 ? `
                        <div style="text-align:right;">
                          <div style="font-size:13px;font-weight:800;color:#10b981;font-family:'JetBrains Mono';">${f.calculatedKmPerLiter} km/L</div>
                          ${f.calculatedCostPerKm > 0 ? `<div style="font-size:10px;color:var(--text3,#94a3b8);">₹${f.calculatedCostPerKm}/km</div>` : ''}
                        </div>
                      ` : ''}
                      <button class="btn-secondary" style="font-size:10px;padding:3px 8px;border-radius:6px;" onclick="window.LM_VehicleUI.deleteFuelLog('${vehicle.id}', '${f.id}')">✕</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;
    },

    /**
     * Recommended Presets & Benchmarks Tab
     */
    renderBenchmarksTab: function () {
      var service = _getService();
      var presets = service.getBenchmarkPresets();

      return `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;">
          ${Object.values(presets).map(function (b) {
            return `
              <div class="card" style="background:rgba(15,23,42,0.6);border:1px solid var(--border,#334155);border-radius:16px;padding:18px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                  <span style="font-size:26px;">${b.icon}</span>
                  <div>
                    <h4 style="font-size:15px;font-weight:800;color:var(--text,#fff);margin:0;">${b.label}</h4>
                    <div style="font-size:11px;color:var(--text3,#94a3b8);">${b.subtitle}</div>
                  </div>
                </div>

                <div style="background:rgba(0,0,0,0.25);border-radius:10px;padding:10px 12px;font-size:12px;line-height:1.7;color:var(--text2,#cbd5e1);margin-bottom:12px;">
                  <div>🛢️ <strong>Oil Spec:</strong> ${b.oilTypeLabel}</div>
                  <div>⏳ <strong>Oil Interval:</strong> Every ${b.oilIntervalKm.toLocaleString('en-IN')} km or ${b.oilIntervalMonths} months</div>
                  <div>🔧 <strong>Service Interval:</strong> Every ${b.serviceIntervalKm.toLocaleString('en-IN')} km or ${b.serviceIntervalMonths} months</div>
                  <div>💨 <strong>Tyre Pressure:</strong> ${b.tyrePressureFront} PSI Front / ${b.tyrePressureRear} PSI Rear</div>
                  ${b.avgMileageKmpl > 0 ? `<div>⛽ <strong>Typical Economy:</strong> ~${b.avgMileageKmpl} km/L</div>` : ''}
                </div>

                <div style="font-size:11.5px;color:var(--text3,#94a3b8);">
                  <strong style="color:var(--text,#fff);display:block;margin-bottom:4px;">Maintenance Focus:</strong>
                  <ul style="padding-left:16px;margin:0;line-height:1.5;">
                    ${(b.checklist || []).slice(0, 3).map(function (c) { return `<li>${_esc(c)}</li>`; }).join('')}
                  </ul>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    },

    /**
     * Render friendly empty state when no vehicles exist yet
     */
    renderEmptyState: function (container) {
      container.innerHTML = `
        <div style="max-width:680px;margin:40px auto;text-align:center;padding:24px;">
          <div style="font-size:64px;margin-bottom:16px;">🏍️</div>
          <h2 style="font-size:24px;font-weight:800;color:var(--text,#fff);margin-bottom:8px;">
            Bike &amp; Vehicle Tracking
          </h2>
          <p style="font-size:14px;color:var(--text3,#94a3b8);line-height:1.6;margin-bottom:24px;">
            Track your motorcycle or scooty maintenance effortlessly in LedgerMate.<br/>
            Get engine oil change countdowns, service interval roadmaps, insurance expiry alerts, and fuel mileage calculations.
          </p>

          <button class="btn-primary" style="font-size:14px;padding:12px 28px;border-radius:12px;box-shadow:0 4px 16px rgba(0,240,255,0.3);" onclick="window.LM_VehicleUI.openAddEditVehicleModal()">
            + Add Your Bike or Scooty
          </button>

          <div style="margin-top:36px;border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;text-align:left;">
            <div style="font-size:12px;text-transform:uppercase;color:var(--text3,#94a3b8);font-weight:700;margin-bottom:12px;">Quick Presets Supported:</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span class="v-badge v-badge-success">🛵 Scooters (Activa, Jupiter, Access)</span>
              <span class="v-badge v-badge-success">🏍️ Commuter (Splendor, Shine, Platina)</span>
              <span class="v-badge v-badge-success">🏍️ Cruiser (Classic 350, Hunter)</span>
              <span class="v-badge v-badge-success">🏍️ Performance (MT-15, R15, Duke)</span>
              <span class="v-badge v-badge-success">⚡ Electric (Ather, Ola, iQube)</span>
            </div>
          </div>
        </div>
      `;
    },

    // ── MODALS ───────────────────────────────────────────────────────────────

    /**
     * Open Add/Edit Vehicle Modal
     */
    openAddEditVehicleModal: function (vehicleId) {
      var service = _getService();
      var v = vehicleId ? service.getVehicleById(vehicleId) : null;
      var isEdit = !!v;
      var curType = v?.type || 'commuter';

      var existing = document.getElementById('vehicleFormModal');
      if (existing) existing.remove();

      var modal = document.createElement('div');
      modal.id = 'vehicleFormModal';
      modal.className = 'modal-overlay show';
      modal.onclick = function (e) {
        if (e.target === modal) modal.remove();
      };

      var escHandler = function (e) {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      modal.innerHTML = `
        <div class="modal loan-modal-box" style="max-width:620px;" onclick="event.stopPropagation()">
          <div class="loan-modal-header">
            <div class="loan-modal-header-icon">${isEdit ? '✏️' : '🏍️'}</div>
            <div class="loan-modal-header-text">
              <h3 class="loan-modal-title">${isEdit ? 'Edit Vehicle Details' : 'Add New Vehicle'}</h3>
              <p class="loan-modal-subtitle">${isEdit ? 'Update specifications, service baselines & reminder dates' : 'Track maintenance intervals, engine oil, fuel & reminders'}</p>
            </div>
            <button type="button" class="loan-modal-close-btn" onclick="document.getElementById('vehicleFormModal')?.remove()">×</button>
          </div>
          <div class="modal-body loan-modal-body">
            <form id="vehicleForm" onsubmit="event.preventDefault(); window.LM_VehicleUI.saveVehicleForm('${vehicleId || ''}');">
              
              <!-- 1. Hero Vehicle Type Selection -->
              <div class="loan-form-section">
                <label class="loan-form-label">SELECT VEHICLE TYPE *</label>
                <div class="loan-type-grid" style="grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; margin-bottom: 16px;">
                  <div class="loan-type-card ${curType === 'scooter' ? 'active' : ''}" data-type="scooter" onclick="window.LM_VehicleUI.selectVehicleType('scooter')">
                    <div class="loan-type-card-radio"></div>
                    <div class="loan-type-card-icon">🛵</div>
                    <div class="loan-type-card-info">
                      <div class="loan-type-card-title">Scooter / Scooty</div>
                      <div class="loan-type-card-sub">Activa, Jupiter, Access, Ntorq</div>
                    </div>
                  </div>
                  <div class="loan-type-card ${curType === 'commuter' ? 'active' : ''}" data-type="commuter" onclick="window.LM_VehicleUI.selectVehicleType('commuter')">
                    <div class="loan-type-card-radio"></div>
                    <div class="loan-type-card-icon">🏍️</div>
                    <div class="loan-type-card-info">
                      <div class="loan-type-card-title">Commuter Motorcycle</div>
                      <div class="loan-type-card-sub">Splendor, Shine, Platina, Pulsar</div>
                    </div>
                  </div>
                  <div class="loan-type-card ${curType === 'cruiser' ? 'active' : ''}" data-type="cruiser" onclick="window.LM_VehicleUI.selectVehicleType('cruiser')">
                    <div class="loan-type-card-radio"></div>
                    <div class="loan-type-card-icon">🏍️</div>
                    <div class="loan-type-card-info">
                      <div class="loan-type-card-title">Cruiser / Classic</div>
                      <div class="loan-type-card-sub">Classic 350, Hunter, H'ness CB350</div>
                    </div>
                  </div>
                  <div class="loan-type-card ${curType === 'sports' ? 'active' : ''}" data-type="sports" onclick="window.LM_VehicleUI.selectVehicleType('sports')">
                    <div class="loan-type-card-radio"></div>
                    <div class="loan-type-card-icon">🏍️</div>
                    <div class="loan-type-card-info">
                      <div class="loan-type-card-title">Performance / Sports</div>
                      <div class="loan-type-card-sub">MT-15, R15, Duke, Apache RR</div>
                    </div>
                  </div>
                  <div class="loan-type-card ${curType === 'electric' ? 'active' : ''}" data-type="electric" onclick="window.LM_VehicleUI.selectVehicleType('electric')">
                    <div class="loan-type-card-radio"></div>
                    <div class="loan-type-card-icon">⚡</div>
                    <div class="loan-type-card-info">
                      <div class="loan-type-card-title">Electric 2-Wheeler</div>
                      <div class="loan-type-card-sub">Ather, Ola S1, TVS iQube, Chetak</div>
                    </div>
                  </div>
                  <div class="loan-type-card ${curType === 'car' ? 'active' : ''}" data-type="car" onclick="window.LM_VehicleUI.selectVehicleType('car')">
                    <div class="loan-type-card-radio"></div>
                    <div class="loan-type-card-icon">🚗</div>
                    <div class="loan-type-card-info">
                      <div class="loan-type-card-title">Car / 4-Wheeler</div>
                      <div class="loan-type-card-sub">Hatchback, Sedan, SUV, EV</div>
                    </div>
                  </div>
                </div>
                <input type="hidden" id="vType" value="${curType}" />
              </div>

              <!-- 2. Vehicle Identification -->
              <div class="loan-form-section">
                <label class="loan-form-label">VEHICLE DETAILS</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label class="loan-form-label">Vehicle Nickname / Title *</label>
                    <input type="text" id="vName" class="loan-input font-bold" value="${_esc(v?.name || '')}" placeholder="e.g. My Yamaha MT-15" required />
                  </div>
                  <div>
                    <label class="loan-form-label">Registration Plate Number</label>
                    <input type="text" id="vRegNumber" class="loan-input" value="${_esc(v?.regNumber || '')}" placeholder="e.g. TN 09 AB 1234" style="text-transform:uppercase;font-family:'JetBrains Mono',monospace;" />
                  </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
                  <div>
                    <label class="loan-form-label">Brand / Make</label>
                    <input type="text" id="vBrand" class="loan-input" value="${_esc(v?.brand || '')}" placeholder="e.g. Yamaha, Honda" />
                  </div>
                  <div>
                    <label class="loan-form-label">Model</label>
                    <input type="text" id="vModel" class="loan-input" value="${_esc(v?.model || '')}" placeholder="e.g. MT-15, Activa 6G" />
                  </div>
                  <div>
                    <label class="loan-form-label">Engine CC</label>
                    <input type="number" id="vEngineCC" class="loan-input" value="${v?.engineCC || ''}" placeholder="e.g. 155" />
                  </div>
                </div>
              </div>

              <!-- 3. Current Usage & Odometer -->
              <div class="loan-form-section">
                <label class="loan-form-label">CURRENT USAGE &amp; RUNNING</label>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                  <div>
                    <label class="loan-form-label">Current Odometer (KM) *</label>
                    <input type="number" id="vOdo" class="loan-input font-bold" value="${v?.currentOdometer || 0}" min="0" required />
                  </div>
                  <div>
                    <label class="loan-form-label">Daily Usage (Average KM)</label>
                    <input type="number" id="vAvgDaily" class="loan-input" value="${v?.avgDailyKm || 20}" min="1" />
                  </div>
                </div>
              </div>

              <!-- 4. Engine Oil Settings Card -->
              <div class="loan-calculation-card" style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                  <span style="font-size:16px;">🛢️</span>
                  <span style="font-size:12px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.4px;">Engine Oil Tracking</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label class="loan-form-label">Last Oil Change Odo (KM)</label>
                    <input type="number" id="vOilLastOdo" class="loan-input" value="${v?.oil?.lastChangedOdometer || 0}" min="0" />
                  </div>
                  <div>
                    <label class="loan-form-label">Last Oil Change Date</label>
                    <input type="date" id="vOilLastDate" class="loan-input" value="${v?.oil?.lastChangedDate || ''}" />
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                  <div>
                    <label class="loan-form-label">Change Interval (KM)</label>
                    <input type="number" id="vOilIntervalKm" class="loan-input" value="${v?.oil?.recommendedIntervalKm || 3000}" min="500" step="100" oninput="this.dataset.touched='true'" />
                  </div>
                  <div>
                    <label class="loan-form-label">Oil Grade / Spec</label>
                    <input type="text" id="vOilGrade" class="loan-input" value="${_esc(v?.oil?.grade || '10W-30')}" placeholder="e.g. 10W-40 Synthetic" oninput="this.dataset.touched='true'" />
                  </div>
                </div>
              </div>

              <!-- 5. General Service Settings Card -->
              <div class="loan-calculation-card" style="margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                  <span style="font-size:16px;">🔧</span>
                  <span style="font-size:12px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.4px;">General Service Tracking</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label class="loan-form-label">Last Service Odo (KM)</label>
                    <input type="number" id="vSrvLastOdo" class="loan-input" value="${v?.service?.lastServiceOdometer || 0}" min="0" />
                  </div>
                  <div>
                    <label class="loan-form-label">Service Interval (KM)</label>
                    <input type="number" id="vSrvIntervalKm" class="loan-input" value="${v?.service?.recommendedIntervalKm || 3500}" min="500" step="100" oninput="this.dataset.touched='true'" />
                  </div>
                </div>
                <div>
                  <label class="loan-form-label">Preferred Service Center / Mechanic</label>
                  <input type="text" id="vSrvCenter" class="loan-input" value="${_esc(v?.service?.serviceCenter || '')}" placeholder="e.g. Official Service Center or Local Workshop" />
                </div>
              </div>

              <!-- 6. Insurance & PUC Expiry Card -->
              <div class="loan-calculation-card" style="margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                  <span style="font-size:16px;">🛡️</span>
                  <span style="font-size:12px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.4px;">Insurance &amp; PUC Expiry</span>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                  <div>
                    <label class="loan-form-label">Insurance Provider</label>
                    <input type="text" id="vInsProvider" class="loan-input" value="${_esc(v?.insurance?.provider || '')}" placeholder="e.g. Acko, HDFC ERGO, ICICI Lombard" />
                  </div>
                  <div>
                    <label class="loan-form-label">Policy Expiry Date</label>
                    <input type="date" id="vInsExpiry" class="loan-input" value="${v?.insurance?.expiryDate || ''}" />
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                  <div>
                    <label class="loan-form-label">Policy Number</label>
                    <input type="text" id="vInsPolicyNo" class="loan-input" value="${_esc(v?.insurance?.policyNumber || '')}" placeholder="e.g. POL-123456" />
                  </div>
                  <div>
                    <label class="loan-form-label">PUC Expiry Date</label>
                    <input type="date" id="vPucExpiry" class="loan-input" value="${v?.puc?.expiryDate || ''}" />
                  </div>
                </div>
              </div>

              <div class="loan-modal-footer">
                <button type="button" class="loan-btn-cancel" onclick="document.getElementById('vehicleFormModal')?.remove()">Cancel</button>
                <button type="submit" class="loan-btn-submit">${isEdit ? 'Update Vehicle' : 'Save Vehicle'}</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    },

    /**
     * Select Vehicle Type from Hero Grid
     */
    selectVehicleType: function (type) {
      var hidden = document.getElementById('vType');
      if (hidden) hidden.value = type;
      var cards = document.querySelectorAll('#vehicleFormModal .loan-type-card');
      cards.forEach(function (card) {
        if (card.getAttribute('data-type') === type) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
      this.onTypeChange(type);
    },

    /**
     * Auto-prefill intervals on vehicle type change
     */
    onTypeChange: function (type) {
      var service = _getService();
      var b = service.getBenchmark(type);
      var oilKm = document.getElementById('vOilIntervalKm');
      var oilGrade = document.getElementById('vOilGrade');
      var srvKm = document.getElementById('vSrvIntervalKm');
      if (oilKm && !oilKm.dataset.touched) oilKm.value = b.oilIntervalKm;
      if (oilGrade && !oilGrade.dataset.touched) oilGrade.value = b.oilTypeLabel;
      if (srvKm && !srvKm.dataset.touched) srvKm.value = b.serviceIntervalKm;
    },

    /**
     * Save vehicle form
     */
    saveVehicleForm: async function (vehicleId) {
      var service = _getService();
      var name = document.getElementById('vName')?.value.trim();
      if (!name) return;

      var type = document.getElementById('vType')?.value || 'commuter';
      var payload = {
        id: vehicleId || null,
        name: name,
        type: type,
        regNumber: document.getElementById('vRegNumber')?.value.trim(),
        brand: document.getElementById('vBrand')?.value.trim(),
        model: document.getElementById('vModel')?.value.trim(),
        engineCC: Number(document.getElementById('vEngineCC')?.value) || 0,
        currentOdometer: Number(document.getElementById('vOdo')?.value) || 0,
        avgDailyKm: Number(document.getElementById('vAvgDaily')?.value) || 20,
        oil: {
          lastChangedOdometer: Number(document.getElementById('vOilLastOdo')?.value) || 0,
          lastChangedDate: document.getElementById('vOilLastDate')?.value || '',
          recommendedIntervalKm: Number(document.getElementById('vOilIntervalKm')?.value) || 3000,
          grade: document.getElementById('vOilGrade')?.value.trim()
        },
        service: {
          lastServiceOdometer: Number(document.getElementById('vSrvLastOdo')?.value) || 0,
          recommendedIntervalKm: Number(document.getElementById('vSrvIntervalKm')?.value) || 3500,
          serviceCenter: document.getElementById('vSrvCenter')?.value.trim()
        },
        insurance: {
          provider: document.getElementById('vInsProvider')?.value.trim(),
          policyNumber: document.getElementById('vInsPolicyNo')?.value.trim(),
          expiryDate: document.getElementById('vInsExpiry')?.value || ''
        },
        puc: {
          expiryDate: document.getElementById('vPucExpiry')?.value || ''
        }
      };

      var saved = await service.saveVehicle(payload);
      document.getElementById('vehicleFormModal')?.remove();
      if (window.LMToast) window.LMToast.show('✅ Vehicle details saved!');
      _activeVehicleId = saved.id;
      this.render();
    },

    /**
     * Fast Update Odometer Modal
     */
    openUpdateOdometerModal: function (vehicleId) {
      var service = _getService();
      var v = service.getVehicleById(vehicleId);
      if (!v) return;

      var existing = document.getElementById('updateOdoModal');
      if (existing) existing.remove();

      var modal = document.createElement('div');
      modal.id = 'updateOdoModal';
      modal.className = 'modal-overlay show';
      modal.onclick = function (e) {
        if (e.target === modal) modal.remove();
      };

      var escHandler = function (e) {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      modal.innerHTML = `
        <div class="modal loan-modal-box" style="max-width:440px;" onclick="event.stopPropagation()">
          <div class="loan-modal-header">
            <div class="loan-modal-header-icon">⏱️</div>
            <div class="loan-modal-header-text">
              <h3 class="loan-modal-title">Update Odometer</h3>
              <p class="loan-modal-subtitle">${_esc(v.name)} · Current: ${(v.currentOdometer || 0).toLocaleString('en-IN')} KM</p>
            </div>
            <button type="button" class="loan-modal-close-btn" onclick="document.getElementById('updateOdoModal')?.remove()">×</button>
          </div>
          <div class="modal-body loan-modal-body">
            <div class="loan-form-section">
              <label class="loan-form-label">CURRENT KM READING *</label>
              <div class="loan-amount-input-wrap">
                <span class="loan-currency-symbol" style="font-size:15px;letter-spacing:1px;">KM</span>
                <input type="number" id="quickOdoInput" class="loan-amount-input" value="${v.currentOdometer || 0}" min="${v.currentOdometer || 0}" required />
              </div>
              <div class="loan-amount-presets" style="margin-top:10px;">
                <button type="button" class="loan-chip-btn" onclick="var q=document.getElementById('quickOdoInput'); if(q) q.value = Number(q.value)+50;">+50 km</button>
                <button type="button" class="loan-chip-btn" onclick="var q=document.getElementById('quickOdoInput'); if(q) q.value = Number(q.value)+100;">+100 km</button>
                <button type="button" class="loan-chip-btn" onclick="var q=document.getElementById('quickOdoInput'); if(q) q.value = Number(q.value)+250;">+250 km</button>
                <button type="button" class="loan-chip-btn" onclick="var q=document.getElementById('quickOdoInput'); if(q) q.value = Number(q.value)+500;">+500 km</button>
              </div>
            </div>
            <div class="loan-modal-footer">
              <button type="button" class="loan-btn-cancel" onclick="document.getElementById('updateOdoModal')?.remove()">Cancel</button>
              <button type="button" class="loan-btn-submit" onclick="window.LM_VehicleUI.saveQuickOdometer('${v.id}')">Update KM</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('quickOdoInput')?.focus();
    },

    saveQuickOdometer: async function (vehicleId) {
      var input = document.getElementById('quickOdoInput');
      var val = Number(input?.value);
      if (val >= 0) {
        var service = _getService();
        await service.updateOdometer(vehicleId, val);
        document.getElementById('updateOdoModal')?.remove();
        if (window.LMToast) window.LMToast.show('✅ Odometer updated to ' + val.toLocaleString('en-IN') + ' km');
        this.render();
      }
    },

    /**
     * Log Service / Oil Change Modal
     */
    openLogServiceModal: function (vehicleId, defaultType) {
      var service = _getService();
      var v = service.getVehicleById(vehicleId);
      if (!v) return;

      var existing = document.getElementById('serviceLogModal');
      if (existing) existing.remove();

      var type = defaultType || 'general_service';
      var todayStr = new Date().toISOString().split('T')[0];

      var modal = document.createElement('div');
      modal.id = 'serviceLogModal';
      modal.className = 'modal-overlay show';
      modal.onclick = function (e) {
        if (e.target === modal) modal.remove();
      };

      var escHandler = function (e) {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      modal.innerHTML = `
        <div class="modal loan-modal-box" style="max-width:520px;" onclick="event.stopPropagation()">
          <div class="loan-modal-header">
            <div class="loan-modal-header-icon">${type === 'oil_change' ? '🛢️' : '🔧'}</div>
            <div class="loan-modal-header-text">
              <h3 class="loan-modal-title">${type === 'oil_change' ? 'Log Engine Oil Change' : 'Log Maintenance'}</h3>
              <p class="loan-modal-subtitle">${_esc(v.name)}</p>
            </div>
            <button type="button" class="loan-modal-close-btn" onclick="document.getElementById('serviceLogModal')?.remove()">×</button>
          </div>
          <div class="modal-body loan-modal-body">
            <form id="srvLogForm" onsubmit="event.preventDefault(); window.LM_VehicleUI.saveServiceLog('${v.id}');">
              <div class="loan-form-section">
                <label class="loan-form-label">MAINTENANCE TYPE *</label>
                <select id="logType" class="loan-select">
                  <option value="oil_change" ${type === 'oil_change' ? 'selected' : ''}>🛢️ Engine Oil Change</option>
                  <option value="general_service" ${type === 'general_service' ? 'selected' : ''}>🔧 Periodic General Service</option>
                  <option value="repair">🛠️ Mechanical Repair / Replacement</option>
                  <option value="tyre">💨 Tyre Air / Rotation / Replacement</option>
                  <option value="battery">🔋 Battery Service / Replacement</option>
                  <option value="other">📝 Other Maintenance</option>
                </select>
              </div>

              <div class="loan-form-section">
                <label class="loan-form-label">TITLE / SUMMARY *</label>
                <input type="text" id="logTitle" class="loan-input font-bold" value="${type === 'oil_change' ? 'Engine Oil & Filter Change' : 'General Service & Inspection'}" required />
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                  <label class="loan-form-label">DATE *</label>
                  <input type="date" id="logDate" class="loan-input" value="${todayStr}" required />
                </div>
                <div>
                  <label class="loan-form-label">ODOMETER (KM) *</label>
                  <input type="number" id="logOdo" class="loan-input" value="${v.currentOdometer || 0}" min="0" required />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                  <label class="loan-form-label">COST (₹)</label>
                  <input type="number" id="logCost" class="loan-input" placeholder="0" min="0" />
                </div>
                <div>
                  <label class="loan-form-label">WORKSHOP / GARAGE</label>
                  <input type="text" id="logWorkshop" class="loan-input" placeholder="e.g. Official Service Center" />
                </div>
              </div>

              <div class="loan-form-section">
                <label class="loan-form-label">NOTES / PARTS REPLACED</label>
                <input type="text" id="logNotes" class="loan-input" placeholder="e.g. Replaced oil filter, spark plug, brake pads" />
              </div>

              <div style="background:rgba(0,240,255,0.08);border:1px solid rgba(0,240,255,0.22);padding:12px 14px;border-radius:12px;margin-bottom:16px;">
                <label style="display:flex;align-items:center;gap:10px;font-size:12.5px;cursor:pointer;color:var(--text,#fff);">
                  <input type="checkbox" id="logLinkTx" checked style="width:16px;height:16px;accent-color:var(--teal);" />
                  <span><strong>Record Expense in LedgerMate:</strong> Auto-record cost as Automobile expense transaction</span>
                </label>
              </div>

              <div class="loan-modal-footer">
                <button type="button" class="loan-btn-cancel" onclick="document.getElementById('serviceLogModal')?.remove()">Cancel</button>
                <button type="submit" class="loan-btn-submit">Save Maintenance Log</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    },

    saveServiceLog: async function (vehicleId) {
      var service = _getService();
      var title = document.getElementById('logTitle')?.value.trim() || 'Service';
      var type = document.getElementById('logType')?.value || 'general_service';
      var date = document.getElementById('logDate')?.value || new Date().toISOString().split('T')[0];
      var odo = Number(document.getElementById('logOdo')?.value) || 0;
      var cost = Number(document.getElementById('logCost')?.value) || 0;
      var workshop = document.getElementById('logWorkshop')?.value.trim();
      var notes = document.getElementById('logNotes')?.value.trim();
      var linkTx = !!document.getElementById('logLinkTx')?.checked;

      await service.addServiceLog(vehicleId, {
        type: type,
        title: title,
        date: date,
        odometer: odo,
        cost: cost,
        workshop: workshop,
        notes: notes
      }, linkTx);

      document.getElementById('serviceLogModal')?.remove();
      if (window.LMToast) window.LMToast.show('✅ Service log recorded & baseline updated!');
      this.render();
    },

    /**
     * Log Fuel Fill Modal
     */
    openLogFuelModal: function (vehicleId) {
      var service = _getService();
      var v = service.getVehicleById(vehicleId);
      if (!v) return;

      var existing = document.getElementById('fuelLogModal');
      if (existing) existing.remove();
      var todayStr = new Date().toISOString().split('T')[0];

      var modal = document.createElement('div');
      modal.id = 'fuelLogModal';
      modal.className = 'modal-overlay show';
      modal.onclick = function (e) {
        if (e.target === modal) modal.remove();
      };

      var escHandler = function (e) {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      modal.innerHTML = `
        <div class="modal loan-modal-box" style="max-width:480px;" onclick="event.stopPropagation()">
          <div class="loan-modal-header">
            <div class="loan-modal-header-icon">⛽</div>
            <div class="loan-modal-header-text">
              <h3 class="loan-modal-title">Log Fuel Fill-Up</h3>
              <p class="loan-modal-subtitle">${_esc(v.name)}</p>
            </div>
            <button type="button" class="loan-modal-close-btn" onclick="document.getElementById('fuelLogModal')?.remove()">×</button>
          </div>
          <div class="modal-body loan-modal-body">
            <form id="fuelForm" onsubmit="event.preventDefault(); window.LM_VehicleUI.saveFuelLog('${v.id}');">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                  <label class="loan-form-label">DATE *</label>
                  <input type="date" id="fuelDate" class="loan-input" value="${todayStr}" required />
                </div>
                <div>
                  <label class="loan-form-label">CURRENT ODO (KM) *</label>
                  <input type="number" id="fuelOdo" class="loan-input font-bold" value="${v.currentOdometer || 0}" min="0" required />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                  <label class="loan-form-label">FUEL LITERS *</label>
                  <input type="number" step="0.01" id="fuelLiters" class="loan-input font-bold" placeholder="e.g. 5.5" required />
                </div>
                <div>
                  <label class="loan-form-label">AMOUNT PAID (₹) *</label>
                  <input type="number" step="0.01" id="fuelCost" class="loan-input font-bold" placeholder="e.g. 550" required />
                </div>
              </div>

              <div class="loan-form-section">
                <label class="loan-form-label">FUEL STATION (OPTIONAL)</label>
                <input type="text" id="fuelStation" class="loan-input" placeholder="e.g. IndianOil, Shell, HP, Bharat Petroleum" />
              </div>

              <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:12px;">
                <label style="display:flex;align-items:center;gap:10px;font-size:12px;cursor:pointer;color:var(--text,#fff);">
                  <input type="checkbox" id="fuelFullTank" checked style="width:16px;height:16px;accent-color:var(--teal);" />
                  <span><strong>Full Tank fill-up:</strong> Required for exact KM/L fuel efficiency calculation</span>
                </label>
              </div>

              <div style="background:rgba(0,240,255,0.08);border:1px solid rgba(0,240,255,0.22);border-radius:12px;padding:12px 14px;margin-bottom:16px;">
                <label style="display:flex;align-items:center;gap:10px;font-size:12px;cursor:pointer;color:var(--text,#fff);">
                  <input type="checkbox" id="fuelLinkTx" checked style="width:16px;height:16px;accent-color:var(--teal);" />
                  <span><strong>Record Expense in LedgerMate:</strong> Auto-record cost as Fuel expense transaction</span>
                </label>
              </div>

              <div class="loan-modal-footer">
                <button type="button" class="loan-btn-cancel" onclick="document.getElementById('fuelLogModal')?.remove()">Cancel</button>
                <button type="submit" class="loan-btn-submit">Save Fuel Log</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    },

    saveFuelLog: async function (vehicleId) {
      var service = _getService();
      var date = document.getElementById('fuelDate')?.value || new Date().toISOString().split('T')[0];
      var odo = Number(document.getElementById('fuelOdo')?.value) || 0;
      var liters = Number(document.getElementById('fuelLiters')?.value) || 0;
      var cost = Number(document.getElementById('fuelCost')?.value) || 0;
      var fuelStation = document.getElementById('fuelStation')?.value.trim();
      var isFullTank = !!document.getElementById('fuelFullTank')?.checked;
      var linkTx = !!document.getElementById('fuelLinkTx')?.checked;

      await service.addFuelLog(vehicleId, {
        date: date,
        odometer: odo,
        liters: liters,
        cost: cost,
        isFullTank: isFullTank,
        fuelStation: fuelStation
      }, linkTx);

      document.getElementById('fuelLogModal')?.remove();
      if (window.LMToast) window.LMToast.show('⛽ Fuel log saved!');
      this.render();
    },

    deleteServiceLog: async function (vehicleId, logId) {
      var service = _getService();
      await service.deleteServiceLog(vehicleId, logId);
      this.render();
    },

    deleteFuelLog: async function (vehicleId, fuelId) {
      var service = _getService();
      await service.deleteFuelLog(vehicleId, fuelId);
      this.render();
    },

    openDeleteConfirmModal: function (vehicleId) {
      var service = _getService();
      var v = service.getVehicleById(vehicleId);
      if (!v) return;

      var existing = document.getElementById('deleteVehicleModal');
      if (existing) existing.remove();

      var modal = document.createElement('div');
      modal.id = 'deleteVehicleModal';
      modal.className = 'modal-overlay show';
      modal.onclick = function (e) {
        if (e.target === modal) modal.remove();
      };

      var escHandler = function (e) {
        if (e.key === 'Escape') {
          modal.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);

      modal.innerHTML = `
        <div class="modal loan-modal-box" style="max-width:440px;" onclick="event.stopPropagation()">
          <div class="loan-modal-header" style="border-bottom-color:rgba(244,63,94,0.3);">
            <div class="loan-modal-header-icon" style="background:rgba(244,63,94,0.12);border-color:rgba(244,63,94,0.3);color:var(--rose);">🗑️</div>
            <div class="loan-modal-header-text">
              <h3 class="loan-modal-title" style="color:var(--rose);">Delete Vehicle</h3>
              <p class="loan-modal-subtitle">Permanent action</p>
            </div>
            <button type="button" class="loan-modal-close-btn" onclick="document.getElementById('deleteVehicleModal')?.remove()">×</button>
          </div>
          <div class="modal-body loan-modal-body">
            <div style="background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.25);border-radius:12px;padding:14px;color:var(--text);font-size:13px;line-height:1.5;margin-bottom:18px;">
              Permanently delete <strong>"${_esc(v.name)}"</strong> and all of its service history, fuel records, and reminders?
            </div>
            <div class="loan-modal-footer" style="margin-top:0;">
              <button type="button" class="loan-btn-cancel" onclick="document.getElementById('deleteVehicleModal')?.remove()">Cancel</button>
              <button type="button" class="loan-btn-danger" onclick="window.LM_VehicleUI.confirmDeleteVehicle('${v.id}')">🗑️ Yes, Delete Vehicle</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    },

    confirmDeleteVehicle: async function (vehicleId) {
      var service = _getService();
      await service.deleteVehicle(vehicleId);
      document.getElementById('deleteVehicleModal')?.remove();
      if (window.LMToast) window.LMToast.show('🗑️ Vehicle removed');
      _activeVehicleId = null;
      this.render();
    },

    /**
     * Compact alert banner / widget for LedgerMate main dashboard
     */
    renderDashboardWidget: function () {
      var wrap = document.getElementById('dashVehicleWidget');
      if (!wrap) return;

      var service = _getService();
      if (!service) return;

      var vehicles = service.getAllVehicles();
      if (!vehicles || vehicles.length === 0) {
        wrap.style.display = 'none';
        return;
      }

      // Collect urgent dues
      var urgentAlerts = [];
      vehicles.forEach(function (v) {
        var oil = service.calculateOilHealth(v);
        var ins = service.calculateInsuranceStatus(v);
        var srv = service.calculateServiceDue(v);
        var puc = service.calculatePucStatus(v);

        if (oil && (oil.isOverdue || oil.isDueSoon)) {
          urgentAlerts.push({ v: v, type: 'oil', label: 'Engine Oil ' + (oil.isOverdue ? 'Overdue' : 'Due Soon'), desc: (oil.kmRemaining <= 0 ? Math.abs(oil.kmRemaining) + ' km overdue' : oil.kmRemaining + ' km left'), isOverdue: oil.isOverdue });
        }
        if (ins && (ins.isExpired || ins.isExpiringSoon)) {
          urgentAlerts.push({ v: v, type: 'ins', label: 'Insurance ' + (ins.isExpired ? 'Expired' : 'Expiring Soon'), desc: (ins.isExpired ? 'Expired ' + Math.abs(ins.daysRemaining) + 'd ago' : ins.daysRemaining + ' days left'), isOverdue: ins.isExpired });
        }
        if (srv && (srv.isOverdue || srv.isDueSoon)) {
          urgentAlerts.push({ v: v, type: 'srv', label: 'Service ' + (srv.isOverdue ? 'Overdue' : 'Due Soon'), desc: (srv.kmRemaining <= 0 ? 'Past target' : srv.kmRemaining + ' km left'), isOverdue: srv.isOverdue });
        }
        if (puc && (puc.isExpired || puc.isExpiringSoon)) {
          urgentAlerts.push({ v: v, type: 'puc', label: 'PUC ' + (puc.isExpired ? 'Expired' : 'Expiring Soon'), desc: (puc.isExpired ? 'Expired' : puc.daysRemaining + ' days left'), isOverdue: puc.isExpired });
        }
      });

      if (urgentAlerts.length === 0) {
        wrap.style.display = 'none';
        return;
      }

      wrap.style.display = 'block';
      wrap.innerHTML = `
        <div class="card" style="background:rgba(15,23,42,0.7);border:1px solid #fbbf24;border-radius:14px;padding:12px 16px;margin-bottom:16px;">
          <div style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;" onclick="showPage('vehicles')">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:22px;">🏍️</span>
              <div>
                <strong style="font-size:13.5px;color:var(--text,#fff);">Vehicle Maintenance Alert</strong>
                <div style="font-size:11.5px;color:#fbbf24;">
                  ${urgentAlerts.map(function (a) { return `${_esc(a.v.name)}: ${a.label} (${a.desc})`; }).join(' · ')}
                </div>
              </div>
            </div>
            <button class="btn-secondary" style="font-size:11px;padding:4px 10px;border-radius:6px;">View ↗</button>
          </div>
        </div>
      `;
    }
  };

  window.LM_VehicleUI = VehicleUI;

})();
