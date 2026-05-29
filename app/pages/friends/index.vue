<script setup lang="ts">
type FriendItem = {
  id?: string
  name: string
  url: string
  icon?: string
  intro?: string
  description: string
  category: string
  tags: string[]
}

const appConfig = useAppConfig();
const { data: friendItems } = await useAsyncData("friends-list", () =>
  $fetch<FriendItem[]>("/api/friends"),
  {
    default: () => appConfig.friends.items ?? [],
  },
);
const friends = computed(() => friendItems.value);
const friendCount = computed(() => friends.value.length);
const isImageIcon = (icon?: string) => Boolean(icon && (/^(https?:)?\/\//.test(icon) || icon.startsWith('/')));

useHead({
  title: `${appConfig.friends.title} - ${appConfig.site.name}`,
  meta: [
    {
      name: "description",
      content: appConfig.friends.description,
    },
  ],
});
</script>

<template>
  <NuxtLayout>
    <section
      class="grid min-h-[calc(100vh-93px)] grid-cols-[minmax(112px,16vw)_minmax(0,1fr)] border-b border-line bg-paper max-[760px]:grid-cols-1"
      aria-labelledby="friends-title"
    >
      <aside
        class="border-r border-line px-(--space-3) py-(--space-6) text-muted max-[760px]:border-r-0 max-[760px]:border-b max-[760px]:px-(--space-2) max-[760px]:py-(--space-3)"
        aria-label="友链状态"
      >
        <div class="sticky top-32 grid gap-(--space-4) max-[760px]:static max-[760px]:grid-cols-[auto_1fr] max-[760px]:items-end">
          <p class="m-0 text-[13px] font-bold uppercase tracking-normal">
            {{ appConfig.friends.eyebrow }}
          </p>
          <p class="m-0 font-display text-[88px] leading-none text-ink max-[760px]:justify-self-end max-[760px]:text-[56px]">
            {{ friendCount.toString().padStart(2, "0") }}
          </p>
        </div>
      </aside>

      <div class="px-[clamp(var(--space-3),6vw,var(--space-12))] py-(--space-8) max-[760px]:px-(--space-2) max-[760px]:py-(--space-6)">
        <div class="grid max-w-300 gap-(--space-8)">
          <header class="grid gap-(--space-3)">
            <h1
              id="friends-title"
              class="m-0 max-w-260 font-display text-[132px] font-normal leading-[0.95] tracking-normal text-ink text-pretty max-[1100px]:text-[88px] max-[520px]:text-[56px]"
            >
              {{ appConfig.friends.title }}
            </h1>
            <p class="m-0 max-w-190 text-[22px] leading-[1.55] text-muted text-pretty max-[520px]:text-lg">
              {{ appConfig.friends.description }}
            </p>
          </header>

          <section
            class="grid grid-cols-[minmax(0,1fr)_minmax(260px,420px)] border-y border-line max-[900px]:grid-cols-1"
            aria-labelledby="friend-profile-title"
          >
            <div class="grid content-end gap-(--space-3) border-r border-line p-(--space-4) max-[900px]:border-r-0 max-[900px]:border-b max-[760px]:p-(--space-2)">
              <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                Site Card
              </p>
              <h2
                id="friend-profile-title"
                class="m-0 font-display text-[72px] font-normal leading-none tracking-normal text-pretty max-[1100px]:text-[56px] max-[520px]:text-[40px]"
              >
                {{ appConfig.friends.profileTitle }}
              </h2>
              <p class="m-0 max-w-170 text-lg leading-[1.6] text-muted text-pretty">
                {{ appConfig.friends.profileDescription }}
              </p>
            </div>

            <div class="grid gap-(--space-3) p-(--space-4) max-[760px]:p-(--space-2)">
              <div class="flex items-start gap-(--space-3)">
                <div class="grid h-18 w-18 shrink-0 place-items-center border border-ink font-display text-[28px] leading-none text-ink">
                  {{ appConfig.friends.siteProfile.avatarText }}
                </div>
                <div class="grid min-w-0 gap-(--space-1)">
                  <h3 class="m-0 break-words font-display text-[44px] font-normal leading-none tracking-normal max-[520px]:text-[36px]">
                    {{ appConfig.friends.siteProfile.name }}
                  </h3>
                  <a
                    class="break-words text-sm font-bold tracking-normal text-muted underline underline-offset-4 transition-colors duration-200 hover:text-ink focus-visible:text-ink focus-visible:outline-none"
                    :href="appConfig.friends.siteProfile.url"
                  >
                    {{ appConfig.friends.siteProfile.urlLabel || appConfig.friends.siteProfile.url }}
                  </a>
                </div>
              </div>
              <p class="m-0 text-lg leading-[1.6] text-muted text-pretty">
                {{ appConfig.friends.siteProfile.description }}
              </p>
              <ul class="m-0 flex list-none flex-wrap gap-(--space-1) p-0" aria-label="本站标签">
                <li
                  v-for="tag in appConfig.friends.siteProfile.tags"
                  :key="tag"
                  class="border border-line px-(--space-1) py-1 text-[12px] font-bold leading-none text-muted"
                >
                  {{ tag }}
                </li>
              </ul>
            </div>
          </section>

          <div
            v-if="friends.length > 0"
            class="grid grid-cols-2 gap-(--space-3) max-[900px]:grid-cols-1"
            aria-label="友链列表"
          >
            <article
              v-for="friend in friends"
              :key="friend.url"
              class="group relative grid min-h-68 content-between overflow-hidden border border-line p-(--space-3) text-ink before:absolute before:inset-0 before:z-0 before:origin-left before:scale-x-0 before:bg-ink before:transition-transform before:duration-420 before:ease-[cubic-bezier(.2,.8,.2,1)] hover:text-paper hover:before:scale-x-100 focus-within:text-paper focus-within:before:scale-x-100"
            >
              <div class="relative z-1 grid gap-(--space-2)">
                <div class="flex items-center justify-between gap-(--space-2)">
                  <div class="flex min-w-0 items-center gap-(--space-2)">
                    <div class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden border border-line bg-code-surface transition-colors duration-200 group-hover:border-paper group-hover:bg-paper group-focus-within:border-paper group-focus-within:bg-paper">
                      <img
                        v-if="isImageIcon(friend.icon)"
                        :src="friend.icon"
                        :alt="`${friend.name} 图标`"
                        class="h-full w-full object-cover"
                        loading="lazy"
                      >
                      <Icon
                        v-else
                        :name="friend.icon || 'lucide:link'"
                        mode="svg"
                        class="h-5 w-5 text-muted transition-colors duration-200 group-hover:text-ink group-focus-within:text-ink"
                        aria-hidden="true"
                      />
                    </div>
                    <p class="m-0 min-w-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                      {{ friend.category }}
                    </p>
                  </div>
                  <Icon
                    name="lucide:link"
                    mode="svg"
                    class="h-4 w-4 text-quiet transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper"
                    aria-hidden="true"
                  />
                </div>
                <h2 class="m-0 break-words font-display text-[64px] font-normal leading-none tracking-normal max-[520px]:text-[44px]">
                  <a
                    class="block break-words focus-visible:outline-none"
                    :href="friend.url"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {{ friend.name }}
                  </a>
                </h2>
                <p v-if="friend.intro" class="m-0 text-base font-bold leading-[1.5] text-ink text-pretty transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                  {{ friend.intro }}
                </p>
                <p class="m-0 text-lg leading-[1.6] text-muted text-pretty transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                  {{ friend.description }}
                </p>
              </div>

              <div class="relative z-1 mt-(--space-4) flex flex-wrap items-end justify-between gap-(--space-2)">
                <ul class="m-0 flex list-none flex-wrap gap-(--space-1) p-0" aria-label="友链标签">
                  <li
                    v-for="tag in friend.tags"
                    :key="tag"
                    class="border border-line px-(--space-1) py-1 text-[12px] font-bold leading-none text-muted transition-colors duration-200 group-hover:border-paper group-hover:text-paper group-focus-within:border-paper group-focus-within:text-paper"
                  >
                    {{ tag }}
                  </li>
                </ul>
                <span class="inline-flex items-center gap-2 text-sm font-bold text-muted transition-colors duration-200 group-hover:text-paper group-focus-within:text-paper">
                  Visit
                  <Icon
                    name="lucide:external-link"
                    mode="svg"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </article>
          </div>

          <div
            v-else
            class="grid border-t border-line"
            aria-label="友链空状态"
          >
            <div class="group grid min-h-76 grid-cols-[minmax(0,1fr)_auto] items-end gap-(--space-4) border-b border-line px-(--space-2) py-(--space-6) transition-colors duration-300 ease-[cubic-bezier(.16,1,.3,1)] hover:bg-ink hover:text-paper max-[760px]:grid-cols-1">
              <div class="grid max-w-190 gap-(--space-2)">
                <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted transition-colors duration-200 group-hover:text-paper">
                  {{ appConfig.friends.emptyKicker }}
                </p>
                <h2 class="m-0 font-display text-[72px] font-normal leading-[0.95] tracking-normal text-pretty max-[1100px]:text-[56px] max-[520px]:text-[36px]">
                  {{ appConfig.friends.emptyTitle }}
                </h2>
                <p class="m-0 text-lg leading-[1.6] text-muted text-pretty transition-colors duration-200 group-hover:text-paper">
                  {{ appConfig.friends.emptyDescription }}
                </p>
              </div>

              <AppLinkButton :href="appConfig.friends.primaryAction.href" variant="outline">
                {{ appConfig.friends.primaryAction.label }}
              </AppLinkButton>
            </div>
          </div>

          <section
            class="grid grid-cols-[minmax(0,1fr)_minmax(240px,360px)] gap-(--space-4) max-[900px]:grid-cols-1"
            aria-labelledby="friend-exchange-title"
          >
            <div class="grid gap-(--space-2)">
              <h2
                id="friend-exchange-title"
                class="m-0 font-display text-[48px] font-normal leading-none tracking-normal max-[520px]:text-[36px]"
              >
                {{ appConfig.friends.exchangeTitle }}
              </h2>
              <p class="m-0 max-w-170 text-lg leading-[1.6] text-muted text-pretty">
                {{ appConfig.friends.exchangeDescription }}
              </p>
            </div>
            <ul class="m-0 grid list-none gap-(--space-1) p-0 text-sm font-bold uppercase tracking-normal text-muted">
              <li
                v-for="item in appConfig.friends.exchangeItems"
                :key="item"
                class="flex items-center gap-(--space-1) border-b border-line py-(--space-1)"
              >
                <Icon
                  name="lucide:badge-check"
                  mode="svg"
                  class="h-4 w-4 text-quiet"
                  aria-hidden="true"
                />
                {{ item }}
              </li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  </NuxtLayout>
</template>
