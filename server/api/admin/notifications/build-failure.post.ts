export default defineEventHandler(async (event) => {
  requireAdminCsrf(event)

  type BuildFailureBody = { message?: string; detail?: string }
  const body = await readBody<BuildFailureBody>(event).catch((): BuildFailureBody => ({}))
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
