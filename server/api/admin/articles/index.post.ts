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
  const audit = createAdminAuditTrail(existing || undefined, article, [
    { key: 'title', label: '标题' },
    { key: 'description', label: '摘要' },
    { key: 'date', label: '发布日期' },
    { key: 'scheduledAt', label: '定时时间' },
    { key: 'author', label: '作者' },
    { key: 'category', label: '分类' },
    { key: 'workflowStatus', label: '工作流' },
    { key: 'published', label: '发布状态' },
    { key: 'locked', label: '锁定' },
    { key: 'pinned', label: '置顶' },
    { key: 'tags', label: '标签' },
    { key: 'markdown', label: '正文长度', format: formatAuditTextLength }
  ])

  await deleteArticleAutosave(article.slug)
  await writeAdminLog({
    action: existing ? 'article.update' : 'article.create',
    targetType: 'article',
    targetId: article.slug,
    message: appendAuditSummary(existing ? `更新文章：${article.title}` : `新增文章：${article.title}`, audit),
    payload: withAuditPayload({
      title: article.title,
      workflowStatus: article.workflowStatus,
      scheduledAt: article.scheduledAt || null,
      published: article.published,
      locked: article.locked,
      pinned: article.pinned
    }, audit)
  })

  return article
})
