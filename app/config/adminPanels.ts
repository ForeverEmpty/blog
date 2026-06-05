import type { AdminPanelItem } from '~/types/admin'

export const adminPanels: AdminPanelItem[] = [
  { key: 'overview', label: '总览', icon: 'lucide:layout-dashboard' },
  { key: 'articles', label: '文章', icon: 'lucide:file-pen-line' },
  { key: 'media', label: '媒体', icon: 'lucide:images' },
  { key: 'projects', label: '项目', icon: 'lucide:folder-kanban' },
  { key: 'friends', label: '友链', icon: 'lucide:link' },
  { key: 'comments', label: '评论', icon: 'lucide:message-square-text' },
  { key: 'notifications', label: '通知', icon: 'lucide:bell' },
  { key: 'about', label: '关于', icon: 'lucide:user-round-pen' },
  { key: 'seo', label: 'SEO', icon: 'lucide:search-check' },
  { key: 'backup', label: '备份', icon: 'lucide:database-backup' },
  { key: 'logs', label: '日志', icon: 'lucide:scroll-text' }
]
