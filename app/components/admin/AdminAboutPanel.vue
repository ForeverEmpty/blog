<script setup lang="ts">
import { parseMarkdownPreviewBlocks } from '~/utils/adminMarkdownPreview'

const props = defineProps<{
  saving: boolean
  previewValue: unknown | null
  previewPending: boolean
  previewError: string
}>()

const emit = defineEmits<{
  saveAbout: []
  exportBackup: []
}>()

const aboutTitle = defineModel<string>('aboutTitle', { required: true })
const aboutDescription = defineModel<string>('aboutDescription', { required: true })
const aboutMarkdown = defineModel<string>('aboutMarkdown', { required: true })

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
const customMarkdownTemplatesSource = ref('')
const editorPreviewGrid = ref<HTMLElement | null>(null)
const markdownTextarea = ref<HTMLTextAreaElement | null>(null)
const previewScroller = ref<HTMLElement | null>(null)
const editorPreviewSplit = ref(58)
const resizingEditorPreview = ref(false)
const markdownEditHistory = ref<MarkdownEditHistoryEntry[]>([])
const markdownPreviewBlocks = computed(() => parseMarkdownPreviewBlocks(aboutMarkdown.value))
const editorPreviewGridStyle = computed(() => ({
  '--editor-preview-split': `${editorPreviewSplit.value}%`,
  '--editor-group-height': 'min(880px, calc(100vh - 128px))',
  '--editor-panel-height': 'min(430px, calc((100vh - 160px) / 2))'
}))

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

const customMarkdownTemplateGroups = computed(() => {
  const source = customMarkdownTemplatesSource.value.trim()

  if (!source) {
    return []
  }

  try {
    return parseMarkdownTemplateGroups(JSON.parse(source) as unknown, '自定义')
  } catch {
    return []
  }
})
const appMarkdownTemplateGroups = computed(() => parseMarkdownTemplateGroups(appConfig.admin?.markdownTemplates, '内置模板'))
const markdownTemplateGroups = computed(() => [
  ...appMarkdownTemplateGroups.value,
  ...customMarkdownTemplateGroups.value
])

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
  const before = aboutMarkdown.value
  const selectionBefore: [number, number] = [
    textarea?.selectionStart ?? before.length,
    textarea?.selectionEnd ?? before.length
  ]

  if (trackUndo) {
    pushMarkdownEditHistory(before, value, selectionBefore, [selectionStart, selectionEnd])
  }

  aboutMarkdown.value = value
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

  if (!entry || aboutMarkdown.value !== entry.after) {
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
  const value = aboutMarkdown.value
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
  const value = aboutMarkdown.value
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
  const value = aboutMarkdown.value
  const start = textarea?.selectionStart ?? value.length
  const end = textarea?.selectionEnd ?? value.length
  const selected = value.slice(start, end)
  const content = selected || '代码内容'
  const block = `\`\`\`\n${content}\n\`\`\``

  await insertBlockMarkdown(block, 4, content.length)
}

const insertMarkdownLinePrefix = async (prefix: string, placeholder: string, numbered = false) => {
  const textarea = markdownTextarea.value
  const value = aboutMarkdown.value
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
  const value = aboutMarkdown.value
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
    const block = blocks[index]

    if (block && block.startLine < line) {
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

  if (!target) {
    return
  }

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
})
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="关于页面管理">
    <section class="grid border-y border-line" aria-label="关于页面说明">
      <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-(--space-2) border-b border-line p-(--space-2) max-[860px]:grid-cols-1">
        <div class="grid gap-1">
          <h2 class="m-0 font-display text-[40px] font-normal leading-none">
            关于
          </h2>
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            content/about.md
          </p>
        </div>
        <p class="m-0 max-w-180 text-sm leading-[1.6] text-muted text-pretty">
          这里会直接修改前台关于页使用的 Nuxt Content 文件。保存后刷新关于页即可看到最新内容。
        </p>
        <div class="flex flex-wrap gap-(--space-1)">
          <AppButton variant="outline" :disabled="props.saving" @click="emit('exportBackup')">
            <Icon name="lucide:database-backup" mode="svg" class="h-4 w-4" aria-hidden="true" />
            备份
          </AppButton>
          <AppButton variant="solid" :loading="props.saving" @click="emit('saveAbout')">
            <Icon name="lucide:save" mode="svg" class="h-4 w-4" aria-hidden="true" />
            保存关于
          </AppButton>
        </div>
      </div>

      <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-(--space-3) p-(--space-2) max-[1080px]:grid-cols-1">
        <label class="grid gap-2 text-sm font-bold text-muted">
          标题
          <input
            v-model="aboutTitle"
            class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink"
          >
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          描述
          <input
            v-model="aboutDescription"
            class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink"
          >
        </label>
      </div>
    </section>

    <div
      ref="editorPreviewGrid"
      class="grid min-h-0 grid-cols-[minmax(0,var(--editor-preview-split))_10px_minmax(320px,1fr)] items-stretch gap-0 min-[1181px]:h-[var(--editor-group-height)] max-[1180px]:grid-cols-1"
      :class="resizingEditorPreview ? 'select-none' : ''"
      :style="editorPreviewGridStyle"
      aria-label="关于页面编辑与预览"
    >
      <section class="grid h-[var(--editor-panel-height)] min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden border border-line min-[1181px]:h-full" aria-label="Markdown 原文编辑">
        <div class="flex min-h-12 items-center justify-between gap-(--space-2) border-b border-line px-(--space-2)">
          <h3 class="m-0 text-sm font-bold uppercase tracking-normal text-muted">
            Markdown
          </h3>
          <span class="text-[13px] font-bold text-muted">
            {{ aboutMarkdown.length }} chars
          </span>
        </div>
        <div class="grid gap-1 border-b border-line bg-paper px-(--space-2) py-1" aria-label="Markdown 快捷栏">
          <div class="flex min-h-10 flex-wrap items-stretch gap-1">
            <div
              v-for="group in markdownToolbarGroups"
              :key="`about-markdown-toolbar-group-${group.group}`"
              class="flex min-h-9 flex-wrap items-center gap-1 border-r border-line pr-1 last:border-r-0 last:pr-0"
              :aria-label="group.group"
            >
              <template
                v-for="item in group.items"
                :key="`about-markdown-toolbar-item-${group.group}-${item.label}`"
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
                      :key="`about-markdown-toolbar-menu-action-${group.group}-${item.label}-${action.label}`"
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
              :key="`about-markdown-template-group-${groupIndex}-${group.group}`"
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
                  :key="`about-markdown-template-${groupIndex}-${template.label}`"
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
          </div>
        </div>
        <textarea
          ref="markdownTextarea"
          v-model="aboutMarkdown"
          class="h-full min-h-0 resize-none overflow-auto overscroll-contain border-0 bg-code-surface p-(--space-3) font-mono text-[15px] leading-[1.75] text-code-text outline-none"
          spellcheck="false"
          @click="scrollEditorIntoView(); syncPreviewAfterCursorMove()"
          @focus="scrollEditorIntoView"
          @keydown="undoMarkdownProgrammaticEdit"
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

      <article class="grid h-[var(--editor-panel-height)] min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-line bg-paper min-[1181px]:h-full">
        <div class="flex min-h-12 items-center justify-between gap-(--space-2) border-b border-line px-(--space-2)">
          <h3 class="m-0 text-sm font-bold uppercase tracking-normal text-muted">
            Preview
          </h3>
          <span class="text-[13px] font-bold text-muted">
            {{ props.previewPending ? 'MDC 渲染中' : '关于页预览' }}
          </span>
        </div>
        <div ref="previewScroller" class="h-full min-h-0 overflow-auto overscroll-contain px-(--space-3) py-(--space-4) max-[760px]:px-(--space-2)">
          <header class="grid gap-(--space-2)">
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              About
            </p>
            <h2 class="m-0 break-words font-display text-[72px] font-normal leading-[0.95] tracking-normal max-[760px]:text-[48px] max-[520px]:text-[38px]">
              {{ aboutTitle }}
            </h2>
            <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
              {{ aboutDescription }}
            </p>
          </header>
          <p v-if="props.previewError" class="m-0 mt-(--space-3) border border-line p-(--space-2) text-muted">
            {{ props.previewError }}
          </p>
          <ContentBody v-else-if="props.previewValue" class="mt-(--space-4)" :value="props.previewValue" />
        </div>
      </article>
    </div>
  </section>
</template>
