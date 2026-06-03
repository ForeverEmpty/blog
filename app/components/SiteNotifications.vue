<script setup lang="ts">
type SiteNotificationItem = {
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
  enabled?: boolean
  title?: string
  emptyTitle?: string
  emptyDescription?: string
  items?: SiteNotificationItem[]
}>(), {
  enabled: true,
  title: '站内通知',
  emptyTitle: '暂无通知',
  emptyDescription: '新的通知会显示在这里。',
  items: () => []
})

const readStorageKey = 'chankoblog-site-notifications-read'
const dismissedStorageKey = 'chankoblog-site-notifications-dismissed'

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const readIds = ref<string[]>([])
const dismissedIds = ref<string[]>([])

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

const visibleNotifications = computed(() => (
  props.items
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
const panelId = 'site-notifications-panel'

const levelClasses = (level: SiteNotificationItem['level']) => {
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

onMounted(() => {
  readIds.value = readStoredIds(readStorageKey)
  dismissedIds.value = readStoredIds(dismissedStorageKey)
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div
    v-if="enabled"
    ref="root"
    class="relative justify-self-end"
  >
    <AppButton
      variant="icon"
      :aria-label="unreadCount > 0 ? `打开站内通知，${unreadCount} 条未读` : '打开站内通知'"
      :aria-expanded="open"
      :aria-controls="panelId"
      @click="toggleOpen"
    >
      <span class="relative inline-flex">
        <Icon name="lucide:bell" mode="svg" class="h-5 w-5" aria-hidden="true" />
        <span
          v-if="unreadCount > 0"
          class="absolute -right-2 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full border border-paper bg-ink px-1 text-[10px] font-bold leading-none text-paper"
          aria-hidden="true"
        >
          {{ unreadCount > 9 ? '9+' : unreadCount }}
        </span>
      </span>
    </AppButton>

    <Transition name="dialog">
      <section
        v-if="open"
        :id="panelId"
        class="dialog-panel absolute right-0 top-[calc(100%+var(--space-2))] z-30 grid max-h-[min(620px,calc(100vh-120px))] w-[min(420px,calc(100vw-var(--space-4)))] overflow-hidden border border-line bg-paper text-ink max-[760px]:fixed max-[760px]:left-(--space-2) max-[760px]:right-(--space-2) max-[760px]:top-24 max-[760px]:w-auto"
        role="dialog"
        aria-modal="false"
        aria-labelledby="site-notifications-title"
        @keydown.esc="closePanel"
      >
        <header class="flex items-start justify-between gap-(--space-2) border-b border-line p-(--space-3)">
          <div class="grid gap-1">
            <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
              Notifications
            </p>
            <h2 id="site-notifications-title" class="m-0 font-display text-[32px] font-normal leading-none">
              {{ title }}
            </h2>
          </div>

          <div class="flex items-center gap-1">
            <button
              v-if="visibleNotifications.length > 0"
              type="button"
              class="min-h-9 border border-line px-(--space-1) text-[12px] font-bold text-muted transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
              @click="markAllRead"
            >
              全部已读
            </button>
            <AppButton variant="icon" size="sm" aria-label="关闭站内通知" @click="closePanel">
              <Icon name="lucide:x" mode="svg" class="h-4 w-4" aria-hidden="true" />
            </AppButton>
          </div>
        </header>

        <div class="max-h-[min(480px,calc(100vh-220px))] overflow-auto">
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
                <h3 class="m-0 text-lg font-bold leading-tight text-ink">
                  {{ item.title }}
                </h3>
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
            class="grid min-h-48 place-items-center border-b border-line p-(--space-3) text-center"
          >
            <div class="grid max-w-80 gap-(--space-1)">
              <Icon name="lucide:bell-off" mode="svg" class="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
              <h3 class="m-0 text-lg font-bold text-ink">
                {{ emptyTitle }}
              </h3>
              <p class="m-0 text-sm leading-[1.6] text-muted">
                {{ emptyDescription }}
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
    </Transition>
  </div>
</template>
