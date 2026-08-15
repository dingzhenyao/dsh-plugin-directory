/**
 * Persistence for plugins the user has installed or bookmarked through this
 * directory. The data file lives at
 * `$DSH_HOME/storages/dsh-plugin-directory/installed.json` and records entries
 * added from search or manually (both must carry a source repository).
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { InstalledEntry } from './installed-types.ts'

export type { InstalledEntry } from './installed-types.ts'

/** The directory that holds the plugin's persisted data. */
export function storageDir(home: string = process.env.DSH_HOME ?? join(homedir(), '.dsh')): string {
  return join(home, 'storages', 'dsh-plugin-directory')
}

/** Absolute path of the installed-plugins data file. */
export function installedPath(home?: string): string {
  return join(storageDir(home), 'installed.json')
}

/** Read the installed entries; a missing/corrupt file reads as empty. */
export async function readInstalled(path = installedPath()): Promise<InstalledEntry[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(path, 'utf8'))
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isInstalledEntry)
  } catch {
    return []
  }
}

/** Write the installed entries, creating the directory on first use. */
export async function writeInstalled(entries: InstalledEntry[], path = installedPath()): Promise<void> {
  await mkdir(join(path, '..'), { recursive: true })
  await writeFile(path, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')
}

/** Type guard for a persisted record. */
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
