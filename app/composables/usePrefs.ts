import { reactive, watch } from 'vue'
import { DEFAULT_INSTRUMENT_ID, isInstrumentId } from '@/data/instruments'
import { PREFS_KEY, readRaw, writeRaw } from '@/composables/useStorage'

/**
 * View preferences that are not about any one song: how notes are drawn, how
 * they are spelled, which instrument an unassigned screen assumes. Per-song
 * density and columns stay where they are — those are about one song.
 */
export interface Prefs {
  enharmonic: 'flat' | 'sharp'
  notation: 'diagram' | 'staff' | 'both'
  defaultInstrument: string
  /** Seconds between automatic page turns on the practice screen. */
  autoTurnSeconds: number
  showHoleLabels: boolean
  transitionHints: boolean
  /** Hide phrases marked learned on the practice screen. */
  hideLearned: boolean
}

const DEFAULTS: Prefs = {
  enharmonic: 'flat',
  notation: 'diagram',
  defaultInstrument: DEFAULT_INSTRUMENT_ID,
  autoTurnSeconds: 8,
  showHoleLabels: false,
  transitionHints: true,
  hideLearned: false,
}

function load(): Prefs {
  const raw = readRaw(PREFS_KEY)
  if (!raw) return { ...DEFAULTS }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULTS }
    const value = parsed as Partial<Prefs>

    return {
      enharmonic: value.enharmonic === 'sharp' ? 'sharp' : 'flat',
      notation:
        value.notation === 'staff' || value.notation === 'both' ? value.notation : 'diagram',
      defaultInstrument:
        typeof value.defaultInstrument === 'string' && isInstrumentId(value.defaultInstrument)
          ? value.defaultInstrument
          : DEFAULT_INSTRUMENT_ID,
      autoTurnSeconds:
        typeof value.autoTurnSeconds === 'number' &&
        value.autoTurnSeconds >= 2 &&
        value.autoTurnSeconds <= 120
          ? value.autoTurnSeconds
          : DEFAULTS.autoTurnSeconds,
      showHoleLabels: value.showHoleLabels === true,
      transitionHints: value.transitionHints !== false,
      hideLearned: value.hideLearned === true,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

const prefs = reactive<Prefs>(load())

watch(prefs, () => writeRaw(PREFS_KEY, JSON.stringify(prefs)), { deep: true })

export function usePrefs() {
  return { prefs }
}

export { prefs }
