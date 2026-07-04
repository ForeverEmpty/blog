export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'private, max-age=0, must-revalidate')

  const slug = getRouterParam(event, 'slug') || ''
  const article = await readPublicArticle(slug)

  if (!article) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article not found',
    })
  }

  return article
})
