/**
 * Reads postal code database.tsv, cleans it, and writes to:
 * data/provinces/{province-slug}/{town-slug}/areas.csv
 * For Limpopo: data/provinces/limpopo/{municipality-slug}/{town-slug}/areas.csv
 *
 * Structure: province → [municipality] → town → areas.csv
 * Limpopo uses district municipality folders (Capricorn, Mopani, Sekhukhune, Vhembe, Waterberg).
 *
 * Columns: id, postal_code, area, city, province, aliases
 *
 * Run: node scripts/build-postal-database.js
 */

import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { toSlug, escapeCsv } from './lib/csv-utils.js';
import {
  PROVINCES_WITH_MUNICIPALITIES,
  LIMPOPO_TOWN_TO_MUNICIPALITY,
} from '../data/town-to-municipality.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INPUT = path.join(ROOT, 'postal code database.tsv');
const PROVINCES_DIR = path.join(ROOT, 'data', 'provinces');

const EMPTY = new Set(['xx', '']);

function trim(s) {
  return (s == null ? '' : String(s)).trim();
}

function isEmpty(v) {
  return EMPTY.has(trim(v).toLowerCase());
}

function parseLine(line) {
  const cols = line.split('\t');
  return {
    numId: trim(cols[0]),
    placeName: trim(cols[1]),
    province: trim(cols[2]),
    boxCode: trim(cols[3]),
    strCode: trim(cols[4]),
    town: trim(cols[5]),
    lapPlace: trim(cols[6]),
    lapTown: trim(cols[7]),
    sa1: trim(cols[8]),
    sa2: trim(cols[9]),
    sa3: trim(cols[10]),
    sa4: trim(cols[11]),
  };
}

function main() {
  if (!fs.existsSync(INPUT)) {
    console.error('Missing:', INPUT);
    process.exit(1);
  }

  const content = fs.readFileSync(INPUT, 'utf8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const headerLine = lines[0];
  const dataLines = lines.slice(1);

  const headers = headerLine.split('\t').map((h) => h.trim());
  if (headers[1] !== 'PlaceName' || headers[5] !== 'Town') {
    console.warn('Unexpected header:', headers);
  }

  // Group rows by province, then by town
  const byProvince = new Map();
  let skipped = 0;

  for (const line of dataLines) {
    if (!line.trim()) continue;

    const r = parseLine(line);
    const postalCode = !isEmpty(r.strCode) ? r.strCode : isEmpty(r.boxCode) ? null : r.boxCode;
    if (postalCode == null || postalCode === '') {
      skipped++;
      continue;
    }

    const aliasParts = [r.lapPlace, r.lapTown, r.sa1, r.sa2, r.sa3, r.sa4]
      .filter((v) => v && !isEmpty(v))
      .map((v) => trim(v).replace(/\s*xx\s*$/gi, '').replace(/^\s*xx\s*/gi, '').trim())
      .filter((v) => v && v.toLowerCase() !== 'xx');

    const uniqueAliases = [...new Set(aliasParts)];
    const aliases = uniqueAliases.join('|');

    const row = {
      id: randomUUID(),
      postal_code: postalCode,
      area: r.placeName || '',
      city: r.town || '',
      province: r.province || '',
      aliases,
    };

    const provSlug = toSlug(r.province) || 'unknown';
    const townSlug = toSlug(r.town) || 'unknown';
    if (!byProvince.has(provSlug)) {
      byProvince.set(provSlug, { name: r.province, towns: new Map() });
    }
    const prov = byProvince.get(provSlug);
    if (!prov.towns.has(townSlug)) {
      prov.towns.set(townSlug, { name: r.town, rows: [] });
    }
    prov.towns.get(townSlug).rows.push(row);
  }

  // Clean and ensure output directory
  if (fs.existsSync(PROVINCES_DIR)) {
    fs.rmSync(PROVINCES_DIR, { recursive: true });
  }
  fs.mkdirSync(PROVINCES_DIR, { recursive: true });

  const csvHeader = 'id,postal_code,area,city,province,aliases';
  let total = 0;
  const hasMunicipalities = PROVINCES_WITH_MUNICIPALITIES.includes('limpopo');

  function writeTownCsv(provDir, townSlug, rows) {
    rows.sort((a, b) =>
      (a.area || '').toLowerCase().localeCompare((b.area || '').toLowerCase())
    );
    const townDir = path.join(provDir, townSlug);
    fs.mkdirSync(townDir, { recursive: true });
    const csvLines = [csvHeader];
    for (const row of rows) {
      csvLines.push(
        [
          escapeCsv(row.id),
          escapeCsv(row.postal_code),
          escapeCsv(row.area),
          escapeCsv(row.city),
          escapeCsv(row.province),
          escapeCsv(row.aliases),
        ].join(',')
      );
    }
    fs.writeFileSync(path.join(townDir, 'areas.csv'), csvLines.join('\n'), 'utf8');
    return rows.length;
  }

  for (const [provSlug, { name: provName, towns }] of byProvince) {
    const provDir = path.join(PROVINCES_DIR, provSlug);
    fs.mkdirSync(provDir, { recursive: true });

    if (hasMunicipalities && provSlug === 'limpopo') {
      // Group towns by municipality, then write province/municipality/town/areas.csv
      const byMunicipality = new Map();
      for (const [townSlug, { name: townName, rows }] of towns) {
        const municSlug =
          LIMPOPO_TOWN_TO_MUNICIPALITY[townSlug] ||
          LIMPOPO_TOWN_TO_MUNICIPALITY[townSlug.replace(/-/g, '')] ||
          'capricorn';
        if (!byMunicipality.has(municSlug)) {
          byMunicipality.set(municSlug, new Map());
        }
        byMunicipality.get(municSlug).set(townSlug, { name: townName, rows });
      }
      for (const [municSlug, municTowns] of byMunicipality) {
        const municDir = path.join(provDir, municSlug);
        fs.mkdirSync(municDir, { recursive: true });
        for (const [townSlug, { name: townName, rows }] of municTowns) {
          total += writeTownCsv(municDir, townSlug, rows);
        }
        console.log('  ', provSlug + '/' + municSlug + '/', '→', municTowns.size, 'towns');
      }
    } else {
      // Standard: province/town/areas.csv
      for (const [townSlug, { name: townName, rows }] of towns) {
        total += writeTownCsv(provDir, townSlug, rows);
      }
      console.log('  ', provSlug + '/', '→', towns.size, 'towns');
    }
  }

  console.log(
    '\nWritten',
    total,
    'rows to data/provinces/{province}/[municipality/]{town}/areas.csv'
  );
  if (skipped > 0) {
    console.log('Skipped', skipped, 'rows (no valid postal code).');
  }
}

main();
