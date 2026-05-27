<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <DocCallout
    variant="danger"
    :title="title"
  >
    <slot />
  </DocCallout>
</template>
