import type { MarkdownPreviewBlock } from '~/types/admin'

const isBlankMarkdownLine = (line: string) => line.trim().length === 0

const isMarkdownTableStart = (line: string, nextLine = '') => (
  line.includes('|') &&
  /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(nextLine)
)

const isMarkdownBlockStart = (line: string, nextLine = '') => {
  const trimmed = line.trim()

  return (
    /^(#{1,6})\s+/.test(trimmed) ||
    /^(```+|~~~+)/.test(trimmed) ||
    /^:{2,}\s*[\w-]+/.test(trimmed) ||
    /^-{3,}$|^\*{3,}$|^_{3,}$/.test(trimmed) ||
    /^\s{0,3}([-+*]|\d+[.)])\s+/.test(line) ||
    /^\s{0,3}>/.test(line) ||
    isMarkdownTableStart(line, nextLine)
  )
}

export const parseMarkdownPreviewBlocks = (markdown: string): MarkdownPreviewBlock[] => {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: MarkdownPreviewBlock[] = []
  let index = 0

  if (lines[0]?.trim() === '---') {
    index = 1

    while (index < lines.length && lines[index]?.trim() !== '---') {
      index += 1
    }

    if (index < lines.length) {
      index += 1
    }
  }

  while (index < lines.length) {
    const line = lines[index] || ''

    if (isBlankMarkdownLine(line)) {
      index += 1
      continue
    }

    const startLine = index + 1
    const trimmed = line.trim()
    const fenceMatch = trimmed.match(/^(```+|~~~+)/)

    if (fenceMatch) {
      const fence = fenceMatch[1]
      index += 1

      while (index < lines.length && !new RegExp(`^\\s*${fence}`).test(lines[index] || '')) {
        index += 1
      }

      blocks.push({ startLine, endLine: Math.min(lines.length, index + 1) })
      index += 1
      continue
    }

    const containerMatch = trimmed.match(/^(:{2,})\s*[\w-]+/)

    if (containerMatch) {
      const fence = containerMatch[1]

      if (!fence) {
        index += 1
        continue
      }

      const fenceSize = fence.length
      index += 1

      while (index < lines.length && !new RegExp(`^\\s*:{${fenceSize},}\\s*$`).test(lines[index] || '')) {
        index += 1
      }

      if (index < lines.length) {
        blocks.push({ startLine, endLine: index + 1 })
        index += 1
      } else {
        blocks.push({ startLine, endLine: startLine })
        index = startLine
      }
      continue
    }

    if (/^(#{1,6})\s+/.test(trimmed) || /^-{3,}$|^\*{3,}$|^_{3,}$/.test(trimmed)) {
      blocks.push({ startLine, endLine: startLine })
      index += 1
      continue
    }

    if (isMarkdownTableStart(line, lines[index + 1] || '')) {
      index += 2

      while (index < lines.length && lines[index]?.includes('|')) {
        index += 1
      }

      blocks.push({ startLine, endLine: index })
      continue
    }

    if (/^\s{0,3}>/.test(line)) {
      index += 1

      while (index < lines.length && (isBlankMarkdownLine(lines[index] || '') || /^\s{0,3}>/.test(lines[index] || ''))) {
        index += 1
      }

      blocks.push({ startLine, endLine: index })
      continue
    }

    if (/^\s{0,3}([-+*]|\d+[.)])\s+/.test(line)) {
      index += 1

      while (index < lines.length && !isBlankMarkdownLine(lines[index] || '')) {
        index += 1
      }

      blocks.push({ startLine, endLine: index })
      continue
    }

    index += 1

    while (
      index < lines.length &&
      !isBlankMarkdownLine(lines[index] || '') &&
      !isMarkdownBlockStart(lines[index] || '', lines[index + 1] || '')
    ) {
      index += 1
    }

    blocks.push({ startLine, endLine: index })
  }

  return blocks
}
