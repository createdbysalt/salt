import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { validatePreviewUrl } from '@sanity/preview-url-secret'
import { previewClient } from '@/app/_lib/sanity'

export async function GET(request: Request) {
  const { isValid, redirectTo = '/' } = await validatePreviewUrl(previewClient, request.url)

  if (!isValid) {
    return new Response('Invalid secret', { status: 401 })
  }

  const draft = await draftMode()
  draft.enable()

  redirect(redirectTo)
}
