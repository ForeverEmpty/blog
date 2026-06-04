export default defineNuxtPlugin((nuxtApp) => {
  const root = document.documentElement
  let header: HTMLElement | null = null
  let resizeObserver: ResizeObserver | null = null
  let rafId = 0

  const getHashTarget = () => {
    if (!window.location.hash) {
      return null
    }

    const rawHash = window.location.hash.slice(1)
    const id = decodeURIComponent(rawHash)

    return document.getElementById(id)
  }

  const updateHeaderHeight = () => {
    header = header || document.querySelector<HTMLElement>('.site-header')

    if (!header) {
      return
    }

    const height = Math.ceil(header.getBoundingClientRect().height)
    root.style.setProperty('--site-header-height', `${height}px`)
  }

  const scheduleHeaderHeightUpdate = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId)
    }

    rafId = window.requestAnimationFrame(() => {
      rafId = 0
      updateHeaderHeight()
    })
  }

  const scrollCurrentHashIntoView = () => {
    const target = getHashTarget()

    if (!target) {
      return
    }

    target.scrollIntoView({ block: 'start' })
  }

  const observeHeader = () => {
    header = document.querySelector<HTMLElement>('.site-header')

    if (!header) {
      return
    }

    resizeObserver?.disconnect()
    resizeObserver = new ResizeObserver(scheduleHeaderHeightUpdate)
    resizeObserver.observe(header)
    scheduleHeaderHeightUpdate()
  }

  nuxtApp.hook('app:mounted', () => {
    observeHeader()
    window.addEventListener('resize', scheduleHeaderHeightUpdate, { passive: true })

    window.requestAnimationFrame(() => {
      updateHeaderHeight()
      window.requestAnimationFrame(scrollCurrentHashIntoView)
    })
  })

  nuxtApp.hook('page:finish', () => {
    observeHeader()
    window.requestAnimationFrame(() => {
      updateHeaderHeight()
      scrollCurrentHashIntoView()
    })
  })
})
