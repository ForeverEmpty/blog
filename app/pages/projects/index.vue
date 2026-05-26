<script setup lang="ts">
const appConfig = useAppConfig();

useHead({
  title: `${appConfig.projects.title} - ${appConfig.site.name}`,
});
</script>

<template>
  <NuxtLayout>
    <IndexEmptyPage
      :config="appConfig.projects"
      labelled-by="projects-title"
      sidebar-label="项目状态"
      list-label="项目列表"
    />
  </NuxtLayout>
</template>
