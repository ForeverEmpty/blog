import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'

export type AdminArticle = {
  id: string
  slug: string
  path: string
  title: string
  description: string
  date: string
  scheduledAt?: string
  author: string
  authorUrl?: string
  category: string
  workflowStatus: ArticleWorkflowStatus
  published: boolean
  locked: boolean
  pinned: boolean
  views: number
  tags: string[]
  markdown: string
}

export type AdminProject = {
  id: string
  name: string
  description: string
  status: string
  category: string
  sourceUrl: string
  launchUrl: string
  tags: string[]
  featured: boolean
  hidden: boolean
  order: number
  coverUrl: string
  updatedAt: string
  checkStatus: 'unchecked' | 'ok' | 'warning' | 'error'
  checkedAt: string
  checkMessage: string
  launchStatus?: number
  launchTimeMs?: number
  sourceStatus?: number
  sourceTimeMs?: number
}

export type AdminFriend = {
  id: string
  name: string
  url: string
  icon?: string
  intro?: string
  description: string
  category: string
  status: '待审核' | '已通过' | '已拒绝'
  tags: string[]
  contact: string
  backlinkUrl: string
  reviewNote: string
  featured: boolean
  order: number
  submittedAt: string
  reviewedAt: string
  checkStatus: 'unchecked' | 'ok' | 'warning' | 'error'
  checkedAt: string
  checkMessage: string
  responseStatus?: number
  responseTimeMs?: number
  backlinkFound?: boolean
  backlinkCheckedAt?: string
}

export type AdminNotificationLevel = 'info' | 'success' | 'warning' | 'danger'
export type AdminNotificationAudience = 'site' | 'admin' | 'both'

export type AdminNotification = {
  id: string
  title: string
  body: string
  date: string
  level: AdminNotificationLevel
  href: string
  hrefLabel: string
  pinned: boolean
  enabled: boolean
  audience: AdminNotificationAudience
}

export type AdminNotificationEventKey =
  | 'friend.apply'
  | 'comment.waiting'
  | 'ai.summary.error'
  | 'build.failure'

export type AdminNotificationEventSetting = {
  key: AdminNotificationEventKey
  label: string
  description: string
  siteEnabled: boolean
  emailEnabled: boolean
  important: boolean
}

export type AdminNotificationSettings = {
  emailEnabled: boolean
  emailTo: string
  emailFrom: string
  events: AdminNotificationEventSetting[]
}

export type AdminNotificationEvent = AdminNotification & {
  source: AdminNotificationEventKey
  important: boolean
  emailed: boolean
  createdAt: string
}

export type AdminAboutPage = {
  title: string
  description: string
  markdown: string
}

export type BlogComment = {
  id: string
  slug: string
  author: string
  website?: string
  content: string
  createdAt: string
  status: 'published' | 'waiting' | 'spam'
}

export type ArticleViewRecord = {
  total: number
  updatedAt: string
  recentVisitors: Record<string, number>
  daily?: Record<string, number>
}

export type ArticleViews = Record<string, ArticleViewRecord>

type Frontmatter = Record<string, unknown>
type ArticleWorkflowStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived'
type ArticleVisibilityCandidate = {
  workflowStatus?: ArticleWorkflowStatus | string
  published?: boolean | number | string
  scheduledAt?: string
  meta?: {
    workflowStatus?: ArticleWorkflowStatus | string
    scheduledAt?: string
  }
}

const contentDir = () => resolve(process.cwd(), 'content', 'blog')
const contentRootDir = () => resolve(process.cwd(), 'content')
const aboutPath = () => resolve(contentRootDir(), 'about.md')
const dataDir = () => resolve(process.cwd(), 'data')
const projectsPath = () => resolve(dataDir(), 'projects.json')
const friendsPath = () => resolve(dataDir(), 'friends.json')
const commentsPath = () => resolve(dataDir(), 'comments.json')
const viewsPath = () => resolve(dataDir(), 'views.json')
const notificationsPath = () => resolve(dataDir(), 'notifications.json')
const adminNotificationsPath = () => resolve(dataDir(), 'admin-notifications.json')
const notificationSettingsPath = () => resolve(dataDir(), 'notification-settings.json')
const workflowStatuses = new Set<ArticleWorkflowStatus>(['draft', 'review', 'scheduled', 'published', 'archived'])

const ensureDataDir = async () => {
  await mkdir(dataDir(), { recursive: true })
}

export const assertSafeSlug = (slug: string) => {
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid slug'
    })
  }
}

export const slugify = (value: string) => {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')

  return slug || `article-${Date.now()}`
}

const isPublishedValue = (value: unknown) => (
  value === true || value === 1 || value === 'true' || value === '1'
)

export const normalizeArticleWorkflowStatus = (value: unknown, published?: unknown): ArticleWorkflowStatus => {
  if (typeof value === 'string' && workflowStatuses.has(value as ArticleWorkflowStatus)) {
    return value as ArticleWorkflowStatus
  }

  return isPublishedValue(published) ? 'published' : 'draft'
}

const normalizeScheduledAt = (value: unknown) => (
  typeof value === 'string' && value.trim() ? value.trim() : undefined
)

const isScheduledAtReadyValue = (value: unknown) => {
  const scheduledAt = normalizeScheduledAt(value)

  if (!scheduledAt) {
    return false
  }

  const timestamp = Date.parse(scheduledAt)

  return !Number.isNaN(timestamp) && timestamp <= Date.now()
}

export const resolveArticleWorkflowStatus = (
  value: unknown,
  published?: unknown,
  scheduledAt?: unknown
): ArticleWorkflowStatus => {
  const workflowStatus = normalizeArticleWorkflowStatus(value, published)

  if (workflowStatus === 'scheduled' && isScheduledAtReadyValue(scheduledAt)) {
    return 'published'
  }

  return workflowStatus
}

const getArticleWorkflowStatus = (article: ArticleVisibilityCandidate) => (
  article.workflowStatus || article.meta?.workflowStatus
)

const getArticleScheduledAt = (article: ArticleVisibilityCandidate) => (
  article.scheduledAt || article.meta?.scheduledAt
)

export const isAdminScheduledArticleReady = (article: ArticleVisibilityCandidate) => {
  return isScheduledAtReadyValue(getArticleScheduledAt(article))
}

export const isArticlePublic = (article: ArticleVisibilityCandidate) => {
  const workflowStatus = getArticleWorkflowStatus(article)

  if (workflowStatus) {
    return workflowStatus === 'published' ||
      (workflowStatus === 'scheduled' && isAdminScheduledArticleReady(article))
  }

  return isPublishedValue(article.published)
}

const isArticleMarkedPublished = (workflowStatus: ArticleWorkflowStatus) => workflowStatus === 'published'

const articleFilePath = (slug: string) => {
  assertSafeSlug(slug)

  const directory = contentDir()
  const filePath = resolve(join(directory, `${slug}.md`))
  const relativePath = relative(directory, filePath)

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid article path'
    })
  }

  return filePath
}

const parseScalar = (value: string) => {
  const trimmed = value.trim()

  if (trimmed === 'true') {
    return true
  }

  if (trimmed === 'false') {
    return false
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed)
  }

  return trimmed.replace(/^["']|["']$/g, '')
}

export const parseArticleMarkdown = (raw: string, fallbackSlug: string): AdminArticle => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const frontmatter: Frontmatter = {}
  const body = match ? raw.slice(match[0].length) : raw

  if (match) {
    const lines = (match[1] || '').split(/\r?\n/)

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]

      if (!line) {
        continue
      }

      const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)

      if (!keyValue) {
        continue
      }

      const [, key, value = ''] = keyValue

      if (!key) {
        continue
      }

      if (value === '') {
        const list: string[] = []

        while (lines[index + 1]?.match(/^\s+-\s+/)) {
          index += 1
          const listLine = lines[index]

          if (listLine) {
            list.push(listLine.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''))
          }
        }

        frontmatter[key] = list
      } else {
        frontmatter[key] = parseScalar(value)
      }
    }
  }

  const scheduledAt = normalizeScheduledAt(frontmatter.scheduledAt)
  const workflowStatus = resolveArticleWorkflowStatus(
    frontmatter.workflowStatus,
    frontmatter.published !== false,
    scheduledAt
  )

  return {
    id: fallbackSlug,
    slug: fallbackSlug,
    path: `/blog/${fallbackSlug}`,
    title: String(frontmatter.title || fallbackSlug),
    description: String(frontmatter.description || ''),
    date: String(frontmatter.date || new Date().toISOString().slice(0, 10)),
    scheduledAt,
    author: String(frontmatter.author || 'Chanko'),
    authorUrl: typeof frontmatter.authorUrl === 'string' ? frontmatter.authorUrl : undefined,
    category: String(frontmatter.category || '未分类'),
    workflowStatus,
    published: isArticleMarkedPublished(workflowStatus),
    locked: frontmatter.locked === true,
    pinned: frontmatter.pinned === true,
    views: typeof frontmatter.views === 'number' ? frontmatter.views : 0,
    tags: Array.isArray(frontmatter.tags) ? frontmatter.tags.map(String) : [],
    markdown: body
  }
}

const quoteFrontmatterValue = (value: string | number | boolean) => {
  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value)
  }

  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value
  }

  return JSON.stringify(value)
}

export const stringifyArticleMarkdown = (article: AdminArticle) => {
  const lines = [
    '---',
    `title: ${quoteFrontmatterValue(article.title)}`,
    `description: ${quoteFrontmatterValue(article.description)}`,
    `date: ${quoteFrontmatterValue(article.date)}`,
    `author: ${quoteFrontmatterValue(article.author || 'Chanko')}`
  ]

  if (article.scheduledAt) {
    lines.push(`scheduledAt: ${quoteFrontmatterValue(article.scheduledAt)}`)
  }

  if (article.authorUrl) {
    lines.push(`authorUrl: ${quoteFrontmatterValue(article.authorUrl)}`)
  }

  lines.push(
    `category: ${quoteFrontmatterValue(article.category || '未分类')}`,
    `views: ${Math.max(0, Number(article.views) || 0)}`,
    `workflowStatus: ${quoteFrontmatterValue(article.workflowStatus || 'draft')}`,
    `published: ${isArticleMarkedPublished(article.workflowStatus)}`,
    `locked: ${article.locked === true}`,
    `pinned: ${article.pinned === true}`,
    'tags:'
  )

  for (const tag of article.tags) {
    lines.push(`  - ${quoteFrontmatterValue(tag)}`)
  }

  lines.push('---', '', article.markdown.trimEnd(), '')

  return lines.join('\n')
}

export const parseAboutMarkdown = (raw: string): AdminAboutPage => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const frontmatter: Frontmatter = {}
  const body = match ? raw.slice(match[0].length) : raw

  if (match) {
    const lines = (match[1] || '').split(/\r?\n/)

    for (const line of lines) {
      const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)

      if (!keyValue) {
        continue
      }

      const [, key, value = ''] = keyValue

      if (!key) {
        continue
      }

      frontmatter[key] = parseScalar(value)
    }
  }

  return {
    title: String(frontmatter.title || '关于'),
    description: String(frontmatter.description || ''),
    markdown: body
  }
}

export const stringifyAboutMarkdown = (about: AdminAboutPage) => [
  '---',
  `title: ${quoteFrontmatterValue(about.title || '关于')}`,
  `description: ${quoteFrontmatterValue(about.description || '')}`,
  '---',
  '',
  about.markdown.trimEnd(),
  ''
].join('\n')

export const readAboutPage = async () => {
  await mkdir(contentRootDir(), { recursive: true })

  const raw = await readFile(aboutPath(), 'utf8')
    .catch(() => '---\ntitle: 关于\ndescription: \n---\n\n')

  return parseAboutMarkdown(raw)
}

export const saveAboutPage = async (payload: Partial<AdminAboutPage>) => {
  await mkdir(contentRootDir(), { recursive: true })

  const about: AdminAboutPage = {
    title: String(payload.title || '关于'),
    description: String(payload.description || ''),
    markdown: String(payload.markdown || '')
  }

  await writeFile(aboutPath(), stringifyAboutMarkdown(about), 'utf8')

  return about
}

const promoteReadyScheduledArticle = async (slug: string, raw: string, article: AdminArticle) => {
  const wasScheduled = /\bworkflowStatus:\s*['"]?scheduled['"]?(?:\s|$)/.test(raw)

  if (!wasScheduled || article.workflowStatus !== 'published') {
    return article
  }

  const promotedArticle: AdminArticle = {
    ...article,
    scheduledAt: undefined,
    workflowStatus: 'published',
    published: true
  }

  await writeFile(articleFilePath(slug), stringifyArticleMarkdown(promotedArticle), 'utf8')

  return promotedArticle
}

export const readArticles = async () => {
  await mkdir(contentDir(), { recursive: true })

  const filenames = await readdir(contentDir())
  const views = await readArticleViews()
  const articles = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith('.md'))
      .map(async (filename) => {
        const slug = filename.replace(/\.md$/, '')
        const raw = await readFile(articleFilePath(slug), 'utf8')
        const article = await promoteReadyScheduledArticle(slug, raw, parseArticleMarkdown(raw, slug))

        return {
          ...article,
          views: Math.max(article.views, views[slug]?.total || 0)
        }
      })
  )

  return articles.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date))
}

export const readArticle = async (slug: string) => {
  const views = await readArticleViews()
  const raw = await readFile(articleFilePath(slug), 'utf8')
  const article = await promoteReadyScheduledArticle(slug, raw, parseArticleMarkdown(raw, slug))

  return {
    ...article,
    views: Math.max(article.views, views[slug]?.total || 0)
  }
}

export const saveArticle = async (payload: Partial<AdminArticle> & { slug?: string; title: string }) => {
  const slug = payload.slug ? payload.slug : slugify(payload.title)
  const existing = await readFile(articleFilePath(slug), 'utf8')
    .then((raw) => parseArticleMarkdown(raw, slug))
    .catch(() => null)

  const payloadScheduledAt = payload.workflowStatus === 'scheduled'
    ? normalizeScheduledAt(payload.scheduledAt || existing?.scheduledAt)
    : undefined
  const workflowStatus = resolveArticleWorkflowStatus(payload.workflowStatus, payload.published, payloadScheduledAt)
  const scheduledAt = workflowStatus === 'scheduled' ? payloadScheduledAt : undefined
  const article: AdminArticle = {
    id: slug,
    slug,
    path: `/blog/${slug}`,
    title: payload.title,
    description: payload.description || '',
    date: payload.date || new Date().toISOString().slice(0, 10),
    scheduledAt,
    author: payload.author || existing?.author || 'Chanko',
    authorUrl: payload.authorUrl || existing?.authorUrl || '/about',
    category: payload.category || '未分类',
    workflowStatus,
    published: isArticleMarkedPublished(workflowStatus),
    locked: payload.locked === true,
    pinned: payload.pinned === true,
    views: Math.max(0, Number(payload.views ?? existing?.views ?? 0)),
    tags: Array.isArray(payload.tags) ? payload.tags.map(String) : [],
    markdown: payload.markdown || ''
  }

  await writeFile(articleFilePath(slug), stringifyArticleMarkdown(article), 'utf8')

  return article
}

export const deleteArticle = async (slug: string) => {
  await unlink(articleFilePath(slug))
}

const readJsonFile = async <T>(filePath: string, fallback: T): Promise<T> => {
  try {
    const raw = await readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const writeJsonFile = async <T>(filePath: string, value: T) => {
  await ensureDataDir()
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')

  return value
}

const normalizeProjectCheckStatus = (status: unknown): AdminProject['checkStatus'] => {
  if (status === 'ok' || status === 'warning' || status === 'error') {
    return status
  }

  return 'unchecked'
}

const normalizeProject = (project: Partial<AdminProject>, index: number): AdminProject => {
  const sourceUrl = String(project.sourceUrl || '').trim()
  const launchUrl = String(project.launchUrl || '').trim()
  const launchStatus = Number(project.launchStatus)
  const launchTimeMs = Number(project.launchTimeMs)
  const sourceStatus = Number(project.sourceStatus)
  const sourceTimeMs = Number(project.sourceTimeMs)

  return {
    id: String(project.id || createId('project', String(project.name || 'project'))),
    name: String(project.name || 'Untitled Project').trim(),
    description: String(project.description || '').trim(),
    status: String(project.status || '草稿').trim(),
    category: String(project.category || '项目').trim(),
    sourceUrl: sourceUrl || launchUrl,
    launchUrl: launchUrl || sourceUrl,
    tags: Array.isArray(project.tags) ? project.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : [],
    featured: project.featured === true,
    hidden: project.hidden === true,
    order: Number.isFinite(Number(project.order)) ? Number(project.order) : (index + 1) * 10,
    coverUrl: String(project.coverUrl || '').trim(),
    updatedAt: String(project.updatedAt || new Date().toISOString()),
    checkStatus: normalizeProjectCheckStatus(project.checkStatus),
    checkedAt: String(project.checkedAt || ''),
    checkMessage: String(project.checkMessage || ''),
    launchStatus: Number.isFinite(launchStatus) ? launchStatus : undefined,
    launchTimeMs: Number.isFinite(launchTimeMs) ? launchTimeMs : undefined,
    sourceStatus: Number.isFinite(sourceStatus) ? sourceStatus : undefined,
    sourceTimeMs: Number.isFinite(sourceTimeMs) ? sourceTimeMs : undefined
  }
}

export const sortProjects = <T extends Pick<AdminProject, 'featured' | 'hidden' | 'order' | 'updatedAt' | 'name'>>(projects: T[]) => (
  [...projects].sort((a, b) => (
    Number(a.hidden) - Number(b.hidden) ||
    Number(b.featured) - Number(a.featured) ||
    Number(a.order) - Number(b.order) ||
    String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) ||
    String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
  ))
)

export const readProjects = async () => {
  const projects = await readJsonFile<Partial<AdminProject>[]>(projectsPath(), [])

  return sortProjects(projects.map(normalizeProject))
}

export const writeProjects = (projects: Partial<AdminProject>[]) => (
  writeJsonFile(projectsPath(), sortProjects(projects.map(normalizeProject)))
)
const normalizeFriendStatus = (status: unknown): AdminFriend['status'] => {
  if (status === '已通过' || status === '已拒绝') {
    return status
  }

  return '待审核'
}

const normalizeFriendCheckStatus = (status: unknown): AdminFriend['checkStatus'] => {
  if (status === 'ok' || status === 'warning' || status === 'error') {
    return status
  }

  return 'unchecked'
}

const normalizeFriend = (friend: Partial<AdminFriend>, index: number): AdminFriend => {
  const now = new Date().toISOString()
  const responseStatus = Number(friend.responseStatus)
  const responseTimeMs = Number(friend.responseTimeMs)

  return {
    id: String(friend.id || createId('friend', String(friend.name || 'friend'))),
    name: String(friend.name || 'Untitled Friend').trim(),
    url: String(friend.url || '').trim(),
    icon: String(friend.icon || '').trim(),
    intro: String(friend.intro || '').trim(),
    description: String(friend.description || '').trim(),
    category: String(friend.category || '个人站点').trim(),
    status: normalizeFriendStatus(friend.status),
    tags: Array.isArray(friend.tags) ? friend.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : [],
    contact: String(friend.contact || '').trim(),
    backlinkUrl: String(friend.backlinkUrl || '').trim(),
    reviewNote: String(friend.reviewNote || '').trim(),
    featured: friend.featured === true,
    order: Number.isFinite(Number(friend.order)) ? Number(friend.order) : (index + 1) * 10,
    submittedAt: String(friend.submittedAt || now),
    reviewedAt: String(friend.reviewedAt || ''),
    checkStatus: normalizeFriendCheckStatus(friend.checkStatus),
    checkedAt: String(friend.checkedAt || ''),
    checkMessage: String(friend.checkMessage || ''),
    responseStatus: Number.isFinite(responseStatus) ? responseStatus : undefined,
    responseTimeMs: Number.isFinite(responseTimeMs) ? responseTimeMs : undefined,
    backlinkFound: typeof friend.backlinkFound === 'boolean' ? friend.backlinkFound : undefined,
    backlinkCheckedAt: String(friend.backlinkCheckedAt || '')
  }
}

const normalizeNotificationLevel = (level: unknown): AdminNotificationLevel => {
  if (level === 'success' || level === 'warning' || level === 'danger') {
    return level
  }

  return 'info'
}

const normalizeNotificationAudience = (audience: unknown): AdminNotificationAudience => {
  if (audience === 'admin' || audience === 'both') {
    return audience
  }

  return 'site'
}

const normalizeNotification = (notification: Partial<AdminNotification>, index: number): AdminNotification => {
  const title = String(notification.title || '站内通知').trim()
  const body = String(notification.body || '').trim()
  const date = String(notification.date || new Date().toISOString().slice(0, 10)).trim()

  return {
    id: String(notification.id || createId('notice', title || body || String(index))).trim(),
    title,
    body,
    date,
    level: normalizeNotificationLevel(notification.level),
    href: String(notification.href || '').trim(),
    hrefLabel: String(notification.hrefLabel || '').trim(),
    pinned: notification.pinned === true,
    enabled: notification.enabled !== false,
    audience: normalizeNotificationAudience(notification.audience)
  }
}

export const defaultNotificationEventSettings = (): AdminNotificationEventSetting[] => [
  {
    key: 'friend.apply',
    label: '友链申请',
    description: '前台提交新的友链申请时触发。',
    siteEnabled: true,
    emailEnabled: true,
    important: true
  },
  {
    key: 'comment.waiting',
    label: '待审评论',
    description: '评论进入待审核状态时触发。',
    siteEnabled: true,
    emailEnabled: true,
    important: true
  },
  {
    key: 'ai.summary.error',
    label: 'AI 摘要失败',
    description: '文章 AI 摘要生成失败或缺少 API Key 时触发。',
    siteEnabled: true,
    emailEnabled: true,
    important: true
  },
  {
    key: 'build.failure',
    label: '构建失败',
    description: '构建失败事件写入时触发。',
    siteEnabled: true,
    emailEnabled: true,
    important: true
  }
]

const normalizeNotificationSettings = (settings: Partial<AdminNotificationSettings>): AdminNotificationSettings => {
  const defaultEvents = defaultNotificationEventSettings()
  const inputEvents = Array.isArray(settings.events) ? settings.events : []

  return {
    emailEnabled: settings.emailEnabled === true,
    emailTo: String(settings.emailTo || '').trim(),
    emailFrom: String(settings.emailFrom || '').trim(),
    events: defaultEvents.map((event) => {
      const input = inputEvents.find((item) => item?.key === event.key)

      return {
        ...event,
        siteEnabled: typeof input?.siteEnabled === 'boolean' ? input.siteEnabled : event.siteEnabled,
        emailEnabled: typeof input?.emailEnabled === 'boolean' ? input.emailEnabled : event.emailEnabled,
        important: typeof input?.important === 'boolean' ? input.important : event.important
      }
    })
  }
}

const normalizeAdminNotificationEvent = (
  notification: Partial<AdminNotificationEvent>,
  index: number
): AdminNotificationEvent => {
  const normalized = normalizeNotification({
    ...notification,
    audience: 'admin'
  }, index)
  const defaultSource: AdminNotificationEventKey = 'friend.apply'
  const source = defaultNotificationEventSettings().some((event) => event.key === notification.source)
    ? notification.source as AdminNotificationEventKey
    : defaultSource

  return {
    ...normalized,
    source,
    important: notification.important === true,
    emailed: notification.emailed === true,
    createdAt: String(notification.createdAt || new Date().toISOString())
  }
}

export const sortNotifications = <T extends Pick<AdminNotification, 'pinned' | 'enabled' | 'date' | 'title'>>(notifications: T[]) => (
  [...notifications].sort((a, b) => (
    Number(b.enabled) - Number(a.enabled) ||
    Number(b.pinned) - Number(a.pinned) ||
    String(b.date || '').localeCompare(String(a.date || '')) ||
    String(a.title || '').localeCompare(String(b.title || ''), 'zh-CN')
  ))
)

export const sortFriends = <T extends Pick<AdminFriend, 'status' | 'featured' | 'order' | 'submittedAt' | 'name'>>(friends: T[]) => {
  const statusWeight: Record<AdminFriend['status'], number> = {
    待审核: 0,
    已通过: 1,
    已拒绝: 2
  }

  return [...friends].sort((a, b) => (
    statusWeight[a.status] - statusWeight[b.status] ||
    Number(b.featured) - Number(a.featured) ||
    Number(a.order) - Number(b.order) ||
    String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')) ||
    String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
  ))
}

export const readFriends = async () => {
  const friends = await readJsonFile<Partial<AdminFriend>[]>(friendsPath(), [])

  return sortFriends(friends.map(normalizeFriend))
}

export const writeFriends = (friends: Partial<AdminFriend>[]) => (
  writeJsonFile(friendsPath(), sortFriends(friends.map(normalizeFriend)))
)
export const readNotifications = async () => {
  const notifications = await readJsonFile<Partial<AdminNotification>[]>(notificationsPath(), [])

  return sortNotifications(notifications.map(normalizeNotification))
}
export const writeNotifications = (notifications: Partial<AdminNotification>[]) => (
  writeJsonFile(notificationsPath(), sortNotifications(notifications.map(normalizeNotification)))
)
export const readAdminNotificationEvents = async () => {
  const notifications = await readJsonFile<Partial<AdminNotificationEvent>[]>(adminNotificationsPath(), [])

  return sortNotifications(notifications.map(normalizeAdminNotificationEvent)).slice(0, 100)
}
export const writeAdminNotificationEvents = (notifications: Partial<AdminNotificationEvent>[]) => (
  writeJsonFile(adminNotificationsPath(), sortNotifications(notifications.map(normalizeAdminNotificationEvent)).slice(0, 100))
)
export const readNotificationSettings = async () => (
  normalizeNotificationSettings(await readJsonFile<Partial<AdminNotificationSettings>>(notificationSettingsPath(), {}))
)
export const writeNotificationSettings = (settings: Partial<AdminNotificationSettings>) => (
  writeJsonFile(notificationSettingsPath(), normalizeNotificationSettings(settings))
)
export const readComments = () => readJsonFile<Record<string, BlogComment[]>>(commentsPath(), {})
export const writeComments = (comments: Record<string, BlogComment[]>) => writeJsonFile(commentsPath(), comments)
export const readArticleViews = () => readJsonFile<ArticleViews>(viewsPath(), {})
export const writeArticleViews = (views: ArticleViews) => writeJsonFile(viewsPath(), views)

export const createViewVisitorKey = (slug: string, ip: string, userAgent: string) => (
  createHash('sha256')
    .update([slug, ip || 'unknown', userAgent || 'unknown'].join('\n'))
    .digest('hex')
    .slice(0, 32)
)

export const recordArticleView = async (slug: string, visitorKey: string) => {
  assertSafeSlug(slug)

  const views = await readArticleViews()
  const now = Date.now()
  const dedupeWindowMs = 30 * 60 * 1000
  const cutoff = now - dedupeWindowMs
  const current = views[slug] || {
    total: 0,
    updatedAt: new Date(0).toISOString(),
    recentVisitors: {}
  }
  const recentVisitors = Object.fromEntries(
    Object.entries(current.recentVisitors || {})
      .filter(([, visitedAt]) => Number(visitedAt) > cutoff)
  )
  const counted = !recentVisitors[visitorKey]

  if (counted) {
    current.total = Math.max(0, Number(current.total) || 0) + 1
    current.updatedAt = new Date(now).toISOString()
    const dateKey = new Date(now).toISOString().slice(0, 10)
    const daily = current.daily || {}

    daily[dateKey] = Math.max(0, Number(daily[dateKey]) || 0) + 1
    current.daily = daily
  }

  recentVisitors[visitorKey] = now
  current.recentVisitors = recentVisitors
  views[slug] = current
  await writeArticleViews(views)

  return {
    slug,
    views: current.total,
    counted,
    updatedAt: current.updatedAt
  }
}

export const getArticleViewCount = async (slug: string) => {
  assertSafeSlug(slug)

  const views = await readArticleViews()

  return Math.max(0, Number(views[slug]?.total) || 0)
}

export const createId = (prefix: string, seed: string) => (
  `${prefix}-${slugify(seed).slice(0, 48)}-${Date.now().toString(36)}`
)
