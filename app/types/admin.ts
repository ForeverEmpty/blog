export type AdminPanel = 'overview' | 'articles' | 'media' | 'projects' | 'friends' | 'comments' | 'about' | 'backup' | 'logs'

export type ArticleWorkflowStatus = 'draft' | 'review' | 'scheduled' | 'published' | 'archived'

export type ManagedArticle = {
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

export type ManagedArticleVersion = ManagedArticle & {
  versionId: string
  action: string
  createdAt: string
}

export type ManagedArticleAutosave = Omit<ManagedArticle, 'id' | 'path'> & {
  updatedAt: string
}

export type ManagedAdminLog = {
  id: string
  action: string
  targetType: string
  targetId: string
  message: string
  payload: Record<string, unknown> | null
  createdAt: string
}

export type ManagedMediaAsset = {
  name: string
  url: string
  type: 'image' | 'video' | 'audio' | 'file'
  mime: string
  size: number
  updatedAt: string
  markdown: string
}

export type ManagedProject = {
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

export type ManagedFriend = {
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

export type ManagedCommentStatus = 'approved' | 'waiting' | 'spam'

export type ManagedCommentModerationReason = {
  id: string
  label: string
  detail: string
  severity: 'review' | 'spam'
}

export type ManagedCommentModeration = {
  enabled: boolean
  status: ManagedCommentStatus
  score: number
  reasons: ManagedCommentModerationReason[]
}

export type ManagedCommentModerationRules = {
  enabled: boolean
  maxLinks: number
  maxRepeatedCharacterRun: number
  minContentLength: number
  blockedKeywords: string[]
  reviewKeywords: string[]
  blockedAuthors: string[]
  blockedEmailDomains: string[]
  blockedIps: string[]
}

export type ManagedComment = {
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
  status: ManagedCommentStatus
  createdAt: string
  moderation?: ManagedCommentModeration
}

export type ManagedAboutPage = {
  title: string
  description: string
  markdown: string
}

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

export type AdminBackupRestoreResult = {
  restoredCount: number
  restoredBytes: number
  restorePoint: {
    path: string
    fileCount: number
  }
  database?: {
    walineComments: number
    adminLogs: number
    articleVersions: number
    articleAutosaves: number
  }
}

export type MarkdownPreviewBlock = {
  startLine: number
  endLine: number
}

export type AdminPanelItem = {
  key: AdminPanel
  label: string
  icon: string
}

export type AdminStat = {
  label: string
  value: string
  detail: string
}

export type PreviewArticle = {
  title: string
  description: string
  date: string
  scheduledAt?: string
  category: string
  tags: string[]
}

export type ArticlePublishCheckSeverity = 'pass' | 'warning' | 'error'

export type ArticlePublishCheck = {
  id: string
  label: string
  detail: string
  severity: ArticlePublishCheckSeverity
}
