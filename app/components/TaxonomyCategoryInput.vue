<script setup lang="ts">
const props = withDefaults(defineProps<{
  label?: string
  badge?: string
  placeholder?: string
  emptyText?: string
  clearLabel?: string
  suggestions?: string[]
}>(), {
  label: '分类',
  badge: '单选',
  placeholder: '输入分类后回车应用',
  emptyText: '未设置分类',
  clearLabel: '清空分类',
  suggestions: () => []
})

const modelValue = defineModel<string>({ required: true })
const draft = ref('')

const visibleSuggestions = computed(() => (
  Array.from(new Set(props.suggestions.map((category) => category.trim()).filter(Boolean)))
    .filter((category) => category !== modelValue.value)
    .slice(0, 8)
))

const applyDraft = () => {
  const nextCategory = draft.value.trim()

  if (!nextCategory) {
    return
  }

  modelValue.value = nextCategory
  draft.value = ''
}

const selectSuggestion = (category: string) => {
  modelValue.value = category
  draft.value = ''
}

const clearValue = () => {
  modelValue.value = ''
  draft.value = ''
}
</script>

<template>
  <section class="grid content-start gap-2 text-sm font-bold text-muted">
    <div class="flex items-center justify-between gap-(--space-1)">
      <h3 class="m-0 text-sm font-bold text-muted">
        {{ props.label }}
      </h3>
      <span class="text-[12px] font-bold uppercase tracking-normal text-muted">
        {{ props.badge }}
      </span>
    </div>
    <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-(--space-1) max-[520px]:grid-cols-1">
      <input
        v-model="draft"
        class="min-h-11 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink"
        :placeholder="props.placeholder"
        @keydown.enter.prevent="applyDraft"
      >
      <AppButton type="button" size="sm" :disabled="!draft.trim()" @click="applyDraft">
        应用
      </AppButton>
    </div>
    <div class="flex min-h-9 flex-wrap items-center gap-(--space-1)">
      <span
        v-if="modelValue"
        class="inline-flex max-w-full items-center gap-1 border border-line bg-code-surface px-2 py-1 text-[13px] leading-none text-ink"
      >
        <span class="truncate">{{ modelValue }}</span>
        <button
          type="button"
          class="grid h-5 w-5 place-items-center text-muted transition-colors duration-200 hover:text-ink focus-visible:text-ink focus-visible:outline-none"
          :aria-label="props.clearLabel"
          @click="clearValue"
        >
          <Icon name="lucide:x" mode="svg" class="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </span>
      <span v-else class="text-[13px] text-muted">{{ props.emptyText }}</span>
    </div>
    <div v-if="visibleSuggestions.length > 0" class="flex flex-wrap gap-(--space-1)">
      <button
        v-for="category in visibleSuggestions"
        :key="`category-suggestion-${category}`"
        type="button"
        class="border border-line bg-paper px-2 py-1 text-[12px] font-bold text-muted transition-colors duration-200 hover:border-ink hover:text-ink focus-visible:border-ink focus-visible:text-ink focus-visible:outline-none"
        @click="selectSuggestion(category)"
      >
        {{ category }}
      </button>
    </div>
  </section>
</template>
