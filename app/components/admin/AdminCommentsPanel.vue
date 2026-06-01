<script setup lang="ts">
import type { ManagedComment, ManagedCommentStatus } from '~/types/admin'

const props = defineProps<{
  comments: ManagedComment[]
  stats: {
    total: number
    approved: number
    waiting: number
    spam: number
  }
  saving: boolean
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  refreshComments: []
  setCommentStatus: [comment: ManagedComment, status: ManagedCommentStatus]
  bulkSetCommentStatus: [ids: string[], status: ManagedCommentStatus]
  bulkDeleteComments: [ids: string[]]
  deleteComment: [comment: ManagedComment]
}>()

const commentSearchQuery = defineModel<string>('commentSearchQuery', { required: true })
const commentStatusFilter = defineModel<string>('commentStatusFilter', { required: true })
const selectedCommentIds = defineModel<string[]>('selectedCommentIds', { required: true })

const visibleCommentIds = computed(() => props.comments.map((comment) => comment.id))
const selectedVisibleIds = computed(() => (
  selectedCommentIds.value.filter((id) => visibleCommentIds.value.includes(id))
))
const selectedVisibleCount = computed(() => selectedVisibleIds.value.length)
const allVisibleSelected = computed(() => (
  props.comments.length > 0 &&
  props.comments.every((comment) => selectedCommentIds.value.includes(comment.id))
))

const setQuickFilter = (value: string) => {
  commentSearchQuery.value = value
}

const toggleCommentSelection = (id: string) => {
  selectedCommentIds.value = selectedCommentIds.value.includes(id)
    ? selectedCommentIds.value.filter((item) => item !== id)
    : [...selectedCommentIds.value, id]
}

const toggleVisibleSelection = () => {
  if (allVisibleSelected.value) {
    selectedCommentIds.value = selectedCommentIds.value.filter((id) => !visibleCommentIds.value.includes(id))
    return
  }

  selectedCommentIds.value = Array.from(new Set([
    ...selectedCommentIds.value,
    ...visibleCommentIds.value
  ]))
}

const clearSelection = () => {
  selectedCommentIds.value = []
}

const bulkSetStatus = (status: ManagedCommentStatus) => {
  emit('bulkSetCommentStatus', selectedVisibleIds.value, status)
}

const bulkDelete = () => {
  emit('bulkDeleteComments', selectedVisibleIds.value)
}

const statusLabel = (status: ManagedCommentStatus) => {
  if (status === 'waiting') {
    return '待审核'
  }

  if (status === 'spam') {
    return '垃圾'
  }

  return '已通过'
}

const statusClass = (status: ManagedCommentStatus) => {
  if (status === 'waiting') {
    return 'border-callout-warning-border bg-callout-warning-surface text-callout-warning-text'
  }

  if (status === 'spam') {
    return 'border-callout-danger-border bg-callout-danger-surface text-callout-danger-text'
  }

  return 'border-callout-success-border bg-callout-success-surface text-callout-success-text'
}

const formatTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value || '未知时间'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="评论管理">
    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-2) border-b border-line pb-(--space-3) max-[820px]:grid-cols-1">
      <div class="grid grid-cols-[minmax(0,1fr)_220px] gap-(--space-2) max-[720px]:grid-cols-1">
        <label class="grid gap-2 text-sm font-bold text-muted">
          搜索评论
          <input
            v-model="commentSearchQuery"
            class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink"
            placeholder="内容、作者、邮箱或文章路径"
          >
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          状态
          <select
            v-model="commentStatusFilter"
            class="min-h-12 border border-line bg-paper px-(--space-2) text-base font-bold text-ink outline-none focus:border-ink"
          >
            <option value="all">全部</option>
            <option value="waiting">待审核</option>
            <option value="approved">已通过</option>
            <option value="spam">垃圾</option>
          </select>
        </label>
      </div>
      <AppButton variant="solid" :loading="props.loading" @click="emit('refreshComments')">
        <Icon name="lucide:refresh-cw" mode="svg" class="h-4 w-4" aria-hidden="true" />
        刷新评论
      </AppButton>
    </div>

    <div class="grid grid-cols-4 border-y border-line max-[920px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="评论治理统计">
      <button
        type="button"
        class="grid gap-1 border-r border-line p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none max-[520px]:border-r-0 max-[520px]:border-b"
        @click="commentStatusFilter = 'all'"
      >
        <span class="text-[12px] font-bold uppercase tracking-normal text-muted">全部</span>
        <span class="font-display text-[44px] leading-none text-ink">{{ props.stats.total }}</span>
      </button>
      <button
        type="button"
        class="grid gap-1 border-r border-line p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none max-[920px]:border-r-0 max-[920px]:border-b"
        @click="commentStatusFilter = 'waiting'"
      >
        <span class="text-[12px] font-bold uppercase tracking-normal text-muted">待审核</span>
        <span class="font-display text-[44px] leading-none text-callout-warning-text">{{ props.stats.waiting }}</span>
      </button>
      <button
        type="button"
        class="grid gap-1 border-r border-line p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none max-[520px]:border-r-0 max-[520px]:border-b"
        @click="commentStatusFilter = 'approved'"
      >
        <span class="text-[12px] font-bold uppercase tracking-normal text-muted">已通过</span>
        <span class="font-display text-[44px] leading-none text-callout-success-text">{{ props.stats.approved }}</span>
      </button>
      <button
        type="button"
        class="grid gap-1 p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none"
        @click="commentStatusFilter = 'spam'"
      >
        <span class="text-[12px] font-bold uppercase tracking-normal text-muted">垃圾</span>
        <span class="font-display text-[44px] leading-none text-callout-danger-text">{{ props.stats.spam }}</span>
      </button>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-(--space-2) border-b border-line pb-(--space-2)">
      <label class="inline-flex min-h-10 cursor-pointer items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
        <input
          type="checkbox"
          class="accent-ink"
          :checked="allVisibleSelected"
          :disabled="props.comments.length === 0"
          @change="toggleVisibleSelection"
        >
        选择当前筛选
      </label>

      <div class="flex flex-wrap items-center gap-(--space-1)">
        <span class="text-[13px] font-bold uppercase tracking-normal text-muted">
          已选 {{ selectedVisibleCount }} 条
        </span>
        <AppButton size="sm" :disabled="selectedVisibleCount === 0 || props.saving" @click="bulkSetStatus('approved')">
          批量通过
        </AppButton>
        <AppButton size="sm" :disabled="selectedVisibleCount === 0 || props.saving" @click="bulkSetStatus('waiting')">
          批量待审
        </AppButton>
        <AppButton size="sm" :disabled="selectedVisibleCount === 0 || props.saving" @click="bulkSetStatus('spam')">
          批量垃圾
        </AppButton>
        <AppButton size="sm" variant="text" :disabled="selectedVisibleCount === 0 || props.saving" @click="bulkDelete">
          批量删除
        </AppButton>
        <AppButton size="sm" variant="text" :disabled="selectedCommentIds.length === 0" @click="clearSelection">
          清空选择
        </AppButton>
      </div>
    </div>

    <p
      v-if="props.error"
      class="m-0 border border-line bg-code-surface p-(--space-2) text-sm font-bold text-muted"
      role="alert"
    >
      {{ props.error }}
    </p>

    <div
      v-if="props.comments.length > 0"
      class="grid gap-(--space-2)"
    >
      <article
        v-for="comment in props.comments"
        :key="comment.id"
        class="grid gap-(--space-2) border border-line p-(--space-3)"
        :class="selectedCommentIds.includes(comment.id) ? 'bg-code-surface' : ''"
      >
        <div class="flex flex-wrap items-start justify-between gap-(--space-2)">
          <div class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-(--space-2)">
            <label class="mt-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center border border-line bg-paper">
              <input
                type="checkbox"
                class="accent-ink"
                :checked="selectedCommentIds.includes(comment.id)"
                @change="toggleCommentSelection(comment.id)"
              >
              <span class="sr-only">选择评论 {{ comment.id }}</span>
            </label>
            <div class="grid min-w-0 gap-1">
              <p class="m-0 flex flex-wrap items-center gap-(--space-1) text-[13px] font-bold uppercase tracking-normal text-muted">
                <span class="border px-1 py-0.5" :class="statusClass(comment.status)">
                  {{ statusLabel(comment.status) }}
                </span>
                <button
                  type="button"
                  class="underline-offset-4 hover:text-ink hover:underline focus-visible:text-ink focus-visible:outline-none"
                  @click="setQuickFilter(comment.articleSlug || comment.url)"
                >
                  {{ comment.articleSlug || comment.url }}
                </button>
              </p>
              <h2 class="m-0 break-words font-display text-[42px] font-normal leading-none max-[520px]:text-[32px]">
                {{ comment.author || '匿名访客' }}
              </h2>
            </div>
          </div>
          <span class="border border-line bg-code-surface px-(--space-1) py-1 font-mono text-[12px] font-bold text-muted">
            #{{ comment.objectId }}
          </span>
        </div>

        <p class="m-0 whitespace-pre-wrap text-lg leading-[1.65] text-ink text-pretty">
          {{ comment.content }}
        </p>

        <div class="grid gap-1 text-sm font-bold text-muted">
          <a
            class="break-words underline underline-offset-4 transition-colors duration-200 hover:text-ink focus-visible:text-ink focus-visible:outline-none"
            :href="comment.url"
          >
            {{ comment.url }}
          </a>
          <p class="m-0 break-words">
            {{ comment.mail || '无邮箱' }} / {{ comment.link || '无站点' }}
          </p>
          <p class="m-0 break-words font-mono text-[12px]">
            {{ formatTime(comment.createdAt) }} / {{ comment.ip || '无 IP' }}
          </p>
          <div class="flex flex-wrap gap-(--space-1) pt-1">
            <button
              type="button"
              class="border border-line px-1 py-0.5 text-[12px] uppercase tracking-normal transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
              @click="setQuickFilter(comment.author)"
            >
              同作者
            </button>
            <button
              type="button"
              class="border border-line px-1 py-0.5 text-[12px] uppercase tracking-normal transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
              :disabled="!comment.mail"
              @click="setQuickFilter(comment.mail)"
            >
              同邮箱
            </button>
            <button
              type="button"
              class="border border-line px-1 py-0.5 text-[12px] uppercase tracking-normal transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none disabled:opacity-40"
              :disabled="!comment.ip"
              @click="setQuickFilter(comment.ip)"
            >
              同 IP
            </button>
          </div>
        </div>

        <div class="flex flex-wrap gap-(--space-1)">
          <AppButton
            size="sm"
            variant="solid"
            :disabled="props.saving || comment.status === 'approved'"
            @click="emit('setCommentStatus', comment, 'approved')"
          >
            通过
          </AppButton>
          <AppButton
            size="sm"
            :disabled="props.saving || comment.status === 'waiting'"
            @click="emit('setCommentStatus', comment, 'waiting')"
          >
            待审
          </AppButton>
          <AppButton
            size="sm"
            :disabled="props.saving || comment.status === 'spam'"
            @click="emit('setCommentStatus', comment, 'spam')"
          >
            标记垃圾
          </AppButton>
          <AppButton
            size="sm"
            variant="text"
            :disabled="props.saving"
            @click="emit('deleteComment', comment)"
          >
            <Icon name="lucide:trash-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
            删除
          </AppButton>
        </div>
      </article>
    </div>

    <div
      v-else
      class="grid min-h-58 place-items-center border border-line bg-code-surface p-(--space-3) text-center text-muted"
    >
      <p class="m-0 text-sm font-bold">
        暂无匹配评论。若 Waline/PostgreSQL 未启动，请先运行评论服务。
      </p>
    </div>
  </section>
</template>
