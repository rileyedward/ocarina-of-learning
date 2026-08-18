import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-18',

  /**
   * There is no backend and no account: every screen reads the library out of
   * localStorage. Rendering on the server would only ever produce an empty
   * library for the client to throw away, so the app ships as a pure SPA.
   */
  ssr: false,

  css: ['~/assets/css/style.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Ocarina Practice',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/ocarina.svg' }],
    },
  },

  devtools: { enabled: false },
})
