export type ThemeMode = 'light' | 'dark' | 'system'

export const themeModeStorageKey = 'chanko-theme-mode'

export const isThemeMode = (value: string | null | undefined): value is ThemeMode => (
  value === 'light' || value === 'dark' || value === 'system'
)

export const getStoredThemeMode = (): ThemeMode => {
  if (!import.meta.client) {
    return 'system'
  }

  const storedMode = localStorage.getItem(themeModeStorageKey)

  return isThemeMode(storedMode) ? storedMode : 'system'
}

export const getInitialThemeMode = (): ThemeMode => {
  if (!import.meta.client) {
    return 'system'
  }

  const domMode = document.documentElement.dataset.themeMode

  return isThemeMode(domMode) ? domMode : getStoredThemeMode()
}

export const applyThemeModeToDocument = (mode: ThemeMode) => {
  if (!import.meta.client) {
    return
  }

  const root = document.documentElement

  if (mode === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.dataset.theme = mode
  }

  root.dataset.themeMode = mode
}
