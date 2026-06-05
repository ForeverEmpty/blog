<script setup lang="ts">
type ArticleSummary = {
  overview: string
  points: string[]
  sections: string[]
  cached: boolean
  generatedAt: string
}

const props = defineProps<{
  slug: string
}>()

const appConfig = useAppConfig()
const visibleSummaryCharacters = ref(0)
const isTypingSummary = ref(false)
let typewriterFrame: number | undefined
let typewriterStartedAt = 0

const { data, pending, error, refresh } = useFetch<ArticleSummary>(
  () => `/api/blog/${encodeURIComponent(props.slug)}/summary`,
  {
    immediate: appConfig.aiSummary.enabled,
    key: `article-ai-summary-${props.slug}`,
    lazy: true,
    server: false,
  }
)

const summarySegments = computed(() => {
  if (!data.value) {
    return []
  }

  return [data.value.overview, ...data.value.points].filter(Boolean)
})

const fullSummaryLength = computed(() => (
  summarySegments.value.reduce((total, segment) => total + Array.from(segment).length, 0) +
  Math.max(0, summarySegments.value.length - 1)
))

const fullSummaryLabel = computed(() => (
  data.value
    ? [data.value.overview, ...data.value.points].filter(Boolean).join(' ')
    : ''
))
const summaryIsComplete = computed(() => (
  Boolean(data.value) &&
  fullSummaryLength.value > 0 &&
  visibleSummaryCharacters.value >= fullSummaryLength.value &&
  !isTypingSummary.value
))

const prefersReducedMotion = () => (
  import.meta.client &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

const cancelTypewriter = () => {
  if (typewriterFrame !== undefined) {
    window.cancelAnimationFrame(typewriterFrame)
    typewriterFrame = undefined
  }
}

const segmentStart = (segmentIndex: number) => (
  summarySegments.value
    .slice(0, segmentIndex)
    .reduce((total, item) => total + Array.from(item).length + 1, 0)
)

const segmentVisibleLength = (segmentIndex: number) => {
  const segment = summarySegments.value[segmentIndex] || ''
  const start = segmentStart(segmentIndex)

  return Math.max(
    0,
    Math.min(visibleSummaryCharacters.value - start, Array.from(segment).length)
  )
}

const segmentVisibleText = (segmentIndex: number) => {
  const segment = summarySegments.value[segmentIndex] || ''
  const visibleLength = Math.max(
    0,
    segmentVisibleLength(segmentIndex)
  )

  return Array.from(segment).slice(0, visibleLength).join('')
}

const activeSegmentIndex = computed(() => {
  if (!isTypingSummary.value) {
    return -1
  }

  const index = summarySegments.value.findIndex((segment, segmentIndex) => {
    const start = segmentStart(segmentIndex)
    const end = start + Array.from(segment).length

    return visibleSummaryCharacters.value >= start && visibleSummaryCharacters.value <= end
  })

  return index === -1 ? summarySegments.value.length - 1 : index
})

const typeSummary = (timestamp: number) => {
  if (!typewriterStartedAt) {
    typewriterStartedAt = timestamp
  }

  const elapsed = timestamp - typewriterStartedAt
  const nextVisibleCharacters = Math.min(
    fullSummaryLength.value,
    Math.floor(elapsed / 18)
  )

  visibleSummaryCharacters.value = nextVisibleCharacters

  if (nextVisibleCharacters >= fullSummaryLength.value) {
    isTypingSummary.value = false
    typewriterFrame = undefined
    return
  }

  typewriterFrame = window.requestAnimationFrame(typeSummary)
}

const restartTypewriter = () => {
  cancelTypewriter()
  typewriterStartedAt = 0

  if (!import.meta.client || !fullSummaryLength.value || prefersReducedMotion()) {
    visibleSummaryCharacters.value = fullSummaryLength.value
    isTypingSummary.value = false
    return
  }

  visibleSummaryCharacters.value = 0
  isTypingSummary.value = true
  typewriterFrame = window.requestAnimationFrame(typeSummary)
}

watch(
  () => data.value?.generatedAt,
  () => {
    if (import.meta.client) {
      restartTypewriter()
    }
  }
)

onMounted(() => {
  restartTypewriter()
})

onBeforeUnmount(() => {
  cancelTypewriter()
})
</script>

<template>
  <section
    v-if="appConfig.aiSummary.enabled"
    class="max-w-190 border border-line bg-code-surface"
    aria-labelledby="article-ai-summary-title"
  >
    <div class="grid gap-(--space-2) p-(--space-3) max-[520px]:p-(--space-2)">
      <div class="flex flex-wrap items-start justify-between gap-(--space-2)">
        <div class="grid gap-1">
          <p class="m-0 flex items-center gap-(--space-1) text-[13px] font-bold uppercase tracking-normal text-muted">
            <Icon
              name="lucide:sparkles"
              mode="svg"
              class="h-4 w-4"
              aria-hidden="true"
            />
            AI 总结
          </p>
          <h2
            id="article-ai-summary-title"
            class="m-0 font-display text-[32px] font-normal leading-none tracking-normal text-ink max-[520px]:text-[26px]"
          >
            先读重点
          </h2>
        </div>

        <button
          type="button"
          class="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-token border border-line bg-paper px-(--space-2) text-[13px] font-bold tracking-normal text-muted! transition-[background-color,border-color,color,opacity] duration-200 hover:border-ink hover:bg-ink hover:text-paper! focus-visible:border-ink focus-visible:bg-ink focus-visible:text-paper! focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
          :disabled="pending"
          :aria-label="pending ? '正在读取 AI 总结' : '刷新 AI 总结缓存'"
          @click="refresh()"
        >
          <Icon
            :name="pending ? 'lucide:loader-circle' : 'lucide:refresh-cw'"
            mode="svg"
            class="h-4 w-4"
            :class="pending ? 'animate-spin' : ''"
            aria-hidden="true"
          />
          {{ pending ? '读取中' : '刷新' }}
        </button>
      </div>

      <div
        v-if="pending && !data"
        class="grid gap-(--space-1)"
      >
        <div class="h-4 w-3/4 animate-pulse bg-line" />
        <div class="h-4 w-full animate-pulse bg-line" />
        <div class="h-4 w-5/6 animate-pulse bg-line" />
      </div>

      <div
        v-else-if="error"
        class="grid gap-(--space-1) text-[15px] leading-[1.7] text-muted"
      >
        <p class="m-0">总结生成失败，可以稍后重试。</p>
      </div>

      <div
        v-else-if="data"
        class="grid gap-(--space-2)"
        :aria-label="fullSummaryLabel"
      >
        <p class="m-0 text-[17px] leading-[1.75] text-ink text-pretty">
          {{ segmentVisibleText(0) }}
          <span
            v-if="activeSegmentIndex === 0"
            class="ml-1 inline-block h-[1em] w-0.5 translate-y-[0.12em] bg-ink"
            aria-hidden="true"
          />
        </p>

        <ul class="m-0 grid gap-(--space-1) p-0">
          <template
            v-for="(point, index) in data.points"
            :key="point"
          >
            <li
              v-if="segmentVisibleLength(index + 1) > 0 || activeSegmentIndex >= index + 1 || summaryIsComplete"
              class="grid grid-cols-[auto_minmax(0,1fr)] gap-(--space-1) text-[15px] leading-[1.7] text-muted"
            >
              <Icon
                name="lucide:corner-down-right"
                mode="svg"
                class="mt-[0.45em] h-4 w-4 text-quiet"
                aria-hidden="true"
              />
              <span class="text-pretty">
                {{ segmentVisibleText(index + 1) }}
                <span
                  v-if="activeSegmentIndex === index + 1"
                  class="ml-1 inline-block h-[1em] w-0.5 translate-y-[0.12em] bg-ink"
                  aria-hidden="true"
                />
              </span>
            </li>
          </template>
        </ul>

        <div
          v-if="data.sections.length && summaryIsComplete"
          class="flex flex-wrap items-center gap-2 border-t border-line pt-(--space-2)"
          aria-label="涉及章节"
        >
          <span class="border border-line bg-paper px-2 py-1 text-[12px] font-bold tracking-normal text-muted">
            {{ data.cached ? '缓存命中' : 'AI 新生成' }}
          </span>
          <span
            v-for="section in data.sections"
            :key="section"
            class="border border-line bg-paper px-2 py-1 text-[12px] font-bold tracking-normal text-muted"
          >
            {{ section }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>
