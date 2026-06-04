import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import type { H3Event } from "h3";

type AiSummaryConfig = {
  enabled?: boolean;
  endpoint?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type ArticleSummary = {
  overview: string;
  points: string[];
  sections: string[];
  contentHash: string;
  generatedAt: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const readArticleMarkdown = async (slug: string) => {
  if (!/^[a-z0-9-]+$/i.test(slug)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid article slug",
    });
  }

  const contentDir = resolve(process.cwd(), "content", "blog");
  const markdownPath = resolve(join(contentDir, `${slug}.md`));
  const relativeMarkdownPath = relative(contentDir, markdownPath);

  if (relativeMarkdownPath.startsWith("..") || isAbsolute(relativeMarkdownPath)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid article path",
    });
  }

  try {
    return await readFile(markdownPath, "utf8");
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Article Markdown Not Found",
    });
  }
};

const markdownHash = (markdown: string) => (
  createHash("sha256").update(markdown).digest("hex").slice(0, 24)
);

const parseFrontmatter = (markdown: string) => {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const frontmatter = match?.[1] || "";
  const body = match ? markdown.slice(match[0].length) : markdown;
  const field = (name: string) => {
    const fieldMatch = frontmatter.match(new RegExp(`^${name}:\\s*(.+)$`, "m"));
    return fieldMatch?.[1]?.trim().replace(/^["']|["']$/g, "") || "";
  };

  return {
    title: field("title"),
    description: field("description"),
    body,
  };
};

const headingTexts = (body: string) => (
  [...body.matchAll(/^#{2,3}\s+(.+)$/gm)]
    .map((match) => (match[1] || "").replace(/[#*_`]/g, "").trim())
    .filter(Boolean)
    .slice(0, 5)
);

const parseSummaryJson = (content: string): Omit<ArticleSummary, "contentHash" | "generatedAt"> => {
  const jsonText = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const parsed = JSON.parse(jsonText) as Partial<ArticleSummary>;
  const overview = typeof parsed.overview === "string" ? parsed.overview.trim() : "";
  const points = Array.isArray(parsed.points)
    ? parsed.points.filter((point): point is string => typeof point === "string").map((point) => point.trim()).filter(Boolean)
    : [];
  const sections = Array.isArray(parsed.sections)
    ? parsed.sections.filter((section): section is string => typeof section === "string").map((section) => section.trim()).filter(Boolean)
    : [];

  if (!overview || !points.length) {
    throw new Error("Invalid AI summary JSON");
  }

  return {
    overview,
    points: points.slice(0, 4),
    sections: sections.slice(0, 5),
  };
};

const generateSummary = async ({
  markdown,
  title,
  description,
  sections,
  config,
  apiKey,
}: {
  markdown: string;
  title: string;
  description: string;
  sections: string[];
  config: Required<Pick<AiSummaryConfig, "endpoint" | "model" | "temperature" | "maxTokens">>;
  apiKey: string;
}) => {
  const response = await $fetch<ChatCompletionResponse>(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: {
      model: config.model,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "你是一个中文博客文章摘要助手。",
            "只根据用户提供的 Markdown 内容总结，不添加文章没有出现的信息。",
            "输出严格 JSON，不要 Markdown，不要代码块。",
            "JSON 格式：{\"overview\":\"一句话总览\",\"points\":[\"要点1\",\"要点2\",\"要点3\"],\"sections\":[\"章节1\",\"章节2\"]}",
            "overview 不超过 90 个中文字符；points 3 到 4 条，每条不超过 80 个中文字符；sections 最多 5 个。",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            title,
            description,
            detectedSections: sections,
            markdown,
          }),
        },
      ],
    },
  });
  const content = response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI response is empty");
  }

  return parseSummaryJson(content);
};

const writeAiSummaryFailureLog = async (event: H3Event, slug: string, message: string, error?: unknown) => {
  await createAdminNotificationEvent(event, {
    source: "ai.summary.error",
    title: `AI 摘要失败：${slug || "unknown"}`,
    body: message,
    level: "danger",
    href: "admin:logs",
    hrefLabel: "查看日志",
    targetId: slug || "unknown",
    payload: {
      slug,
      error: error instanceof Error ? error.message : String(error || ""),
    },
  }).catch(() => {});
};

export default defineEventHandler(async (event) => {
  const appConfig = useAppConfig();
  const aiSummary = (appConfig.aiSummary || {}) as AiSummaryConfig;

  if (!aiSummary.enabled) {
    throw createError({
      statusCode: 404,
      statusMessage: "AI summary is disabled",
    });
  }

  const slug = getRouterParam(event, "slug") || "";
  const markdown = await readArticleMarkdown(slug);
  const article = await readArticle(slug);

  if (!isArticlePublic(article)) {
    throw createError({
      statusCode: 404,
      statusMessage: "Article Markdown Not Found",
    });
  }

  const contentHash = markdownHash(markdown);
  const cacheKey = `${slug}/${contentHash}`;
  const storage = useStorage("aiSummary");
  const cached = await storage.getItem<ArticleSummary>(cacheKey);

  if (cached?.contentHash === contentHash) {
    return {
      overview: cached.overview,
      points: cached.points,
      sections: cached.sections,
      cached: true,
      generatedAt: cached.generatedAt,
    };
  }

  const runtimeConfig = useRuntimeConfig(event);
  const apiKey = runtimeConfig.aiSummaryApiKey;

  if (!apiKey) {
    await writeAiSummaryFailureLog(event, slug, "AI 摘要失败：未配置 API Key");

    throw createError({
      statusCode: 500,
      statusMessage: "AI summary API key is not configured",
    });
  }

  const { title, description, body } = parseFrontmatter(markdown);
  const sections = headingTexts(body);
  const endpoint = runtimeConfig.aiSummaryEndpoint || aiSummary.endpoint || "https://api.openai.com/v1/chat/completions";
  const model = aiSummary.model || "gpt-4o-mini";
  const temperature = typeof aiSummary.temperature === "number" ? aiSummary.temperature : 0.2;
  const maxTokens = typeof aiSummary.maxTokens === "number" ? aiSummary.maxTokens : 700;
  let generated: Omit<ArticleSummary, "contentHash" | "generatedAt">;

  try {
    generated = await generateSummary({
      markdown,
      title,
      description,
      sections,
      config: {
        endpoint,
        model,
        temperature,
        maxTokens,
      },
      apiKey,
    });
  } catch (error) {
    await writeAiSummaryFailureLog(event, slug, "AI 摘要失败：接口返回异常或内容无法解析", error);
    throw error;
  }

  const summary: ArticleSummary = {
    ...generated,
    contentHash,
    generatedAt: new Date().toISOString(),
  };

  await storage.setItem(cacheKey, summary);

  return {
    overview: summary.overview,
    points: summary.points,
    sections: summary.sections,
    cached: false,
    generatedAt: summary.generatedAt,
  };
});
