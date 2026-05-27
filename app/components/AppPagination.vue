<script setup lang="ts">
const props = defineProps<{
  page: number
  pageCount: number
  total: number
  pageSize: number
  label: string
}>()

const emit = defineEmits<{
  change: [page: number]
}>()

const normalizedPageCount = computed(() => Math.max(1, props.pageCount))
const normalizedPage = computed(() => Math.min(Math.max(1, props.page), normalizedPageCount.value))
const pageItems = computed(() => (
  Array.from({ length: normalizedPageCount.value }, (_, index) => index + 1)
))
const rangeStart = computed(() => (
  props.total === 0 ? 0 : (normalizedPage.value - 1) * props.pageSize + 1
))
const rangeEnd = computed(() => Math.min(normalizedPage.value * props.pageSize, props.total))

const goToPage = (page: number) => {
  const nextPage = Math.min(Math.max(1, page), normalizedPageCount.value)

  if (nextPage !== normalizedPage.value) {
    emit('change', nextPage)
  }
}
</script>

<template>
  <nav
    class="grid border-y border-line"
    :aria-label="label"
  >
    <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-(--space-2) px-(--space-2) py-(--space-2) max-[640px]:grid-cols-1">
      <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
        {{ rangeStart.toString().padStart(2, "0") }}-{{ rangeEnd.toString().padStart(2, "0") }}
        / {{ total.toString().padStart(2, "0") }}
      </p>

      <ol class="m-0 flex list-none flex-wrap justify-center gap-(--space-1) p-0 max-[640px]:justify-start">
        <li
          v-for="item in pageItems"
          :key="item"
        >
          <button
            type="button"
            class="inline-grid h-11 min-w-11 cursor-pointer place-items-center rounded-token border border-line px-(--space-1) font-display text-[24px] leading-none text-ink transition-[background-color,border-color,color,transform] duration-200 hover:border-ink hover:bg-ink hover:text-paper focus-visible:border-ink focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none active:scale-[0.98] disabled:cursor-default disabled:border-ink disabled:bg-ink disabled:text-paper disabled:active:scale-100"
            :aria-current="item === normalizedPage ? 'page' : undefined"
            :disabled="item === normalizedPage"
            @click="goToPage(item)"
          >
            {{ item.toString().padStart(2, "0") }}
          </button>
        </li>
      </ol>

      <div class="flex justify-end gap-(--space-1) max-[640px]:justify-start">
        <button
          type="button"
          class="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-token border border-line text-ink transition-[background-color,border-color,color,opacity,transform] duration-200 hover:border-ink hover:bg-ink hover:text-paper focus-visible:border-ink focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none active:scale-[0.98] disabled:cursor-default disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-ink disabled:active:scale-100"
          :disabled="normalizedPage <= 1"
          aria-label="上一页"
          @click="goToPage(normalizedPage - 1)"
        >
          <Icon
            name="lucide:arrow-left"
            mode="svg"
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          class="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-token border border-line text-ink transition-[background-color,border-color,color,opacity,transform] duration-200 hover:border-ink hover:bg-ink hover:text-paper focus-visible:border-ink focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none active:scale-[0.98] disabled:cursor-default disabled:opacity-40 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-ink disabled:active:scale-100"
          :disabled="normalizedPage >= normalizedPageCount"
          aria-label="下一页"
          @click="goToPage(normalizedPage + 1)"
        >
          <Icon
            name="lucide:arrow-right"
            mode="svg"
            class="h-4 w-4"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  </nav>
</template>
