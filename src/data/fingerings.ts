import type { HoleId, Note, NoteId } from '@/types'

/**
 * Authoritative fingering table for the common 12-hole alto C ocarina.
 * Reference data, not user data — never editable, never persisted.
 *
 * `covered` = holes sealed. Everything else is open.
 * More holes covered = lower pitch.
 */

/** Canonical hole order, used to keep every `covered` list comparable. */
export const HOLE_ORDER: HoleId[] = [
  'lhThumb',
  'rhThumb',
  'lhIndex',
  'lhMiddle',
  'lhRing',
  'lhPinky',
  'rhIndex',
  'rhMiddle',
  'rhRing',
  'rhPinky',
  'subA',
  'subB',
]

const sort = (holes: HoleId[]): HoleId[] =>
  [...new Set(holes)].sort((a, b) => HOLE_ORDER.indexOf(a) - HOLE_ORDER.indexOf(b))

const minus = (base: HoleId[], ...drop: HoleId[]): HoleId[] =>
  sort(base.filter((h) => !drop.includes(h)))

const plus = (base: HoleId[], ...add: HoleId[]): HoleId[] => sort([...base, ...add])

const LH4: HoleId[] = ['lhIndex', 'lhMiddle', 'lhRing', 'lhPinky']
const RH4: HoleId[] = ['rhIndex', 'rhMiddle', 'rhRing', 'rhPinky']
const THUMBS: HoleId[] = ['lhThumb', 'rhThumb']

/** C5 — home position: all 8 finger holes + both thumbs, sub-holes open. */
const HOME: HoleId[] = sort([...LH4, ...RH4, ...THUMBS])

const LH_NO_RING: HoleId[] = ['lhIndex', 'lhMiddle', 'lhPinky']
const LH_INDEX_PINKY: HoleId[] = ['lhIndex', 'lhPinky']

const MAKER_CAVEAT =
  'Cross-fingering — varies by maker. Some close the left index instead of the right ring. Trust the chart that came with your ocarina.'

export const FINGERINGS: Record<NoteId, Note> = {
  A4: { id: 'A4', letter: 'A', octave: 4, covered: plus(HOME, 'subA', 'subB') },
  Bb4: { id: 'Bb4', letter: 'B♭', altLetter: 'A♯', octave: 4, covered: plus(HOME, 'subA') },
  B4: { id: 'B4', letter: 'B', octave: 4, covered: plus(HOME, 'subB') },

  C5: { id: 'C5', letter: 'C', octave: 5, covered: HOME, note: 'Home position.' },
  Db5: {
    id: 'Db5',
    letter: 'D♭',
    altLetter: 'C♯',
    octave: 5,
    covered: plus(minus(HOME, 'rhPinky'), 'subB'),
  },
  D5: { id: 'D5', letter: 'D', octave: 5, covered: minus(HOME, 'rhPinky') },
  Eb5: {
    id: 'Eb5',
    letter: 'E♭',
    altLetter: 'D♯',
    octave: 5,
    covered: plus(minus(HOME, 'rhPinky', 'rhRing'), 'subB'),
  },
  E5: { id: 'E5', letter: 'E', octave: 5, covered: minus(HOME, 'rhPinky', 'rhRing') },
  F5: { id: 'F5', letter: 'F', octave: 5, covered: minus(HOME, 'rhPinky', 'rhRing', 'rhMiddle') },
  Gb5: {
    id: 'Gb5',
    letter: 'G♭',
    altLetter: 'F♯',
    octave: 5,
    covered: sort([...LH4, ...THUMBS, 'rhRing']),
  },
  G5: { id: 'G5', letter: 'G', octave: 5, covered: sort([...LH4, ...THUMBS]) },
  Ab5: {
    id: 'Ab5',
    letter: 'A♭',
    altLetter: 'G♯',
    octave: 5,
    covered: sort([...LH_NO_RING, ...THUMBS, 'rhRing']),
  },
  A5: { id: 'A5', letter: 'A', octave: 5, covered: sort([...LH_NO_RING, ...THUMBS]) },
  Bb5: {
    id: 'Bb5',
    letter: 'B♭',
    altLetter: 'A♯',
    octave: 5,
    covered: sort([...LH_INDEX_PINKY, ...THUMBS, 'rhRing']),
  },
  B5: { id: 'B5', letter: 'B', octave: 5, covered: sort([...LH_INDEX_PINKY, ...THUMBS]) },

  C6: { id: 'C6', letter: 'C', octave: 6, covered: sort(['lhPinky', ...THUMBS]) },
  Db6: {
    id: 'Db6',
    letter: 'D♭',
    altLetter: 'C♯',
    octave: 6,
    covered: sort(['lhPinky', 'rhThumb', 'rhRing']),
    note: MAKER_CAVEAT,
  },
  D6: { id: 'D6', letter: 'D', octave: 6, covered: sort(['lhPinky', 'rhThumb']) },
  Eb6: {
    id: 'Eb6',
    letter: 'E♭',
    altLetter: 'D♯',
    octave: 6,
    covered: sort(['lhPinky', 'rhRing']),
    note: MAKER_CAVEAT,
  },
  E6: { id: 'E6', letter: 'E', octave: 6, covered: ['lhPinky'] },
  F6: { id: 'F6', letter: 'F', octave: 6, covered: [], note: 'Everything open — the top note.' },
}

/** The single source of note ordering, low to high. */
export const NOTE_ORDER: NoteId[] = [
  'A4',
  'Bb4',
  'B4',
  'C5',
  'Db5',
  'D5',
  'Eb5',
  'E5',
  'F5',
  'Gb5',
  'G5',
  'Ab5',
  'A5',
  'Bb5',
  'B5',
  'C6',
  'Db6',
  'D6',
  'Eb6',
  'E6',
  'F6',
]

export const ALL_NOTES: Note[] = NOTE_ORDER.map((id) => FINGERINGS[id])

export const getNote = (id: NoteId): Note => FINGERINGS[id]

export const isNoteId = (value: string): value is NoteId => value in FINGERINGS

/** Naturals have no accidental in their display letter. */
export const isNatural = (id: NoteId): boolean => !FINGERINGS[id].letter.includes('♭')

/**
 * Sub-holes only do anything for the bottom three notes. Everywhere else they
 * are open and irrelevant, so the diagram dims them.
 */
export const usesSubholes = (id: NoteId): boolean =>
  FINGERINGS[id].covered.some((h) => h === 'subA' || h === 'subB')
