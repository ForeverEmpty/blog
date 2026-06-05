import type { AdminSessionStatus } from '~/types/admin'

type AdminLayoutAction = (() => void | Promise<void>) | null

const createArticleHandler = shallowRef<AdminLayoutAction>(null)
const logoutHandler = shallowRef<AdminLayoutAction>(null)

const createEmptyAdminSessionStatus = (): AdminSessionStatus => ({
  authenticated: false,
  configured: false,
  username: 'admin',
  csrfToken: '',
  expiresAt: '',
  secondsRemaining: 0,
  checkedAt: '',
  checking: false
})

export const useAdminLayoutState = () => {
  const notice = useState('admin-layout-notice', () => '')
  const sessionStatus = useState<AdminSessionStatus>('admin-layout-session-status', createEmptyAdminSessionStatus)

  const createArticle = () => {
    void createArticleHandler.value?.()
  }

  const logout = () => {
    void logoutHandler.value?.()
  }

  const setCreateArticleHandler = (handler: AdminLayoutAction) => {
    createArticleHandler.value = handler
  }

  const setLogoutHandler = (handler: AdminLayoutAction) => {
    logoutHandler.value = handler
  }

  return {
    notice,
    sessionStatus,
    createArticle,
    logout,
    setCreateArticleHandler,
    setLogoutHandler
  }
}
