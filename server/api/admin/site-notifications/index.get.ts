export default defineEventHandler(async (event) => {
  requireAdminAuth(event)

  const storedNotifications = await readNotifications()

  return storedNotifications.map((notification) => ({
    ...notification,
    audience: 'site'
  }))
})
