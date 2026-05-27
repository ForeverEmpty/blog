<script setup lang="ts">
type TocLink = {
  id: string
  text: string
  depth: number
}

const props = withDefaults(
  defineProps<{
    links?: TocLink[]
    label?: string
  }>(),
  {
    links: () => [],
    label: '目录'
  }
)

const activeId = ref('')
let updateFrame = 0
const detectionTopRatio = 0.3
const detectionBottomRatio = 0.56

const flatLinks = computed(() => props.links)
const hasLinks = computed(() => flatLinks.value.length > 0)

const linkPadding = (depth: number) => ({
  paddingInlineStart: `${Math.max(0, depth - 2) * 16}px`
})

const setActiveHeading = () => {
  if (!import.meta.client || flatLinks.value.length === 0) {
    return
  }

  const headings = flatLinks.value
    .map((link) => document.getElementById(link.id))
    .filter((heading): heading is HTMLElement => Boolean(heading))

  if (headings.length === 0) {
    activeId.value = ''
    return
  }

  const detectionTop = window.innerHeight * detectionTopRatio
  const detectionBottom = window.innerHeight * detectionBottomRatio
  let topHeadingInDetectionArea: HTMLElement | undefined
  let lastAboveDetectionArea: HTMLElement | undefined

  for (const heading of headings) {
    const rect = heading.getBoundingClientRect()

    if (rect.top >= detectionTop && rect.top <= detectionBottom) {
      if (!topHeadingInDetectionArea || rect.top < topHeadingInDetectionArea.getBoundingClientRect().top) {
        topHeadingInDetectionArea = heading
      }
    }

    if (rect.top < detectionTop) {
      lastAboveDetectionArea = heading
    }
  }

  activeId.value = (topHeadingInDetectionArea ?? lastAboveDetectionArea ?? headings[0]).id
}

const requestActiveHeadingUpdate = () => {
  if (updateFrame) {
    return
  }

  updateFrame = window.requestAnimationFrame(() => {
    updateFrame = 0
    setActiveHeading()
  })
}

onMounted(() => {
  nextTick(setActiveHeading)
  window.addEventListener('scroll', requestActiveHeadingUpdate, { passive: true })
  window.addEventListener('resize', requestActiveHeadingUpdate)
})

onBeforeUnmount(() => {
  if (updateFrame) {
    window.cancelAnimationFrame(updateFrame)
  }

  window.removeEventListener('scroll', requestActiveHeadingUpdate)
  window.removeEventListener('resize', requestActiveHeadingUpdate)
})

watch(flatLinks, () => {
  nextTick(setActiveHeading)
})
</script>

<template>
  <nav
    v-if="hasLinks"
    class="sticky top-32 grid max-h-[calc(100vh-var(--space-12)-var(--space-6))] content-start gap-(--space-2) overflow-y-auto border-t border-line pt-(--space-2) text-sm max-[1000px]:static max-[1000px]:max-h-none max-[1000px]:overflow-visible"
    :aria-label="label"
  >
    <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
      {{ label }}
    </p>

    <ol class="m-0 grid list-none gap-0 p-0">
      <li
        v-for="link in flatLinks"
        :key="link.id"
        class="m-0 border-b border-line"
      >
        <a
          class="block py-(--space-1) leading-[1.45] transition-colors duration-200 hover:text-ink focus-visible:text-ink focus-visible:outline-none"
          :class="link.id === activeId ? 'font-bold text-ink' : 'text-muted'"
          :href="`#${link.id}`"
          :style="linkPadding(link.depth)"
          :aria-current="link.id === activeId ? 'location' : undefined"
        >
          {{ link.text }}
        </a>
      </li>
    </ol>
  </nav>
</template>
