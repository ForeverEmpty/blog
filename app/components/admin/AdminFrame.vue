<script setup lang="ts">
import type { AdminPanel, AdminPanelItem, AdminSessionStatus } from '~/types/admin'

const props = defineProps<{
  activePanel: AdminPanel
  panels: AdminPanelItem[]
  notice: string
  sessionStatus: AdminSessionStatus
}>()

const emit = defineEmits<{
  selectPanel: [panel: AdminPanel]
  createArticle: []
  logout: []
}>()

const sidebarCollapsed = ref(false)
const { themeMode, themeOptions, setThemeMode } = useThemeMode()
const fallbackThemeOption = {
  mode: 'system' as const,
  label: '系统',
  title: '跟随系统主题',
  icon: 'lucide:monitor'
}
const activeThemeOption = computed(() => (
  themeOptions.find((option) => option.mode === themeMode.value) || themeOptions[0] || fallbackThemeOption
))
const cycleThemeMode = () => {
  const currentIndex = Math.max(0, themeOptions.findIndex((option) => option.mode === themeMode.value))
  const next = themeOptions[(currentIndex + 1) % themeOptions.length]

  if (!next) {
    return
  }

  setThemeMode(next.mode)
}

const formatSessionDuration = (seconds: number) => {
  if (seconds <= 0) {
    return '已过期'
  }

  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  const minutes = Math.floor((seconds % 3_600) / 60)

  if (days > 0) {
    return `${days} 天 ${hours} 小时`
  }

  if (hours > 0) {
    return `${hours} 小时 ${minutes} 分钟`
  }

  return `${Math.max(1, minutes)} 分钟`
}

const formatSessionTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '尚未校验'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const sessionState = computed(() => {
  if (props.sessionStatus.checking && !props.sessionStatus.checkedAt) {
    return 'checking'
  }

  if (!props.sessionStatus.authenticated) {
    return 'invalid'
  }

  if (props.sessionStatus.secondsRemaining <= 30 * 60) {
    return 'warning'
  }

  return 'active'
})

const sessionStateText = computed(() => {
  if (sessionState.value === 'checking') {
    return '校验中'
  }

  if (sessionState.value === 'invalid') {
    return '未登录'
  }

  if (sessionState.value === 'warning') {
    return '即将过期'
  }

  return '会话正常'
})

const sessionStateClass = computed(() => {
  if (sessionState.value === 'invalid') {
    return 'border-callout-danger-border bg-callout-danger-surface text-callout-danger-text'
  }

  if (sessionState.value === 'warning') {
    return 'border-callout-warning-border bg-callout-warning-surface text-callout-warning-text'
  }

  return 'border-callout-success-border bg-callout-success-surface text-callout-success-text'
})

const sessionDetail = computed(() => {
  if (sessionState.value === 'checking') {
    return '正在确认后台登录状态。'
  }

  if (sessionState.value === 'invalid') {
    return props.sessionStatus.configured ? '登录态不可用，正在跳转登录页。' : '后台密码尚未配置。'
  }

  return `${props.sessionStatus.username || 'admin'} · 剩余 ${formatSessionDuration(props.sessionStatus.secondsRemaining)} · ${formatSessionTime(props.sessionStatus.checkedAt)} 校验`
})
</script>

<template>
  <main class="min-h-[100dvh] overflow-x-clip bg-paper bg-[linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-size-[96px_96px]">
    <section
      class="grid min-h-[100dvh] grid-cols-[var(--admin-sidebar-width)_minmax(0,1fr)] border-b border-line bg-paper transition-[grid-template-columns] duration-420 ease-[cubic-bezier(.16,1,.3,1)] max-[860px]:grid-cols-1"
      :style="{ '--admin-sidebar-width': sidebarCollapsed ? '76px' : 'minmax(220px,15vw)' }"
      aria-labelledby="admin-title"
    >
      <aside
        class="sticky top-0 h-[100dvh] max-h-[100dvh] self-start overflow-hidden border-r border-line bg-paper max-[860px]:static max-[860px]:h-auto max-[860px]:max-h-none max-[860px]:border-r-0 max-[860px]:border-b"
        aria-label="后台导航"
      >
        <div class="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden max-[860px]:h-auto max-[860px]:min-h-0">
          <div class="grid gap-(--space-2) border-b border-line p-(--space-2)">
            <div
              class="flex items-center gap-(--space-1) transition-[justify-content] duration-420"
              :class="sidebarCollapsed ? 'justify-center' : 'justify-between'"
            >
              <div
                class="grid min-w-0 gap-0.5 overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(.16,1,.3,1)] max-[860px]:max-w-none max-[860px]:translate-x-0 max-[860px]:opacity-100"
                :class="sidebarCollapsed ? 'max-w-0 -translate-x-2 opacity-0' : 'max-w-40 translate-x-0 opacity-100'"
                :aria-hidden="sidebarCollapsed"
              >
                <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                  Admin
                </p>
                <p class="m-0 whitespace-nowrap font-display text-[32px] leading-none text-ink">
                  CMS
                </p>
              </div>
              <AppButton
                variant="icon"
                :aria-label="sidebarCollapsed ? '展开后台侧栏' : '收起后台侧栏'"
                class="max-[860px]:hidden"
                @click="sidebarCollapsed = !sidebarCollapsed"
              >
                <Icon
                  :name="sidebarCollapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'"
                  mode="svg"
                  class="h-5 w-5"
                  aria-hidden="true"
                />
              </AppButton>
            </div>
          </div>

          <nav class="grid min-h-0 content-start overflow-y-auto border-b border-line max-[860px]:grid-cols-5 max-[860px]:overflow-visible max-[680px]:grid-cols-3 max-[460px]:grid-cols-2" aria-label="后台模块">
            <button
              v-for="panel in panels"
              :key="panel.key"
              type="button"
              class="group relative grid min-h-15 items-center gap-(--space-1) overflow-hidden border-0 border-b border-line bg-transparent text-left text-sm font-bold tracking-normal text-muted transition-[background-color,color,grid-template-columns,padding] duration-420 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-code-surface hover:text-ink focus-visible:bg-code-surface focus-visible:text-ink focus-visible:outline-none max-[860px]:min-h-12 max-[860px]:grid-cols-[40px_minmax(0,1fr)] max-[860px]:px-(--space-2)"
              :class="[
                activePanel === panel.key ? 'bg-ink! text-paper! hover:bg-ink! hover:text-paper! focus-visible:bg-ink! focus-visible:text-paper!' : '',
                sidebarCollapsed ? 'grid-cols-[1fr] justify-items-center px-0' : 'grid-cols-[40px_minmax(0,1fr)] px-(--space-2)'
              ]"
              :aria-label="panel.label"
              :title="sidebarCollapsed ? panel.label : undefined"
              @click="emit('selectPanel', panel.key)"
            >
              <span
                class="grid h-10 w-10 place-items-center transition-[transform] duration-420 ease-[cubic-bezier(.16,1,.3,1)] max-[860px]:translate-x-0"
                :class="sidebarCollapsed ? 'translate-x-0' : '-translate-x-1'"
                aria-hidden="true"
              >
                <Icon :name="panel.icon" mode="svg" class="h-5 w-5 shrink-0" />
              </span>
              <span
                class="min-w-0 truncate whitespace-nowrap transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(.16,1,.3,1)] max-[860px]:relative max-[860px]:max-w-none max-[860px]:translate-x-0 max-[860px]:opacity-100"
                :class="sidebarCollapsed ? 'pointer-events-none absolute left-12 max-w-0 -translate-x-4 opacity-0' : 'relative max-w-40 translate-x-0 opacity-100'"
                :aria-hidden="sidebarCollapsed"
              >
                {{ panel.label }}
              </span>
            </button>
          </nav>

          <div class="grid min-w-0 gap-(--space-2) overflow-hidden p-(--space-2)" :class="sidebarCollapsed ? 'justify-items-center' : ''">
            <p
              class="m-0 whitespace-nowrap text-[12px] font-bold uppercase tracking-normal text-muted transition-[max-width,opacity,transform] duration-300 max-[860px]:max-w-none max-[860px]:translate-x-0 max-[860px]:opacity-100"
              :class="sidebarCollapsed ? 'max-w-0 -translate-x-2 opacity-0' : 'max-w-40 translate-x-0 opacity-100'"
              :aria-hidden="sidebarCollapsed"
            >
              Theme
            </p>
            <div
              class="overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-[cubic-bezier(.16,1,.3,1)] max-[860px]:max-w-none max-[860px]:translate-x-0 max-[860px]:opacity-100"
              :class="sidebarCollapsed ? 'max-w-0 translate-y-2 opacity-0' : 'max-w-48 translate-y-0 opacity-100'"
              :aria-hidden="sidebarCollapsed"
            >
              <ThemeModeToggle />
            </div>
            <AppButton
              v-if="sidebarCollapsed"
              variant="icon"
              :aria-label="`当前主题：${activeThemeOption.title}，点击切换`"
              :title="activeThemeOption.title"
              @click="cycleThemeMode"
            >
              <Icon :name="activeThemeOption.icon" mode="svg" class="h-5 w-5" aria-hidden="true" />
            </AppButton>
          </div>
        </div>
      </aside>

      <div class="px-[clamp(var(--space-3),5vw,var(--space-8))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
        <div class="grid gap-(--space-8)">
          <header class="grid gap-(--space-3)">
            <div class="flex flex-wrap items-center justify-between gap-(--space-2)">
              <div class="flex flex-wrap items-center gap-(--space-1)">
                <AppLinkButton href="/" variant="outline">
                  <Icon name="lucide:arrow-left" mode="svg" class="h-4 w-4" aria-hidden="true" />
                  返回站点
                </AppLinkButton>
                <AppButton variant="solid" @click="emit('createArticle')">
                  <Icon name="lucide:file-plus-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
                  新增文章
                </AppButton>
                <AppButton variant="outline" @click="emit('logout')">
                  <Icon name="lucide:log-out" mode="svg" class="h-4 w-4" aria-hidden="true" />
                  退出登录
                </AppButton>
              </div>
              <div
                class="grid max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-(--space-1) border px-(--space-2) py-(--space-1) text-sm"
                :class="sessionStateClass"
                role="status"
                aria-live="polite"
              >
                <Icon
                  :name="sessionState === 'warning' ? 'lucide:timer' : sessionState === 'invalid' ? 'lucide:shield-x' : 'lucide:shield-check'"
                  mode="svg"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                <span class="min-w-0">
                  <strong class="mr-1 font-bold">{{ sessionStateText }}</strong>
                  <span class="break-words">{{ sessionDetail }}</span>
                </span>
              </div>
            </div>
            <h1
              id="admin-title"
              class="m-0 max-w-260 font-display text-[88px] font-normal leading-[0.95] tracking-normal text-ink text-pretty max-[1100px]:text-[64px] max-[520px]:text-[48px]"
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
