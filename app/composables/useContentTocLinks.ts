export type ContentTocLink = {
  id: string
  text: string
  depth: number
}

type ContentNode = [
  string,
  Record<string, unknown>,
  ...unknown[]
]

const headingPattern = /^h([1-6])$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isContentNode = (value: unknown): value is ContentNode =>
  Array.isArray(value) &&
  typeof value[0] === 'string' &&
  isRecord(value[1])

const extractText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.slice(2).map(extractText).join('')
  }

  return ''
}

export const useContentTocLinks = (source: () => unknown) =>
  computed<ContentTocLink[]>(() => {
    const content = source()

    if (!isRecord(content) || !isRecord(content.body) || !Array.isArray(content.body.value)) {
      return []
    }

    return content.body.value.flatMap((node): ContentTocLink[] => {
      if (!isContentNode(node)) {
        return []
      }

      const headingMatch = node[0].match(headingPattern)
      const id = node[1].id

      if (!headingMatch || typeof id !== 'string') {
        return []
      }

      return [{
        id,
        depth: Number(headingMatch[1]),
        text: node.slice(2).map(extractText).join('')
      }]
    })
  })
