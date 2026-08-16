#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const { calculateItem, normalizeSettings, SHEET_MATERIALS } = require('../assets/js/calculations.js');

const baseSettings = { waste: 10, adhRate: 0.25, tapeRate: 0.08, cleatSpacing: 300, silCoverage: 10, insWaste: 10 };
const noWasteSettings = { ...baseSettings, waste: 0, insWaste: 0 };
const close = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const rect = (overrides = {}) => ({ type: 'rect', w: 800, h: 500, d: 0, l: 10, qty: 1, th: 0.8, insTh: 25, joints: 0, sheetMaterial: 'galvanized', sheetDensity: 7850, ...overrides });
const round = (overrides = {}) => ({ type: 'round', w: 0, h: 0, d: 500, l: 10, qty: 1, th: 0.8, insTh: 25, joints: 0, sheetMaterial: 'galvanized', sheetDensity: 7850, ...overrides });

// Area and unit conversion: P=2*(0.8+0.5)=2.6m; A=2.6*10*1=26m².
const rectangularA = calculateItem(rect(), noWasteSettings);
close(rectangularA.perimeterM, 2.6);
close(rectangularA.netArea, 26);
close(rectangularA.procurementDuctArea, 26);

// Quantity multiplication: 26m² per piece × 5 pieces = 130m².
const rectangularB = calculateItem(rect({ qty: 5 }), noWasteSettings);
close(rectangularB.netArea, 130);

// Round area: π*0.5m*10m = 15.7079632679m².
const roundC = calculateItem(round(), noWasteSettings);
close(roundC.netArea, Math.PI * 0.5 * 10);

// Explicit conversion checks used by the engine.
assert.equal(800 * 0.001, 0.8);
assert.equal(500 * 0.001, 0.5);
assert.equal(0.8 * 0.001, 0.0008);
assert.equal(25 * 0.001, 0.025);

// Waste: net=165m², 10%=16.5m², procurement=181.5m².
const net165 = calculateItem(rect({ w: 1100, h: 550, qty: 5 }), baseSettings);
close(net165.netArea, 165);
close(net165.ductWasteArea, 16.5);
close(net165.procurementDuctArea, 181.5);
close(net165.netWeight, 1036.2);
close(net165.wasteWeight, 103.62);
close(net165.procurementWeight, 1139.82);
const zeroWaste = calculateItem(rect({ w: 1100, h: 550, qty: 5 }), noWasteSettings);
close(zeroWaste.ductWasteArea, 0);
close(zeroWaste.procurementDuctArea, zeroWaste.netArea);

// Strict validation: missing, zero and negative values are distinct failures.
assert.throws(() => calculateItem(rect({ l: '' }), baseSettings), /Length is required/);
assert.throws(() => calculateItem(rect({ l: -1 }), baseSettings), /Length must be greater than zero/);
assert.throws(() => calculateItem(rect({ qty: 0 }), baseSettings), /Quantity must be an integer >= 1/);
assert.throws(() => calculateItem(rect({ qty: -1 }), baseSettings), /Quantity must be an integer >= 1/);
assert.throws(() => normalizeSettings({ ...baseSettings, waste: -1 }), /Duct waste must be non-negative/);

// Material density audit: area is invariant while weight changes with density.
for (const [key, density] of Object.entries({ galvanized: 7850, aluminum: 2700, stainless: 8000 })) {
  const item = calculateItem(rect({ sheetMaterial: key, sheetDensity: density }), noWasteSettings);
  close(item.netWeight, 26 * 0.0008 * density);
}

// Insulation: 25mm=0.025m; changing thickness changes volume, not area.
const ins25 = calculateItem(rect({ w: 1100, h: 550, qty: 5, insTh: 25 }), baseSettings);
const ins50 = calculateItem(rect({ w: 1100, h: 550, qty: 5, insTh: 50 }), baseSettings);
const insNetBasis = calculateItem(rect({ w: 1100, h: 550, qty: 5, insTh: 25 }), { ...baseSettings, insWaste: 0 });
close(ins25.netInsulationArea, 165);
close(ins25.procurementInsulationArea, 181.5);
close(insNetBasis.insulationVolume, 165 * 0.025);
close(ins25.insulationVolume, 181.5 * 0.025);
close(ins50.insulationVolume, 181.5 * 0.05);
close(ins50.procurementInsulationArea, ins25.procurementInsulationArea);

// Accessories: current formulas are verified mathematically, while engineering scope is classified in the report.
const accessories = calculateItem(rect({ w: 1000, h: 500, l: 10, qty: 5, joints: 0 }), baseSettings);
assert.equal(accessories.joints, 4);
close(accessories.flange, 24);
assert.equal(accessories.corners, 32);
assert.equal(accessories.cleats, 80);
close(accessories.gasket, 24);
assert.equal(accessories.silicone, 3);
assert.equal(accessories.bolts, 80);

console.log('Sprint 1.1 engineering matrix passed: area, quantity, round geometry, units, waste, weight, density, insulation, validation, and accessories.');
