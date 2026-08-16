(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calculations.js'));
  else root.DuctFittings = factory(root.DuctMath);
})(typeof window !== 'undefined' ? window : globalThis, function (DuctMath) {
  'use strict';

  const { ACCESSORY_STATUS, CONNECTION_RULE_SOURCES, SHEET_MATERIALS, UNIT_FACTORS, calculateJointCount } = DuctMath;
  const FITTING_TYPES = Object.freeze({
    ELBOW: 'ELBOW', TEE: 'TEE', REDUCER: 'REDUCER', TRANSITION: 'TRANSITION', OFFSET: 'OFFSET', END_CAP: 'END_CAP', CUSTOM_FITTING: 'CUSTOM_FITTING'
  });
  const FITTING_STATUS = ACCESSORY_STATUS;
  const ACCESSORY_KEYS = ['flange', 'corners', 'cleats', 'gasket', 'silicone', 'bolts', 'nuts', 'washers'];

  function finitePositive(value, label, { required = true } = {}) {
    if (value === null || value === undefined || value === '') {
      if (required) throw new Error(`${label} is required.`);
      return null;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} must be greater than zero.`);
    return number;
  }

  function integerPositive(value, label) {
    const number = finitePositive(value, label);
    if (!Number.isInteger(number)) throw new Error(`${label} must be a whole number.`);
    return number;
  }

  function fittingLine({ unit = 'm²', status, formula, inputs, basis, source = CONNECTION_RULE_SOURCES.UNVERIFIED, net = 0, waste = 0 }) {
    return { unit, status, formula, inputs, basis, source, net, waste, procurement: net + waste, quantity: net + waste };
  }

  function emptyAccessoryDetails(type, inputs) {
    return Object.fromEntries(ACCESSORY_KEYS.map(key => [key, fittingLine({
      unit: key === 'silicone' ? 'tubes' : key === 'flange' || key === 'gasket' ? 'm' : key === 'bolts' ? 'sets' : 'pcs',
      status: FITTING_STATUS.INPUT_REQUIRED,
      formula: 'Fitting-specific connection rule required',
      inputs,
      basis: `${type} has no verified fitting-specific connection rule configured.`,
      source: CONNECTION_RULE_SOURCES.UNVERIFIED
    })]));
  }

  function notApplicableAccessories(type, inputs) {
    return Object.fromEntries(ACCESSORY_KEYS.map(key => [key, fittingLine({
      unit: key === 'silicone' ? 'tubes' : key === 'flange' || key === 'gasket' ? 'm' : key === 'bolts' ? 'sets' : 'pcs',
      status: FITTING_STATUS.NOT_APPLICABLE,
      formula: 'No fitting accessory rule applied',
      inputs,
      basis: `${type} accessory rules are not assumed by Sprint 4.`,
      source: CONNECTION_RULE_SOURCES.UNVERIFIED
    })]));
  }

  function jointSnapshot(input) {
    const mode = input.jointBasis || input.jointCountMode;
    const quantity = integerPositive(input.quantity ?? input.qty ?? 1, 'Fitting quantity');
    const lengthM = finitePositive(input.lengthM ?? input.l, 'Fitting run length');
    const fabricationLengthM = mode === 'MANUAL' ? null : finitePositive(input.fabricationLengthM ?? input.fabricationLength, 'Fabrication Length');
    const manualJointCount = mode === 'MANUAL' ? integerPositive(input.manualJointCount, 'Manual Joint Count') : null;
    if (!['PER_RUN', 'GLOBAL', 'MANUAL'].includes(mode)) throw new Error('Fitting Joint Basis must be PER_RUN, GLOBAL, or MANUAL.');
    const counts = calculateJointCount({ mode, lengthM, quantity, fabricationLengthM, manualJointCount, legacyJointCount: 0 });
    return { mode, quantity, lengthM, fabricationLengthM, manualJointCount, sectionCount: counts.sectionCount, totalJoints: counts.jointCount, totalLengthM: counts.totalLengthM, source: counts.source };
  }

  function calculateElbow(input, dims, quantity) {
    const radiusM = finitePositive(input.radiusM ?? input.radiusMm ?? input.radius ?? input.fittingRadius, 'Elbow radius') * UNIT_FACTORS.mmToM;
    const angleDeg = finitePositive(input.angleDeg ?? input.angle ?? input.fittingAngle, 'Elbow angle');
    if (angleDeg > 360) throw new Error('Elbow angle cannot exceed 360 degrees.');
    const arcLengthM = 2 * Math.PI * radiusM * angleDeg / 360;
    const perimeterM = dims.ductType === 'RECTANGULAR' ? 2 * (dims.widthM + dims.heightM) : Math.PI * dims.diameterM;
    const singleAreaM2 = arcLengthM * perimeterM;
    return { netArea: singleAreaM2 * quantity, formula: `${perimeterM} m perimeter × (2π × ${radiusM} m × ${angleDeg}° ÷ 360°) × ${quantity}`, basis: 'Geometric centerline arc × duct perimeter; fabrication detail not assumed.', source: CONNECTION_RULE_SOURCES.UNVERIFIED, status: FITTING_STATUS.ESTIMATED };
  }

  function calculateEndCap(input, dims, quantity) {
    const singleAreaM2 = dims.ductType === 'RECTANGULAR' ? dims.widthM * dims.heightM : Math.PI * Math.pow(dims.diameterM / 2, 2);
    return { netArea: singleAreaM2 * quantity, formula: `${dims.ductType === 'RECTANGULAR' ? `${dims.widthM} m × ${dims.heightM} m` : `π × (${dims.diameterM} m ÷ 2)²`} × ${quantity}`, basis: 'Geometric end-face area only; flange/closure fabrication detail not assumed.', source: CONNECTION_RULE_SOURCES.UNVERIFIED, status: FITTING_STATUS.ESTIMATED };
  }

  function calculateFittingArea(input, dims, quantity, type) {
    if (type === FITTING_TYPES.ELBOW) return calculateElbow(input, dims, quantity);
    if (type === FITTING_TYPES.END_CAP) return calculateEndCap(input, dims, quantity);
    const fabricationAreaM2 = finitePositive(input.fabricationAreaM2 ?? input.fabricationArea, 'Fabrication Area', { required: false });
    if (fabricationAreaM2 === null) return { netArea: 0, formula: 'Fabrication Area input required for this Fitting Type', basis: `${type} requires a verified fabrication geometry or approved fabrication area.`, source: CONNECTION_RULE_SOURCES.UNVERIFIED, status: FITTING_STATUS.INPUT_REQUIRED };
    return { netArea: fabricationAreaM2 * quantity, formula: `${fabricationAreaM2} m² user-provided fabrication area × ${quantity}`, basis: `${type} uses a user-provided fabrication area; no universal geometry rule is assumed.`, source: CONNECTION_RULE_SOURCES.USER_DEFINED, status: FITTING_STATUS.ESTIMATED };
  }

  function dimensionsFor(input) {
    const ductType = String(input.ductType || input.type || '').toUpperCase();
    if (ductType === 'RECT' || ductType === 'RECTANGULAR' || ductType === 'مستطيل') {
      return { ductType: 'RECTANGULAR', widthM: finitePositive(input.widthMm ?? input.w, 'Fitting width') * UNIT_FACTORS.mmToM, heightM: finitePositive(input.heightMm ?? input.h, 'Fitting height') * UNIT_FACTORS.mmToM, diameterM: null };
    }
    if (ductType === 'ROUND' || ductType === 'دائري') return { ductType: 'ROUND', widthM: null, heightM: null, diameterM: finitePositive(input.diameterMm ?? input.d, 'Fitting diameter') * UNIT_FACTORS.mmToM };
    throw new Error('Fitting duct type must be RECTANGULAR or ROUND.');
  }

  function calculateFitting(input, settings = {}) {
    const type = String(input.fittingType || input.type || '').toUpperCase();
    if (!Object.values(FITTING_TYPES).includes(type)) throw new Error('Fitting Type is required.');
    const dims = dimensionsFor(input);
    const quantity = integerPositive(input.quantity ?? input.qty, 'Fitting quantity');
    const joint = jointSnapshot(input);
    const materialKey = input.sheetMaterial || 'galvanized';
    const density = Number(input.sheetDensity ?? SHEET_MATERIALS[materialKey]?.density);
    if (!Number.isFinite(density) || density <= 0) throw new Error('Fitting material density is required.');
    const sheetThicknessMm = finitePositive(input.sheetThicknessMm ?? input.th, 'Fitting sheet thickness');
    const geometry = calculateFittingArea(input, dims, quantity, type);
    const wasteRateValue = input.fittingWasteRate === null || input.fittingWasteRate === undefined || input.fittingWasteRate === '' ? 0 : Number(input.fittingWasteRate);
    if (!Number.isFinite(wasteRateValue) || wasteRateValue < 0) throw new Error('Fitting waste rate must be zero or greater.');
    const wasteRate = wasteRateValue;
    const wasteArea = geometry.netArea * (wasteRate || 0) / 100;
    const procurementArea = geometry.netArea + wasteArea;
    const netWeight = geometry.netArea * sheetThicknessMm * UNIT_FACTORS.mmToM * density;
    const wasteWeight = wasteArea * sheetThicknessMm * UNIT_FACTORS.mmToM * density;
    const procurementWeight = procurementArea * sheetThicknessMm * UNIT_FACTORS.mmToM * density;
    const inputs = `Fitting Type=${type}; Duct Type=${dims.ductType}; Quantity=${quantity}; Joint Basis=${joint.mode}; Total Joints=${joint.totalJoints}; Joint Type=${input.jointType || 'NOT_DEFINED'}; Pressure Class=${input.pressureClass || 'NOT_DEFINED'}`;
    const accessoryDetails = type === FITTING_TYPES.END_CAP ? notApplicableAccessories(type, inputs) : emptyAccessoryDetails(type, inputs);
    return {
      itemKind: 'FITTING', fittingType: type, type: dims.ductType === 'RECTANGULAR' ? 'rect' : 'round', ductType: dims.ductType,
      quantity, dimensions: { widthMm: dims.widthM === null ? null : dims.widthM / UNIT_FACTORS.mmToM, heightMm: dims.heightM === null ? null : dims.heightM / UNIT_FACTORS.mmToM, diameterMm: dims.diameterM === null ? null : dims.diameterM / UNIT_FACTORS.mmToM },
      sheetMaterial: materialKey, sheetThicknessMm, sheetDensity: density, jointBasis: joint.mode, jointType: input.jointType || null, pressureClass: input.pressureClass || null,
      totalLengthM: joint.totalLengthM, sectionCount: joint.sectionCount, joints: joint.totalJoints, jointCountSource: joint.source, fabricationLengthM: joint.fabricationLengthM,
      netArea: geometry.netArea, wasteArea, procurementArea, netWeight, wasteWeight, procurementWeight, weight: procurementWeight,
      fittingStatus: geometry.status, status: geometry.status, formula: geometry.formula, inputs, basis: geometry.basis, source: geometry.source,
      fittingWasteRate: wasteRate || 0, accessoryDetails, fittingAccessoryDetails: accessoryDetails,
      flange: 0, corners: 0, cleats: 0, gasket: 0, silicone: 0, bolts: 0, nuts: 0, washers: 0,
      flangeStatus: accessoryDetails.flange.status, cornersStatus: accessoryDetails.corners.status, cleatsStatus: accessoryDetails.cleats.status, gasketStatus: accessoryDetails.gasket.status,
      siliconeStatus: accessoryDetails.silicone.status, boltsStatus: accessoryDetails.bolts.status, nutsStatus: accessoryDetails.nuts.status, washersStatus: accessoryDetails.washers.status
    };
  }

  return Object.freeze({ FITTING_TYPES, FITTING_STATUS, calculateFitting });
});
