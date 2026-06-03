const toDateKey = (date: Date) => date.toISOString().slice(0, 10)

const createDateRange = (days: number) => {
  const now = new Date()

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(now)

    date.setUTCDate(now.getUTCDate() - (days - index - 1))

    return toDateKey(date)
  })
}

const sumDailyViews = (daily: Record<string, number> | undefined, dates: string[]) => (
  dates.reduce((total, date) => total + Math.max(0, Number(daily?.[date]) || 0), 0)
)

export default defineEventHandler(async (event) => {
  requireAdminAuth(event)

  const [articles, views] = await Promise.all([
    readArticles(),
    readArticleViews()
  ])
  const trendDates = createDateRange(30)
  const last7Dates = trendDates.slice(-7)
  const totalViews = articles.reduce((total, article) => {
    const record = views[article.slug]

    return total + Math.max(Math.max(0, Number(article.views) || 0), Math.max(0, Number(record?.total) || 0))
  }, 0)
  const articleStats = articles.map((article) => {
    const record = views[article.slug]
    const articleViews = Math.max(Math.max(0, Number(article.views) || 0), Math.max(0, Number(record?.total) || 0))

    return {
      slug: article.slug,
      title: article.title,
      category: article.category,
      workflowStatus: article.workflowStatus,
      published: article.published,
      locked: article.locked,
      pinned: article.pinned,
      views: articleViews,
      share: totalViews > 0 ? articleViews / totalViews : 0,
      recentVisitors: Object.keys(record?.recentVisitors || {}).length,
      updatedAt: record?.updatedAt || '',
      last7Days: sumDailyViews(record?.daily, last7Dates)
    }
  })
  const trend = trendDates.map((date) => {
    const dailyArticles = articles
      .map((article) => ({
        slug: article.slug,
        title: article.title,
        category: article.category,
        views: Math.max(0, Number(views[article.slug]?.daily?.[date]) || 0)
      }))
      .filter((article) => article.views > 0)
      .sort((a, b) => b.views - a.views || a.title.localeCompare(b.title, 'zh-CN'))
    const dailyViews = dailyArticles.reduce((total, article) => total + article.views, 0)

    return {
      date,
      label: date.slice(5),
      views: dailyViews,
      topArticles: dailyArticles.slice(0, 3)
    }
  })
  const sortedByViews = [...articleStats].sort((a, b) => b.views - a.views)
  const sortedByUpdatedAt = [...articleStats]
    .filter((article) => article.updatedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const quietArticles = [...articleStats]
    .filter((article) => article.published && article.views === 0)
    .sort((a, b) => a.title.localeCompare(b.title))

  return {
    totalViews,
    trackedArticles: articleStats.filter((article) => article.views > 0).length,
    activeVisitors: articleStats.reduce((total, article) => total + article.recentVisitors, 0),
    updatedAt: sortedByUpdatedAt[0]?.updatedAt || '',
    trend,
    topArticles: sortedByViews.slice(0, 8),
    recentArticles: sortedByUpdatedAt.slice(0, 6),
    quietArticles: quietArticles.slice(0, 6)
  }
})
