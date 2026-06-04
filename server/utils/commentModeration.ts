import type { H3Event } from 'h3'
import type { WalineComment, WalineCommentStatus } from '~~/server/utils/walineComments'

export type CommentModerationRuleSeverity = 'review' | 'spam'

export type CommentModerationReason = {
  id: string
  label: string
  detail: string
  severity: CommentModerationRuleSeverity
}

export type CommentModerationResult = {
  enabled: boolean
  status: WalineCommentStatus
  score: number
  reasons: CommentModerationReason[]
}

export type CommentModerationInput = {
  author?: string
  mail?: string
  link?: string
  website?: string
  content?: string
  ip?: string
  userAgent?: string
}

export type CommentModerationConfig = {
  enabled?: boolean
  maxLinks?: number
  maxRepeatedCharacterRun?: number
  minContentLength?: number
  blockedKeywords?: string[]
  reviewKeywords?: string[]
  blockedAuthors?: string[]
  blockedEmailDomains?: string[]
  blockedIps?: string[]
}

const fallbackRules: Required<CommentModerationConfig> = {
  enabled: true,
  maxLinks: 3,
  maxRepeatedCharacterRun: 12,
  minContentLength: 2,
  blockedKeywords: ['casino', 'viagra', 'porn', 'loan', '博彩', '赌博', '色情', '贷款', '发票', '代开', '刷单'],
  reviewKeywords: ['推广', '合作', '加群', 'telegram', 'whatsapp', 'seo'],
  blockedAuthors: ['admin', 'administrator', '站长'],
  blockedEmailDomains: ['example.com', 'mailinator.com', 'tempmail.com', '10minutemail.com'],
  blockedIps: []
}

const toList = (value: unknown) => (
  Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : []
)

let runtimeRulesOverride: Required<CommentModerationConfig> | undefined

const toNumber = (value: unknown, fallback: number, min: number) => {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? Math.max(min, Math.floor(numberValue)) : fallback
}

const listOrFallback = (value: unknown, fallback: string[]) => (
  Array.isArray(value) ? toList(value) : fallback
)

export const normalizeCommentModerationRules = (
  rules: CommentModerationConfig = {}
): Required<CommentModerationConfig> => ({
  enabled: rules.enabled !== false,
  maxLinks: toNumber(rules.maxLinks, fallbackRules.maxLinks, 0),
  maxRepeatedCharacterRun: toNumber(
    rules.maxRepeatedCharacterRun,
    fallbackRules.maxRepeatedCharacterRun,
    1
  ),
  minContentLength: toNumber(rules.minContentLength, fallbackRules.minContentLength, 0),
  blockedKeywords: listOrFallback(rules.blockedKeywords, fallbackRules.blockedKeywords),
  reviewKeywords: listOrFallback(rules.reviewKeywords, fallbackRules.reviewKeywords),
  blockedAuthors: listOrFallback(rules.blockedAuthors, fallbackRules.blockedAuthors),
  blockedEmailDomains: listOrFallback(rules.blockedEmailDomains, fallbackRules.blockedEmailDomains),
  blockedIps: listOrFallback(rules.blockedIps, fallbackRules.blockedIps)
})

export const setRuntimeCommentModerationRules = (rules: CommentModerationConfig) => {
  runtimeRulesOverride = normalizeCommentModerationRules(rules)
}

export const getCommentModerationRules = (event?: H3Event): Required<CommentModerationConfig> => {
  if (runtimeRulesOverride) {
    return runtimeRulesOverride
  }

  const appConfig = useAppConfig()
  const moderation = ((appConfig.comments as { moderation?: CommentModerationConfig } | undefined)?.moderation || {})

  return normalizeCommentModerationRules(moderation)
}

const normalize = (value: unknown) => String(value || '').trim()
const normalizeSearch = (value: unknown) => normalize(value).toLowerCase()

const includesAny = (source: string, words: string[]) => (
  words.find((word) => source.includes(word.toLowerCase()))
)

const countLinks = (value: string) => (
  (value.match(/https?:\/\/|www\.|<a\s/gi) || []).length
)

const emailDomain = (value: string) => {
  const [, domain = ''] = value.toLowerCase().split('@')

  return domain.trim()
}

const pushReason = (
  reasons: CommentModerationReason[],
  severity: CommentModerationRuleSeverity,
  id: string,
  label: string,
  detail: string
) => {
  reasons.push({ id, label, detail, severity })
}

export const evaluateCommentModeration = (
  input: CommentModerationInput,
  rules: Required<CommentModerationConfig>
): CommentModerationResult => {
  if (!rules.enabled) {
    return {
      enabled: false,
      status: 'approved',
      score: 0,
      reasons: []
    }
  }

  const author = normalize(input.author)
  const mail = normalize(input.mail)
  const link = normalize(input.link || input.website)
  const content = normalize(input.content)
  const ip = normalize(input.ip)
  const userAgent = normalize(input.userAgent)
  const combined = normalizeSearch([author, mail, link, content, userAgent].join('\n'))
  const reasons: CommentModerationReason[] = []

  const blockedKeyword = includesAny(combined, rules.blockedKeywords)
  if (blockedKeyword) {
    pushReason(reasons, 'spam', 'blocked-keyword', '拦截词', `命中「${blockedKeyword}」。`)
  }

  const reviewKeyword = includesAny(combined, rules.reviewKeywords)
  if (reviewKeyword) {
    pushReason(reasons, 'review', 'review-keyword', '待审词', `命中「${reviewKeyword}」。`)
  }

  if (rules.blockedAuthors.some((name) => author.toLowerCase() === name.toLowerCase())) {
    pushReason(reasons, 'spam', 'blocked-author', '保留昵称', `昵称「${author}」不可用于评论。`)
  }

  const domain = emailDomain(mail)
  if (domain && rules.blockedEmailDomains.some((blockedDomain) => domain === blockedDomain.toLowerCase())) {
    pushReason(reasons, 'spam', 'blocked-email-domain', '临时邮箱', `邮箱域名「${domain}」已被拦截。`)
  }

  if (ip && rules.blockedIps.includes(ip)) {
    pushReason(reasons, 'spam', 'blocked-ip', '拦截 IP', `IP「${ip}」已被拦截。`)
  }

  const totalLinks = countLinks(content) + (link ? 1 : 0)
  if (totalLinks > rules.maxLinks) {
    pushReason(reasons, 'spam', 'too-many-links', '链接过多', `检测到 ${totalLinks} 个链接，超过上限 ${rules.maxLinks}。`)
  }

  const repeatedCharacterPattern = new RegExp(`(.)\\1{${Math.max(1, rules.maxRepeatedCharacterRun)},}`, 'u')
  if (repeatedCharacterPattern.test(content)) {
    pushReason(reasons, 'review', 'repeated-characters', '重复字符', `存在连续重复字符，超过上限 ${rules.maxRepeatedCharacterRun}。`)
  }

  if (/<\/?(script|iframe|object|embed|style)\b/i.test(content)) {
    pushReason(reasons, 'spam', 'unsafe-html', '危险 HTML', '评论中包含不允许的 HTML 标签。')
  }

  if (content.length < rules.minContentLength) {
    pushReason(reasons, 'review', 'too-short', '内容过短', `正文少于 ${rules.minContentLength} 个字符。`)
  }

  if (content && !/[\p{L}\p{N}]/u.test(content)) {
    pushReason(reasons, 'review', 'no-readable-text', '缺少可读文本', '评论正文没有可读文字或数字。')
  }

  const spamCount = reasons.filter((reason) => reason.severity === 'spam').length
  const reviewCount = reasons.filter((reason) => reason.severity === 'review').length

  return {
    enabled: true,
    status: spamCount > 0 ? 'spam' : reviewCount > 0 ? 'waiting' : 'approved',
    score: spamCount * 10 + reviewCount * 3,
    reasons
  }
}

export const evaluateWalineCommentModeration = (
  comment: WalineComment,
  rules: Required<CommentModerationConfig>
) => evaluateCommentModeration({
  author: comment.author,
  mail: comment.mail,
  link: comment.link,
  content: comment.content,
  ip: comment.ip,
  userAgent: comment.userAgent
}, rules)

export const withCommentModeration = (
  comment: WalineComment,
  rules: Required<CommentModerationConfig>
): WalineComment => ({
  ...comment,
  moderation: evaluateWalineCommentModeration(comment, rules)
})
