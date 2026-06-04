<script setup lang="ts">
type SiteControlNotification = {
  id: string
  title: string
  body: string
  date?: string
  level?: 'info' | 'success' | 'warning' | 'danger'
  href?: string
  hrefLabel?: string
  pinned?: boolean
  enabled?: boolean
}

const props = withDefaults(defineProps<{
  notifications?: SiteControlNotification[]
  adminHref: string
  adminLabel: string
  adminActive?: boolean
}>(), {
  notifications: () => [],
  adminActive: false
})

const route = useRoute()
const root = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const open = ref(false)
const readingMode = ref(false)
const readIds = ref<string[]>([])
const dismissedIds = ref<string[]>([])

const readStorageKey = 'chankoblog-site-notifications-read'
const dismissedStorageKey = 'chankoblog-site-notifications-dismissed'
const readingModeStorageKey = 'chankoblog-reading-mode'
const panelId = 'site-control-panel'

const isArticlePage = computed(() => (
  route.path.startsWith('/blog/') &&
  route.path.split('/').filter(Boolean).length === 2
))
const visibleNotifications = computed(() => (
  props.notifications
    .filter((item) => item.enabled !== false && !dismissedIds.value.includes(item.id))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1
      }

      return String(b.date || '').localeCompare(String(a.date || ''))
    })
))
const unreadCount = computed(() => (
  visibleNotifications.value.filter((item) => !readIds.value.includes(item.id)).length
))
const hasDismissedNotifications = computed(() => dismissedIds.value.length > 0)
const controlBadgeCount = computed(() => unreadCount.value)
const readingModeLabel = computed(() => (
  readingMode.value && isArticlePage.value ? '退出阅读模式' : '进入阅读模式'
))

const uniqueIds = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)))
const readStoredIds = (key: string) => {
  if (!import.meta.client) {
    return []
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}
const writeStoredIds = (key: string, ids: string[]) => {
  if (import.meta.client) {
    localStorage.setItem(key, JSON.stringify(uniqueIds(ids)))
  }
}
const levelClasses = (level: SiteControlNotification['level']) => {
  if (level === 'success') {
    return 'border-callout-success-border bg-callout-success-surface text-callout-success-text'
  }

  if (level === 'warning') {
    return 'border-callout-warning-border bg-callout-warning-surface text-callout-warning-text'
  }

  if (level === 'danger') {
    return 'border-callout-danger-border bg-callout-danger-surface text-callout-danger-text'
  }

  return 'border-line bg-code-surface text-muted'
}
const isInternalLink = (href: string) => (
  href.startsWith('/') &&
  !href.startsWith('//') &&
  !/\/[^/?#]+\.[^/?#]+(?:[?#].*)?$/.test(href)
)
const syncReadingModeClass = () => {
  if (!import.meta.client) {
    return
  }

  document.documentElement.classList.toggle('reader-mode', readingMode.value && isArticlePage.value)
}
const setReadingMode = (value: boolean) => {
  readingMode.value = value && isArticlePage.value
  open.value = false

  if (import.meta.client) {
    localStorage.setItem(readingModeStorageKey, readingMode.value ? '1' : '0')
  }

  syncReadingModeClass()
}
const toggleReadingMode = () => {
  setReadingMode(!readingMode.value)
}
const addReadId = (id: string) => {
  readIds.value = uniqueIds([...readIds.value, id])
  writeStoredIds(readStorageKey, readIds.value)
}
const markAllRead = () => {
  readIds.value = uniqueIds([
    ...readIds.value,
    ...visibleNotifications.value.map((item) => item.id)
  ])
  writeStoredIds(readStorageKey, readIds.value)
}
const dismissNotification = (id: string) => {
  dismissedIds.value = uniqueIds([...dismissedIds.value, id])
  readIds.value = uniqueIds([...readIds.value, id])
  writeStoredIds(dismissedStorageKey, dismissedIds.value)
  writeStoredIds(readStorageKey, readIds.value)
}
const restoreDismissed = () => {
  dismissedIds.value = []
  writeStoredIds(dismissedStorageKey, [])
}
const toggleOpen = () => {
  open.value = !open.value
}
const closePanel = () => {
  open.value = false
}
const handleDocumentClick = (event: MouseEvent) => {
  if (!root.value || root.value.contains(event.target as Node)) {
    return
  }

  closePanel()
}

watch(
  () => route.path,
  () => {
    if (!isArticlePage.value) {
      readingMode.value = false
    }

    syncReadingModeClass()
  }
)

watch(readingMode, syncReadingModeClass)

watch(open, async (isOpen) => {
  if (!isOpen || !import.meta.client) {
    return
  }

  await nextTick()
  panelRef.value?.focus()
})

onMounted(() => {
  readIds.value = readStoredIds(readStorageKey)
  dismissedIds.value = readStoredIds(dismissedStorageKey)
  readingMode.value = localStorage.getItem(readingModeStorageKey) === '1' && isArticlePage.value
  syncReadingModeClass()
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.documentElement.classList.remove('reader-mode')
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div ref="root" class="relative justify-self-end">
    <AppButton
      variant="icon"
      :aria-label="controlBadgeCount > 0 ? `打开控制面板，${controlBadgeCount} 条未读通知` : '打开控制面板'"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="toggleOpen"
    >
      <span class="relative inline-flex">
        <Icon name="lucide:sliders-horizontal" mode="svg" class="h-5 w-5" aria-hidden="true" />
        <span
          v-if="controlBadgeCount > 0"
          class="absolute -right-2 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full border border-paper bg-ink px-1 text-[10px] font-bold leading-none text-paper"
          aria-hidden="true"
        >
          {{ controlBadgeCount > 9 ? '9+' : controlBadgeCount }}
        </span>
      </span>
    </AppButton>

    <Transition name="dialog">
      <div
        v-if="open"
        class="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-(--space-3) max-[640px]:p-(--space-2)"
        role="presentation"
        @click.self="closePanel"
      >
      <section
        :id="panelId"
        ref="panelRef"
        class="dialog-panel grid max-h-[min(760px,92vh)] w-full max-w-250 overflow-hidden border border-line bg-paper text-ink outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-control-title"
        tabindex="-1"
        @click.stop
        @keydown.esc="closePanel"
      >
        <header class="flex items-start justify-between gap-(--space-2) border-b border-line p-(--space-3)">
          <div class="grid gap-1">
            <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
              Controls
            </p>
            <h2 id="site-control-title" class="m-0 font-display text-[32px] font-normal leading-none">
              控制面板
            </h2>
          </div>
          <AppButton variant="icon" size="sm" aria-label="关闭控制面板" @click="closePanel">
            <Icon name="lucide:x" mode="svg" class="h-4 w-4" aria-hidden="true" />
          </AppButton>
        </header>

        <div class="grid max-h-[min(620px,calc(92vh-128px))] min-h-0 grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] max-[840px]:grid-cols-1">
          <section class="grid min-h-0 border-r border-line max-[840px]:border-r-0 max-[840px]:border-b" aria-labelledby="site-control-notifications-title">
            <header class="flex items-start justify-between gap-(--space-2) border-b border-line p-(--space-3)">
              <div class="grid gap-1">
                <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
                  Notifications
                </p>
                <h3 id="site-control-notifications-title" class="m-0 text-lg font-bold leading-tight text-ink">
                  站内通知
                </h3>
              </div>
              <button
                v-if="visibleNotifications.length > 0"
                type="button"
                class="min-h-9 border border-line px-(--space-1) text-[12px] font-bold text-muted transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                @click="markAllRead"
              >
                全部已读
              </button>
            </header>

            <div class="min-h-0 overflow-auto">
              <article
                v-for="item in visibleNotifications"
                :key="item.id"
                class="group grid gap-(--space-2) border-b border-line p-(--space-3) transition-colors duration-200 hover:bg-code-surface"
              >
                <div class="flex items-start justify-between gap-(--space-2)">
                  <div class="grid min-w-0 gap-1">
                    <div class="flex flex-wrap items-center gap-1">
                      <span
                        class="inline-flex min-h-6 items-center border px-1 text-[11px] font-bold uppercase tracking-normal"
                        :class="levelClasses(item.level)"
                      >
                        {{ item.pinned ? 'Pinned' : item.level || 'Info' }}
                      </span>
                      <span
                        v-if="!readIds.includes(item.id)"
                        class="inline-flex min-h-6 items-center border border-ink bg-ink px-1 text-[11px] font-bold uppercase tracking-normal text-paper"
                      >
                        未读
                      </span>
                      <time v-if="item.date" class="text-[12px] font-bold uppercase tracking-normal text-muted">
                        {{ item.date }}
                      </time>
                    </div>
                    <h4 class="m-0 text-lg font-bold leading-tight text-ink">
                      {{ item.title }}
                    </h4>
                  </div>

                  <AppButton variant="icon" size="sm" :aria-label="`关闭通知：${item.title}`" @click="dismissNotification(item.id)">
                    <Icon name="lucide:minus" mode="svg" class="h-4 w-4" aria-hidden="true" />
                  </AppButton>
                </div>

                <p class="m-0 text-sm leading-[1.65] text-muted text-pretty">
                  {{ item.body }}
                </p>

                <div class="flex flex-wrap items-center gap-(--space-1)">
                  <NuxtLink
                    v-if="item.href && isInternalLink(item.href)"
                    class="inline-flex min-h-9 items-center border border-line px-(--space-1) text-[12px] font-bold text-ink transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                    :to="item.href"
                    @click="addReadId(item.id)"
                  >
                    {{ item.hrefLabel || '查看详情' }}
                  </NuxtLink>
                  <a
                    v-else-if="item.href"
                    class="inline-flex min-h-9 items-center border border-line px-(--space-1) text-[12px] font-bold text-ink transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                    :href="item.href"
                    @click="addReadId(item.id)"
                  >
                    {{ item.hrefLabel || '查看详情' }}
                  </a>
                  <button
                    v-if="!readIds.includes(item.id)"
                    type="button"
                    class="inline-flex min-h-9 items-center border border-line px-(--space-1) text-[12px] font-bold text-muted transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                    @click="addReadId(item.id)"
                  >
                    标为已读
                  </button>
                </div>
              </article>

              <div
                v-if="visibleNotifications.length === 0"
                class="grid min-h-64 place-items-center p-(--space-3) text-center"
              >
                <div class="grid max-w-80 gap-(--space-1)">
                  <Icon name="lucide:bell-off" mode="svg" class="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                  <h4 class="m-0 text-lg font-bold text-ink">
                    暂无通知
                  </h4>
                  <p class="m-0 text-sm leading-[1.6] text-muted">
                    新的站内通知会显示在这里。
                  </p>
                  <button
                    v-if="hasDismissedNotifications"
                    type="button"
                    class="mx-auto mt-(--space-1) inline-flex min-h-9 items-center border border-line px-(--space-1) text-[12px] font-bold text-ink transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                    @click="restoreDismissed"
                  >
                    恢复已关闭通知
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside class="grid content-start gap-(--space-3) overflow-auto p-(--space-3)" aria-label="控制操作">
            <section class="grid gap-(--space-2) border border-line bg-code-surface p-(--space-2)" aria-label="阅读控制">
              <div class="grid gap-1">
                <h3 class="m-0 text-lg font-bold leading-tight text-ink">
                  阅读模式
                </h3>
                <p class="m-0 text-sm leading-[1.6] text-muted">
                  隐藏导航、评论和页脚，放宽正文并保留文章目录。
                </p>
              </div>
              <button
                type="button"
                class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-token border px-(--space-1) text-sm font-bold transition-colors duration-200 focus-visible:outline-none"
                :class="readingMode && isArticlePage ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper'"
                :disabled="!isArticlePage"
                :aria-pressed="readingMode && isArticlePage"
                @click="toggleReadingMode"
              >
                <Icon :name="readingMode && isArticlePage ? 'lucide:book-open-check' : 'lucide:book-open'" mode="svg" class="h-4 w-4" aria-hidden="true" />
                {{ readingModeLabel }}
              </button>
              <p v-if="!isArticlePage" class="m-0 border border-dashed border-line bg-paper p-(--space-2) text-sm text-muted">
                打开任意文章后可启用阅读模式。
              </p>
            </section>

            <section class="grid gap-(--space-2) border border-line bg-code-surface p-(--space-2)" aria-label="后台访问">
              <div class="grid gap-1">
                <h3 class="m-0 text-lg font-bold leading-tight text-ink">
                  后台访问
                </h3>
                <p class="m-0 text-sm leading-[1.6] text-muted">
                  进入内容、项目、友链和通知管理。
                </p>
              </div>
              <AppLinkButton class="w-full justify-center" :href="props.adminHref" variant="outline" :active="props.adminActive" @click="closePanel">
                <Icon name="lucide:shield" mode="svg" class="h-4 w-4" aria-hidden="true" />
                {{ props.adminLabel }}
              </AppLinkButton>
            </section>
          </aside>
        </div>
      </section>
      </div>
    </Transition>

    <ClientOnly>
      <Teleport to="body">
        <Transition name="dialog">
          <button
            v-if="readingMode && isArticlePage"
            type="button"
            class="dialog-panel fixed right-(--space-3) bottom-(--space-3) z-40 inline-flex min-h-11 items-center gap-2 rounded-token border border-ink bg-ink px-(--space-2) text-sm font-bold text-paper transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none max-[520px]:right-(--space-2) max-[520px]:bottom-(--space-2)"
            @click="setReadingMode(false)"
          >
            <Icon name="lucide:book-x" mode="svg" class="h-4 w-4" aria-hidden="true" />
            退出阅读模式
          </button>
        </Transition>
      </Teleport>
    </ClientOnly>
  </div>
</template>
