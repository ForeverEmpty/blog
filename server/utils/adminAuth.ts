import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const adminSessionCookie = 'chanko-admin-session'
const sessionMaxAge = 60 * 60 * 24 * 7
const csrfHeader = 'x-admin-csrf'
const loginWindowMs = 15 * 60 * 1000
const maxLoginFailures = 5

type LoginAttempt = {
  count: number
  resetAt: number
}

const loginAttempts = new Map<string, LoginAttempt>()

type AdminSessionPayload = {
  username: string
  exp: number
  csrf: string
}

type InvalidAdminSessionReason = 'missing' | 'unconfigured' | 'malformed' | 'signature' | 'expired' | 'username'

const encodeBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url')

const decodeBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8')

const safeCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

const getAdminRuntimeConfig = () => {
  const config = useRuntimeConfig()
  const username = String(config.adminUsername || 'admin')
  const password = String(config.adminPassword || '')
  const configuredSessionSecret = String(config.adminSessionSecret || '')
  const isProduction = process.env.NODE_ENV === 'production'

  if (isProduction && !password) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Admin password is not configured'
    })
  }

  if (isProduction && configuredSessionSecret.length < 32) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Admin session secret must be at least 32 characters in production'
    })
  }

  return {
    username,
    password,
    sessionSecret: configuredSessionSecret || password || 'chanko-admin-local-session',
    configured: password.length > 0
  }
}

const signPayload = (payload: string, secret: string) => (
  createHmac('sha256', secret).update(payload).digest('base64url')
)

const createAdminSessionValue = (username: string) => {
  const { sessionSecret } = getAdminRuntimeConfig()
  const csrf = randomBytes(24).toString('base64url')
  const payload = encodeBase64Url(JSON.stringify({
    username,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAge,
    csrf
  } satisfies AdminSessionPayload))

  return {
    value: `${payload}.${signPayload(payload, sessionSecret)}`,
    csrf
  }
}

export const getAdminAuthStatus = (event: H3Event) => {
  const { username, sessionSecret, configured } = getAdminRuntimeConfig()
  const cookie = getCookie(event, adminSessionCookie)
  let invalidReason: InvalidAdminSessionReason | undefined

  if (!configured || !cookie) {
    return {
      authenticated: false,
      configured,
      username,
      csrfToken: '',
      expiresAt: '',
      secondsRemaining: 0,
      invalidReason: configured ? 'missing' : 'unconfigured'
    }
  }

  const [payload, signature] = cookie.split('.')

  if (!payload || !signature) {
    invalidReason = 'malformed'
  } else if (!safeCompare(signature, signPayload(payload, sessionSecret))) {
    invalidReason = 'signature'
  }

  if (invalidReason) {
    return {
      authenticated: false,
      configured,
      username,
      csrfToken: '',
      expiresAt: '',
      secondsRemaining: 0,
      invalidReason
    }
  }

  try {
    const session = JSON.parse(decodeBase64Url(payload)) as AdminSessionPayload
    const now = Math.floor(Date.now() / 1000)

    if (session.username !== username) {
      return {
        authenticated: false,
        configured,
        username,
        csrfToken: '',
        expiresAt: '',
        secondsRemaining: 0,
        invalidReason: 'username'
      }
    }

    if (session.exp < now) {
      return {
        authenticated: false,
        configured,
        username,
        csrfToken: '',
        expiresAt: '',
        secondsRemaining: 0,
        invalidReason: 'expired'
      }
    }

    if (typeof session.csrf !== 'string' || !session.csrf) {
      return {
        authenticated: false,
        configured,
        username,
        csrfToken: '',
        expiresAt: '',
        secondsRemaining: 0,
        invalidReason: 'malformed'
      }
    }

    return {
      authenticated: true,
      configured,
      username,
      csrfToken: session.csrf,
      expiresAt: new Date(session.exp * 1000).toISOString(),
      secondsRemaining: Math.max(0, session.exp - now)
    }
  } catch {
    return {
      authenticated: false,
      configured,
      username,
      csrfToken: '',
      expiresAt: '',
      secondsRemaining: 0,
      invalidReason: 'malformed'
    }
  }
}

export const clearInvalidAdminSession = (event: H3Event, invalidReason?: InvalidAdminSessionReason) => {
  if (invalidReason && invalidReason !== 'missing' && invalidReason !== 'unconfigured') {
    clearAdminSession(event)
  }
}

const getAdminLoginKey = (event: H3Event, username: string) => {
  const forwardedFor = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  const remoteAddress = getRequestIP(event, { xForwardedFor: true }) || forwardedFor || 'unknown'

  return `${remoteAddress}:${username.toLowerCase()}`
}

export const assertAdminLoginAllowed = (event: H3Event, username: string) => {
  const key = getAdminLoginKey(event, username)
  const now = Date.now()
  const attempt = loginAttempts.get(key)

  if (!attempt || attempt.resetAt <= now) {
    loginAttempts.delete(key)
    return
  }

  if (attempt.count >= maxLoginFailures) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many admin login attempts'
    })
  }
}

export const recordAdminLoginFailure = (event: H3Event, username: string) => {
  const key = getAdminLoginKey(event, username)
  const now = Date.now()
  const current = loginAttempts.get(key)

  if (!current || current.resetAt <= now) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + loginWindowMs
    })
    return
  }

  current.count += 1
  loginAttempts.set(key, current)
}

export const recordAdminLoginSuccess = (event: H3Event, username: string) => {
  loginAttempts.delete(getAdminLoginKey(event, username))
}

export const verifyAdminCredentials = (username: string, password: string) => {
  const config = getAdminRuntimeConfig()

  if (!config.configured) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Admin password is not configured'
    })
  }

  return safeCompare(username, config.username) && safeCompare(password, config.password)
}

export const setAdminSession = (event: H3Event, username: string) => {
  const session = createAdminSessionValue(username)

  setCookie(event, adminSessionCookie, session.value, {
    httpOnly: true,
    maxAge: sessionMaxAge,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  })

  return session.csrf
}

export const clearAdminSession = (event: H3Event) => {
  deleteCookie(event, adminSessionCookie, {
    path: '/'
  })
}

export const requireAdminAuth = (event: H3Event) => {
  const status = getAdminAuthStatus(event)

  if (!status.authenticated) {
    clearInvalidAdminSession(event, status.invalidReason)

    throw createError({
      statusCode: 401,
      statusMessage: status.configured ? 'Admin login required' : 'Admin password is not configured'
    })
  }

  return status
}

export const requireAdminCsrf = (event: H3Event) => {
  const status = requireAdminAuth(event)
  const token = getRequestHeader(event, csrfHeader) || ''

  if (!status.csrfToken || !token || !safeCompare(token, status.csrfToken)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid admin CSRF token'
    })
  }

  return status
}
