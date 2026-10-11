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
              <button class="ws-btn-secondary" style="font-size:12px;padding:6px 12px;border-radius:10px;" onclick="window.LM_VehicleUI.openAddEditVehicleModal()">
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
                <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;border-radius:8px;" onclick="window.LM_VehicleUI.openUpdateOdometerModal('${activeVehicle.id}')" title="Quick Update Odometer">
                  ✏️ Edit
                </button>
              </div>
            </div>

            <!-- Quick Action Bar -->
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;border-top:1px solid rgba(255,255,255,0.07);padding-top:14px;">
              <button class="ws-btn-primary" style="font-size:12px;padding:5px 12px;border-radius:8px;" onclick="window.LM_VehicleUI.openLogServiceModal('${activeVehicle.id}', 'oil_change')">
                🛢️ Log Oil Change
              </button>
              <button class="ws-btn-secondary" style="font-size:12px;padding:5px 12px;border-radius:8px;" onclick="window.LM_VehicleUI.openLogServiceModal('${activeVehicle.id}', 'general_service')">
                🔧 Log Service
              </button>
              <button class="ws-btn-secondary" style="font-size:12px;padding:5px 12px;border-radius:8px;" onclick="window.LM_VehicleUI.openLogFuelModal('${activeVehicle.id}')">
                ⛽ Add Fuel Fill
              </button>
              <button class="ws-btn-secondary" style="font-size:12px;padding:5px 12px;border-radius:8px;" onclick="window.LM_VehicleUI.openAddEditVehicleModal('${activeVehicle.id}')">
                ⚙️ Vehicle Settings
              </button>
              <button class="ws-btn-danger" style="font-size:12px;padding:5px 10px;border-radius:8px;margin-left:auto;" onclick="window.LM_VehicleUI.openDeleteConfirmModal('${activeVehicle.id}')" title="Delete Vehicle">
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
                <span class="st-badge ${oilInfo.isOverdue ? 'st-pending' : (oilInfo.isDueSoon ? 'st-inprogress' : 'st-completed')}" style="font-size:10px;">
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
                <span class="st-badge ${insInfo.isExpired ? 'st-pending' : (insInfo.isExpiringSoon ? 'st-inprogress' : 'st-completed')}" style="font-size:10px;">
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
                <span class="st-badge ${srvInfo.isOverdue ? 'st-pending' : (srvInfo.isDueSoon ? 'st-inprogress' : 'st-completed')}" style="font-size:10px;">
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
                <span class="st-badge ${pucInfo.isExpired ? 'st-pending' : (pucInfo.isExpiringSoon ? 'st-inprogress' : 'st-completed')}" style="font-size:10px;">
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
            <button class="ws-btn-primary" style="font-size:11px;padding:4px 10px;" onclick="window.LM_VehicleUI.openLogServiceModal('${vehicle.id}', 'general_service')">
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
            <button class="ws-btn-primary" style="font-size:11px;padding:6px 12px;" onclick="window.LM_VehicleUI.openLogServiceModal('${vehicle.id}')">
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
                      <button class="ws-btn-secondary" style="font-size:11px;padding:4px 8px;color:#f43f5e;border-color:rgba(244,63,94,0.3);" title="Delete Log" onclick="window.LM_VehicleUI.deleteServiceLog('${vehicle.id}', '${l.id}')">✕</button>
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
            <button class="ws-btn-primary" style="font-size:11px;padding:4px 10px;" onclick="window.LM_VehicleUI.openLogFuelModal('${vehicle.id}')">
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
                        ${f.liters} Liters ${_fmtINR(f.cost)} ${f.isFullTank ? '<span class="st-badge st-completed" style="font-size:9px;padding:1px 5px;">Full Tank</span>' : ''}
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
                      <button class="ws-btn-secondary" style="font-size:10px;padding:3px 6px;" onclick="window.LM_VehicleUI.deleteFuelLog('${vehicle.id}', '${f.id}')">✕</button>
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

          <button class="ws-btn-primary" style="font-size:14px;padding:10px 24px;border-radius:12px;box-shadow:0 4px 14px rgba(2,132,199,0.4);" onclick="window.LM_VehicleUI.openAddEditVehicleModal()">
            + Add Your Bike or Scooty
          </button>

          <div style="margin-top:36px;border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;text-align:left;">
            <div style="font-size:12px;text-transform:uppercase;color:var(--text3,#94a3b8);font-weight:700;margin-bottom:12px;">Quick Presets Supported:</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <span class="st-badge st-completed">🛵 Scooters (Activa, Jupiter, Access)</span>
              <span class="st-badge st-completed">🏍️ Commuter (Splendor, Shine, Platina)</span>
              <span class="st-badge st-completed">🏍️ Cruiser (Classic 350, Hunter)</span>
              <span class="st-badge st-completed">🏍️ Performance (MT-15, R15, Duke)</span>
              <span class="st-badge st-completed">⚡ Electric (Ather, Ola, iQube)</span>
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

      var existing = document.getElementById('vehicleFormModal');
      if (existing) existing.remove();

      var modal = document.createElement('div');
      modal.id = 'vehicleFormModal';
      modal.className = 'ws-modal-overlay';
      modal.innerHTML = `
        <div class="ws-modal-dialog" style="max-width:580px;max-height:90vh;overflow-y:auto;">
          <div class="ws-modal-header">
            <div class="ws-modal-title" style="color:#38bdf8;">
              <span>${isEdit ? '✏️ Edit Vehicle' : '🏍️ Add New Vehicle'}</span>
            </div>
            <button class="ws-modal-close" onclick="document.getElementById('vehicleFormModal')?.remove()">✕</button>
          </div>
          <div class="ws-modal-body" style="padding:16px;">
            <form id="vehicleForm" onsubmit="event.preventDefault(); window.LM_VehicleUI.saveVehicleForm('${vehicleId || ''}');">
              
              <!-- Vehicle Basic Info -->
              <div style="margin-bottom:14px;">
                <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;font-weight:600;">Vehicle Type *</label>
                <select id="vType" class="ws-input" onchange="window.LM_VehicleUI.onTypeChange(this.value)" required>
                  <option value="scooter" ${v?.type==='scooter'?'selected':''}>🛵 Scooter / Scooty (Activa, Jupiter, Access)</option>
                  <option value="commuter" ${(!v || v.type==='commuter')?'selected':''}>🏍️ Commuter Bike (Splendor, Shine, Platina)</option>
                  <option value="cruiser" ${v?.type==='cruiser'?'selected':''}>🏍️ Cruiser / Classic (Royal Enfield, H'ness)</option>
                  <option value="sports" ${v?.type==='sports'?'selected':''}>🏍️ Performance / Sports (MT-15, R15, Duke)</option>
                  <option value="electric" ${v?.type==='electric'?'selected':''}>⚡ Electric 2-Wheeler (Ather, Ola, iQube)</option>
                  <option value="car" ${v?.type==='car'?'selected':''}>🚗 Car / 4-Wheeler</option>
                </select>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                  <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;font-weight:600;">Vehicle Nickname / Title *</label>
                  <input type="text" id="vName" class="ws-input" value="${_esc(v?.name || '')}" placeholder="e.g. My Yamaha MT-15" required />
                </div>
                <div>
                  <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;font-weight:600;">Registration Number (Plate)</label>
                  <input type="text" id="vRegNumber" class="ws-input" value="${_esc(v?.regNumber || '')}" placeholder="e.g. TN 09 AB 1234" style="text-transform:uppercase;" />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
                <div>
                  <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Brand / Make</label>
                  <input type="text" id="vBrand" class="ws-input" value="${_esc(v?.brand || '')}" placeholder="e.g. Yamaha, Honda" />
                </div>
                <div>
                  <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Model</label>
                  <input type="text" id="vModel" class="ws-input" value="${_esc(v?.model || '')}" placeholder="e.g. MT-15, Activa 6G" />
                </div>
                <div>
                  <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Engine CC</label>
                  <input type="number" id="vEngineCC" class="ws-input" value="${v?.engineCC || ''}" placeholder="e.g. 155" />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
                <div>
                  <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;font-weight:600;">Current Odometer (KM) *</label>
                  <input type="number" id="vOdo" class="ws-input" value="${v?.currentOdometer || 0}" min="0" required />
                </div>
                <div>
                  <label style="font-size:12px;color:var(--text2);display:block;margin-bottom:4px;">Daily Usage (Average KM)</label>
                  <input type="number" id="vAvgDaily" class="ws-input" value="${v?.avgDailyKm || 20}" min="1" />
                </div>
              </div>

              <!-- Engine Oil Settings -->
              <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px;margin-bottom:14px;">
                <div style="font-size:13px;font-weight:700;color:#38bdf8;margin-bottom:10px;">🛢️ Engine Oil Tracking</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
                  <div>
                    <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">Last Oil Change Odo (KM)</label>
                    <input type="number" id="vOilLastOdo" class="ws-input" value="${v?.oil?.lastChangedOdometer || 0}" min="0" />
                  </div>
                  <div>
                    <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">Last Oil Change Date</label>
                    <input type="date" id="vOilLastDate" class="ws-input" value="${v?.oil?.lastChangedDate || ''}" />
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                  <div>
                    <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">Change Interval (KM)</label>
                    <input type="number" id="vOilIntervalKm" class="ws-input" value="${v?.oil?.recommendedIntervalKm || 3000}" min="500" step="100" />
                  </div>
                  <div>
                    <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">Oil Grade / Spec</label>
                    <input type="text" id="vOilGrade" class="ws-input" value="${_esc(v?.oil?.grade || '10W-30')}" placeholder="e.g. 10W-40 Synthetic" />
                  </div>
                </div>
              </div>

              <!-- General Service Settings -->
              <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px;margin-bottom:14px;">
                <div style="font-size:13px;font-weight:700;color:#38bdf8;margin-bottom:10px;">🔧 General Service Tracking</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
                  <div>
                    <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">Last Service Odo (KM)</label>
                    <input type="number" id="vSrvLastOdo" class="ws-input" value="${v?.service?.lastServiceOdometer || 0}" min="0" />
                  </div>
                  <div>
                    <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">Service Interval (KM)</label>
                    <input type="number" id="vSrvIntervalKm" class="ws-input" value="${v?.service?.recommendedIntervalKm || 3500}" min="500" step="100" />
                  </div>
                </div>
                <div>
                  <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">Preferred Service Center / Mechanic</label>
                  <input type="text" id="vSrvCenter" class="ws-input" value="${_esc(v?.service?.serviceCenter || '')}" placeholder="e.g. Official Service Center or Local Workshop" />
                </div>
              </div>

              <!-- Insurance & PUC -->
              <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:12px;margin-bottom:14px;">
                <div style="font-size:13px;font-weight:700;color:#38bdf8;margin-bottom:10px;">🛡️ Insurance &amp; PUC Expiry</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px;">
                  <div>
                    <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">Insurance Provider</label>
                    <input type="text" id="vInsProvider" class="ws-input" value="${_esc(v?.insurance?.provider || '')}" placeholder="e.g. Acko, HDFC ERGO" />
                  </div>
                  <div>
                    <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">Policy Expiry Date</label>
                    <input type="date" id="vInsExpiry" class="ws-input" value="${v?.insurance?.expiryDate || ''}" />
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                  <div>
                    <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">Policy Number</label>
                    <input type="text" id="vInsPolicyNo" class="ws-input" value="${_esc(v?.insurance?.policyNumber || '')}" placeholder="e.g. POL-123456" />
                  </div>
                  <div>
                    <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:2px;">PUC Expiry Date</label>
                    <input type="date" id="vPucExpiry" class="ws-input" value="${v?.puc?.expiryDate || ''}" />
                  </div>
                </div>
              </div>

              <div class="ws-modal-footer" style="padding:10px 0 0;display:flex;justify-content:flex-end;gap:8px;">
                <button type="button" class="ws-btn-secondary" onclick="document.getElementById('vehicleFormModal')?.remove()">Cancel</button>
                <button type="submit" class="ws-btn-primary">Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
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
      modal.className = 'ws-modal-overlay';
      modal.innerHTML = `
        <div class="ws-modal-dialog" style="max-width:380px;">
          <div class="ws-modal-header">
            <div class="ws-modal-title">✏️ Update Odometer</div>
            <button class="ws-modal-close" onclick="document.getElementById('updateOdoModal')?.remove()">✕</button>
          </div>
          <div class="ws-modal-body" style="padding:16px;">
            <div style="font-size:12px;color:var(--text3);margin-bottom:12px;">
              Update current odometer reading for <strong>${_esc(v.name)}</strong>:
            </div>
            <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Current KM Reading</label>
            <input type="number" id="quickOdoInput" class="ws-input" value="${v.currentOdometer || 0}" min="${v.currentOdometer || 0}" style="font-size:18px;font-weight:700;font-family:'JetBrains Mono';" required />
          </div>
          <div class="ws-modal-footer">
            <button class="ws-btn-secondary" onclick="document.getElementById('updateOdoModal')?.remove()">Cancel</button>
            <button class="ws-btn-primary" onclick="window.LM_VehicleUI.saveQuickOdometer('${v.id}')">Update KM</button>
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
      modal.className = 'ws-modal-overlay';
      modal.innerHTML = `
        <div class="ws-modal-dialog" style="max-width:440px;">
          <div class="ws-modal-header">
            <div class="ws-modal-title">🔧 Log Maintenance for ${_esc(v.name)}</div>
            <button class="ws-modal-close" onclick="document.getElementById('serviceLogModal')?.remove()">✕</button>
          </div>
          <div class="ws-modal-body" style="padding:16px;">
            <form id="srvLogForm" onsubmit="event.preventDefault(); window.LM_VehicleUI.saveServiceLog('${v.id}');">
              <div style="margin-bottom:12px;">
                <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Maintenance Type</label>
                <select id="logType" class="ws-input">
                  <option value="oil_change" ${type==='oil_change'?'selected':''}>🛢️ Engine Oil Change</option>
                  <option value="general_service" ${type==='general_service'?'selected':''}>🔧 Periodic General Service</option>
                  <option value="repair">🛠️ Mechanical Repair / Replacement</option>
                  <option value="tyre">💨 Tyre Air / Rotation / Replacement</option>
                  <option value="battery">🔋 Battery Service / Replacement</option>
                  <option value="other">📝 Other Maintenance</option>
                </select>
              </div>

              <div style="margin-bottom:12px;">
                <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Title / Summary *</label>
                <input type="text" id="logTitle" class="ws-input" value="${type==='oil_change'?'Engine Oil & Filter Change':'General Service & Inspection'}" required />
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                <div>
                  <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Date</label>
                  <input type="date" id="logDate" class="ws-input" value="${todayStr}" required />
                </div>
                <div>
                  <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Odometer (KM)</label>
                  <input type="number" id="logOdo" class="ws-input" value="${v.currentOdometer || 0}" min="0" required />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                <div>
                  <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Cost (₹)</label>
                  <input type="number" id="logCost" class="ws-input" placeholder="0" min="0" />
                </div>
                <div>
                  <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Workshop / Garage</label>
                  <input type="text" id="logWorkshop" class="ws-input" placeholder="e.g. Local Garage" />
                </div>
              </div>

              <div style="margin-bottom:14px;">
                <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Notes / Parts Replaced</label>
                <input type="text" id="logNotes" class="ws-input" placeholder="e.g. Replaced oil filter, brake pads" />
              </div>

              <!-- 1-Tap LedgerMate Expense Link -->
              <div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.2);padding:10px 12px;border-radius:10px;margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;color:var(--text,#fff);">
                  <input type="checkbox" id="logLinkTx" checked />
                  <span><strong>Record Expense in LedgerMate:</strong> Automatically log cost as Automobile expense transaction</span>
                </label>
              </div>

              <div class="ws-modal-footer" style="padding:0;display:flex;justify-content:flex-end;gap:8px;">
                <button type="button" class="ws-btn-secondary" onclick="document.getElementById('serviceLogModal')?.remove()">Cancel</button>
                <button type="submit" class="ws-btn-primary">Save Log</button>
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
      modal.className = 'ws-modal-overlay';
      modal.innerHTML = `
        <div class="ws-modal-dialog" style="max-width:420px;">
          <div class="ws-modal-header">
            <div class="ws-modal-title">⛽ Log Fuel Fill-Up</div>
            <button class="ws-modal-close" onclick="document.getElementById('fuelLogModal')?.remove()">✕</button>
          </div>
          <div class="ws-modal-body" style="padding:16px;">
            <form id="fuelForm" onsubmit="event.preventDefault(); window.LM_VehicleUI.saveFuelLog('${v.id}');">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                <div>
                  <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Date</label>
                  <input type="date" id="fuelDate" class="ws-input" value="${todayStr}" required />
                </div>
                <div>
                  <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Current Odo (KM) *</label>
                  <input type="number" id="fuelOdo" class="ws-input" value="${v.currentOdometer || 0}" min="0" required />
                </div>
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
                <div>
                  <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Fuel Liters *</label>
                  <input type="number" step="0.01" id="fuelLiters" class="ws-input" placeholder="e.g. 5.5" required />
                </div>
                <div>
                  <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Amount Paid (₹) *</label>
                  <input type="number" id="fuelCost" class="ws-input" placeholder="e.g. 550" required />
                </div>
              </div>

              <div style="margin-bottom:12px;">
                <label style="font-size:11px;color:var(--text2);display:block;margin-bottom:4px;">Fuel Station (Optional)</label>
                <input type="text" id="fuelStation" class="ws-input" placeholder="e.g. IndianOil, Shell, HP" />
              </div>

              <div style="margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;color:var(--text,#fff);">
                  <input type="checkbox" id="fuelFullTank" checked />
                  <span>Full Tank fill-up (Required for exact km/L calculation)</span>
                </label>
              </div>

              <div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.2);padding:10px 12px;border-radius:10px;margin-bottom:14px;">
                <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer;color:var(--text,#fff);">
                  <input type="checkbox" id="fuelLinkTx" checked />
                  <span>Record Expense in LedgerMate under Fuel</span>
                </label>
              </div>

              <div class="ws-modal-footer" style="padding:0;display:flex;justify-content:flex-end;gap:8px;">
                <button type="button" class="ws-btn-secondary" onclick="document.getElementById('fuelLogModal')?.remove()">Cancel</button>
                <button type="submit" class="ws-btn-primary">Save Fuel Log</button>
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
      modal.className = 'ws-modal-overlay';
      modal.innerHTML = `
        <div class="ws-modal-dialog" style="max-width:400px;">
          <div class="ws-modal-header">
            <div class="ws-modal-title" style="color:#f43f5e;">⚠️ Delete Vehicle</div>
            <button class="ws-modal-close" onclick="document.getElementById('deleteVehicleModal')?.remove()">✕</button>
          </div>
          <div class="ws-modal-body" style="padding:16px;">
            <div class="danger-warning-box">
              Permanently delete <strong>"${_esc(v.name)}"</strong> and all its maintenance, fuel logs, and reminder alerts?
            </div>
          </div>
          <div class="ws-modal-footer">
            <button class="ws-btn-secondary" onclick="document.getElementById('deleteVehicleModal')?.remove()">Cancel</button>
            <button class="ws-btn-danger-solid" onclick="window.LM_VehicleUI.confirmDeleteVehicle('${v.id}')">🗑️ Yes, Delete</button>
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
            <button class="ws-btn-secondary" style="font-size:11px;padding:3px 8px;">View ↗</button>
          </div>
        </div>
      `;
    }
  };

  window.LM_VehicleUI = VehicleUI;

})();
