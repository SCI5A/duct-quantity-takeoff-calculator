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
const fittingTypes = ['ELBOW', 'TEE', 'REDUCER', 'TRANSITION', 'OFFSET', 'END_CAP', 'CUSTOM_FITTING'];
const acceptedSources = new Set(['PROJECT_SPEC', 'MANUFACTURER_DATA', 'APPROVED_DETAIL', 'CODE_STANDARD', 'USER_DEFINED', 'ESTIMATING_RULE', 'UNVERIFIED']);

// S-01: Every in-project geometry rule is explicit and traceable, even when unverified.
for (const type of fittingTypes) {
  const rule = FITTING_GEOMETRY_RULES[type];
  assert.ok(rule, `${type} rule missing`);
  for (const field of ['ruleId', 'fittingType', 'applicableDuctTypes', 'requiredInputs', 'formula', 'unit', 'status', 'engineeringBasis', 'source', 'limitations']) {
    assert.ok(Object.hasOwn(rule, field), `${type}.${field} missing`);
  }
  assert.ok(acceptedSources.has(rule.source), `${type} source must use an accepted classification`);
  assert.notEqual(rule.source, '', `${type} source must not be empty`);
  assert.ok(!rule.ruleId.includes('SOURCE-EXAMPLE'), `${type} must not use a placeholder source`);
  if (rule.source === 'UNVERIFIED') assert.notEqual(rule.status, ACCESSORY_STATUS.CALCULATED, `${type} unverified rule cannot be CALCULATED`);
}

// S-02: Source audit confirms no project/manufacturer/detail/code source is present in the rule objects.
for (const type of fittingTypes) assert.equal(FITTING_GEOMETRY_RULES[type].source, 'UNVERIFIED', `${type} must remain unverified without a supplied document`);

// S-03: Existing production formulas and numerical results remain unchanged.
const elbow = calculateFitting(base());
assert.equal(elbow.ruleId, 'FGR-ELBOW-CENTERLINE-ARC-V1');
assert.equal(elbow.formula, '2.6 m perimeter × (2π × 0.5 m × 90° ÷ 360°) × 5');
assert.ok(Math.abs(elbow.netArea - 10.21017612416683) < 1e-9);
assert.ok(Math.abs(elbow.wasteArea - 1.021017612416683) < 1e-9);
assert.ok(Math.abs(elbow.procurementArea - 11.231193736583513) < 1e-9);
assert.equal(elbow.joints, 15);
assert.equal(elbow.sectionCount, 20);
assert.equal(elbow.jointBasis, 'PER_RUN');
assert.equal(elbow.geometryRuleStatus, ACCESSORY_STATUS.ESTIMATED);
assert.equal(elbow.geometryRuleSource, 'UNVERIFIED');

// S-04: End Cap remains the current geometric estimate and does not inherit connection details.
const endCap = calculateFitting(base({ fittingType: 'END_CAP', fittingWasteRate: 0 }));
assert.equal(endCap.ruleId, 'FGR-END-CAP-END-FACE-V1');
assert.equal(endCap.status, ACCESSORY_STATUS.ESTIMATED);
assert.equal(endCap.source, 'UNVERIFIED');
for (const key of ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers']) {
  assert.equal(endCap.accessoryDetails[key].status, ACCESSORY_STATUS.NOT_APPLICABLE, `End Cap ${key}`);
}

// S-05: Unsupported geometry stays INPUT_REQUIRED and does not invent a source or formula.
for (const type of ['TEE', 'REDUCER', 'TRANSITION', 'OFFSET', 'CUSTOM_FITTING']) {
  const item = calculateFitting(base({ fittingType: type, fabricationAreaM2: null }));
  assert.equal(item.status, ACCESSORY_STATUS.INPUT_REQUIRED, `${type} status`);
  assert.equal(item.source, 'UNVERIFIED', `${type} source`);
  assert.equal(item.netArea, 0, `${type} must not invent area`);
  assert.match(item.formula, /Fabrication Area input required/);
}

// S-06: Joint Engine and Pressure Class remain unchanged and input-only.
const global = calculateFitting(base({ jointBasis: 'GLOBAL' }));
const manual = calculateFitting(base({ jointBasis: 'MANUAL', fabricationLengthM: null, manualJointCount: 17 }));
assert.deepEqual([elbow.joints, global.joints, manual.joints], [15, 19, 17]);
assert.equal(global.pressureClass, 'medium');
assert.equal(global.netArea, elbow.netArea);
assert.equal(global.netWeight, elbow.netWeight);

// S-07: Accessory rules are not replaced by fitting-specific standards.
for (const key of ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers']) {
  assert.equal(elbow.accessoryDetails[key].status, ACCESSORY_STATUS.INPUT_REQUIRED);
}

console.log('Sprint 4.3 fitting source audit passed: source classification, rule traceability, unchanged formulas/results, missing-source statuses, Joint Engine stability, Pressure Class input-only behavior, and no invented accessories.');
