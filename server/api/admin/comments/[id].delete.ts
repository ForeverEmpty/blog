export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''

  await deleteWalineComment(id)

  return { ok: true }
})
