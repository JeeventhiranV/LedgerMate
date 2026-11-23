/**
 * Test Suite 07: Travel Trips, Vehicles Tracking & Bill Splitter
 * Validates TripService, VehicleService, and BillSplitter Debt Simplification.
 */
const path = require('path');
const { TestSuite, setupMockBrowser, assert } = require('./test_helper');

const suite = new TestSuite('07: Travel Trips, Vehicles Tracking & Bill Splitter');
const ROOT = path.resolve(__dirname, '..');

// Setup mock browser environment
setupMockBrowser();

// Provide state
window.state = {
  trips: [],
  vehicles: []
};

// Load modules
require(path.resolve(ROOT, 'src/scripts/Core/CurrencyFormatter.js'));
require(path.resolve(ROOT, 'src/scripts/Core/DateUtils.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/BillSplitter.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/Vehicles/VehicleService.js'));
require(path.resolve(ROOT, 'src/scripts/Modules/Trips/TripService.js'));

(async () => {
  // ── BillSplitter Debt Simplification Tests ─────────────────────────────
  await suite.it('BillSplitter: reduces 3-party debt graph to minimum transactions', () => {
    assert(window.LM_BillSplitter && typeof window.LM_BillSplitter.simplifyDebts === 'function');

    // Scenario: Dinner bill total ₹3,000 split equally ₹1,000 each.
    // Rahul paid ₹3,000, Priya paid ₹0, Amit paid ₹0.
    const members = [
      { id: 'm1', name: 'Rahul', upi: 'rahul@upi', paid: 3000, share: 1000 },
      { id: 'm2', name: 'Priya', upi: 'priya@upi', paid: 0, share: 1000 },
      { id: 'm3', name: 'Amit', upi: 'amit@upi', paid: 0, share: 1000 }
    ];

    const settlements = window.LM_BillSplitter.simplifyDebts(members);
    assert.strictEqual(settlements.length, 2, 'Should require exactly 2 settlement transactions');
    
    // Priya pays Rahul ₹1,000
    const priyaToRahul = settlements.find(s => s.fromName === 'Priya' && s.toName === 'Rahul');
    assert(priyaToRahul, 'Priya must pay Rahul');
    assert.strictEqual(priyaToRahul.amount, 1000);
    assert(priyaToRahul.upiLink.includes('upi://pay?pa=rahul%40upi'), 'Should include valid UPI link for payee');
    assert(priyaToRahul.upiLink.includes('am=1000.00'), 'UPI link should specify ₹1000.00');

    // Amit pays Rahul ₹1,000
    const amitToRahul = settlements.find(s => s.fromName === 'Amit' && s.toName === 'Rahul');
    assert(amitToRahul, 'Amit must pay Rahul');
    assert.strictEqual(amitToRahul.amount, 1000);
  });

  await suite.it('BillSplitter: handles multi-payer transitive debt settlement (A owes B, B owes C)', () => {
    // Person 1 paid 500, share 200 (net: +300)
    // Person 2 paid 100, share 200 (net: -100)
    // Person 3 paid 0, share 200 (net: -200)
    const members = [
      { id: 'p1', name: 'Alice', upi: 'alice@upi', paid: 500, share: 200 },
      { id: 'p2', name: 'Bob', upi: 'bob@upi', paid: 100, share: 200 },
      { id: 'p3', name: 'Charlie', upi: 'charlie@upi', paid: 0, share: 200 }
    ];

    const settlements = window.LM_BillSplitter.simplifyDebts(members);
    assert.strictEqual(settlements.length, 2);
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    assert.strictEqual(totalSettled, 300); // exactly matches Alice's net credit
  });

  // ── VehicleService Tests ───────────────────────────────────────────────
  await suite.it('VehicleService: manages vehicle records and provides benchmark maintenance intervals', async () => {
    assert(window.LM_VehicleService, 'LM_VehicleService must be exported');

    const presets = window.LM_VehicleService.getBenchmarkPresets();
    assert(presets.scooter, 'Scooter preset must exist');
    assert.strictEqual(presets.scooter.oilIntervalKm, 3000);
    assert.strictEqual(presets.scooter.avgMileageKmpl, 45);

    const vehicle = await window.LM_VehicleService.saveVehicle({
      id: 'veh_activa_6g',
      name: 'Honda Activa 6G',
      regNumber: 'KA-05-MM-1234',
      type: 'scooter',
      currentOdo: 12500,
      lastOilOdo: 10000
    });

    assert(vehicle, 'Saved vehicle should be returned');
    assert.strictEqual(vehicle.name, 'Honda Activa 6G');
    assert.strictEqual(vehicle.regNumber, 'KA-05-MM-1234');
  });

  // ── TripService Tests ──────────────────────────────────────────────────
  await suite.it('TripService: computes individual companion financials and net balances', () => {
    assert(window.LM_TripService, 'LM_TripService must be exported');

    // Register a mock trip in memory
    const mockTrip = {
      id: 'trip_goa_2026',
      title: 'Goa Weekend Getaway',
      persons: [
        { id: 'u1', name: 'Karthik' },
        { id: 'u2', name: 'Vignesh' }
      ],
      plans: [
        {
          id: 'plan_resort',
          title: 'Resort Stay',
          expenses: [
            {
              id: 'exp_hotel',
              amount: 8000,
              paidBy: 'u1',
              sharedWith: ['u1', 'u2'],
              splitType: 'equal'
            }
          ]
        }
      ]
    };

    window.state.trips = [mockTrip];

    // u1 paid 8000, share is 4000 -> netBalance = +4000 (isOwed)
    const karthikFin = window.LM_TripService.getPersonFinancials('trip_goa_2026', 'u1');
    assert.strictEqual(karthikFin.totalPaid, 8000);
    assert.strictEqual(karthikFin.totalShare, 4000);
    assert.strictEqual(karthikFin.netBalance, 4000);
    assert.strictEqual(karthikFin.isOwed, true);

    // u2 paid 0, share is 4000 -> netBalance = -4000 (owes)
    const vigneshFin = window.LM_TripService.getPersonFinancials('trip_goa_2026', 'u2');
    assert.strictEqual(vigneshFin.totalPaid, 0);
    assert.strictEqual(vigneshFin.totalShare, 4000);
    assert.strictEqual(vigneshFin.netBalance, -4000);
    assert.strictEqual(vigneshFin.owes, true);
  });

  // ── Vehicle Maintenance Reminders Completion Tests ──────────────────────
  await suite.it('VehicleService: preserves completed: true for oil change reminder across syncReminders', async () => {
    // 1. Setup a test vehicle with overdue oil change
    const vehId = 'veh_test_oil_' + Date.now();
    await window.LM_VehicleService.saveVehicle({
      id: vehId,
      name: 'Yamaha Aerox',
      regNumber: 'KA-01-EQ-9999',
      type: 'scooter',
      currentOdometer: 15000,
      oil: {
        lastChangedOdometer: 10000,
        recommendedIntervalKm: 3000,
        recommendedIntervalMonths: 3,
        lastChangedDate: '2025-01-01',
        oilType: 'scooter_4t',
        grade: '10W-30'
      }
    });

    // 2. Trigger syncReminders: should generate overdue reminder with completed: false
    let reminders = await window.LM_VehicleService.syncReminders();
    const oilRemId = 'rem_veh_oil_' + vehId;
    let oilRem = reminders.find(r => r.id === oilRemId);
    assert(oilRem, 'Oil change reminder must be generated');
    assert.strictEqual(oilRem.completed, false, 'Initial overdue reminder should have completed: false');

    // 3. Simulate user marking reminder as DONE
    oilRem.completed = true;
    oilRem.completedAt = new Date().toISOString();
    window.state.reminders = reminders;

    // 4. Trigger syncReminders again: MUST PRESERVE completed: true!
    let secondSync = await window.LM_VehicleService.syncReminders();
    let oilRemAfterSync = secondSync.find(r => r.id === oilRemId);
    assert(oilRemAfterSync, 'Oil reminder should still exist in reminders');
    assert.strictEqual(oilRemAfterSync.completed, true, 'Oil change reminder MUST preserve completed: true across sync cycles');

    // 5. Test completeMaintenanceReminder helper
    const baselineAdvanced = await window.LM_VehicleService.completeMaintenanceReminder(vehId, 'oil');
    assert.strictEqual(baselineAdvanced, true, 'completeMaintenanceReminder should succeed');
    const updatedVeh = window.LM_VehicleService.getVehicleById(vehId);
    assert.strictEqual(updatedVeh.oil.lastChangedOdometer, 15000, 'Last changed odometer must advance to current');
  });

  suite.summary();
})();
