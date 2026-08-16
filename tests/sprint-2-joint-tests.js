#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const {
  calculateItem,
  calculateSectionCount,
  calculateJointCount,
  calculateJointPerimeter,
  SHEET_MATERIALS,
  ACCESSORY_STATUS,
  JOINT_MODES,
  JOINT_TYPES
} = require('../assets/js/calculations.js');

const settings = {
  waste: 10,
  adhRate: 0.25,
  tapeRate: 0.08,
  cleatSpacing: 300,
  silCoverage: 10,
  insWaste: 10
};
const base = overrides => ({
  type: 'rect', w: 800, h: 500, d: 0, l: 10, qty: 5, th: 0.8, insTh: 25,
  joints: 0, sheetMaterial: 'galvanized', sheetDensity: SHEET_MATERIALS.galvanized.density,
  jointCountMode: 'PER_RUN', jointType: 'TDF', fabricationLengthM: 2.5,
  boltSpacing: 300, pressureClass: null, ...overrides
});
const close = (actual, expected, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);

// TEST-J21 / TEST A: PER RUN is the default and Quantity represents independent runs.
const perRun = calculateItem(base(), settings);
assert.equal(perRun.jointBasis, JOINT_MODES.PER_RUN);
assert.equal(perRun.sectionsPerRun, 4);
assert.equal(perRun.jointsPerRun, 3);
assert.equal(perRun.sectionCount, 20);
assert.equal(perRun.jointCount, 15);
assert.equal(perRun.joints, 15);
assert.equal(perRun.jointCountSource, 'PER-RUN-FABRICATION-SECTION DERIVED');
assert.equal(perRun.totalLengthM, 50);

// TEST-J22 / TEST B: GLOBAL preserves the previous total-length behavior.
const global = calculateItem(base({ jointCountMode: 'GLOBAL' }), settings);
assert.equal(global.jointBasis, JOINT_MODES.GLOBAL);
assert.equal(global.totalLengthM, 50);
assert.equal(global.sectionsPerRun, null);
assert.equal(global.sectionCount, 20);
assert.equal(global.jointCount, 19);
assert.equal(global.joints, 19);
assert.equal(global.jointCountSource, 'GLOBAL-FABRICATION-SECTION DERIVED');

// TEST-J23 / TEST C: MANUAL ignores Fabrication Length and Quantity for Total Joints.
const manual = calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: 17 }), settings);
assert.equal(manual.jointBasis, JOINT_MODES.MANUAL);
assert.equal(manual.sectionCount, null);
assert.equal(manual.jointCount, 17);
assert.equal(manual.joints, 17);
assert.equal(manual.manualJointCount, 17);
assert.equal(manual.jointCountSource, 'MANUAL');

// TEST-J24 / TEST D: one fabrication section per run produces no joints.
const edge = calculateItem(base({ l: 2.5, fabricationLengthM: 2.5 }), settings);
assert.equal(edge.sectionsPerRun, 1);
assert.equal(edge.jointsPerRun, 0);
assert.equal(edge.sectionCount, 5);
assert.equal(edge.jointCount, 0);

// TEST-J25: standalone section math remains guarded and deterministic.
assert.equal(calculateSectionCount(12, 1.2), 10);
assert.equal(calculateSectionCount(10, 1.2), 9);
assert.throws(() => calculateSectionCount(12, -1), /Fabrication length must be greater than zero/);
assert.throws(() => calculateSectionCount(12, 0), /Fabrication length must be greater than zero/);
assert.throws(() => calculateJointCount({ mode: JOINT_MODES.PER_RUN, lengthM: 10, quantity: 5, fabricationLengthM: 0 }), /Fabrication length must be greater than zero/);

// TEST-J26: MANUAL validation rejects missing, non-numeric, and negative counts.
assert.throws(() => calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: null }), settings), /Manual joint count is required/);
assert.throws(() => calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: -1 }), settings), /Manual joint count must be an integer >= 0/);
assert.throws(() => calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: 'abc' }), settings), /Manual joint count must be a finite number/);
assert.throws(() => calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: NaN }), settings), /Manual joint count must be a finite number/);

// TEST-J27: invalid Quantity remains rejected and is never coerced to zero/one.
assert.throws(() => calculateItem(base({ qty: 0 }), settings), /Quantity must be an integer >= 1/);
assert.throws(() => calculateItem(base({ qty: -1 }), settings), /Quantity must be an integer >= 1/);
assert.throws(() => calculateItem(base({ qty: 'abc' }), settings), /Quantity must be a finite number/);

// TEST-J28: rectangular joint perimeter remains correct.
const perimeter = calculateJointPerimeter(2.6, 1, JOINT_TYPES.TDF);
close(perimeter.value, 5.2);
assert.equal(perimeter.status, ACCESSORY_STATUS.CALCULATED);

// TEST-J29: accessories follow the selected Total Joints basis.
const perRunAccessories = calculateItem(base({ boltSpacing: 300 }), settings);
const globalAccessories = calculateItem(base({ jointCountMode: 'GLOBAL', boltSpacing: 300 }), settings);
assert.equal(perRunAccessories.jointCount, 15);
assert.equal(globalAccessories.jointCount, 19);
assert.notEqual(perRunAccessories.flange, globalAccessories.flange);
assert.equal(perRunAccessories.gasketProcurement, perRunAccessories.gasket);
assert.equal(perRunAccessories.gasketWaste, 0);

// TEST-J30: cleat/bolt spacing is explicit; missing spacing is INPUT REQUIRED.
const missingSpacing = calculateItem(base({ boltSpacing: undefined }), { ...settings, cleatSpacing: null });
assert.equal(missingSpacing.cleats, 0);
assert.equal(missingSpacing.cleatsStatus, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(missingSpacing.bolts, 0);
assert.equal(missingSpacing.boltsStatus, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(missingSpacing.nutsStatus, ACCESSORY_STATUS.INPUT_REQUIRED);
assert.equal(missingSpacing.washersStatus, ACCESSORY_STATUS.INPUT_REQUIRED);

// TEST-J31: joint-type rules remain isolated from the basis correction.
const slip = calculateItem(base({ jointType: 'SLIP_JOINT', qty: 2, l: 1, fabricationLengthM: 1, boltSpacing: null }), { ...settings, cleatSpacing: null, silCoverage: null });
assert.equal(slip.flange, 0);
assert.equal(slip.flangeStatus, ACCESSORY_STATUS.NOT_APPLICABLE);
assert.equal(slip.corners, 0);
assert.equal(slip.gasketStatus, ACCESSORY_STATUS.NOT_APPLICABLE);
assert.equal(slip.boltsStatus, ACCESSORY_STATUS.NOT_APPLICABLE);

// TEST-J32: old V4 item without Joint Basis remains usable without losing data.
const legacy = calculateItem({ type: 'rect', w: 1000, h: 500, d: 0, l: 10, qty: 5, th: 0.8, insTh: 25, joints: 3, sheetMaterial: 'galvanized', sheetDensity: 7850 }, settings);
assert.equal(legacy.jointCountMode, JOINT_MODES.LEGACY);
assert.equal(legacy.jointCountSource, 'LEGACY_ESTIMATE');
assert.equal(legacy.joints, 3);
assert.equal(legacy.boltsStatus, ACCESSORY_STATUS.LEGACY_ESTIMATE);

// TEST-J33: NaN and Infinity are validation errors.
assert.throws(() => calculateItem(base({ fabricationLengthM: NaN }), settings), /Fabrication length must be a finite number/);
assert.throws(() => calculateItem(base({ fabricationLengthM: Infinity }), settings), /Fabrication length must be a finite number/);
assert.throws(() => calculateItem(base({ jointCountMode: 'MANUAL', fabricationLengthM: null, manualJointCount: Infinity }), settings), /Manual joint count must be a finite number/);

console.log('Sprint 2.1 Joint Basis tests passed: PER RUN, GLOBAL, MANUAL, edge cases, validation, accessory dependency, joint types, and V4 compatibility.');
