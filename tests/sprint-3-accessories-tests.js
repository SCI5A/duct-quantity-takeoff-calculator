#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const {
  calculateItem,
  ACCESSORY_STATUS,
  SHEET_MATERIALS
} = require('../assets/js/calculations.js');

const settings = {
  waste: 10,
  adhRate: 0.25,
  tapeRate: 0.08,
  cleatSpacing: 150,
  silCoverage: 10,
  insWaste: 10
};

const base = overrides => ({
  type: 'rect', w: 800, h: 500, d: 0, l: 10, qty: 5, th: 0.8, insTh: 25,
  joints: 0, sheetMaterial: 'galvanized', sheetDensity: SHEET_MATERIALS.galvanized.density,
  jointCountMode: 'PER_RUN', jointType: 'TDF', fabricationLengthM: 2.5,
  boltSpacing: 150, pressureClass: 'medium', ...overrides
});

const accessoryKeys = ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers'];
const statusValues = new Set(Object.values(ACCESSORY_STATUS));
const assertAccessoryContract = (item, key) => {
  const line = item.accessoryDetails[key];
  assert.ok(line, `${key} detail is present`);
  for (const field of ['net', 'waste', 'procurement', 'unit', 'status', 'formula', 'inputs', 'basis']) assert.ok(Object.prototype.hasOwnProperty.call(line, field), `${key}.${field} is present`);
  assert.ok(statusValues.has(line.status), `${key} status is valid: ${line.status}`);
  assert.equal(line.procurement, line.net + line.waste, `${key} procurement is Net + Waste`);
};

// TEST-A01: PER RUN uses Total Joints from Sprint 2.1 and exposes every accessory contract.
const perRun = calculateItem(base(), settings);
assert.equal(perRun.joints, 15);
accessoryKeys.forEach(key => assertAccessoryContract(perRun, key));
assert.equal(perRun.accessoryDetails.flange.net, 78);
assert.equal(perRun.accessoryDetails.gasket.net, 78);
assert.equal(perRun.accessoryDetails.gasket.waste, 0);
assert.equal(perRun.accessoryDetails.gasket.procurement, 78);
assert.equal(perRun.accessoryDetails.bolts.net, 520);
assert.equal(perRun.accessoryDetails.nuts.status, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(perRun.accessoryDetails.washers.status, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(perRun.accessoryDetails.gasket.status, ACCESSORY_STATUS.ESTIMATED);
assert.equal(perRun.accessoryDetails.corners.status, ACCESSORY_STATUS.ESTIMATED);
assert.equal(perRun.accessoryDetails.cleats.status, ACCESSORY_STATUS.ESTIMATED);
assert.equal(perRun.accessoryDetails.silicone.status, ACCESSORY_STATUS.ESTIMATED);

// TEST-A02: GLOBAL changes Accessories through the existing Total Joints result only.
const global = calculateItem(base({ jointCountMode: 'GLOBAL' }), settings);
assert.equal(global.joints, 19);
assert.equal(global.accessoryDetails.flange.net, 98.8);
assert.equal(global.accessoryDetails.gasket.procurement, 98.8);
assert.equal(global.accessoryDetails.bolts.net, 659);

// TEST-A03: MANUAL uses the explicit joint count and does not recalculate Joints in Accessories.
const manual = calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: 17 }), settings);
assert.equal(manual.joints, 17);
assert.equal(manual.accessoryDetails.flange.net, 88.4);
assert.equal(manual.accessoryDetails.gasket.net, 88.4);
assert.equal(manual.accessoryDetails.cleats.net, 590);

// TEST-A04: Cleat and bolt spacing are independent inputs and formulas.
const independentSpacing = calculateItem(base({ boltSpacing: 100 }), { ...settings, cleatSpacing: 200 });
assert.equal(independentSpacing.accessoryDetails.cleats.net, 390);
assert.equal(independentSpacing.accessoryDetails.bolts.net, 780);
assert.notEqual(independentSpacing.accessoryDetails.cleats.net, independentSpacing.accessoryDetails.bolts.net);
assert.match(independentSpacing.accessoryDetails.cleats.formula, /Cleat Spacing|200/);
assert.match(independentSpacing.accessoryDetails.bolts.formula, /100/);

// TEST-A05: Missing connection inputs never produce invented final numbers.
const missing = calculateItem(base({ boltSpacing: null }), { ...settings, cleatSpacing: null, silCoverage: null });
for (const key of ['cleats', 'bolts', 'nuts', 'washers', 'silicone']) {
  assert.equal(missing.accessoryDetails[key].net, 0);
  assert.equal(missing.accessoryDetails[key].status, ACCESSORY_STATUS.INPUT_REQUIRED);
}

// TEST-A06: Joint and duct type dependencies produce NOT_APPLICABLE where rules do not apply.
const slipRound = calculateItem({
  type: 'round', w: 0, h: 0, d: 500, l: 5, qty: 2, th: 0.8, insTh: 25,
  sheetMaterial: 'galvanized', sheetDensity: 7850, jointCountMode: 'PER_RUN', jointType: 'SLIP_JOINT', fabricationLengthM: 5,
  boltSpacing: 150, pressureClass: 'medium'
}, settings);
assert.equal(slipRound.accessoryDetails.flange.status, ACCESSORY_STATUS.NOT_APPLICABLE);
assert.equal(slipRound.accessoryDetails.corners.status, ACCESSORY_STATUS.NOT_APPLICABLE);
assert.equal(slipRound.accessoryDetails.gasket.status, ACCESSORY_STATUS.NOT_APPLICABLE);
assert.equal(slipRound.accessoryDetails.bolts.status, ACCESSORY_STATUS.NOT_APPLICABLE);
assert.equal(slipRound.accessoryDetails.nuts.status, ACCESSORY_STATUS.NOT_APPLICABLE);
assert.equal(slipRound.accessoryDetails.washers.status, ACCESSORY_STATUS.NOT_APPLICABLE);

// TEST-A07: CUSTOM rules remain explicit INPUT_REQUIRED rather than becoming a universal standard.
const custom = calculateItem(base({ jointType: 'CUSTOM', fabricationLengthM: 2.5 }), settings);
assert.equal(custom.accessoryDetails.flange.status, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(custom.accessoryDetails.corners.status, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(custom.accessoryDetails.gasket.status, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(custom.accessoryDetails.cleats.status, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(custom.accessoryDetails.silicone.status, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(custom.accessoryDetails.bolts.status, ACCESSORY_STATUS.INPUT_REQUIRED);

// TEST-A08: Legacy V4 data retains its values and status without invented Fabrication Length.
const legacy = calculateItem({
  type: 'rect', w: 1000, h: 500, d: 0, l: 10, qty: 5, th: 0.8, insTh: 25,
  joints: 3, sheetMaterial: 'galvanized', sheetDensity: 7850
}, settings);
assert.equal(legacy.jointCountMode, 'LEGACY');
accessoryKeys.forEach(key => assert.equal(legacy.accessoryDetails[key].status, ACCESSORY_STATUS.LEGACY_ESTIMATE));
assert.equal(legacy.accessoryDetails.bolts.net, legacy.accessoryDetails.cleats.net);

// TEST-A09: Pressure Class is retained in Inputs/Basis; no pressure-specific standard is fabricated.
assert.match(perRun.accessoryDetails.cleats.inputs, /Pressure Class=medium/);
assert.match(perRun.accessoryDetails.cleats.basis, /no Pressure Class-specific rule/);

console.log('Sprint 3 Accessories tests passed: contract, Net/Waste/Procurement, PER RUN/GLOBAL/MANUAL, independent spacing, missing inputs, NOT_APPLICABLE, legacy compatibility, and pressure/joint dependencies.');
