#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { calculateFitting, FITTING_TYPES } = require('../assets/js/fittings.js');
const { ACCESSORY_STATUS, SHEET_MATERIALS } = require('../assets/js/calculations.js');

const base = overrides => ({
  fittingType: 'ELBOW', ductType: 'RECTANGULAR', widthMm: 800, heightMm: 500, lengthM: 10, quantity: 5,
  sheetThicknessMm: 0.8, sheetMaterial: 'galvanized', sheetDensity: SHEET_MATERIALS.galvanized.density,
  radiusMm: 500, angleDeg: 90, fittingWasteRate: 10, jointBasis: 'PER_RUN', jointType: 'TDF', fabricationLengthM: 2.5,
  pressureClass: 'medium', ...overrides
});
const settingsKeys = ['netArea', 'wasteArea', 'procurementArea', 'netWeight', 'wasteWeight', 'procurementWeight', 'accessoryDetails', 'status', 'formula', 'inputs', 'basis', 'source'];
const accessoryKeys = ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers'];

function assertContract(item) {
  for (const key of settingsKeys) assert.ok(Object.hasOwn(item, key), `Missing fitting contract field ${key}`);
  assert.ok(Math.abs(item.procurementArea - (item.netArea + item.wasteArea)) < 1e-9);
  assert.ok(Math.abs(item.procurementWeight - (item.netWeight + item.wasteWeight)) < 1e-9);
  for (const key of accessoryKeys) {
    const line = item.accessoryDetails[key];
    assert.ok(line, `Missing accessory ${key}`);
    for (const field of ['net', 'waste', 'procurement', 'unit', 'status', 'formula', 'inputs', 'basis', 'source']) assert.ok(Object.hasOwn(line, field), `${key}.${field}`);
    assert.equal(line.procurement, line.net + line.waste);
  }
}

// F-01: Rectangular Elbow uses its own geometric centerline arc formula.
const elbowRect = calculateFitting(base());
assertContract(elbowRect);
assert.equal(elbowRect.itemKind, 'FITTING');
assert.equal(elbowRect.fittingType, FITTING_TYPES.ELBOW);
assert.equal(elbowRect.joints, 15);
assert.equal(elbowRect.sectionCount, 20);
assert.equal(elbowRect.netArea > 0, true);
assert.ok(Math.abs(elbowRect.wasteArea - (elbowRect.netArea * 0.1)) < 1e-9);
assert.match(elbowRect.formula, /2π/);
assert.equal(elbowRect.status, ACCESSORY_STATUS.ESTIMATED);

// F-02: Round Elbow uses diameter perimeter and the same independent Elbow geometry.
const elbowRound = calculateFitting(base({ ductType: 'ROUND', diameterMm: 500, widthMm: null, heightMm: null }));
assertContract(elbowRound);
assert.equal(elbowRound.ductType, 'ROUND');
assert.notEqual(elbowRound.netArea, elbowRect.netArea);

// F-03: TEE is not silently assigned a straight-duct formula; it requires a fabrication area.
const tee = calculateFitting(base({ fittingType: 'TEE', fabricationAreaM2: null }));
assert.equal(tee.status, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(tee.netArea, 0);
assert.match(tee.formula, /Fabrication Area input required/);

// F-04: Reducer, Transition, and Offset require explicit geometry/area rather than invention.
for (const type of ['REDUCER', 'TRANSITION', 'OFFSET']) {
  const item = calculateFitting(base({ fittingType: type, fabricationAreaM2: null }));
  assert.equal(item.status, ACCESSORY_STATUS.INPUT_REQUIRED, `${type} status`);
  assert.equal(item.netArea, 0, `${type} no invented area`);
  const configured = calculateFitting(base({ fittingType: type, fabricationAreaM2: 2.5, fittingWasteRate: 0 }));
  assert.equal(configured.status, ACCESSORY_STATUS.ESTIMATED);
  assert.equal(configured.netArea, 12.5);
  assert.equal(configured.procurementArea, 12.5);
}

// F-05: End Cap has a separately defined end-face formula and no assumed connection accessories.
const endCap = calculateFitting(base({ fittingType: 'END_CAP', fittingWasteRate: 0 }));
assert.equal(endCap.status, ACCESSORY_STATUS.ESTIMATED);
assert.equal(endCap.netArea, 0.8 * 0.5 * 5);
assert.match(endCap.formula, /0.8 m/);
for (const key of accessoryKeys) assert.equal(endCap.accessoryDetails[key].status, ACCESSORY_STATUS.NOT_APPLICABLE, `End cap ${key}`);

// F-06: Custom fitting remains INPUT_REQUIRED without a verified geometry rule.
const custom = calculateFitting(base({ fittingType: 'CUSTOM_FITTING', fabricationAreaM2: null }));
assert.equal(custom.status, ACCESSORY_STATUS.INPUT_REQUIRED);
for (const key of accessoryKeys) assert.equal(custom.accessoryDetails[key].status, ACCESSORY_STATUS.INPUT_REQUIRED, `Custom ${key}`);

// F-07: Joint Basis comes only from Joint Engine calculation and supports all three modes.
const global = calculateFitting(base({ jointBasis: 'GLOBAL' }));
const manual = calculateFitting(base({ jointBasis: 'MANUAL', fabricationLengthM: null, manualJointCount: 17 }));
assert.deepEqual([elbowRect.joints, global.joints, manual.joints], [15, 19, 17]);
assert.equal(elbowRect.accessoryDetails.flange.status, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(global.accessoryDetails.flange.status, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(manual.accessoryDetails.flange.status, ACCESSORY_STATUS.INPUT_REQUIRED);

// F-08: Pressure Class is input-only and cannot change geometry or quantities.
const noPressure = calculateFitting(base({ pressureClass: null }));
assert.equal(noPressure.netArea, elbowRect.netArea);
assert.equal(noPressure.netWeight, elbowRect.netWeight);
assert.match(elbowRect.inputs, /Pressure Class=medium/);
assert.match(elbowRect.basis, /fabrication detail/);

// F-09: Validation rejects missing/invalid dimensions and quantities.
assert.throws(() => calculateFitting(base({ fittingRadius: null, radiusMm: null })), /Elbow radius is required/);
assert.throws(() => calculateFitting(base({ angleDeg: 0 })), /Elbow angle must be greater than zero/);
assert.throws(() => calculateFitting(base({ quantity: 1.5 })), /Fitting quantity must be a whole number/);
assert.throws(() => calculateFitting(base({ widthMm: null })), /Fitting width is required/);
assert.throws(() => calculateFitting(base({ fittingType: 'NOT_A_FITTING' })), /Fitting Type is required/);

// F-10: mm-to-m conversion and density/sheet-thickness weight are deterministic.
const aluminum = calculateFitting(base({ sheetMaterial: 'aluminum', sheetDensity: 2700, sheetThicknessMm: 1, fittingWasteRate: 0 }));
assert.ok(Math.abs(aluminum.netWeight - (aluminum.netArea * 0.001 * 2700)) < 1e-9);
assert.notEqual(aluminum.netWeight, elbowRect.netWeight);

console.log('Sprint 4 Fittings tests passed: contract, Elbow rectangular/round, TEE, Reducer, Transition, Offset, End Cap, Custom, validation, units, waste, weight, Joint Basis, accessories, Pressure Class, and no invented geometry.');
