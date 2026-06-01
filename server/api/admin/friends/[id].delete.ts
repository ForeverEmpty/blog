export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const friends = await readFriends()
  const friend = friends.find((item) => item.id === id)

  await writeFriends(friends.filter((friend) => friend.id !== id))
  await writeAdminLog({
    action: 'friend.delete',
    targetType: 'friend',
    targetId: id,
    message: friend ? `删除友链：${friend.name}` : `删除友链：${id}`
  }).catch(() => {})

  return { ok: true }
})
