export default defineEventHandler(async (event) => {
  requireAdminAuth(event)

  return readAdminNotificationEvents()
})
