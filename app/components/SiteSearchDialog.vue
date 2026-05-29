<script setup lang="ts">
type SiteSearchArticle = {
  path: string
  title: string
  description: string
  date: string
  category?: string
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
const searchInput = ref<HTMLInputElement | null>(null)
const { searchContentItems } = useArticleSearch()

const searchItems = computed<SiteSearchResult[]>(() => [
  ...props.articles.map((article) => ({
    ...article,
    type: 'article' as const
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

const resultTitle = (item: SiteSearchResult) => item.title || item.name || '未命名'
const resultHref = (item: SiteSearchResult) => item.type === 'project'
  ? item.launchUrl || item.sourceUrl || '/projects'
  : item.path || '/blog'

const closeSearch = () => {
  emit('close')
}

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
            <span>支持关键词、category=、tag=、type=article、type=project、status=</span>
            <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center border border-line bg-code-surface">
              <Icon name="lucide:search" mode="svg" class="ml-(--space-2) h-5 w-5 text-muted" aria-hidden="true" />
              <input
                ref="searchInput"
                v-model="query"
                class="min-h-14 border-0 bg-transparent px-(--space-2) text-lg text-ink outline-none"
                placeholder="例如：Nuxt category=工具 tag=Timer"
              />
            </div>
          </label>
        </header>

        <div class="max-h-[58vh] overflow-auto px-(--space-3)">
          <article
            v-for="item in visibleResults"
            :key="`${item.type}-${resultHref(item)}-${resultTitle(item)}`"
            class="group grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-(--space-3) border-b border-line py-(--space-3) text-ink transition-colors duration-200 hover:bg-ink hover:px-(--space-2) hover:text-paper max-[760px]:grid-cols-1"
          >
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper">
              {{ item.type === 'project' ? '项目' : '文章' }}
            </p>

            <div class="grid min-w-0 gap-1">
              <a
                class="truncate font-display text-[42px] leading-none focus-visible:outline-none max-[640px]:text-[32px]"
                :href="resultHref(item)"
                :target="item.type === 'project' ? '_blank' : undefined"
                :rel="item.type === 'project' ? 'noreferrer' : undefined"
                @click="closeSearch"
              >
                {{ resultTitle(item) }}
              </a>
              <p class="m-0 line-clamp-2 text-base leading-[1.55] text-muted transition-colors duration-200 group-hover:text-paper">
                {{ item.description }}
              </p>
              <div class="flex flex-wrap gap-(--space-1)">
                <span class="text-[12px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper">
                  {{ item.status || item.date || item.category || 'Index' }}
                </span>
                <span
                  v-for="tag in item.tags.slice(0, 4)"
                  :key="tag"
                  class="border border-line px-1 text-[12px] font-bold text-muted transition-colors duration-200 group-hover:border-paper group-hover:text-paper"
                >
                  {{ tag }}
                </span>
              </div>
            </div>

            <Icon name="lucide:arrow-up-right" mode="svg" class="h-5 w-5 text-muted transition-colors duration-200 group-hover:text-paper max-[760px]:hidden" aria-hidden="true" />
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
