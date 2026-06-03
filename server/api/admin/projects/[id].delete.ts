export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const projects = await readProjects()
  const project = projects.find((item) => item.id === id)
  const audit = createAdminAuditTrail(project, undefined, [
    { key: 'name', label: '名称' },
    { key: 'status', label: '状态' },
    { key: 'category', label: '分类' },
    { key: 'sourceUrl', label: '源码地址' },
    { key: 'launchUrl', label: '部署地址' },
    { key: 'featured', label: '首页展示' },
    { key: 'hidden', label: '隐藏' }
  ])

  await writeProjects(projects.filter((project) => project.id !== id))
  await writeAdminLog({
    action: 'project.delete',
    targetType: 'project',
    targetId: id,
    message: appendAuditSummary(project ? `删除项目：${project.name}` : `删除项目：${id}`, audit),
    payload: withAuditPayload({
      name: project?.name || id
    }, audit)
  }).catch(() => {})

  return { ok: true }
})
