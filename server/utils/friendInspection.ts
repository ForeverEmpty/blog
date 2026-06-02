import type { AdminFriend } from './adminStorage'

export type FriendInspectionOptions = {
  siteName: string
  siteUrl: string
  timeoutMs?: number
}

export type FriendInspectionResult = Pick<
  AdminFriend,
  'checkStatus' | 'checkedAt' | 'checkMessage' | 'responseStatus' | 'responseTimeMs' | 'backlinkFound' | 'backlinkCheckedAt'
>

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const toUrl = (value: string) => {
  const url = new URL(value)

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS URLs can be inspected')
  }

  return url
}

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'ChankoBlog Friend Inspector'
      }
    })
  } finally {
    clearTimeout(timer)
  }
}

const responseStatusToCheckStatus = (status: number): AdminFriend['checkStatus'] => {
  if (status >= 500) {
    return 'error'
  }

  if (status >= 400) {
    return 'warning'
  }

  return 'ok'
}

const createBacklinkTokens = (options: FriendInspectionOptions) => {
  const tokens = new Set<string>()
  const siteUrl = trimTrailingSlash(String(options.siteUrl || '').trim())
  const siteName = String(options.siteName || '').trim()

  if (siteUrl) {
    tokens.add(siteUrl)
    tokens.add(siteUrl.replace(/^https?:\/\//, ''))

    try {
      tokens.add(new URL(siteUrl).host)
    } catch {
      // Ignore malformed configured site URL; other tokens still work.
    }
  }

  if (siteName) {
    tokens.add(siteName)
  }

  return [...tokens].filter((token) => token.length >= 4)
}

const inspectBacklink = async (url: string, options: FriendInspectionOptions) => {
  toUrl(url)

  const response = await fetchWithTimeout(url, options.timeoutMs || 8000)
  const text = await response.text()
  const normalizedText = text.toLowerCase()
  const found = createBacklinkTokens(options).some((token) => normalizedText.includes(token.toLowerCase()))

  return {
    status: response.status,
    found
  }
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.name === 'AbortError') {
    return '请求超时'
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return '未知错误'
}

export const inspectFriend = async (
  friend: Pick<AdminFriend, 'url' | 'backlinkUrl'>,
  options: FriendInspectionOptions
): Promise<FriendInspectionResult> => {
  const checkedAt = new Date().toISOString()
  const timeoutMs = options.timeoutMs || 8000

  try {
    toUrl(friend.url)

    const startedAt = Date.now()
    const response = await fetchWithTimeout(friend.url, timeoutMs)
    const responseTimeMs = Date.now() - startedAt
    const messages = [`站点 HTTP ${response.status}，耗时 ${responseTimeMs}ms`]
    let checkStatus = responseStatusToCheckStatus(response.status)
    let backlinkFound: boolean | undefined
    let backlinkCheckedAt = ''

    if (friend.backlinkUrl) {
      backlinkCheckedAt = checkedAt

      try {
        const backlink = await inspectBacklink(friend.backlinkUrl, options)
        backlinkFound = backlink.found
        messages.push(backlink.found ? `返链已确认，HTTP ${backlink.status}` : `返链未找到，HTTP ${backlink.status}`)

        if (!backlink.found && checkStatus === 'ok') {
          checkStatus = 'warning'
        }
      } catch (error) {
        backlinkFound = false
        messages.push(`返链检查失败：${getErrorMessage(error)}`)

        if (checkStatus === 'ok') {
          checkStatus = 'warning'
        }
      }
    } else {
      messages.push('未配置返链地址')
    }

    return {
      checkStatus,
      checkedAt,
      checkMessage: messages.join('；'),
      responseStatus: response.status,
      responseTimeMs,
      backlinkFound,
      backlinkCheckedAt
    }
  } catch (error) {
    return {
      checkStatus: 'error',
      checkedAt,
      checkMessage: `站点检查失败：${getErrorMessage(error)}`,
      responseStatus: undefined,
      responseTimeMs: undefined,
      backlinkFound: friend.backlinkUrl ? false : undefined,
      backlinkCheckedAt: friend.backlinkUrl ? checkedAt : ''
    }
  }
}
