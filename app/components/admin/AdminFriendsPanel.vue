<script setup lang="ts">
import type { ManagedFriend } from '~/types/admin'

const props = defineProps<{
  friends: ManagedFriend[]
  saving: boolean
}>()

const emit = defineEmits<{
  addFriend: []
  setFriendStatus: [friend: ManagedFriend, status: ManagedFriend['status']]
  deleteFriend: [friend: ManagedFriend]
}>()

const newFriendName = defineModel<string>('newFriendName', { required: true })
const newFriendUrl = defineModel<string>('newFriendUrl', { required: true })
const newFriendIcon = defineModel<string>('newFriendIcon', { required: true })
const newFriendIntro = defineModel<string>('newFriendIntro', { required: true })
const newFriendDescription = defineModel<string>('newFriendDescription', { required: true })

const isImageIcon = (icon?: string) => Boolean(icon && (/^(https?:)?\/\//.test(icon) || icon.startsWith('/')))
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="友链管理">
    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-2) border-b border-line pb-(--space-3) max-[760px]:grid-cols-1">
      <div class="grid grid-cols-2 gap-(--space-2) max-[760px]:grid-cols-1">
        <label class="grid gap-2 text-sm font-bold text-muted">
          站点名称
          <input v-model="newFriendName" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          站点链接
          <input v-model="newFriendUrl" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          图标
          <input v-model="newFriendIcon" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="lucide:globe-2 或图片 URL">
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          简介
          <input v-model="newFriendIntro" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
        </label>
        <label class="col-span-2 grid gap-2 text-sm font-bold text-muted max-[760px]:col-span-1">
          详细说明
          <textarea v-model="newFriendDescription" class="min-h-24 resize-y border border-line bg-paper px-(--space-2) py-(--space-1) text-base leading-[1.6] text-ink outline-none focus:border-ink" />
        </label>
      </div>
      <AppButton variant="solid" :loading="props.saving" @click="emit('addFriend')">
        <Icon name="lucide:plus" mode="svg" class="h-4 w-4" aria-hidden="true" />
        添加友链
      </AppButton>
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
                <img
                  v-if="isImageIcon(friend.icon)"
                  :src="friend.icon"
                  :alt="`${friend.name} 图标`"
                  class="h-full w-full object-cover"
                  loading="lazy"
                >
                <Icon
                  v-else
                  :name="friend.icon || 'lucide:link'"
                  mode="svg"
                  class="h-5 w-5 text-muted"
                  aria-hidden="true"
                />
              </div>
              <p class="m-0 min-w-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                {{ friend.category }} / {{ friend.status }}
              </p>
            </div>
          </div>
          <h2 class="m-0 break-words font-display text-[48px] font-normal leading-none max-[520px]:text-[36px]">
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
        </div>
        <div class="mt-(--space-3) flex flex-wrap gap-(--space-1)">
          <AppButton size="sm" variant="solid" :disabled="props.saving" @click="emit('setFriendStatus', friend, '已通过')">
            通过
          </AppButton>
          <AppButton size="sm" :disabled="props.saving" @click="emit('setFriendStatus', friend, '已拒绝')">
            拒绝
          </AppButton>
          <AppButton size="sm" variant="text" :disabled="props.saving" @click="emit('deleteFriend', friend)">
            <Icon name="lucide:trash-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
            删除
          </AppButton>
        </div>
      </article>
    </div>
  </section>
</template>
