export default defineEventHandler(async (event) => {
  requireAdminAuth(event)

  return readNotificationSettings()
})
