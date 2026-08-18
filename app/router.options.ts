import type { RouterConfig } from 'nuxt/schema'

export default {
  /** Every screen is a chart you read from the top. Never restore scroll. */
  scrollBehavior: () => ({ top: 0 }),
} satisfies RouterConfig
