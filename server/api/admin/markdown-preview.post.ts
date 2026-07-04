export default defineEventHandler(async (event) => {
  const body = await readBody<{
    markdown?: string
    title?: string
    description?: string
  }>(event)

  const markdown = body.markdown || ''
  const rendered = await parseMarkdownBody(markdown, {
    id: 'admin-preview.md',
    path: '/admin/preview',
    body: markdown
  })

  return {
    id: 'admin-preview',
    title: body.title || rendered.parsed.data?.title || '未命名文章',
    description: body.description || rendered.parsed.data?.description || '',
    body: rendered.body
  }
})
