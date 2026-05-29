<script setup lang="ts">
type CalloutVariant = 'normal' | 'tip' | 'success' | 'warning' | 'danger'

const props = withDefaults(
  defineProps<{
    variant?: CalloutVariant
    title?: string
  }>(),
  {
    variant: 'normal',
    title: ''
  }
)

const variantConfig = computed(() => {
  if (props.variant === 'tip') {
    return {
      icon: 'lucide:sparkles',
      label: '提示',
      rootClass: 'border-line bg-code-surface text-ink',
      iconClass: 'border-line bg-paper text-ink',
      headingClass: 'text-ink'
    }
  }

  if (props.variant === 'warning') {
    return {
      icon: 'lucide:triangle-alert',
      label: '警告',
      rootClass: 'border-callout-warning-border bg-callout-warning-surface text-callout-warning-text',
      iconClass: 'border-callout-warning-border bg-paper text-callout-warning-accent',
      headingClass: 'text-callout-warning-accent'
    }
  }

  if (props.variant === 'danger') {
    return {
      icon: 'lucide:octagon-alert',
      label: '严重警告',
      rootClass: 'border-callout-danger-border bg-callout-danger-surface text-callout-danger-text',
      iconClass: 'border-callout-danger-border bg-paper text-callout-danger-accent',
      headingClass: 'text-callout-danger-accent'
    }
  }

  if (props.variant === 'success') {
    return {
      icon: 'lucide:circle-check',
      label: '通过',
      rootClass: 'border-callout-success-border bg-callout-success-surface text-callout-success-text',
      iconClass: 'border-callout-success-border bg-paper text-callout-success-accent',
      headingClass: 'text-callout-success-accent'
    }
  }

  return {
    icon: 'lucide:info',
    label: '普通',
    rootClass: 'border-line bg-paper text-ink',
    iconClass: 'border-line bg-code-surface text-ink',
    headingClass: 'text-ink'
  }
})

const heading = computed(() => props.title || variantConfig.value.label)
</script>

<template>
  <aside
    class="my-(--space-4) grid gap-(--space-2) border p-(--space-3) text-[16px] leading-[1.75] [&_a]:underline [&_a]:underline-offset-4 [&_ol]:my-(--space-2) [&_ol]:list-decimal [&_ol]:pl-(--space-3) [&_p]:m-0 [&_p+p]:mt-(--space-2) [&_ul]:my-(--space-2) [&_ul]:list-disc [&_ul]:pl-(--space-3)"
    :class="variantConfig.rootClass"
  >
    <div class="flex items-center gap-(--space-2)">
      <span
        class="grid h-9 w-9 shrink-0 place-items-center rounded-token border"
        :class="variantConfig.iconClass"
        aria-hidden="true"
      >
        <Icon
          :name="variantConfig.icon"
          mode="svg"
          class="h-4 w-4"
        />
      </span>
      <p
        class="m-0 text-[13px] font-bold uppercase tracking-normal"
        :class="variantConfig.headingClass"
      >
        {{ heading }}
      </p>
    </div>

    <div class="min-w-0 text-pretty">
      <slot />
    </div>
  </aside>
</template>
