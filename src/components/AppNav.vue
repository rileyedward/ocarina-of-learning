<script setup lang="ts">
import { RouterLink } from 'vue-router'

const LINKS = [
  { to: '/', label: 'Songs' },
  { to: '/scales', label: 'Scales' },
  { to: '/reference', label: 'Reference' },
]
</script>

<template>
  <header class="print-hide border-b border-white/5">
    <nav class="mx-auto flex max-w-[1500px] items-center gap-6 px-6 py-4">
      <RouterLink to="/" class="font-display text-lg text-parchment">
        Ocarina<span class="text-glaze"> Practice</span>
      </RouterLink>

      <ul class="flex items-center gap-1 text-sm">
        <li v-for="link in LINKS" :key="link.to">
          <RouterLink
            :to="link.to"
            class="rounded-sm px-3 py-1.5 text-parchment-dim transition-colors hover:text-parchment"
            :active-class="link.to === '/' ? '' : 'text-parchment'"
            exact-active-class="text-parchment"
          >
            {{ link.label }}
          </RouterLink>
        </li>
      </ul>

      <slot name="actions" />
    </nav>
  </header>
</template>
