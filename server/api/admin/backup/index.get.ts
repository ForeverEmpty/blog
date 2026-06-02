export default defineEventHandler(async (event) => {
  const backup = await createAdminBackup()
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  setHeader(event, 'Content-Disposition', `attachment; filename="chankoblog-backup-${timestamp}.json"`)
  await writeAdminLog({
    action: 'backup.export',
    targetType: 'backup',
    targetId: timestamp,
    message: `导出备份：${backup.files.length} 个文件`,
    payload: {
      fileCount: backup.files.length,
      database: {
        walineComments: backup.database?.walineComments.length || 0,
        adminLogs: backup.database?.adminLogs.length || 0,
        articleVersions: backup.database?.articleVersions.length || 0,
        articleAutosaves: backup.database?.articleAutosaves.length || 0,
        errors: backup.database?.errors || []
      },
      createdAt: backup.createdAt
    }
  }).catch(() => {})

  return backup
})
