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

  const beforeFriend = {
    ...target,
    tags: [...target.tags]
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
  const audit = createAdminAuditTrail(beforeFriend, target, [
    { key: 'name', label: '名称' },
    { key: 'url', label: '链接' },
    { key: 'icon', label: '图标' },
    { key: 'intro', label: '简介' },
    { key: 'description', label: '描述' },
    { key: 'category', label: '分类' },
    { key: 'status', label: '审核状态' },
    { key: 'tags', label: '标签' },
    { key: 'contact', label: '联系方式' },
    { key: 'backlinkUrl', label: '反链地址' },
    { key: 'reviewNote', label: '审核备注' },
    { key: 'featured', label: '精选' },
    { key: 'order', label: '排序' }
  ])

  await writeFriends(friends)
  await writeAdminLog({
    action: 'friend.update',
    targetType: 'friend',
    targetId: target.id,
    message: appendAuditSummary(`更新友链：${target.name}`, audit),
    payload: withAuditPayload({
      status: target.status
    }, audit)
  }).catch(() => {})

  return target
})
