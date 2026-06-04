<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open?: boolean
    src?: string
    alt?: string
    title?: string
  }>(),
  {
    open: false,
    src: '',
    alt: '',
    title: ''
  }
)

const emit = defineEmits<{
  close: []
}>()

const dialogRef = ref<HTMLDivElement | null>(null)
const viewportRef = ref<HTMLDivElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const zoom = ref(1)
const windowSize = ref({ width: 1024, height: 768 })
const naturalSize = ref({ width: 0, height: 0 })
const isDragging = ref(false)
const suppressNextImageClick = ref(false)
const minZoom = 1
const maxZoom = 4
const zoomStep = 0.25
const dragThreshold = 4
const dragState = ref({
  pointerId: -1,
  startX: 0,
  startY: 0,
  scrollLeft: 0,
  scrollTop: 0,
  moved: false
})

const zoomPercent = computed(() => Math.round(zoom.value * 100))
const imageMeta = computed(() => {
  if (naturalSize.value.width <= 0 || naturalSize.value.height <= 0) {
    return '读取中'
  }

  return `${naturalSize.value.width} x ${naturalSize.value.height}`
})
const maxPreviewSize = computed(() => ({
  width: Math.max(280, Math.min(1120, windowSize.value.width * 0.94)),
  height: Math.max(220, windowSize.value.height * 0.72)
}))
const baseImageSize = computed(() => {
  const naturalWidth = naturalSize.value.width
  const naturalHeight = naturalSize.value.height
  const viewportWidth = Math.max(1, maxPreviewSize.value.width)
  const viewportHeight = Math.max(1, maxPreviewSize.value.height)

  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: viewportWidth, height: viewportHeight }
  }

  const fitRatio = Math.min(viewportWidth / naturalWidth, viewportHeight / naturalHeight)

  return {
    width: Math.max(1, naturalWidth * fitRatio),
    height: Math.max(1, naturalHeight * fitRatio)
  }
})
const scaledImageSize = computed(() => ({
  width: baseImageSize.value.width * zoom.value,
  height: baseImageSize.value.height * zoom.value
}))
const previewFrameSize = computed(() => ({
  width: Math.min(maxPreviewSize.value.width, Math.max(1, baseImageSize.value.width)),
  height: Math.min(maxPreviewSize.value.height, Math.max(1, baseImageSize.value.height))
}))
const canDragPreview = computed(() =>
  scaledImageSize.value.width > previewFrameSize.value.width + 1
  || scaledImageSize.value.height > previewFrameSize.value.height + 1
)
const canvasStyle = computed(() => ({
  width: `${scaledImageSize.value.width}px`,
  height: `${scaledImageSize.value.height}px`
}))
const viewportStyle = computed(() => ({
  width: `${previewFrameSize.value.width}px`,
  height: `${previewFrameSize.value.height}px`
}))
const panelStyle = computed(() => ({
  width: `${previewFrameSize.value.width}px`
}))
const imageStyle = computed(() => ({
  width: `${scaledImageSize.value.width}px`,
  height: `${scaledImageSize.value.height}px`,
  left: '0px',
  top: '0px'
}))
const imageCursorClass = computed(() => {
  if (canDragPreview.value) {
    return isDragging.value ? 'cursor-grabbing' : 'cursor-grab'
  }

  return zoom.value >= maxZoom ? 'cursor-zoom-out' : 'cursor-zoom-in'
})

const clampZoom = (value: number) => Math.min(maxZoom, Math.max(minZoom, value))
const clampRatio = (value: number) => Math.min(1, Math.max(0, value))
const getScrollBounds = () => {
  return {
    minLeft: 0,
    maxLeft: Math.max(0, scaledImageSize.value.width - previewFrameSize.value.width),
    minTop: 0,
    maxTop: Math.max(0, scaledImageSize.value.height - previewFrameSize.value.height)
  }
}
const setViewportScroll = (left: number, top: number) => {
  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  const bounds = getScrollBounds()
  viewport.scrollLeft = Math.min(bounds.maxLeft, Math.max(bounds.minLeft, left))
  viewport.scrollTop = Math.min(bounds.maxTop, Math.max(bounds.minTop, top))
}
const centerImage = async () => {
  const viewport = viewportRef.value

  if (!viewport) {
    return
  }

  await nextTick()
  const bounds = getScrollBounds()
  setViewportScroll(bounds.maxLeft / 2, bounds.maxTop / 2)
}
const updateWindowSize = () => {
  if (!import.meta.client) {
    return
  }

  windowSize.value = {
    width: window.innerWidth,
    height: window.innerHeight
  }
}
const updateNaturalSize = () => {
  const image = imageRef.value

  if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return
  }

  naturalSize.value = {
    width: image.naturalWidth,
    height: image.naturalHeight
  }

  if (props.open && zoom.value === minZoom) {
    void centerImage()
  }
}
const startViewportListeners = () => {
  if (!import.meta.client) {
    return
  }

  window.removeEventListener('resize', updateWindowSize)
  updateWindowSize()
  window.addEventListener('resize', updateWindowSize)
}
const stopViewportListeners = () => {
  if (import.meta.client) {
    window.removeEventListener('resize', updateWindowSize)
  }
}
const resetDragState = () => {
  isDragging.value = false
  dragState.value = {
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    moved: false
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      stopViewportListeners()
      return
    }

    zoom.value = 1
    await nextTick()
    startViewportListeners()
    updateNaturalSize()
    await centerImage()
    dialogRef.value?.focus()
  }
)

watch(
  () => props.src,
  () => {
    zoom.value = 1
    naturalSize.value = { width: 0, height: 0 }
  }
)

const setZoomAtPoint = async (nextZoom: number, clientX?: number, clientY?: number) => {
  const previousZoom = zoom.value
  const normalizedZoom = clampZoom(Number(nextZoom.toFixed(2)))

  if (normalizedZoom === previousZoom) {
    return
  }

  const viewport = viewportRef.value
  const image = imageRef.value

  if (!viewport || !image || typeof clientX !== 'number' || typeof clientY !== 'number') {
    zoom.value = normalizedZoom
    return
  }

  const viewportRect = viewport.getBoundingClientRect()
  const offsetX = Math.min(viewport.clientWidth, Math.max(0, clientX - viewportRect.left))
  const offsetY = Math.min(viewport.clientHeight, Math.max(0, clientY - viewportRect.top))
  const imageAnchorX = clampRatio((viewport.scrollLeft + offsetX) / scaledImageSize.value.width)
  const imageAnchorY = clampRatio((viewport.scrollTop + offsetY) / scaledImageSize.value.height)

  zoom.value = normalizedZoom
  await nextTick()

  const targetX = scaledImageSize.value.width * imageAnchorX
  const targetY = scaledImageSize.value.height * imageAnchorY

  setViewportScroll(targetX - offsetX, targetY - offsetY)
}

const close = () => {
  emit('close')
}

const getViewportCenterPoint = () => {
  const viewport = viewportRef.value

  if (!viewport) {
    return undefined
  }

  const rect = viewport.getBoundingClientRect()

  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2
  }
}

const zoomOut = () => {
  const point = getViewportCenterPoint()

  void setZoomAtPoint(zoom.value - zoomStep, point?.clientX, point?.clientY)
}

const zoomIn = () => {
  const point = getViewportCenterPoint()

  void setZoomAtPoint(zoom.value + zoomStep, point?.clientX, point?.clientY)
}

const resetZoom = async () => {
  zoom.value = minZoom
  await centerImage()
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  const direction = event.deltaY > 0 ? -1 : 1

  void setZoomAtPoint(zoom.value + direction * zoomStep, event.clientX, event.clientY)
}

const toggleZoom = (event: MouseEvent) => {
  if (suppressNextImageClick.value) {
    suppressNextImageClick.value = false
    return
  }

  const nextZoom = zoom.value >= maxZoom
    ? minZoom
    : zoom.value >= 2
      ? maxZoom
      : zoom.value + 1

  void setZoomAtPoint(nextZoom, event.clientX, event.clientY)
}

const handlePointerDown = (event: PointerEvent) => {
  const viewport = viewportRef.value

  if (!viewport || !canDragPreview.value || event.button !== 0) {
    return
  }

  event.preventDefault()
  isDragging.value = true
  suppressNextImageClick.value = false
  dragState.value = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    scrollLeft: viewport.scrollLeft,
    scrollTop: viewport.scrollTop,
    moved: false
  }
  viewport.setPointerCapture(event.pointerId)
}

const handlePointerMove = (event: PointerEvent) => {
  const viewport = viewportRef.value
  const state = dragState.value

  if (!viewport || !isDragging.value || event.pointerId !== state.pointerId) {
    return
  }

  const deltaX = event.clientX - state.startX
  const deltaY = event.clientY - state.startY

  if (!state.moved && Math.hypot(deltaX, deltaY) >= dragThreshold) {
    state.moved = true
  }

  if (state.moved) {
    event.preventDefault()
    setViewportScroll(state.scrollLeft - deltaX, state.scrollTop - deltaY)
  }
}

const handlePointerEnd = (event: PointerEvent) => {
  const viewport = viewportRef.value
  const state = dragState.value

  if (!isDragging.value || event.pointerId !== state.pointerId) {
    return
  }

  if (viewport?.hasPointerCapture(event.pointerId)) {
    viewport.releasePointerCapture(event.pointerId)
  }

  suppressNextImageClick.value = state.moved
  if (state.moved && import.meta.client) {
    window.setTimeout(() => {
      suppressNextImageClick.value = false
    }, 200)
  }
  resetDragState()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close()
    return
  }

  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    zoomIn()
    return
  }

  if (event.key === '-') {
    event.preventDefault()
    zoomOut()
    return
  }

  if (event.key === '0') {
    event.preventDefault()
    void resetZoom()
  }
}

onBeforeUnmount(() => {
  stopViewportListeners()
  resetDragState()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="open"
        ref="dialogRef"
        class="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/50 p-(--space-3)"
        role="dialog"
        aria-modal="true"
        :aria-label="title || alt || '图片预览'"
        tabindex="-1"
        @click.self="close"
        @keydown="handleKeydown"
      >
        <section
          class="dialog-panel grid max-h-[92vh] max-w-[calc(100vw-var(--space-4))] overflow-hidden border border-line bg-paper text-ink"
          :style="panelStyle"
        >
          <header class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-(--space-2) border-b border-line p-(--space-2)">
            <div class="grid min-w-0 gap-1">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                Image Preview
              </p>
              <h2 class="m-0 truncate text-base font-bold">
                {{ title || alt || '图片预览' }}
              </h2>
            </div>
            <AppButton variant="icon" aria-label="关闭图片预览" @click="close">
              <Icon
                name="lucide:x"
                mode="svg"
                class="h-5 w-5"
                aria-hidden="true"
              />
            </AppButton>
          </header>

          <figure class="grid min-h-0 bg-code-surface">
            <div
              ref="viewportRef"
              class="max-w-full touch-none select-none justify-self-center overflow-auto bg-code-surface"
              :class="canDragPreview ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''"
              :style="viewportStyle"
              @wheel="handleWheel"
              @pointerdown="handlePointerDown"
              @pointermove="handlePointerMove"
              @pointerup="handlePointerEnd"
              @pointercancel="handlePointerEnd"
            >
              <div class="relative" :style="canvasStyle">
                <img
                  ref="imageRef"
                  :src="src"
                  :alt="alt"
                  class="absolute block max-w-none border border-line bg-paper object-contain"
                  :class="imageCursorClass"
                  :style="imageStyle"
                  draggable="false"
                  @click.stop="toggleZoom"
                  @dragstart.prevent
                  @load="updateNaturalSize"
                >
              </div>
            </div>
            <figcaption
              v-if="title"
              class="border-t border-line bg-paper px-(--space-2) py-(--space-1) text-sm leading-[1.6] text-muted text-pretty"
            >
              {{ title }}
            </figcaption>
          </figure>

          <footer class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-(--space-2) border-t border-line bg-paper p-(--space-2) max-[560px]:grid-cols-1">
            <div class="flex min-w-0 flex-wrap items-center gap-(--space-1)">
              <span class="border border-line bg-code-surface px-(--space-1) py-1 font-mono text-[12px] font-bold leading-none text-ink">
                {{ zoomPercent }}%
              </span>
              <span class="truncate font-mono text-[12px] font-bold uppercase tracking-normal text-muted">
                {{ imageMeta }}
              </span>
            </div>
            <div class="flex flex-wrap items-center justify-end gap-1 max-[560px]:justify-start">
              <AppButton size="sm" variant="icon" aria-label="缩小图片" :disabled="zoom <= minZoom" @click="zoomOut">
                <Icon name="lucide:minus" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </AppButton>
              <AppButton size="sm" variant="icon" aria-label="重置图片缩放" :disabled="zoom === minZoom" @click="resetZoom">
                <Icon name="lucide:rotate-ccw" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </AppButton>
              <AppButton size="sm" variant="icon" aria-label="放大图片" :disabled="zoom >= maxZoom" @click="zoomIn">
                <Icon name="lucide:plus" mode="svg" class="h-4 w-4" aria-hidden="true" />
              </AppButton>
            </div>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
