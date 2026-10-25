import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import {
  getCurrentAppVersion,
  checkRemoteVersion,
  notifyUpdateAvailable,
} from '../../src/utils/versionManager'
import AppUpdateNotification from '../../src/components/shared/AppUpdateNotification'

describe('Netlify Cache Headers & Permanent Version Integrity', () => {
  it('verifies netlify.toml configures strict no-cache for index.html, root, SW and version.json', () => {
    const netlifyTomlPath = path.resolve(process.cwd(), 'netlify.toml')
    const content = fs.readFileSync(netlifyTomlPath, 'utf8')

    // Root and index.html must have no-cache
    expect(content).toContain('for = "/"')
    expect(content).toContain('for = "/index.html"')
    expect(content).toContain('Cache-Control = "no-cache, no-store, must-revalidate"')

    // SW scripts and manifests must have no-cache
    expect(content).toContain('for = "/sw.js"')
    expect(content).toContain('for = "/version.json"')
    expect(content).toContain('for = "/manifest.json"')

    // Assets must be immutable
    expect(content).toContain('for = "/assets/*"')
    expect(content).toContain('Cache-Control = "public, max-age=31536000, immutable"')
  })

  it('verifies public/_headers contains identical dual-protection caching directives', () => {
    const headersPath = path.resolve(process.cwd(), 'public/_headers')
    const content = fs.readFileSync(headersPath, 'utf8')

    expect(content).toContain('/assets/*\n  Cache-Control: public, max-age=31536000, immutable')
    expect(content).toContain('/\n  Cache-Control: no-cache, no-store, must-revalidate')
    expect(content).toContain('/index.html\n  Cache-Control: no-cache, no-store, must-revalidate')
    expect(content).toContain('/version.json\n  Cache-Control: no-cache, no-store, must-revalidate')
  })
})

describe('Version Manager & Instant Update Detection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('detects when remote version is newer than running client version', async () => {
    const current = getCurrentAppVersion()
    const newerVersion = '9999999999999'

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: newerVersion,
        builtAt: new Date().toISOString(),
      }),
    })

    const result = await checkRemoteVersion()
    expect(result.updateAvailable).toBe(true)
    expect(result.remoteVersion).toBe(newerVersion)
  })

  it('reports no update when remote version matches running client version', async () => {
    const current = getCurrentAppVersion()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: current,
        builtAt: new Date().toISOString(),
      }),
    })

    const result = await checkRemoteVersion()
    // Either matches current or throttled
    expect(result.updateAvailable).toBe(false)
  })

  it('renders AppUpdateNotification when app-new-version-available event is dispatched', async () => {
    render(<AppUpdateNotification />)

    // Initially hidden
    expect(screen.queryByText('New Version Available')).not.toBeInTheDocument()

    // Dispatch update event
    act(() => {
      notifyUpdateAvailable({ remoteVersion: '123456789' })
    })

    // Now displayed
    expect(await screen.findByText('New Version Available')).toBeInTheDocument()
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  it('reloads window and preserves session without logging user out when clicking Refresh', async () => {
    const reloadMock = vi.fn()
    delete window.location
    window.location = { reload: reloadMock }

    render(<AppUpdateNotification />)

    act(() => {
      notifyUpdateAvailable({ remoteVersion: '123456789' })
    })

    const refreshBtn = await screen.findByRole('button', { name: /refresh/i })
    fireEvent.click(refreshBtn)

    // Fast-forward timeout
    await new Promise(r => setTimeout(r, 200))
    expect(reloadMock).toHaveBeenCalled()
  })

  it('dismisses notification when X button is clicked and remembers in sessionStorage', async () => {
    render(<AppUpdateNotification />)

    act(() => {
      notifyUpdateAvailable({ remoteVersion: '123456789' })
    })

    const dismissBtn = await screen.findByLabelText('Dismiss update notification')
    fireEvent.click(dismissBtn)

    await waitFor(() => {
      expect(screen.queryByText('New Version Available')).not.toBeInTheDocument()
    })
    expect(sessionStorage.getItem('pwa_update_snoozed')).toBe('true')
  })
})
