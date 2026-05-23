<script setup lang="ts">
const props = defineProps<{
  title: string
}>()

const letters = computed(() => props.title.split(''))
</script>

<template>
  <h1
    class="m-0 flex flex-wrap items-end font-display text-[176px] font-normal leading-[0.78] tracking-normal max-[1100px]:text-[132px] max-[760px]:text-[88px] max-[520px]:text-[56px]"
    :aria-label="title"
  >
    <span
      v-for="(letter, index) in letters"
      :key="`${letter}-${index}`"
      class="inline-block translate-y-7 opacity-0 animate-type-rise nth-[4n]:italic"
      :style="{ animationDelay: `${index * 58}ms` }"
    >
      {{ letter }}
    </span>
  </h1>
</template>
