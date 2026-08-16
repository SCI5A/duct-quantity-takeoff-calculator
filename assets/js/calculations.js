(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DuctMath = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const UNIT_FACTORS = Object.freeze({ mmToM: 0.001, mToM: 1 });
  const SHEET_MATERIALS = Object.freeze({
    galvanized: { label: 'Galvanized steel', density: 7850 },
    aluminum: { label: 'Aluminum', density: 2700 },
    stainless: { label: 'Stainless steel', density: 8000 }
  });
  const ACCESSORY_STATUS = Object.freeze({
    CALCULATED: 'CALCULATED',
    ESTIMATED: 'ESTIMATED',
    INPUT_REQUIRED: 'INPUT_REQUIRED',
    NOT_APPLICABLE: 'NOT_APPLICABLE',
    LEGACY_ESTIMATE: 'LEGACY_ESTIMATE'
  });
  const JOINT_MODES = Object.freeze({ PER_RUN: 'PER_RUN', GLOBAL: 'GLOBAL', MANUAL: 'MANUAL', AUTO: 'PER_RUN', LEGACY: 'LEGACY' });
  const CONNECTION_RULE_SOURCES = Object.freeze({ PROJECT_SPEC: 'PROJECT_SPEC', MANUFACTURER_DATA: 'MANUFACTURER_DATA', APPROVED_DETAIL: 'APPROVED_DETAIL', USER_DEFINED: 'USER_DEFINED', ESTIMATING_RULE: 'ESTIMATING_RULE', UNVERIFIED: 'UNVERIFIED' });
  const CONNECTION_RULES = Object.freeze({
    TDF: Object.freeze({
      applicableDuctTypes: Object.freeze(['rect', 'round']), pressureClass: 'INPUT_ONLY', connectionLengthBasis: 'Perimeter × Total Joints × 2 mating flanges',
      flange: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Existing configurable TDF rule; verify against approved detail.' }),
      gasket: Object.freeze({ required: true, status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Existing configurable TDF gasket rule; verify face/detail.' }),
      corners: Object.freeze({ unitsPerJoint: 8, status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Project/joint-type allowance; not a universal standard.' }),
      cleats: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.ESTIMATING_RULE, basis: 'Configurable project allowance: ceil(Connection Length / Cleat Spacing); no Pressure Class-specific rule configured.' }),
      bolts: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.ESTIMATING_RULE, basis: 'Configurable project allowance: ceil(Connection Length / Bolt Spacing).' }),
      nuts: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No verified independent nut connection rule.' }),
      washers: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No verified independent washer connection rule.' }),
      silicone: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.USER_DEFINED, basis: 'User-provided coverage rate; verify technical data.' })
    }),
    TDC: Object.freeze({
      applicableDuctTypes: Object.freeze(['rect', 'round']), pressureClass: 'INPUT_ONLY', connectionLengthBasis: 'Perimeter × Total Joints × 2 mating flanges',
      flange: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Existing configurable TDC rule; verify against approved detail.' }),
      gasket: Object.freeze({ required: true, status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Existing configurable TDC gasket rule; verify face/detail.' }),
      corners: Object.freeze({ unitsPerJoint: 8, status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Project/joint-type allowance; not a universal standard.' }),
      cleats: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.ESTIMATING_RULE, basis: 'Configurable project allowance: ceil(Connection Length / Cleat Spacing); no Pressure Class-specific rule configured.' }),
      bolts: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.ESTIMATING_RULE, basis: 'Configurable project allowance: ceil(Connection Length / Bolt Spacing).' }),
      nuts: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No verified independent nut connection rule.' }),
      washers: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No verified independent washer connection rule.' }),
      silicone: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.USER_DEFINED, basis: 'User-provided coverage rate; verify technical data.' })
    }),
    ANGLE_FLANGE: Object.freeze({
      applicableDuctTypes: Object.freeze(['rect', 'round']), pressureClass: 'INPUT_ONLY', connectionLengthBasis: 'Perimeter × Total Joints × 2 mating flanges',
      flange: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Existing configurable Angle Flange rule; verify against approved detail.' }),
      gasket: Object.freeze({ required: true, status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Existing configurable Angle Flange gasket rule; verify face/detail.' }),
      corners: Object.freeze({ unitsPerJoint: null, status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No verified Angle Flange corner configuration.' }),
      cleats: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.ESTIMATING_RULE, basis: 'Configurable project allowance; verify end condition; no Pressure Class-specific rule configured.' }),
      bolts: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.ESTIMATING_RULE, basis: 'Configurable project allowance; verify end condition; no Pressure Class-specific rule configured.' }),
      nuts: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No verified independent nut connection rule.' }),
      washers: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No verified independent washer connection rule.' }),
      silicone: Object.freeze({ status: ACCESSORY_STATUS.ESTIMATED, source: CONNECTION_RULE_SOURCES.USER_DEFINED, basis: 'User-provided coverage rate; verify technical data.' })
    }),
    SLIP_JOINT: Object.freeze({
      applicableDuctTypes: Object.freeze(['rect', 'round']), pressureClass: 'INPUT_ONLY', connectionLengthBasis: 'Not applicable: no mating flange connection configured',
      flange: Object.freeze({ status: ACCESSORY_STATUS.NOT_APPLICABLE, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Slip Joint has no configured mating flange.' }),
      gasket: Object.freeze({ required: false, status: ACCESSORY_STATUS.NOT_APPLICABLE, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Slip Joint has no configured gasket requirement.' }),
      corners: Object.freeze({ unitsPerJoint: 0, status: ACCESSORY_STATUS.NOT_APPLICABLE, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Slip Joint has no rectangular flange corner rule.' }),
      cleats: Object.freeze({ status: ACCESSORY_STATUS.NOT_APPLICABLE, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No connection length for Slip Joint.' }),
      bolts: Object.freeze({ status: ACCESSORY_STATUS.NOT_APPLICABLE, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'Slip Joint has no configured bolt rule.' }),
      nuts: Object.freeze({ status: ACCESSORY_STATUS.NOT_APPLICABLE, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No bolt connection defined.' }),
      washers: Object.freeze({ status: ACCESSORY_STATUS.NOT_APPLICABLE, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No bolt connection defined.' }),
      silicone: Object.freeze({ status: ACCESSORY_STATUS.NOT_APPLICABLE, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'No connection length for Slip Joint.' })
    }),
    CUSTOM: Object.freeze({
      applicableDuctTypes: Object.freeze(['rect', 'round']), pressureClass: 'INPUT_ONLY', connectionLengthBasis: 'INPUT_REQUIRED',
      flange: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'CUSTOM connection rule required.' }),
      gasket: Object.freeze({ required: null, status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'CUSTOM gasket rule required.' }),
      corners: Object.freeze({ unitsPerJoint: null, status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'CUSTOM corner configuration required.' }),
      cleats: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'CUSTOM connection length rule required.' }),
      bolts: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'CUSTOM connection length/end condition rule required.' }),
      nuts: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'CUSTOM nut rule required.' }),
      washers: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'CUSTOM washer rule required.' }),
      silicone: Object.freeze({ status: ACCESSORY_STATUS.INPUT_REQUIRED, source: CONNECTION_RULE_SOURCES.UNVERIFIED, basis: 'CUSTOM connection length rule required.' })
    })
  });
  const JOINT_TYPES = Object.freeze({
    TDF: Object.freeze({ id: 'TDF', name: 'TDF', category: 'flanged', status: 'CONFIGURABLE', classification: 'JOINT-TYPE DEPENDENT', calculationRules: Object.freeze({ matingFlanges: true, cornerUnitsPerJoint: 8, gasketRequired: true, boltRule: 'INPUT_REQUIRED' }), connectionRule: CONNECTION_RULES.TDF }),
    TDC: Object.freeze({ id: 'TDC', name: 'TDC', category: 'flanged', status: 'CONFIGURABLE', classification: 'JOINT-TYPE DEPENDENT', calculationRules: Object.freeze({ matingFlanges: true, cornerUnitsPerJoint: 8, gasketRequired: true, boltRule: 'INPUT_REQUIRED' }), connectionRule: CONNECTION_RULES.TDC }),
    ANGLE_FLANGE: Object.freeze({ id: 'ANGLE_FLANGE', name: 'Angle Flange', category: 'flanged', status: 'CONFIGURABLE', classification: 'JOINT-TYPE DEPENDENT', calculationRules: Object.freeze({ matingFlanges: true, cornerUnitsPerJoint: null, gasketRequired: true, boltRule: 'INPUT_REQUIRED' }), connectionRule: CONNECTION_RULES.ANGLE_FLANGE }),
    SLIP_JOINT: Object.freeze({ id: 'SLIP_JOINT', name: 'Slip Joint', category: 'slip', status: 'CONFIGURABLE', classification: 'JOINT-TYPE DEPENDENT', calculationRules: Object.freeze({ matingFlanges: false, cornerUnitsPerJoint: 0, gasketRequired: false, boltRule: 'NOT_APPLICABLE' }), connectionRule: CONNECTION_RULES.SLIP_JOINT }),
    CUSTOM: Object.freeze({ id: 'CUSTOM', name: 'Custom', category: 'custom', status: 'CONFIGURABLE', classification: 'INPUT REQUIRED', calculationRules: Object.freeze({ matingFlanges: null, cornerUnitsPerJoint: null, gasketRequired: null, boltRule: 'INPUT_REQUIRED' }), connectionRule: CONNECTION_RULES.CUSTOM })
  });

  function finite(value, label) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      throw new Error(`${label} is required.`);
    }
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number.`);
    return number;
  }

  function optionalFinite(value, label) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
    return finite(value, label);
  }

  function nonNegative(value, label, allowZero = true) {
    const number = finite(value, label);
    if (number < 0 || (!allowZero && number === 0)) throw new Error(`${label} must be ${allowZero ? 'non-negative' : 'greater than zero'}.`);
    return number;
  }

  function positive(value, label) {
    return nonNegative(value, label, false);
  }

  function optionalPositive(value, label) {
    const number = optionalFinite(value, label);
    if (number === null) return null;
    if (number <= 0) throw new Error(`${label} must be greater than zero.`);
    return number;
  }

  function integerAtLeast(value, label, minimum) {
    const number = finite(value, label);
    if (!Number.isInteger(number) || number < minimum) throw new Error(`${label} must be an integer >= ${minimum}.`);
    return number;
  }

  function optionalIntegerAtLeast(value, label, minimum) {
    const number = optionalFinite(value, label);
    if (number === null) return null;
    if (!Number.isInteger(number) || number < minimum) throw new Error(`${label} must be an integer >= ${minimum}.`);
    return number;
  }

  function normalizeDimensions(input) {
    const type = input.type === 'round' ? 'round' : input.type === 'rect' ? 'rect' : null;
    if (!type) throw new Error('Duct type is required.');
    const lengthM = positive(input.l, 'Length');
    const quantity = integerAtLeast(input.qty, 'Quantity', 1);
    const sheetThicknessMm = positive(input.th, 'Sheet thickness');
    const insulationThicknessMm = nonNegative(input.insTh, 'Insulation thickness');
    const joints = optionalIntegerAtLeast(input.joints ?? 0, 'Joints', 0) ?? 0;
    const sheetMaterial = Object.prototype.hasOwnProperty.call(SHEET_MATERIALS, input.sheetMaterial) ? input.sheetMaterial : 'galvanized';
    const density = positive(input.sheetDensity, 'Sheet density');
    const widthMm = type === 'rect' ? positive(input.w, 'Width') : 0;
    const heightMm = type === 'rect' ? positive(input.h, 'Height') : 0;
    const diameterMm = type === 'round' ? positive(input.d, 'Diameter') : 0;
    return {
      type, widthMm, heightMm, diameterMm, lengthM, quantity, sheetThicknessMm,
      insulationThicknessMm, joints, sheetMaterial, sheetDensity: density,
      widthM: widthMm * UNIT_FACTORS.mmToM,
      heightM: heightMm * UNIT_FACTORS.mmToM,
      diameterM: diameterMm * UNIT_FACTORS.mmToM
    };
  }

  function normalizeSettings(settings, options = {}) {
    const optionalJointInputs = options.optionalJointInputs === true;
    const cleatSpacing = optionalJointInputs && (settings.cleatSpacing === null || settings.cleatSpacing === undefined || settings.cleatSpacing === '')
      ? null : positive(settings.cleatSpacing, 'Cleat spacing');
    const silCoverage = optionalJointInputs && (settings.silCoverage === null || settings.silCoverage === undefined || settings.silCoverage === '')
      ? null : positive(settings.silCoverage, 'Silicone coverage');
    return {
      waste: nonNegative(settings.waste, 'Duct waste'),
      adhRate: nonNegative(settings.adhRate, 'Adhesive rate'),
      tapeRate: nonNegative(settings.tapeRate, 'Tape rate'),
      cleatSpacing,
      silCoverage,
      insWaste: nonNegative(settings.insWaste, 'Insulation waste')
    };
  }

  function hasJointModel(input) {
    return input.jointCountMode !== undefined || input.jointType !== undefined || input.fabricationLength !== undefined ||
      input.fabricationLengthM !== undefined || input.sectionCount !== undefined || input.manualJointCount !== undefined ||
      input.boltSpacing !== undefined || input.pressureClass !== undefined;
  }

  function normalizeJointType(value) {
    if (!value) throw new Error('Joint type is required.');
    const id = String(value).toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(JOINT_TYPES, id)) throw new Error('Joint type is invalid.');
    return JOINT_TYPES[id];
  }

  function calculateSectionCount(totalLengthM, fabricationLengthM) {
    const total = positive(totalLengthM, 'Total duct length');
    const fabrication = positive(fabricationLengthM, 'Fabrication length');
    return Math.max(1, Math.ceil(total / fabrication));
  }

  function calculateJointCount({ mode, lengthM, quantity, fabricationLengthM, manualJointCount, legacyJointCount }) {
    if (mode === JOINT_MODES.MANUAL) {
      return { totalLengthM: lengthM * quantity, sectionsPerRun: null, jointsPerRun: null, sectionCount: null, jointCount: integerAtLeast(manualJointCount, 'Manual joint count', 0), source: 'MANUAL' };
    }
    if (mode === JOINT_MODES.LEGACY) {
      const legacy = integerAtLeast(legacyJointCount, 'Legacy joint count', 0);
      return { totalLengthM: lengthM * quantity, sectionsPerRun: null, jointsPerRun: null, sectionCount: null, jointCount: legacy, source: 'LEGACY_ESTIMATE' };
    }
    const fabrication = positive(fabricationLengthM, 'Fabrication length');
    if (mode === JOINT_MODES.GLOBAL) {
      const totalLengthM = lengthM * quantity;
      const sectionCount = calculateSectionCount(totalLengthM, fabrication);
      return { totalLengthM, sectionsPerRun: null, jointsPerRun: null, sectionCount, jointCount: Math.max(0, sectionCount - 1), source: 'GLOBAL-FABRICATION-SECTION DERIVED' };
    }
    const sectionsPerRun = calculateSectionCount(lengthM, fabrication);
    const jointsPerRun = Math.max(0, sectionsPerRun - 1);
    return { totalLengthM: lengthM * quantity, sectionsPerRun, jointsPerRun, sectionCount: sectionsPerRun * quantity, jointCount: jointsPerRun * quantity, source: 'PER-RUN-FABRICATION-SECTION DERIVED' };
  }

  function normalizeJointModel(input, dimensions) {
    const explicit = hasJointModel(input);
    if (!explicit) {
      const legacyJointCount = dimensions.joints > 0 ? dimensions.joints : Math.max(0, dimensions.quantity - 1);
      return {
        mode: JOINT_MODES.LEGACY, jointBasis: JOINT_MODES.LEGACY, jointCountMode: JOINT_MODES.LEGACY, jointType: 'TDF', jointTypeDefinition: JOINT_TYPES.TDF, connectionRule: CONNECTION_RULES.TDF,
        fabricationLengthM: null, totalLengthM: dimensions.lengthM * dimensions.quantity, sectionsPerRun: null, jointsPerRun: null, sectionCount: null, jointCount: legacyJointCount, manualJointCount: null,
        jointCountSource: 'LEGACY_ESTIMATE', pressureClass: null, boltSpacingMm: null, boltSize: null, boltLengthMm: null,
        explicit: false
      };
    }
    const rawMode = String(input.jointBasis || input.jointCountMode || JOINT_MODES.PER_RUN).toUpperCase();
    const mode = rawMode === 'AUTO' ? JOINT_MODES.PER_RUN : rawMode;
    if (![JOINT_MODES.PER_RUN, JOINT_MODES.GLOBAL, JOINT_MODES.MANUAL, JOINT_MODES.LEGACY].includes(mode)) throw new Error('Joint calculation basis is invalid.');
    const jointTypeDefinition = normalizeJointType(input.jointType || (mode === JOINT_MODES.LEGACY ? 'TDF' : null));
    const fabricationLengthM = optionalPositive(input.fabricationLengthM ?? input.fabricationLength, 'Fabrication length');
    const manualJointCount = optionalIntegerAtLeast(input.manualJointCount, 'Manual joint count', 0);
    if ((mode === JOINT_MODES.PER_RUN || mode === JOINT_MODES.GLOBAL) && fabricationLengthM === null) throw new Error('Fabrication length is required for automatic joint calculation.');
    if (mode === JOINT_MODES.MANUAL && manualJointCount === null) throw new Error('Manual joint count is required in MANUAL mode.');
    const legacyJointCount = optionalIntegerAtLeast(input.jointCount ?? input.joints ?? dimensions.joints, 'Legacy joint count', 0) ?? dimensions.joints;
    const counts = calculateJointCount({ mode, lengthM: dimensions.lengthM, quantity: dimensions.quantity, fabricationLengthM, manualJointCount, legacyJointCount });
    return {
      mode, jointBasis: mode, jointCountMode: mode, jointType: jointTypeDefinition.id, jointTypeDefinition, connectionRule: jointTypeDefinition.connectionRule, jointClassification: jointTypeDefinition.classification,
      fabricationLengthM, totalLengthM: counts.totalLengthM, sectionsPerRun: counts.sectionsPerRun, jointsPerRun: counts.jointsPerRun, sectionCount: counts.sectionCount, jointCount: counts.jointCount,
      manualJointCount, jointCountSource: counts.source, pressureClass: input.pressureClass || null,
      boltSpacingMm: optionalPositive(input.boltSpacing, 'Bolt spacing'),
      boltSize: input.boltSize || null,
      boltLengthMm: optionalPositive(input.boltLength, 'Bolt length'),
      explicit: true
    };
  }

  function calculateJointPerimeter(perimeterM, jointCount, jointTypeDefinition) {
    const count = integerAtLeast(jointCount, 'Joint count', 0);
    if (jointTypeDefinition.calculationRules.matingFlanges === false) return { value: 0, status: ACCESSORY_STATUS.NOT_APPLICABLE, formula: 'No mating-flange rule for this joint type.' };
    if (jointTypeDefinition.calculationRules.matingFlanges === null) return { value: 0, status: ACCESSORY_STATUS.INPUT_REQUIRED, formula: 'Mating-flange rule is required for this joint type.' };
    return { value: perimeterM * count * 2, status: ACCESSORY_STATUS.CALCULATED, formula: `${perimeterM} × ${count} × 2` };
  }

  function accessoryLine({ net = 0, unit, status, source = CONNECTION_RULE_SOURCES.UNVERIFIED, formula, inputs, basis, reason, waste = 0 }) {
    const procurement = net + waste;
    return {
      net, waste, procurement, unit, status, source, formula, inputs, basis,
      reason: reason || basis, quantity: procurement
    };
  }

  function calculateJointAccessories({ perimeterM, dimensions, settings, jointModel }) {
    const rules = jointModel.jointTypeDefinition.calculationRules;
    const rule = jointModel.connectionRule || CONNECTION_RULES[jointModel.jointType] || CONNECTION_RULES.CUSTOM;
    const jointCount = jointModel.jointCount;
    const jointPerimeter = calculateJointPerimeter(perimeterM, jointCount, jointModel.jointTypeDefinition);
    const connectionLengthM = jointPerimeter.value;
    const connectionInputs = `Duct Type=${dimensions.type}; Joint Type=${jointModel.jointType}; Joint Basis=${jointModel.jointBasis}; Total Joints=${jointCount}; Pressure Class=${jointModel.pressureClass || 'NOT_DEFINED'}`;
    const legacy = jointModel.jointCountMode === JOINT_MODES.LEGACY;
    const flange = rules.matingFlanges === false
      ? accessoryLine({ unit: 'm', status: ACCESSORY_STATUS.NOT_APPLICABLE, formula: 'No mating-flange rule for this Joint Type', inputs: connectionInputs, basis: 'Joint Type does not require mating flanges.' })
      : rules.matingFlanges === null
        ? accessoryLine({ unit: 'm', status: ACCESSORY_STATUS.INPUT_REQUIRED, formula: 'Mating-flange rule required', inputs: connectionInputs, basis: 'CUSTOM Joint Type has no configured flange rule.' })
        : accessoryLine({ net: connectionLengthM, unit: 'm', status: legacy ? ACCESSORY_STATUS.LEGACY_ESTIMATE : rule.flange.status, source: rule.flange.source, formula: `${perimeterM} m × ${jointCount} joints × 2 mating flanges`, inputs: connectionInputs, basis: legacy ? 'Legacy stored estimate retained.' : 'Joint-Type mating-flange rule.' });
    const flangeLengthM = flange.net;
    const connectionRuleMissing = jointPerimeter.status === ACCESSORY_STATUS.INPUT_REQUIRED;
    const cornerUnits = dimensions.type === 'rect' ? rules.cornerUnitsPerJoint : 0;
    const corners = dimensions.type !== 'rect'
      ? accessoryLine({ unit: 'pcs', status: ACCESSORY_STATUS.NOT_APPLICABLE, formula: 'Round duct has no rectangular flange corners', inputs: connectionInputs, basis: 'Duct Type dependency.' })
      : cornerUnits === null
        ? accessoryLine({ unit: 'pcs', status: ACCESSORY_STATUS.INPUT_REQUIRED, formula: 'Corner rule required for this Joint Type', inputs: connectionInputs, basis: 'No verified corner rule configured.' })
        : accessoryLine({ net: cornerUnits * jointCount, unit: 'pcs', status: legacy ? ACCESSORY_STATUS.LEGACY_ESTIMATE : rule.corners.status, source: rule.corners.source, formula: `${cornerUnits} corner units/joint × ${jointCount} joints`, inputs: connectionInputs, basis: legacy ? 'Legacy stored estimate retained.' : rule.corners.basis });
    const cleats = connectionRuleMissing
      ? accessoryLine({ unit: 'pcs', status: ACCESSORY_STATUS.INPUT_REQUIRED, formula: 'Connection Length rule required before Cleat calculation', inputs: connectionInputs, basis: 'Cleats cannot be derived without a verified connection-length rule.' })
      : flangeLengthM === 0 && rules.matingFlanges === false
        ? accessoryLine({ unit: 'pcs', status: ACCESSORY_STATUS.NOT_APPLICABLE, formula: 'No connection length for this Joint Type', inputs: connectionInputs, basis: 'Joint Type dependency.' })
        : settings.cleatSpacing === null
        ? accessoryLine({ unit: 'pcs', status: ACCESSORY_STATUS.INPUT_REQUIRED, formula: 'Cleat Spacing is required', inputs: connectionInputs, basis: 'Connection Length ÷ Cleat Spacing cannot be evaluated.' })
        : accessoryLine({ net: Math.ceil(flangeLengthM / (settings.cleatSpacing * UNIT_FACTORS.mmToM)), unit: 'pcs', status: legacy ? ACCESSORY_STATUS.LEGACY_ESTIMATE : rule.cleats.status, source: rule.cleats.source, formula: `ceil(${flangeLengthM} m ÷ ${settings.cleatSpacing} mm)`, inputs: `${connectionInputs}; Cleat Spacing=${settings.cleatSpacing} mm`, basis: legacy ? 'Legacy stored estimate retained.' : rule.cleats.basis });
    const gasketRequired = rules.gasketRequired;
    const gasket = gasketRequired === false
      ? { required: false, ...accessoryLine({ unit: 'm', status: ACCESSORY_STATUS.NOT_APPLICABLE, formula: 'Gasket not required for this Joint Type', inputs: connectionInputs, basis: 'Joint-Type gasket rule.' }) }
      : gasketRequired === null
        ? { required: null, ...accessoryLine({ unit: 'm', status: ACCESSORY_STATUS.INPUT_REQUIRED, formula: 'Gasket rule required', inputs: connectionInputs, basis: 'CUSTOM Joint Type has no verified gasket rule.' }) }
        : { required: true, ...accessoryLine({ net: flangeLengthM, unit: 'm', status: legacy ? ACCESSORY_STATUS.LEGACY_ESTIMATE : rule.gasket.status, source: rule.gasket.source, formula: `${flangeLengthM} m connection length + 0 m accessory waste`, inputs: connectionInputs, basis: legacy ? 'Legacy stored estimate retained.' : rule.gasket.basis }) };
    const silicone = connectionRuleMissing
      ? accessoryLine({ unit: 'tubes', status: ACCESSORY_STATUS.INPUT_REQUIRED, formula: 'Connection Length rule required before Silicone calculation', inputs: connectionInputs, basis: 'Silicone cannot be derived without a verified connection-length rule.' })
      : flangeLengthM === 0 && rules.matingFlanges === false
        ? accessoryLine({ unit: 'tubes', status: ACCESSORY_STATUS.NOT_APPLICABLE, formula: 'No connection length for this Joint Type', inputs: connectionInputs, basis: 'Joint Type dependency.' })
        : settings.silCoverage === null
        ? accessoryLine({ unit: 'tubes', status: ACCESSORY_STATUS.INPUT_REQUIRED, formula: 'Silicone coverage rate is required', inputs: connectionInputs, basis: 'No global silicone rate is assumed.' })
        : accessoryLine({ net: Math.ceil(flangeLengthM / settings.silCoverage), unit: 'tubes', status: legacy ? ACCESSORY_STATUS.LEGACY_ESTIMATE : rule.silicone.status, source: rule.silicone.source, formula: `ceil(${flangeLengthM} m ÷ ${settings.silCoverage} m/tube) + 0 tubes accessory waste`, inputs: `${connectionInputs}; Silicone Coverage=${settings.silCoverage} m/tube`, basis: legacy ? 'Legacy stored estimate retained.' : rule.silicone.basis });
    const bolts = legacy
      ? accessoryLine({ net: cleats.net, unit: 'sets', status: ACCESSORY_STATUS.LEGACY_ESTIMATE, formula: 'Legacy stored value retained', inputs: connectionInputs, basis: 'Legacy compatibility only; Bolts = Cleats is not a universal engineering rule.' })
      : connectionRuleMissing
        ? accessoryLine({ unit: 'sets', status: ACCESSORY_STATUS.INPUT_REQUIRED, formula: 'Connection Length rule required before Bolt calculation', inputs: connectionInputs, basis: 'Bolts cannot be derived without a verified connection-length rule.' })
        : flangeLengthM === 0 && rules.boltRule === 'NOT_APPLICABLE'
        ? accessoryLine({ unit: 'sets', status: ACCESSORY_STATUS.NOT_APPLICABLE, formula: 'Bolts not applicable for this Joint Type', inputs: connectionInputs, basis: 'Joint-Type bolt rule.' })
        : jointModel.boltSpacingMm === null
          ? accessoryLine({ unit: 'sets', status: ACCESSORY_STATUS.INPUT_REQUIRED, formula: 'Bolt Spacing is required', inputs: connectionInputs, basis: 'No verified bolt rule without Bolt Spacing.' })
          : accessoryLine({ net: Math.ceil(flangeLengthM / (jointModel.boltSpacingMm * UNIT_FACTORS.mmToM)), unit: 'sets', status: rule.bolts.status, source: rule.bolts.source, formula: `ceil(${flangeLengthM} m ÷ ${jointModel.boltSpacingMm} mm) + 0 sets accessory waste`, inputs: `${connectionInputs}; Bolt Spacing=${jointModel.boltSpacingMm} mm`, basis: rule.bolts.basis });
    const nuts = legacy
      ? accessoryLine({ net: bolts.net, unit: 'pcs', status: ACCESSORY_STATUS.LEGACY_ESTIMATE, formula: 'Legacy stored value retained', inputs: connectionInputs, basis: 'Legacy compatibility only.' })
      : bolts.status === ACCESSORY_STATUS.NOT_APPLICABLE
        ? accessoryLine({ unit: 'pcs', status: ACCESSORY_STATUS.NOT_APPLICABLE, formula: 'No bolt connection defined', inputs: connectionInputs, basis: 'Joint-Type dependency.' })
        : accessoryLine({ unit: 'pcs', status: rule.nuts.status, source: rule.nuts.source, formula: 'Nut connection rule required', inputs: connectionInputs, basis: rule.nuts.basis });
    const washers = legacy
      ? accessoryLine({ net: bolts.net, unit: 'pcs', status: ACCESSORY_STATUS.LEGACY_ESTIMATE, formula: 'Legacy stored value retained', inputs: connectionInputs, basis: 'Legacy compatibility only.' })
      : bolts.status === ACCESSORY_STATUS.NOT_APPLICABLE
        ? accessoryLine({ unit: 'pcs', status: ACCESSORY_STATUS.NOT_APPLICABLE, formula: 'No bolt connection defined', inputs: connectionInputs, basis: 'Joint-Type dependency.' })
        : accessoryLine({ unit: 'pcs', status: rule.washers.status, source: rule.washers.source, formula: 'Washer connection rule required', inputs: connectionInputs, basis: rule.washers.basis });
    return {
      jointPerimeterM: connectionLengthM,
      jointPerimeterStatus: jointPerimeter.status,
      connectionLengthM,
      flange, corners, cleats, gasket, silicone, bolts, nuts, washers
    };
  }

  function calculateItem(input, settings) {
    const dimensions = normalizeDimensions(input);
    const explicitJointModel = hasJointModel(input);
    const rates = normalizeSettings(settings, { optionalJointInputs: explicitJointModel });
    const jointModel = normalizeJointModel(input, dimensions);
    const perimeterM = dimensions.type === 'rect'
      ? 2 * (dimensions.widthM + dimensions.heightM)
      : Math.PI * dimensions.diameterM;
    const netArea = perimeterM * dimensions.lengthM * dimensions.quantity;
    const ductWasteArea = netArea * rates.waste / 100;
    const procurementDuctArea = netArea + ductWasteArea;
    const netInsulationArea = netArea;
    const insulationWasteArea = netInsulationArea * rates.insWaste / 100;
    const procurementInsulationArea = netInsulationArea + insulationWasteArea;
    const insulationVolume = procurementInsulationArea * dimensions.insulationThicknessMm * UNIT_FACTORS.mmToM;
    const accessories = calculateJointAccessories({ perimeterM, dimensions, settings: rates, jointModel });
    const netWeight = netArea * (dimensions.sheetThicknessMm * UNIT_FACTORS.mmToM) * dimensions.sheetDensity;
    const wasteWeight = ductWasteArea * (dimensions.sheetThicknessMm * UNIT_FACTORS.mmToM) * dimensions.sheetDensity;
    const procurementWeight = procurementDuctArea * (dimensions.sheetThicknessMm * UNIT_FACTORS.mmToM) * dimensions.sheetDensity;
    const adhesive = procurementInsulationArea * rates.adhRate;
    const tape = procurementInsulationArea * rates.tapeRate;
    return {
      ...dimensions, ...rates, ...jointModel,
      wasteRate: rates.waste, insulationWasteRate: rates.insWaste,
      perimeterM, netArea, ductWasteArea, procurementDuctArea,
      netInsulationArea, insulationWasteArea, procurementInsulationArea, insulationVolume,
      jointPerimeterM: accessories.jointPerimeterM,
      joints: jointModel.jointCount,
      flange: accessories.flange.procurement,
      flangeStatus: accessories.flange.status,
      corners: accessories.corners.procurement,
      cornersStatus: accessories.corners.status,
      cleats: accessories.cleats.procurement,
      cleatsStatus: accessories.cleats.status,
      gasketRequired: accessories.gasket.required,
      gasketLength: accessories.gasket.net,
      gasket: accessories.gasket.procurement,
      gasketWaste: accessories.gasket.waste,
      gasketProcurement: accessories.gasket.procurement,
      gasketStatus: accessories.gasket.status,
      silicone: accessories.silicone.procurement,
      siliconeStatus: accessories.silicone.status,
      siliconeSource: accessories.silicone.reason,
      bolts: accessories.bolts.procurement,
      boltsStatus: accessories.bolts.status,
      nuts: accessories.nuts.procurement,
      nutsStatus: accessories.nuts.status,
      washers: accessories.washers.procurement,
      washersStatus: accessories.washers.status,
      accessoryNet: Object.fromEntries(Object.entries(accessories).filter(([key]) => ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers'].includes(key)).map(([key, line]) => [key, line.net])),
      accessoryWaste: Object.fromEntries(Object.entries(accessories).filter(([key]) => ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers'].includes(key)).map(([key, line]) => [key, line.waste])),
      accessoryProcurement: Object.fromEntries(Object.entries(accessories).filter(([key]) => ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers'].includes(key)).map(([key, line]) => [key, line.procurement])),
      accessoryDetails: accessories,
      netWeight, wasteWeight, procurementWeight, weight: procurementWeight,
      adhesive, tape,
      area: netArea, waste: ductWasteArea, total: procurementDuctArea, ins: procurementInsulationArea
    };
  }

  return Object.freeze({
    UNIT_FACTORS, SHEET_MATERIALS, ACCESSORY_STATUS, JOINT_MODES, CONNECTION_RULE_SOURCES, CONNECTION_RULES, JOINT_TYPES,
    normalizeDimensions, normalizeSettings, normalizeJointType, calculateSectionCount,
    calculateJointCount, calculateJointPerimeter, calculateJointAccessories, calculateItem
  });
});
