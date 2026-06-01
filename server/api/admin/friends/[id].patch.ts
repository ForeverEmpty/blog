export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody(event)
  const friends = await readFriends()
  const target = friends.find((friend) => friend.id === id)

  if (!target) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Friend not found'
    })
  }

  const nextStatus = body.status === '已通过' || body.status === '已拒绝' || body.status === '待审核'
    ? body.status
    : target.status

  Object.assign(target, {
    id: target.id,
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : target.name,
    url: typeof body.url === 'string' && body.url.trim() ? body.url.trim() : target.url,
    icon: typeof body.icon === 'string' ? body.icon.trim() : target.icon,
    intro: typeof body.intro === 'string' ? body.intro.trim() : target.intro,
    description: typeof body.description === 'string' ? body.description.trim() : target.description,
    category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : target.category,
    status: nextStatus,
    tags: Array.isArray(body.tags) ? body.tags.map(String).map((tag) => tag.trim()).filter(Boolean) : target.tags,
    contact: typeof body.contact === 'string' ? body.contact.trim() : target.contact,
    backlinkUrl: typeof body.backlinkUrl === 'string' ? body.backlinkUrl.trim() : target.backlinkUrl,
    reviewNote: typeof body.reviewNote === 'string' ? body.reviewNote.trim() : target.reviewNote,
    featured: typeof body.featured === 'boolean' ? body.featured : target.featured,
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : target.order,
    reviewedAt: nextStatus === '待审核' ? '' : new Date().toISOString()
  })

  await writeFriends(friends)
  await writeAdminLog({
    action: 'friend.update',
    targetType: 'friend',
    targetId: target.id,
    message: `更新友链：${target.name}`,
    payload: {
      status: target.status
    }
  }).catch(() => {})

  return target
})
