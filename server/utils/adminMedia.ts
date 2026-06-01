import { createHash } from 'node:crypto'
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'

export type AdminMediaAsset = {
  name: string
  url: string
  type: 'image' | 'video' | 'audio' | 'file'
  mime: string
  size: number
  updatedAt: string
  markdown: string
}

type UploadedMediaFile = {
  filename?: string
  type?: string
  data: Buffer
}

const mediaDir = () => resolve(process.cwd(), 'public', 'media')
const maxMediaFileSize = 30 * 1024 * 1024
const allowedMimeByExt: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.webp': 'image/webp'
}

const ensureMediaDir = async () => {
  await mkdir(mediaDir(), { recursive: true })
}

const sanitizeMediaBasename = (value: string) => (
  value
    .trim()
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'media'
)

const getMediaType = (mime: string): AdminMediaAsset['type'] => {
  if (mime.startsWith('image/')) {
    return 'image'
  }

  if (mime.startsWith('video/')) {
    return 'video'
  }

  if (mime.startsWith('audio/')) {
    return 'audio'
  }

  return 'file'
}

const getMediaMarkdown = (asset: Omit<AdminMediaAsset, 'markdown'>) => {
  if (asset.type === 'image') {
    return `![${asset.name}](${asset.url})`
  }

  if (asset.type === 'video') {
    return `::content-video{src="${asset.url}" title="${asset.name}"}`
  }

  if (asset.type === 'audio') {
    return `<audio controls src="${asset.url}"></audio>`
  }

  return `[${asset.name}](${asset.url})`
}

export const assertSafeMediaName = (name: string) => {
  if (!/^[\w\u4e00-\u9fa5.-]+$/u.test(name) || name.includes('..') || name.startsWith('.')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid media name'
    })
  }

  const ext = extname(name).toLowerCase()

  if (!allowedMimeByExt[ext]) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported media type'
    })
  }
}

const mediaFilePath = (name: string) => {
  assertSafeMediaName(name)

  const directory = mediaDir()
  const filePath = resolve(join(directory, name))
  const relativePath = relative(directory, filePath)

  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid media path'
    })
  }

  return filePath
}

const toAsset = async (name: string): Promise<AdminMediaAsset> => {
  const ext = extname(name).toLowerCase()
  const mime = allowedMimeByExt[ext] || 'application/octet-stream'
  const fileStat = await stat(mediaFilePath(name))
  const baseAsset = {
    name,
    url: `/media/${encodeURIComponent(name)}`,
    type: getMediaType(mime),
    mime,
    size: fileStat.size,
    updatedAt: fileStat.mtime.toISOString()
  }

  return {
    ...baseAsset,
    markdown: getMediaMarkdown(baseAsset)
  }
}

export const readMediaAssets = async () => {
  await ensureMediaDir()

  const filenames = await readdir(mediaDir())
  const assets = await Promise.all(
    filenames
      .filter((filename) => allowedMimeByExt[extname(filename).toLowerCase()])
      .map((filename) => toAsset(filename))
  )

  return assets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export const saveUploadedMedia = async (file: UploadedMediaFile) => {
  if (!file.filename || !file.data?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Media file is required'
    })
  }

  if (file.data.length > maxMediaFileSize) {
    throw createError({
      statusCode: 413,
      statusMessage: 'Media file is too large'
    })
  }

  const originalName = basename(file.filename)
  const ext = extname(originalName).toLowerCase()
  const expectedMime = allowedMimeByExt[ext]

  if (!expectedMime) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported media type'
    })
  }

  await ensureMediaDir()

  const nameHash = createHash('sha1').update(file.data).digest('hex').slice(0, 10)
  const name = `${sanitizeMediaBasename(originalName)}-${Date.now().toString(36)}-${nameHash}${ext}`

  await writeFile(mediaFilePath(name), file.data)

  return toAsset(name)
}

export const deleteMediaAsset = async (name: string) => {
  await unlink(mediaFilePath(name))
}
