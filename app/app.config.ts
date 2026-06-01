export default defineAppConfig({
  site: {
    name: 'ChankoBlog',
    initials: 'CB',
    description: '一个面向写作、思考与发布的 Nuxt 4 博客。',
    homeHref: '/',
    homeAriaLabel: 'ChankoBlog 首页',
    author: 'Chanko',
    locale: 'zh-CN'
  },
  seo: {
    defaultTitle: 'ChankoBlog',
    titleTemplate: '%s - ChankoBlog',
    siteUrl: 'http://localhost:3000',
    defaultImage: '/favicon.ico',
    feed: {
      rss: '/rss.xml',
      atom: '/atom.xml',
      json: '/feed.json'
    }
  },
  navigation: {
    main: [
      { label: '首页', href: '/' },
      { label: '文章', href: '/blog' },
      { label: '归档', href: '/archive' },
      { label: '项目', href: '/projects' },
      { label: '友链', href: '/friends' },
      { label: '关于', href: '/about' }
    ],
    admin: {
      label: '后台',
      href: '/admin'
    }
  },
  home: {
    eyebrow: 'No Longer Expecting / No Longer Relying',
    title: 'ChankoBlog',
    structureLink: {
      label: '查看文章',
      href: '#writing-index'
    },
    articleIndex: {
      words: ['写作', '思考', '记录', '发布'],
      title: '近日文章',
      description: '按发布时间展示最新文章，适合从近处开始阅读。',
      states: [
        '最新发布',
        '阅读路径',
        '持续更新'
      ]
    },
    projectIndex: {
      words: ['项目', '工具', '部署', '源码'],
      title: '近期项目',
      description: '从首页直接进入已上线的工具、实验和源码仓库。'
    }
  },
  blogList: {
    eyebrow: 'Writing Index',
    title: '文章目录',
    pageSize: 5,
    description: '所有文章按发布时间倒序排列，保留分类、标签和摘要，方便快速找到想读的内容。',
    emptyKicker: 'Writing Queue',
    emptyTitle: '文章正在整理中。',
    emptyDescription: '新的文章发布后会出现在这里。你也可以先回到首页查看最近更新。',
    integrationDescription: '灵光乍现，日常记录，技术分享，都在这里找到。',
    integrationItems: [
      '最新发布',
      '分类索引',
      '标签线索'
    ],
    homeAction: {
      label: '返回首页',
      href: '/'
    }
  },
  aiSummary: {
    enabled: true,
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-5.5',
    temperature: 0.2,
    maxTokens: 700
  },
  comments: {
    enabled: true,
    provider: 'waline',
    waline: {
      serverURL: 'http://localhost:8360',
      lang: 'zh-CN',
      pageSize: 10,
      wordLimit: 1600,
      login: 'enable',
      commentSorting: 'latest',
      meta: ['nick', 'mail', 'link'],
      requiredMeta: ['nick', 'mail']
    }
  },
  archive: {
    eyebrow: 'Archive',
    title: '归档',
    description: '按年份和月份整理全部文章，把零散记录收束成一条清楚的时间线。',
    emptyKicker: 'Timeline',
    emptyTitle: '时间线正在等待第一篇文章。',
    emptyDescription: '发布文章后，归档会自动按日期分组，形成可折叠的阅读时间线。',
    integrationDescription: '回忆过去，记录现在，规划未来。',
    integrationItems: [
      '年份分组',
      '月份折叠',
      '时间回看'
    ],
    primaryAction: {
      label: '查看文章目录',
      href: '/blog'
    }
  },
  projects: {
    eyebrow: 'Projects',
    title: '项目',
    pageSize: 4,
    description: '这里整理公开项目、独立工具和实验页面，每个条目都提供线上访问入口和源码仓库。',
    emptyKicker: 'Project Shelf',
    emptyTitle: '项目正在整理中。',
    emptyDescription: '公开项目准备完成后，将展示状态、说明、源码和访问入口。',
    integrationDescription: '记录已经落地的工具和实验，方便从作品本身继续追踪源码与部署状态。',
    integrationItems: [
      '上线状态',
      '源码仓库',
      '访问入口'
    ],
    primaryAction: {
      label: '返回文章目录',
      href: '/blog'
    },
    items: [
      {
        name: 'Tomodoro',
        description: '一个独立部署的专注计时项目，提供源码仓库和线上访问入口。',
        status: '已部署',
        category: '工具',
        sourceUrl: 'https://github.com/ForeverEmpty/Tomodoro',
        launchUrl: 'https://foreverempty.github.io/Tomodoro/#/',
        tags: ['GitHub Pages', 'Timer', 'Productivity']
      }
    ]
  },
  friends: {
    eyebrow: 'Friends',
    title: '友链',
    description: '这里收藏长期阅读、互相访问和持续更新的站点。友链更像一张安静的地图，把分散的创作者连接起来。',
    emptyKicker: 'Open List',
    emptyTitle: '欢迎交换友链。',
    emptyDescription: '如果你的站点保持原创、稳定访问，并愿意互相放置链接，可以通过关于页面联系我。',
    profileTitle: '本站信息',
    profileDescription: '用于交换友链时复制的基础信息。',
    siteProfile: {
      name: 'ChankoBlog',
      url: '/',
      urlLabel: '当前站点',
      description: '一个面向写作、思考与发布的 Nuxt 4 博客。',
      avatarText: 'CB',
      tags: ['Nuxt', 'Writing', 'Blog']
    },
    exchangeTitle: '交换原则',
    exchangeDescription: '更倾向于收录个人长期维护的站点，而不是一次性活动页或纯聚合页面。',
    exchangeItems: [
      '原创内容',
      '稳定访问',
      '互相链接'
    ],
    primaryAction: {
      label: '联系交换',
      href: '/about'
    },
    items: []
  },
  footer: {
    description: '',
    homeAriaLabel: '回到 ChankoBlog 首页顶部',
    links: [
      { label: '首页', href: '/' },
      { label: '文章', href: '/blog' },
      { label: '归档', href: '/archive' },
      { label: '项目', href: '/projects' },
      { label: '友链', href: '/friends' },
      { label: '关于', href: '/about' }
    ],
    feeds: [
      { label: 'RSS', href: '/rss.xml' },
      { label: 'Atom', href: '/atom.xml' },
      { label: 'JSON Feed', href: '/feed.json' }
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
