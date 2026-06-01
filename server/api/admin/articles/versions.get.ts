export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const slug = typeof query.slug === 'string' && query.slug ? query.slug : undefined
  const limit = Number(query.limit || 80)

  if (slug) {
    assertSafeSlug(slug)
  }

  return readArticleVersions(slug, limit)
})
