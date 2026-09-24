#!/usr/bin/env node
/* Goldener Test: schickt eine Beispieldatei durch alle Generatoren und vergleicht
   die Ausgaben mit abgelegten Prüfsummen. Findet Änderungen an gemeinsam genutztem
   Code, die unbemerkt andere Overlays verschieben.

   Aufruf:  node tools/golden-test.mjs          prüfen
            node tools/golden-test.mjs --write  Prüfsummen neu aufnehmen           */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.dirname(HIER);
const GOLD = path.join(HIER, 'golden.json');
const schreiben = process.argv.includes('--write');

/* ---------- Vorgabewerte aus index.html lesen, damit der Test die echten nutzt ---------- */
const html = fs.readFileSync(path.join(WURZEL, 'index.html'), 'utf8');
const vorgaben = {};
for (const m of html.matchAll(/<input[^>]*\bid="([^"]+)"[^>]*>/g)) {
  const tag = m[0], id = m[1];
  const v = /\bvalue="([^"]*)"/.exec(tag);
  vorgaben[id] = v ? v[1] : (/\bchecked\b/.test(tag) ? 'on' : '');
  if (/type="checkbox"/.test(tag)) vorgaben['__checked__' + id] = /\bchecked\b/.test(tag);
}
for (const m of html.matchAll(/<select[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
  const id = m[1], inhalt = m[2];
  const sel = /<option[^>]*\bvalue="([^"]*)"[^>]*\bselected\b/.exec(inhalt)
           || /<option[^>]*\bvalue="([^"]*)"/.exec(inhalt);
  vorgaben[id] = sel ? sel[1] : '';
}

/* ---------- DOM-Attrappe ---------- */
function element(id) {
  const el = {
    id, value: vorgaben[id] !== undefined ? vorgaben[id] : '',
    checked: !!vorgaben['__checked__' + id],
    textContent: '', innerText: '', innerHTML: '', className: '', disabled: false,
    hidden: false, offsetWidth: 800, offsetHeight: 300, width: 800, height: 300,
    style: {}, dataset: {}, childNodes: [], children: [], parentElement: null,
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    addEventListener(){}, removeEventListener(){}, appendChild(){}, removeChild(){},
    insertBefore(){}, setAttribute(){}, removeAttribute(){}, getAttribute(){ return null; },
    querySelector(){ return element('?'); }, querySelectorAll(){ return []; },
    getElementsByTagName(){ return []; }, scrollIntoView(){}, focus(){}, click(){},
    getBoundingClientRect(){ return { top:0, left:0, right:0, bottom:0, width:800, height:300 }; },
    getContext(){ return kontext(); },
    toDataURL(){ return 'data:,'; }, toBlob(cb){ cb && cb({}); },
  };
  return el;
}
function kontext() {
  const c = new Proxy({}, { get: (t, p) => {
    if (p === 'canvas') return { width: 800, height: 300 };
    if (p === 'measureText') return () => ({ width: 10 });
    if (p === 'createLinearGradient') return () => ({ addColorStop(){} });
    if (p === 'getImageData') return () => ({ data: [] });
    return () => {};
  }, set: () => true });
  return c;
}

const cacheEl = new Map();
const document = {
  getElementById(id) { if (!cacheEl.has(id)) cacheEl.set(id, element(id)); return cacheEl.get(id); },
  querySelector(){ return element('?'); },
  querySelectorAll(){ return { length: 0, forEach(){}, item(){ return null; } }; },
  createElement(t){ return element('neu:' + t); },
  createTextNode(){ return { nodeValue: '' }; },
  createTreeWalker(){ return { nextNode(){ return null; } }; },
  addEventListener(){}, removeEventListener(){},
  body: element('body'), documentElement: element('html'),
  title: '',
};
const speicher = { getItem(){ return null; }, setItem(){}, removeItem(){} };
const fensterListe = [];
const window = {
  document, localStorage: speicher, sessionStorage: speicher,
  addEventListener(){}, removeEventListener(){},
  matchMedia(){ return { matches: false, addEventListener(){}, addListener(){} }; },
  requestAnimationFrame(f){ fensterListe.push(f); return 1; },
  location: { href: 'http://localhost/', pathname: '/' },
  navigator: { userAgent: 'node', language: 'en' },
  devicePixelRatio: 1, innerWidth: 1440, innerHeight: 900,
  setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
  alert(){}, scrollTo(){},
};
window.window = window;

const sandbox = {
  document, window, localStorage: speicher, sessionStorage: speicher,
  navigator: window.navigator, location: window.location,
  console: { log(){}, warn(){}, error(){}, info(){} },
  setTimeout(){ return 0; }, clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
  requestAnimationFrame: window.requestAnimationFrame,
  matchMedia: window.matchMedia, alert(){},
  Blob: class { constructor(p){ this.parts = p; } },
  URL: { createObjectURL(){ return 'blob:x'; }, revokeObjectURL(){} },
  FileReader: class { readAsText(){} readAsArrayBuffer(){} },
  DOMParser: class { parseFromString(){ return { querySelector(){ return null; }, querySelectorAll(){ return []; } }; } },
  JSZip: class { folder(){ return { file(){} }; } generateAsync(){ return Promise.resolve({}); } },
  L: { map(){ return { setView(){ return this; }, remove(){}, fitBounds(){}, addLayer(){} }; },
       tileLayer(){ return { addTo(){} }; }, polyline(){ return { addTo(){} }; },
       circleMarker(){ return { addTo(){} }; }, latLngBounds(){ return {}; } },
  NodeFilter: { SHOW_ALL:0xFFFFFFFF, SHOW_ELEMENT:1, SHOW_TEXT:4, FILTER_ACCEPT:1, FILTER_REJECT:2, FILTER_SKIP:3 },
  Node: { ELEMENT_NODE:1, TEXT_NODE:3 },
  Image: class {},
  Math, Date, JSON, parseInt, parseFloat, isNaN, isFinite, String, Number, Boolean,
  Array, Object, Uint8Array, Float64Array, Int32Array, ArrayBuffer, DataView, Error, RegExp,
};
sandbox.globalThis = sandbox;
sandbox.self = sandbox;

const ctx = vm.createContext(sandbox);
const quelle = fs.readFileSync(path.join(WURZEL, 'script.js'), 'utf8');
let ladefehler = null;
try { vm.runInContext(quelle, ctx, { filename: 'script.js' }); }
catch (e) { ladefehler = e; }

/* ---------- Prüflauf ---------- */
const GENERATOREN = [
  ['Speed_Overlay.setting',        'buildSetting'],
  ['Route_Overlay.setting',        'buildRouteSetting'],
  ['Elevation_Overlay.setting',    'buildElevSetting'],
  ['HR_Overlay.setting',           'buildHRSetting'],
  ['Incline_Overlay.setting',      'buildInclineSetting'],
  ['Mile_Marker_Overlay.setting',  'buildMileSetting'],
  ['Cadence_Overlay.setting',      'buildCadenceSetting'],
  ['Power_Overlay.setting',        'buildPowerSetting'],
  ['Temperature_Overlay.setting',  'buildTempSetting'],
  ['Pace_Overlay.setting',         'buildPaceSetting'],
  ['Lap_Marker_Overlay.setting',   'buildLapSetting'],
  ['Speed_Overlay_AE.jsx',         'buildSpeedJsx'],
  ['Route_Overlay_AE.jsx',         'buildRouteJsx'],
  ['Elevation_Overlay_AE.jsx',     'buildElevJsx'],
  ['HR_Overlay_AE.jsx',            'buildHRJsx'],
  ['Incline_Overlay_AE.jsx',       'buildInclineJsx'],
  ['Mile_Marker_Overlay_AE.jsx',   'buildMileJsx'],
  ['Cadence_Overlay_AE.jsx',       'buildCadenceJsx'],
  ['Power_Overlay_AE.jsx',         'buildPowerJsx'],
  ['Temperature_Overlay_AE.jsx',   'buildTempJsx'],
  ['Pace_Overlay_AE.jsx',          'buildPaceJsx'],
  ['Lap_Marker_Overlay_AE.jsx',    'buildLapJsx'],
];

function pruefsumme(s) { return crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16); }

function lauf() {
  const fit = fs.readFileSync(path.join(WURZEL, 'examples', 'demo-ride.fit'));
  const puffer = fit.buffer.slice(fit.byteOffset, fit.byteOffset + fit.byteLength);
  ctx.parseFIT(puffer, 'demo-ride.fit');
  const ergebnis = {};
  ergebnis['__daten__'] = [
    'punkte=' + ctx.rawPoints.length, 'hr=' + ctx.hrData.length,
    'cad=' + ctx.cadData.length, 'power=' + ctx.powerData.length,
    'temp=' + ctx.tempData.length, 'pace=' + ctx.paceData.length,
    'runden=' + ctx.lapData.length,
    'distanz=' + (ctx.totalDistM / 1000).toFixed(3),
  ].join(' ');
  for (const [name, fn] of GENERATOREN) {
    const f = ctx[fn];
    if (typeof f !== 'function') { ergebnis[name] = 'FUNKTION FEHLT'; continue; }
    let out;
    try { out = f(); } catch (e) { ergebnis[name] = 'FEHLER: ' + e.message; continue; }
    ergebnis[name] = out === null ? 'null' : pruefsumme(out) + '  ' + out.length;
  }
  return ergebnis;
}

if (ladefehler && typeof ctx.parseFIT !== 'function') {
  console.error('script.js liess sich nicht laden: ' + ladefehler.message);
  process.exit(2);
}
if (ladefehler) console.error('Hinweis: Ladefehler ignoriert (' + ladefehler.message + ')');

const jetzt = lauf();
if (schreiben) {
  fs.writeFileSync(GOLD, JSON.stringify(jetzt, null, 2) + '\n');
  console.log('Prüfsummen aufgenommen: ' + Object.keys(jetzt).length + ' Einträge');
  process.exit(0);
}
if (!fs.existsSync(GOLD)) { console.error('golden.json fehlt - erst mit --write aufnehmen'); process.exit(2); }
const soll = JSON.parse(fs.readFileSync(GOLD, 'utf8'));
const abweichungen = [];
for (const k of new Set([...Object.keys(soll), ...Object.keys(jetzt)])) {
  if (soll[k] !== jetzt[k]) abweichungen.push('  ' + k + '\n    soll: ' + soll[k] + '\n    ist : ' + jetzt[k]);
}
if (abweichungen.length) {
  console.error('ABWEICHUNG in ' + abweichungen.length + ' von ' + Object.keys(soll).length + ' Einträgen:\n' + abweichungen.join('\n'));
  process.exit(1);
}
console.log('alle ' + Object.keys(soll).length + ' Einträge unverändert');
