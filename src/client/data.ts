/** Build-time snapshot of the plugin directory, bundled into the client half. */

import type { MetaFile, PluginEntry } from '../data/types.ts'
import rawPlugins from '../../data/plugins.json'
import rawMeta from '../../data/meta.json'

/** Bundled plugin entries (the `sync` pipeline is the producer; asserted to the model contract). */
export const plugins: PluginEntry[] = rawPlugins as unknown as PluginEntry[]

/** Bundled directory statistics, ready for the dashboard without recomputation. */
export const meta: MetaFile = rawMeta as unknown as MetaFile
