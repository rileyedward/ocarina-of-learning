import { isNoteId } from '@/data/fingerings'
import type { Duration, NoteId, PhraseNote } from '@/types'

/**
 * Typing a melody is faster than clicking twenty diagrams. This parses the
 * shorthand people already use when they write a tune down:
 *
 *   c d e d c        naturals, octave carried forward from the last note
 *   bb4 f#5 Db6      accidentals either way round, explicit octave
 *   r  -             a rest
 *   c/8 f/4. r/2     note value after a slash, a dot for dotted
 *
 * Junk tokens are dropped rather than thrown on — the same degrade-don't-brick
 * rule the library importer follows.
 */

const DEFAULT_OCTAVE = 5

const DURATIONS: Duration[] = [1, 2, 4, 8, 16]

/** Flat-first spelling, matching the fingering table's note ids. */
const SHARP_TO_FLAT: Record<string, string> = {
  'A#': 'Bb',
  'C#': 'Db',
  'D#': 'Eb',
  'F#': 'Gb',
  'G#': 'Ab',
  'B#': 'C',
  'E#': 'F',
}

const NOTE_TOKEN = /^([a-gA-G])([#b♯♭]?)(\d?)$/
const REST_TOKEN = /^(r|rest|-)$/i

function toNoteId(letter: string, accidental: string, octave: number): NoteId | null {
  const upper = letter.toUpperCase()
  const flat = accidental === '♭' ? 'b' : accidental === '♯' ? '#' : accidental

  let name = upper
  if (flat === 'b') name = `${upper}b`
  if (flat === '#') name = SHARP_TO_FLAT[`${upper}#`] ?? `${upper}#`

  const id = `${name}${octave}`
  return isNoteId(id) ? (id as NoteId) : null
}

interface ParsedToken {
  note: PhraseNote | null
  /** The octave to carry into the next bare letter. */
  octave: number
}

function parseToken(raw: string, octave: number): ParsedToken {
  let body = raw
  let dotted = false
  let dur: Duration | undefined

  const slash = body.indexOf('/')
  if (slash !== -1) {
    let tail = body.slice(slash + 1)
    body = body.slice(0, slash)
    if (tail.endsWith('.')) {
      dotted = true
      tail = tail.slice(0, -1)
    }
    const value = Number(tail)
    if (DURATIONS.includes(value as Duration)) dur = value as Duration
  } else if (body.endsWith('.') && body.length > 1) {
    dotted = true
    body = body.slice(0, -1)
  }

  if (REST_TOKEN.test(body)) {
    return { note: { note: null, ...(dur ? { dur } : {}), ...(dotted ? { dotted } : {}) }, octave }
  }

  const match = NOTE_TOKEN.exec(body)
  if (!match) return { note: null, octave }

  const [, letter = '', accidental = '', digits = ''] = match
  const nextOctave = digits ? Number(digits) : octave
  const id = toNoteId(letter, accidental, nextOctave)
  if (!id) return { note: null, octave: digits ? nextOctave : octave }

  return {
    note: { note: id, ...(dur ? { dur } : {}), ...(dotted ? { dotted } : {}) },
    octave: nextOctave,
  }
}

/** Parse a shorthand melody. Unrecognised tokens are skipped. */
export function parseNoteText(text: string): PhraseNote[] {
  const tokens = text.split(/[\s,|]+/).filter(Boolean)
  const notes: PhraseNote[] = []
  let octave = DEFAULT_OCTAVE

  for (const token of tokens) {
    const parsed = parseToken(token, octave)
    octave = parsed.octave
    if (parsed.note) notes.push(parsed.note)
  }
  return notes
}

/** Count what a parse would drop, so the editor can say so. */
export function countUnparsed(text: string): number {
  const tokens = text.split(/[\s,|]+/).filter(Boolean)
  return tokens.length - parseNoteText(text).length
}

/** The inverse: the shorthand a phrase would be typed as. */
export function formatNoteText(notes: PhraseNote[]): string {
  return notes
    .map((n) => {
      const head = n.note ?? 'r'
      const tail = n.dur ? `/${n.dur}${n.dotted ? '.' : ''}` : n.dotted ? '.' : ''
      return `${head}${tail}`
    })
    .join(' ')
}

/** Shorthand for seed data and tests: `seq('C5 C5 G5')`. */
export const seq = (text: string): PhraseNote[] => parseNoteText(text)

/** Plain note ids, rests dropped. For scales, drills and range checks. */
export const noteIds = (notes: PhraseNote[]): NoteId[] =>
  notes.map((n) => n.note).filter((n): n is NoteId => n !== null)
