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

type ArticleFeedImage = {
  url: string
  alt: string
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')
const maxFeedParagraphs = 4
const maxFeedTextLength = 900

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

const isUnsafeUrl = (value: string) => /^(?:javascript|data|vbscript):/i.test(value.trim())

export const absoluteSafeFeedUrl = (value: unknown) => {
  const url = String(value || '').trim()

  if (!url || isUnsafeUrl(url)) {
    return ''
  }

  return absoluteSiteUrl(url)
}

const uniq = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))

export const articleFeedTags = (article: AdminArticle) => (
  uniq([article.category, ...article.tags])
)

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

export const articleFeedAuthorUrl = (article: AdminArticle, fallbackUrl: string) => (
  absoluteSafeFeedUrl(article.authorUrl) || fallbackUrl
)

export const articleFeedImage = (article: AdminArticle): ArticleFeedImage | null => {
  const match = article.markdown.match(/!\[([^\]]*)]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/)
  const url = absoluteSafeFeedUrl(match?.[2])

  if (!url) {
    return null
  }

  return {
    url,
    alt: String(match?.[1] || article.title).trim()
  }
}

const stripFeedMarkdownBlocks = (markdown: string) => (
  markdown
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/:::[\s\S]*?:::/g, '\n')
    .replace(/::[a-zA-Z][\w-]*(?:\{[^}]*})?\s*/g, '\n')
    .replace(/^\s*::\s*$/gm, '\n')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '\n')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*_]{3,}\s*$/gm, '\n')
)

const truncateFeedText = (value: string, limit = maxFeedTextLength) => {
  const chars = Array.from(value.trim())

  return chars.length > limit ? `${chars.slice(0, limit).join('').trim()}...` : chars.join('')
}

const articleFeedParagraphs = (article: AdminArticle) => {
  const paragraphs = stripFeedMarkdownBlocks(article.markdown)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((paragraph) => paragraph && paragraph !== article.title && !/^tags?:/i.test(paragraph))

  if (paragraphs.length > 0) {
    const selected: string[] = []
    let totalLength = 0

    for (const paragraph of paragraphs) {
      if (selected.length >= maxFeedParagraphs || totalLength >= maxFeedTextLength) {
        break
      }

      const remaining = maxFeedTextLength - totalLength
      const next = truncateFeedText(paragraph, remaining)

      if (next) {
        selected.push(next)
        totalLength += Array.from(next).length
      }
    }

    return selected
  }

  return [article.description]
}

const renderFeedInlineMarkdown = (value: string) => {
  const placeholders: string[] = []
  const stash = (html: string) => {
    const key = `__FEED_HTML_${placeholders.length}__`

    placeholders.push(html)

    return key
  }

  let next = value
    .replace(/`([^`]+)`/g, (_match, code: string) => stash(`<code>${escapeXml(code)}</code>`))
    .replace(/\[([^\]]+)]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g, (_match, label: string, href: string) => {
      const url = absoluteSafeFeedUrl(href)

      if (!url) {
        return label
      }

      return stash(`<a href="${escapeXml(url)}">${escapeXml(label)}</a>`)
    })

  next = escapeXml(next)
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')

  placeholders.forEach((html, index) => {
    next = next.replace(`__FEED_HTML_${index}__`, html)
  })

  return next
}

export const articleFeedText = (article: AdminArticle) => (
  articleFeedParagraphs(article)
    .join('\n\n')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/[`*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || article.description
)

export const articleSummaryHtml = (article: AdminArticle) => {
  const image = articleFeedImage(article)
  const imageHtml = image
    ? [
        '<figure>',
        `<img src="${escapeXml(image.url)}" alt="${escapeXml(image.alt)}" />`,
        image.alt ? `<figcaption>${escapeXml(image.alt)}</figcaption>` : '',
        '</figure>'
      ].filter(Boolean).join('')
    : ''
  const paragraphsHtml = articleFeedParagraphs(article)
    .map((paragraph) => `<p>${renderFeedInlineMarkdown(paragraph)}</p>`)
    .join('')
  const readMoreHtml = `<p><a href="${escapeXml(absoluteSiteUrl(article.path))}">阅读全文</a></p>`

  return `${imageHtml}${paragraphsHtml}${readMoreHtml}`
}
