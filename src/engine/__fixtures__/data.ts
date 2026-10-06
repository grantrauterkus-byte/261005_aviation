import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseCsv } from '../../lib/csv.ts'
import type { EngineData } from '../calculate.ts'
import type { AssumptionRow, Jet } from '../types.ts'
import { DEMO_AIRPORTS } from './airports.ts'

const ROOT = join(import.meta.dirname, '..', '..', '..')

export const JETS: Jet[] = [
  ['Citation XLS', 'Midsize', '2004-2008'],
  ['Citation Latitude', 'Midsize', '2016-2020'],
  ['Citation Sovereign', 'Midsize', '2005-2009'],
  ['Hawker 800XP', 'Midsize', '2001-2005'],
  ['Learjet 60', 'Midsize', '1997-2001'],
  ['Challenger 300', 'Super-midsize', '2004-2008'],
  ['Challenger 350', 'Super-midsize', '2015-2019'],
  ['Gulfstream G280', 'Super-midsize', '2014-2018'],
  ['Embraer Praetor 600', 'Super-midsize', '2019-2023'],
  ['Citation X', 'Super-midsize', '1997-2001'],
].map(([name, cls, years], i) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
  class: cls as Jet['class'],
  sort_order: i + 1,
  most_sold_build_years: years,
}))

/** The committed assumptions.csv, read the same way the load script reads it. */
export function loadAssumptions(): AssumptionRow[] {
  return parseCsv(readFileSync(join(ROOT, 'data', 'assumptions.csv'), 'utf-8')).map((r) => ({
    ...r,
    low: r.low || null,
    high: r.high || null,
  })) as unknown as AssumptionRow[]
}

export function demoData(): EngineData {
  return { jets: JETS, assumptions: loadAssumptions(), airports: new Map(DEMO_AIRPORTS.map((a) => [a.ident, a])) }
}
