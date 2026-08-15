import { describe, expect, it } from 'vitest'
import { deriveFromSource, isSourceRepo, matchInventory, normalizeSource } from '../../src/data/installed-types.ts'
import type { InstalledEntry, InventoryRow } from '../../src/data/installed-types.ts'

describe('installed source validation', () => {
  it('accepts owner/repo and github:owner/repo', () => {
    expect(isSourceRepo('dingzhenyao/dsh-plugin-directory')).toBe(true)
    expect(isSourceRepo('github:dingzhenyao/dsh-plugin-directory')).toBe(true)
    expect(isSourceRepo('a/b-c_d.e')).toBe(true)
  })

  it('rejects empty, single-segment, or malformed sources', () => {
    expect(isSourceRepo('')).toBe(false)
    expect(isSourceRepo('justaname')).toBe(false)
    expect(isSourceRepo('owner//repo')).toBe(false)
    expect(isSourceRepo('owner/repo/extra')).toBe(false)
  })

  it('normalizes to a github: prefix', () => {
    expect(normalizeSource('owner/repo')).toBe('github:owner/repo')
    expect(normalizeSource('github:owner/repo')).toBe('github:owner/repo')
    expect(normalizeSource('  github:owner/repo  ')).toBe('github:owner/repo')
  })

  it('derives id/name from a valid source and rejects malformed ones', () => {
    expect(deriveFromSource('acme/plugin')).toEqual({ id: 'acme/plugin', name: 'plugin' })
    expect(deriveFromSource('github:acme/plugin')).toEqual({ id: 'acme/plugin', name: 'plugin' })
    expect(deriveFromSource('  github:acme/plugin  ')).toEqual({ id: 'acme/plugin', name: 'plugin' })
    expect(deriveFromSource('justaname')).toBeNull()
    expect(deriveFromSource('a/b/c')).toBeNull()
    expect(deriveFromSource('')).toBeNull()
  })
})

describe('matchInventory', () => {
  const ledger: InstalledEntry[] = [
    { id: 'acme/plugin', name: 'plugin', source: 'github:acme/plugin', installedAt: '2026-01-01', method: 'search' },
    { id: 'acme/tool', name: 'tool', source: 'github:acme/tool', installedAt: '2026-01-01', method: 'manual' },
  ]

  it('marks every entry unknown when the inventory is null', () => {
    const map = matchInventory(ledger, null)
    expect(map.get('acme/plugin')).toEqual({ kind: 'unknown' })
    expect(map.get('acme/tool')).toEqual({ kind: 'unknown' })
  })

  it('marks entries not-installed when the inventory has no match', () => {
    const map = matchInventory(ledger, [])
    expect(map.get('acme/plugin')).toEqual({ kind: 'not-installed' })
  })

  it('matches by exact github:owner/repo module name', () => {
    const rows: InventoryRow[] = [
      { moduleName: 'github:acme/plugin', enabled: true, phase: 'active' },
    ]
    const map = matchInventory(ledger, rows)
    expect(map.get('acme/plugin')).toEqual({ kind: 'installed', enabled: true, phase: 'active' })
    expect(map.get('acme/tool')).toEqual({ kind: 'not-installed' })
  })

  it('matches by owner/repo and by unique basename fallback (npm install)', () => {
    const rows: InventoryRow[] = [
      { moduleName: 'plugin', enabled: true, phase: 'active' },
    ]
    const map = matchInventory(ledger, rows)
    expect(map.get('acme/plugin')).toEqual({ kind: 'installed', enabled: true, phase: 'active' })
    // 'tool' basename is not present, so it stays not-installed.
    expect(map.get('acme/tool')).toEqual({ kind: 'not-installed' })
  })

  it('does not use the basename fallback when it is ambiguous', () => {
    const rows: InventoryRow[] = [
      { moduleName: 'x/plugin', enabled: true, phase: 'active' },
      { moduleName: 'y/plugin', enabled: true, phase: 'active' },
    ]
    const map = matchInventory(ledger, rows)
    expect(map.get('acme/plugin')).toEqual({ kind: 'not-installed' })
  })

  it('normalizes github: prefix and #/& fragments on module names', () => {
    const rows: InventoryRow[] = [
      { moduleName: 'github:acme/plugin#main&path:/.dsh-plugin', enabled: false, phase: 'failed' },
    ]
    const map = matchInventory(ledger, rows)
    expect(map.get('acme/plugin')).toEqual({ kind: 'installed', enabled: false, phase: 'failed' })
  })
})
