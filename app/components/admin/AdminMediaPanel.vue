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
  refreshMedia: []
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const mediaSearchQuery = ref('')
const mediaTypeFilter = ref('all')
const copiedValue = ref('')
const previewAsset = ref<ManagedMediaAsset | null>(null)

const filteredAssets = computed(() => {
  const query = mediaSearchQuery.value.trim().toLowerCase()

  return props.mediaAssets.filter((asset) => (
    (mediaTypeFilter.value === 'all' || asset.type === mediaTypeFilter.value) &&
    (
      !query ||
      asset.name.toLowerCase().includes(query) ||
      asset.mime.toLowerCase().includes(query) ||
      asset.url.toLowerCase().includes(query)
    )
  ))
})

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
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const openFilePicker = () => {
  fileInput.value?.click()
}

const onFileChange = () => {
  const files = Array.from(fileInput.value?.files || [])

  if (files.length > 0) {
    emit('uploadMedia', files)
  }

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const copyText = async (value: string) => {
  if (!import.meta.client) {
    return
  }

  await navigator.clipboard.writeText(value)
  copiedValue.value = value
  window.setTimeout(() => {
    if (copiedValue.value === value) {
      copiedValue.value = ''
    }
  }, 1600)
}

const openPreview = (asset: ManagedMediaAsset) => {
  previewAsset.value = asset
}

const closePreview = () => {
  previewAsset.value = null
}
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="媒体管理">
    <div class="grid gap-(--space-3) border-b border-line pb-(--space-3)">
      <div class="flex flex-wrap items-end justify-between gap-(--space-2)">
        <div class="grid gap-1">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Media Library
          </p>
          <h2 class="m-0 font-display text-[48px] font-normal leading-none max-[520px]:text-[36px]">
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
          <AppButton variant="solid" :loading="props.uploading" @click="openFilePicker">
            <Icon name="lucide:upload" mode="svg" class="h-4 w-4" aria-hidden="true" />
            上传媒体
          </AppButton>
        </div>
      </div>

      <div class="grid grid-cols-[minmax(220px,1fr)_minmax(160px,auto)] gap-(--space-2) max-[720px]:grid-cols-1">
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
            <option value="all">全部类型</option>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="audio">音频</option>
            <option value="file">文件</option>
          </select>
        </label>
      </div>

      <p v-if="props.error" class="m-0 border border-line bg-code-surface p-(--space-2) text-sm font-bold text-muted">
        {{ props.error }}
      </p>
    </div>

    <div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] border-t border-line">
      <article
        v-for="asset in filteredAssets"
        :key="asset.name"
        class="grid content-between gap-(--space-2) border-r border-b border-line p-(--space-2)"
      >
        <div class="grid gap-(--space-2)">
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
            <h3 class="m-0 break-all text-sm font-bold text-ink">
              {{ asset.name }}
            </h3>
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              {{ asset.type }} / {{ formatSize(asset.size) }} / {{ formatTime(asset.updatedAt) }}
            </p>
            <p class="m-0 break-all font-mono text-[12px] leading-[1.5] text-muted">
              {{ asset.url }}
            </p>
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

      <div v-if="filteredAssets.length === 0" class="grid min-h-48 place-items-center border-b border-line p-(--space-4)">
        <p class="m-0 text-sm font-bold text-muted">
          暂无媒体文件。
        </p>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="previewAsset"
        class="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/72 p-(--space-3) backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        :aria-label="`预览 ${previewAsset.name}`"
        tabindex="-1"
        @click.self="closePreview"
        @keydown.esc="closePreview"
      >
        <section class="grid w-full max-w-[min(1120px,94vw)] gap-(--space-2) border border-paper/25 bg-paper text-ink shadow-2xl">
          <header class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-(--space-2) border-b border-line p-(--space-2)">
            <div class="grid gap-1">
              <h3 class="m-0 break-all text-base font-bold">
                {{ previewAsset.name }}
              </h3>
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                {{ previewAsset.type }} / {{ formatSize(previewAsset.size) }} / {{ previewAsset.mime }}
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

          <footer class="flex flex-wrap items-center justify-between gap-(--space-2) border-t border-line p-(--space-2)">
            <p class="m-0 break-all font-mono text-[12px] leading-[1.5] text-muted">
              {{ previewAsset.url }}
            </p>
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
          </footer>
        </section>
      </div>
    </Teleport>
  </section>
</template>
