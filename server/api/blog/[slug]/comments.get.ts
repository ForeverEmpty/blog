export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''

  assertSafeSlug(slug)

  const commentsBySlug = await readComments()

  return (commentsBySlug[slug] || [])
    .filter((comment) => comment.status === 'published')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
})
