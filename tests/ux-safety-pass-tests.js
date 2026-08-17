'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const html = read('index.html');
const css = read('assets/css/style.css');
const app = read('assets/js/app.js');
const { calculateItem } = require('../assets/js/calculations.js');
const { calculateFitting } = require('../assets/js/fittings.js');

// UX hooks exist and remain presentation-layer concerns.
for (const id of ['settingsSection', 'ductSection', 'fittingSection', 'summarySection', 'boqSection', 'formulaViewer', 'reviewDialog', 'executiveStatusPanel', 'boqSearch', 'boqStatus', 'clearBoqFilters']) assert.match(html, new RegExp(`id="${id}"`), `${id} hook`);
for (const token of ['section-nav', 'review-dialog', 'executive-status-panel', 'boq-filters', '@media print', 'print-report-header']) assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${token} CSS`);
for (const token of ['openReview', 'confirmReview', 'itemMatchesFilters', 'renderExecutiveStatus']) assert.match(app, new RegExp(token), `${token} UI hook`);
assert.match(html, /aria-describedby/, 'aria-describedby attributes');
for (const id of ['fabricationLength', 'manualJointCount', 'boltSpacing', 'pressureClass', 'jointCountMode', 'jointType']) assert.match(html, new RegExp(`id="${id}"[^>]*(aria-describedby|class="conditional-field")`), `${id} guidance`);
for (const status of ['CALCULATED', 'ESTIMATED', 'INPUT_REQUIRED', 'UNVERIFIED', 'LEGACY_ESTIMATE']) assert.match(app, new RegExp(status), `${status} presentation status`);

// Fixed engineering regression snapshots: UX changes must not alter calculation outputs.
const settings = { waste: 10, adhRate: 0.25, tapeRate: 0.08, cleatSpacing: 150, silCoverage: 10, insWaste: 10 };
const duct = calculateItem({ type: 'rect', w: 800, h: 500, d: 0, l: 10, qty: 5, th: 0.8, insTh: 25, jointCountMode: 'PER_RUN', jointType: 'TDF', fabricationLengthM: 2.5, manualJointCount: null, boltSpacing: 150, pressureClass: 'medium', joints: 0, sheetMaterial: 'galvanized', sheetDensity: 7850 }, settings);
assert.equal(duct.netArea, 130);
assert.equal(duct.ductWasteArea, 13);
assert.equal(duct.procurementDuctArea, 143);
assert.equal(duct.sectionCount, 20);
assert.equal(duct.joints, 15);
assert.equal(duct.netWeight, 816.4000000000001);
const elbow = calculateFitting({ fittingType: 'ELBOW', ductType: 'RECTANGULAR', widthMm: 800, heightMm: 500, lengthM: 10, quantity: 5, sheetThicknessMm: 0.8, radiusMm: 500, angleDeg: 90, fabricationAreaM2: null, fittingWasteRate: 10, jointBasis: 'PER_RUN', jointType: 'TDF', fabricationLengthM: 2.5, pressureClass: 'medium', sheetMaterial: 'galvanized', sheetDensity: 7850 });
assert.ok(Math.abs(elbow.netArea - 10.21017612416683) < 1e-9);
assert.equal(elbow.joints, 15);
assert.equal(elbow.status, 'ESTIMATED');
console.log('UX Safety Pass tests passed: navigation, review, guidance, status presentation, filters, accessibility hooks, print hooks, and engineering regression snapshots.');
