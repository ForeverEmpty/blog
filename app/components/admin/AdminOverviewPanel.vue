<script setup lang="ts">
import type { AdminStat } from '~/types/admin'

defineProps<{
  stats: AdminStat[]
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

    <div class="grid grid-cols-[minmax(0,1fr)_minmax(240px,360px)] gap-(--space-4) max-[900px]:grid-cols-1">
      <p class="m-0 max-w-170 text-lg leading-[1.6] text-muted text-pretty">
        文章编辑器、项目列表和友链审核已经放在同一后台动线中。当前使用本地文件作为持久化层，后续可以平滑替换为数据库。
      </p>
      <ul class="m-0 grid list-none gap-(--space-1) p-0 text-sm font-bold uppercase tracking-normal text-muted">
        <li class="border-b border-line py-(--space-1)">Markdown Preview</li>
        <li class="border-b border-line py-(--space-1)">Project CRUD</li>
        <li class="border-b border-line py-(--space-1)">Friend Review</li>
      </ul>
    </div>
  </section>
</template>
