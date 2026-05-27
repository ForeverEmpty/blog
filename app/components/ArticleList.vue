<script setup lang="ts">
type ArticleListItem = {
  path: string
  title: string
  description: string
  date: string
  category?: string
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
      <span class="relative z-1 font-display text-[28px] text-quiet transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
        {{ String(startIndex + index + 1).padStart(2, "0") }}
      </span>
      <div class="relative z-1 grid min-w-0 gap-(--space-1)">
        <div class="flex flex-wrap items-center gap-x-(--space-2) gap-y-(--space-1)">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
            {{ article.date }}
          </p>
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
            {{ article.category || "未分类" }}
          </p>
        </div>
        <component
          :is="headingTag"
          class="m-0 min-w-0 truncate font-display text-[72px] font-normal leading-[0.95] tracking-normal max-[1100px]:text-[56px] max-[520px]:text-[36px]"
        >
          <NuxtLink
            class="block truncate focus-visible:outline-none"
            :href="article.path"
          >
            {{ article.title }}
          </NuxtLink>
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
            class="border border-line px-(--space-1) py-1 text-[12px] font-bold leading-none text-muted transition-colors duration-200 group-hover:border-paper group-hover:text-paper group-focus-within:border-paper group-focus-within:text-paper"
          >
            {{ tag }}
          </li>
        </ul>
      </div>
      <span
        class="relative z-1 translate-x-4 text-sm text-quiet opacity-0 transition-[opacity,transform,color] duration-200 group-hover:translate-x-0 group-hover:text-paper group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:text-paper group-focus-within:opacity-100 max-[760px]:hidden"
        aria-hidden="true"
      >
        Read
      </span>
    </article>
  </div>
</template>
