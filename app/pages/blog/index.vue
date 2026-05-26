<script setup lang="ts">
const appConfig = useAppConfig();

const { data: articles } = await useAsyncData("blog-list", () =>
  queryCollection("blog")
    .where("published", "=", true)
    .order("date", "DESC")
    .all(),
  {
    default: () => [],
  },
);

const articleCount = computed(() => articles.value.length);

useHead({
  title: `${appConfig.blogList.title} - ${appConfig.site.name}`,
});
</script>

<template>
  <NuxtLayout>
    <section
      class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-b border-line bg-paper max-[760px]:grid-cols-1"
      aria-labelledby="blog-list-title"
    >
      <aside
        class="border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
        aria-label="文章列表状态"
      >
        <div class="sticky top-32 grid gap-(--space-4) max-[760px]:static max-[760px]:grid-cols-[auto_1fr] max-[760px]:items-end">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal">
            {{ appConfig.blogList.eyebrow }}
          </p>
          <p class="m-0 font-display text-[88px] leading-none text-ink max-[760px]:justify-self-end max-[760px]:text-[56px]">
            {{ articleCount.toString().padStart(2, "0") }}
          </p>
        </div>
      </aside>

      <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
        <div class="grid max-w-300 gap-(--space-8)">
          <div class="grid gap-(--space-3)">
            <h1
              id="blog-list-title"
              class="m-0 max-w-260 font-display text-[132px] font-normal leading-[0.95] tracking-normal text-ink text-pretty max-[1100px]:text-[88px] max-[520px]:text-[56px]"
            >
              {{ appConfig.blogList.title }}
            </h1>
            <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
              {{ appConfig.blogList.description }}
            </p>
          </div>

          <div
            v-if="articles.length > 0"
            class="grid border-t border-line px-(--space-2)"
            aria-label="文章列表"
          >
            <article
              v-for="(article, index) in articles"
              :key="article.path"
              class="group relative grid min-h-42 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-(--space-4) overflow-hidden border-b border-line px-(--space-2) py-(--space-4) text-ink before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-ink before:transition-transform before:duration-420 before:ease-[cubic-bezier(.2,.8,.2,1)] hover:text-paper hover:before:scale-x-100 focus-within:text-paper focus-within:before:scale-x-100 max-[760px]:min-h-34 max-[760px]:grid-cols-[48px_minmax(0,1fr)] max-[760px]:gap-(--space-2)"
            >
              <span class="relative z-1 font-display text-[28px] text-quiet transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                {{ String(index + 1).padStart(2, "0") }}
              </span>
              <div class="relative z-1 grid min-w-0 gap-(--space-1)">
                <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                  {{ article.date }}
                </p>
                <h2 class="m-0 min-w-0 truncate font-display text-[72px] font-normal leading-[0.95] tracking-normal max-[1100px]:text-[56px] max-[520px]:text-[36px]">
                  <NuxtLink
                    class="block truncate focus-visible:outline-none"
                    :href="article.path"
                  >
                    {{ article.title }}
                  </NuxtLink>
                </h2>
                <p class="m-0 line-clamp-3 max-w-180 text-lg leading-[1.55] text-muted text-pretty transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                  {{ article.description }}
                </p>
              </div>
              <span
                class="relative z-1 translate-x-4 text-sm text-quiet opacity-0 transition-[opacity,transform,color] duration-200 group-hover:translate-x-0 group-hover:text-paper group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:text-paper group-focus-within:opacity-100 max-[760px]:hidden"
                aria-hidden="true"
              >
                Read
              </span>
            </article>
          </div>

          <div v-else class="grid border-t border-line" aria-label="文章列表空状态">
            <div
              class="group grid min-h-76 grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-4) border-b border-line px-(--space-2) py-(--space-6) transition-colors duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-ink hover:text-paper max-[760px]:grid-cols-1"
            >
              <div class="grid max-w-190 gap-(--space-2)">
                <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper">
                  {{ appConfig.blogList.emptyKicker }}
                </p>
                <h2 class="m-0 font-display text-[72px] font-normal leading-[0.95] tracking-normal text-pretty max-[1100px]:text-[56px] max-[520px]:text-[36px]">
                  {{ appConfig.blogList.emptyTitle }}
                </h2>
                <p class="m-0 text-lg leading-[1.6] text-muted text-pretty transition-colors duration-200 group-hover:text-paper">
                  {{ appConfig.blogList.emptyDescription }}
                </p>
              </div>

              <AppLinkButton :href="appConfig.blogList.homeAction.href" variant="outline">
                {{ appConfig.blogList.homeAction.label }}
              </AppLinkButton>
            </div>
          </div>

          <div class="grid grid-cols-[minmax(0,1fr)_minmax(240px,360px)] gap-(--space-4) max-[900px]:grid-cols-1">
            <p class="m-0 max-w-170 text-lg leading-[1.6] text-muted text-pretty">
              {{ appConfig.blogList.integrationDescription }}
            </p>
            <ul class="m-0 grid list-none gap-(--space-1) p-0 text-sm font-bold uppercase tracking-normal text-muted">
              <li
                v-for="item in appConfig.blogList.integrationItems"
                :key="item"
                class="border-b border-line py-(--space-1)"
              >
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  </NuxtLayout>
</template>
