import { useEffect, useId, useRef, useState } from 'react'
import type { Airport } from '../engine/index.ts'
import { searchAirports } from '../lib/data.ts'

interface Props {
  label: string
  value: string // airport ident
  airports: Map<string, Airport>
  onChange: (a: Airport) => void
  hideLabel?: boolean
}

export function airportName(a: Airport | undefined, ident: string) {
  if (!a) return ident
  return `${a.code} · ${a.name}`
}

export function AirportPicker({ label, value, airports, onChange, hideLabel }: Props) {
  const current = airports.get(value)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(false)
  const [options, setOptions] = useState<Airport[]>([])
  const [active, setActive] = useState(0)
  const [searching, setSearching] = useState(false)
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!editing) return
    const q = text.trim()
    if (q.length < 2) {
      setOptions([])
      return
    }
    setSearching(true)
    const t = setTimeout(() => {
      searchAirports(q)
        .then((r) => {
          setOptions(r)
          setActive(0)
        })
        .catch(() => setOptions([]))
        .finally(() => setSearching(false))
    }, 250)
    return () => clearTimeout(t)
  }, [text, editing])

  useEffect(() => {
    if (!editing) return
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setEditing(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [editing])

  const pick = (a: Airport) => {
    onChange(a)
    setEditing(false)
    setText('')
    setOptions([])
  }

  return (
    <div className="airport-picker" ref={box}>
      <label className={hideLabel ? 'sr-only' : 'label'} htmlFor={`${listId}-input`}>
        {label}
      </label>
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={editing && options.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder="Search by name, town or code"
        value={editing ? text : airportName(current, value)}
        onFocus={() => {
          setEditing(true)
          setText('')
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(i + 1, options.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && options[active]) {
            e.preventDefault()
            pick(options[active])
          } else if (e.key === 'Escape') {
            setEditing(false)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
      />
      {editing && text.trim().length >= 2 && (
        <ul className="airport-options" id={listId} role="listbox">
          {options.map((a, i) => (
            <li
              key={a.ident}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(a)
              }}
              onMouseEnter={() => setActive(i)}
            >
              <strong>{a.code}</strong> {a.name}
              <span className="muted">
                {a.municipality ? ` · ${a.municipality}` : ''}
                {a.longest_runway_ft ? ` · longest runway ${a.longest_runway_ft.toLocaleString('en-US')} ft` : ''}
              </span>
            </li>
          ))}
          {!searching && options.length === 0 && <li className="muted">No airports found</li>}
          {searching && options.length === 0 && <li className="muted">Searching…</li>}
        </ul>
      )}
    </div>
  )
}
