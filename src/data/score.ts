import type { InstallForm } from './types.ts'

export interface ScoreInput {
  stars: number
  description: string | null
  license: string | null
  hasReadme: boolean
  pushedAt: string
  archived: boolean
  fork: boolean
  installForm: InstallForm
}

/**
 * Heuristic quality score in [0, 100]. Pure function of the input plus an
 * optional reference clock: same inputs, same `now` → same score.
 *
 * Weights (max contribution):
 *  - stars         40  (log10-normalized, saturating at 10_000 stars)
 *  - description   10
 *  - license       10
 *  - readme        10
 *  - not archived  10
 *  - not a fork     5
 *  - known install 10
 *  - recency       20  (linear decay to zero 365 days after last push)
 * Total max 115 → clamped to 100 and rounded to an integer.
 */

const STAR_FULL_LOG10 = 4 // log10(10_000): star term saturates here
const STAR_WEIGHT = 40
const DESCRIPTION_WEIGHT = 10
const LICENSE_WEIGHT = 10
const README_WEIGHT = 10
const NOT_ARCHIVED_WEIGHT = 10
const NOT_FORK_WEIGHT = 5
const INSTALL_FORM_WEIGHT = 10
const PUSH_WEIGHT = 20
/** A push this many days ago (or older) contributes zero recency. */
const PUSH_FULL_DECAY_DAYS = 365

const MS_PER_DAY = 86_400_000

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function scoreRepo(input: ScoreInput, now: Date = new Date()): number {
  const stars = Math.max(0, input.stars)
  const starScore = STAR_WEIGHT * Math.min(Math.log10(stars + 1) / STAR_FULL_LOG10, 1)

  const pushedMs = Date.parse(input.pushedAt)
  const daysSincePush = Number.isFinite(pushedMs)
    ? Math.max(0, (now.getTime() - pushedMs) / MS_PER_DAY)
    : Infinity
  const freshness = PUSH_WEIGHT * clamp(1 - daysSincePush / PUSH_FULL_DECAY_DAYS, 0, 1)

  const raw =
    starScore +
    (input.description ? DESCRIPTION_WEIGHT : 0) +
    (input.license ? LICENSE_WEIGHT : 0) +
    (input.hasReadme ? README_WEIGHT : 0) +
    (input.archived ? 0 : NOT_ARCHIVED_WEIGHT) +
    (input.fork ? 0 : NOT_FORK_WEIGHT) +
    (input.installForm !== 'unknown' ? INSTALL_FORM_WEIGHT : 0) +
    freshness

  return Math.round(clamp(raw, 0, 100))
}
