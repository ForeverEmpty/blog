---
title: "内容系统接入记录"
description: "记录 ChankoBlog 从静态页面走向 Nuxt Content 内容驱动页面的第一步。"
date: 2026-05-23
author: Chanko
authorUrl: /about
category: "开发记录"
views: 2
workflowStatus: published
published: true
locked: false
pinned: false
tags:
  - "Nuxt Content"
  - ChankoBlog
---



这篇文章用于验证 ChankoBlog 的内容系统接入：文章数据来自 `content/blog`，页面由 Nuxt Content 查询和渲染。

博客不会使用虚构统计或假文章来填充页面。列表、归档和详情页都应该以真实内容为边界；当内容不存在时，页面需要清楚地告诉读者当前状态。

## 当前完成的部分

- 定义文章 collection。
- 使用 Markdown 作为文章内容来源。
- 通过动态路由渲染文章详情。
- 将关于页从普通页面改为内容驱动页面。

## 下一步

后续可以把后台管理接到同一套字段上，包括标题、描述、发布时间、标签和发布状态。这样页面设计不需要改变，只需要替换数据来源。
