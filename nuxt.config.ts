// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/index.css'],
  devtools: { enabled: true },
  app: {
    head: {
      script: [
        {
          id: 'theme-init',
          innerHTML: `(() => {
  try {
    const mode = localStorage.getItem('chanko-theme-mode') || 'system'
    const root = document.documentElement
    if (mode === 'dark' || mode === 'light') {
      root.dataset.theme = mode
    } else {
      root.removeAttribute('data-theme')
    }
    root.dataset.themeMode = mode
  } catch {}
})()`
        }
      ]
    }
  },
  runtimeConfig: {
    aiSummaryApiKey: process.env.NUXT_AI_SUMMARY_API_KEY || process.env.AI_SUMMARY_API_KEY || process.env.OPENAI_API_KEY || '',
    aiSummaryEndpoint: process.env.NUXT_AI_SUMMARY_ENDPOINT || process.env.AI_SUMMARY_ENDPOINT || process.env.OPENAI_API_ENDPOINT || '',
    public: {
      walineServerURL: process.env.NUXT_PUBLIC_WALINE_SERVER_URL || 'http://localhost:8360'
    }
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
