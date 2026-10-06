/**
 * One-time load script: puts the committed CSVs and the OurAirports files into Supabase.
 *
 * Run from the repo root:  npm run load
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 *
 * OurAirports files are downloaded once into data/raw/ (git-ignored) and reused if already there.
 * Re-running is safe: rows are upserted by their ids, and rows no longer in the CSVs are reported, not deleted.
 */
import { createClient } from '@supabase/supabase-js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseCsv } from '../src/lib/csv.ts'

const ROOT = join(import.meta.dirname, '..')
const RAW = join(ROOT, 'data', 'raw')
const OURAIRPORTS = 'https://davidmegginson.github.io/ourairports-data'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.')
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

// Jet classes and display order, from DATA.md, and the manufacturer name shown on each card.
const JETS: [string, 'Midsize' | 'Super-midsize', string][] = [
  ['Citation XLS', 'Midsize', 'Cessna'],
  ['Citation Latitude', 'Midsize', 'Cessna'],
  ['Citation Sovereign', 'Midsize', 'Cessna'],
  ['Hawker 800XP', 'Midsize', 'Hawker'],
  ['Learjet 60', 'Midsize', 'Learjet'],
  ['Challenger 300', 'Super-midsize', 'Bombardier'],
  ['Challenger 350', 'Super-midsize', 'Bombardier'],
  ['Gulfstream G280', 'Super-midsize', 'Gulfstream'],
  ['Embraer Praetor 600', 'Super-midsize', 'Embraer'],
  ['Citation X', 'Super-midsize', 'Cessna'],
]

const PAVED = /^(asp|asph|asphalt|con|conc|concrete|pem|bit|bitumen|tar|tarmac|paved|macadam|asp-con|con-asp)/i
const AIRPORT_TYPES = new Set(['small_airport', 'medium_airport', 'large_airport'])

function readCsv(path: string): Record<string, string>[] {
  return parseCsv(readFileSync(path, 'utf-8'))
}

async function download(name: string): Promise<string> {
  mkdirSync(RAW, { recursive: true })
  const path = join(RAW, name)
  if (!existsSync(path)) {
    console.log(`Downloading ${name} from OurAirports...`)
    const res = await fetch(`${OURAIRPORTS}/${name}`)
    if (!res.ok) throw new Error(`Download of ${name} failed: ${res.status}`)
    writeFileSync(path, await res.text())
  }
  return path
}

async function upsert(table: string, rows: object[], onConflict: string) {
  const size = 1000
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + size), { onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  console.log(`${table}: ${rows.length} rows loaded`)
}

async function reportExtra(table: string, keyCol: string, keep: Set<string>) {
  const found: string[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(keyCol).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    for (const r of data as unknown as Record<string, string>[]) if (!keep.has(r[keyCol])) found.push(r[keyCol])
    if (data.length < 1000) break
  }
  if (found.length) console.log(`${table}: ${found.length} rows in the database are not in the source files (left in place): ${found.slice(0, 10).join(', ')}`)
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function loadJets() {
  const fleet = new Map(readCsv(join(ROOT, 'data', 'fleet_summary.csv')).map((r) => [r.jet, r]))
  const rows = JETS.map(([name, cls, manufacturer], i) => {
    const f = fleet.get(name)
    if (!f) throw new Error(`No fleet summary row for ${name}`)
    return {
      id: slug(name),
      name,
      class: cls,
      manufacturer,
      sort_order: i + 1,
      most_sold_build_years: f.most_sold_build_years,
      active_us_fleet: Number(f.active_us_fleet),
      sales_last_5_years: Number(f.sales_last_5_years),
      sales_per_year_avg: Number(f.sales_per_year_avg),
    }
  })
  await upsert('jets', rows, 'id')
  await reportExtra('jets', 'id', new Set(rows.map((r) => r.id)))
}

async function loadAssumptions() {
  const blank = (v: string) => (v === '' ? null : v)
  const rows = readCsv(join(ROOT, 'data', 'assumptions.csv')).map((r, i) => ({
    id: r.id,
    sort_order: i + 1,
    item: r.item,
    jet: r.jet,
    applies_to: r.applies_to,
    value: r.value,
    low: blank(r.low),
    high: blank(r.high),
    unit: r.unit,
    type: r.type,
    source_name: blank(r.source_name),
    source_url: blank(r.source_url),
    source_date: blank(r.source_date),
    confidence: r.confidence,
    notes: blank(r.notes),
  }))
  await upsert('assumptions', rows, 'id')
  await reportExtra('assumptions', 'id', new Set(rows.map((r) => r.id)))
}

async function loadAirports() {
  const airports = readCsv(await download('airports.csv'))
  const runways = readCsv(await download('runways.csv'))

  const longest = new Map<string, number>()
  const longestPaved = new Map<string, number>()
  for (const r of runways) {
    if (r.closed === '1') continue
    const len = Number(r.length_ft)
    if (!len) continue
    const id = r.airport_ident
    if (len > (longest.get(id) ?? 0)) longest.set(id, len)
    if (PAVED.test(r.surface.trim()) && len > (longestPaved.get(id) ?? 0)) longestPaved.set(id, len)
  }

  const rows = airports
    .filter((a) => AIRPORT_TYPES.has(a.type))
    .filter((a) => a.iso_country === 'US' || (longestPaved.get(a.ident) ?? 0) >= 4000)
    .filter((a) => a.latitude_deg !== '' && a.longitude_deg !== '')
    .map((a) => ({
      ident: a.ident,
      code: a.iata_code || a.local_code || a.gps_code || a.icao_code || a.ident,
      name: a.name,
      municipality: a.municipality || null,
      country: a.iso_country,
      latitude: Number(a.latitude_deg),
      longitude: Number(a.longitude_deg),
      longest_runway_ft: longest.get(a.ident) ?? null,
    }))
  await upsert('airports', rows, 'ident')
}

await loadJets()
await loadAssumptions()
await loadAirports()
console.log('Done.')
