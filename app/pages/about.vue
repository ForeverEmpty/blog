<script setup lang="ts">
const appConfig = useAppConfig();

const { data: page } = await useAsyncData("about-page", () =>
  queryCollection("pages").path("/about").first(),
);

if (!page.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "About Page Not Found",
  });
}

const tocLinks = useContentTocLinks(() => page.value);

useSiteSeo({
  title: page.value.title,
  description: page.value.description,
  path: '/about',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: page.value.title,
    description: page.value.description,
    url: useAbsoluteSiteUrl('/about')
  },
});
</script>

<template>
  <section
    class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-b border-line bg-paper max-[760px]:grid-cols-1"
    aria-labelledby="about-title"
  >
      <aside
        class="border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
        aria-label="关于页面"
      >
        <div class="sticky top-32 grid gap-(--space-4) max-[760px]:static max-[760px]:grid-cols-[auto_1fr] max-[760px]:items-end">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal">
            About
          </p>
          <p class="m-0 font-display text-[88px] leading-none text-ink max-[760px]:justify-self-end max-[760px]:text-[56px]">
            CB
          </p>
        </div>
      </aside>

      <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
        <div class="grid max-w-320 gap-(--space-8)">
          <header class="grid gap-(--space-3)">
            <h1
              id="about-title"
              class="m-0 max-w-240 font-display text-[132px] font-normal leading-[0.95] tracking-normal text-ink text-pretty max-[1100px]:text-[88px] max-[520px]:text-[56px]"
            >
              {{ page.title }}
            </h1>
            <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
              {{ page.description }}
            </p>
          </header>

          <div class="grid grid-cols-[minmax(0,760px)_minmax(200px,280px)] items-start gap-(--space-8) max-[1000px]:grid-cols-1">
            <ContentBody :value="page" />
            <ContentTableOfContents :links="tocLinks" label="关于目录" />
          </div>
        </div>
      </div>
  </section>
</template>
