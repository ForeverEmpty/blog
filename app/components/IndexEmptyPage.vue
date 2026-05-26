<script setup lang="ts">
type IndexPageConfig = {
  eyebrow: string
  title: string
  description: string
  emptyKicker: string
  emptyTitle: string
  emptyDescription: string
  integrationDescription: string
  integrationItems: string[]
  primaryAction: {
    label: string
    href: string
  }
}

defineProps<{
  config: IndexPageConfig
  count?: number
  labelledBy: string
  sidebarLabel: string
  listLabel: string
}>()
</script>

<template>
  <section
    class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-b border-line bg-paper max-[760px]:grid-cols-1"
    :aria-labelledby="labelledBy"
  >
    <aside
      class="border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
      :aria-label="sidebarLabel"
    >
      <div class="sticky top-32 grid gap-(--space-4) max-[760px]:static max-[760px]:grid-cols-[auto_1fr] max-[760px]:items-end">
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal">
          {{ config.eyebrow }}
        </p>
        <p class="m-0 font-display text-[88px] leading-none text-ink max-[760px]:justify-self-end max-[760px]:text-[56px]">
          {{ (count ?? 0).toString().padStart(2, "0") }}
        </p>
      </div>
    </aside>

    <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
      <div class="grid max-w-300 gap-(--space-8)">
        <div class="grid gap-(--space-3)">
          <h1
            :id="labelledBy"
            class="m-0 max-w-260 font-display text-[132px] font-normal leading-[0.95] tracking-normal text-ink text-pretty max-[1100px]:text-[88px] max-[520px]:text-[56px]"
          >
            {{ config.title }}
          </h1>
          <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
            {{ config.description }}
          </p>
        </div>

        <div class="grid border-t border-line" :aria-label="listLabel">
          <div
            class="group grid min-h-76 grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-4) border-b border-line px-(--space-2) py-(--space-6) transition-colors duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-ink hover:text-paper max-[760px]:grid-cols-1"
          >
            <div class="grid max-w-190 gap-(--space-2)">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper">
                {{ config.emptyKicker }}
              </p>
              <h2 class="m-0 font-display text-[72px] font-normal leading-[0.95] tracking-normal text-pretty max-[1100px]:text-[56px] max-[520px]:text-[36px]">
                {{ config.emptyTitle }}
              </h2>
              <p class="m-0 text-lg leading-[1.6] text-muted text-pretty transition-colors duration-200 group-hover:text-paper">
                {{ config.emptyDescription }}
              </p>
            </div>

            <AppLinkButton :href="config.primaryAction.href" variant="outline">
              {{ config.primaryAction.label }}
            </AppLinkButton>
          </div>
        </div>

        <div class="grid grid-cols-[minmax(0,1fr)_minmax(240px,360px)] gap-(--space-4) max-[900px]:grid-cols-1">
          <p class="m-0 max-w-170 text-lg leading-[1.6] text-muted text-pretty">
            {{ config.integrationDescription }}
          </p>
          <ul class="m-0 grid list-none gap-(--space-1) p-0 text-sm font-bold uppercase tracking-normal text-muted">
            <li
              v-for="item in config.integrationItems"
              :key="item"
              class="border-b border-line py-(--space-1)"
            >
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>
