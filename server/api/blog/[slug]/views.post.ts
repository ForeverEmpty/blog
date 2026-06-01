export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  const article = (await readArticles()).find((item) => item.slug === slug)

  if (!article || article.published === false) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article Not Found'
    })
  }

  const forwardedFor = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  const ip = getRequestIP(event, { xForwardedFor: true }) || forwardedFor || 'unknown'
  const userAgent = getRequestHeader(event, 'user-agent') || 'unknown'
  const visitorKey = createViewVisitorKey(slug, ip, userAgent)
  const result = await recordArticleView(slug, visitorKey)

  return {
    ...result,
    views: Math.max(article.views, result.views)
  }
})
