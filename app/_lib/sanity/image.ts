import imageUrlBuilder from '@sanity/image-url'
import { client } from './client'
import type { SanityImage } from './types'

const builder = imageUrlBuilder(client)

type ImageSource = SanityImage | { _ref: string } | string

export function urlFor(source: ImageSource) {
  return builder.image(source)
}
