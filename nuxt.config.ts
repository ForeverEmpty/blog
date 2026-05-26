// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/index.css'],
  devtools: { enabled: true },
  modules: [
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxt/image',
    '@nuxt/content'
  ],
  icon: {
    serverBundle: {
      collections: ['lucide']
    }
  },
  vite: {
    plugins: [
      tailwindcss()
    ]
  }
})
