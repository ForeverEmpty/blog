import type { WalineCommentStatus } from '~~/server/utils/walineComments'

const allowedStatuses = new Set(['approved', 'waiting', 'spam'])

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<{ status?: WalineCommentStatus }>(event)

  if (!allowedStatuses.has(String(body.status))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid comment status'
    })
  }

  const comment = await updateWalineCommentStatus(id, body.status as WalineCommentStatus)

  await writeAdminLog({
    action: 'comment.update',
    targetType: 'comment',
    targetId: id,
    message: `更新评论状态：${comment.author} / ${comment.status}`,
    payload: {
      articleSlug: comment.articleSlug,
      status: comment.status
    }
  }).catch(() => {})

  return comment
})
