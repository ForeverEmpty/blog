<script setup lang="ts">
import type {
  AdminPanel,
  AdminPanelItem,
  AdminBackupPayload,
  AdminBackupRestorePreview,
  AdminBackupRestoreResult,
  AdminBackupScope,
  AdminStat,
  AdminSessionStatus,
  AdminVisitStats,
  ArticlePublishCheck,
  ArticleWorkflowStatus,
  ManagedAdminLog,
  ManagedAboutPage,
  ManagedArticle,
  ManagedArticleAutosave,
  ManagedArticleVersion,
  ManagedAdminNotification,
  ManagedComment,
  ManagedCommentModerationHitRuleStat,
  ManagedCommentModerationHitStats,
  ManagedCommentModerationRules,
  ManagedCommentStatus,
  ManagedFriend,
  ManagedMediaAsset,
  ManagedNotification,
  ManagedNotificationSettings,
  ManagedProject
} from '~/types/admin'

definePageMeta({
  layout: false
})

const appConfig = useAppConfig()
const route = useRoute()
const router = useRouter()
const { searchContentItems } = useArticleSearch()
const adminAuthRedirecting = ref(false)
const adminCsrfToken = ref('')
let adminAuthCheckTimer: ReturnType<typeof setInterval> | undefined

const createEmptyAdminSessionStatus = (): AdminSessionStatus => ({
  authenticated: false,
  configured: false,
  username: 'admin',
  csrfToken: '',
  expiresAt: '',
  secondsRemaining: 0,
  checkedAt: '',
  checking: false
})

const adminSessionStatus = ref<AdminSessionStatus>(createEmptyAdminSessionStatus())

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

const getErrorStatusCode = (error: unknown) => {
  if (!isRecord(error)) {
    return 0
  }

  if (typeof error.statusCode === 'number') {
    return error.statusCode
  }

  if (typeof error.status === 'number') {
    return error.status
  }

  const response = error.response

  return isRecord(response) && typeof response.status === 'number' ? response.status : 0
}

const redirectToAdminLogin = async () => {
  if (adminAuthRedirecting.value) {
    return
  }

  adminAuthRedirecting.value = true
  const redirect = route.fullPath || '/admin'

  const loginLocation = {
    path: '/admin/login',
    query: {
      redirect
    }
  }

  if (import.meta.client) {
    await router.replace(loginLocation)
    return
  }

  await navigateTo(loginLocation)
}

const checkAdminSession = async () => {
  if (!import.meta.client || adminAuthRedirecting.value) {
    return
  }

  adminSessionStatus.value = {
    ...adminSessionStatus.value,
    checking: true
  }

  try {
    const session = await $fetch<Omit<AdminSessionStatus, 'checkedAt' | 'checking'>>('/api/admin/auth/session')

    adminSessionStatus.value = {
      ...session,
      checkedAt: new Date().toISOString(),
      checking: false
    }

    if (!session.authenticated) {
      await redirectToAdminLogin()
      return
    }

    adminCsrfToken.value = session.csrfToken || ''
  } catch {
    adminSessionStatus.value = {
      ...adminSessionStatus.value,
      authenticated: false,
      csrfToken: '',
      secondsRemaining: 0,
      checkedAt: new Date().toISOString(),
      checking: false
    }
    await redirectToAdminLogin()
  }
}

const checkAdminSessionWhenVisible = () => {
  if (document.visibilityState === 'visible') {
    void checkAdminSession()
  }
}

type AdminFetchOptions = Parameters<typeof $fetch>[1]

const isUnsafeRequest = (options?: AdminFetchOptions) => {
  const method = String(options?.method || 'GET').toUpperCase()

  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS'
}

const ensureAdminCsrfToken = async () => {
  if (adminCsrfToken.value || !import.meta.client) {
    return adminCsrfToken.value
  }

  await checkAdminSession()

  return adminCsrfToken.value
}

const createAdminFetchOptions = async (options?: AdminFetchOptions) => {
  const securedOptions = { ...(options || {}) } as NonNullable<AdminFetchOptions>
  const headers = new Headers(securedOptions.headers as HeadersInit | undefined)

  if (import.meta.server) {
    const requestHeaders = useRequestHeaders(['cookie'])

    if (requestHeaders.cookie && !headers.has('cookie')) {
      headers.set('cookie', requestHeaders.cookie)
    }
  }

  if (isUnsafeRequest(options)) {
    const csrfToken = await ensureAdminCsrfToken()

    headers.set('x-admin-csrf', csrfToken)
  }

  securedOptions.headers = headers

  return securedOptions
}

const adminFetch = async <T>(request: string, options?: AdminFetchOptions) => {
  try {
    const securedOptions = await createAdminFetchOptions(options)
    return await $fetch<T>(request, securedOptions)
  } catch (error) {
    const statusCode = getErrorStatusCode(error)

    if (statusCode === 403 && isUnsafeRequest(options)) {
      adminCsrfToken.value = ''
      await checkAdminSession()

      if (adminCsrfToken.value && !adminAuthRedirecting.value) {
        return await $fetch<T>(request, await createAdminFetchOptions(options))
      }
    }

    if (statusCode === 401 || statusCode === 403) {
      await redirectToAdminLogin()
    }

    throw error
  }
}

const { data: sourceArticles } = await useAsyncData('admin-api-articles', () =>
  adminFetch<ManagedArticle[]>('/api/admin/articles'),
  {
    default: () => []
  }
)
const { data: sourceProjects, refresh: refreshProjects } = await useAsyncData('admin-api-projects', () =>
  adminFetch<ManagedProject[]>('/api/admin/projects'),
  {
    default: () => []
  }
)
const { data: sourceFriends, refresh: refreshFriends } = await useAsyncData('admin-api-friends', () =>
  adminFetch<ManagedFriend[]>('/api/admin/friends'),
  {
    default: () => []
  }
)
const { data: sourceAbout } = await useAsyncData('admin-api-about', () =>
  adminFetch<ManagedAboutPage>('/api/admin/about'),
  {
    default: () => ({
      title: '关于',
      description: '',
      markdown: ''
    })
  }
)
const { data: sourceMediaAssets } = await useAsyncData('admin-api-media', () =>
  adminFetch<ManagedMediaAsset[]>('/api/admin/media').catch(() => []),
  {
    default: () => []
  }
)
const { data: sourceArticleVersions } = await useAsyncData('admin-api-article-versions', () =>
  adminFetch<ManagedArticleVersion[]>('/api/admin/articles/versions').catch(() => []),
  {
    default: () => []
  }
)
const { data: sourceArticleAutosaves } = await useAsyncData('admin-api-article-autosaves', () =>
  adminFetch<ManagedArticleAutosave[]>('/api/admin/articles/autosaves').catch(() => []),
  {
    default: () => []
  }
)
const { data: sourceAdminLogs } = await useAsyncData('admin-api-logs', () =>
  adminFetch<ManagedAdminLog[]>('/api/admin/logs').catch(() => []),
  {
    default: () => []
  }
)
const emptyVisitStats = (): AdminVisitStats => ({
  totalViews: 0,
  trackedArticles: 0,
  activeVisitors: 0,
  updatedAt: '',
  trend: [],
  topArticles: [],
  recentArticles: [],
  quietArticles: []
})
const { data: sourceVisitStats, refresh: refreshVisitStats } = await useAsyncData('admin-api-visit-stats', () =>
  adminFetch<AdminVisitStats>('/api/admin/analytics/views').catch(emptyVisitStats),
  {
    default: emptyVisitStats
  }
)
const { data: sourceNotifications } = await useAsyncData('admin-api-site-notifications', () =>
  adminFetch<ManagedNotification[]>('/api/admin/site-notifications').catch(() => []),
  {
    default: () => []
  }
)
const defaultNotificationSettings = (): ManagedNotificationSettings => ({
  emailEnabled: false,
  emailTo: '',
  emailFrom: '',
  events: [
    {
      key: 'friend.apply',
      label: '友链申请',
      description: '前台提交新的友链申请时触发。',
      siteEnabled: true,
      emailEnabled: true,
      important: true
    },
    {
      key: 'comment.waiting',
      label: '待审评论',
      description: '评论进入待审核状态时触发。',
      siteEnabled: true,
      emailEnabled: true,
      important: true
    },
    {
      key: 'ai.summary.error',
      label: 'AI 摘要失败',
      description: '文章 AI 摘要生成失败或缺少 API Key 时触发。',
      siteEnabled: true,
      emailEnabled: true,
      important: true
    },
    {
      key: 'build.failure',
      label: '构建失败',
      description: '构建失败事件写入时触发。',
      siteEnabled: true,
      emailEnabled: true,
      important: true
    }
  ]
})
const cloneNotificationSettings = (settings: ManagedNotificationSettings) => JSON.parse(JSON.stringify(settings)) as ManagedNotificationSettings
const { data: sourceAdminNotifications } = await useAsyncData('admin-api-notification-events', () =>
  adminFetch<ManagedAdminNotification[]>('/api/admin/notifications/events').catch(() => []),
  {
    default: () => []
  }
)
const { data: sourceNotificationSettings } = await useAsyncData('admin-api-notification-settings', () =>
  adminFetch<ManagedNotificationSettings>('/api/admin/notifications/settings').catch(defaultNotificationSettings),
  {
    default: defaultNotificationSettings
  }
)
const defaultCommentModerationRules = (): ManagedCommentModerationRules => ({
  enabled: true,
  maxLinks: 3,
  maxRepeatedCharacterRun: 12,
  minContentLength: 2,
  blockedKeywords: [],
  reviewKeywords: [],
  blockedAuthors: [],
  blockedEmailDomains: [],
  blockedIps: []
})
const cloneCommentModerationRules = (rules: ManagedCommentModerationRules) => JSON.parse(JSON.stringify(rules)) as ManagedCommentModerationRules
const { data: sourceCommentModerationRules } = await useAsyncData('admin-api-comment-moderation-rules', () =>
  adminFetch<ManagedCommentModerationRules>('/api/admin/comments/rules').catch(defaultCommentModerationRules),
  {
    default: defaultCommentModerationRules
  }
)
const panels: AdminPanelItem[] = [
  { key: 'overview', label: '总览', icon: 'lucide:layout-dashboard' },
  { key: 'articles', label: '文章', icon: 'lucide:file-pen-line' },
  { key: 'media', label: '媒体', icon: 'lucide:images' },
  { key: 'projects', label: '项目', icon: 'lucide:folder-kanban' },
  { key: 'friends', label: '友链', icon: 'lucide:link' },
  { key: 'comments', label: '评论', icon: 'lucide:message-square-text' },
  { key: 'notifications', label: '通知', icon: 'lucide:bell' },
  { key: 'about', label: '关于', icon: 'lucide:user-round-pen' },
  { key: 'seo', label: 'SEO', icon: 'lucide:search-check' },
  { key: 'backup', label: '备份', icon: 'lucide:database-backup' },
  { key: 'logs', label: '日志', icon: 'lucide:scroll-text' }
]

const activePanel = ref<AdminPanel>('overview')
const saving = ref(false)
const adminNotice = ref('')
const previewValue = shallowRef<unknown | null>(null)
const previewPending = ref(false)
const previewError = ref('')
const aboutPreviewValue = shallowRef<unknown | null>(null)
const aboutPreviewPending = ref(false)
const aboutPreviewError = ref('')
const commentsLoading = ref(false)
const commentsError = ref('')
const visitStatsLoading = ref(false)
const visitStatsError = ref('')
const commentRulesSaving = ref(false)
const friendInspecting = ref(false)
const friendInspectingIds = ref<string[]>([])
const projectInspecting = ref(false)
const projectInspectingIds = ref<string[]>([])
const logsLoading = ref(false)
const logsError = ref('')
const mediaUploading = ref(false)
const mediaError = ref('')
const backupLoading = ref(false)
const backupError = ref('')
const backupRestoreResult = ref<AdminBackupRestoreResult | null>(null)
const autosaveStatus = ref('自动保存待命')
let previewTimer: ReturnType<typeof setTimeout> | undefined
let aboutPreviewTimer: ReturnType<typeof setTimeout> | undefined
let autosaveTimer: ReturnType<typeof setTimeout> | undefined
let autosaveReady = false
let adminScheduleCheckTimer: ReturnType<typeof setInterval> | undefined
const adminScheduleNow = ref(Date.now())

const managedArticles = ref<ManagedArticle[]>(sourceArticles.value)
const managedProjects = ref<ManagedProject[]>(sourceProjects.value)
const managedFriends = ref<ManagedFriend[]>(sourceFriends.value)
const managedComments = ref<ManagedComment[]>([])
const mediaAssets = ref<ManagedMediaAsset[]>(sourceMediaAssets.value)
const articleVersions = ref<ManagedArticleVersion[]>(sourceArticleVersions.value)
const articleAutosaves = ref<ManagedArticleAutosave[]>(sourceArticleAutosaves.value)
const adminLogs = ref<ManagedAdminLog[]>(sourceAdminLogs.value)
const visitStats = ref<AdminVisitStats>(sourceVisitStats.value)
const managedNotifications = ref<ManagedNotification[]>(sourceNotifications.value)
const adminNotifications = ref<ManagedAdminNotification[]>(sourceAdminNotifications.value)
const notificationSettings = ref(cloneNotificationSettings(sourceNotificationSettings.value))
const aboutTitle = ref(sourceAbout.value.title)
const aboutDescription = ref(sourceAbout.value.description)
const aboutMarkdown = ref(sourceAbout.value.markdown)

const selectedArticleId = ref(managedArticles.value[0]?.id || 'new')
const draftTitle = ref(managedArticles.value[0]?.title || '新的文章标题')
const draftDescription = ref(managedArticles.value[0]?.description || '用于文章列表和详情页的摘要。')
const draftCategory = ref(managedArticles.value[0]?.category || '未分类')
const draftTags = ref((managedArticles.value[0]?.tags || ['Draft']).join(', '))
const draftDate = ref(managedArticles.value[0]?.date || new Date().toISOString().slice(0, 10))
const toDatetimeLocalValue = (value?: string) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)

  return localDate.toISOString().slice(0, 16)
}
const fromDatetimeLocalValue = (value: string) => {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offsetMinutes = -date.getTimezoneOffset()
  const offsetSign = offsetMinutes >= 0 ? '+' : '-'
  const absoluteOffset = Math.abs(offsetMinutes)
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0')
  const offsetRemainderMinutes = String(absoluteOffset % 60).padStart(2, '0')

  return `${value}:00${offsetSign}${offsetHours}:${offsetRemainderMinutes}`
}
const nextScheduledDatetimeLocalValue = () => {
  const date = new Date(Date.now() + 60 * 60_000)
  date.setMinutes(0, 0, 0)

  return toDatetimeLocalValue(date.toISOString())
}
const draftScheduledAt = ref(toDatetimeLocalValue(managedArticles.value[0]?.scheduledAt))
const draftLocked = ref(managedArticles.value[0]?.locked ?? false)
const draftPinned = ref(managedArticles.value[0]?.pinned ?? false)
const draftMarkdown = ref(managedArticles.value[0]?.markdown || '# 新的文章标题\n\n从这里开始写 Markdown。')

const selectedProjectId = ref(managedProjects.value[0]?.id || 'new')
const projectName = ref(managedProjects.value[0]?.name || 'New Project')
const projectDescription = ref(managedProjects.value[0]?.description || '项目简介会展示在首页和项目页。')
const projectStatus = ref(managedProjects.value[0]?.status || '草稿')
const projectCategory = ref(managedProjects.value[0]?.category || '项目')
const projectSourceUrl = ref(managedProjects.value[0]?.sourceUrl || 'https://github.com/')
const projectLaunchUrl = ref(managedProjects.value[0]?.launchUrl || 'https://example.com')
const projectTags = ref((managedProjects.value[0]?.tags || ['Admin']).join(', '))
const projectFeatured = ref(managedProjects.value[0]?.featured ?? false)
const projectHidden = ref(managedProjects.value[0]?.hidden ?? false)
const projectOrder = ref(managedProjects.value[0]?.order ?? 10)
const projectCoverUrl = ref(managedProjects.value[0]?.coverUrl || '')
const selectedFriendId = ref(managedFriends.value[0]?.id || 'new')
const friendName = ref(managedFriends.value[0]?.name || 'New Friend')
const friendUrl = ref(managedFriends.value[0]?.url || 'https://example.com')
const friendIcon = ref(managedFriends.value[0]?.icon || 'lucide:globe-2')
const friendIntro = ref(managedFriends.value[0]?.intro || '长期更新的个人站点')
const friendDescription = ref(managedFriends.value[0]?.description || '新的友链申请，默认进入待审核状态。')
const friendCategory = ref(managedFriends.value[0]?.category || '个人站点')
const friendTags = ref((managedFriends.value[0]?.tags || ['Review']).join(', '))
const friendContact = ref(managedFriends.value[0]?.contact || '')
const friendBacklinkUrl = ref(managedFriends.value[0]?.backlinkUrl || '')
const friendReviewNote = ref(managedFriends.value[0]?.reviewNote || '')
const friendFeatured = ref(managedFriends.value[0]?.featured ?? false)
const friendOrder = ref(managedFriends.value[0]?.order ?? 10)
const friendStatus = ref<ManagedFriend['status']>(managedFriends.value[0]?.status || '待审核')
const articleSearchQuery = ref('')
const articleCategoryFilter = ref('all')
const articleTagFilter = ref('all')
const articleStateFilter = ref('all')
const draftWorkflowStatus = ref<ArticleWorkflowStatus>(managedArticles.value[0]?.workflowStatus || (managedArticles.value[0]?.published ? 'published' : 'draft'))
const projectSearchQuery = ref('')
const projectStatusFilter = ref('all')
const projectCategoryFilter = ref('all')
const projectVisibilityFilter = ref('all')
const projectFeaturedFilter = ref('all')
const friendSearchQuery = ref('')
const friendStatusFilter = ref('all')
const commentSearchQuery = ref('')
const commentStatusFilter = ref('all')
const selectedCommentIds = ref<string[]>([])
const commentModerationRules = ref(cloneCommentModerationRules(sourceCommentModerationRules.value))

const articleWorkflowOptions: {
  value: ArticleWorkflowStatus
  label: string
  description: string
}[] = [
  { value: 'draft', label: '草稿', description: '只在后台编辑，不进入前台。' },
  { value: 'review', label: '待审核', description: '内容完成，等待发布检查或人工确认。' },
  { value: 'scheduled', label: '定时', description: '到达设定时间后进入前台。' },
  { value: 'published', label: '已发布', description: '通过检查后在前台展示。' },
  { value: 'archived', label: '已归档', description: '保留文件和历史，前台隐藏。' }
]
const articleWorkflowLabelMap = Object.fromEntries(
  articleWorkflowOptions.map((option) => [option.value, option.label])
) as Record<ArticleWorkflowStatus, string>
const isScheduledArticleReady = (article: Pick<ManagedArticle, 'scheduledAt'>) => {
  if (!article.scheduledAt) {
    return false
  }

  const timestamp = Date.parse(article.scheduledAt)

  return !Number.isNaN(timestamp) && timestamp <= adminScheduleNow.value
}
const getArticleWorkflowStatus = (article: Pick<ManagedArticle, 'workflowStatus' | 'published' | 'scheduledAt'>): ArticleWorkflowStatus => {
  const workflowStatus = article.workflowStatus || (article.published ? 'published' : 'draft')

  return workflowStatus === 'scheduled' && isScheduledArticleReady(article) ? 'published' : workflowStatus
}

type AdminConfirmationOptions = {
  title: string
  message: string
  confirmLabel?: string
  tone?: 'danger' | 'warning'
}

type PendingAdminConfirmation = Required<Pick<AdminConfirmationOptions, 'title' | 'message' | 'tone'>> & {
  confirmLabel: string
  resolve: (confirmed: boolean) => void
}

type AdminUndoAction = {
  id: number
  title: string
  message: string
  loading: boolean
  run: () => Promise<void>
  timer?: ReturnType<typeof setTimeout>
}

const pendingConfirmation = ref<PendingAdminConfirmation | null>(null)
const undoActions = ref<AdminUndoAction[]>([])
let undoActionId = 0

const requestAdminConfirmation = (options: AdminConfirmationOptions) => new Promise<boolean>((resolve) => {
  pendingConfirmation.value = {
    title: options.title,
    message: options.message,
    confirmLabel: options.confirmLabel || '确认操作',
    tone: options.tone || 'danger',
    resolve
  }
})

const resolveAdminConfirmation = (confirmed: boolean) => {
  const confirmation = pendingConfirmation.value

  if (!confirmation) {
    return
  }

  pendingConfirmation.value = null
  confirmation.resolve(confirmed)
}

const dismissUndoAction = (id: number) => {
  const action = undoActions.value.find((item) => item.id === id)

  if (action?.timer) {
    clearTimeout(action.timer)
  }

  undoActions.value = undoActions.value.filter((item) => item.id !== id)
}

const pushUndoAction = (input: Omit<AdminUndoAction, 'id' | 'loading' | 'timer'>) => {
  const action: AdminUndoAction = {
    id: undoActionId += 1,
    title: input.title,
    message: input.message,
    loading: false,
    run: input.run
  }

  action.timer = setTimeout(() => {
    dismissUndoAction(action.id)
  }, 10000)

  const nextActions = [action, ...undoActions.value]

  for (const removedAction of nextActions.slice(3)) {
    if (removedAction.timer) {
      clearTimeout(removedAction.timer)
    }
  }

  undoActions.value = nextActions.slice(0, 3)
}

const runUndoAction = async (action: AdminUndoAction) => {
  action.loading = true

  try {
    await action.run()
    dismissUndoAction(action.id)
  } catch {
    action.loading = false
    setAdminNotice('撤销失败，请检查服务端日志或使用备份恢复。')
  }
}

const articleCount = computed(() => managedArticles.value.length)
const projectCount = computed(() => managedProjects.value.length)
const commentCount = computed(() => managedComments.value.length)
const totalViews = computed(() => Math.max(
  visitStats.value.totalViews,
  managedArticles.value.reduce((total, article) => total + article.views, 0)
))
const lockedCount = computed(() => managedArticles.value.filter((article) => article.locked).length)
const pendingFriendCount = computed(() => managedFriends.value.filter((friend) => friend.status === '待审核').length)
const friendStats = computed(() => ({
  total: managedFriends.value.length,
  pending: managedFriends.value.filter((friend) => friend.status === '待审核').length,
  approved: managedFriends.value.filter((friend) => friend.status === '已通过').length,
  rejected: managedFriends.value.filter((friend) => friend.status === '已拒绝').length,
  unchecked: managedFriends.value.filter((friend) => friend.checkStatus === 'unchecked').length,
  ok: managedFriends.value.filter((friend) => friend.checkStatus === 'ok').length,
  warning: managedFriends.value.filter((friend) => friend.checkStatus === 'warning').length,
  error: managedFriends.value.filter((friend) => friend.checkStatus === 'error').length
}))
const pendingCommentCount = computed(() => managedComments.value.filter((comment) => comment.status === 'waiting').length)
const projectStats = computed(() => ({
  total: managedProjects.value.length,
  visible: managedProjects.value.filter((project) => !project.hidden).length,
  hidden: managedProjects.value.filter((project) => project.hidden).length,
  featured: managedProjects.value.filter((project) => project.featured).length,
  unchecked: managedProjects.value.filter((project) => project.checkStatus === 'unchecked').length,
  ok: managedProjects.value.filter((project) => project.checkStatus === 'ok').length,
  warning: managedProjects.value.filter((project) => project.checkStatus === 'warning').length,
  error: managedProjects.value.filter((project) => project.checkStatus === 'error').length
}))
const commentStats = computed(() => ({
  total: managedComments.value.length,
  approved: managedComments.value.filter((comment) => comment.status === 'approved').length,
  waiting: managedComments.value.filter((comment) => comment.status === 'waiting').length,
  spam: managedComments.value.filter((comment) => comment.status === 'spam').length
}))
const commentModerationHitStats = computed<ManagedCommentModerationHitStats>(() => {
  const ruleStats = new Map<string, ManagedCommentModerationHitRuleStat>()
  let totalHits = 0
  let hitComments = 0
  let reviewHits = 0
  let spamHits = 0

  for (const comment of managedComments.value) {
    const reasons = comment.moderation?.reasons || []

    if (reasons.length > 0) {
      hitComments += 1
    }

    for (const reason of reasons) {
      totalHits += 1

      if (reason.severity === 'spam') {
        spamHits += 1
      } else {
        reviewHits += 1
      }

      const current = ruleStats.get(reason.id) || {
        id: reason.id,
        label: reason.label,
        severity: reason.severity,
        count: 0
      }

      current.count += 1
      current.label = reason.label
      current.severity = reason.severity
      ruleStats.set(reason.id, current)
    }
  }

  return {
    totalHits,
    hitComments,
    reviewHits,
    spamHits,
    rules: Array.from(ruleStats.values()).sort((a, b) => (
      b.count - a.count || a.label.localeCompare(b.label, 'zh-CN')
    ))
  }
})
const articleWorkflowCounts = computed(() => articleWorkflowOptions.reduce((counts, option) => ({
  ...counts,
  [option.value]: managedArticles.value.filter((article) => (
    getArticleWorkflowStatus(article) === option.value
  )).length
}), {} as Record<ArticleWorkflowStatus, number>))
const publishedCount = computed(() => articleWorkflowCounts.value.published)
const draftCount = computed(() => articleWorkflowCounts.value.draft)
const reviewCount = computed(() => articleWorkflowCounts.value.review)
const scheduledCount = computed(() => articleWorkflowCounts.value.scheduled)
const archivedCount = computed(() => articleWorkflowCounts.value.archived)
const latestArticles = computed(() => (
  [...managedArticles.value]
    .sort(compareArticles)
    .slice(0, 5)
))
const latestProjects = computed(() => managedProjects.value.slice(0, 5))
const latestComments = computed(() => (
  [...managedComments.value]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)
))
const articleCategories = computed(() => (
  Array.from(new Set(managedArticles.value.map((article) => article.category).filter(Boolean))).sort()
))
const articleTags = computed(() => (
  Array.from(new Set(managedArticles.value.flatMap((article) => article.tags))).filter(Boolean).sort()
))
const filteredManagedArticles = computed(() => {
  const searchedArticles = articleSearchQuery.value.trim()
    ? searchContentItems(managedArticles.value, articleSearchQuery.value)
    : managedArticles.value

  return searchedArticles.filter((article) => (
    (articleCategoryFilter.value === 'all' || article.category === articleCategoryFilter.value) &&
    (articleTagFilter.value === 'all' || article.tags.includes(articleTagFilter.value)) &&
    (
      articleStateFilter.value === 'all' ||
      getArticleWorkflowStatus(article) === articleStateFilter.value ||
      (articleStateFilter.value === 'locked' && article.locked) ||
      (articleStateFilter.value === 'unlocked' && !article.locked) ||
      (articleStateFilter.value === 'pinned' && article.pinned) ||
      (articleStateFilter.value === 'unpinned' && !article.pinned)
    )
  )).sort(compareArticles)
})
const projectStatuses = computed(() => (
  Array.from(new Set(managedProjects.value.map((project) => project.status).filter(Boolean))).sort()
))
const projectCategories = computed(() => (
  Array.from(new Set(managedProjects.value.map((project) => project.category).filter(Boolean))).sort()
))
const projectTagList = computed(() => (
  projectTags.value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
))
const filteredManagedProjects = computed(() => {
  const searchedProjects = projectSearchQuery.value.trim()
    ? searchContentItems(managedProjects.value.map((project) => ({
      ...project,
      type: 'project' as const,
      pinned: project.featured,
      published: !project.hidden,
      check: project.checkStatus,
      content: `${project.description} ${project.checkStatus} ${project.checkMessage}`
    })), projectSearchQuery.value)
    : managedProjects.value

  return searchedProjects.filter((project) => (
    (projectStatusFilter.value === 'all' || project.status === projectStatusFilter.value) &&
    (projectCategoryFilter.value === 'all' || project.category === projectCategoryFilter.value) &&
    (
      projectVisibilityFilter.value === 'all' ||
      (projectVisibilityFilter.value === 'visible' && !project.hidden) ||
      (projectVisibilityFilter.value === 'hidden' && project.hidden)
    ) &&
    (
      projectFeaturedFilter.value === 'all' ||
      (projectFeaturedFilter.value === 'featured' && project.featured) ||
      (projectFeaturedFilter.value === 'normal' && !project.featured)
    )
  ))
})
const filteredManagedFriends = computed(() => {
  const query = friendSearchQuery.value.trim().toLowerCase()

  return managedFriends.value.filter((friend) => (
    (friendStatusFilter.value === 'all' || friend.status === friendStatusFilter.value) &&
    (
      !query ||
      friend.name.toLowerCase().includes(query) ||
      friend.url.toLowerCase().includes(query) ||
      friend.description.toLowerCase().includes(query) ||
      friend.category.toLowerCase().includes(query) ||
      String(friend.intro || '').toLowerCase().includes(query) ||
      friend.contact.toLowerCase().includes(query) ||
      friend.backlinkUrl.toLowerCase().includes(query) ||
      friend.reviewNote.toLowerCase().includes(query) ||
      friend.checkStatus.toLowerCase().includes(query) ||
      friend.checkMessage.toLowerCase().includes(query) ||
      friend.tags.some((tag) => tag.toLowerCase().includes(query))
    )
  ))
})
const filteredManagedComments = computed(() => {
  const query = commentSearchQuery.value.trim().toLowerCase()

  return managedComments.value.filter((comment) => (
    (commentStatusFilter.value === 'all' || comment.status === commentStatusFilter.value) &&
    (
      !query ||
      comment.content.toLowerCase().includes(query) ||
      comment.author.toLowerCase().includes(query) ||
      comment.mail.toLowerCase().includes(query) ||
      comment.link.toLowerCase().includes(query) ||
      comment.url.toLowerCase().includes(query) ||
      comment.articleSlug.toLowerCase().includes(query) ||
      comment.ip.toLowerCase().includes(query) ||
      comment.userAgent.toLowerCase().includes(query)
    )
  ))
})
const draftTagList = computed(() => (
  draftTags.value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
))
const previewArticle = computed(() => ({
  title: draftTitle.value,
  description: draftDescription.value,
  date: draftDate.value,
  scheduledAt: fromDatetimeLocalValue(draftScheduledAt.value) || undefined,
  category: draftCategory.value,
  tags: draftTagList.value
}))
const getMarkdownPlainText = (markdown: string) => (
  markdown
    .replace(/^---[\s\S]*?---\s*/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[[^\]]+]\([^)]+\)/g, '$1')
    .replace(/[#>*_~|\-[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
)
const createPublishCheck = (
  id: string,
  label: string,
  ok: boolean,
  passDetail: string,
  failDetail: string,
  severity: ArticlePublishCheck['severity'] = 'error'
): ArticlePublishCheck => ({
  id,
  label,
  detail: ok ? passDetail : failDetail,
  severity: ok ? 'pass' : severity
})
const publishChecks = computed<ArticlePublishCheck[]>(() => {
  const title = draftTitle.value.trim()
  const description = draftDescription.value.trim()
  const category = draftCategory.value.trim()
  const tags = draftTagList.value
  const markdown = draftMarkdown.value.trim()
  const plainText = getMarkdownPlainText(markdown)
  const imageMatches = Array.from(markdown.matchAll(/!\[([^\]]*)]\(([^)]+)\)/g))
  const emptyAltImages = imageMatches.filter((match) => !String(match[1] || '').trim()).length
  const today = new Date()
  const publishedDate = new Date(`${draftDate.value}T00:00:00`)
  const dateIsValid = Boolean(draftDate.value) && !Number.isNaN(publishedDate.getTime())
  const scheduledDate = new Date(draftScheduledAt.value)
  const scheduledDateIsValid = Boolean(draftScheduledAt.value) && !Number.isNaN(scheduledDate.getTime())
  const scheduledDateIsFuture = scheduledDateIsValid && scheduledDate.getTime() > today.getTime()
  const usesScheduledPublish = draftWorkflowStatus.value === 'scheduled'
  const willEnterPublicCollection = draftWorkflowStatus.value === 'published' || usesScheduledPublish
  const willEnterFeeds = willEnterPublicCollection && draftLocked.value !== true
  const dateNotTooFuture = dateIsValid
    ? usesScheduledPublish || publishedDate.getTime() <= today.getTime() + 1000 * 60 * 60 * 24
    : false
  const duplicateSlug = selectedArticleId.value === 'new'
    ? managedArticles.value.some((article) => article.title.trim().toLowerCase() === title.toLowerCase())
    : false

  return [
    createPublishCheck(
      'title',
      '标题',
      title.length >= 4 && title.length <= 80,
      `标题长度 ${title.length}，适合展示。`,
      '标题需要 4-80 个字符，避免过短或在列表中难以换行。'
    ),
    createPublishCheck(
      'description',
      '摘要',
      description.length >= 30 && description.length <= 180,
      `摘要长度 ${description.length}，适合 SEO 和列表展示。`,
      '摘要建议 30-180 个字符，发布前需要补齐。'
    ),
    createPublishCheck(
      'taxonomy',
      '分类与标签',
      Boolean(category) && tags.length > 0,
      `${category} / ${tags.length} 个标签。`,
      '需要设置分类，并至少添加 1 个标签。'
    ),
    createPublishCheck(
      'date',
      '发布日期',
      dateIsValid && dateNotTooFuture,
      `发布日期为 ${draftDate.value}。`,
      dateIsValid ? '发布日期超过明天，请确认是否需要定时发布。' : '发布日期无效。',
      dateIsValid ? 'warning' : 'error'
    ),
    ...(usesScheduledPublish
      ? [
          createPublishCheck(
            'scheduled-at',
            '定时发布时间',
            scheduledDateIsValid && scheduledDateIsFuture,
            `将在 ${draftScheduledAt.value.replace('T', ' ')} 后公开。`,
            scheduledDateIsValid ? '定时发布时间需要晚于当前时间。' : '请选择定时发布时间。',
            'error'
          )
        ]
      : []),
    createPublishCheck(
      'body',
      '正文内容',
      plainText.length >= 300,
      `正文约 ${plainText.length} 个纯文本字符。`,
      '正文少于 300 个纯文本字符，可能不适合正式发布。',
      'warning'
    ),
    createPublishCheck(
      'heading',
      '正文结构',
      /^#{2,3}\s+\S+/m.test(markdown),
      '正文包含二级或三级标题，结构可扫描。',
      '建议至少包含一个二级或三级标题，方便阅读和目录定位。',
      'warning'
    ),
    createPublishCheck(
      'image-alt',
      '图片替代文本',
      emptyAltImages === 0,
      imageMatches.length > 0 ? `${imageMatches.length} 张图片均包含替代文本。` : '未检测到普通 Markdown 图片。',
      `${emptyAltImages} 张 Markdown 图片缺少替代文本。`,
      'warning'
    ),
    createPublishCheck(
      'duplicate',
      '重复标题',
      !duplicateSlug,
      '未发现同名文章。',
      '已存在同名文章，新建发布会覆盖同 slug 文件，请先调整标题。',
      'error'
    ),
    createPublishCheck(
      'seo-title',
      'SEO 标题',
      title.length >= 6 && title.length <= 70,
      `标题长度 ${title.length}，适合搜索结果展示。`,
      'SEO 标题建议 6-70 个字符，避免搜索结果截断或语义不足。',
      'warning'
    ),
    createPublishCheck(
      'seo-description',
      'SEO 摘要',
      description.length >= 30 && description.length <= 160,
      `摘要长度 ${description.length}，适合作为页面 description 与订阅摘要。`,
      'SEO 摘要建议 30-160 个字符，发布后会用于页面 description 与订阅摘要。',
      'warning'
    ),
    createPublishCheck(
      'seo-public-entry',
      '搜索索引入口',
      willEnterPublicCollection,
      draftLocked.value
        ? '保存后会进入公开文章集合与 sitemap；文章页会显示锁定状态，请确认这是预期。'
        : '保存后会进入公开文章集合，并可被 sitemap 收录。',
      '只有已发布文章，或到达定时时间的定时文章，才会进入公开文章集合与 sitemap。',
      'error'
    ),
    createPublishCheck(
      'feed-entry',
      '订阅源入口',
      willEnterFeeds,
      '保存后会进入 RSS、Atom 和 JSON Feed；OPML 会继续指向这些订阅源。',
      draftLocked.value
        ? '锁定文章不会进入 RSS、Atom 和 JSON Feed，请确认订阅端是否需要看到这篇文章。'
        : '只有已发布文章，或到达定时时间的定时文章，才会进入 RSS、Atom 和 JSON Feed。',
      willEnterPublicCollection ? 'warning' : 'error'
    )
  ]
})
const blockingPublishChecks = computed(() => publishChecks.value.filter((check) => check.severity === 'error'))
const warningPublishChecks = computed(() => publishChecks.value.filter((check) => check.severity === 'warning'))
const stats = computed<AdminStat[]>(() => [
  {
    label: '文章数量',
    value: String(articleCount.value).padStart(2, '0'),
    detail: `${publishedCount.value} 已发布 / ${draftCount.value} 草稿 / ${reviewCount.value} 待审 / ${scheduledCount.value} 定时 / ${archivedCount.value} 归档`
  },
  {
    label: '观看量',
    value: totalViews.value.toLocaleString('zh-CN'),
    detail: `${lockedCount.value} 篇上锁文章`
  },
  {
    label: '评论量',
    value: String(commentCount.value).padStart(2, '0'),
    detail: `${pendingCommentCount.value} 条待审核`
  },
  {
    label: '项目数',
    value: String(projectCount.value).padStart(2, '0'),
    detail: `${pendingFriendCount.value} 个友链待审`
  }
])

const selectPanel = (panel: AdminPanel) => {
  activePanel.value = panel

  if (panel === 'comments' && managedComments.value.length === 0) {
    void refreshComments()
  }

  if (panel === 'media') {
    void refreshMedia()
  }

  if (panel === 'logs') {
    void refreshLogs()
  }

  if (panel === 'notifications') {
    void refreshAdminNotifications()
  }

  if (panel === 'overview') {
    void refreshVisits()
  }
}

const setAdminNotice = (message: string) => {
  adminNotice.value = message
}

const logoutAdmin = async () => {
  await adminFetch('/api/admin/auth/logout', {
    method: 'POST'
  })
  await navigateTo('/admin/login')
}

const selectArticle = (article: ManagedArticle) => {
  selectedArticleId.value = article.id
  draftTitle.value = article.title
  draftDescription.value = article.description
  draftCategory.value = article.category
  draftTags.value = article.tags.join(', ')
  draftDate.value = article.date
  draftScheduledAt.value = toDatetimeLocalValue(article.scheduledAt)
  draftWorkflowStatus.value = getArticleWorkflowStatus(article)
  draftLocked.value = article.locked
  draftPinned.value = article.pinned
  draftMarkdown.value = article.markdown || `# ${article.title}\n\n${article.description}`
}

const createArticle = () => {
  selectedArticleId.value = 'new'
  draftTitle.value = '新的文章标题'
  draftDescription.value = '用于文章列表和详情页的摘要。'
  draftCategory.value = '未分类'
  draftTags.value = 'Draft'
  draftDate.value = new Date().toISOString().slice(0, 10)
  draftScheduledAt.value = ''
  draftWorkflowStatus.value = 'draft'
  draftLocked.value = false
  draftPinned.value = false
  draftMarkdown.value = '# 新的文章标题\n\n从这里开始写 Markdown。'
  activePanel.value = 'articles'
}

const replaceArticle = (article: ManagedArticle) => {
  const index = managedArticles.value.findIndex((item) => item.id === article.id)

  if (index >= 0) {
    managedArticles.value[index] = article
  } else {
    managedArticles.value.unshift(article)
  }
}

const refreshAdminContent = async () => {
  const [articles, projects, friends, about, notifications, notificationEvents, settings] = await Promise.all([
    adminFetch<ManagedArticle[]>('/api/admin/articles'),
    adminFetch<ManagedProject[]>('/api/admin/projects'),
    adminFetch<ManagedFriend[]>('/api/admin/friends'),
    adminFetch<ManagedAboutPage>('/api/admin/about'),
    adminFetch<ManagedNotification[]>('/api/admin/site-notifications'),
    adminFetch<ManagedAdminNotification[]>('/api/admin/notifications/events'),
    adminFetch<ManagedNotificationSettings>('/api/admin/notifications/settings')
  ])

  managedArticles.value = articles
  managedProjects.value = projects
  managedFriends.value = friends
  aboutTitle.value = about.title
  aboutDescription.value = about.description
  aboutMarkdown.value = about.markdown
  managedNotifications.value = notifications
  adminNotifications.value = notificationEvents
  notificationSettings.value = cloneNotificationSettings(settings)

  if (!articles.some((article) => article.id === selectedArticleId.value)) {
    if (articles[0]) {
      selectArticle(articles[0])
    } else {
      selectedArticleId.value = 'new'
    }
  }

  if (!projects.some((project) => project.id === selectedProjectId.value)) {
    if (projects[0]) {
      selectProject(projects[0])
    } else {
      selectedProjectId.value = 'new'
    }
  }

  if (!friends.some((friend) => friend.id === selectedFriendId.value)) {
    if (friends[0]) {
      selectFriend(friends[0])
    } else {
      selectedFriendId.value = 'new'
    }
  }
}

const refreshArticleReliability = async () => {
  try {
    const [versions, autosaves] = await Promise.all([
      adminFetch<ManagedArticleVersion[]>('/api/admin/articles/versions'),
      adminFetch<ManagedArticleAutosave[]>('/api/admin/articles/autosaves')
    ])

    articleVersions.value = versions
    articleAutosaves.value = autosaves
  } catch {
    autosaveStatus.value = '可靠性记录读取失败，请检查 PostgreSQL'
  }
}

const refreshLogs = async () => {
  logsLoading.value = true
  logsError.value = ''

  try {
    adminLogs.value = await adminFetch<ManagedAdminLog[]>('/api/admin/logs')
  } catch {
    logsError.value = '后台日志读取失败，请确认 PostgreSQL 配置可用。'
  } finally {
    logsLoading.value = false
  }
}

const refreshVisits = async () => {
  visitStatsLoading.value = true
  visitStatsError.value = ''

  try {
    await refreshVisitStats()
    visitStats.value = sourceVisitStats.value || emptyVisitStats()
  } catch {
    visitStatsError.value = '访问统计读取失败，请检查登录态和服务端日志。'
  } finally {
    visitStatsLoading.value = false
  }
}

const saveNotifications = async () => {
  saving.value = true

  try {
    managedNotifications.value = await adminFetch<ManagedNotification[]>('/api/admin/site-notifications', {
      method: 'POST',
      body: {
        notifications: managedNotifications.value
      }
    })
    setAdminNotice('站内通知配置已保存。')
    void refreshLogs()
  } catch {
    setAdminNotice('站内通知保存失败，请检查登录态和服务端日志。')
  } finally {
    saving.value = false
  }
}

const refreshAdminNotifications = async () => {
  try {
    const [events, settings] = await Promise.all([
      adminFetch<ManagedAdminNotification[]>('/api/admin/notifications/events'),
      adminFetch<ManagedNotificationSettings>('/api/admin/notifications/settings')
    ])

    adminNotifications.value = events
    notificationSettings.value = cloneNotificationSettings(settings)
  } catch {
    setAdminNotice('后台通知读取失败，请检查登录态和服务端日志。')
  }
}

const saveNotificationSettings = async () => {
  saving.value = true

  try {
    const settings = await adminFetch<ManagedNotificationSettings>('/api/admin/notifications/settings', {
      method: 'POST',
      body: notificationSettings.value
    })

    notificationSettings.value = cloneNotificationSettings(settings)
    setAdminNotice('通知邮件发送策略已保存。')
    void refreshLogs()
  } catch {
    setAdminNotice('通知邮件策略保存失败，请检查登录态和服务端日志。')
  } finally {
    saving.value = false
  }
}

const refreshMedia = async () => {
  mediaError.value = ''

  try {
    mediaAssets.value = await adminFetch<ManagedMediaAsset[]>('/api/admin/media')
  } catch {
    mediaError.value = '媒体读取失败，请检查 public/media 权限或服务端日志。'
  }
}

const backupScopeLabels: Record<AdminBackupScope, string> = {
  full: '完整',
  articles: '文章',
  media: '媒体',
  projects: '项目',
  friends: '友链',
  about: '关于',
  comments: '评论',
  notifications: '通知'
}

const getBackupFilename = (backup: AdminBackupPayload) => {
  const timestamp = String(backup.createdAt || new Date().toISOString()).replace(/[:.]/g, '-')
  const scope = backup.scope || 'full'

  return `chankoblog-backup-${scope}-${timestamp}.json`
}

const exportBackup = async (scope: AdminBackupScope = 'full') => {
  backupLoading.value = true
  backupError.value = ''

  try {
    const backup = await adminFetch<AdminBackupPayload>(`/api/admin/backup?scope=${encodeURIComponent(scope)}`)
    const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], {
      type: 'application/json;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = getBackupFilename(backup)
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    void refreshLogs()
    setAdminNotice(`已导出${backupScopeLabels[scope]}备份，包含 ${backup.files.length} 个文件和 ${backup.database?.walineComments.length || 0} 条评论记录。`)
  } catch {
    backupError.value = '备份导出失败，请检查服务端日志。'
  } finally {
    backupLoading.value = false
  }
}

const previewBackupRestore = (backup: AdminBackupPayload) => (
  adminFetch<AdminBackupRestorePreview>('/api/admin/backup/preview', {
    method: 'POST',
    body: backup
  })
)

const restoreBackup = async (backup: AdminBackupPayload) => {
  const confirmed = await requestAdminConfirmation({
    title: '恢复数据备份',
    message: '该操作会覆盖当前同名文章、数据 JSON 与媒体文件，并按主键恢复备份内的数据库记录。恢复前服务端会自动生成本地恢复点，但仍建议确认备份来源可靠。',
    confirmLabel: '恢复备份',
    tone: 'warning'
  })

  if (!confirmed) {
    return
  }

  backupLoading.value = true
  backupError.value = ''

  try {
    backupRestoreResult.value = await adminFetch<AdminBackupRestoreResult>('/api/admin/backup/restore', {
      method: 'POST',
      body: backup
    })

    await refreshAdminContent()
    await Promise.all([
      refreshMedia(),
      refreshComments(),
      refreshArticleReliability(),
      refreshVisits(),
      refreshLogs()
    ])
    setAdminNotice(`已恢复 ${backupRestoreResult.value.restoredCount} 个文件。`)
  } catch {
    backupError.value = '备份恢复失败，请确认备份格式和文件大小。'
  } finally {
    backupLoading.value = false
  }
}

const uploadMedia = async (files: File[]) => {
  if (files.length === 0 || mediaUploading.value) {
    return
  }

  mediaUploading.value = true
  mediaError.value = ''

  try {
    const formData = new FormData()

    for (const file of files) {
      formData.append('files', file)
    }

    const uploaded = await adminFetch<ManagedMediaAsset[]>('/api/admin/media', {
      method: 'POST',
      body: formData
    })

    const uploadedNames = new Set(uploaded.map((asset) => asset.name))
    mediaAssets.value = [...uploaded, ...mediaAssets.value.filter((asset) => !uploadedNames.has(asset.name))]
    void refreshLogs()
    setAdminNotice(`已上传 ${uploaded.length} 个媒体文件。`)
  } catch {
    mediaError.value = '媒体上传失败，仅支持图片、视频和音频，单文件最大 30MB。'
  } finally {
    mediaUploading.value = false
  }
}

const deleteMedia = async (asset: ManagedMediaAsset) => {
  const confirmed = await requestAdminConfirmation({
    title: '删除媒体文件',
    message: `确定删除 ${asset.name}？\n媒体文件删除后不能直接撤销，只能通过备份恢复。`,
    confirmLabel: '删除媒体'
  })

  if (!confirmed) {
    return
  }

  saving.value = true
  mediaError.value = ''

  try {
    await adminFetch(`/api/admin/media/${encodeURIComponent(asset.name)}`, {
      method: 'DELETE'
    })
    mediaAssets.value = mediaAssets.value.filter((item) => item.name !== asset.name)
    void refreshLogs()
    setAdminNotice('媒体文件已删除。')
  } catch {
    mediaError.value = '媒体删除失败。'
  } finally {
    saving.value = false
  }
}

const deleteSelectedMedia = async (assets: ManagedMediaAsset[]) => {
  if (assets.length === 0) {
    return
  }

  const confirmed = await requestAdminConfirmation({
    title: '批量删除媒体文件',
    message: `确定删除选中的 ${assets.length} 个媒体文件？\n媒体文件删除后不能直接撤销，只能通过备份恢复。`,
    confirmLabel: '批量删除'
  })

  if (!confirmed) {
    return
  }

  saving.value = true
  mediaError.value = ''

  try {
    await Promise.all(
      assets.map((asset) => adminFetch(`/api/admin/media/${encodeURIComponent(asset.name)}`, {
        method: 'DELETE'
      }))
    )

    const deletedNames = new Set(assets.map((asset) => asset.name))
    mediaAssets.value = mediaAssets.value.filter((item) => !deletedNames.has(item.name))
    void refreshLogs()
    setAdminNotice(`已删除 ${assets.length} 个媒体文件。`)
  } catch {
    mediaError.value = '媒体批量删除失败。'
  } finally {
    saving.value = false
  }
}

const buildDraftPayload = () => {
  const current = managedArticles.value.find((article) => article.id === selectedArticleId.value)

  return {
    current,
    body: {
      slug: current?.slug,
      title: draftTitle.value,
      description: draftDescription.value,
      date: draftDate.value,
      scheduledAt: draftWorkflowStatus.value === 'scheduled' ? fromDatetimeLocalValue(draftScheduledAt.value) : '',
      author: current?.author || 'Chanko',
      authorUrl: current?.authorUrl || '/about',
      category: draftCategory.value,
      workflowStatus: draftWorkflowStatus.value,
      published: draftWorkflowStatus.value === 'published',
      locked: draftLocked.value,
      pinned: draftPinned.value,
      views: current?.views || 0,
      tags: draftTagList.value,
      markdown: draftMarkdown.value
    }
  }
}

const selectProject = (project: ManagedProject) => {
  selectedProjectId.value = project.id
  projectName.value = project.name
  projectDescription.value = project.description
  projectStatus.value = project.status
  projectCategory.value = project.category
  projectSourceUrl.value = project.sourceUrl
  projectLaunchUrl.value = project.launchUrl
  projectTags.value = project.tags.join(', ')
  projectFeatured.value = project.featured
  projectHidden.value = project.hidden
  projectOrder.value = project.order
  projectCoverUrl.value = project.coverUrl
}

const createProject = () => {
  selectedProjectId.value = 'new'
  projectName.value = 'New Project'
  projectDescription.value = '项目简介会展示在首页和项目页。'
  projectStatus.value = '草稿'
  projectCategory.value = '项目'
  projectSourceUrl.value = 'https://github.com/'
  projectLaunchUrl.value = 'https://example.com'
  projectTags.value = 'Admin'
  projectFeatured.value = false
  projectHidden.value = true
  projectOrder.value = ((managedProjects.value.at(-1)?.order || managedProjects.value.length * 10) + 10)
  projectCoverUrl.value = ''
  activePanel.value = 'projects'
}

const selectFriend = (friend: ManagedFriend) => {
  selectedFriendId.value = friend.id
  friendName.value = friend.name
  friendUrl.value = friend.url
  friendIcon.value = friend.icon || ''
  friendIntro.value = friend.intro || ''
  friendDescription.value = friend.description
  friendCategory.value = friend.category
  friendTags.value = friend.tags.join(', ')
  friendContact.value = friend.contact
  friendBacklinkUrl.value = friend.backlinkUrl
  friendReviewNote.value = friend.reviewNote
  friendFeatured.value = friend.featured
  friendOrder.value = friend.order
  friendStatus.value = friend.status
}

const createFriend = () => {
  selectedFriendId.value = 'new'
  friendName.value = 'New Friend'
  friendUrl.value = 'https://example.com'
  friendIcon.value = 'lucide:globe-2'
  friendIntro.value = '长期更新的个人站点'
  friendDescription.value = '新的友链申请，默认进入待审核状态。'
  friendCategory.value = '个人站点'
  friendTags.value = 'Review'
  friendContact.value = ''
  friendBacklinkUrl.value = ''
  friendReviewNote.value = ''
  friendFeatured.value = false
  friendOrder.value = ((managedFriends.value.at(-1)?.order || managedFriends.value.length * 10) + 10)
  friendStatus.value = '待审核'
  activePanel.value = 'friends'
}

const replaceFriend = (friend: ManagedFriend) => {
  const index = managedFriends.value.findIndex((item) => item.id === friend.id)

  if (index >= 0) {
    managedFriends.value[index] = friend
  } else {
    managedFriends.value.unshift(friend)
  }
}

const replaceProject = (project: ManagedProject) => {
  const index = managedProjects.value.findIndex((item) => item.id === project.id)

  if (index >= 0) {
    managedProjects.value[index] = project
  } else {
    managedProjects.value.unshift(project)
  }
}

const saveDraft = async () => {
  const { current, body } = buildDraftPayload()
  const validatesPublishChecks = body.workflowStatus === 'published' || body.workflowStatus === 'scheduled'

  if (validatesPublishChecks && blockingPublishChecks.value.length > 0) {
    setAdminNotice(`发布检查未通过：${blockingPublishChecks.value.map((check) => check.label).join('、')}。`)
    return
  }

  if (validatesPublishChecks && warningPublishChecks.value.length > 0) {
    const confirmed = await requestAdminConfirmation({
      title: '发布检查存在提醒',
      message: `以下项目建议发布前处理：\n${warningPublishChecks.value.map((check) => `- ${check.label}：${check.detail}`).join('\n')}`,
      confirmLabel: body.workflowStatus === 'scheduled' ? '继续定时' : '继续发布',
      tone: 'warning'
    })

    if (!confirmed) {
      return
    }
  }

  saving.value = true

  try {
    const article = await adminFetch<ManagedArticle>('/api/admin/articles', {
      method: 'POST',
      body
    })

    replaceArticle(article)
    selectedArticleId.value = article.id
    draftWorkflowStatus.value = getArticleWorkflowStatus(article)
    await refreshArticleReliability()
    void refreshLogs()
    autosaveStatus.value = '已保存，自动保存已清理'
    setAdminNotice(current ? '文章已写入 content/blog，并记录旧版本。' : '文章已写入 content/blog。')
  } catch {
    setAdminNotice('文章保存失败，请检查服务端日志。')
  } finally {
    saving.value = false
  }
}

const toggleArticleLock = async (article: ManagedArticle) => {
  saving.value = true

  try {
    const updated = await adminFetch<ManagedArticle>('/api/admin/articles', {
      method: 'POST',
      body: {
        ...article,
        locked: !article.locked
      }
    })

    replaceArticle(updated)

    if (selectedArticleId.value === updated.id) {
      draftLocked.value = updated.locked
    }

    setAdminNotice(updated.locked ? '文章已上锁。' : '文章已解锁。')
  } catch {
    setAdminNotice('文章锁定状态更新失败。')
  } finally {
    saving.value = false
  }
}

const toggleArticlePinned = async (article: ManagedArticle) => {
  saving.value = true

  try {
    const updated = await adminFetch<ManagedArticle>('/api/admin/articles', {
      method: 'POST',
      body: {
        ...article,
        pinned: !article.pinned
      }
    })

    replaceArticle(updated)

    if (selectedArticleId.value === updated.id) {
      draftPinned.value = updated.pinned
    }

    setAdminNotice(updated.pinned ? '文章已置顶。' : '文章已取消置顶。')
  } catch {
    setAdminNotice('文章置顶状态更新失败。')
  } finally {
    saving.value = false
  }
}

const setArticleWorkflowStatus = async (article: ManagedArticle, workflowStatus: ArticleWorkflowStatus) => {
  const nextPublished = workflowStatus === 'published'

  if (selectedArticleId.value === article.id) {
    draftWorkflowStatus.value = workflowStatus
    if (workflowStatus === 'scheduled' && !draftScheduledAt.value) {
      draftScheduledAt.value = nextScheduledDatetimeLocalValue()
    }
    await saveDraft()
    return
  }

  if (workflowStatus === 'published') {
    selectArticle(article)
    draftWorkflowStatus.value = 'published'
    setAdminNotice('已载入该文章并切换为待发布，请在编辑器中保存，通过发布检查后进入前台。')
    return
  }

  if (workflowStatus === 'scheduled') {
    selectArticle(article)
    draftWorkflowStatus.value = 'scheduled'
    draftScheduledAt.value = toDatetimeLocalValue(article.scheduledAt) || nextScheduledDatetimeLocalValue()
    setAdminNotice('已载入该文章并切换为定时发布，请选择发布时间后保存。')
    return
  }

  if (workflowStatus === 'published' && blockingPublishChecks.value.length > 0 && selectedArticleId.value === article.id) {
    setAdminNotice(`发布检查未通过：${blockingPublishChecks.value.map((check) => check.label).join('、')}。`)
    return
  }

  if (workflowStatus === 'published' && warningPublishChecks.value.length > 0 && selectedArticleId.value === article.id) {
    const confirmed = await requestAdminConfirmation({
      title: '发布检查存在提醒',
      message: `以下项目建议发布前处理：\n${warningPublishChecks.value.map((check) => `- ${check.label}：${check.detail}`).join('\n')}`,
      confirmLabel: '继续发布',
      tone: 'warning'
    })

    if (!confirmed) {
      return
    }
  }

  saving.value = true

  try {
    const updated = await adminFetch<ManagedArticle>('/api/admin/articles', {
      method: 'POST',
      body: {
        ...article,
        workflowStatus,
        scheduledAt: '',
        published: nextPublished
      }
    })

    replaceArticle(updated)

    if (selectedArticleId.value === updated.id) {
      draftWorkflowStatus.value = getArticleWorkflowStatus(updated)
    }

    void refreshLogs()
    setAdminNotice(`文章工作流已切换为：${articleWorkflowLabelMap[getArticleWorkflowStatus(updated)]}。`)
  } catch {
    setAdminNotice('文章工作流状态更新失败。')
  } finally {
    saving.value = false
  }
}

const deleteArticle = async (article: ManagedArticle) => {
  const confirmed = await requestAdminConfirmation({
    title: '删除文章',
    message: `确定删除《${article.title}》？\n文章文件会从 content/blog 移除，删除后 10 秒内可从当前页面撤销。`,
    confirmLabel: '删除文章'
  })

  if (!confirmed) {
    return
  }

  saving.value = true

  try {
    await adminFetch(`/api/admin/articles/${encodeURIComponent(article.slug)}`, {
      method: 'DELETE'
    })

    managedArticles.value = managedArticles.value.filter((item) => item.id !== article.id)

    if (selectedArticleId.value === article.id) {
      const next = managedArticles.value[0]

      if (next) {
        selectArticle(next)
      } else {
        createArticle()
      }
    }

    await refreshArticleReliability()
    void refreshLogs()
    setAdminNotice('文章文件已删除。')
    pushUndoAction({
      title: '撤销删除文章',
      message: `恢复《${article.title}》`,
      run: async () => {
        const restored = await adminFetch<ManagedArticle>('/api/admin/articles', {
          method: 'POST',
          body: article
        })

        replaceArticle(restored)
        selectArticle(restored)
        await refreshArticleReliability()
        void refreshLogs()
        setAdminNotice('已撤销文章删除。')
      }
    })
  } catch {
    setAdminNotice('文章删除失败。')
  } finally {
    saving.value = false
  }
}

const saveArticleAutosave = async () => {
  if (!import.meta.client) {
    return
  }

  const { body } = buildDraftPayload()

  if (!String(body.title || '').trim()) {
    autosaveStatus.value = '标题为空，未自动保存'
    return
  }

  autosaveStatus.value = '自动保存中...'

  try {
    const autosave = await adminFetch<ManagedArticleAutosave>('/api/admin/articles/autosave', {
      method: 'POST',
      body
    })
    const index = articleAutosaves.value.findIndex((item) => item.slug === autosave.slug)

    if (index >= 0) {
      articleAutosaves.value[index] = autosave
    } else {
      articleAutosaves.value.unshift(autosave)
    }

    autosaveStatus.value = `已自动保存 ${new Date(autosave.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  } catch {
    autosaveStatus.value = '自动保存失败，请检查 PostgreSQL'
  }
}

const selectArticleAutosave = (autosave: ManagedArticleAutosave) => {
  selectedArticleId.value = managedArticles.value.find((article) => article.slug === autosave.slug)?.id || 'new'
  draftTitle.value = autosave.title
  draftDescription.value = autosave.description
  draftCategory.value = autosave.category
  draftTags.value = autosave.tags.join(', ')
  draftDate.value = autosave.date
  draftScheduledAt.value = toDatetimeLocalValue(autosave.scheduledAt)
  draftWorkflowStatus.value = getArticleWorkflowStatus(autosave)
  draftLocked.value = autosave.locked
  draftPinned.value = autosave.pinned
  draftMarkdown.value = autosave.markdown
  autosaveStatus.value = '已载入自动保存，保存后写入 Markdown'
}

const deleteArticleAutosaveEntry = async (autosave: ManagedArticleAutosave) => {
  const confirmed = await requestAdminConfirmation({
    title: '删除自动保存',
    message: `确定删除 ${autosave.title} 的自动保存记录？\n删除后 10 秒内可撤销。`,
    confirmLabel: '删除记录'
  })

  if (!confirmed) {
    return
  }

  saving.value = true

  try {
    await adminFetch(`/api/admin/articles/autosaves/${encodeURIComponent(autosave.slug)}`, {
      method: 'DELETE'
    })
    articleAutosaves.value = articleAutosaves.value.filter((item) => item.slug !== autosave.slug)
    void refreshLogs()
    setAdminNotice('自动保存记录已删除。')
    pushUndoAction({
      title: '撤销删除自动保存',
      message: `恢复 ${autosave.title} 的自动保存记录`,
      run: async () => {
        const restored = await adminFetch<ManagedArticleAutosave>('/api/admin/articles/autosave', {
          method: 'POST',
          body: autosave
        })
        const index = articleAutosaves.value.findIndex((item) => item.slug === restored.slug)

        if (index >= 0) {
          articleAutosaves.value[index] = restored
        } else {
          articleAutosaves.value.unshift(restored)
        }

        void refreshLogs()
        setAdminNotice('已撤销自动保存删除。')
      }
    })
  } catch {
    setAdminNotice('自动保存记录删除失败。')
  } finally {
    saving.value = false
  }
}

const restoreArticleVersion = async (version: ManagedArticleVersion) => {
  const confirmed = await requestAdminConfirmation({
    title: '恢复文章版本',
    message: `确定将《${version.title}》恢复到 ${new Date(version.createdAt).toLocaleString('zh-CN')} 的版本？\n当前版本会先进入版本记录。`,
    confirmLabel: '恢复版本',
    tone: 'warning'
  })

  if (!confirmed) {
    return
  }

  saving.value = true

  try {
    const article = await adminFetch<ManagedArticle>(`/api/admin/articles/versions/${encodeURIComponent(version.versionId)}`, {
      method: 'POST'
    })

    replaceArticle(article)
    selectArticle(article)
    await refreshArticleReliability()
    void refreshLogs()
    setAdminNotice('文章版本已恢复并写回 content/blog。')
  } catch {
    setAdminNotice('文章版本恢复失败。')
  } finally {
    saving.value = false
  }
}

const saveProject = async () => {
  saving.value = true

  try {
    const current = managedProjects.value.find((project) => project.id === selectedProjectId.value)
    const project = await adminFetch<ManagedProject>('/api/admin/projects', {
      method: 'POST',
      body: {
        id: current?.id,
        name: projectName.value,
        description: projectDescription.value,
        status: projectStatus.value,
        category: projectCategory.value,
        sourceUrl: projectSourceUrl.value,
        launchUrl: projectLaunchUrl.value,
        tags: projectTagList.value,
        featured: projectFeatured.value,
        hidden: projectHidden.value,
        order: Number(projectOrder.value) || 0,
        coverUrl: projectCoverUrl.value
      }
    })

    replaceProject(project)
    selectProject(project)
    selectedProjectId.value = project.id
    await refreshProjects()
    void refreshLogs()
    setAdminNotice(current ? '项目已更新。' : '项目已写入 data/projects.json。')
  } catch (error) {
    setAdminNotice(getErrorStatusCode(error) === 409 ? '项目名称已存在。' : '项目保存失败。')
  } finally {
    saving.value = false
  }
}

const patchProject = async (project: ManagedProject, payload: Partial<ManagedProject>, notice: string) => {
  saving.value = true

  try {
    const updated = await adminFetch<ManagedProject>(`/api/admin/projects/${encodeURIComponent(project.id)}`, {
      method: 'PATCH',
      body: {
        ...project,
        ...payload
      }
    })

    replaceProject(updated)

    if (selectedProjectId.value === updated.id) {
      selectProject(updated)
    }

    await refreshProjects()
    void refreshLogs()
    setAdminNotice(notice)
  } catch {
    setAdminNotice('项目更新失败。')
  } finally {
    saving.value = false
  }
}

const toggleProjectFeatured = (project: ManagedProject) => (
  patchProject(project, { featured: !project.featured }, project.featured ? '项目已取消精选。' : '项目已设为精选。')
)

const toggleProjectHidden = (project: ManagedProject) => (
  patchProject(project, { hidden: !project.hidden }, project.hidden ? '项目已设为公开。' : '项目已隐藏。')
)

const inspectProject = async (project: ManagedProject) => {
  projectInspectingIds.value = [...new Set([...projectInspectingIds.value, project.id])]

  try {
    const updated = await adminFetch<ManagedProject>(`/api/admin/projects/${encodeURIComponent(project.id)}/inspect`, {
      method: 'POST'
    })

    replaceProject(updated)

    if (selectedProjectId.value === updated.id) {
      selectProject(updated)
    }

    await refreshProjects()
    void refreshLogs()
    setAdminNotice(`项目巡检完成：${updated.name} / ${updated.checkStatus}。`)
  } catch {
    setAdminNotice('项目巡检失败，请检查链接或服务端日志。')
  } finally {
    projectInspectingIds.value = projectInspectingIds.value.filter((id) => id !== project.id)
  }
}

const inspectProjects = async (projects: ManagedProject[]) => {
  const ids = projects.map((project) => project.id)

  if (ids.length === 0) {
    setAdminNotice('当前列表没有可巡检的项目。')
    return
  }

  projectInspecting.value = true
  projectInspectingIds.value = ids

  try {
    const result = await adminFetch<{
      projects: ManagedProject[]
      checkedCount: number
      warningCount: number
      errorCount: number
    }>('/api/admin/projects/inspect', {
      method: 'POST',
      body: {
        ids
      }
    })

    managedProjects.value = result.projects
    const selected = result.projects.find((project) => project.id === selectedProjectId.value)

    if (selected) {
      selectProject(selected)
    }

    await refreshProjects()
    void refreshLogs()
    setAdminNotice(`已巡检 ${result.checkedCount} 个项目，${result.warningCount} 个提醒，${result.errorCount} 个异常。`)
  } catch {
    setAdminNotice('批量项目巡检失败，请检查网络或服务端日志。')
  } finally {
    projectInspecting.value = false
    projectInspectingIds.value = []
  }
}

const moveProject = (project: ManagedProject, direction: 'up' | 'down') => {
  const visibleProjects = filteredManagedProjects.value
  const index = visibleProjects.findIndex((item) => item.id === project.id)
  const target = visibleProjects[index + (direction === 'up' ? -1 : 1)]

  if (!target) {
    return
  }

  const nextProjectOrder = target.order
  const nextTargetOrder = project.order

  saving.value = true

  Promise.all([
    adminFetch<ManagedProject>(`/api/admin/projects/${encodeURIComponent(project.id)}`, {
      method: 'PATCH',
      body: {
        ...project,
        order: nextProjectOrder
      }
    }),
    adminFetch<ManagedProject>(`/api/admin/projects/${encodeURIComponent(target.id)}`, {
      method: 'PATCH',
      body: {
        ...target,
        order: nextTargetOrder
      }
    })
  ])
    .then(([updatedProject, updatedTarget]) => {
      replaceProject(updatedProject)
      replaceProject(updatedTarget)

      if (selectedProjectId.value === updatedProject.id) {
        selectProject(updatedProject)
      } else if (selectedProjectId.value === updatedTarget.id) {
        selectProject(updatedTarget)
      }

      void refreshProjects()
      void refreshLogs()
      setAdminNotice('项目排序已更新。')
    })
    .catch(() => {
      setAdminNotice('项目排序更新失败。')
    })
    .finally(() => {
      saving.value = false
    })
}

const deleteProject = async (project: ManagedProject) => {
  const confirmed = await requestAdminConfirmation({
    title: '删除项目',
    message: `确定删除项目「${project.name}」？\n删除后 10 秒内可从当前页面撤销。`,
    confirmLabel: '删除项目'
  })

  if (!confirmed) {
    return
  }

  saving.value = true

  try {
    await adminFetch(`/api/admin/projects/${encodeURIComponent(project.id)}`, {
      method: 'DELETE'
    })
    managedProjects.value = managedProjects.value.filter((item) => item.id !== project.id)

    if (selectedProjectId.value === project.id) {
      const next = managedProjects.value[0]

      if (next) {
        selectProject(next)
      } else {
        createProject()
      }
    }

    await refreshProjects()
    void refreshLogs()
    setAdminNotice('项目已删除。')
    pushUndoAction({
      title: '撤销删除项目',
      message: `恢复「${project.name}」`,
      run: async () => {
        const restored = await adminFetch<ManagedProject>('/api/admin/projects', {
          method: 'POST',
          body: project
        })

        replaceProject(restored)
        selectProject(restored)
        await refreshProjects()
        void refreshLogs()
        setAdminNotice('已撤销项目删除。')
      }
    })
  } catch {
    setAdminNotice('项目删除失败。')
  } finally {
    saving.value = false
  }
}

const friendTagList = computed(() => (
  friendTags.value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
))

const saveFriend = async () => {
  saving.value = true

  try {
    const current = managedFriends.value.find((friend) => friend.id === selectedFriendId.value)
    const friend = await adminFetch<ManagedFriend>('/api/admin/friends', {
      method: 'POST',
      body: {
        id: current?.id,
        name: friendName.value,
        url: friendUrl.value,
        icon: friendIcon.value,
        intro: friendIntro.value,
        description: friendDescription.value,
        category: friendCategory.value,
        status: friendStatus.value,
        tags: friendTagList.value,
        contact: friendContact.value,
        backlinkUrl: friendBacklinkUrl.value,
        reviewNote: friendReviewNote.value,
        featured: friendFeatured.value,
        order: Number(friendOrder.value) || 0
      }
    })

    replaceFriend(friend)
    selectFriend(friend)
    await refreshFriends()
    void refreshLogs()
    setAdminNotice(current ? '友链已更新。' : '友链申请已写入 data/friends.json。')
  } catch {
    setAdminNotice('友链保存失败。')
  } finally {
    saving.value = false
  }
}

const saveAbout = async () => {
  saving.value = true

  try {
    const about = await adminFetch<ManagedAboutPage>('/api/admin/about', {
      method: 'POST',
      body: {
        title: aboutTitle.value,
        description: aboutDescription.value,
        markdown: aboutMarkdown.value
      }
    })

    aboutTitle.value = about.title
    aboutDescription.value = about.description
    aboutMarkdown.value = about.markdown
    setAdminNotice('关于页已写入 content/about.md。')
  } catch {
    setAdminNotice('关于页保存失败。')
  } finally {
    saving.value = false
  }
}

const refreshComments = async () => {
  commentsLoading.value = true
  commentsError.value = ''

  try {
    managedComments.value = await adminFetch<ManagedComment[]>('/api/admin/comments')
  } catch {
    commentsError.value = '评论读取失败，请确认 Waline PostgreSQL 服务已启动。'
  } finally {
    commentsLoading.value = false
  }
}

const saveCommentModerationRules = async () => {
  commentRulesSaving.value = true
  commentsError.value = ''

  try {
    const rules = await adminFetch<ManagedCommentModerationRules>('/api/admin/comments/rules', {
      method: 'POST',
      body: commentModerationRules.value
    })

    commentModerationRules.value = cloneCommentModerationRules(rules)
    void refreshComments()
    void refreshLogs()
    setAdminNotice('评论治理规则已保存。')
  } catch {
    commentsError.value = '评论治理规则保存失败。'
  } finally {
    commentRulesSaving.value = false
  }
}

const replaceComment = (comment: ManagedComment) => {
  const index = managedComments.value.findIndex((item) => item.id === comment.id)

  if (index >= 0) {
    managedComments.value[index] = comment
  }
}

const replaceComments = (comments: ManagedComment[]) => {
  for (const comment of comments) {
    replaceComment(comment)
  }
}

const setCommentStatus = async (comment: ManagedComment, status: ManagedCommentStatus) => {
  saving.value = true
  commentsError.value = ''

  try {
    const updated = await adminFetch<ManagedComment>(`/api/admin/comments/${encodeURIComponent(comment.id)}`, {
      method: 'PATCH',
      body: { status }
    })

    replaceComment(updated)
    selectedCommentIds.value = selectedCommentIds.value.filter((id) => id !== comment.id)
    void refreshLogs()
    setAdminNotice(`评论状态已更新为：${status}。`)
  } catch {
    commentsError.value = '评论状态更新失败。'
  } finally {
    saving.value = false
  }
}

const bulkSetCommentStatus = async (ids: string[], status: ManagedCommentStatus) => {
  if (ids.length === 0) {
    return
  }

  saving.value = true
  commentsError.value = ''

  try {
    const result = await adminFetch<{ comments: ManagedComment[] }>('/api/admin/comments/bulk', {
      method: 'POST',
      body: {
        action: 'status',
        ids,
        status
      }
    })

    replaceComments(result.comments)
    selectedCommentIds.value = selectedCommentIds.value.filter((id) => !ids.includes(id))
    void refreshLogs()
    setAdminNotice(`已批量更新 ${result.comments.length} 条评论。`)
  } catch {
    commentsError.value = '评论批量更新失败。'
  } finally {
    saving.value = false
  }
}

const moderateComments = async (ids: string[]) => {
  if (ids.length === 0) {
    return
  }

  saving.value = true
  commentsError.value = ''

  try {
    const result = await adminFetch<{
      checkedCount: number
      updatedCount: number
      comments: ManagedComment[]
    }>('/api/admin/comments/moderate', {
      method: 'POST',
      body: {
        ids
      }
    })

    replaceComments(result.comments)
    selectedCommentIds.value = selectedCommentIds.value.filter((id) => !ids.includes(id))
    void refreshLogs()
    setAdminNotice(`已按规则检查 ${result.checkedCount} 条评论，更新 ${result.updatedCount} 条。`)
  } catch {
    commentsError.value = '评论规则治理失败。'
  } finally {
    saving.value = false
  }
}

const deleteComment = async (comment: ManagedComment) => {
  const confirmed = await requestAdminConfirmation({
    title: '删除评论',
    message: `确定删除 ${comment.author || '匿名用户'} 的这条评论？\nWaline 评论删除后不能直接撤销，只能通过数据库或备份恢复。`,
    confirmLabel: '删除评论'
  })

  if (!confirmed) {
    return
  }

  saving.value = true
  commentsError.value = ''

  try {
    await adminFetch(`/api/admin/comments/${encodeURIComponent(comment.id)}`, {
      method: 'DELETE'
    })

    managedComments.value = managedComments.value.filter((item) => item.id !== comment.id)
    selectedCommentIds.value = selectedCommentIds.value.filter((id) => id !== comment.id)
    void refreshLogs()
    setAdminNotice('评论已删除。')
  } catch {
    commentsError.value = '评论删除失败。'
  } finally {
    saving.value = false
  }
}

const bulkDeleteComments = async (ids: string[]) => {
  if (ids.length === 0) {
    return
  }

  const confirmed = await requestAdminConfirmation({
    title: '批量删除评论',
    message: `确定删除选中的 ${ids.length} 条评论？\n该操作不能直接撤销。`,
    confirmLabel: '批量删除'
  })

  if (!confirmed) {
    return
  }

  saving.value = true
  commentsError.value = ''

  try {
    const result = await adminFetch<{ deletedCount: number }>('/api/admin/comments/bulk', {
      method: 'POST',
      body: {
        action: 'delete',
        ids
      }
    })

    managedComments.value = managedComments.value.filter((comment) => !ids.includes(comment.id))
    selectedCommentIds.value = selectedCommentIds.value.filter((id) => !ids.includes(id))
    void refreshLogs()
    setAdminNotice(`已批量删除 ${result.deletedCount} 条评论。`)
  } catch {
    commentsError.value = '评论批量删除失败。'
  } finally {
    saving.value = false
  }
}

const setFriendStatus = async (friend: ManagedFriend, status: ManagedFriend['status']) => {
  saving.value = true

  try {
    const updated = await adminFetch<ManagedFriend>(`/api/admin/friends/${encodeURIComponent(friend.id)}`, {
      method: 'PATCH',
      body: {
        status
      }
    })
    replaceFriend(updated)

    if (selectedFriendId.value === updated.id) {
      selectFriend(updated)
    }

    await refreshFriends()
    void refreshLogs()
    setAdminNotice(`友链状态已更新为：${status}。`)
  } catch {
    setAdminNotice('友链审核状态更新失败。')
  } finally {
    saving.value = false
  }
}

const toggleFriendFeatured = async (friend: ManagedFriend) => {
  saving.value = true

  try {
    const updated = await adminFetch<ManagedFriend>(`/api/admin/friends/${encodeURIComponent(friend.id)}`, {
      method: 'PATCH',
      body: {
        featured: !friend.featured
      }
    })

    replaceFriend(updated)

    if (selectedFriendId.value === updated.id) {
      selectFriend(updated)
    }

    await refreshFriends()
    void refreshLogs()
    setAdminNotice(updated.featured ? '友链已置顶展示。' : '友链已取消置顶。')
  } catch {
    setAdminNotice('友链置顶状态更新失败。')
  } finally {
    saving.value = false
  }
}

const inspectFriend = async (friend: ManagedFriend) => {
  friendInspectingIds.value = [...new Set([...friendInspectingIds.value, friend.id])]

  try {
    const updated = await adminFetch<ManagedFriend>(`/api/admin/friends/${encodeURIComponent(friend.id)}/inspect`, {
      method: 'POST'
    })

    replaceFriend(updated)

    if (selectedFriendId.value === updated.id) {
      selectFriend(updated)
    }

    await refreshFriends()
    void refreshLogs()
    setAdminNotice(`友链巡检完成：${updated.name} / ${updated.checkStatus}。`)
  } catch {
    setAdminNotice('友链巡检失败，请检查链接或服务端日志。')
  } finally {
    friendInspectingIds.value = friendInspectingIds.value.filter((id) => id !== friend.id)
  }
}

const inspectFriends = async (friends: ManagedFriend[]) => {
  const ids = friends.map((friend) => friend.id)

  if (ids.length === 0) {
    setAdminNotice('当前列表没有可巡检的友链。')
    return
  }

  friendInspecting.value = true
  friendInspectingIds.value = ids

  try {
    const result = await adminFetch<{
      friends: ManagedFriend[]
      checkedCount: number
      warningCount: number
      errorCount: number
    }>('/api/admin/friends/inspect', {
      method: 'POST',
      body: {
        ids
      }
    })

    managedFriends.value = result.friends
    const selected = result.friends.find((friend) => friend.id === selectedFriendId.value)

    if (selected) {
      selectFriend(selected)
    }

    await refreshFriends()
    void refreshLogs()
    setAdminNotice(`已巡检 ${result.checkedCount} 个友链，${result.warningCount} 个提醒，${result.errorCount} 个异常。`)
  } catch {
    setAdminNotice('批量巡检失败，请检查网络或服务端日志。')
  } finally {
    friendInspecting.value = false
    friendInspectingIds.value = []
  }
}

const deleteFriend = async (friend: ManagedFriend) => {
  const confirmed = await requestAdminConfirmation({
    title: '删除友链',
    message: `确定删除友链「${friend.name}」？\n删除后 10 秒内可从当前页面撤销。`,
    confirmLabel: '删除友链'
  })

  if (!confirmed) {
    return
  }

  saving.value = true

  try {
    await adminFetch(`/api/admin/friends/${encodeURIComponent(friend.id)}`, {
      method: 'DELETE'
    })
    managedFriends.value = managedFriends.value.filter((item) => item.id !== friend.id)

    if (selectedFriendId.value === friend.id) {
      const next = managedFriends.value[0]

      if (next) {
        selectFriend(next)
      } else {
        createFriend()
      }
    }

    await refreshFriends()
    void refreshLogs()
    setAdminNotice('友链已删除。')
    pushUndoAction({
      title: '撤销删除友链',
      message: `恢复「${friend.name}」`,
      run: async () => {
        const restored = await adminFetch<ManagedFriend>('/api/admin/friends', {
          method: 'POST',
          body: friend
        })

        replaceFriend(restored)
        selectFriend(restored)
        await refreshFriends()
        void refreshLogs()
        setAdminNotice('已撤销友链删除。')
      }
    })
  } catch {
    setAdminNotice('友链删除失败。')
  } finally {
    saving.value = false
  }
}

const updateMarkdownPreview = async () => {
  previewPending.value = true
  previewError.value = ''

  try {
    previewValue.value = await adminFetch('/api/admin/markdown-preview', {
      method: 'POST',
      body: {
        markdown: draftMarkdown.value,
        title: draftTitle.value,
        description: draftDescription.value
      }
    })
  } catch {
    previewError.value = 'Markdown 预览生成失败。'
  } finally {
    previewPending.value = false
  }
}

const updateAboutMarkdownPreview = async () => {
  aboutPreviewPending.value = true
  aboutPreviewError.value = ''

  try {
    aboutPreviewValue.value = await adminFetch('/api/admin/markdown-preview', {
      method: 'POST',
      body: {
        markdown: aboutMarkdown.value,
        title: aboutTitle.value,
        description: aboutDescription.value
      }
    })
  } catch {
    aboutPreviewError.value = '关于页预览生成失败。'
  } finally {
    aboutPreviewPending.value = false
  }
}

watch(
  [draftMarkdown, draftTitle, draftDescription],
  () => {
    if (!import.meta.client) {
      return
    }

    if (previewTimer) {
      window.clearTimeout(previewTimer)
    }

    previewTimer = window.setTimeout(() => {
      void updateMarkdownPreview()
    }, 220)
  },
  { immediate: true }
)

watch(
  [aboutMarkdown, aboutTitle, aboutDescription],
  () => {
    if (!import.meta.client) {
      return
    }

    if (aboutPreviewTimer) {
      window.clearTimeout(aboutPreviewTimer)
    }

    aboutPreviewTimer = window.setTimeout(() => {
      void updateAboutMarkdownPreview()
    }, 220)
  },
  { immediate: true }
)

watch(
  [
    selectedArticleId,
    draftTitle,
    draftDate,
    draftCategory,
    draftTags,
    draftDescription,
    draftWorkflowStatus,
    draftScheduledAt,
    draftLocked,
    draftPinned,
    draftMarkdown
  ],
  () => {
    if (!import.meta.client) {
      return
    }

    if (!autosaveReady) {
      autosaveReady = true
      return
    }

    autosaveStatus.value = '有未自动保存的修改'

    if (autosaveTimer) {
      window.clearTimeout(autosaveTimer)
    }

    autosaveTimer = window.setTimeout(() => {
      void saveArticleAutosave()
    }, 2500)
  }
)

watch(draftWorkflowStatus, (status) => {
  if (status === 'scheduled' && !draftScheduledAt.value) {
    draftScheduledAt.value = nextScheduledDatetimeLocalValue()
  }
})

watch(adminScheduleNow, () => {
  if (draftWorkflowStatus.value !== 'scheduled' || !draftScheduledAt.value) {
    return
  }

  const timestamp = Date.parse(fromDatetimeLocalValue(draftScheduledAt.value))

  if (!Number.isNaN(timestamp) && timestamp <= adminScheduleNow.value) {
    draftWorkflowStatus.value = 'published'
    draftScheduledAt.value = ''
  }
})

onBeforeUnmount(() => {
  if (previewTimer) {
    window.clearTimeout(previewTimer)
  }

  if (aboutPreviewTimer) {
    window.clearTimeout(aboutPreviewTimer)
  }

  if (autosaveTimer) {
    window.clearTimeout(autosaveTimer)
  }

  if (adminAuthCheckTimer) {
    window.clearInterval(adminAuthCheckTimer)
  }

  if (adminScheduleCheckTimer) {
    window.clearInterval(adminScheduleCheckTimer)
  }

  for (const action of undoActions.value) {
    if (action.timer) {
      clearTimeout(action.timer)
    }
  }

  if (import.meta.client) {
    window.removeEventListener('focus', checkAdminSession)
    document.removeEventListener('visibilitychange', checkAdminSessionWhenVisible)
  }
})

const initializeAdminPage = async () => {
  await checkAdminSession()

  if (adminAuthRedirecting.value) {
    return
  }

  await refreshAdminContent().catch(() => {
    setAdminNotice('后台数据刷新失败，请检查登录态和服务端日志。')
  })
  void refreshMedia()
  void refreshComments()
  void refreshArticleReliability()
  void refreshVisits()
  void refreshLogs()
}

onMounted(() => {
  void initializeAdminPage()
  adminAuthCheckTimer = window.setInterval(() => {
    void checkAdminSession()
  }, 60_000)
  adminScheduleCheckTimer = window.setInterval(() => {
    adminScheduleNow.value = Date.now()
  }, 30_000)
  window.addEventListener('focus', checkAdminSession)
  document.addEventListener('visibilitychange', checkAdminSessionWhenVisible)
})

useSiteSeo({
  title: '后台',
  description: 'ChankoBlog 后台管理。',
  path: '/admin',
  noindex: true
})
</script>

<template>
  <AdminFrame
    :active-panel="activePanel"
    :panels="panels"
    :notice="adminNotice"
    :session-status="adminSessionStatus"
    @select-panel="selectPanel"
    @create-article="createArticle"
    @logout="logoutAdmin"
  >
    <AdminOverviewPanel
      v-show="activePanel === 'overview'"
      :stats="stats"
      :latest-articles="latestArticles"
      :latest-projects="latestProjects"
      :latest-comments="latestComments"
      :comments-loading="commentsLoading"
      :comments-error="commentsError"
      :visit-stats="visitStats"
      :visit-stats-loading="visitStatsLoading"
      :visit-stats-error="visitStatsError"
      @refresh-visits="refreshVisits"
    />

    <section
      v-if="undoActions.length > 0"
      class="grid gap-(--space-1) border border-line bg-code-surface p-(--space-2)"
      aria-label="可撤销操作"
    >
      <article
        v-for="action in undoActions"
        :key="action.id"
        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-(--space-2) border-b border-line pb-(--space-1) last:border-b-0 last:pb-0 max-[640px]:grid-cols-1"
      >
        <div class="grid min-w-0 gap-1">
          <p class="m-0 text-sm font-bold text-ink">
            {{ action.title }}
          </p>
          <p class="m-0 text-[13px] leading-[1.6] text-muted">
            {{ action.message }}。10 秒后撤销入口会自动消失。
          </p>
        </div>
        <div class="flex flex-wrap gap-(--space-1)">
          <AppButton size="sm" variant="solid" :loading="action.loading" @click="runUndoAction(action)">
            <Icon name="lucide:undo-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
            撤销
          </AppButton>
          <AppButton size="sm" variant="text" @click="dismissUndoAction(action.id)">
            忽略
          </AppButton>
        </div>
      </article>
    </section>

    <AdminArticlesPanel
      v-show="activePanel === 'articles'"
      v-model:article-search-query="articleSearchQuery"
      v-model:article-category-filter="articleCategoryFilter"
      v-model:article-tag-filter="articleTagFilter"
      v-model:article-state-filter="articleStateFilter"
      v-model:draft-title="draftTitle"
      v-model:draft-date="draftDate"
      v-model:draft-scheduled-at="draftScheduledAt"
      v-model:draft-category="draftCategory"
      v-model:draft-tags="draftTags"
      v-model:draft-description="draftDescription"
      v-model:draft-workflow-status="draftWorkflowStatus"
      v-model:draft-locked="draftLocked"
      v-model:draft-pinned="draftPinned"
      v-model:draft-markdown="draftMarkdown"
      :managed-articles="managedArticles"
      :filtered-managed-articles="filteredManagedArticles"
      :article-categories="articleCategories"
      :article-tags="articleTags"
      :article-workflow-options="articleWorkflowOptions"
      :article-workflow-counts="articleWorkflowCounts"
      :selected-article-id="selectedArticleId"
      :saving="saving"
      :preview-value="previewValue"
      :preview-pending="previewPending"
      :preview-error="previewError"
      :preview-article="previewArticle"
      :publish-checks="publishChecks"
      :article-versions="articleVersions"
      :article-autosaves="articleAutosaves"
      :autosave-status="autosaveStatus"
      @create-article="createArticle"
      @select-article="selectArticle"
      @toggle-article-lock="toggleArticleLock"
      @toggle-article-pinned="toggleArticlePinned"
      @set-article-workflow-status="setArticleWorkflowStatus"
      @delete-article="deleteArticle"
      @restore-article-version="restoreArticleVersion"
      @select-article-autosave="selectArticleAutosave"
      @delete-article-autosave="deleteArticleAutosaveEntry"
      @save-draft="saveDraft"
      @export-backup="exportBackup('articles')"
    />

    <AdminMediaPanel
      v-show="activePanel === 'media'"
      :media-assets="mediaAssets"
      :saving="saving"
      :uploading="mediaUploading"
      :error="mediaError"
      @upload-media="uploadMedia"
      @delete-media="deleteMedia"
      @delete-selected-media="deleteSelectedMedia"
      @refresh-media="refreshMedia"
      @export-backup="exportBackup('media')"
    />

    <AdminProjectsPanel
      v-show="activePanel === 'projects'"
      v-model:project-search-query="projectSearchQuery"
      v-model:project-status-filter="projectStatusFilter"
      v-model:project-category-filter="projectCategoryFilter"
      v-model:project-visibility-filter="projectVisibilityFilter"
      v-model:project-featured-filter="projectFeaturedFilter"
      v-model:project-name="projectName"
      v-model:project-description="projectDescription"
      v-model:project-status="projectStatus"
      v-model:project-category="projectCategory"
      v-model:project-source-url="projectSourceUrl"
      v-model:project-launch-url="projectLaunchUrl"
      v-model:project-tags="projectTags"
      v-model:project-featured="projectFeatured"
      v-model:project-hidden="projectHidden"
      v-model:project-order="projectOrder"
      v-model:project-cover-url="projectCoverUrl"
      :projects="filteredManagedProjects"
      :all-projects="managedProjects"
      :project-stats="projectStats"
      :project-statuses="projectStatuses"
      :project-categories="projectCategories"
      :selected-project-id="selectedProjectId"
      :saving="saving"
      :inspecting="projectInspecting"
      :inspecting-project-ids="projectInspectingIds"
      @create-project="createProject"
      @select-project="selectProject"
      @save-project="saveProject"
      @toggle-project-featured="toggleProjectFeatured"
      @toggle-project-hidden="toggleProjectHidden"
      @inspect-project="inspectProject"
      @inspect-projects="inspectProjects"
      @move-project="moveProject"
      @delete-project="deleteProject"
      @export-backup="exportBackup('projects')"
    />

    <AdminFriendsPanel
      v-show="activePanel === 'friends'"
      v-model:friend-search-query="friendSearchQuery"
      v-model:friend-status-filter="friendStatusFilter"
      v-model:friend-name="friendName"
      v-model:friend-url="friendUrl"
      v-model:friend-icon="friendIcon"
      v-model:friend-intro="friendIntro"
      v-model:friend-description="friendDescription"
      v-model:friend-category="friendCategory"
      v-model:friend-tags="friendTags"
      v-model:friend-contact="friendContact"
      v-model:friend-backlink-url="friendBacklinkUrl"
      v-model:friend-review-note="friendReviewNote"
      v-model:friend-featured="friendFeatured"
      v-model:friend-order="friendOrder"
      v-model:friend-status="friendStatus"
      :friends="filteredManagedFriends"
      :stats="friendStats"
      :selected-friend-id="selectedFriendId"
      :saving="saving"
      :inspecting="friendInspecting"
      :inspecting-friend-ids="friendInspectingIds"
      @create-friend="createFriend"
      @select-friend="selectFriend"
      @save-friend="saveFriend"
      @set-friend-status="setFriendStatus"
      @toggle-friend-featured="toggleFriendFeatured"
      @inspect-friend="inspectFriend"
      @inspect-friends="inspectFriends"
      @delete-friend="deleteFriend"
      @export-backup="exportBackup('friends')"
    />

    <AdminAboutPanel
      v-show="activePanel === 'about'"
      v-model:about-title="aboutTitle"
      v-model:about-description="aboutDescription"
      v-model:about-markdown="aboutMarkdown"
      :saving="saving"
      :preview-value="aboutPreviewValue"
      :preview-pending="aboutPreviewPending"
      :preview-error="aboutPreviewError"
      @save-about="saveAbout"
      @export-backup="exportBackup('about')"
    />

    <AdminCommentsPanel
      v-show="activePanel === 'comments'"
      v-model:comment-search-query="commentSearchQuery"
      v-model:comment-status-filter="commentStatusFilter"
      v-model:selected-comment-ids="selectedCommentIds"
      :comments="filteredManagedComments"
      :stats="commentStats"
      :moderation-hit-stats="commentModerationHitStats"
      v-model:moderation-rules="commentModerationRules"
      :saving="saving"
      :rules-saving="commentRulesSaving"
      :loading="commentsLoading"
      :error="commentsError"
      @refresh-comments="refreshComments"
      @save-moderation-rules="saveCommentModerationRules"
      @set-comment-status="setCommentStatus"
      @bulk-set-comment-status="bulkSetCommentStatus"
      @bulk-delete-comments="bulkDeleteComments"
      @moderate-comments="moderateComments"
      @delete-comment="deleteComment"
      @export-backup="exportBackup('comments')"
    />

    <AdminNotificationsPanel
      v-show="activePanel === 'notifications'"
      v-model:notifications="managedNotifications"
      v-model:notification-settings="notificationSettings"
      :admin-notifications="adminNotifications"
      :notification-settings="notificationSettings"
      :saving="saving"
      @save-notifications="saveNotifications"
      @save-notification-settings="saveNotificationSettings"
      @refresh-admin-notifications="refreshAdminNotifications"
      @select-panel="selectPanel"
      @export-backup="exportBackup('notifications')"
    />

    <AdminSeoPanel
      v-show="activePanel === 'seo'"
      :articles="managedArticles"
      :projects="managedProjects"
      :friends="managedFriends"
      :about="{
        title: aboutTitle,
        description: aboutDescription,
        markdown: aboutMarkdown
      }"
    />

    <AdminBackupPanel
      v-show="activePanel === 'backup'"
      :loading="backupLoading"
      :error="backupError"
      :result="backupRestoreResult"
      :preview-backup="previewBackupRestore"
      @export-backup="exportBackup"
      @restore-backup="restoreBackup"
    />

    <AdminLogsPanel
      v-show="activePanel === 'logs'"
      :logs="adminLogs"
      :loading="logsLoading"
      :error="logsError"
      @refresh-logs="refreshLogs"
    />

    <AdminConfirmDialog
      :open="Boolean(pendingConfirmation)"
      :title="pendingConfirmation?.title || ''"
      :message="pendingConfirmation?.message || ''"
      :confirm-label="pendingConfirmation?.confirmLabel || '确认操作'"
      :tone="pendingConfirmation?.tone || 'danger'"
      @confirm="resolveAdminConfirmation(true)"
      @cancel="resolveAdminConfirmation(false)"
    />
  </AdminFrame>
</template>
