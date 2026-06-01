import { randomUUID } from 'node:crypto'

import pg from 'pg'

import type { AdminArticle } from './adminStorage'

export type AdminLogEntry = {
  id: string
  action: string
  targetType: string
  targetId: string
  message: string
  payload: Record<string, unknown> | null
  createdAt: string
}

export type AdminArticleVersion = AdminArticle & {
  versionId: string
  action: string
  createdAt: string
}

export type AdminArticleAutosave = Omit<AdminArticle, 'id' | 'path'> & {
  updatedAt: string
}

type VersionRow = {
  id: string
  slug: string
  title: string
  description: string
  date: string
  author: string
  author_url: string | null
  category: string
  published: boolean
  locked: boolean
  pinned: boolean
  views: number
  tags: string[] | string
  markdown: string
  action: string
  created_at: Date | string
}

type AutosaveRow = Omit<VersionRow, 'id' | 'action' | 'created_at'> & {
  updated_at: Date | string
}

type LogRow = {
  id: string
  action: string
  target_type: string
  target_id: string
  message: string
  payload: Record<string, unknown> | string | null
  created_at: Date | string
}

const { Client } = pg

const getAdminPostgresConfig = () => ({
  host: process.env.ADMIN_POSTGRES_HOST || process.env.WALINE_POSTGRES_HOST || process.env.PG_HOST || '127.0.0.1',
  port: Number(process.env.ADMIN_POSTGRES_PORT || process.env.WALINE_POSTGRES_PORT || process.env.PG_PORT || 5432),
  database: process.env.ADMIN_POSTGRES_DB || process.env.WALINE_POSTGRES_DB || process.env.PG_DB || 'waline',
  user: process.env.ADMIN_POSTGRES_USER || process.env.WALINE_POSTGRES_USER || process.env.PG_USER || 'waline',
  password: process.env.ADMIN_POSTGRES_PASSWORD || process.env.WALINE_POSTGRES_PASSWORD || process.env.PG_PASSWORD || 'waline-local-password'
})

let schemaReady: Promise<void> | undefined

const withAdminClient = async <T>(handler: (client: pg.Client) => Promise<T>) => {
  const client = new Client(getAdminPostgresConfig())

  try {
    await client.connect()
    return await handler(client)
  } finally {
    await client.end().catch(() => {})
  }
}

const ensureAdminDatabase = async () => {
  schemaReady ||= withAdminClient(async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        message TEXT NOT NULL,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS article_versions (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        author TEXT NOT NULL,
        author_url TEXT,
        category TEXT NOT NULL,
        published BOOLEAN NOT NULL,
        locked BOOLEAN NOT NULL,
        pinned BOOLEAN NOT NULL,
        views INTEGER NOT NULL DEFAULT 0,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        markdown TEXT NOT NULL,
        action TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS article_versions_slug_created_at
        ON article_versions (slug, created_at DESC);

      CREATE TABLE IF NOT EXISTS article_autosaves (
        slug TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL,
        author TEXT NOT NULL,
        author_url TEXT,
        category TEXT NOT NULL,
        published BOOLEAN NOT NULL,
        locked BOOLEAN NOT NULL,
        pinned BOOLEAN NOT NULL,
        views INTEGER NOT NULL DEFAULT 0,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        markdown TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS admin_logs_created_at
        ON admin_logs (created_at DESC);
    `)
  })

  return schemaReady
}

const toIso = (value: Date | string) => (
  value instanceof Date ? value.toISOString() : new Date(value).toISOString()
)

const parseTags = (value: string[] | string) => {
  if (Array.isArray(value)) {
    return value.map(String)
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

const toArticleBase = (row: VersionRow | AutosaveRow): AdminArticle => ({
  id: row.slug,
  slug: row.slug,
  path: `/blog/${row.slug}`,
  title: row.title,
  description: row.description,
  date: row.date,
  author: row.author,
  authorUrl: row.author_url || undefined,
  category: row.category,
  published: row.published === true,
  locked: row.locked === true,
  pinned: row.pinned === true,
  views: Math.max(0, Number(row.views) || 0),
  tags: parseTags(row.tags),
  markdown: row.markdown
})

const toVersion = (row: VersionRow): AdminArticleVersion => ({
  ...toArticleBase(row),
  versionId: row.id,
  action: row.action,
  createdAt: toIso(row.created_at)
})

const toAutosave = (row: AutosaveRow): AdminArticleAutosave => ({
  slug: row.slug,
  title: row.title,
  description: row.description,
  date: row.date,
  author: row.author,
  authorUrl: row.author_url || undefined,
  category: row.category,
  published: row.published === true,
  locked: row.locked === true,
  pinned: row.pinned === true,
  views: Math.max(0, Number(row.views) || 0),
  tags: parseTags(row.tags),
  markdown: row.markdown,
  updatedAt: toIso(row.updated_at)
})

const toLog = (row: LogRow): AdminLogEntry => {
  let payload: Record<string, unknown> | null = null

  if (typeof row.payload === 'string') {
    try {
      const parsed = JSON.parse(row.payload)
      payload = typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null
    } catch {
      payload = null
    }
  } else if (row.payload && typeof row.payload === 'object') {
    payload = row.payload
  }

  return {
    id: row.id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    message: row.message,
    payload,
    createdAt: toIso(row.created_at)
  }
}

export const writeAdminLog = async (input: {
  action: string
  targetType: string
  targetId: string
  message: string
  payload?: Record<string, unknown>
}) => {
  await ensureAdminDatabase()

  const id = randomUUID()
  const result = await withAdminClient((client) => client.query<LogRow>(
    `INSERT INTO admin_logs (id, action, target_type, target_id, message, payload)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)
     RETURNING *`,
    [
      id,
      input.action,
      input.targetType,
      input.targetId,
      input.message,
      JSON.stringify(input.payload || null)
    ]
  ))

  return toLog(result.rows[0])
}

export const readAdminLogs = async (limit = 120) => {
  await ensureAdminDatabase()

  const result = await withAdminClient((client) => client.query<LogRow>(
    'SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT $1',
    [Math.max(1, Math.min(500, limit))]
  ))

  return result.rows.map(toLog)
}

export const createArticleVersion = async (article: AdminArticle, action: string) => {
  await ensureAdminDatabase()

  const id = randomUUID()
  const result = await withAdminClient((client) => client.query<VersionRow>(
    `INSERT INTO article_versions (
       id, slug, title, description, date, author, author_url, category,
       published, locked, pinned, views, tags, markdown, action
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15)
     RETURNING *`,
    [
      id,
      article.slug,
      article.title,
      article.description,
      article.date,
      article.author,
      article.authorUrl || null,
      article.category,
      article.published,
      article.locked,
      article.pinned,
      article.views,
      JSON.stringify(article.tags),
      article.markdown,
      action
    ]
  ))

  return toVersion(result.rows[0])
}

export const readArticleVersions = async (slug?: string, limit = 80) => {
  await ensureAdminDatabase()

  const safeLimit = Math.max(1, Math.min(300, limit))
  const result = await withAdminClient((client) => (
    slug
      ? client.query<VersionRow>(
        'SELECT * FROM article_versions WHERE slug = $1 ORDER BY created_at DESC LIMIT $2',
        [slug, safeLimit]
      )
      : client.query<VersionRow>(
        'SELECT * FROM article_versions ORDER BY created_at DESC LIMIT $1',
        [safeLimit]
      )
  ))

  return result.rows.map(toVersion)
}

export const readArticleVersion = async (id: string) => {
  await ensureAdminDatabase()

  const result = await withAdminClient((client) => client.query<VersionRow>(
    'SELECT * FROM article_versions WHERE id = $1',
    [id]
  ))

  return result.rows[0] ? toVersion(result.rows[0]) : null
}

export const saveArticleAutosave = async (article: AdminArticle) => {
  await ensureAdminDatabase()

  const result = await withAdminClient((client) => client.query<AutosaveRow>(
    `INSERT INTO article_autosaves (
       slug, title, description, date, author, author_url, category,
       published, locked, pinned, views, tags, markdown
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
     ON CONFLICT (slug) DO UPDATE SET
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       date = EXCLUDED.date,
       author = EXCLUDED.author,
       author_url = EXCLUDED.author_url,
       category = EXCLUDED.category,
       published = EXCLUDED.published,
       locked = EXCLUDED.locked,
       pinned = EXCLUDED.pinned,
       views = EXCLUDED.views,
       tags = EXCLUDED.tags,
       markdown = EXCLUDED.markdown,
       updated_at = NOW()
     RETURNING *`,
    [
      article.slug,
      article.title,
      article.description,
      article.date,
      article.author,
      article.authorUrl || null,
      article.category,
      article.published,
      article.locked,
      article.pinned,
      article.views,
      JSON.stringify(article.tags),
      article.markdown
    ]
  ))

  return toAutosave(result.rows[0])
}

export const readArticleAutosaves = async () => {
  await ensureAdminDatabase()

  const result = await withAdminClient((client) => client.query<AutosaveRow>(
    'SELECT * FROM article_autosaves ORDER BY updated_at DESC'
  ))

  return result.rows.map(toAutosave)
}

export const deleteArticleAutosave = async (slug: string) => {
  await ensureAdminDatabase()

  await withAdminClient((client) => client.query(
    'DELETE FROM article_autosaves WHERE slug = $1',
    [slug]
  ))
}
