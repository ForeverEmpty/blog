<script setup lang="ts">
import type { ManagedComment, ManagedCommentStatus } from '~/types/admin'

const props = defineProps<{
  comments: ManagedComment[]
  saving: boolean
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  refreshComments: []
  setCommentStatus: [comment: ManagedComment, status: ManagedCommentStatus]
  deleteComment: [comment: ManagedComment]
}>()

const commentSearchQuery = defineModel<string>('commentSearchQuery', { required: true })
const commentStatusFilter = defineModel<string>('commentStatusFilter', { required: true })

const statusLabel = (status: ManagedCommentStatus) => {
  if (status === 'waiting') {
    return '待审核'
  }

  if (status === 'spam') {
    return '垃圾'
  }

  return '已通过'
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
      >
        <div class="flex flex-wrap items-start justify-between gap-(--space-2)">
          <div class="grid min-w-0 gap-1">
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              {{ statusLabel(comment.status) }} / {{ comment.articleSlug || comment.url }}
            </p>
            <h2 class="m-0 break-words font-display text-[42px] font-normal leading-none max-[520px]:text-[32px]">
              {{ comment.author || '匿名访客' }}
            </h2>
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
            {{ comment.createdAt || '未知时间' }} / {{ comment.ip || '无 IP' }}
          </p>
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
