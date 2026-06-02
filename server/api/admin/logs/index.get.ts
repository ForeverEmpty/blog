export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return readAdminLogs(Number(query.limit || 120))
})
