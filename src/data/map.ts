import { classifyRepo } from './classify.ts'
import { installFromPackageJson } from './inspect.ts'
import { scoreRepo } from './score.ts'
import type { PluginEntry } from './types.ts'

/**
 * One GitHub repository search result (snake_case, as the REST API returns it).
 * Used by the browser live-search path; the `pushed_at` may be `null` for an
 * empty repository (never pushed), which the caller filters out.
 */
export interface SearchItem {
  full_name: string
  name: string
  owner: { login: string } | null
  html_url: string
  description: string | null
  homepage: string | null
  topics: string[]
  language: string | null
  license: { spdx_id: string } | null
  stargazers_count: number
  forks_count: number
  created_at: string
  pushed_at: string | null
  archived: boolean
  fork: boolean
}

/**
 * Map one GitHub search result to a directory `PluginEntry` with a placeholder
 * install (form `unknown`, source `derived`) — live results have no README
 * inspection, so they never surface an install button (see the README-gating
 * rule in `PluginCard`). Classification and scoring reuse the pipeline's pure
 * functions so live and synced entries stay consistent.
 */
export function searchItemToEntry(item: SearchItem, now: Date = new Date()): PluginEntry {
  const id = item.full_name
  const description = item.description
  const install = installFromPackageJson({}, id)
  const entry: PluginEntry = {
    id,
    name: item.name,
    owner: item.owner?.login ?? '',
    htmlUrl: item.html_url,
    description,
    homepage: item.homepage,
    topics: item.topics,
    language: item.language,
    license: item.license?.spdx_id ?? null,
    stars: item.stargazers_count,
    forks: item.forks_count,
    createdAt: item.created_at,
    pushedAt: item.pushed_at ?? '',
    archived: item.archived,
    fork: item.fork,
    category: classifyRepo(
      { id, name: item.name, description, topics: item.topics },
      {},
    ),
    install,
    score: 0,
  }
  entry.score = scoreRepo(
    {
      stars: entry.stars,
      description: entry.description,
      license: entry.license,
      hasReadme: false,
      pushedAt: entry.pushedAt,
      archived: entry.archived,
      fork: entry.fork,
      installForm: entry.install.form,
    },
    now,
  )
  return entry
}
