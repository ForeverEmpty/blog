<script setup lang="ts">
defineProps<{
  words: string[]
  title: string
  description: string
  projects?: {
    name: string
    description: string
    status: string
    category: string
    sourceUrl: string
    launchUrl: string
    tags: string[]
  }[]
}>()
</script>

<template>
  <section
    id="project-index"
    class="grid grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-t border-line bg-paper max-[760px]:grid-cols-1"
    aria-labelledby="project-index-title"
  >
    <aside
      class="min-h-150 border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:flex max-[760px]:min-h-0 max-[760px]:justify-between max-[760px]:gap-(--space-3) max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
      aria-label="项目索引"
    >
      <span class="sticky top-32 mb-(--space-4) block text-[13px] font-bold uppercase tracking-normal max-[760px]:static">
        Projects
      </span>
      <ol
        class="sticky top-46 m-0 grid list-none gap-(--space-2) p-0 font-display text-[44px] leading-none max-[760px]:static max-[760px]:flex max-[760px]:flex-wrap max-[760px]:justify-end max-[760px]:text-2xl"
      >
        <li v-for="word in words" :key="word">{{ word }}</li>
      </ol>
    </aside>

    <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
      <div class="mb-(--space-8) grid max-w-230 gap-(--space-2)">
        <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">Project Index</p>
        <h2
          id="project-index-title"
          class="m-0 font-display text-[88px] font-normal leading-[0.95] tracking-normal text-pretty max-[1100px]:text-[64px] max-[520px]:text-[40px]"
        >
          {{ title }}
        </h2>
        <p class="m-0 max-w-180 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
          {{ description }}
        </p>
      </div>

      <div
        v-if="projects && projects.length > 0"
        class="grid border-t border-line px-(--space-2)"
        aria-label="首页项目列表"
      >
        <article
          v-for="(project, index) in projects"
          :key="project.name"
          class="group relative grid min-h-50 grid-cols-[72px_minmax(0,1fr)_minmax(180px,260px)] items-center gap-(--space-4) overflow-hidden border-b border-line px-(--space-2) py-(--space-4) text-ink before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-ink before:transition-transform before:duration-420 before:ease-[cubic-bezier(.2,.8,.2,1)] hover:text-paper hover:before:scale-x-100 focus-within:text-paper focus-within:before:scale-x-100 max-[900px]:grid-cols-[56px_minmax(0,1fr)] max-[900px]:items-start max-[520px]:grid-cols-1"
        >
          <span class="relative z-1 font-display text-[28px] text-quiet transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
            {{ String(index + 1).padStart(2, "0") }}
          </span>

          <div class="relative z-1 grid min-w-0 gap-(--space-2)">
            <div class="flex flex-wrap items-center gap-x-(--space-2) gap-y-(--space-1)">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                {{ project.status }}
              </p>
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                {{ project.category }}
              </p>
            </div>

            <h3 class="m-0 min-w-0 truncate font-display text-[72px] font-normal leading-[0.95] tracking-normal max-[1100px]:text-[56px] max-[520px]:text-[40px]">
              <a
                class="block truncate focus-visible:outline-none"
                :href="project.launchUrl"
                target="_blank"
                rel="noreferrer"
              >
                {{ project.name }}
              </a>
            </h3>

            <p class="m-0 max-w-180 text-lg leading-[1.55] text-muted text-pretty transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
              {{ project.description }}
            </p>

            <ul
              class="m-0 flex list-none flex-wrap gap-(--space-1) p-0"
              aria-label="项目标签"
            >
              <li
                v-for="tag in project.tags.slice(0, 3)"
                :key="tag"
                class="border border-line px-(--space-1) py-1 text-[12px] font-bold leading-none text-muted transition-colors duration-200 group-hover:border-paper group-hover:text-paper group-focus-within:border-paper group-focus-within:text-paper"
              >
                {{ tag }}
              </li>
            </ul>
          </div>

          <div class="relative z-1 grid gap-(--space-1) justify-self-stretch max-[900px]:col-start-2 max-[900px]:grid-cols-2 max-[520px]:col-start-auto max-[520px]:grid-cols-1">
            <a
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-token border border-line bg-paper px-(--space-2) text-sm font-bold tracking-normal text-ink! transition-[background-color,border-color,color,transform] duration-200 hover:border-paper hover:bg-paper hover:text-ink! focus-visible:border-paper focus-visible:bg-paper focus-visible:text-ink! focus-visible:outline-none active:scale-[0.98]"
              :href="project.launchUrl"
              target="_blank"
              rel="noreferrer"
            >
              <Icon
                name="lucide:external-link"
                mode="svg"
                class="h-4 w-4"
                aria-hidden="true"
              />
              访问项目
            </a>
            <a
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-token border border-line bg-transparent px-(--space-2) text-sm font-bold tracking-normal text-ink! transition-[background-color,border-color,color,transform] duration-200 hover:border-paper hover:bg-paper hover:text-ink! focus-visible:border-paper focus-visible:bg-paper focus-visible:text-ink! focus-visible:outline-none active:scale-[0.98] group-hover:text-paper! group-focus-within:text-paper!"
              :href="project.sourceUrl"
              target="_blank"
              rel="noreferrer"
            >
              <Icon
                name="lucide:github"
                mode="svg"
                class="h-4 w-4"
                aria-hidden="true"
              />
              源码仓库
            </a>
          </div>
        </article>
      </div>

      <div
        v-else
        class="grid border-t border-line px-(--space-2)"
        aria-label="首页项目空状态"
      >
        <div class="grid min-h-38 items-center border-b border-line py-(--space-4)">
          <p class="m-0 max-w-170 text-lg leading-[1.6] text-muted text-pretty">
            暂无可展示项目。
          </p>
        </div>
      </div>

      <div class="mt-(--space-4) flex justify-end">
        <AppLinkButton href="/projects" variant="outline">
          查看全部项目
        </AppLinkButton>
      </div>
    </div>
  </section>
</template>
