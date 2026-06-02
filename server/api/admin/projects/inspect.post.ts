export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: string[] }>(event).catch(() => ({}))
  const requestedIds = Array.isArray(body?.ids)
    ? new Set(body.ids.map(String).filter(Boolean))
    : null
  const projects = await readProjects()
  const targets = requestedIds
    ? projects.filter((project) => requestedIds.has(project.id))
    : projects

  for (const project of targets) {
    Object.assign(project, await inspectProject(project))
  }

  await writeProjects(projects)
  await writeAdminLog({
    action: 'project.inspect.batch',
    targetType: 'project',
    targetId: 'projects',
    message: `批量巡检项目：${targets.length} 个`,
    payload: {
      checkedCount: targets.length,
      warningCount: targets.filter((project) => project.checkStatus === 'warning').length,
      errorCount: targets.filter((project) => project.checkStatus === 'error').length
    }
  }).catch(() => {})

  return {
    projects,
    checkedCount: targets.length,
    warningCount: targets.filter((project) => project.checkStatus === 'warning').length,
    errorCount: targets.filter((project) => project.checkStatus === 'error').length
  }
})
