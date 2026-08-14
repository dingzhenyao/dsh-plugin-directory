// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { DirectoryTab } from '../../src/client/DirectoryTab.tsx'
import { StatsDashboard, type StatsDashboardProps } from '../../src/client/StatsDashboard.tsx'
import { en, zh, type DirectoryLocaleKey } from '../../src/client/locales.ts'
import { CATEGORY_LABEL, STAR_BUCKETS } from '../../src/data/constants.ts'
import type { MetaFile, PluginEntry } from '../../src/data/types.ts'

afterEach(cleanup)

/** Minimal Translate stub mirroring the harness `{name}` interpolation. */
function makeT(dict: Record<DirectoryLocaleKey, string>): StatsDashboardProps['t'] {
  return ((key: DirectoryLocaleKey, params?: Record<string, unknown>): string => {
    let text = dict[key] ?? key
    if (params !== undefined) {
      text = text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
    }
    return text
  }) as StatsDashboardProps['t']
}

/** Stats fixture: total 5, partial non-zero categories, bundle=2/unknown=3,
 *  typescript=3/other=2, star buckets 10-49=4 / 0-9=1 (the rest missing). */
const STATS_META: MetaFile = {
  syncedAt: '2026-08-14T10:00:25.938Z',
  total: 5,
  byCategory: {
    tool: 2, skill: 1, memory: 0, vision: 0, 'ui-skin': 0, mcp: 1,
    orchestration: 0, 'cli-tui': 0, web: 1, agent: 0, other: 0,
  },
  byInstallForm: { bundle: 2, repo: 0, client: 0, unknown: 3 },
  byLanguage: { typescript: 3, other: 2 },
  byStarBucket: { '10-49': 4, '0-9': 1 },
}

describe('StatsDashboard', () => {
  it('renders the total label with the snapshot count', () => {
    const view = render(<StatsDashboard meta={STATS_META} lang="zh" t={makeT(zh)} />)
    expect(screen.getByText(zh.totalLabel)).toBeTruthy()
    const total = view.container.querySelector('[data-stat="total"]')
    expect(total).toBeTruthy()
    expect(total?.querySelector('[data-stat-value]')?.textContent).toBe('5')
  })

  it('renders category labels, including zero-count categories', () => {
    const view = render(<StatsDashboard meta={STATS_META} lang="zh" t={makeT(zh)} />)
    expect(screen.getByText(CATEGORY_LABEL.tool.zh)).toBeTruthy()
    expect(view.container.querySelector('[data-stat="category-memory"] [data-stat-value]')?.textContent).toBe('0')
  })

  it('renders install-form counts from the snapshot', () => {
    const view = render(<StatsDashboard meta={STATS_META} lang="zh" t={makeT(zh)} />)
    expect(view.container.querySelector('[data-stat="installForm-bundle"] [data-stat-value]')?.textContent).toBe('2')
    expect(view.container.querySelector('[data-stat="installForm-unknown"] [data-stat-value]')?.textContent).toBe('3')
  })

  it('renders star buckets in STAR_BUCKETS order, missing keys counting as 0', () => {
    const view = render(<StatsDashboard meta={STATS_META} lang="zh" t={makeT(zh)} />)
    expect(view.container.querySelector('[data-stat="star-10-49"] [data-stat-value]')?.textContent).toBe('4')
    expect(view.container.querySelector('[data-stat="star-1000+"] [data-stat-value]')?.textContent).toBe('0')
    const stats = [...view.container.querySelectorAll('[data-stat^="star-"]')]
    expect(stats.map(el => el.getAttribute('data-stat'))).toEqual(STAR_BUCKETS.map(([, label]) => `star-${label}`))
  })

  it('labels the "other" language with the localized key and sorts by count desc', () => {
    const view = render(<StatsDashboard meta={STATS_META} lang="zh" t={makeT(zh)} />)
    const other = view.container.querySelector('[data-stat="language-other"]')
    expect(other?.querySelector('[data-stat-label]')?.textContent).toBe(zh.languageOther)
    const languages = [...view.container.querySelectorAll('[data-stat^="language-"]')]
    expect(languages.map(el => el.getAttribute('data-stat'))).toEqual(['language-typescript', 'language-other'])
  })

  it('renders the English other-language label symmetrically', () => {
    const view = render(<StatsDashboard meta={STATS_META} lang="en" t={makeT(en)} />)
    expect(view.container.querySelector('[data-stat="language-other"] [data-stat-label]')?.textContent).toBe(en.languageOther)
  })
})

describe('DirectoryTab wiring', () => {
  it('renders the stats dashboard in the ready state', async () => {
    const plugins: PluginEntry[] = [
      {
        id: 'a/one', name: 'one', owner: 'a', htmlUrl: 'https://github.com/a/one',
        description: null, homepage: null, topics: [], language: null, license: null,
        stars: 0, forks: 0, createdAt: '2026-01-01T00:00:00Z', pushedAt: '2026-01-01T00:00:00Z',
        archived: false, fork: false, category: 'tool',
        install: { form: 'unknown', command: null, source: 'derived' }, score: 0,
      },
    ]
    const view = render(<DirectoryTab t={makeT(zh)} lang="zh" plugins={plugins} meta={STATS_META} />)
    expect(await screen.findByText(zh.statsTitle)).toBeTruthy()
    expect(view.container.querySelector('[data-stats]')).toBeTruthy()
  })
})
