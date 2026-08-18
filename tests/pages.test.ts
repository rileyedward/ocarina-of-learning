// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { RouterView, createRouter, createWebHistory } from 'vue-router'

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
  { path: '/reference', component: () => import('@/pages/reference.vue') },
  { path: '/scales', component: () => import('@/pages/scales/index.vue') },
  { path: '/scales/:id', component: () => import('@/pages/scales/[id].vue') },
  { path: '/song/new', component: () => import('@/pages/song/new.vue') },
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
})

describe('screens render', () => {
  it('library lists the seeded songs', async () => {
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
    await wrapper.findAll('button')[1].trigger('click')
    expect(wrapper.findAll('figure')).toHaveLength(13)
  })

  it('scales list and detail render every note at once', async () => {
    const list = await visit('/scales')
    expect(list.text()).toContain('C major (extended)')

    const detail = await visit('/scales/chromatic')
    expect(detail.findAll('figure')).toHaveLength(21)
  })

  it('practice view paginates phrases by density', async () => {
    const wrapper = await visit('/song/seed-twinkle')
    expect(wrapper.text()).toContain('Twinkle Twinkle Little Star')
    // Default density is 2 of 6 phrases.
    expect(wrapper.text()).toContain('Page 1 of 3')
    expect(wrapper.findAll('figure')).toHaveLength(14)

    const allButton = wrapper.findAll('button').find((b) => b.text() === 'All')
    await allButton?.trigger('click')
    expect(wrapper.findAll('figure')).toHaveLength(42)
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
    expect(findSong('seed-oot-1')?.phrases[0].notes).toEqual(['A4'])
  })

  it('adding a phrase focuses it so the picker keeps filling', async () => {
    const wrapper = await visit('/song/seed-oot-2/edit')
    const addPhrase = wrapper.findAll('button').find((b) => b.text().includes('Add phrase'))
    await addPhrase?.trigger('click')

    const { findSong } = await import('@/composables/useLibrary')
    const song = findSong('seed-oot-2')
    expect(song?.phrases).toHaveLength(2)

    await wrapper.findAll('[title^="C5"]')[0].trigger('click')
    expect(song?.phrases[1].notes).toEqual(['C5'])
    expect(song?.phrases[0].notes).toEqual([])
  })
})
