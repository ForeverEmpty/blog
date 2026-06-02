import type { WalineCommentStatus } from '~~/server/utils/walineComments'

const allowedStatuses = new Set(['approved', 'waiting', 'spam'])
const allowedActions = new Set(['status', 'delete'])

export default defineEventHandler(async (event) => {
  const rules = getCommentModerationRules(event)
  const body = await readBody<{
    action?: 'status' | 'delete'
    ids?: string[]
    status?: WalineCommentStatus
  }>(event)
  const action = String(body.action || '')
  const ids = Array.from(new Set((body.ids || []).map((id) => String(id).trim()).filter(Boolean)))

  if (!allowedActions.has(action)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid bulk action'
    })
  }

  if (ids.length === 0 || ids.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid comment ids'
    })
  }

  if (action === 'delete') {
    const deletedCount = await deleteWalineComments(ids)

    await writeAdminLog({
      action: 'comment.bulk.delete',
      targetType: 'comment',
      targetId: ids.join(','),
      message: `批量删除评论：${deletedCount} 条`,
      payload: {
        ids,
        deletedCount
      }
    }).catch(() => {})

    return {
      ok: true,
      deletedCount
    }
  }

  if (!allowedStatuses.has(String(body.status))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid comment status'
    })
  }

  const comments = (await updateWalineCommentStatuses(ids, body.status as WalineCommentStatus))
    .map((comment) => withCommentModeration(comment, rules))

  await writeAdminLog({
    action: 'comment.bulk.status',
    targetType: 'comment',
    targetId: ids.join(','),
    message: `批量更新评论状态：${comments.length} 条 / ${body.status}`,
    payload: {
      ids,
      status: body.status,
      updatedCount: comments.length
    }
  }).catch(() => {})

  return {
    ok: true,
    comments
  }
})
