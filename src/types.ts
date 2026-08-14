/** The 12 holes. `sub*` are the two small sub-holes; `*Thumb` are on the underside. */
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

export interface Phrase {
  id: string
  /** Optional user label, e.g. "opening", "the fast bit". */
  label?: string
  notes: NoteId[]
}

export interface Song {
  id: string
  title: string
  /** Free text — arrangement source, difficulty, whatever. Single field, not a feature. */
  subtitle?: string
  phrases: Phrase[]
  createdAt: string
  updatedAt: string
}

export interface Scale {
  id: string
  name: string
  /** Flat list. Scales are not phrased. */
  notes: NoteId[]
}

export interface Library {
  version: 1
  songs: Song[]
  scales: Scale[]
}
