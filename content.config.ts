import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        author: z.string(),
        authorUrl: z.string().optional(),
        category: z.string().default('未分类'),
        views: z.number().int().nonnegative().optional(),
        published: z.boolean().default(true),
        locked: z.boolean().default(false),
        pinned: z.boolean().default(false),
        tags: z.array(z.string()).default([])
      })
    }),
    pages: defineCollection({
      type: 'page',
      source: '*.md',
      schema: z.object({
        title: z.string(),
        description: z.string()
      })
    })
  }
})
