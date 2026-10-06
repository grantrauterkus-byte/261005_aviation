import type { Tone } from './columns.ts'
import { CertaintyDots, type Level } from './Certainty.tsx'

const TONE_WORD: Record<Tone, string> = { good: 'meets your need', plain: '', low: '', fail: 'fails your need' }

/** A labeled chip: the label in plain text, then the value. The color adds to the words, never replaces them. */
export function Chip({ label, value, tone = 'plain', certainty, onClick }: { label: string; value: string; tone?: Tone; certainty?: Level | null; onClick?: () => void }) {
  const title = TONE_WORD[tone] ? `${label}: ${value} (${TONE_WORD[tone]})` : `${label}: ${value}`
  const body = (
    <>
      <span className="chip-k">{label}</span>
      <span className="chip-v">
        {value}
        {certainty && <CertaintyDots level={certainty} />}
      </span>
    </>
  )
  return onClick ? (
    <button type="button" className={`chip tone-${tone}`} title={title} onClick={onClick}>
      {body}
    </button>
  ) : (
    <span className={`chip tone-${tone}`} title={title}>
      {body}
    </span>
  )
}

/** Color key: green and red only ever mean meets or fails your need. The matrix adds its blue comparison scale. */
export function ToneKey({ matrix }: { matrix: boolean }) {
  return (
    <div className="tone-key" aria-label="Color key">
      <span>
        <i className="tone-good" /> Meets your need
      </span>
      <span>
        <i className="tone-fail" /> Fails your need
      </span>
      {matrix ? (
        <span>
          <i className="cmp-scale" /> Darker blue · further behind the best that fits (5% · 15% · 30% · 50%+)
        </span>
      ) : (
        <span className="muted">Rank · among the planes that fit</span>
      )}
    </div>
  )
}
