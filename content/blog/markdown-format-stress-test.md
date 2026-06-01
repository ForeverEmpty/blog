---
title: "这是一篇用于测试博客文章页目录高亮与 Markdown 全格式渲染能力的超长题目，它需要在窄屏、宽屏、目录列和列表页中都保持可读并自然换行"
description: "用于验证标题换行、目录高亮、正文排版和常见 Markdown 语法渲染的测试文章。"
date: 2026-05-23
author: Chanko
authorUrl: /about
category: "测试记录"
views: 0
published: true
locked: false
pinned: false
tags:
  - Markdown
  - Test
  - "Nuxt Content"
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

```ts [useCanvasWordmarkMotion.ts]
const useCanvasWordmarkMotion = ({
  canvas,
  root,
  text,
  config
}: UseCanvasWordmarkMotionOptions) => {
  let animationFrame = 0
  let motionAnimationFrame = 0
  let resizeObserver: ResizeObserver | undefined
  let intersectionObserver: IntersectionObserver | undefined
  let sourceCanvas: HTMLCanvasElement | undefined
  let animationStartedAt = 0
  let hasAnimated = false
  let progressState = 0
  const pointer = {
    x: 0,
    y: 0,
    lastX: 0,
    lastMovedAt: 0,
    shift: 0,
    targetShift: 0,
    isInside: false
  }

  const drawText = (
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
    progress: number,
    fillStyle: string
  ) => {
    context.textBaseline = 'middle'
    context.textAlign = 'left'

    let fontSize = height * 0.82
    context.font = `${fontSize}px Georgia, "Times New Roman", serif`

    const measuredWidth = context.measureText(text).width

    if (measuredWidth > width) {
      fontSize *= width / measuredWidth
      context.font = `${fontSize}px Georgia, "Times New Roman", serif`
    }

    const metrics = context.measureText(text)
    const visualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
    const y = Math.max(metrics.actualBoundingBoxAscent, (height - visualHeight) / 2 + metrics.actualBoundingBoxAscent)
    let x = 0

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index]!
      const delay = index * 0.055
      const localProgress = Math.max(0, Math.min(1, (progress - delay) / 0.42))
      const eased = easeOut(localProgress)

      context.globalAlpha = 0.18 + eased * 0.82
      context.fillStyle = fillStyle
      context.fillText(character, x, y + (1 - eased) * 18)
      x += context.measureText(character).width
    }

    context.globalAlpha = 1
  }

  const drawMotionText = (
    context: CanvasRenderingContext2D,
    source: HTMLCanvasElement,
    width: number,
    height: number,
    pixelRatio: number,
    timestamp: number
  ) => {
    if (timestamp - pointer.lastMovedAt > 80) {
      pointer.targetShift = 0
    }

    const shift = prefersReducedMotion() ? 0 : pointer.shift

    if (Math.abs(shift) < 0.08) {
      context.drawImage(source, 0, 0, source.width, source.height, 0, 0, width, height)
      return
    }

    const radiusX = Math.max(config.rangeMinX, Math.min(width * config.rangeRatioX, config.rangeMaxX))
    const radiusY = Math.max(config.rangeMinY, Math.min(height * config.rangeRatioY, config.rangeMaxY))
    const sourceContext = source.getContext('2d')
    const sourcePixels = sourceContext?.getImageData(0, 0, source.width, source.height)

    const getInkCoverage = (x: number, y: number, drawWidth: number, drawHeight: number) => {
      if (!sourcePixels) {
        return 1
      }

      let inkedSamples = 0
      let totalSamples = 0
      const sampleColumns = 6
      const sampleRows = 6

      for (let row = 0; row < sampleRows; row += 1) {
        for (let column = 0; column < sampleColumns; column += 1) {
          const sampleX = Math.min(
            source.width - 1,
            Math.round((x + (column + 0.5) * drawWidth / sampleColumns) * pixelRatio)
          )
          const sampleY = Math.min(
            source.height - 1,
            Math.round((y + (row + 0.5) * drawHeight / sampleRows) * pixelRatio)
          )
          const alphaIndex = (sampleY * source.width + sampleX) * 4 + 3

          totalSamples += 1

          if ((sourcePixels.data[alphaIndex] ?? 0) > 24) {
            inkedSamples += 1
          }
        }
      }

      return inkedSamples / totalSamples
    }

    for (let y = 0; y < height; y += config.tileHeight) {
      for (let x = 0; x < width; x += config.tileWidth) {
        const drawWidth = Math.min(config.tileWidth, width - x)
        const drawHeight = Math.min(config.tileHeight, height - y)
        const inkCoverage = getInkCoverage(x, y, drawWidth, drawHeight)
        const centerX = x + drawWidth / 2
        const centerY = y + drawHeight / 2
        const distanceX = centerX - pointer.x
        const distanceY = centerY - pointer.y
        const distance = Math.hypot(distanceX / radiusX, distanceY / radiusY)
        const influence = Math.max(0, 1 - distance)

        if (influence <= 0 || inkCoverage <= 0) {
          context.filter = 'none'
          context.drawImage(
            source,
            x * pixelRatio,
            y * pixelRatio,
            drawWidth * pixelRatio,
            drawHeight * pixelRatio,
            x,
            y,
            drawWidth,
            drawHeight
          )
          continue
        }

        const falloff = influence * influence * (3 - 2 * influence)
        const offsetX = shift * falloff * Math.max(config.minInkWeight, inkCoverage)

        context.filter = 'none'
        context.drawImage(
          source,
          x * pixelRatio,
          y * pixelRatio,
          drawWidth * pixelRatio,
          drawHeight * pixelRatio,
          x + offsetX,
          y,
          drawWidth,
          drawHeight
        )
      }
    }

    context.filter = 'none'
  }

  const draw = (progress = progressState, timestamp = performance.now()) => {
    const targetCanvas = canvas.value

    if (!targetCanvas) {
      return
    }

    progressState = progress

    const rect = targetCanvas.getBoundingClientRect()
    const width = Math.max(1, rect.width)
    const height = Math.max(1, rect.height)
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)

    if (targetCanvas.width !== Math.round(width * pixelRatio) || targetCanvas.height !== Math.round(height * pixelRatio)) {
      targetCanvas.width = Math.round(width * pixelRatio)
      targetCanvas.height = Math.round(height * pixelRatio)
    }

    const context = targetCanvas.getContext('2d')

    if (!context) {
      return
    }

    sourceCanvas ||= document.createElement('canvas')

    if (sourceCanvas.width !== targetCanvas.width || sourceCanvas.height !== targetCanvas.height) {
      sourceCanvas.width = targetCanvas.width
      sourceCanvas.height = targetCanvas.height
    }

    const sourceContext = sourceCanvas.getContext('2d')

    if (!sourceContext) {
      return
    }

    const ink = getToken('--ink', '#1f1d18')

    sourceContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    sourceContext.clearRect(0, 0, width, height)
    drawText(sourceContext, width, height, progress, ink)

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.clearRect(0, 0, width, height)
    drawMotionText(context, sourceCanvas, width, height, pixelRatio, timestamp)
  }

  const requestMotionFrame = () => {
    if (!motionAnimationFrame) {
      motionAnimationFrame = requestAnimationFrame(renderMotionFrame)
    }
  }

  const renderMotionFrame = (timestamp: number) => {
    motionAnimationFrame = 0
    pointer.shift += (pointer.targetShift - pointer.shift) * 0.22
    draw(progressState, timestamp)

    const isChangingShift = Math.abs(pointer.targetShift - pointer.shift) > 0.08

    if (isChangingShift || Math.abs(pointer.shift) > 0.08) {
      requestMotionFrame()
    }
  }

  const animate = (timestamp: number) => {
    if (!animationStartedAt) {
      animationStartedAt = timestamp
    }

    const progress = Math.min(1, (timestamp - animationStartedAt) / 1200)
    draw(progress)

    if (progress < 1) {
      animationFrame = requestAnimationFrame(animate)
    }
  }

  const startAnimation = () => {
    if (hasAnimated) {
      return
    }

    hasAnimated = true
    cancelAnimationFrame(animationFrame)

    if (prefersReducedMotion()) {
      draw(1)
      return
    }

    animationStartedAt = 0
    animationFrame = requestAnimationFrame(animate)
  }

  const updateMotion = (event: PointerEvent) => {
    const targetCanvas = canvas.value

    if (!targetCanvas) {
      return
    }

    const rect = targetCanvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const timestamp = event.timeStamp || performance.now()

    pointer.x = x
    pointer.y = y

    if (!pointer.isInside) {
      pointer.lastX = x
      pointer.lastMovedAt = timestamp
      pointer.isInside = true
      requestMotionFrame()
      return
    }

    const deltaX = x - pointer.lastX
    const elapsed = Math.max(16, timestamp - pointer.lastMovedAt)
    const horizontalSpeed = deltaX / elapsed

    pointer.targetShift = Math.max(
      -config.maxShift,
      Math.min(config.maxShift, horizontalSpeed * config.speedMultiplier)
    )
    pointer.lastX = x
    pointer.lastMovedAt = timestamp
    requestMotionFrame()
  }

  const clearMotion = () => {
    pointer.isInside = false
    pointer.targetShift = 0
    requestMotionFrame()
  }

  const focus = () => {
    const targetCanvas = canvas.value

    if (!targetCanvas) {
      return
    }

    const rect = targetCanvas.getBoundingClientRect()
    pointer.x = rect.width / 2
    pointer.y = rect.height / 2
    pointer.targetShift = 18
    pointer.lastMovedAt = performance.now()
    requestMotionFrame()
  }

  const redraw = () => draw()

  onMounted(() => {
    draw(0)
    window.addEventListener('chanko-theme-change', redraw)

    if (canvas.value) {
      resizeObserver = new ResizeObserver(() => draw())
      resizeObserver.observe(canvas.value)
    }

    if (root.value) {
      intersectionObserver = new IntersectionObserver((entries) => {
        const [entry] = entries

        if (entry?.isIntersecting && entry.intersectionRatio >= 0.3) {
          startAnimation()
          intersectionObserver?.disconnect()
        }
      }, {
        root: null,
        threshold: 0.3
      })

      intersectionObserver.observe(root.value)
    }
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(animationFrame)
    cancelAnimationFrame(motionAnimationFrame)
    window.removeEventListener('chanko-theme-change', redraw)
    resizeObserver?.disconnect()
    intersectionObserver?.disconnect()
  })

  return {
    updateMotion,
    clearMotion,
    focus
  }
}
```
::

## 表格

| 格式 | 用途 | 检查点 |
| --- | --- | --- |
| 标题 | 形成页面结构 | 是否进入目录 |
| 表格 | 承载对比信息 | 边线和间距是否清楚 |
| 代码块 | 展示实现片段 | 是否可以横向滚动 |

## 图片

![ChankoBlog favicon](https://api.elaina.cat/random/)

图片使用项目内已有资源，避免引入外部不稳定地址。

## 视频与富媒体卡片

::content-video{src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" poster="/favicon.ico" title="视频组件示例" description="视频组件用于在文章中嵌入可控的视频内容，默认显示控制栏并使用 metadata 预加载。"}
::

::sensitive-image{src="/favicon.ico" alt="ChankoBlog favicon" title="敏感图片示例" sensitive="这张图片需要读者主动确认后再显示。" description="点击显示前不会渲染真实图片。"}
::

::link-card{href="/about" image="/favicon.ico" title="关于 ChankoBlog" description="链接卡片可以展示图片或图标、标题、简介和跳转地址。" label="Internal Link"}
::

## 文档提示块

::normal
普通说明用于承载补充信息，视觉权重低于警告块。
::

::tip{title="写作提示"}
提示块用于给出更直接的建议，可以包含 `inline code` 和 [链接](https://content.nuxt.com/)。
::

::success
绿色状态块用于表示配置完成、校验通过或推荐的安全路径。
::

::warning
警告块用于提示需要谨慎处理的内容，避免用户忽略潜在风险。
::

::danger{title="严重警告"}
严重警告块用于不可逆、破坏性或高风险操作前的明确提醒。
::

---

## 脚注

这句话包含一个脚注引用。[^toc]

[^toc]: 如果当前 Markdown 解析器不启用脚注扩展，这里也能作为测试文本暴露兼容性问题。
