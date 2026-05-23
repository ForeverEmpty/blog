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
    <button
      v-for="option in themeOptions"
      :key="option.mode"
      class="relative z-10 inline-flex h-9 min-w-10 cursor-pointer items-center justify-center gap-1 rounded-[4px] px-2 text-sm transition-[color,transform] duration-300 ease-[cubic-bezier(.16,1,.3,1)] active:scale-95 focus-visible:outline-none"
      :class="themeMode === option.mode
        ? 'text-control-active-text'
        : 'text-control-text hover:text-control-hover-text focus-visible:text-control-hover-text'"
      type="button"
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
    </button>
  </div>
</template>
