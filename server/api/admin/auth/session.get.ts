export default defineEventHandler((event) => {
  const status = getAdminAuthStatus(event)

  if (!status.authenticated) {
    clearInvalidAdminSession(event, status.invalidReason)
  }

  return {
    authenticated: status.authenticated,
    configured: status.configured,
    username: status.username,
    csrfToken: status.authenticated ? status.csrfToken : ''
  }
})
