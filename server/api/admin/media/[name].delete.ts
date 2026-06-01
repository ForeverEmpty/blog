export default defineEventHandler(async (event) => {
  const name = getRouterParam(event, 'name') || ''

  assertSafeMediaName(name)
  await deleteMediaAsset(name)
  await writeAdminLog({
    action: 'media.delete',
    targetType: 'media',
    targetId: name,
    message: `删除媒体：${name}`
  }).catch(() => {})

  return { ok: true }
})
