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
const transitionDuration = 520

const themeOptions: ThemeOption[] = [
  { mode: 'light', label: '明', title: '明亮主题', icon: 'lucide:sun' },
  { mode: 'dark', label: '暗', title: '暗色主题', icon: 'lucide:moon' },
  { mode: 'system', label: '系统', title: '跟随系统主题', icon: 'lucide:monitor' }
]

const prefersReducedMotion = () => (
  import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
)

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
  }

  const runThemeTransition = (mode: ThemeMode) => {
    const root = document.documentElement

    window.clearTimeout(transitionTimer)

    if (prefersReducedMotion()) {
      commitThemeMode(mode)
      finishTransition()
      return
    }

    root.classList.add(transitionClass)
    commitThemeMode(mode)
    transitionTimer = window.setTimeout(finishTransition, transitionDuration)
  }

  const setThemeMode = (mode: ThemeMode) => {
    if (!import.meta.client || themeMode.value === mode) {
      return
    }

    runThemeTransition(mode)
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
  })

  return {
    themeMode,
    themeOptions,
    selectedIndex,
    indicatorStyle,
    setThemeMode
  }
}
