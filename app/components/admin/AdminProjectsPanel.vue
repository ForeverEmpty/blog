<script setup lang="ts">
import type { ManagedProject } from '~/types/admin'

const props = defineProps<{
  projects: ManagedProject[]
  saving: boolean
}>()

const emit = defineEmits<{
  addProject: []
  deleteProject: [project: ManagedProject]
}>()

const newProjectName = defineModel<string>('newProjectName', { required: true })
const newProjectUrl = defineModel<string>('newProjectUrl', { required: true })
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="项目管理">
    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-2) border-b border-line pb-(--space-3) max-[760px]:grid-cols-1">
      <div class="grid grid-cols-2 gap-(--space-2) max-[760px]:grid-cols-1">
        <label class="grid gap-2 text-sm font-bold text-muted">
          项目名称
          <input v-model="newProjectName" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          项目链接
          <input v-model="newProjectUrl" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
        </label>
      </div>
      <AppButton variant="solid" :loading="props.saving" @click="emit('addProject')">
        <Icon name="lucide:plus" mode="svg" class="h-4 w-4" aria-hidden="true" />
        添加项目
      </AppButton>
    </div>

    <div class="grid border-t border-line px-(--space-2)">
      <article
        v-for="project in props.projects"
        :key="project.id"
        class="grid min-h-34 grid-cols-[minmax(0,1fr)_auto] items-center gap-(--space-3) border-b border-line py-(--space-3) max-[760px]:grid-cols-1"
      >
        <div class="grid gap-(--space-1)">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            {{ project.status }} / {{ project.category }}
          </p>
          <h2 class="m-0 break-words font-display text-[48px] font-normal leading-none max-[520px]:text-[36px]">
            {{ project.name }}
          </h2>
          <p class="m-0 max-w-190 text-lg leading-[1.55] text-muted text-pretty">
            {{ project.description }}
          </p>
        </div>
        <div class="flex flex-wrap gap-(--space-1)">
          <AppLinkButton :href="project.launchUrl" variant="outline">
            访问
          </AppLinkButton>
          <AppButton variant="text" :disabled="props.saving" @click="emit('deleteProject', project)">
            <Icon name="lucide:trash-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
            删除
          </AppButton>
        </div>
      </article>
    </div>
  </section>
</template>
