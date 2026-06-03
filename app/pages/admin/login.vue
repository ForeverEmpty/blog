<script setup lang="ts">
definePageMeta({
  layout: false
})

const appConfig = useAppConfig()
const router = useRouter()
const route = useRoute()

const username = ref('admin')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

const getSafeRedirectPath = () => {
  const redirect = Array.isArray(route.query.redirect)
    ? route.query.redirect[0]
    : route.query.redirect

  if (typeof redirect === 'string' && redirect.startsWith('/admin') && !redirect.startsWith('/admin/login')) {
    return redirect
  }

  return '/admin'
}

const { data: session } = await useAsyncData('admin-auth-session-login', () =>
  $fetch<{
    authenticated: boolean
    configured: boolean
    username: string
  }>('/api/admin/auth/session'),
  {
    default: () => ({
      authenticated: false,
      configured: false,
      username: 'admin'
    })
  }
)

if (session.value.authenticated) {
  await navigateTo(getSafeRedirectPath())
}

username.value = session.value.username || 'admin'

const submitLogin = async () => {
  if (loading.value) {
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await $fetch('/api/admin/auth/login', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value
      }
    })
    await router.push(getSafeRedirectPath())
  } catch (error) {
    const statusCode = isRecord(error) && 'statusCode' in error ? Number(error.statusCode) : 0

    if (statusCode === 503) {
      errorMessage.value = '后台密码或会话密钥未正确配置，请检查 ADMIN_PASSWORD 和 ADMIN_SESSION_SECRET。'
    } else if (statusCode === 429) {
      errorMessage.value = '登录尝试过多，请稍后再试。'
    } else {
      errorMessage.value = '用户名或密码不正确。'
    }
  } finally {
    loading.value = false
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
)

useSiteSeo({
  title: '后台登录',
  description: 'ChankoBlog 后台登录。',
  path: '/admin/login',
  noindex: true
})
</script>

<template>
  <main class="grid min-h-[100dvh] grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-b border-line bg-paper bg-[linear-gradient(90deg,var(--line)_1px,transparent_1px)] bg-size-[96px_96px] max-[760px]:grid-cols-1">
    <aside class="border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)">
      <p class="sticky top-32 m-0 text-[13px] font-bold uppercase tracking-normal max-[760px]:static">
        Admin
      </p>
    </aside>

    <section class="grid content-center px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
      <div class="grid max-w-170 gap-(--space-5)">
        <header class="grid gap-(--space-2)">
          <NuxtLink class="w-fit text-sm font-bold text-muted underline underline-offset-4 hover:text-ink" href="/">
            返回站点
          </NuxtLink>
          <h1 class="m-0 font-display text-[72px] font-normal leading-[0.96] text-ink text-pretty max-[720px]:text-[48px]">
            后台登录
          </h1>
          <p class="m-0 max-w-140 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
            输入后台凭据后才能管理文章、项目、友链和评论。
          </p>
        </header>

        <form class="grid gap-(--space-2) border-y border-line py-(--space-3)" @submit.prevent="submitLogin">
          <label class="grid gap-2 text-sm font-bold text-muted">
            用户名
            <input
              v-model="username"
              autocomplete="username"
              class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none transition-colors duration-200 focus:border-ink"
              :disabled="loading"
            >
          </label>
          <label class="grid gap-2 text-sm font-bold text-muted">
            密码
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none transition-colors duration-200 focus:border-ink"
              :disabled="loading"
            >
          </label>

          <p
            v-if="errorMessage"
            class="m-0 border border-line bg-code-surface p-(--space-2) text-sm font-bold text-muted"
            role="alert"
          >
            {{ errorMessage }}
          </p>

          <AppButton variant="solid" :loading="loading" class="w-fit" type="submit">
            <Icon name="lucide:log-in" mode="svg" class="h-4 w-4" aria-hidden="true" />
            登录
          </AppButton>
        </form>

      </div>
    </section>
  </main>
</template>
