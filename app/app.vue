<script setup lang="ts">
const appConfig = useAppConfig();

useSiteSeo({
  title: appConfig.seo.defaultTitle,
  description: appConfig.site.description,
  path: '/',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: appConfig.site.name,
    description: appConfig.site.description,
    url: useAbsoluteSiteUrl('/'),
    inLanguage: appConfig.site.locale,
    publisher: {
      '@type': 'Person',
      name: appConfig.site.author,
      url: useAbsoluteSiteUrl('/about')
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${useAbsoluteSiteUrl('/blog')}?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  },
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage
      :transition="{
        name: 'page',
        mode: 'out-in'
      }"
    />
  </NuxtLayout>
</template>
