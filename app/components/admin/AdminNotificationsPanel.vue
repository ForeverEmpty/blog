<script setup lang="ts">
import type {
  AdminPanel,
  ManagedAdminNotification,
  ManagedNotification,
  ManagedNotificationEventSetting,
  ManagedNotificationLevel,
  ManagedNotificationSettings
} from '~/types/admin'

const props = defineProps<{
  adminNotifications: ManagedAdminNotification[]
  notificationSettings: ManagedNotificationSettings
  saving: boolean
}>()

const emit = defineEmits<{
  saveNotifications: []
  saveNotificationSettings: []
  refreshAdminNotifications: []
  selectPanel: [panel: AdminPanel]
  exportBackup: []
}>()

const notifications = defineModel<ManagedNotification[]>('notifications', { required: true })
const settings = defineModel<ManagedNotificationSettings>('notificationSettings', { required: true })
const activeNotificationScope = ref<'site' | 'admin'>('site')
const selectedNotificationId = ref(notifications.value[0]?.id || 'new')

const notificationLevels: Array<{ value: ManagedNotificationLevel; label: string }> = [
  { value: 'info', label: '信息' },
  { value: 'success', label: '成功' },
  { value: 'warning', label: '提醒' },
  { value: 'danger', label: '严重' }
]
const levelClass = (level: ManagedNotificationLevel) => {
  if (level === 'success') {
    return 'border-callout-success-border bg-callout-success-surface text-callout-success-text'
  }

  if (level === 'warning') {
    return 'border-callout-warning-border bg-callout-warning-surface text-callout-warning-text'
  }

  if (level === 'danger') {
    return 'border-callout-danger-border bg-callout-danger-surface text-callout-danger-text'
  }

  return 'border-line bg-code-surface text-muted'
}
const notificationPanelHref = (href: string) => {
  const panel = href.startsWith('admin:') ? href.replace('admin:', '') : ''

  return ['overview', 'articles', 'media', 'projects', 'friends', 'comments', 'notifications', 'about', 'backup', 'logs'].includes(panel)
    ? panel as AdminPanel
    : null
}
const selectedNotification = computed(() => (
  notifications.value.find((notification) => notification.id === selectedNotificationId.value)
))
const patchSelectedNotification = (patch: Partial<ManagedNotification>) => {
  const index = notifications.value.findIndex((notification) => notification.id === selectedNotificationId.value)

  if (index < 0) {
    return
  }

  notifications.value = notifications.value.map((notification, notificationIndex) => (
    notificationIndex === index ? { ...notification, ...patch } : notification
  ))
}
const selectedTitle = computed({
  get: () => selectedNotification.value?.title || '',
  set: (value) => patchSelectedNotification({ title: value })
})
const selectedBody = computed({
  get: () => selectedNotification.value?.body || '',
  set: (value) => patchSelectedNotification({ body: value })
})
const selectedDate = computed({
  get: () => selectedNotification.value?.date || new Date().toISOString().slice(0, 10),
  set: (value) => patchSelectedNotification({ date: value })
})
const selectedLevel = computed<ManagedNotificationLevel>({
  get: () => selectedNotification.value?.level || 'info',
  set: (value) => patchSelectedNotification({ level: value })
})
const selectedHref = computed({
  get: () => selectedNotification.value?.href || '',
  set: (value) => patchSelectedNotification({ href: value })
})
const selectedHrefLabel = computed({
  get: () => selectedNotification.value?.hrefLabel || '',
  set: (value) => patchSelectedNotification({ hrefLabel: value })
})
const selectedPinned = computed({
  get: () => selectedNotification.value?.pinned || false,
  set: (value) => patchSelectedNotification({ pinned: value })
})
const selectedEnabled = computed({
  get: () => selectedNotification.value?.enabled !== false,
  set: (value) => patchSelectedNotification({ enabled: value })
})
const previewLevelLabel = computed(() => (
  selectedPinned.value ? 'Pinned' : selectedLevel.value || 'Info'
))

const createNotification = () => {
  const notification: ManagedNotification = {
    id: `notice-${Date.now().toString(36)}`,
    title: '新的站内通知',
    body: '填写通知正文，说明需要用户或管理员关注的事项。',
    date: new Date().toISOString().slice(0, 10),
    level: 'info',
    href: '',
    hrefLabel: '',
    pinned: false,
    enabled: true,
    audience: 'site'
  }

  notifications.value = [notification, ...notifications.value]
  selectedNotificationId.value = notification.id
}
const deleteSelectedNotification = () => {
  notifications.value = notifications.value.filter((notification) => notification.id !== selectedNotificationId.value)
  selectedNotificationId.value = notifications.value[0]?.id || 'new'
}

watch(notifications, () => {
  if (notifications.value.some((notification) => notification.id === selectedNotificationId.value)) {
    return
  }

  selectedNotificationId.value = notifications.value[0]?.id || 'new'
})

const patchEventSetting = (
  key: ManagedNotificationEventSetting['key'],
  patch: Partial<ManagedNotificationEventSetting>
) => {
  settings.value = {
    ...settings.value,
    events: settings.value.events.map((event) => (
      event.key === key ? { ...event, ...patch } : event
    ))
  }
}
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="通知中心">
    <div class="grid gap-(--space-3) border-b border-line pb-(--space-3)">
      <div class="flex flex-wrap items-end justify-between gap-(--space-2)">
        <div class="grid gap-1">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Notification Center
          </p>
          <h2 class="m-0 font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
            通知中心
          </h2>
        </div>
        <div class="flex flex-wrap gap-(--space-1)">
          <AppButton variant="outline" :disabled="props.saving" @click="emit('exportBackup')">
            <Icon name="lucide:database-backup" mode="svg" class="h-4 w-4" aria-hidden="true" />
            备份
          </AppButton>
          <AppButton v-if="activeNotificationScope === 'site'" variant="outline" :disabled="props.saving" @click="createNotification">
            <Icon name="lucide:bell-plus" mode="svg" class="h-4 w-4" aria-hidden="true" />
            新增通知
          </AppButton>
          <AppButton v-if="activeNotificationScope === 'site'" variant="solid" :loading="props.saving" @click="emit('saveNotifications')">
            <Icon name="lucide:save" mode="svg" class="h-4 w-4" aria-hidden="true" />
            保存通知
          </AppButton>
        </div>
      </div>

      <p class="m-0 max-w-190 text-sm leading-[1.65] text-muted text-pretty">
        前台通知只用于公开站点的通知铃铛；后台通知只由系统事件产生，并可单独配置后台提醒和邮件发送策略。
      </p>

      <div class="grid grid-cols-2 border border-line max-w-120 max-[640px]:max-w-none" role="tablist" aria-label="通知类型">
        <button
          type="button"
          class="min-h-12 border-r border-line px-(--space-2) text-left text-sm font-bold transition-colors duration-200 focus-visible:outline-none"
          :class="activeNotificationScope === 'site' ? 'bg-ink text-paper' : 'bg-paper text-muted hover:bg-code-surface hover:text-ink'"
          role="tab"
          :aria-selected="activeNotificationScope === 'site'"
          @click="activeNotificationScope = 'site'"
        >
          前台通知
        </button>
        <button
          type="button"
          class="min-h-12 px-(--space-2) text-left text-sm font-bold transition-colors duration-200 focus-visible:outline-none"
          :class="activeNotificationScope === 'admin' ? 'bg-ink text-paper' : 'bg-paper text-muted hover:bg-code-surface hover:text-ink'"
          role="tab"
          :aria-selected="activeNotificationScope === 'admin'"
          @click="activeNotificationScope = 'admin'"
        >
          后台通知
        </button>
      </div>
    </div>

    <section v-if="activeNotificationScope === 'admin'" class="grid gap-(--space-2)" aria-labelledby="admin-notifications-title">
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-2) border-b border-line pb-(--space-2) max-[640px]:grid-cols-1">
        <div class="grid gap-1">
          <h3 id="admin-notifications-title" class="m-0 text-xl font-bold text-ink">
            后台提醒
          </h3>
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            {{ props.adminNotifications.length }} 条需要关注
          </p>
        </div>
        <AppButton variant="outline" size="sm" @click="emit('refreshAdminNotifications')">
          <Icon name="lucide:refresh-cw" mode="svg" class="h-4 w-4" aria-hidden="true" />
          刷新
        </AppButton>
      </div>

      <div class="grid grid-cols-2 gap-(--space-2) max-[960px]:grid-cols-1">
        <article
          v-for="notification in props.adminNotifications"
          :key="notification.id"
          class="grid gap-(--space-2) border border-line bg-paper p-(--space-2)"
        >
          <div class="flex flex-wrap items-center gap-1">
            <span class="inline-flex min-h-6 items-center border px-1 text-[11px] font-bold uppercase tracking-normal" :class="levelClass(notification.level)">
              {{ notification.level }}
            </span>
            <span class="text-[12px] font-bold uppercase tracking-normal text-muted">
              {{ notification.date }}
            </span>
            <span v-if="notification.important" class="inline-flex min-h-6 items-center border border-callout-danger-border px-1 text-[11px] font-bold uppercase tracking-normal text-callout-danger-text">
              重要
            </span>
            <span v-if="notification.emailed" class="inline-flex min-h-6 items-center border border-line px-1 text-[11px] font-bold uppercase tracking-normal text-muted">
              已邮件
            </span>
          </div>
          <div class="grid gap-1">
            <h4 class="m-0 text-lg font-bold leading-tight text-ink">
              {{ notification.title }}
            </h4>
            <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
              {{ notification.source }} / {{ notification.createdAt }}
            </p>
            <p class="m-0 text-sm leading-[1.65] text-muted text-pretty">
              {{ notification.body }}
            </p>
          </div>
          <AppButton
            v-if="notification.href && notificationPanelHref(notification.href)"
            class="w-fit"
            variant="outline"
            @click="emit('selectPanel', notificationPanelHref(notification.href)!)"
          >
            {{ notification.hrefLabel || '查看详情' }}
          </AppButton>
          <AppLinkButton
            v-else-if="notification.href"
            class="w-fit"
            variant="outline"
            :href="notification.href"
          >
            {{ notification.hrefLabel || '查看详情' }}
          </AppLinkButton>
        </article>

        <div v-if="props.adminNotifications.length === 0" class="grid min-h-32 place-items-center border border-line bg-code-surface p-(--space-3) text-center">
          <p class="m-0 text-sm font-bold text-muted">
            暂无后台提醒。
          </p>
        </div>
      </div>
    </section>

    <section v-if="activeNotificationScope === 'admin'" class="grid gap-(--space-2) border-y border-line p-(--space-2)" aria-label="邮件通知策略">
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-2) max-[640px]:grid-cols-1">
        <div class="grid gap-1">
          <h3 class="m-0 text-xl font-bold text-ink">
            邮件发送策略
          </h3>
          <p class="m-0 text-sm leading-[1.6] text-muted">
            SMTP 主机、账号和密码通过环境变量配置；这里控制全局开关、收发件地址覆盖值和各事件发送策略。
          </p>
        </div>
        <AppButton variant="solid" :loading="props.saving" @click="emit('saveNotificationSettings')">
          <Icon name="lucide:save" mode="svg" class="h-4 w-4" aria-hidden="true" />
          保存策略
        </AppButton>
      </div>

      <div class="grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] gap-(--space-2) max-[860px]:grid-cols-1">
        <label class="inline-flex min-h-12 items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
          <input v-model="settings.emailEnabled" type="checkbox" class="h-4 w-4 accent-[var(--ink)]">
          启用邮件通知
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          收件人
          <input v-model="settings.emailTo" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="留空使用 NOTIFICATION_EMAIL_TO">
        </label>
        <label class="grid gap-2 text-sm font-bold text-muted">
          发件人
          <input v-model="settings.emailFrom" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="留空使用 NOTIFICATION_EMAIL_FROM">
        </label>
      </div>

      <div class="grid border-t border-line">
        <article
          v-for="event in settings.events"
          :key="event.key"
          class="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-(--space-2) border-b border-line py-(--space-2) max-[860px]:grid-cols-1"
        >
          <div class="grid gap-1">
            <h4 class="m-0 text-base font-bold text-ink">
              {{ event.label }}
            </h4>
            <p class="m-0 text-[13px] leading-[1.55] text-muted">
              {{ event.description }}
            </p>
            <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
              {{ event.key }}
            </p>
          </div>
          <label class="inline-flex min-h-10 items-center gap-2 border border-line px-(--space-1) text-[13px] font-bold text-muted">
            <input :checked="event.siteEnabled" type="checkbox" class="h-4 w-4 accent-[var(--ink)]" @change="patchEventSetting(event.key, { siteEnabled: ($event.target as HTMLInputElement).checked })">
            后台通知
          </label>
          <label class="inline-flex min-h-10 items-center gap-2 border border-line px-(--space-1) text-[13px] font-bold text-muted">
            <input :checked="event.emailEnabled" type="checkbox" class="h-4 w-4 accent-[var(--ink)]" @change="patchEventSetting(event.key, { emailEnabled: ($event.target as HTMLInputElement).checked })">
            邮件
          </label>
          <label class="inline-flex min-h-10 items-center gap-2 border border-line px-(--space-1) text-[13px] font-bold text-muted">
            <input :checked="event.important" type="checkbox" class="h-4 w-4 accent-[var(--ink)]" @change="patchEventSetting(event.key, { important: ($event.target as HTMLInputElement).checked })">
            重要
          </label>
        </article>
      </div>
    </section>

    <section v-if="activeNotificationScope === 'site'" class="grid gap-(--space-2)" aria-labelledby="site-notifications-title">
      <div class="grid gap-1 border-b border-line pb-(--space-2)">
        <h3 id="site-notifications-title" class="m-0 text-xl font-bold text-ink">
          前台站内通知
        </h3>
        <p class="m-0 text-sm leading-[1.6] text-muted">
          这些通知会出现在前台通知入口中，不会触发后台事件提醒或邮件。
        </p>
      </div>

      <div class="grid grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)] gap-(--space-3) max-[980px]:grid-cols-1" aria-label="前台通知配置">
        <div class="grid content-start border-t border-line">
          <button
            v-for="notification in notifications"
            :key="notification.id"
            type="button"
            class="grid gap-1 border-b border-line p-(--space-2) text-left transition-colors duration-200 hover:bg-code-surface focus-visible:bg-code-surface focus-visible:outline-none"
            :class="selectedNotificationId === notification.id ? 'bg-ink! text-paper!' : ''"
            @click="selectedNotificationId = notification.id"
          >
            <span class="flex flex-wrap items-center gap-1">
              <span class="inline-flex min-h-6 items-center border px-1 text-[11px] font-bold uppercase tracking-normal" :class="selectedNotificationId === notification.id ? 'border-paper text-paper' : levelClass(notification.level)">
                前台
              </span>
              <span v-if="notification.pinned" class="inline-flex min-h-6 items-center border px-1 text-[11px] font-bold uppercase tracking-normal" :class="selectedNotificationId === notification.id ? 'border-paper text-paper' : 'border-line text-muted'">
                置顶
              </span>
              <span v-if="!notification.enabled" class="inline-flex min-h-6 items-center border px-1 text-[11px] font-bold uppercase tracking-normal" :class="selectedNotificationId === notification.id ? 'border-paper text-paper' : 'border-line text-muted'">
                停用
              </span>
            </span>
            <span class="font-bold leading-tight" :class="selectedNotificationId === notification.id ? 'text-paper' : 'text-ink'">
              {{ notification.title }}
            </span>
            <span class="line-clamp-2 text-[13px] leading-[1.5]" :class="selectedNotificationId === notification.id ? 'text-paper/80' : 'text-muted'">
              {{ notification.body }}
            </span>
          </button>

          <div v-if="notifications.length === 0" class="grid min-h-40 place-items-center border-b border-line p-(--space-3) text-center">
            <p class="m-0 text-sm font-bold text-muted">
              暂无手动通知。
            </p>
          </div>
        </div>

        <div v-if="selectedNotification" class="grid content-start gap-(--space-3) border-y border-line p-(--space-2)">
          <div class="flex flex-wrap items-center justify-between gap-(--space-2)">
            <div class="grid gap-1">
              <h3 class="m-0 text-xl font-bold text-ink">
                编辑通知
              </h3>
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                {{ selectedNotification.id }}
              </p>
            </div>
            <AppButton variant="outline" size="sm" :disabled="props.saving" @click="deleteSelectedNotification">
              <Icon name="lucide:trash-2" mode="svg" class="h-4 w-4" aria-hidden="true" />
              删除
            </AppButton>
          </div>

          <div class="grid grid-cols-2 gap-(--space-2) max-[720px]:grid-cols-1">
            <label class="grid gap-2 text-sm font-bold text-muted">
              标题
              <input v-model="selectedTitle" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
            </label>
            <label class="grid gap-2 text-sm font-bold text-muted">
              日期
              <input v-model="selectedDate" type="date" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
            </label>
            <label class="grid gap-2 text-sm font-bold text-muted">
              级别
              <select v-model="selectedLevel" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
                <option v-for="level in notificationLevels" :key="level.value" :value="level.value">
                  {{ level.label }}
                </option>
              </select>
            </label>
          </div>

          <label class="grid gap-2 text-sm font-bold text-muted">
            正文
            <textarea v-model="selectedBody" class="min-h-32 resize-y border border-line bg-paper p-(--space-2) text-base leading-[1.65] text-ink outline-none focus:border-ink" />
          </label>

          <div class="grid grid-cols-2 gap-(--space-2) max-[720px]:grid-cols-1">
            <label class="grid gap-2 text-sm font-bold text-muted">
              链接
              <input v-model="selectedHref" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="/blog 或 https://example.com">
            </label>
            <label class="grid gap-2 text-sm font-bold text-muted">
              链接按钮文案
              <input v-model="selectedHrefLabel" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="查看详情">
            </label>
          </div>

          <div class="flex flex-wrap gap-(--space-2)">
            <label class="inline-flex min-h-11 items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
              <input v-model="selectedEnabled" type="checkbox" class="h-4 w-4 accent-[var(--ink)]">
              启用
            </label>
            <label class="inline-flex min-h-11 items-center gap-2 border border-line px-(--space-2) text-sm font-bold text-muted">
              <input v-model="selectedPinned" type="checkbox" class="h-4 w-4 accent-[var(--ink)]">
              置顶
            </label>
          </div>

          <section class="grid overflow-hidden border border-line bg-paper" aria-label="前台通知预览">
            <header class="flex items-start justify-between gap-(--space-2) border-b border-line p-(--space-3)">
              <div class="grid gap-1">
                <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
                  Preview
                </p>
                <h3 class="m-0 font-display text-[32px] font-normal leading-none">
                  站内通知
                </h3>
              </div>
              <span class="inline-flex min-h-9 items-center border border-line px-(--space-1) text-[12px] font-bold text-muted">
                全部已读
              </span>
            </header>

            <article class="grid gap-(--space-2) border-b border-line p-(--space-3)" :class="selectedEnabled ? '' : 'opacity-55'">
              <div class="flex items-start justify-between gap-(--space-2)">
                <div class="grid min-w-0 gap-1">
                  <div class="flex flex-wrap items-center gap-1">
                    <span class="inline-flex min-h-6 items-center border px-1 text-[11px] font-bold uppercase tracking-normal" :class="levelClass(selectedLevel)">
                      {{ previewLevelLabel }}
                    </span>
                    <span v-if="selectedEnabled" class="inline-flex min-h-6 items-center border border-ink bg-ink px-1 text-[11px] font-bold uppercase tracking-normal text-paper">
                      未读
                    </span>
                    <span v-else class="inline-flex min-h-6 items-center border border-line px-1 text-[11px] font-bold uppercase tracking-normal text-muted">
                      停用
                    </span>
                    <time v-if="selectedDate" class="text-[12px] font-bold uppercase tracking-normal text-muted">
                      {{ selectedDate }}
                    </time>
                  </div>
                  <h4 class="m-0 text-lg font-bold leading-tight text-ink">
                    {{ selectedTitle || '通知标题' }}
                  </h4>
                </div>

                <span class="grid h-9 w-9 place-items-center border border-line text-muted" aria-hidden="true">
                  <Icon name="lucide:minus" mode="svg" class="h-4 w-4" />
                </span>
              </div>

              <p class="m-0 text-sm leading-[1.65] text-muted text-pretty">
                {{ selectedBody || '通知正文会显示在这里。' }}
              </p>

              <div class="flex flex-wrap items-center gap-(--space-1)">
                <span
                  v-if="selectedHref"
                  class="inline-flex min-h-9 items-center border border-line px-(--space-1) text-[12px] font-bold text-ink"
                >
                  {{ selectedHrefLabel || '查看详情' }}
                </span>
                <span
                  v-if="selectedEnabled"
                  class="inline-flex min-h-9 items-center border border-line px-(--space-1) text-[12px] font-bold text-muted"
                >
                  标为已读
                </span>
              </div>
            </article>

            <p v-if="!selectedEnabled" class="m-0 p-(--space-2) text-[13px] leading-[1.6] text-muted">
              该通知已停用，前台不会展示；预览仅用于检查排版。
            </p>
          </section>
        </div>
      </div>
    </section>
  </section>
</template>
