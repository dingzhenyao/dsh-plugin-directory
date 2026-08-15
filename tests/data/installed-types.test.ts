import { describe, expect, it } from 'vitest'
import { isSourceRepo, normalizeSource } from '../../src/data/installed-types.ts'

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
})
