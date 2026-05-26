<script setup lang="ts">
const appConfig = useAppConfig();
const route = useRoute();
const slug = computed(() => String(route.params.slug));
const articlePath = computed(() => `/blog/${slug.value}`);

const { data: article } = await useAsyncData(`blog-${slug.value}`, () =>
  queryCollection("blog").path(articlePath.value).first(),
);

if (!article.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Article Not Found",
  });
}

const tocLinks = useContentTocLinks(() => article.value);
const readingStats = useContentReadingStats(() => article.value);
const articleTitleClass = computed(() => {
  const titleLength = article.value.title.length;

  if (titleLength > 64) {
    return "text-[48px] leading-[1.08] max-[1100px]:text-[42px] max-[520px]:text-[30px]";
  }

  if (titleLength > 52) {
    return "text-[60px] leading-[1.04] max-[1100px]:text-[50px] max-[520px]:text-[34px]";
  }

  if (titleLength > 42) {
    return "text-[84px] leading-[1] max-[1100px]:text-[64px] max-[520px]:text-[42px]";
  }

  return "text-[132px] leading-[0.95] max-[1100px]:text-[88px] max-[520px]:text-[56px]";
});

useHead({
  title: `${article.value.title} - ${appConfig.site.name}`,
  meta: [
    {
      name: "description",
      content: article.value.description,
    },
  ],
});
</script>

<template>
  <NuxtLayout>
    <article
      class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(112px,16vw)_minmax(0,1fr)_minmax(200px,280px)] border-b border-line bg-paper max-[1000px]:grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] max-[760px]:grid-cols-1"
      aria-labelledby="article-title"
    >
      <ArticleMetaRail
        :date="article.date"
        :author="article.author"
        :author-url="article.authorUrl"
        :word-count="readingStats.wordCount"
        :reading-minutes="readingStats.readingMinutes"
        :views="article.views"
      />

      <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
        <div class="grid max-w-300 gap-(--space-8)">
          <header class="grid gap-(--space-3)">
            <NuxtLink
              class="inline-flex w-fit min-h-11 items-center rounded-token px-(--space-2) text-sm font-bold tracking-normal text-muted! transition-colors duration-200 hover:bg-ink hover:text-paper! focus-visible:bg-ink focus-visible:text-paper! focus-visible:outline-none"
              href="/blog"
            >
              返回文章目录
            </NuxtLink>
            <h1
              id="article-title"
              class="m-0 max-w-300 break-words font-display font-normal tracking-normal text-ink text-pretty"
              :class="articleTitleClass"
            >
              {{ article.title }}
            </h1>
            <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
              {{ article.description }}
            </p>
          </header>

          <ContentBody :value="article" />
        </div>
      </div>

      <ContentTableOfContents
        class="mr-[clamp(var(--space-3),5vw,var(--space-8))] py-(--space-8) max-[1000px]:col-start-2 max-[1000px]:mr-0 max-[1000px]:px-[clamp(var(--space-3),6vw,var(--space-12))] max-[1000px]:pt-0 max-[760px]:col-start-auto max-[760px]:px-(--space-2)"
        :links="tocLinks"
        label="文章目录"
      />
    </article>
  </NuxtLayout>
</template>
