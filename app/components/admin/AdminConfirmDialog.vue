<script setup lang="ts">
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'warning'
}>(), {
  confirmLabel: '确认',
  cancelLabel: '取消',
  tone: 'danger'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const dialogRef = ref<HTMLElement | null>(null)

watch(
  () => props.open,
  async (open) => {
    if (!open || !import.meta.client) {
      return
    }

    await nextTick()
    dialogRef.value?.focus()
  }
)
</script>

<template>
  <Teleport to="body">
    <Transition
      name="dialog"
    >
      <div
        v-if="props.open"
        class="fixed inset-0 z-[60] grid place-items-center bg-ink/55 p-(--space-3)"
        role="presentation"
        @click.self="emit('cancel')"
      >
        <section
          ref="dialogRef"
          class="dialog-panel grid w-full max-w-150 gap-(--space-3) border border-line bg-paper p-(--space-3) text-ink outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-confirm-title"
          tabindex="-1"
          @keydown.esc="emit('cancel')"
        >
          <div class="flex items-start gap-(--space-2)">
            <span
              class="grid h-11 w-11 shrink-0 place-items-center border border-line bg-code-surface"
              aria-hidden="true"
            >
              <Icon
                :name="props.tone === 'danger' ? 'lucide:triangle-alert' : 'lucide:circle-alert'"
                mode="svg"
                class="h-5 w-5"
              />
            </span>
            <div class="grid min-w-0 gap-1">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                Operation Confirmation
              </p>
              <h2 id="admin-confirm-title" class="m-0 text-[24px] font-bold leading-tight text-ink">
                {{ props.title }}
              </h2>
              <p class="m-0 whitespace-pre-line text-base leading-[1.7] text-muted">
                {{ props.message }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap justify-end gap-(--space-1) border-t border-line pt-(--space-2)">
            <AppButton variant="outline" @click="emit('cancel')">
              {{ props.cancelLabel }}
            </AppButton>
            <AppButton variant="solid" @click="emit('confirm')">
              <Icon name="lucide:check" mode="svg" class="h-4 w-4" aria-hidden="true" />
              {{ props.confirmLabel }}
            </AppButton>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
