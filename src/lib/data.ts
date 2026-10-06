import type { Airport, AssumptionRow, Changes, Jet, ScenarioInputs } from '../engine/index.ts'
import { supabase } from './supabase.ts'

const AIRPORT_COLS = 'ident,code,name,municipality,latitude,longitude,longest_runway_ft'

export async function fetchJets(): Promise<Jet[]> {
  const { data, error } = await supabase.from('jets').select('id,name,class,sort_order,most_sold_build_years').order('sort_order')
  if (error) throw error
  return data as Jet[]
}

export async function fetchAssumptions(): Promise<AssumptionRow[]> {
  const { data, error } = await supabase.from('assumptions').select('*').order('sort_order')
  if (error) throw error
  return data as AssumptionRow[]
}

export async function fetchAirports(idents: string[]): Promise<Airport[]> {
  if (!idents.length) return []
  const { data, error } = await supabase.from('airports').select(AIRPORT_COLS).in('ident', idents)
  if (error) throw error
  return data as Airport[]
}

/** Search by code, ICAO identifier, name or town. Exact code matches come first. */
export async function searchAirports(query: string): Promise<Airport[]> {
  const q = query.trim().replace(/[,()%*\\]/g, ' ').trim()
  if (q.length < 2) return []
  const up = q.toUpperCase()
  const filters = [`code.ilike.${q}%`, `ident.ilike.${q}%`, `name.ilike.%${q}%`, `municipality.ilike.%${q}%`]
  if (/^[A-Za-z0-9]{3}$/.test(q)) filters.push(`ident.eq.K${up}`)
  const { data, error } = await supabase.from('airports').select(AIRPORT_COLS).or(filters.join(',')).limit(40)
  if (error) throw error
  const rank = (a: Airport) =>
    (a.code.toUpperCase() === up || a.ident.toUpperCase() === up || a.ident.toUpperCase() === `K${up}` ? 0 : 2) +
    (a.longest_runway_ft != null && a.longest_runway_ft >= 4000 ? 0 : 1)
  return (data as Airport[]).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name)).slice(0, 12)
}

export interface StoredScenario {
  id: string
  name: string
  inputs: ScenarioInputs
  changes: Changes
  updated_at: string
}

export async function getScenario(id: string): Promise<StoredScenario | null> {
  const { data, error } = await supabase.rpc('get_scenario', { p_id: id })
  if (error) throw error
  return (data as StoredScenario | null) ?? null
}

export async function createScenario(name: string, inputs: ScenarioInputs, changes: Changes): Promise<string> {
  const { data, error } = await supabase.rpc('create_scenario', { p_name: name, p_inputs: inputs, p_changes: changes })
  if (error) throw error
  return data as string
}

export async function updateScenario(id: string, name: string, inputs: ScenarioInputs, changes: Changes): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_scenario', { p_id: id, p_name: name, p_inputs: inputs, p_changes: changes })
  if (error) throw error
  return data as boolean
}
