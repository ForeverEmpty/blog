export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''

  await deleteWalineComment(id)
  await writeAdminLog({
    action: 'comment.delete',
    targetType: 'comment',
    targetId: id,
    message: `删除评论：${id}`
  }).catch(() => {})

  return { ok: true }
})
