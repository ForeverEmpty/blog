import type { AdminProject } from './adminStorage'

export type ProjectInspectionResult = Pick<
  AdminProject,
  'checkStatus' | 'checkedAt' | 'checkMessage' | 'launchStatus' | 'launchTimeMs' | 'sourceStatus' | 'sourceTimeMs'
>

type LinkInspectionResult = {
  status?: number
  timeMs?: number
  message: string
  checkStatus: AdminProject['checkStatus']
}

const toHttpUrl = (value: string) => {
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
        'User-Agent': 'ChankoBlog Project Inspector'
      }
    })
  } finally {
    clearTimeout(timer)
  }
}

const statusToCheckStatus = (status: number): AdminProject['checkStatus'] => {
  if (status >= 500) {
    return 'error'
  }

  if (status >= 400) {
    return 'warning'
  }

  return 'ok'
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

const inspectLink = async (label: string, url: string, timeoutMs: number): Promise<LinkInspectionResult> => {
  if (!url.trim()) {
    return {
      message: `${label}未配置`,
      checkStatus: 'warning'
    }
  }

  try {
    toHttpUrl(url)

    const startedAt = Date.now()
    const response = await fetchWithTimeout(url, timeoutMs)
    const timeMs = Date.now() - startedAt

    return {
      status: response.status,
      timeMs,
      message: `${label} HTTP ${response.status}，耗时 ${timeMs}ms`,
      checkStatus: statusToCheckStatus(response.status)
    }
  } catch (error) {
    return {
      message: `${label}检查失败：${getErrorMessage(error)}`,
      checkStatus: 'error'
    }
  }
}

const mergeCheckStatus = (items: LinkInspectionResult[]): AdminProject['checkStatus'] => {
  if (items.some((item) => item.checkStatus === 'error')) {
    return 'error'
  }

  if (items.some((item) => item.checkStatus === 'warning')) {
    return 'warning'
  }

  return 'ok'
}

export const inspectProject = async (
  project: Pick<AdminProject, 'launchUrl' | 'sourceUrl'>,
  timeoutMs = 8000
): Promise<ProjectInspectionResult> => {
  const checkedAt = new Date().toISOString()
  const launch = await inspectLink('访问地址', project.launchUrl, timeoutMs)
  const source = await inspectLink('源码地址', project.sourceUrl, timeoutMs)

  return {
    checkStatus: mergeCheckStatus([launch, source]),
    checkedAt,
    checkMessage: [launch.message, source.message].join('；'),
    launchStatus: launch.status,
    launchTimeMs: launch.timeMs,
    sourceStatus: source.status,
    sourceTimeMs: source.timeMs
  }
}
