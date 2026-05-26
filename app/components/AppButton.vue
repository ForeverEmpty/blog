<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: 'button' | 'submit' | 'reset'
  variant?: 'text' | 'outline' | 'solid' | 'icon' | 'control'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  loading?: boolean
  disabled?: boolean
  ariaLabel?: string
}>(), {
  type: 'button',
  variant: 'outline',
  size: 'md',
  block: false,
  loading: false,
  disabled: false,
  ariaLabel: undefined
})

const interactiveClasses = 'hover:border-button-hover hover:bg-button-hover hover:text-button-hover-text! focus-visible:border-button-hover focus-visible:bg-button-hover focus-visible:text-button-hover-text! focus-visible:shadow-[0_0_0_3px_var(--button-ring)] focus-visible:outline-none active:border-button-active active:bg-button-active active:text-button-active-text! active:scale-[0.98]'
const baseClasses = 'inline-flex cursor-pointer items-center justify-center gap-2 border font-bold tracking-normal transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(.16,1,.3,1)] disabled:pointer-events-none disabled:opacity-50'

const variantClasses = computed(() => {
  if (props.variant === 'text') {
    return `rounded-token border-transparent bg-transparent text-[15px] text-button-text! ${interactiveClasses}`
  }

  if (props.variant === 'solid') {
    return `rounded-token border-button-hover bg-button-hover text-button-hover-text! ${interactiveClasses}`
  }

  if (props.variant === 'icon') {
    return 'border-transparent bg-transparent text-muted hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none active:scale-[0.96]'
  }

  if (props.variant === 'control') {
    return 'rounded-[4px] border-transparent bg-transparent transition-[color,transform] duration-300 ease-[cubic-bezier(.16,1,.3,1)] active:scale-95 focus-visible:outline-none'
  }

  return `rounded-token border-button-border bg-button-surface text-sm text-button-text! ${interactiveClasses}`
})

const sizeClasses = computed(() => {
  if (props.size === 'sm') {
    return props.variant === 'icon'
      ? 'h-9 w-9 text-[13px]'
      : 'min-h-9 px-(--space-1) text-[13px]'
  }

  if (props.size === 'lg') {
    return props.variant === 'icon'
      ? 'h-12 w-12 text-base'
      : 'min-h-12 px-(--space-3) text-base'
  }

  if (props.variant === 'icon') {
    return 'h-11 w-11 text-sm'
  }

  if (props.variant === 'control') {
    return 'h-9 min-w-10 px-2 text-sm'
  }

  return 'min-h-11 px-(--space-2)'
})

const stateClasses = computed(() => [
  props.block ? 'w-full' : '',
  props.loading ? 'pointer-events-none' : ''
])

const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <button
    :class="[baseClasses, variantClasses, sizeClasses, stateClasses]"
    :type="props.type"
    :disabled="isDisabled"
    :aria-label="props.ariaLabel"
    :aria-busy="props.loading ? 'true' : undefined"
  >
    <Icon
      v-if="props.loading"
      name="lucide:loader-circle"
      mode="svg"
      class="h-4 w-4 animate-spin"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
