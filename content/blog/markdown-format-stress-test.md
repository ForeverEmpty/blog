---
title: "这是一篇用于测试博客文章页目录高亮与 Markdown 全格式渲染能力的超长题目，它需要在窄屏、宽屏、目录列和列表页中都保持可读并自然换行"
description: "用于验证标题换行、目录高亮、正文排版和常见 Markdown 语法渲染的测试文章。"
date: "2026-05-23"
author: Chanko
authorUrl: /about
published: true
tags:
  - Markdown
  - Test
  - Nuxt Content
---

# 一级标题用于验证正文中的 H1

这篇文章只用于测试渲染能力，不代表正式内容。正文会覆盖常见 Markdown 写法，包括段落、强调、列表、引用、表格、代码、图片、分隔线和脚注。

普通段落需要保持舒适行长。这里包含 *斜体*、**粗体**、***粗斜体***、~~删除线~~、`inline code`，以及一个指向 [Nuxt Content 文档](https://content.nuxt.com/) 的链接。

## 二级标题：段落与换行

这一段用于观察中文长句的换行效果。文章页的正文宽度应该稳定，不应该因为目录列或超长题目产生横向滚动。

在 Markdown 中，两个空格可以制造硬换行。  
这一行应当紧接在上一行之后显示。

### 三级标题：无序列表

- 第一项用于验证普通列表。
- 第二项包含 **强调文本**。
- 第三项包含嵌套列表：
  - 嵌套项 A。
  - 嵌套项 B。

### 三级标题：有序列表

1. 先建立内容文件。
2. 再确认目录数据。
3. 最后检查滚动高亮。

#### 四级标题：任务列表

- [x] 渲染标题。
- [x] 渲染列表。
- [ ] 接入更多真实文章。

##### 五级标题：引用块

> 目录高亮的规则是：屏幕中可见的标题里，选择最后出现的一个标题；如果屏幕中没有标题，则回退到已经越过视口顶部的最后一个标题。
>
> 这段引用用于检查多段引用的间距和边界。

###### 六级标题：代码

行内代码示例：`const state = 'typing'`。

::code-group
```ts [TypewriterState.ts]
type TypewriterState = 'typing' | 'paused' | 'deleting'

const nextState = (state: TypewriterState): TypewriterState => {
  if (state === 'typing') return 'paused'
  if (state === 'paused') return 'deleting'
  return 'typing'
}
```

```vue [TypewriterText.vue]
<script setup lang="ts">
const props = defineProps<{
  text: string
}>()
</script>

<template>
  <span class="font-mono text-code-text">
    {{ props.text }}
  </span>
</template>
```
::

## 表格

| 格式 | 用途 | 检查点 |
| --- | --- | --- |
| 标题 | 形成页面结构 | 是否进入目录 |
| 表格 | 承载对比信息 | 边线和间距是否清楚 |
| 代码块 | 展示实现片段 | 是否可以横向滚动 |

## 图片

![ChankoBlog favicon](/favicon.ico)

图片使用项目内已有资源，避免引入外部不稳定地址。

---

## 脚注

这句话包含一个脚注引用。[^toc]

[^toc]: 如果当前 Markdown 解析器不启用脚注扩展，这里也能作为测试文本暴露兼容性问题。
