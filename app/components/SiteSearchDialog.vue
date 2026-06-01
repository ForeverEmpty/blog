<script setup lang="ts">
type SiteSearchArticle = {
  path: string
  title: string
  description: string
  date: string
  category?: string
  locked?: boolean
  pinned?: boolean
  tags: string[]
  author?: string
}

type SiteSearchProject = {
  id?: string
  name: string
  description: string
  status: string
  category: string
  sourceUrl: string
  launchUrl: string
  tags: string[]
}

type SiteSearchResult = {
  type: 'article' | 'project'
  title?: string
  name?: string
  description: string
  category?: string
  status?: string
  locked?: boolean
  pinned?: boolean
  tags: string[]
  date?: string
  path?: string
  launchUrl?: string
  sourceUrl?: string
  author?: string
}

const props = defineProps<{
  open: boolean
  articles: SiteSearchArticle[]
  projects: SiteSearchProject[]
}>()

const emit = defineEmits<{
  close: []
}>()

const query = ref('')
const activeIndex = ref(0)
const searchInput = ref<HTMLInputElement | null>(null)
const { getSearchHighlightTerms, searchContentItems } = useArticleSearch()

const searchItems = computed<SiteSearchResult[]>(() => [
  ...props.articles.map((article) => ({
    ...article,
    type: 'article' as const,
    status: article.locked ? '已锁定' : article.pinned ? '已置顶' : '已发布'
  })),
  ...props.projects.map((project) => ({
    ...project,
    type: 'project' as const
  }))
])

const visibleResults = computed(() => {
  if (!query.value.trim()) {
    return searchItems.value.slice(0, 8)
  }

  return searchContentItems(searchItems.value, query.value).slice(0, 12)
})

const quickCategories = computed(() => (
  Array.from(new Set(searchItems.value.map((item) => item.category).filter(Boolean)))
    .slice(0, 6) as string[]
))
const quickTags = computed(() => (
  Array.from(new Set(searchItems.value.flatMap((item) => item.tags || []).filter(Boolean)))
    .slice(0, 8)
))
const highlightTerms = computed(() => getSearchHighlightTerms(query.value))
const resultTitle = (item: SiteSearchResult) => item.title || item.name || '未命名'
const resultHref = (item: SiteSearchResult) => item.type === 'project'
  ? item.launchUrl || item.sourceUrl || '/projects'
  : item.path || '/blog'

const makeFilterExpression = (key: string, value: string) => `${key}="${value.replaceAll('"', '\\"')}"`

const toggleFilterExpression = (expression: string) => {
  const current = query.value.trim()

  query.value = current.includes(expression)
    ? current.replace(expression, '').replace(/\s+/g, ' ').trim()
    : [current, expression].filter(Boolean).join(' ')
}

const getHighlightedSegments = (value: string | undefined) => {
  const text = value || ''
  const terms = highlightTerms.value
    .map((term) => term.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)

  if (terms.length === 0 || !text) {
    return [{ text, matched: false }]
  }

  const lowerText = text.toLocaleLowerCase()
  const segments: { text: string, matched: boolean }[] = []
  let cursor = 0

  while (cursor < text.length) {
    let nextIndex = -1
    let nextTerm = ''

    for (const term of terms) {
      const index = lowerText.indexOf(term.toLocaleLowerCase(), cursor)

      if (index >= 0 && (nextIndex < 0 || index < nextIndex)) {
        nextIndex = index
        nextTerm = term
      }
    }

    if (nextIndex < 0) {
      segments.push({ text: text.slice(cursor), matched: false })
      break
    }

    if (nextIndex > cursor) {
      segments.push({ text: text.slice(cursor, nextIndex), matched: false })
    }

    segments.push({ text: text.slice(nextIndex, nextIndex + nextTerm.length), matched: true })
    cursor = nextIndex + nextTerm.length
  }

  return segments
}

const openResult = (item: SiteSearchResult | undefined) => {
  if (!item || !import.meta.client) {
    return
  }

  const href = resultHref(item)

  closeSearch()

  if (item.type === 'project') {
    window.open(href, '_blank', 'noreferrer')
    return
  }

  window.location.href = href
}

const selectNextResult = () => {
  if (visibleResults.value.length === 0) {
    return
  }

  activeIndex.value = (activeIndex.value + 1) % visibleResults.value.length
}

const selectPreviousResult = () => {
  if (visibleResults.value.length === 0) {
    return
  }

  activeIndex.value = (activeIndex.value - 1 + visibleResults.value.length) % visibleResults.value.length
}

const closeSearch = () => {
  emit('close')
}

watch(query, () => {
  activeIndex.value = 0
})

watch(visibleResults, (results) => {
  if (activeIndex.value >= results.length) {
    activeIndex.value = Math.max(0, results.length - 1)
  }
})

watch(
  () => props.open,
  async (isOpen) => {
    if (!import.meta.client || !isOpen) {
      return
    }

    await nextTick()
    searchInput.value?.focus()
  }
)
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 grid bg-[color-mix(in_oklch,var(--ink),transparent_18%)] p-(--space-4) backdrop-blur-sm max-[640px]:p-(--space-2)"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-search-title"
      @keydown.esc="closeSearch"
    >
      <button
        class="absolute inset-0 cursor-default"
        type="button"
        aria-label="关闭搜索"
        @click="closeSearch"
      />

      <section class="relative z-1 mx-auto mt-[8vh] grid w-full max-w-250 content-start border border-line bg-paper shadow-[0_24px_80px_color-mix(in_oklch,var(--ink),transparent_72%)]">
        <header class="grid gap-(--space-2) border-b border-line p-(--space-3)">
          <div class="flex items-center justify-between gap-(--space-2)">
            <div class="grid gap-1">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                Search
              </p>
              <h2 id="site-search-title" class="m-0 font-display text-[56px] font-normal leading-none max-[640px]:text-[40px]">
                搜索文章和项目
              </h2>
            </div>
            <AppButton variant="icon" aria-label="关闭搜索" @click="closeSearch">
              <Icon name="lucide:x" mode="svg" class="h-5 w-5" aria-hidden="true" />
            </AppButton>
          </div>

          <label class="grid gap-2 text-sm font-bold text-muted">
            <span>支持关键词、短语、category=、tag=、type=article、type=project、status=、-tag=、locked=true</span>
            <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center border border-line bg-code-surface">
              <Icon name="lucide:search" mode="svg" class="ml-(--space-2) h-5 w-5 text-muted" aria-hidden="true" />
              <input
                ref="searchInput"
                v-model="query"
                class="min-h-14 border-0 bg-transparent px-(--space-2) text-lg text-ink outline-none"
                placeholder="例如：Nuxt category=工具 -tag=草稿"
                @keydown.down.prevent="selectNextResult"
                @keydown.up.prevent="selectPreviousResult"
                @keydown.enter.prevent="openResult(visibleResults[activeIndex])"
              />
            </div>
          </label>

          <div class="flex flex-wrap gap-(--space-1)" aria-label="搜索快捷筛选">
            <button
              type="button"
              class="inline-flex min-h-8 items-center gap-1 border border-line px-(--space-1) text-[12px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
              @click="toggleFilterExpression('type=article')"
            >
              文章
            </button>
            <button
              type="button"
              class="inline-flex min-h-8 items-center gap-1 border border-line px-(--space-1) text-[12px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
              @click="toggleFilterExpression('type=project')"
            >
              项目
            </button>
            <button
              v-for="category in quickCategories"
              :key="`category-${category}`"
              type="button"
              class="inline-flex min-h-8 items-center gap-1 border border-line px-(--space-1) text-[12px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
              @click="toggleFilterExpression(makeFilterExpression('category', category))"
            >
              {{ category }}
            </button>
            <button
              v-for="tag in quickTags"
              :key="`tag-${tag}`"
              type="button"
              class="inline-flex min-h-8 items-center gap-1 border border-line px-(--space-1) text-[12px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
              @click="toggleFilterExpression(makeFilterExpression('tag', tag))"
            >
              #{{ tag }}
            </button>
          </div>
        </header>

        <div class="max-h-[58vh] overflow-auto px-(--space-3)">
          <article
            v-for="(item, index) in visibleResults"
            :key="`${item.type}-${resultHref(item)}-${resultTitle(item)}`"
            class="group grid cursor-pointer grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-(--space-3) border-b border-line py-(--space-3) text-ink transition-[background-color,color,padding] duration-200 hover:bg-ink hover:px-(--space-2) hover:text-paper max-[760px]:grid-cols-1"
            :class="activeIndex === index ? 'bg-ink px-(--space-2) text-paper' : ''"
            @mouseenter="activeIndex = index"
            @click="openResult(item)"
          >
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper" :class="activeIndex === index ? 'text-paper' : ''">
              {{ item.type === 'project' ? '项目' : '文章' }}
            </p>

            <div class="grid min-w-0 gap-1">
              <a
                class="truncate font-display text-[42px] leading-none focus-visible:outline-none max-[640px]:text-[32px]"
                :href="resultHref(item)"
                :target="item.type === 'project' ? '_blank' : undefined"
                :rel="item.type === 'project' ? 'noreferrer' : undefined"
                @click.stop="closeSearch"
              >
                <span
                  v-for="(segment, segmentIndex) in getHighlightedSegments(resultTitle(item))"
                  :key="`title-${segmentIndex}-${segment.text}`"
                  :class="segment.matched ? 'bg-callout-warning-surface px-0.5 text-ink group-hover:bg-paper' : ''"
                >{{ segment.text }}</span>
              </a>
              <p class="m-0 line-clamp-2 text-base leading-[1.55] text-muted transition-colors duration-200 group-hover:text-paper" :class="activeIndex === index ? 'text-paper' : ''">
                <span
                  v-for="(segment, segmentIndex) in getHighlightedSegments(item.description)"
                  :key="`description-${segmentIndex}-${segment.text}`"
                  :class="segment.matched ? 'bg-callout-warning-surface px-0.5 text-ink group-hover:bg-paper' : ''"
                >{{ segment.text }}</span>
              </p>
              <div class="flex flex-wrap gap-(--space-1)">
                <span class="text-[12px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper" :class="activeIndex === index ? 'text-paper' : ''">
                  {{ item.status || item.date || item.category || 'Index' }}
                </span>
                <span
                  v-if="item.pinned"
                  class="inline-flex items-center gap-1 border border-line px-1 text-[12px] font-bold text-muted transition-colors duration-200 group-hover:border-paper group-hover:text-paper"
                  :class="activeIndex === index ? 'border-paper text-paper' : ''"
                >
                  <Icon name="lucide:pin" mode="svg" class="h-3.5 w-3.5" aria-hidden="true" />
                  置顶
                </span>
                <span
                  v-if="item.locked"
                  class="inline-flex items-center gap-1 border border-line px-1 text-[12px] font-bold text-muted transition-colors duration-200 group-hover:border-paper group-hover:text-paper"
                  :class="activeIndex === index ? 'border-paper text-paper' : ''"
                >
                  <Icon name="lucide:lock" mode="svg" class="h-3.5 w-3.5" aria-hidden="true" />
                  锁定
                </span>
                <span
                  v-for="tag in item.tags.slice(0, 4)"
                  :key="tag"
                  class="border border-line px-1 text-[12px] font-bold text-muted transition-colors duration-200 group-hover:border-paper group-hover:text-paper"
                  :class="activeIndex === index ? 'border-paper text-paper' : ''"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <Icon name="lucide:arrow-up-right" mode="svg" class="h-5 w-5 text-muted transition-colors duration-200 group-hover:text-paper max-[760px]:hidden" :class="activeIndex === index ? 'text-paper' : ''" aria-hidden="true" />
          </article>

          <div v-if="visibleResults.length === 0" class="grid min-h-44 place-items-center border-b border-line text-muted">
            <p class="m-0 text-lg font-bold">
              没有匹配结果。
            </p>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
