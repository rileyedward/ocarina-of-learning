import { LIBRARY_KEY, SEED_REV_KEY } from '@/composables/useStorage'
import { SEED_SCALES } from '@/data/scales'
import { seq } from '@/utils/noteText'
import type { Library, Song } from '@/types'

const SEEDED_AT = '2026-08-12T00:00:00.000Z'

const song = (id: string, title: string, subtitle: string, phrases: Song['phrases']): Song => ({
  id,
  title,
  subtitle,
  phrases,
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
})

/**
 * A fixed library for the screen tests: empty shells to type into and one song
 * with note values. The app ships whatever `data/ocarina-library.json` holds,
 * which changes whenever a new export is dropped in — the screens are tested
 * against this instead so a new export never rewrites the assertions.
 */
export const FIXTURE_LIBRARY: Library = {
  version: 2,
  songs: [
    song('seed-twinkle', 'Twinkle Twinkle Little Star', 'Traditional · public domain', [
      { id: 'seed-twinkle-p1', label: 'twinkle twinkle little star', notes: seq('C5/4 C5/4 G5/4 G5/4 A5/4 A5/4 G5/2') },
      { id: 'seed-twinkle-p2', label: 'how I wonder what you are', notes: seq('F5/4 F5/4 E5/4 E5/4 D5/4 D5/4 C5/2') },
      { id: 'seed-twinkle-p3', label: 'up above the world so high', notes: seq('G5/4 G5/4 F5/4 F5/4 E5/4 E5/4 D5/2') },
      { id: 'seed-twinkle-p4', label: 'like a diamond in the sky', notes: seq('G5/4 G5/4 F5/4 F5/4 E5/4 E5/4 D5/2') },
      { id: 'seed-twinkle-p5', label: 'twinkle twinkle little star', notes: seq('C5/4 C5/4 G5/4 G5/4 A5/4 A5/4 G5/2') },
      { id: 'seed-twinkle-p6', label: 'how I wonder what you are', notes: seq('F5/4 F5/4 E5/4 E5/4 D5/4 D5/4 C5/2') },
    ]),
    ...['Song of Storms', "Zelda's Lullaby", "Epona's Song"].map((title, i) =>
      song(`seed-oot-${i + 1}`, title, 'Add the notes from your arrangement', [
        { id: `seed-oot-${i + 1}-p1`, label: 'opening', notes: [] },
      ]),
    ),
  ],
  scales: SEED_SCALES,
}

/** Put the fixture where the store will find it, and mark the seed as seen. */
export function installFixtureLibrary(): void {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(FIXTURE_LIBRARY))
  localStorage.setItem(SEED_REV_KEY, '999')
}
