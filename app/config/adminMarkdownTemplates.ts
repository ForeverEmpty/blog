export type AdminMarkdownTemplate = {
  label: string
  icon?: string
  content: string
  placeholder?: string
  block?: boolean
}

export type AdminMarkdownTemplateGroup = {
  group: string
  templates: AdminMarkdownTemplate[]
}

export const adminMarkdownTemplates: AdminMarkdownTemplateGroup[] = [
  {
    group: '提示块',
    templates: [
      {
        label: '普通',
        icon: 'lucide:file-text',
        content: '::normal\n{selection}\n::\n{cursor}',
        placeholder: '普通提示内容',
        block: true
      },
      {
        label: '提示',
        icon: 'lucide:info',
        content: '::tip\n{selection}\n::\n{cursor}',
        placeholder: '提示内容',
        block: true
      },
      {
        label: '成功',
        icon: 'lucide:circle-check',
        content: '::success\n{selection}\n::\n{cursor}',
        placeholder: '成功提示内容',
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
        label: '危险',
        icon: 'lucide:circle-alert',
        content: '::danger\n{selection}\n::\n{cursor}',
        placeholder: '危险提示内容',
        block: true
      }
    ]
  },
  {
    group: '内容结构',
    templates: [
      {
        label: '表格',
        icon: 'lucide:table',
        content: '| 项目 | 说明 |\n| --- | --- |\n| {selection} | 内容 |\n{cursor}',
        placeholder: '名称',
        block: true
      },
      {
        label: '链接卡片',
        icon: 'lucide:panel-top-open',
        content: '::link-card{href="https://example.com" title="{selection}" description="链接说明" label="External Link"}\n::\n{cursor}',
        placeholder: '链接标题',
        block: true
      },
      {
        label: '代码组',
        icon: 'lucide:square-code',
        content: '::code-group\n```ts [example.ts]\n{selection}\n```\n::\n{cursor}',
        placeholder: 'const value = true',
        block: true
      }
    ]
  },
  {
    group: '媒体',
    templates: [
      {
        label: '图片',
        icon: 'lucide:image-plus',
        content: '![{selection}](/media/image.png)\n{cursor}',
        placeholder: '图片描述',
        block: true
      },
      {
        label: '隐私图片',
        icon: 'lucide:eye-off',
        content: '::sensitive-image{src="/media/image.png" alt="{selection}" title="图片标题" sensitive="这张图片需要读者主动确认后再显示。" description="点击显示前不会渲染真实图片。"}\n::\n{cursor}',
        placeholder: '图片描述',
        block: true
      },
      {
        label: '视频',
        icon: 'lucide:film',
        content: '::content-video{src="/media/video.mp4" poster="/favicon.svg" title="{selection}" description="视频说明"}\n::\n{cursor}',
        placeholder: '视频标题',
        block: true
      }
    ]
  }
]
