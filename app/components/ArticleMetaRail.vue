<script setup lang="ts">
defineProps<{
  date: string
  author: string
  authorUrl?: string
  category?: string
  tags?: string[]
  wordCount: number
  readingMinutes: number
  views?: number
}>()

const formatCount = (value: number) => value.toLocaleString('zh-CN')
</script>

<template>
  <aside
    class="border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
    aria-label="文章信息"
  >
    <div class="sticky top-24 max-h-[calc(100vh_-_var(--space-12))] overflow-y-auto max-[760px]:static max-[760px]:max-h-none max-[760px]:overflow-visible">
      <div class="grid gap-(--space-4) max-[760px]:grid-cols-[auto_1fr] max-[760px]:items-end">
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal">
          Article
        </p>
        <p class="m-0 font-display text-[44px] leading-none text-ink max-[760px]:justify-self-end max-[760px]:text-[32px]">
          {{ date }}
        </p>
      </div>

      <dl class="mt-(--space-6) grid gap-0 border-t border-line max-[760px]:mt-(--space-3) max-[760px]:grid-cols-2">
        <div class="grid gap-1 border-b border-line py-(--space-2) max-[760px]:pr-(--space-2)">
          <dt class="text-[12px] font-bold uppercase tracking-normal text-quiet">Words</dt>
          <dd class="m-0 font-display text-[32px] leading-none text-ink">
            {{ formatCount(wordCount) }}
          </dd>
        </div>

        <div class="grid gap-1 border-b border-line py-(--space-2) max-[760px]:pr-(--space-2)">
          <dt class="text-[12px] font-bold uppercase tracking-normal text-quiet">Read Time</dt>
          <dd class="m-0 font-display text-[32px] leading-none text-ink">
            {{ readingMinutes }} min
          </dd>
        </div>

        <div class="grid gap-1 border-b border-line py-(--space-2) max-[760px]:pr-(--space-2)">
          <dt class="text-[12px] font-bold uppercase tracking-normal text-quiet">Views</dt>
          <dd class="m-0 font-display text-[32px] leading-none text-ink">
            {{ typeof views === 'number' ? formatCount(views) : '—' }}
          </dd>
        </div>

        <div class="grid gap-1 border-b border-line py-(--space-2) max-[760px]:pr-(--space-2)">
          <dt class="text-[12px] font-bold uppercase tracking-normal text-quiet">Author</dt>
          <dd class="m-0 text-base font-bold leading-tight text-ink break-words">
            <a
              v-if="authorUrl"
              class="underline underline-offset-4 transition-colors duration-200 hover:text-muted focus-visible:text-muted focus-visible:outline-none"
              :href="authorUrl"
            >
              {{ author }}
            </a>
            <span v-else>{{ author }}</span>
          </dd>
        </div>

        <div class="grid gap-1 border-b border-line py-(--space-2) max-[760px]:pr-(--space-2)">
          <dt class="text-[12px] font-bold uppercase tracking-normal text-quiet">Category</dt>
          <dd class="m-0 text-base font-bold leading-tight text-ink break-words">
            {{ category || '未分类' }}
          </dd>
        </div>

        <div class="grid gap-2 border-b border-line py-(--space-2) max-[760px]:col-span-2">
          <dt class="text-[12px] font-bold uppercase tracking-normal text-quiet">Tags</dt>
          <dd v-if="tags && tags.length > 0" class="m-0 flex flex-wrap gap-(--space-1)">
            <span
              v-for="tag in tags"
              :key="tag"
              class="border border-line px-(--space-1) py-1 text-[12px] font-bold leading-none text-ink"
            >
              {{ tag }}
            </span>
          </dd>
          <dd v-else class="m-0 text-base font-bold leading-tight text-ink">
            未标记
          </dd>
        </div>
      </dl>
    </div>
  </aside>
</template>
