export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.title || typeof body.title !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Article title is required'
    })
  }

  const slug = typeof body.slug === 'string' && body.slug ? body.slug : slugify(body.title)
  const existing = await readArticle(slug).catch(() => null)

  if (existing) {
    await createArticleVersion(existing, 'article.update')
  }

  const article = await saveArticle({
    ...body,
    slug
  })

  await deleteArticleAutosave(article.slug)
  await writeAdminLog({
    action: existing ? 'article.update' : 'article.create',
    targetType: 'article',
    targetId: article.slug,
    message: existing ? `更新文章：${article.title}` : `新增文章：${article.title}`,
    payload: {
      title: article.title,
      workflowStatus: article.workflowStatus,
      scheduledAt: article.scheduledAt || null,
      published: article.published,
      locked: article.locked,
      pinned: article.pinned
    }
  })

  return article
})
