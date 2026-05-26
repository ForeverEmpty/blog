<script setup lang="ts">
const appConfig = useAppConfig();

useHead({
  title: appConfig.site.name,
  script: [
    {
      id: "theme-init",
      innerHTML: `(() => {
  try {
    const mode = localStorage.getItem('chanko-theme-mode') || 'system'
    const root = document.documentElement
    if (mode === 'dark' || mode === 'light') {
      root.dataset.theme = mode
    } else {
      root.removeAttribute('data-theme')
    }
    root.dataset.themeMode = mode
  } catch {}
})()`,
    },
  ],
});
</script>

<template>
  <NuxtPage />
</template>
