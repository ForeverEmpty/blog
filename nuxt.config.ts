// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/index.css'],
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        {
          rel: 'icon',
          type: 'image/svg+xml',
          sizes: 'any',
          href: '/favicon.svg?v=20260603'
        },
      ],
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
    adminUsername: process.env.NUXT_ADMIN_USERNAME || process.env.ADMIN_USERNAME || 'admin',
    adminPassword: process.env.NUXT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || '',
    adminSessionSecret: process.env.NUXT_ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || '',
    aiSummaryApiKey: process.env.NUXT_AI_SUMMARY_API_KEY || process.env.AI_SUMMARY_API_KEY || process.env.OPENAI_API_KEY || '',
    aiSummaryEndpoint: process.env.NUXT_AI_SUMMARY_ENDPOINT || process.env.AI_SUMMARY_ENDPOINT || process.env.OPENAI_API_ENDPOINT || '',
    notificationSmtpHost: process.env.NUXT_NOTIFICATION_SMTP_HOST || process.env.NOTIFICATION_SMTP_HOST || '',
    notificationSmtpPort: process.env.NUXT_NOTIFICATION_SMTP_PORT || process.env.NOTIFICATION_SMTP_PORT || '',
    notificationSmtpSecure: process.env.NUXT_NOTIFICATION_SMTP_SECURE || process.env.NOTIFICATION_SMTP_SECURE || '',
    notificationSmtpUser: process.env.NUXT_NOTIFICATION_SMTP_USER || process.env.NOTIFICATION_SMTP_USER || '',
    notificationSmtpPassword: process.env.NUXT_NOTIFICATION_SMTP_PASSWORD || process.env.NOTIFICATION_SMTP_PASSWORD || '',
    notificationEmailFrom: process.env.NUXT_NOTIFICATION_EMAIL_FROM || process.env.NOTIFICATION_EMAIL_FROM || '',
    notificationEmailTo: process.env.NUXT_NOTIFICATION_EMAIL_TO || process.env.NOTIFICATION_EMAIL_TO || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'http://localhost:3000',
      walineServerURL: process.env.NUXT_PUBLIC_WALINE_SERVER_URL || 'http://localhost:8360'
    }
  },
  modules: [
    '@nuxt/icon',
    '@pinia/nuxt',
    '@nuxt/image',
    '@nuxt/content',
    '@nuxtjs/robots'
  ],
  robots: {
    sitemap: ['/sitemap.xml'],
    disallow: ['/admin', '/admin/**', '/api/admin', '/api/admin/**'],
    robotsEnabledValue: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    robotsDisabledValue: 'noindex, nofollow',
    credits: false
  },
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
