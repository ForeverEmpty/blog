import type { H3Event } from 'h3'

const spamWords = [
  'casino',
  'porn',
  'viagra',
  'loan',
  'bet',
  '博彩',
  '色情',
  '贷款',
  '发票',
  '代开'
]

const rateLimitWindowMs = 10 * 60 * 1000
const rateLimitMax = 3
const applyAttempts = new Map<string, number[]>()

const normalizeUrl = (value: string) => {
  try {
    const url = new URL(value.trim())

    url.hash = ''
    url.search = ''

    return url.toString().replace(/\/$/, '').toLowerCase()
  } catch {
    return ''
  }
}

const textIncludesSpam = (value: string) => {
  const normalized = value.toLowerCase()

  return spamWords.some((word) => normalized.includes(word))
}

const countLinks = (value: string) => (value.match(/https?:\/\//gi) || []).length
const requestIp = (event: H3Event) => (
  getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
  getRequestHeader(event, 'x-real-ip') ||
  'unknown'
)

const assertApplyRateLimit = (event: H3Event) => {
  const ip = requestIp(event)
  const now = Date.now()
  const recent = (applyAttempts.get(ip) || []).filter((time) => now - time < rateLimitWindowMs)

  if (recent.length >= rateLimitMax) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many friend applications'
    })
  }

  recent.push(now)
  applyAttempts.set(ip, recent)
}

export default defineEventHandler(async (event) => {
  assertApplyRateLimit(event)

  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const url = typeof body?.url === 'string' ? body.url.trim() : ''
  const icon = typeof body?.icon === 'string' ? body.icon.trim() : ''
  const intro = typeof body?.intro === 'string' ? body.intro.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const contact = typeof body?.contact === 'string' ? body.contact.trim() : ''
  const backlinkUrl = typeof body?.backlinkUrl === 'string' ? body.backlinkUrl.trim() : ''
  const category = typeof body?.category === 'string' && body.category.trim() ? body.category.trim() : '个人站点'
  const tags = Array.isArray(body?.tags)
    ? body.tags.map(String).map((tag: string) => tag.trim()).filter(Boolean).slice(0, 6)
    : []
  const normalizedUrl = normalizeUrl(url)
  const normalizedBacklinkUrl = backlinkUrl ? normalizeUrl(backlinkUrl) : ''

  if (!name || !url) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Friend name and url are required'
    })
  }

  if (!normalizedUrl || !/^https?:\/\//i.test(url)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Friend url must be a valid http(s) url'
    })
  }

  if (backlinkUrl && (!normalizedBacklinkUrl || !/^https?:\/\//i.test(backlinkUrl))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Backlink url must be a valid http(s) url'
    })
  }

  if (
    name.length > 40 ||
    intro.length > 80 ||
    description.length > 240 ||
    contact.length > 120 ||
    textIncludesSpam(`${name} ${url} ${intro} ${description} ${contact} ${backlinkUrl} ${tags.join(' ')}`) ||
    countLinks(`${intro} ${description}`) > 1
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Friend application was rejected by basic spam rules'
    })
  }

  const friends = await readFriends()
  const duplicate = friends.find((friend) => (
    normalizeUrl(friend.url) === normalizedUrl ||
    friend.name.trim().toLowerCase() === name.toLowerCase()
  ))

  if (duplicate) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Friend application already exists'
    })
  }

  const friend = {
    id: createId('friend', name),
    name,
    url,
    icon,
    intro,
    description,
    category,
    status: '待审核' as const,
    tags,
    contact,
    backlinkUrl,
    reviewNote: '',
    featured: false,
    order: (friends.length + 1) * 10,
    submittedAt: new Date().toISOString(),
    reviewedAt: ''
  }

  await writeFriends([friend, ...friends])
  await writeAdminLog({
    action: 'friend.apply',
    targetType: 'friend',
    targetId: friend.id,
    message: `友链申请：${friend.name}`,
    payload: {
      url: friend.url,
      category: friend.category,
      contact: friend.contact
    }
  }).catch(() => {})
  await createAdminNotificationEvent(event, {
    source: 'friend.apply',
    title: `新的友链申请：${friend.name}`,
    body: `${friend.name} 提交了友链申请，站点地址：${friend.url}`,
    level: 'warning',
    href: 'admin:friends',
    hrefLabel: '处理友链',
    targetId: friend.id,
    payload: {
      url: friend.url,
      category: friend.category,
      contact: friend.contact
    }
  }).catch(() => {})

  return friend
})
