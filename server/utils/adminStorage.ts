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
  author: string
  authorUrl?: string
  category: string
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
  status: 'published'
}

export type ArticleViewRecord = {
  total: number
  updatedAt: string
  recentVisitors: Record<string, number>
}

export type ArticleViews = Record<string, ArticleViewRecord>

type Frontmatter = Record<string, unknown>

const contentDir = () => resolve(process.cwd(), 'content', 'blog')
const contentRootDir = () => resolve(process.cwd(), 'content')
const aboutPath = () => resolve(contentRootDir(), 'about.md')
const dataDir = () => resolve(process.cwd(), 'data')
const projectsPath = () => resolve(dataDir(), 'projects.json')
const friendsPath = () => resolve(dataDir(), 'friends.json')
const commentsPath = () => resolve(dataDir(), 'comments.json')
const viewsPath = () => resolve(dataDir(), 'views.json')

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
    const lines = match[1].split(/\r?\n/)

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)

      if (!keyValue) {
        continue
      }

      const [, key, value] = keyValue

      if (value === '') {
        const list: string[] = []

        while (lines[index + 1]?.match(/^\s+-\s+/)) {
          index += 1
          list.push(lines[index].replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, ''))
        }

        frontmatter[key] = list
      } else {
        frontmatter[key] = parseScalar(value)
      }
    }
  }

  return {
    id: fallbackSlug,
    slug: fallbackSlug,
    path: `/blog/${fallbackSlug}`,
    title: String(frontmatter.title || fallbackSlug),
    description: String(frontmatter.description || ''),
    date: String(frontmatter.date || new Date().toISOString().slice(0, 10)),
    author: String(frontmatter.author || 'Chanko'),
    authorUrl: typeof frontmatter.authorUrl === 'string' ? frontmatter.authorUrl : undefined,
    category: String(frontmatter.category || '未分类'),
    published: frontmatter.published !== false,
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

  if (article.authorUrl) {
    lines.push(`authorUrl: ${quoteFrontmatterValue(article.authorUrl)}`)
  }

  lines.push(
    `category: ${quoteFrontmatterValue(article.category || '未分类')}`,
    `views: ${Math.max(0, Number(article.views) || 0)}`,
    `published: ${article.published !== false}`,
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
    const lines = match[1].split(/\r?\n/)

    for (const line of lines) {
      const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)

      if (!keyValue) {
        continue
      }

      const [, key, value] = keyValue
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
        const article = parseArticleMarkdown(raw, slug)

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
  const article = parseArticleMarkdown(raw, slug)

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

  const article: AdminArticle = {
    id: slug,
    slug,
    path: `/blog/${slug}`,
    title: payload.title,
    description: payload.description || '',
    date: payload.date || new Date().toISOString().slice(0, 10),
    author: payload.author || existing?.author || 'Chanko',
    authorUrl: payload.authorUrl || existing?.authorUrl || '/about',
    category: payload.category || '未分类',
    published: payload.published !== false,
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
}

const normalizeProject = (project: Partial<AdminProject>, index: number): AdminProject => {
  const sourceUrl = String(project.sourceUrl || '').trim()
  const launchUrl = String(project.launchUrl || '').trim()

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
    updatedAt: String(project.updatedAt || new Date().toISOString())
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

const normalizeFriend = (friend: Partial<AdminFriend>, index: number): AdminFriend => {
  const now = new Date().toISOString()

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
    reviewedAt: String(friend.reviewedAt || '')
  }
}

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
