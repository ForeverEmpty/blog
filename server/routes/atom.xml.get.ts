export default defineEventHandler(async (event) => {
  const context = getSiteFeedContext()
  const articles = await getPublishedFeedArticles()
  const updatedAt = articles[0] ? articleUpdatedDate(articles[0]) : new Date().toISOString()
  const entries = articles.map((article) => {
    const url = absoluteSiteUrl(article.path)
    const image = articleFeedImage(article)
    const tags = articleFeedTags(article)

    return [
      '<entry>',
      `<title>${escapeXml(article.title)}</title>`,
      `<link href="${escapeXml(url)}" />`,
      image ? `<link rel="enclosure" href="${escapeXml(image.url)}" />` : '',
      `<id>${escapeXml(url)}</id>`,
      `<updated>${escapeXml(articleUpdatedDate(article))}</updated>`,
      `<published>${escapeXml(articleUpdatedDate(article))}</published>`,
      `<summary>${escapeXml(article.description)}</summary>`,
      `<content type="html">${escapeXml(articleSummaryHtml(article))}</content>`,
      `<author><name>${escapeXml(article.author)}</name><uri>${escapeXml(articleFeedAuthorUrl(article, context.author.url))}</uri></author>`,
      ...tags.map((tag) => `<category term="${escapeXml(tag)}" />`),
      '</entry>'
    ].filter(Boolean).join('')
  }).join('')

  setHeader(event, 'content-type', 'application/atom+xml; charset=utf-8')
  setHeader(event, 'cache-control', 'max-age=900, stale-while-revalidate=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(context.siteName)}</title>
  <subtitle>${escapeXml(context.siteDescription)}</subtitle>
  <link href="${escapeXml(context.siteUrl)}" />
  <link href="${escapeXml(absoluteSiteUrl('/atom.xml'))}" rel="self" />
  <id>${escapeXml(context.siteUrl)}</id>
  <updated>${escapeXml(updatedAt)}</updated>
  <author>
    <name>${escapeXml(context.author.name)}</name>
    <uri>${escapeXml(context.author.url)}</uri>
  </author>
  ${entries}
</feed>`
})
