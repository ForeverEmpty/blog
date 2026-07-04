import { parseMarkdown, rehypeHighlight } from '@nuxtjs/mdc/runtime'
import { fromHast } from 'minimark/hast'

type MarkdownFileOptions = {
  id: string
  path: string
  body: string
}

const highlightTheme = {
  default: 'github-light',
  dark: 'github-dark',
}

const highlightCode = async (
  code: string,
  language?: string,
  theme?: unknown,
  options?: Record<string, unknown>,
) => {
  const { default: highlighter } = await import('#mdc-highlighter')

  return highlighter(code, language, theme, options)
}

export const parseMarkdownBody = async (
  markdown: string,
  fileOptions: MarkdownFileOptions,
) => {
  const parsed = await parseMarkdown(
    markdown,
    {
      toc: {
        depth: 3,
        searchDepth: 3,
      },
      rehype: {
        plugins: {
          highlight: {
            instance: rehypeHighlight,
            options: {
              highlighter: highlightCode,
              theme: highlightTheme,
            },
          },
        },
      },
    },
    {
      fileOptions,
    },
  )

  return {
    parsed,
    body: {
      ...fromHast(parsed.body),
      toc: parsed.toc,
    },
  }
}
