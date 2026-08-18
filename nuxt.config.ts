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
      /* viewport-fit=cover so the editor's picker can clear the home bar. */
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0f1518' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/ocarina.svg' }],
    },
  },

  devtools: { enabled: false },
})
