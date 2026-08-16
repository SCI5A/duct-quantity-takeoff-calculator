#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const required = [
  'index.html',
  'assets/css/style.css',
  'assets/js/app.js',
  'assets/js/calculations.js',
  'presentation/index.html',
  'presentation/presentation.css',
  'presentation/presentation.js',
  'presentation/slides/manifest.json',
  '.github/workflows/deploy-pages.yml',
  'tests/engineering-tests.js',
  'tests/sprint-1-1-engineering-tests.js',
  'tests/sprint-2-joint-tests.js',
  'tests/sprint-3-accessories-tests.js',
  'docs/calculation-methods.md'
];
required.forEach(rel => assert.ok(exists(rel), `Missing required file: ${rel}`));

const index = read('index.html');
const presentationIndex = read('presentation/index.html');
const app = read('assets/js/app.js');
const calculations = read('assets/js/calculations.js');
const presentation = read('presentation/presentation.js');
const workflow = read('.github/workflows/deploy-pages.yml');
const manifest = JSON.parse(read('presentation/slides/manifest.json'));

assert.ok(Array.isArray(manifest.slides) && manifest.slides.length > 0, 'Manifest must contain slides.');
manifest.slides.forEach(file => {
  assert.match(file, /^[a-zA-Z0-9_-]+\.(?:webp|png|jpe?g)$/i, `Invalid slide filename: ${file}`);
  assert.ok(exists(path.join('presentation/slides', file)), `Missing slide asset: ${file}`);
});

const labelIds = [...index.matchAll(/<label\s+for="([^"]+)"/g)].map(match => match[1]);
labelIds.forEach(id => assert.match(index, new RegExp(`<input[^>]+id="${id}"|<select[^>]+id="${id}"`), `Label is not bound: ${id}`));
assert.doesNotMatch(index, /onclick\s*=/i, 'Inline onclick handlers are not allowed.');
assert.match(index, /assets\/js\/calculations\.js/);
assert.match(index, /assets\/js\/app\.js/);
assert.match(index, /PER_RUN/);
assert.match(index, /GLOBAL/);
assert.match(index, /MANUAL/);
assert.match(app, /try\s*\{[\s\S]*JSON\.parse/);
assert.match(app, /URL\.revokeObjectURL/);
assert.match(app, /localStorage\.setItem\(STORAGE_KEY/);
assert.match(app, /procurementDuctArea/);
assert.match(app, /procurementWeight/);
assert.match(app, /Sections Per Run/);
assert.match(app, /Joints Per Run/);
assert.match(app, /Manual Joint Count/);
assert.match(app, /invalidCount/);
assert.match(app, /بند تالف/);
assert.match(calculations, /sheetDensity/);
assert.match(calculations, /insulationThicknessMm/);
assert.match(calculations, /calculateSectionCount/);
assert.match(calculations, /jointCountMode/);
assert.match(calculations, /jointBasis/);
assert.match(calculations, /sectionsPerRun/);
assert.match(calculations, /GLOBAL-FABRICATION-SECTION DERIVED/);
assert.match(calculations, /FABRICATION-SECTION DERIVED/);
assert.match(calculations, /INPUT_REQUIRED/);
assert.match(calculations, /accessoryLine/);
assert.match(calculations, /accessoryNet/);
assert.match(calculations, /accessoryWaste/);
assert.match(calculations, /accessoryProcurement/);
assert.match(calculations, /washers/);
assert.match(presentationIndex, /role="progressbar"/);
assert.match(presentation, /manifest\.json/);
assert.doesNotMatch(presentation, /TOTAL_SLIDES/);
assert.match(presentation, /event\.activeElement|active\.tagName/);
assert.match(presentation, /preload\(currentSlide - 1\)/);
assert.match(presentation, /touches\.length/);
assert.match(presentation, /catch/);
assert.match(workflow, /needs:\s*quality/);
assert.match(workflow, /engineering-tests\.js/);
assert.match(workflow, /sprint-1-1-engineering-tests\.js/);
assert.match(workflow, /sprint-2-joint-tests\.js/);
assert.match(workflow, /sprint-3-accessories-tests\.js/);
assert.match(workflow, /quality-gates\.js/);

console.log(`Quality gates passed: ${required.length} required files, ${manifest.slides.length} manifest slides, labels, paths, accessibility, tests, and workflow checks.`);
