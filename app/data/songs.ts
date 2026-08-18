import { seq } from '@/utils/noteText'
import type { Song } from '@/types'

const SEEDED_AT = '2026-08-12T00:00:00.000Z'

const song = (
  id: string,
  title: string,
  subtitle: string,
  phrases: Song['phrases'],
): Song => ({ id, title, subtitle, phrases, createdAt: SEEDED_AT, updatedAt: SEEDED_AT })

/**
 * Titled shells for the Ocarina of Time melodies. Those are copyrighted
 * compositions, so the notes are left for the user to enter from whatever
 * arrangement they're working from — which doubles as the editor's shakedown.
 */
const OOT_TITLES = [
  'Song of Storms',
  "Zelda's Lullaby",
  "Epona's Song",
  "Saria's Song",
  "Sun's Song",
  'Song of Time',
]

const ootShells: Song[] = OOT_TITLES.map((title, i) =>
  song(`seed-oot-${i + 1}`, title, 'Add the notes from your arrangement', [
    { id: `seed-oot-${i + 1}-p1`, label: 'opening', notes: [] },
  ]),
)

/**
 * Public domain, sits comfortably in range, phrases naturally — and carries
 * note values, so a fresh install has something to show in staff view.
 */
const twinkle: Song = song(
  'seed-twinkle',
  'Twinkle Twinkle Little Star',
  'Traditional · public domain · a gentle first run',
  [
    { id: 'seed-twinkle-p1', label: 'twinkle twinkle little star', notes: seq('C5/4 C5/4 G5/4 G5/4 A5/4 A5/4 G5/2') },
    { id: 'seed-twinkle-p2', label: 'how I wonder what you are', notes: seq('F5/4 F5/4 E5/4 E5/4 D5/4 D5/4 C5/2') },
    { id: 'seed-twinkle-p3', label: 'up above the world so high', notes: seq('G5/4 G5/4 F5/4 F5/4 E5/4 E5/4 D5/2') },
    { id: 'seed-twinkle-p4', label: 'like a diamond in the sky', notes: seq('G5/4 G5/4 F5/4 F5/4 E5/4 E5/4 D5/2') },
    { id: 'seed-twinkle-p5', label: 'twinkle twinkle little star', notes: seq('C5/4 C5/4 G5/4 G5/4 A5/4 A5/4 G5/2') },
    { id: 'seed-twinkle-p6', label: 'how I wonder what you are', notes: seq('F5/4 F5/4 E5/4 E5/4 D5/4 D5/4 C5/2') },
  ],
)

export const SEED_SONGS: Song[] = [twinkle, ...ootShells]
