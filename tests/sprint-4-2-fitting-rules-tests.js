'use strict';

const assert = require('node:assert/strict');
const { calculateFitting, FITTING_GEOMETRY_RULES } = require('../assets/js/fittings.js');
const { ACCESSORY_STATUS, SHEET_MATERIALS } = require('../assets/js/calculations.js');

const base = overrides => ({
  fittingType: 'ELBOW', ductType: 'RECTANGULAR', widthMm: 800, heightMm: 500, lengthM: 10, quantity: 5,
  sheetThicknessMm: 0.8, sheetMaterial: 'galvanized', sheetDensity: SHEET_MATERIALS.galvanized.density,
  radiusMm: 500, angleDeg: 90, fittingWasteRate: 10, jointBasis: 'PER_RUN', jointType: 'TDF', fabricationLengthM: 2.5,
  pressureClass: 'medium', ...overrides
});
const types = ['ELBOW', 'TEE', 'REDUCER', 'TRANSITION', 'OFFSET', 'END_CAP', 'CUSTOM_FITTING'];

// R-01: Every Fitting Type has an explicit traceable geometry rule.
for (const type of types) {
  const rule = FITTING_GEOMETRY_RULES[type];
  assert.ok(rule, `${type} rule is missing`);
  for (const key of ['ruleId', 'fittingType', 'applicableDuctTypes', 'requiredInputs', 'formula', 'unit', 'status', 'engineeringBasis', 'source', 'limitations']) {
    assert.ok(Object.hasOwn(rule, key), `${type}.${key} is missing`);
  }
  assert.ok(rule.ruleId.startsWith('FGR-'), `${type} Rule ID must be explicit`);
  assert.ok(rule.requiredInputs.length > 0, `${type} required inputs must be explicit`);
  assert.ok(rule.limitations.length > 0, `${type} limitations must be explicit`);
}

// R-02: Elbow keeps the current formula and remains ESTIMATED without a verified source.
const elbow = calculateFitting(base());
assert.equal(elbow.ruleId, 'FGR-ELBOW-CENTERLINE-ARC-V1');
assert.equal(elbow.geometryRuleStatus, ACCESSORY_STATUS.ESTIMATED);
assert.equal(elbow.geometryRuleSource, 'UNVERIFIED');
assert.match(elbow.formula, /2π/);
assert.match(elbow.limitations, /Gore Layout/);

// R-03: Unsupported geometry remains INPUT_REQUIRED without inventing area.
for (const type of ['TEE', 'REDUCER', 'TRANSITION', 'OFFSET', 'CUSTOM_FITTING']) {
  const item = calculateFitting(base({ fittingType: type, fabricationAreaM2: null }));
  assert.equal(item.ruleId, FITTING_GEOMETRY_RULES[type].ruleId);
  assert.equal(item.status, ACCESSORY_STATUS.INPUT_REQUIRED, `${type} status`);
  assert.equal(item.geometryRuleStatus, ACCESSORY_STATUS.INPUT_REQUIRED, `${type} rule status`);
  assert.equal(item.geometryRuleSource, 'UNVERIFIED');
  assert.equal(item.netArea, 0);
  assert.match(item.formula, /input required/i);
}

// R-04: A user-provided fabrication area remains ESTIMATED and is traceable as USER_DEFINED.
for (const type of ['TEE', 'REDUCER', 'TRANSITION', 'OFFSET', 'CUSTOM_FITTING']) {
  const item = calculateFitting(base({ fittingType: type, fabricationAreaM2: 2.5, fittingWasteRate: 0 }));
  assert.equal(item.status, ACCESSORY_STATUS.ESTIMATED, `${type} configured status`);
  assert.equal(item.geometryRuleStatus, ACCESSORY_STATUS.ESTIMATED, `${type} configured rule status`);
  assert.equal(item.geometryRuleSource, 'USER_DEFINED');
  assert.equal(item.source, 'USER_DEFINED');
}

// R-05: End Cap retains its own end-face rule and does not inherit connection assumptions.
const endCap = calculateFitting(base({ fittingType: 'END_CAP', fittingWasteRate: 0 }));
assert.equal(endCap.ruleId, 'FGR-END-CAP-END-FACE-V1');
assert.equal(endCap.status, ACCESSORY_STATUS.ESTIMATED);
assert.match(endCap.limitations, /flange/i);
for (const key of ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers']) {
  assert.equal(endCap.accessoryDetails[key].status, ACCESSORY_STATUS.NOT_APPLICABLE, `End Cap ${key}`);
}

// R-06: Joint Engine remains the sole source of PER_RUN/GLOBAL/MANUAL joint totals.
const global = calculateFitting(base({ jointBasis: 'GLOBAL' }));
const manual = calculateFitting(base({ jointBasis: 'MANUAL', fabricationLengthM: null, manualJointCount: 17 }));
assert.deepEqual([elbow.joints, global.joints, manual.joints], [15, 19, 17]);
assert.equal(elbow.totalLengthM, 50);
assert.equal(global.totalLengthM, 50);
assert.equal(manual.totalLengthM, 50);

// R-07: Pressure Class is input/basis only; no automatic geometry or weight effect.
const noPressure = calculateFitting(base({ pressureClass: null }));
assert.equal(noPressure.netArea, elbow.netArea);
assert.equal(noPressure.netWeight, elbow.netWeight);
assert.match(elbow.inputs, /Pressure Class=medium/);
assert.match(noPressure.inputs, /Pressure Class=NOT_DEFINED/);

// R-08: Net/Waste/Procurement and weight remain unchanged.
assert.equal(elbow.procurementArea, elbow.netArea + elbow.wasteArea);
assert.ok(Math.abs(elbow.procurementWeight - (elbow.netWeight + elbow.wasteWeight)) < 1e-9);
assert.ok(Math.abs(elbow.wasteArea - (elbow.netArea * 0.1)) < 1e-9);
assert.throws(() => calculateFitting(base({ fittingWasteRate: -1 })), /waste rate must be zero or greater/i);

console.log('Sprint 4.2 fitting rules tests passed: Rule IDs, source/basis/limitations, statuses, formulas, units, missing inputs, weight, joint dependency, pressure input-only behavior, accessories, and legacy-safe boundaries.');
