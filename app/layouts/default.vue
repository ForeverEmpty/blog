<script setup lang="ts">
type LayoutSearchProject = {
  id?: string
  name: string
  description: string
  status: string
  category: string
  sourceUrl: string
  launchUrl: string
  tags: string[]
}

type LayoutNotification = {
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

type LayoutCalendarArticle = {
  path: string
  title: string
  date: string
}

const appConfig = useAppConfig()
const { isActiveNavigation } = useActiveNavigation()
const searchOpen = ref(false)

const { data: siteSearchArticles } = await useAsyncData('site-search-articles', () =>
  $fetch('/api/blog?search=1'),
  {
    default: () => []
  }
)
const sortedSiteSearchArticles = computed(() => (
  sortArticles(siteSearchArticles.value)
    .filter(isPublicArticle)
    .map(withContentSearchText)
))
const { data: siteCalendarArticles } = await useAsyncData('site-calendar-articles', () =>
  $fetch<LayoutCalendarArticle[]>('/api/blog/activity'),
  {
    default: () => []
  }
)
const controlPanelArticles = computed(() => (
  siteCalendarArticles.value.length > 0
    ? siteCalendarArticles.value
    : sortedSiteSearchArticles.value.map((article) => ({
        path: article.path,
        title: article.title,
        date: article.date
      }))
))
const { data: siteSearchProjects } = await useAsyncData('site-search-projects', () =>
  $fetch<LayoutSearchProject[]>('/api/projects'),
  {
    default: () => appConfig.projects.items ?? []
  }
)
const { data: siteNotifications } = await useAsyncData('site-notifications', () =>
  $fetch<LayoutNotification[]>('/api/notifications'),
  {
    default: () => []
  }
)
</script>

<template>
  <main class="min-h-screen overflow-x-clip bg-paper bg-[linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-size-[96px_96px]">
    <header
      class="site-header sticky top-0 z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-(--space-4) border-b border-[color-mix(in_oklch,var(--line),transparent_24%)] bg-paper px-[clamp(var(--space-3),5vw,var(--space-8))] py-(--space-3) transition-[opacity,transform] duration-300 max-[760px]:grid-cols-[auto_minmax(0,1fr)] max-[760px]:gap-x-(--space-2) max-[760px]:gap-y-(--space-1) max-[760px]:p-(--space-2)"
      aria-label="站点导航"
    >
      <NuxtLink
        class="inline-flex min-h-11 w-11 items-center justify-center rounded-token bg-transparent p-0.5"
        :to="appConfig.site.homeHref"
        :aria-label="appConfig.site.homeAriaLabel"
      >
        <img
          src="/favicon.svg"
          :alt="appConfig.site.name"
          class="h-10 w-10 object-contain"
          width="40"
          height="40"
        >
      </NuxtLink>
      <nav class="flex flex-wrap gap-(--space-2) text-sm text-muted max-[760px]:order-3 max-[760px]:col-span-full max-[760px]:grid max-[760px]:grid-cols-3 max-[760px]:gap-1 max-[380px]:grid-cols-2" aria-label="主导航">
        <AppLinkButton
          v-for="item in appConfig.navigation.main"
          :key="item.label"
          variant="text"
          class="max-[760px]:min-h-10 max-[760px]:w-full max-[760px]:px-1 max-[760px]:text-[14px]"
          :href="item.href"
          :active="isActiveNavigation(item.href)"
        >
          {{ item.label }}
        </AppLinkButton>
      </nav>
      <div class="flex items-center justify-end gap-1 justify-self-end max-[760px]:min-w-0">
        <AppButton
          class="justify-self-end"
          variant="icon"
          aria-label="打开搜索"
          @click="searchOpen = true"
        >
          <Icon name="lucide:search" mode="svg" class="h-5 w-5" aria-hidden="true" />
        </AppButton>
        <ThemeModeToggle class="justify-self-end" />
        <SiteControlPanel
          :notifications="siteNotifications"
          :articles="controlPanelArticles"
          :admin-href="appConfig.navigation.admin.href"
          :admin-label="appConfig.navigation.admin.label"
          :admin-active="isActiveNavigation(appConfig.navigation.admin.href)"
          subscribe-href="/subscribe"
          :subscribe-label="`${appConfig.subscribe.title}中心`"
        />
      </div>
    </header>

    <SiteSearchDialog
      :open="searchOpen"
      :articles="sortedSiteSearchArticles"
      :projects="siteSearchProjects"
      @close="searchOpen = false"
    />

    <slot />

    <SiteFooter class="site-footer" />
  </main>
</template>
