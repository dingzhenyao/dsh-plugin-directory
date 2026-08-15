/**
 * Browser-safe types and pure helpers for the plugin-manager records. The
 * Node-only file I/O lives in `installed.ts`; this module is importable by the
 * browser client half.
 */

/** One managed plugin record. */
export interface InstalledEntry {
  /** Repository id, `owner/repo`. */
  id: string
  /** Display name (repo basename). */
  name: string
  /** Source repository spec, `github:owner/repo`. */
  source: string
  /** ISO install timestamp. */
  installedAt: string
  /** How the entry was added. */
  method: 'search' | 'manual'
}

/** Payload for adding a managed plugin. */
export interface AddEntryInput {
  id: string
  name: string
  source: string
  method: 'search' | 'manual'
}

/** `owner/repo` without a `github:` prefix. */
const REPO_ID_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

/** True when the value is a plausible `owner/repo` source. */
export function isSourceRepo(value: string): boolean {
  return REPO_ID_RE.test(value.replace(/^github:/, ''))
}

/** Normalize a source to `github:owner/repo`. */
export function normalizeSource(value: string): string {
  const trimmed = value.trim().replace(/^github:/, '')
  return `github:${trimmed}`
}

/** Derive `{ id, name }` from a user-entered `owner/repo` (or `github:owner/repo`). */
export function deriveFromSource(source: string): { id: string; name: string } | null {
  const trimmed = source.trim()
  if (!isSourceRepo(trimmed)) return null
  const id = normalizeSource(trimmed).slice('github:'.length)
  const name = id.slice(id.indexOf('/') + 1)
  return { id, name }
}

/** One row of the harness Loader inventory (the read-only `pluginInventory` Remote). */
export interface InventoryRow {
  /** Exact module specifier the Loader entry imports (e.g. `github:owner/repo` or a package name). */
  moduleName: string
  /** Effective Loader enablement, including disabled ancestor groups. */
  enabled: boolean
  /** Lifecycle phase of the entry's root Fiber, or null when it has none. */
  phase: 'pending' | 'loading' | 'active' | 'failed' | 'unloading' | null
}

/**
 * Real install state derived from the harness Loader inventory for one ledger
 * entry. `unknown` means the inventory itself was unavailable (the Remote call
 * failed); it is distinct from `not-installed` (inventory read, no match).
 */
export type RealInstallStatus =
  | { readonly kind: 'installed'; readonly enabled: boolean; readonly phase: InventoryRow['phase'] }
  | { readonly kind: 'not-installed' }
  | { readonly kind: 'unknown' }

/** Normalize a Loader module specifier to a comparable `owner/repo`-ish string. */
function normalizeModule(moduleName: string): string {
  return moduleName
    .replace(/^github:/, '')
    .replace(/[#&].*$/, '')
    .trim()
}

/**
 * Match ledger entries against the real Loader inventory. The id is
 * `owner/repo` and the source is `github:owner/repo`; a Loader `moduleName`
 * matches either exactly (after stripping `github:` / fragments) or, as a
 * fallback, by its final path segment (the repo/package basename) so an npm
 * install of the same package still lines up with the recorded git source.
 * Returns a Map keyed by ledger id.
 */
export function matchInventory(
  installed: readonly InstalledEntry[],
  inventory: readonly InventoryRow[] | null,
): Map<string, RealInstallStatus> {
  const result = new Map<string, RealInstallStatus>()
  for (const entry of installed) {
    result.set(entry.id, { kind: 'unknown' })
    if (inventory === null) continue
    result.set(entry.id, { kind: 'not-installed' })
    const id = entry.id
    const sourceId = normalizeSource(entry.source).slice('github:'.length)
    const exact = inventory.find(row => {
      const m = normalizeModule(row.moduleName)
      return m === id || m === sourceId
    })
    if (exact !== undefined) {
      result.set(entry.id, { kind: 'installed', enabled: exact.enabled, phase: exact.phase })
      continue
    }
    // Fallback: unique basename match (repo/package name) — an npm install of
    // the same project lines up with the recorded git source.
    const basenameMatches = inventory.filter(row =>
      normalizeModule(row.moduleName).split('/').at(-1) === entry.name)
    if (basenameMatches.length === 1) {
      const row = basenameMatches[0]!
      result.set(entry.id, { kind: 'installed', enabled: row.enabled, phase: row.phase })
    }
  }
  return result
}
