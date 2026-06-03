<script setup lang="ts">
import type { ManagedFriend } from '~/types/admin'

const props = defineProps<{
  friends: ManagedFriend[]
  stats: {
    total: number
    pending: number
    approved: number
    rejected: number
    unchecked: number
    ok: number
    warning: number
    error: number
  }
  selectedFriendId: string
  saving: boolean
  inspecting: boolean
  inspectingFriendIds: string[]
}>()

const emit = defineEmits<{
  createFriend: []
  selectFriend: [friend: ManagedFriend]
  saveFriend: []
  setFriendStatus: [friend: ManagedFriend, status: ManagedFriend['status']]
  toggleFriendFeatured: [friend: ManagedFriend]
  inspectFriend: [friend: ManagedFriend]
  inspectFriends: [friends: ManagedFriend[]]
  deleteFriend: [friend: ManagedFriend]
  exportBackup: []
}>()

const friendSearchQuery = defineModel<string>('friendSearchQuery', { required: true })
const friendStatusFilter = defineModel<string>('friendStatusFilter', { required: true })
const friendName = defineModel<string>('friendName', { required: true })
const friendUrl = defineModel<string>('friendUrl', { required: true })
const friendIcon = defineModel<string>('friendIcon', { required: true })
const friendIntro = defineModel<string>('friendIntro', { required: true })
const friendDescription = defineModel<string>('friendDescription', { required: true })
const friendCategory = defineModel<string>('friendCategory', { required: true })
const friendTags = defineModel<string>('friendTags', { required: true })
const friendContact = defineModel<string>('friendContact', { required: true })
const friendBacklinkUrl = defineModel<string>('friendBacklinkUrl', { required: true })
const friendReviewNote = defineModel<string>('friendReviewNote', { required: true })
const friendFeatured = defineModel<boolean>('friendFeatured', { required: true })
const friendOrder = defineModel<number>('friendOrder', { required: true })
const friendStatus = defineModel<ManagedFriend['status']>('friendStatus', { required: true })

const isImageIcon = (icon?: string) => Boolean(icon && (/^(https?:)?\/\//.test(icon) || icon.startsWith('/')))
const parseFriendTags = (value: string) => (
  value
    .split(/\r?\n|,/)
    .map((tag) => tag.trim())
    .filter(Boolean)
)
const draftTags = computed(() => parseFriendTags(friendTags.value))
const friendCategorySuggestions = computed(() => (
  Array.from(new Set(props.friends.map((friend) => friend.category)))
    .filter(Boolean)
))
const friendTagSuggestions = computed(() => Array.from(new Set(props.friends.flatMap((friend) => friend.tags))).filter(Boolean))
const selectedFriend = computed(() => props.friends.find((friend) => friend.id === props.selectedFriendId))
const isFriendInspecting = (friend: ManagedFriend) => props.inspectingFriendIds.includes(friend.id)

const statusClass = (status: ManagedFriend['status']) => {
  if (status === '已通过') {
    return 'border-callout-success-border bg-callout-success-surface text-callout-success-text'
  }

  if (status === '已拒绝') {
    return 'border-callout-danger-border bg-callout-danger-surface text-callout-danger-text'
  }

  return 'border-callout-warning-border bg-callout-warning-surface text-callout-warning-text'
}

const checkStatusLabel = (status: ManagedFriend['checkStatus']) => {
  if (status === 'ok') {
    return '正常'
  }

  if (status === 'warning') {
    return '提醒'
  }

  if (status === 'error') {
    return '异常'
  }

  return '未巡检'
}

const checkStatusClass = (status: ManagedFriend['checkStatus']) => {
  if (status === 'ok') {
    return 'border-callout-success-border bg-callout-success-surface text-callout-success-text'
  }

  if (status === 'warning') {
    return 'border-callout-warning-border bg-callout-warning-surface text-callout-warning-text'
  }

  if (status === 'error') {
    return 'border-callout-danger-border bg-callout-danger-surface text-callout-danger-text'
  }

  return 'border-line bg-code-surface text-muted'
}

const backlinkLabel = (friend: ManagedFriend) => {
  if (!friend.backlinkUrl) {
    return '未配置返链'
  }

  if (friend.backlinkFound === true) {
    return '返链已确认'
  }

  if (friend.backlinkFound === false) {
    return '返链未确认'
  }

  return '返链未巡检'
}

const formatTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value || '未记录'
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
  <section class="grid gap-(--space-4)" aria-label="友链管理">
    <div class="grid gap-(--space-3) border-b border-line pb-(--space-3)">
      <div class="flex flex-wrap items-end justify-between gap-(--space-2)">
        <div class="grid gap-1">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Friend Workflow
          </p>
          <h2 class="m-0 font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
            友链审核
          </h2>
        </div>
        <div class="flex flex-wrap gap-(--space-1)">
          <AppButton variant="outline" :disabled="props.saving || props.inspecting" @click="emit('exportBackup')">
            <Icon name="lucide:database-backup" mode="svg" class="h-4 w-4" aria-hidden="true" />
            备份
          </AppButton>
          <AppButton
            variant="outline"
            :loading="props.inspecting"
            :disabled="props.saving || props.inspecting || props.friends.length === 0"
            @click="emit('inspectFriends', props.friends)"
          >
            <Icon name="lucide:radar" mode="svg" class="h-4 w-4" aria-hidden="true" />
            巡检当前列表
          </AppButton>
          <AppButton variant="outline" :disabled="props.saving" @click="emit('createFriend')">
            <Icon name="lucide:file-plus-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
            新建友链
          </AppButton>
          <AppButton variant="solid" :loading="props.saving" @click="emit('saveFriend')">
            <Icon name="lucide:save" mode="svg" class="h-4 w-4" aria-hidden="true" />
            保存友链
          </AppButton>
        </div>
      </div>

      <div class="grid grid-cols-4 border border-line max-[720px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="友链巡检统计">
        <div class="grid gap-1 border-r border-line p-(--space-2) max-[520px]:border-r-0 max-[520px]:border-b">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">正常</span>
          <span class="font-display text-[32px] leading-none text-callout-success-text">{{ props.stats.ok }}</span>
        </div>
        <div class="grid gap-1 border-r border-line p-(--space-2) max-[720px]:border-r-0 max-[720px]:border-b">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">提醒</span>
          <span class="font-display text-[32px] leading-none text-callout-warning-text">{{ props.stats.warning }}</span>
        </div>
        <div class="grid gap-1 border-r border-line p-(--space-2) max-[520px]:border-r-0 max-[520px]:border-b">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">异常</span>
          <span class="font-display text-[32px] leading-none text-callout-danger-text">{{ props.stats.error }}</span>
        </div>
        <div class="grid gap-1 p-(--space-2)">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">未巡检</span>
          <span class="font-display text-[32px] leading-none text-muted">{{ props.stats.unchecked }}</span>
        </div>
      </div>

      <div class="grid grid-cols-4 border-y border-line max-[920px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="友链统计">
        <button type="button" class="grid gap-1 border-r border-line p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none max-[520px]:border-r-0 max-[520px]:border-b" @click="friendStatusFilter = 'all'">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">全部</span>
          <span class="font-display text-[36px] leading-none text-ink">{{ props.stats.total }}</span>
        </button>
        <button type="button" class="grid gap-1 border-r border-line p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none max-[920px]:border-r-0 max-[920px]:border-b" @click="friendStatusFilter = '待审核'">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">待审核</span>
          <span class="font-display text-[36px] leading-none text-callout-warning-text">{{ props.stats.pending }}</span>
        </button>
        <button type="button" class="grid gap-1 border-r border-line p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none max-[520px]:border-r-0 max-[520px]:border-b" @click="friendStatusFilter = '已通过'">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">已通过</span>
          <span class="font-display text-[36px] leading-none text-callout-success-text">{{ props.stats.approved }}</span>
        </button>
        <button type="button" class="grid gap-1 p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none" @click="friendStatusFilter = '已拒绝'">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">已拒绝</span>
          <span class="font-display text-[36px] leading-none text-callout-danger-text">{{ props.stats.rejected }}</span>
        </button>
      </div>

      <div class="grid grid-cols-[minmax(220px,1fr)_minmax(160px,240px)] gap-(--space-2) max-[720px]:grid-cols-1">
        <label class="grid gap-2 text-sm font-bold text-muted">
          搜索友链
          <input
            v-model="friendSearchQuery"
            class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink"
            placeholder="名称、链接、联系方式、备注、分类、标签"
          >
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          审核状态
          <select v-model="friendStatusFilter" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
            <option value="all">全部</option>
            <option value="待审核">待审核</option>
            <option value="已通过">已通过</option>
            <option value="已拒绝">已拒绝</option>
          </select>
        </label>
      </div>
    </div>

    <div class="grid grid-cols-[minmax(220px,320px)_minmax(0,1fr)] gap-(--space-4) max-[980px]:grid-cols-1">
      <aside class="grid content-start border-t border-line" aria-label="友链选择">
        <button
          v-for="friend in props.friends"
          :key="friend.id"
          type="button"
          class="relative grid gap-1 border-b border-line bg-transparent px-(--space-2) py-(--space-2) text-left text-ink transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none"
          :class="friend.id === props.selectedFriendId ? 'bg-ink! text-paper! hover:bg-ink! hover:text-paper! focus-visible:bg-ink! focus-visible:text-paper!' : ''"
          @click="emit('selectFriend', friend)"
        >
          <span class="truncate text-sm font-bold">{{ friend.name }}</span>
          <span class="flex min-w-0 flex-wrap items-center gap-1 text-[12px] text-muted" :class="friend.id === props.selectedFriendId ? 'text-paper!' : ''">
            <span class="truncate">{{ friend.status }} / {{ friend.category }} / #{{ friend.order }}</span>
            <span class="border px-1 py-0.5 text-[11px] font-bold leading-none" :class="checkStatusClass(friend.checkStatus)">
              {{ checkStatusLabel(friend.checkStatus) }}
            </span>
          </span>
        </button>
        <p v-if="props.friends.length === 0" class="m-0 border-b border-line px-(--space-2) py-(--space-3) text-sm text-muted">
          没有符合条件的友链。
        </p>
      </aside>

      <div class="grid gap-(--space-3)">
        <div class="grid grid-cols-2 items-start gap-(--space-2) max-[760px]:grid-cols-1">
          <label class="grid gap-2 text-sm font-bold text-muted">
            站点名称
            <input v-model="friendName" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            展示顺序
            <input v-model.number="friendOrder" type="number" step="1" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            站点链接
            <input v-model="friendUrl" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            图标
            <input v-model="friendIcon" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="lucide:globe-2 或图片 URL">
          </label>
          <TaxonomyCategoryInput
            v-model="friendCategory"
            :suggestions="friendCategorySuggestions"
            clear-label="清空友链分类"
          />
          <label class="grid gap-2 text-sm font-bold text-muted">
            状态
            <select v-model="friendStatus" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
              <option value="待审核">待审核</option>
              <option value="已通过">已通过</option>
              <option value="已拒绝">已拒绝</option>
            </select>
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            简介
            <input v-model="friendIntro" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <TaxonomyTagInput
            v-model="friendTags"
            :suggestions="friendTagSuggestions"
            remove-label-prefix="删除友链标签"
          />
          <label class="grid gap-2 text-sm font-bold text-muted">
            联系方式
            <input v-model="friendContact" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            返链地址
            <input v-model="friendBacklinkUrl" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
        </div>

        <label class="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
          <input v-model="friendFeatured" type="checkbox" class="accent-ink">
          置顶展示
        </label>

        <label class="grid gap-2 text-sm font-bold text-muted">
          详细说明
          <textarea v-model="friendDescription" class="min-h-24 resize-y border border-line bg-paper px-(--space-2) py-(--space-1) text-base leading-[1.6] text-ink outline-none focus:border-ink" />
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          审核备注
          <textarea v-model="friendReviewNote" class="min-h-20 resize-y border border-line bg-paper px-(--space-2) py-(--space-1) text-base leading-[1.6] text-ink outline-none focus:border-ink" placeholder="可记录拒绝原因、返链确认情况或后续联系信息。" />
        </label>

        <article class="grid gap-(--space-2) border border-line p-(--space-3)" aria-label="友链实时预览">
          <div class="flex items-start gap-(--space-2)">
            <div class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-line bg-code-surface">
              <img v-if="isImageIcon(friendIcon)" :src="friendIcon" :alt="`${friendName} 图标`" class="h-full w-full object-cover">
              <Icon v-else :name="friendIcon || 'lucide:link'" mode="svg" class="h-5 w-5 text-muted" aria-hidden="true" />
            </div>
            <div class="grid min-w-0 gap-1">
              <p class="m-0 flex flex-wrap items-center gap-(--space-1) text-[13px] font-bold uppercase tracking-normal text-muted">
                <span class="border px-1 py-0.5" :class="statusClass(friendStatus)">
                  {{ friendStatus }}
                </span>
                <span>{{ friendCategory }} / #{{ friendOrder }}</span>
                <span v-if="friendFeatured">置顶</span>
              </p>
              <h3 class="m-0 break-words font-display text-[36px] font-normal leading-none max-[520px]:text-[30px]">
                {{ friendName || 'New Friend' }}
              </h3>
            </div>
          </div>
          <p v-if="friendIntro" class="m-0 text-base font-bold leading-[1.5] text-ink text-pretty">
            {{ friendIntro }}
          </p>
          <p class="m-0 text-lg leading-[1.6] text-muted text-pretty">
            {{ friendDescription }}
          </p>
          <ul class="m-0 flex list-none flex-wrap gap-(--space-1) p-0" aria-label="预览友链标签">
            <li v-for="tag in draftTags" :key="tag" class="border border-line px-(--space-1) py-1 text-[12px] font-bold leading-none text-muted">
              {{ tag }}
            </li>
          </ul>
        </article>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-(--space-3) max-[980px]:grid-cols-1">
      <article
        v-for="friend in props.friends"
        :key="friend.id"
        class="grid min-h-64 content-between border border-line p-(--space-3)"
      >
        <div class="grid gap-(--space-2)">
          <div class="flex flex-wrap items-start justify-between gap-(--space-2)">
            <div class="flex min-w-0 items-start gap-(--space-2)">
              <div class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-line bg-code-surface">
                <img v-if="isImageIcon(friend.icon)" :src="friend.icon" :alt="`${friend.name} 图标`" class="h-full w-full object-cover" loading="lazy">
                <Icon v-else :name="friend.icon || 'lucide:link'" mode="svg" class="h-5 w-5 text-muted" aria-hidden="true" />
              </div>
              <p class="m-0 min-w-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                <span class="border px-1 py-0.5" :class="statusClass(friend.status)">
                  {{ friend.status }}
                </span>
                <span class="border px-1 py-0.5" :class="checkStatusClass(friend.checkStatus)">
                  {{ checkStatusLabel(friend.checkStatus) }}
                </span>
                {{ friend.category }} / #{{ friend.order }}
              </p>
            </div>
            <span v-if="friend.featured" class="border border-line px-1 py-0.5 text-[12px] font-bold text-muted">
              置顶
            </span>
          </div>
          <h2 class="m-0 break-words font-display text-[36px] font-normal leading-none max-[520px]:text-[30px]">
            {{ friend.name }}
          </h2>
          <p v-if="friend.intro" class="m-0 text-base font-bold leading-[1.5] text-ink text-pretty">
            {{ friend.intro }}
          </p>
          <a class="break-words text-sm font-bold text-muted underline underline-offset-4" :href="friend.url">
            {{ friend.url }}
          </a>
          <p class="m-0 text-lg leading-[1.6] text-muted text-pretty">
            {{ friend.description }}
          </p>
          <div class="grid gap-1 text-[12px] text-muted">
            <p class="m-0">提交：{{ formatTime(friend.submittedAt) }}</p>
            <p v-if="friend.reviewedAt" class="m-0">审核：{{ formatTime(friend.reviewedAt) }}</p>
            <p v-if="friend.contact" class="m-0 break-words">联系：{{ friend.contact }}</p>
            <p v-if="friend.backlinkUrl" class="m-0 break-words">返链：{{ friend.backlinkUrl }}</p>
            <p class="m-0 break-words">巡检：{{ friend.checkedAt ? formatTime(friend.checkedAt) : '未巡检' }}</p>
            <p v-if="friend.responseStatus || friend.responseTimeMs" class="m-0 break-words">
              HTTP：{{ friend.responseStatus || '未知' }} / {{ friend.responseTimeMs || 0 }}ms
            </p>
            <p class="m-0 break-words">返链结果：{{ backlinkLabel(friend) }}</p>
            <p v-if="friend.checkMessage" class="m-0 break-words">巡检说明：{{ friend.checkMessage }}</p>
            <p v-if="friend.reviewNote" class="m-0 break-words">备注：{{ friend.reviewNote }}</p>
          </div>
        </div>
        <div class="mt-(--space-3) flex flex-wrap gap-(--space-1)">
          <AppButton size="sm" variant="solid" :disabled="props.saving" @click="emit('setFriendStatus', friend, '已通过')">
            通过
          </AppButton>
          <AppButton size="sm" :disabled="props.saving" @click="emit('setFriendStatus', friend, '待审核')">
            待审
          </AppButton>
          <AppButton size="sm" :disabled="props.saving" @click="emit('setFriendStatus', friend, '已拒绝')">
            拒绝
          </AppButton>
          <AppButton size="sm" variant="outline" :disabled="props.saving" @click="emit('toggleFriendFeatured', friend)">
            <Icon :name="friend.featured ? 'lucide:star-off' : 'lucide:star'" mode="svg" class="h-4 w-4" aria-hidden="true" />
            {{ friend.featured ? '取消置顶' : '置顶' }}
          </AppButton>
          <AppButton
            size="sm"
            variant="outline"
            :loading="isFriendInspecting(friend)"
            :disabled="props.saving || props.inspecting || isFriendInspecting(friend)"
            @click="emit('inspectFriend', friend)"
          >
            <Icon name="lucide:radar" mode="svg" class="h-4 w-4" aria-hidden="true" />
            巡检
          </AppButton>
          <AppButton size="sm" variant="outline" :disabled="props.saving" @click="emit('selectFriend', friend)">
            <Icon name="lucide:pencil" mode="svg" class="h-4 w-4" aria-hidden="true" />
            编辑
          </AppButton>
          <AppButton size="sm" variant="text" :disabled="props.saving" @click="emit('deleteFriend', friend)">
            <Icon name="lucide:trash-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
            删除
          </AppButton>
        </div>
      </article>
    </div>

    <p v-if="selectedFriend" class="m-0 border-t border-line pt-(--space-2) text-sm text-muted">
      当前编辑：{{ selectedFriend.name }} / {{ selectedFriend.status }}
    </p>
  </section>
</template>
