#!/usr/bin/env node
/*
 * Coverage spec — does the app implement its source document?
 * Direction: source document -> code. Catches a documented feature that was never implemented,
 * and (via markers) a previously-implemented feature that lost its implementation.
 *
 * This proves a MAPPING exists, not that behaviour is correct. See docs/coverage.json _meta.caveats.
 * Omission detection is only as complete as docs/coverage.json — which is currently SEEDED from
 * CLAUDE.md, not verified against the Core Rulebook (meta.omissionDetectionActive === false).
 *
 * Exits non-zero on any failure. Dependency-free (Node built-ins only).
 * Usage: node scripts/coverage.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const COV = path.join(ROOT, 'docs', 'coverage.json');
const APP = path.join(ROOT, 'character-tracker.html');

const STATUSES = ['implemented', 'partial', 'deliberately-omitted', 'unknown'];
const fail = [];

if (!fs.existsSync(COV)) { console.error('FAIL: docs/coverage.json not found'); process.exit(1); }
if (!fs.existsSync(APP)) { console.error('FAIL: character-tracker.html not found'); process.exit(1); }

let data;
try { data = JSON.parse(fs.readFileSync(COV, 'utf8')); }
catch (e) { console.error('FAIL: coverage.json is not valid JSON: ' + e.message); process.exit(1); }

const app = fs.readFileSync(APP, 'utf8');
const meta = data._meta || {};
const entries = Array.isArray(data.entries) ? data.entries : null;

if (!entries) { console.error('FAIL: coverage.json has no "entries" array'); process.exit(1); }

// --- meta requirements ---
if (!meta.sourceDocument) fail.push('meta: missing "sourceDocument"');
if (!meta.sourceEdition) fail.push('meta: missing "sourceEdition" (a coverage number against an unspecified version is meaningless)');
if (typeof meta.omissionDetectionActive !== 'boolean') fail.push('meta: missing boolean "omissionDetectionActive"');

// --- per-entry checks ---
const seen = new Set();
const counts = { implemented: 0, partial: 0, 'deliberately-omitted': 0, unknown: 0 };

for (const e of entries) {
  const id = e && e.id ? e.id : '(no id)';
  if (!e || !e.id) { fail.push('entry with no id: ' + JSON.stringify(e)); continue; }
  if (seen.has(e.id)) fail.push(`[${id}] duplicate id`);
  seen.add(e.id);

  if (!STATUSES.includes(e.status)) { fail.push(`[${id}] invalid status "${e.status}"`); continue; }
  counts[e.status]++;

  if (!e.source) fail.push(`[${id}] missing "source" citation`);
  if (!e.summary) fail.push(`[${id}] missing "summary"`);

  // note required for anything not implemented
  if (e.status !== 'implemented' && !e.note) fail.push(`[${id}] status "${e.status}" requires a "note" (what is missing / why)`);

  // marker rules
  if (e.status === 'deliberately-omitted') {
    if (e.marker != null && e.marker !== '') fail.push(`[${id}] deliberately-omitted must have marker null (nothing implements it)`);
  } else {
    if (!e.marker) { fail.push(`[${id}] missing "marker" (the code artefact that would vanish if the feature were removed)`); continue; }
    // marker must exist in the built app — this is the regression detector
    if (app.indexOf(e.marker) === -1) fail.push(`[${id}] marker not found in character-tracker.html: ${JSON.stringify(e.marker)}  (feature "${e.summary}" — implementation missing or renamed?)`);
  }
}

// --- report ---
const total = entries.length;
console.log('Coverage of: ' + (meta.sourceDocument || '(unspecified)'));
console.log('Edition:     ' + (meta.sourceEdition || '(unspecified)'));
console.log('Entries:     ' + total);
console.log('  implemented          ' + counts.implemented);
console.log('  partial              ' + counts.partial);
console.log('  deliberately-omitted ' + counts['deliberately-omitted']);
console.log('  unknown              ' + counts.unknown);
if (meta.omissionDetectionActive === false) {
  console.log('\n  NOTE: omissionDetectionActive=false — this list is SEEDED from project docs, not verified');
  console.log('  against the source document. A rulebook feature never documented here is NOT detected.');
}

if (fail.length) {
  console.error('\nFAIL (' + fail.length + '):');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log('\nPASS — every entry is well-formed and every implemented/partial/unknown marker exists.');
process.exit(0);
