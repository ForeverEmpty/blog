<script setup lang="ts">
import type { AdminPanel, AdminPanelItem } from '~/types/admin'

defineProps<{
  activePanel: AdminPanel
  panels: AdminPanelItem[]
  notice: string
}>()

const emit = defineEmits<{
  selectPanel: [panel: AdminPanel]
  createArticle: []
}>()
</script>

<template>
  <main class="min-h-screen overflow-x-clip bg-paper bg-[linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-size-[96px_96px]">
    <section
      class="grid min-h-screen grid-cols-[minmax(132px,15vw)_minmax(0,1fr)] border-b border-line bg-paper max-[860px]:grid-cols-1"
      aria-labelledby="admin-title"
    >
      <aside
        class="border-r border-line px-(--space-3) py-(--space-6) max-[860px]:border-r-0 max-[860px]:border-b max-[860px]:px-(--space-2) max-[860px]:py-(--space-3)"
        aria-label="后台导航"
      >
        <div class="sticky top-8 grid gap-(--space-4) max-[860px]:static">
          <div class="grid gap-(--space-1)">
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              Admin
            </p>
            <p class="m-0 font-display text-[72px] leading-none text-ink max-[860px]:text-[48px]">
              CMS
            </p>
          </div>
          <nav class="grid gap-(--space-1) max-[860px]:grid-cols-5 max-[680px]:grid-cols-3 max-[460px]:grid-cols-2" aria-label="后台模块">
            <button
              v-for="panel in panels"
              :key="panel.key"
              type="button"
              class="inline-flex min-h-11 cursor-pointer items-center justify-start gap-2 rounded-token border px-(--space-2) text-sm font-bold tracking-normal transition-[background-color,border-color,color,transform] duration-200 focus-visible:outline-none active:scale-[0.98]"
              :class="activePanel === panel.key ? 'border-ink bg-ink text-paper' : 'border-line bg-transparent text-muted hover:border-ink hover:bg-ink hover:text-paper focus-visible:border-ink focus-visible:bg-ink focus-visible:text-paper'"
              @click="emit('selectPanel', panel.key)"
            >
              <Icon :name="panel.icon" mode="svg" class="h-4 w-4" aria-hidden="true" />
              {{ panel.label }}
            </button>
          </nav>
        </div>
      </aside>

      <div class="px-[clamp(var(--space-3),5vw,var(--space-8))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
        <div class="grid gap-(--space-8)">
          <header class="grid gap-(--space-3)">
            <div class="flex flex-wrap items-center gap-(--space-1)">
              <AppLinkButton href="/" variant="outline">
                <Icon name="lucide:arrow-left" mode="svg" class="h-4 w-4" aria-hidden="true" />
                返回站点
              </AppLinkButton>
              <AppButton variant="solid" @click="emit('createArticle')">
                <Icon name="lucide:file-plus-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
                新增文章
              </AppButton>
            </div>
            <h1
              id="admin-title"
              class="m-0 max-w-260 font-display text-[132px] font-normal leading-[0.95] tracking-normal text-ink text-pretty max-[1100px]:text-[88px] max-[520px]:text-[56px]"
            >
              后台
            </h1>
            <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
              管理文章、项目、友链申请与 Waline 评论，同时查看观看量、文章数量和发布状态。当前后台已接入本地文件 API 与评论数据库。
            </p>
            <p
              v-if="notice"
              class="m-0 w-fit border border-line bg-code-surface px-(--space-2) py-(--space-1) text-sm font-bold text-muted"
              role="status"
            >
              {{ notice }}
            </p>
          </header>

          <slot />
        </div>
      </div>
    </section>
  </main>
</template>
