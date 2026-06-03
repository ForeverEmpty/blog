export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const friends = await readFriends()
  const friend = friends.find((item) => item.id === id)
  const audit = createAdminAuditTrail(friend, undefined, [
    { key: 'name', label: '名称' },
    { key: 'url', label: '链接' },
    { key: 'status', label: '审核状态' },
    { key: 'category', label: '分类' },
    { key: 'featured', label: '精选' }
  ])

  await writeFriends(friends.filter((friend) => friend.id !== id))
  await writeAdminLog({
    action: 'friend.delete',
    targetType: 'friend',
    targetId: id,
    message: appendAuditSummary(friend ? `删除友链：${friend.name}` : `删除友链：${id}`, audit),
    payload: withAuditPayload({
      name: friend?.name || id,
      url: friend?.url || ''
    }, audit)
  }).catch(() => {})

  return { ok: true }
})
