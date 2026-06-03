import type { AdminNotificationSettings } from '~~/server/utils/adminStorage'

export default defineEventHandler(async (event) => {
  requireAdminCsrf(event)

  const body = await readBody<Partial<AdminNotificationSettings>>(event).catch(() => ({}))
  const existing = await readNotificationSettings()
  const settings = await writeNotificationSettings(body)
  const audit = createAdminAuditTrail(existing, settings, [
    { key: 'emailEnabled', label: '邮件启用' },
    { key: 'emailTo', label: '收件人', format: formatAuditConfigured },
    { key: 'emailFrom', label: '发件人', format: formatAuditConfigured },
    {
      key: 'emailEvents',
      label: '邮件事件',
      get: (value) => value?.events?.filter((item) => item.emailEnabled).map((item) => item.key) || []
    },
    {
      key: 'importantEvents',
      label: '重要事件',
      get: (value) => value?.events?.filter((item) => item.important).map((item) => item.key) || []
    }
  ])

  await writeAdminLog({
    action: 'notification.settings.update',
    targetType: 'notification',
    targetId: 'notification-settings',
    message: appendAuditSummary('更新通知邮件发送策略', audit),
    payload: withAuditPayload({
      emailEnabled: settings.emailEnabled,
      emailToConfigured: Boolean(settings.emailTo),
      emailFromConfigured: Boolean(settings.emailFrom),
      emailEvents: settings.events.filter((item) => item.emailEnabled).map((item) => item.key)
    }, audit)
  }).catch(() => {})

  return settings
})
