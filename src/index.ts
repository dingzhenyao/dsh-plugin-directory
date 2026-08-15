/**
 * Host loader entry: a Typert Remote service exposing the installed-plugins
 * data file (`$DSH_HOME/storages/dsh-plugin-directory/installed.json`) to the
 * browser half. The `@Remote` methods are discovered by the host gateway's SRC
 * fallback (`resolveSrcDescriptor`) — no generated `./typert` manifest is
 * required — and are surfaced to the client as `ctx.remote.pluginManager.*`.
 */

import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import {
  isSourceRepo,
  normalizeSource,
  type AddEntryInput,
  type InstalledEntry,
} from './data/installed-types.ts'
import { readInstalled, writeInstalled } from './data/installed.ts'

/** Thrown when an add request omits a valid source repository. */
export class InvalidSourceError extends Error {
  constructor() {
    super('a source repository (owner/repo) is required')
    this.name = 'InvalidSourceError'
  }
}

/** Remote service managing the directory's installed-plugins data file. */
export class PluginManagerGateway extends TypertRemoteService {
  constructor(ctx: Context) {
    super(ctx, 'pluginManager')
  }

  /** List the currently managed plugins. */
  @Remote('list')
  async list(): Promise<InstalledEntry[]> {
    return readInstalled()
  }

  /** Add (or re-add/update) one managed plugin; requires a valid source repo. */
  @Remote('add')
  async add(input: AddEntryInput): Promise<InstalledEntry[]> {
    if (!isSourceRepo(input.source)) throw new InvalidSourceError()
    const entry: InstalledEntry = {
      id: input.id,
      name: input.name,
      source: normalizeSource(input.source),
      installedAt: new Date().toISOString(),
      method: input.method,
    }
    const entries = await readInstalled()
    const index = entries.findIndex(existing => existing.id === entry.id)
    const next = index === -1
      ? [...entries, entry]
      : entries.map((existing, at) => (at === index ? entry : existing))
    await writeInstalled(next)
    return next
  }

  /** Remove one managed plugin by id. */
  @Remote('remove')
  async remove(id: string): Promise<InstalledEntry[]> {
    const entries = await readInstalled()
    const next = entries.filter(entry => entry.id !== id)
    await writeInstalled(next)
    return next
  }

  /** Mark one managed plugin as just reinstalled/updated (refresh timestamp). */
  @Remote('update')
  async update(id: string): Promise<InstalledEntry[]> {
    const entries = await readInstalled()
    const index = entries.findIndex(entry => entry.id === id)
    if (index === -1) return entries
    const next = [...entries]
    next[index] = { ...next[index]!, installedAt: new Date().toISOString() }
    await writeInstalled(next)
    return next
  }
}

export default PluginManagerGateway
