import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { CommentModerationConfig } from '~~/server/utils/commentModeration'

const rulesFilePath = () => resolve(process.cwd(), 'app', 'config', 'commentModerationRules.ts')

const serializeCommentModerationRules = (rules: Required<CommentModerationConfig>) => (
  `export const commentModerationRules = ${JSON.stringify(rules, null, 2)}\n`
)

export const saveCommentModerationRulesFile = async (rules: CommentModerationConfig) => {
  const normalizedRules = normalizeCommentModerationRules(rules)

  await writeFile(rulesFilePath(), serializeCommentModerationRules(normalizedRules), 'utf8')
  setRuntimeCommentModerationRules(normalizedRules)

  return normalizedRules
}
