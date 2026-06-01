export default defineEventHandler(async (event) => {
  const context = getSiteFeedContext()
  const articles = await getPublishedFeedArticles()
  const updatedAt = articles[0] ? articleUpdatedDate(articles[0]) : new Date().toISOString()
  const items = articles.map((article) => {
    const url = absoluteSiteUrl(article.path)

    return [
      '<item>',
      `<title>${escapeXml(article.title)}</title>`,
      `<link>${escapeXml(url)}</link>`,
      `<guid isPermaLink="true">${escapeXml(url)}</guid>`,
      `<description>${escapeXml(article.description)}</description>`,
      `<pubDate>${new Date(articleUpdatedDate(article)).toUTCString()}</pubDate>`,
      `<author>${escapeXml(article.author)}</author>`,
      article.category ? `<category>${escapeXml(article.category)}</category>` : '',
      ...article.tags.map((tag) => `<category>${escapeXml(tag)}</category>`),
      '</item>'
    ].filter(Boolean).join('')
  }).join('')

  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  setHeader(event, 'cache-control', 'max-age=900, stale-while-revalidate=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(context.siteName)}</title>
    <link>${escapeXml(context.siteUrl)}</link>
    <description>${escapeXml(context.siteDescription)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date(updatedAt).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteSiteUrl('/rss.xml'))}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`
})
