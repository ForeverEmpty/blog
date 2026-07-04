export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''

  assertSafeSlug(slug)
  const existing = await readArticle(slug).catch(() => null)

  if (existing) {
    await createArticleVersion(existing, 'article.delete')
  }

  await deleteArticle(slug)
  await removePublicArticleFromIndex(slug)
  invalidatePublicArticleCache(slug)
  await deleteArticleAutosave(slug)
  const audit = createAdminAuditTrail(existing || undefined, undefined, [
    { key: 'title', label: '标题' },
    { key: 'workflowStatus', label: '工作流' },
    { key: 'published', label: '发布状态' },
    { key: 'locked', label: '锁定' },
    { key: 'pinned', label: '置顶' },
    { key: 'tags', label: '标签' }
  ])

  await writeAdminLog({
    action: 'article.delete',
    targetType: 'article',
    targetId: slug,
    message: appendAuditSummary(existing ? `删除文章：${existing.title}` : `删除文章：${slug}`, audit),
    payload: withAuditPayload({
      title: existing?.title || slug
    }, audit)
  })

  return { ok: true }
})
