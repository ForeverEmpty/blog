import { onBeforeUnmount, onMounted } from 'vue'
import type { Ref } from 'vue'

export type CanvasWordmarkMotionConfig = {
  rangeMinX: number
  rangeRatioX: number
  rangeMaxX: number
  rangeMinY: number
  rangeRatioY: number
  rangeMaxY: number
  tileWidth: number
  tileHeight: number
  speedMultiplier: number
  maxShift: number
  minInkWeight: number
}

type UseCanvasWordmarkMotionOptions = {
  canvas: Ref<HTMLCanvasElement | null>
  root: Ref<HTMLElement | null>
  text: string
  config: CanvasWordmarkMotionConfig
}

const getToken = (name: string, fallback: string) => {
  if (typeof window === 'undefined') {
    return fallback
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

const easeOut = (value: number) => 1 - Math.pow(1 - value, 3)

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const useCanvasWordmarkMotion = ({
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
