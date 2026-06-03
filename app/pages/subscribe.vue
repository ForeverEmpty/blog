<script setup lang="ts">
const appConfig = useAppConfig()
const copiedKey = ref('')

const feedItems = computed(() => appConfig.subscribe.feedItems.map((feed) => ({
  ...feed,
  absoluteHref: useAbsoluteSiteUrl(feed.href)
})))

const primaryFeed = computed(() => feedItems.value[0])

const copyFeedUrl = async (key: string, href: string) => {
  if (!import.meta.client || !navigator.clipboard) {
    return
  }

  await navigator.clipboard.writeText(href)
  copiedKey.value = key
  window.setTimeout(() => {
    if (copiedKey.value === key) {
      copiedKey.value = ''
    }
  }, 1800)
}

useSiteSeo({
  title: appConfig.subscribe.title,
  description: appConfig.subscribe.description,
  path: '/subscribe',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: appConfig.subscribe.title,
    description: appConfig.subscribe.description,
    url: useAbsoluteSiteUrl('/subscribe'),
    hasPart: feedItems.value.map((feed) => ({
      '@type': 'DataDownload',
      name: `${appConfig.site.name} ${feed.label}`,
      encodingFormat: feed.type,
      contentUrl: feed.absoluteHref
    }))
  }
})
</script>

<template>
  <section
    class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-b border-line bg-paper max-[760px]:grid-cols-1"
    aria-labelledby="subscribe-title"
  >
    <aside
      class="border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
      aria-label="订阅格式"
    >
      <div class="sticky top-32 grid gap-(--space-4) max-[760px]:static max-[760px]:grid-cols-[auto_1fr] max-[760px]:items-end">
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal">
          {{ appConfig.subscribe.eyebrow }}
        </p>
        <p class="m-0 font-display text-[88px] leading-none text-ink max-[760px]:justify-self-end max-[760px]:text-[56px]">
          {{ feedItems.length.toString().padStart(2, '0') }}
        </p>
      </div>
    </aside>

    <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
      <div class="grid max-w-300 gap-(--space-8)">
        <header class="grid gap-(--space-3)">
          <h1
            id="subscribe-title"
            class="m-0 max-w-260 font-display text-[132px] font-normal leading-[0.95] tracking-normal text-ink text-pretty max-[1100px]:text-[88px] max-[520px]:text-[56px]"
          >
            {{ appConfig.subscribe.title }}
          </h1>
          <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
            {{ appConfig.subscribe.description }}
          </p>
        </header>

        <section
          v-if="primaryFeed"
          class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-3) border-y border-line py-(--space-3) max-[760px]:grid-cols-1"
          aria-label="推荐订阅入口"
        >
          <div class="grid gap-1">
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              Recommended
            </p>
            <p class="m-0 break-all text-lg font-bold leading-[1.6] text-ink">
              {{ primaryFeed.absoluteHref }}
            </p>
          </div>
          <div class="flex flex-wrap justify-end gap-(--space-1) max-[760px]:justify-start">
            <AppButton variant="solid" @click="copyFeedUrl(primaryFeed.key, primaryFeed.absoluteHref)">
              <Icon name="lucide:copy" mode="svg" class="h-4 w-4" aria-hidden="true" />
              {{ copiedKey === primaryFeed.key ? appConfig.subscribe.copiedAction : appConfig.subscribe.copyAction }}
            </AppButton>
            <a
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-token border border-button-border bg-button-surface px-(--space-2) text-sm font-bold tracking-normal text-button-text! transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-button-hover hover:bg-button-hover hover:text-button-hover-text! focus-visible:border-button-hover focus-visible:bg-button-hover focus-visible:text-button-hover-text! focus-visible:shadow-[0_0_0_3px_var(--button-ring)] focus-visible:outline-none active:scale-[0.98]"
              :href="primaryFeed.absoluteHref"
              target="_blank"
              rel="noreferrer"
            >
              <Icon name="lucide:rss" mode="svg" class="h-4 w-4" aria-hidden="true" />
              打开 RSS
            </a>
          </div>
        </section>

        <section class="grid border-t border-line" aria-label="订阅格式列表">
          <article
            v-for="(feed, index) in feedItems"
            :key="feed.key"
            class="group grid min-h-46 grid-cols-[72px_minmax(0,1fr)_minmax(180px,260px)] items-center gap-(--space-4) border-b border-line px-(--space-2) py-(--space-3) transition-colors duration-250 hover:bg-ink hover:text-paper max-[900px]:grid-cols-[56px_minmax(0,1fr)] max-[900px]:items-start max-[560px]:grid-cols-1"
          >
            <span class="font-display text-[28px] text-quiet transition-colors duration-200 group-hover:text-paper">
              {{ String(index + 1).padStart(2, '0') }}
            </span>

            <div class="grid min-w-0 gap-(--space-1)">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper">
                {{ feed.type }}
              </p>
              <h2 class="m-0 font-display text-[64px] font-normal leading-none tracking-normal max-[760px]:text-[48px]">
                {{ feed.label }}
              </h2>
              <p class="m-0 max-w-180 text-base leading-[1.7] text-muted text-pretty transition-colors duration-200 group-hover:text-paper">
                {{ feed.description }}
              </p>
              <p class="m-0 break-all text-sm leading-[1.7] text-muted transition-colors duration-200 group-hover:text-paper">
                {{ feed.absoluteHref }}
              </p>
            </div>

            <div class="grid gap-(--space-1) justify-self-stretch max-[900px]:col-start-2 max-[900px]:grid-cols-2 max-[560px]:col-start-auto max-[560px]:grid-cols-1">
              <AppButton block variant="outline" @click="copyFeedUrl(feed.key, feed.absoluteHref)">
                <Icon name="lucide:copy" mode="svg" class="h-4 w-4" aria-hidden="true" />
                {{ copiedKey === feed.key ? appConfig.subscribe.copiedAction : appConfig.subscribe.copyAction }}
              </AppButton>
              <a
                class="inline-flex min-h-11 items-center justify-center gap-2 rounded-token border border-line bg-paper px-(--space-2) text-sm font-bold tracking-normal text-ink! transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-paper hover:bg-paper hover:text-ink! focus-visible:border-paper focus-visible:bg-paper focus-visible:text-ink! focus-visible:outline-none active:scale-[0.98]"
                :href="feed.absoluteHref"
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="lucide:external-link" mode="svg" class="h-4 w-4" aria-hidden="true" />
                打开
              </a>
            </div>
          </article>
        </section>

        <section class="grid grid-cols-[minmax(0,1fr)_minmax(240px,360px)] gap-(--space-4) max-[900px]:grid-cols-1" aria-label="阅读器导入提示">
          <p class="m-0 max-w-170 text-lg leading-[1.6] text-muted text-pretty">
            RSS、Atom 和 JSON Feed 会跟随公开文章自动更新；OPML 可用于阅读器导入，部署后链接会按站点域名生成。
          </p>
          <ul class="m-0 grid list-none gap-(--space-1) p-0 text-sm font-bold uppercase tracking-normal text-muted">
            <li
              v-for="item in appConfig.subscribe.readerItems"
              :key="item"
              class="border-b border-line py-(--space-1)"
            >
              {{ item }}
            </li>
          </ul>
        </section>
      </div>
    </div>
  </section>
</template>
