export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const friends = await readFriends()
  const target = friends.find((friend) => friend.id === id)

  if (!target) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Friend not found'
    })
  }

  Object.assign(target, {
    ...body,
    id: target.id,
    tags: Array.isArray(body.tags) ? body.tags.map(String) : target.tags
  })

  await writeFriends(friends)

  return target
})
