<script setup lang="ts">
import type { ManagedAdminLog } from '~/types/admin'

const props = defineProps<{
  logs: ManagedAdminLog[]
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  refreshLogs: []
}>()

const formatTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<template>
  <section class="grid gap-(--space-3)" aria-label="后台日志">
    <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-(--space-2) border-y border-line p-(--space-2) max-[720px]:grid-cols-1">
      <div class="grid gap-1">
        <h2 class="m-0 font-display text-[40px] font-normal leading-none">
          日志
        </h2>
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
          {{ props.logs.length }} 条后台操作
        </p>
      </div>
      <p class="m-0 max-w-180 text-sm leading-[1.6] text-muted text-pretty">
        记录文章、项目、友链、评论和登录等关键操作，便于排查误操作和数据写入问题。
      </p>
      <AppButton size="sm" :loading="props.loading" @click="emit('refreshLogs')">
        <Icon name="lucide:refresh-cw" mode="svg" class="h-4 w-4" aria-hidden="true" />
        刷新
      </AppButton>
    </div>

    <p v-if="props.error" class="m-0 border border-line bg-code-surface p-(--space-2) text-sm font-bold text-muted">
      {{ props.error }}
    </p>

    <div class="grid border-t border-line">
      <article
        v-for="log in props.logs"
        :key="log.id"
        class="grid grid-cols-[120px_180px_minmax(0,1fr)] gap-(--space-2) border-b border-line p-(--space-2) max-[760px]:grid-cols-1"
      >
        <time class="text-[13px] font-bold uppercase tracking-normal text-muted">
          {{ formatTime(log.createdAt) }}
        </time>
        <div class="grid gap-1">
          <span class="text-sm font-bold text-ink">{{ log.action }}</span>
          <span class="truncate text-[13px] font-bold uppercase tracking-normal text-muted">
            {{ log.targetType }} / {{ log.targetId }}
          </span>
        </div>
        <p class="m-0 text-sm leading-[1.7] text-muted text-pretty">
          {{ log.message }}
        </p>
      </article>

      <div v-if="props.logs.length === 0 && !props.loading" class="grid min-h-36 place-items-center border-b border-line p-(--space-3)">
        <p class="m-0 text-sm font-bold text-muted">
          暂无后台日志。
        </p>
      </div>
    </div>
  </section>
</template>
