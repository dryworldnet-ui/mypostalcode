/**
 * Seeds the postal_codes table from postal-codes.json (or data/provinces/*.csv)
 *
 * Prerequisites:
 * 1. Run supabase/schema-postal-codes.sql in Supabase SQL Editor (create table).
 * 2. In Supabase SQL Editor, run: TRUNCATE postal_codes;
 * 3. Set env: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)
 *
 * Data flow: Run "npm run db:build" then "npm run db:json" to create postal-codes.json
 *
 * Run: node scripts/seed-postal-codes.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { parseCsvLine } from './lib/csv-utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const JSON_PATH = path.join(ROOT, 'postal-codes.json');
const PROVINCES_DIR = path.join(ROOT, 'data', 'provinces');
const LEGACY_CSV = path.join(ROOT, 'postal-codes-database-ready.csv');
const BATCH_SIZE = 500;

// Load .env from project root
try {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
} catch (_) {}

const url = process.env.VITE_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!url || !key) {
  console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in env.');
  process.exit(1);
}

const supabase = createClient(url, key);

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

function loadCsvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    header.forEach((h, j) => {
      row[h] = values[j] ?? '';
    });
    rows.push({
      id: row.id,
      postal_code: row.postal_code,
      area: row.area,
      city: row.city,
      province: row.province,
      aliases: row.aliases ?? '',
    });
  }
  return rows;
}

function loadRows() {
  if (fs.existsSync(JSON_PATH)) {
    console.log('Loading', path.basename(JSON_PATH), '...');
    const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
    if (Array.isArray(data) && data.length > 0) return data;
  }

  if (fs.existsSync(PROVINCES_DIR)) {
    // Try province/[municipality/]town/areas.csv structure (recursive)
    const provinces = fs.readdirSync(PROVINCES_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    if (provinces.length > 0) {
      const areasFiles = [];
      for (const prov of provinces.sort()) {
        areasFiles.push(...findAreasCsvFiles(path.join(PROVINCES_DIR, prov)));
      }
      if (areasFiles.length > 0) {
        let rows = [];
        for (const areasPath of areasFiles.sort()) {
          rows = rows.concat(loadCsvFile(areasPath));
        }
        console.log('Loading from data/provinces/{province}/[municipality/]{town}/areas.csv');
        return rows;
      }
    }
    // Fallback: flat province/*.csv
    const files = fs.readdirSync(PROVINCES_DIR).filter((f) => f.endsWith('.csv'));
    if (files.length > 0) {
      console.log('Loading', files.length, 'province CSVs from data/provinces/');
      let rows = [];
      for (const file of files.sort()) {
        rows = rows.concat(loadCsvFile(path.join(PROVINCES_DIR, file)));
      }
      return rows;
    }
  }

  if (fs.existsSync(LEGACY_CSV)) {
    console.log('Loading legacy', path.basename(LEGACY_CSV), '...');
    return loadCsvFile(LEGACY_CSV);
  }

  console.error('No data. Run "npm run db:build" and "npm run db:json" first.');
  process.exit(1);
}

async function clearTable() {
  const { error } = await supabase.from('postal_codes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.warn('Delete all failed (run TRUNCATE postal_codes; in SQL Editor):', error.message);
    return false;
  }
  console.log('Cleared existing postal_codes rows.');
  return true;
}

async function main() {
  const rows = loadRows();
  console.log('Loaded', rows.length, 'rows.');

  const clear = process.argv.includes('--clear');
  if (clear) {
    await clearTable();
  } else {
    console.log('Tip: run with --clear to delete existing rows first.');
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('postal_codes').insert(batch);
    if (error) {
      console.error('Batch error at offset', i, ':', error.message);
      process.exit(1);
    }
    inserted += batch.length;
    process.stdout.write('\rInserted ' + inserted + ' / ' + rows.length);
  }
  console.log('\nDone. Total rows in table:', inserted);
}

main();
