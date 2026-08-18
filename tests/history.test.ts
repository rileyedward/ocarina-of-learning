// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { useHistory } from '@/composables/useHistory'

/**
 * `useHistory` hooks `onBeforeUnmount`, so it has to run inside a component.
 * This harness is the smallest one that gives it a lifecycle.
 */
function harness() {
  const state = ref<{ notes: string[] }>({ notes: [] })
  let api: ReturnType<typeof useHistory<{ notes: string[] }>> | null = null

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useHistory<{ notes: string[] }>(
          () => JSON.parse(JSON.stringify(state.value)),
          (value) => {
            state.value = value
          },
          5,
        )
        api.prime()
        return () => h('div')
      },
    }),
  )

  return { state, history: api!, wrapper }
}

/** Records land on a debounce; 0 asks for one immediately. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 10))

describe('undo and redo', () => {
  it('walks back through edits and forward again', async () => {
    const { state, history } = harness()

    state.value.notes.push('C5')
    history.record(0)
    await settle()

    state.value.notes.push('D5')
    history.record(0)
    await settle()

    expect(history.canUndo.value).toBe(true)
    history.undo()
    await settle()
    expect(state.value.notes).toEqual(['C5'])

    history.undo()
    await settle()
    expect(state.value.notes).toEqual([])
    expect(history.canUndo.value).toBe(false)

    history.redo()
    await settle()
    expect(state.value.notes).toEqual(['C5'])
  })

  it('coalesces a burst of edits into one step', async () => {
    const { state, history } = harness()

    state.value.notes.push('C5')
    history.record(50)
    state.value.notes.push('D5')
    history.record(50)
    state.value.notes.push('E5')
    history.record(50)
    await new Promise((resolve) => setTimeout(resolve, 80))

    history.undo()
    await settle()
    expect(state.value.notes).toEqual([])
  })

  it('drops the oldest step once the cap is reached', async () => {
    const { state, history } = harness()

    for (const note of ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5']) {
      state.value.notes.push(note)
      history.record(0)
      await settle()
    }

    // Cap is 5 snapshots, so only the last four undos are available.
    let undos = 0
    while (history.undo()) {
      undos += 1
      await settle()
    }
    expect(undos).toBe(4)
    expect(state.value.notes.length).toBeGreaterThan(0)
  })

  it('redo is dropped once a new edit is made', async () => {
    const { state, history } = harness()

    state.value.notes.push('C5')
    history.record(0)
    await settle()

    history.undo()
    await settle()
    expect(history.canRedo.value).toBe(true)

    state.value.notes.push('G5')
    history.record(0)
    await settle()
    expect(history.canRedo.value).toBe(false)
  })
})
