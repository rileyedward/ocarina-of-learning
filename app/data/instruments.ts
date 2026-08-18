import { ALL_NOTES, FINGERINGS, NOTE_ORDER } from '@/data/fingerings'
import type { HoleKey, HoleSpec, Instrument, NoteId } from '@/types'

/**
 * Every instrument the app can draw. Geometry lives here rather than inside
 * `FingeringDiagram.vue` so the diagram is a pure function of instrument+note
 * and a new instrument is a data change, not a component change.
 *
 * The alto C table is the authoritative one and is defined in
 * `app/data/fingerings.ts`, checked against a published chart by
 * `tests/fingerings.test.ts`. The pendant tables are community transcriptions
 * and say so — `verified: false` puts a warning on screen.
 */

/* ------------------------------------------------------------------ alto C */

/**
 * Maker's-chart convention: two arced rows marching toward the beak, the holes
 * shrinking as they go. Left hand takes the upper row, right hand the lower.
 */
const ALTO_HOLES: HoleSpec[] = [
  { id: 'lhIndex', cx: 80, cy: 66, r: 11.5, group: 'front', label: 'left index', short: 'L1' },
  { id: 'lhMiddle', cx: 110, cy: 58, r: 11.5, group: 'front', label: 'left middle', short: 'L2' },
  { id: 'lhRing', cx: 140, cy: 60, r: 10.5, group: 'front', label: 'left ring', short: 'L3' },
  { id: 'lhPinky', cx: 167, cy: 68, r: 9.5, group: 'front', label: 'left little finger', short: 'L4' },
  { id: 'rhIndex', cx: 126, cy: 102, r: 9.5, group: 'front', label: 'right index', short: 'R1' },
  { id: 'rhMiddle', cx: 154, cy: 106, r: 9, group: 'front', label: 'right middle', short: 'R2' },
  { id: 'rhRing', cx: 180, cy: 110, r: 8.5, group: 'front', label: 'right ring', short: 'R3' },
  { id: 'rhPinky', cx: 204, cy: 112, r: 7.5, group: 'front', label: 'right little finger', short: 'R4' },
  { id: 'subA', cx: 222, cy: 96, r: 5.5, group: 'sub', label: 'first sub-hole', short: 'S1' },
  { id: 'subB', cx: 240, cy: 104, r: 5, group: 'sub', label: 'second sub-hole', short: 'S2' },
  { id: 'lhThumb', cx: 16, cy: 100, r: 13, group: 'thumb', label: 'left thumb', short: 'LT' },
  { id: 'rhThumb', cx: 120, cy: 180, r: 13, group: 'thumb', label: 'right thumb', short: 'RT' },
]

/** Mouthpiece, then the transverse "sweet potato" body tapering to the beak. */
const ALTO_BODY = [
  'M 226,84 L 284,100 Q 289,109 283,118 L 230,126 Z',
  'M 36,100 C 36,68 62,42 106,36 C 152,30 196,46 226,74 C 240,88 249,98 251,108 C 254,118 246,127 232,132 C 198,144 140,148 100,141 C 66,134 44,120 38,108 Z',
]

const altoFingerings = (): Record<string, HoleKey[]> =>
  Object.fromEntries(NOTE_ORDER.map((id) => [id, FINGERINGS[id].covered]))

const altoCaveats = () =>
  Object.fromEntries(
    ALL_NOTES.filter((n) => n.note).map((n) => [n.id, n.note as string]),
  ) as Partial<Record<NoteId, string>>

const alto = (
  id: string,
  name: string,
  blurb: string,
  sounding: number,
): Instrument => ({
  id,
  name,
  blurb,
  viewBox: '0 0 300 210',
  bodyPaths: ALTO_BODY,
  seamPath: 'M 52,92 C 58,64 84,50 112,50 C 148,50 192,66 222,90',
  rotate: -4,
  rotateAbout: [140, 95],
  holes: ALTO_HOLES,
  cues: [
    { text: 'LH', x: 86, y: 132 },
    { text: 'RH', x: 176, y: 138 },
  ],
  range: [...NOTE_ORDER],
  fingerings: altoFingerings(),
  caveats: altoCaveats(),
  sounding,
  verified: true,
})

/* ---------------------------------------------------------- 6-hole pendant */

/**
 * English pendant system: four finger holes on the front, two thumb holes on
 * the back. Holes open from the right end of the scale upward. Accidentals are
 * played by half-covering, which a filled/open diagram cannot show, so the
 * table is naturals only and says so.
 */
const P6_HOLES: HoleSpec[] = [
  { id: 'l1', cx: 108, cy: 84, r: 13, group: 'front', label: 'left index', short: 'L1' },
  { id: 'l2', cx: 148, cy: 78, r: 13, group: 'front', label: 'left middle', short: 'L2' },
  { id: 'r1', cx: 118, cy: 126, r: 11, group: 'front', label: 'right index', short: 'R1' },
  { id: 'r2', cx: 156, cy: 122, r: 10, group: 'front', label: 'right middle', short: 'R2' },
  { id: 'lThumb', cx: 32, cy: 108, r: 13, group: 'thumb', label: 'left thumb', short: 'LT' },
  { id: 'rThumb', cx: 118, cy: 186, r: 13, group: 'thumb', label: 'right thumb', short: 'RT' },
]

const P6_ALL: HoleKey[] = ['lThumb', 'rThumb', 'l1', 'l2', 'r1', 'r2']

/** Progressive opening, right end first, thumbs last. */
const P6_SEQUENCE: [NoteId, HoleKey[]][] = [
  ['C5', [...P6_ALL]],
  ['D5', ['lThumb', 'rThumb', 'l1', 'l2', 'r1']],
  ['E5', ['lThumb', 'rThumb', 'l1', 'l2']],
  ['F5', ['lThumb', 'l1', 'l2']],
  ['G5', ['lThumb', 'l1']],
  ['A5', ['lThumb']],
  ['B5', ['rThumb']],
  ['C6', []],
]

/* ---------------------------------------------------------- 4-hole pendant */

/**
 * The English school 4-hole: two finger holes and two thumb holes, a six-note
 * major hexachord. The instrument a lot of people meet first.
 */
const P4_HOLES: HoleSpec[] = [
  { id: 'l1', cx: 112, cy: 88, r: 15, group: 'front', label: 'left finger', short: 'L' },
  { id: 'r1', cx: 158, cy: 118, r: 13, group: 'front', label: 'right finger', short: 'R' },
  { id: 'lThumb', cx: 34, cy: 110, r: 14, group: 'thumb', label: 'left thumb', short: 'LT' },
  { id: 'rThumb', cx: 118, cy: 186, r: 14, group: 'thumb', label: 'right thumb', short: 'RT' },
]

const P4_SEQUENCE: [NoteId, HoleKey[]][] = [
  ['C5', ['lThumb', 'rThumb', 'l1', 'r1']],
  ['D5', ['lThumb', 'rThumb', 'l1']],
  ['E5', ['lThumb', 'l1']],
  ['F5', ['lThumb', 'r1']],
  ['G5', ['lThumb']],
  ['A5', []],
]

const PENDANT_BODY = [
  'M 60,110 C 60,58 100,26 148,26 C 196,26 232,60 232,108 C 232,150 198,178 148,178 C 98,178 60,152 60,110 Z',
]

const pendant = (
  id: string,
  name: string,
  blurb: string,
  holes: HoleSpec[],
  sequence: [NoteId, HoleKey[]][],
): Instrument => ({
  id,
  name,
  blurb,
  viewBox: '0 0 300 210',
  bodyPaths: [
    ...PENDANT_BODY,
    // Beak, off the right shoulder.
    'M 214,66 L 268,72 Q 274,82 268,92 L 218,98 Z',
  ],
  seamPath: 'M 74,96 C 84,58 118,40 152,40 C 190,40 218,64 226,98',
  holes,
  cues: [
    { text: 'LH', x: 86, y: 152 },
    { text: 'RH', x: 178, y: 156 },
  ],
  range: sequence.map(([note]) => note),
  fingerings: Object.fromEntries(sequence),
  verified: false,
  caveat:
    'Community transcription. Pendant systems differ between makers, and accidentals are played by half-covering a hole, which this diagram cannot draw. Trust the chart that came with your ocarina.',
})

/* -------------------------------------------------------------- the roster */

export const INSTRUMENTS: Instrument[] = [
  alto('alto-c-12', '12-hole alto C', 'The default. 21 notes, A4 to F6, fully chromatic.', 0),
  alto('soprano-c-12', '12-hole soprano C', 'Same fingerings as the alto, sounding an octave higher.', 12),
  alto('bass-c-12', '12-hole bass C', 'Same fingerings as the alto, sounding an octave lower.', -12),
  pendant('pendant-6', '6-hole pendant', 'English system. Naturals from C5 to C6.', P6_HOLES, P6_SEQUENCE),
  pendant('pendant-4', '4-hole pendant', 'English school ocarina. Six notes, C5 to A5.', P4_HOLES, P4_SEQUENCE),
]

export const DEFAULT_INSTRUMENT_ID = 'alto-c-12'

export const getInstrument = (id: string | undefined): Instrument =>
  INSTRUMENTS.find((i) => i.id === id) ?? INSTRUMENTS[0]!

export const isInstrumentId = (id: string): boolean => INSTRUMENTS.some((i) => i.id === id)

/** Notes this instrument can actually play. Everything else is out of range. */
export const playable = (instrument: Instrument, note: NoteId): boolean =>
  note in instrument.fingerings

export const coveredFor = (instrument: Instrument, note: NoteId): HoleKey[] =>
  instrument.fingerings[note] ?? []

/** Sub-holes only matter where a note actually uses one. */
export const usesGroup = (instrument: Instrument, note: NoteId, group: HoleSpec['group']): boolean => {
  const ids = new Set(instrument.holes.filter((h) => h.group === group).map((h) => h.id))
  return coveredFor(instrument, note).some((h) => ids.has(h))
}

/**
 * A spoken description of a fingering, for `aria-label` and tooltips.
 * "A4 — cover left index, left middle … and both sub-holes."
 */
export function describeFingering(instrument: Instrument, note: NoteId, label: string): string {
  const covered = new Set(coveredFor(instrument, note))
  const names = instrument.holes.filter((h) => covered.has(h.id)).map((h) => h.label)
  if (names.length === 0) return `${label} — every hole open.`
  if (names.length === instrument.holes.length) return `${label} — every hole covered.`
  return `${label} — cover ${names.join(', ')}. Everything else open.`
}

/** Which holes change between two fingerings. The hard part of playing. */
export function transition(
  instrument: Instrument,
  from: NoteId | null | undefined,
  to: NoteId,
): { lift: Set<HoleKey>; press: Set<HoleKey> } {
  const lift = new Set<HoleKey>()
  const press = new Set<HoleKey>()
  if (!from || !playable(instrument, from) || !playable(instrument, to)) return { lift, press }

  const before = new Set(coveredFor(instrument, from))
  const after = new Set(coveredFor(instrument, to))
  for (const hole of instrument.holes) {
    if (before.has(hole.id) && !after.has(hole.id)) lift.add(hole.id)
    if (!before.has(hole.id) && after.has(hole.id)) press.add(hole.id)
  }
  return { lift, press }
}

/** Every note whose fingering is exactly this set of holes. Reverse lookup. */
export function notesForHoles(instrument: Instrument, holes: Iterable<HoleKey>): NoteId[] {
  const wanted = [...new Set(holes)].sort().join('|')
  return instrument.range.filter(
    (id) => [...new Set(coveredFor(instrument, id))].sort().join('|') === wanted,
  )
}
