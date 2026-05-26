<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    code?: string
    language?: string | null
    filename?: string | null
    highlights?: number[]
    meta?: string | null
    class?: string | null
    grouped?: boolean
  }>(),
  {
    code: '',
    language: null,
    filename: null,
    highlights: () => [],
    meta: null,
    class: null,
    grouped: false
  }
)

const copied = ref(false)
const preElement = ref<HTMLPreElement>()
let copiedTimer: ReturnType<typeof window.setTimeout> | undefined

const codeLabel = computed(() => props.filename || props.language || 'code')
const lineNumbers = computed(() => {
  const lineCount = Math.max(1, props.code.split('\n').length)
  return Array.from({ length: lineCount }, (_, index) => index + 1)
})

const preClass = computed(() => [
  props.class,
  'm-0 min-w-0 overflow-x-auto bg-code-surface p-(--space-3) font-mono text-[15px] leading-[1.7] text-code-text [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0 [&_code]:font-mono [&_code]:text-inherit [&_code_.line]:block'
])

const copyCode = async () => {
  const codeText = props.code || preElement.value?.innerText || ''

  if (!import.meta.client || !codeText) {
    return
  }

  try {
    await navigator.clipboard.writeText(codeText)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = codeText
    textarea.setAttribute('readonly', '')
    textarea.className = 'fixed left-[-9999px] top-0'
    document.body.append(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }

  copied.value = true

  if (copiedTimer) {
    window.clearTimeout(copiedTimer)
  }

  copiedTimer = window.setTimeout(() => {
    copied.value = false
  }, 1400)
}

onBeforeUnmount(() => {
  if (copiedTimer) {
    window.clearTimeout(copiedTimer)
  }
})
</script>

<template>
  <figure v-if="!grouped" class="my-(--space-4) overflow-hidden border border-line bg-paper">
    <figcaption class="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center border-b border-line">
      <span class="min-w-0 truncate px-(--space-2) text-[13px] font-bold uppercase tracking-normal text-muted">
        {{ codeLabel }}
      </span>
      <AppButton
        class="border-l border-line!"
        variant="icon"
        size="lg"
        :aria-label="copied ? '代码已复制' : '复制代码'"
        @click="copyCode"
      >
        <Icon
          :name="copied ? 'lucide:check' : 'lucide:copy'"
          mode="svg"
          class="h-4 w-4 pointer-events-none"
        />
      </AppButton>
    </figcaption>

    <div class="grid grid-cols-[auto_minmax(0,1fr)] bg-code-surface">
      <div
        class="select-none border-r border-code-border px-(--space-2) py-(--space-3) text-right font-mono text-[15px] leading-[1.7] text-muted"
        aria-hidden="true"
      >
        <span
          v-for="line in lineNumbers"
          :key="line"
          class="block min-w-6"
        >
          {{ line }}
        </span>
      </div>
      <pre
        ref="preElement"
        :class="preClass"
      ><slot /></pre>
    </div>
  </figure>
  <div
    v-else
    class="grid grid-cols-[auto_minmax(0,1fr)] bg-code-surface"
  >
    <div
      class="select-none border-r border-code-border px-(--space-2) py-(--space-3) text-right font-mono text-[15px] leading-[1.7] text-muted"
      aria-hidden="true"
    >
      <span
        v-for="line in lineNumbers"
        :key="line"
        class="block min-w-6"
      >
        {{ line }}
      </span>
    </div>
    <pre
      ref="preElement"
      :class="preClass"
    ><slot /></pre>
  </div>
</template>
