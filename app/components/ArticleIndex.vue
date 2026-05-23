<script setup lang="ts">
defineProps<{
  words: string[]
  states: string[]
}>()
</script>

<template>
  <section
    id="writing-index"
    class="grid grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-t border-line bg-paper max-[760px]:grid-cols-1"
    aria-labelledby="index-title"
  >
    <aside
      class="min-h-180 border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:flex max-[760px]:min-h-0 max-[760px]:justify-between max-[760px]:gap-(--space-3) max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
      aria-label="内容索引"
    >
      <span class="sticky top-32 mb-(--space-4) block text-[13px] font-bold uppercase tracking-normal max-[760px]:static">
        Index
      </span>
      <ol
        class="sticky top-46 m-0 grid list-none gap-(--space-2) p-0 font-display text-[44px] leading-none max-[760px]:static max-[760px]:flex max-[760px]:flex-wrap max-[760px]:justify-end max-[760px]:text-2xl"
      >
        <li v-for="word in words" :key="word">{{ word }}</li>
      </ol>
    </aside>

    <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
      <div class="mb-(--space-8) grid max-w-230 gap-(--space-2)">
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">Writing Index</p>
        <h2
          id="index-title"
          class="m-0 font-display text-[88px] font-normal leading-[0.95] tracking-normal text-pretty max-[1100px]:text-[64px] max-[520px]:text-[40px]"
        >
          最新文章区会在这里接入真实内容。
        </h2>
      </div>

      <div class="grid border-t border-line px-(--space-2)" aria-label="文章列表待接入状态">
        <article
          v-for="(state, index) in states"
          :key="state"
          class="group relative grid min-h-38 grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-(--space-4) overflow-hidden border-b border-line px-(--space-2) py-(--space-4) text-ink before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-ink before:transition-transform before:duration-420 before:ease-[cubic-bezier(.2,.8,.2,1)] hover:text-paper hover:before:scale-x-100 focus-within:text-paper focus-within:before:scale-x-100 max-[760px]:min-h-34 max-[760px]:grid-cols-[48px_minmax(0,1fr)] max-[760px]:gap-(--space-2)"
        >
          <span class="relative z-1 font-display text-[28px] text-quiet transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
            0{{ index + 1 }}
          </span>
          <div class="relative z-1">
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
              {{ state }}
            </p>
            <h3 class="mt-(--space-1) mb-0 font-display text-[72px] font-normal leading-[0.95] tracking-normal max-[1100px]:text-[56px] max-[520px]:text-[36px]">
              真实文章待接入
            </h3>
          </div>
          <span
            class="relative z-1 translate-x-4 text-sm text-quiet opacity-0 transition-[opacity,transform,color] duration-200 group-hover:translate-x-0 group-hover:text-paper group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:text-paper group-focus-within:opacity-100 max-[760px]:hidden"
            aria-hidden="true"
          >
            Read
          </span>
        </article>
      </div>
    </div>
  </section>
</template>
