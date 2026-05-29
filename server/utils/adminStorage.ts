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

type Frontmatter = Record<string, unknown>

const contentDir = () => resolve(process.cwd(), 'content', 'blog')
const dataDir = () => resolve(process.cwd(), 'data')
const projectsPath = () => resolve(dataDir(), 'projects.json')
const friendsPath = () => resolve(dataDir(), 'friends.json')
const commentsPath = () => resolve(dataDir(), 'comments.json')

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
    'tags:'
  )

  for (const tag of article.tags) {
    lines.push(`  - ${quoteFrontmatterValue(tag)}`)
  }

  lines.push('---', '', article.markdown.trimEnd(), '')

  return lines.join('\n')
}

export const readArticles = async () => {
  await mkdir(contentDir(), { recursive: true })

  const filenames = await readdir(contentDir())
  const articles = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith('.md'))
      .map(async (filename) => {
        const slug = filename.replace(/\.md$/, '')
        const raw = await readFile(articleFilePath(slug), 'utf8')

        return parseArticleMarkdown(raw, slug)
      })
  )

  return articles.sort((a, b) => b.date.localeCompare(a.date))
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

export const readProjects = () => readJsonFile<AdminProject[]>(projectsPath(), [])
export const writeProjects = (projects: AdminProject[]) => writeJsonFile(projectsPath(), projects)
export const readFriends = () => readJsonFile<AdminFriend[]>(friendsPath(), [])
export const writeFriends = (friends: AdminFriend[]) => writeJsonFile(friendsPath(), friends)
export const readComments = () => readJsonFile<Record<string, BlogComment[]>>(commentsPath(), {})
export const writeComments = (comments: Record<string, BlogComment[]>) => writeJsonFile(commentsPath(), comments)

export const createId = (prefix: string, seed: string) => (
  `${prefix}-${slugify(seed).slice(0, 48)}-${Date.now().toString(36)}`
)
