import pg from 'pg'
import type { CommentModerationResult } from '~~/server/utils/commentModeration'

export type WalineCommentStatus = 'approved' | 'waiting' | 'spam'

export type WalineComment = {
  id: string
  objectId: number
  url: string
  articleSlug: string
  author: string
  mail: string
  link: string
  content: string
  ip: string
  userAgent: string
  like: number
  status: WalineCommentStatus
  createdAt: string
  moderation?: CommentModerationResult
}

const { Client } = pg

const getPostgresConfig = () => ({
  host: process.env.WALINE_POSTGRES_HOST || process.env.PG_HOST || '127.0.0.1',
  port: Number(process.env.WALINE_POSTGRES_PORT || process.env.PG_PORT || 5432),
  database: process.env.WALINE_POSTGRES_DB || process.env.PG_DB || 'waline',
  user: process.env.WALINE_POSTGRES_USER || process.env.PG_USER || 'waline',
  password: process.env.WALINE_POSTGRES_PASSWORD || process.env.PG_PASSWORD || 'waline-local-password'
})

const withWalineClient = async <T>(handler: (client: pg.Client) => Promise<T>) => {
  const client = new Client(getPostgresConfig())

  try {
    await client.connect()
    return await handler(client)
  } finally {
    await client.end().catch(() => {})
  }
}

const normalizeStatus = (status: unknown): WalineCommentStatus => {
  if (status === 'waiting' || status === 'spam') {
    return status
  }

  return 'approved'
}

const articleSlugFromUrl = (url: string) => url.replace(/^\/blog\//, '') || url

const mapComment = (row: Record<string, unknown>): WalineComment => {
  const url = String(row.url || '')
  const insertedAt = row.insertedat instanceof Date
    ? row.insertedat.toISOString()
    : String(row.insertedat || row.createdat || '')

  return {
    id: String(row.id),
    objectId: Number(row.id),
    url,
    articleSlug: articleSlugFromUrl(url),
    author: String(row.nick || ''),
    mail: String(row.mail || ''),
    link: String(row.link || ''),
    content: String(row.comment || ''),
    ip: String(row.ip || ''),
    userAgent: String(row.ua || ''),
    like: Number(row.like || 0),
    status: normalizeStatus(row.status),
    createdAt: insertedAt
  }
}

export const readWalineComments = async (options: {
  status?: string
  query?: string
} = {}) => withWalineClient(async (client) => {
  const clauses: string[] = []
  const values: unknown[] = []

  if (options.status && options.status !== 'all') {
    values.push(options.status)
    clauses.push(`status = $${values.length}`)
  }

  if (options.query) {
    values.push(`%${options.query}%`)
    clauses.push(`(comment ILIKE $${values.length} OR nick ILIKE $${values.length} OR mail ILIKE $${values.length} OR url ILIKE $${values.length})`)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const result = await client.query(
    `SELECT id, url, nick, mail, link, comment, ip, ua, "like", status, insertedat, createdat
     FROM wl_comment
     ${where}
     ORDER BY insertedat DESC NULLS LAST, id DESC
     LIMIT 200`,
    values
  )

  return result.rows.map(mapComment)
})

export const updateWalineCommentStatus = async (id: string, status: WalineCommentStatus) => (
  withWalineClient(async (client) => {
    const result = await client.query(
      `UPDATE wl_comment
       SET status = $1, updatedat = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, url, nick, mail, link, comment, ip, ua, "like", status, insertedat, createdat`,
      [status, id]
    )

    if (!result.rows[0]) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Comment not found'
      })
    }

    return mapComment(result.rows[0])
  })
)

export const updateWalineCommentStatuses = async (ids: string[], status: WalineCommentStatus) => (
  withWalineClient(async (client) => {
    const result = await client.query(
      `UPDATE wl_comment
       SET status = $1, updatedat = CURRENT_TIMESTAMP
       WHERE id::text = ANY($2::text[])
       RETURNING id, url, nick, mail, link, comment, ip, ua, "like", status, insertedat, createdat`,
      [status, ids]
    )

    return result.rows.map(mapComment)
  })
)

export const deleteWalineComment = async (id: string) => (
  withWalineClient(async (client) => {
    await client.query('DELETE FROM wl_comment WHERE id = $1 OR pid = $1 OR rid = $1', [id])
  })
)

export const deleteWalineComments = async (ids: string[]) => (
  withWalineClient(async (client) => {
    const result = await client.query(
      `DELETE FROM wl_comment
       WHERE id::text = ANY($1::text[])
          OR pid::text = ANY($1::text[])
          OR rid::text = ANY($1::text[])
       RETURNING id`,
      [ids]
    )

    return result.rowCount || 0
  })
)
