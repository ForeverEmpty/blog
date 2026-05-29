const maxAuthorLength = 40
const maxContentLength = 1600

const normalizeText = (value: unknown) => (
  typeof value === 'string' ? value.trim() : ''
)

const normalizeWebsite = (value: unknown) => {
  const website = normalizeText(value)

  if (!website) {
    return undefined
  }

  try {
    const url = new URL(website)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return undefined
    }

    return url.toString()
  } catch {
    return undefined
  }
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''

  assertSafeSlug(slug)

  const body = await readBody(event)
  const author = normalizeText(body?.author)
  const content = normalizeText(body?.content)
  const website = normalizeWebsite(body?.website)
  const honeypot = normalizeText(body?.company)

  if (honeypot) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid comment'
    })
  }

  if (!author || author.length > maxAuthorLength) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Comment author is invalid'
    })
  }

  if (!content || content.length > maxContentLength) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Comment content is invalid'
    })
  }

  const article = (await readArticles()).find((item) => item.slug === slug)

  if (!article || article.published === false || article.locked) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article not found'
    })
  }

  const commentsBySlug = await readComments()
  const comment = {
    id: createId('comment', author),
    slug,
    author,
    website,
    content,
    createdAt: new Date().toISOString(),
    status: 'published' as const
  }

  commentsBySlug[slug] = [
    ...(commentsBySlug[slug] || []),
    comment
  ].slice(-200)

  await writeComments(commentsBySlug)

  return comment
})
