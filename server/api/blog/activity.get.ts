import { isArticlePublic, readArticles } from '../../utils/adminStorage'

export default defineEventHandler(async () => {
  const articles = await readArticles()

  return articles
    .filter(isArticlePublic)
    .map((article) => ({
      path: article.path,
      title: article.title,
      date: article.date
    }))
})
