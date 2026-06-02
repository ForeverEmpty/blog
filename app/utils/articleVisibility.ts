type PublicArticleCandidate = {
  workflowStatus?: string
  published?: boolean | number | string
  scheduledAt?: string
  meta?: {
    workflowStatus?: string
    scheduledAt?: string
  }
}

const getArticleWorkflowStatus = (article: PublicArticleCandidate) => (
  article.workflowStatus || article.meta?.workflowStatus
)

const getArticleScheduledAt = (article: PublicArticleCandidate) => (
  article.scheduledAt || article.meta?.scheduledAt
)

const isPublishedValue = (value: PublicArticleCandidate['published']) => (
  value === true || value === 1 || value === 'true' || value === '1'
)

export const isScheduledArticleReady = (article: PublicArticleCandidate) => {
  const scheduledAt = getArticleScheduledAt(article)

  if (!scheduledAt) {
    return false
  }

  const timestamp = Date.parse(scheduledAt)

  return !Number.isNaN(timestamp) && timestamp <= Date.now()
}

export const isPublicArticle = (article: PublicArticleCandidate) => {
  const workflowStatus = getArticleWorkflowStatus(article)

  if (workflowStatus) {
    return workflowStatus === 'published' ||
      (workflowStatus === 'scheduled' && isScheduledArticleReady(article))
  }

  return isPublishedValue(article.published)
}
