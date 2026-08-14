import { describe, expect, it } from 'vitest'
import { filterAndSort, type FilterState } from '../../src/client/filter.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL, STAR_BUCKETS } from '../../src/data/constants.ts'
import type { PluginEntry } from '../../src/data/types.ts'

/** Minimal plugin fixture; overrides spread last so each test controls exactly what it asserts. */
function plugin(overrides: Partial<PluginEntry> = {}): PluginEntry {
  return {
    id: 'p1',
    name: 'alpha-tool',
    owner: 'acme',
    htmlUrl: 'https://github.com/acme/alpha-tool',
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

/** Default filter state: no query, no category/form restriction, group by category, sort by score. */
function state(overrides: Partial<FilterState> = {}): FilterState {
  return {
    query: '',
    categories: new Set(),
    installForms: new Set(),
    groupBy: 'category',
    sort: 'score',
    ...overrides,
  }
}

/** Flat id list across all groups, for order assertions. */
function ids(result: ReturnType<typeof filterAndSort>): string[] {
  return result.groups.flatMap(group => group.entries).map(entry => entry.id)
}

describe('filterAndSort — query filtering', () => {
  it('matches name, description, or owner with a case-insensitive includes', () => {
    const entries = [
      plugin({ id: 'a/one', name: 'VisionLens', owner: 'alice' }),
      plugin({ id: 'b/two', name: 'other', owner: 'bob', description: 'vision pipeline' }),
      plugin({ id: 'c/three', name: 'third', owner: 'VisionWorks' }),
      plugin({ id: 'd/four', name: 'four', owner: 'dave', description: 'nothing here' }),
    ]
    const result = filterAndSort(entries, state({ query: 'VISION' }), 'en')
    expect(result.visible).toBe(3)
    expect(ids(result).sort()).toEqual(['a/one', 'b/two', 'c/three'])
  })

  it('does not match a null description', () => {
    const entries = [plugin({ id: 'a/one', name: 'tool', description: null })]
    const result = filterAndSort(entries, state({ query: 'vision' }), 'en')
    expect(result.visible).toBe(0)
  })

  it('empty query keeps everything', () => {
    const entries = [plugin({ id: 'a' }), plugin({ id: 'b' })]
    expect(filterAndSort(entries, state(), 'en').visible).toBe(2)
  })
})

describe('filterAndSort — category and install-form intersection', () => {
  it('keeps only entries in the selected categories', () => {
    const entries = [
      plugin({ id: 'v', category: 'vision' }),
      plugin({ id: 't', category: 'tool' }),
      plugin({ id: 'm', category: 'memory' }),
    ]
    const result = filterAndSort(entries, state({ categories: new Set(['vision']) }), 'en')
    expect(result.visible).toBe(1)
    expect(ids(result)).toEqual(['v'])
  })

  it('keeps only entries with a selected install form', () => {
    const entries = [
      plugin({ id: 'b', install: { form: 'bundle', command: null, source: 'derived' } }),
      plugin({ id: 'r', install: { form: 'repo', command: 'npm i', source: 'readme' } }),
      plugin({ id: 'u', install: { form: 'unknown', command: null, source: 'derived' } }),
    ]
    const result = filterAndSort(entries, state({ installForms: new Set(['repo']) }), 'en')
    expect(result.visible).toBe(1)
    expect(ids(result)).toEqual(['r'])
  })

  it('combines query, category, and install-form filters as an intersection', () => {
    const entries = [
      plugin({ id: 't1', name: 'vision-tool', category: 'tool', install: { form: 'repo', command: null, source: 'readme' } }),
      plugin({ id: 't2', name: 'vision-tool', category: 'tool', install: { form: 'bundle', command: null, source: 'derived' } }),
      plugin({ id: 'v1', name: 'vision-tool', category: 'vision', install: { form: 'repo', command: null, source: 'readme' } }),
    ]
    const result = filterAndSort(entries, state({
      query: 'vision',
      categories: new Set(['tool']),
      installForms: new Set(['repo']),
    }), 'en')
    expect(result.visible).toBe(1)
    expect(ids(result)).toEqual(['t1'])
  })

  it('empty category/install-form sets do not filter', () => {
    const entries = [
      plugin({ id: 'v', category: 'vision', install: { form: 'client', command: null, source: 'derived' } }),
      plugin({ id: 't', category: 'tool', install: { form: 'repo', command: null, source: 'readme' } }),
    ]
    const result = filterAndSort(entries, state(), 'en')
    expect(result.visible).toBe(2)
  })
})

describe('filterAndSort — sorting', () => {
  it('score sorts desc, tie-broken by stars desc then id asc', () => {
    const entries = [
      plugin({ id: 'z', score: 50, stars: 10 }),
      plugin({ id: 'a', score: 80, stars: 5 }),
      plugin({ id: 'b', score: 80, stars: 10 }),
      plugin({ id: 'c', score: 80, stars: 10 }),
    ]
    const result = filterAndSort(entries, state({ sort: 'score' }), 'en')
    expect(ids(result)).toEqual(['b', 'c', 'a', 'z'])
  })

  it('stars sorts desc', () => {
    const entries = [
      plugin({ id: 'low', stars: 1 }),
      plugin({ id: 'high', stars: 500 }),
      plugin({ id: 'mid', stars: 42 }),
    ]
    const result = filterAndSort(entries, state({ sort: 'stars' }), 'en')
    expect(ids(result)).toEqual(['high', 'mid', 'low'])
  })

  it('recent sorts by pushedAt desc via ISO string comparison', () => {
    const entries = [
      plugin({ id: 'old', pushedAt: '2020-01-01T00:00:00Z' }),
      plugin({ id: 'new', pushedAt: '2026-06-01T00:00:00Z' }),
      plugin({ id: 'mid', pushedAt: '2023-05-05T00:00:00Z' }),
    ]
    const result = filterAndSort(entries, state({ sort: 'recent' }), 'en')
    expect(ids(result)).toEqual(['new', 'mid', 'old'])
  })
})

describe('filterAndSort — grouping', () => {
  it('groups by category, emitting only non-empty groups in CATEGORY_LABEL order with localized labels', () => {
    const entries = [
      plugin({ id: 'm', category: 'memory' }),
      plugin({ id: 't1', category: 'tool' }),
      plugin({ id: 'v', category: 'vision' }),
      plugin({ id: 't2', category: 'tool' }),
    ]
    const result = filterAndSort(entries, state({ groupBy: 'category' }), 'zh')
    expect(result.groups.map(group => group.key)).toEqual(['tool', 'memory', 'vision'])
    expect(result.groups.map(group => group.label)).toEqual([
      CATEGORY_LABEL.tool.zh,
      CATEGORY_LABEL.memory.zh,
      CATEGORY_LABEL.vision.zh,
    ])
    expect(result.groups[0]?.entries.map(entry => entry.id)).toEqual(['t1', 't2'])
  })

  it('renders the English category labels symmetrically', () => {
    const entries = [plugin({ id: 'v', category: 'vision' })]
    const result = filterAndSort(entries, state({ groupBy: 'category' }), 'en')
    expect(result.groups[0]?.label).toBe(CATEGORY_LABEL.vision.en)
  })

  it('groups by install form in INSTALL_FORM_LABEL order with localized labels', () => {
    const entries = [
      plugin({ id: 'r', install: { form: 'repo', command: null, source: 'readme' } }),
      plugin({ id: 'u', install: { form: 'unknown', command: null, source: 'derived' } }),
      plugin({ id: 'b', install: { form: 'bundle', command: null, source: 'derived' } }),
    ]
    const result = filterAndSort(entries, state({ groupBy: 'installForm' }), 'en')
    expect(result.groups.map(group => group.key)).toEqual(['bundle', 'repo', 'unknown'])
    expect(result.groups.map(group => group.label)).toEqual([
      INSTALL_FORM_LABEL.bundle.en,
      INSTALL_FORM_LABEL.repo.en,
      INSTALL_FORM_LABEL.unknown.en,
    ])
  })

  it('groups by language, sorting groups by entry count desc with a stable key tie-break', () => {
    const entries = [
      plugin({ id: 'ts', language: 'TypeScript' }),
      plugin({ id: 'none1', language: null }),
      plugin({ id: 'py', language: 'Python' }),
      plugin({ id: 'none2', language: null }),
    ]
    const result = filterAndSort(entries, state({ groupBy: 'language' }), 'zh')
    // other (2) > Python (1), TypeScript (1) — single-count ties ordered by key.
    expect(result.groups.map(group => group.key)).toEqual(['other', 'Python', 'TypeScript'])
    expect(result.groups[0]?.label).toBe('其他语言')
    expect(result.groups[0]?.entries.map(entry => entry.id)).toEqual(['none1', 'none2'])
  })

  it('localizes the "other" language label in English', () => {
    const entries = [plugin({ id: 'none', language: null })]
    const result = filterAndSort(entries, state({ groupBy: 'language' }), 'en')
    expect(result.groups[0]?.label).toBe('Other languages')
  })

  it('groups by star bucket in STAR_BUCKETS order with bucket labels', () => {
    const entries = [
      plugin({ id: 's', stars: 3000 }),
      plugin({ id: 'l', stars: 5 }),
      plugin({ id: 'm', stars: 150 }),
      plugin({ id: 'h', stars: 300 }),
      plugin({ id: 't', stars: 20 }),
    ]
    const result = filterAndSort(entries, state({ groupBy: 'starBucket' }), 'en')
    expect(result.groups.map(group => group.key)).toEqual(STAR_BUCKETS.map(([, label]) => label))
    expect(result.groups.map(group => group.label)).toEqual(STAR_BUCKETS.map(([, label]) => label))
    expect(result.groups[0]?.entries.map(entry => entry.id)).toEqual(['l'])
  })
})

describe('filterAndSort — visible count', () => {
  it('reports the filtered total across groups', () => {
    const entries = [
      plugin({ id: 't1', category: 'tool' }),
      plugin({ id: 'v', category: 'vision' }),
      plugin({ id: 't2', category: 'tool' }),
    ]
    const result = filterAndSort(entries, state({ categories: new Set(['tool']) }), 'en')
    expect(result.visible).toBe(2)
    expect(result.groups.reduce((total, group) => total + group.entries.length, 0)).toBe(2)
  })
})
