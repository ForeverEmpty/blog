export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project name is required'
    })
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map(String).map((tag) => tag.trim()).filter(Boolean)
    : []
  const projects = await readProjects()
  const existing = typeof body.id === 'string' && body.id
    ? projects.find((item) => item.id === body.id)
    : undefined
  const duplicate = projects.find((item) => (
    item.id !== existing?.id &&
    item.name.trim().toLowerCase() === name.toLowerCase()
  ))

  if (duplicate) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Project name already exists'
    })
  }

  const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : ''
  const launchUrl = typeof body.launchUrl === 'string' ? body.launchUrl.trim() : ''
  const normalizedSourceUrl = sourceUrl || launchUrl
  const normalizedLaunchUrl = launchUrl || sourceUrl
  const shouldResetInspection = !existing ||
    existing.sourceUrl !== normalizedSourceUrl ||
    existing.launchUrl !== normalizedLaunchUrl
  const project = {
    id: existing?.id || createId('project', name),
    name,
    description: typeof body.description === 'string' ? body.description.trim() : '',
    status: typeof body.status === 'string' && body.status.trim() ? body.status.trim() : '草稿',
    category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : '项目',
    sourceUrl: normalizedSourceUrl,
    launchUrl: normalizedLaunchUrl,
    tags,
    featured: body.featured === true,
    hidden: body.hidden === true,
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : existing?.order ?? ((projects.length + 1) * 10),
    coverUrl: typeof body.coverUrl === 'string' ? body.coverUrl.trim() : '',
    updatedAt: new Date().toISOString(),
    checkStatus: shouldResetInspection ? 'unchecked' : existing.checkStatus,
    checkedAt: shouldResetInspection ? '' : existing.checkedAt,
    checkMessage: shouldResetInspection ? '' : existing.checkMessage,
    launchStatus: shouldResetInspection ? undefined : existing.launchStatus,
    launchTimeMs: shouldResetInspection ? undefined : existing.launchTimeMs,
    sourceStatus: shouldResetInspection ? undefined : existing.sourceStatus,
    sourceTimeMs: shouldResetInspection ? undefined : existing.sourceTimeMs
  }

  const nextProjects = [project, ...projects.filter((item) => item.id !== project.id)]

  await writeProjects(nextProjects)
  await writeAdminLog({
    action: existing ? 'project.update' : 'project.create',
    targetType: 'project',
    targetId: project.id,
    message: `保存项目：${project.name}`,
    payload: {
      name: project.name,
      status: project.status,
      featured: project.featured,
      hidden: project.hidden,
      order: project.order
    }
  }).catch(() => {})

  return project
})
