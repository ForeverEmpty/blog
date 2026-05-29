export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const friends = await readFriends()

  await writeFriends(friends.filter((friend) => friend.id !== id))

  return { ok: true }
})
