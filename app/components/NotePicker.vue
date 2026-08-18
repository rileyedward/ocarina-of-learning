<script setup lang="ts">
import FingeringDiagram from '@/components/FingeringDiagram.vue'
import { ALL_NOTES, usesSubholes } from '@/data/fingerings'
import type { NoteId } from '@/types'

/**
 * `row` is the phone-sized picker: one horizontally scrollable strip instead
 * of a five-row block that would swallow the screen. It reverts to the wrapped
 * grid at `md`, so wide screens never see the strip.
 */
withDefaults(defineProps<{ disabled?: boolean; layout?: 'grid' | 'row' }>(), {
  layout: 'grid',
})

const emit = defineEmits<{ pick: [note: NoteId] }>()
</script>

<template>
  <div
    class="flex gap-1.5"
    :class="layout === 'row' ? 'snap-x overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0' : 'flex-wrap'"
  >
    <button
      v-for="note in ALL_NOTES"
      :key="note.id"
      type="button"
      :disabled="disabled"
      class="flex w-[74px] flex-col items-center gap-0.5 rounded-sm border border-white/10 bg-stone px-1 py-1.5 transition-colors hover:border-gold/60 disabled:cursor-not-allowed disabled:opacity-40"
      :class="layout === 'row' ? 'shrink-0 snap-start md:shrink' : ''"
      :title="`${note.letter}${note.octave}${note.altLetter ? ` (${note.altLetter})` : ''}`"
      @click="emit('pick', note.id)"
    >
      <FingeringDiagram
        :covered="note.covered"
        :size="60"
        :dim-subholes="!usesSubholes(note.id)"
      />
      <span class="flex items-baseline gap-0.5 leading-none">
        <span class="font-note text-base font-bold text-parchment">{{ note.letter }}</span>
        <span class="font-body text-[10px] text-parchment-dim">{{ note.octave }}</span>
      </span>
    </button>
  </div>
</template>
