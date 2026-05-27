// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/index.css'],
  devtools: { enabled: true },
  runtimeConfig: {
    aiSummaryApiKey: process.env.NUXT_AI_SUMMARY_API_KEY || process.env.AI_SUMMARY_API_KEY || process.env.OPENAI_API_KEY || '',
    aiSummaryEndpoint: process.env.NUXT_AI_SUMMARY_ENDPOINT || process.env.AI_SUMMARY_ENDPOINT || process.env.OPENAI_API_ENDPOINT || ''
  },
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
  },
  nitro: {
    storage: {
      aiSummary: {
        driver: 'fs',
        base: '.data/ai-summary'
      }
    }
  }
})
