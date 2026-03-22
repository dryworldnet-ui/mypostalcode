# Postal code database scripts

## Data structure

**Most provinces:** `province → town → areas.csv`

**Limpopo:** `province → municipality → town → areas.csv` (district municipality folders)

```
data/provinces/
├── eastern-cape/
│   ├── aberdeen/
│   │   └── areas.csv
│   └── ...
├── limpopo/
│   ├── capricorn/          ← Capricorn District (seat: Polokwane)
│   │   ├── polokwane/
│   │   │   └── areas.csv
│   │   └── ...
│   ├── mopani/             ← Mopani District (seat: Giyani)
│   ├── sekhukhune/         ← Sekhukhune District (seat: Groblersdal)
│   ├── vhembe/             ← Vhembe District (seat: Thohoyandou)
│   └── waterberg/          ← Waterberg District (seat: Modimolle)
└── ...
```

Town-to-municipality mapping: `data/town-to-municipality.js`

Each `areas.csv` has columns: `id`, `postal_code`, `area`, `city`, `province`, `aliases`

## Data flow

1. **Source:** `postal code database.tsv` (from SAPO)
2. **Build:** `npm run db:build` → reads TSV, writes `data/provinces/{province}/{town}/areas.csv`
3. **Merge:** `npm run db:json` → reads province/town folders, writes `postal-codes.json` and `public/postal-codes.json`
4. **Generate:** `npm run build` or `npm run dev` → uses JSON to generate static pages
5. **Seed (optional):** `npm run db:seed` → inserts into Supabase from JSON

## Editing a town

1. Open `data/provinces/limpopo/atok/areas.csv` (or the town you need) in Excel or a text editor
2. Fix inconsistencies, add aliases, correct names
3. Save
4. Run `npm run db:json` to regenerate the merged JSON
5. Run `npm run build` or `npm run dev` to regenerate the site

## Commands

| Command | Description |
|---------|-------------|
| `npm run db:build` | Rebuild `data/provinces/*.csv` from the TSV (run first after TSV update) |
| `npm run db:json` | Merge province CSVs → `postal-codes.json` and `public/postal-codes.json` |
| `npm run db:seed` | Insert into Supabase (reads JSON or province CSVs) |
| `npm run build` | db:json + generate static site |
| `npm run dev` | db:json + generate (Northern Cape only) + serve |

## Fallback

If `data/provinces/` is empty, `db:json` and `db:seed` fall back to `postal-codes-database-ready.csv` (legacy). Run `db:build` to create the province/town folder structure.
