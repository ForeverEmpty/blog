<script setup lang="ts">
const appConfig = useAppConfig();

useHead({
  htmlAttrs: {
    lang: appConfig.site.locale,
  },
  script: [
    {
      key: 'website-json-ld',
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: appConfig.site.name,
        description: appConfig.site.description,
        url: useAbsoluteSiteUrl('/'),
        inLanguage: appConfig.site.locale,
        publisher: {
          '@type': 'Person',
          name: appConfig.site.author,
          url: useAbsoluteSiteUrl('/about'),
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${useAbsoluteSiteUrl('/blog')}?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      }),
    },
  ],
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage
      :transition="{
        name: 'page'
      }"
    />
  </NuxtLayout>
</template>
