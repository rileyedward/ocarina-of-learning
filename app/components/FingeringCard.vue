<script setup lang="ts">
import { computed } from 'vue'
import FingeringDiagram from '@/components/FingeringDiagram.vue'
import { getNote, usesSubholes } from '@/data/fingerings'
import type { NoteId } from '@/types'

/**
 * One note: the diagram, the letter, the octave. Nothing else.
 * Sizes entirely off the `--card-size` custom property of an ancestor.
 */
const props = withDefaults(
  defineProps<{
    note: NoteId
    /** Show the per-note caveat text when the note has one. */
    showCaveat?: boolean
  }>(),
  { showCaveat: false },
)

const note = computed(() => getNote(props.note))
const dimSubholes = computed(() => !usesSubholes(props.note))
</script>

<template>
  <figure
    class="print-break-avoid print-surface flex flex-col items-center gap-1 rounded-sm border border-white/5 bg-stone px-2 pt-2 pb-1"
    :style="{ width: 'var(--card-size, 180px)' }"
  >
    <FingeringDiagram :covered="note.covered" :dim-subholes="dimSubholes" :label="`${note.letter}${note.octave}`" />

    <figcaption class="flex items-baseline justify-center gap-1 leading-none">
      <span class="note-letter font-note font-bold text-parchment">{{ note.letter }}</span>
      <span class="note-octave font-body text-parchment-dim">{{ note.octave }}</span>
    </figcaption>

    <p
      v-if="showCaveat && note.note"
      class="note-caveat text-center text-parchment-dim/80 italic"
    >
      {{ note.note }}
    </p>
  </figure>
</template>

<style scoped>
.note-letter {
  font-size: calc(var(--card-size, 180px) * 0.3);
}

.note-octave {
  font-size: calc(var(--card-size, 180px) * 0.11);
}

.note-caveat {
  font-size: calc(var(--card-size, 180px) * 0.06);
  line-height: 1.35;
}
</style>
