export type AdminPanel = 'overview' | 'articles' | 'media' | 'projects' | 'friends' | 'comments' | 'notifications' | 'about' | 'seo' | 'backup' | 'logs'

export type AdminSessionStatus = {
  authenticated: boolean
  configured: boolean
  username: string
  csrfToken: string
  expiresAt: string
  secondsRemaining: number
  checkedAt: string
  checking: boolean
}

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

export type ManagedAdminAuditChange = {
  field: string
  label: string
  before: string
  after: string
}

export type ManagedAdminAuditTrail = {
  changedCount: number
  summary: string
  changes: ManagedAdminAuditChange[]
}

export type ManagedNotificationLevel = 'info' | 'success' | 'warning' | 'danger'

export type ManagedNotificationAudience = 'site' | 'admin' | 'both'

export type ManagedNotification = {
  id: string
  title: string
  body: string
  date: string
  level: ManagedNotificationLevel
  href: string
  hrefLabel: string
  pinned: boolean
  enabled: boolean
  audience: ManagedNotificationAudience
}

export type ManagedAdminNotification = ManagedNotification & {
  source: string
  important: boolean
  emailed: boolean
  createdAt: string
}

export type ManagedNotificationEventKey =
  | 'friend.apply'
  | 'comment.waiting'
  | 'ai.summary.error'
  | 'build.failure'

export type ManagedNotificationEventSetting = {
  key: ManagedNotificationEventKey
  label: string
  description: string
  siteEnabled: boolean
  emailEnabled: boolean
  important: boolean
}

export type ManagedNotificationSettings = {
  emailEnabled: boolean
  emailTo: string
  emailFrom: string
  events: ManagedNotificationEventSetting[]
}

export type ManagedMediaUsageSource = {
  type: 'article' | 'about' | 'project' | 'friend' | 'notification' | 'adminNotification'
  title: string
  location: string
  field: string
  href?: string
  snippet: string
}

export type ManagedMediaAsset = {
  name: string
  url: string
  type: 'image' | 'video' | 'audio' | 'file'
  mime: string
  size: number
  updatedAt: string
  markdown: string
  usageCount: number
  usedBy: ManagedMediaUsageSource[]
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

export type ManagedCommentModerationHitRuleStat = {
  id: string
  label: string
  severity: 'review' | 'spam'
  count: number
}

export type ManagedCommentModerationHitStats = {
  totalHits: number
  hitComments: number
  reviewHits: number
  spamHits: number
  rules: ManagedCommentModerationHitRuleStat[]
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

export type AdminBackupScope =
  | 'full'
  | 'articles'
  | 'media'
  | 'projects'
  | 'friends'
  | 'about'
  | 'comments'
  | 'notifications'

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
  scope?: AdminBackupScope
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

export type AdminBackupRestorePreviewFile = {
  path: string
  category: AdminBackupScope
  encoding: AdminBackupFile['encoding']
  bytes: number
  exists: boolean
  changed: boolean
}

export type AdminBackupRestorePreviewSection = {
  category: AdminBackupScope
  label: string
  count: number
  bytes: number
  createCount: number
  overwriteCount: number
  changedCount: number
  samplePaths: string[]
}

export type AdminBackupRestorePreview = {
  valid: boolean
  app: 'ChankoBlog'
  version: 1
  scope: AdminBackupScope
  createdAt: string
  fileCount: number
  totalBytes: number
  createCount: number
  overwriteCount: number
  changedCount: number
  unchangedCount: number
  sections: AdminBackupRestorePreviewSection[]
  files: AdminBackupRestorePreviewFile[]
  database: {
    walineComments: number
    adminLogs: number
    articleVersions: number
    articleAutosaves: number
    errors: string[]
  }
  warnings: string[]
  errors: string[]
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

export type AdminVisitTrendArticle = {
  slug: string
  title: string
  category: string
  views: number
}

export type AdminVisitTrendItem = {
  date: string
  label: string
  views: number
  topArticles: AdminVisitTrendArticle[]
}

export type AdminVisitArticleStat = {
  slug: string
  title: string
  category: string
  workflowStatus: ArticleWorkflowStatus
  published: boolean
  locked: boolean
  pinned: boolean
  views: number
  share: number
  recentVisitors: number
  updatedAt: string
  last7Days: number
}

export type AdminVisitStats = {
  totalViews: number
  trackedArticles: number
  activeVisitors: number
  updatedAt: string
  trend: AdminVisitTrendItem[]
  topArticles: AdminVisitArticleStat[]
  recentArticles: AdminVisitArticleStat[]
  quietArticles: AdminVisitArticleStat[]
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
