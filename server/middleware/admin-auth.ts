export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  const method = event.method.toUpperCase()
  const isSafeMethod = method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
  const isPublicAdminAuthApi = path === '/api/admin/auth/login' || path === '/api/admin/auth/session'

  if (isPublicAdminAuthApi || path === '/admin/login' || path.startsWith('/admin/login/')) {
    return
  }

  if (path.startsWith('/api/admin')) {
    if (isSafeMethod) {
      requireAdminAuth(event)
    } else {
      requireAdminCsrf(event)
    }

    return
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    const status = getAdminAuthStatus(event)

    if (!status.authenticated) {
      clearInvalidAdminSession(event, status.invalidReason)

      const requestUrl = getRequestURL(event)
      const redirectPath = `${requestUrl.pathname}${requestUrl.search}`

      return sendRedirect(event, `/admin/login?redirect=${encodeURIComponent(redirectPath)}`, 302)
    }
  }
})
