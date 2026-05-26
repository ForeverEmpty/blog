<script setup lang="ts">
const appConfig = useAppConfig();

useHead({
  title: `${appConfig.archive.title} - ${appConfig.site.name}`,
});
</script>

<template>
  <NuxtLayout>
    <IndexEmptyPage
      :config="appConfig.archive"
      labelled-by="archive-title"
      sidebar-label="归档状态"
      list-label="归档列表"
    />
  </NuxtLayout>
</template>
