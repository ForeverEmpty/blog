export default defineEventHandler(async () => {
  const projects = await readProjects()

  return projects.filter((project) => !project.hidden)
})
