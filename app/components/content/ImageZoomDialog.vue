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
const zoom = ref(1)
const minZoom = 1
const maxZoom = 4
const zoomStep = 0.25

const zoomPercent = computed(() => Math.round(zoom.value * 100))
const imageStyle = computed(() => ({
  width: `${zoom.value * 100}%`,
  maxWidth: zoom.value === 1 ? '94vw' : 'none',
  maxHeight: zoom.value === 1 ? '86vh' : 'none'
}))

const clampZoom = (value: number) => Math.min(maxZoom, Math.max(minZoom, value))

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      return
    }

    zoom.value = 1
    await nextTick()
    dialogRef.value?.focus()
  }
)

watch(
  () => props.src,
  () => {
    zoom.value = 1
  }
)

const close = () => {
  emit('close')
}

const handleWheel = (event: WheelEvent) => {
  event.preventDefault()
  const direction = event.deltaY > 0 ? -1 : 1
  zoom.value = clampZoom(Number((zoom.value + direction * zoomStep).toFixed(2)))
}

const toggleZoom = () => {
  const nextZoom = zoom.value >= maxZoom
    ? minZoom
    : zoom.value >= 2
      ? maxZoom
      : zoom.value + 1

  zoom.value = clampZoom(nextZoom)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="dialogRef"
      class="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/90 p-(--space-2) backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      :aria-label="title || alt || '图片预览'"
      tabindex="-1"
      @click.self="close"
      @keydown.esc="close"
    >
      <button
        type="button"
        class="absolute right-(--space-2) top-(--space-2) grid h-11 w-11 place-items-center rounded-token border border-paper/30 bg-ink text-paper transition-[background-color,border-color,transform] duration-200 hover:border-paper hover:bg-paper hover:text-ink focus-visible:border-paper focus-visible:bg-paper focus-visible:text-ink focus-visible:outline-none active:scale-95"
        aria-label="关闭图片预览"
        @click="close"
      >
        <Icon
          name="lucide:x"
          mode="svg"
          class="h-5 w-5"
          aria-hidden="true"
        />
      </button>

      <figure class="grid max-h-[92vh] max-w-[94vw] gap-(--space-2)">
        <p class="m-0 justify-self-center border border-paper/30 bg-ink px-(--space-1) py-1 font-mono text-[12px] leading-none text-paper">
          {{ zoomPercent }}%
        </p>
        <img
          :src="src"
          :alt="alt"
          class="block h-auto min-w-0 cursor-zoom-in border border-paper/30 bg-code-surface object-contain"
          :class="zoom >= maxZoom ? 'cursor-zoom-out' : 'cursor-zoom-in'"
          :style="imageStyle"
          @click.stop="toggleZoom"
          @wheel="handleWheel"
        >
        <figcaption
          v-if="title"
          class="max-w-[94vw] text-center text-sm leading-[1.6] text-paper text-pretty"
        >
          {{ title }}
        </figcaption>
      </figure>
    </div>
  </Teleport>
</template>
