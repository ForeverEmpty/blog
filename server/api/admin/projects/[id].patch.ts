export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const projects = await readProjects()
  const target = projects.find((project) => project.id === id)

  if (!target) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    })
  }

  const nextSourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : target.sourceUrl
  const nextLaunchUrl = typeof body.launchUrl === 'string' ? body.launchUrl.trim() : target.launchUrl
  const normalizedSourceUrl = nextSourceUrl || nextLaunchUrl
  const normalizedLaunchUrl = nextLaunchUrl || nextSourceUrl
  const shouldResetInspection = normalizedSourceUrl !== target.sourceUrl || normalizedLaunchUrl !== target.launchUrl

  Object.assign(target, {
    id: target.id,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : target.name,
    description: typeof body.description === 'string' ? body.description.trim() : target.description,
    status: typeof body.status === 'string' && body.status.trim() ? body.status.trim() : target.status,
    category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : target.category,
    sourceUrl: normalizedSourceUrl,
    launchUrl: normalizedLaunchUrl,
    tags: Array.isArray(body.tags)
      ? body.tags.map(String).map((tag) => tag.trim()).filter(Boolean)
      : target.tags,
    featured: typeof body.featured === 'boolean' ? body.featured : target.featured,
    hidden: typeof body.hidden === 'boolean' ? body.hidden : target.hidden,
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : target.order,
    coverUrl: typeof body.coverUrl === 'string' ? body.coverUrl.trim() : target.coverUrl,
    updatedAt: new Date().toISOString(),
    checkStatus: shouldResetInspection ? 'unchecked' : target.checkStatus,
    checkedAt: shouldResetInspection ? '' : target.checkedAt,
    checkMessage: shouldResetInspection ? '' : target.checkMessage,
    launchStatus: shouldResetInspection ? undefined : target.launchStatus,
    launchTimeMs: shouldResetInspection ? undefined : target.launchTimeMs,
    sourceStatus: shouldResetInspection ? undefined : target.sourceStatus,
    sourceTimeMs: shouldResetInspection ? undefined : target.sourceTimeMs
  })

  await writeProjects(projects)
  await writeAdminLog({
    action: 'project.update',
    targetType: 'project',
    targetId: target.id,
    message: `更新项目：${target.name}`,
    payload: {
      name: target.name,
      status: target.status,
      featured: target.featured,
      hidden: target.hidden,
      order: target.order
    }
  }).catch(() => {})

  return target
})
