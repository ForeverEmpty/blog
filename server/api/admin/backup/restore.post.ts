export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const result = await restoreAdminBackup(body)

  await writeAdminLog({
    action: 'backup.restore',
    targetType: 'backup',
    targetId: result.restorePoint.path,
    message: `恢复备份：${result.restoredCount} 个文件`,
    payload: {
      restoredCount: result.restoredCount,
      restoredBytes: result.restoredBytes,
      restorePoint: result.restorePoint,
      database: result.database
    }
  }).catch(() => {})

  return result
})
