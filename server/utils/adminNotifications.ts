import net from 'node:net'
import tls from 'node:tls'
import type { H3Event } from 'h3'
import type {
  AdminNotificationEvent,
  AdminNotificationEventKey,
  AdminNotificationLevel,
  AdminNotificationSettings
} from '~~/server/utils/adminStorage'

type AdminNotificationInput = {
  source: AdminNotificationEventKey
  title: string
  body: string
  level?: AdminNotificationLevel
  href?: string
  hrefLabel?: string
  targetId?: string
  payload?: Record<string, unknown>
}

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  password: string
  from: string
  to: string
}

type SmtpSocket = net.Socket | tls.TLSSocket

const smtpTimeoutMs = 12_000

const escapeHeader = (value: string) => value.replace(/[\r\n]+/g, ' ').trim()

const encodeHeader = (value: string) => {
  if (/^[\x00-\x7F]*$/.test(value)) {
    return escapeHeader(value)
  }

  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

const smtpData = (message: string) => message.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..')

const createSocketReader = (socket: SmtpSocket) => {
  let buffer = ''

  socket.setEncoding('utf8')

  return () => new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('SMTP response timeout'))
    }, smtpTimeoutMs)

    const cleanup = () => {
      clearTimeout(timeout)
      socket.off('data', onData)
      socket.off('error', onError)
    }
    const tryResolve = () => {
      const lines = buffer.split(/\r?\n/)
      const rest = lines.pop() || ''
      const completeIndex = lines.findIndex((line) => /^\d{3}\s/.test(line))

      if (completeIndex === -1) {
        buffer = [...lines, rest].join('\n')
        return
      }

      const responseLines = lines.slice(0, completeIndex + 1)

      buffer = [...lines.slice(completeIndex + 1), rest].join('\n')
      cleanup()
      resolve(responseLines.join('\n'))
    }
    const onData = (chunk: string) => {
      buffer += chunk
      tryResolve()
    }
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }

    socket.on('data', onData)
    socket.on('error', onError)
    tryResolve()
  })
}

const assertSmtpOk = (response: string, expected: number[]) => {
  const status = Number(response.slice(0, 3))

  if (!expected.includes(status)) {
    throw new Error(`SMTP unexpected response: ${response}`)
  }

  return response
}

const connectSmtpSocket = (config: SmtpConfig) => new Promise<SmtpSocket>((resolve, reject) => {
  const socket = config.secure
    ? tls.connect(config.port, config.host, { servername: config.host })
    : net.connect(config.port, config.host)
  const timeout = setTimeout(() => {
    socket.destroy()
    reject(new Error('SMTP connection timeout'))
  }, smtpTimeoutMs)
  const readyEvent = config.secure ? 'secureConnect' : 'connect'

  socket.once(readyEvent, () => {
    clearTimeout(timeout)
    resolve(socket)
  })
  socket.once('error', (error) => {
    clearTimeout(timeout)
    reject(error)
  })
})

const writeSmtpCommand = async (socket: SmtpSocket, readResponse: () => Promise<string>, command: string, expected: number[]) => {
  socket.write(`${command}\r\n`)

  return assertSmtpOk(await readResponse(), expected)
}

const parseBoolean = (value: unknown) => (
  value === true || value === 'true' || value === '1' || value === 1
)

const getSmtpConfig = (event: H3Event, settings: AdminNotificationSettings): SmtpConfig | null => {
  const runtimeConfig = useRuntimeConfig(event)
  const host = String(runtimeConfig.notificationSmtpHost || '').trim()
  const port = Number(runtimeConfig.notificationSmtpPort || 587)
  const from = String(settings.emailFrom || runtimeConfig.notificationEmailFrom || '').trim()
  const to = String(settings.emailTo || runtimeConfig.notificationEmailTo || '').trim()

  if (!host || !from || !to) {
    return null
  }

  return {
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: parseBoolean(runtimeConfig.notificationSmtpSecure),
    user: String(runtimeConfig.notificationSmtpUser || '').trim(),
    password: String(runtimeConfig.notificationSmtpPassword || ''),
    from,
    to
  }
}

const sendSmtpMail = async (config: SmtpConfig, subject: string, body: string) => {
  let socket = await connectSmtpSocket(config)
  let readResponse = createSocketReader(socket)

  assertSmtpOk(await readResponse(), [220])
  const ehloResponse = await writeSmtpCommand(socket, readResponse, 'EHLO localhost', [250])

  if (!config.secure && ehloResponse.includes('STARTTLS')) {
    await writeSmtpCommand(socket, readResponse, 'STARTTLS', [220])
    socket = await new Promise<tls.TLSSocket>((resolve, reject) => {
      const tlsSocket = tls.connect({
        socket,
        servername: config.host
      })
      const timeout = setTimeout(() => {
        tlsSocket.destroy()
        reject(new Error('SMTP STARTTLS timeout'))
      }, smtpTimeoutMs)

      tlsSocket.once('secureConnect', () => {
        clearTimeout(timeout)
        resolve(tlsSocket)
      })
      tlsSocket.once('error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
    readResponse = createSocketReader(socket)
    await writeSmtpCommand(socket, readResponse, 'EHLO localhost', [250])
  }

  if (config.user && config.password) {
    const token = Buffer.from(`\0${config.user}\0${config.password}`, 'utf8').toString('base64')

    await writeSmtpCommand(socket, readResponse, `AUTH PLAIN ${token}`, [235])
  }

  await writeSmtpCommand(socket, readResponse, `MAIL FROM:<${config.from}>`, [250])
  await writeSmtpCommand(socket, readResponse, `RCPT TO:<${config.to}>`, [250, 251])
  await writeSmtpCommand(socket, readResponse, 'DATA', [354])

  const message = [
    `From: ${encodeHeader(config.from)} <${config.from}>`,
    `To: ${encodeHeader(config.to)} <${config.to}>`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body
  ].join('\n')

  socket.write(`${smtpData(message)}\r\n.\r\n`)
  assertSmtpOk(await readResponse(), [250])
  await writeSmtpCommand(socket, readResponse, 'QUIT', [221]).catch(() => '')
  socket.destroy()
}

export const createAdminNotificationEvent = async (event: H3Event, input: AdminNotificationInput) => {
  const settings = await readNotificationSettings()
  const eventSetting = settings.events.find((item) => item.key === input.source)
  const now = new Date().toISOString()
  const notification: AdminNotificationEvent = {
    id: createId('admin-notice', `${input.source}-${input.title}`),
    title: input.title,
    body: input.body,
    date: now.slice(0, 10),
    level: input.level || 'info',
    href: input.href || '',
    hrefLabel: input.hrefLabel || '',
    pinned: true,
    enabled: true,
    audience: 'admin',
    source: input.source,
    important: eventSetting?.important === true,
    emailed: false,
    createdAt: now
  }

  if (eventSetting?.siteEnabled !== false) {
    const notifications = await readAdminNotificationEvents()

    await writeAdminNotificationEvents([notification, ...notifications])
  }

  const shouldEmail = settings.emailEnabled &&
    eventSetting?.emailEnabled === true

  if (shouldEmail) {
    const smtpConfig = getSmtpConfig(event, settings)

    if (!smtpConfig) {
      await writeAdminLog({
        action: 'notification.email.skipped',
        targetType: 'notification',
        targetId: notification.id,
        message: `邮件通知未发送：${input.title}。缺少 SMTP 或收件人配置。`,
        payload: {
          source: input.source
        }
      }).catch(() => {})
    } else {
      try {
        await sendSmtpMail(
          smtpConfig,
          `[ChankoBlog] ${input.title}`,
          [
            input.title,
            '',
            input.body,
            '',
            input.href ? `链接：${input.href}` : '',
            `事件：${input.source}`,
            `时间：${now}`
          ].filter(Boolean).join('\n')
        )
        notification.emailed = true

        if (eventSetting?.siteEnabled !== false) {
          const notifications = await readAdminNotificationEvents()

          await writeAdminNotificationEvents(notifications.map((item) => (
            item.id === notification.id ? notification : item
          )))
        }
      } catch (error) {
        await writeAdminLog({
          action: 'notification.email.error',
          targetType: 'notification',
          targetId: notification.id,
          message: `邮件通知发送失败：${input.title}`,
          payload: {
            source: input.source,
            error: error instanceof Error ? error.message : String(error)
          }
        }).catch(() => {})
      }
    }
  }

  await writeAdminLog({
    action: 'notification.event',
    targetType: 'notification',
    targetId: notification.id,
    message: `后台通知事件：${input.title}`,
    payload: {
      source: input.source,
      emailed: notification.emailed,
      siteEnabled: eventSetting?.siteEnabled !== false,
      emailEnabled: eventSetting?.emailEnabled === true,
      targetId: input.targetId,
      ...input.payload
    }
  }).catch(() => {})

  return notification
}
