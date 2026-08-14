import { describe, expect, it } from 'vitest'
import {
  CATEGORY_LABEL,
  INSTALL_FORM_LABEL,
  STAR_BUCKETS,
  starBucket,
} from '../../src/data/constants.ts'
import type { FunctionCategory, InstallForm } from '../../src/data/types.ts'

/**
 * Runtime mirror of the FunctionCategory union. Typed as
 * `FunctionCategory[]` so a union change fails typecheck here,
 * while the loop below verifies label coverage at runtime.
 */
const ALL_CATEGORIES: FunctionCategory[] = [
  'tool',
  'skill',
  'memory',
  'vision',
  'ui-skin',
  'mcp',
  'orchestration',
  'cli-tui',
  'web',
  'agent',
  'other',
]

const ALL_INSTALL_FORMS: InstallForm[] = ['bundle', 'repo', 'client', 'unknown']

describe('data constants', () => {
  it('CATEGORY_LABEL covers every FunctionCategory with zh/en labels', () => {
    expect(ALL_CATEGORIES).toHaveLength(11)
    for (const category of ALL_CATEGORIES) {
      const label = CATEGORY_LABEL[category]
      expect(label, `missing label for category ${category}`).toBeDefined()
      expect(label?.zh.trim(), `empty zh label for ${category}`).not.toBe('')
      expect(label?.en.trim(), `empty en label for ${category}`).not.toBe('')
    }
  })

  it('INSTALL_FORM_LABEL covers every InstallForm with zh/en labels', () => {
    expect(ALL_INSTALL_FORMS).toHaveLength(4)
    for (const form of ALL_INSTALL_FORMS) {
      const label = INSTALL_FORM_LABEL[form]
      expect(label, `missing label for install form ${form}`).toBeDefined()
      expect(label?.zh.trim(), `empty zh label for ${form}`).not.toBe('')
      expect(label?.en.trim(), `empty en label for ${form}`).not.toBe('')
    }
  })

  it('STAR_BUCKETS lists the exact five thresholds', () => {
    expect(STAR_BUCKETS).toEqual([
      [0, '0-9'],
      [10, '10-49'],
      [50, '50-199'],
      [200, '200-999'],
      [1000, '1000+'],
    ])
  })

  it('starBucket maps boundary star counts to the right bucket', () => {
    expect(starBucket(0)).toBe('0-9')
    expect(starBucket(9)).toBe('0-9')
    expect(starBucket(10)).toBe('10-49')
    expect(starBucket(49)).toBe('10-49')
    expect(starBucket(199)).toBe('50-199')
    expect(starBucket(200)).toBe('200-999')
    expect(starBucket(999)).toBe('200-999')
    expect(starBucket(1000)).toBe('1000+')
    expect(starBucket(123456)).toBe('1000+')
  })
})
