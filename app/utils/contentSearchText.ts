const ignoredContentTextTags = new Set(['script', 'style'])

const isContentRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isMinimarkContentNode = (value: unknown): value is [string, Record<string, unknown>, ...unknown[]] =>
  Array.isArray(value) &&
  typeof value[0] === 'string' &&
  isContentRecord(value[1])

const readContentText = (value: unknown): string => {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value)
  }

  if (Array.isArray(value)) {
    if (isMinimarkContentNode(value)) {
      return ignoredContentTextTags.has(value[0])
        ? ''
        : value.slice(2).map(readContentText).join(' ')
    }

    return value.map(readContentText).join(' ')
  }

  if (!isContentRecord(value)) {
    return ''
  }

  if (typeof value.value === 'string') {
    return value.value
  }

  if (Array.isArray(value.value)) {
    return value.value.map(readContentText).join(' ')
  }

  if (Array.isArray(value.children)) {
    return value.children.map(readContentText).join(' ')
  }

  if (isContentRecord(value.body)) {
    return readContentText(value.body)
  }

  return ''
}

export const getContentSearchText = (content: unknown) =>
  readContentText(content).replace(/\s+/g, ' ').trim()

export const withContentSearchText = <T extends { body?: unknown, markdown?: string, contentText?: string }>(item: T) => {
  const contentText = getContentSearchText(item.body)
  const markdown = [item.markdown, item.contentText, contentText]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')

  return {
    ...item,
    contentText,
    markdown
  }
}
