export default defineEventHandler(async (event) => {
  const storedNotifications = await readNotifications()

  return storedNotifications.filter((notification) => (
    notification.enabled !== false &&
    (notification.audience === 'site' || notification.audience === 'both' || !notification.audience)
  ))
})
