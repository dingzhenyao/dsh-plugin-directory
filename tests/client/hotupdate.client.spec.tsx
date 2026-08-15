// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DirectoryTab, type DirectoryTabProps } from '../../src/client/DirectoryTab.tsx'
import { searchLive } from '../../src/client/liveSearch.ts'
import { zh, type DirectoryLocaleKey } from '../../src/client/locales.ts'
import type { MetaFile, PluginEntry } from '../../src/data/types.ts'
import type { PluginManagerFace } from '../../src/client/index.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const pluginManager: PluginManagerFace = {
  list: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue([]),
  remove: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue([]),
}

function makeT(dict: Record<DirectoryLocaleKey, string>): DirectoryTabProps['t'] {
  return ((key: DirectoryLocaleKey, params?: Record<string, unknown>): string => {
    let text = dict[key] ?? key
    if (params !== undefined) {
      text = text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
    }
    return text
  }) as DirectoryTabProps['t']
}

const META: MetaFile = {
  syncedAt: '2026-08-14T10:00:25.938Z',
  total: 0,
  byCategory: { tool: 0, skill: 0, memory: 0, vision: 0, 'ui-skin': 0, mcp: 0, orchestration: 0, 'cli-tui': 0, web: 0, agent: 0, other: 0 },
  byInstallForm: { bundle: 0, repo: 0, client: 0, unknown: 0 },
  byLanguage: {},
  byStarBucket: {},
}

function pluginFixture(overrides: Partial<PluginEntry> = {}): PluginEntry {
  return {
    id: 'acme/plugin',
    name: 'plugin',
    owner: 'acme',
    htmlUrl: 'https://github.com/acme/plugin',
    description: null,
    homepage: null,
    topics: [],
    language: null,
    license: null,
    stars: 0,
    forks: 0,
    createdAt: '2026-01-01T00:00:00Z',
    pushedAt: '2026-01-01T00:00:00Z',
    archived: false,
    fork: false,
    category: 'tool',
    install: { form: 'unknown', command: null, source: 'derived' },
    score: 0,
    ...overrides,
  }
}

function jsonResponse(payload: unknown): Response {
  return { ok: true, json: async () => payload } as unknown as Response
}

describe('CDN hot update', () => {
  it('replaces the bundled snapshot with the remote snapshot on mount', async () => {
    const remotePlugins = [pluginFixture({ id: 'remote/x', name: 'RemoteX', stars: 999 })]
    const remoteMeta = { ...META, total: 1, syncedAt: '2026-08-15T00:00:00.000Z' }
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/plugins.json')) return jsonResponse(remotePlugins)
      if (url.endsWith('/meta.json')) return jsonResponse(remoteMeta)
      return { ok: false, json: async () => ({}) } as unknown as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<DirectoryTab t={makeT(zh)} lang="zh" plugins={[pluginFixture({ id: 'local/a', name: 'LocalA' })]} meta={META} pluginManager={pluginManager} />)

    await screen.findByText('RemoteX')
    expect(screen.queryByText('LocalA')).toBeNull()
    expect(screen.getByText(zh.syncedAt.replace('{time}', '2026-08-15'))).toBeTruthy()
  })

  it('falls back to the bundled snapshot when the CDN fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))

    render(<DirectoryTab t={makeT(zh)} lang="zh" plugins={[pluginFixture({ id: 'local/a', name: 'LocalA' })]} meta={META} pluginManager={pluginManager} />)

    await screen.findByText('LocalA')
    expect(screen.getByText('LocalA')).toBeTruthy()
  })
})

describe('live search', () => {
  const liveItem = {
    full_name: 'live/x',
    name: 'LivePlugin',
    owner: { login: 'live' },
    html_url: 'https://github.com/live/x',
    description: 'a live dsh plugin',
    homepage: null,
    topics: ['dsh-plugin'],
    language: 'TypeScript',
    license: { spdx_id: 'MIT' },
    stargazers_count: 50,
    forks_count: 0,
    created_at: '2026-08-01T00:00:00Z',
    pushed_at: '2026-08-10T00:00:00Z',
    archived: false,
    fork: false,
  }

  it('scopes live search to README-installable repos via in:readme', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('api.github.com/search')) return jsonResponse({ items: [liveItem] })
      return { ok: false, json: async () => ({}) } as unknown as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    await searchLive('vision')
    const searchUrl = fetchMock.mock.calls.find(([url]) => String(url).includes('api.github.com/search'))?.[0] as string
    const decoded = decodeURIComponent(searchUrl)
    expect(decoded).toContain('in:readme')
    expect(decoded).toContain('"dsh plugin add"')
    expect(decoded).toContain('topic:dsh-plugin')
  })

  it('shows live results (deduped against the snapshot) when searching', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('cdn.jsdelivr.net')) return { ok: false, json: async () => ({}) } as unknown as Response
      if (url.includes('api.github.com/search')) return jsonResponse({ items: [liveItem] })
      return { ok: false, json: async () => ({}) } as unknown as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<DirectoryTab t={makeT(zh)} lang="zh" plugins={[pluginFixture({ id: 'local/a', name: 'LocalA' })]} meta={META} pluginManager={pluginManager} />)
    await screen.findByText('LocalA')

    fireEvent.change(screen.getByPlaceholderText(zh.searchPlaceholder), { target: { value: 'vision' } })

    await screen.findByText('LivePlugin', {}, { timeout: 3000 })
    expect(screen.getByText(zh.liveTitle)).toBeTruthy()
    expect(document.querySelector('[data-live-section]')).toBeTruthy()
  })

  it('degrades to a rate-limit notice when live search fails', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('api.github.com/search')) return { ok: false, status: 403, json: async () => ({}) } as unknown as Response
      return { ok: false, json: async () => ({}) } as unknown as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<DirectoryTab t={makeT(zh)} lang="zh" plugins={[pluginFixture({ id: 'local/a', name: 'LocalA' })]} meta={META} pluginManager={pluginManager} />)
    await screen.findByText('LocalA')

    fireEvent.change(screen.getByPlaceholderText(zh.searchPlaceholder), { target: { value: 'vision' } })

    await screen.findByText(zh.liveRateLimited, {}, { timeout: 3000 })
    expect(document.querySelector('[data-live-section]')).toBeNull()
  })
})
