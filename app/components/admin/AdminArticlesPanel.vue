<script setup lang="ts">
import type { ManagedArticle, PreviewArticle } from '~/types/admin'
import { parseMarkdownPreviewBlocks } from '~/utils/adminMarkdownPreview'

const props = defineProps<{
  managedArticles: ManagedArticle[]
  filteredManagedArticles: ManagedArticle[]
  articleCategories: string[]
  articleTags: string[]
  selectedArticleId: string
  saving: boolean
  previewValue: unknown | null
  previewPending: boolean
  previewError: string
  previewArticle: PreviewArticle
}>()

const emit = defineEmits<{
  createArticle: []
  selectArticle: [article: ManagedArticle]
  toggleArticleLock: [article: ManagedArticle]
  deleteArticle: [article: ManagedArticle]
  saveDraft: []
}>()

const articleSearchQuery = defineModel<string>('articleSearchQuery', { required: true })
const articleCategoryFilter = defineModel<string>('articleCategoryFilter', { required: true })
const articleTagFilter = defineModel<string>('articleTagFilter', { required: true })
const articleStateFilter = defineModel<string>('articleStateFilter', { required: true })
const draftTitle = defineModel<string>('draftTitle', { required: true })
const draftDate = defineModel<string>('draftDate', { required: true })
const draftCategory = defineModel<string>('draftCategory', { required: true })
const draftTags = defineModel<string>('draftTags', { required: true })
const draftDescription = defineModel<string>('draftDescription', { required: true })
const draftPublished = defineModel<boolean>('draftPublished', { required: true })
const draftLocked = defineModel<boolean>('draftLocked', { required: true })
const draftMarkdown = defineModel<string>('draftMarkdown', { required: true })

const editorPreviewGrid = ref<HTMLElement | null>(null)
const markdownTextarea = ref<HTMLTextAreaElement | null>(null)
const previewScroller = ref<HTMLElement | null>(null)
const editorPreviewSplit = ref(68)
const resizingEditorPreview = ref(false)
const editorPreviewGridStyle = computed(() => ({
  '--editor-preview-split': `${editorPreviewSplit.value}%`
}))
const markdownPreviewBlocks = computed(() => parseMarkdownPreviewBlocks(draftMarkdown.value))

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

watch(
  () => props.previewValue,
  async () => {
    await nextTick()
    syncPreviewToMarkdownCursor()
  }
)

onBeforeUnmount(stopEditorPreviewResize)
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
              <option value="published">已发布</option>
              <option value="draft">草稿</option>
              <option value="locked">已上锁</option>
              <option value="unlocked">未上锁</option>
            </select>
          </label>
        </div>

        <AppButton size="sm" variant="solid" @click="emit('createArticle')">
          <Icon name="lucide:plus" mode="svg" class="h-4 w-4" aria-hidden="true" />
          新增
        </AppButton>
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
                {{ article.published ? '已发布' : '草稿' }} / {{ article.locked ? '已上锁' : '未上锁' }} / {{ article.views }} views
              </span>
              <span class="truncate text-[13px] font-bold uppercase tracking-normal text-muted">
                {{ article.date }} / {{ article.category }}
              </span>
            </button>
            <div class="flex flex-wrap gap-(--space-1)">
              <AppButton size="sm" :disabled="props.saving" @click="emit('toggleArticleLock', article)">
                <Icon :name="article.locked ? 'lucide:lock-open' : 'lucide:lock'" mode="svg" class="h-4 w-4" aria-hidden="true" />
                {{ article.locked ? '解锁' : '上锁' }}
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

    <section class="grid gap-(--space-3)" aria-label="文章编辑器">
      <div class="grid grid-cols-4 gap-(--space-2) max-[980px]:grid-cols-2 max-[720px]:grid-cols-1">
        <label class="grid gap-2 text-sm font-bold text-muted">
          标题
          <input v-model="draftTitle" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          发布日期
          <input v-model="draftDate" type="date" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          分类
          <input v-model="draftCategory" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          标签
          <input v-model="draftTags" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="用逗号分隔">
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted max-[720px]:col-span-1 min-[721px]:col-span-2 min-[981px]:col-span-4">
          摘要
          <textarea v-model="draftDescription" rows="3" class="resize-y border border-line bg-paper p-(--space-2) text-base leading-[1.6] text-ink outline-none focus:border-ink" />
        </label>
      </div>

      <div class="flex flex-wrap items-center gap-(--space-1)">
        <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
          <input v-model="draftPublished" type="checkbox" class="accent-ink">
          发布
        </label>
        <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
          <input v-model="draftLocked" type="checkbox" class="accent-ink">
          上锁
        </label>
        <AppButton variant="solid" :loading="props.saving" @click="emit('saveDraft')">
          <Icon name="lucide:save" mode="svg" class="h-4 w-4" aria-hidden="true" />
          保存
        </AppButton>
      </div>

      <div
        ref="editorPreviewGrid"
        class="grid grid-cols-[minmax(0,var(--editor-preview-split))_10px_minmax(320px,1fr)] gap-0 [--editor-panel-height:880px] min-[1680px]:[--editor-panel-height:960px] max-[1180px]:grid-cols-1 max-[1180px]:[--editor-panel-height:560px] max-[720px]:[--editor-panel-height:420px]"
        :class="resizingEditorPreview ? 'select-none' : ''"
        :style="editorPreviewGridStyle"
      >
        <section class="grid grid-rows-[auto_minmax(0,1fr)] border border-line" aria-label="Markdown 原文编辑">
          <div class="flex min-h-12 items-center justify-between gap-(--space-2) border-b border-line px-(--space-2)">
            <h3 class="m-0 text-sm font-bold uppercase tracking-normal text-muted">
              Markdown
            </h3>
            <span class="text-[13px] font-bold text-muted">
              {{ draftMarkdown.length }} chars
            </span>
          </div>
          <textarea
            ref="markdownTextarea"
            v-model="draftMarkdown"
            class="h-[var(--editor-panel-height)] min-h-0 resize-none overflow-auto border-0 bg-code-surface p-(--space-3) font-mono text-[15px] leading-[1.75] text-code-text outline-none"
            spellcheck="false"
            @click="syncPreviewAfterCursorMove"
            @keyup="syncPreviewAfterCursorMove"
            @input="syncPreviewAfterCursorMove"
            @select="syncPreviewAfterCursorMove"
          />
        </section>

        <button
          type="button"
          class="group grid cursor-col-resize place-items-center border-y border-line bg-paper transition-colors duration-200 hover:bg-ink focus-visible:bg-ink focus-visible:outline-none max-[1180px]:hidden"
          aria-label="拖动调整 Markdown 编辑区和预览区宽度"
          @pointerdown="startEditorPreviewResize"
        >
          <span class="h-16 w-px bg-line transition-colors duration-200 group-hover:bg-paper group-focus-visible:bg-paper" aria-hidden="true" />
        </button>

        <section class="grid grid-rows-[auto_minmax(0,1fr)] border border-line bg-paper" aria-label="文章页预览">
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
            class="h-[var(--editor-panel-height)] overflow-auto px-(--space-3) py-(--space-4) max-[760px]:px-(--space-2)"
          >
            <header class="grid gap-(--space-2)">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                {{ props.previewArticle.date }} / {{ props.previewArticle.category }}
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
  </section>
</template>
