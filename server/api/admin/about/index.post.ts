export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.title || typeof body.title !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'About title is required'
    })
  }

  const about = await saveAboutPage(body)

  await writeAdminLog({
    action: 'about.update',
    targetType: 'about',
    targetId: 'content/about.md',
    message: `更新关于页：${about.title}`
  }).catch(() => {})

  return about
})
