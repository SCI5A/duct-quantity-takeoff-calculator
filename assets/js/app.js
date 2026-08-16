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

  function settingsFromForm() {
    return math.normalizeSettings({
      waste: readValue('waste', 'هالك الدكت'),
      adhRate: readValue('adhRate', 'معدل غراء العزل'),
      tapeRate: readValue('tapeRate', 'معدل شريط العزل'),
      cleatSpacing: readValue('cleatSpacing', 'تباعد Cleats'),
      silCoverage: readValue('silCoverage', 'تغطية السيليكون'),
      insWaste: readValue('insWaste', 'هالك العزل')
    });
  }

  function formInput() {
    const materialKey = $('sheetMaterial').value;
    const material = math.SHEET_MATERIALS[materialKey];
    if (!material) throw new Error('اختر مادة صاج صحيحة.');
    const type = $('type').value;
    return {
      type,
      w: type === 'rect' ? readValue('w', 'العرض') : 0,
      h: type === 'rect' ? readValue('h', 'الارتفاع') : 0,
      d: type === 'round' ? readValue('d', 'القطر') : 0,
      l: readValue('l', 'الطول'),
      qty: readValue('qty', 'العدد'),
      th: readValue('th', 'سماكة الصاج'),
      insTh: readValue('insTh', 'سماكة العزل'),
      joints: readValue('joints', 'عدد الوصلات'),
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
      const migrated = parsed.map(migrateItem).filter(Boolean);
      if (sourceKey !== STORAGE_KEY) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated)); } catch { /* Migration remains in memory. */ }
      }
      return migrated;
    } catch (error) {
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
    ['w', 'h', 'd', 'l'].forEach(id => { $(id).value = ''; });
    $('qty').value = '1';
    $('joints').value = '0';
  }

  function updateTypeFields() {
    const isRound = $('type').value === 'round';
    $('w').disabled = isRound;
    $('h').disabled = isRound;
    $('d').disabled = !isRound;
  }

  function addItem() {
    try {
      const item = math.calculateItem(formInput(), settingsFromForm());
      const previous = items;
      items = [...items, item];
      if (!save()) {
        items = previous;
        return;
      }
      render();
      clearForm();
      showStatus('تمت إضافة البند وحساب صافي الكمية والهالك وكمية التوريد.', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    }
  }

  function removeItem(index) {
    if (!Number.isInteger(index) || index < 0 || index >= items.length) return;
    const previous = items;
    items = items.filter((_, itemIndex) => itemIndex !== index);
    if (!save()) {
      items = previous;
      return;
    }
    render();
    showStatus('تم حذف البند.', 'success');
  }

  function clearAll() {
    if (!items.length) return;
    if (window.confirm('حذف جميع البنود؟')) {
      const previous = items;
      items = [];
      if (!save()) {
        items = previous;
        return;
      }
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
        format(item.netArea), format(item.ductWasteArea), format(item.procurementDuctArea),
        format(item.netInsulationArea), format(item.insulationWasteArea), format(item.procurementInsulationArea),
        format(item.adhesive), format(item.tape), format(item.flange), format(item.corners, true), format(item.cleats, true),
        format(item.gasket), format(item.silicone, true), format(item.bolts, true), format(item.netWeight), format(item.procurementWeight)
      ].forEach(value => appendCell(row, value));

      const actionCell = document.createElement('td');
      const formulaButton = document.createElement('button');
      formulaButton.type = 'button';
      formulaButton.className = 'secondary compact-button';
      formulaButton.textContent = 'المعادلات';
      formulaButton.setAttribute('aria-label', `عرض معادلات البند ${index + 1}`);
      formulaButton.addEventListener('click', () => showCalculation(index));
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'danger compact-button';
      deleteButton.textContent = 'حذف';
      deleteButton.setAttribute('aria-label', `حذف البند ${index + 1}`);
      deleteButton.addEventListener('click', () => removeItem(index));
      actionCell.append(formulaButton, deleteButton);
      row.appendChild(actionCell);
      rows.appendChild(row);
    });
  }

  function renderSummary() {
    const sum = key => items.reduce((total, item) => total + (Number(item[key]) || 0), 0);
    const values = [
      ['البنود', items.length, ''],
      ['طول الدكت', items.reduce((total, item) => total + item.lengthM * item.quantity, 0), 'm'],
      ['صافي الدكت', sum('netArea'), 'm²'],
      ['هالك الدكت', sum('ductWasteArea'), 'm²'],
      ['توريد الدكت', sum('procurementDuctArea'), 'm²'],
      ['صافي العزل', sum('netInsulationArea'), 'm²'],
      ['هالك العزل', sum('insulationWasteArea'), 'm²'],
      ['توريد العزل', sum('procurementInsulationArea'), 'm²'],
      ['حجم العزل', sum('insulationVolume'), 'm³'],
      ['غراء العزل', sum('adhesive'), 'kg'],
      ['شريط العزل', sum('tape'), 'm'],
      ['G-Flange', sum('flange'), 'm'],
      ['Corners', sum('corners'), 'pcs'],
      ['Cleats', sum('cleats'), 'pcs'],
      ['Gasket', sum('gasket'), 'm'],
      ['Silicone', sum('silicone'), 'tubes'],
      ['Bolts/Nuts', sum('bolts'), 'sets'],
      ['وزن صافي الصاج', sum('netWeight'), 'kg'],
      ['وزن توريد الصاج', sum('procurementWeight'), 'kg']
    ];
    const summary = $('summary');
    summary.replaceChildren();
    values.forEach(([label, value, unit]) => {
      const metric = document.createElement('div');
      metric.className = 'metric';
      const small = document.createElement('small');
      small.textContent = label;
      const strong = document.createElement('strong');
      strong.textContent = `${label === 'البنود' ? format(value, true) : format(value)} ${unit}`.trim();
      metric.append(small, strong);
      summary.appendChild(metric);
    });
  }

  function formulaRow(label, formula, result) {
    const wrapper = document.createElement('div');
    wrapper.className = 'formula-item';
    const title = document.createElement('strong');
    title.textContent = label;
    const expression = document.createElement('code');
    expression.textContent = formula;
    const output = document.createElement('span');
    output.textContent = result;
    wrapper.append(title, expression, output);
    return wrapper;
  }

  function showCalculation(index) {
    const item = items[index];
    if (!item) return;
    const viewer = $('formulaViewer');
    $('formulaSubtitle').textContent = `البند ${index + 1}: ${item.type === 'rect' ? `${item.widthMm} × ${item.heightMm} mm` : `Ø ${item.diameterMm} mm`} — المادة: ${math.SHEET_MATERIALS[item.sheetMaterial]?.label || 'Sheet steel'}`;
    const content = $('formulaContent');
    content.replaceChildren();
    const perimeterFormula = item.type === 'rect'
      ? `2 × (${item.widthMm} + ${item.heightMm}) ÷ 1000`
      : `π × ${item.diameterMm} ÷ 1000`;
    content.append(
      formulaRow('المحيط', perimeterFormula, `${format(item.perimeterM)} m`),
      formulaRow('صافي مساحة الدكت', `المحيط × ${item.lengthM} × ${item.quantity}`, `${format(item.netArea)} m²`),
      formulaRow('هالك الدكت', `صافي الدكت × ${item.wasteRate}%`, `${format(item.ductWasteArea)} m²`),
      formulaRow('كمية توريد الدكت', `صافي الدكت + هالك الدكت`, `${format(item.procurementDuctArea)} m²`),
      formulaRow('هالك العزل', `صافي العزل × ${item.insulationWasteRate}%`, `${format(item.insulationWasteArea)} m²`),
      formulaRow('حجم العزل', `توريد العزل × ${item.insulationThicknessMm} ÷ 1000`, `${format(item.insulationVolume)} m³`),
      formulaRow('وزن صافي الصاج', `صافي الدكت × ${item.sheetThicknessMm} ÷ 1000 × ${item.sheetDensity}`, `${format(item.netWeight)} kg`),
      formulaRow('وزن توريد الصاج', `توريد الدكت × ${item.sheetThicknessMm} ÷ 1000 × ${item.sheetDensity}`, `${format(item.procurementWeight)} kg`),
      formulaRow('الملحقات', `الوصلات = ${item.joints} · تباعد Cleats = ${item.cleatSpacing} mm`, `Flange ${format(item.flange)} m · Cleats ${format(item.cleats, true)} · Bolts ${format(item.bolts, true)}`)
    );
    viewer.hidden = false;
    viewer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function exportCSV() {
    if (!items.length) {
      showStatus('أضف بندًا واحدًا على الأقل قبل تصدير CSV.', 'error');
      return;
    }
    const lines = [[
      '#', 'Type', 'Size', 'Length m', 'Qty', 'Net Duct m2', 'Duct Waste m2', 'Procurement Duct m2',
      'Net Insulation m2', 'Insulation Waste m2', 'Procurement Insulation m2', 'Insulation Volume m3',
      'Adhesive kg', 'Tape m', 'G-Flange m', 'Corners', 'Cleats', 'Gasket m', 'Silicone tubes', 'Bolts',
      'Net Weight kg', 'Procurement Weight kg', 'Sheet Material', 'Sheet Density kg/m3'
    ]];
    items.forEach((item, index) => lines.push([
      index + 1,
      item.type === 'rect' ? 'Rectangular' : 'Round',
      item.type === 'rect' ? `${item.widthMm}x${item.heightMm} mm` : `Ø${item.diameterMm} mm`,
      item.lengthM, item.quantity, item.netArea, item.ductWasteArea, item.procurementDuctArea,
      item.netInsulationArea, item.insulationWasteArea, item.procurementInsulationArea, item.insulationVolume,
      item.adhesive, item.tape, item.flange, item.corners, item.cleats, item.gasket, item.silicone, item.bolts,
      item.netWeight, item.procurementWeight, item.sheetMaterial, item.sheetDensity
    ]));
    const csv = '\ufeff' + lines.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'duct-quantity-BOQ.csv';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showStatus('تم إنشاء ملف CSV مفصل يفصل الصافي والهالك وكميات التوريد.', 'success');
  }

  function render() {
    renderRows();
    renderSummary();
  }

  $('addButton').addEventListener('click', addItem);
  $('clearButton').addEventListener('click', clearForm);
  $('clearAllButton').addEventListener('click', clearAll);
  $('csvButton').addEventListener('click', exportCSV);
  $('printButton').addEventListener('click', () => window.print());
  $('type').addEventListener('change', updateTypeFields);
  $('closeFormulaButton').addEventListener('click', () => { $('formulaViewer').hidden = true; });
  $('sheetMaterial').addEventListener('change', () => showStatus('تم تحديث كثافة المادة المستخدمة في حساب الوزن.', 'success'));

  items = loadItems();
  updateTypeFields();
  render();

  window.DuctApp = Object.freeze({ addItem, clearForm, clearAll, exportCSV, render, showCalculation, getItems: () => items.map(item => ({ ...item })) });
})();
