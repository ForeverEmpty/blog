type ContentTextNode = [
  string,
  Record<string, unknown>,
  ...unknown[]
]

const ignoredTextTags = new Set(['style', 'script'])

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isTextNode = (value: unknown): value is ContentTextNode =>
  Array.isArray(value) &&
  typeof value[0] === 'string' &&
  isObjectRecord(value[1])

const readText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (!isTextNode(value) || ignoredTextTags.has(value[0])) {
    return ''
  }

  return value.slice(2).map(readText).join(' ')
}

const countWords = (text: string) => {
  const cjkCount = text.match(/[\u3400-\u9fff]/g)?.length ?? 0
  const latinWordCount = text.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*/g)?.length ?? 0

  return cjkCount + latinWordCount
}

export const useContentReadingStats = (source: () => unknown) =>
  computed(() => {
    const content = source()
    const text = isObjectRecord(content) && isObjectRecord(content.body) && Array.isArray(content.body.value)
      ? content.body.value.map(readText).join(' ')
      : ''
    const wordCount = countWords(text)

    return {
      wordCount,
      readingMinutes: Math.max(1, Math.ceil(wordCount / 400))
    }
  })
