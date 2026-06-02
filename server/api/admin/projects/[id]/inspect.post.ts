export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const projects = await readProjects()
  const target = projects.find((project) => project.id === id)

  if (!target) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    })
  }

  Object.assign(target, await inspectProject(target))

  await writeProjects(projects)
  await writeAdminLog({
    action: 'project.inspect',
    targetType: 'project',
    targetId: target.id,
    message: `巡检项目：${target.name}`,
    payload: {
      status: target.checkStatus,
      message: target.checkMessage,
      launchUrl: target.launchUrl,
      sourceUrl: target.sourceUrl
    }
  }).catch(() => {})

  return target
})
