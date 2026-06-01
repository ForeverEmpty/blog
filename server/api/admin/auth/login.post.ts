export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = String(body?.username || '').trim()
  const password = String(body?.password || '')

  assertAdminLoginAllowed(event, username)

  if (!verifyAdminCredentials(username, password)) {
    recordAdminLoginFailure(event, username)

    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid admin credentials'
    })
  }

  recordAdminLoginSuccess(event, username)
  const csrfToken = setAdminSession(event, username)

  await writeAdminLog({
    action: 'auth.login',
    targetType: 'admin',
    targetId: username,
    message: `后台登录：${username}`
  }).catch(() => {})

  return {
    authenticated: true,
    username,
    csrfToken
  }
})
