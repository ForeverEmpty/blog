<script setup lang="ts">
import type {
  AdminPanel,
  AdminPanelItem,
  AdminStat,
  ManagedAdminLog,
  ManagedAboutPage,
  ManagedArticle,
  ManagedArticleAutosave,
  ManagedArticleVersion,
  ManagedComment,
  ManagedCommentStatus,
  ManagedFriend,
  ManagedMediaAsset,
  ManagedProject
} from '~/types/admin'

const appConfig = useAppConfig()
const route = useRoute()
const router = useRouter()
const { searchContentItems } = useArticleSearch()
const adminAuthRedirecting = ref(false)
const adminCsrfToken = ref('')
let adminAuthCheckTimer: ReturnType<typeof setInterval> | undefined

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

  try {
    const session = await $fetch<{
      authenticated: boolean
      configured: boolean
      username: string
      csrfToken: string
    }>('/api/admin/auth/session')

    if (!session.authenticated) {
      await redirectToAdminLogin()
      return
    }

    adminCsrfToken.value = session.csrfToken || ''
  } catch {
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
const panels: AdminPanelItem[] = [
  { key: 'overview', label: '总览', icon: 'lucide:layout-dashboard' },
  { key: 'articles', label: '文章', icon: 'lucide:file-pen-line' },
  { key: 'media', label: '媒体', icon: 'lucide:images' },
  { key: 'projects', label: '项目', icon: 'lucide:folder-kanban' },
  { key: 'friends', label: '友链', icon: 'lucide:link' },
  { key: 'comments', label: '评论', icon: 'lucide:message-square-text' },
  { key: 'about', label: '关于', icon: 'lucide:user-round-pen' },
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
const logsLoading = ref(false)
const logsError = ref('')
const mediaUploading = ref(false)
const mediaError = ref('')
const autosaveStatus = ref('自动保存待命')
let previewTimer: ReturnType<typeof setTimeout> | undefined
let aboutPreviewTimer: ReturnType<typeof setTimeout> | undefined
let autosaveTimer: ReturnType<typeof setTimeout> | undefined
let autosaveReady = false

const managedArticles = ref<ManagedArticle[]>(sourceArticles.value)
const managedProjects = ref<ManagedProject[]>(sourceProjects.value)
const managedFriends = ref<ManagedFriend[]>(sourceFriends.value)
const managedComments = ref<ManagedComment[]>([])
const mediaAssets = ref<ManagedMediaAsset[]>(sourceMediaAssets.value)
const articleVersions = ref<ManagedArticleVersion[]>(sourceArticleVersions.value)
const articleAutosaves = ref<ManagedArticleAutosave[]>(sourceArticleAutosaves.value)
const adminLogs = ref<ManagedAdminLog[]>(sourceAdminLogs.value)
const aboutTitle = ref(sourceAbout.value.title)
const aboutDescription = ref(sourceAbout.value.description)
const aboutMarkdown = ref(sourceAbout.value.markdown)

const selectedArticleId = ref(managedArticles.value[0]?.id || 'new')
const draftTitle = ref(managedArticles.value[0]?.title || '新的文章标题')
const draftDescription = ref(managedArticles.value[0]?.description || '用于文章列表和详情页的摘要。')
const draftCategory = ref(managedArticles.value[0]?.category || '未分类')
const draftTags = ref((managedArticles.value[0]?.tags || ['Draft']).join(', '))
const draftDate = ref(managedArticles.value[0]?.date || new Date().toISOString().slice(0, 10))
const draftPublished = ref(managedArticles.value[0]?.published ?? false)
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

const articleCount = computed(() => managedArticles.value.length)
const projectCount = computed(() => managedProjects.value.length)
const commentCount = computed(() => managedComments.value.length)
const totalViews = computed(() => managedArticles.value.reduce((total, article) => total + article.views, 0))
const lockedCount = computed(() => managedArticles.value.filter((article) => article.locked).length)
const pendingFriendCount = computed(() => managedFriends.value.filter((friend) => friend.status === '待审核').length)
const friendStats = computed(() => ({
  total: managedFriends.value.length,
  pending: managedFriends.value.filter((friend) => friend.status === '待审核').length,
  approved: managedFriends.value.filter((friend) => friend.status === '已通过').length,
  rejected: managedFriends.value.filter((friend) => friend.status === '已拒绝').length
}))
const pendingCommentCount = computed(() => managedComments.value.filter((comment) => comment.status === 'waiting').length)
const projectStats = computed(() => ({
  total: managedProjects.value.length,
  visible: managedProjects.value.filter((project) => !project.hidden).length,
  hidden: managedProjects.value.filter((project) => project.hidden).length,
  featured: managedProjects.value.filter((project) => project.featured).length
}))
const commentStats = computed(() => ({
  total: managedComments.value.length,
  approved: managedComments.value.filter((comment) => comment.status === 'approved').length,
  waiting: managedComments.value.filter((comment) => comment.status === 'waiting').length,
  spam: managedComments.value.filter((comment) => comment.status === 'spam').length
}))
const publishedCount = computed(() => managedArticles.value.filter((article) => article.published).length)
const draftCount = computed(() => managedArticles.value.filter((article) => !article.published).length)
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
      (articleStateFilter.value === 'published' && article.published) ||
      (articleStateFilter.value === 'draft' && !article.published) ||
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
      published: !project.hidden
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
  category: draftCategory.value,
  tags: draftTagList.value
}))
const stats = computed<AdminStat[]>(() => [
  {
    label: '文章数量',
    value: String(articleCount.value).padStart(2, '0'),
    detail: `${publishedCount.value} 篇已发布 / ${draftCount.value} 篇草稿`
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
  draftPublished.value = article.published
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
  draftPublished.value = false
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
  const [articles, projects, friends, about] = await Promise.all([
    adminFetch<ManagedArticle[]>('/api/admin/articles'),
    adminFetch<ManagedProject[]>('/api/admin/projects'),
    adminFetch<ManagedFriend[]>('/api/admin/friends'),
    adminFetch<ManagedAboutPage>('/api/admin/about')
  ])

  managedArticles.value = articles
  managedProjects.value = projects
  managedFriends.value = friends
  aboutTitle.value = about.title
  aboutDescription.value = about.description
  aboutMarkdown.value = about.markdown

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

const refreshMedia = async () => {
  mediaError.value = ''

  try {
    mediaAssets.value = await adminFetch<ManagedMediaAsset[]>('/api/admin/media')
  } catch {
    mediaError.value = '媒体读取失败，请检查 public/media 权限或服务端日志。'
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

const buildDraftPayload = () => {
  const current = managedArticles.value.find((article) => article.id === selectedArticleId.value)

  return {
    current,
    body: {
      slug: current?.slug,
      title: draftTitle.value,
      description: draftDescription.value,
      date: draftDate.value,
      author: current?.author || 'Chanko',
      authorUrl: current?.authorUrl || '/about',
      category: draftCategory.value,
      published: draftPublished.value,
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
  saving.value = true

  try {
    const { current, body } = buildDraftPayload()
    const article = await adminFetch<ManagedArticle>('/api/admin/articles', {
      method: 'POST',
      body
    })

    replaceArticle(article)
    selectedArticleId.value = article.id
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

const deleteArticle = async (article: ManagedArticle) => {
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
  draftPublished.value = autosave.published
  draftLocked.value = autosave.locked
  draftPinned.value = autosave.pinned
  draftMarkdown.value = autosave.markdown
  autosaveStatus.value = '已载入自动保存，保存后写入 Markdown'
}

const deleteArticleAutosaveEntry = async (autosave: ManagedArticleAutosave) => {
  saving.value = true

  try {
    await adminFetch(`/api/admin/articles/autosaves/${encodeURIComponent(autosave.slug)}`, {
      method: 'DELETE'
    })
    articleAutosaves.value = articleAutosaves.value.filter((item) => item.slug !== autosave.slug)
    void refreshLogs()
    setAdminNotice('自动保存记录已删除。')
  } catch {
    setAdminNotice('自动保存记录删除失败。')
  } finally {
    saving.value = false
  }
}

const restoreArticleVersion = async (version: ManagedArticleVersion) => {
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
    setAdminNotice('项目已删除。')
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

const deleteComment = async (comment: ManagedComment) => {
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

const deleteFriend = async (friend: ManagedFriend) => {
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
    draftPublished,
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
  void refreshLogs()
}

onMounted(() => {
  void initializeAdminPage()
  adminAuthCheckTimer = window.setInterval(() => {
    void checkAdminSession()
  }, 60_000)
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
    />

    <AdminArticlesPanel
      v-show="activePanel === 'articles'"
      v-model:article-search-query="articleSearchQuery"
      v-model:article-category-filter="articleCategoryFilter"
      v-model:article-tag-filter="articleTagFilter"
      v-model:article-state-filter="articleStateFilter"
      v-model:draft-title="draftTitle"
      v-model:draft-date="draftDate"
      v-model:draft-category="draftCategory"
      v-model:draft-tags="draftTags"
      v-model:draft-description="draftDescription"
      v-model:draft-published="draftPublished"
      v-model:draft-locked="draftLocked"
      v-model:draft-pinned="draftPinned"
      v-model:draft-markdown="draftMarkdown"
      :managed-articles="managedArticles"
      :filtered-managed-articles="filteredManagedArticles"
      :article-categories="articleCategories"
      :article-tags="articleTags"
      :selected-article-id="selectedArticleId"
      :saving="saving"
      :preview-value="previewValue"
      :preview-pending="previewPending"
      :preview-error="previewError"
      :preview-article="previewArticle"
      :article-versions="articleVersions"
      :article-autosaves="articleAutosaves"
      :autosave-status="autosaveStatus"
      @create-article="createArticle"
      @select-article="selectArticle"
      @toggle-article-lock="toggleArticleLock"
      @toggle-article-pinned="toggleArticlePinned"
      @delete-article="deleteArticle"
      @restore-article-version="restoreArticleVersion"
      @select-article-autosave="selectArticleAutosave"
      @delete-article-autosave="deleteArticleAutosaveEntry"
      @save-draft="saveDraft"
    />

    <AdminMediaPanel
      v-show="activePanel === 'media'"
      :media-assets="mediaAssets"
      :saving="saving"
      :uploading="mediaUploading"
      :error="mediaError"
      @upload-media="uploadMedia"
      @delete-media="deleteMedia"
      @refresh-media="refreshMedia"
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
      @create-project="createProject"
      @select-project="selectProject"
      @save-project="saveProject"
      @toggle-project-featured="toggleProjectFeatured"
      @toggle-project-hidden="toggleProjectHidden"
      @move-project="moveProject"
      @delete-project="deleteProject"
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
      @create-friend="createFriend"
      @select-friend="selectFriend"
      @save-friend="saveFriend"
      @set-friend-status="setFriendStatus"
      @toggle-friend-featured="toggleFriendFeatured"
      @delete-friend="deleteFriend"
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
    />

    <AdminCommentsPanel
      v-show="activePanel === 'comments'"
      v-model:comment-search-query="commentSearchQuery"
      v-model:comment-status-filter="commentStatusFilter"
      v-model:selected-comment-ids="selectedCommentIds"
      :comments="filteredManagedComments"
      :stats="commentStats"
      :saving="saving"
      :loading="commentsLoading"
      :error="commentsError"
      @refresh-comments="refreshComments"
      @set-comment-status="setCommentStatus"
      @bulk-set-comment-status="bulkSetCommentStatus"
      @bulk-delete-comments="bulkDeleteComments"
      @delete-comment="deleteComment"
    />

    <AdminLogsPanel
      v-show="activePanel === 'logs'"
      :logs="adminLogs"
      :loading="logsLoading"
      :error="logsError"
      @refresh-logs="refreshLogs"
    />
  </AdminFrame>
</template>
