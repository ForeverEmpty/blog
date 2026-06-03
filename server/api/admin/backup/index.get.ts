export default defineEventHandler(async (event) => {
  const scope = normalizeAdminBackupScope(getQuery(event).scope)
  const backup = await createAdminBackup(scope)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  setHeader(event, 'Content-Disposition', `attachment; filename="chankoblog-backup-${scope}-${timestamp}.json"`)
  await writeAdminLog({
    action: 'backup.export',
    targetType: 'backup',
    targetId: `${scope}-${timestamp}`,
    message: `导出${scope === 'full' ? '完整' : '局部'}备份：${backup.files.length} 个文件`,
    payload: {
      scope,
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
