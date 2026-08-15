// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DirectoryTab, type DirectoryTabProps } from '../../src/client/DirectoryTab.tsx'
import { en, type DirectoryLocaleKey } from '../../src/client/locales.ts'
import type { MetaFile, PluginEntry } from '../../src/data/types.ts'
import type { PluginManagerFace } from '../../src/client/index.ts'

afterEach(cleanup)

const t = ((key: DirectoryLocaleKey, params?: Record<string, unknown>): string => {
  let text = en[key] ?? key
  if (params !== undefined) {
    text = text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
  }
  return text
}) as DirectoryTabProps['t']

const pluginManager: PluginManagerFace = {
  list: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue([]),
  inventory: vi.fn().mockResolvedValue([]),
}

const META: MetaFile = {
  syncedAt: '2026-08-14T10:00:25.938Z',
  total: 0,
  byCategory: { tool: 0, skill: 0, memory: 0, vision: 0, 'ui-skin': 0, mcp: 0, orchestration: 0, 'cli-tui': 0, web: 0, agent: 0, other: 0 },
  byInstallForm: { bundle: 0, repo: 0, client: 0, unknown: 0 },
  byLanguage: {},
  byStarBucket: {},
}

describe('DirectoryTab', () => {
  it('mounts the directory shell with the injected language', async () => {
    const view = render(<DirectoryTab t={t} lang="en" plugins={[] as PluginEntry[]} meta={META} pluginManager={pluginManager} />)
    const shell = view.container.querySelector('[data-directory]')
    expect(shell).toBeTruthy()
    expect(shell?.getAttribute('lang')).toBe('en')
    expect(await screen.findByText(en.empty)).toBeTruthy()
  })

  it('re-reads the Loader inventory on a periodic timer', async () => {
    vi.useFakeTimers()
    const inventory = vi.fn().mockResolvedValue([])
    const manager = { ...pluginManager, inventory }
    render(<DirectoryTab t={t} lang="en" plugins={[] as PluginEntry[]} meta={META} pluginManager={manager} />)
    // Initial load fires synchronously on mount.
    expect(inventory).toHaveBeenCalledTimes(1)
    // Advance past one poll interval: the periodic poll fires a second time.
    await vi.advanceTimersByTimeAsync(30_000)
    expect(inventory).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })
})
