export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''

  assertSafeSlug(slug)
  await deleteArticle(slug)

  return { ok: true }
})
