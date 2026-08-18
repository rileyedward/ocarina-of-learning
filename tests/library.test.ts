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
    song.phrases[0].notes.push('C5', 'D5', 'E5')

    await flush()

    const stored = parseLibraryJson(localStorage.getItem(LIBRARY_KEY) ?? '')
    const saved = stored?.songs.find((s) => s.id === song.id)
    expect(saved?.title).toBe('Ballad of the Windmill')
    expect(saved?.phrases[0].notes).toEqual(['C5', 'D5', 'E5'])
    expect(library.songs.map((s) => s.id)).toContain(song.id)
  })

  it('round-trips an export through import without loss', async () => {
    const { useLibrary, createSong, importLibrary } = await loadStore()
    const { library } = useLibrary()

    const song = createSong('Round trip')
    song.phrases[0].notes.push('A4', 'F6')
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
      version: 1,
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
    expect(parsed?.songs[0].phrases[0].notes).toEqual(['C5', 'D5'])
  })

  it('rejects a file that is not a version 1 library', () => {
    expect(parseLibraryJson(JSON.stringify({ version: 2, songs: [] }))).toBeNull()
    expect(parseLibraryJson('nonsense')).toBeNull()
  })
})
