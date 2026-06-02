import { readFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, "slug") || "";

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
    const article = await readArticle(slug);

    if (!isArticlePublic(article)) {
      throw createError({
        statusCode: 404,
        statusMessage: "Article Markdown Not Found",
      });
    }

    const markdown = await readFile(markdownPath, "utf8");

    return { markdown };
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: "Article Markdown Not Found",
    });
  }
});
