import type { SitemapUrlInput } from '#sitemap/types'

export default defineSitemapEventHandler(async () => {
  const now = new Date().toISOString()
  const articles = await readArticles()
  const publishedArticles = articles.filter(isArticlePublic)

  return [
    { loc: '/', lastmod: now, changefreq: 'daily', priority: 1 },
    { loc: '/blog', lastmod: now, changefreq: 'daily', priority: 0.9 },
    { loc: '/archive', lastmod: now, changefreq: 'weekly', priority: 0.7 },
    { loc: '/projects', lastmod: now, changefreq: 'weekly', priority: 0.7 },
    { loc: '/friends', lastmod: now, changefreq: 'weekly', priority: 0.5 },
    { loc: '/subscribe', lastmod: now, changefreq: 'weekly', priority: 0.5 },
    { loc: '/about', lastmod: now, changefreq: 'monthly', priority: 0.6 },
    ...publishedArticles.map((article) => ({
      loc: article.path,
      lastmod: articleUpdatedDate(article),
      changefreq: 'monthly' as const,
      priority: article.pinned ? 0.9 : 0.8
    }))
  ] satisfies SitemapUrlInput[]
})
