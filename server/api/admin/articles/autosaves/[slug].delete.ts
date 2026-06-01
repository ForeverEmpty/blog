export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''

  assertSafeSlug(slug)
  await deleteArticleAutosave(slug)
  await writeAdminLog({
    action: 'article.autosave.delete',
    targetType: 'article',
    targetId: slug,
    message: `删除文章自动保存：${slug}`
  })

  return { ok: true }
})
