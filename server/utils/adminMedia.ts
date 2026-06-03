import { createHash } from 'node:crypto'
import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path'

import {
  readAboutPage,
  readAdminNotificationEvents,
  readArticles,
  readFriends,
  readNotifications,
  readProjects
} from './adminStorage'

export type AdminMediaUsageSource = {
  type: 'article' | 'about' | 'project' | 'friend' | 'notification' | 'adminNotification'
  title: string
  location: string
  field: string
  href?: string
  snippet: string
}

type AdminMediaUsageContext = Omit<AdminMediaUsageSource, 'snippet'> & {
  text: string
}

export type AdminMediaAsset = {
  name: string
  url: string
  type: 'image' | 'video' | 'audio' | 'file'
  mime: string
  size: number
  updatedAt: string
  markdown: string
  usageCount: number
  usedBy: AdminMediaUsageSource[]
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

const getMediaMarkdown = (asset: Omit<AdminMediaAsset, 'markdown' | 'usageCount' | 'usedBy'>) => {
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

const normalizeText = (value: unknown) => String(value || '')

const createSnippet = (text: string, needle: string) => {
  const normalized = normalizeText(text)
  const index = normalized.toLowerCase().indexOf(needle.toLowerCase())

  if (index < 0) {
    return normalized.slice(0, 120)
  }

  const start = Math.max(0, index - 48)
  const end = Math.min(normalized.length, index + needle.length + 48)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < normalized.length ? '...' : ''

  return `${prefix}${normalized.slice(start, end)}${suffix}`
}

const getAssetNeedles = (asset: Pick<AdminMediaAsset, 'name' | 'url' | 'markdown'>) => {
  const rawUrl = `/media/${asset.name}`
  const encodedUrl = `/media/${encodeURIComponent(asset.name)}`

  return Array.from(new Set([
    asset.url,
    rawUrl,
    encodedUrl,
    decodeURIComponent(asset.url),
    asset.markdown,
    asset.name
  ].filter(Boolean)))
}

const findMediaUsageInText = (
  asset: Pick<AdminMediaAsset, 'name' | 'url' | 'markdown'>,
  text: unknown
) => {
  const content = normalizeText(text)

  if (!content) {
    return null
  }

  return getAssetNeedles(asset).find((needle) => content.includes(needle)) || null
}

const createUsageSource = (
  asset: Pick<AdminMediaAsset, 'name' | 'url' | 'markdown'>,
  source: Omit<AdminMediaUsageSource, 'snippet'> & { text?: string },
  text: unknown
): AdminMediaUsageSource | null => {
  const needle = findMediaUsageInText(asset, text)

  if (!needle) {
    return null
  }

  const { text: _text, ...publicSource } = source

  return {
    ...publicSource,
    snippet: createSnippet(normalizeText(text), needle)
  }
}

const readMediaUsageContexts = async () => {
  const contexts: AdminMediaUsageContext[] = []
  const [articles, about, projects, friends, notifications, adminNotifications] = await Promise.all([
    readArticles().catch(() => []),
    readAboutPage().catch(() => null),
    readProjects().catch(() => []),
    readFriends().catch(() => []),
    readNotifications().catch(() => []),
    readAdminNotificationEvents().catch(() => [])
  ])

  for (const article of articles) {
    contexts.push({
      type: 'article',
      title: article.title,
      location: `文章 / ${article.slug}`,
      field: 'Markdown',
      href: `/blog/${article.slug}`,
      text: [
        article.title,
        article.description,
        article.markdown
      ].join('\n')
    })
  }

  if (about) {
    contexts.push({
      type: 'about',
      title: about.title || '关于',
      location: '关于页',
      field: 'Markdown',
      href: '/about',
      text: [
        about.title,
        about.description,
        about.markdown
      ].join('\n')
    })
  }

  for (const project of projects) {
    contexts.push({
      type: 'project',
      title: project.name,
      location: `项目 / ${project.id}`,
      field: '封面或内容',
      href: '/projects',
      text: [
        project.name,
        project.description,
        project.coverUrl,
        project.sourceUrl,
        project.launchUrl,
        project.tags.join('\n')
      ].join('\n')
    })
  }

  for (const friend of friends) {
    contexts.push({
      type: 'friend',
      title: friend.name,
      location: `友链 / ${friend.id}`,
      field: '图标或简介',
      href: '/friends',
      text: [
        friend.name,
        friend.icon,
        friend.intro,
        friend.description,
        friend.url,
        friend.tags.join('\n')
      ].join('\n')
    })
  }

  for (const notification of notifications) {
    contexts.push({
      type: 'notification',
      title: notification.title,
      location: `前台通知 / ${notification.id}`,
      field: '内容或链接',
      href: notification.href || undefined,
      text: [
        notification.title,
        notification.body,
        notification.href,
        notification.hrefLabel
      ].join('\n')
    })
  }

  for (const notification of adminNotifications) {
    contexts.push({
      type: 'adminNotification',
      title: notification.title,
      location: `后台通知 / ${notification.id}`,
      field: '内容或链接',
      href: notification.href || undefined,
      text: [
        notification.title,
        notification.body,
        notification.href,
        notification.hrefLabel
      ].join('\n')
    })
  }

  return contexts
}

const readMediaUsageSources = (
  asset: Pick<AdminMediaAsset, 'name' | 'url' | 'markdown'>,
  contexts: AdminMediaUsageContext[]
) => {
  const usedBy: AdminMediaUsageSource[] = []

  for (const context of contexts) {
    const source = createUsageSource(asset, context, context.text)

    if (source) {
      usedBy.push(source)
    }
  }

  return usedBy
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

const toAsset = async (name: string, usageContexts?: AdminMediaUsageContext[]): Promise<AdminMediaAsset> => {
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

  const asset = {
    ...baseAsset,
    markdown: getMediaMarkdown(baseAsset)
  }
  const usedBy = readMediaUsageSources(asset, usageContexts || await readMediaUsageContexts())

  return {
    ...asset,
    usageCount: usedBy.length,
    usedBy
  }
}

export const readMediaAssets = async () => {
  await ensureMediaDir()

  const filenames = await readdir(mediaDir())
  const usageContexts = await readMediaUsageContexts()
  const assets = await Promise.all(
    filenames
      .filter((filename) => allowedMimeByExt[extname(filename).toLowerCase()])
      .map((filename) => toAsset(filename, usageContexts))
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
