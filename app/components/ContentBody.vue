<script setup lang="ts">
defineProps<{
  value: unknown
}>()
</script>

<template>
  <ContentRenderer
    :value="value"
    class="relative min-h-0 min-w-0 max-w-190 border-t border-line pt-(--space-6) text-[19px] leading-[1.8] text-ink text-pretty [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-(--space-4) [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-(--space-3) [&_blockquote]:text-muted [&_del]:text-muted [&_h1]:mt-(--space-6) [&_h1]:mb-(--space-3) [&_h1]:break-words [&_h1]:font-display [&_h1]:text-[64px] [&_h1]:font-normal [&_h1]:leading-none [&_h2]:mt-(--space-6) [&_h2]:mb-(--space-2) [&_h2]:break-words [&_h2]:font-display [&_h2]:text-[48px] [&_h2]:font-normal [&_h2]:leading-none [&_h3]:mt-(--space-4) [&_h3]:mb-(--space-2) [&_h3]:break-words [&_h3]:font-display [&_h3]:text-[36px] [&_h3]:font-normal [&_h3]:leading-tight [&_h4]:mt-(--space-3) [&_h4]:mb-(--space-1) [&_h4]:break-words [&_h4]:text-[24px] [&_h4]:font-bold [&_h4]:leading-tight [&_h5]:mt-(--space-3) [&_h5]:mb-(--space-1) [&_h5]:break-words [&_h5]:text-lg [&_h5]:font-bold [&_h5]:uppercase [&_h5]:tracking-normal [&_h6]:mt-(--space-3) [&_h6]:mb-(--space-1) [&_h6]:break-words [&_h6]:text-base [&_h6]:font-bold [&_h6]:uppercase [&_h6]:tracking-normal [&_hr]:my-(--space-6) [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-line [&_img]:my-(--space-4) [&_img]:max-w-full [&_img]:border [&_img]:border-line [&_li]:my-(--space-1) [&_ol]:list-decimal [&_ol]:pl-(--space-3) [&_p]:my-(--space-2) [&_strong]:font-bold [&_table]:my-(--space-4) [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-line [&_td]:py-(--space-1) [&_td]:pr-(--space-2) [&_th]:border-b [&_th]:border-line [&_th]:py-(--space-1) [&_th]:pr-(--space-2) [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-(--space-3) max-[520px]:text-lg max-[520px]:[&_h1]:text-[44px] max-[520px]:[&_h2]:text-[36px] max-[520px]:[&_h3]:text-[28px]"
  />
</template>
