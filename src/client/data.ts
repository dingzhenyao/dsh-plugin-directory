/**
 * Directory snapshot loading: a build-time snapshot is bundled for instant,
 * offline-capable first paint, and a CDN fetch can refresh it at runtime.
 */

import type { MetaFile, PluginEntry } from '../data/types.ts'
import rawPlugins from '../../data/plugins.json'
import rawMeta from '../../data/meta.json'

/** A complete directory snapshot: the entries plus the precomputed statistics. */
export interface Snapshot {
  plugins: PluginEntry[]
  meta: MetaFile
}

/** Bundled snapshot (the `sync` pipeline is the producer; asserted to the model contract). */
export const FALLBACK: Snapshot = {
  plugins: rawPlugins as unknown as PluginEntry[],
  meta: rawMeta as unknown as MetaFile,
}

/**
 * CDN base for the jsDelivr-hosted snapshot. `data/plugins.json` and
 * `data/meta.json` live beside each other under this path. The owner is the
 * plugin author's GitHub account (a single fixed value shared by all
 * installers), baked in at build time.
 */
export const CDN_BASE = 'https://cdn.jsdelivr.net/gh/dingzhenyao/dsh-plugin-directory@main/data'

/** Thrown when a CDN snapshot was fetched but fails the shape check. */
const MALFORMED = 'remote snapshot is malformed'

/**
 * Fetch the latest snapshot from a CDN base (plugins.json + meta.json). Returns
 * `null` on any failure (network, non-2xx, malformed body) so callers can fall
 * back to the bundled snapshot silently.
 */
export async function fetchRemote(base: string): Promise<Snapshot | null> {
  try {
    const [pluginsRes, metaRes] = await Promise.all([
      fetch(`${base}/plugins.json`),
      fetch(`${base}/meta.json`),
    ])
    if (!pluginsRes.ok || !metaRes.ok) return null
    const plugins: unknown = await pluginsRes.json()
    const meta: unknown = await metaRes.json()
    if (!Array.isArray(plugins) || meta === null || typeof meta !== 'object') {
      throw new Error(MALFORMED)
    }
    return { plugins: plugins as PluginEntry[], meta: meta as MetaFile }
  } catch {
    return null
  }
}
