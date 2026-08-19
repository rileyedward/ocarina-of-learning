import { parseLibrary } from '@/composables/useStorage'
import libraryExport from '~~/data/ocarina-library.json'
import type { Scale, Song } from '@/types'

/**
 * What a fresh install starts with is a real export: `data/ocarina-library.json`,
 * the file the Export button writes. Dropping a newer export in there — and
 * bumping SEED_REV in useLibrary so existing installs pick the additions up —
 * is the whole of updating the shipped library.
 *
 * It goes through the same parser as an imported file, so a hand-edited seed
 * degrades exactly the way an imported one does instead of bricking first run.
 */
const seeded = parseLibrary(libraryExport)

if (!seeded) console.warn('data/ocarina-library.json is not a readable library; shipping empty.')

export const SEED_SONGS: Song[] = seeded?.songs ?? []

/** Scales carried by the export. Merged over the built-in ones, never replacing them. */
export const SEED_EXPORT_SCALES: Scale[] = seeded?.scales ?? []
