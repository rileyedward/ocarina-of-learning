<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import { createScale, deleteScale, duplicateScale, useLibrary } from '@/composables/useLibrary'
import { prefs } from '@/composables/usePrefs'
import { displayLetter } from '@/utils/pitch'

const { library } = useLibrary()
const router = useRouter()

const pendingDelete = ref<string | null>(null)

function onNewScale() {
  const scale = createScale()
  void router.push(`/scales/${scale.id}?edit=1`)
}
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[900px] px-4 py-6 md:px-6 md:py-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-display text-2xl text-parchment md:text-3xl">Scales</h1>
        <p class="mt-1 text-sm text-parchment-dim">
          Warm-ups and dexterity runs, whole run on one screen.
        </p>
      </div>

      <button
        type="button"
        class="bg-glaze/20 px-4 py-2 text-sm text-parchment transition-colors hover:bg-glaze/30"
        @click="onNewScale"
      >
        New scale
      </button>
    </div>

    <ul class="mt-8 flex flex-col gap-2">
      <li
        v-for="scale in library.scales"
        :key="scale.id"
        class="rounded-sm border border-white/5 bg-stone transition-colors hover:border-glaze/50"
      >
        <div class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <RouterLink :to="`/scales/${scale.id}`" class="min-w-0 flex-1">
            <span class="font-display text-lg text-parchment">{{ scale.name }}</span>
            <span class="mt-0.5 block truncate font-note text-sm text-parchment-dim">
              {{ scale.notes.map((id) => displayLetter(id, prefs.enharmonic)).join(' · ') || 'empty' }}
            </span>
          </RouterLink>

          <div v-if="pendingDelete === scale.id" class="flex items-center gap-2 text-sm sm:shrink-0">
            <span class="text-parchment-dim">Delete?</span>
            <button type="button" class="px-2 py-1 text-red-300 hover:text-red-200" @click="deleteScale(scale.id)">
              Delete
            </button>
            <button
              type="button"
              class="px-2 py-1 text-parchment-dim hover:text-parchment"
              @click="pendingDelete = null"
            >
              Cancel
            </button>
          </div>

          <div v-else class="flex items-center gap-1 text-sm sm:shrink-0">
            <RouterLink
              :to="`/scales/${scale.id}?edit=1`"
              class="min-h-11 px-3 py-2 text-parchment-dim hover:text-parchment sm:min-h-0 sm:px-2 sm:py-1"
            >
              Edit
            </RouterLink>
            <button
              type="button"
              class="min-h-11 px-3 py-2 text-parchment-dim hover:text-parchment sm:min-h-0 sm:px-2 sm:py-1"
              @click="duplicateScale(scale.id)"
            >
              Duplicate
            </button>
            <button
              type="button"
              class="min-h-11 px-3 py-2 text-parchment-dim hover:text-parchment sm:min-h-0 sm:px-2 sm:py-1"
              @click="pendingDelete = scale.id"
            >
              Delete
            </button>
          </div>
        </div>
      </li>
    </ul>

    <p v-if="!library.scales.length" class="mt-10 text-sm text-parchment-dim">
      No scales — not even a chromatic run.
      <button type="button" class="text-glaze underline" @click="onNewScale">Build one</button>
    </p>
  </main>
</template>
