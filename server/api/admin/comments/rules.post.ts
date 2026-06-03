import type { CommentModerationConfig } from '~~/server/utils/commentModeration'

export default defineEventHandler(async (event) => {
  const body = await readBody<CommentModerationConfig>(event)
  const existingRules = getCommentModerationRules(event)
  const rules = await saveCommentModerationRulesFile(body || {})
  const audit = createAdminAuditTrail(existingRules, rules, [
    { key: 'enabled', label: '启用状态' },
    { key: 'maxLinks', label: '链接上限' },
    { key: 'maxRepeatedCharacterRun', label: '重复字符上限' },
    { key: 'minContentLength', label: '最短内容' },
    { key: 'blockedKeywords', label: '拦截词' },
    { key: 'reviewKeywords', label: '待审词' },
    { key: 'blockedAuthors', label: '拦截昵称' },
    { key: 'blockedEmailDomains', label: '拦截邮箱域' },
    { key: 'blockedIps', label: '拦截 IP' }
  ])

  await writeAdminLog({
    action: 'comment.rules.update',
    targetType: 'comment',
    targetId: 'app/config/commentModerationRules.ts',
    message: appendAuditSummary('更新评论治理规则', audit),
    payload: withAuditPayload({
      enabled: rules.enabled,
      maxLinks: rules.maxLinks,
      blockedKeywords: rules.blockedKeywords.length,
      reviewKeywords: rules.reviewKeywords.length,
      blockedAuthors: rules.blockedAuthors.length,
      blockedEmailDomains: rules.blockedEmailDomains.length,
      blockedIps: rules.blockedIps.length
    }, audit)
  }).catch(() => {})

  return rules
})
