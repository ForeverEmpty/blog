export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'private, max-age=0, must-revalidate')

  const query = getQuery(event)

  return readPublicArticles({
    includeSearchText: query.search === '1' || query.search === 'true',
  })
})
