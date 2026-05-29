<script setup lang="ts">
const appConfig = useAppConfig();

useHead({
  title: appConfig.site.name,
});
</script>

<template>
  <NuxtPage />
</template>
