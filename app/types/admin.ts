export type AdminPanel = 'overview' | 'articles' | 'projects' | 'friends' | 'comments'

export type ManagedArticle = {
  id: string
  slug: string
  path: string
  title: string
  description: string
  date: string
  author: string
  authorUrl?: string
  category: string
  published: boolean
  locked: boolean
  views: number
  tags: string[]
  markdown: string
}

export type ManagedProject = {
  id: string
  name: string
  description: string
  status: string
  category: string
  sourceUrl: string
  launchUrl: string
  tags: string[]
}

export type ManagedFriend = {
  id: string
  name: string
  url: string
  icon?: string
  intro?: string
  description: string
  category: string
  status: '待审核' | '已通过' | '已拒绝'
  tags: string[]
}

export type ManagedCommentStatus = 'approved' | 'waiting' | 'spam'

export type ManagedComment = {
  id: string
  objectId: number
  url: string
  articleSlug: string
  author: string
  mail: string
  link: string
  content: string
  ip: string
  userAgent: string
  like: number
  status: ManagedCommentStatus
  createdAt: string
}

export type MarkdownPreviewBlock = {
  startLine: number
  endLine: number
}

export type AdminPanelItem = {
  key: AdminPanel
  label: string
  icon: string
}

export type AdminStat = {
  label: string
  value: string
  detail: string
}

export type PreviewArticle = {
  title: string
  description: string
  date: string
  category: string
  tags: string[]
}
