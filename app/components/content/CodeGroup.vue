<script setup lang="ts">
import {
  Comment,
  Fragment,
  Text,
  cloneVNode,
  defineComponent,
  h,
  isVNode,
  type VNode
} from 'vue'

type CodeFile = {
  node: VNode
  label: string
  code: string
}

const slots = useSlots()
const activeIndex = ref(0)
const copied = ref(false)
const groupElement = ref<HTMLElement>()
let copiedTimer: ReturnType<typeof window.setTimeout> | undefined

const RenderCodeFile = defineComponent({
  name: 'RenderCodeFile',
  props: {
    node: {
      type: Object,
      required: true
    },
    selectedIndex: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    return () => cloneVNode(props.node as VNode, {
      grouped: true,
      key: `code-file-${props.selectedIndex}`
    })
  }
})

const flattenNodes = (nodes: unknown[], result: VNode[] = []) => {
  for (const node of nodes) {
    if (!isVNode(node)) {
      continue
    }

    if (node.type === Fragment && Array.isArray(node.children)) {
      flattenNodes(node.children, result)
      continue
    }

    if (node.type !== Comment && node.type !== Text) {
      result.push(node)
    }
  }

  return result
}

const fileLabel = (node: VNode, index: number) => {
  const props = (node.props || {}) as Record<string, unknown>
  return String(props.filename || props.language || `file-${index + 1}`)
}

const fileCode = (node: VNode) => {
  const props = (node.props || {}) as Record<string, unknown>
  return typeof props.code === 'string' ? props.code : ''
}

const files = computed<CodeFile[]>(() => (
  flattenNodes(slots.default?.() || []).map((node, index) => ({
    node,
    label: fileLabel(node, index),
    code: fileCode(node)
  }))
))

const selectedIndex = computed(() => (
  Math.min(activeIndex.value, Math.max(0, files.value.length - 1))
))

const activeFile = computed(() => files.value[selectedIndex.value])

const setActiveFile = (index: number) => {
  activeIndex.value = index
  copied.value = false
}

const copyActiveCode = async () => {
  const codeText = activeFile.value?.code || groupElement.value?.querySelector('pre')?.innerText || ''

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
  <div
    v-if="!files.length"
    ref="groupElement"
    class="my-(--space-4)"
  >
    <slot />
  </div>

  <figure
    v-else
    ref="groupElement"
    class="my-(--space-4) overflow-hidden border border-line bg-paper"
  >
    <figcaption class="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-stretch border-b border-line">
      <div
        role="tablist"
        aria-label="代码文件"
        class="flex min-w-0 overflow-x-auto"
      >
        <button
          v-for="(file, index) in files"
          :key="file.label"
          type="button"
          role="tab"
          :aria-selected="selectedIndex === index"
          class="min-h-12 max-w-52 shrink-0 truncate border-r border-line px-(--space-2) font-mono text-[13px] font-bold tracking-normal transition-colors duration-200 focus-visible:outline-none"
          :class="selectedIndex === index
            ? 'bg-ink text-paper!'
            : 'bg-transparent text-muted! hover:bg-code-surface hover:text-code-text! focus-visible:bg-code-surface focus-visible:text-code-text!'"
          @click="setActiveFile(index)"
        >
          {{ file.label }}
        </button>
      </div>

      <button
        type="button"
        class="grid min-h-12 w-12 place-items-center border-l border-line bg-transparent text-muted! transition-colors duration-200 hover:bg-code-surface hover:text-code-text! focus-visible:bg-code-surface focus-visible:text-code-text! focus-visible:outline-none"
        :aria-label="copied ? '代码已复制' : `复制 ${activeFile?.label}`"
        @click="copyActiveCode"
      >
        <Icon
          :name="copied ? 'lucide:check' : 'lucide:copy'"
          mode="svg"
          class="h-4 w-4 pointer-events-none"
        />
      </button>
    </figcaption>

    <RenderCodeFile
      v-if="activeFile"
      :node="activeFile.node"
      :selected-index="selectedIndex"
    />
  </figure>
</template>
