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
    <Transition name="dialog">
      <div
        v-if="open"
        ref="dialogRef"
        class="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/55 p-(--space-3) backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        :aria-label="title || alt || '图片预览'"
        tabindex="-1"
        @click.self="close"
        @keydown.esc="close"
      >
        <section class="dialog-panel grid max-h-[92vh] w-full max-w-[min(1120px,94vw)] gap-(--space-2) border border-line bg-paper p-(--space-2) text-ink shadow-[12px_12px_0_var(--line)]">
          <header class="flex items-center justify-between gap-(--space-2) border-b border-line pb-(--space-2)">
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

          <figure class="grid min-h-0 gap-(--space-2)">
            <p class="m-0 justify-self-center border border-line bg-code-surface px-(--space-1) py-1 font-mono text-[12px] leading-none text-muted">
              {{ zoomPercent }}%
            </p>
            <div class="grid max-h-[72vh] min-h-40 place-items-center overflow-auto bg-code-surface p-(--space-2)">
              <img
                :src="src"
                :alt="alt"
                class="block h-auto min-w-0 cursor-zoom-in border border-line bg-paper object-contain"
                :class="zoom >= maxZoom ? 'cursor-zoom-out' : 'cursor-zoom-in'"
                :style="imageStyle"
                @click.stop="toggleZoom"
                @wheel="handleWheel"
              >
            </div>
            <figcaption
              v-if="title"
              class="text-center text-sm leading-[1.6] text-muted text-pretty"
            >
              {{ title }}
            </figcaption>
          </figure>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
