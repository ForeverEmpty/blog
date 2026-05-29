<script setup lang="ts">
import type {
  AdminPanel,
  AdminPanelItem,
  AdminStat,
  ManagedArticle,
  ManagedComment,
  ManagedCommentStatus,
  ManagedFriend,
  ManagedProject
} from '~/types/admin'

const appConfig = useAppConfig()
const { searchContentItems } = useArticleSearch()

const { data: sourceArticles } = await useAsyncData('admin-api-articles', () =>
  $fetch<ManagedArticle[]>('/api/admin/articles'),
  {
    default: () => []
  }
)
const { data: sourceProjects, refresh: refreshProjects } = await useAsyncData('admin-api-projects', () =>
  $fetch<ManagedProject[]>('/api/admin/projects'),
  {
    default: () => []
  }
)
const { data: sourceFriends, refresh: refreshFriends } = await useAsyncData('admin-api-friends', () =>
  $fetch<ManagedFriend[]>('/api/admin/friends'),
  {
    default: () => []
  }
)
const panels: AdminPanelItem[] = [
  { key: 'overview', label: '总览', icon: 'lucide:layout-dashboard' },
  { key: 'articles', label: '文章', icon: 'lucide:file-pen-line' },
  { key: 'projects', label: '项目', icon: 'lucide:folder-kanban' },
  { key: 'friends', label: '友链', icon: 'lucide:link' },
  { key: 'comments', label: '评论', icon: 'lucide:message-square-text' }
]

const activePanel = ref<AdminPanel>('overview')
const saving = ref(false)
const adminNotice = ref('')
const previewValue = shallowRef<unknown | null>(null)
const previewPending = ref(false)
const previewError = ref('')
const commentsLoading = ref(false)
const commentsError = ref('')
let previewTimer: ReturnType<typeof setTimeout> | undefined

const managedArticles = ref<ManagedArticle[]>(sourceArticles.value)
const managedProjects = ref<ManagedProject[]>(sourceProjects.value)
const managedFriends = ref<ManagedFriend[]>(sourceFriends.value)
const managedComments = ref<ManagedComment[]>([])

const selectedArticleId = ref(managedArticles.value[0]?.id || 'new')
const draftTitle = ref(managedArticles.value[0]?.title || '新的文章标题')
const draftDescription = ref(managedArticles.value[0]?.description || '用于文章列表和详情页的摘要。')
const draftCategory = ref(managedArticles.value[0]?.category || '未分类')
const draftTags = ref((managedArticles.value[0]?.tags || ['Draft']).join(', '))
const draftDate = ref(managedArticles.value[0]?.date || new Date().toISOString().slice(0, 10))
const draftPublished = ref(managedArticles.value[0]?.published ?? false)
const draftLocked = ref(managedArticles.value[0]?.locked ?? false)
const draftMarkdown = ref(managedArticles.value[0]?.markdown || '# 新的文章标题\n\n从这里开始写 Markdown。')

const newProjectName = ref('New Project')
const newProjectUrl = ref('https://example.com')
const newFriendName = ref('New Friend')
const newFriendUrl = ref('https://example.com')
const newFriendIcon = ref('lucide:globe-2')
const newFriendIntro = ref('长期更新的个人站点')
const newFriendDescription = ref('新的友链申请，默认进入待审核状态。')
const articleSearchQuery = ref('')
const articleCategoryFilter = ref('all')
const articleTagFilter = ref('all')
const articleStateFilter = ref('all')
const commentSearchQuery = ref('')
const commentStatusFilter = ref('all')

const articleCount = computed(() => managedArticles.value.length)
const totalViews = computed(() => managedArticles.value.reduce((total, article) => total + article.views, 0))
const lockedCount = computed(() => managedArticles.value.filter((article) => article.locked).length)
const pendingFriendCount = computed(() => managedFriends.value.filter((friend) => friend.status === '待审核').length)
const pendingCommentCount = computed(() => managedComments.value.filter((comment) => comment.status === 'waiting').length)
const publishedCount = computed(() => managedArticles.value.filter((article) => article.published).length)
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
      (articleStateFilter.value === 'unlocked' && !article.locked)
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
      comment.url.toLowerCase().includes(query)
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
    label: '观看量',
    value: totalViews.value.toLocaleString('zh-CN'),
    detail: '来自文章 frontmatter 的 views 字段'
  },
  {
    label: '文章数量',
    value: String(articleCount.value).padStart(2, '0'),
    detail: `${publishedCount.value} 篇已发布`
  },
  {
    label: '上锁文章',
    value: String(lockedCount.value).padStart(2, '0'),
    detail: '来自文章 frontmatter 的 locked 字段'
  },
  {
    label: '友链审核',
    value: String(pendingFriendCount.value).padStart(2, '0'),
    detail: '待处理申请'
  },
  {
    label: '评论待审',
    value: String(pendingCommentCount.value).padStart(2, '0'),
    detail: '来自 Waline PostgreSQL'
  }
])

const selectPanel = (panel: AdminPanel) => {
  activePanel.value = panel

  if (panel === 'comments' && managedComments.value.length === 0) {
    void refreshComments()
  }
}

const setAdminNotice = (message: string) => {
  adminNotice.value = message
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

const saveDraft = async () => {
  saving.value = true

  try {
    const current = managedArticles.value.find((article) => article.id === selectedArticleId.value)
    const article = await $fetch<ManagedArticle>('/api/admin/articles', {
      method: 'POST',
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
        views: current?.views || 0,
        tags: draftTagList.value,
        markdown: draftMarkdown.value
      }
    })

    replaceArticle(article)
    selectedArticleId.value = article.id
    setAdminNotice('文章已写入 content/blog。')
  } catch {
    setAdminNotice('文章保存失败，请检查服务端日志。')
  } finally {
    saving.value = false
  }
}

const toggleArticleLock = async (article: ManagedArticle) => {
  saving.value = true

  try {
    const updated = await $fetch<ManagedArticle>('/api/admin/articles', {
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

const deleteArticle = async (article: ManagedArticle) => {
  saving.value = true

  try {
    await $fetch(`/api/admin/articles/${encodeURIComponent(article.slug)}`, {
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

    setAdminNotice('文章文件已删除。')
  } catch {
    setAdminNotice('文章删除失败。')
  } finally {
    saving.value = false
  }
}

const addProject = async () => {
  saving.value = true

  try {
    const project = await $fetch<ManagedProject>('/api/admin/projects', {
      method: 'POST',
      body: {
        name: newProjectName.value,
        description: '后台添加的项目条目。',
        status: '草稿',
        category: '项目',
        sourceUrl: newProjectUrl.value,
        launchUrl: newProjectUrl.value,
        tags: ['Admin']
      }
    })

    managedProjects.value = [project, ...managedProjects.value.filter((item) => item.id !== project.id)]
    await refreshProjects()
    setAdminNotice('项目已写入 data/projects.json。')
  } catch {
    setAdminNotice('项目添加失败。')
  } finally {
    saving.value = false
  }
}

const deleteProject = async (project: ManagedProject) => {
  saving.value = true

  try {
    await $fetch(`/api/admin/projects/${encodeURIComponent(project.id)}`, {
      method: 'DELETE'
    })
    managedProjects.value = managedProjects.value.filter((item) => item.id !== project.id)
    await refreshProjects()
    setAdminNotice('项目已删除。')
  } catch {
    setAdminNotice('项目删除失败。')
  } finally {
    saving.value = false
  }
}

const addFriend = async () => {
  saving.value = true

  try {
    const friend = await $fetch<ManagedFriend>('/api/admin/friends', {
      method: 'POST',
      body: {
        name: newFriendName.value,
        url: newFriendUrl.value,
        icon: newFriendIcon.value,
        intro: newFriendIntro.value,
        description: newFriendDescription.value,
        category: '个人站点',
        status: '待审核',
        tags: ['Review']
      }
    })

    managedFriends.value = [friend, ...managedFriends.value.filter((item) => item.id !== friend.id)]
    await refreshFriends()
    setAdminNotice('友链申请已写入 data/friends.json。')
  } catch {
    setAdminNotice('友链添加失败。')
  } finally {
    saving.value = false
  }
}

const refreshComments = async () => {
  commentsLoading.value = true
  commentsError.value = ''

  try {
    managedComments.value = await $fetch<ManagedComment[]>('/api/admin/comments')
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

const setCommentStatus = async (comment: ManagedComment, status: ManagedCommentStatus) => {
  saving.value = true
  commentsError.value = ''

  try {
    const updated = await $fetch<ManagedComment>(`/api/admin/comments/${encodeURIComponent(comment.id)}`, {
      method: 'PATCH',
      body: { status }
    })

    replaceComment(updated)
    setAdminNotice(`评论状态已更新为：${status}。`)
  } catch {
    commentsError.value = '评论状态更新失败。'
  } finally {
    saving.value = false
  }
}

const deleteComment = async (comment: ManagedComment) => {
  saving.value = true
  commentsError.value = ''

  try {
    await $fetch(`/api/admin/comments/${encodeURIComponent(comment.id)}`, {
      method: 'DELETE'
    })

    managedComments.value = managedComments.value.filter((item) => item.id !== comment.id)
    setAdminNotice('评论已删除。')
  } catch {
    commentsError.value = '评论删除失败。'
  } finally {
    saving.value = false
  }
}

const setFriendStatus = async (friend: ManagedFriend, status: ManagedFriend['status']) => {
  saving.value = true

  try {
    const updated = await $fetch<ManagedFriend>(`/api/admin/friends/${encodeURIComponent(friend.id)}`, {
      method: 'PATCH',
      body: {
        status
      }
    })
    const index = managedFriends.value.findIndex((item) => item.id === updated.id)

    if (index >= 0) {
      managedFriends.value[index] = updated
    }

    await refreshFriends()
    setAdminNotice(`友链状态已更新为：${status}。`)
  } catch {
    setAdminNotice('友链审核状态更新失败。')
  } finally {
    saving.value = false
  }
}

const deleteFriend = async (friend: ManagedFriend) => {
  saving.value = true

  try {
    await $fetch(`/api/admin/friends/${encodeURIComponent(friend.id)}`, {
      method: 'DELETE'
    })
    managedFriends.value = managedFriends.value.filter((item) => item.id !== friend.id)
    await refreshFriends()
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
    previewValue.value = await $fetch('/api/admin/markdown-preview', {
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

onBeforeUnmount(() => {
  if (previewTimer) {
    window.clearTimeout(previewTimer)
  }
})

useHead({
  title: `后台 - ${appConfig.site.name}`
})
</script>

<template>
  <AdminFrame
    :active-panel="activePanel"
    :panels="panels"
    :notice="adminNotice"
    @select-panel="selectPanel"
    @create-article="createArticle"
  >
    <AdminOverviewPanel
      v-show="activePanel === 'overview'"
      :stats="stats"
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
      @create-article="createArticle"
      @select-article="selectArticle"
      @toggle-article-lock="toggleArticleLock"
      @delete-article="deleteArticle"
      @save-draft="saveDraft"
    />

    <AdminProjectsPanel
      v-show="activePanel === 'projects'"
      v-model:new-project-name="newProjectName"
      v-model:new-project-url="newProjectUrl"
      :projects="managedProjects"
      :saving="saving"
      @add-project="addProject"
      @delete-project="deleteProject"
    />

    <AdminFriendsPanel
      v-show="activePanel === 'friends'"
      v-model:new-friend-name="newFriendName"
      v-model:new-friend-url="newFriendUrl"
      v-model:new-friend-icon="newFriendIcon"
      v-model:new-friend-intro="newFriendIntro"
      v-model:new-friend-description="newFriendDescription"
      :friends="managedFriends"
      :saving="saving"
      @add-friend="addFriend"
      @set-friend-status="setFriendStatus"
      @delete-friend="deleteFriend"
    />

    <AdminCommentsPanel
      v-show="activePanel === 'comments'"
      v-model:comment-search-query="commentSearchQuery"
      v-model:comment-status-filter="commentStatusFilter"
      :comments="filteredManagedComments"
      :saving="saving"
      :loading="commentsLoading"
      :error="commentsError"
      @refresh-comments="refreshComments"
      @set-comment-status="setCommentStatus"
      @delete-comment="deleteComment"
    />
  </AdminFrame>
</template>
