<script setup lang="ts">
type ProjectItem = {
  id?: string
  name: string
  description: string
  status: string
  category: string
  sourceUrl: string
  launchUrl: string
  tags: string[]
  featured?: boolean
  hidden?: boolean
  order?: number
  coverUrl?: string
  updatedAt?: string
}

const appConfig = useAppConfig();
const route = useRoute();
const router = useRouter();
const { getSearchHighlightTerms, searchContentItems } = useArticleSearch();
const { data: projectItems } = await useAsyncData("projects-list", () =>
  $fetch<ProjectItem[]>("/api/projects"),
  {
    default: () => appConfig.projects.items ?? [],
  },
);
const projects = computed(() => projectItems.value);
const queryValueList = (value: unknown) => (
  Array.isArray(value) ? value : [value]
).filter((item): item is string => typeof item === "string" && item.trim().length > 0);
const quoteSearchValue = (value: string) => `"${value.replaceAll('"', '\\"')}"`;
const selectedCategories = computed(() => queryValueList(route.query.category));
const selectedTags = computed(() => [
  ...queryValueList(route.query.tag),
  ...queryValueList(route.query.tags),
]);
const selectedStatuses = computed(() => queryValueList(route.query.status));
const freeSearchQuery = computed(() => [
  ...queryValueList(route.query.q),
  ...queryValueList(route.query.search),
].join(" ").trim());
const projectSearchInput = ref(freeSearchQuery.value);
const structuredSearchQuery = computed(() => [
  freeSearchQuery.value,
  ...selectedCategories.value.map((category) => `category=${quoteSearchValue(category)}`),
  ...selectedTags.value.map((tag) => `tag=${quoteSearchValue(tag)}`),
  ...selectedStatuses.value.map((status) => `status=${quoteSearchValue(status)}`),
].filter(Boolean).join(" "));
const filteredProjects = computed(() => (
  structuredSearchQuery.value
    ? searchContentItems(projects.value.map((project) => ({
      ...project,
      type: "project" as const,
      pinned: project.featured,
      published: !project.hidden,
    })), structuredSearchQuery.value)
    : projects.value
));
const projectCount = computed(() => filteredProjects.value.length);
const isFiltered = computed(() => structuredSearchQuery.value.length > 0);
const highlightTerms = computed(() => getSearchHighlightTerms(structuredSearchQuery.value));
const pageSize = computed(() => appConfig.projects.pageSize);
const requestedPage = computed(() => {
  const page = Number.parseInt(String(route.query.page || "1"), 10);

  return Number.isFinite(page) ? page : 1;
});
const pageCount = computed(() => Math.max(1, Math.ceil(projectCount.value / pageSize.value)));
const currentPage = computed(() => Math.min(Math.max(1, requestedPage.value), pageCount.value));
const projectStartIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const paginatedProjects = computed(() => (
  filteredProjects.value.slice(projectStartIndex.value, projectStartIndex.value + pageSize.value)
));
const setPage = async (page: number) => {
  const nextQuery = { ...route.query };

  if (page <= 1) {
    delete nextQuery.page;
  } else {
    nextQuery.page = String(page);
  }

  await router.push({ query: nextQuery });
};
const submitProjectSearch = async () => {
  const nextQuery = { ...route.query };
  const query = projectSearchInput.value.trim();

  if (query) {
    nextQuery.q = query;
  } else {
    delete nextQuery.q;
    delete nextQuery.search;
  }

  delete nextQuery.page;
  await router.push({ query: nextQuery });
};
const setProjectQueryFilter = async (key: "category" | "tag" | "status", value: string) => {
  const nextQuery = { ...route.query, [key]: value };

  delete nextQuery.page;
  await router.push({ query: nextQuery });
};
const clearFilters = async () => {
  const nextQuery = { ...route.query };

  delete nextQuery.category;
  delete nextQuery.tag;
  delete nextQuery.tags;
  delete nextQuery.status;
  delete nextQuery.q;
  delete nextQuery.search;
  delete nextQuery.page;

  await router.push({ query: nextQuery });
};

watch(freeSearchQuery, (value) => {
  projectSearchInput.value = value;
});

useSiteSeo({
  title: appConfig.projects.title,
  description: appConfig.projects.description,
  path: '/projects',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: appConfig.projects.title,
    description: appConfig.projects.description,
    url: useAbsoluteSiteUrl('/projects')
  },
});
</script>

<template>
  <section
    class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-b border-line bg-paper max-[760px]:grid-cols-1"
    aria-labelledby="projects-title"
  >
      <aside
        class="border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
        aria-label="项目状态"
      >
        <div class="sticky top-32 grid gap-(--space-4) max-[760px]:static max-[760px]:grid-cols-[auto_1fr] max-[760px]:items-end">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal">
            {{ appConfig.projects.eyebrow }}
          </p>
          <p class="m-0 font-display text-[88px] leading-none text-ink max-[760px]:justify-self-end max-[760px]:text-[56px]">
            {{ projectCount.toString().padStart(2, "0") }}
          </p>
        </div>
      </aside>

      <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
        <div class="grid max-w-300 gap-(--space-8)">
          <div class="grid gap-(--space-3)">
            <h1
              id="projects-title"
              class="m-0 max-w-260 font-display text-[132px] font-normal leading-[0.95] tracking-normal text-ink text-pretty max-[1100px]:text-[88px] max-[520px]:text-[56px]"
            >
              {{ appConfig.projects.title }}
            </h1>
            <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
              {{ appConfig.projects.description }}
            </p>
          </div>

          <div
            class="grid gap-(--space-2) border-y border-line py-(--space-2)"
            aria-label="项目搜索"
          >
            <form class="grid grid-cols-[minmax(0,1fr)_auto] gap-(--space-1) max-[640px]:grid-cols-1" @submit.prevent="submitProjectSearch">
              <label class="grid gap-1 text-sm font-bold text-muted">
                搜索项目
                <input
                  v-model="projectSearchInput"
                  class="min-h-12 border border-line bg-code-surface px-(--space-2) text-base text-ink outline-none focus:border-ink"
                  placeholder="关键词、category=、tag=、status=、-草稿"
                >
              </label>
              <AppButton class="self-end" type="submit" variant="solid">
                <Icon name="lucide:search" mode="svg" class="h-4 w-4" aria-hidden="true" />
                搜索
              </AppButton>
            </form>

            <div
              v-if="isFiltered"
              class="flex flex-wrap items-center justify-between gap-(--space-2)"
              aria-label="当前项目筛选"
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
                  v-for="status in selectedStatuses"
                  :key="`status-${status}`"
                  class="border border-line px-(--space-1) py-1 text-ink"
                >
                  status={{ status }}
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
          </div>

          <div
            v-if="filteredProjects.length > 0"
            class="grid border-t border-line px-(--space-2)"
            aria-label="项目列表"
          >
            <article
              v-for="(project, index) in paginatedProjects"
              :key="project.name"
              class="group relative grid min-h-58 grid-cols-[72px_minmax(0,1fr)_minmax(180px,260px)] items-center gap-(--space-4) overflow-hidden border-b border-line px-(--space-2) py-(--space-4) text-ink before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-ink before:transition-transform before:duration-420 before:ease-[cubic-bezier(.2,.8,.2,1)] hover:text-paper hover:before:scale-x-100 focus-within:text-paper focus-within:before:scale-x-100 max-[900px]:grid-cols-[56px_minmax(0,1fr)] max-[900px]:items-start max-[520px]:grid-cols-1"
            >
              <span class="relative z-1 font-display text-[28px] text-quiet transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                {{ String(projectStartIndex + index + 1).padStart(2, "0") }}
              </span>

              <div class="relative z-1 grid min-w-0 gap-(--space-2)">
                <div class="flex flex-wrap items-center gap-x-(--space-2) gap-y-(--space-1)">
                  <button
                    type="button"
                    class="m-0 text-left text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 hover:underline group-hover:text-paper group-focus-within:text-paper"
                    @click="setProjectQueryFilter('status', project.status)"
                  >
                    <AppSearchHighlight :text="project.status" :terms="highlightTerms" />
                  </button>
                  <button
                    type="button"
                    class="m-0 text-left text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 hover:underline group-hover:text-paper group-focus-within:text-paper"
                    @click="setProjectQueryFilter('category', project.category)"
                  >
                    <AppSearchHighlight :text="project.category" :terms="highlightTerms" />
                  </button>
                </div>

                <h2 class="m-0 min-w-0 truncate font-display text-[88px] font-normal leading-[0.95] tracking-normal max-[1100px]:text-[64px] max-[520px]:text-[44px]">
                  <a
                    class="block truncate focus-visible:outline-none"
                    :href="project.launchUrl"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <AppSearchHighlight :text="project.name" :terms="highlightTerms" />
                  </a>
                </h2>

                <p class="m-0 max-w-190 text-lg leading-[1.55] text-muted text-pretty transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                  <AppSearchHighlight :text="project.description" :terms="highlightTerms" />
                </p>

                <ul
                  class="m-0 flex list-none flex-wrap gap-(--space-1) p-0"
                  aria-label="项目标签"
                >
                  <li
                    v-for="tag in project.tags"
                    :key="tag"
                  >
                    <button
                      type="button"
                      class="border border-line px-(--space-1) py-1 text-[12px] font-bold leading-none text-muted transition-colors duration-200 hover:bg-paper hover:text-ink group-hover:border-paper group-hover:text-paper group-focus-within:border-paper group-focus-within:text-paper"
                      @click="setProjectQueryFilter('tag', tag)"
                    >
                      <AppSearchHighlight :text="tag" :terms="highlightTerms" />
                    </button>
                  </li>
                </ul>
              </div>

              <div class="relative z-1 grid gap-(--space-1) justify-self-stretch max-[900px]:col-start-2 max-[900px]:grid-cols-2 max-[520px]:col-start-auto max-[520px]:grid-cols-1">
                <a
                  class="inline-flex min-h-11 items-center justify-center gap-2 rounded-token border border-line bg-paper px-(--space-2) text-sm font-bold tracking-normal text-ink! transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-paper hover:bg-paper hover:text-ink! focus-visible:border-paper focus-visible:bg-paper focus-visible:text-ink! focus-visible:outline-none active:scale-[0.98]"
                  :href="project.launchUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon
                    name="lucide:external-link"
                    mode="svg"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                  访问项目
                </a>
                <a
                  class="inline-flex min-h-11 items-center justify-center gap-2 rounded-token border border-line bg-transparent px-(--space-2) text-sm font-bold tracking-normal text-ink! transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:border-paper hover:bg-paper hover:text-ink! focus-visible:border-paper focus-visible:bg-paper focus-visible:text-ink! focus-visible:outline-none active:scale-[0.98] group-hover:text-paper! group-focus-within:text-paper!"
                  :href="project.sourceUrl"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon
                    name="lucide:github"
                    mode="svg"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                  源码仓库
                </a>
              </div>
            </article>
          </div>

          <AppPagination
            v-if="filteredProjects.length > 0"
            :page="currentPage"
            :page-count="pageCount"
            :total="projectCount"
            :page-size="pageSize"
            label="项目分页"
            @change="setPage"
          />

          <div
            v-else
            class="grid border-t border-line"
            aria-label="项目列表空状态"
          >
            <div class="group grid min-h-76 grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-4) border-b border-line px-(--space-2) py-(--space-6) transition-colors duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-ink hover:text-paper max-[760px]:grid-cols-1">
              <div class="grid max-w-190 gap-(--space-2)">
                <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper">
                  {{ appConfig.projects.emptyKicker }}
                </p>
                <h2 class="m-0 font-display text-[72px] font-normal leading-[0.95] tracking-normal text-pretty max-[1100px]:text-[56px] max-[520px]:text-[36px]">
                  {{ appConfig.projects.emptyTitle }}
                </h2>
                <p class="m-0 text-lg leading-[1.6] text-muted text-pretty transition-colors duration-200 group-hover:text-paper">
                  {{ appConfig.projects.emptyDescription }}
                </p>
              </div>

              <AppLinkButton :href="appConfig.projects.primaryAction.href" variant="outline">
                {{ appConfig.projects.primaryAction.label }}
              </AppLinkButton>
            </div>
          </div>

          <div class="grid grid-cols-[minmax(0,1fr)_minmax(240px,360px)] gap-(--space-4) max-[900px]:grid-cols-1">
            <p class="m-0 max-w-170 text-lg leading-[1.6] text-muted text-pretty">
              {{ appConfig.projects.integrationDescription }}
            </p>
            <ul class="m-0 grid list-none gap-(--space-1) p-0 text-sm font-bold uppercase tracking-normal text-muted">
              <li
                v-for="item in appConfig.projects.integrationItems"
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
