'use client'

import * as runtime from 'react/jsx-runtime'
import type { ComponentType } from 'react'

/**
 * Shared components available in all MDX content.
 * Add custom components here (Callout, CodeBlock, etc.)
 */
const sharedComponents: Record<string, ComponentType> = {
  // Example: Callout, CodeBlock, etc.
}

/**
 * Parse Velite-compiled MDX code into a React component.
 *
 * Security note: This uses Function constructor which is the official Velite
 * pattern. It's safe because the code parameter is pre-compiled at build time
 * by Velite from trusted MDX files in content/, not runtime user input.
 * See: https://velite.js.org/guide/using-mdx
 */
function useMDXComponent(code: string) {
  // eslint-disable-next-line no-new-func
  const fn = new Function(code)
  return fn({ ...runtime }).default
}

interface MDXContentProps {
  /** Compiled MDX code from Velite */
  code: string
  /** Additional components to make available in MDX */
  components?: Record<string, ComponentType>
}

/**
 * Render Velite-compiled MDX content as React components.
 *
 * @example
 * ```tsx
 * import { posts } from '@/.velite'
 * import { MDXContent } from '@/app/_components/mdx-content'
 *
 * export default function BlogPost({ slug }) {
 *   const post = posts.find(p => p.slug === slug)
 *   return <MDXContent code={post.content} />
 * }
 * ```
 */
export function MDXContent({ code, components }: MDXContentProps) {
  const Component = useMDXComponent(code)
  return <Component components={{ ...sharedComponents, ...components }} />
}
