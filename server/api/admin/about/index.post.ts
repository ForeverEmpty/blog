export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.title || typeof body.title !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'About title is required'
    })
  }

  const existing = await readAboutPage()
  const about = await saveAboutPage(body)
  const audit = createAdminAuditTrail(existing, about, [
    { key: 'title', label: '标题' },
    { key: 'description', label: '摘要' },
    { key: 'markdown', label: '正文长度', format: formatAuditTextLength }
  ])

  await writeAdminLog({
    action: 'about.update',
    targetType: 'about',
    targetId: 'content/about.md',
    message: appendAuditSummary(`更新关于页：${about.title}`, audit),
    payload: withAuditPayload({
      title: about.title
    }, audit)
  }).catch(() => {})

  return about
})
