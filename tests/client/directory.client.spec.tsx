// @vitest-environment jsdom
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DirectoryTab, type DirectoryTabInjected, type DirectoryTabProps } from '../../src/client/DirectoryTab.tsx'
import { apply, NS } from '../../src/client/index.ts'
import { en, zh, type DirectoryLocaleKey } from '../../src/client/locales.ts'
import type { MetaFile, PluginEntry } from '../../src/data/types.ts'
import type { PluginManagerFace } from '../../src/client/index.ts'

afterEach(cleanup)

const pluginManager: PluginManagerFace = {
  list: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue([]),
  inventory: vi.fn().mockResolvedValue([]),
}

/** Minimal Translate stub mirroring the harness `{name}` interpolation. */
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

function pluginFixture(): PluginEntry {
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
  }
}

function props(lang: DirectoryTabInjected['lang'], plugins: PluginEntry[]): DirectoryTabProps {
  return {
    t: makeT(lang === 'zh' ? zh : en),
    lang,
    plugins,
    meta: META,
    pluginManager,
  }
}

describe('DirectoryTab three states', () => {
  it('renders the loading seat initially, then the zh empty seat for an empty snapshot', async () => {
    const view = render(<DirectoryTab {...props('zh', [])} />)
    expect(screen.getByText(zh.loading)).toBeTruthy()
    expect(view.container.querySelector('[data-directory]')?.getAttribute('aria-busy')).toBe('true')
    expect(await screen.findByText(zh.empty)).toBeTruthy()
    expect(view.container.querySelector('[data-directory]')?.getAttribute('aria-busy')).toBe('false')
  })

  it('renders the English empty seat for an empty snapshot', async () => {
    const view = render(<DirectoryTab {...props('en', [])} />)
    expect(await screen.findByText(en.empty)).toBeTruthy()
    expect(view.container.querySelector('[data-directory]')?.getAttribute('lang')).toBe('en')
  })

  it('renders the repo count placeholder once data is ready', async () => {
    render(<DirectoryTab {...props('zh', [pluginFixture()])} />)
    expect(await screen.findByText(zh.repoCount.replace('{count}', '1'))).toBeTruthy()
  })

  it('shows the error seat with a retry button for a malformed injected snapshot', async () => {
    const malformed = props('zh', null as unknown as PluginEntry[])
    const view = render(<DirectoryTab {...malformed} />)
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(zh.error)
    const retry = screen.getByRole('button', { name: zh.retry })
    expect(retry).toBeTruthy()
    expect(view.container.querySelector('[data-directory]')?.getAttribute('aria-busy')).toBe('false')

    fireEvent.click(retry)
    expect(screen.getByText(zh.loading)).toBeTruthy()
    expect(await screen.findByRole('alert')).toBeTruthy()
  })
})

describe('apply registration', () => {
  it('injects the directory tab with id "directory" and order 20', async () => {
    const locale = {
      register: vi.fn(() => () => {}),
      bind: vi.fn(() => (key: string) => `bound:${key}`),
      getLocale: vi.fn(() => ({ active: 'zh' as const, locales: [], revision: 0 })),
    }
    const slots = {
      inject: vi.fn((_key: string, callback: () => () => void) => callback()),
      register: vi.fn((_options: Record<string, unknown>) => () => {}),
    }
    const remote = {
      $mount: vi.fn().mockResolvedValue(() => () => {}),
      pluginManager: {
        list: vi.fn().mockResolvedValue({ ok: true, value: [] }),
        add: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
      pluginInventory: {
        list: vi.fn().mockResolvedValue({ ok: true, value: { entries: [] } }),
      },
    }
    const ctx = {
      effect: vi.fn((fn: () => unknown) => { fn(); return () => {} }),
      locale,
      slots,
      remote,
    } as unknown as ClientContext

    await apply(ctx)

    expect(remote.$mount).toHaveBeenCalledTimes(1)
    expect(slots.inject).toHaveBeenCalledWith('settings.plugins.tab', expect.any(Function))
    expect(slots.register).toHaveBeenCalledTimes(1)
    const options = slots.register.mock.calls[0]![0]
    expect(options.name).toBe('settings.plugins.tab')
    expect(options.id).toBe('directory')
    expect(options.order).toBe(20)
    expect(options.locale).toBe(NS)
    expect((options.label as () => string)()).toBe('bound:tab')
    // The inject face wires the active locale, the bundled snapshot, and the manager.
    const injected = (options.inject as () => DirectoryTabInjected)()
    expect(injected.lang).toBe('zh')
    expect(Array.isArray(injected.plugins)).toBe(true)
    expect(typeof injected.pluginManager.list).toBe('function')
    // The snapshot size is not fixed (curation drops noise), but the inject
    // face must be self-consistent: meta.total matches the entry count.
    expect(typeof injected.meta.total).toBe('number')
    expect(injected.meta.total).toBeGreaterThan(0)
    expect(injected.plugins.length).toBe(injected.meta.total)
  })
})
