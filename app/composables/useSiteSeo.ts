type SiteSeoJsonLd = Record<string, unknown> | Record<string, unknown>[]

type SiteSeoOptions = {
  title?: string
  description?: string
  path?: string
  image?: string
  type?: 'website' | 'article'
  noindex?: boolean
  jsonLd?: SiteSeoJsonLd
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const normalizeSeoPath = (path: string) => {
  if (!path) {
    return '/'
  }

  if (/^https?:\/\//.test(path)) {
    return path
  }

  return path.startsWith('/') ? path : `/${path}`
}

export const useAbsoluteSiteUrl = (path = '/') => {
  const runtimeConfig = useRuntimeConfig()
  const appConfig = useAppConfig()
  const siteUrl = trimTrailingSlash(String(runtimeConfig.public.siteUrl || appConfig.seo.siteUrl || 'http://localhost:3000'))
  const normalizedPath = normalizeSeoPath(path)

  if (/^https?:\/\//.test(normalizedPath)) {
    return normalizedPath
  }

  return `${siteUrl}${normalizedPath}`
}

export const useSiteSeo = (options: SiteSeoOptions = {}) => {
  const route = useRoute()
  const appConfig = useAppConfig()
  const canonicalPath = options.path || route.path || '/'
  const canonicalUrl = useAbsoluteSiteUrl(canonicalPath)
  const imageUrl = useAbsoluteSiteUrl(options.image || appConfig.seo.defaultImage || '/favicon.ico')
  const title = options.title || appConfig.seo.defaultTitle || appConfig.site.name
  const fullTitle = options.title
    ? String(appConfig.seo.titleTemplate || `%s - ${appConfig.site.name}`).replace('%s', title)
    : title
  const description = options.description || appConfig.site.description
  const robots = options.noindex ? 'noindex,nofollow' : 'index,follow'

  useSeoMeta({
    title: fullTitle,
    description,
    robots,
    ogTitle: fullTitle,
    ogDescription: description,
    ogUrl: canonicalUrl,
    ogType: options.type || 'website',
    ogSiteName: appConfig.site.name,
    ogImage: imageUrl,
    twitterCard: 'summary_large_image',
    twitterTitle: fullTitle,
    twitterDescription: description,
    twitterImage: imageUrl
  })

  useHead({
    htmlAttrs: {
      lang: appConfig.site.locale || 'zh-CN'
    },
    link: [
      {
        rel: 'canonical',
        href: canonicalUrl
      },
      {
        rel: 'alternate',
        type: 'application/rss+xml',
        title: `${appConfig.site.name} RSS`,
        href: useAbsoluteSiteUrl(appConfig.seo.feed.rss)
      },
      {
        rel: 'alternate',
        type: 'application/atom+xml',
        title: `${appConfig.site.name} Atom`,
        href: useAbsoluteSiteUrl(appConfig.seo.feed.atom)
      },
      {
        rel: 'alternate',
        type: 'application/feed+json',
        title: `${appConfig.site.name} JSON Feed`,
        href: useAbsoluteSiteUrl(appConfig.seo.feed.json)
      }
    ],
    script: options.jsonLd
      ? [
          {
            type: 'application/ld+json',
            innerHTML: JSON.stringify(options.jsonLd)
          }
        ]
      : []
  })

  return {
    canonicalUrl,
    imageUrl,
    title: fullTitle,
    description
  }
}
