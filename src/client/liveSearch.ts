/** Browser-side live GitHub search: latest `dsh-plugin` repos matching a query. */

import { searchItemToEntry, type SearchItem } from '../data/map.ts'
import type { PluginEntry } from '../data/types.ts'

const API_BASE = 'https://api.github.com/search/repositories'
const PER_PAGE = 20

/**
 * Query GitHub's search API for the given query scoped to the `dsh-plugin`
 * topic, mapped to directory entries. Throws on a non-2xx response (rate
 * limit, network) so the caller can degrade to local results.
 *
 * Live results have no README inspection, so their install form is `unknown`
 * and source `derived` — they never surface an install button (see `PluginCard`).
 */
export async function searchLive(query: string): Promise<PluginEntry[]> {
  // Require the README to document a `dsh plugin add` install command (via the
  // `in:readme` qualifier) so high-star "finished software" that merely tags
  // the `dsh-plugin` topic is excluded — only actual plugins surface.
  const q = `${query.trim()} "dsh plugin add" in:readme topic:dsh-plugin`
  const res = await fetch(
    `${API_BASE}?q=${encodeURIComponent(q)}&per_page=${PER_PAGE}&sort=stars&order=desc`,
    { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } },
  )
  if (!res.ok) throw new Error(`GitHub search failed: ${res.status}`)
  const body = (await res.json()) as { items?: SearchItem[] }
  const items = body.items ?? []
  return items
    .filter(item => item.pushed_at !== null)
    .map(item => searchItemToEntry(item))
}
