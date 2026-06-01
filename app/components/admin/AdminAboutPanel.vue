<script setup lang="ts">
const props = defineProps<{
  saving: boolean
  previewValue: unknown | null
  previewPending: boolean
  previewError: string
}>()

const emit = defineEmits<{
  saveAbout: []
}>()

const aboutTitle = defineModel<string>('aboutTitle', { required: true })
const aboutDescription = defineModel<string>('aboutDescription', { required: true })
const aboutMarkdown = defineModel<string>('aboutMarkdown', { required: true })
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="关于页面管理">
    <section class="grid border-y border-line" aria-label="关于页面说明">
      <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-(--space-2) border-b border-line p-(--space-2) max-[860px]:grid-cols-1">
        <div class="grid gap-1">
          <h2 class="m-0 font-display text-[40px] font-normal leading-none">
            关于
          </h2>
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            content/about.md
          </p>
        </div>
        <p class="m-0 max-w-180 text-sm leading-[1.6] text-muted text-pretty">
          这里会直接修改前台关于页使用的 Nuxt Content 文件。保存后刷新关于页即可看到最新内容。
        </p>
        <AppButton variant="solid" :loading="props.saving" @click="emit('saveAbout')">
          <Icon name="lucide:save" mode="svg" class="h-4 w-4" aria-hidden="true" />
          保存关于
        </AppButton>
      </div>

      <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-(--space-3) p-(--space-2) max-[1080px]:grid-cols-1">
        <label class="grid gap-2 text-sm font-bold text-muted">
          标题
          <input
            v-model="aboutTitle"
            class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink"
          >
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          描述
          <input
            v-model="aboutDescription"
            class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink"
          >
        </label>
      </div>
    </section>

    <section class="grid grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)] gap-(--space-3) max-[1080px]:grid-cols-1" aria-label="关于页面编辑与预览">
      <div class="grid grid-rows-[auto_minmax(0,1fr)] border border-line">
        <div class="flex min-h-12 items-center justify-between gap-(--space-2) border-b border-line px-(--space-2)">
          <h3 class="m-0 text-sm font-bold uppercase tracking-normal text-muted">
            Markdown
          </h3>
          <span class="text-[13px] font-bold text-muted">
            {{ aboutMarkdown.length }} chars
          </span>
        </div>
        <textarea
          v-model="aboutMarkdown"
          class="h-[720px] min-h-0 resize-y overflow-auto border-0 bg-code-surface p-(--space-3) font-mono text-[15px] leading-[1.75] text-code-text outline-none max-[720px]:h-[460px]"
          spellcheck="false"
        />
      </div>

      <article class="grid grid-rows-[auto_minmax(0,1fr)] border border-line bg-paper">
        <div class="flex min-h-12 items-center justify-between gap-(--space-2) border-b border-line px-(--space-2)">
          <h3 class="m-0 text-sm font-bold uppercase tracking-normal text-muted">
            Preview
          </h3>
          <span class="text-[13px] font-bold text-muted">
            {{ props.previewPending ? 'MDC 渲染中' : '关于页预览' }}
          </span>
        </div>
        <div class="h-[720px] overflow-auto px-(--space-3) py-(--space-4) max-[720px]:h-[460px] max-[760px]:px-(--space-2)">
          <header class="grid gap-(--space-2)">
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              About
            </p>
            <h2 class="m-0 break-words font-display text-[72px] font-normal leading-[0.95] tracking-normal max-[760px]:text-[48px] max-[520px]:text-[38px]">
              {{ aboutTitle }}
            </h2>
            <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
              {{ aboutDescription }}
            </p>
          </header>
          <p v-if="props.previewError" class="m-0 mt-(--space-3) border border-line p-(--space-2) text-muted">
            {{ props.previewError }}
          </p>
          <ContentBody v-else-if="props.previewValue" class="mt-(--space-4)" :value="props.previewValue" />
        </div>
      </article>
    </section>
  </section>
</template>
