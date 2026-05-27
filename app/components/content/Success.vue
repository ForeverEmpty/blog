<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <DocCallout
    variant="success"
    :title="title"
  >
    <slot />
  </DocCallout>
</template>
