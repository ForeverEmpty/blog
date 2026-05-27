<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <DocCallout
    variant="tip"
    :title="title"
  >
    <slot />
  </DocCallout>
</template>
