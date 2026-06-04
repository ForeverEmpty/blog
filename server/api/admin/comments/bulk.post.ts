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

  const existingComments = await readWalineComments()
  const selectedComments = existingComments.filter((comment) => ids.includes(comment.id))

  if (action === 'delete') {
    const deletedCount = await deleteWalineComments(ids)
    const audit = createAdminAuditTrail(
      {
        count: selectedComments.length,
        statuses: selectedComments.map((comment) => comment.status)
      },
      {
        count: 0,
        statuses: []
      },
      [
        { key: 'count', label: '评论数量' },
        { key: 'statuses', label: '原状态' }
      ]
    )

    await writeAdminLog({
      action: 'comment.bulk.delete',
      targetType: 'comment',
      targetId: ids.join(','),
      message: appendAuditSummary(`批量删除评论：${deletedCount} 条`, audit),
      payload: withAuditPayload({
        ids,
        deletedCount
      }, audit)
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
  const nextStatus = body.status as WalineCommentStatus
  const audit = createAdminAuditTrail(
    {
      status: selectedComments.map((comment) => comment.status),
      count: selectedComments.length
    },
    {
      status: [nextStatus],
      count: comments.length
    },
    [
      { key: 'status', label: '评论状态' },
      { key: 'count', label: '评论数量' }
    ]
  )

  await writeAdminLog({
    action: 'comment.bulk.status',
    targetType: 'comment',
    targetId: ids.join(','),
    message: appendAuditSummary(`批量更新评论状态：${comments.length} 条 / ${nextStatus}`, audit),
    payload: withAuditPayload({
      ids,
      status: nextStatus,
      updatedCount: comments.length
    }, audit)
  }).catch(() => {})

  return {
    ok: true,
    comments
  }
})
