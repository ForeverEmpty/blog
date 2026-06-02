import { nextTick } from 'vue'
import type { ThemeMode } from '~/utils/themeMode'
import {
  applyThemeModeToDocument,
  getInitialThemeMode,
  getStoredThemeMode,
  isThemeMode,
  themeModeCookieName,
  themeModeStorageKey
} from '~/utils/themeMode'

type ThemeOption = {
  mode: ThemeMode
  label: string
  title: string
  icon: string
}

const transitionClass = 'theme-is-transitioning'
const disableTransitionClass = 'theme-disable-transitions'
const viewTransitionClass = 'theme-view-transitioning'
const transitionDuration = 520

const themeOptions: ThemeOption[] = [
  { mode: 'light', label: '明', title: '明亮主题', icon: 'lucide:sun' },
  { mode: 'dark', label: '暗', title: '暗色主题', icon: 'lucide:moon' },
  { mode: 'system', label: '系统', title: '跟随系统主题', icon: 'lucide:monitor' }
]

const prefersReducedMotion = () => (
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void | Promise<void>) => {
    ready: Promise<void>
    finished: Promise<void>
  }
}

type ViewTransitionAnimationOptions = KeyframeAnimationOptions & {
  pseudoElement?: string
}

type ThemeTransitionOrigin = {
  x: number
  y: number
}

const getTransitionOrigin = (event?: Event): ThemeTransitionOrigin => {
  if (!import.meta.client) {
    return { x: 0, y: 0 }
  }

  if (event instanceof MouseEvent || event instanceof PointerEvent) {
    return {
      x: event.clientX,
      y: event.clientY
    }
  }

  return {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  }
}

const applyTransitionOrigin = (origin: ThemeTransitionOrigin) => {
  const root = document.documentElement

  root.style.setProperty('--theme-transition-x', `${origin.x}px`)
  root.style.setProperty('--theme-transition-y', `${origin.y}px`)
}

const getTransitionRadius = (origin: ThemeTransitionOrigin) => {
  const farthestX = Math.max(origin.x, window.innerWidth - origin.x)
  const farthestY = Math.max(origin.y, window.innerHeight - origin.y)

  return Math.ceil(Math.hypot(farthestX, farthestY)) + 96
}

const getResolvedTheme = (mode: ThemeMode) => {
  if (!import.meta.client || mode !== 'system') {
    return mode
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeMode = () => {
  const themeModeCookie = useCookie<ThemeMode | undefined>(themeModeCookieName, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax'
  })
  const themeMode = useState<ThemeMode>('chanko-theme-mode', () => (
    isThemeMode(themeModeCookie.value) ? themeModeCookie.value : getInitialThemeMode()
  ))
  let systemThemeQuery: MediaQueryList | undefined
  let transitionTimer: number | undefined
  let transitionId = 0

  const selectedIndex = computed(() => (
    Math.max(0, themeOptions.findIndex((option) => option.mode === themeMode.value))
  ))

  const indicatorStyle = computed(() => ({
    transform: `translateX(${selectedIndex.value * 100}%)`
  }))

  const notifyThemeChange = () => {
    window.dispatchEvent(new CustomEvent('chanko-theme-change', {
      detail: {
        mode: themeMode.value,
        resolvedTheme: getResolvedTheme(themeMode.value)
      }
    }))
  }

  const applyThemeMode = (mode = themeMode.value) => {
    if (!import.meta.client) {
      return
    }

    applyThemeModeToDocument(mode)
    notifyThemeChange()
  }

  const commitThemeMode = (mode: ThemeMode) => {
    themeMode.value = mode
    themeModeCookie.value = mode
    localStorage.setItem(themeModeStorageKey, mode)
    applyThemeMode(mode)
  }

  const finishTransition = (id = transitionId) => {
    if (id !== transitionId) {
      return
    }

    const root = document.documentElement

    window.clearTimeout(transitionTimer)
    root.classList.remove(transitionClass)
    root.classList.remove(disableTransitionClass)
    root.classList.remove(viewTransitionClass)
  }

  const runThemeTransition = (mode: ThemeMode, event?: Event) => {
    const root = document.documentElement
    const origin = getTransitionOrigin(event)
    const currentTransitionId = transitionId + 1

    transitionId = currentTransitionId
    window.clearTimeout(transitionTimer)
    applyTransitionOrigin(origin)

    if (prefersReducedMotion()) {
      commitThemeMode(mode)
      finishTransition(currentTransitionId)
      return
    }

    const viewTransitionDocument = document as ViewTransitionDocument

    if (viewTransitionDocument.startViewTransition) {
      root.classList.add(viewTransitionClass)
      root.classList.add(disableTransitionClass)

      const transition = viewTransitionDocument.startViewTransition(async () => {
        commitThemeMode(mode)
        await nextTick()
      })

      transition.ready
        .then(() => {
          if (currentTransitionId !== transitionId) {
            return transition.finished
          }

          const radius = getTransitionRadius(origin)
          const animation = root.animate(
            {
              clipPath: [
                `circle(0px at ${origin.x}px ${origin.y}px)`,
                `circle(${radius}px at ${origin.x}px ${origin.y}px)`
              ]
            },
            {
              duration: 620,
              easing: 'cubic-bezier(.22, 1, .36, 1)',
              fill: 'both',
              pseudoElement: '::view-transition-new(root)'
            } as ViewTransitionAnimationOptions
          )

          return Promise.allSettled([animation.finished, transition.finished])
        })
        .catch(() => transition.finished)
        .finally(() => finishTransition(currentTransitionId))
      return
    }

    root.classList.add(transitionClass)
    commitThemeMode(mode)
    transitionTimer = window.setTimeout(() => finishTransition(currentTransitionId), transitionDuration)
  }

  const setThemeMode = (mode: ThemeMode, event?: Event) => {
    if (!import.meta.client || themeMode.value === mode) {
      return
    }

    runThemeTransition(mode, event)
  }

  const syncSystemTheme = () => {
    if (themeMode.value === 'system') {
      runThemeTransition('system')
    }
  }

  onMounted(() => {
    const storedThemeMode = getStoredThemeMode()
    const nextThemeMode = isThemeMode(themeModeCookie.value) ? themeModeCookie.value : storedThemeMode

    themeMode.value = nextThemeMode
    themeModeCookie.value = nextThemeMode
    applyThemeMode()

    systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemThemeQuery.addEventListener('change', syncSystemTheme)
  })

  onBeforeUnmount(() => {
    transitionId += 1
    window.clearTimeout(transitionTimer)
    systemThemeQuery?.removeEventListener('change', syncSystemTheme)
    document.documentElement.classList.remove(transitionClass)
    document.documentElement.classList.remove(disableTransitionClass)
    document.documentElement.classList.remove(viewTransitionClass)
  })

  return {
    themeMode,
    themeOptions,
    selectedIndex,
    indicatorStyle,
    setThemeMode
  }
}
