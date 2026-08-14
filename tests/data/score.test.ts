import { describe, expect, it } from 'vitest'
import { scoreRepo } from '../../src/data/score.ts'
import type { ScoreInput } from '../../src/data/score.ts'

const DAY = 86_400_000
const NOW = new Date('2026-03-15T00:00:00.000Z')

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * DAY).toISOString()
}

function base(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    stars: 0,
    description: null,
    license: null,
    hasReadme: false,
    pushedAt: daysAgo(30),
    archived: false,
    fork: false,
    installForm: 'unknown',
    ...overrides,
  }
}

describe('scoreRepo', () => {
  it('full-featured repo (high stars, docs, recent push, known form) scores >= 90', () => {
    const input = base({
      stars: 10000,
      description: 'A DSH plugin',
      license: 'MIT',
      hasReadme: true,
      pushedAt: daysAgo(90),
      archived: false,
      fork: false,
      installForm: 'bundle',
    })
    expect(scoreRepo(input, NOW)).toBeGreaterThanOrEqual(90)
  })

  it('empty repo (0 stars, no docs, archived, fork, unknown form) scores <= 20', () => {
    const input = base({
      pushedAt: daysAgo(2400), // abandoned years ago
      archived: true,
      fork: true,
    })
    expect(scoreRepo(input, NOW)).toBeLessThanOrEqual(20)
  })

  it('installForm !== unknown scores higher than unknown all else equal', () => {
    const common = {
      stars: 100,
      description: 'desc',
      license: null,
      hasReadme: false,
      pushedAt: daysAgo(30),
      archived: false,
      fork: false,
    }
    const known = scoreRepo(base({ ...common, installForm: 'repo' }), NOW)
    const unknown = scoreRepo(base({ ...common, installForm: 'unknown' }), NOW)
    expect(known).toBeGreaterThan(unknown)
  })

  it('pushedAt older than 365 days significantly reduces the score', () => {
    const fresh = base({ pushedAt: daysAgo(90) })
    const stale = base({ pushedAt: daysAgo(800) })
    expect(scoreRepo(fresh, NOW) - scoreRepo(stale, NOW)).toBeGreaterThanOrEqual(10)
  })

  it('returns an integer clamped to [0, 100]', () => {
    const huge = base({ stars: 1_000_000, hasReadme: true, installForm: 'client' })
    const score = scoreRepo(huge, NOW)
    expect(Number.isInteger(score)).toBe(true)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
    // 0-star, fully negative repo clamps at 0
    const dead = base({ archived: true, fork: true })
    expect(scoreRepo(dead, NOW)).toBeGreaterThanOrEqual(0)
  })
})
