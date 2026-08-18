<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import FingeringCard from '@/components/FingeringCard.vue'
import FingeringDiagram from '@/components/FingeringDiagram.vue'
import InstrumentPicker from '@/components/InstrumentPicker.vue'
import { getInstrument, notesForHoles } from '@/data/instruments'
import { prefs } from '@/composables/usePrefs'
import type { HoleKey } from '@/types'

/**
 * The chart read backwards. Someone finds a fingering — in a book, in a video,
 * in their own hands — and wants to know what note it is. Tap the holes.
 */
const instrument = computed(() => getInstrument(prefs.defaultInstrument))
const covered = ref<HoleKey[]>([])

watch(instrument, () => {
  covered.value = []
})

function toggle(hole: HoleKey) {
  covered.value = covered.value.includes(hole)
    ? covered.value.filter((h) => h !== hole)
    : [...covered.value, hole]
}

const matches = computed(() => notesForHoles(instrument.value, covered.value))

/** Near misses make a mis-transcribed chart obvious in a way "no match" cannot. */
const nearby = computed(() => {
  if (matches.value.length) return []
  const wanted = new Set(covered.value)
  return instrument.value.range
    .map((id) => {
      const holes = new Set(instrument.value.fingerings[id] ?? [])
      let difference = 0
      for (const hole of instrument.value.holes) {
        if (wanted.has(hole.id) !== holes.has(hole.id)) difference += 1
      }
      return { id, difference }
    })
    .filter((entry) => entry.difference <= 2)
    .sort((a, b) => a.difference - b.difference)
    .slice(0, 4)
})
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[1100px] px-4 py-6 md:px-6 md:py-8">
    <RouterLink to="/reference" class="text-sm text-parchment-dim hover:text-parchment">
      ← Fingering reference
    </RouterLink>

    <div class="mt-2 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl text-parchment md:text-3xl">What note is this?</h1>
        <p class="mt-1 text-sm text-parchment-dim">
          Tap the holes you are covering. Gold is covered, outlined is open.
        </p>
      </div>
      <InstrumentPicker v-model="prefs.defaultInstrument" />
    </div>

    <div class="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="rounded-sm border border-white/5 bg-stone p-4">
        <FingeringDiagram
          :instrument="instrument.id"
          :covered="covered"
          interactive
          show-labels
          label="Tap holes to build a fingering"
          @toggle="toggle"
        />

        <div class="mt-3 flex flex-wrap items-center gap-3 text-sm text-parchment-dim">
          <span>{{ covered.length }} of {{ instrument.holes.length }} covered</span>
          <button type="button" class="px-2 py-1 hover:text-parchment" @click="covered = []">
            Clear
          </button>
          <button
            type="button"
            class="px-2 py-1 hover:text-parchment"
            @click="covered = instrument.holes.map((h) => h.id)"
          >
            Cover all
          </button>
        </div>
      </div>

      <div>
        <h2 class="text-xs tracking-widest text-parchment-dim uppercase">Matches</h2>

        <div
          v-if="matches.length"
          class="note-grid mt-3"
          :style="{ '--card-size': '150px', '--card-cols': 2 }"
        >
          <FingeringCard v-for="id in matches" :key="id" :note="id" :instrument="instrument.id" />
        </div>

        <template v-else>
          <p class="mt-3 text-sm text-parchment-dim">
            Nothing on the {{ instrument.name }} uses exactly those holes.
          </p>

          <template v-if="nearby.length">
            <h3 class="mt-6 text-xs tracking-widest text-parchment-dim uppercase">Close</h3>
            <ul class="mt-2 flex flex-col gap-1 text-sm text-parchment-dim">
              <li v-for="entry in nearby" :key="entry.id">
                {{ entry.id }} — {{ entry.difference }} hole{{ entry.difference === 1 ? '' : 's' }} different
              </li>
            </ul>
          </template>
        </template>
      </div>
    </div>
  </main>
</template>
