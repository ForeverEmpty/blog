import { Buffer } from 'node:buffer'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'

import pg from 'pg'

import { ensureAdminDatabase } from './adminDatabase'

export type AdminBackupFile = {
  path: string
  encoding: 'utf8' | 'base64'
  content: string
}

export type AdminBackupDatabase = {
  walineComments: Record<string, unknown>[]
  adminLogs: Record<string, unknown>[]
  articleVersions: Record<string, unknown>[]
  articleAutosaves: Record<string, unknown>[]
  errors: string[]
}

export type AdminBackupPayload = {
  version: 1
  app: 'ChankoBlog'
  createdAt: string
  files: AdminBackupFile[]
  database?: AdminBackupDatabase
}

type BackupRoot = {
  base: string
  relativeBase: string
  include: (absolutePath: string) => boolean
  encoding: AdminBackupFile['encoding']
}

const backupVersion = 1
const contentRoot = () => resolve(process.cwd(), 'content')
const dataRoot = () => resolve(process.cwd(), 'data')
const mediaRoot = () => resolve(process.cwd(), 'public', 'media')
const restorePointRoot = () => resolve(dataRoot(), 'backups')
const maxRestoreFileBytes = 40 * 1024 * 1024
const maxRestoreTotalBytes = 220 * 1024 * 1024
const allowedDataFiles = new Set(['comments.json', 'friends.json', 'projects.json', 'views.json'])
const allowedMediaExtensions = new Set([
  '.avif',
  '.gif',
  '.jpg',
  '.jpeg',
  '.mp3',
  '.mp4',
  '.ogg',
  '.png',
  '.svg',
  '.wav',
  '.webm',
  '.webp'
])
const { Client } = pg

const getWalinePostgresConfig = () => ({
  host: process.env.WALINE_POSTGRES_HOST || process.env.PG_HOST || '127.0.0.1',
  port: Number(process.env.WALINE_POSTGRES_PORT || process.env.PG_PORT || 5432),
  database: process.env.WALINE_POSTGRES_DB || process.env.PG_DB || 'waline',
  user: process.env.WALINE_POSTGRES_USER || process.env.PG_USER || 'waline',
  password: process.env.WALINE_POSTGRES_PASSWORD || process.env.PG_PASSWORD || 'waline-local-password'
})

const getAdminPostgresConfig = () => ({
  host: process.env.ADMIN_POSTGRES_HOST || process.env.WALINE_POSTGRES_HOST || process.env.PG_HOST || '127.0.0.1',
  port: Number(process.env.ADMIN_POSTGRES_PORT || process.env.WALINE_POSTGRES_PORT || process.env.PG_PORT || 5432),
  database: process.env.ADMIN_POSTGRES_DB || process.env.WALINE_POSTGRES_DB || process.env.PG_DB || 'waline',
  user: process.env.ADMIN_POSTGRES_USER || process.env.WALINE_POSTGRES_USER || process.env.PG_USER || 'waline',
  password: process.env.ADMIN_POSTGRES_PASSWORD || process.env.WALINE_POSTGRES_PASSWORD || process.env.PG_PASSWORD || 'waline-local-password'
})

const withBackupClient = async <T>(
  config: ReturnType<typeof getWalinePostgresConfig>,
  handler: (client: pg.Client) => Promise<T>
) => {
  const client = new Client(config)

  try {
    await client.connect()
    return await handler(client)
  } finally {
    await client.end().catch(() => {})
  }
}

const getBackupRoots = (): BackupRoot[] => [
  {
    base: contentRoot(),
    relativeBase: 'content',
    include: (absolutePath) => extname(absolutePath).toLowerCase() === '.md',
    encoding: 'utf8'
  },
  {
    base: dataRoot(),
    relativeBase: 'data',
    include: (absolutePath) => allowedDataFiles.has(relative(dataRoot(), absolutePath).replace(/\\/g, '/')),
    encoding: 'utf8'
  },
  {
    base: mediaRoot(),
    relativeBase: 'public/media',
    include: (absolutePath) => allowedMediaExtensions.has(extname(absolutePath).toLowerCase()),
    encoding: 'base64'
  }
]

const isInside = (base: string, target: string) => {
  const normalized = relative(base, target)

  return normalized === '' || (!normalized.startsWith('..') && !isAbsolute(normalized))
}

const readDirectoryFiles = async (root: BackupRoot, directory = root.base): Promise<AdminBackupFile[]> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const files: AdminBackupFile[] = []

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name)

    if (entry.isDirectory()) {
      if (root.relativeBase === 'data' && entry.name === 'backups') {
        continue
      }

      files.push(...await readDirectoryFiles(root, absolutePath))
      continue
    }

    if (!entry.isFile() || !root.include(absolutePath)) {
      continue
    }

    const relativePath = relative(root.base, absolutePath).split(sep).join('/')
    const content = root.encoding === 'base64'
      ? await readFile(absolutePath).then((buffer) => buffer.toString('base64'))
      : await readFile(absolutePath, 'utf8')

    files.push({
      path: `${root.relativeBase}/${relativePath}`,
      encoding: root.encoding,
      content
    })
  }

  return files
}

const readTableRows = async (client: pg.Client, tableName: string) => {
  const result = await client.query(`SELECT * FROM ${tableName}`)

  return result.rows as Record<string, unknown>[]
}

const readOptionalTableRows = async (
  client: pg.Client,
  tableName: string,
  errors: string[]
) => {
  try {
    return await readTableRows(client, tableName)
  } catch (error) {
    errors.push(`${tableName}: ${error instanceof Error ? error.message : 'read failed'}`)
    return []
  }
}

const createDatabaseBackup = async (): Promise<AdminBackupDatabase> => {
  const database: AdminBackupDatabase = {
    walineComments: [],
    adminLogs: [],
    articleVersions: [],
    articleAutosaves: [],
    errors: []
  }

  try {
    database.walineComments = await withBackupClient(getWalinePostgresConfig(), (client) =>
      readOptionalTableRows(client, 'wl_comment', database.errors)
    )
  } catch (error) {
    database.errors.push(`waline: ${error instanceof Error ? error.message : 'connection failed'}`)
  }

  try {
    await ensureAdminDatabase()
    await withBackupClient(getAdminPostgresConfig(), async (client) => {
      const [adminLogs, articleVersions, articleAutosaves] = await Promise.all([
        readOptionalTableRows(client, 'admin_logs', database.errors),
        readOptionalTableRows(client, 'article_versions', database.errors),
        readOptionalTableRows(client, 'article_autosaves', database.errors)
      ])

      database.adminLogs = adminLogs
      database.articleVersions = articleVersions
      database.articleAutosaves = articleAutosaves
    })
  } catch (error) {
    database.errors.push(`admin: ${error instanceof Error ? error.message : 'connection failed'}`)
  }

  return database
}

export const createAdminBackup = async (): Promise<AdminBackupPayload> => {
  const files = (await Promise.all(getBackupRoots().map((root) => readDirectoryFiles(root))))
    .flat()
    .sort((a, b) => a.path.localeCompare(b.path))
  const database = await createDatabaseBackup()

  return {
    version: backupVersion,
    app: 'ChankoBlog',
    createdAt: new Date().toISOString(),
    files,
    database
  }
}

const assertBackupShape = (backup: unknown): asserts backup is AdminBackupPayload => {
  if (
    typeof backup !== 'object' ||
    backup === null ||
    (backup as AdminBackupPayload).version !== backupVersion ||
    (backup as AdminBackupPayload).app !== 'ChankoBlog' ||
    !Array.isArray((backup as AdminBackupPayload).files)
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid backup payload'
    })
  }
}

const resolveRestorePath = (filePath: string) => {
  if (
    !filePath ||
    filePath.includes('\0') ||
    filePath.includes('\\') ||
    filePath.split('/').some((part) => part === '..' || part === '')
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsafe backup file path'
    })
  }

  if (filePath.startsWith('content/blog/') && filePath.endsWith('.md')) {
    const target = resolve(process.cwd(), filePath)

    if (isInside(resolve(process.cwd(), 'content', 'blog'), target)) {
      return target
    }
  }

  if (filePath === 'content/about.md') {
    return resolve(process.cwd(), filePath)
  }

  if (filePath.startsWith('data/') && allowedDataFiles.has(filePath.slice('data/'.length))) {
    return resolve(process.cwd(), filePath)
  }

  if (filePath.startsWith('public/media/') && allowedMediaExtensions.has(extname(filePath).toLowerCase())) {
    const target = resolve(process.cwd(), filePath)

    if (isInside(mediaRoot(), target)) {
      return target
    }
  }

  throw createError({
    statusCode: 400,
    statusMessage: `Unsupported backup file path: ${filePath}`
  })
}

const getBackupFileBytes = (file: AdminBackupFile) => {
  if (file.encoding === 'base64') {
    return Buffer.byteLength(file.content, 'base64')
  }

  return Buffer.byteLength(file.content, 'utf8')
}

const quoteIdentifier = (value: string) => `"${value.replace(/"/g, '""')}"`

const walineCommentColumns = new Set([
  'id',
  'pid',
  'rid',
  'user_id',
  'nick',
  'mail',
  'link',
  'ua',
  'ip',
  'comment',
  'url',
  'addr',
  'browser',
  'os',
  'status',
  'like',
  'sticky',
  'at',
  'objectid',
  'type',
  'label',
  'createdat',
  'updatedat',
  'insertedat'
])
const adminLogColumns = new Set(['id', 'action', 'target_type', 'target_id', 'message', 'payload', 'created_at'])
const articleVersionColumns = new Set([
  'id',
  'slug',
  'title',
  'description',
  'date',
  'scheduled_at',
  'author',
  'author_url',
  'category',
  'workflow_status',
  'published',
  'locked',
  'pinned',
  'views',
  'tags',
  'markdown',
  'action',
  'created_at'
])
const articleAutosaveColumns = new Set([
  'slug',
  'title',
  'description',
  'date',
  'scheduled_at',
  'author',
  'author_url',
  'category',
  'workflow_status',
  'published',
  'locked',
  'pinned',
  'views',
  'tags',
  'markdown',
  'updated_at'
])

const normalizeDatabaseRows = (rows: unknown) => (
  Array.isArray(rows)
    ? rows.filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    : []
)

const upsertRows = async (
  client: pg.Client,
  tableName: string,
  rows: Record<string, unknown>[],
  allowedColumns: Set<string>,
  conflictColumns: string[]
) => {
  for (const row of rows) {
    const columns = Object.keys(row).filter((column) => allowedColumns.has(column) && row[column] !== undefined)

    if (columns.length === 0 || !conflictColumns.every((column) => columns.includes(column))) {
      continue
    }

    const values = columns.map((column) => row[column])
    const placeholders = columns.map((_, index) => `$${index + 1}`)
    const updateColumns = columns.filter((column) => !conflictColumns.includes(column))
    const updateClause = updateColumns.length > 0
      ? `DO UPDATE SET ${updateColumns.map((column) => `${quoteIdentifier(column)} = EXCLUDED.${quoteIdentifier(column)}`).join(', ')}`
      : 'DO NOTHING'

    await client.query(
      `INSERT INTO ${tableName} (${columns.map(quoteIdentifier).join(', ')})
       VALUES (${placeholders.join(', ')})
       ON CONFLICT (${conflictColumns.map(quoteIdentifier).join(', ')}) ${updateClause}`,
      values
    )
  }
}

const restoreDatabaseBackup = async (database?: AdminBackupDatabase) => {
  if (!database) {
    return {
      walineComments: 0,
      adminLogs: 0,
      articleVersions: 0,
      articleAutosaves: 0
    }
  }

  const walineComments = normalizeDatabaseRows(database.walineComments)
  const adminLogs = normalizeDatabaseRows(database.adminLogs)
  const articleVersions = normalizeDatabaseRows(database.articleVersions)
  const articleAutosaves = normalizeDatabaseRows(database.articleAutosaves)

  if (walineComments.length > 0) {
    await withBackupClient(getWalinePostgresConfig(), (client) =>
      upsertRows(client, 'wl_comment', walineComments, walineCommentColumns, ['id'])
    )
  }

  if (adminLogs.length > 0 || articleVersions.length > 0 || articleAutosaves.length > 0) {
    await ensureAdminDatabase()
    await withBackupClient(getAdminPostgresConfig(), async (client) => {
      await upsertRows(client, 'admin_logs', adminLogs, adminLogColumns, ['id'])
      await upsertRows(client, 'article_versions', articleVersions, articleVersionColumns, ['id'])
      await upsertRows(client, 'article_autosaves', articleAutosaves, articleAutosaveColumns, ['slug'])
    })
  }

  return {
    walineComments: walineComments.length,
    adminLogs: adminLogs.length,
    articleVersions: articleVersions.length,
    articleAutosaves: articleAutosaves.length
  }
}

export const saveAdminRestorePoint = async () => {
  const backup = await createAdminBackup()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filePath = resolve(restorePointRoot(), `restore-point-${timestamp}.json`)

  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(backup, null, 2)}\n`, 'utf8')

  return {
    path: relative(process.cwd(), filePath).split(sep).join('/'),
    fileCount: backup.files.length
  }
}

export const restoreAdminBackup = async (backup: unknown) => {
  assertBackupShape(backup)

  let totalBytes = 0

  for (const file of backup.files) {
    if (
      typeof file.path !== 'string' ||
      typeof file.content !== 'string' ||
      (file.encoding !== 'utf8' && file.encoding !== 'base64')
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid backup file'
      })
    }

    const fileBytes = getBackupFileBytes(file)

    if (fileBytes > maxRestoreFileBytes) {
      throw createError({
        statusCode: 413,
        statusMessage: `Backup file is too large: ${file.path}`
      })
    }

    totalBytes += fileBytes

    if (totalBytes > maxRestoreTotalBytes) {
      throw createError({
        statusCode: 413,
        statusMessage: 'Backup payload is too large'
      })
    }

    resolveRestorePath(file.path)
  }

  const restorePoint = await saveAdminRestorePoint()

  for (const file of backup.files) {
    const target = resolveRestorePath(file.path)
    const content = file.encoding === 'base64'
      ? Buffer.from(file.content, 'base64')
      : file.content

    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, content)
  }

  const database = await restoreDatabaseBackup(backup.database)
  const restoredFileStats = await Promise.all(
    backup.files.map(async (file) => ({
      path: file.path,
      bytes: (await stat(resolveRestorePath(file.path))).size
    }))
  )

  return {
    restoredCount: backup.files.length,
    restoredBytes: restoredFileStats.reduce((total, item) => total + item.bytes, 0),
    restorePoint,
    database
  }
}
