'use client'

import { definePlugin } from 'sanity'

/**
 * Language filter plugin - DISABLED
 *
 * TODO: Fix type compatibility with Sanity v3's unstable_languageFilter API.
 * The current implementation returns plain objects but the API expects React components.
 */
export const languageFilterPlugin = definePlugin({
  name: 'language-filter',
  // Plugin disabled until API compatibility is fixed
})
