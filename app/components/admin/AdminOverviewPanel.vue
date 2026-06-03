<script setup lang="ts">
import type { AdminStat, AdminVisitStats, ManagedArticle, ManagedComment, ManagedProject } from '~/types/admin'

const props = defineProps<{
  stats: AdminStat[]
  latestArticles: ManagedArticle[]
  latestProjects: ManagedProject[]
  latestComments: ManagedComment[]
  commentsLoading: boolean
  commentsError: string
  visitStats: AdminVisitStats
  visitStatsLoading: boolean
  visitStatsError: string
}>()

const emit = defineEmits<{
  refreshVisits: []
}>()

const formatNumber = (value: number) => Math.max(0, Number(value) || 0).toLocaleString('zh-CN')
const formatPercent = (value: number) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`
const formatTime = (value: string) => {
  if (!value) {
    return '尚无记录'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
const maxTrendViews = computed(() => Math.max(1, ...props.visitStats.trend.map((item) => item.views)))
const trendTotal = computed(() => props.visitStats.trend.reduce((total, item) => total + item.views, 0))
const maxTopViews = computed(() => Math.max(1, ...props.visitStats.topArticles.map((article) => article.views)))
const trendChart = {
  width: 720,
  height: 290,
  paddingX: 56,
  paddingY: 20,
  plotBottom: 230,
  labelY: 274
}
const trendChartInnerHeight = computed(() => trendChart.plotBottom - trendChart.paddingY)
const trendYAxisTicks = computed(() => {
  const max = maxTrendViews.value
  const rawValues = max <= 4
    ? Array.from({ length: max + 1 }, (_, index) => max - index)
    : [1, 0.75, 0.5, 0.25, 0].map((ratio) => Math.round(max * ratio))
  const values = [...new Set(rawValues)]

  return values.map((value) => ({
    value,
    y: Number((trendChart.paddingY + trendChartInnerHeight.value - (value / max) * trendChartInnerHeight.value).toFixed(2))
  }))
})
const trendChartPoints = computed(() => {
  const items = props.visitStats.trend
  const innerWidth = trendChart.width - trendChart.paddingX * 2

  return items.map((item, index) => {
    const x = trendChart.paddingX + (items.length <= 1 ? innerWidth / 2 : (index / (items.length - 1)) * innerWidth)
    const y = trendChart.paddingY + trendChartInnerHeight.value - (Math.max(0, item.views) / maxTrendViews.value) * trendChartInnerHeight.value

    return {
      ...item,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2))
    }
  })
})
const trendXAxisTicks = computed(() => {
  const points = trendChartPoints.value

  if (points.length === 0) {
    return []
  }

  return [0, Math.floor((points.length - 1) / 2), points.length - 1]
    .map((index) => points[index])
    .filter((point, index, items) => point && items.findIndex((item) => item.date === point.date) === index)
})
const trendPolylinePoints = computed(() => trendChartPoints.value.map((point) => `${point.x},${point.y}`).join(' '))
const trendAreaPoints = computed(() => {
  if (trendChartPoints.value.length === 0) {
    return ''
  }

  const baselineY = trendChart.plotBottom
  const first = trendChartPoints.value[0]
  const last = trendChartPoints.value[trendChartPoints.value.length - 1]

  return `${first.x},${baselineY} ${trendPolylinePoints.value} ${last.x},${baselineY}`
})
const activeTrendDate = ref('')
const activeTrendPoint = computed(() => trendChartPoints.value.find((point) => point.date === activeTrendDate.value) || null)
const setActiveTrendPoint = (date: string) => {
  activeTrendDate.value = date
}
const clearActiveTrendPoint = () => {
  activeTrendDate.value = ''
}
const visitCards = computed(() => [
  {
    label: '累计观看',
    value: formatNumber(props.visitStats.totalViews),
    detail: `${formatNumber(props.visitStats.trackedArticles)} 篇文章已有访问`
  },
  {
    label: '活跃记录',
    value: formatNumber(props.visitStats.activeVisitors),
    detail: '30 分钟去重窗口内的访问记录'
  },
  {
    label: '7 日访问',
    value: formatNumber(props.visitStats.trend.slice(-7).reduce((total, item) => total + item.views, 0)),
    detail: trendTotal.value > 0 ? '来自每日访问桶' : '新访问写入后开始统计'
  },
  {
    label: '最近更新',
    value: props.visitStats.updatedAt ? props.visitStats.updatedAt.slice(5, 10) : '--',
    detail: formatTime(props.visitStats.updatedAt)
  }
])
</script>

<template>
  <section class="grid gap-(--space-4)" aria-label="后台总览">
    <div class="grid grid-cols-4 border-y border-line max-[1280px]:grid-cols-2 max-[560px]:grid-cols-1">
      <article
        v-for="stat in props.stats"
        :key="stat.label"
        class="grid min-h-40 min-w-0 content-between border-r border-line p-(--space-3) last:border-r-0 max-[1280px]:border-b max-[560px]:border-r-0"
      >
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
          {{ stat.label }}
        </p>
        <div class="grid gap-(--space-1)">
          <p class="m-0 font-display text-[56px] leading-none text-ink max-[760px]:text-[44px]">
            {{ stat.value }}
          </p>
          <p class="m-0 text-sm leading-[1.6] text-muted">
            {{ stat.detail }}
          </p>
        </div>
      </article>
    </div>

    <section class="grid gap-(--space-3) border-t border-line" aria-labelledby="visit-dashboard-title">
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-2) border-b border-line py-(--space-2) max-[640px]:grid-cols-1">
        <div class="grid gap-1">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Analytics
          </p>
          <h2 id="visit-dashboard-title" class="m-0 font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
            访问统计
          </h2>
        </div>
        <AppButton size="sm" variant="outline" :loading="props.visitStatsLoading" @click="emit('refreshVisits')">
          <Icon name="lucide:refresh-cw" mode="svg" class="h-4 w-4" aria-hidden="true" />
          刷新
        </AppButton>
      </div>

      <p v-if="props.visitStatsError" class="m-0 border border-line bg-code-surface p-(--space-2) text-sm font-bold text-muted">
        {{ props.visitStatsError }}
      </p>

      <div class="grid grid-cols-4 border-y border-line max-[1280px]:grid-cols-2 max-[560px]:grid-cols-1">
        <article
          v-for="card in visitCards"
          :key="card.label"
          class="grid min-h-32 min-w-0 content-between border-r border-line p-(--space-2) last:border-r-0 max-[1280px]:border-b max-[560px]:border-r-0"
        >
          <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
            {{ card.label }}
          </p>
          <div class="grid gap-1">
            <p class="m-0 break-words font-display text-[36px] leading-none text-ink max-[760px]:text-[32px]">
              {{ card.value }}
            </p>
            <p class="m-0 text-sm leading-[1.6] text-muted">
              {{ card.detail }}
            </p>
          </div>
        </article>
      </div>

      <div class="grid grid-cols-12 gap-(--space-4) max-[1120px]:grid-cols-1">
        <section class="col-span-8 grid min-w-0 content-start gap-(--space-2) max-[1120px]:col-span-full" aria-labelledby="visit-trend-title">
          <div class="flex items-baseline justify-between gap-(--space-2) border-b border-line pb-(--space-1)">
            <h3 id="visit-trend-title" class="m-0 text-base font-bold text-ink">
              近 30 天趋势
            </h3>
            <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
              {{ formatNumber(trendTotal) }} views
            </p>
          </div>
          <div
            v-if="props.visitStats.trend.length > 0 && trendTotal > 0"
            class="relative border-b border-line pb-(--space-1)"
            @mouseleave="clearActiveTrendPoint"
          >
            <svg
              class="block h-[290px] w-full overflow-visible"
              :viewBox="`0 0 ${trendChart.width} ${trendChart.height}`"
              role="img"
              aria-labelledby="visit-trend-title"
            >
              <g
                v-for="tick in trendYAxisTicks"
                :key="tick.value"
              >
                <line
                  :x1="trendChart.paddingX"
                  :x2="trendChart.width - trendChart.paddingX"
                  :y1="tick.y"
                  :y2="tick.y"
                  stroke="var(--line)"
                  stroke-width="1"
                  vector-effect="non-scaling-stroke"
                />
                <text
                  :x="trendChart.paddingX - 10"
                  :y="tick.y"
                  fill="var(--muted)"
                  font-size="12"
                  font-weight="700"
                  text-anchor="end"
                  dominant-baseline="middle"
                >
                  {{ formatNumber(tick.value) }}
                </text>
              </g>
              <line
                :x1="trendChart.paddingX"
                :x2="trendChart.paddingX"
                :y1="trendChart.paddingY"
                :y2="trendChart.plotBottom"
                stroke="var(--line)"
                stroke-width="1"
                vector-effect="non-scaling-stroke"
              />
              <polygon
                :points="trendAreaPoints"
                fill="var(--ink)"
                opacity="0.08"
              />
              <polyline
                :points="trendPolylinePoints"
                fill="none"
                stroke="var(--ink)"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="3"
                vector-effect="non-scaling-stroke"
              />
              <g
                v-for="point in trendChartPoints"
                :key="point.date"
                class="cursor-pointer outline-none"
                role="button"
                tabindex="0"
                :aria-label="`${point.label} ${formatNumber(point.views)} 次访问`"
                @mouseenter="setActiveTrendPoint(point.date)"
                @focus="setActiveTrendPoint(point.date)"
                @click="setActiveTrendPoint(point.date)"
                @mouseleave="clearActiveTrendPoint"
                @blur="clearActiveTrendPoint"
              >
                <title>{{ point.label }}：{{ formatNumber(point.views) }} 次访问</title>
                <circle
                  :cx="point.x"
                  :cy="point.y"
                  r="11"
                  fill="transparent"
                />
                <circle
                  :cx="point.x"
                  :cy="point.y"
                  :r="activeTrendDate === point.date ? 5.5 : 4"
                  fill="var(--paper)"
                  stroke="var(--ink)"
                  stroke-width="2"
                  vector-effect="non-scaling-stroke"
                />
              </g>
              <g aria-hidden="true">
                <text
                  v-for="tick in trendXAxisTicks"
                  :key="tick.date"
                  :x="tick.x"
                  :y="trendChart.labelY"
                  fill="var(--muted)"
                  font-size="12"
                  font-weight="700"
                  text-anchor="middle"
                >
                  {{ tick.label }}
                </text>
              </g>
            </svg>
            <article
              v-if="activeTrendPoint"
              class="pointer-events-none absolute z-20 grid w-[min(280px,calc(100vw-48px))] gap-(--space-1) border border-line bg-paper p-(--space-2) text-ink shadow-[var(--dialog-shadow)]"
              :style="{
                left: `${(activeTrendPoint.x / trendChart.width) * 100}%`,
                top: `${(activeTrendPoint.y / trendChart.height) * 100}%`,
                transform: activeTrendPoint.x > trendChart.width * 0.7 ? 'translate(-100%, -112%)' : 'translate(12px, -112%)'
              }"
              aria-live="polite"
            >
              <div class="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-(--space-1)">
                <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
                  {{ activeTrendPoint.label }}
                </p>
                <p class="m-0 font-display text-[28px] leading-none text-ink">
                  {{ formatNumber(activeTrendPoint.views) }}
                </p>
              </div>
              <ol v-if="activeTrendPoint.topArticles.length > 0" class="m-0 grid list-none gap-1 p-0">
                <li
                  v-for="article in activeTrendPoint.topArticles"
                  :key="article.slug"
                  class="grid grid-cols-[minmax(0,1fr)_auto] gap-(--space-1) border-t border-line pt-1"
                >
                  <span class="truncate text-[12px] font-bold text-ink">
                    {{ article.title }}
                  </span>
                  <span class="text-[12px] font-bold text-muted">
                    {{ formatNumber(article.views) }}
                  </span>
                  <span class="col-span-2 truncate text-[11px] text-muted">
                    {{ article.category }}
                  </span>
                </li>
              </ol>
              <p v-else class="m-0 border-t border-line pt-1 text-[12px] leading-[1.5] text-muted">
                当日暂无新增访问。
              </p>
            </article>
          </div>
          <p v-else class="m-0 border-b border-line py-(--space-3) text-sm leading-[1.7] text-muted">
            趋势数据将在新的文章访问写入后开始显示。现有历史总量仍会在热门文章中展示。
          </p>
        </section>

        <section class="col-span-4 grid min-w-0 content-start gap-(--space-2) max-[1120px]:col-span-full" aria-labelledby="visit-recent-title">
          <div class="flex items-baseline justify-between gap-(--space-2) border-b border-line pb-(--space-1)">
            <h3 id="visit-recent-title" class="m-0 text-base font-bold text-ink">
              最近被访问
            </h3>
            <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
              Updated
            </p>
          </div>
          <article
            v-for="article in props.visitStats.recentArticles"
            :key="article.slug"
            class="grid grid-cols-[minmax(0,1fr)_auto] gap-(--space-2) border-b border-line py-(--space-1)"
          >
            <div class="min-w-0">
              <NuxtLink :to="`/blog/${article.slug}`" class="block truncate text-sm font-bold text-ink underline-offset-4 hover:underline">
                {{ article.title }}
              </NuxtLink>
              <p class="m-0 truncate text-[12px] text-muted">
                {{ article.category }} / {{ formatTime(article.updatedAt) }}
              </p>
            </div>
            <p class="m-0 text-sm font-bold text-ink">
              {{ formatNumber(article.views) }}
            </p>
          </article>
          <p v-if="props.visitStats.recentArticles.length === 0" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
            暂无最近访问记录。
          </p>
        </section>
        <section class="col-span-8 grid min-w-0 content-start gap-(--space-2) max-[1120px]:col-span-full" aria-labelledby="visit-top-title">
          <div class="flex items-baseline justify-between gap-(--space-2) border-b border-line pb-(--space-1)">
            <h3 id="visit-top-title" class="m-0 text-base font-bold text-ink">
              热门文章
            </h3>
            <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
              Top {{ props.visitStats.topArticles.length }}
            </p>
          </div>
          <article
            v-for="article in props.visitStats.topArticles"
            :key="article.slug"
            class="grid gap-1 border-b border-line py-(--space-1)"
          >
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-(--space-2)">
              <NuxtLink :to="`/blog/${article.slug}`" class="truncate text-sm font-bold text-ink underline-offset-4 hover:underline">
                {{ article.title }}
              </NuxtLink>
              <span class="text-sm font-bold text-ink">{{ formatNumber(article.views) }}</span>
            </div>
            <div class="h-2 border border-line bg-paper">
              <div class="h-full bg-ink" :style="{ width: `${Math.max(2, Math.round((article.views / maxTopViews) * 100))}%` }" />
            </div>
            <p class="m-0 text-[12px] leading-[1.5] text-muted">
              {{ article.category }} / 占比 {{ formatPercent(article.share) }} / 7 日 {{ formatNumber(article.last7Days) }}
            </p>
          </article>
          <p v-if="props.visitStats.topArticles.length === 0" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
            暂无访问数据。
          </p>
        </section>

        <section class="col-span-4 grid min-w-0 content-start gap-(--space-2) max-[1120px]:col-span-full" aria-labelledby="visit-quiet-title">
          <div class="flex items-baseline justify-between gap-(--space-2) border-b border-line pb-(--space-1)">
            <h3 id="visit-quiet-title" class="m-0 text-base font-bold text-ink">
              低访问公开文章
            </h3>
            <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
              Empty
            </p>
          </div>
          <article
            v-for="article in props.visitStats.quietArticles"
            :key="article.slug"
            class="grid gap-1 border-b border-line py-(--space-1)"
          >
            <NuxtLink :to="`/blog/${article.slug}`" class="truncate text-sm font-bold text-ink underline-offset-4 hover:underline">
              {{ article.title }}
            </NuxtLink>
            <p class="m-0 text-[12px] text-muted">
              {{ article.category }} / {{ article.locked ? '锁定' : '公开' }} / {{ article.pinned ? '置顶' : '普通' }}
            </p>
          </article>
          <p v-if="props.visitStats.quietArticles.length === 0" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
            暂无零访问公开文章。
          </p>
        </section>
      </div>
    </section>

    <div class="grid grid-cols-3 gap-(--space-4) max-[1120px]:grid-cols-1">
      <section class="grid content-start border-t border-line" aria-labelledby="latest-articles-title">
        <div class="grid gap-1 border-b border-line py-(--space-2)">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Articles
          </p>
          <h2 id="latest-articles-title" class="m-0 font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
            最新文章
          </h2>
        </div>
        <article
          v-for="article in props.latestArticles"
          :key="article.id"
          class="grid gap-1 border-b border-line py-(--space-2)"
        >
          <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
            {{ article.date }} / {{ article.category }}
          </p>
          <h3 class="m-0 truncate text-lg font-bold text-ink">
            {{ article.title }}
          </h3>
          <p class="m-0 line-clamp-2 text-sm leading-[1.6] text-muted">
            {{ article.description }}
          </p>
        </article>
        <p v-if="props.latestArticles.length === 0" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
          暂无文章。
        </p>
      </section>

      <section class="grid content-start border-t border-line" aria-labelledby="latest-projects-title">
        <div class="grid gap-1 border-b border-line py-(--space-2)">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Projects
          </p>
          <h2 id="latest-projects-title" class="m-0 font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
            最新项目
          </h2>
        </div>
        <article
          v-for="project in props.latestProjects"
          :key="project.id"
          class="grid gap-1 border-b border-line py-(--space-2)"
        >
          <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
            {{ project.status }} / {{ project.category }}
          </p>
          <h3 class="m-0 truncate text-lg font-bold text-ink">
            {{ project.name }}
          </h3>
          <p class="m-0 line-clamp-2 text-sm leading-[1.6] text-muted">
            {{ project.description }}
          </p>
        </article>
        <p v-if="props.latestProjects.length === 0" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
          暂无项目。
        </p>
      </section>

      <section class="grid content-start border-t border-line" aria-labelledby="latest-comments-title">
        <div class="grid gap-1 border-b border-line py-(--space-2)">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            Comments
          </p>
          <h2 id="latest-comments-title" class="m-0 font-display text-[40px] font-normal leading-none max-[520px]:text-[32px]">
            最新评论
          </h2>
        </div>
        <p v-if="props.commentsLoading" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
          正在读取评论。
        </p>
        <p v-else-if="props.commentsError" class="m-0 border-b border-line py-(--space-2) text-sm font-bold text-muted">
          {{ props.commentsError }}
        </p>
        <article
          v-for="comment in props.latestComments"
          v-else
          :key="comment.id"
          class="grid gap-1 border-b border-line py-(--space-2)"
        >
          <p class="m-0 text-[12px] font-bold uppercase tracking-normal text-muted">
            {{ comment.status }} / {{ comment.articleSlug || comment.url }}
          </p>
          <h3 class="m-0 truncate text-lg font-bold text-ink">
            {{ comment.author || '匿名访客' }}
          </h3>
          <p class="m-0 line-clamp-2 text-sm leading-[1.6] text-muted">
            {{ comment.content }}
          </p>
        </article>
        <p v-if="!props.commentsLoading && !props.commentsError && props.latestComments.length === 0" class="m-0 border-b border-line py-(--space-2) text-sm text-muted">
          暂无评论。
        </p>
      </section>
    </div>
  </section>
</template>
