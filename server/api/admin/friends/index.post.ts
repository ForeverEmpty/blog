export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body?.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Friend name is required'
    })
  }

  if (!body?.url || typeof body.url !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Friend url is required'
    })
  }

  const friends = await readFriends()
  const existing = typeof body.id === 'string' && body.id
    ? friends.find((friend) => friend.id === body.id)
    : undefined
  const status = body.status === '已通过' || body.status === '已拒绝' ? body.status : '待审核'
  const now = new Date().toISOString()
  const url = body.url.trim()
  const backlinkUrl = typeof body.backlinkUrl === 'string' ? body.backlinkUrl.trim() : ''
  const shouldResetInspection = !existing || existing.url !== url || existing.backlinkUrl !== backlinkUrl
  const friend = {
    id: existing?.id || createId('friend', body.name),
    name: body.name.trim(),
    url,
    icon: typeof body.icon === 'string' ? body.icon.trim() : '',
    intro: typeof body.intro === 'string' ? body.intro.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : '个人站点',
    status,
    tags: Array.isArray(body.tags) ? body.tags.map(String).map((tag: string) => tag.trim()).filter(Boolean) : [],
    contact: typeof body.contact === 'string' ? body.contact.trim() : '',
    backlinkUrl,
    reviewNote: typeof body.reviewNote === 'string' ? body.reviewNote.trim() : '',
    featured: body.featured === true,
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : existing?.order ?? ((friends.length + 1) * 10),
    submittedAt: existing?.submittedAt || now,
    reviewedAt: status === '待审核' ? '' : (existing?.reviewedAt || now),
    checkStatus: shouldResetInspection ? 'unchecked' : existing.checkStatus,
    checkedAt: shouldResetInspection ? '' : existing.checkedAt,
    checkMessage: shouldResetInspection ? '' : existing.checkMessage,
    responseStatus: shouldResetInspection ? undefined : existing.responseStatus,
    responseTimeMs: shouldResetInspection ? undefined : existing.responseTimeMs,
    backlinkFound: shouldResetInspection ? undefined : existing.backlinkFound,
    backlinkCheckedAt: shouldResetInspection ? '' : existing.backlinkCheckedAt
  }
  const nextFriends = [friend, ...friends.filter((item) => item.id !== friend.id)]
  const audit = createAdminAuditTrail(existing, friend, [
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
    { key: 'order', label: '排序' },
    { key: 'checkStatus', label: '巡检状态' }
  ])

  await writeFriends(nextFriends)
  await writeAdminLog({
    action: friends.some((item) => item.id === friend.id) ? 'friend.update' : 'friend.create',
    targetType: 'friend',
    targetId: friend.id,
    message: appendAuditSummary(`保存友链：${friend.name}`, audit),
    payload: withAuditPayload({
      url: friend.url,
      status: friend.status
    }, audit)
  }).catch(() => {})

  return friend
})
