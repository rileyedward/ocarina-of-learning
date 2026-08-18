import { computed, onBeforeUnmount, ref } from 'vue'

/**
 * Undo for the editor. The editor autosaves and has no save button, so without
 * this a mis-tapped ✕ on a forty-note phrase is simply gone.
 *
 * Snapshots are JSON copies of the song, taken on a short debounce so a run of
 * appended notes collapses into one step rather than twenty.
 */
export function useHistory<T>(read: () => T, write: (value: T) => void, limit = 50) {
  const past = ref<string[]>([])
  const future = ref<string[]>([])
  /** Suppresses the recording that a restore would otherwise trigger. */
  let applying = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const snapshot = (): string => JSON.stringify(read())

  /** Seed with the state as it was found, so the first edit has a way back. */
  function prime(): void {
    past.value = [snapshot()]
    future.value = []
  }

  function commit(): void {
    if (applying) return
    const next = snapshot()
    if (past.value[past.value.length - 1] === next) return
    past.value.push(next)
    if (past.value.length > limit) past.value.shift()
    future.value = []
  }

  /** Call on every mutation. Coalesces bursts into a single undo step. */
  function record(delay = 400): void {
    if (applying) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(commit, delay)
  }

  function apply(json: string): void {
    applying = true
    write(JSON.parse(json) as T)
    // Let the write settle before recording resumes, or the restore records itself.
    setTimeout(() => {
      applying = false
    }, 0)
  }

  function undo(): boolean {
    if (timer) {
      clearTimeout(timer)
      commit()
    }
    if (past.value.length < 2) return false
    const current = past.value.pop()
    if (current) future.value.push(current)
    const previous = past.value[past.value.length - 1]
    if (!previous) return false
    apply(previous)
    return true
  }

  function redo(): boolean {
    const next = future.value.pop()
    if (!next) return false
    past.value.push(next)
    apply(next)
    return true
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })

  return {
    prime,
    record,
    undo,
    redo,
    canUndo: computed(() => past.value.length > 1),
    canRedo: computed(() => future.value.length > 0),
  }
}
