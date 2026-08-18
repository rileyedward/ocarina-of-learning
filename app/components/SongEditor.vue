<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import FingeringDiagram from '@/components/FingeringDiagram.vue'
import NotePicker from '@/components/NotePicker.vue'
import { createSong, findSong, newPhrase, touch } from '@/composables/useLibrary'
import { getNote, usesSubholes } from '@/data/fingerings'
import type { NoteId, Song } from '@/types'

const route = useRoute()
const router = useRouter()

/** `/song/new` mints a song and swaps the URL for it — there is no draft state. */
const song = ref<Song | undefined>(
  route.path === '/song/new' ? createSong() : findSong(String(route.params.id)),
)

if (route.path === '/song/new' && song.value) {
  void router.replace(`/song/${song.value.id}/edit`)
}

/** The load-bearing state of this screen: which phrase the picker fills. */
const focusedPhraseId = ref<string | null>(song.value?.phrases[0]?.id ?? null)

const focusedPhrase = computed(() =>
  song.value?.phrases.find((p) => p.id === focusedPhraseId.value),
)

const phraseListRef = ref<HTMLElement | null>(null)

function edited() {
  if (song.value) touch(song.value)
}

function addPhrase() {
  if (!song.value) return
  const phrase = newPhrase()
  song.value.phrases.push(phrase)
  focusedPhraseId.value = phrase.id
  edited()
}

function deletePhrase(id: string) {
  if (!song.value) return
  const index = song.value.phrases.findIndex((p) => p.id === id)
  if (index === -1) return
  song.value.phrases.splice(index, 1)
  if (focusedPhraseId.value === id) {
    focusedPhraseId.value = song.value.phrases[Math.max(0, index - 1)]?.id ?? null
  }
  edited()
}

function movePhrase(index: number, delta: number) {
  if (!song.value) return
  const target = index + delta
  if (target < 0 || target >= song.value.phrases.length) return
  const [phrase] = song.value.phrases.splice(index, 1)
  if (!phrase) return
  song.value.phrases.splice(target, 0, phrase)
  edited()
}

function appendNote(noteId: NoteId) {
  const phrase = focusedPhrase.value
  if (!phrase) return
  phrase.notes.push(noteId)
  edited()
}

function removeNote(phraseId: string, index: number) {
  const phrase = song.value?.phrases.find((p) => p.id === phraseId)
  if (!phrase) return
  phrase.notes.splice(index, 1)
  edited()
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return

  if (event.key === 'Backspace') {
    const phrase = focusedPhrase.value
    if (!phrase || phrase.notes.length === 0) return
    phrase.notes.pop()
    edited()
    event.preventDefault()
  }
}

// Keep the newly added phrase in view without any animation.
watch(focusedPhraseId, async (id) => {
  if (!id) return
  await Promise.resolve()
  phraseListRef.value
    ?.querySelector(`[data-phrase="${id}"]`)
    ?.scrollIntoView({ block: 'nearest' })
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <AppNav />

  <template v-if="song">
    <main class="mx-auto max-w-[1100px] px-6 pt-6 pb-[290px]">
      <div class="flex items-center justify-between gap-4">
        <RouterLink to="/" class="text-sm text-parchment-dim hover:text-parchment">
          ← All songs
        </RouterLink>
        <RouterLink
          :to="`/song/${song.id}`"
          class="bg-glaze/20 px-4 py-2 text-sm text-parchment transition-colors hover:bg-glaze/30"
        >
          Practise this →
        </RouterLink>
      </div>

      <!-- A. Song metadata -->
      <section class="mt-4 flex flex-col gap-2">
        <input
          v-model="song.title"
          type="text"
          placeholder="Song title"
          class="w-full border-b border-white/10 bg-transparent pb-1 font-display text-3xl text-parchment placeholder:text-parchment-dim/50 focus:border-glaze focus:outline-none"
          @input="edited"
        />
        <input
          v-model="song.subtitle"
          type="text"
          placeholder="Arrangement source, difficulty, anything"
          class="w-full bg-transparent text-sm text-parchment-dim placeholder:text-parchment-dim/50 focus:outline-none"
          @input="edited"
        />
      </section>

      <!-- B. Phrase list -->
      <section ref="phraseListRef" class="mt-8 flex flex-col gap-3">
        <article
          v-for="(phrase, index) in song.phrases"
          :key="phrase.id"
          :data-phrase="phrase.id"
          class="rounded-sm border bg-stone px-4 py-3 transition-colors"
          :class="
            focusedPhraseId === phrase.id
              ? 'border-gold ring-1 ring-gold/40'
              : 'border-white/5 hover:border-white/20'
          "
          @click="focusedPhraseId = phrase.id"
        >
          <header class="flex items-center gap-3">
            <span class="w-6 text-right text-xs text-parchment-dim">{{ index + 1 }}</span>
            <input
              v-model="phrase.label"
              type="text"
              :placeholder="`Phrase ${index + 1}`"
              class="min-w-0 flex-1 bg-transparent text-sm text-parchment placeholder:text-parchment-dim/60 focus:outline-none"
              @input="edited"
              @focus="focusedPhraseId = phrase.id"
            />

            <span
              v-if="focusedPhraseId === phrase.id"
              class="text-xs tracking-wider text-gold uppercase"
            >
              Adding here
            </span>

            <div class="flex items-center gap-1 text-xs text-parchment-dim">
              <button
                type="button"
                class="px-1.5 py-1 hover:text-parchment disabled:opacity-30"
                :disabled="index === 0"
                title="Move up"
                @click.stop="movePhrase(index, -1)"
              >
                ↑
              </button>
              <button
                type="button"
                class="px-1.5 py-1 hover:text-parchment disabled:opacity-30"
                :disabled="index === song.phrases.length - 1"
                title="Move down"
                @click.stop="movePhrase(index, 1)"
              >
                ↓
              </button>
              <button
                type="button"
                class="px-1.5 py-1 hover:text-red-300"
                title="Delete phrase"
                @click.stop="deletePhrase(phrase.id)"
              >
                ✕
              </button>
            </div>
          </header>

          <div v-if="phrase.notes.length" class="mt-2 flex flex-wrap gap-1.5">
            <button
              v-for="(noteId, noteIndex) in phrase.notes"
              :key="`${phrase.id}-${noteIndex}`"
              type="button"
              class="flex w-[64px] flex-col items-center rounded-sm border border-white/10 px-1 py-1 transition-colors hover:border-red-400/60"
              title="Click to remove"
              @click.stop="removeNote(phrase.id, noteIndex)"
            >
              <FingeringDiagram
                :covered="getNote(noteId).covered"
                :size="52"
                :dim-subholes="!usesSubholes(noteId)"
              />
              <span class="flex items-baseline gap-0.5 leading-none">
                <span class="font-note text-sm font-bold text-parchment">
                  {{ getNote(noteId).letter }}
                </span>
                <span class="font-body text-[9px] text-parchment-dim">
                  {{ getNote(noteId).octave }}
                </span>
              </span>
            </button>
          </div>
          <p v-else class="mt-2 text-sm text-parchment-dim/70 italic">
            Empty — pick notes below, or leave it empty as a breath.
          </p>
        </article>

        <button
          type="button"
          class="self-start px-3 py-2 text-sm text-parchment-dim hover:text-parchment"
          @click="addPhrase"
        >
          + Add phrase
        </button>
      </section>
    </main>

    <!-- C. Note picker: fixed, so "add phrase" never scrolls it away. -->
    <div class="fixed inset-x-0 bottom-0 border-t border-white/10 bg-ink/95 backdrop-blur">
      <div class="mx-auto max-w-[1100px] px-6 py-3">
        <div class="mb-2 flex items-baseline justify-between gap-4 text-xs">
          <span class="tracking-widest text-parchment-dim uppercase">
            Adding to:
            <span class="text-gold">
              {{
                focusedPhrase
                  ? focusedPhrase.label ||
                    `Phrase ${song.phrases.indexOf(focusedPhrase) + 1}`
                  : 'no phrase selected'
              }}
            </span>
          </span>
          <span class="text-parchment-dim/70">
            Click a note to append · click a note in a phrase to remove it · backspace drops the last
          </span>
        </div>

        <NotePicker :disabled="!focusedPhrase" @pick="appendNote" />
      </div>
    </div>
  </template>

  <main v-else class="mx-auto max-w-[900px] px-6 py-8">
    <p class="text-parchment-dim">
      That song is gone.
      <RouterLink to="/" class="text-glaze underline">Back to the library</RouterLink>
    </p>
  </main>
</template>
