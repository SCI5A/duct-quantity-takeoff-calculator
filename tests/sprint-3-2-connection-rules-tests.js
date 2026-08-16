#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const {
  calculateItem,
  ACCESSORY_STATUS,
  CONNECTION_RULES,
  CONNECTION_RULE_SOURCES,
  JOINT_TYPES,
  SHEET_MATERIALS
} = require('../assets/js/calculations.js');

const settings = { waste: 10, adhRate: 0.25, tapeRate: 0.08, cleatSpacing: 150, silCoverage: 10, insWaste: 10 };
const base = overrides => ({
  type: 'rect', w: 800, h: 500, d: 0, l: 10, qty: 5, th: 0.8, insTh: 25,
  joints: 0, sheetMaterial: 'galvanized', sheetDensity: SHEET_MATERIALS.galvanized.density,
  jointCountMode: 'PER_RUN', jointType: 'TDF', fabricationLengthM: 2.5,
  boltSpacing: 150, pressureClass: 'medium', ...overrides
});
const accessoryKeys = ['flange', 'gasket', 'corners', 'cleats', 'bolts', 'nuts', 'washers', 'silicone'];

// TEST-R01: Every configured Joint Type exposes a traceable rule object.
for (const id of ['TDF', 'TDC', 'ANGLE_FLANGE', 'SLIP_JOINT', 'CUSTOM']) {
  const rule = CONNECTION_RULES[id];
  assert.ok(rule, `${id} rule exists`);
  assert.ok(Array.isArray(rule.applicableDuctTypes), `${id} applicable duct types exist`);
  assert.ok(rule.connectionLengthBasis, `${id} connection length basis exists`);
  for (const key of accessoryKeys) {
    assert.ok(rule[key], `${id}.${key} rule exists`);
    assert.ok(rule[key].status, `${id}.${key} status exists`);
    assert.ok(rule[key].source, `${id}.${key} source exists`);
    assert.ok(rule[key].basis, `${id}.${key} basis exists`);
  }
}
assert.equal(CONNECTION_RULE_SOURCES.UNVERIFIED, 'UNVERIFIED');
assert.equal(CONNECTION_RULES.TDF.pressureClass, 'INPUT_ONLY');

// TEST-R02: Accessories consume Joint Engine output and never recalculate joints.
const perRun = calculateItem(base(), settings);
const global = calculateItem(base({ jointCountMode: 'GLOBAL' }), settings);
const manual = calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: 17 }), settings);
assert.deepEqual([perRun.joints, global.joints, manual.joints], [15, 19, 17]);
assert.equal(perRun.accessoryDetails.gasket.net, 78);
assert.equal(global.accessoryDetails.gasket.net, 98.8);
assert.equal(manual.accessoryDetails.gasket.net, 88.4);

// TEST-R03: Current rules remain configurable/estimated when no engineering source is supplied.
for (const item of [perRun, global, manual]) {
  for (const key of ['flange', 'gasket', 'corners']) {
    assert.equal(item.accessoryDetails[key].status, ACCESSORY_STATUS.ESTIMATED);
    assert.equal(item.accessoryDetails[key].source, CONNECTION_RULE_SOURCES.UNVERIFIED);
  }
  for (const key of ['cleats', 'bolts']) {
    assert.equal(item.accessoryDetails[key].status, ACCESSORY_STATUS.ESTIMATED);
    assert.equal(item.accessoryDetails[key].source, CONNECTION_RULE_SOURCES.ESTIMATING_RULE);
  }
  assert.equal(item.accessoryDetails.nuts.status, ACCESSORY_STATUS.INPUT_REQUIRED);
  assert.equal(item.accessoryDetails.washers.status, ACCESSORY_STATUS.INPUT_REQUIRED);
  assert.equal(item.accessoryDetails.nuts.source, CONNECTION_RULE_SOURCES.UNVERIFIED);
  assert.equal(item.accessoryDetails.washers.source, CONNECTION_RULE_SOURCES.UNVERIFIED);
}

// TEST-R04: Pressure Class is input-only and cannot change quantities without a rule.
const medium = calculateItem(base({ pressureClass: 'medium' }), settings);
const undefinedPressure = calculateItem(base({ pressureClass: null }), settings);
for (const key of ['flange', 'gasket', 'corners', 'cleats', 'bolts']) assert.equal(medium.accessoryDetails[key].net, undefinedPressure.accessoryDetails[key].net, `Pressure must not change ${key}`);
assert.match(medium.accessoryDetails.cleats.inputs, /Pressure Class=medium/);
assert.match(medium.accessoryDetails.cleats.basis, /no Pressure Class-specific rule/);

// TEST-R05: Duct and Joint Type dependencies are explicit.
const tdc = calculateItem(base({ jointType: 'TDC' }), settings);
assert.equal(tdc.jointType, 'TDC');
assert.equal(tdc.accessoryDetails.corners.status, ACCESSORY_STATUS.ESTIMATED);
const angle = calculateItem(base({ jointType: 'ANGLE_FLANGE' }), settings);
assert.equal(angle.accessoryDetails.corners.status, ACCESSORY_STATUS.INPUT_REQUIRED);
const roundSlip = calculateItem({
  type: 'round', w: 0, h: 0, d: 500, l: 5, qty: 2, th: 0.8, insTh: 25,
  sheetMaterial: 'galvanized', sheetDensity: 7850, jointCountMode: 'PER_RUN', jointType: 'SLIP_JOINT', fabricationLengthM: 5,
  pressureClass: 'medium', boltSpacing: 150
}, settings);
for (const key of accessoryKeys) assert.equal(roundSlip.accessoryDetails[key].status, ACCESSORY_STATUS.NOT_APPLICABLE, `Slip ${key}`);
const custom = calculateItem(base({ jointType: 'CUSTOM' }), settings);
for (const key of accessoryKeys) assert.equal(custom.accessoryDetails[key].status, ACCESSORY_STATUS.INPUT_REQUIRED, `Custom ${key}`);

// TEST-R06: Formula and procurement traceability is complete for every returned accessory line.
for (const item of [perRun, global, manual, tdc, angle]) {
  for (const key of accessoryKeys) {
    const line = item.accessoryDetails[key];
    for (const field of ['formula', 'inputs', 'unit', 'net', 'waste', 'procurement', 'status', 'basis', 'source']) assert.ok(Object.hasOwn(line, field), `${item.jointType}.${key}.${field}`);
    assert.equal(line.procurement, line.net + line.waste);
  }
}

console.log('Sprint 3.2 connection rules tests passed: traceability, Joint Engine dependency, statuses, Pressure Class input-only behavior, duct/joint dependencies, and procurement contract.');
