// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DirectoryTab } from '../../src/client/DirectoryTab.tsx'
import { PluginCard, type PluginCardProps } from '../../src/client/PluginCard.tsx'
import { en, zh, type DirectoryLocaleKey } from '../../src/client/locales.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL } from '../../src/data/constants.ts'
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

/** Minimal Translate stub mirroring the harness `{name}` interpolation. */
function makeT(dict: Record<DirectoryLocaleKey, string>): PluginCardProps['t'] {
  return ((key: DirectoryLocaleKey, params?: Record<string, unknown>): string => {
    let text = dict[key] ?? key
    if (params !== undefined) {
      text = text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
    }
    return text
  }) as PluginCardProps['t']
}

const META: MetaFile = {
  syncedAt: '2026-08-14T10:00:25.938Z',
  total: 0,
  byCategory: { tool: 0, skill: 0, memory: 0, vision: 0, 'ui-skin': 0, mcp: 0, orchestration: 0, 'cli-tui': 0, web: 0, agent: 0, other: 0 },
  byInstallForm: { bundle: 0, repo: 0, client: 0, unknown: 0 },
  byLanguage: {},
  byStarBucket: {},
}

/** Plugin fixture with a rich install command; overrides win per key. */
function pluginFixture(overrides: Partial<PluginEntry> = {}): PluginEntry {
  return {
    id: 'acme/plugin',
    name: 'plugin',
    owner: 'acme',
    htmlUrl: 'https://github.com/acme/plugin',
    description: 'A demo plugin.',
    homepage: null,
    topics: [],
    language: 'TypeScript',
    license: 'MIT',
    stars: 42,
    forks: 0,
    createdAt: '2026-01-01T00:00:00Z',
    pushedAt: '2026-08-14T10:00:25.938Z',
    archived: false,
    fork: false,
    category: 'tool',
    install: { form: 'bundle', command: 'npm install dsh-plugin-demo', source: 'derived' },
    score: 10,
    ...overrides,
  }
}

describe('PluginCard', () => {
  it('renders the card as an article with name, description, and stars meta', () => {
    const entry = pluginFixture()
    const view = render(<PluginCard entry={entry} lang="zh" t={makeT(zh)} />)
    expect(view.container.querySelector('article[data-plugin-card]')).toBeTruthy()
    expect(screen.getByText(entry.name)).toBeTruthy()
    expect(screen.getByText(entry.description as string)).toBeTruthy()
    expect(screen.getByText(zh.stars)).toBeTruthy()
    expect(view.container.querySelector('[data-meta="stars"]')?.textContent).toContain('42')
  })

  it('links the name to the repository URL in a new, safe tab and shows the owner', () => {
    const entry = pluginFixture()
    const view = render(<PluginCard entry={entry} lang="en" t={makeT(en)} />)
    const link = view.container.querySelector('a[data-owner-link]')
    expect(link?.getAttribute('href')).toBe(entry.htmlUrl)
    expect(link?.getAttribute('target')).toBe('_blank')
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link?.textContent).toBe(entry.name)
    expect(screen.getByText(entry.owner)).toBeTruthy()
  })

  it('renders category and install-form badges with the active-language labels', () => {
    const entry = pluginFixture({ category: 'mcp', install: { form: 'client', command: 'dsh add demo', source: 'derived' } })
    const view = render(<PluginCard entry={entry} lang="zh" t={makeT(zh)} />)
    expect(view.container.querySelector('[data-badge="category"]')?.textContent).toBe(CATEGORY_LABEL.mcp.zh)
    expect(view.container.querySelector('[data-badge="installForm"]')?.textContent).toBe(INSTALL_FORM_LABEL.client.zh)
  })

  it('shows the install command in a code element and copies it to the clipboard on click', async () => {
    const entry = pluginFixture({ install: { form: 'bundle', command: 'dsh plugin add dsh-plugin-demo', source: 'readme' } })
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const view = render(<PluginCard entry={entry} lang="zh" t={makeT(zh)} />)
    expect(view.container.querySelector('code[data-install-command]')?.textContent).toBe(entry.install.command)
    fireEvent.click(screen.getByRole('button', { name: zh.install }))
    expect(writeText).toHaveBeenCalledWith(entry.install.command)
    expect(await screen.findByText(zh.copied)).toBeTruthy()
  })

  it('omits the install button and command when the command is null', () => {
    const entry = pluginFixture({ install: { form: 'unknown', command: null, source: 'derived' } })
    const view = render(<PluginCard entry={entry} lang="en" t={makeT(en)} />)
    expect(view.container.querySelector('button[data-install-button]')).toBeNull()
    expect(view.container.querySelector('code[data-install-command]')).toBeNull()
    expect(screen.queryByText(en.install)).toBeNull()
    expect(screen.queryByText(en.copied)).toBeNull()
  })

  it('shows the install channel for a derived command (git fallback)', () => {
    const entry = pluginFixture({ install: { form: 'unknown', command: 'dsh plugin add github:acme/plugin', source: 'derived' } })
    const view = render(<PluginCard entry={entry} lang="zh" t={makeT(zh)} />)
    expect(view.container.querySelector('button[data-install-button]')).toBeTruthy()
    expect(view.container.querySelector('code[data-install-command]')?.textContent).toBe('dsh plugin add github:acme/plugin')
  })

  it('falls back to localized no-description / no-license copy and an em dash for the language', () => {
    const entry = pluginFixture({ description: null, license: null, language: null })
    render(<PluginCard entry={entry} lang="zh" t={makeT(zh)} />)
    expect(screen.getByText(zh.noDescription)).toBeTruthy()
    expect(screen.getByText(zh.noLicense)).toBeTruthy()
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('shows the updated label with the date prefix of pushedAt', () => {
    const entry = pluginFixture()
    const view = render(<PluginCard entry={entry} lang="en" t={makeT(en)} />)
    const updated = view.container.querySelector('[data-meta="updated"]')
    expect(updated?.textContent).toContain(en.updated)
    expect(updated?.textContent).toContain(entry.pushedAt.slice(0, 10))
  })
})

describe('DirectoryTab wiring', () => {
  it('renders one PluginCard per entry inside each group', async () => {
    const plugins = [
      pluginFixture({ id: 'a/one', name: 'one', owner: 'a', htmlUrl: 'https://github.com/a/one', category: 'tool' }),
      pluginFixture({ id: 'b/two', name: 'two', owner: 'b', htmlUrl: 'https://github.com/b/two', category: 'mcp' }),
    ]
    const view = render(<DirectoryTab t={makeT(zh)} lang="zh" plugins={plugins} meta={META} pluginManager={pluginManager} />)
    await screen.findByText(zh.repoCount.replace('{count}', '2'))
    expect(view.container.querySelectorAll('article[data-plugin-card]')).toHaveLength(2)
    expect(screen.getByText('one')).toBeTruthy()
    expect(screen.getByText('two')).toBeTruthy()
  })
})
