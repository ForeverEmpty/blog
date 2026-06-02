<script setup lang="ts">
type FriendItem = {
  id?: string
  name: string
  url: string
  icon?: string
  intro?: string
  description: string
  category: string
  status?: '待审核' | '已通过' | '已拒绝'
  tags: string[]
  contact?: string
  backlinkUrl?: string
  reviewNote?: string
  featured?: boolean
  order?: number
  submittedAt?: string
  reviewedAt?: string
}

const appConfig = useAppConfig();
const { data: friendItems, refresh: refreshFriends } = await useAsyncData("friends-list", () =>
  $fetch<FriendItem[]>("/api/friends"),
  {
    default: () => appConfig.friends.items ?? [],
  },
);
const friends = computed(() => friendItems.value);
const approvedFriends = computed(() => friends.value.filter((friend) => friend.status !== "待审核"));
const pendingFriends = computed(() => friends.value.filter((friend) => friend.status === "待审核"));
const friendCount = computed(() => friends.value.length);
const isImageIcon = (icon?: string) => Boolean(icon && (/^(https?:)?\/\//.test(icon) || icon.startsWith('/')));
const applyOpen = ref(false);
const applying = ref(false);
const applySubmitted = ref(false);
const applyMessage = ref("");
const applyError = ref("");
const applyName = ref("");
const applyUrl = ref("");
const applyIcon = ref("");
const applyIntro = ref("");
const applyDescription = ref("");
const applyContact = ref("");
const applyBacklinkUrl = ref("");
const applyCategory = ref("个人站点");
const applyTags = ref("");
const applyTagList = computed(() => (
  applyTags.value
    .split(/\r?\n|,/)
    .map((tag) => tag.trim())
    .filter(Boolean)
));
const friendCategorySuggestions = computed(() => Array.from(new Set(friends.value.map((friend) => friend.category))).filter(Boolean));
const friendTagSuggestions = computed(() => Array.from(new Set(friends.value.flatMap((friend) => friend.tags))).filter(Boolean));

const resetApplyForm = () => {
  applyName.value = "";
  applyUrl.value = "";
  applyIcon.value = "";
  applyIntro.value = "";
  applyDescription.value = "";
  applyContact.value = "";
  applyBacklinkUrl.value = "";
  applyCategory.value = "个人站点";
  applyTags.value = "";
};

const openApplyDialog = () => {
  applyOpen.value = true;
  applyError.value = "";
  applyMessage.value = "";
  applySubmitted.value = false;
};

const closeApplyDialog = () => {
  if (applying.value) {
    return;
  }

  applyOpen.value = false;
};

const submitFriendApplication = async () => {
  applying.value = true;
  applyError.value = "";
  applyMessage.value = "";

  try {
    await $fetch("/api/friends/apply", {
      method: "POST",
      body: {
        name: applyName.value,
        url: applyUrl.value,
        icon: applyIcon.value,
        intro: applyIntro.value,
        description: applyDescription.value,
        contact: applyContact.value,
        backlinkUrl: applyBacklinkUrl.value,
        category: applyCategory.value,
        tags: applyTagList.value,
      },
    });
    await refreshFriends();
    applyMessage.value = "申请已提交，审核前会先显示在待审核列表。";
    applySubmitted.value = true;
    resetApplyForm();
  } catch (error) {
    const statusMessage = (error as { data?: { statusMessage?: string } })?.data?.statusMessage;

    if (statusMessage === "Friend application already exists") {
      applyError.value = "该站点已在友链或申请列表中。";
    } else if (statusMessage === "Too many friend applications") {
      applyError.value = "提交过于频繁，请稍后再试。";
    } else if (statusMessage === "Backlink url must be a valid http(s) url") {
      applyError.value = "返链地址需要是有效的 http(s) 链接。";
    } else {
      applyError.value = "申请未通过基础校验，请检查链接、内容长度或垃圾关键词。";
    }
    applySubmitted.value = false;
  } finally {
    applying.value = false;
  }
};

useSiteSeo({
  title: appConfig.friends.title,
  description: appConfig.friends.description,
  path: '/friends',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: appConfig.friends.title,
    description: appConfig.friends.description,
    url: useAbsoluteSiteUrl('/friends')
  },
});
</script>

<template>
  <div>
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
            <div class="flex flex-wrap gap-(--space-1)">
              <AppButton variant="solid" @click="openApplyDialog">
                <Icon name="lucide:send" mode="svg" class="h-4 w-4" aria-hidden="true" />
                申请友链
              </AppButton>
            </div>
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
            v-if="approvedFriends.length > 0"
            class="grid grid-cols-2 gap-(--space-3) max-[900px]:grid-cols-1"
            aria-label="友链列表"
          >
            <article
              v-for="friend in approvedFriends"
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

              <AppButton variant="outline" @click="openApplyDialog">
                {{ appConfig.friends.primaryAction.label }}
              </AppButton>
            </div>
          </div>

          <section
            v-if="pendingFriends.length > 0"
            class="grid gap-(--space-3) border-y border-line py-(--space-4)"
            aria-labelledby="pending-friends-title"
          >
            <div class="flex flex-wrap items-end justify-between gap-(--space-2)">
              <div class="grid gap-1">
                <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                  Pending
                </p>
                <h2
                  id="pending-friends-title"
                  class="m-0 font-display text-[48px] font-normal leading-none tracking-normal max-[520px]:text-[36px]"
                >
                  待审核友链
                </h2>
              </div>
              <p class="m-0 text-sm font-bold text-muted">
                {{ pendingFriends.length }} 个申请
              </p>
            </div>
            <div class="grid border-t border-line">
              <article
                v-for="friend in pendingFriends"
                :key="friend.url"
                class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-(--space-2) border-b border-line py-(--space-2) max-[640px]:grid-cols-1"
              >
                <div class="grid min-w-0 gap-1">
                  <h3 class="m-0 truncate text-lg font-bold text-ink">
                    {{ friend.name }}
                  </h3>
                  <p class="m-0 truncate text-sm text-muted">
                    {{ friend.intro || friend.description || friend.url }}
                  </p>
                </div>
                <span class="w-fit border border-line bg-code-surface px-(--space-1) py-1 text-[12px] font-bold text-muted">
                  待审核
                </span>
              </article>
            </div>
          </section>

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
            <div class="grid content-start gap-(--space-2)">
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
              <AppButton variant="solid" @click="openApplyDialog">
                <Icon name="lucide:send" mode="svg" class="h-4 w-4" aria-hidden="true" />
                申请友链
              </AppButton>
            </div>
          </section>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="dialog">
        <div
          v-if="applyOpen"
          class="fixed inset-0 z-50 grid place-items-center overflow-auto bg-ink/55 p-(--space-3) backdrop-blur-[1px] max-[520px]:p-(--space-2)"
          role="dialog"
          aria-modal="true"
          aria-labelledby="friend-apply-title"
          @click.self="closeApplyDialog"
        >
          <form
            class="dialog-panel grid max-h-[min(760px,92vh)] w-full max-w-220 overflow-hidden border border-line bg-paper text-ink shadow-[12px_12px_0_var(--line)]"
            :class="applySubmitted ? 'max-w-150' : ''"
            @submit.prevent="submitFriendApplication"
          >
            <div class="grid gap-(--space-2) border-b border-line p-(--space-3)">
              <div class="flex items-start justify-between gap-(--space-2)">
                <div class="grid gap-1">
                  <p class="m-0 text-[13px] font-bold uppercase tracking-normal text-muted">
                    Friend Apply
                  </p>
                  <h2
                    id="friend-apply-title"
                    class="m-0 font-display text-[56px] font-normal leading-none max-[520px]:text-[40px]"
                  >
                    申请友链
                  </h2>
                </div>
                <AppButton variant="icon" aria-label="关闭友链申请" :disabled="applying" @click="closeApplyDialog">
                  <Icon name="lucide:x" mode="svg" class="h-5 w-5" aria-hidden="true" />
                </AppButton>
              </div>
              <p class="m-0 max-w-170 text-base leading-[1.6] text-muted text-pretty">
                提交后会进入待审核状态。重复站点、明显广告和垃圾内容会被直接拦截。
              </p>
            </div>

            <div class="min-h-0 overflow-y-auto">
              <div v-if="applySubmitted" class="grid gap-(--space-3) p-(--space-3)">
                <div class="grid min-h-44 content-center gap-(--space-2) border-b border-line pb-(--space-3)">
                  <Icon name="lucide:circle-check" mode="svg" class="h-8 w-8 text-ink" aria-hidden="true" />
                  <p class="m-0 text-lg font-bold text-ink">
                    {{ applyMessage }}
                  </p>
                  <p class="m-0 text-base leading-[1.6] text-muted text-pretty">
                    你可以在页面的待审核友链区域看到这条申请，后台审核通过后会进入正式友链列表。
                  </p>
                </div>
                <div class="flex justify-end">
                  <AppButton variant="solid" @click="closeApplyDialog">
                    完成
                  </AppButton>
                </div>
              </div>

              <div v-else class="grid gap-(--space-2) p-(--space-3)">
                <div class="grid grid-cols-2 gap-(--space-2) max-[680px]:grid-cols-1">
                  <label class="grid gap-2 text-sm font-bold text-muted">
                    站点名称
                    <input v-model="applyName" required maxlength="40" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
                  </label>
                  <label class="grid gap-2 text-sm font-bold text-muted">
                    站点链接
                    <input v-model="applyUrl" required type="url" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
                  </label>
                  <label class="grid gap-2 text-sm font-bold text-muted">
                    图标
                    <input v-model="applyIcon" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="lucide:link 或图片 URL">
                  </label>
                  <TaxonomyCategoryInput
                    v-model="applyCategory"
                    :suggestions="friendCategorySuggestions"
                    clear-label="清空友链分类"
                  />
                  <label class="grid gap-2 text-sm font-bold text-muted">
                    简介
                    <input v-model="applyIntro" maxlength="80" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink">
                  </label>
                  <label class="grid gap-2 text-sm font-bold text-muted">
                    联系方式
                    <input v-model="applyContact" maxlength="120" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="邮箱、GitHub 或其他可联系入口">
                  </label>
                  <label class="grid gap-2 text-sm font-bold text-muted">
                    返链地址
                    <input v-model="applyBacklinkUrl" type="url" class="min-h-12 border border-line bg-paper px-(--space-2) text-base text-ink outline-none focus:border-ink" placeholder="已添加本站链接的页面，可留空">
                  </label>
                  <TaxonomyTagInput
                    v-model="applyTags"
                    :suggestions="friendTagSuggestions"
                    remove-label-prefix="删除友链标签"
                  />
                </div>
                <label class="grid gap-2 text-sm font-bold text-muted">
                  描述
                  <textarea
                    v-model="applyDescription"
                    maxlength="240"
                    class="min-h-28 resize-y border border-line bg-paper px-(--space-2) py-(--space-2) text-base leading-[1.65] text-ink outline-none focus:border-ink"
                  />
                </label>

                <p v-if="applyError" class="m-0 border border-callout-danger-border bg-callout-danger-surface px-(--space-2) py-(--space-1) text-sm font-bold text-callout-danger-text">
                  {{ applyError }}
                </p>
                <p v-if="applyMessage" class="m-0 border border-line bg-code-surface px-(--space-2) py-(--space-1) text-sm font-bold text-muted">
                  {{ applyMessage }}
                </p>
              </div>
            </div>

            <div v-if="!applySubmitted" class="flex flex-wrap justify-end gap-(--space-1) border-t border-line p-(--space-3)">
              <AppButton variant="outline" :disabled="applying" @click="closeApplyDialog">
                取消
              </AppButton>
              <AppButton type="submit" variant="solid" :loading="applying">
                提交申请
              </AppButton>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
