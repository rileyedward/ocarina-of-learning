<script setup lang="ts">
import { ref } from 'vue'
import NotePicker from '@/components/NotePicker.vue'
import { countUnparsed, parseNoteText } from '@/utils/noteText'
import type { NoteId, PhraseNote } from '@/types'

/**
 * The bottom of the editor: the picker, plus the faster way in. Clicking
 * twenty-one diagrams to enter a forty-note tune is the slowest path there is,
 * so the same bar takes typed shorthand and pasted note runs.
 */
defineProps<{
  disabled: boolean
  layout: 'grid' | 'row'
  instrument: string
  targetLabel: string
  open: boolean
}>()

const emit = defineEmits<{
  pick: [note: NoteId]
  rest: []
  append: [notes: PhraseNote[]]
  replace: [notes: PhraseNote[]]
  'update:open': [value: boolean]
}>()

const text = ref('')
const showText = ref(false)

function submit(mode: 'append' | 'replace') {
  const notes = parseNoteText(text.value)
  if (!notes.length) return
  if (mode === 'append') emit('append', notes)
  else emit('replace', notes)
  text.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-[1100px] px-4 py-3 md:px-6">
    <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-xs">
      <span class="min-w-0 truncate tracking-widest text-parchment-dim uppercase">
        Adding to: <span class="text-gold">{{ targetLabel }}</span>
      </span>

      <span class="hidden text-parchment-dim/70 md:inline">
        Click a note to append · click a note in a phrase to edit it · backspace drops the last
      </span>

      <div class="flex shrink-0 items-center gap-2">
        <button
          type="button"
          class="px-2 py-1 whitespace-nowrap transition-colors"
          :class="showText ? 'text-gold' : 'text-parchment-dim hover:text-parchment'"
          :aria-expanded="showText"
          @click="showText = !showText"
        >
          Type notes
        </button>

        <!-- Phones get one scrollable row; the whole board is a tap away. -->
        <button
          type="button"
          class="px-2 py-1 whitespace-nowrap text-parchment-dim hover:text-parchment md:hidden"
          :aria-expanded="open"
          @click="emit('update:open', !open)"
        >
          {{ open ? 'Fewer notes ▾' : 'All notes ▴' }}
        </button>
      </div>
    </div>

    <div v-if="showText" class="mb-3 flex flex-col gap-2">
      <label class="sr-only" for="note-text">Notes as text</label>
      <input
        id="note-text"
        v-model="text"
        type="text"
        placeholder="c d e d c · bb4 f#5 · r/4 for a quarter rest · c/8. for dotted"
        class="w-full rounded-sm border border-white/10 bg-stone px-3 py-2 font-note text-sm text-parchment placeholder:text-parchment-dim/50"
        :disabled="disabled"
        @keydown.enter.prevent="submit('append')"
      />
      <div class="flex flex-wrap items-center gap-3 text-xs text-parchment-dim">
        <button
          type="button"
          class="rounded-sm bg-glaze/20 px-3 py-1.5 text-parchment transition-colors hover:bg-glaze/30 disabled:opacity-40"
          :disabled="disabled || !text.trim()"
          @click="submit('append')"
        >
          Append
        </button>
        <button
          type="button"
          class="px-2 py-1.5 hover:text-parchment disabled:opacity-40"
          :disabled="disabled || !text.trim()"
          @click="submit('replace')"
        >
          Replace phrase
        </button>
        <span v-if="countUnparsed(text) > 0" class="text-gold">
          {{ countUnparsed(text) }} token{{ countUnparsed(text) === 1 ? '' : 's' }} not understood — they
          will be skipped
        </span>
        <span v-else class="text-parchment-dim/60">
          Octave carries forward from the last note you typed.
        </span>
      </div>
    </div>

    <div :class="open ? 'max-h-[45vh] overflow-y-auto md:max-h-none md:overflow-visible' : ''">
      <NotePicker
        :disabled="disabled"
        :layout="layout"
        :instrument="instrument"
        @pick="emit('pick', $event)"
        @rest="emit('rest')"
      />
    </div>
  </div>
</template>
