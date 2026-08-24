#!/usr/bin/env node
/*
 * Reachability spec — does everything shipped in the code actually reach the user?
 * Direction: code -> user. Catches shipped-but-unreachable surface (the inverse of coverage.js).
 *
 * Static analysis of the single built file character-tracker.html (which contains the HTML, CSS,
 * JS, wizard, and LITM_DATA), plus sw.js / manifest.json for shipped-file references.
 * Dependency-free (Node built-ins only). Exits non-zero on findings and NAMES the offenders.
 *
 * NOT a retry target: findings are deterministic. Run -> read names -> fix -> re-run.
 * Usage: node scripts/reachability.js
 *
 * False-positive traps handled (see inline): runtime-assigned ids, concatenated names,
 * ids created inside innerHTML template strings, method-call tokens (.click/.getElementById).
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP = path.join(ROOT, 'character-tracker.html');
const SW = path.join(ROOT, 'sw.js');
const MAN = path.join(ROOT, 'manifest.json');

const src = fs.readFileSync(APP, 'utf8');

// Tokens that look like calls but are JS/DOM built-ins or method names, not app functions.
const BUILTINS = new Set([
  'if','for','while','switch','return','function','typeof','new','delete','void','in','of','do',
  'parseInt','parseFloat','Number','String','Array','Object','Math','JSON','Boolean','Date','RegExp',
  'Set','Map','Promise','isNaN','isFinite','encodeURIComponent','decodeURIComponent','escape','unescape',
  'setTimeout','setInterval','clearTimeout','clearInterval','requestAnimationFrame','alert','confirm','prompt',
  'console','event','this','super','await','async','catch','throw','try','finally',
  // common method names that appear as `.name(` — not global functions
  'click','getElementById','querySelector','querySelectorAll','addEventListener','removeEventListener',
  'push','pop','shift','unshift','slice','splice','map','filter','forEach','find','findIndex','some','every',
  'join','split','indexOf','lastIndexOf','includes','replace','trim','toLowerCase','toUpperCase','charAt',
  'toggle','add','remove','contains','appendChild','setAttribute','getAttribute','stopPropagation',
  'preventDefault','focus','blur','reload','postMessage','vibrate','matchMedia','getItem','setItem'
]);

// Deliberate exemptions, each WITH A REASON so a later reader can tell an accepted case from a regression.
const EXEMPT = {
  orphanFunctions: {},        // e.g. 'foo': 'reason' — none currently
  inertControls: {},
  brokenIdRefs: {},
  brokenNav: {},
  missingFiles: {},
  overlays: {}
};

function occurrences(word) {
  const re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
  const m = src.match(re);
  return m ? m.length : 0;
}

// ---- defined-name universe (for inert-control resolution) ----
const defined = new Set();
for (const m of src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
for (const m of src.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);
for (const m of src.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);

// ---- id universe (static ids + ids emitted inside JS/innerHTML strings + runtime-assigned) ----
const definedIds = new Set();
for (const m of src.matchAll(/\bid=["']([A-Za-z_][\w-]*)["']/g)) definedIds.add(m[1]);           // static + templated id="x"
for (const m of src.matchAll(/\.id\s*=\s*["']([A-Za-z_][\w-]*)["']/g)) definedIds.add(m[1]);      // el.id = 'x'
for (const m of src.matchAll(/setAttribute\(\s*["']id["']\s*,\s*["']([A-Za-z_][\w-]*)["']\s*\)/g)) definedIds.add(m[1]);

// ---- tab/panel universe (for nav targets) ----
const tabs = new Set();
for (const m of src.matchAll(/\bdata-tab=["']([A-Za-z_-]+)["']/g)) tabs.add(m[1]);
for (const m of src.matchAll(/\bid=["']panel-([A-Za-z_-]+)["']/g)) tabs.add(m[1]);

// ================= CLASS 1: orphan functions =================
function orphanFunctions() {
  const offenders = [];
  const names = new Set();
  for (const m of src.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.add(m[1]);
  for (const n of names) {
    if (EXEMPT.orphanFunctions[n]) continue;
    if (occurrences(n) === 1) offenders.push(n);   // appears only at its own declaration
  }
  return offenders;
  // Trap noted: a purely-recursive function references itself in its body, so it would count >1
  // and never be flagged even if externally unreachable. Accepted gap (rare); documented in CLAUDE.md.
}

// ================= CLASS 2: inert controls (handler -> undefined fn) =================
function inertControls() {
  const offenders = [];
  for (const m of src.matchAll(/\bon(?:click|change|input|submit|keydown|keyup)\s*=\s*("|')(.*?)\1/gs)) {
    const body = m[2];
    for (const c of body.matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) {
      const name = c[1];
      if (BUILTINS.has(name) || defined.has(name)) continue;
      if (EXEMPT.inertControls[name]) continue;
      offenders.push(name + '  (in handler: ' + body.slice(0, 48).replace(/\s+/g, ' ') + '…)');
    }
  }
  return [...new Set(offenders)];
}

// ================= CLASS 3: broken element-id references =================
function brokenIdRefs() {
  const offenders = new Set();
  // $('literal') and getElementById('literal') — literal args only (concatenated ids are skipped on purpose)
  for (const m of src.matchAll(/\$\(\s*(["'])([A-Za-z_][\w-]*)\1\s*\)/g)) {
    const id = m[2]; if (!definedIds.has(id) && !EXEMPT.brokenIdRefs[id]) offenders.add(id);
  }
  for (const m of src.matchAll(/getElementById\(\s*(["'])([A-Za-z_][\w-]*)\1\s*\)/g)) {
    const id = m[2]; if (!definedIds.has(id) && !EXEMPT.brokenIdRefs[id]) offenders.add(id);
  }
  return [...offenders];
}

// ================= CLASS 4: broken navigation targets =================
function brokenNav() {
  const offenders = new Set();
  for (const m of src.matchAll(/showTab\(\s*(["'])([A-Za-z_-]+)\1\s*\)/g)) {
    const t = m[2]; if (!tabs.has(t) && !EXEMPT.brokenNav[t]) offenders.add('showTab(' + t + ')');
  }
  return [...offenders];
}

// ================= CLASS 5: missing shipped files =================
function missingFiles() {
  const offenders = [];
  const refs = new Set();
  if (fs.existsSync(SW)) for (const m of fs.readFileSync(SW, 'utf8').matchAll(/'\.\/([^']+)'/g)) refs.add(m[1]);
  if (fs.existsSync(MAN)) for (const m of fs.readFileSync(MAN, 'utf8').matchAll(/"src"\s*:\s*"([^"]+)"/g)) refs.add(m[1]);
  for (const m of src.matchAll(/<(?:script|link)[^>]*(?:src|href)=["']([^"']+)["']/g)) {
    const u = m[1];
    if (/^(data:|https?:|#|mailto:)/.test(u)) continue;   // external / inline / anchor — not a local file
    refs.add(u.replace(/^\.\//, ''));
  }
  for (const r of refs) {
    if (EXEMPT.missingFiles[r]) continue;
    if (!fs.existsSync(path.join(ROOT, r))) offenders.push(r);
  }
  return offenders;
}

// ================= CLASS 6: unopenable / unclosable overlays =================
function overlays() {
  const offenders = [];
  const ids = new Set();
  for (const m of src.matchAll(/\bid=["']([A-Za-z]+Overlay)["']/g)) ids.add(m[1]);
  // Overlays created at runtime set their id via `el.id = 'x'` and then show/hide through that local
  // variable (`ov.classList.add('show')`), which a per-id literal search cannot bind — the documented
  // "variable-reference, not literal" trap. Treat a runtime-created overlay as self-managed.
  for (const id of ids) {
    if (EXEMPT.overlays[id]) continue;
    if (definedIds.has(id) && src.match(new RegExp('\\.id\\s*=\\s*["\']' + id + '["\']'))) continue; // runtime-created & self-managed
    const opens = src.includes(id + "').classList.add('show')") || src.includes(id + '").classList.add("show")');
    const closes = src.includes(id + "').classList.remove('show')") || src.includes(id + '").classList.remove("show")');
    if (!opens || !closes) offenders.push(id + (opens ? '' : ' [no opener]') + (closes ? '' : ' [no closer]'));
  }
  return offenders;
  // Note: this proves a programmatic show AND hide path exist for statically-declared overlays.
  // It does not prove a *visible* exit control is rendered — that needs DOM rendering, out of scope.
}

// ---- run all ----
const checks = [
  ['1. Orphan functions (declared, referenced nowhere)', orphanFunctions()],
  ['2. Inert controls (handler wired to an undefined name)', inertControls()],
  ['3. Broken element-id references ($()/getElementById to a nonexistent id)', brokenIdRefs()],
  ['4. Broken navigation targets (showTab to a nonexistent panel)', brokenNav()],
  ['5. Missing shipped files (precache/manifest/link refs not on disk)', missingFiles()],
  ['6. Unopenable/unclosable overlays', overlays()],
];

let failed = 0;
console.log('Reachability audit — character-tracker.html\n');
for (const [label, offenders] of checks) {
  if (offenders.length) {
    failed += offenders.length;
    console.log('FAIL  ' + label + '  (' + offenders.length + ')');
    for (const o of offenders) console.log('        - ' + o);
  } else {
    console.log('ok    ' + label);
  }
}

if (failed) { console.error('\n' + failed + ' reachability finding(s). Fix, or add a documented EXEMPT entry with a reason.'); process.exit(1); }
console.log('\nPASS — no reachability defects.');
process.exit(0);
