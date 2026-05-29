<script setup lang="ts">
const appConfig = useAppConfig();
const currentYear = new Date().getFullYear();
const { isActiveNavigation } = useActiveNavigation();
const footerRoot = ref<HTMLElement | null>(null);
const brandCanvas = ref<HTMLCanvasElement | null>(null);
const brandText = computed(() => appConfig.site.name);

// Canvas 字标动画参数集中放在这里，后续调范围、分块和速度不需要读绘制循环。
const motionConfig = {
  // 横向影响范围：max(min, min(canvas width * ratio, max))。
  rangeMinX: 100,
  rangeRatioX: 0.3,
  rangeMaxX: 560,
  // 纵向影响范围：max(min, min(canvas height * ratio, max))。
  rangeMinY: 80,
  rangeRatioY: 0.9,
  rangeMaxY: 180,
  // 分块尺寸。越大越干净、性能越稳；越小越细腻但更容易脏。
  tileWidth: 34,
  tileHeight: 28,
  // 鼠标横向速度到像素位移的倍率。
  speedMultiplier: 60,
  // 单个方块左右位移上限。
  maxShift: 80,
  // 细笔画/边缘方块的最低位移权重。
  minInkWeight: 0.65,
};

const {
  updateMotion: updateBrandMotion,
  clearMotion: clearBrandMotion,
  focus: focusBrand,
} = useCanvasWordmarkMotion({
  canvas: brandCanvas,
  root: footerRoot,
  text: brandText.value,
  config: motionConfig,
});
</script>

<template>
  <footer
    ref="footerRoot"
    class="border-t border-line bg-[color-mix(in_oklch,var(--paper),transparent_6%)] px-[clamp(var(--space-3),5vw,var(--space-8))] py-(--space-8)"
    aria-label="页脚"
  >
    <div class="grid gap-(--space-6)">
      <div
        class="grid grid-cols-[minmax(0,1fr)_minmax(280px,440px)] gap-(--space-4) max-[760px]:grid-cols-1"
      >
        <a
          class="block min-h-14 w-full focus-visible:outline-none"
          href="#"
          :aria-label="appConfig.footer.homeAriaLabel"
          @pointerenter="updateBrandMotion"
          @pointermove="updateBrandMotion"
          @pointerleave="clearBrandMotion"
          @focus="focusBrand"
          @blur="clearBrandMotion"
        >
          <canvas
            ref="brandCanvas"
            class="block h-[clamp(56px,12vw,176px)] w-full"
            aria-hidden="true"
          />
          <span class="sr-only">{{ brandText }}</span>
        </a>

        <div
          class="relative isolate grid min-h-42 content-end gap-(--space-3) overflow-hidden"
        >
          <p
            class="pointer-events-none relative z-20 m-0 pr-(--space-12) text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg"
          >
            {{ appConfig.footer.description }}
          </p>
          <a
            class="absolute -right-8 -bottom-8 z-10 flex h-45 w-45 -rotate-45 items-center justify-center rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:rotate-0 focus-visible:rotate-0 focus-visible:outline-none"
            href="#"
            :aria-label="appConfig.footer.homeAriaLabel"
          >
            <Icon
              name="lucide:arrow-up"
              mode="svg"
              class="h-20 w-20 text-paper pointer-events-none"
            >
            </Icon>
          </a>
          <p
            aria-hidden="true"
            class="pointer-events-none absolute inset-x-0 bottom-0 z-20 m-0 pr-(--space-12) text-[22px] leading-[1.55] text-paper text-pretty [clip-path:circle(90px_at_calc(100%-58px)_calc(100%-58px))] max-[520px]:text-lg"
          >
            {{ appConfig.footer.description }}
          </p>
        </div>
      </div>

      <div
        class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-4) border-t border-line pt-(--space-3) max-[760px]:grid-cols-1"
      >
        <nav
          class="flex flex-wrap gap-(--space-2) text-sm text-muted"
          aria-label="页脚导航"
        >
          <AppLinkButton
            v-for="link in appConfig.footer.links"
            :key="link.label"
            variant="text"
            class="font-normal"
            :href="link.href"
            :active="isActiveNavigation(link.href)"
          >
            {{ link.label }}
          </AppLinkButton>
        </nav>

        <p class="m-0 text-sm text-quiet">
          © {{ currentYear }} {{ appConfig.site.name }}
        </p>
      </div>
    </div>
  </footer>
</template>
