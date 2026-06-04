<script setup lang="ts">
defineProps<{
  value: Record<string, any>
}>()
</script>

<template>
  <ContentRenderer
    :value="value"
    class="relative min-h-0 min-w-0 max-w-190 border-t border-line pt-(--space-6) text-[19px] leading-[1.8] text-ink text-pretty [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:my-(--space-4) [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-(--space-3) [&_blockquote]:text-muted [&_del]:text-muted [&_hr]:my-(--space-6) [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-line [&_img]:my-(--space-4) [&_img]:max-w-full [&_img]:border [&_img]:border-line [&_li]:my-(--space-1) [&_ol]:list-decimal [&_ol]:pl-(--space-3) [&_p]:my-(--space-2) [&_strong]:font-bold [&_table]:my-(--space-4) [&_table]:w-full [&_table]:border-collapse [&_td]:border-b [&_td]:border-line [&_td]:py-(--space-1) [&_td]:pr-(--space-2) [&_th]:border-b [&_th]:border-line [&_th]:py-(--space-1) [&_th]:pr-(--space-2) [&_th]:text-left [&_ul]:list-disc [&_ul]:pl-(--space-3) max-[520px]:text-lg"
  />
</template>
