import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GithubClient, RawRepo } from '../../src/data/github.ts'
import type { PackageManifest } from '../../src/data/inspect.ts'
import { runSync } from '../../src/data/sync.ts'
import type { InstallInfo, MetaFile, PluginEntry } from '../../src/data/types.ts'

const CATEGORIES = [
  'tool', 'skill', 'memory', 'vision', 'ui-skin', 'mcp',
  'orchestration', 'cli-tui', 'web', 'agent', 'other',
] as const
const INSTALL_FORMS = ['bundle', 'repo', 'client', 'unknown'] as const

interface Fixture {
  repos: RawRepo[]
  pkg: Record<string, PackageManifest | null>
  readme: Record<string, string | null>
  hasDir: Record<string, boolean>
}

function baseRepo(overrides: Partial<RawRepo> = {}): RawRepo {
  return {
    full_name: 'acme/demo',
    name: 'demo',
    owner: 'acme',
    html_url: 'https://github.com/acme/demo',
    description: null,
    homepage: null,
    topics: [],
    language: null,
    license: null,
    stargazers_count: 0,
    forks_count: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    pushed_at: '2024-01-01T00:00:00.000Z',
    archived: false,
    fork: false,
    default_branch: 'main',
    ...overrides,
  }
}

const REPO_A = baseRepo({
  full_name: 'acme/skill-kit',
  name: 'skill-kit',
  owner: 'acme',
  html_url: 'https://github.com/acme/skill-kit',
  description: 'A skill library for DSH agents',
  homepage: 'https://acme.dev/skill-kit',
  topics: ['skill', 'dsh-plugin'],
  language: 'TypeScript',
  license: { spdx_id: 'MIT' },
  stargazers_count: 500,
  forks_count: 30,
  created_at: '2025-01-10T00:00:00.000Z',
  pushed_at: '2026-02-01T00:00:00.000Z',
})

const REPO_B = baseRepo({
  full_name: 'bob/memory-base',
  name: 'memory-base',
  owner: 'bob',
  html_url: 'https://github.com/bob/memory-base',
  description: 'memory recall knowledge base for DSH agents',
  topics: ['memory'],
  language: null,
  license: null,
  stargazers_count: 5,
  forks_count: 1,
  created_at: '2022-06-01T00:00:00.000Z',
  pushed_at: '2023-01-01T00:00:00.000Z',
  default_branch: 'master',
})

const PKG_A: PackageManifest = {
  name: 'dsh-plugin-skill-kit',
  dsh: { bundle: { patch: './cordis.patch.yml' } },
}

const README_A = '# Skill Kit\n\nInstall:\n\ndsh plugin add dsh-plugin-skill-kit\n'
const README_B = 'Documentation only.\nNo install command here.\n'

function makeFixture(): Fixture {
  return {
    repos: [REPO_A, REPO_B],
    pkg: { 'acme/skill-kit': PKG_A, 'bob/memory-base': null },
    readme: { 'acme/skill-kit': README_A, 'bob/memory-base': README_B },
    hasDir: { 'acme/skill-kit': false, 'bob/memory-base': false },
  }
}

function makeClient(fixture: Fixture): GithubClient {
  return {
    fetchTopicRepos: vi.fn(async () => fixture.repos),
    fetchPackageJson: vi.fn(async (id: string) => fixture.pkg[id] ?? null),
    fetchReadme: vi.fn(async (id: string) => fixture.readme[id] ?? null),
    hasDsPluginDir: vi.fn(async (id: string) => fixture.hasDir[id] ?? false),
  }
}

const tempDirs: string[] = []

async function makeOutDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-sync-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function readJson<T>(dir: string, name: string): Promise<T> {
  return JSON.parse(await readFile(join(dir, name), 'utf8')) as T
}

describe('runSync', () => {
  it('writes plugins.json sorted by score desc with complete fields', async () => {
    const dir = await makeOutDir()
    await runSync(makeClient(makeFixture()), { outDir: dir })

    const plugins = await readJson<PluginEntry[]>(dir, 'plugins.json')
    expect(plugins.map((p) => p.id)).toEqual(['acme/skill-kit', 'bob/memory-base'])

    const scores = plugins.map((p) => p.score)
    expect(scores).toEqual([...scores].sort((a, b) => b - a))

    for (const p of plugins) {
      expect(p.id.length).toBeGreaterThan(0)
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.owner.length).toBeGreaterThan(0)
      expect(p.htmlUrl.startsWith('https://github.com/')).toBe(true)
      expect(p.topics).toBeInstanceOf(Array)
      expect(p.stars).toBeGreaterThanOrEqual(0)
      expect(p.forks).toBeGreaterThanOrEqual(0)
      expect(typeof p.createdAt).toBe('string')
      expect(typeof p.pushedAt).toBe('string')
      expect(typeof p.archived).toBe('boolean')
      expect(typeof p.fork).toBe('boolean')
      expect(CATEGORIES).toContain(p.category)
      expect(INSTALL_FORMS).toContain(p.install.form)
      expect(p.install.command).not.toBeNull()
      expect(['readme', 'package-json', 'derived']).toContain(p.install.source)
      expect(Number.isInteger(p.score)).toBe(true)
      expect(p.score).toBeGreaterThanOrEqual(0)
      expect(p.score).toBeLessThanOrEqual(100)
    }

    const a = plugins[0]!
    expect(a.id).toBe('acme/skill-kit')
    expect(a.owner).toBe('acme')
    expect(a.htmlUrl).toBe('https://github.com/acme/skill-kit')
    expect(a.description).toBe('A skill library for DSH agents')
    expect(a.homepage).toBe('https://acme.dev/skill-kit')
    expect(a.topics).toEqual(['skill', 'dsh-plugin'])
    expect(a.language).toBe('TypeScript')
    expect(a.license).toBe('MIT')
    expect(a.stars).toBe(500)
    expect(a.forks).toBe(30)
    expect(a.createdAt).toBe('2025-01-10T00:00:00.000Z')
    expect(a.pushedAt).toBe('2026-02-01T00:00:00.000Z')
    expect(a.archived).toBe(false)
    expect(a.fork).toBe(false)
    expect(a.category).toBe('skill')
    expect(a.install).toEqual({
      form: 'bundle',
      command: 'dsh plugin add dsh-plugin-skill-kit',
      source: 'readme',
      snippet: 'dsh plugin add dsh-plugin-skill-kit',
    })
    expect(a.score).toBeGreaterThan(0)

    const b = plugins[1]!
    expect(b.id).toBe('bob/memory-base')
    expect(b.category).toBe('memory')
    expect(b.license).toBeNull()
    expect(b.language).toBeNull()
    expect(b.install.form).toBe('unknown')
    expect(b.install.source).toBe('derived')
    expect(b.score).toBeGreaterThanOrEqual(0)
  })

  it('writes meta.json with correct total and distributions', async () => {
    const dir = await makeOutDir()
    await runSync(makeClient(makeFixture()), { outDir: dir })

    const meta = await readJson<MetaFile>(dir, 'meta.json')
    expect(meta.total).toBe(2)
    expect(meta.syncedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(meta.byCategory).toEqual({
      tool: 0,
      skill: 1,
      memory: 1,
      vision: 0,
      'ui-skin': 0,
      mcp: 0,
      orchestration: 0,
      'cli-tui': 0,
      web: 0,
      agent: 0,
      other: 0,
    })
    expect(meta.byInstallForm).toEqual({ bundle: 1, repo: 0, client: 0, unknown: 1 })
    expect(meta.byLanguage).toEqual({ TypeScript: 1, other: 1 })
    expect(meta.byStarBucket).toEqual({ '0-9': 1, '200-999': 1 })
  })

  it('applies category overrides keyed by repo id', async () => {
    const dir = await makeOutDir()
    await runSync(makeClient(makeFixture()), {
      outDir: dir,
      overrides: { 'bob/memory-base': 'tool' },
    })

    const plugins = await readJson<PluginEntry[]>(dir, 'plugins.json')
    expect(plugins.find((p) => p.id === 'bob/memory-base')!.category).toBe('tool')
  })

  it('dedupes repos by full_name before mapping', async () => {
    const dir = await makeOutDir()
    const fixture = makeFixture()
    fixture.repos = [REPO_A, REPO_B, REPO_A]
    await runSync(makeClient(fixture), { outDir: dir })

    const plugins = await readJson<PluginEntry[]>(dir, 'plugins.json')
    expect(plugins).toHaveLength(2)
    const meta = await readJson<MetaFile>(dir, 'meta.json')
    expect(meta.total).toBe(2)
  })

  it('curates: drops empty repos and repos without a DSH signal', async () => {
    const dir = await makeOutDir()
    const empty = baseRepo({
      full_name: 'acme/empty',
      name: 'empty',
      description: 'dsh plugin stub',
      topics: ['dsh-plugin'],
      pushed_at: null,
    })
    const noisy = baseRepo({
      full_name: 'acme/not-a-plugin',
      name: 'something-else',
      description: 'unrelated image uploader',
      topics: ['images'],
    })
    const kept = baseRepo({
      full_name: 'acme/dsh-tool',
      name: 'dsh-tool',
      description: 'a dsh tool',
      topics: ['dsh-plugin'],
    })
    const fixture = makeFixture()
    fixture.repos = [empty, noisy, kept]
    fixture.pkg = {}
    fixture.readme = {}
    fixture.hasDir = {}
    await runSync(makeClient(fixture), { outDir: dir, inspectLimit: 0 })

    const plugins = await readJson<PluginEntry[]>(dir, 'plugins.json')
    expect(plugins.map((p) => p.id)).toEqual(['acme/dsh-tool'])
  })

  it('skips deep inspection when inspectLimit <= 0: unknown/derived installs, no inspect calls', async () => {
    const dir = await makeOutDir()
    const client = makeClient(makeFixture())
    await runSync(client, { outDir: dir, inspectLimit: 0 })

    const plugins = await readJson<PluginEntry[]>(dir, 'plugins.json')
    for (const p of plugins) {
      expect(p.install.form).toBe('unknown')
      expect(p.install.source).toBe('derived')
    }
    expect(client.fetchPackageJson).not.toHaveBeenCalled()
    expect(client.fetchReadme).not.toHaveBeenCalled()
    expect(client.hasDsPluginDir).not.toHaveBeenCalled()
  })

  it('preserves repo install form when the only signal is a .dsh-plugin dir', async () => {
    const dir = await makeOutDir()
    const fixture = makeFixture()
    const repo = baseRepo({
      full_name: 'carol/repo-plugin',
      name: 'repo-plugin',
      owner: 'carol',
      html_url: 'https://github.com/carol/repo-plugin',
      description: 'A plugin delivered as a repo directory',
      topics: ['dsh-plugin'],
      language: 'Shell',
      pushed_at: '2025-05-01T00:00:00.000Z',
    })
    fixture.repos = [repo]
    // No `dsh` keys in package.json, README has no `dsh plugin add` command:
    // the `.dsh-plugin` dir is the only install signal.
    fixture.pkg = { 'carol/repo-plugin': { name: 'repo-plugin' } }
    fixture.readme = { 'carol/repo-plugin': 'Docs only.\nNo install command here.\n' }
    fixture.hasDir = { 'carol/repo-plugin': true }
    await runSync(makeClient(fixture), { outDir: dir })

    const plugins = await readJson<PluginEntry[]>(dir, 'plugins.json')
    expect(plugins).toHaveLength(1)
    const p = plugins[0]!
    expect(p.install.form).toBe('repo')
    expect(p.install.command).toContain('&path:/.dsh-plugin')
    expect(p.install.command).toBe('dsh plugin add github:carol/repo-plugin&path:/.dsh-plugin')
  })

  it('reuses the cache on a second run with unchanged pushedAt (no re-fetch)', async () => {
    const dir = await makeOutDir()
    const first = makeClient(makeFixture())
    await runSync(first, { outDir: dir })
    expect(first.fetchPackageJson).toHaveBeenCalledTimes(2)
    // Only repo B (no dsh keys in package.json) needs the .dsh-plugin probe.
    expect(first.hasDsPluginDir).toHaveBeenCalledTimes(1)

    const cache = await readJson<
      Record<string, { pushedAt: string; hasReadme: boolean; install: InstallInfo }>
    >(dir, '.inspect-cache.json')
    expect(cache['acme/skill-kit']?.pushedAt).toBe(REPO_A.pushed_at)
    expect(cache['acme/skill-kit']?.hasReadme).toBe(true)
    expect(cache['acme/skill-kit']?.install.form).toBe('bundle')
    expect(cache['bob/memory-base']?.pushedAt).toBe(REPO_B.pushed_at)
    expect(cache['bob/memory-base']?.hasReadme).toBe(true)

    const second = makeClient(makeFixture())
    await runSync(second, { outDir: dir })
    expect(second.fetchPackageJson).not.toHaveBeenCalled()
    expect(second.fetchReadme).not.toHaveBeenCalled()
    expect(second.hasDsPluginDir).not.toHaveBeenCalled()

    // Output is still complete after cache reuse.
    const plugins = await readJson<PluginEntry[]>(dir, 'plugins.json')
    expect(plugins[0]!.install.source).toBe('readme')
    expect(plugins[0]!.install.form).toBe('bundle')
  })

  it('re-fetches inspection data when pushedAt changes', async () => {
    const dir = await makeOutDir()
    await runSync(makeClient(makeFixture()), { outDir: dir })

    const stale = makeFixture()
    stale.repos = stale.repos.map((r) =>
      r.full_name === REPO_A.full_name
        ? { ...r, pushed_at: '2026-03-01T00:00:00.000Z' }
        : { ...r, pushed_at: '2024-02-01T00:00:00.000Z' },
    )
    const third = makeClient(stale)
    await runSync(third, { outDir: dir })
    expect(third.fetchPackageJson).toHaveBeenCalledTimes(2)
    expect(third.fetchReadme).toHaveBeenCalledTimes(2)
  })
})
