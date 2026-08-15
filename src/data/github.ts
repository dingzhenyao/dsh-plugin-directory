import type { PackageManifest } from './inspect.ts'

/**
 * A single GitHub repository as consumed by the sync pipeline. Field names
 * follow the GitHub REST API (snake_case); `owner` is the normalized login
 * (from `owner.login` in the search payload).
 */
export interface RawRepo {
  full_name: string
  name: string
  owner: string
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
  default_branch: string
}

/**
 * Testable seam for all GitHub HTTP access. The sync pipeline (`runSync`)
 * only ever talks to GitHub through this interface, so tests can substitute a
 * fixture-backed mock and never touch the network.
 */
export interface GithubClient {
  fetchCandidates(token?: string): Promise<RawRepo[]>
  fetchPackageJson(id: string, ref?: string): Promise<PackageManifest | null>
  fetchReadme(id: string, ref?: string): Promise<string | null>
  hasDsPluginDir(id: string, ref?: string): Promise<boolean>
}

const API_BASE = 'https://api.github.com'
const SEARCH_PAGE_SIZE = 100
const MAX_PAGES_PER_QUERY = 3

/**
 * Stage-one candidate queries. Results are unioned and deduplicated by
 * `full_name`.
 *
 * The primary signal is the official `dsh-plugin` topic: a repo tagged with it
 * is a plugin by declaration, regardless of its name, description, or README
 * wording. Two looser fallback queries catch repos that do DSH compatibility
 * without the topic — one that documents a real `dsh plugin add` command in its
 * README, and one whose name or description mentions `dsh-plugin`. A repo whose
 * name merely contains "dsh" (but has no other signal) is deliberately NOT
 * included: name substring is too weak to imply plugin-ness.
 */
const CANDIDATE_QUERIES = [
  'topic:dsh-plugin',
  '"dsh plugin add" in:readme',
  'dsh-plugin in:name,description',
] as const

/** Minimal shapes of the GitHub REST payloads we read. */
interface SearchRepoItem {
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
  default_branch: string
}

interface SearchResponse {
  items?: SearchRepoItem[]
}

interface ContentsResponse {
  content?: string
  encoding?: string
}

/**
 * Real `GithubClient` backed by the Node 24 global `fetch`. Search results
 * are paginated (`per_page=100`, at most 10 pages ≈ 1000 repos) and
 * deduplicated by `full_name`; the `owner` field is normalized to
 * `owner.login`. Every request carries `X-GitHub-Api-Version: 2022-11-28` and,
 * when a token is supplied, `Authorization: Bearer <token>`.
 */
export function createGithubClient(): GithubClient {
  async function request(path: string, token?: string): Promise<Response> {
    const headers: Record<string, string> = { 'X-GitHub-Api-Version': '2022-11-28' }
    if (token) headers.Authorization = `Bearer ${token}`
    return fetch(`${API_BASE}${path}`, { headers })
  }

  /** Decodes the base64 `content` of a contents/readme response; null on error. */
  async function decodeContent(res: Response): Promise<string | null> {
    if (!res.ok) return null
    try {
      const body = (await res.json()) as ContentsResponse
      if (typeof body.content !== 'string' || body.encoding !== 'base64') return null
      return Buffer.from(body.content, 'base64').toString('utf8')
    } catch {
      return null
    }
  }

  return {
    async fetchCandidates(token) {
      const seen = new Set<string>()
      const repos: RawRepo[] = []
      for (const query of CANDIDATE_QUERIES) {
        for (let page = 1; page <= MAX_PAGES_PER_QUERY; page++) {
          const res = await request(
            `/search/repositories?q=${encodeURIComponent(query)}&per_page=${SEARCH_PAGE_SIZE}&page=${page}`,
            token,
          )
          if (!res.ok) {
            // The first page of the first query must fail loud: a 401 (bad
            // token) or 403 (rate limit) would otherwise silently produce an
            // empty catalog. Later non-OK responses stop that query (partial).
            if (page === 1) throw new Error(`GitHub search failed: ${res.status}`)
            break
          }
          const body = (await res.json()) as SearchResponse
          const items = body.items ?? []
          for (const item of items) {
            if (seen.has(item.full_name)) continue
            seen.add(item.full_name)
            repos.push({
              full_name: item.full_name,
              name: item.name,
              owner: item.owner?.login ?? '',
              html_url: item.html_url,
              description: item.description,
              homepage: item.homepage,
              topics: item.topics,
              language: item.language,
              license: item.license,
              stargazers_count: item.stargazers_count,
              forks_count: item.forks_count,
              created_at: item.created_at,
              pushed_at: item.pushed_at,
              archived: item.archived,
              fork: item.fork,
              default_branch: item.default_branch,
            })
          }
          // A short page means the last page was reached; stop early.
          if (items.length < SEARCH_PAGE_SIZE) break
        }
      }
      return repos
    },

    async fetchPackageJson(id, ref) {
      const qs = ref ? `?ref=${encodeURIComponent(ref)}` : ''
      const text = await decodeContent(await request(`/repos/${id}/contents/package.json${qs}`))
      if (text === null) return null
      try {
        return JSON.parse(text) as PackageManifest
      } catch {
        return null
      }
    },

    async fetchReadme(id, ref) {
      const qs = ref ? `?ref=${encodeURIComponent(ref)}` : ''
      return decodeContent(await request(`/repos/${id}/readme${qs}`))
    },

    async hasDsPluginDir(id, ref) {
      const qs = ref ? `?ref=${encodeURIComponent(ref)}` : ''
      const res = await request(`/repos/${id}/contents/.dsh-plugin${qs}`)
      return res.ok
    },
  }
}
