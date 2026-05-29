export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Friend name is required'
    })
  }

  if (!body?.url || typeof body.url !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Friend url is required'
    })
  }

  const friends = await readFriends()
  const friend = {
    id: body.id || createId('friend', body.name),
    name: body.name,
    url: body.url,
    icon: typeof body.icon === 'string' ? body.icon : '',
    intro: typeof body.intro === 'string' ? body.intro : '',
    description: body.description || '',
    category: body.category || '个人站点',
    status: body.status || '待审核',
    tags: Array.isArray(body.tags) ? body.tags.map(String) : []
  }
  const nextFriends = [friend, ...friends.filter((item) => item.id !== friend.id)]

  await writeFriends(nextFriends)

  return friend
})
