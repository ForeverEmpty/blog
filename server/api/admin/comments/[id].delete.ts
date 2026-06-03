export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const existing = (await readWalineComments()).find((item) => item.id === id)
  const audit = createAdminAuditTrail(existing, undefined, [
    { key: 'author', label: '昵称' },
    { key: 'articleSlug', label: '文章' },
    { key: 'status', label: '评论状态' },
    { key: 'content', label: '内容长度', format: formatAuditTextLength }
  ])

  await deleteWalineComment(id)
  await writeAdminLog({
    action: 'comment.delete',
    targetType: 'comment',
    targetId: id,
    message: appendAuditSummary(existing ? `删除评论：${existing.author || id}` : `删除评论：${id}`, audit),
    payload: withAuditPayload({
      author: existing?.author || '',
      articleSlug: existing?.articleSlug || ''
    }, audit)
  }).catch(() => {})

  return { ok: true }
})
