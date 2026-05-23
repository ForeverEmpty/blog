<script setup lang="ts">
const props = withDefaults(defineProps<{
  href: string
  variant?: 'text' | 'outline'
  ariaLabel?: string
}>(), {
  variant: 'outline',
  ariaLabel: undefined
})

const variantClasses = computed(() => props.variant === 'text'
  ? 'justify-self-start border-transparent bg-transparent text-[15px]'
  : 'border-button-border bg-button-surface text-sm'
)
</script>

<template>
  <a
    class="inline-flex min-h-11 items-center justify-center rounded-token border px-(--space-2) font-bold tracking-normal text-button-text! transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-button-hover hover:bg-button-hover hover:text-button-hover-text! focus-visible:border-button-hover focus-visible:bg-button-hover focus-visible:text-button-hover-text! focus-visible:shadow-[0_0_0_3px_var(--button-ring)] focus-visible:outline-none active:border-button-active active:bg-button-active active:text-button-active-text! active:scale-[0.98]"
    :class="variantClasses"
    :href="href"
    :aria-label="ariaLabel"
  >
    <slot />
  </a>
</template>
