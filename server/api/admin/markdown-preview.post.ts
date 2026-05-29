import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import { fromHast } from 'minimark/hast'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    markdown?: string
    title?: string
    description?: string
  }>(event)

  const parsed = await parseMarkdown(
    body.markdown || '',
    {
      toc: {
        depth: 3,
        searchDepth: 3
      }
    },
    {
      fileOptions: {
        id: 'admin-preview.md',
        path: '/admin/preview',
        body: body.markdown || ''
      }
    }
  )

  return {
    id: 'admin-preview',
    title: body.title || parsed.data?.title || '未命名文章',
    description: body.description || parsed.data?.description || '',
    body: {
      ...fromHast(parsed.body),
      toc: parsed.toc
    }
  }
})
