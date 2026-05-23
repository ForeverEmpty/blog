<script setup lang="ts">
useHead({
  title: 'ChankoBlog',
  script: [
    {
      id: 'theme-init',
      innerHTML: `(() => {
  try {
    const mode = localStorage.getItem('chanko-theme-mode') || 'system'
    const root = document.documentElement
    if (mode === 'dark' || mode === 'light') {
      root.dataset.theme = mode
    } else {
      root.removeAttribute('data-theme')
    }
    root.dataset.themeMode = mode
  } catch {}
})()`
    }
  ]
})

const indexWords = ['写作', '思考', '记录', '发布']
const articleStates = [
  '接入文章接口后显示最新发布',
  '接入后台后显示精选文章',
  '接入标签后显示阅读路径'
]
</script>

<template>
  <NuxtLayout>
    <section
      class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(0,1fr)] content-end gap-(--space-4) px-[clamp(var(--space-3),5vw,var(--space-8))] pt-(--space-8) pb-(--space-6) max-[760px]:min-h-[calc(100vh-133px)] max-[760px]:px-(--space-2) max-[760px]:pt-(--space-6) max-[760px]:pb-(--space-4)"
      aria-labelledby="home-title"
    >
      <div class="max-w-140 text-[13px] font-bold uppercase tracking-normal text-muted">
        Nuxt 4 Blog / Editorial System
      </div>
      <HeroTitle id="home-title" title="ChankoBlog" />
      <div class="grid max-w-280 grid-cols-[minmax(0,560px)_auto] items-end gap-(--space-4) max-[760px]:grid-cols-1">
        <p class="m-0 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
          一个以文字为主角的博客首页。内容不靠装饰堆满，而通过标题、节奏、留白和细微动画形成记忆点。
        </p>
        <AppLinkButton href="#writing-index" variant="text">查看首页结构</AppLinkButton>
      </div>
    </section>

    <ArticleIndex :words="indexWords" :states="articleStates" />
  </NuxtLayout>
</template>
