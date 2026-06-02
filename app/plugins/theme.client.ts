import type { ThemeMode } from '~/utils/themeMode'
import { applyThemeModeToDocument, getStoredThemeMode, isThemeMode, themeModeCookieName } from '~/utils/themeMode'

export default defineNuxtPlugin(() => {
  const themeModeCookie = useCookie<ThemeMode | undefined>(themeModeCookieName, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax'
  })
  const cookieThemeMode = isThemeMode(themeModeCookie.value) ? themeModeCookie.value : undefined
  const initialThemeMode = cookieThemeMode || getStoredThemeMode()
  const themeMode = useState<ThemeMode>('chanko-theme-mode', () => (
    cookieThemeMode || getStoredThemeMode()
  ))

  themeMode.value = initialThemeMode
  applyThemeModeToDocument(themeMode.value)
})
