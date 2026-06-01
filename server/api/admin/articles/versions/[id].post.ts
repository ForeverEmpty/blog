export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const version = await readArticleVersion(id)

  if (!version) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article version not found'
    })
  }

  const current = await readArticle(version.slug).catch(() => null)

  if (current) {
    await createArticleVersion(current, 'article.restore.before')
  }

  const article = await saveArticle(version)

  await deleteArticleAutosave(article.slug)
  await writeAdminLog({
    action: 'article.restore',
    targetType: 'article',
    targetId: article.slug,
    message: `恢复文章版本：${article.title}`,
    payload: {
      versionId: version.versionId,
      versionCreatedAt: version.createdAt
    }
  })

  return article
})
