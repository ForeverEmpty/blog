type SortableArticle = {
  date?: string
  pinned?: boolean
}

export const compareArticles = (a: SortableArticle, b: SortableArticle) => (
  Number(b.pinned === true) - Number(a.pinned === true)
  || String(b.date || '').localeCompare(String(a.date || ''))
)

export const sortArticles = <T extends SortableArticle>(articles: T[]) => (
  [...articles].sort(compareArticles)
)
