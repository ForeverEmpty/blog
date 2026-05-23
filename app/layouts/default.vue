<script setup lang="ts">
const navigationItems = ['首页', '归档', '专题', '关于']
</script>

<template>
  <main class="min-h-screen overflow-hidden bg-paper bg-[linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-size-[96px_96px]">
    <header
      class="sticky top-0 z-10 grid grid-cols-[auto_1fr_auto_auto] items-center gap-(--space-4) border-b border-[color-mix(in_oklch,var(--line),transparent_24%)] bg-[color-mix(in_oklch,var(--paper),transparent_8%)] px-[clamp(var(--space-3),5vw,var(--space-8))] py-(--space-3) backdrop-blur-2xl max-[760px]:grid-cols-[auto_1fr_auto] max-[760px]:gap-(--space-2) max-[760px]:p-(--space-2)"
      aria-label="站点导航"
    >
      <a
        class="inline-flex min-h-11 w-11 items-center justify-center rounded-token border border-ink font-display text-lg tracking-normal"
        href="/"
        aria-label="ChankoBlog 首页"
      >
        CB
      </a>
      <nav class="flex flex-wrap gap-(--space-2) text-sm text-muted max-[760px]:order-3 max-[760px]:col-span-full" aria-label="主导航">
        <AppLinkButton
          v-for="item in navigationItems"
          :key="item"
          variant="text"
          href="#"
        >
          {{ item }}
        </AppLinkButton>
      </nav>
      <ThemeModeToggle class="justify-self-end" />
      <AppLinkButton class="max-[760px]:justify-self-end" href="#" variant="outline">后台</AppLinkButton>
    </header>

    <slot />

    <SiteFooter />
  </main>
</template>
