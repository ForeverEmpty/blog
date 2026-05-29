import type { WalineCommentStatus } from '~~/server/utils/walineComments'

const allowedStatuses = new Set(['approved', 'waiting', 'spam'])

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') || ''
  const body = await readBody<{ status?: WalineCommentStatus }>(event)

  if (!allowedStatuses.has(String(body.status))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid comment status'
    })
  }

  return updateWalineCommentStatus(id, body.status as WalineCommentStatus)
})
