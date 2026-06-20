'use client'

import { NextStudio } from 'next-sanity/studio'
import { Component, type ErrorInfo, type ReactNode, useEffect } from 'react'
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

function isSanityFragmentTabIndexNoise(args: unknown[]): boolean {
  return args.some((arg) =>
    reasonToText(arg).includes(
      'Invalid prop `tabIndex` supplied to `React.Fragment`'
    )
  )
}

const RELOAD_KEY = 'salt-studio-chunk-reload'
const RELOAD_AT_KEY = 'salt-studio-chunk-reload-at'

function reloadStudioForStaleChunks(reason: unknown): boolean {
  if (!isChunkLoadError(reason)) return false

  const lastReloadAt = Number(sessionStorage.getItem(RELOAD_AT_KEY) ?? '0')
  const recentlyReloaded = Date.now() - lastReloadAt < 15_000
  if (sessionStorage.getItem(RELOAD_KEY) === '1' && recentlyReloaded) return true

  sessionStorage.setItem(RELOAD_KEY, '1')
  sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()))
  window.location.reload()
  return true
}

class StudioChunkErrorBoundary extends Component<
  { children: ReactNode },
  { hasChunkError: boolean }
> {
  state = { hasChunkError: false }

  static getDerivedStateFromError(error: unknown) {
    return isChunkLoadError(error) ? { hasChunkError: true } : null
  }

  componentDidCatch(error: unknown, _errorInfo: ErrorInfo) {
    if (reloadStudioForStaleChunks(error)) return
    throw error
  }

  render() {
    if (this.state.hasChunkError) {
      return (
        <p className="p-6 text-sm text-muted-foreground">
          Reloading Sanity Studio after a dev build refresh…
        </p>
      )
    }

    return this.props.children
  }
}

/**
 * Client-only Studio mount. Keeps sanity.config in the client graph and
 * auto-reloads once when dev HMR serves stale chunk hashes.
 */
export function StudioShell() {
  useEffect(() => {
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      if (isSanityFragmentTabIndexNoise(args)) return
      originalConsoleError(...args)
    }

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return
      event.preventDefault()
      reloadStudioForStaleChunks(event.reason)
    }

    const onError = (event: ErrorEvent) => {
      if (!isChunkLoadError(event.error ?? event.message)) return
      event.preventDefault()
      reloadStudioForStaleChunks(event.error ?? event.message)
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onError)

    sessionStorage.removeItem(RELOAD_KEY)

    return () => {
      console.error = originalConsoleError
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onError)
    }
  }, [])

  return (
    <StudioChunkErrorBoundary>
      <NextStudio config={config} />
    </StudioChunkErrorBoundary>
  )
}
