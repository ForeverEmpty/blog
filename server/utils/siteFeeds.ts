import { isArticlePublic } from './adminStorage'
import type { AdminArticle } from './adminStorage'

type FeedAuthor = {
  name: string
  url: string
}

type SiteFeedContext = {
  siteName: string
  siteDescription: string
  siteUrl: string
  author: FeedAuthor
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const getPublicSiteUrl = () => {
  const runtimeConfig = useRuntimeConfig()

  return trimTrailingSlash(String(runtimeConfig.public.siteUrl || 'http://localhost:3000'))
}

export const absoluteSiteUrl = (path = '/') => {
  if (/^https?:\/\//.test(path)) {
    return path
  }

  return `${getPublicSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`
}

export const escapeXml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;')

export const escapeJsonFeedHtml = (value: unknown) => escapeXml(value)

export const getSiteFeedContext = (): SiteFeedContext => {
  const appConfig = useAppConfig()

  return {
    siteName: appConfig.site.name,
    siteDescription: appConfig.site.description,
    siteUrl: getPublicSiteUrl(),
    author: {
      name: appConfig.site.author || appConfig.site.name,
      url: absoluteSiteUrl('/about')
    }
  }
}

export const getPublishedFeedArticles = async () => {
  const articles = await readArticles()

  return articles
    .filter((article) => isArticlePublic(article) && article.locked !== true)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export const articleUpdatedDate = (article: AdminArticle) => {
  const timestamp = Date.parse(article.date)

  return Number.isNaN(timestamp)
    ? new Date().toISOString()
    : new Date(timestamp).toISOString()
}

export const articleSummaryHtml = (article: AdminArticle) => (
  `<p>${escapeJsonFeedHtml(article.description)}</p>`
)
