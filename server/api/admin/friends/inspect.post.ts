import type { H3Event } from 'h3'

const getFriendInspectionOptions = (event: H3Event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const appConfig = useAppConfig(event)

  return {
    siteName: String(appConfig.site?.name || 'ChankoBlog'),
    siteUrl: String(runtimeConfig.public.siteUrl || appConfig.seo?.siteUrl || 'http://localhost:3000')
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ ids?: string[] }>(event).catch(() => ({}))
  const requestedIds = Array.isArray(body?.ids)
    ? new Set(body.ids.map(String).filter(Boolean))
    : null
  const friends = await readFriends()
  const targets = requestedIds
    ? friends.filter((friend) => requestedIds.has(friend.id))
    : friends
  const options = getFriendInspectionOptions(event)

  for (const friend of targets) {
    Object.assign(friend, await inspectFriend(friend, options))
  }

  await writeFriends(friends)
  await writeAdminLog({
    action: 'friend.inspect.batch',
    targetType: 'friend',
    targetId: 'friends',
    message: `批量巡检友链：${targets.length} 个`,
    payload: {
      checkedCount: targets.length,
      warningCount: targets.filter((friend) => friend.checkStatus === 'warning').length,
      errorCount: targets.filter((friend) => friend.checkStatus === 'error').length
    }
  }).catch(() => {})

  return {
    friends,
    checkedCount: targets.length,
    warningCount: targets.filter((friend) => friend.checkStatus === 'warning').length,
    errorCount: targets.filter((friend) => friend.checkStatus === 'error').length
  }
})
