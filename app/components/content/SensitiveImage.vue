<script setup lang="ts">
import ImageZoomDialog from './ImageZoomDialog.vue'

const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    title?: string
    description?: string
    sensitive?: string
    revealLabel?: string
    width?: string | number
    height?: string | number
    sizes?: string
  }>(),
  {
    src: '',
    alt: '',
    title: '',
    description: '',
    sensitive: '该图片包含敏感内容',
    revealLabel: '显示图片',
    width: undefined,
    height: undefined,
    sizes: '100vw md:900px'
  }
)

const revealed = ref(false)
const figureRef = ref<HTMLElement | null>(null)
const imageWrapRef = ref<HTMLElement | null>(null)
const isLoaded = ref(false)
const hasError = ref(false)
const previewOpen = ref(false)
const availableWidth = ref(0)
const naturalWidth = ref(0)
let resizeObserver: ResizeObserver | undefined
const maxInlineUpscale = 4
const usesNativeImage = computed(() => /\.ico(?:[?#].*)?$/i.test(props.src))
const canPreview = computed(() => Boolean(props.src && isLoaded.value && !hasError.value))
const figureFrameClass = computed(() => (
  revealed.value && isLoaded.value && !hasError.value
    ? 'mx-auto w-fit max-w-full'
    : 'w-full'
))
const imageWrapClass = computed(() => (
  isLoaded.value && !hasError.value
    ? 'relative grid w-fit max-w-full place-items-center overflow-hidden bg-code-surface'
    : 'relative grid min-h-30 w-full place-items-center overflow-hidden bg-code-surface'
))
const displayedImageWidth = computed(() => {
  if (!isLoaded.value || hasError.value || naturalWidth.value <= 0 || availableWidth.value <= 0) {
    return undefined
  }

  return Math.min(availableWidth.value, naturalWidth.value * maxInlineUpscale)
})
const displayedImageStyle = computed(() => (
  displayedImageWidth.value
    ? { width: `${displayedImageWidth.value}px` }
    : {}
))

const updateAvailableWidth = () => {
  availableWidth.value = figureRef.value?.parentElement?.clientWidth || 0
}

const readImageSize = (image?: HTMLImageElement | null) => {
  const target = image || imageWrapRef.value?.querySelector('img')

  if (!target) {
    return
  }

  naturalWidth.value = target.naturalWidth || 0
}

const handleLoad = (event?: Event) => {
  readImageSize(event?.target as HTMLImageElement | null)
  updateAvailableWidth()
  isLoaded.value = true
  hasError.value = false
}

const handleError = () => {
  isLoaded.value = false
  hasError.value = true
}

const syncLoadedImageState = () => {
  const image = imageWrapRef.value?.querySelector('img')

  if (!image) {
    return
  }

  if (image.complete && image.naturalWidth > 0) {
    handleLoad()
  }
}

const revealImage = () => {
  revealed.value = true
}

const openPreview = () => {
  if (!canPreview.value) {
    return
  }

  previewOpen.value = true
}

watch(
  () => props.src,
  async () => {
    isLoaded.value = false
    hasError.value = false
    await nextTick()
    syncLoadedImageState()
  }
)

watch(
  revealed,
  async (isRevealed) => {
    if (!isRevealed) {
      return
    }

    await nextTick()
    syncLoadedImageState()
  }
)

onMounted(() => {
  updateAvailableWidth()
  const observedElement = figureRef.value?.parentElement

  if (!observedElement) {
    return
  }

  resizeObserver = new ResizeObserver(updateAvailableWidth)
  resizeObserver.observe(observedElement)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <figure
    ref="figureRef"
    class="my-(--space-4) overflow-hidden border border-line bg-code-surface transition-[width] duration-200"
    :class="figureFrameClass"
  >
    <div
      v-if="!revealed"
      class="grid min-h-76 place-items-center px-(--space-3) py-(--space-6) text-center"
    >
      <div class="grid max-w-150 justify-items-center gap-(--space-2)">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-token border border-line bg-paper text-ink">
          <Icon
            name="lucide:eye-off"
            mode="svg"
            class="block h-5 w-5"
            aria-hidden="true"
          />
        </span>
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
          Sensitive Image
        </p>
        <p class="m-0 text-[22px] leading-[1.45] text-ink text-pretty max-[520px]:text-lg">
          {{ sensitive }}
        </p>
        <p
          v-if="description"
          class="m-0 text-sm leading-[1.6] text-muted text-pretty"
        >
          {{ description }}
        </p>
        <AppButton
          class="mt-(--space-1)"
          type="button"
          variant="outline"
          @click="revealImage"
        >
          <Icon
            name="lucide:eye"
            mode="svg"
            class="h-4 w-4"
            aria-hidden="true"
          />
          {{ revealLabel }}
        </AppButton>
      </div>
    </div>

    <div
      v-else-if="src"
      ref="imageWrapRef"
      :class="imageWrapClass"
    >
      <button
        v-if="usesNativeImage"
        type="button"
        class="block max-w-full cursor-zoom-in bg-transparent p-0 text-left leading-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-button-ring"
        :disabled="!canPreview"
        :aria-label="`放大图片：${alt || title || src}`"
        @click="openPreview"
      >
        <img
          :src="src"
          :alt="alt"
          :title="title || undefined"
          :width="width"
          :height="height"
          :style="displayedImageStyle"
          loading="lazy"
          decoding="async"
          class="m-0! block h-auto max-h-180 w-auto max-w-full object-contain transition-[opacity,filter] duration-500 motion-reduce:transition-none"
          :class="isLoaded && !hasError ? 'opacity-100 filter-none' : 'opacity-0 blur-xs'"
          @load="handleLoad"
          @error="handleError"
        >
      </button>

      <button
        v-else
        type="button"
        class="block max-w-full cursor-zoom-in bg-transparent p-0 text-left leading-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-button-ring"
        :disabled="!canPreview"
        :aria-label="`放大图片：${alt || title || src}`"
        @click="openPreview"
      >
        <NuxtImg
          :src="src"
          :alt="alt"
          :title="title || undefined"
          :width="width"
          :height="height"
          :style="displayedImageStyle"
          :sizes="sizes"
          loading="lazy"
          decoding="async"
          class="m-0! block h-auto max-h-180 w-auto max-w-full object-contain transition-[opacity,filter] duration-500 motion-reduce:transition-none"
          :class="isLoaded && !hasError ? 'opacity-100 filter-none' : 'opacity-0 blur-xs'"
          @load="handleLoad"
          @error="handleError"
        />
      </button>

      <div
        v-if="!isLoaded && !hasError"
        class="pointer-events-none absolute inset-0 grid place-items-center bg-code-surface"
        aria-hidden="true"
      >
        <div class="grid w-full gap-(--space-2) px-(--space-3)">
          <span class="h-3 w-3/5 rounded-token bg-line motion-safe:animate-pulse" />
          <span class="h-3 w-4/5 rounded-token bg-line motion-safe:animate-pulse" />
          <span class="h-3 w-2/5 rounded-token bg-line motion-safe:animate-pulse" />
        </div>
      </div>

      <div
        v-if="hasError"
        class="grid min-h-40 place-items-center gap-(--space-2) px-(--space-3) py-(--space-4) text-center text-muted"
        role="status"
      >
        <Icon
          name="lucide:image-off"
          mode="svg"
          class="h-7 w-7"
          aria-hidden="true"
        />
        <span class="max-w-120 text-sm leading-[1.6] text-pretty">
          {{ alt || title || src }}
        </span>
      </div>
    </div>

    <div
      v-else
      class="grid min-h-40 place-items-center gap-(--space-2) px-(--space-3) py-(--space-4) text-center text-muted"
      role="status"
    >
      <Icon
        name="lucide:image-off"
        mode="svg"
        class="h-7 w-7"
        aria-hidden="true"
      />
      <span class="max-w-120 text-sm leading-[1.6] text-pretty">
        图片地址未设置
      </span>
    </div>

    <figcaption
      v-if="title"
      class="border-t border-line px-(--space-2) py-(--space-1) text-sm leading-[1.6] text-muted text-pretty"
    >
      {{ title }}
    </figcaption>
  </figure>

  <ImageZoomDialog
    :open="previewOpen"
    :src="src"
    :alt="alt"
    :title="title"
    @close="previewOpen = false"
  />
</template>
