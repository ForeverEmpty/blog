import type { ThemeMode } from '~/utils/themeMode'
import {
  applyThemeModeToDocument,
  getInitialThemeMode,
  getStoredThemeMode,
  themeModeStorageKey
} from '~/utils/themeMode'

type ThemeOption = {
  mode: ThemeMode
  label: string
  title: string
  icon: string
}

const transitionClass = 'theme-is-transitioning'
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
  startViewTransition?: (callback: () => void) => {
    finished: Promise<void>
  }
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

const getResolvedTheme = (mode: ThemeMode) => {
  if (!import.meta.client || mode !== 'system') {
    return mode
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeMode = () => {
  const themeMode = useState<ThemeMode>('chanko-theme-mode', getInitialThemeMode)
  let systemThemeQuery: MediaQueryList | undefined
  let transitionTimer: number | undefined

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
    localStorage.setItem(themeModeStorageKey, mode)
    applyThemeMode(mode)
  }

  const finishTransition = () => {
    const root = document.documentElement

    window.clearTimeout(transitionTimer)
    root.classList.remove(transitionClass)
    root.classList.remove(viewTransitionClass)
  }

  const runThemeTransition = (mode: ThemeMode, event?: Event) => {
    const root = document.documentElement

    window.clearTimeout(transitionTimer)
    applyTransitionOrigin(getTransitionOrigin(event))

    if (prefersReducedMotion()) {
      commitThemeMode(mode)
      finishTransition()
      return
    }

    const viewTransitionDocument = document as ViewTransitionDocument

    if (viewTransitionDocument.startViewTransition) {
      root.classList.add(viewTransitionClass)
      viewTransitionDocument.startViewTransition(() => {
        commitThemeMode(mode)
      }).finished.finally(finishTransition)
      return
    }

    root.classList.add(transitionClass)
    commitThemeMode(mode)
    transitionTimer = window.setTimeout(finishTransition, transitionDuration)
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
    themeMode.value = getStoredThemeMode()
    applyThemeMode()

    systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemThemeQuery.addEventListener('change', syncSystemTheme)
  })

  onBeforeUnmount(() => {
    window.clearTimeout(transitionTimer)
    systemThemeQuery?.removeEventListener('change', syncSystemTheme)
    document.documentElement.classList.remove(transitionClass)
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
