<script setup lang="ts">
import type { ArticlePublishCheck, ArticleWorkflowStatus, ManagedArticle, ManagedArticleAutosave, ManagedArticleVersion, PreviewArticle } from '~/types/admin'
import { parseMarkdownPreviewBlocks } from '~/utils/adminMarkdownPreview'

const props = defineProps<{
  managedArticles: ManagedArticle[]
  filteredManagedArticles: ManagedArticle[]
  articleCategories: string[]
  articleTags: string[]
  articleWorkflowOptions: {
    value: ArticleWorkflowStatus
    label: string
    description: string
  }[]
  articleWorkflowCounts: Record<ArticleWorkflowStatus, number>
  selectedArticleId: string
  saving: boolean
  previewValue: unknown | null
  previewPending: boolean
  previewError: string
  previewArticle: PreviewArticle
  publishChecks: ArticlePublishCheck[]
  articleVersions: ManagedArticleVersion[]
  articleAutosaves: ManagedArticleAutosave[]
  autosaveStatus: string
}>()

const emit = defineEmits<{
  createArticle: []
  selectArticle: [article: ManagedArticle]
  toggleArticleLock: [article: ManagedArticle]
  toggleArticlePinned: [article: ManagedArticle]
  setArticleWorkflowStatus: [article: ManagedArticle, status: ArticleWorkflowStatus]
  deleteArticle: [article: ManagedArticle]
  restoreArticleVersion: [version: ManagedArticleVersion]
  selectArticleAutosave: [autosave: ManagedArticleAutosave]
  deleteArticleAutosave: [autosave: ManagedArticleAutosave]
  saveDraft: []
}>()

const articleSearchQuery = defineModel<string>('articleSearchQuery', { required: true })
const articleCategoryFilter = defineModel<string>('articleCategoryFilter', { required: true })
const articleTagFilter = defineModel<string>('articleTagFilter', { required: true })
const articleStateFilter = defineModel<string>('articleStateFilter', { required: true })
const draftTitle = defineModel<string>('draftTitle', { required: true })
const draftDate = defineModel<string>('draftDate', { required: true })
const draftScheduledAt = defineModel<string>('draftScheduledAt', { required: true })
const draftCategory = defineModel<string>('draftCategory', { required: true })
const draftTags = defineModel<string>('draftTags', { required: true })
const draftDescription = defineModel<string>('draftDescription', { required: true })
const draftWorkflowStatus = defineModel<ArticleWorkflowStatus>('draftWorkflowStatus', { required: true })
const draftLocked = defineModel<boolean>('draftLocked', { required: true })
const draftPinned = defineModel<boolean>('draftPinned', { required: true })
const draftMarkdown = defineModel<string>('draftMarkdown', { required: true })

type MarkdownTemplate = {
  label: string
  icon?: string
  content: string
  placeholder?: string
  block?: boolean
}

const appConfig = useAppConfig() as unknown as {
  admin?: {
    markdownTemplates?: unknown
  }
}
const customMarkdownTemplatesStorageKey = 'chankoblog-admin-markdown-templates'
const markdownTemplateConfigOpen = ref(false)
const customMarkdownTemplatesSource = ref('')

const editorPreviewGrid = ref<HTMLElement | null>(null)
const markdownTextarea = ref<HTMLTextAreaElement | null>(null)
const previewScroller = ref<HTMLElement | null>(null)
const editorPreviewSplit = ref(68)
const resizingEditorPreview = ref(false)
const publishChecksCollapsed = ref(false)
const articleStatusNow = ref(Date.now())
let articleStatusTimer: ReturnType<typeof setInterval> | undefined
const editorPreviewGridStyle = computed(() => ({
  '--editor-preview-split': `${editorPreviewSplit.value}%`
}))
const markdownPreviewBlocks = computed(() => parseMarkdownPreviewBlocks(draftMarkdown.value))
const isScheduledArticleReady = (article: Pick<ManagedArticle, 'scheduledAt'>) => {
  if (!article.scheduledAt) {
    return false
  }

  const timestamp = Date.parse(article.scheduledAt)

  return !Number.isNaN(timestamp) && timestamp <= articleStatusNow.value
}
const getArticleWorkflowStatus = (article: Pick<ManagedArticle, 'workflowStatus' | 'published' | 'scheduledAt'>) => {
  const workflowStatus = article.workflowStatus || (article.published ? 'published' : 'draft')

  return workflowStatus === 'scheduled' && isScheduledArticleReady(article) ? 'published' : workflowStatus
}
const draftArticles = computed(() => props.managedArticles.filter((article) => getArticleWorkflowStatus(article) !== 'published'))
const selectedArticleSlug = computed(() => (
  props.managedArticles.find((article) => article.id === props.selectedArticleId)?.slug || ''
))
const workflowStatusLabel = (status: ArticleWorkflowStatus) => (
  props.articleWorkflowOptions.find((option) => option.value === status)?.label || status
)
const workflowStatusDescription = (status: ArticleWorkflowStatus) => (
  props.articleWorkflowOptions.find((option) => option.value === status)?.description || ''
)
const workflowStatusClass = (status: ArticleWorkflowStatus) => {
  if (status === 'published') {
    return 'border-ink bg-ink text-paper'
  }

  if (status === 'review' || status === 'scheduled') {
    return 'border-line bg-code-surface text-ink'
  }

  return 'border-line bg-paper text-muted'
}
const emitWorkflowStatusChange = (article: ManagedArticle, event: Event) => {
  const target = event.target

  if (!(target instanceof HTMLSelectElement)) {
    return
  }

  emit('setArticleWorkflowStatus', article, target.value as ArticleWorkflowStatus)
}
const visibleVersions = computed(() => (
  props.articleVersions
    .filter((version) => !selectedArticleSlug.value || version.slug === selectedArticleSlug.value)
    .slice(0, 8)
))
const visibleAutosaves = computed(() => (
  props.articleAutosaves
    .filter((autosave) => !selectedArticleSlug.value || autosave.slug === selectedArticleSlug.value)
    .slice(0, 6)
))
const publishCheckStats = computed(() => ({
  errors: props.publishChecks.filter((check) => check.severity === 'error').length,
  warnings: props.publishChecks.filter((check) => check.severity === 'warning').length
}))
const publishCheckSummary = computed(() => {
  if (publishCheckStats.value.errors > 0) {
    return `${publishCheckStats.value.errors} 项阻断`
  }

  if (publishCheckStats.value.warnings > 0) {
    return `${publishCheckStats.value.warnings} 项提醒`
  }

  return '可发布'
})

const parseDraftTags = (value: string) => (
  value
    .split(/\r?\n|,/)
    .map((tag) => tag.trim())
    .filter(Boolean)
)
const draftTagList = computed(() => parseDraftTags(draftTags.value))

const normalizeMarkdownTemplate = (value: unknown): MarkdownTemplate | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const template = value as Record<string, unknown>
  const label = typeof template.label === 'string' ? template.label.trim() : ''
  const content = typeof template.content === 'string' ? template.content : ''

  if (!label || !content) {
    return null
  }

  return {
    label,
    icon: typeof template.icon === 'string' && template.icon.trim() ? template.icon.trim() : undefined,
    content,
    placeholder: typeof template.placeholder === 'string' ? template.placeholder : undefined,
    block: template.block === true
  }
}

const parseMarkdownTemplates = (source: unknown): MarkdownTemplate[] => {
  if (!Array.isArray(source)) {
    return []
  }

  return source
    .map((template) => normalizeMarkdownTemplate(template))
    .filter((template): template is MarkdownTemplate => Boolean(template))
}

const appMarkdownTemplates = computed(() => parseMarkdownTemplates(appConfig.admin?.markdownTemplates))

const customMarkdownTemplatesResult = computed(() => {
  const source = customMarkdownTemplatesSource.value.trim()

  if (!source) {
    return {
      templates: [] as MarkdownTemplate[],
      error: ''
    }
  }

  try {
    const parsed = JSON.parse(source) as unknown

    if (!Array.isArray(parsed)) {
      return {
        templates: [] as MarkdownTemplate[],
        error: '模板配置必须是 JSON 数组。'
      }
    }

    const templates = parseMarkdownTemplates(parsed)

    if (templates.length !== parsed.length) {
      return {
        templates,
        error: '部分模板缺少 label 或 content，已忽略。'
      }
    }

    return {
      templates,
      error: ''
    }
  } catch {
    return {
      templates: [] as MarkdownTemplate[],
      error: '模板 JSON 格式有误。'
    }
  }
})

const customMarkdownTemplates = computed(() => customMarkdownTemplatesResult.value.templates)
const customMarkdownTemplatesError = computed(() => customMarkdownTemplatesResult.value.error)
const markdownTemplates = computed(() => [
  ...appMarkdownTemplates.value,
  ...customMarkdownTemplates.value
])

const markdownTemplatesExample = computed(() => JSON.stringify([
  {
    label: '摘要块',
    icon: 'lucide:file-text',
    content: '::normal\n{selection}\n::\n{cursor}',
    placeholder: '摘要内容',
    block: true
  }
], null, 2))

const getPublishCheckIcon = (check: ArticlePublishCheck) => {
  if (check.severity === 'error') {
    return 'lucide:circle-x'
  }

  if (check.severity === 'warning') {
    return 'lucide:triangle-alert'
  }

  return 'lucide:circle-check'
}

const getPublishCheckClass = (check: ArticlePublishCheck) => {
  if (check.severity === 'error') {
    return 'border-ink bg-paper text-ink'
  }

  if (check.severity === 'warning') {
    return 'border-line bg-code-surface text-ink'
  }

  return 'border-line bg-paper text-muted'
}

const updateMarkdownSelection = async (value: string, selectionStart: number, selectionEnd = selectionStart) => {
  draftMarkdown.value = value
  await nextTick()

  const textarea = markdownTextarea.value

  if (!textarea) {
    return
  }

  textarea.focus()
  textarea.setSelectionRange(selectionStart, selectionEnd)
  await syncPreviewAfterCursorMove()
}

const insertInlineMarkdown = async (prefix: string, suffix: string, placeholder: string) => {
  const textarea = markdownTextarea.value
  const value = draftMarkdown.value
  const start = textarea?.selectionStart ?? value.length
  const end = textarea?.selectionEnd ?? value.length
  const selected = value.slice(start, end)
  const content = selected || placeholder
  const inserted = `${prefix}${content}${suffix}`

  await updateMarkdownSelection(
    `${value.slice(0, start)}${inserted}${value.slice(end)}`,
    start + prefix.length,
    start + prefix.length + content.length
  )
}

const insertBlockMarkdown = async (block: string, innerStartOffset: number, innerLength: number) => {
  const textarea = markdownTextarea.value
  const value = draftMarkdown.value
  const start = textarea?.selectionStart ?? value.length
  const end = textarea?.selectionEnd ?? value.length
  const before = value.slice(0, start)
  const after = value.slice(end)
  const leading = before && !before.endsWith('\n') ? '\n' : ''
  const trailing = after && !after.startsWith('\n') ? '\n' : ''
  const insertion = `${leading}${block}${trailing}`
  const blockStart = start + leading.length

  await updateMarkdownSelection(
    `${before}${insertion}${after}`,
    blockStart + innerStartOffset,
    blockStart + innerStartOffset + innerLength
  )
}

const insertMarkdownCodeBlock = async () => {
  const textarea = markdownTextarea.value
  const value = draftMarkdown.value
  const start = textarea?.selectionStart ?? value.length
  const end = textarea?.selectionEnd ?? value.length
  const selected = value.slice(start, end)
  const content = selected || '代码内容'
  const block = `\`\`\`\n${content}\n\`\`\``

  await insertBlockMarkdown(block, 4, content.length)
}

const insertMarkdownLinePrefix = async (prefix: string, placeholder: string, numbered = false) => {
  const textarea = markdownTextarea.value
  const value = draftMarkdown.value
  const start = textarea?.selectionStart ?? value.length
  const end = textarea?.selectionEnd ?? value.length
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1
  const lineEndIndex = value.indexOf('\n', end)
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex
  const selected = value.slice(lineStart, lineEnd)
  const content = selected || placeholder
  const lines = content.split('\n')
  const inserted = lines
    .map((line, index) => `${numbered ? `${index + 1}. ` : prefix}${line || placeholder}`)
    .join('\n')

  await updateMarkdownSelection(
    `${value.slice(0, lineStart)}${inserted}${value.slice(lineEnd)}`,
    lineStart,
    lineStart + inserted.length
  )
}

const insertMarkdownTemplate = async (template: MarkdownTemplate) => {
  const textarea = markdownTextarea.value
  const value = draftMarkdown.value
  const start = textarea?.selectionStart ?? value.length
  const end = textarea?.selectionEnd ?? value.length
  const selected = value.slice(start, end)
  const selectedContent = selected || template.placeholder || ''
  const selectionToken = '{selection}'
  const cursorToken = '{cursor}'
  const selectionTokenIndex = template.content.indexOf(selectionToken)
  let content = template.content.replaceAll(selectionToken, selectedContent)
  const cursorTokenIndex = content.indexOf(cursorToken)

  content = content.replaceAll(cursorToken, '')

  const before = value.slice(0, start)
  const after = value.slice(end)
  const leading = template.block && before && !before.endsWith('\n') ? '\n' : ''
  const trailing = template.block && after && !after.startsWith('\n') ? '\n' : ''
  const insertion = `${leading}${content}${trailing}`
  const insertionStart = start + leading.length
  let selectionStart = insertionStart + content.length
  let selectionEnd = selectionStart

  if (cursorTokenIndex >= 0) {
    selectionStart = insertionStart + cursorTokenIndex
    selectionEnd = selectionStart
  } else if (selectionTokenIndex >= 0 && selectedContent) {
    selectionStart = insertionStart + selectionTokenIndex
    selectionEnd = selectionStart + selectedContent.length
  }

  await updateMarkdownSelection(
    `${before}${insertion}${after}`,
    selectionStart,
    selectionEnd
  )
}

const saveCustomMarkdownTemplates = () => {
  if (!import.meta.client || customMarkdownTemplatesError.value) {
    return
  }

  const templates = customMarkdownTemplates.value
  const source = templates.length > 0 ? JSON.stringify(templates, null, 2) : ''
  customMarkdownTemplatesSource.value = source

  if (source) {
    localStorage.setItem(customMarkdownTemplatesStorageKey, source)
  } else {
    localStorage.removeItem(customMarkdownTemplatesStorageKey)
  }
}

const resetCustomMarkdownTemplates = () => {
  customMarkdownTemplatesSource.value = ''

  if (import.meta.client) {
    localStorage.removeItem(customMarkdownTemplatesStorageKey)
  }
}

const fillMarkdownTemplatesExample = () => {
  customMarkdownTemplatesSource.value = markdownTemplatesExample.value
}

const formatTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const articleScheduleLabel = (article: Pick<ManagedArticle, 'workflowStatus' | 'published' | 'scheduledAt'>) => (
  getArticleWorkflowStatus(article) === 'scheduled' && article.scheduledAt
    ? `定时 ${formatTime(article.scheduledAt)}`
    : ''
)

const getMarkdownLineAtCursor = (textarea: HTMLTextAreaElement) => {
  const cursorIndex = textarea.selectionStart ?? 0

  return textarea.value.slice(0, cursorIndex).split('\n').length
}

const getMarkdownBlockIndexAtLine = (line: number) => {
  const blocks = markdownPreviewBlocks.value
  const exactIndex = blocks.findIndex((block) => line >= block.startLine && line <= block.endLine)

  if (exactIndex >= 0) {
    return exactIndex
  }

  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    if (blocks[index].startLine < line) {
      return index
    }
  }

  return blocks.length > 0 ? 0 : -1
}

const getPreviewBlockElements = (preview: HTMLElement) => {
  const contentRoot = preview.querySelector<HTMLElement>('[data-content-id]')

  if (!contentRoot) {
    return []
  }

  return Array.from(contentRoot.children).filter((element): element is HTMLElement => (
    element instanceof HTMLElement &&
    element.offsetHeight > 0 &&
    element.tagName.toLowerCase() !== 'script' &&
    element.tagName.toLowerCase() !== 'style'
  ))
}

const syncPreviewToMarkdownCursor = () => {
  if (!import.meta.client) {
    return
  }

  const textarea = markdownTextarea.value
  const preview = previewScroller.value

  if (!textarea || !preview) {
    return
  }

  const cursorLine = getMarkdownLineAtCursor(textarea)
  const markdownBlockIndex = getMarkdownBlockIndexAtLine(cursorLine)
  const previewBlocks = getPreviewBlockElements(preview)

  if (markdownBlockIndex < 0 || previewBlocks.length === 0) {
    preview.scrollTop = 0
    return
  }

  const targetIndex = Math.min(markdownBlockIndex, previewBlocks.length - 1)
  const target = previewBlocks[targetIndex]
  const previewRect = preview.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const maxPreviewScroll = Math.max(0, preview.scrollHeight - preview.clientHeight)
  const targetScrollTop = preview.scrollTop + targetRect.top - previewRect.top - 16

  preview.scrollTop = Math.min(maxPreviewScroll, Math.max(0, targetScrollTop))
}

const syncPreviewAfterCursorMove = async () => {
  await nextTick()
  syncPreviewToMarkdownCursor()
}

const stopEditorPreviewResize = () => {
  if (!import.meta.client) {
    return
  }

  resizingEditorPreview.value = false
  window.removeEventListener('pointermove', resizeEditorPreview)
  window.removeEventListener('pointerup', stopEditorPreviewResize)
}

const resizeEditorPreview = (event: PointerEvent) => {
  const container = editorPreviewGrid.value

  if (!container) {
    return
  }

  const rect = container.getBoundingClientRect()
  const nextSplit = ((event.clientX - rect.left) / rect.width) * 100
  editorPreviewSplit.value = Math.min(82, Math.max(45, nextSplit))
}

const startEditorPreviewResize = (event: PointerEvent) => {
  if (!import.meta.client) {
    return
  }

  event.preventDefault()
  resizingEditorPreview.value = true
  resizeEditorPreview(event)
  window.addEventListener('pointermove', resizeEditorPreview)
  window.addEventListener('pointerup', stopEditorPreviewResize)
}

onMounted(() => {
  if (!import.meta.client) {
    return
  }

  customMarkdownTemplatesSource.value = localStorage.getItem(customMarkdownTemplatesStorageKey) || ''
  articleStatusTimer = window.setInterval(() => {
    articleStatusNow.value = Date.now()
  }, 30_000)
})

watch(
  () => props.previewValue,
  async () => {
    await nextTick()
    syncPreviewToMarkdownCursor()
  }
)

onBeforeUnmount(() => {
  stopEditorPreviewResize()

  if (articleStatusTimer) {
    window.clearInterval(articleStatusTimer)
  }
})
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="文章管理">
    <section class="grid border-y border-line" aria-label="文章列表管理">
      <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-(--space-2) border-b border-line p-(--space-2) max-[980px]:grid-cols-1">
        <div class="grid gap-1">
          <h2 class="m-0 font-display text-[40px] font-normal leading-none">
            文章
          </h2>
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            {{ props.filteredManagedArticles.length }} / {{ props.managedArticles.length }}
          </p>
        </div>

        <div class="grid grid-cols-[minmax(180px,1fr)_repeat(3,minmax(132px,auto))] gap-(--space-1) max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
          <label class="grid gap-1 text-[12px] font-bold uppercase tracking-normal text-muted">
            Search
            <input
              v-model="articleSearchQuery"
              class="min-h-10 border border-line bg-code-surface px-(--space-1) text-sm text-ink outline-none focus:border-ink"
              placeholder="关键词 category= tag= title="
            >
          </label>
          <label class="grid gap-1 text-[12px] font-bold uppercase tracking-normal text-muted">
            Category
            <select v-model="articleCategoryFilter" class="min-h-10 border border-line bg-paper px-(--space-1) text-sm text-ink outline-none focus:border-ink">
              <option value="all">全部分类</option>
              <option v-for="category in props.articleCategories" :key="category" :value="category">
                {{ category }}
              </option>
            </select>
          </label>
          <label class="grid gap-1 text-[12px] font-bold uppercase tracking-normal text-muted">
            Tag
            <select v-model="articleTagFilter" class="min-h-10 border border-line bg-paper px-(--space-1) text-sm text-ink outline-none focus:border-ink">
              <option value="all">全部标签</option>
              <option v-for="tag in props.articleTags" :key="tag" :value="tag">
                {{ tag }}
              </option>
            </select>
          </label>
          <label class="grid gap-1 text-[12px] font-bold uppercase tracking-normal text-muted">
            State
            <select v-model="articleStateFilter" class="min-h-10 border border-line bg-paper px-(--space-1) text-sm text-ink outline-none focus:border-ink">
              <option value="all">全部状态</option>
              <option
                v-for="option in props.articleWorkflowOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
              <option value="locked">已上锁</option>
              <option value="unlocked">未上锁</option>
              <option value="pinned">已置顶</option>
              <option value="unpinned">未置顶</option>
            </select>
          </label>
        </div>

        <AppButton size="sm" variant="solid" @click="emit('createArticle')">
          <Icon name="lucide:plus" mode="svg" class="h-4 w-4" aria-hidden="true" />
          新增
        </AppButton>
      </div>

      <div class="grid grid-cols-5 border-b border-line max-[980px]:grid-cols-2 max-[560px]:grid-cols-1" aria-label="文章工作流状态">
        <button
          v-for="option in props.articleWorkflowOptions"
          :key="option.value"
          type="button"
          class="group grid min-h-28 cursor-pointer content-between gap-(--space-2) border-r border-line p-(--space-2) text-left transition-colors duration-200 last:border-r-0 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
          :class="articleStateFilter === option.value ? 'bg-code-surface text-ink' : 'text-muted'"
          @click="articleStateFilter = option.value"
        >
          <span class="flex items-center justify-between gap-(--space-2)">
            <span class="text-sm font-bold uppercase tracking-normal">{{ option.label }}</span>
            <span class="font-display text-[36px] leading-none text-ink transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">
              {{ props.articleWorkflowCounts[option.value] || 0 }}
            </span>
          </span>
          <span class="text-[13px] leading-[1.5] text-muted transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">
            {{ option.description }}
          </span>
        </button>
      </div>

      <div class="overflow-x-auto">
        <div class="flex min-w-max">
          <article
            v-for="article in props.filteredManagedArticles"
            :key="article.id"
            class="grid w-[320px] shrink-0 content-between gap-(--space-2) border-r border-line p-(--space-2)"
            :class="props.selectedArticleId === article.id ? 'bg-code-surface' : ''"
          >
            <button
              type="button"
              class="grid cursor-pointer gap-1 text-left focus-visible:outline-none"
              @click="emit('selectArticle', article)"
            >
              <span class="line-clamp-2 font-display text-[30px] leading-none text-ink text-pretty">{{ article.title }}</span>
              <span class="text-[13px] font-bold uppercase tracking-normal text-muted">
                {{ workflowStatusLabel(getArticleWorkflowStatus(article)) }} / {{ article.locked ? '已上锁' : '未上锁' }} / {{ article.pinned ? '已置顶' : '未置顶' }} / {{ article.views }} views
              </span>
              <span class="truncate text-[13px] font-bold uppercase tracking-normal text-muted">
                {{ article.date }} / {{ article.category }}
              </span>
              <span v-if="articleScheduleLabel(article)" class="truncate text-[13px] font-bold uppercase tracking-normal text-ink">
                {{ articleScheduleLabel(article) }}
              </span>
            </button>
            <div class="flex flex-wrap gap-(--space-1)">
              <select
                class="min-h-9 border border-line bg-paper px-(--space-1) text-[13px] font-bold text-ink outline-none focus:border-ink"
                :value="getArticleWorkflowStatus(article)"
                :disabled="props.saving"
                :aria-label="`切换文章工作流：${article.title}`"
                @change="emitWorkflowStatusChange(article, $event)"
              >
                <option
                  v-for="option in props.articleWorkflowOptions"
                  :key="`${article.id}-${option.value}`"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
              <AppButton size="sm" :disabled="props.saving" @click="emit('toggleArticleLock', article)">
                <Icon :name="article.locked ? 'lucide:lock-open' : 'lucide:lock'" mode="svg" class="h-4 w-4" aria-hidden="true" />
                {{ article.locked ? '解锁' : '上锁' }}
              </AppButton>
              <AppButton size="sm" :disabled="props.saving" @click="emit('toggleArticlePinned', article)">
                <Icon :name="article.pinned ? 'lucide:pin-off' : 'lucide:pin'" mode="svg" class="h-4 w-4" aria-hidden="true" />
                {{ article.pinned ? '取消置顶' : '置顶' }}
              </AppButton>
              <AppButton size="sm" variant="text" :disabled="props.saving" @click="emit('deleteArticle', article)">
                <Icon name="lucide:trash-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
                删除
              </AppButton>
            </div>
          </article>

          <div v-if="props.filteredManagedArticles.length === 0" class="grid min-h-38 w-full min-w-[320px] place-items-center px-(--space-3) text-muted">
            <p class="m-0 text-sm font-bold">
              没有匹配文章。
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="grid border-y border-line" aria-label="文章草稿箱">
      <div class="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-(--space-2) border-b border-line p-(--space-2) max-[720px]:grid-cols-1">
        <div class="grid gap-1">
          <h2 class="m-0 font-display text-[40px] font-normal leading-none">
            草稿箱
          </h2>
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            {{ draftArticles.length }} 篇未发布或已归档文章
          </p>
        </div>
        <p class="m-0 max-w-160 text-sm leading-[1.6] text-muted text-pretty">
          草稿、待审核、定时和归档文章会保留在这里，方便继续编辑、复核或重新发布，前台只展示“已发布”。
        </p>
      </div>

      <div v-if="draftArticles.length > 0" class="grid md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="article in draftArticles"
          :key="`draft-${article.id}`"
          class="grid content-between gap-(--space-2) border-r border-b border-line p-(--space-2)"
          :class="props.selectedArticleId === article.id ? 'bg-code-surface' : ''"
        >
          <button
            type="button"
            class="grid cursor-pointer gap-1 text-left focus-visible:outline-none"
            @click="emit('selectArticle', article)"
          >
            <span class="line-clamp-2 font-display text-[30px] leading-none text-ink text-pretty">{{ article.title }}</span>
            <span class="text-[13px] font-bold uppercase tracking-normal text-muted">
              {{ workflowStatusLabel(getArticleWorkflowStatus(article)) }} / {{ article.locked ? '已上锁' : '未上锁' }} / {{ article.pinned ? '已置顶' : '未置顶' }}
            </span>
            <span class="truncate text-[13px] font-bold uppercase tracking-normal text-muted">
              {{ article.date }} / {{ article.category }}
            </span>
            <span v-if="articleScheduleLabel(article)" class="truncate text-[13px] font-bold uppercase tracking-normal text-ink">
              {{ articleScheduleLabel(article) }}
            </span>
          </button>
          <div class="flex flex-wrap gap-(--space-1)">
            <span
              class="inline-flex min-h-9 items-center border px-(--space-1) text-[13px] font-bold"
              :class="workflowStatusClass(getArticleWorkflowStatus(article))"
              :title="workflowStatusDescription(getArticleWorkflowStatus(article))"
            >
              {{ workflowStatusLabel(getArticleWorkflowStatus(article)) }}
            </span>
            <AppButton size="sm" :disabled="props.saving" @click="emit('selectArticle', article)">
              <Icon name="lucide:file-pen-line" mode="svg" class="h-4 w-4" aria-hidden="true" />
              编辑
            </AppButton>
            <AppButton size="sm" :disabled="props.saving" @click="emit('toggleArticlePinned', article)">
              <Icon :name="article.pinned ? 'lucide:pin-off' : 'lucide:pin'" mode="svg" class="h-4 w-4" aria-hidden="true" />
              {{ article.pinned ? '取消置顶' : '置顶' }}
            </AppButton>
          </div>
        </article>
      </div>

      <div v-else class="grid min-h-28 place-items-center p-(--space-3) text-muted">
        <p class="m-0 text-sm font-bold">
          暂无草稿。
        </p>
      </div>
    </section>

    <section class="grid min-h-0 gap-(--space-3)" aria-label="文章编辑器">
      <div class="grid gap-(--space-2)">
        <div class="grid grid-cols-[minmax(0,1fr)_220px] items-start gap-(--space-2) max-[720px]:grid-cols-1">
          <label class="grid content-start gap-2 text-sm font-bold text-muted">
            标题
            <input v-model="draftTitle" class="h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid content-start gap-2 text-sm font-bold text-muted">
            发布日期
            <input v-model="draftDate" type="date" class="h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
        </div>

        <div class="grid grid-cols-2 items-start gap-(--space-2) max-[900px]:grid-cols-1">
          <TaxonomyCategoryInput
            v-model="draftCategory"
            :suggestions="props.articleCategories"
          />
          <TaxonomyTagInput
            v-model="draftTags"
            :suggestions="props.articleTags"
          />
        </div>

        <label class="grid gap-2 text-sm font-bold text-muted">
          摘要
          <textarea v-model="draftDescription" rows="3" class="resize-y border border-line bg-paper p-(--space-2) text-base leading-[1.6] text-ink outline-none focus:border-ink" />
        </label>
      </div>

      <div class="grid gap-(--space-1)">
        <div class="flex flex-wrap items-end gap-(--space-1)">
          <label class="grid min-w-50 gap-1 text-[12px] font-bold uppercase tracking-normal text-muted">
            工作流
            <select v-model="draftWorkflowStatus" class="min-h-11 border border-line bg-paper px-(--space-2) text-sm font-bold text-ink outline-none focus:border-ink">
              <option
                v-for="option in props.articleWorkflowOptions"
                :key="`editor-${option.value}`"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>
          <label
            v-if="draftWorkflowStatus === 'scheduled'"
            class="grid min-w-64 gap-1 text-[12px] font-bold uppercase tracking-normal text-muted"
          >
            定时发布时间
            <input
              v-model="draftScheduledAt"
              type="datetime-local"
              class="min-h-11 border border-line bg-paper px-(--space-2) text-sm font-bold text-ink outline-none focus:border-ink"
            >
          </label>
          <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
            <input v-model="draftLocked" type="checkbox" class="accent-ink">
            上锁
          </label>
          <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
            <input v-model="draftPinned" type="checkbox" class="accent-ink">
            置顶
          </label>
          <AppButton variant="solid" :loading="props.saving" @click="emit('saveDraft')">
            <Icon name="lucide:save" mode="svg" class="h-4 w-4" aria-hidden="true" />
            保存
          </AppButton>
          <span class="inline-flex min-h-11 items-center text-[13px] font-bold text-muted">
            {{ props.autosaveStatus }}
          </span>
        </div>
        <p class="m-0 text-[13px] leading-[1.6] text-muted text-pretty">
          当前状态：{{ workflowStatusLabel(draftWorkflowStatus) }}。{{ workflowStatusDescription(draftWorkflowStatus) }}
          <span v-if="draftWorkflowStatus === 'published'">保存时会执行发布检查，通过后进入前台。</span>
          <span v-else>保存后仍会写入文章文件，但不会进入前台列表。</span>
        </p>
      </div>

      <section class="grid border-y border-line" aria-label="文章发布检查">
        <div class="flex min-h-12 flex-wrap items-center justify-between gap-(--space-2) border-b border-line px-(--space-2)">
          <div class="flex items-center gap-(--space-1)">
            <Icon name="lucide:clipboard-check" mode="svg" class="h-4 w-4 text-muted" aria-hidden="true" />
            <h3 class="m-0 text-sm font-bold uppercase tracking-normal text-muted">
              发布检查
            </h3>
          </div>
          <div class="flex items-center gap-(--space-1)">
            <span
              class="border border-line bg-code-surface px-(--space-1) py-1 text-[13px] font-bold text-muted"
              :class="publishCheckStats.errors > 0 ? 'text-ink' : ''"
            >
              {{ publishCheckSummary }}
            </span>
            <AppButton
              size="sm"
              variant="icon"
              :aria-label="publishChecksCollapsed ? '展开发布检查' : '收起发布检查'"
              :title="publishChecksCollapsed ? '展开发布检查' : '收起发布检查'"
              @click="publishChecksCollapsed = !publishChecksCollapsed"
            >
              <Icon
                :name="publishChecksCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'"
                mode="svg"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </AppButton>
          </div>
        </div>
        <div
          v-show="!publishChecksCollapsed"
          class="grid grid-cols-2 max-[760px]:grid-cols-1"
        >
          <article
            v-for="check in props.publishChecks"
            :key="check.id"
            class="grid grid-cols-[auto_minmax(0,1fr)] gap-(--space-1) border-r border-b p-(--space-2) last:border-b max-[760px]:border-r-0"
            :class="getPublishCheckClass(check)"
          >
            <Icon :name="getPublishCheckIcon(check)" mode="svg" class="mt-0.5 h-4 w-4" aria-hidden="true" />
            <div class="grid min-w-0 gap-1">
              <p class="m-0 text-sm font-bold text-ink">
                {{ check.label }}
              </p>
              <p class="m-0 text-[13px] leading-[1.55] text-muted">
                {{ check.detail }}
              </p>
            </div>
          </article>
        </div>
      </section>

      <div
        ref="editorPreviewGrid"
        class="grid min-h-0 grid-cols-[minmax(0,var(--editor-preview-split))_10px_minmax(320px,1fr)] items-stretch gap-0 [--editor-panel-height:880px] min-[1181px]:h-[var(--editor-panel-height)] min-[1680px]:[--editor-panel-height:960px] max-[1180px]:grid-cols-1 max-[1180px]:[--editor-panel-height:560px] max-[720px]:[--editor-panel-height:420px]"
        :class="resizingEditorPreview ? 'select-none' : ''"
        :style="editorPreviewGridStyle"
      >
        <section class="grid h-[var(--editor-panel-height)] min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden border border-line min-[1181px]:h-full" aria-label="Markdown 原文编辑">
          <div class="flex min-h-12 items-center justify-between gap-(--space-2) border-b border-line px-(--space-2)">
            <h3 class="m-0 text-sm font-bold uppercase tracking-normal text-muted">
              Markdown
            </h3>
            <span class="text-[13px] font-bold text-muted">
              {{ draftMarkdown.length }} chars
            </span>
          </div>
          <div class="grid gap-1 border-b border-line bg-paper px-(--space-2) py-1" aria-label="Markdown 快捷栏">
            <div class="flex min-h-10 flex-wrap items-center gap-1">
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="二级标题"
                aria-label="二级标题"
                @click="insertMarkdownLinePrefix('## ', '二级标题')"
              >
                H2
              </button>
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="三级标题"
                aria-label="三级标题"
                @click="insertMarkdownLinePrefix('### ', '三级标题')"
              >
                H3
              </button>
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="粗体"
                aria-label="粗体"
                @click="insertInlineMarkdown('**', '**', '粗体文本')"
              >
                <Icon name="lucide:bold" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="斜体"
                aria-label="斜体"
                @click="insertInlineMarkdown('*', '*', '斜体文本')"
              >
                <Icon name="lucide:italic" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="行内代码"
                aria-label="行内代码"
                @click="insertInlineMarkdown('`', '`', 'code')"
              >
                <Icon name="lucide:code" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="代码块"
                aria-label="代码块"
                @click="insertMarkdownCodeBlock"
              >
                <Icon name="lucide:square-code" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="引用"
                aria-label="引用"
                @click="insertMarkdownLinePrefix('> ', '引用内容')"
              >
                <Icon name="lucide:quote" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="无序列表"
                aria-label="无序列表"
                @click="insertMarkdownLinePrefix('- ', '列表项')"
              >
                <Icon name="lucide:list" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="有序列表"
                aria-label="有序列表"
                @click="insertMarkdownLinePrefix('', '列表项', true)"
              >
                <Icon name="lucide:list-ordered" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="链接"
                aria-label="链接"
                @click="insertInlineMarkdown('[', '](https://example.com)', '链接文本')"
              >
                <Icon name="lucide:link" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                title="图片"
                aria-label="图片"
                @click="insertInlineMarkdown('![', '](/media/image.png)', '图片描述')"
              >
                <Icon name="lucide:image" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </button>
              <span v-if="markdownTemplates.length > 0" class="mx-1 h-6 w-px bg-line" aria-hidden="true" />
              <button
                v-for="template in markdownTemplates"
                :key="`markdown-template-${template.label}`"
                type="button"
                class="inline-flex h-9 min-w-9 items-center justify-center gap-1 border border-line bg-paper px-2 text-[13px] font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                :title="`插入模板：${template.label}`"
                :aria-label="`插入模板：${template.label}`"
                @click="insertMarkdownTemplate(template)"
              >
                <Icon v-if="template.icon" :name="template.icon" mode="svg" class="h-4 w-4" aria-hidden="true" />
                <span>{{ template.label }}</span>
              </button>
              <button
                type="button"
                class="inline-flex h-9 min-w-9 items-center justify-center gap-1 border border-line bg-code-surface px-2 text-[13px] font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                :aria-expanded="markdownTemplateConfigOpen"
                aria-controls="markdown-template-config"
                title="模板配置"
                @click="markdownTemplateConfigOpen = !markdownTemplateConfigOpen"
              >
                <Icon name="lucide:settings-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
                模板
              </button>
            </div>
            <div
              v-if="markdownTemplateConfigOpen"
              id="markdown-template-config"
              class="grid gap-2 border-t border-line pt-2"
            >
              <textarea
                v-model="customMarkdownTemplatesSource"
                class="min-h-36 resize-y border border-line bg-code-surface p-(--space-2) font-mono text-[13px] leading-[1.6] text-code-text outline-none focus:border-ink"
                spellcheck="false"
                :placeholder="markdownTemplatesExample"
                aria-label="自定义 Markdown 模板 JSON"
              />
              <div class="flex flex-wrap items-center justify-between gap-(--space-2)">
                <p class="m-0 text-[13px] font-bold text-muted">
                  app.config 默认 {{ appMarkdownTemplates.length }} 个 / 自定义 {{ customMarkdownTemplates.length }} 个
                </p>
                <p v-if="customMarkdownTemplatesError" class="m-0 text-[13px] font-bold text-ink">
                  {{ customMarkdownTemplatesError }}
                </p>
                <div class="flex flex-wrap gap-1">
                  <AppButton size="sm" variant="text" @click="fillMarkdownTemplatesExample">
                    <Icon name="lucide:file-plus-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
                    示例
                  </AppButton>
                  <AppButton size="sm" variant="text" @click="resetCustomMarkdownTemplates">
                    <Icon name="lucide:rotate-ccw" mode="svg" class="h-4 w-4" aria-hidden="true" />
                    清空
                  </AppButton>
                  <AppButton size="sm" :disabled="Boolean(customMarkdownTemplatesError)" @click="saveCustomMarkdownTemplates">
                    <Icon name="lucide:save" mode="svg" class="h-4 w-4" aria-hidden="true" />
                    保存
                  </AppButton>
                </div>
              </div>
            </div>
          </div>
          <textarea
            ref="markdownTextarea"
            v-model="draftMarkdown"
            class="h-full min-h-0 resize-none overflow-auto overscroll-contain border-0 bg-code-surface p-(--space-3) font-mono text-[15px] leading-[1.75] text-code-text outline-none"
            spellcheck="false"
            @click="syncPreviewAfterCursorMove"
            @keyup="syncPreviewAfterCursorMove"
            @input="syncPreviewAfterCursorMove"
            @select="syncPreviewAfterCursorMove"
          />
        </section>

        <button
          type="button"
          class="group grid h-full min-h-0 cursor-col-resize place-items-center border-y border-line bg-paper transition-colors duration-200 hover:bg-ink focus-visible:bg-ink focus-visible:outline-none max-[1180px]:hidden"
          aria-label="拖动调整 Markdown 编辑区和预览区宽度"
          @pointerdown="startEditorPreviewResize"
        >
          <span class="h-full min-h-16 w-px bg-line transition-colors duration-200 group-hover:bg-paper group-focus-visible:bg-paper" aria-hidden="true" />
        </button>

        <section class="grid h-[var(--editor-panel-height)] min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-line bg-paper min-[1181px]:h-full" aria-label="文章页预览">
          <div class="flex min-h-12 items-center justify-between gap-(--space-2) border-b border-line px-(--space-2)">
            <h3 class="m-0 text-sm font-bold uppercase tracking-normal text-muted">
              Preview
            </h3>
            <span class="text-[13px] font-bold text-muted">
              {{ props.previewPending ? 'MDC 渲染中' : 'Nuxt Content / MDC' }}
            </span>
          </div>
          <article
            ref="previewScroller"
            class="relative h-full min-h-0 overflow-auto overscroll-contain px-(--space-3) py-(--space-4) max-[760px]:px-(--space-2)"
          >
            <header class="grid gap-(--space-2)">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                {{ props.previewArticle.date }} / {{ props.previewArticle.category }}
                <span v-if="props.previewArticle.scheduledAt">
                  / 定时 {{ formatTime(props.previewArticle.scheduledAt) }}
                </span>
              </p>
              <h2 class="m-0 break-words font-display text-[72px] font-normal leading-[0.95] tracking-normal max-[760px]:text-[48px] max-[520px]:text-[38px]">
                {{ props.previewArticle.title }}
              </h2>
              <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
                {{ props.previewArticle.description }}
              </p>
            </header>
            <p v-if="props.previewError" class="m-0 mt-(--space-3) border border-line p-(--space-2) text-muted">
              {{ props.previewError }}
            </p>
            <ContentBody v-else-if="props.previewValue" class="mt-(--space-4)" :value="props.previewValue" />
          </article>
        </section>
      </div>
    </section>

    <section class="grid grid-cols-2 gap-(--space-3) max-[980px]:grid-cols-1" aria-label="文章可靠性记录">
      <div class="grid content-start border-y border-line">
        <div class="flex h-12 items-center justify-between gap-(--space-2) border-b border-line px-(--space-2)">
          <h3 class="m-0 text-sm font-bold uppercase tracking-normal text-muted">
            自动保存
          </h3>
          <span class="text-[13px] font-bold text-muted">{{ visibleAutosaves.length }}</span>
        </div>
        <article
          v-for="autosave in visibleAutosaves"
          :key="autosave.slug"
          class="grid h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-(--space-2) border-b border-line p-(--space-2)"
        >
          <button type="button" class="grid min-w-0 cursor-pointer gap-1 text-left focus-visible:outline-none" @click="emit('selectArticleAutosave', autosave)">
            <span class="line-clamp-1 text-sm font-bold text-ink">{{ autosave.title }}</span>
            <span class="text-[13px] font-bold uppercase tracking-normal text-muted">
              {{ formatTime(autosave.updatedAt) }} / {{ workflowStatusLabel(getArticleWorkflowStatus(autosave)) }}
            </span>
          </button>
          <AppButton size="sm" variant="text" :disabled="props.saving" @click="emit('deleteArticleAutosave', autosave)">
            <Icon name="lucide:x" mode="svg" class="h-4 w-4" aria-hidden="true" />
            移除
          </AppButton>
        </article>
        <div v-if="visibleAutosaves.length === 0" class="grid min-h-24 place-items-center border-b border-line p-(--space-2)">
          <p class="m-0 text-sm font-bold text-muted">
            当前文章暂无自动保存。
          </p>
        </div>
      </div>

      <div class="grid content-start border-y border-line">
        <div class="flex h-12 items-center justify-between gap-(--space-2) border-b border-line px-(--space-2)">
          <h3 class="m-0 text-sm font-bold uppercase tracking-normal text-muted">
            版本历史
          </h3>
          <span class="text-[13px] font-bold text-muted">{{ visibleVersions.length }}</span>
        </div>
        <article
          v-for="version in visibleVersions"
          :key="version.versionId"
          class="grid h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-(--space-2) border-b border-line p-(--space-2)"
        >
          <div class="grid min-w-0 gap-1">
            <span class="line-clamp-1 text-sm font-bold text-ink">{{ version.title }}</span>
            <span class="text-[13px] font-bold uppercase tracking-normal text-muted">
              {{ formatTime(version.createdAt) }} / {{ version.action }}
            </span>
          </div>
          <AppButton size="sm" :disabled="props.saving" @click="emit('restoreArticleVersion', version)">
            <Icon name="lucide:rotate-ccw" mode="svg" class="h-4 w-4" aria-hidden="true" />
            恢复
          </AppButton>
        </article>
        <div v-if="visibleVersions.length === 0" class="grid min-h-24 place-items-center border-b border-line p-(--space-2)">
          <p class="m-0 text-sm font-bold text-muted">
            保存或删除后会生成版本记录。
          </p>
        </div>
      </div>
    </section>
  </section>
</template>
