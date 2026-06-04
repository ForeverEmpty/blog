import type { H3Event } from 'h3'

const getFriendInspectionOptions = (event: H3Event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const appConfig = useAppConfig()

  return {
    siteName: String(appConfig.site?.name || 'ChankoBlog'),
    siteUrl: String(runtimeConfig.public.siteUrl || appConfig.seo?.siteUrl || 'http://localhost:3000')
  }
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const friends = await readFriends()
  const target = friends.find((friend) => friend.id === id)

  if (!target) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Friend not found'
    })
  }

  Object.assign(target, await inspectFriend(target, getFriendInspectionOptions(event)))

  await writeFriends(friends)
  await writeAdminLog({
    action: 'friend.inspect',
    targetType: 'friend',
    targetId: target.id,
    message: `巡检友链：${target.name}`,
    payload: {
      url: target.url,
      status: target.checkStatus,
      message: target.checkMessage
    }
  }).catch(() => {})

  return target
})
