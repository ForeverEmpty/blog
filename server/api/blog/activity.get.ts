export default defineEventHandler(async (event) => {
  setHeader(event, 'cache-control', 'private, max-age=0, must-revalidate')

  const articles = await readPublicArticles()

  return articles
    .map((article) => ({
      path: article.path,
      title: article.title,
      date: article.date
    }))
})
