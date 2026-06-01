import Fuse from 'fuse.js'

type SearchableContentKind = 'article' | 'project'

type SearchableContentItem = {
  id?: string
  slug?: string
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
  markdown?: string
  published?: boolean
  locked?: boolean
  pinned?: boolean
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
  pinned?: boolean
}

type ArticleSearchFilters = {
  terms: string[]
  excludedTerms: string[]
  types: SearchableContentKind[]
  excludedTypes: SearchableContentKind[]
  categories: string[]
  excludedCategories: string[]
  tags: string[]
  excludedTags: string[]
  titles: string[]
  excludedTitles: string[]
  descriptions: string[]
  excludedDescriptions: string[]
  authors: string[]
  excludedAuthors: string[]
  statuses: string[]
  excludedStatuses: string[]
  dates: string[]
  excludedDates: string[]
  locked: boolean[]
  pinned: boolean[]
  published: boolean[]
}

const normalizeSearchValue = (value: unknown) => String(value || '').trim().toLocaleLowerCase()
const unwrapQuotedSearchValue = (value: string) => value.trim().replace(/^["']|["']$/g, '')

const tokenizeArticleSearch = (input: string) => (
  input.match(/[^\s=:]+[=:]"[^"]*"|[^\s=:]+[=:]'[^']*'|"[^"]*"|'[^']*'|\S+/g) || []
).map((token) => token.replace(/^["']|["']$/g, ''))

const parseArticleSearch = (input: string): ArticleSearchFilters => {
  const filters: ArticleSearchFilters = {
    terms: [],
    excludedTerms: [],
    types: [],
    excludedTypes: [],
    categories: [],
    excludedCategories: [],
    tags: [],
    excludedTags: [],
    titles: [],
    excludedTitles: [],
    descriptions: [],
    excludedDescriptions: [],
    authors: [],
    excludedAuthors: [],
    statuses: [],
    excludedStatuses: [],
    dates: [],
    excludedDates: [],
    locked: [],
    pinned: [],
    published: []
  }

  for (const token of tokenizeArticleSearch(input)) {
    const excluded = token.startsWith('-') || token.startsWith('!')
    const normalizedToken = excluded ? token.slice(1) : token
    const separatorIndex = normalizedToken.search(/[=:]/)

    if (separatorIndex <= 0) {
      const value = unwrapQuotedSearchValue(normalizedToken)

      if (!value) {
        continue
      }

      ;(excluded ? filters.excludedTerms : filters.terms).push(value)
      continue
    }

    const key = normalizeSearchValue(normalizedToken.slice(0, separatorIndex))
    const value = unwrapQuotedSearchValue(normalizedToken.slice(separatorIndex + 1))

    if (!value) {
      continue
    }

    if (['type', 'kind', '类型'].includes(key)) {
      const normalizedType = normalizeSearchValue(value)
      const target = excluded ? filters.excludedTypes : filters.types

      if (['article', 'post', '文章'].includes(normalizedType)) {
        target.push('article')
      } else if (['project', '项目'].includes(normalizedType)) {
        target.push('project')
      }
    } else if (['category', 'cat', '分类'].includes(key)) {
      ;(excluded ? filters.excludedCategories : filters.categories).push(value)
    } else if (['tag', 'tags', '标签'].includes(key)) {
      ;(excluded ? filters.excludedTags : filters.tags).push(value)
    } else if (['title', 'name', '标题', '名称'].includes(key)) {
      ;(excluded ? filters.excludedTitles : filters.titles).push(value)
    } else if (['description', 'desc', 'summary', 'intro', '摘要', '简介'].includes(key)) {
      ;(excluded ? filters.excludedDescriptions : filters.descriptions).push(value)
    } else if (['author', '作者'].includes(key)) {
      ;(excluded ? filters.excludedAuthors : filters.authors).push(value)
    } else if (['status', 'state', '状态'].includes(key)) {
      ;(excluded ? filters.excludedStatuses : filters.statuses).push(value)
    } else if (['date', 'year', '日期', '年份'].includes(key)) {
      ;(excluded ? filters.excludedDates : filters.dates).push(value)
    } else if (['locked', 'lock', '上锁', '锁定'].includes(key)) {
      const booleanValue = parseSearchBoolean(value)

      if (typeof booleanValue === 'boolean' && !excluded) {
        filters.locked.push(booleanValue)
      }
    } else if (['pinned', 'pin', '置顶'].includes(key)) {
      const booleanValue = parseSearchBoolean(value)

      if (typeof booleanValue === 'boolean' && !excluded) {
        filters.pinned.push(booleanValue)
      }
    } else if (['published', 'publish', '发布'].includes(key)) {
      const booleanValue = parseSearchBoolean(value)

      if (typeof booleanValue === 'boolean' && !excluded) {
        filters.published.push(booleanValue)
      }
    } else {
      ;(excluded ? filters.excludedTerms : filters.terms).push(normalizedToken)
    }
  }

  return filters
}

const parseSearchBoolean = (value: string) => {
  const normalized = normalizeSearchValue(value)

  if (['1', 'true', 'yes', 'y', 'on', '是', '已', '已发布', '已上锁', '已锁定', '已置顶'].includes(normalized)) {
    return true
  }

  if (['0', 'false', 'no', 'n', 'off', '否', '未', '草稿', '未发布', '未上锁', '未锁定', '未置顶'].includes(normalized)) {
    return false
  }

  return undefined
}

const fieldIncludes = (value: unknown, expected: string) => (
  normalizeSearchValue(value).includes(normalizeSearchValue(expected))
)

const listIncludes = (values: unknown[] | undefined, expected: string) => (
  (values || []).some((value) => fieldIncludes(value, expected))
)

const fieldMatchesAny = (value: unknown, expectedValues: string[]) => (
  expectedValues.length === 0 || expectedValues.some((expected) => fieldIncludes(value, expected))
)

const listMatchesAny = (values: unknown[] | undefined, expectedValues: string[]) => (
  expectedValues.length === 0 || expectedValues.some((expected) => listIncludes(values, expected))
)

const fieldExcludesAll = (value: unknown, excludedValues: string[]) => (
  excludedValues.every((excluded) => !fieldIncludes(value, excluded))
)

const listExcludesAll = (values: unknown[] | undefined, excludedValues: string[]) => (
  excludedValues.every((excluded) => !listIncludes(values, excluded))
)

const booleanMatches = (value: unknown, expectedValues: boolean[]) => (
  expectedValues.length === 0 || expectedValues.includes(Boolean(value))
)

const itemType = (item: SearchableContentItem) => item.type || 'article'

const itemStatusTokens = (item: SearchableContentItem) => [
  item.status,
  item.type === 'project' ? '' : item.published === false ? '草稿 draft unpublished 未发布' : '已发布 published',
  item.locked ? '已上锁 已锁定 locked' : '未上锁 未锁定 unlocked',
  item.pinned ? '已置顶 pinned' : '未置顶 unpinned',
  item.type === 'project' ? '项目 project' : '文章 article'
].filter(Boolean).join(' ')

const articleMatchesSearch = (article: SearchableArticle, filters: ArticleSearchFilters) => {
  return (
    (filters.types.length === 0 || filters.types.includes('article')) &&
    !filters.excludedTypes.includes('article') &&
    filters.terms.every((term) => searchableContentText(article).includes(normalizeSearchValue(term))) &&
    filters.excludedTerms.every((term) => !searchableContentText(article).includes(normalizeSearchValue(term))) &&
    fieldMatchesAny(article.category, filters.categories) &&
    fieldExcludesAll(article.category, filters.excludedCategories) &&
    listMatchesAny(article.tags, filters.tags) &&
    listExcludesAll(article.tags, filters.excludedTags) &&
    fieldMatchesAny(article.title, filters.titles) &&
    fieldExcludesAll(article.title, filters.excludedTitles) &&
    fieldMatchesAny(article.description, filters.descriptions) &&
    fieldExcludesAll(article.description, filters.excludedDescriptions) &&
    fieldMatchesAny(article.author, filters.authors) &&
    fieldExcludesAll(article.author, filters.excludedAuthors) &&
    fieldMatchesAny(article.date, filters.dates) &&
    fieldExcludesAll(article.date, filters.excludedDates) &&
    fieldMatchesAny(itemStatusTokens(article), filters.statuses) &&
    fieldExcludesAll(itemStatusTokens(article), filters.excludedStatuses) &&
    booleanMatches(article.locked, filters.locked) &&
    booleanMatches(article.pinned, filters.pinned) &&
    booleanMatches(article.published, filters.published)
  )
}

const searchableContentText = (item: SearchableContentItem) => [
  item.id,
  item.slug,
  item.type,
  item.title,
  item.name,
  item.description,
  item.category,
  item.author,
  item.status,
  itemStatusTokens(item),
  item.date,
  item.path,
  item.launchUrl,
  item.sourceUrl,
  item.markdown,
  ...(item.tags || [])
].map(normalizeSearchValue).join(' ')

const contentMatchesStructuredFilters = (item: SearchableContentItem, filters: ArticleSearchFilters) => (
  (filters.types.length === 0 || filters.types.includes(itemType(item))) &&
  !filters.excludedTypes.includes(itemType(item)) &&
  fieldMatchesAny(item.category, filters.categories) &&
  fieldExcludesAll(item.category, filters.excludedCategories) &&
  listMatchesAny(item.tags, filters.tags) &&
  listExcludesAll(item.tags, filters.excludedTags) &&
  fieldMatchesAny(item.title || item.name, filters.titles) &&
  fieldExcludesAll(item.title || item.name, filters.excludedTitles) &&
  fieldMatchesAny(item.description, filters.descriptions) &&
  fieldExcludesAll(item.description, filters.excludedDescriptions) &&
  fieldMatchesAny(item.author, filters.authors) &&
  fieldExcludesAll(item.author, filters.excludedAuthors) &&
  fieldMatchesAny(item.date, filters.dates) &&
  fieldExcludesAll(item.date, filters.excludedDates) &&
  fieldMatchesAny(itemStatusTokens(item), filters.statuses) &&
  fieldExcludesAll(itemStatusTokens(item), filters.excludedStatuses) &&
  booleanMatches(item.locked, filters.locked) &&
  booleanMatches(item.pinned, filters.pinned) &&
  booleanMatches(item.published, filters.published) &&
  filters.excludedTerms.every((term) => !searchableContentText(item).includes(normalizeSearchValue(term)))
)

const getSearchHighlightTerms = (input: string) => {
  const filters = parseArticleSearch(input)

  return Array.from(new Set([
    ...filters.terms,
    ...filters.categories,
    ...filters.tags,
    ...filters.titles,
    ...filters.descriptions,
    ...filters.authors,
    ...filters.statuses,
    ...filters.dates
  ].map((term) => term.trim()).filter((term) => term.length > 1)))
}

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
      { name: 'status', weight: 0.8 },
      { name: 'date', weight: 0.6 },
      { name: 'path', weight: 0.5 },
      { name: 'sourceUrl', weight: 0.4 },
      { name: 'launchUrl', weight: 0.4 },
      { name: 'markdown', weight: 0.25 }
    ],
    threshold: 0.34,
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
  getSearchHighlightTerms,
  searchContentItems
})
