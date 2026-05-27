<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    href?: string
    title?: string
    description?: string
    image?: string
    icon?: string
    label?: string
  }>(),
  {
    href: '',
    title: '',
    description: '',
    image: '',
    icon: 'lucide:external-link',
    label: ''
  }
)

const isExternal = computed(() => /^https?:\/\//.test(props.href))
const target = computed(() => (isExternal.value ? '_blank' : undefined))
const rel = computed(() => (isExternal.value ? 'noreferrer' : undefined))
const usesNativeImage = computed(() => /\.ico(?:[?#].*)?$/i.test(props.image))
</script>

<template>
  <a
    class="group my-(--space-3) grid min-h-26 grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-(--space-2) border border-line bg-paper px-(--space-3) py-(--space-2) text-ink transition-[background-color,border-color,color,transform] duration-200 hover:border-ink hover:bg-ink hover:text-paper focus-visible:border-ink focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none max-[560px]:grid-cols-[48px_minmax(0,1fr)] max-[560px]:px-(--space-2)"
    :href="props.href || '#'"
    :target="target"
    :rel="rel"
  >
    <span class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border border-line bg-code-surface text-ink transition-colors duration-200 group-hover:border-paper group-hover:bg-paper group-focus-visible:border-paper group-focus-visible:bg-paper max-[560px]:h-12 max-[560px]:w-12">
      <img
        v-if="props.image && usesNativeImage"
        :src="props.image"
        :alt="props.title"
        width="96"
        height="96"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover"
      >
      <NuxtImg
        v-else-if="props.image"
        :src="props.image"
        :alt="props.title"
        width="96"
        height="96"
        sizes="56px"
        loading="lazy"
        decoding="async"
        class="h-full w-full object-cover"
      />
      <Icon
        v-else
        :name="props.icon"
        mode="svg"
        class="h-6 w-6"
        aria-hidden="true"
      />
    </span>

    <span class="grid min-w-0 gap-1">
      <span
        v-if="props.label"
        class="text-[12px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper"
      >
        {{ props.label }}
      </span>
      <strong class="truncate font-display text-[24px] font-normal leading-none tracking-normal max-[560px]:text-[20px] transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">
        {{ props.title || props.href }}
      </strong>
      <span
        v-if="props.description"
        class="line-clamp-2 text-[13px] leading-[1.55] text-muted text-pretty transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper"
      >
        {{ props.description }}
      </span>
    </span>

    <Icon
      name="lucide:arrow-up-right"
      mode="svg"
      class="h-5 w-5 text-muted transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper max-[560px]:hidden"
      aria-hidden="true"
    />
  </a>
</template>
