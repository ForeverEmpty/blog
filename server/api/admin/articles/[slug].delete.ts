export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''

  assertSafeSlug(slug)
  const existing = await readArticle(slug).catch(() => null)

  if (existing) {
    await createArticleVersion(existing, 'article.delete')
  }

  await deleteArticle(slug)
  await deleteArticleAutosave(slug)
  await writeAdminLog({
    action: 'article.delete',
    targetType: 'article',
    targetId: slug,
    message: existing ? `删除文章：${existing.title}` : `删除文章：${slug}`,
    payload: {
      title: existing?.title || slug
    }
  })

  return { ok: true }
})
