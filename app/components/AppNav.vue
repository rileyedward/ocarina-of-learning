<script setup lang="ts">
import { RouterLink } from 'vue-router'

const LINKS = [
  { to: '/', label: 'Songs' },
  { to: '/scales', label: 'Scales' },
  { to: '/reference', label: 'Reference' },
]
</script>

<template>
  <header class="print-hide tight-landscape border-b border-white/5">
    <nav
      class="tight-landscape mx-auto flex max-w-[1500px] items-center gap-3 overflow-x-auto px-4 py-2 md:gap-6 md:px-6 md:py-4"
    >
      <RouterLink to="/" class="shrink-0 font-display text-lg text-parchment">
        Ocarina<span class="hidden text-glaze sm:inline"> Practice</span>
      </RouterLink>

      <ul class="flex items-center gap-1 text-sm">
        <li v-for="link in LINKS" :key="link.to">
          <RouterLink
            :to="link.to"
            class="block rounded-sm px-3 py-2.5 whitespace-nowrap text-parchment-dim transition-colors hover:text-parchment md:py-1.5"
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
