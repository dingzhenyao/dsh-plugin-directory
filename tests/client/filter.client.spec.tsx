// @vitest-environment jsdom
import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DirectoryTab, type DirectoryTabProps } from '../../src/client/DirectoryTab.tsx'
import { FilterBar, type FilterBarProps } from '../../src/client/FilterBar.tsx'
import { en, zh, type DirectoryLocaleKey } from '../../src/client/locales.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL } from '../../src/data/constants.ts'
import type { MetaFile, PluginEntry } from '../../src/data/types.ts'

afterEach(cleanup)

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
    state: {
      query: '',
      categories: new Set(),
      installForms: new Set(),
      groupBy: 'category',
      sort: 'score',
    },
    lang: 'zh',
    t: makeT(zh),
    onChange: vi.fn(),
    ...overrides,
  })

  it('fires onChange with the new query when the search box changes', () => {
    const onChange = vi.fn()
    render(<FilterBar {...baseProps({ onChange })} />)
    fireEvent.change(screen.getByPlaceholderText(zh.searchPlaceholder), { target: { value: 'vision' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ query: 'vision' }))
  })

  it('toggles a category chip on and off, reporting the updated set each time', () => {
    const onChange = vi.fn()
    const initial = baseProps().state
    function Harness() {
      const [state, setState] = useState(initial)
      return (
        <FilterBar
          state={state}
          lang="zh"
          t={makeT(zh)}
          onChange={next => { onChange(next); setState(next) }}
        />
      )
    }
    render(<Harness />)
    const chip = screen.getByRole('button', { name: CATEGORY_LABEL.vision.zh })
    fireEvent.click(chip)
    const selected = onChange.mock.calls[0]?.[0] as FilterBarProps['state'] | undefined
    expect(selected?.categories.has('vision')).toBe(true)
    fireEvent.click(chip)
    const deselected = onChange.mock.calls[1]?.[0] as FilterBarProps['state'] | undefined
    expect(deselected?.categories.has('vision')).toBe(false)
  })

  it('toggles an install-form chip and reports the updated set', () => {
    const onChange = vi.fn()
    render(<FilterBar {...baseProps({ onChange })} />)
    fireEvent.click(screen.getByRole('button', { name: INSTALL_FORM_LABEL.repo.zh }))
    const next = onChange.mock.calls[0]?.[0] as FilterBarProps['state'] | undefined
    expect(next?.installForms.has('repo')).toBe(true)
  })

  it('switches the group-by dimension', () => {
    const onChange = vi.fn()
    render(<FilterBar {...baseProps({ onChange })} />)
    fireEvent.click(screen.getByRole('button', { name: zh.groupByLanguage }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ groupBy: 'language' }))
  })

  it('switches the sort key', () => {
    const onChange = vi.fn()
    render(<FilterBar {...baseProps({ onChange })} />)
    fireEvent.click(screen.getByRole('button', { name: zh.sortStars }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sort: 'stars' }))
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
    pluginFixture({ id: 'a/vision', name: 'VisionLens', category: 'vision' }),
    pluginFixture({ id: 'b/tool', name: 'Toolbox', category: 'tool', install: { form: 'bundle', command: null, source: 'derived' } }),
    pluginFixture({ id: 'c/mcp', name: 'McpHub', category: 'mcp' }),
  ]

  it('shows the visibleCount line and grouped placeholders with localized labels + counts', async () => {
    const view = render(<DirectoryTab t={makeT(zh)} lang="zh" plugins={plugins} meta={META} />)
    expect(await screen.findByText(zh.visibleCount.replace('{count}', '3'))).toBeTruthy()
    const vision = view.container.querySelector('[data-group="vision"]')
    expect(vision?.querySelector('[data-group-label]')?.textContent).toBe(CATEGORY_LABEL.vision.zh)
    expect(vision?.querySelector('[data-group-count]')?.textContent).toBe('1')
    const groups = [...view.container.querySelectorAll('[data-group]')]
    expect(groups.map(el => el.getAttribute('data-group'))).toEqual(['tool', 'vision', 'mcp'])
  })

  it('narrows the groups and visible count when the search box changes', async () => {
    const view = render(<DirectoryTab t={makeT(zh)} lang="zh" plugins={plugins} meta={META} />)
    await screen.findByText(zh.visibleCount.replace('{count}', '3'))
    fireEvent.change(screen.getByPlaceholderText(zh.searchPlaceholder), { target: { value: 'vision' } })
    expect(screen.getByText(zh.visibleCount.replace('{count}', '1'))).toBeTruthy()
    const groups = [...view.container.querySelectorAll('[data-group]')]
    expect(groups.map(el => el.getAttribute('data-group'))).toEqual(['vision'])
  })
})
