import type { ComponentType, ForwardRefExoticComponent, SVGProps, RefAttributes } from 'react'

type SanityIcon = ComponentType<Record<string, unknown>> | undefined

/**
 * Type helper for Sanity schema icons
 *
 * Works around React 19 / Sanity type compatibility issues where
 * ForwardRefExoticComponent doesn't match Sanity's expected icon type.
 */
export function sanityIcon(
  icon: ForwardRefExoticComponent<Omit<SVGProps<SVGSVGElement>, 'ref'> & RefAttributes<SVGSVGElement>>
): SanityIcon {
  return icon as unknown as SanityIcon
}
