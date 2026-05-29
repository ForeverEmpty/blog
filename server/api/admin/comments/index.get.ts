export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return readWalineComments({
    status: typeof query.status === 'string' ? query.status : 'all',
    query: typeof query.q === 'string' ? query.q.trim() : ''
  })
})
