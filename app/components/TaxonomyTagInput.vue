<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string
  placeholder?: string
  emptyText?: string
  pasteHint?: string
  suggestions?: string[]
  removeLabelPrefix?: string
}>(), {
  label: '标签',
  placeholder: '输入标签后回车添加',
  emptyText: '暂无标签',
  pasteHint: '支持一次粘贴多个标签，使用逗号或换行分隔。',
  suggestions: () => [],
  removeLabelPrefix: '删除标签'
})

const modelValue = defineModel<string>({ required: true })
const draft = ref('')

const parseTags = (value: string) => (
  value
    .split(/\r?\n|,/)
    .map((tag) => tag.trim())
    .filter(Boolean)
)
const tags = computed(() => parseTags(modelValue.value))
const draftTags = computed(() => parseTags(draft.value))
const visibleSuggestions = computed(() => {
  const currentTags = new Set(tags.value.map((tag) => tag.toLowerCase()))

  return Array.from(new Set(props.suggestions.map((tag) => tag.trim()).filter(Boolean)))
    .filter((tag) => !currentTags.has(tag.toLowerCase()))
    .slice(0, 12)
})

const addTags = (source = draft.value) => {
  const incomingTags = parseTags(source)

  if (incomingTags.length === 0) {
    return
  }

  const existingTags = new Set(tags.value.map((tag) => tag.toLowerCase()))
  const nextTags = [...tags.value]

  for (const tag of incomingTags) {
    const normalizedTag = tag.toLowerCase()

    if (existingTags.has(normalizedTag)) {
      continue
    }

    existingTags.add(normalizedTag)
    nextTags.push(tag)
  }

  modelValue.value = nextTags.join(', ')
  draft.value = ''
}

const removeTag = (tag: string) => {
  modelValue.value = tags.value.filter((item) => item !== tag).join(', ')
}
</script>

<template>
  <section class="grid content-start gap-2 text-sm font-bold text-muted">
    <div class="flex items-center justify-between gap-(--space-1)">
      <h3 class="m-0 text-sm font-bold text-muted">
        {{ props.label }}
      </h3>
      <span class="text-[12px] font-bold uppercase tracking-normal text-muted">
        {{ tags.length }} 项
      </span>
    </div>
    <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-(--space-1) max-[520px]:grid-cols-1">
      <input
        v-model="draft"
        class="min-h-11 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink"
        :placeholder="props.placeholder"
        @keydown.enter.prevent="addTags()"
      >
      <AppButton type="button" size="sm" :disabled="draftTags.length === 0" @click="addTags()">
        添加
      </AppButton>
    </div>
    <p class="m-0 text-[12px] leading-[1.5] text-muted">
      {{ props.pasteHint }}
    </p>
    <div v-if="tags.length > 0" class="flex min-h-9 flex-wrap items-center gap-(--space-1)">
      <span
        v-for="tag in tags"
        :key="`tag-${tag}`"
        class="inline-flex max-w-full items-center gap-1 border border-line bg-code-surface px-2 py-1 text-[13px] leading-none text-ink"
      >
        <span class="truncate">{{ tag }}</span>
        <button
          type="button"
          class="grid h-5 w-5 place-items-center text-muted transition-colors duration-200 hover:text-ink focus-visible:text-ink focus-visible:outline-none"
          :aria-label="`${props.removeLabelPrefix} ${tag}`"
          @click="removeTag(tag)"
        >
          <Icon name="lucide:x" mode="svg" class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </span>
    </div>
    <p v-else class="m-0 text-[13px] text-muted">
      {{ props.emptyText }}
    </p>
    <div v-if="visibleSuggestions.length > 0" class="flex flex-wrap gap-(--space-1)">
      <button
        v-for="tag in visibleSuggestions"
        :key="`tag-suggestion-${tag}`"
        type="button"
        class="border border-line bg-paper px-2 py-1 text-[12px] font-bold text-muted transition-colors duration-200 hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink focus-visible:outline-none"
        @click="addTags(tag)"
      >
        {{ tag }}
      </button>
    </div>
  </section>
</template>
