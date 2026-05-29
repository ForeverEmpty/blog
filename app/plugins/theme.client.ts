import type { ThemeMode } from '~/utils/themeMode'
import { applyThemeModeToDocument, getInitialThemeMode } from '~/utils/themeMode'

export default defineNuxtPlugin(() => {
  const themeMode = useState<ThemeMode>('chanko-theme-mode', getInitialThemeMode)

  themeMode.value = getInitialThemeMode()
  applyThemeModeToDocument(themeMode.value)
})
