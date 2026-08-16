'use strict';

const assert = require('node:assert/strict');
const { calculateFitting } = require('../assets/js/fittings.js');
const { ACCESSORY_STATUS, SHEET_MATERIALS } = require('../assets/js/calculations.js');

const EPS = 1e-9;
const approx = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < EPS, `${message}: ${actual} !== ${expected}`);
const base = overrides => ({
  fittingType: 'ELBOW', ductType: 'RECTANGULAR', widthMm: 800, heightMm: 500, lengthM: 10, quantity: 5,
  sheetThicknessMm: 0.8, sheetMaterial: 'galvanized', sheetDensity: SHEET_MATERIALS.galvanized.density,
  radiusMm: 500, angleDeg: 90, fittingWasteRate: 10, jointBasis: 'PER_RUN', jointType: 'TDF', fabricationLengthM: 2.5,
  pressureClass: 'medium', ...overrides
});
const accessoryKeys = ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers'];

function assertAccessoryContract(item) {
  for (const key of accessoryKeys) {
    const line = item.accessoryDetails[key];
    assert.ok(line, `Missing accessory ${key}`);
    for (const field of ['net', 'waste', 'procurement', 'unit', 'status', 'formula', 'inputs', 'basis', 'source']) {
      assert.ok(Object.hasOwn(line, field), `${key}.${field} missing`);
    }
    approx(line.procurement, line.net + line.waste, `${key} procurement contract`);
  }
}

// A-01: Elbow manual audit — perimeter × centerline arc × quantity.
const elbow = calculateFitting(base());
const perimeter = 2 * (0.8 + 0.5);
const arc = 2 * Math.PI * 0.5 * 90 / 360;
const expectedArea = perimeter * arc * 5;
approx(elbow.netArea, expectedArea, 'Elbow net area');
approx(elbow.wasteArea, expectedArea * 0.10, 'Elbow waste area');
approx(elbow.procurementArea, expectedArea * 1.10, 'Elbow procurement area');
approx(elbow.netWeight, expectedArea * 0.0008 * 7850, 'Elbow net weight');
approx(elbow.procurementWeight, elbow.procurementArea * 0.0008 * 7850, 'Elbow procurement weight');
assert.equal(elbow.status, ACCESSORY_STATUS.ESTIMATED);
assert.equal(elbow.joints, 15);
assert.equal(elbow.sectionCount, 20);
assert.match(elbow.formula, /2π/);
assert.match(elbow.basis, /centerline arc/);
assert.equal(elbow.source, 'UNVERIFIED');
assertAccessoryContract(elbow);

// A-02: Unit conversion and round geometry remain deterministic.
const round = calculateFitting(base({ ductType: 'ROUND', diameterMm: 500, widthMm: null, heightMm: null }));
approx(round.netArea, (Math.PI * 0.5) * arc * 5, 'Round elbow net area');
assert.equal(round.ductType, 'ROUND');

// A-03: All unsupported types must require fabrication area; no replacement geometry is invented.
for (const type of ['TEE', 'REDUCER', 'TRANSITION', 'OFFSET', 'CUSTOM_FITTING']) {
  const missing = calculateFitting(base({ fittingType: type, fabricationAreaM2: null }));
  assert.equal(missing.status, ACCESSORY_STATUS.INPUT_REQUIRED, `${type} missing area status`);
  assert.equal(missing.netArea, 0, `${type} must not invent area`);
  assert.match(missing.formula, /input required/i);
  assertAccessoryContract(missing);
  const configured = calculateFitting(base({ fittingType: type, fabricationAreaM2: 2.5, fittingWasteRate: 0 }));
  assert.equal(configured.status, ACCESSORY_STATUS.ESTIMATED, `${type} configured status`);
  approx(configured.netArea, 12.5, `${type} configured area`);
  approx(configured.procurementArea, configured.netArea, `${type} zero-waste procurement`);
}

// A-04: End Cap uses its own end-face formula and does not inherit linear connection accessories.
const endCap = calculateFitting(base({ fittingType: 'END_CAP', fittingWasteRate: 0 }));
approx(endCap.netArea, 0.8 * 0.5 * 5, 'End cap area');
assert.equal(endCap.status, ACCESSORY_STATUS.ESTIMATED);
for (const key of accessoryKeys) assert.equal(endCap.accessoryDetails[key].status, ACCESSORY_STATUS.NOT_APPLICABLE, `End cap ${key}`);

// A-05: Joint Engine is the sole source of joint totals; Fitting does not recalculate joints.
const global = calculateFitting(base({ jointBasis: 'GLOBAL' }));
const manual = calculateFitting(base({ jointBasis: 'MANUAL', fabricationLengthM: null, manualJointCount: 17 }));
assert.deepEqual([elbow.joints, global.joints, manual.joints], [15, 19, 17]);
assert.deepEqual([elbow.sectionCount, global.sectionCount, manual.sectionCount], [20, 20, null]);
assert.equal(elbow.totalLengthM, 50);
assert.equal(global.totalLengthM, 50);
assert.equal(manual.totalLengthM, 50);

// A-06: Pressure Class is input-only and does not change geometry or quantities.
const noPressure = calculateFitting(base({ pressureClass: null }));
approx(noPressure.netArea, elbow.netArea, 'Pressure-neutral area');
approx(noPressure.netWeight, elbow.netWeight, 'Pressure-neutral weight');
assert.match(elbow.inputs, /Pressure Class=medium/);
assert.match(elbow.basis, /fabrication detail not assumed/);

// A-07: Waste contract and invalid waste values.
const zeroWaste = calculateFitting(base({ fittingWasteRate: 0 }));
approx(zeroWaste.wasteArea, 0, 'Zero waste area');
approx(zeroWaste.procurementArea, zeroWaste.netArea, 'Zero waste procurement');
assert.throws(() => calculateFitting(base({ fittingWasteRate: -1 })), /waste rate must be zero or greater/i);
assert.throws(() => calculateFitting(base({ fittingWasteRate: 'not-a-number' })), /waste rate must be zero or greater/i);

// A-08: Missing/invalid dimensions, quantity, and material inputs are rejected.
assert.throws(() => calculateFitting(base({ radiusMm: null })), /Elbow radius is required/);
assert.throws(() => calculateFitting(base({ angleDeg: 0 })), /Elbow angle must be greater than zero/);
assert.throws(() => calculateFitting(base({ angleDeg: 361 })), /cannot exceed 360/);
assert.throws(() => calculateFitting(base({ quantity: 1.5 })), /quantity must be a whole number/);
assert.throws(() => calculateFitting(base({ widthMm: null })), /Fitting width is required/);
assert.throws(() => calculateFitting(base({ sheetDensity: null, sheetMaterial: 'unknown-material' })), /material density is required/);

// A-09: Accessories do not inherit straight-duct rules; unavailable Fitting rules stay INPUT_REQUIRED.
for (const key of accessoryKeys) assert.equal(elbow.accessoryDetails[key].status, ACCESSORY_STATUS.INPUT_REQUIRED, `Elbow ${key} rule status`);
for (const key of accessoryKeys) assert.match(elbow.accessoryDetails[key].basis, /fitting-specific connection rule/i);

console.log('Sprint 4.1 Fittings audit passed: formulas, units, Net/Waste/Procurement, weight, validation, Joint Engine dependency, accessories, Pressure Class, status/source, and no invented geometry.');
