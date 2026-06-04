<script setup lang="ts">
const props = defineProps<{
  level: 1 | 2 | 3 | 4 | 5 | 6
}>()

defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()

const tag = computed(() => `h${props.level}` as const)
const headingId = computed(() => {
  const id = attrs.id

  return typeof id === 'string' ? id : ''
})
const href = computed(() => (headingId.value ? `#${headingId.value}` : undefined))
const levelLabel = computed(() => `H${props.level}`)
const headingClass = computed(() => [
  'article-heading group relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-(--space-2) rounded-token border border-transparent px-(--space-2) py-(--space-1) transition-[background-color,border-color,color,transform] duration-220 ease-[cubic-bezier(.16,1,.3,1)] hover:border-line hover:bg-code-surface focus-within:border-line focus-within:bg-code-surface',
  `article-heading--h${props.level}`
])
</script>

<template>
  <component
    :is="tag"
    v-bind="attrs"
    :class="headingClass"
  >
    <span class="article-heading__level mt-[0.18em] select-none font-mono text-[11px] font-bold leading-none tracking-normal text-quiet transition-colors duration-200 group-hover:text-muted group-focus-within:text-muted">
      {{ levelLabel }}
    </span>
    <span class="article-heading__text min-w-0 break-words text-pretty">
      <slot />
    </span>
    <a
      v-if="href"
      class="article-heading__anchor mt-[0.08em] inline-flex shrink-0 items-center justify-center rounded-token border border-transparent text-muted opacity-0 transition-[opacity,background-color,border-color,color,transform] duration-200 hover:border-line hover:bg-paper hover:text-ink focus-visible:border-line focus-visible:bg-paper focus-visible:text-ink focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 group-focus-within:opacity-100 max-[640px]:opacity-100"
      :href="href"
      :aria-label="`跳转到 ${levelLabel} 标题`"
      title="跳转到此标题"
    >
      <Icon name="lucide:hash" mode="svg" class="article-heading__icon" aria-hidden="true" />
    </a>
  </component>
</template>
