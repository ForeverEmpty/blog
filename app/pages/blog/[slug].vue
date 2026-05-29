<script setup lang="ts">
const appConfig = useAppConfig();
const route = useRoute();
const slug = computed(() => String(route.params.slug));
const articlePath = computed(() => `/blog/${slug.value}`);

const { data: article } = await useAsyncData(`blog-${slug.value}`, () =>
  queryCollection("blog").path(articlePath.value).first(),
);
const { data: articleSiblings } = await useAsyncData("blog-siblings", () =>
  queryCollection("blog")
    .where("published", "=", true)
    .where("locked", "=", false)
    .order("date", "DESC")
    .all(),
  {
    default: () => [],
  },
);

if (!article.value) {
  throw createError({
    statusCode: 404,
    statusMessage: "Article Not Found",
  });
}

if (article.value.locked) {
  throw createError({
    statusCode: 403,
    statusMessage: "Article Locked",
  });
}

const tocLinks = useContentTocLinks(() => article.value);
const readingStats = useContentReadingStats(() => article.value);
const currentArticleIndex = computed(() => (
  articleSiblings.value.findIndex((item) => item.path === article.value.path)
));
const previousArticle = computed(() => (
  currentArticleIndex.value > 0
    ? articleSiblings.value[currentArticleIndex.value - 1]
    : null
));
const nextArticle = computed(() => (
  currentArticleIndex.value >= 0 && currentArticleIndex.value < articleSiblings.value.length - 1
    ? articleSiblings.value[currentArticleIndex.value + 1]
    : null
));
const copyMarkdownStatus = ref<"idle" | "copied" | "error">("idle");
const copyingMarkdown = ref(false);
let copyMarkdownTimer: ReturnType<typeof setTimeout> | undefined;

const copyMarkdownIcon = computed(() => {
  if (copyMarkdownStatus.value === "copied") {
    return "lucide:check";
  }

  if (copyMarkdownStatus.value === "error") {
    return "lucide:circle-alert";
  }

  return "lucide:copy";
});
const copyMarkdownLabel = computed(() => {
  if (copyingMarkdown.value) {
    return "正在复制";
  }

  if (copyMarkdownStatus.value === "copied") {
    return "已复制";
  }

  if (copyMarkdownStatus.value === "error") {
    return "复制失败";
  }

  return "复制全文 Markdown";
});
const writeClipboardText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.className = "fixed left-[-9999px] top-0";
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
};
const resetCopyMarkdownStatus = () => {
  if (copyMarkdownTimer) {
    window.clearTimeout(copyMarkdownTimer);
  }

  copyMarkdownTimer = window.setTimeout(() => {
    copyMarkdownStatus.value = "idle";
  }, 1600);
};
const copyArticleMarkdown = async () => {
  if (!import.meta.client || copyingMarkdown.value) {
    return;
  }

  copyingMarkdown.value = true;

  try {
    const { markdown } = await $fetch<{ markdown: string }>(
      `/api/blog/${encodeURIComponent(slug.value)}/markdown`,
    );
    await writeClipboardText(markdown);
    copyMarkdownStatus.value = "copied";
  } catch {
    copyMarkdownStatus.value = "error";
  } finally {
    copyingMarkdown.value = false;
    resetCopyMarkdownStatus();
  }
};
const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value)
);
const isMinimarkElementNode = (node: unknown): node is [string, Record<string, unknown>, ...unknown[]] => (
  Array.isArray(node) &&
  typeof node[0] === "string" &&
  isRecord(node[1])
);
const isMinimarkStyleNode = (node: unknown) => (
  Array.isArray(node) &&
  node[0] === "style"
);
const isMdcStyleNode = (node: unknown) => (
  typeof node === "object" &&
  node !== null &&
  "tag" in node &&
  node.tag === "style"
);
const mdcStyleContent = (node: unknown) => {
  if (!isMdcStyleNode(node) || !("children" in node) || !Array.isArray(node.children)) {
    return "";
  }

  return node.children
    .map((child) => (
      typeof child === "object" &&
      child !== null &&
      "value" in child &&
      typeof child.value === "string"
        ? child.value
        : ""
    ))
    .join("");
};
const isWhitespaceTextNode = (node: unknown) => (
  typeof node === "string" &&
  node.trim() === ""
);
const normalizeMinimarkNode = (node: unknown): unknown | null => {
  if (isMinimarkStyleNode(node)) {
    return null;
  }

  if (!isMinimarkElementNode(node)) {
    return node;
  }

  const [tag, props, ...children] = node;
  const normalizedChildren = children
    .map(normalizeMinimarkNode)
    .filter((child): child is unknown => child !== null);

  if (tag === "p") {
    const meaningfulChildren = normalizedChildren.filter((child) => !isWhitespaceTextNode(child));

    if (
      meaningfulChildren.length === 1 &&
      isMinimarkElementNode(meaningfulChildren[0]) &&
      meaningfulChildren[0][0] === "img"
    ) {
      return meaningfulChildren[0];
    }
  }

  return [tag, props, ...normalizedChildren];
};
const articleRenderValue = computed(() => {
  const body = article.value.body;

  if (!body) {
    return article.value;
  }

  if ("children" in body && Array.isArray(body.children)) {
    return {
      ...article.value,
      body: {
        ...body,
        children: body.children.filter((node) => !isMdcStyleNode(node)),
      },
    };
  }

  if (!("value" in body) || !Array.isArray(body.value)) {
    return article.value;
  }

  return {
    ...article.value,
    body: {
      ...body,
      value: body.value
        .map(normalizeMinimarkNode)
        .filter((node): node is unknown => node !== null),
    },
  };
});
const articleStyleBlocks = computed(() => {
  const body = article.value.body;

  if (!body) {
    return [];
  }

  const styles = "children" in body && Array.isArray(body.children)
    ? body.children
        .filter(isMdcStyleNode)
        .map(mdcStyleContent)
    : "value" in body && Array.isArray(body.value)
      ? body.value
          .filter((node): node is [string, Record<string, unknown>, string] => (
            isMinimarkStyleNode(node) &&
            typeof node[2] === "string"
          ))
          .map((node) => node[2])
      : [];

  return styles
    .filter(Boolean)
    .map((style, index) => ({
      key: `article-content-style-${slug.value}-${index}`,
      innerHTML: style,
    }));
});
const articleTitleClass = computed(() => {
  const titleLength = article.value.title.length;

  if (titleLength > 64) {
    return "text-[48px] leading-[1.08] max-[1100px]:text-[42px] max-[520px]:text-[30px]";
  }

  if (titleLength > 52) {
    return "text-[60px] leading-[1.04] max-[1100px]:text-[50px] max-[520px]:text-[34px]";
  }

  if (titleLength > 42) {
    return "text-[84px] leading-[1] max-[1100px]:text-[64px] max-[520px]:text-[42px]";
  }

  return "text-[132px] leading-[0.95] max-[1100px]:text-[88px] max-[520px]:text-[56px]";
});

useHead({
  title: `${article.value.title} - ${appConfig.site.name}`,
  meta: [
    {
      name: "description",
      content: article.value.description,
    },
  ],
  style: articleStyleBlocks,
});

onBeforeUnmount(() => {
  if (copyMarkdownTimer) {
    window.clearTimeout(copyMarkdownTimer);
  }
});
</script>

<template>
  <NuxtLayout>
    <article
      class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(112px,16vw)_minmax(0,1fr)_minmax(200px,280px)] border-b border-line bg-paper max-[1000px]:grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] max-[760px]:grid-cols-1"
      aria-labelledby="article-title"
    >
      <ArticleMetaRail
        :date="article.date"
        :author="article.author"
        :author-url="article.authorUrl"
        :category="article.category"
        :tags="article.tags"
        :word-count="readingStats.wordCount"
        :reading-minutes="readingStats.readingMinutes"
        :views="article.views"
      />

      <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
        <div class="grid max-w-300 gap-(--space-8)">
          <header class="grid gap-(--space-3)">
            <div class="flex flex-wrap items-center gap-(--space-1)">
              <NuxtLink
                class="inline-flex min-h-11 w-fit items-center rounded-token px-(--space-2) text-sm font-bold tracking-normal text-muted! transition-colors duration-200 hover:bg-ink hover:text-paper! focus-visible:bg-ink focus-visible:text-paper! focus-visible:outline-none"
                href="/blog"
              >
                < 返回文章目录
              </NuxtLink>
              <button
                type="button"
                class="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-token border border-line bg-transparent px-(--space-2) text-sm font-bold tracking-normal text-muted! transition-[background-color,border-color,color,opacity] duration-200 hover:border-ink hover:bg-ink hover:text-paper! focus-visible:border-ink focus-visible:bg-ink focus-visible:text-paper! focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60"
                :aria-label="copyMarkdownLabel"
                :disabled="copyingMarkdown"
                @click="copyArticleMarkdown"
              >
                <Icon
                  :name="copyingMarkdown ? 'lucide:loader-circle' : copyMarkdownIcon"
                  mode="svg"
                  class="h-4 w-4"
                  :class="copyingMarkdown ? 'animate-spin' : ''"
                  aria-hidden="true"
                />
                {{ copyMarkdownLabel }}
              </button>
            </div>
            <h1
              id="article-title"
              class="m-0 max-w-300 break-words font-display font-normal tracking-normal text-ink text-pretty"
              :class="articleTitleClass"
            >
              {{ article.title }}
            </h1>
            <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
              {{ article.description }}
            </p>
          </header>

          <ArticleAiSummary :slug="slug" />

          <ContentBody :value="articleRenderValue" />

          <ArticleComments :slug="slug" />

          <nav
            class="grid max-w-190 grid-cols-2 border-y border-line"
            aria-label="相邻文章"
          >
            <NuxtLink
              v-if="previousArticle"
              class="group grid min-h-36 content-between gap-(--space-2) border-r border-line p-(--space-3) text-ink transition-[background-color,color] duration-240 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none max-[680px]:min-h-30 max-[680px]:p-(--space-2)"
              :href="previousArticle.path"
            >
              <span class="flex items-center gap-(--space-1) text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">
                <Icon
                  name="lucide:arrow-left"
                  mode="svg"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                上一篇
              </span>
              <span class="grid gap-1">
                <span class="line-clamp-2 font-display text-[32px] font-normal leading-none tracking-normal text-pretty transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper max-[680px]:text-[24px]">
                  {{ previousArticle.title }}
                </span>
                <span class="text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">
                  {{ previousArticle.date }}
                </span>
              </span>
            </NuxtLink>
            <div
              v-else
              class="grid min-h-36 content-between gap-(--space-2) border-r border-line p-(--space-3) text-muted max-[680px]:min-h-30 max-[680px]:p-(--space-2)"
              aria-disabled="true"
            >
              <span class="flex items-center gap-(--space-1) text-[13px] font-bold uppercase tracking-normal">
                <Icon
                  name="lucide:arrow-left"
                  mode="svg"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                上一篇
              </span>
              <span class="font-display text-[32px] font-normal leading-none tracking-normal text-quiet max-[680px]:text-[24px]">
                已是最新
              </span>
            </div>

            <NuxtLink
              v-if="nextArticle"
              class="group grid min-h-36 content-between justify-items-end gap-(--space-2) p-(--space-3) text-right text-ink transition-[background-color,color] duration-240 hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper focus-visible:outline-none max-[680px]:min-h-30 max-[680px]:p-(--space-2)"
              :href="nextArticle.path"
            >
              <span class="flex items-center gap-(--space-1) text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">
                下一篇
                <Icon
                  name="lucide:arrow-right"
                  mode="svg"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </span>
              <span class="grid justify-items-end gap-1">
                <span class="line-clamp-2 font-display text-[32px] font-normal leading-none tracking-normal text-pretty transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper max-[680px]:text-[24px]">
                  {{ nextArticle.title }}
                </span>
                <span class="text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-visible:text-paper">
                  {{ nextArticle.date }}
                </span>
              </span>
            </NuxtLink>
            <div
              v-else
              class="grid min-h-36 content-between justify-items-end gap-(--space-2) p-(--space-3) text-right text-muted max-[680px]:min-h-30 max-[680px]:p-(--space-2)"
              aria-disabled="true"
            >
              <span class="flex items-center gap-(--space-1) text-[13px] font-bold uppercase tracking-normal">
                下一篇
                <Icon
                  name="lucide:arrow-right"
                  mode="svg"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
              </span>
              <span class="font-display text-[32px] font-normal leading-none tracking-normal text-quiet max-[680px]:text-[24px]">
                已是最早
              </span>
            </div>
          </nav>
        </div>
      </div>

      <ContentTableOfContents
        class="mr-[clamp(var(--space-3),5vw,var(--space-8))] py-(--space-8) max-[1000px]:col-start-2 max-[1000px]:mr-0 max-[1000px]:px-[clamp(var(--space-3),6vw,var(--space-12))] max-[1000px]:pt-0 max-[760px]:col-start-auto max-[760px]:px-(--space-2)"
        :links="tocLinks"
        label="文章目录"
      />
    </article>
  </NuxtLayout>
</template>
