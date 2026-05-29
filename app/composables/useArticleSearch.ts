import Fuse from 'fuse.js'

type SearchableContentKind = 'article' | 'project'

type SearchableContentItem = {
  type?: SearchableContentKind
  title?: string
  name?: string
  description?: string
  category?: string
  tags?: string[]
  author?: string
  status?: string
  date?: string
  path?: string
  launchUrl?: string
  sourceUrl?: string
  published?: boolean
  locked?: boolean
}

type SearchableArticle = {
  title?: string
  description?: string
  category?: string
  tags?: string[]
  author?: string
  date?: string
  published?: boolean
  locked?: boolean
}

type ArticleSearchFilters = {
  terms: string[]
  types: SearchableContentKind[]
  categories: string[]
  tags: string[]
  titles: string[]
  descriptions: string[]
  authors: string[]
  statuses: string[]
}

const normalizeSearchValue = (value: unknown) => String(value || '').trim().toLocaleLowerCase()

const tokenizeArticleSearch = (input: string) => (
  input.match(/"[^"]*"|'[^']*'|\S+/g) || []
).map((token) => token.replace(/^["']|["']$/g, ''))

const parseArticleSearch = (input: string): ArticleSearchFilters => {
  const filters: ArticleSearchFilters = {
    terms: [],
    types: [],
    categories: [],
    tags: [],
    titles: [],
    descriptions: [],
    authors: [],
    statuses: []
  }

  for (const token of tokenizeArticleSearch(input)) {
    const separatorIndex = token.search(/[=:]/)

    if (separatorIndex <= 0) {
      filters.terms.push(token)
      continue
    }

    const key = normalizeSearchValue(token.slice(0, separatorIndex))
    const value = token.slice(separatorIndex + 1).trim()

    if (!value) {
      continue
    }

    if (['type', 'kind', '类型'].includes(key)) {
      const normalizedType = normalizeSearchValue(value)

      if (['article', 'post', '文章'].includes(normalizedType)) {
        filters.types.push('article')
      } else if (['project', '项目'].includes(normalizedType)) {
        filters.types.push('project')
      }
    } else if (['category', 'cat', '分类'].includes(key)) {
      filters.categories.push(value)
    } else if (['tag', 'tags', '标签'].includes(key)) {
      filters.tags.push(value)
    } else if (['title', '标题'].includes(key)) {
      filters.titles.push(value)
    } else if (['description', 'desc', '摘要'].includes(key)) {
      filters.descriptions.push(value)
    } else if (['author', '作者'].includes(key)) {
      filters.authors.push(value)
    } else if (['status', '状态'].includes(key)) {
      filters.statuses.push(value)
    } else {
      filters.terms.push(token)
    }
  }

  return filters
}

const fieldIncludes = (value: unknown, expected: string) => (
  normalizeSearchValue(value).includes(normalizeSearchValue(expected))
)

const listIncludes = (values: unknown[] | undefined, expected: string) => (
  (values || []).some((value) => fieldIncludes(value, expected))
)

const articleMatchesSearch = (article: SearchableArticle, filters: ArticleSearchFilters) => {
  return (
    (filters.types.length === 0 || filters.types.includes('article')) &&
    filters.terms.every((term) => searchableContentText(article).includes(normalizeSearchValue(term))) &&
    filters.categories.every((category) => fieldIncludes(article.category, category)) &&
    filters.tags.every((tag) => listIncludes(article.tags, tag)) &&
    filters.titles.every((title) => fieldIncludes(article.title, title)) &&
    filters.descriptions.every((description) => fieldIncludes(article.description, description)) &&
    filters.authors.every((author) => fieldIncludes(article.author, author)) &&
    filters.statuses.length === 0
  )
}

const searchableContentText = (item: SearchableContentItem) => [
  item.title,
  item.name,
  item.description,
  item.category,
  item.author,
  item.status,
  item.date,
  item.path,
  item.launchUrl,
  item.sourceUrl,
  ...(item.tags || [])
].map(normalizeSearchValue).join(' ')

const contentMatchesStructuredFilters = (item: SearchableContentItem, filters: ArticleSearchFilters) => (
  (filters.types.length === 0 || filters.types.includes(item.type || 'article')) &&
  filters.categories.every((category) => fieldIncludes(item.category, category)) &&
  filters.tags.every((tag) => listIncludes(item.tags, tag)) &&
  filters.titles.every((title) => fieldIncludes(item.title || item.name, title)) &&
  filters.descriptions.every((description) => fieldIncludes(item.description, description)) &&
  filters.authors.every((author) => fieldIncludes(item.author, author)) &&
  filters.statuses.every((status) => fieldIncludes(item.status, status))
)

const searchContentItems = <T extends SearchableContentItem>(items: T[], input: string) => {
  const filters = parseArticleSearch(input)
  const candidates = items.filter((item) => contentMatchesStructuredFilters(item, filters))

  if (filters.terms.length === 0) {
    return candidates
  }

  const fuse = new Fuse(candidates, {
    keys: [
      { name: 'title', weight: 3 },
      { name: 'name', weight: 3 },
      { name: 'description', weight: 1.6 },
      { name: 'category', weight: 1.2 },
      { name: 'tags', weight: 1.4 },
      { name: 'author', weight: 0.8 },
      { name: 'status', weight: 0.8 }
    ],
    threshold: 0.38,
    ignoreLocation: true,
    includeScore: true
  })

  const query = filters.terms.join(' ')
  const fuzzyResults = fuse.search(query).map((result) => result.item)
  const normalizedTerms = filters.terms.map(normalizeSearchValue)
  const directResults = candidates.filter((item) => (
    normalizedTerms.every((term) => searchableContentText(item).includes(term))
  ))

  return Array.from(new Set([...directResults, ...fuzzyResults]))
}

export const useArticleSearch = () => ({
  parseArticleSearch,
  articleMatchesSearch,
  searchContentItems
})
