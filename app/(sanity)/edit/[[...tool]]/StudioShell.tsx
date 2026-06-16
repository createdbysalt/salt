'use client'

import { NextStudio } from 'next-sanity/studio'
import { useEffect } from 'react'
import config from '../../../../sanity.config'

function isChunkLoadError(reason: unknown): boolean {
  if (!reason) return false
  if (typeof reason === 'object' && reason !== null && 'name' in reason) {
    return reason.name === 'ChunkLoadError'
  }
  return String(reason).includes('Loading chunk')
}

/**
 * Client-only Studio mount. Keeps sanity.config in the client graph and
 * auto-reloads once when dev HMR serves stale chunk hashes.
 */
export function StudioShell() {
  useEffect(() => {
    const reloadKey = 'salt-studio-chunk-reload'

    const handleChunkFailure = (reason: unknown) => {
      if (!isChunkLoadError(reason)) return
      if (sessionStorage.getItem(reloadKey) === '1') return
      sessionStorage.setItem(reloadKey, '1')
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
