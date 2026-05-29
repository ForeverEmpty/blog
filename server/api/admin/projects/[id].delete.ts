export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const projects = await readProjects()

  await writeProjects(projects.filter((project) => project.id !== id))

  return { ok: true }
})
