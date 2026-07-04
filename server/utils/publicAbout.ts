import { createHash } from 'node:crypto'

import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import { fromHast } from 'minimark/hast'

import { readAboutPage } from './adminStorage'

type PublicAboutPage = Awaited<ReturnType<typeof readAboutPage>> & {
  path: string
  body: Record<string, unknown>
}

const publicAboutCacheTtlMs = 10_000
let publicAboutCache: {
  expiresAt: number
  signature: string
  page: PublicAboutPage
} | undefined

const createAboutSignature = (about: Awaited<ReturnType<typeof readAboutPage>>) => (
  createHash('sha256')
    .update(JSON.stringify(about))
    .digest('hex')
)

export const invalidatePublicAboutCache = () => {
  publicAboutCache = undefined
}

export const readPublicAboutPage = async () => {
  const now = Date.now()

  if (publicAboutCache && publicAboutCache.expiresAt > now) {
    return publicAboutCache.page
  }

  const about = await readAboutPage()
  const signature = createAboutSignature(about)

  if (
    publicAboutCache &&
    publicAboutCache.signature === signature &&
    publicAboutCache.expiresAt > now
  ) {
    return publicAboutCache.page
  }

  const parsed = await parseMarkdown(
    about.markdown,
    {
      toc: {
        depth: 3,
        searchDepth: 3,
      },
    },
    {
      fileOptions: {
        id: 'about.md',
        path: '/about',
        body: about.markdown,
      },
    },
  )
  const page = {
    ...about,
    path: '/about',
    body: {
      ...fromHast(parsed.body),
      toc: parsed.toc,
    },
  }

  publicAboutCache = {
    expiresAt: now + publicAboutCacheTtlMs,
    signature,
    page,
  }

  return page
}
