// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DirectoryTab, type DirectoryTabProps } from '../../src/client/DirectoryTab.tsx'
import { FilterBar, type FilterBarProps } from '../../src/client/FilterBar.tsx'
import { en, zh, type DirectoryLocaleKey } from '../../src/client/locales.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL } from '../../src/data/constants.ts'
import type { MetaFile, PluginEntry } from '../../src/data/types.ts'
import type { PluginManagerFace } from '../../src/client/index.ts'

afterEach(cleanup)

const pluginManager: PluginManagerFace = {
  list: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue([]),
  remove: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue([]),
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

describe('FilterBar', () => {
  const baseProps = (overrides: Partial<FilterBarProps> = {}): FilterBarProps => ({
    query: '',
    controls: {
      categories: new Set(),
      installForms: new Set(),
      groupBy: 'category',
      sort: 'score',
    },
    lang: 'zh',
    t: makeT(zh),
    onQueryChange: vi.fn(),
    onControlsChange: vi.fn(),
    ...overrides,
  })

  it('fires onQueryChange with the new query when the search box changes', () => {
    const onQueryChange = vi.fn()
    render(<FilterBar {...baseProps({ onQueryChange })} />)
    fireEvent.change(screen.getByPlaceholderText(zh.searchPlaceholder), { target: { value: 'vision' } })
    expect(onQueryChange).toHaveBeenCalledWith('vision')
  })

  it('toggles a category chip on and off, reporting the updated set each time', () => {
    const onControlsChange = vi.fn()
    const initial = baseProps().controls
    function Harness() {
      const [controls, setControls] = useState(initial)
      return (
        <FilterBar
          query=""
          lang="zh"
          t={makeT(zh)}
          controls={controls}
          onQueryChange={() => {}}
          onControlsChange={next => { onControlsChange(next); setControls(next) }}
        />
      )
    }
    render(<Harness />)
    const chip = screen.getByRole('button', { name: CATEGORY_LABEL.vision.zh })
    fireEvent.click(chip)
    const selected = onControlsChange.mock.calls[0]?.[0] as FilterBarProps['controls'] | undefined
    expect(selected?.categories.has('vision')).toBe(true)
    fireEvent.click(chip)
    const deselected = onControlsChange.mock.calls[1]?.[0] as FilterBarProps['controls'] | undefined
    expect(deselected?.categories.has('vision')).toBe(false)
  })

  it('toggles an install-form chip and reports the updated set', () => {
    const onControlsChange = vi.fn()
    render(<FilterBar {...baseProps({ onControlsChange })} />)
    fireEvent.click(screen.getByRole('button', { name: INSTALL_FORM_LABEL.repo.zh }))
    const next = onControlsChange.mock.calls[0]?.[0] as FilterBarProps['controls'] | undefined
    expect(next?.installForms.has('repo')).toBe(true)
  })

  it('switches the group-by dimension', () => {
    const onControlsChange = vi.fn()
    render(<FilterBar {...baseProps({ onControlsChange })} />)
    fireEvent.click(screen.getByRole('button', { name: zh.groupByLanguage }))
    expect(onControlsChange).toHaveBeenCalledWith(expect.objectContaining({ groupBy: 'language' }))
  })

  it('switches the sort key', () => {
    const onControlsChange = vi.fn()
    render(<FilterBar {...baseProps({ onControlsChange })} />)
    fireEvent.click(screen.getByRole('button', { name: zh.sortStars }))
    expect(onControlsChange).toHaveBeenCalledWith(expect.objectContaining({ sort: 'stars' }))
  })

  it('renders English labels symmetrically', () => {
    render(<FilterBar {...baseProps({ lang: 'en', t: makeT(en) })} />)
    expect(screen.getByPlaceholderText(en.searchPlaceholder)).toBeTruthy()
    expect(screen.getByRole('button', { name: CATEGORY_LABEL.vision.en })).toBeTruthy()
    expect(screen.getByRole('button', { name: en.groupByStarBucket })).toBeTruthy()
    expect(screen.getByRole('button', { name: en.sortRecent })).toBeTruthy()
  })
})

describe('DirectoryTab filter wiring', () => {
  const plugins: PluginEntry[] = [
    pluginFixture({ id: 'a/vision', name: 'VisionLens', category: 'vision', stars: 30 }),
    pluginFixture({ id: 'b/tool', name: 'Toolbox', category: 'tool', stars: 20, install: { form: 'bundle', command: null, source: 'derived' } }),
    pluginFixture({ id: 'c/mcp', name: 'McpHub', category: 'mcp', stars: 10 }),
  ]

  it('renders all cards in the default star-desc order', async () => {
    const view = render(<DirectoryTab t={makeT(zh)} lang="zh" plugins={plugins} meta={META} pluginManager={pluginManager} />)
    await screen.findByText('VisionLens')
    const names = [...view.container.querySelectorAll('[data-plugin-card] [data-owner-link]')]
      .map(el => el.textContent)
    expect(names).toEqual(['VisionLens', 'Toolbox', 'McpHub'])
  })

  it('narrows the listing when the search box changes (debounced)', async () => {
    const view = render(<DirectoryTab t={makeT(zh)} lang="zh" plugins={plugins} meta={META} pluginManager={pluginManager} />)
    await screen.findByText('VisionLens')
    fireEvent.change(screen.getByPlaceholderText(zh.searchPlaceholder), { target: { value: 'vision' } })
    // The query is debounced; the narrowed result arrives a beat later.
    await screen.findByText(zh.visibleCount.replace('{count}', '1'), {}, { timeout: 2000 })
    const cards = [...view.container.querySelectorAll('[data-plugin-card]')]
    expect(cards).toHaveLength(1)
    expect(cards[0]?.querySelector('[data-owner-link]')?.textContent).toBe('VisionLens')
  })
})
