(() => {
  'use strict';

  const STORAGE_KEY = 'ductItemsV4';
  const LEGACY_STORAGE_KEY = 'ductItemsV3';
  const $ = id => document.getElementById(id);
  const math = window.DuctMath;
  const numberFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const integerFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  let items = [];

  function format(value, integer = false) {
    return (integer ? integerFormat : numberFormat).format(Number(value) || 0);
  }

  function display(value, fallback = '—') {
    return value === null || value === undefined || value === '' ? fallback : String(value);
  }

  function showStatus(message, kind = 'success') {
    const status = $('status');
    status.hidden = !message;
    status.className = `status ${kind}`;
    status.textContent = message || '';
  }

  function readValue(id, label) {
    const element = $(id);
    if (!element || element.value.trim() === '') throw new Error(`${label} مطلوب.`);
    const value = Number(element.value);
    if (!Number.isFinite(value)) throw new Error(`${label} يجب أن يكون رقمًا صالحًا.`);
    return value;
  }

  function optionalValue(id, label) {
    const element = $(id);
    if (!element || element.value.trim() === '') return null;
    const value = Number(element.value);
    if (!Number.isFinite(value)) throw new Error(`${label} يجب أن يكون رقمًا صالحًا.`);
    return value;
  }

  function settingsFromForm() {
    return math.normalizeSettings({
      waste: readValue('waste', 'هالك الدكت'),
      adhRate: readValue('adhRate', 'معدل غراء العزل'),
      tapeRate: readValue('tapeRate', 'معدل شريط العزل'),
      cleatSpacing: optionalValue('cleatSpacing', 'تباعد Cleats'),
      silCoverage: optionalValue('silCoverage', 'تغطية السيليكون'),
      insWaste: readValue('insWaste', 'هالك العزل')
    }, { optionalJointInputs: true });
  }

  function formInput() {
    const materialKey = $('sheetMaterial').value;
    const material = math.SHEET_MATERIALS[materialKey];
    if (!material) throw new Error('اختر مادة صاج صحيحة.');
    const type = $('type').value;
    const jointCountMode = $('jointCountMode').value;
    return {
      type,
      w: type === 'rect' ? readValue('w', 'العرض') : 0,
      h: type === 'rect' ? readValue('h', 'الارتفاع') : 0,
      d: type === 'round' ? readValue('d', 'القطر') : 0,
      l: readValue('l', 'الطول'),
      qty: readValue('qty', 'العدد'),
      th: readValue('th', 'سماكة الصاج'),
      insTh: readValue('insTh', 'سماكة العزل'),
      jointCountMode,
      jointType: $('jointType').value,
      fabricationLengthM: jointCountMode !== 'MANUAL' ? readValue('fabricationLength', 'طول التصنيع') : optionalValue('fabricationLength', 'طول التصنيع'),
      manualJointCount: jointCountMode === 'MANUAL' ? readValue('manualJointCount', 'عدد الوصلات اليدوي') : optionalValue('manualJointCount', 'عدد الوصلات اليدوي'),
      boltSpacing: optionalValue('boltSpacing', 'تباعد البراغي'),
      pressureClass: $('pressureClass').value || null,
      joints: 0,
      sheetMaterial: materialKey,
      sheetDensity: material.density
    };
  }

  function settingsFromLegacy(item) {
    const netArea = Number(item.area) || 0;
    const oldWasteArea = Number(item.waste) || 0;
    const oldInsulation = Number(item.ins) || netArea;
    const roundedRate = value => Number(Number(value).toFixed(6));
    return {
      waste: roundedRate(Number(item.wasteRate) || (netArea > 0 ? oldWasteArea / netArea * 100 : 10)),
      adhRate: Number(item.adhRate) >= 0 ? Number(item.adhRate) : .25,
      tapeRate: Number(item.tapeRate) >= 0 ? Number(item.tapeRate) : .08,
      cleatSpacing: Number(item.cleatSpacing) > 0 ? Number(item.cleatSpacing) : 300,
      silCoverage: Number(item.silCoverage) > 0 ? Number(item.silCoverage) : 10,
      insWaste: roundedRate(Number(item.insulationWasteRate) >= 0 ? Number(item.insulationWasteRate) : (netArea > 0 ? (oldInsulation / netArea - 1) * 100 : 10))
    };
  }

  function migrateItem(item) {
    if (!item || typeof item !== 'object') return null;
    try {
      return math.calculateItem({
        type: item.type,
        w: item.w ?? item.widthMm,
        h: item.h ?? item.heightMm,
        d: item.d ?? item.diameterMm,
        l: item.l ?? item.lengthM,
        qty: item.qty ?? item.quantity,
        th: item.th ?? item.sheetThicknessMm,
        insTh: item.insTh ?? item.insulationThicknessMm ?? 25,
        joints: item.joints ?? 0,
        jointCountMode: item.jointCountMode,
        jointType: item.jointType,
        fabricationLengthM: item.fabricationLengthM ?? item.fabricationLength,
        manualJointCount: item.manualJointCount,
        boltSpacing: item.boltSpacingMm ?? item.boltSpacing,
        boltSize: item.boltSize,
        boltLength: item.boltLengthMm ?? item.boltLength,
        pressureClass: item.pressureClass,
        sheetMaterial: item.sheetMaterial ?? 'galvanized',
        sheetDensity: item.sheetDensity ?? 7850
      }, settingsFromLegacy(item));
    } catch {
      return null;
    }
  }

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      showStatus('تعذر قراءة البيانات المحلية. سيبدأ التطبيق بقائمة فارغة.', 'error');
      return null;
    }
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch { /* Storage may be blocked by browser policy. */ }
  }

  function loadItems() {
    let raw = storageGet(STORAGE_KEY);
    let sourceKey = STORAGE_KEY;
    if (!raw) {
      raw = storageGet(LEGACY_STORAGE_KEY);
      sourceKey = LEGACY_STORAGE_KEY;
    }
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('Stored data is not an array.');
      const migrated = [];
      let invalidCount = 0;
      parsed.forEach(item => {
        const migratedItem = migrateItem(item);
        if (migratedItem) migrated.push(migratedItem);
        else invalidCount += 1;
      });
      if (invalidCount > 0) showStatus(`تم تجاهل ${invalidCount} بند تالف من البيانات المحفوظة.`, 'error');
      if (sourceKey !== STORAGE_KEY) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch { /* Migration remains in memory. */ }
      }
      return migrated;
    } catch {
      storageRemove(STORAGE_KEY);
      if (sourceKey === LEGACY_STORAGE_KEY) storageRemove(LEGACY_STORAGE_KEY);
      showStatus('تم تجاهل بيانات الحفظ التالفة. يمكنك إدخال البنود من جديد.', 'error');
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      return true;
    } catch {
      showStatus('تعذر حفظ البيانات محليًا. تحقق من مساحة التخزين أو إعدادات الخصوصية.', 'error');
      return false;
    }
  }

  function clearForm() {
    ['w', 'h', 'd', 'l', 'fabricationLength', 'manualJointCount', 'boltSpacing'].forEach(id => { $(id).value = ''; });
    $('qty').value = '1';
    $('jointCountMode').value = 'PER_RUN';
    $('jointType').value = '';
    $('pressureClass').value = '';
    updateJointFields();
  }

  function updateTypeFields() {
    const isRound = $('type').value === 'round';
    $('w').disabled = isRound;
    $('h').disabled = isRound;
    $('d').disabled = !isRound;
  }

  function updateJointFields() {
    const manual = $('jointCountMode').value === 'MANUAL';
    $('manualJointCountField').hidden = !manual;
    $('fabricationLengthField').hidden = manual;
    $('fabricationLength').required = !manual;
    $('manualJointCount').required = manual;
  }

  function addItem() {
    try {
      const item = math.calculateItem(formInput(), settingsFromForm());
      const previous = items;
      items = [...items, item];
      if (!save()) { items = previous; return; }
      render();
      clearForm();
      showStatus(`تمت إضافة البند. Joint Count: ${item.joints} (${item.jointCountSource}).`, 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    }
  }

  function removeItem(index) {
    if (!Number.isInteger(index) || index < 0 || index >= items.length) return;
    const previous = items;
    items = items.filter((_, itemIndex) => itemIndex !== index);
    if (!save()) { items = previous; return; }
    render();
    showStatus('تم حذف البند.', 'success');
  }

  function clearAll() {
    if (!items.length) return;
    if (window.confirm('حذف جميع البنود؟')) {
      const previous = items;
      items = [];
      if (!save()) { items = previous; return; }
      render();
      showStatus('تم حذف جميع البنود.', 'success');
    }
  }

  function appendCell(row, value, className = '') {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = String(value);
    row.appendChild(cell);
  }

  function renderRows() {
    const rows = $('rows');
    rows.replaceChildren();
    items.forEach((item, index) => {
      const row = document.createElement('tr');
      const size = item.type === 'rect' ? `${item.widthMm} × ${item.heightMm} mm` : `Ø ${item.diameterMm} mm`;
      [
        index + 1, item.type === 'rect' ? 'مستطيل' : 'دائري', size, format(item.lengthM), item.quantity,
        display(item.sectionCount), item.joints, item.jointBasis || item.jointCountMode, item.jointCountSource, item.jointType,
        format(item.netArea), format(item.ductWasteArea), format(item.procurementDuctArea),
        format(item.netInsulationArea), format(item.insulationWasteArea), format(item.procurementInsulationArea),
        format(item.adhesive), format(item.tape), `${format(item.flange)} (${item.flangeStatus})`, `${format(item.corners, true)} (${item.cornersStatus})`, `${format(item.cleats, true)} (${item.cleatsStatus})`, `${format(item.gasket)} (${item.gasketStatus})`, `${format(item.silicone, true)} (${item.siliconeStatus})`, `${format(item.bolts, true)} (${item.boltsStatus})`, `${format(item.nuts, true)} (${item.nutsStatus})`, `${format(item.washers, true)} (${item.washersStatus})`,
        format(item.netWeight), format(item.procurementWeight)
      ].forEach(value => appendCell(row, value));
      const actionCell = document.createElement('td');
      const formulaButton = document.createElement('button');
      formulaButton.type = 'button'; formulaButton.className = 'secondary compact-button'; formulaButton.textContent = 'المعادلات';
      formulaButton.setAttribute('aria-label', `عرض معادلات البند ${index + 1}`); formulaButton.addEventListener('click', () => showCalculation(index));
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button'; deleteButton.className = 'danger compact-button'; deleteButton.textContent = 'حذف';
      deleteButton.setAttribute('aria-label', `حذف البند ${index + 1}`); deleteButton.addEventListener('click', () => removeItem(index));
      actionCell.append(formulaButton, deleteButton); row.appendChild(actionCell); rows.appendChild(row);
    });
  }

  function renderSummary() {
    const sum = key => items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
    const values = [
      ['البنود', items.length, ''], ['طول الدكت', items.reduce((total, item) => total + item.lengthM * item.quantity, 0), 'm'],
      ['الأقسام', sum('sectionCount'), 'pcs'], ['الوصلات', sum('joints'), 'pcs'],
      ['صافي الدكت', sum('netArea'), 'm²'], ['هالك الدكت', sum('ductWasteArea'), 'm²'], ['توريد الدكت', sum('procurementDuctArea'), 'm²'],
      ['صافي العزل', sum('netInsulationArea'), 'm²'], ['هالك العزل', sum('insulationWasteArea'), 'm²'], ['توريد العزل', sum('procurementInsulationArea'), 'm²'],
      ['حجم العزل', sum('insulationVolume'), 'm³'], ['غراء العزل', sum('adhesive'), 'kg'], ['شريط العزل', sum('tape'), 'm'],
      ['G-Flange', sum('flange'), 'm'], ['Corners', sum('corners'), 'pcs'], ['Cleats', sum('cleats'), 'pcs'], ['Gasket', sum('gasket'), 'm'],
      ['Silicone', sum('silicone'), 'tubes'], ['Bolts', sum('bolts'), 'sets'], ['Nuts', sum('nuts'), 'pcs'], ['Washers', sum('washers'), 'pcs'],
      ['وزن صافي الصاج', sum('netWeight'), 'kg'], ['وزن توريد الصاج', sum('procurementWeight'), 'kg']
    ];
    const summary = $('summary'); summary.replaceChildren();
    values.forEach(([label, value, unit]) => {
      const metric = document.createElement('div'); metric.className = 'metric';
      const small = document.createElement('small'); small.textContent = label;
      const strong = document.createElement('strong'); strong.textContent = `${label === 'البنود' ? format(value, true) : format(value)} ${unit}`.trim();
      metric.append(small, strong); summary.appendChild(metric);
    });
  }

  function formulaRow(label, formula, result, status = '') {
    const wrapper = document.createElement('div'); wrapper.className = 'formula-item';
    const title = document.createElement('strong'); title.textContent = label;
    const expression = document.createElement('code'); expression.textContent = formula;
    const output = document.createElement('span'); output.textContent = `${result}${status ? ` — ${status}` : ''}`;
    wrapper.append(title, expression, output); return wrapper;
  }

  function accessoryFormulaRows(item) {
    const details = item.accessoryDetails || {};
    const labels = { flange: 'G-Flange', corners: 'Flange Corners', cleats: 'Cleats / Clamps', gasket: 'Gasket', silicone: 'Silicone', bolts: 'Bolts', nuts: 'Nuts', washers: 'Washers' };
    return Object.entries(labels).flatMap(([key, label]) => {
      const line = details[key];
      if (!line) return [];
      return [
        formulaRow(`${label} — Net`, line.formula, `${format(line.net, line.unit === 'pcs' || line.unit === 'sets')} ${line.unit}`, line.status),
        formulaRow(`${label} — Waste`, 'Accessory-specific waste allowance', `${format(line.waste, line.unit === 'pcs' || line.unit === 'sets')} ${line.unit}`, line.status),
        formulaRow(`${label} — Procurement`, 'Net + Accessory Waste', `${format(line.procurement, line.unit === 'pcs' || line.unit === 'sets')} ${line.unit}`, line.status),
        formulaRow(`${label} — Inputs / Basis`, line.inputs || '—', line.basis || line.reason || '—', line.status)
      ];
    });
  }

  function renderAccessoryDetails() {
    const rows = $('accessoryRows');
    if (!rows) return;
    rows.replaceChildren();
    const labels = { flange: 'G-Flange', corners: 'Flange Corners', cleats: 'Cleats / Clamps', gasket: 'Gasket', silicone: 'Silicone', bolts: 'Bolts', nuts: 'Nuts', washers: 'Washers' };
    items.forEach((item, index) => {
      Object.entries(labels).forEach(([key, label]) => {
        const line = item.accessoryDetails && item.accessoryDetails[key];
        if (!line) return;
        const row = document.createElement('tr');
        [index + 1, label, format(line.net, line.unit === 'pcs' || line.unit === 'sets'), format(line.waste, line.unit === 'pcs' || line.unit === 'sets'), format(line.procurement, line.unit === 'pcs' || line.unit === 'sets'), line.unit, line.status].forEach(value => appendCell(row, value));
        rows.appendChild(row);
      });
    });
  }

  function showCalculation(index) {
    const item = items[index]; if (!item) return;
    const viewer = $('formulaViewer');
    $('formulaSubtitle').textContent = `البند ${index + 1}: ${item.type === 'rect' ? `${item.widthMm} × ${item.heightMm} mm` : `Ø ${item.diameterMm} mm`} — ${item.jointType} — ${item.jointCountSource}`;
    const content = $('formulaContent'); content.replaceChildren();
    const perimeterFormula = item.type === 'rect' ? `2 × (${item.widthMm} + ${item.heightMm}) ÷ 1000` : `π × ${item.diameterMm} ÷ 1000`;
    const basisRows = [formulaRow('Joint Calculation Basis', item.jointBasis || item.jointCountMode, item.jointBasis || item.jointCountMode, item.jointCountSource)];
    if (item.jointBasis === 'PER_RUN') {
      basisRows.push(
        formulaRow('Total Length', `${item.lengthM} × ${item.quantity}`, `${format(item.totalLengthM)} m`, 'PER-RUN INPUT'),
        formulaRow('Sections Per Run', `ceil(${item.lengthM} ÷ ${display(item.fabricationLengthM)})`, `${display(item.sectionsPerRun)} sections`, 'PER-RUN FABRICATION-SECTION DERIVED'),
        formulaRow('Joints Per Run', `${display(item.sectionsPerRun)} − 1`, `${display(item.jointsPerRun)} joints`, 'PER-RUN FABRICATION-SECTION DERIVED'),
        formulaRow('Total Sections', `${display(item.sectionsPerRun)} × ${item.quantity}`, `${display(item.sectionCount)} sections`, 'PER-RUN FABRICATION-SECTION DERIVED'),
        formulaRow('Total Joints', `${display(item.jointsPerRun)} × ${item.quantity}`, `${item.joints} joints`, item.jointCountSource)
      );
    } else if (item.jointBasis === 'GLOBAL') {
      basisRows.push(
        formulaRow('Total Length', `${item.lengthM} × ${item.quantity}`, `${format(item.totalLengthM)} m`, 'GLOBAL INPUT'),
        formulaRow('Total Sections', `ceil(${format(item.totalLengthM)} ÷ ${display(item.fabricationLengthM)})`, `${display(item.sectionCount)} sections`, 'GLOBAL-FABRICATION-SECTION DERIVED'),
        formulaRow('Total Joints', `${display(item.sectionCount)} − 1`, `${item.joints} joints`, item.jointCountSource)
      );
    } else if (item.jointBasis === 'MANUAL') {
      basisRows.push(
        formulaRow('Manual Joint Count', '[user value]', `${display(item.manualJointCount)}`, 'MANUAL INPUT'),
        formulaRow('Total Joints', '[user value]', `${item.joints} joints`, 'MANUAL')
      );
    } else {
      basisRows.push(formulaRow('Total Joints', 'Legacy stored value', `${item.joints} joints`, item.jointCountSource));
    }
    content.append(
      formulaRow('المحيط', perimeterFormula, `${format(item.perimeterM)} m`, 'CALCULATED'),
      ...basisRows,
      formulaRow('صافي مساحة الدكت', `المحيط × ${item.lengthM} × ${item.quantity}`, `${format(item.netArea)} m²`, 'CALCULATED'),
      formulaRow('هالك الدكت', `صافي الدكت × ${item.wasteRate}%`, `${format(item.ductWasteArea)} m²`, 'ESTIMATING ALLOWANCE'),
      formulaRow('توريد الدكت', 'صافي الدكت + هالك الدكت', `${format(item.procurementDuctArea)} m²`, 'PROCUREMENT'),
      formulaRow('Joint Type', item.jointType, `${item.jointClassification}`, item.jointClassification),
      formulaRow('Pressure Class', 'Pressure-dependent rule input', display(item.pressureClass, 'Not defined'), item.pressureClass ? 'INPUT_PROVIDED' : 'INPUT_REQUIRED'),
      ...accessoryFormulaRows(item),
      formulaRow('حجم العزل', `توريد العزل × ${item.insulationThicknessMm} ÷ 1000`, `${format(item.insulationVolume)} m³`, 'PROCUREMENT'),
      formulaRow('وزن صافي الصاج', `صافي الدكت × ${item.sheetThicknessMm} ÷ 1000 × ${item.sheetDensity}`, `${format(item.netWeight)} kg`, 'CALCULATED'),
      formulaRow('وزن توريد الصاج', `توريد الدكت × ${item.sheetThicknessMm} ÷ 1000 × ${item.sheetDensity}`, `${format(item.procurementWeight)} kg`, 'PROCUREMENT')
    );
    viewer.hidden = false; viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function exportCSV() {
    if (!items.length) { showStatus('أضف بندًا واحدًا على الأقل قبل تصدير CSV.', 'error'); return; }
    const lines = [[
      '#', 'Type', 'Size', 'Length m', 'Qty', 'Fabrication Length m', 'Sections', 'Joints', 'Joint Basis', 'Joint Source', 'Joint Type',
      'Net Duct m2', 'Duct Waste m2', 'Procurement Duct m2', 'Net Insulation m2', 'Insulation Waste m2', 'Procurement Insulation m2',
      'Flange m', 'Flange Status', 'Corners', 'Corners Status', 'Cleats', 'Cleats Status', 'Gasket m', 'Gasket Status', 'Silicone tubes', 'Silicone Status', 'Bolts', 'Bolts Status', 'Nuts', 'Nuts Status', 'Washers', 'Washers Status', 'Net Weight kg', 'Procurement Weight kg', 'Sheet Material', 'Sheet Density kg/m3'
    ]];
    items.forEach((item, index) => lines.push([
      index + 1, item.type === 'rect' ? 'Rectangular' : 'Round', item.type === 'rect' ? `${item.widthMm}x${item.heightMm} mm` : `Ø${item.diameterMm} mm`,
      item.lengthM, item.quantity, item.fabricationLengthM, item.sectionCount, item.joints, item.jointBasis || item.jointCountMode, item.jointCountSource, item.jointType,
      item.netArea, item.ductWasteArea, item.procurementDuctArea, item.netInsulationArea, item.insulationWasteArea, item.procurementInsulationArea,
      item.flange, item.flangeStatus, item.corners, item.cornersStatus, item.cleats, item.cleatsStatus, item.gasket, item.gasketStatus,
      item.silicone, item.siliconeStatus, item.bolts, item.boltsStatus, item.nuts, item.nutsStatus, item.washers, item.washersStatus,
      item.netWeight, item.procurementWeight, item.sheetMaterial, item.sheetDensity
    ]));
    const csv = '\ufeff' + lines.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'duct-quantity-BOQ.csv'; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showStatus('تم إنشاء CSV مع نموذج الوصلات وحالات الملحقات.', 'success');
  }

  function render() { renderRows(); renderSummary(); renderAccessoryDetails(); }

  $('addButton').addEventListener('click', addItem);
  $('clearButton').addEventListener('click', clearForm);
  $('clearAllButton').addEventListener('click', clearAll);
  $('csvButton').addEventListener('click', exportCSV);
  $('printButton').addEventListener('click', () => window.print());
  $('type').addEventListener('change', updateTypeFields);
  $('jointCountMode').addEventListener('change', updateJointFields);
  $('closeFormulaButton').addEventListener('click', () => { $('formulaViewer').hidden = true; });
  $('sheetMaterial').addEventListener('change', () => showStatus('تم تحديث كثافة المادة المستخدمة في حساب الوزن.', 'success'));

  items = loadItems();
  updateTypeFields();
  updateJointFields();
  render();

  window.DuctApp = Object.freeze({ addItem, clearForm, clearAll, exportCSV, render, showCalculation, getItems: () => items.map(item => ({ ...item })) });
})();
