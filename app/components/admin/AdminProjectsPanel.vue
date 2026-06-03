<script setup lang="ts">
import type { ManagedProject } from '~/types/admin'

const props = defineProps<{
  projects: ManagedProject[]
  allProjects: ManagedProject[]
  projectStats: {
    total: number
    visible: number
    hidden: number
    featured: number
    unchecked: number
    ok: number
    warning: number
    error: number
  }
  projectStatuses: string[]
  projectCategories: string[]
  selectedProjectId: string
  saving: boolean
  inspecting: boolean
  inspectingProjectIds: string[]
}>()

const emit = defineEmits<{
  createProject: []
  selectProject: [project: ManagedProject]
  saveProject: []
  toggleProjectFeatured: [project: ManagedProject]
  toggleProjectHidden: [project: ManagedProject]
  inspectProject: [project: ManagedProject]
  inspectProjects: [projects: ManagedProject[]]
  moveProject: [project: ManagedProject, direction: 'up' | 'down']
  deleteProject: [project: ManagedProject]
  exportBackup: []
}>()

const projectSearchQuery = defineModel<string>('projectSearchQuery', { required: true })
const projectStatusFilter = defineModel<string>('projectStatusFilter', { required: true })
const projectCategoryFilter = defineModel<string>('projectCategoryFilter', { required: true })
const projectVisibilityFilter = defineModel<string>('projectVisibilityFilter', { required: true })
const projectFeaturedFilter = defineModel<string>('projectFeaturedFilter', { required: true })
const projectName = defineModel<string>('projectName', { required: true })
const projectDescription = defineModel<string>('projectDescription', { required: true })
const projectStatus = defineModel<string>('projectStatus', { required: true })
const projectCategory = defineModel<string>('projectCategory', { required: true })
const projectSourceUrl = defineModel<string>('projectSourceUrl', { required: true })
const projectLaunchUrl = defineModel<string>('projectLaunchUrl', { required: true })
const projectTags = defineModel<string>('projectTags', { required: true })
const projectFeatured = defineModel<boolean>('projectFeatured', { required: true })
const projectHidden = defineModel<boolean>('projectHidden', { required: true })
const projectOrder = defineModel<number>('projectOrder', { required: true })
const projectCoverUrl = defineModel<string>('projectCoverUrl', { required: true })

const parseProjectTags = (value: string) => (
  value
    .split(/\r?\n|,/)
    .map((tag) => tag.trim())
    .filter(Boolean)
)
const draftTags = computed(() => parseProjectTags(projectTags.value))
const projectTagSuggestions = computed(() => Array.from(new Set(props.allProjects.flatMap((project) => project.tags))))
const selectedProject = computed(() => (
  props.allProjects.find((project) => project.id === props.selectedProjectId)
))
const hasLaunchUrl = computed(() => projectLaunchUrl.value.trim().length > 0)
const hasSourceUrl = computed(() => projectSourceUrl.value.trim().length > 0)
const filteredProjectIds = computed(() => new Set(props.projects.map((project) => project.id)))

const isCurrentFiltered = (project: ManagedProject) => filteredProjectIds.value.has(project.id)
const isProjectInspecting = (project: ManagedProject) => props.inspectingProjectIds.includes(project.id)
const statusClass = (project: ManagedProject) => {
  if (project.hidden) {
    return 'border-line bg-code-surface text-muted'
  }

  if (project.featured) {
    return 'border-callout-success-border bg-callout-success-surface text-callout-success-text'
  }

  return 'border-line bg-paper text-ink'
}

const checkStatusLabel = (status: ManagedProject['checkStatus']) => {
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

const checkStatusClass = (status: ManagedProject['checkStatus']) => {
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
  <section class="grid gap-(--space-4)" aria-label="项目管理">
    <div class="grid gap-(--space-3) border-b border-line pb-(--space-3)">
      <div class="flex flex-wrap items-end justify-between gap-(--space-2)">
        <div class="grid gap-1">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Project Manager
          </p>
          <h2 class="m-0 font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
            项目管理
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
            :disabled="props.saving || props.inspecting || props.projects.length === 0"
            @click="emit('inspectProjects', props.projects)"
          >
            <Icon name="lucide:radar" mode="svg" class="h-4 w-4" aria-hidden="true" />
            巡检当前列表
          </AppButton>
          <AppButton variant="outline" :disabled="props.saving" @click="emit('createProject')">
            <Icon name="lucide:file-plus-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
            新建项目
          </AppButton>
          <AppButton variant="solid" :loading="props.saving" @click="emit('saveProject')">
            <Icon name="lucide:save" mode="svg" class="h-4 w-4" aria-hidden="true" />
            保存项目
          </AppButton>
        </div>
      </div>

      <div class="grid grid-cols-4 border border-line max-[720px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="项目巡检统计">
        <div class="grid gap-1 border-r border-line p-(--space-2) max-[520px]:border-r-0 max-[520px]:border-b">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">正常</span>
          <span class="font-display text-[32px] leading-none text-callout-success-text">{{ props.projectStats.ok }}</span>
        </div>
        <div class="grid gap-1 border-r border-line p-(--space-2) max-[720px]:border-r-0 max-[720px]:border-b">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">提醒</span>
          <span class="font-display text-[32px] leading-none text-callout-warning-text">{{ props.projectStats.warning }}</span>
        </div>
        <div class="grid gap-1 border-r border-line p-(--space-2) max-[520px]:border-r-0 max-[520px]:border-b">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">异常</span>
          <span class="font-display text-[32px] leading-none text-callout-danger-text">{{ props.projectStats.error }}</span>
        </div>
        <div class="grid gap-1 p-(--space-2)">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">未巡检</span>
          <span class="font-display text-[32px] leading-none text-muted">{{ props.projectStats.unchecked }}</span>
        </div>
      </div>

      <div class="grid grid-cols-4 border-y border-line max-[920px]:grid-cols-2 max-[520px]:grid-cols-1" aria-label="项目统计">
        <button type="button" class="grid gap-1 border-r border-line p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none max-[520px]:border-r-0 max-[520px]:border-b" @click="projectVisibilityFilter = 'all'; projectFeaturedFilter = 'all'">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">全部</span>
          <span class="font-display text-[36px] leading-none text-ink">{{ props.projectStats.total }}</span>
        </button>
        <button type="button" class="grid gap-1 border-r border-line p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none max-[920px]:border-r-0 max-[920px]:border-b" @click="projectVisibilityFilter = 'visible'">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">公开</span>
          <span class="font-display text-[36px] leading-none text-callout-success-text">{{ props.projectStats.visible }}</span>
        </button>
        <button type="button" class="grid gap-1 border-r border-line p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none max-[520px]:border-r-0 max-[520px]:border-b" @click="projectFeaturedFilter = 'featured'">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">精选</span>
          <span class="font-display text-[36px] leading-none text-ink">{{ props.projectStats.featured }}</span>
        </button>
        <button type="button" class="grid gap-1 p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none" @click="projectVisibilityFilter = 'hidden'">
          <span class="text-[12px] font-bold uppercase tracking-normal text-muted">隐藏</span>
          <span class="font-display text-[36px] leading-none text-muted">{{ props.projectStats.hidden }}</span>
        </button>
      </div>

      <div class="grid grid-cols-[minmax(220px,1.2fr)_repeat(4,minmax(140px,0.7fr))] gap-(--space-2) max-[1180px]:grid-cols-2 max-[640px]:grid-cols-1">
        <label class="grid gap-2 text-sm font-bold text-muted max-[1180px]:col-span-2 max-[640px]:col-span-1">
          搜索项目
          <input
            v-model="projectSearchQuery"
            class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink"
            placeholder="关键词 status= category= tag= featured=true published=false"
          >
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          状态
          <select v-model="projectStatusFilter" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
            <option value="all">全部状态</option>
            <option v-for="status in props.projectStatuses" :key="status" :value="status">
              {{ status }}
            </option>
          </select>
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          分类
          <select v-model="projectCategoryFilter" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
            <option value="all">全部分类</option>
            <option v-for="category in props.projectCategories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          可见性
          <select v-model="projectVisibilityFilter" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
            <option value="all">全部</option>
            <option value="visible">公开</option>
            <option value="hidden">隐藏</option>
          </select>
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          精选
          <select v-model="projectFeaturedFilter" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
            <option value="all">全部</option>
            <option value="featured">精选</option>
            <option value="normal">普通</option>
          </select>
        </label>
      </div>
    </div>

    <div class="grid grid-cols-[minmax(220px,320px)_minmax(0,1fr)] gap-(--space-4) max-[980px]:grid-cols-1">
      <aside class="grid content-start border-t border-line" aria-label="项目选择">
        <button
          v-for="project in props.allProjects"
          :key="project.id"
          type="button"
          class="relative grid gap-1 border-b border-line bg-transparent px-(--space-2) py-(--space-2) text-left text-ink transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none"
          :class="[
            project.id === props.selectedProjectId ? 'bg-ink! text-paper! hover:bg-ink! hover:text-paper! focus-visible:bg-ink! focus-visible:text-paper!' : '',
            !isCurrentFiltered(project) ? 'opacity-45' : ''
          ]"
          @click="emit('selectProject', project)"
        >
          <span class="truncate text-sm font-bold">{{ project.name }}</span>
          <span class="flex min-w-0 flex-wrap items-center gap-1 text-[12px] text-muted" :class="project.id === props.selectedProjectId ? 'text-paper!' : ''">
            <span class="truncate">{{ project.featured ? '精选' : '普通' }} / {{ project.hidden ? '隐藏' : '公开' }} / #{{ project.order }}</span>
            <span class="border px-1 py-0.5 text-[11px] font-bold leading-none" :class="checkStatusClass(project.checkStatus)">
              {{ checkStatusLabel(project.checkStatus) }}
            </span>
          </span>
        </button>
        <p v-if="props.allProjects.length === 0" class="m-0 border-b border-line px-(--space-2) py-(--space-3) text-sm text-muted">
          暂无项目，先创建一个。
        </p>
      </aside>

      <div class="grid gap-(--space-3)">
        <div class="grid grid-cols-2 items-start gap-(--space-2) max-[760px]:grid-cols-1">
          <label class="grid gap-2 text-sm font-bold text-muted">
            项目名称
            <input v-model="projectName" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            展示顺序
            <input v-model.number="projectOrder" type="number" step="1" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            状态
            <input v-model="projectStatus" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="已上线 / 维护中 / 草稿">
          </label>
          <TaxonomyCategoryInput
            v-model="projectCategory"
            :suggestions="props.projectCategories"
            clear-label="清空项目分类"
          />
          <label class="grid gap-2 text-sm font-bold text-muted">
            源码地址
            <input v-model="projectSourceUrl" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            访问地址
            <input v-model="projectLaunchUrl" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted max-[760px]:col-span-1 md:col-span-2">
            封面地址
            <input v-model="projectCoverUrl" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="/media/project-cover.webp">
          </label>
          <TaxonomyTagInput
            v-model="projectTags"
            class="max-[760px]:col-span-1 md:col-span-2"
            :suggestions="projectTagSuggestions"
            remove-label-prefix="删除项目标签"
          />
        </div>

        <div class="flex flex-wrap gap-(--space-1)">
          <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
            <input v-model="projectFeatured" type="checkbox" class="accent-ink">
            首页优先展示
          </label>
          <label class="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
            <input v-model="projectHidden" type="checkbox" class="accent-ink">
            隐藏公开入口
          </label>
          <AppLinkButton v-if="hasLaunchUrl" :href="projectLaunchUrl" variant="outline">
            <Icon name="lucide:external-link" mode="svg" class="h-4 w-4" aria-hidden="true" />
            预览访问
          </AppLinkButton>
          <AppLinkButton v-if="hasSourceUrl" :href="projectSourceUrl" variant="text">
            <Icon name="lucide:github" mode="svg" class="h-4 w-4" aria-hidden="true" />
            源码
          </AppLinkButton>
        </div>

        <label class="grid gap-2 text-sm font-bold text-muted">
          项目简介
          <textarea
            v-model="projectDescription"
            class="min-h-34 resize-y border border-line bg-paper px-(--space-2) py-(--space-2) text-base leading-[1.65] text-ink outline-none focus:border-ink"
          />
        </label>

        <article class="grid gap-(--space-2) border border-line p-(--space-3)" aria-label="项目实时预览">
          <div v-if="projectCoverUrl" class="overflow-hidden border border-line bg-code-surface">
            <img :src="projectCoverUrl" :alt="projectName" class="aspect-[16/7] w-full object-cover">
          </div>
          <div class="flex flex-wrap items-center gap-(--space-1)">
            <span class="border px-1 py-0.5 text-[12px] font-bold uppercase tracking-normal" :class="projectHidden ? 'border-line bg-code-surface text-muted' : 'border-callout-success-border bg-callout-success-surface text-callout-success-text'">
              {{ projectHidden ? '隐藏' : '公开' }}
            </span>
            <span v-if="projectFeatured" class="border border-line px-1 py-0.5 text-[12px] font-bold uppercase tracking-normal text-ink">
              精选
            </span>
            <span class="text-[12px] font-bold uppercase tracking-normal text-muted">
              {{ projectStatus }} / {{ projectCategory }} / #{{ projectOrder }}
            </span>
          </div>
          <h3 class="m-0 break-words font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
            {{ projectName || 'Untitled Project' }}
          </h3>
          <p class="m-0 max-w-190 text-lg leading-[1.55] text-muted text-pretty">
            {{ projectDescription }}
          </p>
          <ul class="m-0 flex list-none flex-wrap gap-(--space-1) p-0" aria-label="预览项目标签">
            <li v-for="tag in draftTags" :key="tag" class="border border-line px-(--space-1) py-1 text-[12px] font-bold leading-none text-muted">
              {{ tag }}
            </li>
          </ul>
        </article>
      </div>
    </div>

    <div class="grid border-t border-line px-(--space-2)">
      <article
        v-for="(project, index) in props.projects"
        :key="project.id"
        class="grid min-h-34 grid-cols-[minmax(0,1fr)_auto] items-center gap-(--space-3) border-b border-line py-(--space-3) max-[860px]:grid-cols-1"
      >
        <div class="grid gap-(--space-1)">
          <p class="m-0 flex flex-wrap items-center gap-(--space-1) text-[13px] font-bold uppercase tracking-normal text-muted">
            <span class="border px-1 py-0.5" :class="statusClass(project)">
              {{ project.hidden ? '隐藏' : '公开' }}
            </span>
            <span class="border px-1 py-0.5" :class="checkStatusClass(project.checkStatus)">
              {{ checkStatusLabel(project.checkStatus) }}
            </span>
            <span>{{ project.featured ? '精选' : '普通' }} / {{ project.status }} / {{ project.category }} / #{{ project.order }}</span>
          </p>
          <h3 class="m-0 break-words font-display text-[32px] font-normal leading-none max-[520px]:text-[28px]">
            {{ project.name }}
          </h3>
          <p class="m-0 max-w-190 text-lg leading-[1.55] text-muted text-pretty">
            {{ project.description }}
          </p>
          <ul class="m-0 flex list-none flex-wrap gap-(--space-1) p-0" aria-label="项目标签">
            <li
              v-for="tag in project.tags"
              :key="tag"
              class="border border-line px-(--space-1) py-1 text-[12px] font-bold leading-none text-muted"
            >
              {{ tag }}
            </li>
          </ul>
          <div class="grid gap-1 text-[12px] text-muted">
            <p class="m-0">巡检：{{ project.checkedAt ? formatTime(project.checkedAt) : '未巡检' }}</p>
            <p v-if="project.launchStatus || project.launchTimeMs" class="m-0">
              访问地址：{{ project.launchStatus || '未知' }} / {{ project.launchTimeMs || 0 }}ms
            </p>
            <p v-if="project.sourceStatus || project.sourceTimeMs" class="m-0">
              源码地址：{{ project.sourceStatus || '未知' }} / {{ project.sourceTimeMs || 0 }}ms
            </p>
            <p v-if="project.checkMessage" class="m-0 break-words">巡检说明：{{ project.checkMessage }}</p>
          </div>
        </div>
        <div class="flex flex-wrap justify-end gap-(--space-1) max-[860px]:justify-start">
          <AppButton variant="outline" :disabled="props.saving || index === 0" @click="emit('moveProject', project, 'up')">
            <Icon name="lucide:arrow-up" mode="svg" class="h-4 w-4" aria-hidden="true" />
            上移
          </AppButton>
          <AppButton variant="outline" :disabled="props.saving || index === props.projects.length - 1" @click="emit('moveProject', project, 'down')">
            <Icon name="lucide:arrow-down" mode="svg" class="h-4 w-4" aria-hidden="true" />
            下移
          </AppButton>
          <AppButton variant="outline" :disabled="props.saving" @click="emit('toggleProjectFeatured', project)">
            <Icon :name="project.featured ? 'lucide:star-off' : 'lucide:star'" mode="svg" class="h-4 w-4" aria-hidden="true" />
            {{ project.featured ? '取消精选' : '精选' }}
          </AppButton>
          <AppButton variant="outline" :disabled="props.saving" @click="emit('toggleProjectHidden', project)">
            <Icon :name="project.hidden ? 'lucide:eye' : 'lucide:eye-off'" mode="svg" class="h-4 w-4" aria-hidden="true" />
            {{ project.hidden ? '公开' : '隐藏' }}
          </AppButton>
          <AppButton
            variant="outline"
            :loading="isProjectInspecting(project)"
            :disabled="props.saving || props.inspecting || isProjectInspecting(project)"
            @click="emit('inspectProject', project)"
          >
            <Icon name="lucide:radar" mode="svg" class="h-4 w-4" aria-hidden="true" />
            巡检
          </AppButton>
          <AppLinkButton v-if="project.launchUrl" :href="project.launchUrl" variant="outline">
            访问
          </AppLinkButton>
          <AppButton variant="outline" :disabled="props.saving" @click="emit('selectProject', project)">
            <Icon name="lucide:pencil" mode="svg" class="h-4 w-4" aria-hidden="true" />
            编辑
          </AppButton>
          <AppButton variant="text" :disabled="props.saving" @click="emit('deleteProject', project)">
            <Icon name="lucide:trash-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
            删除
          </AppButton>
        </div>
      </article>
      <div v-if="props.projects.length === 0" class="grid min-h-34 items-center border-b border-line py-(--space-4)">
        <p class="m-0 text-lg text-muted">
          没有符合筛选条件的项目。
        </p>
      </div>
    </div>

    <p v-if="selectedProject" class="m-0 border-t border-line pt-(--space-2) text-sm text-muted">
      当前编辑：{{ selectedProject.name }} / 最近更新 {{ selectedProject.updatedAt || '未知' }}
    </p>
  </section>
</template>
