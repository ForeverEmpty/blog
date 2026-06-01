export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.title || typeof body.title !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Article title is required'
    })
  }

  const slug = typeof body.slug === 'string' && body.slug ? body.slug : slugify(body.title)
  assertSafeSlug(slug)

  const existing = await readArticle(slug).catch(() => null)
  const autosave = await saveArticleAutosave({
    id: slug,
    slug,
    path: `/blog/${slug}`,
    title: body.title,
    description: typeof body.description === 'string' ? body.description : '',
    date: typeof body.date === 'string' && body.date ? body.date : new Date().toISOString().slice(0, 10),
    author: typeof body.author === 'string' && body.author ? body.author : existing?.author || 'Chanko',
    authorUrl: typeof body.authorUrl === 'string' ? body.authorUrl : existing?.authorUrl || '/about',
    category: typeof body.category === 'string' && body.category ? body.category : '未分类',
    published: body.published !== false,
    locked: body.locked === true,
    pinned: body.pinned === true,
    views: Math.max(0, Number(body.views ?? existing?.views ?? 0)),
    tags: Array.isArray(body.tags) ? body.tags.map(String) : [],
    markdown: typeof body.markdown === 'string' ? body.markdown : ''
  })

  return autosave
})
