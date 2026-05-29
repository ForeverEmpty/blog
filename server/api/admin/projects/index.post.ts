export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Project name is required'
    })
  }

  const projects = await readProjects()
  const project = {
    id: body.id || createId('project', body.name),
    name: body.name,
    description: body.description || '',
    status: body.status || '草稿',
    category: body.category || '项目',
    sourceUrl: body.sourceUrl || body.launchUrl || '',
    launchUrl: body.launchUrl || body.sourceUrl || '',
    tags: Array.isArray(body.tags) ? body.tags.map(String) : []
  }
  const nextProjects = [project, ...projects.filter((item) => item.id !== project.id)]

  await writeProjects(nextProjects)

  return project
})
