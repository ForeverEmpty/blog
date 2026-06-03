<script setup lang="ts">
import type {
  ManagedComment,
  ManagedCommentModerationHitStats,
  ManagedCommentModerationRules,
  ManagedCommentStatus
} from '~/types/admin'

const props = defineProps<{
  comments: ManagedComment[]
  stats: {
    total: number
    approved: number
    waiting: number
    spam: number
  }
  moderationHitStats: ManagedCommentModerationHitStats
  saving: boolean
  rulesSaving: boolean
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  refreshComments: []
  saveModerationRules: []
  setCommentStatus: [comment: ManagedComment, status: ManagedCommentStatus]
  bulkSetCommentStatus: [ids: string[], status: ManagedCommentStatus]
  bulkDeleteComments: [ids: string[]]
  moderateComments: [ids: string[]]
  deleteComment: [comment: ManagedComment]
  exportBackup: []
}>()

const commentSearchQuery = defineModel<string>('commentSearchQuery', { required: true })
const commentStatusFilter = defineModel<string>('commentStatusFilter', { required: true })
const selectedCommentIds = defineModel<string[]>('selectedCommentIds', { required: true })
const moderationRules = defineModel<ManagedCommentModerationRules>('moderationRules', { required: true })

type RuleListKey = keyof Pick<
  ManagedCommentModerationRules,
  'blockedKeywords' | 'reviewKeywords' | 'blockedAuthors' | 'blockedEmailDomains' | 'blockedIps'
>

const ruleListConfigs: Array<{
  key: RuleListKey
  label: string
  placeholder: string
}> = [
  {
    key: 'blockedKeywords',
    label: '拦截词',
    placeholder: '输入后回车添加，如 博彩'
  },
  {
    key: 'reviewKeywords',
    label: '待审词',
    placeholder: '输入后回车添加，如 联系我'
  },
  {
    key: 'blockedAuthors',
    label: '保留昵称',
    placeholder: '输入后回车添加，如 admin'
  },
  {
    key: 'blockedEmailDomains',
    label: '拦截邮箱域名',
    placeholder: '输入后回车添加，如 spam.com'
  },
  {
    key: 'blockedIps',
    label: 'IP 黑名单',
    placeholder: '输入后回车添加，如 127.0.0.1'
  }
]

const ruleDrafts = reactive<Record<RuleListKey, string>>({
  blockedKeywords: '',
  reviewKeywords: '',
  blockedAuthors: '',
  blockedEmailDomains: '',
  blockedIps: ''
})

const visibleCommentIds = computed(() => props.comments.map((comment) => comment.id))
const selectedVisibleIds = computed(() => (
  selectedCommentIds.value.filter((id) => visibleCommentIds.value.includes(id))
))
const selectedVisibleCount = computed(() => selectedVisibleIds.value.length)
const allVisibleSelected = computed(() => (
  props.comments.length > 0 &&
  props.comments.every((comment) => selectedCommentIds.value.includes(comment.id))
))
const topModerationHitRules = computed(() => props.moderationHitStats.rules.slice(0, 8))
const moderationHitRate = computed(() => {
  if (props.stats.total === 0) {
    return '0%'
  }

  return `${Math.round((props.moderationHitStats.hitComments / props.stats.total) * 100)}%`
})

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

const moderateVisibleComments = () => {
  emit('moderateComments', selectedVisibleIds.value.length > 0 ? selectedVisibleIds.value : visibleCommentIds.value)
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

const moderationClass = (status: ManagedCommentStatus) => {
  if (status === 'spam') {
    return 'border-callout-danger-border bg-callout-danger-surface text-callout-danger-text'
  }

  if (status === 'waiting') {
    return 'border-callout-warning-border bg-callout-warning-surface text-callout-warning-text'
  }

  return 'border-callout-success-border bg-callout-success-surface text-callout-success-text'
}

const moderationSeverityClass = (severity: 'review' | 'spam') => (
  severity === 'spam'
    ? 'border-callout-danger-border bg-callout-danger-surface text-callout-danger-text'
    : 'border-callout-warning-border bg-callout-warning-surface text-callout-warning-text'
)

const parseRuleList = (value: string) => (
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
)

const addRuleItems = (key: RuleListKey) => {
  const items = parseRuleList(ruleDrafts[key])

  if (items.length === 0) {
    return
  }

  const existing = new Set(moderationRules.value[key].map((item) => item.toLowerCase()))
  const nextItems = [...moderationRules.value[key]]

  for (const item of items) {
    const normalizedItem = item.toLowerCase()

    if (existing.has(normalizedItem)) {
      continue
    }

    existing.add(normalizedItem)
    nextItems.push(item)
  }

  moderationRules.value = {
    ...moderationRules.value,
    [key]: nextItems
  }
  ruleDrafts[key] = ''
}

const removeRuleItem = (key: RuleListKey, value: string) => {
  moderationRules.value = {
    ...moderationRules.value,
    [key]: moderationRules.value[key].filter((item) => item !== value)
  }
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
      <div class="flex flex-wrap gap-(--space-1)">
        <AppButton variant="outline" :disabled="props.loading || props.saving || props.rulesSaving" @click="emit('exportBackup')">
          <Icon name="lucide:database-backup" mode="svg" class="h-4 w-4" aria-hidden="true" />
          备份
        </AppButton>
        <AppButton variant="solid" :loading="props.loading" @click="emit('refreshComments')">
          <Icon name="lucide:refresh-cw" mode="svg" class="h-4 w-4" aria-hidden="true" />
          刷新评论
        </AppButton>
      </div>
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

    <section class="grid gap-(--space-2) border border-line bg-code-surface p-(--space-3)" aria-label="评论治理命中统计">
      <div class="flex flex-wrap items-start justify-between gap-(--space-2)">
        <div class="grid gap-1">
          <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
            Moderation Hits
          </p>
          <h3 class="m-0 text-xl font-bold leading-tight text-ink">
            规则命中统计
          </h3>
        </div>
        <span class="border border-line bg-paper px-2 py-1 text-[12px] font-bold uppercase tracking-normal text-muted">
          命中率 {{ moderationHitRate }}
        </span>
      </div>

      <div class="grid grid-cols-4 border border-line bg-paper text-sm max-[920px]:grid-cols-2 max-[520px]:grid-cols-1">
        <div class="grid gap-1 border-r border-line p-(--space-2) max-[520px]:border-r-0 max-[520px]:border-b">
          <span class="font-bold text-muted">命中评论</span>
          <strong class="font-display text-[32px] font-normal leading-none text-ink">{{ props.moderationHitStats.hitComments }}</strong>
        </div>
        <div class="grid gap-1 border-r border-line p-(--space-2) max-[920px]:border-r-0 max-[920px]:border-b">
          <span class="font-bold text-muted">总命中</span>
          <strong class="font-display text-[32px] font-normal leading-none text-ink">{{ props.moderationHitStats.totalHits }}</strong>
        </div>
        <div class="grid gap-1 border-r border-line p-(--space-2) max-[520px]:border-r-0 max-[520px]:border-b">
          <span class="font-bold text-muted">待审命中</span>
          <strong class="font-display text-[32px] font-normal leading-none text-callout-warning-text">{{ props.moderationHitStats.reviewHits }}</strong>
        </div>
        <div class="grid gap-1 p-(--space-2)">
          <span class="font-bold text-muted">拦截命中</span>
          <strong class="font-display text-[32px] font-normal leading-none text-callout-danger-text">{{ props.moderationHitStats.spamHits }}</strong>
        </div>
      </div>

      <div v-if="topModerationHitRules.length > 0" class="grid gap-(--space-1)">
        <article
          v-for="rule in topModerationHitRules"
          :key="rule.id"
          class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-(--space-2) border border-line bg-paper p-(--space-2) max-[520px]:grid-cols-1"
        >
          <div class="grid min-w-0 gap-1">
            <div class="flex flex-wrap items-center gap-(--space-1)">
              <span class="truncate text-sm font-bold text-ink">{{ rule.label }}</span>
              <span class="border px-1.5 py-0.5 text-[12px] font-bold" :class="moderationSeverityClass(rule.severity)">
                {{ rule.severity === 'spam' ? '拦截' : '待审' }}
              </span>
            </div>
            <div class="h-1.5 overflow-hidden border border-line bg-code-surface">
              <div
                class="h-full bg-ink"
                :style="{ width: `${Math.max(8, Math.round((rule.count / Math.max(1, props.moderationHitStats.totalHits)) * 100))}%` }"
              />
            </div>
          </div>
          <strong class="font-display text-[28px] font-normal leading-none text-ink">{{ rule.count }}</strong>
        </article>
      </div>
      <p v-else class="m-0 border border-dashed border-line bg-paper p-(--space-2) text-sm font-bold text-muted">
        暂无规则命中。刷新评论或执行按规则治理后可查看命中分布。
      </p>
    </section>

    <details class="group border border-line bg-code-surface" open>
      <summary class="flex min-h-12 cursor-pointer list-none items-center justify-between gap-(--space-2) border-b border-line px-(--space-2) text-sm font-bold text-muted marker:hidden">
        <span>治理规则配置</span>
        <Icon name="lucide:chevron-down" mode="svg" class="h-4 w-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <form class="grid gap-(--space-3) p-(--space-3)" @submit.prevent="emit('saveModerationRules')">
        <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-(--space-2) max-[760px]:grid-cols-1">
          <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-ink">
            <input v-model="moderationRules.enabled" type="checkbox" class="accent-ink">
            启用治理规则
          </label>
          <p class="m-0 text-sm leading-[1.6] text-muted">
            保存后会写入配置文件，并立即影响后台读取、按规则治理和本地评论提交。
          </p>
          <AppButton type="submit" variant="solid" :loading="props.rulesSaving">
            保存规则
          </AppButton>
        </div>

        <div class="grid grid-cols-3 gap-(--space-2) max-[920px]:grid-cols-1">
          <label class="grid gap-2 text-sm font-bold text-muted">
            链接上限
            <input v-model.number="moderationRules.maxLinks" min="0" type="number" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            重复字符上限
            <input v-model.number="moderationRules.maxRepeatedCharacterRun" min="1" type="number" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            最短正文
            <input v-model.number="moderationRules.minContentLength" min="0" type="number" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
        </div>

        <div class="grid grid-cols-2 gap-(--space-2) max-[920px]:grid-cols-1">
          <section
            v-for="config in ruleListConfigs"
            :key="config.key"
            class="grid content-start gap-(--space-2) border border-line bg-paper p-(--space-2)"
          >
            <div class="flex flex-wrap items-center justify-between gap-(--space-1)">
              <h3 class="m-0 text-sm font-bold text-muted">
                {{ config.label }}
              </h3>
              <span class="text-[12px] font-bold uppercase tracking-normal text-muted">
                {{ moderationRules[config.key].length }} 项
              </span>
            </div>

            <div class="grid grid-cols-[minmax(0,1fr)_auto] gap-(--space-1) max-[520px]:grid-cols-1">
              <input
                v-model="ruleDrafts[config.key]"
                class="min-h-11 border border-line bg-code-surface px-(--space-2) font-mono text-sm text-ink outline-none focus:border-ink"
                :placeholder="config.placeholder"
                @keydown.enter.prevent="addRuleItems(config.key)"
              >
              <AppButton
                type="button"
                size="sm"
                :disabled="parseRuleList(ruleDrafts[config.key]).length === 0"
                @click="addRuleItems(config.key)"
              >
                添加
              </AppButton>
            </div>

            <p class="m-0 text-[12px] leading-[1.5] text-muted">
              支持一次粘贴多项，使用逗号或换行分隔。
            </p>

            <div
              v-if="moderationRules[config.key].length > 0"
              class="flex min-h-12 flex-wrap content-start gap-(--space-1) border border-line bg-code-surface p-(--space-1)"
            >
              <span
                v-for="item in moderationRules[config.key]"
                :key="`${config.key}-${item}`"
                class="inline-flex max-w-full items-center gap-1 border border-line bg-paper px-2 py-1 font-mono text-[13px] leading-none text-ink"
              >
                <span class="truncate">{{ item }}</span>
                <button
                  type="button"
                  class="grid h-5 w-5 place-items-center text-muted transition-colors duration-200 hover:text-ink focus-visible:text-ink focus-visible:outline-none"
                  :aria-label="`删除 ${item}`"
                  @click="removeRuleItem(config.key, item)"
                >
                  <Icon name="lucide:x" mode="svg" class="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </span>
            </div>
            <p v-else class="m-0 border border-dashed border-line bg-code-surface p-(--space-2) text-sm text-muted">
              暂无规则项
            </p>
          </section>
        </div>
      </form>
    </details>

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
        <AppButton size="sm" :disabled="props.comments.length === 0 || props.saving" @click="moderateVisibleComments">
          按规则治理
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
              <h2 class="m-0 break-words font-display text-[32px] font-normal leading-none max-[520px]:text-[28px]">
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

        <div
          v-if="comment.moderation?.enabled"
          class="grid gap-(--space-1) border border-line bg-code-surface p-(--space-2)"
        >
          <p class="m-0 flex flex-wrap items-center gap-(--space-1) text-[13px] font-bold uppercase tracking-normal text-muted">
            <span>规则建议</span>
            <span class="border px-1 py-0.5" :class="moderationClass(comment.moderation.status)">
              {{ statusLabel(comment.moderation.status) }}
            </span>
            <span>Score {{ comment.moderation.score }}</span>
          </p>
          <div v-if="comment.moderation.reasons.length > 0" class="flex flex-wrap gap-(--space-1)">
            <span
              v-for="reason in comment.moderation.reasons"
              :key="`${comment.id}-${reason.id}`"
              class="border px-1 py-0.5 text-[12px] font-bold"
              :class="reason.severity === 'spam' ? 'border-callout-danger-border bg-callout-danger-surface text-callout-danger-text' : 'border-callout-warning-border bg-callout-warning-surface text-callout-warning-text'"
              :title="reason.detail"
            >
              {{ reason.label }}
            </span>
          </div>
          <p v-else class="m-0 text-sm font-bold text-muted">
            未命中治理规则。
          </p>
        </div>

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
