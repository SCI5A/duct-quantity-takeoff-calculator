#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { calculateItem, ACCESSORY_STATUS, SHEET_MATERIALS } = require('../assets/js/calculations.js');

const settings = { waste: 10, adhRate: 0.25, tapeRate: 0.08, cleatSpacing: 150, silCoverage: 10, insWaste: 10 };
const base = overrides => ({
  type: 'rect', w: 800, h: 500, d: 0, l: 10, qty: 5, th: 0.8, insTh: 25,
  joints: 0, sheetMaterial: 'galvanized', sheetDensity: SHEET_MATERIALS.galvanized.density,
  jointCountMode: 'PER_RUN', jointType: 'TDF', fabricationLengthM: 2.5,
  boltSpacing: 150, pressureClass: 'medium', ...overrides
});
const keys = ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers'];
const assertLine = line => {
  for (const field of ['net', 'waste', 'procurement', 'unit', 'status', 'formula', 'inputs', 'basis']) assert.ok(Object.hasOwn(line, field), `Missing ${field}`);
  assert.equal(line.procurement, line.net + line.waste);
};

function assertAuditCase(item, expectedJoints) {
  assert.equal(item.joints, expectedJoints);
  keys.forEach(key => assertLine(item.accessoryDetails[key]));
  assert.match(item.accessoryDetails.flange.formula, /mating flanges/);
  assert.match(item.accessoryDetails.gasket.formula, /connection length/);
  assert.match(item.accessoryDetails.cleats.formula, /Cleat|150/);
  assert.match(item.accessoryDetails.bolts.formula, /150/);
  assert.match(item.accessoryDetails.cleats.inputs, /Pressure Class=medium/);
  assert.equal(item.accessoryDetails.gasket.waste, 0);
}

const perRun = calculateItem(base(), settings);
assertAuditCase(perRun, 15);
assert.equal(perRun.accessoryDetails.flange.net, 78);
assert.equal(perRun.accessoryDetails.gasket.net, 78);
assert.equal(perRun.accessoryDetails.cleats.net, 520);
assert.equal(perRun.accessoryDetails.bolts.net, 520);

const global = calculateItem(base({ jointCountMode: 'GLOBAL' }), settings);
assertAuditCase(global, 19);
assert.equal(global.accessoryDetails.flange.net, 98.8);
assert.equal(global.accessoryDetails.gasket.net, 98.8);
assert.equal(global.accessoryDetails.cleats.net, 659);
assert.equal(global.accessoryDetails.bolts.net, 659);

const manual = calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: 17 }), settings);
assertAuditCase(manual, 17);
assert.equal(manual.accessoryDetails.flange.net, 88.4);
assert.equal(manual.accessoryDetails.gasket.net, 88.4);
assert.equal(manual.accessoryDetails.cleats.net, 590);
assert.equal(manual.accessoryDetails.bolts.net, 590);

const cases = [
  ['TDF', base({ jointType: 'TDF' }), { gasket: ACCESSORY_STATUS.CALCULATED, corners: ACCESSORY_STATUS.ESTIMATED }],
  ['TDC', base({ jointType: 'TDC' }), { gasket: ACCESSORY_STATUS.CALCULATED, corners: ACCESSORY_STATUS.ESTIMATED }],
  ['ANGLE_FLANGE', base({ jointType: 'ANGLE_FLANGE' }), { gasket: ACCESSORY_STATUS.CALCULATED, corners: ACCESSORY_STATUS.INPUT_REQUIRED }],
  ['CUSTOM', base({ jointType: 'CUSTOM' }), { flange: ACCESSORY_STATUS.INPUT_REQUIRED, gasket: ACCESSORY_STATUS.INPUT_REQUIRED, cleats: ACCESSORY_STATUS.INPUT_REQUIRED, silicone: ACCESSORY_STATUS.INPUT_REQUIRED, bolts: ACCESSORY_STATUS.INPUT_REQUIRED }]
];
for (const [name, input, expected] of cases) {
  const item = calculateItem(input, settings);
  for (const [key, status] of Object.entries(expected)) assert.equal(item.accessoryDetails[key].status, status, `${name}.${key}`);
}

const slipRound = calculateItem({
  type: 'round', w: 0, h: 0, d: 500, l: 5, qty: 2, th: 0.8, insTh: 25,
  sheetMaterial: 'galvanized', sheetDensity: 7850, jointCountMode: 'PER_RUN', jointType: 'SLIP_JOINT', fabricationLengthM: 5,
  pressureClass: 'medium', boltSpacing: 150
}, settings);
for (const key of keys) assert.equal(slipRound.accessoryDetails[key].status, ACCESSORY_STATUS.NOT_APPLICABLE, `SLIP_ROUND.${key}`);

const missing = calculateItem(base({ boltSpacing: null }), { ...settings, cleatSpacing: null, silCoverage: null });
for (const key of ['cleats', 'bolts', 'nuts', 'washers', 'silicone']) assert.equal(missing.accessoryDetails[key].status, ACCESSORY_STATUS.INPUT_REQUIRED, `missing.${key}`);

assert.equal(perRun.accessoryDetails.cleats.net, 520);
assert.equal(perRun.accessoryDetails.bolts.net, 520);
assert.notEqual(perRun.accessoryDetails.cleats.formula, perRun.accessoryDetails.bolts.formula);
assert.match(perRun.accessoryDetails.cleats.basis, /no Pressure Class-specific rule/);

console.log('Sprint 3.1 accessory formula audit passed: formulas, units, Net/Waste/Procurement, joint bases, joint types, pressure dependency, and confirmed CUSTOM guard.');
