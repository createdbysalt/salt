'use client'

import { NextStudio } from 'next-sanity/studio'
import { useEffect } from 'react'
import config from '../../../../sanity.config'

function reasonToText(reason: unknown): string {
  if (!reason) return ''
  if (typeof reason === 'string') return reason
  if (reason instanceof Error) return `${reason.name} ${reason.message}`
  if (typeof reason === 'object' && reason !== null && 'message' in reason) {
    return String(reason.message)
  }
  return String(reason)
}

function isChunkLoadError(reason: unknown): boolean {
  const text = reasonToText(reason)
  if (!text) return false

  if (typeof reason === 'object' && reason !== null && 'name' in reason) {
    if (reason.name === 'ChunkLoadError') return true
  }

  return (
    text.includes('Loading chunk') ||
    text.includes('ChunkLoadError') ||
    text.includes('Failed to fetch dynamically imported module')
  )
}

/**
 * Client-only Studio mount. Keeps sanity.config in the client graph and
 * auto-reloads once when dev HMR serves stale chunk hashes.
 */
export function StudioShell() {
  useEffect(() => {
    const reloadKey = 'salt-studio-chunk-reload'
    const reloadAtKey = 'salt-studio-chunk-reload-at'

    const handleChunkFailure = (reason: unknown) => {
      if (!isChunkLoadError(reason)) return

      const lastReloadAt = Number(sessionStorage.getItem(reloadAtKey) ?? '0')
      const recentlyReloaded = Date.now() - lastReloadAt < 15_000
      if (sessionStorage.getItem(reloadKey) === '1' && recentlyReloaded) return

      sessionStorage.setItem(reloadKey, '1')
      sessionStorage.setItem(reloadAtKey, String(Date.now()))
      window.location.reload()
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return
      event.preventDefault()
      handleChunkFailure(event.reason)
    }

    const onError = (event: ErrorEvent) => {
      if (!isChunkLoadError(event.error ?? event.message)) return
      event.preventDefault()
      handleChunkFailure(event.error ?? event.message)
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onError)

    sessionStorage.removeItem(reloadKey)

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onError)
    }
  }, [])

  return <NextStudio config={config} />
}
