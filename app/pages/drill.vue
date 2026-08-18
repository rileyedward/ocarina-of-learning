<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppNav from '@/components/AppNav.vue'
import FingeringDiagram from '@/components/FingeringDiagram.vue'
import InstrumentPicker from '@/components/InstrumentPicker.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import { phraseNoteIds, useLibrary } from '@/composables/useLibrary'
import { prefs } from '@/composables/usePrefs'
import { getInstrument } from '@/data/instruments'
import { isNatural } from '@/data/fingerings'
import { displayLetter } from '@/utils/pitch'
import type { NoteId } from '@/types'

/**
 * Flashcards. The reference screen is a poster; this is the same data asking
 * you questions. Self-check only — no score, no streak, nothing stored. The
 * point is the five minutes before you play, not a record of them.
 */
const { library } = useLibrary()

const instrument = computed(() => getInstrument(prefs.defaultInstrument))

const MODES = [
  { value: 'name', label: 'Name it', ariaLabel: 'Show a fingering, name the note' },
  { value: 'finger', label: 'Finger it', ariaLabel: 'Show a note, recall the fingering' },
]

const ORDERS = [
  { value: 'shuffle', label: 'Shuffle' },
  { value: 'up', label: 'Low to high' },
  { value: 'down', label: 'High to low' },
]

const mode = ref<'name' | 'finger'>('name')
const order = ref<'shuffle' | 'up' | 'down'>('shuffle')
const scope = ref('all')
const revealed = ref(false)
const position = ref(0)

const scopeOptions = computed(() => [
  { id: 'all', name: 'Every note' },
  { id: 'naturals', name: 'Naturals only' },
  ...library.scales.map((s) => ({ id: `scale:${s.id}`, name: `Scale — ${s.name}` })),
  ...library.songs
    .filter((s) => s.phrases.some((p) => p.notes.length))
    .map((s) => ({ id: `song:${s.id}`, name: `Song — ${s.title}` })),
])

const pool = computed<NoteId[]>(() => {
  const range = instrument.value.range

  if (scope.value === 'naturals') return range.filter(isNatural)

  if (scope.value.startsWith('scale:')) {
    const scale = library.scales.find((s) => s.id === scope.value.slice(6))
    return (scale?.notes ?? []).filter((id) => range.includes(id))
  }

  if (scope.value.startsWith('song:')) {
    const song = library.songs.find((s) => s.id === scope.value.slice(5))
    const ids = song ? song.phrases.flatMap((p) => phraseNoteIds(p.notes)) : []
    return [...new Set(ids)].filter((id) => range.includes(id))
  }

  return [...range]
})

/**
 * Shuffled once per pool rather than per card: drawing at random every time
 * repeats notes and skips others, which is exactly what a drill must not do.
 */
const cards = computed<NoteId[]>(() => {
  const notes = [...pool.value]
  if (order.value === 'up') return notes
  if (order.value === 'down') return notes.reverse()

  // A fixed-seed shuffle, so the order is stable until the pool changes.
  let seed = notes.length * 2654435761
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  for (let i = notes.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1))
    const a = notes[i]
    const b = notes[j]
    if (a && b) {
      notes[i] = b
      notes[j] = a
    }
  }
  return notes
})

const current = computed(() => cards.value[position.value % Math.max(cards.value.length, 1)])

watch([cards, mode], () => {
  position.value = 0
  revealed.value = false
})

function step(delta: number) {
  if (!cards.value.length) return
  position.value = (position.value + delta + cards.value.length) % cards.value.length
  revealed.value = false
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

  if (event.key === ' ') {
    revealed.value = !revealed.value
    event.preventDefault()
  }
  if (event.key === 'ArrowRight') step(1)
  if (event.key === 'ArrowLeft') step(-1)
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[900px] px-4 py-6 md:px-6 md:py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl text-parchment md:text-3xl">Drill</h1>
        <p class="mt-1 text-sm text-parchment-dim">
          Check yourself. Nothing is scored and nothing is kept.
        </p>
      </div>
      <InstrumentPicker v-model="prefs.defaultInstrument" />
    </div>

    <div class="mt-6 flex flex-wrap items-center gap-3">
      <SegmentedControl v-model="mode" :options="MODES" accent="gold" />
      <SegmentedControl v-model="order" :options="ORDERS" density="tight" />

      <label class="flex items-center gap-2 text-sm">
        <span class="text-xs tracking-wider text-parchment-dim uppercase">From</span>
        <select
          v-model="scope"
          class="min-h-10 rounded-sm border border-white/10 bg-stone px-2 py-1 text-sm text-parchment md:min-h-0"
        >
          <option v-for="option in scopeOptions" :key="option.id" :value="option.id">
            {{ option.name }}
          </option>
        </select>
      </label>
    </div>

    <section
      v-if="current"
      class="mt-8 flex flex-col items-center rounded-sm border border-white/5 bg-stone px-6 py-10"
    >
      <p class="text-xs tracking-widest text-parchment-dim uppercase">
        {{ position + 1 }} of {{ cards.length }}
      </p>

      <template v-if="mode === 'name'">
        <FingeringDiagram :note="current" :instrument="instrument.id" :size="260" class="mt-4" />
        <p class="mt-6 font-note text-4xl font-bold" :class="revealed ? 'text-parchment' : 'text-parchment-dim/20'">
          {{ revealed ? displayLetter(current, prefs.enharmonic) : '?' }}
        </p>
      </template>

      <template v-else>
        <p class="mt-4 font-note text-6xl font-bold text-parchment">
          {{ displayLetter(current, prefs.enharmonic) }}
        </p>
        <div class="mt-6 min-h-[180px]">
          <FingeringDiagram v-if="revealed" :note="current" :instrument="instrument.id" :size="260" />
          <p v-else class="pt-16 text-sm text-parchment-dim/70 italic">
            Cover the holes, then check.
          </p>
        </div>
      </template>

      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          class="px-4 py-2 text-sm text-parchment-dim hover:text-parchment"
          @click="step(-1)"
        >
          ← Previous
        </button>
        <button
          type="button"
          class="bg-glaze/20 px-5 py-2 text-sm text-parchment transition-colors hover:bg-glaze/30"
          @click="revealed = !revealed"
        >
          {{ revealed ? 'Hide' : 'Reveal' }}
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm text-parchment-dim hover:text-parchment"
          @click="step(1)"
        >
          Next →
        </button>
      </div>

      <p class="mt-4 hidden text-xs text-parchment-dim/60 md:block">space reveals · ← → move</p>
    </section>

    <p v-else class="mt-8 text-sm text-parchment-dim">
      Nothing to drill from that selection yet — the song or scale has no notes in it.
    </p>
  </main>
</template>
