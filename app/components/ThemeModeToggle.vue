<script setup lang="ts">
const { themeMode, themeOptions, indicatorStyle, setThemeMode } = useThemeMode()
</script>

<template>
  <div
    class="relative isolate inline-grid grid-cols-3 overflow-hidden rounded-token border border-line bg-paper p-1 transition-[background-color,border-color] duration-300"
    role="radiogroup"
    aria-label="主题模式"
  >
    <span
      class="pointer-events-none absolute top-1 bottom-1 left-1 z-0 w-[calc((100%-8px)/3)] rounded-[4px] bg-control-active transition-[background-color,transform] duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
      :style="indicatorStyle"
      aria-hidden="true"
    />
    <AppButton
      v-for="option in themeOptions"
      :key="option.mode"
      class="relative z-10"
      variant="control"
      :class="themeMode === option.mode
        ? 'text-control-active-text'
        : 'text-control-text hover:text-control-hover-text focus-visible:text-control-hover-text'"
      role="radio"
      :aria-checked="themeMode === option.mode"
      :aria-label="option.title"
      :title="option.title"
      @click="setThemeMode(option.mode)"
    >
      <Icon
        :name="option.icon"
        mode="svg"
        class="h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
        :class="themeMode === option.mode ? 'scale-110 -rotate-6' : 'scale-100 rotate-0'"
        aria-hidden="true"
      />
    </AppButton>
  </div>
</template>
