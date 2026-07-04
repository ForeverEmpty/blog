import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { isArticlePublic, readArticle, readArticles } from './adminStorage'
import type { AdminArticle } from './adminStorage'

export type PublicArticle = AdminArticle & {
  body?: Record<string, unknown>
  contentText?: string
}

type PublicArticleListOptions = {
  includeSearchText?: boolean
}

type PublicArticleIndex = {
  version: 1
  signature: string
  generatedAt: string
  articles: PublicArticle[]
}

const publicArticleCacheTtlMs = 10_000
const publicArticlesCache = new Map<string, {
  expiresAt: number
  articles: PublicArticle[]
}>()
const publicArticleDetailCache = new Map<string, {
  expiresAt: number
  signature: string
  article: PublicArticle
}>()
let publicArticleIndexCache: {
  expiresAt: number
  index: PublicArticleIndex
} | undefined

const publicArticleIndexPath = () => resolve(process.cwd(), 'data', 'public-articles-index.json')
const contentBlogDir = () => resolve(process.cwd(), 'content', 'blog')

const createArticleSignature = (article: AdminArticle) => (
  createHash('sha256')
    .update(JSON.stringify({
      slug: article.slug,
      title: article.title,
      description: article.description,
      date: article.date,
      scheduledAt: article.scheduledAt,
      author: article.author,
      authorUrl: article.authorUrl,
      category: article.category,
      workflowStatus: article.workflowStatus,
      published: article.published,
      locked: article.locked,
      pinned: article.pinned,
      tags: article.tags,
      markdown: article.markdown,
    }))
    .digest('hex')
)

export const invalidatePublicArticleCache = (slugs?: string | string[]) => {
  publicArticlesCache.clear()

  if (!slugs) {
    publicArticleDetailCache.clear()
    return
  }

  for (const slug of Array.isArray(slugs) ? slugs : [slugs]) {
    publicArticleDetailCache.delete(slug)
  }
}

const createContentDirectorySignature = async () => {
  const dir = contentBlogDir()
  const filenames = await readdir(dir).catch(() => [])
  const entries = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith('.md'))
      .sort()
      .map(async (filename) => {
        const fileStat = await stat(resolve(dir, filename))

        return `${filename}:${fileStat.size}:${Math.trunc(fileStat.mtimeMs)}`
      })
  )

  return createHash('sha256').update(entries.join('\n')).digest('hex')
}

const stripMarkdownForSearch = (markdown: string) => (
  markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1 ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1 ')
    .replace(/[#>*_~`:[\]()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
)

export const toPublicArticleListItem = (
  article: AdminArticle,
  options: PublicArticleListOptions = {},
): PublicArticle => {
  if (!options.includeSearchText) {
    const { markdown: _markdown, ...metadata } = article

    return {
      ...metadata,
      markdown: '',
    }
  }

  const contentText = stripMarkdownForSearch(article.markdown)

  return {
    ...article,
    markdown: contentText,
    contentText,
  }
}

const readPublicArticleIndexFile = async () => {
  const raw = await readFile(publicArticleIndexPath(), 'utf8')
  const parsed = JSON.parse(raw) as Partial<PublicArticleIndex>

  if (parsed.version !== 1 || !Array.isArray(parsed.articles) || typeof parsed.signature !== 'string') {
    throw new Error('Invalid public article index')
  }

  return parsed as PublicArticleIndex
}

const writePublicArticleIndexFile = async (index: PublicArticleIndex) => {
  await mkdir(resolve(process.cwd(), 'data'), { recursive: true })
  await writeFile(publicArticleIndexPath(), `${JSON.stringify(index, null, 2)}\n`, 'utf8')
  publicArticleIndexCache = {
    index,
    expiresAt: Date.now() + publicArticleCacheTtlMs,
  }
  publicArticlesCache.clear()

  return index
}

const buildPublicArticleIndex = async () => {
  const articles = await readArticles()
  const index = {
    version: 1,
    signature: await createContentDirectorySignature(),
    generatedAt: new Date().toISOString(),
    articles: articles.map((article) => toPublicArticleListItem(article, { includeSearchText: true })),
  } satisfies PublicArticleIndex

  return writePublicArticleIndexFile(index)
}

const readPublicArticleIndex = async () => {
  const now = Date.now()
  const signature = await createContentDirectorySignature()

  if (
    publicArticleIndexCache &&
    publicArticleIndexCache.expiresAt > now &&
    publicArticleIndexCache.index.signature === signature
  ) {
    return publicArticleIndexCache.index
  }

  const index = await readPublicArticleIndexFile().catch(() => null)

  if (!index || index.signature !== signature) {
    return buildPublicArticleIndex()
  }

  publicArticleIndexCache = {
    index,
    expiresAt: now + publicArticleCacheTtlMs,
  }

  return index
}

export const rebuildPublicArticleIndex = async () => {
  publicArticleIndexCache = undefined
  invalidatePublicArticleCache()

  return buildPublicArticleIndex()
}

export const upsertPublicArticleIndex = async (article: AdminArticle, previousSlug?: string) => {
  const index = await readPublicArticleIndexFile().catch(() => null)

  if (!index) {
    return rebuildPublicArticleIndex()
  }

  const nextArticle = toPublicArticleListItem(article, { includeSearchText: true })
  const articles = index.articles.filter((item) => (
    item.slug !== article.slug && (!previousSlug || item.slug !== previousSlug)
  ))

  articles.push(nextArticle)

  return writePublicArticleIndexFile({
    version: 1,
    signature: await createContentDirectorySignature(),
    generatedAt: new Date().toISOString(),
    articles: articles.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date)),
  })
}

export const removePublicArticleFromIndex = async (slug: string) => {
  const index = await readPublicArticleIndexFile().catch(() => null)

  if (!index) {
    return rebuildPublicArticleIndex()
  }

  return writePublicArticleIndexFile({
    ...index,
    signature: await createContentDirectorySignature(),
    generatedAt: new Date().toISOString(),
    articles: index.articles.filter((article) => article.slug !== slug),
  })
}

export const readPublicArticles = async (options: PublicArticleListOptions = {}) => {
  const now = Date.now()
  const cacheKey = options.includeSearchText ? 'search' : 'metadata'
  const cachedArticles = publicArticlesCache.get(cacheKey)

  if (cachedArticles && cachedArticles.expiresAt > now) {
    return cachedArticles.articles
  }

  const index = await readPublicArticleIndex()

  const publicArticles = index.articles
    .filter(isArticlePublic)
    .map((article) => (
      options.includeSearchText
        ? article
        : toPublicArticleListItem(article, options)
    ))

  publicArticlesCache.set(cacheKey, {
    articles: publicArticles,
    expiresAt: now + publicArticleCacheTtlMs,
  })

  return publicArticles
}

export const readPublicArticle = async (slug: string): Promise<PublicArticle | null> => {
  const now = Date.now()
  const cachedArticle = publicArticleDetailCache.get(slug)

  if (cachedArticle && cachedArticle.expiresAt > now) {
    return cachedArticle.article
  }

  const article = await readArticle(slug).catch(() => null)

  if (!article || !isArticlePublic(article)) {
    publicArticleDetailCache.delete(slug)
    return null
  }

  const signature = createArticleSignature(article)

  const { body } = await parseMarkdownBody(
    article.markdown,
    {
      id: `${article.slug}.md`,
      path: article.path,
      body: article.markdown,
    },
  )

  const publicArticle = {
    ...article,
    markdown: stripMarkdownForSearch(article.markdown),
    contentText: stripMarkdownForSearch(article.markdown),
    body,
  }

  publicArticleDetailCache.set(slug, {
    article: publicArticle,
    signature,
    expiresAt: now + publicArticleCacheTtlMs,
  })

  return publicArticle
}
