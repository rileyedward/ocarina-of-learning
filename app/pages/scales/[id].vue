<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import FingeringCard from '@/components/FingeringCard.vue'
import { useLibrary } from '@/composables/useLibrary'

const route = useRoute()
const { library } = useLibrary()

const scale = computed(() => library.scales.find((s) => s.id === route.params.id))

/** Long runs get smaller cards so the whole scale still fits without pagination. */
const cardSize = computed(() => {
  const count = scale.value?.notes.length ?? 0
  if (count > 16) return '150px'
  if (count > 10) return '175px'
  return '200px'
})

/** The same idea on a phone, where columns matter and pixel widths do not. */
const cols = computed(() => ((scale.value?.notes.length ?? 0) > 10 ? 4 : 3))
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[1500px] px-4 py-6 md:px-6 md:py-8">
    <template v-if="scale">
      <RouterLink to="/scales" class="text-sm text-parchment-dim hover:text-parchment">
        ← All scales
      </RouterLink>

      <h1 class="mt-2 font-display text-2xl text-parchment md:text-3xl">{{ scale.name }}</h1>
      <p class="mt-1 text-sm text-parchment-dim">{{ scale.notes.length }} notes, low to high</p>

      <div class="note-grid mt-8" :style="{ '--card-size': cardSize, '--card-cols': cols }">
        <FingeringCard v-for="(id, i) in scale.notes" :key="`${id}-${i}`" :note="id" />
      </div>
    </template>

    <template v-else>
      <p class="text-parchment-dim">
        No such scale.
        <RouterLink to="/scales" class="text-glaze underline">Back to scales</RouterLink>
      </p>
    </template>
  </main>
</template>
