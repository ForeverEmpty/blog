export default defineEventHandler(async (event) => {
  requireAdminCsrf(event)

  const body = await readBody<{ message?: string; detail?: string }>(event).catch(() => ({}))
  const message = String(body.message || '构建失败').trim()
  const detail = String(body.detail || '').trim()

  return createAdminNotificationEvent(event, {
    source: 'build.failure',
    title: message,
    body: detail || '检测到构建失败事件，请检查构建日志。',
    level: 'danger',
    href: 'admin:logs',
    hrefLabel: '查看日志',
    targetId: 'build',
    payload: {
      detail
    }
  })
})
