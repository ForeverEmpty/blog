<script setup lang="ts">
defineProps<{
  words: string[]
  title: string
  description: string
  articles?: {
    path: string
    title: string
    description: string
    date: string
    category?: string
    locked?: boolean
    pinned?: boolean
    tags?: string[]
  }[]
}>()

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
  <section
    id="writing-index"
    class="grid grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-t border-line bg-paper max-[760px]:grid-cols-1"
    aria-labelledby="index-title"
  >
    <aside
      class="min-h-180 border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:flex max-[760px]:min-h-0 max-[760px]:justify-between max-[760px]:gap-(--space-3) max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
      aria-label="内容索引"
    >
      <span class="sticky top-32 mb-(--space-4) block text-[13px] font-bold uppercase tracking-normal max-[760px]:static">
        Index
      </span>
      <ol
        class="sticky top-46 m-0 grid list-none gap-(--space-2) p-0 font-display text-[44px] leading-none max-[760px]:static max-[760px]:flex max-[760px]:flex-wrap max-[760px]:justify-end max-[760px]:text-2xl"
      >
        <li v-for="word in words" :key="word">{{ word }}</li>
      </ol>
    </aside>

    <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
      <div class="mb-(--space-8) grid max-w-230 gap-(--space-2)">
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">Writing Index</p>
        <h2
          id="index-title"
          class="m-0 font-display text-[88px] font-normal leading-[0.95] tracking-normal text-pretty max-[1100px]:text-[64px] max-[520px]:text-[40px]"
        >
          {{ title }}
        </h2>
        <p class="m-0 max-w-180 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
          {{ description }}
        </p>
      </div>

      <div
        v-if="articles && articles.length > 0"
        class="grid border-t border-line px-(--space-2)"
        aria-label="最新文章列表"
      >
        <article
          v-for="(article, index) in articles"
          :key="article.path"
          class="group relative grid min-h-38 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-(--space-4) overflow-hidden border-b border-line px-(--space-2) py-(--space-4) text-ink before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-ink before:transition-transform before:duration-420 before:ease-[cubic-bezier(.2,.8,.2,1)] hover:text-paper hover:before:scale-x-100 focus-within:text-paper focus-within:before:scale-x-100 max-[760px]:min-h-34 max-[760px]:grid-cols-[48px_minmax(0,1fr)] max-[760px]:gap-(--space-2)"
        >
          <NuxtLink
            class="absolute inset-0 z-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            :href="article.path"
            :aria-label="`阅读文章：${article.title}`"
          />
          <span class="pointer-events-none relative z-2 font-display text-[28px] text-quiet transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
            0{{ index + 1 }}
          </span>
          <div class="pointer-events-none relative z-2 grid min-w-0 gap-(--space-1)">
            <div class="flex flex-wrap items-center gap-x-(--space-2) gap-y-(--space-1)">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                {{ article.date }}
              </p>
              <NuxtLink
                class="pointer-events-auto text-[13px] font-bold uppercase tracking-normal text-muted underline-offset-4 transition-colors duration-200 hover:underline group-hover:text-paper group-focus-within:text-paper"
                :href="categoryFilterHref(article.category)"
                :aria-label="`筛选分类：${article.category || '未分类'}`"
              >
                {{ article.category || '未分类' }}
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
            <h3 class="m-0 truncate font-display text-[72px] font-normal leading-[0.95] tracking-normal max-[1100px]:text-[56px] max-[520px]:text-[36px]">
              <span class="block truncate">
                {{ article.title }}
              </span>
            </h3>
            <p class="m-0 line-clamp-3 max-w-180 text-lg leading-[1.55] text-muted text-pretty transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
              {{ article.description }}
            </p>
            <ul
              v-if="(article.tags || []).length > 0"
              class="m-0 flex list-none flex-wrap gap-(--space-1) p-0"
              aria-label="文章标签"
            >
              <li
                v-for="tag in (article.tags || []).slice(0, 3)"
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

      <div
        v-else
        class="grid border-t border-line px-(--space-2)"
        aria-label="最新文章空状态"
      >
        <div class="grid min-h-38 items-center border-b border-line py-(--space-4)">
          <p class="m-0 max-w-170 text-lg leading-[1.6] text-muted text-pretty">
            文章正在整理中。
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
