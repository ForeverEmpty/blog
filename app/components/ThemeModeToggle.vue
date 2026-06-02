<script setup lang="ts">
import { isThemeMode, themeModeCookieName } from '~/utils/themeMode'

const { themeMode, themeOptions, indicatorStyle, setThemeMode } = useThemeMode()
const themeModeCookie = useCookie(themeModeCookieName)

const hasHydratedThemeToggle = useState('chanko-theme-toggle-hydrated', () => false)
const isThemeToggleMotionReady = useState('chanko-theme-toggle-motion-ready', () => false)
const hasInitialThemePreference = useState('chanko-theme-toggle-has-initial-preference', () => (
  isThemeMode(themeModeCookie.value)
))
const shouldDeferThemeToggle = computed(() => !hasInitialThemePreference.value && !hasHydratedThemeToggle.value)
const renderedThemeMode = computed(() => (shouldDeferThemeToggle.value ? 'system' : themeMode.value))
const renderedIndicatorStyle = computed(() => (
  shouldDeferThemeToggle.value ? { transform: 'translateX(200%)' } : indicatorStyle.value
))
const indicatorMotionClass = computed(() => (
  isThemeToggleMotionReady.value
    ? 'transition-[background-color,transform] duration-500 ease-[cubic-bezier(.16,1,.3,1)]'
    : 'transition-none! duration-0!'
))
const controlMotionClass = computed(() => (
  isThemeToggleMotionReady.value ? '' : 'transition-none! duration-0!'
))
const iconMotionClass = computed(() => (
  isThemeToggleMotionReady.value
    ? 'transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]'
    : 'transition-none! duration-0!'
))

onMounted(() => {
  hasInitialThemePreference.value = true

  if (!hasHydratedThemeToggle.value) {
    hasHydratedThemeToggle.value = true
  }

  window.requestAnimationFrame(() => {
    isThemeToggleMotionReady.value = true
  })
})
</script>

<template>
  <div
    class="relative isolate inline-grid grid-cols-3 overflow-hidden rounded-token border border-line bg-paper p-1 transition-[background-color,border-color] duration-300"
    :class="shouldDeferThemeToggle ? 'opacity-0' : 'opacity-100'"
    role="radiogroup"
    aria-label="主题模式"
  >
    <span
      class="pointer-events-none absolute top-1 bottom-1 left-1 z-0 w-[calc((100%-8px)/3)] rounded-[4px] bg-control-active"
      :class="indicatorMotionClass"
      :style="renderedIndicatorStyle"
      aria-hidden="true"
    />
    <AppButton
      v-for="option in themeOptions"
      :key="option.mode"
      class="relative z-10"
      variant="control"
      :class="[
        controlMotionClass,
        renderedThemeMode === option.mode
          ? 'text-control-active-text'
          : 'text-control-text hover:text-control-hover-text focus-visible:text-control-hover-text'
      ]"
      role="radio"
      :aria-checked="renderedThemeMode === option.mode"
      :aria-label="option.title"
      :title="option.title"
      @click="setThemeMode(option.mode, $event)"
    >
      <Icon
        :name="option.icon"
        mode="svg"
        class="h-4 w-4"
        :class="[
          iconMotionClass,
          renderedThemeMode === option.mode ? 'scale-110 -rotate-6' : 'scale-100 rotate-0'
        ]"
        aria-hidden="true"
      />
    </AppButton>
  </div>
</template>
