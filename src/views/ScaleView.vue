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
</script>

<template>
  <AppNav />

  <main class="mx-auto max-w-[1500px] px-6 py-8">
    <template v-if="scale">
      <RouterLink to="/scales" class="text-sm text-parchment-dim hover:text-parchment">
        ← All scales
      </RouterLink>

      <h1 class="mt-2 font-display text-3xl text-parchment">{{ scale.name }}</h1>
      <p class="mt-1 text-sm text-parchment-dim">{{ scale.notes.length }} notes, low to high</p>

      <div class="mt-8 flex flex-wrap gap-3" :style="{ '--card-size': cardSize }">
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
