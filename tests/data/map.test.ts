import { describe, expect, it } from 'vitest'
import { searchItemToEntry, type SearchItem } from '../../src/data/map.ts'

function item(overrides: Partial<SearchItem> = {}): SearchItem {
  return {
    full_name: 'acme/dsh-tool',
    name: 'dsh-tool',
    owner: { login: 'acme' },
    html_url: 'https://github.com/acme/dsh-tool',
    description: 'A vision tool for DeepSeek Harness',
    homepage: 'https://acme.dev',
    topics: ['dsh-plugin', 'vision'],
    language: 'TypeScript',
    license: { spdx_id: 'MIT' },
    stargazers_count: 120,
    forks_count: 8,
    created_at: '2025-01-01T00:00:00Z',
    pushed_at: '2026-08-01T00:00:00Z',
    archived: false,
    fork: false,
    ...overrides,
  }
}

describe('searchItemToEntry', () => {
  it('maps every field and classifies + scores like the pipeline', () => {
    const entry = searchItemToEntry(item(), new Date('2026-08-14T00:00:00Z'))
    expect(entry.id).toBe('acme/dsh-tool')
    expect(entry.owner).toBe('acme')
    expect(entry.htmlUrl).toBe('https://github.com/acme/dsh-tool')
    expect(entry.description).toBe('A vision tool for DeepSeek Harness')
    expect(entry.license).toBe('MIT')
    expect(entry.stars).toBe(120)
    expect(entry.category).toBe('vision')
    expect(entry.install.form).toBe('unknown')
    expect(entry.install.source).toBe('derived')
    expect(entry.install.command).toBe('dsh plugin add github:acme/dsh-tool')
    expect(Number.isInteger(entry.score)).toBe(true)
    expect(entry.score).toBeGreaterThan(0)
  })

  it('uses an empty owner when the search payload omits it', () => {
    const entry = searchItemToEntry(item({ owner: null }))
    expect(entry.owner).toBe('')
  })

  it('normalizes a null pushed_at to an empty string', () => {
    const entry = searchItemToEntry(item({ pushed_at: null }))
    expect(entry.pushedAt).toBe('')
  })
})
