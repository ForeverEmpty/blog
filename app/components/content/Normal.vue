<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <DocCallout
    variant="normal"
    :title="title"
  >
    <slot />
  </DocCallout>
</template>
