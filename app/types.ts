/**
 * The 12 holes of the alto C instrument. `sub*` are the two small sub-holes;
 * `*Thumb` are on the underside.
 *
 * Other instruments (6-hole and 4-hole pendants) carry their own hole ids —
 * see `HoleKey`. This union stays exact so the alto C table, which is the
 * authoritative one, cannot be typo'd.
 */
export type HoleId =
  | 'lhIndex'
  | 'lhMiddle'
  | 'lhRing'
  | 'lhPinky'
  | 'rhIndex'
  | 'rhMiddle'
  | 'rhRing'
  | 'rhPinky'
  | 'lhThumb'
  | 'rhThumb'
  | 'subA'
  | 'subB'

/** Any instrument's hole id. The alto C ids are the exhaustively typed subset. */
export type HoleKey = HoleId | (string & {})

/** Scientific pitch notation. The complete playable set — 21 notes, A4 to F6. */
export type NoteId =
  | 'A4'
  | 'Bb4'
  | 'B4'
  | 'C5'
  | 'Db5'
  | 'D5'
  | 'Eb5'
  | 'E5'
  | 'F5'
  | 'Gb5'
  | 'G5'
  | 'Ab5'
  | 'A5'
  | 'Bb5'
  | 'B5'
  | 'C6'
  | 'Db6'
  | 'D6'
  | 'Eb6'
  | 'E6'
  | 'F6'

export interface Note {
  id: NoteId
  /** Display label, e.g. "A", "B♭", "D♯". Octave is shown separately/smaller. */
  letter: string
  octave: 4 | 5 | 6
  /** Enharmonic alternative for display, e.g. Db5 -> "C♯". */
  altLetter?: string
  /** Holes that are COVERED. Everything else is open. */
  covered: HoleId[]
  /** Rendered as a caveat under the diagram when present. */
  note?: string
}

/** One hole's position on an instrument's diagram, plus how to say its name. */
export interface HoleSpec {
  id: HoleKey
  cx: number
  cy: number
  r: number
  /** `thumb` holes are drawn off the body; `sub` holes dim when unused. */
  group: 'front' | 'sub' | 'thumb'
  /** Spoken name, e.g. "left ring". Used by tooltips and screen readers. */
  label: string
  /** Short caption painted beside the hole when labels are switched on. */
  short: string
}

/**
 * An instrument the app can draw and chart. Geometry and fingerings travel
 * together so the diagram is a pure function of the instrument plus a note.
 */
export interface Instrument {
  id: string
  name: string
  /** One-line description for the picker. */
  blurb: string
  viewBox: string
  /** Body outline paths, drawn under the holes. */
  bodyPaths: string[]
  /** Optional seam line, purely decorative. */
  seamPath?: string
  /** Rotation applied to the body group, degrees, around `rotateAbout`. */
  rotate?: number
  rotateAbout?: [number, number]
  holes: HoleSpec[]
  /** Hand cues drawn in the empty bands, e.g. LH / RH. */
  cues?: { text: string; x: number; y: number }[]
  /** Playable notes, low to high. */
  range: NoteId[]
  /** noteId -> covered holes. */
  fingerings: Record<string, HoleKey[]>
  /** Per-note caveats, keyed by note id. */
  caveats?: Partial<Record<NoteId, string>>
  /** Semitones this instrument sounds away from the written pitch. */
  sounding?: number
  /**
   * False when the table is a community transcription rather than one checked
   * against a published chart line by line. Surfaced in the UI.
   */
  verified: boolean
  /** Instrument-wide caveat, shown above the chart. */
  caveat?: string
}

/** Note values, as denominators: 1 = semibreve, 4 = crotchet, 16 = semiquaver. */
export type Duration = 1 | 2 | 4 | 8 | 16

/**
 * One event in a phrase. `note: null` is a rest. `dur` is optional — a song
 * that never sets one behaves exactly as songs did before durations existed.
 */
export interface PhraseNote {
  note: NoteId | null
  dur?: Duration
  dotted?: boolean
}

/** How solid a phrase feels. Drives the practice screen's filter. */
export type PhraseStatus = 'new' | 'shaky' | 'learned'

export interface Phrase {
  id: string
  /** Optional user label, e.g. "opening", "the fast bit". */
  label?: string
  notes: PhraseNote[]
  /** Play it through N times. Absent or 1 means once. */
  repeat?: number
  status?: PhraseStatus
}

export interface Song {
  id: string
  title: string
  /** Free text — arrangement source, difficulty, whatever. Single field, not a feature. */
  subtitle?: string
  phrases: Phrase[]
  /** Instrument id. Absent means the default, alto C 12-hole. */
  instrument?: string
  createdAt: string
  updatedAt: string
}

export interface Scale {
  id: string
  name: string
  /** Flat list. Scales are not phrased. */
  notes: NoteId[]
  /** Seeded scales can be edited, but they are marked so they read as shipped. */
  seeded?: boolean
}

export interface Library {
  version: 2
  songs: Song[]
  scales: Scale[]
}
