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

type SiteControlArticle = {
  path: string
  title: string
  date: string
}

const props = withDefaults(defineProps<{
  notifications?: SiteControlNotification[]
  articles?: SiteControlArticle[]
  adminHref: string
  adminLabel: string
  adminActive?: boolean
  subscribeHref?: string
  subscribeLabel?: string
}>(), {
  notifications: () => [],
  articles: () => [],
  adminActive: false,
  subscribeHref: '/subscribe',
  subscribeLabel: '订阅中心'
})

const route = useRoute()
const root = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const open = ref(false)
const readingMode = ref(false)
const readIds = ref<string[]>([])
const dismissedIds = ref<string[]>([])
const liveArticles = ref<SiteControlArticle[]>([])

const readStorageKey = 'chankoblog-site-notifications-read'
const dismissedStorageKey = 'chankoblog-site-notifications-dismissed'
const readingModeStorageKey = 'chankoblog-reading-mode'
const panelId = 'site-control-panel'
const calendarToday = ref(formatDateKey(new Date()))
const calendarWeekCount = 26

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
const subscribeActive = computed(() => route.path === props.subscribeHref)
const calendarArticles = computed(() => (
  liveArticles.value.length > 0 ? liveArticles.value : props.articles
))
const articleCountByDate = computed(() => {
  const groups = new Map<string, SiteControlArticle[]>()

  calendarArticles.value.forEach((article) => {
    const dateKey = normalizeDateKey(article.date)

    if (!dateKey) {
      return
    }

    groups.set(dateKey, [...(groups.get(dateKey) || []), article])
  })

  return groups
})
const calendarAnchorDate = computed(() => {
  const today = parseDateKey(calendarToday.value) || new Date()

  return calendarArticles.value.reduce((anchor, article) => {
    const articleDate = parseDateKey(normalizeDateKey(article.date))

    return articleDate && articleDate > anchor ? articleDate : anchor
  }, today)
})
const calendarDays = computed(() => {
  const anchorDate = calendarAnchorDate.value
  const end = new Date(anchorDate)

  end.setDate(end.getDate() + (6 - end.getDay()))

  const start = new Date(end)

  start.setDate(end.getDate() - ((calendarWeekCount * 7) - 1))

  return Array.from({ length: calendarWeekCount * 7 }, (_item, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)

    const dateKey = formatDateKey(date)
    const articles = articleCountByDate.value.get(dateKey) || []

    return {
      dateKey,
      date,
      day: date.getDay(),
      week: Math.floor(index / 7),
      articles,
      count: articles.length,
      active: date <= anchorDate
    }
  })
})
const calendarWeeks = computed(() => (
  Array.from({ length: Math.ceil(calendarDays.value.length / 7) }, (_item, index) =>
    calendarDays.value.slice(index * 7, index * 7 + 7)
  )
))
const calendarMonths = computed(() => {
  const months: Array<{ key: string, label: string, week: number }> = []

  calendarDays.value.forEach((day) => {
    if (day.date.getDate() !== 1) {
      return
    }

    const key = `${day.date.getFullYear()}-${day.date.getMonth()}`

    if (months.some((month) => month.key === key)) {
      return
    }

    months.push({
      key,
      label: `${day.date.getMonth() + 1}月`,
      week: day.week
    })
  })

  return months
})
const calendarVisibleTotalArticles = computed(() => calendarArticles.value.length)
const calendarActiveDays = computed(() => (
  calendarDays.value.filter((day) => day.count > 0).length
))
const calendarMaxCount = computed(() => (
  Math.max(1, ...calendarDays.value.map((day) => day.count))
))

const uniqueIds = (ids: string[]) => Array.from(new Set(ids.filter(Boolean)))
function parseDateKey(value: string) {
  const timestamp = Date.parse(`${value}T00:00:00`)

  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

function formatDateKey(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeDateKey(value: string) {
  const trimmed = String(value || '').trim()
  const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (dateOnly) {
    return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`
  }

  const timestamp = Date.parse(trimmed)

  return Number.isNaN(timestamp) ? '' : formatDateKey(new Date(timestamp))
}
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
const calendarCellClass = (count: number, active: boolean) => {
  if (!active) {
    return 'border-line/40 bg-paper/60'
  }

  if (count <= 0) {
    return 'border-line bg-paper'
  }

  const ratio = count / calendarMaxCount.value

  if (ratio >= 0.75) {
    return 'border-ink bg-ink'
  }

  if (ratio >= 0.5) {
    return 'border-ink/70 bg-ink/70'
  }

  if (ratio >= 0.25) {
    return 'border-ink/45 bg-ink/45'
  }

  return 'border-ink/25 bg-ink/25'
}
const calendarCellTitle = (dateKey: string, articles: SiteControlArticle[]) => {
  if (articles.length === 0) {
    return `${dateKey} 没有发布文章`
  }

  const titles = articles.slice(0, 4).map((article) => `《${article.title}》`).join('、')
  const suffix = articles.length > 4 ? ` 等 ${articles.length} 篇` : ''

  return `${dateKey} 发布 ${articles.length} 篇：${titles}${suffix}`
}
const calendarDayHref = (dateKey: string) => (
  `/blog?q=${encodeURIComponent(`date="${dateKey}"`)}`
)
const refreshCalendarArticles = async () => {
  if (!import.meta.client) {
    return
  }

  try {
    liveArticles.value = await $fetch<SiteControlArticle[]>('/api/blog/activity')
    calendarToday.value = formatDateKey(new Date())
  } catch {
    liveArticles.value = []
  }
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

  await refreshCalendarArticles()
  await nextTick()
  panelRef.value?.focus()
})

onMounted(() => {
  calendarToday.value = formatDateKey(new Date())
  void refreshCalendarArticles()
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

        <div class="grid max-h-[min(620px,calc(92vh-128px))] min-h-0 grid-cols-[minmax(0,0.9fr)_minmax(320px,1.1fr)] max-[840px]:grid-cols-1">
          <section class="grid min-h-0 border-r border-line max-[840px]:border-r-0 max-[840px]:border-b" aria-labelledby="site-control-notifications-title">
            <header class="flex items-center justify-between gap-(--space-2) border-b border-line px-(--space-3) py-(--space-2)">
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
                class="min-h-8 border border-line px-(--space-1) text-[12px] font-bold text-muted transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
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

          <aside class="grid min-h-0 content-between gap-(--space-3) overflow-auto p-(--space-3)" aria-label="控制操作">
            <section class="grid gap-(--space-2) border border-line bg-code-surface p-(--space-2)" aria-labelledby="site-control-calendar-title">
              <div class="flex items-start justify-between gap-(--space-2)">
                <div class="grid gap-1">
                  <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
                    Writing Calendar
                  </p>
                  <h3 id="site-control-calendar-title" class="m-0 text-lg font-bold leading-tight text-ink">
                    提交记录
                  </h3>
                </div>
                <div class="grid justify-items-end text-right">
                  <span class="text-xl font-bold leading-none text-ink">{{ calendarVisibleTotalArticles }}</span>
                  <span class="text-[11px] font-bold uppercase tracking-normal text-muted">Articles</span>
                </div>
              </div>

              <div class="pb-1" aria-label="最近几个月文章发布热力图">
                <div
                  class="grid gap-0.5"
                  :style="{ gridTemplateColumns: `repeat(${calendarWeeks.length}, minmax(0, 1fr))` }"
                >
                  <div
                    v-for="month in calendarMonths"
                    :key="month.key"
                    class="row-start-1 whitespace-nowrap text-[10px] font-bold uppercase leading-none text-muted"
                    :style="{ gridColumn: `${month.week + 1} / span 4` }"
                  >
                    {{ month.label }}
                  </div>

                  <div
                    v-for="(week, weekIndex) in calendarWeeks"
                    :key="weekIndex"
                    class="row-start-2 grid grid-rows-7 gap-0.5"
                  >
                    <template v-for="day in week" :key="day.dateKey">
                      <NuxtLink
                        v-if="day.count > 0"
                        class="block aspect-square min-h-2 rounded-[1px] border transition-[transform,box-shadow] duration-200 hover:scale-125 hover:shadow-[0_0_0_2px_var(--paper),0_0_0_3px_var(--ink)] focus-visible:scale-125 focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--paper),0_0_0_3px_var(--ink)]"
                        :class="calendarCellClass(day.count, day.active)"
                        :title="calendarCellTitle(day.dateKey, day.articles)"
                        :to="calendarDayHref(day.dateKey)"
                        :aria-label="calendarCellTitle(day.dateKey, day.articles)"
                        @click="closePanel"
                      />
                      <span
                        v-else
                        class="block aspect-square min-h-2 rounded-[1px] border"
                        :class="calendarCellClass(day.count, day.active)"
                        :title="calendarCellTitle(day.dateKey, day.articles)"
                        :aria-label="calendarCellTitle(day.dateKey, day.articles)"
                      />
                    </template>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-(--space-1) text-[12px] font-bold uppercase tracking-normal text-muted">
                <span>{{ calendarActiveDays }} active days</span>
                <span class="inline-flex items-center gap-1">
                  Less
                  <span class="inline-flex h-3 w-3 rounded-[2px] border border-line bg-paper" aria-hidden="true" />
                  <span class="inline-flex h-3 w-3 rounded-[2px] border border-ink/25 bg-ink/25" aria-hidden="true" />
                  <span class="inline-flex h-3 w-3 rounded-[2px] border border-ink/45 bg-ink/45" aria-hidden="true" />
                  <span class="inline-flex h-3 w-3 rounded-[2px] border border-ink/70 bg-ink/70" aria-hidden="true" />
                  <span class="inline-flex h-3 w-3 rounded-[2px] border border-ink bg-ink" aria-hidden="true" />
                  More
                </span>
              </div>
            </section>

            <section class="grid gap-(--space-2)" aria-label="快捷控制">
              <div class="grid grid-cols-3 gap-(--space-2) max-[560px]:grid-cols-1">
                <button
                  type="button"
                  class="grid min-h-28 content-center justify-items-center gap-2 border p-(--space-2) text-center transition-colors duration-200 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
                  :class="readingMode && isArticlePage ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper'"
                  :disabled="!isArticlePage"
                  :aria-pressed="readingMode && isArticlePage"
                  @click="toggleReadingMode"
                >
                  <Icon :name="readingMode && isArticlePage ? 'lucide:book-open-check' : 'lucide:book-open'" mode="svg" class="h-7 w-7" aria-hidden="true" />
                  <span class="text-sm font-bold leading-tight">{{ readingModeLabel }}</span>
                  <span class="text-[11px] font-bold uppercase tracking-normal opacity-70">
                    Reader
                  </span>
                </button>

                <NuxtLink
                  class="group grid min-h-28 content-center justify-items-center gap-2 border p-(--space-2) text-center transition-colors duration-200 focus-visible:outline-none"
                  :class="subscribeActive ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper'"
                  :to="props.subscribeHref"
                  @click="closePanel"
                >
                  <Icon name="lucide:rss" mode="svg" class="h-7 w-7 transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper" aria-hidden="true" />
                  <span class="text-sm font-bold leading-tight transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">{{ props.subscribeLabel }}</span>
                  <span class="text-[11px] font-bold uppercase tracking-normal opacity-70 transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">
                    Subscribe
                  </span>
                </NuxtLink>

                <NuxtLink
                  class="group grid min-h-28 content-center justify-items-center gap-2 border p-(--space-2) text-center transition-colors duration-200 focus-visible:outline-none"
                  :class="props.adminActive ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper'"
                  :to="props.adminHref"
                  @click="closePanel"
                >
                  <Icon name="lucide:shield" mode="svg" class="h-7 w-7 transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper" aria-hidden="true" />
                  <span class="text-sm font-bold leading-tight transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">{{ props.adminLabel }}</span>
                  <span class="text-[11px] font-bold uppercase tracking-normal opacity-70 transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">
                    Admin
                  </span>
                </NuxtLink>
              </div>

              <p v-if="!isArticlePage" class="m-0 border border-dashed border-line bg-code-surface p-(--space-2) text-sm leading-[1.6] text-muted">
                打开任意文章后可启用阅读模式。
              </p>
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
