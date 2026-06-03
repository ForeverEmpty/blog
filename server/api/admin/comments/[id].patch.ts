import type { WalineCommentStatus } from '~~/server/utils/walineComments'

const allowedStatuses = new Set(['approved', 'waiting', 'spam'])

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<{ status?: WalineCommentStatus }>(event)
  const rules = getCommentModerationRules(event)

  if (!allowedStatuses.has(String(body.status))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid comment status'
    })
  }

  const existing = (await readWalineComments()).find((item) => item.id === id)
  const comment = withCommentModeration(
    await updateWalineCommentStatus(id, body.status as WalineCommentStatus),
    rules
  )
  const audit = createAdminAuditTrail(existing, comment, [
    { key: 'status', label: '评论状态' },
    { key: 'author', label: '昵称' },
    { key: 'articleSlug', label: '文章' }
  ])

  await writeAdminLog({
    action: 'comment.update',
    targetType: 'comment',
    targetId: id,
    message: appendAuditSummary(`更新评论状态：${comment.author} / ${comment.status}`, audit),
    payload: withAuditPayload({
      articleSlug: comment.articleSlug,
      status: comment.status
    }, audit)
  }).catch(() => {})

  return comment
})
