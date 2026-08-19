// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LIBRARY_KEY, parseLibraryJson } from '@/composables/useStorage'
import type { Library } from '@/types'

const flush = () => new Promise((resolve) => setTimeout(resolve, 400))

/** Fresh module state per test: the store is a module-scope singleton. */
async function loadStore() {
  const module = await import('@/composables/useLibrary')
  return module
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  // The store is a module-scope singleton; each test needs it loaded fresh.
  vi.resetModules()
})

describe('library persistence', () => {
  it('seeds on first run and writes the seed to storage', async () => {
    const { useLibrary } = await loadStore()
    const { library } = useLibrary()

    expect(library.songs.length).toBeGreaterThan(0)
    expect(library.scales.map((s) => s.id)).toContain('c-major')

    const stored = parseLibraryJson(localStorage.getItem(LIBRARY_KEY) ?? '')
    expect(stored?.songs.map((s) => s.id)).toEqual(library.songs.map((s) => s.id))
  })

  it('autosaves mutations without an explicit save', async () => {
    const { useLibrary, createSong } = await loadStore()
    const { library } = useLibrary()

    const song = createSong('Ballad of the Windmill')
    song.phrases[0].notes.push({ note: 'C5' }, { note: 'D5' }, { note: 'E5' })

    await flush()

    const stored = parseLibraryJson(localStorage.getItem(LIBRARY_KEY) ?? '')
    const saved = stored?.songs.find((s) => s.id === song.id)
    expect(saved?.title).toBe('Ballad of the Windmill')
    expect(saved?.phrases[0].notes).toEqual([{ note: 'C5' }, { note: 'D5' }, { note: 'E5' }])
    expect(library.songs.map((s) => s.id)).toContain(song.id)
  })

  it('round-trips an export through import without loss', async () => {
    const { useLibrary, createSong, importLibrary } = await loadStore()
    const { library } = useLibrary()

    const song = createSong('Round trip')
    song.phrases[0].notes.push({ note: 'A4' }, { note: 'F6', dur: 8, dotted: true })
    const exported = JSON.stringify(library)

    library.songs.splice(0, library.songs.length)
    expect(library.songs).toHaveLength(0)

    const result = await importLibrary(new File([exported], 'library.json'), 'replace')
    expect(result.ok).toBe(true)
    expect(JSON.parse(JSON.stringify(library))).toEqual(JSON.parse(exported) as Library)
  })

  it('merges by song id, incoming wins', async () => {
    const { useLibrary, createSong, importLibrary } = await loadStore()
    const { library } = useLibrary()

    const song = createSong('Original')
    const incoming: Library = {
      version: 2,
      songs: [{ ...JSON.parse(JSON.stringify(song)), title: 'Replaced' }],
      scales: [],
    }
    const before = library.songs.length

    await importLibrary(new File([JSON.stringify(incoming)], 'lib.json'), 'merge')

    expect(library.songs).toHaveLength(before)
    expect(library.songs.find((s) => s.id === song.id)?.title).toBe('Replaced')
  })

  it('sets a corrupt payload aside instead of destroying it', async () => {
    localStorage.setItem(LIBRARY_KEY, '{ this is not json')
    const { useLibrary } = await loadStore()
    const { library } = useLibrary()

    expect(library.songs.length).toBeGreaterThan(0)
    const stashed = Object.keys(localStorage).filter((k) => k.startsWith('ocarina.library.corrupt.'))
    expect(stashed).toHaveLength(1)
  })

  it('drops unknown notes from an imported file rather than throwing', () => {
    const parsed = parseLibraryJson(
      JSON.stringify({
        version: 1,
        songs: [{ id: 'x', title: 'Hand edited', phrases: [{ id: 'p', notes: ['C5', 'Z9', 'D5'] }] }],
        scales: [],
      }),
    )
    expect(parsed?.songs[0].phrases[0].notes).toEqual([{ note: 'C5' }, { note: 'D5' }])
  })

  it('rejects a file that is neither a version 1 nor a version 2 library', () => {
    expect(parseLibraryJson(JSON.stringify({ version: 3, songs: [] }))).toBeNull()
    expect(parseLibraryJson('nonsense')).toBeNull()
  })
})

describe('per-song view preferences', () => {
  it('round-trips density and cards-per-row separately from the library', async () => {
    const { readCols, readDensity, writeCols, writeDensity } = await loadStore()

    expect(readDensity('seed-twinkle')).toBeNull()
    expect(readCols('seed-twinkle')).toBeNull()

    writeDensity('seed-twinkle', 4)
    writeCols('seed-twinkle', 5)

    expect(localStorage.getItem('ocarina.cols.seed-twinkle')).toBe('5')
    expect(readDensity('seed-twinkle')).toBe(4)
    expect(readCols('seed-twinkle')).toBe(5)
    // Another song keeps its own zoom.
    expect(readCols('seed-oot-1')).toBeNull()
  })

  it('falls back to the default when the stored value is junk', async () => {
    localStorage.setItem('ocarina.cols.seed-twinkle', 'wide please')
    const { readCols } = await loadStore()
    expect(readCols('seed-twinkle')).toBeNull()
  })
})

describe('finding and ordering songs', () => {
  it('filters on title and subtitle, and orders three ways', async () => {
    const { createSong, songsFiltered, useLibrary } = await loadStore()
    const { library } = useLibrary()
    library.songs.splice(0, library.songs.length)

    const zelda = createSong('Zelda\u2019s Lullaby')
    zelda.subtitle = 'harp arrangement'
    const storms = createSong('Song of Storms')
    storms.phrases[0].notes.push({ note: 'D5' }, { note: 'F5' }, { note: 'D6' })

    expect(songsFiltered('storms', 'recent').map((s) => s.id)).toEqual([storms.id])
    expect(songsFiltered('harp', 'recent').map((s) => s.id)).toEqual([zelda.id])
    expect(songsFiltered('', 'title').map((s) => s.title)).toEqual([
      'Song of Storms',
      'Zelda\u2019s Lullaby',
    ])
    expect(songsFiltered('', 'length')[0]?.id).toBe(storms.id)
  })

  it('counts notes without counting rests', async () => {
    const { createSong, noteCount } = await loadStore()
    const song = createSong('With a breath')
    song.phrases[0].notes.push({ note: 'C5' }, { note: null }, { note: 'D5' })
    expect(noteCount(song)).toBe(2)
  })

  it('names notes a song\u2019s instrument cannot play', async () => {
    const { createSong, outOfRange } = await loadStore()
    const song = createSong('Too high for a pendant')
    song.instrument = 'pendant-4'
    song.phrases[0].notes.push({ note: 'C5' }, { note: 'F6' })
    expect(outOfRange(song)).toEqual(['F6'])
  })
})

describe('import preview', () => {
  it('says what merging would add and what it would replace', async () => {
    const { createSong, previewImport, useLibrary } = await loadStore()
    const { library } = useLibrary()

    const existing = createSong('Already here')
    const incoming = JSON.stringify({
      version: 2,
      songs: [
        { ...JSON.parse(JSON.stringify(existing)), title: 'Already here, edited' },
        { id: 'brand-new', title: 'Brand new', phrases: [] },
      ],
      scales: [],
    })

    const preview = previewImport(incoming)
    expect(preview?.incoming).toBe(2)
    expect(preview?.overwritten).toEqual(['Already here'])
    expect(preview?.added).toEqual(['Brand new'])
    // Nothing has changed yet — a preview is only a look.
    expect(library.songs.find((s) => s.id === existing.id)?.title).toBe('Already here')
  })

  it('returns nothing for a file it cannot read', async () => {
    const { previewImport } = await loadStore()
    expect(previewImport('not json at all')).toBeNull()
  })
})

describe('export nagging', () => {
  it('counts edits since the last export and resets when one happens', async () => {
    const { createSong, exportLibrary, exportMeta } = await loadStore()

    createSong('Something worth keeping')
    await flush()
    expect(exportMeta.editsSinceExport).toBeGreaterThan(0)

    // jsdom-less environments have no download; the click is a no-op here.
    exportLibrary()
    expect(exportMeta.editsSinceExport).toBe(0)
    expect(exportMeta.lastExportAt).not.toBeNull()
  })
})

describe('the shipped seed library', () => {
  it('is data/ocarina-library.json, loaded on a first run', async () => {
    const shipped = (await import('../data/ocarina-library.json')).default
    const { useLibrary } = await loadStore()
    const { library } = useLibrary()

    expect(library.songs.map((s) => s.id)).toEqual(shipped.songs.map((s) => s.id))
    expect(library.songs.map((s) => s.title)).toContain('Song of Storms')
    // Its songs arrive with their notes, not as empty shells.
    expect(library.songs.every((s) => s.phrases.some((p) => p.notes.length > 0))).toBe(true)
  })

  it('tops an older install up with songs it has never held, then leaves it alone', async () => {
    const existing: Library = { version: 2, songs: [], scales: [] }
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(existing))

    const first = await loadStore()
    const shipped = (await import('../data/ocarina-library.json')).default
    expect(first.useLibrary().library.songs).toHaveLength(shipped.songs.length)

    // Deleting a topped-up song sticks: the top-up runs once per seed revision.
    first.deleteSong(shipped.songs[0].id)
    await flush()

    vi.resetModules()
    const second = await loadStore()
    expect(second.useLibrary().library.songs.map((s) => s.id)).not.toContain(shipped.songs[0].id)
  })

  it('resets back to the shipped library, dropping what the user added', async () => {
    const { useLibrary, createSong, resetToSeedLibrary, seedResetPreview } = await loadStore()
    const { library } = useLibrary()

    createSong('Mine alone')
    library.songs[0].title = 'Renamed a shipped song'

    expect(seedResetPreview().losing).toEqual(['Mine alone'])

    const result = resetToSeedLibrary()
    expect(result.ok).toBe(true)
    expect(library.songs.map((s) => s.title)).not.toContain('Mine alone')
    expect(library.songs.map((s) => s.title)).not.toContain('Renamed a shipped song')
    expect(library.scales.map((s) => s.id)).toContain('c-major')
  })
})
