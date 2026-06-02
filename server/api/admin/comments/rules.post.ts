import type { CommentModerationConfig } from '~~/server/utils/commentModeration'

export default defineEventHandler(async (event) => {
  const body = await readBody<CommentModerationConfig>(event)
  const rules = await saveCommentModerationRulesFile(body || {})

  await writeAdminLog({
    action: 'comment.rules.update',
    targetType: 'comment',
    targetId: 'app/config/commentModerationRules.ts',
    message: '更新评论治理规则',
    payload: {
      enabled: rules.enabled,
      maxLinks: rules.maxLinks,
      blockedKeywords: rules.blockedKeywords.length,
      reviewKeywords: rules.reviewKeywords.length,
      blockedAuthors: rules.blockedAuthors.length,
      blockedEmailDomains: rules.blockedEmailDomains.length,
      blockedIps: rules.blockedIps.length
    }
  }).catch(() => {})

  return rules
})
