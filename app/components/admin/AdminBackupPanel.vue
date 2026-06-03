<script setup lang="ts">
import type { AdminBackupPayload, AdminBackupRestorePreview, AdminBackupRestoreResult } from '~/types/admin'

const props = defineProps<{
  loading: boolean
  error: string
  result: AdminBackupRestoreResult | null
  previewBackup: (backup: AdminBackupPayload) => Promise<AdminBackupRestorePreview>
}>()

const emit = defineEmits<{
  exportBackup: []
  restoreBackup: [backup: AdminBackupPayload]
}>()

const selectedFileName = ref('')
const restoreError = ref('')
const restoreReady = ref(false)
const previewLoading = ref(false)
const selectedBackup = shallowRef<AdminBackupPayload | null>(null)
const restorePreview = shallowRef<AdminBackupRestorePreview | null>(null)
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
const backupScopeLabel = computed(() => {
  const scope = restorePreview.value?.scope || selectedBackup.value?.scope || 'full'
  const labels = {
    full: '完整',
    articles: '文章',
    media: '媒体',
    projects: '项目',
    friends: '友链',
    about: '关于',
    comments: '评论',
    notifications: '通知'
  }

  return labels[scope]
})
const previewDatabaseTotal = computed(() => {
  const database = restorePreview.value?.database

  if (!database) {
    return 0
  }

  return database.walineComments + database.adminLogs + database.articleVersions + database.articleAutosaves
})
const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const resetRestoreSelection = () => {
  selectedFileName.value = ''
  restoreError.value = ''
  restoreReady.value = false
  previewLoading.value = false
  selectedBackup.value = null
  restorePreview.value = null

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const onBackupFileChange = async () => {
  restoreError.value = ''
  restoreReady.value = false
  selectedBackup.value = null
  restorePreview.value = null

  const file = fileInput.value?.files?.[0]

  if (!file) {
    selectedFileName.value = ''
    return
  }

  selectedFileName.value = file.name

  let parsed: AdminBackupPayload

  try {
    parsed = JSON.parse(await file.text()) as AdminBackupPayload

    if (parsed.version !== 1 || parsed.app !== 'ChankoBlog' || !Array.isArray(parsed.files)) {
      throw new Error('Invalid backup')
    }
  } catch {
    restoreError.value = '备份文件解析失败，请选择由当前后台导出的 JSON 文件。'
    return
  }

  selectedBackup.value = parsed
  previewLoading.value = true

  try {
    const preview = await props.previewBackup(parsed)

    restorePreview.value = preview

    if (!preview.valid) {
      restoreError.value = preview.errors[0] || '备份预览未通过，请检查文件内容。'
    }
  } catch {
    restoreError.value = '备份预览生成失败，请检查登录态和服务端日志。'
  } finally {
    previewLoading.value = false
  }
}

const restoreSelectedBackup = () => {
  if (!selectedBackup.value || !restoreReady.value) {
    restoreError.value = '请先选择备份文件，并勾选确认恢复。'
    return
  }

  if (!restorePreview.value?.valid) {
    restoreError.value = '备份预览未通过，不能执行恢复。'
    return
  }

  emit('restoreBackup', selectedBackup.value)
}
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="数据备份与恢复">
    <div class="grid gap-(--space-3) border-b border-line pb-(--space-3)">
      <div class="grid gap-1">
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
          Backup & Restore
        </p>
        <h2 class="m-0 font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
          数据备份
        </h2>
      </div>

      <p class="m-0 max-w-210 text-base leading-[1.7] text-muted">
        备份包含文章 Markdown、关于页、项目、友链、访问量、媒体文件，以及可用时的 PostgreSQL 评论、后台日志、文章版本和自动保存。恢复时只覆盖备份内列出的文件，并按主键合并数据库记录。
      </p>

      <p v-if="props.error || restoreError" class="m-0 border border-line bg-code-surface p-(--space-2) text-sm font-bold text-muted">
        {{ props.error || restoreError }}
      </p>
    </div>

    <div class="grid grid-cols-[minmax(300px,0.86fr)_minmax(0,1.34fr)] items-start border-y border-line max-[1100px]:grid-cols-1">
      <aside class="grid content-start gap-(--space-3) border-r border-line p-(--space-3) max-[1100px]:border-r-0 max-[1100px]:border-b">
        <section class="grid gap-(--space-2) border border-line bg-paper p-(--space-3)" aria-label="导出当前数据">
          <div class="flex items-start justify-between gap-(--space-2)">
            <div class="grid gap-1">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                Export
              </p>
              <h3 class="m-0 text-[24px] font-bold leading-tight">
                当前数据快照
              </h3>
            </div>
            <Icon name="lucide:database-backup" mode="svg" class="mt-1 h-5 w-5 text-muted" aria-hidden="true" />
          </div>

          <div class="grid grid-cols-3 border border-line text-sm max-[560px]:grid-cols-1">
            <div class="grid gap-1 border-r border-line p-(--space-2) max-[560px]:border-r-0 max-[560px]:border-b">
              <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Content</span>
              <strong class="text-lg">Markdown</strong>
            </div>
            <div class="grid gap-1 border-r border-line p-(--space-2) max-[560px]:border-r-0 max-[560px]:border-b">
              <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Data</span>
              <strong class="text-lg">JSON</strong>
            </div>
            <div class="grid gap-1 p-(--space-2)">
              <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Media</span>
              <strong class="text-lg">Base64</strong>
            </div>
          </div>

          <p class="m-0 text-sm leading-[1.7] text-muted">
            建议在批量编辑、导入恢复、迁移服务器前导出一次完整备份。后台恢复前会自动生成本地恢复点，路径记录在日志中。
          </p>

          <AppButton variant="solid" :loading="props.loading" class="w-full justify-center" @click="emit('exportBackup')">
            <Icon name="lucide:download" mode="svg" class="h-4 w-4" aria-hidden="true" />
            导出完整备份
          </AppButton>
        </section>

        <section class="grid gap-(--space-2) border border-line bg-paper p-(--space-3)" aria-label="选择恢复备份">
          <div class="grid gap-1">
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              Restore
            </p>
            <h3 class="m-0 text-[24px] font-bold leading-tight">
              恢复控制
            </h3>
          </div>

          <label class="grid gap-2 text-sm font-bold text-muted">
            备份文件
            <input
              ref="fileInput"
              type="file"
              accept="application/json,.json"
              class="min-h-12 w-full min-w-0 border border-line bg-paper px-(--space-2) py-(--space-1) text-base text-ink outline-none file:mr-(--space-2) file:border-0 file:bg-code-surface file:px-(--space-2) file:py-(--space-1) file:font-bold file:text-ink focus:border-ink"
              @change="onBackupFileChange"
            >
          </label>

          <div class="grid gap-1 border border-line bg-code-surface p-(--space-2) text-sm text-muted">
            <p class="m-0 font-bold text-ink">
              {{ selectedBackup ? selectedFileName : '尚未选择备份文件' }}
            </p>
            <p class="m-0">
              {{ selectedBackup ? `${backupScopeLabel}备份 / ${backupFileCount} 个文件 / ${backupDatabaseCount} 条数据库记录` : '选择 JSON 备份后，右侧会先生成恢复预览。' }}
            </p>
          </div>

          <label class="flex items-start gap-(--space-1) border border-line p-(--space-2) text-sm font-bold leading-[1.6] text-muted">
            <input v-model="restoreReady" type="checkbox" class="mt-1 size-4 accent-ink" :disabled="!restorePreview?.valid || previewLoading">
            <span>我已查看恢复预览，确认要用该备份覆盖当前同名内容，并恢复备份内的数据库记录。</span>
          </label>

          <div class="grid grid-cols-2 gap-(--space-1) max-[520px]:grid-cols-1">
            <AppButton variant="outline" :disabled="props.loading" class="justify-center" @click="resetRestoreSelection">
              <Icon name="lucide:x" mode="svg" class="h-4 w-4" aria-hidden="true" />
              清空
            </AppButton>
            <AppButton variant="solid" :loading="props.loading" :disabled="!selectedBackup || !restoreReady || previewLoading || !restorePreview?.valid" class="justify-center" @click="restoreSelectedBackup">
              <Icon name="lucide:upload" mode="svg" class="h-4 w-4" aria-hidden="true" />
              恢复备份
            </AppButton>
          </div>
        </section>
      </aside>

      <section class="grid min-w-0 content-start gap-(--space-3) p-(--space-3)" aria-label="备份恢复预览">
        <div class="flex flex-wrap items-start justify-between gap-(--space-2)">
          <div class="grid gap-1">
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              Preview
            </p>
            <h3 class="m-0 text-[24px] font-bold leading-tight">
              恢复影响预览
            </h3>
          </div>
          <span v-if="restorePreview" class="border border-line bg-code-surface px-(--space-1) py-1 text-[13px] font-bold text-muted">
            {{ formatBytes(restorePreview.totalBytes) }}
          </span>
        </div>

        <div v-if="selectedBackup" class="grid grid-cols-[minmax(0,1.35fr)_repeat(2,minmax(120px,0.65fr))] border border-line bg-code-surface text-sm max-[760px]:grid-cols-1">
          <div class="grid gap-1 border-r border-line p-(--space-2) max-[760px]:border-r-0 max-[760px]:border-b">
            <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Selected File</span>
            <strong class="break-all text-base text-ink">{{ selectedFileName }}</strong>
          </div>
          <div class="grid gap-1 border-r border-line p-(--space-2) max-[760px]:border-r-0 max-[760px]:border-b">
            <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Scope</span>
            <strong class="text-xl text-ink">{{ backupScopeLabel }}</strong>
          </div>
          <div class="grid gap-1 p-(--space-2)">
            <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Created</span>
            <strong class="text-base text-ink">{{ backupCreatedAt || '未知' }}</strong>
          </div>
        </div>

        <div v-if="previewLoading" class="grid min-h-60 place-items-center border border-line p-(--space-4) text-center text-sm text-muted">
          <div class="grid max-w-120 gap-1">
            <p class="m-0 font-bold text-ink">
              正在生成恢复预览
            </p>
            <p class="m-0">
              正在校验文件路径、文件大小和当前同名文件状态。
            </p>
          </div>
        </div>

        <section v-else-if="restorePreview" class="grid gap-(--space-3)" aria-label="恢复预览详情">
          <div v-if="restorePreview.valid" class="grid grid-cols-4 border border-line text-sm max-[760px]:grid-cols-2">
            <div class="grid gap-1 border-r border-line p-(--space-2) max-[760px]:border-b">
              <span class="text-[12px] font-bold uppercase tracking-normal text-muted">覆盖</span>
              <strong class="text-[28px] leading-none text-ink">{{ restorePreview.overwriteCount }}</strong>
            </div>
            <div class="grid gap-1 border-r border-line p-(--space-2) max-[760px]:border-r-0 max-[760px]:border-b">
              <span class="text-[12px] font-bold uppercase tracking-normal text-muted">新增</span>
              <strong class="text-[28px] leading-none text-ink">{{ restorePreview.createCount }}</strong>
            </div>
            <div class="grid gap-1 border-r border-line p-(--space-2)">
              <span class="text-[12px] font-bold uppercase tracking-normal text-muted">变化</span>
              <strong class="text-[28px] leading-none text-ink">{{ restorePreview.changedCount }}</strong>
            </div>
            <div class="grid gap-1 p-(--space-2)">
              <span class="text-[12px] font-bold uppercase tracking-normal text-muted">数据库</span>
              <strong class="text-[28px] leading-none text-ink">{{ previewDatabaseTotal }}</strong>
            </div>
          </div>

          <div v-else class="grid gap-1 border border-ink bg-paper p-(--space-2) text-sm text-ink">
            <p class="m-0 font-bold">
              备份校验未通过
            </p>
            <p class="m-0 text-muted">
              修正下列问题后再尝试恢复。
            </p>
          </div>

          <div v-if="restorePreview.sections.length" class="grid gap-(--space-2)">
            <article
              v-for="section in restorePreview.sections"
              :key="section.category"
              class="grid gap-(--space-2) border border-line bg-code-surface p-(--space-2) text-sm"
            >
              <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-(--space-2) max-[640px]:grid-cols-1">
                <div class="grid gap-1">
                  <p class="m-0 font-bold text-ink">
                    {{ section.label }}：{{ section.count }} 个文件
                  </p>
                  <p class="m-0 text-muted">
                    覆盖 {{ section.overwriteCount }} / 新增 {{ section.createCount }} / 变化 {{ section.changedCount }}
                  </p>
                </div>
                <p class="m-0 border border-line bg-paper px-(--space-1) py-1 text-[13px] font-bold text-muted">
                  {{ formatBytes(section.bytes) }}
                </p>
              </div>
              <ul class="m-0 grid list-none gap-1 p-0 text-[13px] leading-[1.5] text-muted">
                <li v-for="path in section.samplePaths" :key="path" class="break-all">
                  {{ path }}
                </li>
              </ul>
            </article>
          </div>

          <div v-if="previewDatabaseTotal > 0" class="grid gap-1 border border-line bg-code-surface p-(--space-2) text-sm text-muted">
            <p class="m-0 font-bold text-ink">
              数据库记录
            </p>
            <p class="m-0">
              评论 {{ restorePreview.database.walineComments }} / 日志 {{ restorePreview.database.adminLogs }} / 版本 {{ restorePreview.database.articleVersions }} / 自动保存 {{ restorePreview.database.articleAutosaves }}
            </p>
          </div>

          <ul v-if="restorePreview.warnings.length || restorePreview.errors.length" class="m-0 grid list-none gap-1 p-0 text-sm leading-[1.6] text-muted">
            <li v-for="warning in restorePreview.warnings" :key="warning" class="border border-line bg-code-surface p-(--space-1)">
              {{ warning }}
            </li>
            <li v-for="error in restorePreview.errors" :key="error" class="border border-ink bg-paper p-(--space-1) font-bold text-ink">
              {{ error }}
            </li>
          </ul>
        </section>

        <div v-else class="grid min-h-72 place-items-center border border-line bg-code-surface p-(--space-4) text-center text-sm text-muted">
          <div class="grid max-w-120 gap-(--space-1)">
            <Icon name="lucide:file-search" mode="svg" class="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
            <p class="m-0 font-bold text-ink">
              等待备份文件
            </p>
            <p class="m-0 leading-[1.7]">
              选择备份后会先展示覆盖、新增、变化和数据库影响；确认无误后才能执行恢复。
            </p>
          </div>
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
