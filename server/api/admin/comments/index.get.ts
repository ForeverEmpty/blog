export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const rules = getCommentModerationRules(event)

  const comments = await readWalineComments({
    status: typeof query.status === 'string' ? query.status : 'all',
    query: typeof query.q === 'string' ? query.q.trim() : ''
  })

  return comments.map((comment) => withCommentModeration(comment, rules))
})
