import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Practice happens with both hands on the instrument, so nothing touches the
 * screen for minutes at a time and it sleeps mid-phrase. A wake lock is the
 * whole fix. Unsupported browsers get a silent no-op — there is nothing useful
 * to say to someone whose browser cannot do it.
 *
 * The lock is dropped by the browser whenever the tab is hidden, so it has to
 * be taken again on the way back.
 */
export function useWakeLock() {
  const held = ref(false)
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  let sentinel: WakeLockSentinel | null = null

  async function request(): Promise<void> {
    if (!supported || sentinel) return
    try {
      sentinel = await navigator.wakeLock.request('screen')
      held.value = true
      sentinel.addEventListener('release', () => {
        held.value = false
        sentinel = null
      })
    } catch {
      held.value = false
    }
  }

  async function release(): Promise<void> {
    try {
      await sentinel?.release()
    } catch {
      // Already gone; nothing to do.
    }
    sentinel = null
    held.value = false
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') void request()
  }

  onMounted(() => {
    void request()
    document.addEventListener('visibilitychange', onVisibility)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    void release()
  })

  return { held, supported, request, release }
}
