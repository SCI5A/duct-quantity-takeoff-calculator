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

  function finite(value, label) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      throw new Error(`${label} is required.`);
    }
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`${label} must be a finite number.`);
    return number;
  }

  function nonNegative(value, label, allowZero = true) {
    const number = finite(value, label);
    if (number < 0 || (!allowZero && number === 0)) throw new Error(`${label} must be ${allowZero ? 'non-negative' : 'greater than zero'}.`);
    return number;
  }

  function positive(value, label) {
    return nonNegative(value, label, false);
  }

  function integerAtLeast(value, label, minimum) {
    const number = finite(value, label);
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
    const joints = integerAtLeast(input.joints, 'Joints', 0);
    const sheetMaterial = Object.prototype.hasOwnProperty.call(SHEET_MATERIALS, input.sheetMaterial) ? input.sheetMaterial : 'galvanized';
    const density = positive(input.sheetDensity, 'Sheet density');
    const widthMm = type === 'rect' ? positive(input.w, 'Width') : 0;
    const heightMm = type === 'rect' ? positive(input.h, 'Height') : 0;
    const diameterMm = type === 'round' ? positive(input.d, 'Diameter') : 0;
    return {
      type,
      widthMm,
      heightMm,
      diameterMm,
      lengthM,
      quantity,
      sheetThicknessMm,
      insulationThicknessMm,
      joints,
      sheetMaterial,
      sheetDensity: density,
      widthM: widthMm * UNIT_FACTORS.mmToM,
      heightM: heightMm * UNIT_FACTORS.mmToM,
      diameterM: diameterMm * UNIT_FACTORS.mmToM
    };
  }

  function normalizeSettings(settings) {
    return {
      waste: nonNegative(settings.waste, 'Duct waste'),
      adhRate: nonNegative(settings.adhRate, 'Adhesive rate'),
      tapeRate: nonNegative(settings.tapeRate, 'Tape rate'),
      cleatSpacing: positive(settings.cleatSpacing, 'Cleat spacing'),
      silCoverage: positive(settings.silCoverage, 'Silicone coverage'),
      insWaste: nonNegative(settings.insWaste, 'Insulation waste')
    };
  }

  function calculateItem(input, settings) {
    const dimensions = normalizeDimensions(input);
    const rates = normalizeSettings(settings);
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
    const effectiveJoints = dimensions.joints > 0 ? dimensions.joints : Math.max(0, dimensions.quantity - 1);
    const jointPerimeterM = perimeterM * effectiveJoints * 2;
    const flange = jointPerimeterM;
    const corners = dimensions.type === 'rect' ? 8 * effectiveJoints : 0;
    const cleats = rates.cleatSpacing > 0 ? Math.ceil(jointPerimeterM / (rates.cleatSpacing * UNIT_FACTORS.mmToM)) : 0;
    const gasket = jointPerimeterM;
    const silicone = Math.ceil(jointPerimeterM / rates.silCoverage);
    const bolts = cleats;
    const netWeight = netArea * (dimensions.sheetThicknessMm * UNIT_FACTORS.mmToM) * dimensions.sheetDensity;
    const wasteWeight = ductWasteArea * (dimensions.sheetThicknessMm * UNIT_FACTORS.mmToM) * dimensions.sheetDensity;
    const procurementWeight = procurementDuctArea * (dimensions.sheetThicknessMm * UNIT_FACTORS.mmToM) * dimensions.sheetDensity;
    const adhesive = procurementInsulationArea * rates.adhRate;
    const tape = procurementInsulationArea * rates.tapeRate;

    return {
      ...dimensions,
      ...rates,
      wasteRate: rates.waste,
      insulationWasteRate: rates.insWaste,
      perimeterM,
      netArea,
      ductWasteArea,
      procurementDuctArea,
      netInsulationArea,
      insulationWasteArea,
      procurementInsulationArea,
      insulationVolume,
      joints: effectiveJoints,
      flange,
      corners,
      cleats,
      gasket,
      silicone,
      bolts,
      netWeight,
      wasteWeight,
      procurementWeight,
      weight: procurementWeight,
      adhesive,
      tape,
      // Legacy aliases retained for existing saved BOQ compatibility.
      area: netArea,
      waste: ductWasteArea,
      total: procurementDuctArea,
      ins: procurementInsulationArea
    };
  }

  return Object.freeze({ UNIT_FACTORS, SHEET_MATERIALS, normalizeDimensions, normalizeSettings, calculateItem });
});
