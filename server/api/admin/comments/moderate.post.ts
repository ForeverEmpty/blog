import type { WalineComment, WalineCommentStatus } from '~~/server/utils/walineComments'

const nextGovernedStatus = (comment: WalineComment, suggestedStatus: WalineCommentStatus): WalineCommentStatus => {
  if (comment.status === 'spam' && suggestedStatus === 'approved') {
    return 'spam'
  }

  return suggestedStatus
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: string[] }>(event)
  const ids = Array.from(new Set((body.ids || []).map((id) => String(id).trim()).filter(Boolean)))

  if (ids.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Too many comment ids'
    })
  }

  const rules = getCommentModerationRules(event)
  const comments = await readWalineComments()
  const targetComments = ids.length > 0
    ? comments.filter((comment) => ids.includes(comment.id))
    : comments
  const statusGroups = targetComments.reduce((groups, comment) => {
    const moderation = evaluateWalineCommentModeration(comment, rules)
    const status = nextGovernedStatus(comment, moderation.status)

    if (status !== comment.status) {
      groups[status] = [...(groups[status] || []), comment.id]
    }

    return groups
  }, {} as Partial<Record<WalineCommentStatus, string[]>>)
  const updatedComments: WalineComment[] = []

  for (const status of ['approved', 'waiting', 'spam'] as const) {
    const groupedIds = statusGroups[status] || []

    if (groupedIds.length > 0) {
      updatedComments.push(...await updateWalineCommentStatuses(groupedIds, status))
    }
  }

  const updatedMap = new Map(updatedComments.map((comment) => [comment.id, comment]))
  const governedComments = targetComments.map((comment) => (
    withCommentModeration(updatedMap.get(comment.id) || comment, rules)
  ))

  await writeAdminLog({
    action: 'comment.moderate',
    targetType: 'comment',
    targetId: ids.length > 0 ? ids.join(',') : 'all',
    message: `按规则治理评论：检查 ${targetComments.length} 条，更新 ${updatedComments.length} 条`,
    payload: {
      ids,
      checkedCount: targetComments.length,
      updatedCount: updatedComments.length,
      rulesEnabled: rules.enabled
    }
  }).catch(() => {})

  return {
    ok: true,
    checkedCount: targetComments.length,
    updatedCount: updatedComments.length,
    comments: governedComments
  }
})
