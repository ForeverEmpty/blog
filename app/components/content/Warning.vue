<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <DocCallout
    variant="warning"
    :title="title"
  >
    <slot />
  </DocCallout>
</template>
