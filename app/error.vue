<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const appConfig = useAppConfig()

const statusCode = computed(() => props.error.statusCode ?? 500)
const isNotFound = computed(() => statusCode.value === 404)
const errorTitle = computed(() => isNotFound.value
  ? appConfig.error.notFoundTitle
  : appConfig.error.fallbackTitle
)
const errorDescription = computed(() => isNotFound.value
  ? appConfig.error.notFoundDescription
  : appConfig.error.fallbackDescription
)

const returnHome = () => {
  clearError({ redirect: appConfig.site.homeHref })
}

const retryPage = () => {
  if (import.meta.client) {
    window.location.reload()
  }
}

useHead({
  title: `${statusCode.value} - ${appConfig.site.name}`
})
</script>

<template>
  <NuxtLayout>
    <section
      class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(0,1fr)] content-center px-[clamp(var(--space-3),5vw,var(--space-8))] py-(--space-8) max-[760px]:min-h-[calc(100vh-133px)] max-[760px]:px-(--space-2)"
      aria-labelledby="error-title"
    >
      <div class="grid max-w-280 gap-(--space-6)">
        <div class="grid gap-(--space-2)">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
            {{ appConfig.error.eyebrow }} / {{ statusCode }}
          </p>
          <h1
            id="error-title"
            class="m-0 max-w-230 font-display text-[132px] font-normal leading-[0.95] tracking-normal text-ink text-pretty max-[1100px]:text-[88px] max-[520px]:text-[56px]"
          >
            {{ errorTitle }}
          </h1>
        </div>

        <div class="grid max-w-230 grid-cols-[minmax(0,560px)_auto] items-end gap-(--space-4) max-[760px]:grid-cols-1">
          <p class="m-0 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
            {{ errorDescription }}
          </p>

          <div class="flex flex-wrap gap-(--space-2)">
            <AppButton @click="returnHome">
              {{ appConfig.error.homeAction }}
            </AppButton>
            <AppButton variant="text" @click="retryPage">
              {{ appConfig.error.retryAction }}
            </AppButton>
          </div>
        </div>
      </div>
    </section>
  </NuxtLayout>
</template>
