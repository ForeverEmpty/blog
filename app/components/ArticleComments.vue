<script setup lang="ts">
import type { WalineInitOptions, WalineInstance } from "@waline/client";

const props = defineProps<{
  slug: string;
}>();

type CommentConfig = {
  enabled?: boolean;
  provider?: string;
  waline?: {
    serverURL?: string;
    lang?: string;
    pageSize?: number;
    wordLimit?: number | [number, number];
    login?: WalineInitOptions["login"];
    commentSorting?: WalineInitOptions["commentSorting"];
    meta?: WalineInitOptions["meta"];
    requiredMeta?: WalineInitOptions["requiredMeta"];
  };
};

const appConfig = useAppConfig() as unknown as {
  comments?: CommentConfig;
};
const runtimeConfig = useRuntimeConfig();

const walineRoot = ref<HTMLElement | null>(null);
const isLoading = ref(false);
const loadError = ref("");
let waline: WalineInstance | null = null;

const commentsConfig = computed(() => appConfig.comments || {});
const walineConfig = computed(() => commentsConfig.value.waline || {});
const walinePath = computed(() => `/blog/${props.slug}`);
const serverURL = computed(() => (
  String(runtimeConfig.public.walineServerURL || walineConfig.value.serverURL || "").trim()
));
const isWalineEnabled = computed(() => (
  commentsConfig.value.enabled !== false &&
  commentsConfig.value.provider === "waline" &&
  serverURL.value.length > 0
));

const destroyWaline = () => {
  waline?.destroy();
  waline = null;
};

const mountWaline = async () => {
  if (!import.meta.client || !walineRoot.value || !isWalineEnabled.value) {
    return;
  }

  isLoading.value = true;
  loadError.value = "";

  try {
    const { init } = await import("@waline/client");
    destroyWaline();
    waline = init({
      el: walineRoot.value,
      serverURL: serverURL.value,
      path: walinePath.value,
      lang: walineConfig.value.lang || "zh-CN",
      pageSize: walineConfig.value.pageSize || 10,
      wordLimit: walineConfig.value.wordLimit || 1600,
      login: walineConfig.value.login || "enable",
      commentSorting: walineConfig.value.commentSorting || "latest",
      meta: walineConfig.value.meta || ["nick", "mail", "link"],
      requiredMeta: walineConfig.value.requiredMeta || ["nick", "mail"],
      dark: "html[data-theme='dark']",
      comment: true,
      pageview: false,
      search: false,
      imageUploader: false,
      highlighter: false,
      texRenderer: false,
      locale: {
        placeholder: "写下你的想法",
        sofa: "还没有评论。",
        submit: "发布评论",
      },
    });
  } catch {
    loadError.value = "Waline 评论加载失败，请确认本地评论服务已经启动。";
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  void mountWaline();
});

watch([walineRoot, serverURL, walinePath, isWalineEnabled], () => {
  void nextTick(mountWaline);
});

onBeforeUnmount(destroyWaline);
</script>

<template>
  <section
    class="article-comments grid max-w-190 gap-(--space-4) border-y border-line py-(--space-4)"
    aria-labelledby="article-comments-title"
  >
    <header class="grid gap-(--space-1)">
      <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
        Comments / Waline
      </p>
      <h2
        id="article-comments-title"
        class="m-0 font-display text-[56px] font-normal leading-none text-ink max-[520px]:text-[38px]"
      >
        评论
      </h2>
    </header>

    <div
      v-if="!isWalineEnabled"
      class="grid min-h-28 place-items-center border border-line bg-code-surface p-(--space-3) text-center text-muted"
    >
      <p class="m-0 text-sm font-bold">
        评论系统未启用，请配置 Waline 服务地址。
      </p>
    </div>

    <div
      v-else
      class="grid gap-(--space-2)"
    >
      <div
        ref="walineRoot"
        class="article-comments__waline"
      />
      <p
        v-if="isLoading"
        class="m-0 text-sm font-bold text-muted"
        role="status"
      >
        评论加载中
      </p>
      <p
        v-if="loadError"
        class="m-0 border border-line bg-code-surface p-(--space-2) text-sm font-bold text-muted"
        role="alert"
      >
        {{ loadError }}
      </p>
    </div>
  </section>
</template>

<style>
@import "@waline/client/waline.css";

.article-comments {
  --waline-font-size: 16px;
  --waline-theme-color: var(--ink);
  --waline-active-color: color-mix(in oklch, var(--ink), var(--paper) 18%);
  --waline-color: var(--ink);
  --waline-info-color: var(--muted);
  --waline-placeholder-color: var(--quiet);
  --waline-bg-color: var(--paper);
  --waline-bg-color-light: var(--code-surface);
  --waline-bg-color-hover: color-mix(in oklch, var(--paper), var(--ink) 7%);
  --waline-border-color: var(--line);
  --waline-avatar-size: 38px;
  --waline-disable-bg-color: var(--code-surface);
  --waline-disable-color: var(--quiet);
  --waline-info-bg-color: var(--code-surface);
  --waline-dark-grey: var(--muted);
  --waline-light-grey: var(--quiet);
  --waline-badge-color: var(--muted);
  --waline-bq-color: var(--line);
  --waline-avatar-radius: var(--radius-sm);
  --waline-box-shadow: none;
  container-type: inline-size;
  isolation: isolate;
}

.article-comments__waline {
  font-family: inherit;
  color: var(--ink);
}

.article-comments__waline [data-waline] {
  display: grid;
  gap: var(--space-3);
}

.article-comments__waline .wl-panel {
  position: relative;
  z-index: 2;
  margin: 0;
  overflow: visible;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--paper);
  box-shadow: none;
}

.article-comments__waline .wl-header {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-bottom: 1px solid var(--line);
  background: var(--code-surface);
}

.article-comments__waline .wl-header-item {
  min-width: 0;
}

.article-comments__waline .wl-header-item:not(:last-child) {
  border-inline-end: 1px solid var(--line);
}

.article-comments__waline .wl-input {
  height: 44px;
  padding: 0 14px;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
}

.article-comments__waline .wl-input:focus {
  background: color-mix(in oklch, var(--paper), var(--ink) 4%);
  box-shadow: inset 0 0 0 1px var(--ink);
}

.article-comments__waline .wl-editor {
  min-height: 150px;
  padding: 16px;
  border: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: inherit;
  font-size: 16px;
  line-height: 1.75;
}

.article-comments__waline .wl-editor:focus {
  box-shadow: inset 0 0 0 1px var(--ink);
}

.article-comments__waline .wl-editor::placeholder,
.article-comments__waline .wl-input::placeholder {
  color: var(--quiet);
}

.article-comments__waline .wl-footer {
  position: relative;
  z-index: 3;
  border-top: 1px solid var(--line);
  background: var(--code-surface);
}

.article-comments__waline .wl-actions,
.article-comments__waline .wl-preview,
.article-comments__waline .wl-gif-popup,
.article-comments__waline .wl-emoji-popup {
  color: var(--muted);
}

.article-comments__waline .wl-gif-popup,
.article-comments__waline .wl-emoji-popup {
  z-index: 40;
  max-width: min(526px, calc(100vw - var(--space-4)));
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--paper);
  box-shadow: 0 18px 48px color-mix(in oklch, var(--ink), transparent 78%);
}

.article-comments__waline .wl-info {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.article-comments__waline .wl-btn {
  min-height: 34px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--paper);
  color: var(--ink);
  font-family: inherit;
  font-weight: 700;
  transition-duration: 160ms;
  transition-property: background-color, border-color, color;
  transition-timing-function: cubic-bezier(.2, .8, .2, 1);
}

.article-comments__waline .wl-btn:hover,
.article-comments__waline .wl-btn:active {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}

.article-comments__waline .wl-btn.primary {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}

.article-comments__waline .wl-btn.primary:hover,
.article-comments__waline .wl-btn.primary:active {
  background: var(--button-active);
  border-color: var(--button-active);
  color: var(--button-active-text);
}

.article-comments__waline .wl-meta-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0;
  padding-block: 0;
  border-bottom: 1px solid var(--line);
}

.article-comments__waline .wl-count {
  color: var(--ink);
  font-family: var(--font-code);
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
}

.article-comments__waline .wl-num {
  color: var(--ink);
}

.article-comments__waline .wl-sort {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.article-comments__waline .wl-sort li {
  margin: 0;
  padding: 5px 9px;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.article-comments__waline .wl-sort li:hover,
.article-comments__waline .wl-sort li.active {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--paper);
}

.article-comments__waline .wl-cards {
  display: grid;
  gap: var(--space-2);
}

.article-comments__waline .wl-card {
  margin: 0;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--line);
}

.article-comments__waline .wl-card:last-child {
  border-bottom: 0;
}

.article-comments__waline .wl-card-item {
  gap: 12px;
}

.article-comments__waline .wl-user img,
.article-comments__waline .wl-user .wl-avatar {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--code-surface);
}

.article-comments__waline .wl-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.article-comments__waline .wl-nick {
  color: var(--ink);
  font-weight: 800;
  text-decoration: none;
}

.article-comments__waline .wl-time,
.article-comments__waline .wl-meta {
  color: var(--muted);
  font-family: var(--font-code);
  font-size: 12px;
}

.article-comments__waline .wl-badge {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--code-surface);
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}

.article-comments__waline .wl-comment-actions button,
.article-comments__waline .wl-delete,
.article-comments__waline .wl-edit,
.article-comments__waline .wl-like,
.article-comments__waline .wl-reply {
  color: var(--muted);
}

.article-comments__waline .wl-comment-actions button:hover,
.article-comments__waline .wl-delete:hover,
.article-comments__waline .wl-edit:hover,
.article-comments__waline .wl-like:hover,
.article-comments__waline .wl-reply:hover,
.article-comments__waline .wl-reply.active {
  color: var(--ink);
}

.article-comments__waline .wl-content {
  color: var(--ink);
  font-size: 16px;
  line-height: 1.75;
}

.article-comments__waline .wl-content p {
  margin: 8px 0;
}

.article-comments__waline .wl-content a {
  color: var(--ink);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.article-comments__waline .wl-content code {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--code-surface);
  color: var(--code-text);
  font-family: var(--font-code);
  font-size: .9em;
}

.article-comments__waline .wl-content pre,
.article-comments__waline .wl-quote {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  background: var(--code-surface);
}

.article-comments__waline .wl-empty,
.article-comments__waline .wl-loading,
.article-comments__waline .wl-operation,
.article-comments__waline .wl-power {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.article-comments__waline .wl-power a {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 4px;
}

.article-comments__waline [data-waline] ol {
  list-style: decimal;
  padding-left: var(--space-3);
}

.article-comments__waline [data-waline] ul {
  list-style: disc;
  padding-left: var(--space-3);
}

@media (max-width: 580px) {
  .article-comments__waline .wl-header {
    grid-template-columns: 1fr;
  }

  .article-comments__waline .wl-header-item:not(:last-child) {
    border-inline-end: 0;
    border-bottom: 1px solid var(--line);
  }

  .article-comments__waline .wl-meta-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .article-comments__waline .wl-editor {
    min-height: 132px;
  }
}
</style>
