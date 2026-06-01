export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const projects = await readProjects()
  const project = projects.find((item) => item.id === id)

  await writeProjects(projects.filter((project) => project.id !== id))
  await writeAdminLog({
    action: 'project.delete',
    targetType: 'project',
    targetId: id,
    message: project ? `删除项目：${project.name}` : `删除项目：${id}`
  }).catch(() => {})

  return { ok: true }
})
