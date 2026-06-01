<script setup lang="ts">
import type { AdminStat, ManagedArticle, ManagedComment, ManagedProject } from '~/types/admin'

defineProps<{
  stats: AdminStat[]
  latestArticles: ManagedArticle[]
  latestProjects: ManagedProject[]
  latestComments: ManagedComment[]
  commentsLoading: boolean
  commentsError: string
}>()
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="后台总览">
    <div class="grid grid-cols-4 border-y border-line max-[1180px]:grid-cols-2 max-[560px]:grid-cols-1">
      <article
        v-for="stat in stats"
        :key="stat.label"
        class="grid min-h-44 content-between border-r border-line p-(--space-3) last:border-r-0 max-[1180px]:border-b max-[560px]:border-r-0"
      >
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
          {{ stat.label }}
        </p>
        <div class="grid gap-(--space-1)">
          <p class="m-0 font-display text-[72px] leading-none text-ink max-[760px]:text-[56px]">
            {{ stat.value }}
          </p>
          <p class="m-0 text-sm leading-[1.6] text-muted">
            {{ stat.detail }}
          </p>
        </div>
      </article>
    </div>

    <div class="grid grid-cols-3 gap-(--space-4) max-[1120px]:grid-cols-1">
      <section class="grid content-start border-t border-line" aria-labelledby="latest-articles-title">
        <div class="grid gap-1 border-b border-line py-(--space-2)">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Articles
          </p>
          <h2 id="latest-articles-title" class="m-0 font-display text-[48px] font-normal leading-none max-[520px]:text-[36px]">
            最新文章
          </h2>
        </div>
        <article
          v-for="article in latestArticles"
          :key="article.id"
          class="grid gap-1 border-b border-line py-(--space-2)"
        >
          <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
            {{ article.date }} / {{ article.category }}
          </p>
          <h3 class="m-0 truncate text-lg font-bold text-ink">
            {{ article.title }}
          </h3>
          <p class="m-0 line-clamp-2 text-sm leading-[1.6] text-muted">
            {{ article.description }}
          </p>
        </article>
        <p v-if="latestArticles.length === 0" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
          暂无文章。
        </p>
      </section>

      <section class="grid content-start border-t border-line" aria-labelledby="latest-projects-title">
        <div class="grid gap-1 border-b border-line py-(--space-2)">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Projects
          </p>
          <h2 id="latest-projects-title" class="m-0 font-display text-[48px] font-normal leading-none max-[520px]:text-[36px]">
            最新项目
          </h2>
        </div>
        <article
          v-for="project in latestProjects"
          :key="project.id"
          class="grid gap-1 border-b border-line py-(--space-2)"
        >
          <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
            {{ project.status }} / {{ project.category }}
          </p>
          <h3 class="m-0 truncate text-lg font-bold text-ink">
            {{ project.name }}
          </h3>
          <p class="m-0 line-clamp-2 text-sm leading-[1.6] text-muted">
            {{ project.description }}
          </p>
        </article>
        <p v-if="latestProjects.length === 0" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
          暂无项目。
        </p>
      </section>

      <section class="grid content-start border-t border-line" aria-labelledby="latest-comments-title">
        <div class="grid gap-1 border-b border-line py-(--space-2)">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Comments
          </p>
          <h2 id="latest-comments-title" class="m-0 font-display text-[48px] font-normal leading-none max-[520px]:text-[36px]">
            最新评论
          </h2>
        </div>
        <p v-if="commentsLoading" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
          正在读取评论。
        </p>
        <p v-else-if="commentsError" class="m-0 border-b border-line py-(--space-2) text-sm font-bold text-muted">
          {{ commentsError }}
        </p>
        <article
          v-for="comment in latestComments"
          v-else
          :key="comment.id"
          class="grid gap-1 border-b border-line py-(--space-2)"
        >
          <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
            {{ comment.status }} / {{ comment.articleSlug || comment.url }}
          </p>
          <h3 class="m-0 truncate text-lg font-bold text-ink">
            {{ comment.author || '匿名访客' }}
          </h3>
          <p class="m-0 line-clamp-2 text-sm leading-[1.6] text-muted">
            {{ comment.content }}
          </p>
        </article>
        <p v-if="!commentsLoading && !commentsError && latestComments.length === 0" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
          暂无评论。
        </p>
      </section>
    </div>
  </section>
</template>
