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
