export default defineAppConfig({
  site: {
    name: 'ChankoBlog',
    initials: 'CB',
    homeHref: '/',
    homeAriaLabel: 'ChankoBlog 首页'
  },
  navigation: {
    main: [
      { label: '首页', href: '/' },
      { label: '文章', href: '/blog' },
      { label: '归档', href: '/archive' },
      { label: '项目', href: '/projects' },
      { label: '关于', href: '/about' }
    ],
    admin: {
      label: '后台',
      href: '#'
    }
  },
  home: {
    eyebrow: 'No Longer Expecting / No Longer Relying',
    title: 'ChankoBlog',
    structureLink: {
      label: '查看首页结构',
      href: '#writing-index'
    },
    articleIndex: {
      words: ['写作', '思考', '记录', '发布'],
      states: [
        '接入文章接口后显示最新发布',
        '接入后台后显示精选文章',
        '接入标签后显示阅读路径'
      ]
    }
  },
  blogList: {
    eyebrow: 'Writing Index',
    title: '文章目录',
    description: '所有已发布文章会在这里按时间整理。当前后台内容接口尚未接入，因此页面先呈现真实的空状态与列表框架。',
    emptyKicker: 'Content API Pending',
    emptyTitle: '还没有可展示的文章。',
    emptyDescription: '接入文章接口后，这里会显示已发布内容、分类与阅读状态；在此之前不编造文章、日期或阅读数据。',
    integrationDescription: '列表页先保留阅读入口的结构：标题区负责定位，列表区承载真实内容，接入项用于标记后续后台数据需要提供的字段。',
    integrationItems: [
      'Article API',
      'Publish Status',
      'Category Fields'
    ],
    homeAction: {
      label: '返回首页',
      href: '/'
    }
  },
  archive: {
    eyebrow: 'Archive',
    title: '归档',
    description: '文章会在这里按年份、月份和发布状态收束成一条清楚的时间线。当前内容接口尚未接入，因此只保留真实空状态。',
    emptyKicker: 'Timeline Pending',
    emptyTitle: '还没有可归档的文章。',
    emptyDescription: '接入文章接口后，这里会按发布时间生成归档节点；在此之前不生成虚构年份、月份或文章数量。',
    integrationDescription: '归档页需要后台提供稳定的发布日期、发布状态和文章 slug。页面先把阅读路径留出来，避免用假时间线填充空间。',
    integrationItems: [
      'Published Date',
      'Article Slug',
      'Archive Grouping'
    ],
    primaryAction: {
      label: '查看文章目录',
      href: '/blog'
    }
  },
  projects: {
    eyebrow: 'Projects',
    title: '项目',
    description: '这里用于展示博客相关工具、实验页面和公开项目。当前项目数据尚未接入，因此先呈现可扩展的项目索引结构。',
    emptyKicker: 'Project API Pending',
    emptyTitle: '还没有公开项目。',
    emptyDescription: '接入项目数据后，这里会展示项目名称、状态、链接和说明；在此之前不编造仓库、进度或上线地址。',
    integrationDescription: '项目页更接近作品目录：它需要清晰区分已发布、实验中和内部使用的项目，后续可以直接接入后台管理字段。',
    integrationItems: [
      'Project Status',
      'Repository Link',
      'Launch URL'
    ],
    primaryAction: {
      label: '返回文章目录',
      href: '/blog'
    }
  },
  footer: {
    description: '一个面向写作、思考与发布的 Nuxt 4 博客。页面以文字为主角，让后台和内容系统逐步接入。',
    homeAriaLabel: '回到 ChankoBlog 首页顶部',
    links: [
      { label: '首页', href: '/' },
      { label: '文章', href: '/blog' },
      { label: '归档', href: '/archive' },
      { label: '项目', href: '/projects' },
      { label: '关于', href: '/about' }
    ]
  },
  error: {
    eyebrow: 'Error State',
    notFoundTitle: '这页没有写入目录。',
    fallbackTitle: '页面暂时无法打开。',
    notFoundDescription: '地址可能已经移动，或这篇内容还没有发布。',
    fallbackDescription: '服务没有返回可展示的页面。可以返回首页，或稍后重试当前地址。',
    homeAction: '返回首页',
    retryAction: '重试当前页'
  }
})
