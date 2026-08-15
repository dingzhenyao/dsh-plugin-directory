/**
 * Browser-side persistence for the "My plugins" panel (Path B: localStorage).
 * Records are kept in the browser instead of a host data file, so no
 * host↔client RPC is required. The pure validation lives in
 * `src/data/installed-types.ts`.
 */

import {
  isSourceRepo,
  normalizeSource,
  type AddEntryInput,
  type InstalledEntry,
} from '../data/installed-types.ts'

/** localStorage key for the managed-plugins list. */
export const STORAGE_KEY = 'dsh-plugin-directory:installed'

/** Narrow a parsed value to a persisted record. */
function isInstalledEntry(value: unknown): value is InstalledEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return (
    typeof entry.id === 'string'
    && typeof entry.name === 'string'
    && typeof entry.source === 'string'
    && typeof entry.installedAt === 'string'
    && (entry.method === 'search' || entry.method === 'manual')
  )
}

/** Read the managed plugins; a missing/corrupt store reads as empty. */
export function readInstalled(): InstalledEntry[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isInstalledEntry) : []
  } catch {
    return []
  }
}

/** Persist the managed plugins. */
export function persistInstalled(entries: InstalledEntry[]): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

/** Add (or re-add/update) one managed plugin; returns the resulting list. */
export function addInstalled(input: AddEntryInput): InstalledEntry[] {
  const source = normalizeSource(input.source)
  if (!isSourceRepo(source)) throw new Error('a source repository (owner/repo) is required')
  const entry: InstalledEntry = {
    id: input.id,
    name: input.name,
    source,
    installedAt: new Date().toISOString(),
    method: input.method,
  }
  const entries = readInstalled()
  const index = entries.findIndex(existing => existing.id === entry.id)
  const next = index === -1
    ? [...entries, entry]
    : entries.map((existing, at) => (at === index ? entry : existing))
  persistInstalled(next)
  return next
}

/** Remove one managed plugin by id; returns the resulting list. */
export function removeInstalled(id: string): InstalledEntry[] {
  const next = readInstalled().filter(entry => entry.id !== id)
  persistInstalled(next)
  return next
}

/** Refresh one managed plugin's timestamp (mark it reinstalled/updated). */
export function updateInstalled(id: string): InstalledEntry[] {
  const entries = readInstalled()
  const index = entries.findIndex(entry => entry.id === id)
  if (index === -1) return entries
  const next = [...entries]
  next[index] = { ...next[index]!, installedAt: new Date().toISOString() }
  persistInstalled(next)
  return next
}

/** Derive `{ id, name }` from a user-entered `owner/repo` (or `github:owner/repo`). */
export function deriveFromSource(source: string): { id: string; name: string } | null {
  const trimmed = source.trim()
  if (!isSourceRepo(trimmed)) return null
  const id = normalizeSource(trimmed).slice('github:'.length)
  const name = id.slice(id.indexOf('/') + 1)
  return { id, name }
}
