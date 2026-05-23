<script setup lang="ts">
type TypewriterState = 'typing' | 'stopped' | 'deleting'

const props = withDefaults(defineProps<{
  sentences: string | string[]
  typingSpeed?: number
  typingDuration?: number
  stopDuration?: number
  deletingSpeed?: number
  deletingDuration?: number
  loop?: boolean
  cursor?: boolean
  ariaLive?: 'off' | 'polite' | 'assertive'
}>(), {
  typingSpeed: 80,
  typingDuration: undefined,
  stopDuration: 1200,
  deletingSpeed: 42,
  deletingDuration: undefined,
  loop: true,
  cursor: true,
  ariaLive: 'polite'
})

const emit = defineEmits<{
  'state-change': [state: TypewriterState]
  'sentence-change': [sentence: string, index: number]
}>()

const sentenceIndex = ref(0)
const visibleCount = ref(0)
const state = ref<TypewriterState>('typing')

const sentenceList = computed(() => {
  const list = Array.isArray(props.sentences) ? props.sentences : [props.sentences]

  return list.filter((sentence) => sentence.length > 0)
})

const longestSentence = computed(() => sentenceList.value.reduce((a, b) =>
  Array.from(a).length > Array.from(b).length ? a : b, ''
))

const hasSentences = computed(() => sentenceList.value.length > 0)
const currentSentence = computed(() => sentenceList.value[sentenceIndex.value] ?? '')
const currentCharacters = computed(() => Array.from(currentSentence.value))
const displayText = computed(() => currentCharacters.value.slice(0, visibleCount.value).join(''))
const stateLabel = computed(() => ({
  typing: '打字',
  stopped: '停止',
  deleting: '删除'
})[state.value])

let frameId: number | null = null
let phaseStartedAt = 0

const getDuration = (duration: number | undefined, speed: number, length: number) => {
  if (typeof duration === 'number' && duration > 0) {
    return duration
  }

  return Math.max(speed * Math.max(length, 1), 1)
}

const setState = (nextState: TypewriterState, timestamp: number) => {
  if (state.value !== nextState) {
    state.value = nextState
    emit('state-change', nextState)
  }

  phaseStartedAt = timestamp
}

const cancelFrame = () => {
  if (frameId !== null) {
    cancelAnimationFrame(frameId)
    frameId = null
  }
}

const restart = () => {
  cancelFrame()
  sentenceIndex.value = 0
  visibleCount.value = 0
  phaseStartedAt = 0

  if (!hasSentences.value) {
    state.value = 'stopped'
    emit('state-change', 'stopped')
    return
  }

  state.value = 'typing'
  emit('state-change', 'typing')
  emit('sentence-change', currentSentence.value, 0)
  frameId = requestAnimationFrame(tick)
}

const moveToNextSentence = (timestamp: number) => {
  const isLastSentence = sentenceIndex.value >= sentenceList.value.length - 1

  if (isLastSentence && !props.loop) {
    setState('stopped', timestamp)
    visibleCount.value = currentCharacters.value.length
    cancelFrame()
    return
  }

  sentenceIndex.value = isLastSentence ? 0 : sentenceIndex.value + 1
  visibleCount.value = 0
  emit('sentence-change', currentSentence.value, sentenceIndex.value)
  setState('typing', timestamp)
}

function tick(timestamp: number) {
  if (phaseStartedAt === 0) {
    phaseStartedAt = timestamp
  }

  const charactersLength = currentCharacters.value.length

  if (charactersLength === 0) {
    cancelFrame()
    return
  }

  const elapsed = timestamp - phaseStartedAt

  if (state.value === 'typing') {
    const duration = getDuration(props.typingDuration, props.typingSpeed, charactersLength)
    const progress = Math.min(elapsed / duration, 1)
    visibleCount.value = Math.min(Math.floor(progress * charactersLength), charactersLength)

    if (progress >= 1) {
      visibleCount.value = charactersLength
      setState('stopped', timestamp)
    }
  } else if (state.value === 'stopped') {
    visibleCount.value = charactersLength

    if (elapsed >= props.stopDuration) {
      setState('deleting', timestamp)
    }
  } else {
    const duration = getDuration(props.deletingDuration, props.deletingSpeed, charactersLength)
    const progress = Math.min(elapsed / duration, 1)
    visibleCount.value = Math.max(charactersLength - Math.floor(progress * charactersLength), 0)

    if (progress >= 1) {
      moveToNextSentence(timestamp)
    }
  }

  frameId = requestAnimationFrame(tick)
}

watch(sentenceList, () => {
  if (import.meta.client) {
    restart()
  }
})

onMounted(() => {
  restart()
})

onBeforeUnmount(() => {
  cancelFrame()
})
</script>

<template>
  <span
    v-bind="$attrs"
    class="grid min-w-0 max-w-full items-baseline"
    :aria-label="displayText"
    :aria-live="ariaLive"
    :data-state="state"
    :data-state-label="stateLabel"
  >
    <span
      class="pointer-events-none col-start-1 row-start-1 block min-w-0 select-none text-transparent"
      aria-hidden="true"
    >
      <span>{{ longestSentence }}</span>
      <span
        v-if="cursor"
        class="ml-1 inline-block h-[1em] w-0.5 translate-y-[0.12em] bg-current"
      />
    </span>
    <span class="col-start-1 row-start-1 block min-w-0">
      <span>{{ displayText }}</span>
      <span
        v-if="cursor"
        class="ml-1 inline-block h-[1em] w-0.5 translate-y-[0.12em] bg-current"
        :class="state === 'stopped' ? 'opacity-35' : 'opacity-100'"
        aria-hidden="true"
      />
    </span>
  </span>
</template>
