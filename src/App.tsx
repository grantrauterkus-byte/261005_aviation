import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { calculate, defaultInputs, DEFAULT_SCENARIO_NAME, type Airport, type AssumptionRow, type Changes, type Jet, type ScenarioInputs } from './engine/index.ts'
import { createScenario, fetchAirports, fetchAssumptions, fetchJets, getScenario, updateScenario } from './lib/data.ts'
import { supabaseConfigured } from './lib/supabase.ts'
import { FindMyJet } from './components/FindMyJet.tsx'
import { Library } from './components/Library.tsx'
import { ScenarioBar, type SaveState } from './components/ScenarioBar.tsx'

export interface Reference {
  jets: Jet[]
  assumptions: AssumptionRow[]
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Shell />} />
      <Route path="/library" element={<Shell />} />
      <Route path="/s/:id" element={<Shell />} />
      <Route path="/s/:id/library" element={<Shell />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

interface ScenarioState {
  id: string | null
  name: string
  inputs: ScenarioInputs
  changes: Changes
}

function freshScenario(): ScenarioState {
  return { id: null, name: DEFAULT_SCENARIO_NAME, inputs: defaultInputs(), changes: {} }
}

/** Fills in anything missing from an older or hand-edited saved scenario. */
function normalize(inputs: Partial<ScenarioInputs>): ScenarioInputs {
  const d = defaultInputs()
  return {
    homeBase: inputs.homeBase ?? d.homeBase,
    trips: Array.isArray(inputs.trips) ? inputs.trips : d.trips,
    requirements: { ...d.requirements, ...(inputs.requirements ?? {}) },
    charterHours: typeof inputs.charterHours === 'number' ? inputs.charterHours : 0,
  }
}

function Shell() {
  const { id: routeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const view = location.pathname.endsWith('/library') ? 'library' : 'find'

  const [ref, setRef] = useState<Reference | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [airports, setAirports] = useState<Map<string, Airport>>(new Map())
  const [scenario, setScenario] = useState<ScenarioState>(freshScenario)
  const [scenarioStatus, setScenarioStatus] = useState<'ready' | 'loading' | 'missing'>(routeId ? 'loading' : 'ready')
  const [save, setSave] = useState<SaveState>('unsaved')
  const dirty = useRef(false)
  const creating = useRef(false)

  // Reference data, once.
  useEffect(() => {
    if (!supabaseConfigured) {
      setLoadError('The app is not connected to its database.')
      return
    }
    Promise.all([fetchJets(), fetchAssumptions()])
      .then(([jets, assumptions]) => setRef({ jets, assumptions }))
      .catch((e) => setLoadError(String(e?.message ?? e)))
  }, [])

  // Scenario from the link.
  useEffect(() => {
    if (!routeId) {
      if (scenario.id !== null) {
        setScenario(freshScenario())
        setSave('unsaved')
      }
      setScenarioStatus('ready')
      return
    }
    if (routeId === scenario.id) return
    setScenarioStatus('loading')
    getScenario(routeId)
      .then((s) => {
        if (!s) return setScenarioStatus('missing')
        dirty.current = false
        setScenario({ id: s.id, name: s.name, inputs: normalize(s.inputs), changes: s.changes ?? {} })
        setSave('saved')
        setScenarioStatus('ready')
      })
      .catch(() => setScenarioStatus('missing'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId])

  // Airports the scenario uses.
  useEffect(() => {
    const needed = new Set([scenario.inputs.homeBase, ...scenario.inputs.trips.flatMap((t) => [t.from, t.to])].filter(Boolean))
    const missing = [...needed].filter((i) => !airports.has(i))
    if (!missing.length) return
    fetchAirports(missing).then((found) => {
      if (!found.length) return
      setAirports((prev) => {
        const next = new Map(prev)
        for (const a of found) next.set(a.ident, a)
        return next
      })
    })
  }, [scenario.inputs, airports])

  const rememberAirport = useCallback((a: Airport) => {
    setAirports((prev) => (prev.has(a.ident) ? prev : new Map(prev).set(a.ident, a)))
  }, [])

  // Autosave: the first change creates the scenario and gives it a link; later changes update it.
  useEffect(() => {
    if (!dirty.current) return
    const t = setTimeout(async () => {
      const s = scenario
      try {
        if (s.id) {
          setSave('saving')
          const ok = await updateScenario(s.id, s.name.trim() || 'Untitled scenario', s.inputs, s.changes)
          setSave(ok ? 'saved' : 'error')
        } else if (!creating.current) {
          creating.current = true
          setSave('saving')
          const newId = await createScenario(s.name.trim() || 'Untitled scenario', s.inputs, s.changes)
          creating.current = false
          setScenario((cur) => ({ ...cur, id: newId }))
          setSave('saved')
          navigate(`/s/${newId}${view === 'library' ? '/library' : ''}${location.search}`, { replace: true })
          dirty.current = true // save anything changed while creating
          return
        }
        dirty.current = false
      } catch {
        creating.current = false
        setSave('error')
      }
    }, 700)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario])

  const update = useCallback((fn: (s: ScenarioState) => ScenarioState) => {
    dirty.current = true
    setSave('unsaved')
    setScenario(fn)
  }, [])

  const setInputs = useCallback((inputs: ScenarioInputs) => update((s) => ({ ...s, inputs })), [update])
  const setChange = useCallback(
    (id: string, value: string | null) =>
      update((s) => {
        const changes = { ...s.changes }
        if (value == null || value.trim() === '') delete changes[id]
        else changes[id] = value.trim()
        return { ...s, changes }
      }),
    [update],
  )
  const resetAll = useCallback(() => update((s) => ({ ...s, changes: {} })), [update])
  const rename = useCallback((name: string) => update((s) => ({ ...s, name })), [update])

  const newScenario = () => {
    dirty.current = false
    setScenario(freshScenario())
    setSave('unsaved')
    navigate(view === 'library' ? '/library' : '/')
  }
  const copyScenario = async () => {
    setSave('saving')
    try {
      const name = `Copy of ${scenario.name}`.slice(0, 200)
      const newId = await createScenario(name, scenario.inputs, scenario.changes)
      dirty.current = false
      setScenario({ ...scenario, id: newId, name })
      setSave('saved')
      navigate(`/s/${newId}${view === 'library' ? '/library' : ''}`)
    } catch {
      setSave('error')
    }
  }

  const results = useMemo(() => {
    if (!ref) return null
    return calculate(scenario.inputs, scenario.changes, { jets: ref.jets, assumptions: ref.assumptions, airports })
  }, [ref, scenario.inputs, scenario.changes, airports])

  const base = scenario.id ? `/s/${scenario.id}` : ''
  const openLibrary = useCallback(
    (opts: { focus?: string; jet?: string }) => {
      const q = new URLSearchParams()
      if (opts.focus) q.set('focus', opts.focus)
      if (opts.jet) q.set('jet', opts.jet)
      navigate(`${base}/library${q.size ? `?${q}` : ''}`)
      window.scrollTo(0, 0)
    },
    [base, navigate],
  )

  return (
    <div className="app">
      <header className="top">
        <div className="top-inner">
          <Link to={base || '/'} className="brand">
            Jet Ownership Finder
          </Link>
          <nav className="tabs" aria-label="Screens">
            <Link className={view === 'find' ? 'tab active' : 'tab'} to={base || '/'}>
              Find my jet
            </Link>
            <Link className={view === 'library' ? 'tab active' : 'tab'} to={`${base}/library`}>
              Assumptions Library
              {Object.keys(scenario.changes).length > 0 && <span className="pill">{Object.keys(scenario.changes).length} changed</span>}
            </Link>
          </nav>
        </div>
      </header>

      <ScenarioBar name={scenario.name} id={scenario.id} save={save} onRename={rename} onNew={newScenario} onCopy={copyScenario} />

      <main className="main">
        {loadError && <p className="notice error">Could not load the app's data: {loadError}</p>}
        {scenarioStatus === 'missing' && (
          <div className="notice">
            <p>No scenario was found at this link.</p>
            <p>
              <Link to="/">Start from the demo scenario</Link>
            </p>
          </div>
        )}
        {!loadError && scenarioStatus !== 'missing' && (!ref || scenarioStatus === 'loading') && <p className="loading">Loading…</p>}
        {ref && results && scenarioStatus === 'ready' && view === 'find' && (
          <FindMyJet
            inputs={scenario.inputs}
            setInputs={setInputs}
            results={results}
            airports={airports}
            rememberAirport={rememberAirport}
            changes={scenario.changes}
            setChange={setChange}
            openLibrary={openLibrary}
            totalJets={ref.jets.length}
          />
        )}
        {ref && scenarioStatus === 'ready' && view === 'library' && (
          <Library rows={ref.assumptions} jets={ref.jets} changes={scenario.changes} setChange={setChange} resetAll={resetAll} results={results} />
        )}
      </main>
      <footer className="foot">
        All amounts are in today's dollars, the same in each of the 5 years. Every number comes from the Assumptions Library, where each value's source is shown.
      </footer>
    </div>
  )
}
