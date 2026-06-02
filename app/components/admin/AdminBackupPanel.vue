<script setup lang="ts">
import type { AdminBackupPayload, AdminBackupRestoreResult } from '~/types/admin'

const props = defineProps<{
  loading: boolean
  error: string
  result: AdminBackupRestoreResult | null
}>()

const emit = defineEmits<{
  exportBackup: []
  restoreBackup: [backup: AdminBackupPayload]
}>()

const selectedFileName = ref('')
const restoreError = ref('')
const restoreReady = ref(false)
const selectedBackup = shallowRef<AdminBackupPayload | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const backupFileCount = computed(() => selectedBackup.value?.files.length || 0)
const backupDatabaseCount = computed(() => {
  const database = selectedBackup.value?.database

  if (!database) {
    return 0
  }

  return (
    (database.walineComments?.length || 0) +
    (database.adminLogs?.length || 0) +
    (database.articleVersions?.length || 0) +
    (database.articleAutosaves?.length || 0)
  )
})
const backupCreatedAt = computed(() => {
  const value = selectedBackup.value?.createdAt

  if (!value) {
    return ''
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
})

const resetRestoreSelection = () => {
  selectedFileName.value = ''
  restoreError.value = ''
  restoreReady.value = false
  selectedBackup.value = null

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const onBackupFileChange = async () => {
  restoreError.value = ''
  restoreReady.value = false
  selectedBackup.value = null

  const file = fileInput.value?.files?.[0]

  if (!file) {
    selectedFileName.value = ''
    return
  }

  selectedFileName.value = file.name

  try {
    const parsed = JSON.parse(await file.text()) as AdminBackupPayload

    if (parsed.version !== 1 || parsed.app !== 'ChankoBlog' || !Array.isArray(parsed.files)) {
      throw new Error('Invalid backup')
    }

    selectedBackup.value = parsed
  } catch {
    restoreError.value = '备份文件解析失败，请选择由当前后台导出的 JSON 文件。'
  }
}

const restoreSelectedBackup = () => {
  if (!selectedBackup.value || !restoreReady.value) {
    restoreError.value = '请先选择备份文件，并勾选确认恢复。'
    return
  }

  emit('restoreBackup', selectedBackup.value)
}
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="数据备份与恢复">
    <div class="grid gap-(--space-3) border-b border-line pb-(--space-3)">
      <div class="flex flex-wrap items-end justify-between gap-(--space-2)">
        <div class="grid gap-1">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Backup & Restore
          </p>
          <h2 class="m-0 font-display text-[48px] font-normal leading-none max-[520px]:text-[36px]">
            数据备份
          </h2>
        </div>
        <AppButton variant="solid" :loading="props.loading" @click="emit('exportBackup')">
          <Icon name="lucide:download" mode="svg" class="h-4 w-4" aria-hidden="true" />
          导出备份
        </AppButton>
      </div>

      <p class="m-0 max-w-190 text-base leading-[1.7] text-muted">
        备份包含文章 Markdown、关于页、项目、友链、访问量、媒体文件，以及可用时的 PostgreSQL 评论、后台日志、文章版本和自动保存。恢复时只覆盖备份内列出的文件，并按主键合并数据库记录。
      </p>

      <p v-if="props.error || restoreError" class="m-0 border border-line bg-code-surface p-(--space-2) text-sm font-bold text-muted">
        {{ props.error || restoreError }}
      </p>
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)] border-y border-line max-[980px]:grid-cols-1">
      <section class="grid content-start gap-(--space-3) border-r border-line p-(--space-3) max-[980px]:border-r-0 max-[980px]:border-b">
        <div class="grid gap-1">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Export
          </p>
          <h3 class="m-0 text-[24px] font-bold leading-tight">
            当前数据快照
          </h3>
        </div>
        <div class="grid grid-cols-3 border border-line max-[680px]:grid-cols-1">
          <div class="grid gap-1 border-r border-line p-(--space-2) max-[680px]:border-r-0 max-[680px]:border-b">
            <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Content</span>
            <strong class="text-xl">Markdown</strong>
          </div>
          <div class="grid gap-1 border-r border-line p-(--space-2) max-[680px]:border-r-0 max-[680px]:border-b">
            <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Data</span>
            <strong class="text-xl">JSON</strong>
          </div>
          <div class="grid gap-1 p-(--space-2)">
            <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Media</span>
            <strong class="text-xl">Base64</strong>
          </div>
        </div>
        <p class="m-0 text-sm leading-[1.7] text-muted">
          建议在批量编辑、导入恢复、迁移服务器前导出一次完整备份。后台恢复前会自动生成本地恢复点，路径记录在日志中。
        </p>
      </section>

      <section class="grid content-start gap-(--space-3) p-(--space-3)">
        <div class="grid gap-1">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Restore
          </p>
          <h3 class="m-0 text-[24px] font-bold leading-tight">
            从备份恢复
          </h3>
        </div>

        <label class="grid gap-2 text-sm font-bold text-muted">
          备份文件
          <input
            ref="fileInput"
            type="file"
            accept="application/json,.json"
            class="min-h-12 border border-line bg-paper px-(--space-2) py-(--space-1) text-base text-ink outline-none file:mr-(--space-2) file:border-0 file:bg-code-surface file:px-(--space-2) file:py-(--space-1) file:font-bold file:text-ink focus:border-ink"
            @change="onBackupFileChange"
          >
        </label>

        <div v-if="selectedBackup" class="grid gap-1 border border-line bg-code-surface p-(--space-2) text-sm text-muted">
          <p class="m-0 font-bold text-ink">
            {{ selectedFileName }}
          </p>
          <p class="m-0">
            {{ backupFileCount }} 个文件 / {{ backupDatabaseCount }} 条数据库记录 / {{ backupCreatedAt }}
          </p>
        </div>

        <label class="flex items-start gap-(--space-1) border border-line p-(--space-2) text-sm font-bold leading-[1.6] text-muted">
          <input v-model="restoreReady" type="checkbox" class="mt-1 size-4 accent-ink">
          <span>我确认要用该备份覆盖当前文章、数据 JSON 与媒体文件中同名内容，并恢复备份内的数据库记录。</span>
        </label>

        <div class="flex flex-wrap gap-(--space-1)">
          <AppButton variant="outline" :disabled="props.loading" @click="resetRestoreSelection">
            <Icon name="lucide:x" mode="svg" class="h-4 w-4" aria-hidden="true" />
            清空
          </AppButton>
          <AppButton variant="solid" :loading="props.loading" :disabled="!selectedBackup || !restoreReady" @click="restoreSelectedBackup">
            <Icon name="lucide:upload" mode="svg" class="h-4 w-4" aria-hidden="true" />
            恢复备份
          </AppButton>
        </div>

        <div v-if="props.result" class="grid gap-1 border border-line bg-code-surface p-(--space-2) text-sm text-muted">
          <p class="m-0 font-bold text-ink">
            已恢复 {{ props.result.restoredCount }} 个文件
          </p>
          <p v-if="props.result.database" class="m-0">
            数据库：评论 {{ props.result.database.walineComments }} / 日志 {{ props.result.database.adminLogs }} / 版本 {{ props.result.database.articleVersions }} / 自动保存 {{ props.result.database.articleAutosaves }}
          </p>
          <p class="m-0 break-all">
            自动恢复点：{{ props.result.restorePoint.path }}
          </p>
        </div>
      </section>
    </div>
  </section>
</template>
