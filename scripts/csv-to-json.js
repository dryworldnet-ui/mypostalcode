/**
 * Reads from data/provinces/{province}/{town}/areas.csv and writes merged postal-codes.json
 * Also writes public/postal-codes.json for the app.
 *
 * Structure: data/provinces/eastern-cape/aberdeen/areas.csv
 *
 * Run after: npm run db:build
 * Run: node scripts/csv-to-json.js
 *
 * Fallback: reads data/provinces/*.csv (flat) or postal-codes-database-ready.csv (legacy)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCsvLine } from './lib/csv-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PROVINCES_DIR = path.join(ROOT, 'data', 'provinces');
const LEGACY_CSV = path.join(ROOT, 'postal-codes-database-ready.csv');
const OUTPUT_JSON = path.join(ROOT, 'postal-codes.json');
const PUBLIC_JSON = path.join(ROOT, 'public', 'postal-codes.json');

function loadCsvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    header.forEach((h, j) => {
      row[h] = values[j] ?? '';
    });
    data.push({
      id: row.id,
      postal_code: row.postal_code,
      area: row.area,
      city: row.city,
      province: row.province,
      aliases: row.aliases ?? '',
    });
  }
  return data;
}

/**
 * Recursively find all areas.csv files under a directory.
 * Handles both: province/town/areas.csv and province/municipality/town/areas.csv
 */
function findAreasCsvFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const areasPath = path.join(full, 'areas.csv');
      if (fs.existsSync(areasPath)) {
        files.push(areasPath);
      } else {
        files.push(...findAreasCsvFiles(full));
      }
    }
  }
  return files;
}

function loadFromProvinceTownFolders() {
  const data = [];
  if (!fs.existsSync(PROVINCES_DIR)) return data;

  const provinces = fs.readdirSync(PROVINCES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const provSlug of provinces) {
    const provPath = path.join(PROVINCES_DIR, provSlug);
    const areasFiles = findAreasCsvFiles(provPath);
    for (const areasPath of areasFiles.sort()) {
      const rows = loadCsvFile(areasPath);
      data.push(...rows);
    }
  }
  return data;
}

function loadFromFlatProvinceCsvs() {
  const data = [];
  const files = fs.readdirSync(PROVINCES_DIR).filter((f) => f.endsWith('.csv'));
  for (const file of files.sort()) {
    data.push(...loadCsvFile(path.join(PROVINCES_DIR, file)));
  }
  return data;
}

function main() {
  let data = [];

  if (fs.existsSync(PROVINCES_DIR)) {
    // Try province/town/areas.csv structure first
    data = loadFromProvinceTownFolders();
    if (data.length > 0) {
      console.log('Reading from data/provinces/{province}/[municipality/]{town}/areas.csv');
      console.log('  Loaded', data.length, 'entries');
    } else {
      // Fallback: flat province/*.csv
      data = loadFromFlatProvinceCsvs();
      if (data.length > 0) {
        console.log('Reading from data/provinces/*.csv (flat structure)');
        console.log('  Loaded', data.length, 'entries');
      }
    }
  }

  if (data.length === 0 && fs.existsSync(LEGACY_CSV)) {
    console.log('Using legacy', path.basename(LEGACY_CSV));
    data = loadCsvFile(LEGACY_CSV);
  }

  if (data.length === 0) {
    console.error('No data. Run "npm run db:build" first.');
    process.exit(1);
  }

  const json = JSON.stringify(data);

  fs.writeFileSync(OUTPUT_JSON, json, 'utf8');
  console.log('Wrote', data.length, 'entries to postal-codes.json');

  if (!fs.existsSync(path.dirname(PUBLIC_JSON))) {
    fs.mkdirSync(path.dirname(PUBLIC_JSON), { recursive: true });
  }
  fs.writeFileSync(PUBLIC_JSON, json, 'utf8');
  console.log('Wrote public/postal-codes.json');
}

main();
