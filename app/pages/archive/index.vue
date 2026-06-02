<script setup lang="ts">
const appConfig = useAppConfig();

const { data: articles } = await useAsyncData("archive-list", () =>
  queryCollection("blog")
    .order("date", "DESC")
    .all(),
  {
    default: () => [],
  },
);

const publicArticles = computed(() => articles.value.filter(isPublicArticle));
const articleCount = computed(() => publicArticles.value.length);
const collapsedYears = ref<string[]>([]);
const collapsedMonths = ref<string[]>([]);

const dateParts = (date: string) => {
  const [year = "0000", month = "01", day = "01"] = date.split("-");

  return {
    year,
    month,
    day,
    monthLabel: `${Number(month)}月`,
    dayLabel: day.padStart(2, "0"),
  };
};

const archiveYears = computed(() => {
  const years = new Map<string, {
    year: string
    count: number
    months: Map<string, {
      key: string
      label: string
      count: number
      articles: typeof articles.value
    }>
  }>();

  for (const article of publicArticles.value) {
    const parts = dateParts(article.date);
    const yearGroup = years.get(parts.year) ?? {
      year: parts.year,
      count: 0,
      months: new Map(),
    };
    const monthGroup = yearGroup.months.get(parts.month) ?? {
      key: parts.month,
      label: parts.monthLabel,
      count: 0,
      articles: [],
    };

    monthGroup.articles.push(article);
    monthGroup.count += 1;
    yearGroup.count += 1;
    yearGroup.months.set(parts.month, monthGroup);
    years.set(parts.year, yearGroup);
  }

  return [...years.values()].map((yearGroup) => ({
    ...yearGroup,
    months: [...yearGroup.months.values()],
  }));
});

const archiveSummary = computed(() => {
  const monthCount = archiveYears.value.reduce((total, year) => total + year.months.length, 0);

  return [
    `${archiveYears.value.length.toString().padStart(2, "0")} 年`,
    `${monthCount.toString().padStart(2, "0")} 月`,
  ];
});

const monthPanelId = (year: string, month: string) => `archive-month-panel-${year}-${month}`;
const yearPanelId = (year: string) => `archive-year-panel-${year}`;
const monthCollapseId = (year: string, month: string) => `${year}-${month}`;
const toggleValue = (values: string[], value: string) => (
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
);
const toggleYear = (year: string) => {
  collapsedYears.value = toggleValue(collapsedYears.value, year);
};
const toggleMonth = (year: string, month: string) => {
  collapsedMonths.value = toggleValue(collapsedMonths.value, monthCollapseId(year, month));
};
const isYearCollapsed = (year: string) => collapsedYears.value.includes(year);
const isMonthCollapsed = (year: string, month: string) => (
  collapsedMonths.value.includes(monthCollapseId(year, month))
);

useSiteSeo({
  title: appConfig.archive.title,
  description: appConfig.archive.description,
  path: '/archive',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: appConfig.archive.title,
    description: appConfig.archive.description,
    url: useAbsoluteSiteUrl('/archive')
  },
});
</script>

<template>
  <section
    class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-b border-line bg-paper max-[760px]:grid-cols-1"
    aria-labelledby="archive-title"
  >
      <aside
        class="border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
        aria-label="归档状态"
      >
        <div class="sticky top-32 grid gap-(--space-4) max-[760px]:static max-[760px]:grid-cols-[auto_1fr] max-[760px]:items-end">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal">
            {{ appConfig.archive.eyebrow }}
          </p>
          <p class="m-0 font-display text-[88px] leading-none text-ink max-[760px]:justify-self-end max-[760px]:text-[56px]">
            {{ articleCount.toString().padStart(2, "0") }}
          </p>
          <dl class="m-0 grid gap-(--space-1) text-[13px] font-bold uppercase tracking-normal max-[760px]:col-span-2 max-[760px]:grid-cols-2">
            <div
              v-for="item in archiveSummary"
              :key="item"
              class="border-t border-line pt-(--space-1)"
            >
              <dt class="sr-only">归档统计</dt>
              <dd class="m-0">{{ item }}</dd>
            </div>
          </dl>
        </div>
      </aside>

      <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
        <div class="grid max-w-300 gap-(--space-8)">
          <div class="grid gap-(--space-3)">
            <h1
              id="archive-title"
              class="m-0 max-w-260 font-display text-[132px] font-normal leading-[0.95] tracking-normal text-ink text-pretty max-[1100px]:text-[88px] max-[520px]:text-[56px]"
            >
              {{ appConfig.archive.title }}
            </h1>
            <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
              {{ appConfig.archive.description }}
            </p>
          </div>

          <div
            v-if="archiveYears.length > 0"
            class="grid border-t border-line"
            aria-label="归档时间线"
          >
            <section
              v-for="yearGroup in archiveYears"
              :key="yearGroup.year"
              class="grid grid-cols-[220px_minmax(0,1fr)] border-b border-line max-[820px]:grid-cols-1"
              :aria-labelledby="`archive-year-${yearGroup.year}`"
            >
              <div class="border-r border-line py-(--space-3) pr-(--space-4) pl-(--space-2) max-[820px]:border-r-0 max-[820px]:border-b max-[820px]:p-(--space-2)">
                <div class="sticky top-28 grid gap-(--space-1) max-[820px]:static">
                  <h2
                    :id="`archive-year-${yearGroup.year}`"
                    class="m-0"
                  >
                    <button
                      type="button"
                      class="group/year flex w-full cursor-pointer items-center justify-between gap-(--space-2) p-0 text-left font-display text-[72px] font-normal leading-none tracking-normal text-ink transition-colors duration-200 hover:text-muted focus-visible:text-muted focus-visible:outline-none max-[520px]:text-[48px]"
                      :aria-expanded="!isYearCollapsed(yearGroup.year)"
                      :aria-controls="yearPanelId(yearGroup.year)"
                      @click="toggleYear(yearGroup.year)"
                    >
                      <span>{{ yearGroup.year }}</span>
                      <Icon
                        name="lucide:chevron-down"
                        mode="svg"
                        class="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-hover/year:text-ink group-focus-visible/year:text-ink"
                        :class="isYearCollapsed(yearGroup.year) ? '-rotate-90' : ''"
                        aria-hidden="true"
                      />
                    </button>
                  </h2>
                  <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                    {{ yearGroup.count.toString().padStart(2, "0") }} Posts
                  </p>
                </div>
              </div>

              <div
                v-show="!isYearCollapsed(yearGroup.year)"
                :id="yearPanelId(yearGroup.year)"
                class="relative grid"
              >
                <div
                  class="pointer-events-none absolute bottom-0 left-[calc(var(--space-3)+5px)] top-0 w-px bg-line max-[620px]:left-[calc(var(--space-2)+5px)]"
                  aria-hidden="true"
                />

                <section
                  v-for="monthGroup in yearGroup.months"
                  :key="`${yearGroup.year}-${monthGroup.key}`"
                  class="relative grid grid-cols-[96px_minmax(0,1fr)] gap-(--space-3) px-(--space-3) py-(--space-4) max-[620px]:grid-cols-1 max-[620px]:gap-(--space-2) max-[620px]:px-(--space-2)"
                  :aria-label="`${yearGroup.year} 年 ${monthGroup.label}`"
                >
                  <div class="relative z-1 grid content-start gap-2">
                    <button
                      type="button"
                      class="group/month grid cursor-pointer gap-2 p-0 text-left focus-visible:outline-none"
                      :aria-expanded="!isMonthCollapsed(yearGroup.year, monthGroup.key)"
                      :aria-controls="monthPanelId(yearGroup.year, monthGroup.key)"
                      @click="toggleMonth(yearGroup.year, monthGroup.key)"
                    >
                      <span
                        class="h-3 w-3 border border-ink bg-paper transition-colors duration-200 group-hover/month:bg-ink group-focus-visible/month:bg-ink"
                        aria-hidden="true"
                      />
                      <span class="ml-(--space-3) flex items-center gap-(--space-1) font-display text-[40px] leading-none text-ink transition-colors duration-200 group-hover/month:text-muted group-focus-visible/month:text-muted max-[620px]:ml-(--space-2) max-[620px]:text-[32px]">
                        {{ monthGroup.label }}
                        <Icon
                          name="lucide:chevron-down"
                          mode="svg"
                          class="h-4 w-4 shrink-0 text-muted transition-transform duration-200"
                          :class="isMonthCollapsed(yearGroup.year, monthGroup.key) ? '-rotate-90' : ''"
                          aria-hidden="true"
                        />
                      </span>
                      <span class="ml-(--space-3) text-[12px] font-bold uppercase tracking-normal text-muted max-[620px]:ml-(--space-2)">
                        {{ monthGroup.count.toString().padStart(2, "0") }} Items
                      </span>
                    </button>
                  </div>

                  <ArticleList
                    v-show="!isMonthCollapsed(yearGroup.year, monthGroup.key)"
                    :id="monthPanelId(yearGroup.year, monthGroup.key)"
                    :articles="monthGroup.articles"
                    :label="`${yearGroup.year} 年 ${monthGroup.label}文章列表`"
                    :heading-level="3"
                    :padded="false"
                  />
                </section>
              </div>
            </section>
          </div>

          <div
            v-else
            class="grid border-t border-line"
            aria-label="归档列表空状态"
          >
            <div class="grid min-h-96 grid-cols-[160px_minmax(0,1fr)] border-b border-line max-[760px]:grid-cols-1">
              <div class="border-r border-line p-(--space-3) max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:p-(--space-2)">
                <p class="m-0 font-display text-[64px] leading-none text-quiet">
                  0000
                </p>
              </div>
              <div class="group relative grid content-end gap-(--space-3) overflow-hidden p-(--space-4) text-ink before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-ink before:transition-transform before:duration-420 before:ease-[cubic-bezier(.2,.8,.2,1)] hover:text-paper hover:before:scale-x-100 max-[760px]:p-(--space-2)">
                <div
                  class="relative z-1 grid max-w-190 gap-(--space-2)"
                >
                  <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper">
                    {{ appConfig.archive.emptyKicker }}
                  </p>
                  <h2 class="m-0 font-display text-[72px] font-normal leading-[0.95] tracking-normal text-pretty max-[1100px]:text-[56px] max-[520px]:text-[36px]">
                    {{ appConfig.archive.emptyTitle }}
                  </h2>
                  <p class="m-0 text-lg leading-[1.6] text-muted text-pretty transition-colors duration-200 group-hover:text-paper">
                    {{ appConfig.archive.emptyDescription }}
                  </p>
                </div>

                <AppLinkButton
                  class="relative z-1 w-fit"
                  :href="appConfig.archive.primaryAction.href"
                  variant="outline"
                >
                  {{ appConfig.archive.primaryAction.label }}
                </AppLinkButton>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-[minmax(0,1fr)_minmax(240px,360px)] gap-(--space-4) max-[900px]:grid-cols-1">
            <p class="m-0 max-w-170 text-lg leading-[1.6] text-muted text-pretty">
              {{ appConfig.archive.integrationDescription }}
            </p>
            <ul class="m-0 grid list-none gap-(--space-1) p-0 text-sm font-bold uppercase tracking-normal text-muted">
              <li
                v-for="item in appConfig.archive.integrationItems"
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
