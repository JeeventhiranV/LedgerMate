/**
 * LedgerMate – VehicleService.js
 * ─────────────────────────────────────────────────────────────
 * Bike & Vehicle Tracking Service Layer.
 * Manages vehicles state, CRUD operations, engine oil health tracking,
 * service countdowns, insurance & PUC expiry alerts, fuel/mileage logs,
 * benchmark presets (Commuter, Scooter, Cruiser, Sports, EV),
 * and synchronization with central reminders & transactions.
 *
 * Exposes: window.LM_VehicleService
 * ─────────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var _vehicles = [];
  var _isInitialized = false;

  function _getProfileId() {
    return window.LM_Auth?.getCurrentUserId?.() || 'default';
  }

  function _generateId(prefix) {
    return (prefix || 'veh') + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  }

  function _round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  // ── BENCHMARK PRESETS (Bike, Scooty, Cruiser, Sports, EV, Car) ─────────────
  var BENCHMARKS = {
    scooter: {
      key: 'scooter',
      label: 'Scooter / Scooty',
      icon: '🛵',
      subtitle: 'Activa, Jupiter, Access, Ntorq, Fascino, Dio',
      defaultOilType: 'scooter_4t',
      oilTypeLabel: 'Scooter 4T MB (10W-30)',
      oilIntervalKm: 3000,
      oilIntervalMonths: 3,
      serviceIntervalKm: 3000,
      serviceIntervalMonths: 3,
      gearOilIntervalKm: 6000,
      driveBeltCheckKm: 6000,
      tyrePressureFront: 24,
      tyrePressureRear: 34,
      avgMileageKmpl: 45,
      checklist: [
        'Engine oil & drain washer check',
        'CVT transmission gear oil',
        'Drive belt & variator roller wear',
        'Air filter & secondary element cleaning',
        'Front & rear brake shoes/pad wear',
        'Battery terminal cleaning & voltage check'
      ]
    },
    commuter: {
      key: 'commuter',
      label: 'Commuter Motorcycle',
      icon: '🏍️',
      subtitle: 'Splendor, Shine, Platina, HF Deluxe, Passion, Glamour',
      defaultOilType: 'mineral',
      oilTypeLabel: 'Mineral 4T (10W-30 / 20W-40)',
      oilIntervalKm: 3000,
      oilIntervalMonths: 4,
      serviceIntervalKm: 3500,
      serviceIntervalMonths: 4,
      tyrePressureFront: 28,
      tyrePressureRear: 34,
      avgMileageKmpl: 55,
      checklist: [
        'Engine oil replacement',
        'Drive chain slack adjustment & lubrication',
        'Brake lever free-play & shoe inspection',
        'Spark plug cleaning & electrode gap check',
        'Air filter sponge cleaning / re-oiling',
        'Clutch cable adjustment'
      ]
    },
    cruiser: {
      key: 'cruiser',
      label: 'Cruiser / Mid-Weight',
      icon: '🏍️',
      subtitle: 'Royal Enfield Classic 350, Hunter, Meteor, Honda H\'ness',
      defaultOilType: 'semi_synthetic',
      oilTypeLabel: 'Semi-Synthetic (15W-50)',
      oilIntervalKm: 4500,
      oilIntervalMonths: 6,
      serviceIntervalKm: 5000,
      serviceIntervalMonths: 6,
      tyrePressureFront: 32,
      tyrePressureRear: 36,
      avgMileageKmpl: 35,
      checklist: [
        'Engine oil & paper oil filter change',
        'Tappet / valve clearance check',
        'Drive chain cleaning & O-ring lube',
        'Disc brake fluid & pad thickness check',
        'Spoke tension check (if spoke wheels)',
        'Fuel injector cleaning / air filter replacement'
      ]
    },
    sports: {
      key: 'sports',
      label: 'Performance / Sports',
      icon: '🏍️',
      subtitle: 'Yamaha MT-15, R15, KTM Duke/RC, Pulsar NS/RS, Apache RTR',
      defaultOilType: 'fully_synthetic',
      oilTypeLabel: 'Fully Synthetic (10W-40 / 10W-50)',
      oilIntervalKm: 5000,
      oilIntervalMonths: 6,
      serviceIntervalKm: 5000,
      serviceIntervalMonths: 6,
      tyrePressureFront: 29,
      tyrePressureRear: 33,
      avgMileageKmpl: 40,
      checklist: [
        'High-performance fully synthetic oil + filter',
        'Liquid coolant level & radiator inspection',
        'O-ring/X-ring chain deep clean & synthetic lube',
        'Front upside-down (USD) fork seal inspection',
        'Front & rear disc brake pads & fluid boiling point',
        'Throttle play & ECU error code scanning'
      ]
    },
    electric: {
      key: 'electric',
      label: 'Electric 2-Wheeler (EV)',
      icon: '⚡',
      subtitle: 'Ather 450X, Ola S1, TVS iQube, Bajaj Chetak',
      defaultOilType: 'gearbox_oil',
      oilTypeLabel: 'Reduction Gearbox Oil',
      oilIntervalKm: 10000,
      oilIntervalMonths: 12,
      serviceIntervalKm: 5000,
      serviceIntervalMonths: 6,
      tyrePressureFront: 30,
      tyrePressureRear: 34,
      avgMileageKmpl: 0,
      checklist: [
        'Primary drive belt tension & alignment',
        'Reduction gearbox transmission oil check/change',
        'Battery SOC & cell balancing health report',
        'Regenerative braking & mechanical disc brake pads',
        'Wiring harness & IP67 ingress seals inspection',
        'Firmware/OTA updates & software diagnostics'
      ]
    },
    car: {
      key: 'car',
      label: 'Car / 4-Wheeler',
      icon: '🚗',
      subtitle: 'Hatchback, Sedan, SUV, Compact Car',
      defaultOilType: 'fully_synthetic',
      oilTypeLabel: 'Synthetic 5W-30 / 0W-20',
      oilIntervalKm: 10000,
      oilIntervalMonths: 12,
      serviceIntervalKm: 10000,
      serviceIntervalMonths: 12,
      tyrePressureFront: 32,
      tyrePressureRear: 32,
      avgMileageKmpl: 16,
      checklist: [
        'Engine oil & oil filter replacement',
        'Air filter & cabin AC pollen filter replacement',
        'Tyre rotation, wheel alignment & balancing',
        'Coolant, brake fluid & windshield washer top-up',
        'Suspension bushes & steering rack boots inspection',
        'Battery load test & alternator charging check'
      ]
    }
  };

  var VehicleService = {
    /**
     * Initialize service from IndexedDB or state cache
     */
    init: async function () {
      try {
        if (typeof window.getAll === 'function') {
          var loaded = await window.getAll('vehicles');
          if (Array.isArray(loaded)) {
            _vehicles = loaded;
            if (typeof state === 'object') {
              state.vehicles = _vehicles;
            }
          }
        } else if (typeof state === 'object' && Array.isArray(state.vehicles)) {
          _vehicles = state.vehicles.slice();
        }
      } catch (err) {
        console.warn('[VehicleService] init error, falling back to state:', err);
        if (typeof state === 'object' && Array.isArray(state.vehicles)) {
          _vehicles = state.vehicles.slice();
        }
      }
      if ((!_vehicles || _vehicles.length === 0) && typeof state === 'object' && Array.isArray(state.vehicles) && state.vehicles.length > 0) {
        _vehicles = state.vehicles.slice();
      }
      _isInitialized = true;
      try {
        await this.syncReminders();
      } catch (e) {
        console.warn('[VehicleService] syncReminders error during init:', e);
      }
      return _vehicles;
    },

    /**
     * Get all vehicles for current profile
     */
    getAllVehicles: function () {
      if ((!_vehicles || _vehicles.length === 0) && typeof state === 'object' && Array.isArray(state.vehicles) && state.vehicles.length > 0) {
        _vehicles = state.vehicles.slice();
      }
      return _vehicles || [];
    },

    /**
     * Get single vehicle by ID
     */
    getVehicleById: function (id) {
      if (!id) return null;
      var list = this.getAllVehicles();
      return list.find(function (v) { return String(v.id) === String(id); }) || null;
    },

    /**
     * Get benchmark specifications by type/key
     */
    getBenchmarkPresets: function () {
      return BENCHMARKS;
    },

    getBenchmark: function (type) {
      return BENCHMARKS[type] || BENCHMARKS.commuter;
    },

    /**
     * Add or update a vehicle record
     */
    saveVehicle: async function (vehicleData) {
      if (!vehicleData) return null;
      var uid = _getProfileId();
      var nowIso = new Date().toISOString();

      var isNew = !vehicleData.id;
      var id = vehicleData.id || _generateId('veh');

      var existing = isNew ? null : this.getVehicleById(id);
      var benchmark = this.getBenchmark(vehicleData.type || 'commuter');

      var vehicle = {
        id: id,
        profile: uid,
        name: String(vehicleData.name || 'My Bike').trim(),
        regNumber: String(vehicleData.regNumber || '').toUpperCase().trim(),
        type: vehicleData.type || 'commuter',
        brand: String(vehicleData.brand || '').trim(),
        model: String(vehicleData.model || '').trim(),
        year: Number(vehicleData.year) || new Date().getFullYear(),
        purchaseDate: vehicleData.purchaseDate || '',
        currentOdometer: Math.max(0, Number(vehicleData.currentOdometer) || 0),
        odometerLastUpdated: vehicleData.odometerLastUpdated || nowIso.split('T')[0],
        avgDailyKm: Math.max(1, Number(vehicleData.avgDailyKm) || 20),
        fuelType: vehicleData.fuelType || (vehicleData.type === 'electric' ? 'electric' : 'petrol'),
        engineCC: Number(vehicleData.engineCC) || 0,
        fuelCapacityLiters: Number(vehicleData.fuelCapacityLiters) || (vehicleData.type === 'scooter' ? 5.5 : 12),

        // Insurance Details
        insurance: {
          provider: String(vehicleData.insurance?.provider || '').trim(),
          policyNumber: String(vehicleData.insurance?.policyNumber || '').trim(),
          policyType: vehicleData.insurance?.policyType || 'comprehensive',
          premiumAmount: Number(vehicleData.insurance?.premiumAmount) || 0,
          startDate: vehicleData.insurance?.startDate || '',
          expiryDate: vehicleData.insurance?.expiryDate || '',
          notes: String(vehicleData.insurance?.notes || '').trim()
        },

        // PUC Details
        puc: {
          certificateNumber: String(vehicleData.puc?.certificateNumber || '').trim(),
          issueDate: vehicleData.puc?.issueDate || '',
          expiryDate: vehicleData.puc?.expiryDate || '',
          cost: Number(vehicleData.puc?.cost) || 0
        },

        // Engine Oil Details
        oil: {
          oilType: vehicleData.oil?.oilType || benchmark.defaultOilType,
          grade: String(vehicleData.oil?.grade || benchmark.oilTypeLabel).trim(),
          brand: String(vehicleData.oil?.brand || '').trim(),
          lastChangedOdometer: Math.max(0, Number(vehicleData.oil?.lastChangedOdometer) || 0),
          lastChangedDate: vehicleData.oil?.lastChangedDate || '',
          recommendedIntervalKm: Number(vehicleData.oil?.recommendedIntervalKm) || benchmark.oilIntervalKm,
          recommendedIntervalMonths: Number(vehicleData.oil?.recommendedIntervalMonths) || benchmark.oilIntervalMonths,
          oilFilterReplaced: !!vehicleData.oil?.oilFilterReplaced,
          cost: Number(vehicleData.oil?.cost) || 0
        },

        // General Service Details
        service: {
          lastServiceOdometer: Math.max(0, Number(vehicleData.service?.lastServiceOdometer) || 0),
          lastServiceDate: vehicleData.service?.lastServiceDate || '',
          recommendedIntervalKm: Number(vehicleData.service?.recommendedIntervalKm) || benchmark.serviceIntervalKm,
          recommendedIntervalMonths: Number(vehicleData.service?.recommendedIntervalMonths) || benchmark.serviceIntervalMonths,
          lastServiceCost: Number(vehicleData.service?.lastServiceCost) || 0,
          serviceCenter: String(vehicleData.service?.serviceCenter || '').trim(),
          nextServiceNotes: String(vehicleData.service?.nextServiceNotes || '').trim()
        },

        // Tyre & Battery Details
        tyres: {
          frontPressurePsi: Number(vehicleData.tyres?.frontPressurePsi) || benchmark.tyrePressureFront,
          rearPressurePsi: Number(vehicleData.tyres?.rearPressurePsi) || benchmark.tyrePressureRear,
          lastPressureCheckDate: vehicleData.tyres?.lastPressureCheckDate || ''
        },
        battery: {
          brand: String(vehicleData.battery?.brand || '').trim(),
          installedDate: vehicleData.battery?.installedDate || '',
          warrantyMonths: Number(vehicleData.battery?.warrantyMonths) || 36
        },

        // Logs
        logs: Array.isArray(vehicleData.logs) ? vehicleData.logs : (existing?.logs || []),
        fuelLogs: Array.isArray(vehicleData.fuelLogs) ? vehicleData.fuelLogs : (existing?.fuelLogs || []),

        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso
      };

      if (isNew) {
        _vehicles.push(vehicle);
      } else {
        var idx = _vehicles.findIndex(function (v) { return v.id === id; });
        if (idx !== -1) _vehicles[idx] = vehicle;
        else _vehicles.push(vehicle);
      }

      if (typeof state === 'object') {
        state.vehicles = _vehicles;
      }

      // Persist to IndexedDB
      if (typeof window.put === 'function') {
        try {
          await window.put('vehicles', vehicle);
        } catch (e) {
          console.error('[VehicleService] saveVehicle DB error:', e);
        }
      }

      // Sync reminders and cloud
      await this.syncReminders();
      if (window.LM_Bus) window.LM_Bus.emit('lm:data:changed', { source: 'vehicles' });

      return vehicle;
    },

    /**
     * Delete a vehicle
     */
    deleteVehicle: async function (id) {
      if (!id) return false;
      _vehicles = _vehicles.filter(function (v) { return String(v.id) !== String(id); });
      if (typeof state === 'object') {
        state.vehicles = _vehicles;
      }

      // Remove from IndexedDB
      if (typeof window.del === 'function') {
        try {
          await window.del('vehicles', id);
        } catch (e) {
          console.error('[VehicleService] deleteVehicle DB error:', e);
        }
      }

      // Clear associated reminders
      await this._clearVehicleReminders(id);
      if (window.LM_Bus) window.LM_Bus.emit('lm:data:changed', { source: 'vehicles' });
      return true;
    },

    /**
     * Fast Odometer update
     */
    updateOdometer: async function (vehicleId, newOdometer) {
      var v = this.getVehicleById(vehicleId);
      if (!v) return null;
      var odo = Math.max(v.currentOdometer || 0, Number(newOdometer) || 0);
      v.currentOdometer = odo;
      v.odometerLastUpdated = new Date().toISOString().split('T')[0];
      v.updatedAt = new Date().toISOString();

      if (typeof window.put === 'function') {
        try { await window.put('vehicles', v); } catch (e) {}
      }
      await this.syncReminders();
      if (window.LM_Bus) window.LM_Bus.emit('lm:data:changed', { source: 'vehicles' });
      return v;
    },

    /**
     * Add a service / maintenance log
     */
    addServiceLog: async function (vehicleId, logEntry, linkToTx) {
      var v = this.getVehicleById(vehicleId);
      if (!v) return null;

      var logId = _generateId('vlog');
      var nowIso = new Date().toISOString();
      var date = logEntry.date || nowIso.split('T')[0];
      var odo = Number(logEntry.odometer) || v.currentOdometer;
      var cost = Number(logEntry.cost) || 0;

      var entry = {
        id: logId,
        date: date,
        odometer: odo,
        type: logEntry.type || 'general_service', // oil_change, general_service, repair, insurance, puc, tyre
        title: String(logEntry.title || 'Vehicle Service').trim(),
        cost: cost,
        workshop: String(logEntry.workshop || '').trim(),
        notes: String(logEntry.notes || '').trim(),
        partsReplaced: Array.isArray(logEntry.partsReplaced) ? logEntry.partsReplaced : [],
        createdAt: nowIso
      };

      if (!Array.isArray(v.logs)) v.logs = [];
      v.logs.unshift(entry);

      // Update current odometer if higher
      if (odo > (v.currentOdometer || 0)) {
        v.currentOdometer = odo;
        v.odometerLastUpdated = date;
      }

      // If oil change logged, update last oil change baseline
      if (entry.type === 'oil_change' || (entry.partsReplaced && entry.partsReplaced.some(function (p) { return /oil/i.test(p); }))) {
        v.oil.lastChangedOdometer = odo;
        v.oil.lastChangedDate = date;
        if (cost > 0) v.oil.cost = cost;
      }

      // If general service logged, update last service baseline
      if (entry.type === 'general_service') {
        v.service.lastServiceOdometer = odo;
        v.service.lastServiceDate = date;
        if (cost > 0) v.service.lastServiceCost = cost;
        if (entry.workshop) v.service.serviceCenter = entry.workshop;
      }

      v.updatedAt = nowIso;

      // Optionally create linked transaction in LedgerMate
      if (linkToTx && cost > 0) {
        if (window.LM_InterlinkEngine && typeof window.LM_InterlinkEngine.recordInterlinkedTx === 'function') {
          var category = entry.type === 'insurance' ? 'Insurance' : 'Automobile';
          var note = (v.name || 'Vehicle') + ' (' + (v.regNumber || '') + ') - ' + entry.title + (entry.workshop ? ' @ ' + entry.workshop : '');
          await window.LM_InterlinkEngine.recordInterlinkedTx({
            sourceModule: window.LM_InterlinkEngine.MODULES.VEHICLES,
            sourceId: v.id,
            refType: entry.type === 'insurance' ? window.LM_InterlinkEngine.REF_TYPES.VEH_INSURANCE : window.LM_InterlinkEngine.REF_TYPES.VEH_SERVICE,
            entityName: (v.name || 'Vehicle') + ' (' + (v.regNumber || '') + ')',
            date: date,
            type: 'out',
            amount: cost,
            category: category,
            account: 'Bank',
            note: note,
            extraData: { vehicleId: v.id, logId: logId, workshop: entry.workshop }
          });
        } else if (typeof window.put === 'function') {
          try {
            var category = entry.type === 'insurance' ? 'Insurance' : 'Automobile';
            var note = (v.name || 'Vehicle') + ' (' + (v.regNumber || '') + ') - ' + entry.title + (entry.workshop ? ' @ ' + entry.workshop : '');
            var txPayload = {
              id: 'tx_veh_' + logId,
              profile: _getProfileId(),
              date: date,
              type: 'out',
              amount: cost,
              category: category,
              account: 'Bank',
              note: note,
              vehicleId: v.id,
              vehicleLogId: logId
            };
            await window.put('transactions', txPayload);
            if (typeof state === 'object' && Array.isArray(state.transactions)) {
              state.transactions.unshift(txPayload);
            }
          } catch (e) {
            console.warn('[VehicleService] Failed to link expense transaction:', e);
          }
        }
      }

      if (typeof window.put === 'function') {
        try { await window.put('vehicles', v); } catch (e) {}
      }

      await this.syncReminders();
      if (window.LM_Bus) window.LM_Bus.emit('lm:data:changed', { source: 'vehicles' });
      return entry;
    },

    /**
     * Add fuel fill-up log with mileage calculation
     */
    addFuelLog: async function (vehicleId, fuelEntry, linkToTx) {
      var v = this.getVehicleById(vehicleId);
      if (!v) return null;

      var fuelId = _generateId('fuel');
      var nowIso = new Date().toISOString();
      var date = fuelEntry.date || nowIso.split('T')[0];
      var odo = Number(fuelEntry.odometer) || v.currentOdometer;
      var liters = Number(fuelEntry.liters) || 0;
      var cost = Number(fuelEntry.cost) || 0;
      var isFullTank = !!fuelEntry.isFullTank;

      // Calculate mileage if prior fuel log exists
      var kmPerLiter = 0;
      var costPerKm = 0;
      if (!Array.isArray(v.fuelLogs)) v.fuelLogs = [];

      if (v.fuelLogs.length > 0 && liters > 0) {
        var lastLog = v.fuelLogs[0];
        if (odo > lastLog.odometer) {
          var dist = odo - lastLog.odometer;
          kmPerLiter = _round2(dist / liters);
          if (dist > 0 && cost > 0) costPerKm = _round2(cost / dist);
        }
      }

      var entry = {
        id: fuelId,
        date: date,
        odometer: odo,
        liters: liters,
        cost: cost,
        isFullTank: isFullTank,
        calculatedKmPerLiter: kmPerLiter,
        calculatedCostPerKm: costPerKm,
        fuelStation: String(fuelEntry.fuelStation || '').trim(),
        createdAt: nowIso
      };

      v.fuelLogs.unshift(entry);

      if (odo > (v.currentOdometer || 0)) {
        v.currentOdometer = odo;
        v.odometerLastUpdated = date;
      }
      v.updatedAt = nowIso;

      // Optionally create linked transaction in LedgerMate
      if (linkToTx && cost > 0) {
        var note = 'Fuel for ' + (v.name || 'Vehicle') + ' (' + (v.regNumber || '') + ') · ' + liters + 'L' + (kmPerLiter > 0 ? ' (' + kmPerLiter + ' km/L)' : '');
        if (window.LM_InterlinkEngine && typeof window.LM_InterlinkEngine.recordInterlinkedTx === 'function') {
          await window.LM_InterlinkEngine.recordInterlinkedTx({
            sourceModule: window.LM_InterlinkEngine.MODULES.VEHICLES,
            sourceId: v.id,
            refType: window.LM_InterlinkEngine.REF_TYPES.VEH_FUEL,
            entityName: (v.name || 'Vehicle') + ' (' + (v.regNumber || '') + ')',
            date: date,
            type: 'out',
            amount: cost,
            category: 'Fuel',
            account: 'Bank',
            note: note,
            extraData: { vehicleId: v.id, fuelId: fuelId, liters: liters, odo: odo }
          });
        } else if (typeof window.put === 'function') {
          try {
            var txPayload = {
              id: 'tx_fuel_' + fuelId,
              profile: _getProfileId(),
              date: date,
              type: 'out',
              amount: cost,
              category: 'Fuel',
              account: 'Bank',
              note: note,
              vehicleId: v.id,
              fuelLogId: fuelId
            };
            await window.put('transactions', txPayload);
            if (typeof state === 'object' && Array.isArray(state.transactions)) {
              state.transactions.unshift(txPayload);
            }
          } catch (e) {
            console.warn('[VehicleService] Failed to link fuel expense:', e);
          }
        }
      }

      if (typeof window.put === 'function') {
        try { await window.put('vehicles', v); } catch (e) {}
      }

      await this.syncReminders();
      if (window.LM_Bus) window.LM_Bus.emit('lm:data:changed', { source: 'vehicles' });
      return entry;
    },

    /**
     * Delete service log
     */
    deleteServiceLog: async function (vehicleId, logId) {
      var v = this.getVehicleById(vehicleId);
      if (!v || !Array.isArray(v.logs)) return false;
      v.logs = v.logs.filter(function (l) { return l.id !== logId; });
      v.updatedAt = new Date().toISOString();
      if (typeof window.put === 'function') {
        try { await window.put('vehicles', v); } catch (e) {}
      }
      return true;
    },

    /**
     * Delete fuel log
     */
    deleteFuelLog: async function (vehicleId, fuelId) {
      var v = this.getVehicleById(vehicleId);
      if (!v || !Array.isArray(v.fuelLogs)) return false;
      v.fuelLogs = v.fuelLogs.filter(function (f) { return f.id !== fuelId; });
      v.updatedAt = new Date().toISOString();
      if (typeof window.put === 'function') {
        try { await window.put('vehicles', v); } catch (e) {}
      }
      return true;
    },

    // ── CALCULATION ENGINES ──────────────────────────────────────────────────

    /**
     * Engine Oil Health & Target Calculation
     */
    calculateOilHealth: function (vehicle) {
      if (!vehicle) return null;
      var curOdo = vehicle.currentOdometer || 0;
      var lastOdo = vehicle.oil?.lastChangedOdometer || 0;
      var intervalKm = vehicle.oil?.recommendedIntervalKm || 3000;
      var intervalMonths = vehicle.oil?.recommendedIntervalMonths || 4;
      var lastDateStr = vehicle.oil?.lastChangedDate || '';

      var kmDriven = Math.max(0, curOdo - lastOdo);
      var kmRemaining = intervalKm - kmDriven;
      var percentRemaining = Math.max(0, Math.min(100, Math.round((kmRemaining / intervalKm) * 100)));

      var targetOdometer = lastOdo + intervalKm;

      // Date forecast based on interval months & average daily usage
      var targetDate = null;
      if (lastDateStr) {
        var d = new Date(lastDateStr);
        d.setMonth(d.getMonth() + intervalMonths);
        targetDate = d.toISOString().split('T')[0];
      }

      // Also compute predicted date by avgDailyKm
      var predictedDate = null;
      var avgDaily = vehicle.avgDailyKm || 20;
      if (kmRemaining > 0 && avgDaily > 0) {
        var daysLeft = Math.round(kmRemaining / avgDaily);
        var predD = new Date();
        predD.setDate(predD.getDate() + daysLeft);
        predictedDate = predD.toISOString().split('T')[0];
      }

      var now = new Date();
      var isDateOverdue = targetDate ? new Date(targetDate) < now : false;
      var isKmOverdue = kmRemaining <= 0;
      var isOverdue = isKmOverdue || isDateOverdue;
      var isDueSoon = !isOverdue && (kmRemaining <= 300 || (targetDate && (new Date(targetDate) - now) / 86400000 <= 15));

      var status = isOverdue ? 'overdue' : (isDueSoon ? 'due_soon' : 'good');

      return {
        kmDriven: kmDriven,
        kmRemaining: kmRemaining,
        percentRemaining: percentRemaining,
        targetOdometer: targetOdometer,
        targetDate: targetDate || predictedDate,
        predictedDate: predictedDate,
        isOverdue: isOverdue,
        isDueSoon: isDueSoon,
        status: status,
        oilType: vehicle.oil?.oilType || 'mineral',
        grade: vehicle.oil?.grade || '10W-30'
      };
    },

    /**
     * Periodic General Service Calculation
     */
    calculateServiceDue: function (vehicle) {
      if (!vehicle) return null;
      var curOdo = vehicle.currentOdometer || 0;
      var lastOdo = vehicle.service?.lastServiceOdometer || 0;
      var intervalKm = vehicle.service?.recommendedIntervalKm || 3500;
      var intervalMonths = vehicle.service?.recommendedIntervalMonths || 4;
      var lastDateStr = vehicle.service?.lastServiceDate || '';

      var kmDriven = Math.max(0, curOdo - lastOdo);
      var kmRemaining = intervalKm - kmDriven;
      var percentRemaining = Math.max(0, Math.min(100, Math.round((kmRemaining / intervalKm) * 100)));
      var targetOdometer = lastOdo + intervalKm;

      var targetDate = null;
      if (lastDateStr) {
        var d = new Date(lastDateStr);
        d.setMonth(d.getMonth() + intervalMonths);
        targetDate = d.toISOString().split('T')[0];
      }

      var avgDaily = vehicle.avgDailyKm || 20;
      var predictedDate = null;
      if (kmRemaining > 0 && avgDaily > 0) {
        var daysLeft = Math.round(kmRemaining / avgDaily);
        var predD = new Date();
        predD.setDate(predD.getDate() + daysLeft);
        predictedDate = predD.toISOString().split('T')[0];
      }

      var now = new Date();
      var isDateOverdue = targetDate ? new Date(targetDate) < now : false;
      var isKmOverdue = kmRemaining <= 0;
      var isOverdue = isKmOverdue || isDateOverdue;
      var isDueSoon = !isOverdue && (kmRemaining <= 400 || (targetDate && (new Date(targetDate) - now) / 86400000 <= 15));

      return {
        kmDriven: kmDriven,
        kmRemaining: kmRemaining,
        percentRemaining: percentRemaining,
        targetOdometer: targetOdometer,
        targetDate: targetDate || predictedDate,
        isOverdue: isOverdue,
        isDueSoon: isDueSoon,
        status: isOverdue ? 'overdue' : (isDueSoon ? 'due_soon' : 'good')
      };
    },

    /**
     * Insurance Expiry Status
     */
    calculateInsuranceStatus: function (vehicle) {
      if (!vehicle || !vehicle.insurance || !vehicle.insurance.expiryDate) {
        return { hasPolicy: false, status: 'none', daysRemaining: null, expiryDate: '' };
      }
      var expiryStr = vehicle.insurance.expiryDate;
      var expDate = new Date(expiryStr);
      var now = new Date();
      now.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);

      var diffDays = Math.round((expDate - now) / (1000 * 60 * 60 * 24));
      var isExpired = diffDays < 0;
      var isExpiringSoon = !isExpired && diffDays <= 30;

      return {
        hasPolicy: true,
        provider: vehicle.insurance.provider || 'Insurer',
        policyNumber: vehicle.insurance.policyNumber || '',
        expiryDate: expiryStr,
        daysRemaining: diffDays,
        isExpired: isExpired,
        isExpiringSoon: isExpiringSoon,
        status: isExpired ? 'expired' : (isExpiringSoon ? 'expiring_soon' : 'active')
      };
    },

    /**
     * PUC (Pollution Certificate) Status
     */
    calculatePucStatus: function (vehicle) {
      if (!vehicle || !vehicle.puc || !vehicle.puc.expiryDate) {
        return { hasPuc: false, status: 'none', daysRemaining: null, expiryDate: '' };
      }
      var expiryStr = vehicle.puc.expiryDate;
      var expDate = new Date(expiryStr);
      var now = new Date();
      now.setHours(0, 0, 0, 0);
      expDate.setHours(0, 0, 0, 0);

      var diffDays = Math.round((expDate - now) / (1000 * 60 * 60 * 24));
      var isExpired = diffDays < 0;
      var isExpiringSoon = !isExpired && diffDays <= 15;

      return {
        hasPuc: true,
        certificateNumber: vehicle.puc.certificateNumber || '',
        expiryDate: expiryStr,
        daysRemaining: diffDays,
        isExpired: isExpired,
        isExpiringSoon: isExpiringSoon,
        status: isExpired ? 'expired' : (isExpiringSoon ? 'expiring_soon' : 'active')
      };
    },

    // ── REMINDERS SYNCHRONIZER ───────────────────────────────────────────────

    /**
     * Synchronize vehicle due alerts with LedgerMate central reminders store
     */
    syncReminders: async function () {
      if (!Array.isArray(_vehicles)) return [];
      var self = this;
      var existingReminders = [];

      if (typeof window.getAll === 'function') {
        try {
          var loaded = await window.getAll('reminders');
          if (Array.isArray(loaded)) existingReminders = loaded;
        } catch (e) {
          existingReminders = (typeof state === 'object' && Array.isArray(state.reminders)) ? state.reminders : [];
        }
      } else if (typeof state === 'object' && Array.isArray(state.reminders)) {
        existingReminders = state.reminders;
      }

      var remMap = new Map();
      existingReminders.forEach(function (r) {
        if (r && r.id) remMap.set(String(r.id), r);
      });

      for (var i = 0; i < _vehicles.length; i++) {
        var v = _vehicles[i];
        var vLabel = (v.name || 'Bike') + (v.regNumber ? ' (' + v.regNumber + ')' : '');

        // 1. Insurance Reminder
        var ins = self.calculateInsuranceStatus(v);
        var insRemId = 'rem_veh_ins_' + v.id;
        if (ins.hasPolicy && ins.expiryDate) {
          var insDue = ins.isExpired || ins.isExpiringSoon;
          var insPrio = ins.isExpired ? 'high' : (ins.daysRemaining <= 7 ? 'high' : 'medium');
          var insExisting = remMap.get(insRemId);

          var updatedInsRem = {
            id: insRemId,
            vehicleId: v.id,
            title: 'Renew Insurance for ' + vLabel,
            dueDate: ins.expiryDate,
            time: '09:00',
            priority: insPrio,
            tag: 'Vehicle',
            category: 'Insurance',
            note: (ins.isExpired ? '⚠️ POLICY EXPIRED ' + Math.abs(ins.daysRemaining) + ' days ago!' : 'Policy expires in ' + ins.daysRemaining + ' days.') + ' Provider: ' + ins.provider + (ins.policyNumber ? ' (No: ' + ins.policyNumber + ')' : ''),
            completed: !insDue,
            autoRepeat: false,
            createdAt: insExisting?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          remMap.set(insRemId, updatedInsRem);
          if (typeof window.put === 'function') {
            try { await window.put('reminders', updatedInsRem); } catch (e) {}
          }
        }

        // 2. Engine Oil Change Reminder
        var oil = self.calculateOilHealth(v);
        var oilRemId = 'rem_veh_oil_' + v.id;
        if (oil && (oil.isOverdue || oil.isDueSoon)) {
          var oilPrio = oil.isOverdue ? 'high' : 'medium';
          var oilExisting = remMap.get(oilRemId);
          var oilDueDate = oil.targetDate || new Date().toISOString().split('T')[0];

          var updatedOilRem = {
            id: oilRemId,
            vehicleId: v.id,
            title: 'Engine Oil Change Due: ' + vLabel,
            dueDate: oilDueDate,
            time: '10:00',
            priority: oilPrio,
            tag: 'Vehicle',
            category: 'Maintenance',
            note: (oil.isOverdue ? '🚨 OVERDUE! ' : '⏳ Due soon: ') + (oil.kmRemaining <= 0 ? Math.abs(oil.kmRemaining) + ' km overdue' : oil.kmRemaining + ' km remaining') + '. Recommended: ' + oil.grade + ' (' + oil.oilType + '). Current Odometer: ' + (v.currentOdometer || 0) + ' km.',
            completed: false,
            autoRepeat: false,
            createdAt: oilExisting?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          remMap.set(oilRemId, updatedOilRem);
          if (typeof window.put === 'function') {
            try { await window.put('reminders', updatedOilRem); } catch (e) {}
          }
        } else if (oil && !oil.isOverdue && !oil.isDueSoon) {
          var existingOil = remMap.get(oilRemId);
          if (existingOil && !existingOil.completed) {
            existingOil.completed = true;
            remMap.set(oilRemId, existingOil);
            if (typeof window.put === 'function') {
              try { await window.put('reminders', existingOil); } catch (e) {}
            }
          }
        }

        // 3. Periodic General Service Reminder
        var srv = self.calculateServiceDue(v);
        var srvRemId = 'rem_veh_srv_' + v.id;
        if (srv && (srv.isOverdue || srv.isDueSoon)) {
          var srvPrio = srv.isOverdue ? 'high' : 'medium';
          var srvExisting = remMap.get(srvRemId);
          var srvDueDate = srv.targetDate || new Date().toISOString().split('T')[0];

          var updatedSrvRem = {
            id: srvRemId,
            vehicleId: v.id,
            title: 'Periodic Service Due: ' + vLabel,
            dueDate: srvDueDate,
            time: '11:00',
            priority: srvPrio,
            tag: 'Vehicle',
            category: 'Maintenance',
            note: (srv.isOverdue ? '🚨 Service overdue! ' : 'Service due: ') + (srv.kmRemaining <= 0 ? Math.abs(srv.kmRemaining) + ' km past target' : srv.kmRemaining + ' km remaining') + ' (Target: ' + srv.targetOdometer + ' km).',
            completed: false,
            autoRepeat: false,
            createdAt: srvExisting?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          remMap.set(srvRemId, updatedSrvRem);
          if (typeof window.put === 'function') {
            try { await window.put('reminders', updatedSrvRem); } catch (e) {}
          }
        } else if (srv && !srv.isOverdue && !srv.isDueSoon) {
          var existingSrv = remMap.get(srvRemId);
          if (existingSrv && !existingSrv.completed) {
            existingSrv.completed = true;
            remMap.set(srvRemId, existingSrv);
            if (typeof window.put === 'function') {
              try { await window.put('reminders', existingSrv); } catch (e) {}
            }
          }
        }

        // 4. PUC Reminder
        var puc = self.calculatePucStatus(v);
        var pucRemId = 'rem_veh_puc_' + v.id;
        if (puc.hasPuc && puc.expiryDate && (puc.isExpired || puc.isExpiringSoon)) {
          var pucPrio = puc.isExpired ? 'high' : 'medium';
          var pucExisting = remMap.get(pucRemId);

          var updatedPucRem = {
            id: pucRemId,
            vehicleId: v.id,
            title: 'Renew PUC Certificate: ' + vLabel,
            dueDate: puc.expiryDate,
            time: '10:00',
            priority: pucPrio,
            tag: 'Vehicle',
            category: 'Compliance',
            note: (puc.isExpired ? '⚠️ PUC EXPIRED ' + Math.abs(puc.daysRemaining) + ' days ago! Avoid traffic fine.' : 'PUC expires in ' + puc.daysRemaining + ' days.'),
            completed: false,
            autoRepeat: false,
            createdAt: pucExisting?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          remMap.set(pucRemId, updatedPucRem);
          if (typeof window.put === 'function') {
            try { await window.put('reminders', updatedPucRem); } catch (e) {}
          }
        } else if (puc.hasPuc && !puc.isExpired && !puc.isExpiringSoon) {
          var existingPuc = remMap.get(pucRemId);
          if (existingPuc && !existingPuc.completed) {
            existingPuc.completed = true;
            remMap.set(pucRemId, existingPuc);
            if (typeof window.put === 'function') {
              try { await window.put('reminders', existingPuc); } catch (e) {}
            }
          }
        }
      }

      var mergedList = Array.from(remMap.values());
      if (typeof state === 'object') {
        state.reminders = mergedList;
      }
      return mergedList;
    },

    _clearVehicleReminders: async function (vehicleId) {
      if (!vehicleId) return;
      var prefixes = ['rem_veh_ins_' + vehicleId, 'rem_veh_oil_' + vehicleId, 'rem_veh_srv_' + vehicleId, 'rem_veh_puc_' + vehicleId];
      if (typeof window.del === 'function') {
        for (var i = 0; i < prefixes.length; i++) {
          try { await window.del('reminders', prefixes[i]); } catch (e) {}
        }
      }
      if (typeof state === 'object' && Array.isArray(state.reminders)) {
        state.reminders = state.reminders.filter(function (r) {
          return prefixes.indexOf(String(r.id)) === -1;
        });
      }
    },

    // ── COMMON JSON EXPORT & IMPORT HOOKS ────────────────────────────────────

    exportData: function () {
      return this.getAllVehicles();
    },

    importData: async function (importedVehicles) {
      if (!Array.isArray(importedVehicles)) return false;
      _vehicles = importedVehicles;
      if (typeof state === 'object') {
        state.vehicles = _vehicles;
      }
      for (var i = 0; i < _vehicles.length; i++) {
        if (typeof window.put === 'function') {
          try { await window.put('vehicles', _vehicles[i]); } catch (e) {}
        }
      }
      await this.syncReminders();
      return true;
    }
  };

  window.LM_VehicleService = VehicleService;

  // Auto-init on DOM readiness, app readiness, and bus events
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        VehicleService.init();
      });
    } else {
      VehicleService.init();
    }
    document.addEventListener('lm:app:ready', function () {
      VehicleService.init();
    });
  }

  if (typeof window !== 'undefined' && window.LM_Bus && typeof window.LM_Bus.on === 'function') {
    window.LM_Bus.on('lm:app:ready', function () { VehicleService.init(); });
    window.LM_Bus.on('lm:auth:login', function () { VehicleService.init(); });
    window.LM_Bus.on('lm:data:changed', function (ev) {
      if (ev && (ev.store === 'vehicles' || ev.source === 'vehicles' || !ev.store)) {
        VehicleService.init();
      }
    });
  }

})();
