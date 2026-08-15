import { describe, expect, it } from 'vitest'
import { deriveFromSource, isSourceRepo, normalizeSource } from '../../src/data/installed-types.ts'

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
