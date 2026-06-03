type SitemapEntry = {
  loc: string
  lastmod?: string
  changefreq?: string
  priority?: string
}

const sitemapEntry = (entry: SitemapEntry) => [
  '<url>',
  `<loc>${escapeXml(entry.loc)}</loc>`,
  entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '',
  entry.changefreq ? `<changefreq>${escapeXml(entry.changefreq)}</changefreq>` : '',
  entry.priority ? `<priority>${escapeXml(entry.priority)}</priority>` : '',
  '</url>'
].filter(Boolean).join('')

export default defineEventHandler(async (event) => {
  const now = new Date().toISOString()
  const articles = await readArticles()
  const projects = await readProjects()
  const publishedArticles = articles.filter(isArticlePublic)
  const entries: SitemapEntry[] = [
    { loc: absoluteSiteUrl('/'), lastmod: now, changefreq: 'daily', priority: '1.0' },
    { loc: absoluteSiteUrl('/blog'), lastmod: now, changefreq: 'daily', priority: '0.9' },
    { loc: absoluteSiteUrl('/archive'), lastmod: now, changefreq: 'weekly', priority: '0.7' },
    { loc: absoluteSiteUrl('/projects'), lastmod: now, changefreq: 'weekly', priority: '0.7' },
    { loc: absoluteSiteUrl('/friends'), lastmod: now, changefreq: 'weekly', priority: '0.5' },
    { loc: absoluteSiteUrl('/subscribe'), lastmod: now, changefreq: 'weekly', priority: '0.5' },
    { loc: absoluteSiteUrl('/about'), lastmod: now, changefreq: 'monthly', priority: '0.6' },
    ...publishedArticles.map((article) => ({
      loc: absoluteSiteUrl(article.path),
      lastmod: articleUpdatedDate(article),
      changefreq: 'monthly',
      priority: article.pinned ? '0.9' : '0.8'
    })),
    ...projects
      .filter((project) => project.launchUrl)
      .map((project) => ({
        loc: project.launchUrl,
        lastmod: now,
        changefreq: 'monthly',
        priority: '0.4'
      }))
  ]

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'max-age=900, stale-while-revalidate=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${entries.map(sitemapEntry).join('\n  ')}
</urlset>`
})
