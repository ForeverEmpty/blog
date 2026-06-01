export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event)
  const files = (formData || []).filter((item) => item.filename)

  if (files.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Media file is required'
    })
  }

  const assets = await Promise.all(
    files.map((file) => saveUploadedMedia({
      filename: file.filename,
      type: file.type,
      data: file.data
    }))
  )

  await writeAdminLog({
    action: 'media.upload',
    targetType: 'media',
    targetId: assets.map((asset) => asset.name).join(','),
    message: `上传媒体：${assets.length} 个文件`,
    payload: {
      files: assets.map((asset) => asset.name)
    }
  }).catch(() => {})

  return assets
})
