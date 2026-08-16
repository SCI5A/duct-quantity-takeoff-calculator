#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { calculateItem, normalizeSettings, SHEET_MATERIALS } = require('../assets/js/calculations.js');

const settings = {
  waste: 10,
  adhRate: 0.25,
  tapeRate: 0.08,
  cleatSpacing: 300,
  silCoverage: 10,
  insWaste: 10
};

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be close to ${expected}`);
}

function rectangularFixture(overrides = {}) {
  return {
    type: 'rect', w: 1000, h: 500, d: 0, l: 10, qty: 5, th: 0.8, insTh: 25,
    joints: 0, sheetMaterial: 'galvanized', sheetDensity: SHEET_MATERIALS.galvanized.density, ...overrides
  };
}

const rectangular = calculateItem(rectangularFixture(), settings);
assert.equal(rectangular.perimeterM, 3);
close(rectangular.netArea, 150);
close(rectangular.ductWasteArea, 15);
close(rectangular.procurementDuctArea, 165);
close(rectangular.netInsulationArea, 150);
close(rectangular.insulationWasteArea, 15);
close(rectangular.procurementInsulationArea, 165);
close(rectangular.insulationVolume, 4.125);
close(rectangular.adhesive, 41.25);
close(rectangular.tape, 13.2);
close(rectangular.flange, 24);
assert.equal(rectangular.corners, 32);
assert.equal(rectangular.cleats, 80);
close(rectangular.gasket, 24);
assert.equal(rectangular.silicone, 3);
assert.equal(rectangular.bolts, 80);
close(rectangular.netWeight, 942);
close(rectangular.wasteWeight, 94.2);
close(rectangular.procurementWeight, 1036.2);
assert.ok(rectangular.procurementDuctArea > rectangular.netArea);
assert.ok(rectangular.procurementWeight > rectangular.netWeight);

const round = calculateItem({
  type: 'round', w: 0, h: 0, d: 500, l: 5, qty: 2, th: 0.8, insTh: 25,
  joints: 0, sheetMaterial: 'galvanized', sheetDensity: 7850
}, settings);
close(round.netArea, Math.PI * 0.5 * 5 * 2);
close(round.ductWasteArea, round.netArea * 0.1);
assert.equal(round.corners, 0);
assert.equal(round.joints, 1);
assert.equal(round.bolts, round.cleats);

const explicitJoints = calculateItem(rectangularFixture({ qty: 5, joints: 3 }), settings);
assert.equal(explicitJoints.joints, 3);
assert.equal(explicitJoints.corners, 24);

const aluminum = calculateItem(rectangularFixture({ sheetMaterial: 'aluminum', sheetDensity: 2700 }), settings);
close(aluminum.netWeight, rectangular.netArea * 0.0008 * 2700);
assert.ok(aluminum.netWeight < rectangular.netWeight);

const noInsulation = calculateItem(rectangularFixture({ insTh: 0 }), settings);
assert.equal(noInsulation.insulationVolume, 0);
assert.equal(noInsulation.procurementInsulationArea, rectangular.procurementInsulationArea);

assert.throws(() => calculateItem(rectangularFixture({ w: '' }), settings), /Width is required/);
assert.throws(() => calculateItem(rectangularFixture({ l: 0 }), settings), /Length must be greater than zero/);
assert.throws(() => calculateItem(rectangularFixture({ qty: 0 }), settings), /Quantity must be an integer/);
assert.throws(() => calculateItem(rectangularFixture({ qty: -1 }), settings), /Quantity must be an integer/);
assert.throws(() => calculateItem(rectangularFixture({ th: -0.8 }), settings), /Sheet thickness must be greater than zero/);
assert.throws(() => calculateItem(rectangularFixture({ insTh: -1 }), settings), /Insulation thickness must be non-negative/);
assert.throws(() => normalizeSettings({ ...settings, waste: -1 }), /Duct waste must be non-negative/);
assert.throws(() => normalizeSettings({ ...settings, cleatSpacing: 0 }), /Cleat spacing must be greater than zero/);
assert.throws(() => normalizeSettings({ ...settings, silCoverage: '' }), /Silicone coverage is required/);

assert.equal(1000 * 0.001, 1);
assert.equal(SHEET_MATERIALS.galvanized.density, 7850);
assert.equal(SHEET_MATERIALS.aluminum.density, 2700);
assert.equal(SHEET_MATERIALS.stainless.density, 8000);

console.log('Engineering tests passed: geometry, units, validation, waste, insulation, density, joints, accessories, and weight separation.');
