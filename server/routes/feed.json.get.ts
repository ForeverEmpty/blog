export default defineEventHandler(async (event) => {
  const context = getSiteFeedContext()
  const articles = await getPublishedFeedArticles()

  setHeader(event, 'content-type', 'application/feed+json; charset=utf-8')
  setHeader(event, 'cache-control', 'max-age=900, stale-while-revalidate=3600')

  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: context.siteName,
    home_page_url: context.siteUrl,
    feed_url: absoluteSiteUrl('/feed.json'),
    description: context.siteDescription,
    language: 'zh-CN',
    authors: [
      {
        name: context.author.name,
        url: context.author.url
      }
    ],
    items: articles.map((article) => {
      const url = absoluteSiteUrl(article.path)

      return {
        id: url,
        url,
        title: article.title,
        summary: article.description,
        content_html: articleSummaryHtml(article),
        date_published: articleUpdatedDate(article),
        date_modified: articleUpdatedDate(article),
        author: {
          name: article.author,
          url: article.authorUrl ? absoluteSiteUrl(article.authorUrl) : context.author.url
        },
        tags: [article.category, ...article.tags].filter(Boolean)
      }
    })
  }
})
