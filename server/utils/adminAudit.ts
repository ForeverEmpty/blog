type AuditField<T extends object> = {
  key: string
  label: string
  get?: (value: Partial<T> | undefined) => unknown
  format?: (value: unknown) => string
}

export type AdminAuditChange = {
  field: string
  label: string
  before: string
  after: string
}

export type AdminAuditTrail = {
  changedCount: number
  summary: string
  changes: AdminAuditChange[]
}

const emptyValue = '空'
const maxValueLength = 120

const getPathValue = (value: Record<string, unknown> | undefined, path: string): unknown => {
  if (!value) {
    return undefined
  }

  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') {
      return undefined
    }

    return (current as Record<string, unknown>)[key]
  }, value)
}

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableValue)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)])
    )
  }

  return value ?? null
}

const valuesEqual = (before: unknown, after: unknown) => (
  JSON.stringify(stableValue(before)) === JSON.stringify(stableValue(after))
)

export const formatAuditValue = (value: unknown) => {
  if (value === undefined || value === null || value === '') {
    return emptyValue
  }

  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.map(String).join('、') : emptyValue
  }

  if (typeof value === 'object') {
    const text = JSON.stringify(value)

    return text.length > maxValueLength ? `${text.slice(0, maxValueLength)}...` : text
  }

  const text = String(value)

  return text.length > maxValueLength ? `${text.slice(0, maxValueLength)}...` : text
}

export const formatAuditTextLength = (value: unknown) => {
  const text = String(value || '').trim()

  return text ? `${text.length} 字符` : emptyValue
}

export const formatAuditConfigured = (value: unknown) => (
  value ? '已配置' : '未配置'
)

export const createAdminAuditTrail = <T extends object>(
  before: Partial<T> | undefined,
  after: Partial<T> | undefined,
  fields: AuditField<T>[]
): AdminAuditTrail => {
  const changes = fields.flatMap((field) => {
    const beforeValue = field.get ? field.get(before) : getPathValue(before as Record<string, unknown> | undefined, field.key)
    const afterValue = field.get ? field.get(after) : getPathValue(after as Record<string, unknown> | undefined, field.key)

    if (valuesEqual(beforeValue, afterValue)) {
      return []
    }

    const format = field.format || formatAuditValue

    return [{
      field: field.key,
      label: field.label,
      before: format(beforeValue),
      after: format(afterValue)
    }]
  })
  const summary = changes.length > 0
    ? changes.slice(0, 4).map((change) => change.label).join('、')
    : '无字段变化'

  return {
    changedCount: changes.length,
    summary: changes.length > 4 ? `${summary} 等 ${changes.length} 项` : summary,
    changes
  }
}

export const appendAuditSummary = (message: string, audit: AdminAuditTrail) => (
  audit.changedCount > 0 ? `${message}（改动：${audit.summary}）` : message
)

export const withAuditPayload = (
  payload: Record<string, unknown>,
  audit: AdminAuditTrail
) => ({
  ...payload,
  audit
})
