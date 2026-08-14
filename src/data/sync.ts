import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, resolve } from 'node:path'
import { classifyRepo } from './classify.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL, starBucket } from './constants.ts'
import { createGithubClient } from './github.ts'
import type { GithubClient, RawRepo } from './github.ts'
import { installFromPackageJson, installFromReadme, normalizeForm } from './inspect.ts'
import { scoreRepo } from './score.ts'
import type {
  FunctionCategory,
  InstallForm,
  InstallInfo,
  MetaFile,
  PluginEntry,
} from './types.ts'

export interface SyncOptions {
  /** GitHub token; forwarded to `GithubClient` calls that accept one. */
  token?: string
  /**
   * How many of the top-scoring repos get deep inspection (package.json +
   * README + `.dsh-plugin` probe). Default 200; `<= 0` skips deep inspection
   * entirely, leaving every `install.form` as `'unknown'`.
   */
  inspectLimit?: number
  /** Directory for `plugins.json` / `meta.json` / `.inspect-cache.json`. Default `'data'`. */
  outDir?: string
  /** Category overrides keyed by repo id (owner/repo), merged over keyword classification. */
  overrides?: Record<string, FunctionCategory>
}

const DEFAULT_INSPECT_LIMIT = 200
const DEFAULT_OUT_DIR = 'data'

/** Per-repo cache entry persisted in `<outDir>/.inspect-cache.json`. */
interface CacheEntry {
  pushedAt: string
  install: InstallInfo
  hasReadme: boolean
}

type InspectCache = Record<string, CacheEntry>

/** One repo through the pipeline: raw payload, mapped entry, inspection state. */
interface WorkItem {
  repo: RawRepo
  entry: PluginEntry
  hasReadme: boolean
}

function dedupeByFullName(repos: RawRepo[]): RawRepo[] {
  const seen = new Set<string>()
  const out: RawRepo[] = []
  for (const repo of repos) {
    if (seen.has(repo.full_name)) continue
    seen.add(repo.full_name)
    out.push(repo)
  }
  return out
}

/**
 * Aggressive curation signal: a repo is kept only when its name, description,
 * or topics mention DSH / DeepSeek Harness. The `dsh-plugin` topic is noisy
 * (many tagged repos are not plugins), so this drops unrelated repos rather
 * than merely scoring them lower.
 */
const DSH_SIGNAL = /\bdsh\b|deepseek[\s-]?harness|deepseek[\s-]?plugin/i

/** A repo that survives curation: pushed (not empty) and DSH-signalled. */
type CuratedRepo = RawRepo & { pushed_at: string }

function isCuratedRepo(repo: RawRepo): repo is CuratedRepo {
  // Empty repositories have no commits and report `pushed_at: null`.
  if (repo.pushed_at === null) return false
  const text = [repo.name, repo.description ?? '', ...repo.topics].join(' ').toLowerCase()
  return DSH_SIGNAL.test(text)
}

/** Preliminary score used to rank inspection targets before deep inspection. */
function prelimScore(entry: PluginEntry, now: Date): number {
  return scoreRepo(
    {
      stars: entry.stars,
      description: entry.description,
      license: entry.license,
      hasReadme: false,
      pushedAt: entry.pushedAt,
      archived: entry.archived,
      fork: entry.fork,
      installForm: 'unknown',
    },
    now,
  )
}

async function loadCache(path: string): Promise<InspectCache> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'))
    if (parsed && typeof parsed === 'object') return parsed as InspectCache
  } catch {
    // Missing or corrupt cache: start fresh.
  }
  return {}
}

async function writeCache(path: string, cache: InspectCache): Promise<void> {
  await writeFile(path, `${JSON.stringify(cache, null, 2)}\n`, 'utf8')
}

function buildMeta(entries: PluginEntry[], syncedAt: string): MetaFile {
  const byCategory = {} as Record<FunctionCategory, number>
  for (const category of Object.keys(CATEGORY_LABEL) as FunctionCategory[]) {
    byCategory[category] = 0
  }
  const byInstallForm = {} as Record<InstallForm, number>
  for (const form of Object.keys(INSTALL_FORM_LABEL) as InstallForm[]) {
    byInstallForm[form] = 0
  }
  const byLanguage: Record<string, number> = {}
  const byStarBucket: Record<string, number> = {}

  for (const entry of entries) {
    byCategory[entry.category] += 1
    byInstallForm[entry.install.form] += 1
    const language = entry.language ?? 'other'
    byLanguage[language] = (byLanguage[language] ?? 0) + 1
    const bucket = starBucket(entry.stars)
    byStarBucket[bucket] = (byStarBucket[bucket] ?? 0) + 1
  }

  return { syncedAt, total: entries.length, byCategory, byInstallForm, byLanguage, byStarBucket }
}

/**
 * Run one sync pass: fetch the `dsh-plugin` topic repos, map them to
 * `PluginEntry`, deep-inspect the top `inspectLimit` by score, score every
 * entry, then write `plugins.json` (score desc) and `meta.json` into `outDir`.
 *
 * Network access happens exclusively through `client`, so the pipeline is
 * fully testable with a fixture-backed mock.
 */
export async function runSync(client: GithubClient, opts: SyncOptions): Promise<void> {
  const token = opts.token
  const inspectLimit = opts.inspectLimit ?? DEFAULT_INSPECT_LIMIT
  const outDir = opts.outDir ?? DEFAULT_OUT_DIR
  const overrides = opts.overrides ?? {}
  const now = new Date()

  const repos = dedupeByFullName(await client.fetchTopicRepos(token)).filter(isCuratedRepo)

  // Phase 1: map every raw repo to a PluginEntry with a placeholder derived
  // install (form 'unknown', source 'derived') and no readme signal.
  const work: WorkItem[] = repos.map((repo) => ({
    repo,
    entry: {
      id: repo.full_name,
      name: repo.name,
      owner: repo.owner,
      htmlUrl: repo.html_url,
      description: repo.description,
      homepage: repo.homepage,
      topics: repo.topics,
      language: repo.language,
      license: repo.license?.spdx_id ?? null,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      createdAt: repo.created_at,
      pushedAt: repo.pushed_at,
      archived: repo.archived,
      fork: repo.fork,
      category: classifyRepo(
        { id: repo.full_name, name: repo.name, description: repo.description, topics: repo.topics },
        overrides,
      ),
      install: installFromPackageJson({}, repo.full_name),
      score: 0,
    },
    hasReadme: false,
  }))

  // Phase 2: rank by preliminary score; only the top `inspectLimit` repos get
  // deep inspection (package.json + README + `.dsh-plugin` probe), cached per
  // repo and reused while `pushedAt` is unchanged.
  work.sort((a, b) => prelimScore(b.entry, now) - prelimScore(a.entry, now) || a.entry.id.localeCompare(b.entry.id))
  const inspectIds = new Set(inspectLimit > 0 ? work.slice(0, inspectLimit).map((w) => w.entry.id) : [])

  await mkdir(outDir, { recursive: true })
  const cachePath = join(outDir, '.inspect-cache.json')
  const cache = await loadCache(cachePath)

  for (const item of work) {
    if (!inspectIds.has(item.entry.id)) continue

    const cached = cache[item.entry.id]
    if (cached && cached.pushedAt === item.entry.pushedAt) {
      item.entry.install = cached.install
      item.hasReadme = cached.hasReadme
      continue
    }

    const ref = item.repo.default_branch
    const pkg = await client.fetchPackageJson(item.entry.id, ref)
    // Probe `.dsh-plugin` only when the manifest does not already decide the form.
    const needsDirProbe = !pkg?.dsh?.client && !pkg?.dsh?.bundle
    const hasDir = needsDirProbe ? await client.hasDsPluginDir(item.entry.id, ref) : false
    const form = normalizeForm(pkg ?? {}, hasDir)

    const readme = await client.fetchReadme(item.entry.id, ref)
    const hasReadme = readme !== null
    let install = installFromReadme(readme ?? '', item.entry.id, form)
    if (install.source !== 'readme' && (form === 'bundle' || form === 'client') && pkg?.name) {
      // README has no install command but package.json decides the form:
      // re-derive from package.json so the npm package name lands in the
      // command (installFromReadme's own no-command fallback would otherwise
      // keep the same bundle/client form but emit `github:<id>`).
      install = installFromPackageJson(pkg, item.entry.id)
    }
    // Otherwise keep the form-preserving fallback from installFromReadme:
    // for `repo` it derives `dsh plugin add github:<id>&path:/.dsh-plugin`,
    // and for `unknown` `dsh plugin add github:<id>`.

    item.entry.install = install
    item.hasReadme = hasReadme
    cache[item.entry.id] = { pushedAt: item.entry.pushedAt, install, hasReadme }
  }

  await writeCache(cachePath, cache)

  // Phase 3: final scores with the real install/readme signals, then output.
  for (const item of work) {
    item.entry.score = scoreRepo(
      {
        stars: item.entry.stars,
        description: item.entry.description,
        license: item.entry.license,
        hasReadme: item.hasReadme,
        pushedAt: item.entry.pushedAt,
        archived: item.entry.archived,
        fork: item.entry.fork,
        installForm: item.entry.install.form,
      },
      now,
    )
  }
  work.sort((a, b) => b.entry.score - a.entry.score || a.entry.id.localeCompare(b.entry.id))

  const entries = work.map((w) => w.entry)
  await writeFile(join(outDir, 'plugins.json'), `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
  const meta = buildMeta(entries, now.toISOString())
  await writeFile(join(outDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')
}

// ---------------------------------------------------------------------------
// CLI entry (`pnpm sync` → `tsx src/data/sync.ts`)
// ---------------------------------------------------------------------------

interface CliArgs {
  inspectLimit?: number
  outDir?: string
  overrides?: string
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {}
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--inspect-limit') {
      const raw = argv[i + 1]
      const value = Number(raw)
      if (raw !== undefined && Number.isFinite(value)) args.inspectLimit = value
      i++
    } else if (flag === '--out-dir') {
      const value = argv[i + 1]
      if (value !== undefined) args.outDir = value
      i++
    } else if (flag === '--overrides') {
      const value = argv[i + 1]
      if (value !== undefined) args.overrides = value
      i++
    }
  }
  return args
}

async function loadOverrides(path?: string): Promise<Record<string, FunctionCategory>> {
  const file = path ?? join('data', 'overrides.json')
  try {
    return JSON.parse(await readFile(file, 'utf8')) as Record<string, FunctionCategory>
  } catch {
    // Missing or unreadable overrides file: classify without overrides.
    return {}
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const outDir = args.outDir ?? DEFAULT_OUT_DIR
  const opts: SyncOptions = { outDir, overrides: await loadOverrides(args.overrides) }
  const token = process.env.GITHUB_TOKEN
  if (token !== undefined) opts.token = token
  if (args.inspectLimit !== undefined) opts.inspectLimit = args.inspectLimit
  await runSync(createGithubClient(), opts)
  console.log(`Synced dsh-plugin repos -> ${resolve(outDir)}`)
}

const isMain = process.argv[1] !== undefined && fileURLToPath(import.meta.url).toLowerCase() === resolve(process.argv[1]).toLowerCase()
if (isMain) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
