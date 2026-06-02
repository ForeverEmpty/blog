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

const appConfig = useAppConfig()
const { isActiveNavigation } = useActiveNavigation()
const searchOpen = ref(false)

const { data: siteSearchArticles } = await useAsyncData('site-search-articles', () =>
  queryCollection('blog')
    .all(),
  {
    default: () => []
  }
)
const sortedSiteSearchArticles = computed(() => sortArticles(siteSearchArticles.value).filter(isPublicArticle))
const { data: siteSearchProjects } = await useAsyncData('site-search-projects', () =>
  $fetch<LayoutSearchProject[]>('/api/projects'),
  {
    default: () => appConfig.projects.items ?? []
  }
)
</script>

<template>
  <main class="min-h-screen overflow-x-clip bg-paper bg-[linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-size-[96px_96px]">
    <header
      class="sticky top-0 z-10 grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-(--space-4) border-b border-[color-mix(in_oklch,var(--line),transparent_24%)] bg-[color-mix(in_oklch,var(--paper),transparent_8%)] px-[clamp(var(--space-3),5vw,var(--space-8))] py-(--space-3) backdrop-blur-2xl max-[760px]:grid-cols-[auto_1fr_auto_auto] max-[760px]:gap-(--space-2) max-[760px]:p-(--space-2)"
      aria-label="站点导航"
    >
      <NuxtLink
        class="inline-flex min-h-11 w-11 items-center justify-center rounded-token border border-ink font-display text-lg tracking-normal"
        :to="appConfig.site.homeHref"
        :aria-label="appConfig.site.homeAriaLabel"
      >
        {{ appConfig.site.initials }}
      </NuxtLink>
      <nav class="flex flex-wrap gap-(--space-2) text-sm text-muted max-[760px]:order-3 max-[760px]:col-span-full" aria-label="主导航">
        <AppLinkButton
          v-for="item in appConfig.navigation.main"
          :key="item.label"
          variant="text"
          :href="item.href"
          :active="isActiveNavigation(item.href)"
        >
          {{ item.label }}
        </AppLinkButton>
      </nav>
      <AppButton
        class="justify-self-end"
        variant="icon"
        aria-label="打开搜索"
        @click="searchOpen = true"
      >
        <Icon name="lucide:search" mode="svg" class="h-5 w-5" aria-hidden="true" />
      </AppButton>
      <ThemeModeToggle class="justify-self-end" />
      <AppLinkButton
        class="max-[760px]:justify-self-end"
        :href="appConfig.navigation.admin.href"
        variant="outline"
        :active="isActiveNavigation(appConfig.navigation.admin.href)"
      >
        {{ appConfig.navigation.admin.label }}
      </AppLinkButton>
    </header>

    <SiteSearchDialog
      :open="searchOpen"
      :articles="sortedSiteSearchArticles"
      :projects="siteSearchProjects"
      @close="searchOpen = false"
    />

    <slot />

    <SiteFooter />
  </main>
</template>
