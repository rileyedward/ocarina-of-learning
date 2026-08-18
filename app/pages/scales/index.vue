<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import { getNote } from '@/data/fingerings'
import { useLibrary } from '@/composables/useLibrary'

const { library } = useLibrary()
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[900px] px-6 py-8">
    <h1 class="font-display text-3xl text-parchment">Scales</h1>
    <p class="mt-1 text-sm text-parchment-dim">Warm-ups and dexterity runs, whole run on one screen.</p>

    <ul class="mt-8 flex flex-col gap-2">
      <li v-for="scale in library.scales" :key="scale.id">
        <RouterLink
          :to="`/scales/${scale.id}`"
          class="flex items-baseline justify-between gap-6 rounded-sm border border-white/5 bg-stone px-4 py-3 transition-colors hover:border-glaze/50"
        >
          <span class="font-display text-lg text-parchment">{{ scale.name }}</span>
          <span class="truncate font-note text-sm text-parchment-dim">
            {{ scale.notes.map((id) => getNote(id).letter).join(' · ') }}
          </span>
        </RouterLink>
      </li>
    </ul>
  </main>
</template>
