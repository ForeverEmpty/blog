export default defineEventHandler(async (event) => {
  requireAdminCsrf(event)

  const body = await readBody<{ notifications?: Partial<AdminNotification>[] }>(event).catch(() => ({}))
  const notifications = Array.isArray(body.notifications)
    ? body.notifications.map((notification) => ({
        ...notification,
        audience: 'site'
      }))
    : []
  const existingNotifications = await readNotifications()
  const savedNotifications = await writeNotifications(notifications)
  const audit = createAdminAuditTrail(
    {
      count: existingNotifications.length,
      enabledCount: existingNotifications.filter((notification) => notification.enabled).length,
      pinnedCount: existingNotifications.filter((notification) => notification.pinned).length,
      titles: existingNotifications.map((notification) => notification.title)
    },
    {
      count: savedNotifications.length,
      enabledCount: savedNotifications.filter((notification) => notification.enabled).length,
      pinnedCount: savedNotifications.filter((notification) => notification.pinned).length,
      titles: savedNotifications.map((notification) => notification.title)
    },
    [
      { key: 'count', label: '通知数量' },
      { key: 'enabledCount', label: '启用数量' },
      { key: 'pinnedCount', label: '置顶数量' },
      { key: 'titles', label: '标题列表' }
    ]
  )

  await writeAdminLog({
    action: 'site-notification.update',
    targetType: 'notification',
    targetId: 'site-notifications',
    message: appendAuditSummary(`更新前台站内通知配置：${savedNotifications.length} 条`, audit),
    payload: withAuditPayload({
      count: savedNotifications.length,
      enabledCount: savedNotifications.filter((notification) => notification.enabled).length
    }, audit)
  }).catch(() => {})

  return savedNotifications
})
