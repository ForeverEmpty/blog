<script setup lang="ts">
const props = withDefaults(defineProps<{
  href: string
  variant?: 'text' | 'outline'
  ariaLabel?: string
  active?: boolean
}>(), {
  variant: 'outline',
  ariaLabel: undefined,
  active: false
})

const variantClasses = computed(() => {
  if (props.variant === 'text') {
    return props.active
      ? 'justify-self-start border-button-hover bg-button-hover text-[15px] text-button-hover-text!'
      : 'justify-self-start border-transparent bg-transparent text-[15px] text-button-text!'
  }

  return props.active
    ? 'border-button-hover bg-button-hover text-sm text-button-hover-text!'
    : 'border-button-border bg-button-surface text-sm text-button-text!'
})

const isInternalLink = computed(() => (
  props.href.startsWith('/') &&
  !props.href.startsWith('//') &&
  !/\/[^/?#]+\.[^/?#]+(?:[?#].*)?$/.test(props.href)
))
</script>

<template>
  <NuxtLink
    v-if="isInternalLink"
    class="inline-flex min-h-11 items-center justify-center rounded-token border px-(--space-2) font-bold tracking-normal transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-button-hover hover:bg-button-hover hover:text-button-hover-text! focus-visible:border-button-hover focus-visible:bg-button-hover focus-visible:text-button-hover-text! focus-visible:shadow-[0_0_0_3px_var(--button-ring)] focus-visible:outline-none active:border-button-active active:bg-button-active active:text-button-active-text! active:scale-[0.98]"
    :class="variantClasses"
    :to="href"
    :aria-label="ariaLabel"
    :aria-current="active ? 'page' : undefined"
  >
    <slot />
  </NuxtLink>
  <a
    v-else
    class="inline-flex min-h-11 items-center justify-center rounded-token border px-(--space-2) font-bold tracking-normal transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[cubic-bezier(.16,1,.3,1)] hover:border-button-hover hover:bg-button-hover hover:text-button-hover-text! focus-visible:border-button-hover focus-visible:bg-button-hover focus-visible:text-button-hover-text! focus-visible:shadow-[0_0_0_3px_var(--button-ring)] focus-visible:outline-none active:border-button-active active:bg-button-active active:text-button-active-text! active:scale-[0.98]"
    :class="variantClasses"
    :href="href"
    :aria-label="ariaLabel"
    :aria-current="active ? 'page' : undefined"
  >
    <slot />
  </a>
</template>
