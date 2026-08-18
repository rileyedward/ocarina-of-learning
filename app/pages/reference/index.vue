<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import FingeringCard from '@/components/FingeringCard.vue'
import InstrumentPicker from '@/components/InstrumentPicker.vue'
import SegmentedControl from '@/components/SegmentedControl.vue'
import StaffLine from '@/components/StaffLine.vue'
import { getInstrument } from '@/data/instruments'
import { isNatural } from '@/data/fingerings'
import { prefs } from '@/composables/usePrefs'
import { displayLetter } from '@/utils/pitch'

type Filter = 'all' | 'naturals'

const filter = ref<Filter>('all')
const query = ref('')

const FILTERS = [
  { value: 'all', label: 'All notes' },
  { value: 'naturals', label: 'Naturals only' },
]

const SPELLINGS = [
  { value: 'flat', label: '♭', ariaLabel: 'Spell accidentals as flats' },
  { value: 'sharp', label: '♯', ariaLabel: 'Spell accidentals as sharps' },
]

const instrument = computed(() => getInstrument(prefs.defaultInstrument))

const notes = computed(() => {
  const needle = query.value.trim().toLowerCase()
  return instrument.value.range
    .filter((id) => (filter.value === 'all' ? true : isNatural(id)))
    .filter((id) => {
      if (!needle) return true
      const spellings = [id, displayLetter(id, 'flat'), displayLetter(id, 'sharp')]
      return spellings.some((s) => s.toLowerCase().includes(needle))
    })
})

const staffNotes = computed(() => notes.value.map((id) => ({ note: id })))
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[1500px] px-4 py-6 md:px-6 md:py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl text-parchment md:text-3xl">Fingering reference</h1>
        <p class="mt-1 text-sm text-parchment-dim">
          {{ instrument.name }} · {{ instrument.range.length }} notes · gold means covered
          <span v-if="instrument.sounding">
            · sounds {{ instrument.sounding > 0 ? 'an octave higher' : 'an octave lower' }} than written
          </span>
        </p>
      </div>

      <div class="print-hide flex flex-wrap items-center gap-3">
        <InstrumentPicker v-model="prefs.defaultInstrument" />
        <SegmentedControl v-model="filter" :options="FILTERS" />
        <SegmentedControl v-model="prefs.enharmonic" :options="SPELLINGS" />
      </div>
    </div>

    <div class="print-hide mt-4 flex flex-wrap items-center gap-3">
      <label class="min-w-0 flex-1 sm:max-w-xs">
        <span class="sr-only">Find a note</span>
        <input
          v-model="query"
          type="search"
          placeholder="Find a note — C, B♭, Eb6…"
          class="w-full rounded-sm border border-white/10 bg-stone px-3 py-2 text-sm text-parchment placeholder:text-parchment-dim/50"
        />
      </label>

      <button
        type="button"
        class="px-3 py-2 text-sm transition-colors"
        :class="prefs.showHoleLabels ? 'text-gold' : 'text-parchment-dim hover:text-parchment'"
        :aria-pressed="prefs.showHoleLabels"
        @click="prefs.showHoleLabels = !prefs.showHoleLabels"
      >
        Hole names
      </button>

      <RouterLink to="/reference/lookup" class="px-3 py-2 text-sm text-glaze hover:text-parchment">
        Reverse lookup →
      </RouterLink>
    </div>

    <p
      v-if="instrument.caveat"
      class="print-surface mt-6 max-w-3xl rounded-sm border-l-2 border-red-400/60 bg-stone/60 px-4 py-3 text-sm text-parchment-dim"
    >
      <span class="text-parchment">Unverified chart.</span> {{ instrument.caveat }}
    </p>

    <p
      v-else
      class="print-surface mt-6 max-w-3xl rounded-sm border-l-2 border-gold/60 bg-stone/60 px-4 py-3 text-sm text-parchment-dim"
    >
      <span class="text-parchment">Accidentals are cross-fingerings and vary by maker.</span>
      C♯6 and D♯6 especially — some makers close the left index instead of the right ring. If the
      chart that came with your ocarina disagrees with this one, use that one.
    </p>

    <div v-if="prefs.notation !== 'diagram'" class="mt-8 overflow-x-auto">
      <StaffLine :notes="staffNotes" />
    </div>

    <div
      v-if="prefs.notation !== 'staff'"
      class="note-grid mt-8"
      :style="{ '--card-size': '190px', '--card-cols': 2, '--card-gap': '1rem' }"
    >
      <FingeringCard
        v-for="note in notes"
        :key="note"
        :note="note"
        :instrument="instrument.id"
        show-caveat
      />
    </div>

    <p v-if="!notes.length" class="mt-8 text-sm text-parchment-dim">
      No note by that name on the {{ instrument.name }}.
    </p>
  </main>
</template>
