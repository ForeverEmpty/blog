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
  exportBackup: []
}>()

const articleSearchQuery = defineModel<string>('articleSearchQuery', { required: true })
const articleCategoryFilter = defineModel<string>('articleCategoryFilter', { required: true })
const articleTagFilter = defineModel<string>('articleTagFilter', { required: true })
const articleStateFilter = defineModel<string>('articleStateFilter', { required: true })
const draftTitle = defineModel<string>('draftTitle', { required: true })
const draftSlug = defineModel<string>('draftSlug', { required: true })
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

type MarkdownTemplateGroup = {
  group: string
  templates: MarkdownTemplate[]
}

type MarkdownToolbarAction = {
  label: string
  icon?: string
  run: () => void | Promise<void>
}

type MarkdownToolbarMenu = {
  label: string
  icon?: string
  actions: MarkdownToolbarAction[]
}

type MarkdownToolbarItem = MarkdownToolbarAction | MarkdownToolbarMenu

type MarkdownEditHistoryEntry = {
  before: string
  after: string
  selectionBefore: [number, number]
  selectionAfter: [number, number]
}

const appConfig = useAppConfig() as unknown as {
  admin?: {
    markdownTemplates?: unknown
  }
}
const customMarkdownTemplatesStorageKey = 'chankoblog-admin-markdown-templates'
const markdownTemplateConfigOpen = ref(false)
const customMarkdownTemplatesSource = ref('')
const customMarkdownTemplateForm = reactive({
  group: '常用块',
  label: '',
  icon: '',
  placeholder: '',
  content: '',
  block: true
})
const customMarkdownTemplateFormError = ref('')

const editorPreviewGrid = ref<HTMLElement | null>(null)
const markdownTextarea = ref<HTMLTextAreaElement | null>(null)
const previewScroller = ref<HTMLElement | null>(null)
const editorPreviewSplit = ref(68)
const resizingEditorPreview = ref(false)
const publishChecksCollapsed = ref(false)
const markdownEditHistory = ref<MarkdownEditHistoryEntry[]>([])
const articleStatusNow = ref(Date.now())
let articleStatusTimer: number | undefined
const editorPreviewGridStyle = computed(() => ({
  '--editor-preview-split': `${editorPreviewSplit.value}%`,
  '--editor-group-height': 'min(880px, calc(100vh - 128px))',
  '--editor-panel-height': 'min(430px, calc((100vh - 160px) / 2))'
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
  props.selectedArticleId === 'new'
    ? []
    : props.articleVersions
      .filter((version) => selectedArticleSlug.value && version.slug === selectedArticleSlug.value)
      .slice(0, 8)
))
const visibleAutosaves = computed(() => (
  props.selectedArticleId === 'new'
    ? []
    : props.articleAutosaves
      .filter((autosave) => selectedArticleSlug.value && autosave.slug === selectedArticleSlug.value)
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
const normalizeDraftSlugInput = (value: string) => (
  value
    .trim()
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'new-article'
)
const normalizeDraftSlugField = () => {
  draftSlug.value = normalizeDraftSlugInput(draftSlug.value)
}

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

const normalizeMarkdownTemplateGroup = (value: unknown, fallbackGroup = '模板'): MarkdownTemplateGroup | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const group = value as Record<string, unknown>
  const label = typeof group.group === 'string' && group.group.trim() ? group.group.trim() : fallbackGroup
  const templates = parseMarkdownTemplates(group.templates)

  if (templates.length === 0) {
    return null
  }

  return {
    group: label,
    templates
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

const parseMarkdownTemplateGroups = (source: unknown, fallbackGroup = '模板'): MarkdownTemplateGroup[] => {
  if (!Array.isArray(source)) {
    return []
  }

  const directTemplates = parseMarkdownTemplates(source)

  if (directTemplates.length > 0) {
    return [
      {
        group: fallbackGroup,
        templates: directTemplates
      }
    ]
  }

  return source
    .map((group) => normalizeMarkdownTemplateGroup(group, fallbackGroup))
    .filter((group): group is MarkdownTemplateGroup => Boolean(group))
}

const flattenMarkdownTemplateGroups = (groups: MarkdownTemplateGroup[]) => (
  groups.flatMap((group) => group.templates)
)

const appMarkdownTemplateGroups = computed(() => parseMarkdownTemplateGroups(appConfig.admin?.markdownTemplates, '内置模板'))
const appMarkdownTemplates = computed(() => flattenMarkdownTemplateGroups(appMarkdownTemplateGroups.value))

const customMarkdownTemplatesResult = computed(() => {
  const source = customMarkdownTemplatesSource.value.trim()

  if (!source) {
    return {
      groups: [] as MarkdownTemplateGroup[],
      templates: [] as MarkdownTemplate[],
      error: ''
    }
  }

  try {
    const parsed = JSON.parse(source) as unknown

    if (!Array.isArray(parsed)) {
      return {
        groups: [] as MarkdownTemplateGroup[],
        templates: [] as MarkdownTemplate[],
        error: '模板配置必须是 JSON 数组，可使用模板数组或分组数组。'
      }
    }

    const groups = parseMarkdownTemplateGroups(parsed, '自定义')
    const templates = flattenMarkdownTemplateGroups(groups)

    if (groups.length === 0) {
      return {
        groups,
        templates,
        error: '未找到有效模板，模板需要 label 和 content。'
      }
    }

    return {
      groups,
      templates,
      error: ''
    }
  } catch {
    return {
      groups: [] as MarkdownTemplateGroup[],
      templates: [] as MarkdownTemplate[],
      error: '模板 JSON 格式有误。'
    }
  }
})

const customMarkdownTemplateGroups = computed(() => customMarkdownTemplatesResult.value.groups)
const customMarkdownTemplates = computed(() => customMarkdownTemplatesResult.value.templates)
const customMarkdownTemplatesError = computed(() => customMarkdownTemplatesResult.value.error)
const markdownTemplateGroups = computed(() => [
  ...appMarkdownTemplateGroups.value,
  ...customMarkdownTemplateGroups.value
])
const markdownTemplates = computed(() => [
  ...appMarkdownTemplates.value,
  ...customMarkdownTemplates.value
])

const markdownTemplatesExample = computed(() => JSON.stringify([
  {
    group: '常用块',
    templates: [
      {
        label: '摘要块',
        icon: 'lucide:file-text',
        content: '::normal\n{selection}\n::\n{cursor}',
        placeholder: '摘要内容',
        block: true
      },
      {
        label: '提示块',
        icon: 'lucide:info',
        content: '::tip\n{selection}\n::\n{cursor}',
        placeholder: '提示内容',
        block: true
      }
    ]
  },
  {
    group: '媒体',
    templates: [
      {
        label: '图片',
        icon: 'lucide:image-plus',
        content: '![{selection}](/media/image.png)\n{cursor}',
        placeholder: '图片描述',
        block: true
      }
    ]
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

const pushMarkdownEditHistory = (
  before: string,
  after: string,
  selectionBefore: [number, number],
  selectionAfter: [number, number]
) => {
  if (before === after) {
    return
  }

  markdownEditHistory.value.push({
    before,
    after,
    selectionBefore,
    selectionAfter
  })

  if (markdownEditHistory.value.length > 50) {
    markdownEditHistory.value.shift()
  }
}

const updateMarkdownSelection = async (
  value: string,
  selectionStart: number,
  selectionEnd = selectionStart,
  trackUndo = true
) => {
  const textarea = markdownTextarea.value
  const before = draftMarkdown.value
  const selectionBefore: [number, number] = [
    textarea?.selectionStart ?? before.length,
    textarea?.selectionEnd ?? before.length
  ]

  if (trackUndo) {
    pushMarkdownEditHistory(before, value, selectionBefore, [selectionStart, selectionEnd])
  }

  draftMarkdown.value = value
  await nextTick()

  const nextTextarea = markdownTextarea.value

  if (!nextTextarea) {
    return
  }

  nextTextarea.focus()
  nextTextarea.setSelectionRange(selectionStart, selectionEnd)
  await syncPreviewAfterCursorMove()
}

const undoMarkdownProgrammaticEdit = async (event: KeyboardEvent) => {
  if ((!event.ctrlKey && !event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'z') {
    return
  }

  const entry = markdownEditHistory.value.at(-1)

  if (!entry || draftMarkdown.value !== entry.after) {
    return
  }

  event.preventDefault()
  markdownEditHistory.value.pop()
  await updateMarkdownSelection(
    entry.before,
    entry.selectionBefore[0],
    entry.selectionBefore[1],
    false
  )
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

const isMarkdownToolbarMenu = (item: MarkdownToolbarItem): item is MarkdownToolbarMenu => (
  'actions' in item
)

const closeToolbarMenu = (event: MouseEvent) => {
  const target = event.currentTarget

  if (!(target instanceof HTMLElement)) {
    return
  }

  target.closest('details')?.removeAttribute('open')
}

const runMarkdownToolbarAction = async (action: MarkdownToolbarAction, event?: MouseEvent) => {
  await action.run()

  if (event) {
    closeToolbarMenu(event)
  }
}

const markdownToolbarGroups = computed((): Array<{ group: string, items: MarkdownToolbarItem[] }> => [
  {
    group: '标题',
    items: [
      {
        label: '标题',
        icon: 'lucide:heading',
        actions: [
          {
            label: 'H1',
            run: () => insertMarkdownLinePrefix('# ', '一级标题')
          },
          {
            label: 'H2',
            run: () => insertMarkdownLinePrefix('## ', '二级标题')
          },
          {
            label: 'H3',
            run: () => insertMarkdownLinePrefix('### ', '三级标题')
          },
          {
            label: 'H4',
            run: () => insertMarkdownLinePrefix('#### ', '四级标题')
          },
          {
            label: 'H5',
            run: () => insertMarkdownLinePrefix('##### ', '五级标题')
          },
          {
            label: 'H6',
            run: () => insertMarkdownLinePrefix('###### ', '六级标题')
          }
        ]
      }
    ]
  },
  {
    group: '基础样式',
    items: [
      {
        label: '粗体',
        icon: 'lucide:bold',
        run: () => insertInlineMarkdown('**', '**', '粗体文本')
      },
      {
        label: '斜体',
        icon: 'lucide:italic',
        run: () => insertInlineMarkdown('*', '*', '斜体文本')
      },
      {
        label: '删除线',
        icon: 'lucide:strikethrough',
        run: () => insertInlineMarkdown('~~', '~~', '删除线文本')
      },
      {
        label: '行内代码',
        icon: 'lucide:code',
        run: () => insertInlineMarkdown('`', '`', 'code')
      },
      {
        label: '链接',
        icon: 'lucide:link',
        run: () => insertInlineMarkdown('[', '](https://example.com)', '链接文本')
      }
    ]
  },
  {
    group: '段落结构',
    items: [
      {
        label: '代码块',
        icon: 'lucide:square-code',
        run: insertMarkdownCodeBlock
      },
      {
        label: '分割线',
        icon: 'lucide:minus',
        run: () => insertBlockMarkdown('---', 3, 0)
      },
      {
        label: '引用',
        icon: 'lucide:quote',
        run: () => insertMarkdownLinePrefix('> ', '引用内容')
      },
      {
        label: '列表',
        icon: 'lucide:list-ordered',
        actions: [
          {
            label: '无序列表',
            icon: 'lucide:list',
            run: () => insertMarkdownLinePrefix('- ', '列表项')
          },
          {
            label: '有序列表',
            icon: 'lucide:list-ordered',
            run: () => insertMarkdownLinePrefix('', '列表项', true)
          },
          {
            label: '任务列表',
            icon: 'lucide:list-checks',
            run: () => insertMarkdownLinePrefix('- [ ] ', '任务项')
          }
        ]
      }
    ]
  },
  {
    group: '媒体',
    items: [
      {
        label: '图片',
        icon: 'lucide:image',
        run: () => insertInlineMarkdown('![', '](/media/image.png)', '图片描述')
      }
    ]
  }
])

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

const cloneCustomMarkdownTemplateGroups = () => (
  customMarkdownTemplateGroups.value.map((group) => ({
    group: group.group,
    templates: group.templates.map((template) => ({ ...template }))
  }))
)

const syncCustomMarkdownTemplateGroups = (groups: MarkdownTemplateGroup[]) => {
  customMarkdownTemplatesSource.value = groups.length > 0 ? JSON.stringify(groups, null, 2) : ''
}

const resetCustomMarkdownTemplateForm = () => {
  customMarkdownTemplateForm.label = ''
  customMarkdownTemplateForm.icon = ''
  customMarkdownTemplateForm.placeholder = ''
  customMarkdownTemplateForm.content = ''
  customMarkdownTemplateForm.block = true
  customMarkdownTemplateFormError.value = ''
}

const addCustomMarkdownTemplate = () => {
  const groupLabel = customMarkdownTemplateForm.group.trim() || '自定义'
  const label = customMarkdownTemplateForm.label.trim()
  const content = customMarkdownTemplateForm.content

  if (!label || !content.trim()) {
    customMarkdownTemplateFormError.value = '模板名称和内容不能为空。'
    return
  }

  const groups = cloneCustomMarkdownTemplateGroups()
  const targetGroup = groups.find((group) => group.group === groupLabel)
  const template: MarkdownTemplate = {
    label,
    icon: customMarkdownTemplateForm.icon.trim() || undefined,
    content,
    placeholder: customMarkdownTemplateForm.placeholder.trim() || undefined,
    block: customMarkdownTemplateForm.block
  }

  if (targetGroup) {
    const existingIndex = targetGroup.templates.findIndex((item) => item.label === label)

    if (existingIndex >= 0) {
      targetGroup.templates.splice(existingIndex, 1, template)
    } else {
      targetGroup.templates.push(template)
    }
  } else {
    groups.push({
      group: groupLabel,
      templates: [template]
    })
  }

  syncCustomMarkdownTemplateGroups(groups)
  resetCustomMarkdownTemplateForm()
  customMarkdownTemplateForm.group = groupLabel
}

const removeCustomMarkdownTemplate = (groupIndex: number, templateIndex: number) => {
  const groups = cloneCustomMarkdownTemplateGroups()
  const group = groups[groupIndex]

  if (!group) {
    return
  }

  group.templates.splice(templateIndex, 1)

  if (group.templates.length === 0) {
    groups.splice(groupIndex, 1)
  }

  syncCustomMarkdownTemplateGroups(groups)
}

const saveCustomMarkdownTemplates = () => {
  if (!import.meta.client || customMarkdownTemplatesError.value) {
    return
  }

  const groups = customMarkdownTemplateGroups.value
  const source = groups.length > 0 ? JSON.stringify(groups, null, 2) : ''
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

const getMarkdownLineAtEditorScroll = (textarea: HTMLTextAreaElement) => {
  const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 26

  return Math.max(1, Math.floor(textarea.scrollTop / lineHeight) + 1)
}

const getMarkdownBlockIndexAtLine = (line: number) => {
  const blocks = markdownPreviewBlocks.value
  const exactIndex = blocks.findIndex((block) => line >= block.startLine && line <= block.endLine)

  if (exactIndex >= 0) {
    return exactIndex
  }

  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    const block = blocks[index]

    if (block && block.startLine < line) {
      return index
    }
  }

  return blocks.length > 0 ? 0 : -1
}

const getPreviewBlockElements = (preview: HTMLElement) => {
  const contentRoot = preview.querySelector<HTMLElement>('[data-content-id], [data-content-body]')

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

const syncPreviewToMarkdownLine = (line: number) => {
  if (!import.meta.client) {
    return
  }

  const preview = previewScroller.value

  if (!preview) {
    return
  }

  const markdownBlockIndex = getMarkdownBlockIndexAtLine(line)
  const previewBlocks = getPreviewBlockElements(preview)

  if (markdownBlockIndex < 0 || previewBlocks.length === 0) {
    preview.scrollTop = 0
    return
  }

  const targetIndex = Math.min(markdownBlockIndex, previewBlocks.length - 1)
  const target = previewBlocks[targetIndex]

  if (!target) {
    return
  }

  const previewRect = preview.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const maxPreviewScroll = Math.max(0, preview.scrollHeight - preview.clientHeight)
  const targetScrollTop = preview.scrollTop + targetRect.top - previewRect.top - 16

  preview.scrollTop = Math.min(maxPreviewScroll, Math.max(0, targetScrollTop))
}

const syncPreviewToMarkdownCursor = () => {
  if (!import.meta.client) {
    return
  }

  const textarea = markdownTextarea.value

  if (!textarea) {
    return
  }

  syncPreviewToMarkdownLine(getMarkdownLineAtCursor(textarea))
}

const syncPreviewAfterCursorMove = async () => {
  await nextTick()
  syncPreviewToMarkdownCursor()
}

const syncPreviewAfterEditorScroll = () => {
  if (!import.meta.client) {
    return
  }

  const textarea = markdownTextarea.value

  if (!textarea) {
    return
  }

  syncPreviewToMarkdownLine(getMarkdownLineAtEditorScroll(textarea))
}

const scrollEditorIntoView = () => {
  if (!import.meta.client) {
    return
  }

  editorPreviewGrid.value?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  })
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

        <div class="flex flex-wrap gap-(--space-1)">
          <AppButton size="sm" variant="outline" :disabled="props.saving" @click="emit('exportBackup')">
            <Icon name="lucide:database-backup" mode="svg" class="h-4 w-4" aria-hidden="true" />
            备份
          </AppButton>
          <AppButton size="sm" variant="solid" @click="emit('createArticle')">
            <Icon name="lucide:plus" mode="svg" class="h-4 w-4" aria-hidden="true" />
            新增
          </AppButton>
        </div>
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
        <div class="grid grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)_220px] items-start gap-(--space-2) max-[980px]:grid-cols-2 max-[720px]:grid-cols-1">
          <label class="grid content-start gap-2 text-sm font-bold text-muted">
            标题
            <input v-model="draftTitle" class="h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid content-start gap-2 text-sm font-bold text-muted">
            文件名
            <span class="grid grid-cols-[minmax(0,1fr)_auto]">
              <input
                v-model="draftSlug"
                class="h-12 min-w-0 border border-line bg-paper px-(--space-2) font-mono text-sm text-ink outline-none focus:border-ink"
                placeholder="article-slug"
                spellcheck="false"
                @blur="normalizeDraftSlugField"
              >
              <span class="inline-flex h-12 items-center border-y border-r border-line bg-code-surface px-(--space-1) font-mono text-sm font-bold text-muted">
                .md
              </span>
            </span>
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
        class="grid min-h-0 grid-cols-[minmax(0,var(--editor-preview-split))_10px_minmax(320px,1fr)] items-stretch gap-0 min-[1181px]:h-[var(--editor-group-height)] max-[1180px]:grid-cols-1"
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
            <div class="flex min-h-10 flex-wrap items-stretch gap-1">
              <div
                v-for="group in markdownToolbarGroups"
                :key="`markdown-toolbar-group-${group.group}`"
                class="flex min-h-9 flex-wrap items-center gap-1 border-r border-line pr-1 last:border-r-0 last:pr-0"
                :aria-label="group.group"
              >
                <template
                  v-for="item in group.items"
                  :key="`markdown-toolbar-item-${group.group}-${item.label}`"
                >
                  <details
                    v-if="isMarkdownToolbarMenu(item)"
                    class="group/menu relative"
                  >
                    <summary
                      class="inline-flex h-9 min-w-9 cursor-pointer list-none items-center justify-center gap-1 border border-line bg-paper px-2 text-[13px] font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none [&::-webkit-details-marker]:hidden"
                      :title="item.label"
                      :aria-label="item.label"
                    >
                      <Icon v-if="item.icon" :name="item.icon" mode="svg" class="h-4 w-4" aria-hidden="true" />
                      <span>{{ item.label }}</span>
                      <Icon name="lucide:chevron-down" mode="svg" class="h-3.5 w-3.5 transition-transform group-open/menu:rotate-180" aria-hidden="true" />
                    </summary>
                    <div class="absolute left-0 top-[calc(100%+4px)] z-30 grid min-w-32 gap-1 border border-line bg-paper p-1 shadow-[4px_4px_0_var(--color-line)]">
                      <button
                        v-for="action in item.actions"
                        :key="`markdown-toolbar-menu-action-${group.group}-${item.label}-${action.label}`"
                        type="button"
                        class="inline-flex h-9 items-center gap-2 border border-transparent px-2 text-left text-[13px] font-bold text-ink transition-colors hover:border-line hover:bg-code-surface focus-visible:border-line focus-visible:bg-code-surface focus-visible:outline-none"
                        :title="action.label"
                        :aria-label="action.label"
                        @click="runMarkdownToolbarAction(action, $event)"
                      >
                        <Icon v-if="action.icon" :name="action.icon" mode="svg" class="h-4 w-4" aria-hidden="true" />
                        <span>{{ action.label }}</span>
                      </button>
                    </div>
                  </details>
                  <button
                    v-else
                    type="button"
                    class="inline-grid h-9 min-w-9 place-items-center border border-line bg-paper px-2 text-sm font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                    :title="item.label"
                    :aria-label="item.label"
                    @click="item.run"
                  >
                    <Icon v-if="item.icon" :name="item.icon" mode="svg" class="h-4 w-4" aria-hidden="true" />
                    <span v-else>{{ item.label }}</span>
                  </button>
                </template>
              </div>
              <details
                v-for="(group, groupIndex) in markdownTemplateGroups"
                :key="`markdown-template-group-${groupIndex}-${group.group}`"
                class="group/menu relative flex min-h-9 flex-wrap items-center gap-1 border-r border-line pr-1 last:border-r-0 last:pr-0"
                :aria-label="group.group"
              >
                <summary
                  class="inline-flex h-9 min-w-9 cursor-pointer list-none items-center justify-center gap-1 border border-line bg-paper px-2 text-[13px] font-bold text-ink transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none [&::-webkit-details-marker]:hidden"
                  :title="`模板：${group.group}`"
                  :aria-label="`模板：${group.group}`"
                >
                  <Icon name="lucide:blocks" mode="svg" class="h-4 w-4" aria-hidden="true" />
                  <span>{{ group.group }}</span>
                  <Icon name="lucide:chevron-down" mode="svg" class="h-3.5 w-3.5 transition-transform group-open/menu:rotate-180" aria-hidden="true" />
                </summary>
                <div class="absolute left-0 top-[calc(100%+4px)] z-30 grid min-w-40 gap-1 border border-line bg-paper p-1 shadow-[4px_4px_0_var(--color-line)]">
                  <button
                    v-for="template in group.templates"
                    :key="`markdown-template-${groupIndex}-${template.label}`"
                    type="button"
                    class="inline-flex h-9 items-center gap-2 border border-transparent px-2 text-left text-[13px] font-bold text-ink transition-colors hover:border-line hover:bg-code-surface focus-visible:border-line focus-visible:bg-code-surface focus-visible:outline-none"
                    :title="`插入模板：${template.label}`"
                    :aria-label="`插入模板：${template.label}`"
                    @click="insertMarkdownTemplate(template); closeToolbarMenu($event)"
                  >
                    <Icon v-if="template.icon" :name="template.icon" mode="svg" class="h-4 w-4" aria-hidden="true" />
                    <span>{{ template.label }}</span>
                  </button>
                </div>
              </details>
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
              <div class="grid gap-2 border border-line bg-code-surface p-(--space-2)">
                <div class="grid grid-cols-[minmax(120px,0.7fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)] gap-2 max-[920px]:grid-cols-2 max-[560px]:grid-cols-1">
                  <label class="grid gap-1 text-[12px] font-bold text-muted">
                    分组
                    <input
                      v-model="customMarkdownTemplateForm.group"
                      list="custom-markdown-template-groups"
                      class="min-h-10 border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-ink"
                      type="text"
                    >
                  </label>
                  <label class="grid gap-1 text-[12px] font-bold text-muted">
                    名称
                    <input
                      v-model="customMarkdownTemplateForm.label"
                      class="min-h-10 border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-ink"
                      type="text"
                      placeholder="提示块"
                    >
                  </label>
                  <label class="grid gap-1 text-[12px] font-bold text-muted">
                    图标
                    <input
                      v-model="customMarkdownTemplateForm.icon"
                      class="min-h-10 border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-ink"
                      type="text"
                      placeholder="lucide:info"
                    >
                  </label>
                  <label class="grid gap-1 text-[12px] font-bold text-muted">
                    占位文本
                    <input
                      v-model="customMarkdownTemplateForm.placeholder"
                      class="min-h-10 border border-line bg-paper px-2 text-sm text-ink outline-none focus:border-ink"
                      type="text"
                      placeholder="未选中文本时使用"
                    >
                  </label>
                </div>
                <label class="grid gap-1 text-[12px] font-bold text-muted">
                  模板内容
                  <textarea
                    v-model="customMarkdownTemplateForm.content"
                    class="min-h-28 resize-y border border-line bg-paper p-2 font-mono text-[13px] leading-[1.6] text-code-text outline-none focus:border-ink"
                    spellcheck="false"
                    placeholder="::tip&#10;{selection}&#10;::&#10;{cursor}"
                  />
                </label>
                <datalist id="custom-markdown-template-groups">
                  <option
                    v-for="group in customMarkdownTemplateGroups"
                    :key="`custom-markdown-template-group-option-${group.group}`"
                    :value="group.group"
                  />
                </datalist>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <label class="inline-flex min-h-9 items-center gap-2 text-[13px] font-bold text-muted">
                    <input
                      v-model="customMarkdownTemplateForm.block"
                      class="h-4 w-4 accent-current"
                      type="checkbox"
                    >
                    块级插入
                  </label>
                  <p v-if="customMarkdownTemplateFormError" class="m-0 text-[13px] font-bold text-ink">
                    {{ customMarkdownTemplateFormError }}
                  </p>
                  <div class="flex flex-wrap gap-1">
                    <AppButton size="sm" variant="text" @click="resetCustomMarkdownTemplateForm">
                      <Icon name="lucide:eraser" mode="svg" class="h-4 w-4" aria-hidden="true" />
                      重置表单
                    </AppButton>
                    <AppButton size="sm" @click="addCustomMarkdownTemplate">
                      <Icon name="lucide:plus" mode="svg" class="h-4 w-4" aria-hidden="true" />
                      添加模板
                    </AppButton>
                  </div>
                </div>
              </div>
              <div v-if="customMarkdownTemplateGroups.length > 0" class="grid gap-1">
                <div
                  v-for="(group, groupIndex) in customMarkdownTemplateGroups"
                  :key="`custom-markdown-template-list-group-${groupIndex}-${group.group}`"
                  class="grid gap-1 border border-line bg-paper p-2"
                >
                  <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
                    {{ group.group }}
                  </p>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="(template, templateIndex) in group.templates"
                      :key="`custom-markdown-template-list-item-${groupIndex}-${templateIndex}-${template.label}`"
                      class="inline-flex min-h-9 items-center gap-1 border border-line bg-code-surface px-2 text-[13px] font-bold text-ink"
                    >
                      <Icon v-if="template.icon" :name="template.icon" mode="svg" class="h-4 w-4" aria-hidden="true" />
                      {{ template.label }}
                      <button
                        type="button"
                        class="ml-1 inline-grid h-6 w-6 place-items-center text-muted transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                        :aria-label="`移除模板：${template.label}`"
                        @click="removeCustomMarkdownTemplate(groupIndex, templateIndex)"
                      >
                        <Icon name="lucide:x" mode="svg" class="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-(--space-2)">
                <p class="m-0 text-[13px] font-bold text-muted">
                  app.config 默认 {{ appMarkdownTemplateGroups.length }} 组 / {{ appMarkdownTemplates.length }} 个，自定义 {{ customMarkdownTemplateGroups.length }} 组 / {{ customMarkdownTemplates.length }} 个
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
            @click="scrollEditorIntoView(); syncPreviewAfterCursorMove()"
            @focus="scrollEditorIntoView"
            @keydown="undoMarkdownProgrammaticEdit"
            @keyup="syncPreviewAfterCursorMove"
            @input="syncPreviewAfterCursorMove"
            @select="syncPreviewAfterCursorMove"
            @scroll="syncPreviewAfterEditorScroll"
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
