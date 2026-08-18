<script setup lang="ts">
import { computed } from 'vue'
import FingeringDiagram from '@/components/FingeringDiagram.vue'
import { DEFAULT_INSTRUMENT_ID, getInstrument, usesGroup } from '@/data/instruments'
import { prefs } from '@/composables/usePrefs'
import { displayLetter } from '@/utils/pitch'
import { getNote } from '@/data/fingerings'
import type { NoteId } from '@/types'

/**
 * `row` is the phone-sized picker: one horizontally scrollable strip instead
 * of a five-row block that would swallow the screen. It reverts to the wrapped
 * grid at `md`, so wide screens never see the strip.
 */
const props = withDefaults(
  defineProps<{
    disabled?: boolean
    layout?: 'grid' | 'row'
    instrument?: string
    /** Scales are lists of notes; a rest would mean nothing there. */
    allowRest?: boolean
  }>(),
  { layout: 'grid', instrument: DEFAULT_INSTRUMENT_ID, allowRest: true },
)

const emit = defineEmits<{ pick: [note: NoteId]; rest: [] }>()

const instrument = computed(() => getInstrument(props.instrument))
const notes = computed(() => instrument.value.range.map((id) => getNote(id)))
</script>

<template>
  <div class="picker-scroll relative">
    <div
      class="flex gap-1.5"
      :class="
        layout === 'row'
          ? 'snap-x overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0'
          : 'flex-wrap'
      "
    >
      <!-- A rest is a note the phrase needs as much as any other. -->
      <button
        v-if="allowRest"
        type="button"
        :disabled="disabled"
        class="picker-key flex w-[74px] shrink-0 flex-col items-center justify-center gap-1 rounded-sm border border-white/10 bg-stone px-1 py-1.5 transition-colors hover:border-gold/60 disabled:cursor-not-allowed disabled:opacity-40"
        title="Add a rest"
        @click="emit('rest')"
      >
        <svg viewBox="0 0 40 40" class="h-[38px] w-[38px]" role="img" aria-hidden="true">
          <path
            d="M 12,8 q 12,8 3,16 q -9,8 3,16"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            class="text-parchment-dim"
          />
        </svg>
        <span class="font-body text-[10px] text-parchment-dim">rest</span>
      </button>

      <button
        v-for="note in notes"
        :key="note.id"
        type="button"
        :disabled="disabled"
        class="picker-key flex w-[74px] flex-col items-center gap-0.5 rounded-sm border border-white/10 bg-stone px-1 py-1.5 transition-colors hover:border-gold/60 disabled:cursor-not-allowed disabled:opacity-40"
        :class="layout === 'row' ? 'shrink-0 snap-start md:shrink' : ''"
        :title="`${displayLetter(note.id, prefs.enharmonic)}${note.octave}`"
        @click="emit('pick', note.id)"
      >
        <FingeringDiagram
          :note="note.id"
          :instrument="instrument.id"
          :size="60"
          :dim-subholes="!usesGroup(instrument, note.id, 'sub')"
        />
        <span class="flex items-baseline gap-0.5 leading-none">
          <span class="font-note text-base font-bold text-parchment">
            {{ displayLetter(note.id, prefs.enharmonic) }}
          </span>
          <span class="font-body text-[10px] text-parchment-dim">{{ note.octave }}</span>
        </span>
      </button>
    </div>

    <!-- The strip scrolls; without an edge fade it reads as a cut-off row. -->
    <div v-if="layout === 'row'" class="picker-fade pointer-events-none md:hidden" aria-hidden="true" />
  </div>
</template>

<style scoped>
.picker-key:focus-visible {
  outline: 2px solid var(--color-glaze);
  outline-offset: 2px;
}

.picker-fade {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 2rem;
  background: linear-gradient(to right, transparent, var(--color-ink));
}
</style>
