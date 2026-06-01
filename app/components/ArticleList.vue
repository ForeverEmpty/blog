<script setup lang="ts">
type ArticleListItem = {
  path: string
  title: string
  description: string
  date: string
  category?: string
  locked?: boolean
  pinned?: boolean
  tags: string[]
}

const props = withDefaults(defineProps<{
  articles: ArticleListItem[]
  label: string
  startIndex?: number
  headingLevel?: 2 | 3
  padded?: boolean
}>(), {
  startIndex: 0,
  headingLevel: 2,
  padded: true,
})

const headingTag = computed(() => `h${props.headingLevel}`)

const categoryFilterHref = (category?: string) => ({
  path: '/blog',
  query: category ? { category } : {}
})

const tagFilterHref = (tag: string) => ({
  path: '/blog',
  query: { tag }
})
</script>

<template>
  <div
    class="grid border-t border-line"
    :class="padded ? 'px-(--space-2)' : ''"
    :aria-label="label"
  >
    <article
      v-for="(article, index) in articles"
      :key="article.path"
      class="group relative grid min-h-42 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-(--space-4) overflow-hidden border-b border-line px-(--space-2) py-(--space-4) text-ink before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-ink before:transition-transform before:duration-420 before:ease-[cubic-bezier(.2,.8,.2,1)] hover:text-paper hover:before:scale-x-100 focus-within:text-paper focus-within:before:scale-x-100 max-[760px]:min-h-34 max-[760px]:grid-cols-[48px_minmax(0,1fr)] max-[760px]:gap-(--space-2)"
    >
      <NuxtLink
        class="absolute inset-0 z-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        :href="article.path"
        :aria-label="`阅读文章：${article.title}`"
      />
      <span class="pointer-events-none relative z-2 font-display text-[28px] text-quiet transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
        {{ String(startIndex + index + 1).padStart(2, "0") }}
      </span>
      <div class="pointer-events-none relative z-2 grid min-w-0 gap-(--space-1)">
        <div class="flex flex-wrap items-center gap-x-(--space-2) gap-y-(--space-1)">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
            {{ article.date }}
          </p>
          <NuxtLink
            class="pointer-events-auto relative z-2 text-[13px] font-bold uppercase tracking-normal text-muted underline-offset-4 transition-colors duration-200 hover:underline group-hover:text-paper group-focus-within:text-paper"
            :href="categoryFilterHref(article.category)"
            :aria-label="`筛选分类：${article.category || '未分类'}`"
          >
            {{ article.category || "未分类" }}
          </NuxtLink>
          <span
            v-if="article.pinned"
            class="inline-flex items-center gap-1 border border-line px-1 py-0.5 text-[12px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:border-paper group-hover:text-paper group-focus-within:border-paper group-focus-within:text-paper"
          >
            <Icon name="lucide:pin" mode="svg" class="h-3.5 w-3.5" aria-hidden="true" />
            置顶
          </span>
          <span
            v-if="article.locked"
            class="inline-flex items-center gap-1 border border-line px-1 py-0.5 text-[12px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:border-paper group-hover:text-paper group-focus-within:border-paper group-focus-within:text-paper"
          >
            <Icon name="lucide:lock" mode="svg" class="h-3.5 w-3.5" aria-hidden="true" />
            已锁定
          </span>
        </div>
        <component
          :is="headingTag"
          class="m-0 min-w-0 truncate font-display text-[72px] font-normal leading-[0.95] tracking-normal max-[1100px]:text-[56px] max-[520px]:text-[36px]"
        >
          <span class="block truncate">
            {{ article.title }}
          </span>
        </component>
        <p class="m-0 line-clamp-3 max-w-180 text-lg leading-[1.55] text-muted text-pretty transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
          {{ article.description }}
        </p>
        <ul
          v-if="article.tags.length > 0"
          class="m-0 flex list-none flex-wrap gap-(--space-1) p-0"
          aria-label="文章标签"
        >
          <li
            v-for="tag in article.tags.slice(0, 3)"
            :key="tag"
            class="relative z-2"
          >
            <NuxtLink
              class="pointer-events-auto block border border-line px-(--space-1) py-1 text-[12px] font-bold leading-none text-muted underline-offset-4 transition-colors duration-200 hover:underline group-hover:border-paper group-hover:text-paper group-focus-within:border-paper group-focus-within:text-paper"
              :href="tagFilterHref(tag)"
              :aria-label="`筛选标签：${tag}`"
            >
              {{ tag }}
            </NuxtLink>
          </li>
        </ul>
      </div>
      <span
        class="pointer-events-none relative z-2 translate-x-4 text-sm text-quiet opacity-0 transition-[opacity,transform,color] duration-200 group-hover:translate-x-0 group-hover:text-paper group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:text-paper group-focus-within:opacity-100 max-[760px]:hidden"
        aria-hidden="true"
      >
        Read
      </span>
    </article>
  </div>
</template>
