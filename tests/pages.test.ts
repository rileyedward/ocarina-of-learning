// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterView, createRouter, createWebHistory } from 'vue-router'
import { installFixtureLibrary } from './fixtures/seedLibrary'

/**
 * Smoke tests: mount every screen through a real router. Templates are only
 * compiled, not executed, by the build — these catch what a build would miss.
 *
 * The table below mirrors what Nuxt derives from `app/pages/`. Add a page,
 * add a line. Pages load lazily, as Nuxt loads them, so a page and the test
 * share one instance of the composables after `vi.resetModules()`.
 */
const ROUTES = [
  { path: '/', component: () => import('@/pages/index.vue') },
  { path: '/reference', component: () => import('@/pages/reference/index.vue') },
  { path: '/reference/lookup', component: () => import('@/pages/reference/lookup.vue') },
  { path: '/drill', component: () => import('@/pages/drill.vue') },
  { path: '/scales', component: () => import('@/pages/scales/index.vue') },
  { path: '/scales/:id', component: () => import('@/pages/scales/[id].vue') },
  { path: '/song/new', component: () => import('@/pages/song/new.vue') },
  { path: '/song/shared', component: () => import('@/pages/song/shared.vue') },
  { path: '/song/:id', component: () => import('@/pages/song/[id]/index.vue') },
  { path: '/song/:id/edit', component: () => import('@/pages/song/[id]/edit.vue') },
]

async function visit(path: string) {
  const router = createRouter({ history: createWebHistory(), routes: ROUTES })
  await router.push(path)
  await router.isReady()

  const errors: unknown[] = []
  const wrapper = mount(RouterView, {
    global: {
      plugins: [router],
      config: { errorHandler: (error: unknown) => errors.push(error) },
    },
    attachTo: document.body,
  })
  await vi.waitFor(() => expect(wrapper.html().length).toBeGreaterThan(50))
  expect(errors).toEqual([])
  return wrapper
}

beforeEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
  vi.resetModules()
  // Screens are tested against a fixed library, not the shipped export.
  installFixtureLibrary()
})

describe('screens render', () => {
  it('library lists the stored songs', async () => {
    const wrapper = await visit('/')
    expect(wrapper.text()).toContain('Twinkle Twinkle Little Star')
    expect(wrapper.text()).toContain('Song of Storms')
    expect(wrapper.text()).toContain('Export JSON')
  })

  it('reference shows all 21 notes and the maker caveat', async () => {
    const wrapper = await visit('/reference')
    expect(wrapper.findAll('figure')).toHaveLength(21)
    expect(wrapper.text()).toContain('vary by maker')
  })

  it('naturals filter drops the accidentals', async () => {
    const wrapper = await visit('/reference')
    const naturals = wrapper.findAll('button').find((b) => b.text() === 'Naturals only')
    await naturals?.trigger('click')
    expect(wrapper.findAll('figure')).toHaveLength(13)
  })

  it('reference finds a note by name', async () => {
    const wrapper = await visit('/reference')
    await wrapper.find('input[type="search"]').setValue('Eb')
    expect(wrapper.findAll('figure')).toHaveLength(2)
  })

  it('reverse lookup names the note a set of holes makes', async () => {
    const wrapper = await visit('/reference/lookup')
    expect(wrapper.text()).toContain('What note is this?')

    // Every hole covered is the bottom note.
    const coverAll = wrapper.findAll('button').find((b) => b.text() === 'Cover all')
    await coverAll?.trigger('click')
    expect(wrapper.findAll('figure')).toHaveLength(1)
    expect(wrapper.find('figure').text()).toContain('A')
  })

  it('drill hides the answer until it is asked for', async () => {
    const wrapper = await visit('/drill')
    expect(wrapper.text()).toContain('?')

    const reveal = wrapper.findAll('button').find((b) => b.text() === 'Reveal')
    await reveal?.trigger('click')
    expect(wrapper.text()).not.toContain('?')
  })

  it('scales list and detail render every note at once', async () => {
    const list = await visit('/scales')
    expect(list.text()).toContain('C major (extended)')

    const detail = await visit('/scales/chromatic')
    expect(detail.findAll('figure')).toHaveLength(21)
  })

  it('practice view marks a phrase learned and can hide it', async () => {
    const wrapper = await visit('/song/seed-twinkle')

    const status = wrapper.findAll('button').find((b) => b.text() === 'New')
    await status?.trigger('click')
    await status?.trigger('click')

    const { findSong } = await import('@/composables/useLibrary')
    expect(findSong('seed-twinkle')?.phrases[0].status).toBe('learned')
  })

  it('typed shorthand fills the focused phrase', async () => {
    const wrapper = await visit('/song/seed-oot-3/edit')

    const typeToggle = wrapper.findAll('button').find((b) => b.text() === 'Type notes')
    await typeToggle?.trigger('click')
    await wrapper.find('#note-text').setValue('c d e/8')

    const append = wrapper.findAll('button').find((b) => b.text() === 'Append')
    await append?.trigger('click')

    const { findSong } = await import('@/composables/useLibrary')
    expect(findSong('seed-oot-3')?.phrases[0].notes).toEqual([
      { note: 'C5' },
      { note: 'D5' },
      { note: 'E5', dur: 8 },
    ])
  })

  it('a shared link opens as a preview rather than saving itself', async () => {
    const { seq } = await import('@/utils/noteText')
    const { encodeSong } = await import('@/utils/shareLink')
    const payload = await encodeSong({
      id: 'from-a-friend',
      title: 'Ballad of the Wind Fish',
      phrases: [{ id: 'p1', notes: seq('C5 D5 E5') }],
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
    })
    const wrapper = await visit(`/song/shared#s=${payload}`)
    await vi.waitFor(() => expect(wrapper.text()).toContain('Ballad of the Wind Fish'))
    expect(wrapper.text()).toContain('not saved yet')

    const { library } = (await import('@/composables/useLibrary')).useLibrary()
    expect(library.songs.map((s) => s.id)).not.toContain('from-a-friend')
  })

  it('practice view paginates phrases by density', async () => {
    const wrapper = await visit('/song/seed-twinkle')
    expect(wrapper.text()).toContain('Twinkle Twinkle Little Star')
    // Default density is 2 of 6 phrases.
    expect(wrapper.text()).toContain('Page 1 of 3')
    expect(wrapper.findAll('.screen-only figure')).toHaveLength(14)

    const allButton = wrapper.findAll('button').find((b) => b.text() === 'All')
    await allButton?.trigger('click')
    expect(wrapper.findAll('.screen-only figure')).toHaveLength(42)

    // The print sheet is the whole song regardless of what the screen shows.
    expect(wrapper.findAll('.print-only figure')).toHaveLength(42)
  })

  it('practice view scales cards by cards-per-row and remembers it', async () => {
    const wrapper = await visit('/song/seed-twinkle')

    const section = wrapper.find<HTMLElement>('[style*="--card-cols"]')
    expect(section.attributes('style')).toContain('--card-cols: 3')

    const perRow = wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === '6 fingerings per row')
    await perRow?.trigger('click')

    expect(wrapper.find('[style*="--card-cols"]').attributes('style')).toContain('--card-cols: 6')
    expect(localStorage.getItem('ocarina.cols.seed-twinkle')).toBe('6')
  })

  it('editor appends picked notes to the focused phrase', async () => {
    const wrapper = await visit('/song/seed-oot-1/edit')
    const titleInput = wrapper.find<HTMLInputElement>('input[placeholder="Song title"]')
    expect(titleInput.element.value).toBe('Song of Storms')
    expect(wrapper.text()).toContain('Adding to:')

    const picker = wrapper.findAll('[title^="A4"]')
    expect(picker.length).toBeGreaterThan(0)
    await picker[0].trigger('click')

    const { findSong } = await import('@/composables/useLibrary')
    expect(findSong('seed-oot-1')?.phrases[0].notes).toEqual([{ note: 'A4' }])
  })

  it('adding a phrase focuses it so the picker keeps filling', async () => {
    const wrapper = await visit('/song/seed-oot-2/edit')
    const addPhrase = wrapper.findAll('button').find((b) => b.text().includes('Add phrase'))
    await addPhrase?.trigger('click')

    const { findSong } = await import('@/composables/useLibrary')
    const song = findSong('seed-oot-2')
    expect(song?.phrases).toHaveLength(2)

    await wrapper.findAll('[title^="C5"]')[0].trigger('click')
    expect(song?.phrases[1].notes).toEqual([{ note: 'C5' }])
    expect(song?.phrases[0].notes).toEqual([])
  })
})
