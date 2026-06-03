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

  if (!article || !isArticlePublic(article) || article.locked) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Article not found'
    })
  }

  const commentsBySlug = await readComments()
  const moderation = evaluateCommentModeration({
    author,
    website,
    content,
    ip: getRequestIP(event, { xForwardedFor: true }) || '',
    userAgent: getRequestHeader(event, 'user-agent') || ''
  }, getCommentModerationRules(event))
  const comment = {
    id: createId('comment', author),
    slug,
    author,
    website,
    content,
    createdAt: new Date().toISOString(),
    status: moderation.status === 'approved' ? 'published' as const : moderation.status
  }

  commentsBySlug[slug] = [
    ...(commentsBySlug[slug] || []),
    comment
  ].slice(-200)

  await writeComments(commentsBySlug)

  if (comment.status === 'waiting') {
    await createAdminNotificationEvent(event, {
      source: 'comment.waiting',
      title: `新的待审评论：${author}`,
      body: `${author} 在文章 ${slug} 下提交了一条待审核评论。`,
      level: 'warning',
      href: 'admin:comments',
      hrefLabel: '处理评论',
      targetId: comment.id,
      payload: {
        slug,
        author,
        status: comment.status
      }
    }).catch(() => {})
  }

  return comment
})
