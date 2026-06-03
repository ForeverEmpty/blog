<script setup lang="ts">
import type { ManagedMediaAsset } from '~/types/admin'

const props = defineProps<{
  mediaAssets: ManagedMediaAsset[]
  saving: boolean
  uploading: boolean
  error: string
}>()

const emit = defineEmits<{
  uploadMedia: [files: File[]]
  deleteMedia: [asset: ManagedMediaAsset]
  deleteSelectedMedia: [assets: ManagedMediaAsset[]]
  refreshMedia: []
  exportBackup: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const mediaSearchQuery = ref('')
const mediaTypeFilter = ref<'all' | ManagedMediaAsset['type']>('all')
const mediaUsageFilter = ref<'all' | 'used' | 'unused'>('all')
const mediaSortMode = ref<'updatedDesc' | 'updatedAsc' | 'nameAsc' | 'sizeDesc' | 'sizeAsc'>('updatedDesc')
const copiedValue = ref('')
const previewAsset = ref<ManagedMediaAsset | null>(null)
const selectedNames = ref<Set<string>>(new Set())
const isDraggingUpload = ref(false)

const mediaTypeOptions: Array<{ value: 'all' | ManagedMediaAsset['type'], label: string, icon: string }> = [
  { value: 'all', label: '全部', icon: 'lucide:layout-grid' },
  { value: 'image', label: '图片', icon: 'lucide:image' },
  { value: 'video', label: '视频', icon: 'lucide:film' },
  { value: 'audio', label: '音频', icon: 'lucide:audio-lines' },
  { value: 'file', label: '文件', icon: 'lucide:file' }
]

const typeCounts = computed(() => {
  const counts: Record<'all' | ManagedMediaAsset['type'], number> = {
    all: props.mediaAssets.length,
    image: 0,
    video: 0,
    audio: 0,
    file: 0
  }

  for (const asset of props.mediaAssets) {
    counts[asset.type] += 1
  }

  return counts
})

const totalSize = computed(() => props.mediaAssets.reduce((sum, asset) => sum + asset.size, 0))
const usedAssetCount = computed(() => props.mediaAssets.filter((asset) => asset.usageCount > 0).length)
const unusedAssetCount = computed(() => Math.max(0, props.mediaAssets.length - usedAssetCount.value))

const filteredAssets = computed(() => {
  const query = mediaSearchQuery.value.trim().toLowerCase()

  return props.mediaAssets.filter((asset) => (
    (mediaTypeFilter.value === 'all' || asset.type === mediaTypeFilter.value) &&
    (
      mediaUsageFilter.value === 'all' ||
      (mediaUsageFilter.value === 'used' && asset.usageCount > 0) ||
      (mediaUsageFilter.value === 'unused' && asset.usageCount === 0)
    ) &&
    (
      !query ||
      asset.name.toLowerCase().includes(query) ||
      asset.mime.toLowerCase().includes(query) ||
      asset.url.toLowerCase().includes(query) ||
      asset.usedBy.some((source) => (
        source.title.toLowerCase().includes(query) ||
        source.location.toLowerCase().includes(query) ||
        source.field.toLowerCase().includes(query) ||
        source.snippet.toLowerCase().includes(query)
      ))
    )
  ))
})

const sortedAssets = computed(() => {
  const assets = [...filteredAssets.value]

  if (mediaSortMode.value === 'updatedAsc') {
    return assets.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
  }

  if (mediaSortMode.value === 'nameAsc') {
    return assets.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }

  if (mediaSortMode.value === 'sizeDesc') {
    return assets.sort((a, b) => b.size - a.size)
  }

  if (mediaSortMode.value === 'sizeAsc') {
    return assets.sort((a, b) => a.size - b.size)
  }

  return assets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
})

const selectedAssets = computed(() => props.mediaAssets.filter((asset) => selectedNames.value.has(asset.name)))
const allVisibleSelected = computed(() => (
  sortedAssets.value.length > 0 && sortedAssets.value.every((asset) => selectedNames.value.has(asset.name))
))
const previewAssetIndex = computed(() => (
  previewAsset.value ? sortedAssets.value.findIndex((asset) => asset.name === previewAsset.value?.name) : -1
))
const hasPreviousPreviewAsset = computed(() => previewAssetIndex.value > 0)
const hasNextPreviewAsset = computed(() => previewAssetIndex.value >= 0 && previewAssetIndex.value < sortedAssets.value.length - 1)

const formatSize = (size: number) => {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${size} B`
}

const formatTime = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getTypeLabel = (type: ManagedMediaAsset['type']) => (
  mediaTypeOptions.find((option) => option.value === type)?.label || type
)

const getUsageTypeLabel = (type: ManagedMediaAsset['usedBy'][number]['type']) => {
  const labels: Record<ManagedMediaAsset['usedBy'][number]['type'], string> = {
    article: '文章',
    about: '关于',
    project: '项目',
    friend: '友链',
    notification: '前台通知',
    adminNotification: '后台通知'
  }

  return labels[type]
}

const openFilePicker = () => {
  fileInput.value?.click()
}

const uploadFiles = (files: File[]) => {
  if (files.length > 0) {
    emit('uploadMedia', files)
  }
}

const onFileChange = () => {
  uploadFiles(Array.from(fileInput.value?.files || []))

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const onDropFiles = (event: DragEvent) => {
  isDraggingUpload.value = false
  uploadFiles(Array.from(event.dataTransfer?.files || []))
}

const copyText = async (value: string, marker = value) => {
  if (!import.meta.client) {
    return
  }

  await navigator.clipboard.writeText(value)
  copiedValue.value = marker
  window.setTimeout(() => {
    if (copiedValue.value === marker) {
      copiedValue.value = ''
    }
  }, 1600)
}

const copySelectedMarkdown = () => {
  const content = selectedAssets.value.map((asset) => asset.markdown).join('\n\n')
  void copyText(content, 'selected-markdown')
}

const copySelectedUrls = () => {
  const content = selectedAssets.value.map((asset) => asset.url).join('\n')
  void copyText(content, 'selected-urls')
}

const openPreview = (asset: ManagedMediaAsset) => {
  previewAsset.value = asset
}

const closePreview = () => {
  previewAsset.value = null
}

const showPreviousPreviewAsset = () => {
  if (hasPreviousPreviewAsset.value) {
    previewAsset.value = sortedAssets.value[previewAssetIndex.value - 1]
  }
}

const showNextPreviewAsset = () => {
  if (hasNextPreviewAsset.value) {
    previewAsset.value = sortedAssets.value[previewAssetIndex.value + 1]
  }
}

const toggleAssetSelected = (asset: ManagedMediaAsset) => {
  const nextNames = new Set(selectedNames.value)

  if (nextNames.has(asset.name)) {
    nextNames.delete(asset.name)
  } else {
    nextNames.add(asset.name)
  }

  selectedNames.value = nextNames
}

const toggleVisibleSelected = () => {
  const nextNames = new Set(selectedNames.value)

  if (allVisibleSelected.value) {
    for (const asset of sortedAssets.value) {
      nextNames.delete(asset.name)
    }
  } else {
    for (const asset of sortedAssets.value) {
      nextNames.add(asset.name)
    }
  }

  selectedNames.value = nextNames
}

const clearSelected = () => {
  selectedNames.value = new Set()
}

watch(
  () => props.mediaAssets.map((asset) => asset.name).join('\n'),
  () => {
    const availableNames = new Set(props.mediaAssets.map((asset) => asset.name))
    selectedNames.value = new Set(Array.from(selectedNames.value).filter((name) => availableNames.has(name)))

    if (previewAsset.value && !availableNames.has(previewAsset.value.name)) {
      previewAsset.value = null
    }
  }
)
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="媒体管理">
    <div class="grid gap-(--space-3) border-b border-line pb-(--space-3)">
      <div class="flex flex-wrap items-end justify-between gap-(--space-2)">
        <div class="grid gap-1">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Media Library
          </p>
          <h2 class="m-0 font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
            媒体管理
          </h2>
        </div>
        <div class="flex flex-wrap gap-(--space-1)">
          <input
            ref="fileInput"
            class="hidden"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg"
            @change="onFileChange"
          >
          <AppButton variant="outline" :disabled="props.saving || props.uploading" @click="emit('refreshMedia')">
            <Icon name="lucide:refresh-cw" mode="svg" class="h-4 w-4" aria-hidden="true" />
            刷新
          </AppButton>
          <AppButton variant="outline" :disabled="props.saving || props.uploading" @click="emit('exportBackup')">
            <Icon name="lucide:database-backup" mode="svg" class="h-4 w-4" aria-hidden="true" />
            备份
          </AppButton>
          <AppButton variant="solid" :loading="props.uploading" @click="openFilePicker">
            <Icon name="lucide:upload" mode="svg" class="h-4 w-4" aria-hidden="true" />
            上传媒体
          </AppButton>
        </div>
      </div>

      <div class="grid grid-cols-[repeat(6,minmax(0,1fr))] border-y border-line max-[1280px]:grid-cols-3 max-[720px]:grid-cols-2 max-[520px]:grid-cols-1">
        <div
          v-for="option in mediaTypeOptions.slice(1)"
          :key="option.value"
          class="grid min-w-0 gap-1 border-r border-line p-(--space-2)"
        >
          <span class="flex min-w-0 items-center gap-2 text-[13px] font-bold uppercase tracking-normal text-muted">
            <Icon :name="option.icon" mode="svg" class="h-4 w-4" aria-hidden="true" />
            <span class="truncate">{{ option.label }}</span>
          </span>
          <span class="truncate font-display text-[34px] leading-none text-ink max-[1200px]:text-[30px]">
            {{ typeCounts[option.value] }}
          </span>
        </div>
        <div class="grid min-w-0 gap-1 p-(--space-2)">
          <span class="flex min-w-0 items-center gap-2 text-[13px] font-bold uppercase tracking-normal text-muted">
            <Icon name="lucide:hard-drive" mode="svg" class="h-4 w-4" aria-hidden="true" />
            <span class="truncate">总大小</span>
          </span>
          <span class="truncate font-display text-[34px] leading-none text-ink max-[1200px]:text-[30px]">
            {{ formatSize(totalSize) }}
          </span>
        </div>
        <div class="grid min-w-0 gap-1 border-l border-line p-(--space-2) max-[1280px]:border-l-0 max-[1280px]:border-t">
          <span class="flex min-w-0 items-center gap-2 text-[13px] font-bold uppercase tracking-normal text-muted">
            <Icon name="lucide:git-branch" mode="svg" class="h-4 w-4" aria-hidden="true" />
            <span class="truncate">已引用</span>
          </span>
          <span class="truncate font-display text-[34px] leading-none text-ink max-[1200px]:text-[30px]">
            {{ usedAssetCount }}
          </span>
        </div>
      </div>

      <button
        type="button"
        class="grid min-h-32 cursor-pointer place-items-center border border-dashed border-line bg-code-surface p-(--space-3) text-center transition-colors duration-200 hover:border-ink focus-visible:border-ink focus-visible:outline-none"
        :class="isDraggingUpload ? 'border-ink bg-paper' : ''"
        @click="openFilePicker"
        @dragenter.prevent="isDraggingUpload = true"
        @dragover.prevent="isDraggingUpload = true"
        @dragleave.prevent="isDraggingUpload = false"
        @drop.prevent="onDropFiles"
      >
        <span class="grid justify-items-center gap-2">
          <Icon name="lucide:upload-cloud" mode="svg" class="h-8 w-8 text-ink" aria-hidden="true" />
          <span class="text-base font-bold text-ink">
            拖拽文件到这里，或点击选择媒体
          </span>
          <span class="max-w-170 text-[13px] leading-[1.6] text-muted">
            支持图片、视频、音频，单文件最大 30MB。上传后可直接复制 URL 或 Markdown 插入文章。
          </span>
        </span>
      </button>

      <div class="grid grid-cols-[minmax(220px,1fr)_minmax(150px,auto)_minmax(150px,auto)_minmax(170px,auto)] gap-(--space-2) max-[980px]:grid-cols-2 max-[640px]:grid-cols-1">
        <label class="grid gap-2 text-sm font-bold text-muted">
          搜索媒体
          <input
            v-model="mediaSearchQuery"
            class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink"
            placeholder="文件名、MIME 或路径"
          >
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          类型
          <select v-model="mediaTypeFilter" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
            <option v-for="option in mediaTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          使用状态
          <select v-model="mediaUsageFilter" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
            <option value="all">全部</option>
            <option value="used">已引用 {{ usedAssetCount }}</option>
            <option value="unused">未引用 {{ unusedAssetCount }}</option>
          </select>
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          排序
          <select v-model="mediaSortMode" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
            <option value="updatedDesc">最近更新优先</option>
            <option value="updatedAsc">最早更新优先</option>
            <option value="nameAsc">文件名 A-Z</option>
            <option value="sizeDesc">体积从大到小</option>
            <option value="sizeAsc">体积从小到大</option>
          </select>
        </label>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-(--space-2) border-y border-line px-(--space-2) py-(--space-1)">
        <div class="flex flex-wrap items-center gap-(--space-1)">
          <AppButton size="sm" variant="text" :disabled="sortedAssets.length === 0" @click="toggleVisibleSelected">
            <Icon :name="allVisibleSelected ? 'lucide:square-minus' : 'lucide:square-check'" mode="svg" class="h-4 w-4" aria-hidden="true" />
            {{ allVisibleSelected ? '取消当前筛选' : '选择当前筛选' }}
          </AppButton>
          <AppButton size="sm" variant="text" :disabled="selectedAssets.length === 0" @click="clearSelected">
            清空选择
          </AppButton>
        </div>
        <div class="flex flex-wrap items-center gap-(--space-1)">
          <span class="text-[13px] font-bold uppercase tracking-normal text-muted">
            {{ sortedAssets.length }} 个结果 / 已选 {{ selectedAssets.length }} 个
          </span>
          <AppButton size="sm" :disabled="selectedAssets.length === 0" @click="copySelectedUrls">
            <Icon name="lucide:link" mode="svg" class="h-4 w-4" aria-hidden="true" />
            {{ copiedValue === 'selected-urls' ? '已复制' : '复制 URL' }}
          </AppButton>
          <AppButton size="sm" :disabled="selectedAssets.length === 0" @click="copySelectedMarkdown">
            <Icon name="lucide:copy" mode="svg" class="h-4 w-4" aria-hidden="true" />
            {{ copiedValue === 'selected-markdown' ? '已复制' : '复制 Markdown' }}
          </AppButton>
          <AppButton size="sm" variant="text" :disabled="props.saving || props.uploading || selectedAssets.length === 0" @click="emit('deleteSelectedMedia', selectedAssets)">
            <Icon name="lucide:trash-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
            批量删除
          </AppButton>
        </div>
      </div>

      <p v-if="props.error" class="m-0 border border-line bg-code-surface p-(--space-2) text-sm font-bold text-muted">
        {{ props.error }}
      </p>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] border-t border-line">
      <article
        v-for="asset in sortedAssets"
        :key="asset.name"
        class="grid content-between gap-(--space-2) border-r border-b border-line p-(--space-2) transition-colors duration-200"
        :class="selectedNames.has(asset.name) ? 'bg-code-surface' : 'bg-paper'"
      >
        <div class="grid gap-(--space-2)">
          <div class="flex items-center justify-between gap-(--space-1)">
            <button
              type="button"
              class="inline-flex min-h-8 items-center gap-2 text-left text-[13px] font-bold text-muted transition-colors duration-200 hover:text-ink focus-visible:text-ink focus-visible:outline-none"
              :aria-pressed="selectedNames.has(asset.name)"
              @click="toggleAssetSelected(asset)"
            >
              <Icon :name="selectedNames.has(asset.name) ? 'lucide:square-check' : 'lucide:square'" mode="svg" class="h-4 w-4" aria-hidden="true" />
              选择
            </button>
            <span class="text-[12px] font-bold uppercase tracking-normal text-muted">
              {{ getTypeLabel(asset.type) }}
            </span>
          </div>

          <button
            type="button"
            class="group grid aspect-[4/3] cursor-zoom-in place-items-center overflow-hidden border border-line bg-code-surface text-left transition-colors duration-200 hover:border-ink focus-visible:border-ink focus-visible:outline-none"
            :aria-label="`预览 ${asset.name}`"
            @click="openPreview(asset)"
          >
            <img
              v-if="asset.type === 'image'"
              :src="asset.url"
              :alt="asset.name"
              class="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              loading="lazy"
            >
            <video
              v-else-if="asset.type === 'video'"
              :src="asset.url"
              class="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
              preload="metadata"
              muted
            />
            <Icon
              v-else
              :name="asset.type === 'audio' ? 'lucide:audio-lines' : 'lucide:file'"
              mode="svg"
              class="h-12 w-12 text-muted transition-colors duration-200 group-hover:text-ink"
              aria-hidden="true"
            />
          </button>

          <div class="grid gap-1">
            <div class="flex flex-wrap items-start justify-between gap-1">
              <h3 class="m-0 break-all text-sm font-bold text-ink">
                {{ asset.name }}
              </h3>
              <span
                class="shrink-0 border border-line px-1.5 py-0.5 text-[12px] font-bold text-muted"
                :class="asset.usageCount > 0 ? 'bg-paper' : 'bg-code-surface'"
              >
                {{ asset.usageCount > 0 ? `引用 ${asset.usageCount}` : '未引用' }}
              </span>
            </div>
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              {{ formatSize(asset.size) }} / {{ formatTime(asset.updatedAt) }}
            </p>
            <p class="m-0 break-all font-mono text-[12px] leading-[1.5] text-muted">
              {{ asset.url }}
            </p>
            <div v-if="asset.usedBy.length" class="grid gap-1 border border-line bg-code-surface p-(--space-1)">
              <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
                使用位置
              </p>
              <ul class="m-0 grid list-none gap-1 p-0">
                <li
                  v-for="source in asset.usedBy.slice(0, 3)"
                  :key="`${source.type}-${source.location}-${source.field}`"
                  class="grid gap-0.5 text-[12px] leading-[1.45] text-muted"
                >
                  <span class="font-bold text-ink">{{ getUsageTypeLabel(source.type) }} / {{ source.title }}</span>
                  <span class="truncate">{{ source.location }} · {{ source.field }}</span>
                </li>
              </ul>
              <p v-if="asset.usedBy.length > 3" class="m-0 text-[12px] font-bold text-muted">
                另有 {{ asset.usedBy.length - 3 }} 处引用
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap gap-(--space-1)">
          <AppButton size="sm" @click="copyText(asset.url)">
            <Icon name="lucide:link" mode="svg" class="h-4 w-4" aria-hidden="true" />
            {{ copiedValue === asset.url ? '已复制' : 'URL' }}
          </AppButton>
          <AppButton size="sm" @click="copyText(asset.markdown)">
            <Icon name="lucide:copy" mode="svg" class="h-4 w-4" aria-hidden="true" />
            {{ copiedValue === asset.markdown ? '已复制' : 'Markdown' }}
          </AppButton>
          <AppButton size="sm" variant="text" :disabled="props.saving || props.uploading" @click="emit('deleteMedia', asset)">
            <Icon name="lucide:trash-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
            删除
          </AppButton>
        </div>
      </article>

      <div v-if="sortedAssets.length === 0" class="grid min-h-48 place-items-center border-b border-line p-(--space-4)">
        <p class="m-0 text-sm font-bold text-muted">
          {{ props.mediaAssets.length === 0 ? '暂无媒体文件。' : '没有符合筛选条件的媒体文件。' }}
        </p>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="dialog">
        <div
          v-if="previewAsset"
          class="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/55 p-(--space-3)"
          role="dialog"
          aria-modal="true"
          :aria-label="`预览 ${previewAsset.name}`"
          tabindex="-1"
          @click.self="closePreview"
          @keydown.esc="closePreview"
        >
          <section class="dialog-panel grid w-full max-w-[min(1120px,94vw)] gap-(--space-2) border border-line bg-paper text-ink">
            <header class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-(--space-2) border-b border-line p-(--space-2)">
              <div class="flex gap-1">
                <button
                  type="button"
                  class="grid h-10 w-10 place-items-center border border-line bg-paper text-ink transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                  :disabled="!hasPreviousPreviewAsset"
                  aria-label="上一项媒体"
                  @click="showPreviousPreviewAsset"
                >
                  <Icon name="lucide:chevron-left" mode="svg" class="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  class="grid h-10 w-10 place-items-center border border-line bg-paper text-ink transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                  :disabled="!hasNextPreviewAsset"
                  aria-label="下一项媒体"
                  @click="showNextPreviewAsset"
                >
                  <Icon name="lucide:chevron-right" mode="svg" class="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div class="grid min-w-0 gap-1">
                <h3 class="m-0 break-all text-base font-bold">
                  {{ previewAsset.name }}
                </h3>
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                {{ getTypeLabel(previewAsset.type) }} / {{ formatSize(previewAsset.size) }} / {{ previewAsset.mime }} / {{ formatTime(previewAsset.updatedAt) }}
              </p>
              </div>
              <button
                type="button"
                class="grid h-10 w-10 place-items-center border border-line bg-paper text-ink transition-colors duration-200 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none"
                aria-label="关闭预览"
                @click="closePreview"
              >
                <Icon name="lucide:x" mode="svg" class="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div class="grid max-h-[72vh] min-h-60 place-items-center overflow-auto bg-code-surface p-(--space-2)">
              <img
                v-if="previewAsset.type === 'image'"
                :src="previewAsset.url"
                :alt="previewAsset.name"
                class="max-h-[68vh] max-w-full border border-line bg-paper object-contain"
              >
              <video
                v-else-if="previewAsset.type === 'video'"
                :src="previewAsset.url"
                class="max-h-[68vh] max-w-full border border-line bg-paper"
                controls
                autoplay
              />
              <audio
                v-else-if="previewAsset.type === 'audio'"
                :src="previewAsset.url"
                class="w-full max-w-160"
                controls
                autoplay
              />
              <AppLinkButton v-else :href="previewAsset.url" variant="outline">
                打开文件
              </AppLinkButton>
            </div>

            <footer class="grid gap-(--space-2) border-t border-line p-(--space-2)">
              <p class="m-0 break-all font-mono text-[12px] leading-[1.5] text-muted">
                {{ previewAsset.url }}
              </p>
              <section class="grid gap-(--space-1) border border-line bg-code-surface p-(--space-2)" aria-label="媒体使用关系">
                <div class="flex flex-wrap items-center justify-between gap-(--space-1)">
                  <p class="m-0 text-sm font-bold text-ink">
                    使用关系
                  </p>
                  <span class="text-[12px] font-bold uppercase tracking-normal text-muted">
                    {{ previewAsset.usageCount > 0 ? `${previewAsset.usageCount} 处引用` : '未引用' }}
                  </span>
                </div>
                <ul v-if="previewAsset.usedBy.length" class="m-0 grid max-h-42 list-none gap-1 overflow-auto p-0">
                  <li
                    v-for="source in previewAsset.usedBy"
                    :key="`${source.type}-${source.location}-${source.field}`"
                    class="grid gap-1 border border-line bg-paper p-(--space-1) text-[13px] leading-[1.5]"
                  >
                    <div class="flex flex-wrap items-center justify-between gap-1">
                      <p class="m-0 font-bold text-ink">
                        {{ getUsageTypeLabel(source.type) }} / {{ source.title }}
                      </p>
                      <AppLinkButton v-if="source.href" :href="source.href" variant="text">
                        打开
                      </AppLinkButton>
                    </div>
                    <p class="m-0 text-muted">
                      {{ source.location }} · {{ source.field }}
                    </p>
                    <p class="m-0 break-all font-mono text-[12px] text-muted">
                      {{ source.snippet }}
                    </p>
                  </li>
                </ul>
                <p v-else class="m-0 text-[13px] leading-[1.6] text-muted">
                  当前没有在文章、关于页、项目、友链或通知中发现对该媒体的引用。
                </p>
              </section>
              <div class="flex flex-wrap items-center justify-between gap-(--space-2)">
                <button
                  type="button"
                  class="inline-flex min-h-9 items-center gap-2 text-[13px] font-bold text-muted transition-colors duration-200 hover:text-ink focus-visible:text-ink focus-visible:outline-none"
                  :aria-pressed="selectedNames.has(previewAsset.name)"
                  @click="toggleAssetSelected(previewAsset)"
                >
                  <Icon :name="selectedNames.has(previewAsset.name) ? 'lucide:square-check' : 'lucide:square'" mode="svg" class="h-4 w-4" aria-hidden="true" />
                  {{ selectedNames.has(previewAsset.name) ? '已选择' : '选择此媒体' }}
                </button>
                <div class="flex flex-wrap gap-(--space-1)">
                  <AppButton size="sm" @click="copyText(previewAsset.url)">
                    <Icon name="lucide:link" mode="svg" class="h-4 w-4" aria-hidden="true" />
                    {{ copiedValue === previewAsset.url ? '已复制' : 'URL' }}
                  </AppButton>
                  <AppButton size="sm" @click="copyText(previewAsset.markdown)">
                    <Icon name="lucide:copy" mode="svg" class="h-4 w-4" aria-hidden="true" />
                    {{ copiedValue === previewAsset.markdown ? '已复制' : 'Markdown' }}
                  </AppButton>
                  <AppButton size="sm" variant="text" :disabled="props.saving || props.uploading" @click="emit('deleteMedia', previewAsset); closePreview()">
                    <Icon name="lucide:trash-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
                    删除
                  </AppButton>
                </div>
              </div>
            </footer>
          </section>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>
