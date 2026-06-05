<script setup lang="ts">
import { adminPanels } from '~/config/adminPanels'
import type { AdminPanel } from '~/types/admin'

const route = useRoute()
const {
  notice,
  sessionStatus,
  createArticle,
  logout
} = useAdminLayoutState()

const panelKeys = adminPanels.map((panel) => panel.key)
const isAdminPanel = (value: unknown): value is AdminPanel => (
  typeof value === 'string' && panelKeys.includes(value as AdminPanel)
)
const activePanel = computed<AdminPanel>(() => {
  const rawPanel = route.params.panel
  const panel = Array.isArray(rawPanel) ? rawPanel[0] : rawPanel

  return isAdminPanel(panel) ? panel : 'overview'
})
</script>

<template>
  <AdminFrame
    :active-panel="activePanel"
    :panels="adminPanels"
    :notice="notice"
    :session-status="sessionStatus"
    @create-article="createArticle"
    @logout="logout"
  >
    <slot />
  </AdminFrame>
</template>
