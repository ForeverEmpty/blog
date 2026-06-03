<script setup lang="ts">
const props = withDefaults(defineProps<{
  text?: string | number | null
  terms?: string[]
  highlightClass?: string
}>(), {
  text: '',
  terms: () => [],
  highlightClass: 'bg-callout-warning-surface px-0.5 text-ink group-hover:bg-paper group-focus-within:bg-paper'
})

const segments = computed(() => {
  const text = String(props.text ?? '')
  const terms = Array.from(new Set(
    props.terms
      .map((term) => term.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
  ))

  if (!text || terms.length === 0) {
    return [{ text, matched: false }]
  }

  const lowerText = text.toLocaleLowerCase()
  const parts: { text: string, matched: boolean }[] = []
  let cursor = 0

  while (cursor < text.length) {
    let nextIndex = -1
    let nextTerm = ''

    for (const term of terms) {
      const index = lowerText.indexOf(term.toLocaleLowerCase(), cursor)

      if (index >= 0 && (nextIndex < 0 || index < nextIndex)) {
        nextIndex = index
        nextTerm = term
      }
    }

    if (nextIndex < 0) {
      parts.push({ text: text.slice(cursor), matched: false })
      break
    }

    if (nextIndex > cursor) {
      parts.push({ text: text.slice(cursor, nextIndex), matched: false })
    }

    parts.push({ text: text.slice(nextIndex, nextIndex + nextTerm.length), matched: true })
    cursor = nextIndex + nextTerm.length
  }

  return parts
})
</script>

<template>
  <template
    v-for="(segment, index) in segments"
    :key="`${index}-${segment.text}`"
  >
    <mark
      v-if="segment.matched"
      class="box-decoration-clone transition-colors duration-200"
      :class="highlightClass"
    >{{ segment.text }}</mark>
    <template v-else>{{ segment.text }}</template>
  </template>
</template>
