<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string
    title?: string
    description?: string
    poster?: string
    type?: string
    controls?: boolean
    autoplay?: boolean
    muted?: boolean
    loop?: boolean
  }>(),
  {
    src: '',
    title: '',
    description: '',
    poster: '',
    type: 'video/mp4',
    controls: true,
    autoplay: false,
    muted: false,
    loop: false
  }
)
</script>

<template>
  <figure class="my-(--space-4) overflow-hidden border border-line bg-code-surface">
    <div class="relative bg-ink">
      <video
        v-if="props.src"
        class="block aspect-video w-full bg-ink object-contain"
        :controls="props.controls"
        :autoplay="props.autoplay"
        :muted="props.muted || props.autoplay"
        :loop="props.loop"
        :poster="props.poster || undefined"
        playsinline
        preload="metadata"
      >
        <source :src="props.src" :type="props.type">
      </video>

      <div
        v-else
        class="grid aspect-video place-items-center px-(--space-3) text-center text-paper"
        role="status"
      >
        <div class="grid justify-items-center gap-(--space-2)">
          <Icon
            name="lucide:film"
            mode="svg"
            class="h-9 w-9"
            aria-hidden="true"
          />
          <p class="m-0 text-sm font-bold">
            视频地址未设置
          </p>
        </div>
      </div>
    </div>

    <figcaption
      v-if="props.title || props.description"
      class="grid gap-1 border-t border-line px-(--space-2) py-(--space-2)"
    >
      <p
        v-if="props.title"
        class="m-0 text-sm font-bold text-ink"
      >
        {{ props.title }}
      </p>
      <p
        v-if="props.description"
        class="m-0 text-sm leading-[1.6] text-muted text-pretty"
      >
        {{ props.description }}
      </p>
    </figcaption>
  </figure>
</template>
