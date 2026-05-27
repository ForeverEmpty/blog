<script setup lang="ts">
import { dailyQuote as fallbackDailyQuote, getDailyQuote } from "@/config/dailyQuote";

const appConfig = useAppConfig();

const { data: dailyQuote } = await useAsyncData("daily-quote", getDailyQuote, {
  default: () => fallbackDailyQuote,
});

const { data: articles } = await useAsyncData("home-blog-list", () =>
  queryCollection("blog")
    .where("published", "=", true)
    .order("date", "DESC")
    .limit(3)
    .all(),
  {
    default: () => [],
  },
);

const projects = computed(() => (appConfig.projects.items ?? []).slice(0, 3));
</script>

<template>
  <NuxtLayout>
    <section
      class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(0,1fr)] content-end gap-(--space-4) px-[clamp(var(--space-3),5vw,var(--space-8))] pt-(--space-8) pb-(--space-6) max-[760px]:min-h-[calc(100vh-133px)] max-[760px]:px-(--space-2) max-[760px]:pt-(--space-6) max-[760px]:pb-(--space-4)"
      aria-labelledby="home-title"
    >
      <div
        class="max-w-140 text-[13px] font-bold uppercase tracking-normal text-muted"
      >
        {{ appConfig.home.eyebrow }}
      </div>
      <HeroTitle id="home-title" :title="appConfig.home.title" />
      <div
        class="grid max-w-280 grid-cols-[minmax(0,560px)_auto] items-end gap-(--space-4) max-[760px]:grid-cols-1"
      >
        <TypewriterText
          :sentences="dailyQuote"
          class="text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg"
        />
        <AppLinkButton :href="appConfig.home.structureLink.href" variant="text">
          {{ appConfig.home.structureLink.label }}
        </AppLinkButton>
      </div>
    </section>

    <ArticleIndex
      :words="appConfig.home.articleIndex.words"
      :title="appConfig.home.articleIndex.title"
      :description="appConfig.home.articleIndex.description"
      :articles="articles"
    />

    <ProjectIndex
      :words="appConfig.home.projectIndex.words"
      :title="appConfig.home.projectIndex.title"
      :description="appConfig.home.projectIndex.description"
      :projects="projects"
    />
  </NuxtLayout>
</template>
