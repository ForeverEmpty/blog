export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  try {
    return await previewAdminBackupRestore(body)
  } catch (error) {
    return {
      valid: false,
      app: 'ChankoBlog',
      version: 1,
      scope: 'full',
      createdAt: '',
      fileCount: 0,
      totalBytes: 0,
      createCount: 0,
      overwriteCount: 0,
      changedCount: 0,
      unchangedCount: 0,
      sections: [],
      files: [],
      database: {
        walineComments: 0,
        adminLogs: 0,
        articleVersions: 0,
        articleAutosaves: 0,
        errors: []
      },
      warnings: [],
      errors: [error instanceof Error ? error.message : '备份预览生成失败']
    }
  }
})
