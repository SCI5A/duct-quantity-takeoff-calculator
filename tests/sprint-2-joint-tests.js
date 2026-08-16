#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const {
  calculateItem,
  calculateSectionCount,
  calculateJointCount,
  calculateJointPerimeter,
  calculateJointAccessories,
  normalizeSettings,
  SHEET_MATERIALS,
  ACCESSORY_STATUS,
  JOINT_MODES
} = require('../assets/js/calculations.js');

const settings = {
  waste: 10,
  adhRate: 0.25,
  tapeRate: 0.08,
  cleatSpacing: 300,
  silCoverage: 10,
  insWaste: 10
};
const noBoltSpacing = { ...settings, boltSpacing: undefined };
const base = overrides => ({
  type: 'rect', w: 800, h: 500, d: 0, l: 1, qty: 12, th: 0.8, insTh: 25,
  joints: 0, sheetMaterial: 'galvanized', sheetDensity: SHEET_MATERIALS.galvanized.density,
  jointCountMode: 'AUTO', jointType: 'TDF', fabricationLengthM: 1.2,
  boltSpacing: 300, pressureClass: null, ...overrides
});
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

// TEST-J01: 12m / 1.2m = 10 sections, 9 fabrication-derived joints.
assert.equal(calculateSectionCount(12, 1.2), 10);
const auto12 = calculateItem(base(), settings);
assert.equal(auto12.sectionCount, 10);
assert.equal(auto12.jointCount, 9);
assert.equal(auto12.joints, 9);
assert.equal(auto12.jointCountMode, JOINT_MODES.AUTO);
assert.equal(auto12.jointCountSource, 'FABRICATION-SECTION DERIVED');

// TEST-J02: ceil(10/1.2) = 9 sections, 8 joints.
assert.equal(calculateSectionCount(10, 1.2), 9);
const auto10 = calculateItem(base({ l: 10, qty: 1 }), settings);
assert.equal(auto10.sectionCount, 9);
assert.equal(auto10.jointCount, 8);

// TEST-J03: 1.0m / 1.2m = 1 section, zero joints.
const autoShort = calculateItem(base({ l: 1, qty: 1 }), settings);
assert.equal(autoShort.sectionCount, 1);
assert.equal(autoShort.jointCount, 0);

// TEST-J04: MANUAL preserves the explicit joint count and source.
const manual = calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: 14 }), settings);
assert.equal(manual.sectionCount, null);
assert.equal(manual.jointCount, 14);
assert.equal(manual.jointCountSource, 'MANUAL');

// TEST-J05/J06: negative and zero fabrication lengths are rejected.
assert.throws(() => calculateSectionCount(12, -1), /Fabrication length must be greater than zero/);
assert.throws(() => calculateSectionCount(12, 0), /Fabrication length must be greater than zero/);
assert.throws(() => calculateItem(base({ fabricationLengthM: 0 }), settings), /Fabrication length must be greater than zero/);

// TEST-J07: negative manual joint count is rejected.
assert.throws(() => calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: -1 }), settings), /Manual joint count must be an integer >= 0/);

// TEST-J08: rectangular perimeter is 2.60m.
const perimeter = calculateJointPerimeter(2.6, 1, require('../assets/js/calculations.js').JOINT_TYPES.TDF);
close(perimeter.value, 5.2);
assert.equal(perimeter.status, ACCESSORY_STATUS.CALCULATED);

// TEST-J09/J10: cleat spacing is explicit; missing spacing is INPUT REQUIRED, never guessed.
const explicitCleats = calculateItem(base({ qty: 1, l: 1, fabricationLengthM: 1 }), settings);
assert.equal(explicitCleats.cleats, Math.ceil((2.6 * 0 * 2) / 0.3));
const autoCleats = calculateItem(base({ qty: 2, l: 1, fabricationLengthM: 1 }), settings);
assert.equal(autoCleats.jointCount, 1);
assert.equal(autoCleats.cleatsStatus, ACCESSORY_STATUS.ESTIMATED);
const missingCleatSettings = { ...settings, cleatSpacing: null };
const missingCleat = calculateItem(base({ qty: 2, l: 1, fabricationLengthM: 1 }), missingCleatSettings);
assert.equal(missingCleat.cleats, 0);
assert.equal(missingCleat.cleatsStatus, ACCESSORY_STATUS.INPUT_REQUIRED);

// TEST-J11: missing bolt spacing is INPUT REQUIRED for a new flanged joint.
const missingBolt = calculateItem(base({ qty: 2, l: 1, fabricationLengthM: 1, boltSpacing: undefined }), noBoltSpacing);
assert.equal(missingBolt.bolts, 0);
assert.equal(missingBolt.boltsStatus, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(missingBolt.nutsStatus, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(missingBolt.washersStatus, ACCESSORY_STATUS.INPUT_REQUIRED);

// TEST-J12: rules are joint-type-dependent; Slip Joint does not inherit TDF flange/corner/gasket/bolt rules.
const slip = calculateItem(base({ jointType: 'SLIP_JOINT', qty: 2, l: 1, fabricationLengthM: 1, boltSpacing: null }), { ...settings, cleatSpacing: null, silCoverage: null });
assert.equal(slip.flange, 0);
assert.equal(slip.flangeStatus, ACCESSORY_STATUS.NOT_APPLICABLE);
assert.equal(slip.corners, 0);
assert.equal(slip.cornersStatus, ACCESSORY_STATUS.ESTIMATED);
assert.equal(slip.gasketStatus, ACCESSORY_STATUS.NOT_APPLICABLE);
assert.equal(slip.boltsStatus, ACCESSORY_STATUS.NOT_APPLICABLE);

// TEST-J13/J15: old V4 item without Joint Model remains usable as a LEGACY estimate.
const legacy = calculateItem({ type: 'rect', w: 1000, h: 500, d: 0, l: 10, qty: 5, th: 0.8, insTh: 25, joints: 3, sheetMaterial: 'galvanized', sheetDensity: 7850 }, settings);
assert.equal(legacy.jointCountMode, JOINT_MODES.LEGACY);
assert.equal(legacy.jointCountSource, 'LEGACY_ESTIMATE');
assert.equal(legacy.joints, 3);
assert.equal(legacy.boltsStatus, ACCESSORY_STATUS.LEGACY_ESTIMATE);

// TEST-J14: NaN and Infinity are validation errors, not zero/one coercions.
assert.throws(() => calculateItem(base({ fabricationLengthM: NaN }), settings), /Fabrication length must be a finite number/);
assert.throws(() => calculateItem(base({ fabricationLengthM: Infinity }), settings), /Fabrication length must be a finite number/);
assert.throws(() => calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: NaN }), settings), /Manual joint count must be a finite number/);

// Pressure class is accepted as a future-compatible input but no full pressure engine is applied.
const pressureReady = calculateItem(base({ pressureClass: 'medium' }), settings);
assert.equal(pressureReady.pressureClass, 'medium');

// No accessory waste rate is invented: gasket waste remains zero and procurement equals calculated length.
assert.equal(auto12.gasketRequired, true);
assert.equal(auto12.gasketLength, auto12.gasket);
assert.equal(auto12.gasketWaste, 0);
assert.equal(auto12.gasketProcurement, auto12.gasket);

console.log('Sprint 2 Joint tests passed: fabrication sections, AUTO/MANUAL counts, types, validation, statuses, legacy compatibility, and accessory input requirements.');
