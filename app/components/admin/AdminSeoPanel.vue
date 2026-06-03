<script setup lang="ts">
import type { ManagedAboutPage, ManagedArticle, ManagedFriend, ManagedProject } from '~/types/admin'

type SeoIssueLevel = 'danger' | 'warning' | 'success'

type SeoIssue = {
  id: string
  level: SeoIssueLevel
  scope: string
  title: string
  detail: string
  href?: string
}

type EndpointCheck = {
  id: string
  label: string
  href: string
  expected: string
}

const props = defineProps<{
  articles: ManagedArticle[]
  projects: ManagedProject[]
  friends: ManagedFriend[]
  about: ManagedAboutPage
}>()

const appConfig = useAppConfig()
const runtimeConfig = useRuntimeConfig()
const endpointChecking = ref(false)
const endpointErrors = ref<Record<string, string>>({})
const endpointCheckedAt = ref('')

const trimMarkdown = (value: string) => value
  .replace(/```[\s\S]*?```/g, ' ')
  .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
  .replace(/\[[^\]]+]\([^)]+\)/g, ' ')
  .replace(/[#>*_`~-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const isAbsoluteHttpUrl = (value: string) => /^https?:\/\//.test(value)
const normalizePath = (value: string) => value.startsWith('/') ? value : `/${value}`
const siteUrl = computed(() => String(runtimeConfig.public.siteUrl || appConfig.seo.siteUrl || '').replace(/\/+$/, ''))
const publicArticles = computed(() => props.articles.filter((article) => article.workflowStatus === 'published' && article.published && !article.locked))
const visibleProjects = computed(() => props.projects.filter((project) => !project.hidden))
const approvedFriends = computed(() => props.friends.filter((friend) => friend.status === '已通过'))
const duplicateArticleSlugs = computed(() => {
  const counts = new Map<string, number>()

  props.articles.forEach((article) => {
    counts.set(article.slug, (counts.get(article.slug) || 0) + 1)
  })

  return [...counts.entries()].filter(([, count]) => count > 1).map(([slug]) => slug)
})
const duplicateArticleTitles = computed(() => {
  const counts = new Map<string, number>()

  props.articles.forEach((article) => {
    counts.set(article.title, (counts.get(article.title) || 0) + 1)
  })

  return [...counts.entries()].filter(([, count]) => count > 1).map(([title]) => title)
})

const endpointChecks = computed<EndpointCheck[]>(() => [
  { id: 'home', label: '首页', href: '/', expected: 'text/html' },
  { id: 'blog', label: '文章列表', href: '/blog', expected: 'text/html' },
  { id: 'sitemap', label: 'Sitemap', href: '/sitemap.xml', expected: 'xml' },
  { id: 'robots', label: 'Robots', href: '/robots.txt', expected: 'text/plain' },
  { id: 'rss', label: 'RSS', href: appConfig.seo.feed.rss, expected: 'xml' },
  { id: 'atom', label: 'Atom', href: appConfig.seo.feed.atom, expected: 'xml' },
  { id: 'json-feed', label: 'JSON Feed', href: appConfig.seo.feed.json, expected: 'json' },
  { id: 'opml', label: 'OPML', href: appConfig.seo.feed.opml, expected: 'xml' }
])

const endpointUrl = (href: string) => {
  if (isAbsoluteHttpUrl(href)) {
    return href
  }

  return `${siteUrl.value}${normalizePath(href)}`
}

const endpointRequestUrl = (href: string) => {
  if (isAbsoluteHttpUrl(href)) {
    return href
  }

  return normalizePath(href)
}

const createIssue = (issue: SeoIssue) => issue

const siteIssues = computed(() => {
  const issues: SeoIssue[] = []

  if (!siteUrl.value || siteUrl.value.includes('localhost')) {
    issues.push(createIssue({
      id: 'site-url-localhost',
      level: 'warning',
      scope: '站点配置',
      title: '公开站点地址仍指向本地',
      detail: 'NUXT_PUBLIC_SITE_URL / SITE_URL 当前看起来是 localhost，部署前应改为正式域名。'
    }))
  }

  if (!appConfig.site.description || appConfig.site.description.length < 20) {
    issues.push(createIssue({
      id: 'site-description-short',
      level: 'warning',
      scope: '站点配置',
      title: '站点描述偏短',
      detail: '全站默认 description 建议保持 20-90 个字符，便于搜索结果摘要展示。'
    }))
  }

  if (!appConfig.seo.defaultImage || appConfig.seo.defaultImage === '/favicon.ico') {
    issues.push(createIssue({
      id: 'default-og-image',
      level: 'warning',
      scope: '站点配置',
      title: '默认社交分享图仍使用 favicon',
      detail: '建议准备 1200x630 的默认 OG 图，提升链接预览质量。'
    }))
  }

  if (!props.about.description || props.about.description.length < 20) {
    issues.push(createIssue({
      id: 'about-description-short',
      level: 'warning',
      scope: '关于页',
      title: '关于页摘要不足',
      detail: '关于页 description 会影响站点身份识别，建议补充更明确的自我介绍。',
      href: '/about'
    }))
  }

  return issues
})

const articleIssues = computed(() => {
  const issues: SeoIssue[] = []

  if (publicArticles.value.length === 0) {
    issues.push(createIssue({
      id: 'no-public-articles',
      level: 'danger',
      scope: '文章',
      title: '没有可索引文章',
      detail: '当前没有已发布且未锁定的文章，文章页不会形成有效搜索入口。',
      href: '/blog'
    }))
  }

  duplicateArticleSlugs.value.forEach((slug) => {
    issues.push(createIssue({
      id: `duplicate-slug-${slug}`,
      level: 'danger',
      scope: '文章',
      title: '文章 slug 重复',
      detail: `slug "${slug}" 被多篇文章使用，会导致路由和 sitemap 冲突。`
    }))
  })

  duplicateArticleTitles.value.forEach((title) => {
    issues.push(createIssue({
      id: `duplicate-title-${title}`,
      level: 'warning',
      scope: '文章',
      title: '文章标题重复',
      detail: `《${title}》出现多次，搜索结果可能难以区分。`
    }))
  })

  publicArticles.value.forEach((article) => {
    const plainText = trimMarkdown(article.markdown)

    if (article.title.length < 6 || article.title.length > 70) {
      issues.push(createIssue({
        id: `${article.slug}-title-length`,
        level: 'warning',
        scope: '文章',
        title: '文章标题长度不理想',
        detail: `《${article.title}》标题长度为 ${article.title.length}，建议控制在 6-70 字符。`,
        href: `/blog/${article.slug}`
      }))
    }

    if (!article.description || article.description.length < 30 || article.description.length > 160) {
      issues.push(createIssue({
        id: `${article.slug}-description-length`,
        level: 'warning',
        scope: '文章',
        title: '文章摘要长度不理想',
        detail: `《${article.title}》摘要长度为 ${article.description.length}，建议控制在 30-160 字符。`,
        href: `/blog/${article.slug}`
      }))
    }

    if (!article.category) {
      issues.push(createIssue({
        id: `${article.slug}-category`,
        level: 'warning',
        scope: '文章',
        title: '缺少分类',
        detail: `《${article.title}》缺少 category，列表筛选和结构化归档会变弱。`,
        href: `/blog/${article.slug}`
      }))
    }

    if (article.tags.length === 0) {
      issues.push(createIssue({
        id: `${article.slug}-tags`,
        level: 'warning',
        scope: '文章',
        title: '缺少标签',
        detail: `《${article.title}》没有 tag，站内搜索和相关推荐线索会减少。`,
        href: `/blog/${article.slug}`
      }))
    }

    if (plainText.length < 300) {
      issues.push(createIssue({
        id: `${article.slug}-content-short`,
        level: 'warning',
        scope: '文章',
        title: '正文内容偏短',
        detail: `《${article.title}》正文约 ${plainText.length} 字，可能不足以形成稳定搜索语义。`,
        href: `/blog/${article.slug}`
      }))
    }

    if (/\s/.test(article.slug) || /[\u4E00-\u9FFF]/.test(article.slug)) {
      issues.push(createIssue({
        id: `${article.slug}-slug-format`,
        level: 'warning',
        scope: '文章',
        title: 'slug 可读性需检查',
        detail: `slug "${article.slug}" 包含空格或中文，建议使用短横线连接的英文或拼音。`,
        href: `/blog/${article.slug}`
      }))
    }
  })

  return issues
})

const projectIssues = computed(() => {
  const issues: SeoIssue[] = []

  visibleProjects.value.forEach((project) => {
    if (!project.description || project.description.length < 24) {
      issues.push(createIssue({
        id: `${project.id}-project-description`,
        level: 'warning',
        scope: '项目',
        title: '项目描述偏短',
        detail: `「${project.name}」描述较短，项目列表和搜索结果不够明确。`,
        href: '/projects'
      }))
    }

    if (!project.launchUrl && !project.sourceUrl) {
      issues.push(createIssue({
        id: `${project.id}-project-url`,
        level: 'warning',
        scope: '项目',
        title: '项目缺少外部链接',
        detail: `「${project.name}」没有部署地址或源码地址，搜索和访问路径不完整。`,
        href: '/projects'
      }))
    }

    if (project.checkStatus === 'error') {
      issues.push(createIssue({
        id: `${project.id}-project-check-error`,
        level: 'danger',
        scope: '项目',
        title: '项目巡检异常',
        detail: `「${project.name}」巡检异常：${project.checkMessage || '链接不可用'}`,
        href: '/projects'
      }))
    }
  })

  return issues
})

const friendIssues = computed(() => {
  const issues: SeoIssue[] = []

  approvedFriends.value.forEach((friend) => {
    if (!friend.icon) {
      issues.push(createIssue({
        id: `${friend.id}-friend-icon`,
        level: 'warning',
        scope: '友链',
        title: '友链缺少图标',
        detail: `「${friend.name}」缺少 icon，前台卡片识别度较弱。`,
        href: '/friends'
      }))
    }

    if (!friend.intro && !friend.description) {
      issues.push(createIssue({
        id: `${friend.id}-friend-description`,
        level: 'warning',
        scope: '友链',
        title: '友链缺少简介',
        detail: `「${friend.name}」缺少简介，不利于用户理解链接内容。`,
        href: '/friends'
      }))
    }

    if (friend.checkStatus === 'error') {
      issues.push(createIssue({
        id: `${friend.id}-friend-check-error`,
        level: 'danger',
        scope: '友链',
        title: '友链巡检异常',
        detail: `「${friend.name}」巡检异常：${friend.checkMessage || '链接不可用'}`,
        href: '/friends'
      }))
    }
  })

  return issues
})

const endpointIssues = computed(() => endpointChecks.value
  .filter((endpoint) => endpointErrors.value[endpoint.id])
  .map((endpoint) => createIssue({
    id: `endpoint-${endpoint.id}`,
    level: 'danger',
    scope: '公开端点',
    title: `${endpoint.label} 无法访问`,
    detail: endpointErrors.value[endpoint.id],
    href: endpoint.href
  })))

const seoIssues = computed(() => [
  ...siteIssues.value,
  ...articleIssues.value,
  ...projectIssues.value,
  ...friendIssues.value,
  ...endpointIssues.value
])
const dangerCount = computed(() => seoIssues.value.filter((issue) => issue.level === 'danger').length)
const warningCount = computed(() => seoIssues.value.filter((issue) => issue.level === 'warning').length)
const passedCount = computed(() => Math.max(0, 12 + publicArticles.value.length + visibleProjects.value.length - seoIssues.value.length))
const seoScore = computed(() => Math.max(0, 100 - dangerCount.value * 18 - warningCount.value * 6))
const scoreLabel = computed(() => {
  if (seoScore.value >= 90) {
    return '健康'
  }

  if (seoScore.value >= 70) {
    return '可优化'
  }

  return '需处理'
})
const issueGroups = computed(() => {
  const groups = new Map<string, SeoIssue[]>()

  seoIssues.value.forEach((issue) => {
    groups.set(issue.scope, [...(groups.get(issue.scope) || []), issue])
  })

  return [...groups.entries()].map(([scope, issues]) => ({ scope, issues }))
})
const summaryCards = computed(() => [
  { label: 'SEO 分数', value: String(seoScore.value), detail: scoreLabel.value },
  { label: '严重问题', value: String(dangerCount.value).padStart(2, '0'), detail: '需要优先处理' },
  { label: '优化提醒', value: String(warningCount.value).padStart(2, '0'), detail: '建议逐步修复' },
  { label: '通过项', value: String(passedCount.value).padStart(2, '0'), detail: '内容与端点基础检查' }
])

const endpointStatus = (endpoint: EndpointCheck) => {
  if (endpointErrors.value[endpoint.id]) {
    return '异常'
  }

  if (!endpointCheckedAt.value) {
    return '待检查'
  }

  return '正常'
}

const checkEndpoints = async () => {
  endpointChecking.value = true
  endpointErrors.value = {}

  const nextErrors: Record<string, string> = {}

  await Promise.all(endpointChecks.value.map(async (endpoint) => {
    try {
      const response = await fetch(endpointRequestUrl(endpoint.href), {
        method: 'GET',
        cache: 'no-store'
      })

      if (!response.ok) {
        nextErrors[endpoint.id] = `HTTP ${response.status}`
        return
      }

      const contentType = response.headers.get('content-type') || ''

      if (endpoint.expected === 'xml' && !/xml/.test(contentType)) {
        nextErrors[endpoint.id] = `Content-Type 不是 XML：${contentType || '未知'}`
      }

      if (endpoint.expected === 'json' && !/json/.test(contentType)) {
        nextErrors[endpoint.id] = `Content-Type 不是 JSON：${contentType || '未知'}`
      }

      if (endpoint.expected === 'text/plain' && !/text\/plain/.test(contentType)) {
        nextErrors[endpoint.id] = `Content-Type 不是 text/plain：${contentType || '未知'}`
      }
    } catch (error) {
      nextErrors[endpoint.id] = error instanceof Error ? error.message : '请求失败'
    }
  }))

  endpointErrors.value = nextErrors
  endpointCheckedAt.value = new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date())
  endpointChecking.value = false
}
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="SEO 体检">
    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-2) border-y border-line p-(--space-2) max-[720px]:grid-cols-1">
      <div class="grid gap-1">
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
          Search Health
        </p>
        <h2 class="m-0 font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
          SEO 体检
        </h2>
      </div>
      <AppButton size="sm" variant="outline" :loading="endpointChecking" @click="checkEndpoints">
        <Icon name="lucide:radar" mode="svg" class="h-4 w-4" aria-hidden="true" />
        检查公开端点
      </AppButton>
    </div>

    <div class="grid grid-cols-4 border-y border-line max-[1080px]:grid-cols-2 max-[560px]:grid-cols-1">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="grid min-h-32 content-between border-r border-line p-(--space-2) last:border-r-0 max-[1080px]:border-b max-[560px]:border-r-0"
      >
        <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
          {{ card.label }}
        </p>
        <div class="grid gap-1">
          <p class="m-0 font-display text-[42px] leading-none text-ink">
            {{ card.value }}
          </p>
          <p class="m-0 text-sm leading-[1.6] text-muted">
            {{ card.detail }}
          </p>
        </div>
      </article>
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)_minmax(320px,0.65fr)] gap-(--space-4) max-[1120px]:grid-cols-1">
      <section class="grid content-start gap-(--space-3)" aria-labelledby="seo-issue-title">
        <div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-2) border-b border-line pb-(--space-1)">
          <h3 id="seo-issue-title" class="m-0 text-base font-bold text-ink">
            问题清单
          </h3>
          <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
            {{ seoIssues.length }} issues
          </p>
        </div>

        <div v-if="issueGroups.length > 0" class="grid border-t border-line">
          <section
            v-for="group in issueGroups"
            :key="group.scope"
            class="grid border-b border-line"
          >
            <div class="grid grid-cols-[120px_minmax(0,1fr)] gap-(--space-2) border-b border-line bg-code-surface p-(--space-1) max-[640px]:grid-cols-1">
              <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
                {{ group.scope }}
              </p>
              <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
                {{ group.issues.length }} 项
              </p>
            </div>
            <article
              v-for="issue in group.issues"
              :key="issue.id"
              class="grid grid-cols-[92px_minmax(0,1fr)_auto] gap-(--space-2) border-b border-line p-(--space-2) last:border-b-0 max-[760px]:grid-cols-1"
            >
              <span
                class="h-fit w-fit border border-line px-(--space-1) py-0.5 text-[12px] font-bold uppercase tracking-normal"
                :class="issue.level === 'danger' ? 'bg-ink text-paper' : 'bg-paper text-muted'"
              >
                {{ issue.level === 'danger' ? '严重' : '提醒' }}
              </span>
              <div class="grid gap-1">
                <p class="m-0 text-sm font-bold text-ink">
                  {{ issue.title }}
                </p>
                <p class="m-0 text-sm leading-[1.7] text-muted text-pretty">
                  {{ issue.detail }}
                </p>
              </div>
              <NuxtLink
                v-if="issue.href"
                :to="issue.href"
                class="text-sm font-bold text-ink underline underline-offset-4"
              >
                查看
              </NuxtLink>
            </article>
          </section>
        </div>

        <div v-else class="grid min-h-40 place-items-center border-y border-line p-(--space-3)">
          <p class="m-0 text-sm font-bold text-muted">
            当前没有发现明显 SEO 问题。
          </p>
        </div>
      </section>

      <aside class="grid content-start gap-(--space-3)" aria-label="SEO 端点与结构">
        <section class="grid gap-(--space-2) border-t border-line">
          <div class="grid gap-1 border-b border-line py-(--space-2)">
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              Public Endpoints
            </p>
            <h3 class="m-0 text-[24px] font-bold leading-tight">
              公开端点
            </h3>
            <p v-if="endpointCheckedAt" class="m-0 text-sm text-muted">
              上次检查：{{ endpointCheckedAt }}
            </p>
          </div>
          <article
            v-for="endpoint in endpointChecks"
            :key="endpoint.id"
            class="grid grid-cols-[minmax(0,1fr)_auto] gap-(--space-2) border-b border-line py-(--space-1)"
          >
            <div class="min-w-0">
              <a
                :href="endpointUrl(endpoint.href)"
                class="block truncate text-sm font-bold text-ink underline-offset-4 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {{ endpoint.label }}
              </a>
              <p class="m-0 truncate text-[12px] text-muted">
                {{ endpoint.href }} / {{ endpoint.expected }}
              </p>
            </div>
            <span class="text-[12px] font-bold uppercase tracking-normal text-muted">
              {{ endpointStatus(endpoint) }}
            </span>
          </article>
        </section>

        <section class="grid gap-(--space-2) border-t border-line">
          <div class="grid gap-1 border-b border-line py-(--space-2)">
            <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
              Coverage
            </p>
            <h3 class="m-0 text-[24px] font-bold leading-tight">
              索引覆盖
            </h3>
          </div>
          <div class="grid grid-cols-2 border border-line">
            <div class="grid gap-1 border-r border-line p-(--space-2)">
              <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Articles</span>
              <strong class="text-2xl">{{ publicArticles.length }}</strong>
            </div>
            <div class="grid gap-1 p-(--space-2)">
              <span class="text-[12px] font-bold uppercase tracking-normal text-muted">Projects</span>
              <strong class="text-2xl">{{ visibleProjects.length }}</strong>
            </div>
          </div>
          <p class="m-0 text-sm leading-[1.7] text-muted">
            sitemap 会收录核心页面、公开文章和带部署地址的项目。草稿、定时、归档、锁定文章不会作为公开文章统计。
          </p>
        </section>
      </aside>
    </div>
  </section>
</template>
