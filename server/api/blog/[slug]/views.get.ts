export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  const article = (await readArticles()).find((item) => item.slug === slug)

  if (!article || article.published === false) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article Not Found'
    })
  }

  const storedViews = await getArticleViewCount(slug)

  return {
    slug,
    views: Math.max(article.views, storedViews)
  }
})
