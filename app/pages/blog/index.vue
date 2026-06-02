<script setup lang="ts">
const appConfig = useAppConfig();
const route = useRoute();
const router = useRouter();
const { searchContentItems } = useArticleSearch();

const { data: articles } = await useAsyncData("blog-list", () =>
  queryCollection("blog")
    .all(),
  {
    default: () => [],
  },
);

const sortedArticles = computed(() => sortArticles(articles.value));
const publicArticles = computed(() => sortedArticles.value.filter(isPublicArticle));
const queryValueList = (value: unknown) => (
  Array.isArray(value) ? value : [value]
).filter((item): item is string => typeof item === "string" && item.trim().length > 0);

const quoteSearchValue = (value: string) => `"${value.replaceAll('"', '\\"')}"`;

const selectedCategories = computed(() => queryValueList(route.query.category));
const selectedTags = computed(() => [
  ...queryValueList(route.query.tag),
  ...queryValueList(route.query.tags),
]);
const freeSearchQuery = computed(() => [
  ...queryValueList(route.query.q),
  ...queryValueList(route.query.search),
].join(" ").trim());
const structuredSearchQuery = computed(() => [
  freeSearchQuery.value,
  ...selectedCategories.value.map((category) => `category=${quoteSearchValue(category)}`),
  ...selectedTags.value.map((tag) => `tag=${quoteSearchValue(tag)}`),
].filter(Boolean).join(" "));
const filteredArticles = computed(() => (
  structuredSearchQuery.value
    ? searchContentItems(publicArticles.value, structuredSearchQuery.value)
    : publicArticles.value
));
const isFiltered = computed(() => structuredSearchQuery.value.length > 0);
const articleCount = computed(() => filteredArticles.value.length);
const pageSize = computed(() => appConfig.blogList.pageSize);
const requestedPage = computed(() => {
  const page = Number.parseInt(String(route.query.page || "1"), 10);

  return Number.isFinite(page) ? page : 1;
});
const pageCount = computed(() => Math.max(1, Math.ceil(articleCount.value / pageSize.value)));
const currentPage = computed(() => Math.min(Math.max(1, requestedPage.value), pageCount.value));
const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;

  return filteredArticles.value.slice(start, start + pageSize.value);
});
const setPage = async (page: number) => {
  const nextQuery = { ...route.query };

  if (page <= 1) {
    delete nextQuery.page;
  } else {
    nextQuery.page = String(page);
  }

  await router.push({ query: nextQuery });
};
const clearFilters = async () => {
  const nextQuery = { ...route.query };

  delete nextQuery.category;
  delete nextQuery.tag;
  delete nextQuery.tags;
  delete nextQuery.q;
  delete nextQuery.search;
  delete nextQuery.page;

  await router.push({ query: nextQuery });
};

useSiteSeo({
  title: appConfig.blogList.title,
  description: appConfig.blogList.description,
  path: '/blog',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: appConfig.blogList.title,
    description: appConfig.blogList.description,
    url: useAbsoluteSiteUrl('/blog')
  },
});
</script>

<template>
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
            v-if="isFiltered"
            class="flex flex-wrap items-center justify-between gap-(--space-2) border-y border-line py-(--space-2)"
            aria-label="当前文章筛选"
          >
            <div class="flex flex-wrap items-center gap-(--space-1) text-sm font-bold uppercase tracking-normal text-muted">
              <span>筛选结果</span>
              <span
                v-for="category in selectedCategories"
                :key="`category-${category}`"
                class="border border-line px-(--space-1) py-1 text-ink"
              >
                category={{ category }}
              </span>
              <span
                v-for="tag in selectedTags"
                :key="`tag-${tag}`"
                class="border border-line px-(--space-1) py-1 text-ink"
              >
                tag={{ tag }}
              </span>
              <span
                v-if="freeSearchQuery"
                class="border border-line px-(--space-1) py-1 text-ink"
              >
                q={{ freeSearchQuery }}
              </span>
            </div>
            <button
              type="button"
              class="border border-line bg-paper px-(--space-2) py-(--space-1) text-sm font-bold uppercase tracking-normal text-ink transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              @click="clearFilters"
            >
              清除筛选
            </button>
          </div>

          <ArticleList
            v-if="filteredArticles.length > 0"
            :articles="paginatedArticles"
            label="文章列表"
            :start-index="(currentPage - 1) * pageSize"
          />

          <AppPagination
            v-if="filteredArticles.length > 0"
            :page="currentPage"
            :page-count="pageCount"
            :total="articleCount"
            :page-size="pageSize"
            label="文章分页"
            @change="setPage"
          />

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
</template>
