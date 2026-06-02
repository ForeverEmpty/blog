export type AdminMarkdownTemplate = {
  label: string
  icon?: string
  content: string
  placeholder?: string
  block?: boolean
}

export const adminMarkdownTemplates: AdminMarkdownTemplate[] = [
  {
    label: '提示',
    icon: 'lucide:info',
    content: '::tip\n{selection}\n::\n{cursor}',
    placeholder: '提示内容',
    block: true
  },
  {
    label: '警告',
    icon: 'lucide:triangle-alert',
    content: '::warning\n{selection}\n::\n{cursor}',
    placeholder: '警告内容',
    block: true
  },
  {
    label: '表格',
    icon: 'lucide:table',
    content: '| 项目 | 说明 |\n| --- | --- |\n| {selection} | 内容 |\n{cursor}',
    placeholder: '名称',
    block: true
  },
  {
    label: '图片',
    icon: 'lucide:image-plus',
    content: '![{selection}](/media/image.png)\n{cursor}',
    placeholder: '图片描述',
    block: true
  }
]
