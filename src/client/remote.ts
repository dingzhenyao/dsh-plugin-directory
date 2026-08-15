/**
 * Hand-written Typert Remote contribution for the plugin-manager service,
 * mounted by the browser half to expose `ctx.remote.pluginManager.*`.
 *
 * This mirrors the shape emitted by `@deepseek-ai/dsh-typert-generator` for a
 * host `TypertRemoteService` with direct `@Remote` methods, using `strict`
 * zod codecs (the client gateway rejects `src-json`). The host gateway's SRC
 * fallback derives the matching descriptor at runtime, so only this client
 * face needs the explicit schemas.
 */

import { z } from 'zod'
import type {
  RemoteResult,
  TypertRemoteContribution,
} from '@deepseek-ai/dsh-typert-protocol'
import type { AddEntryInput, InstalledEntry } from '../data/installed-types.ts'

const PACKAGE = 'dsh-plugin-directory'
const SERVICE = 'pluginManager'

/** Wire schema for one managed plugin record. */
const InstalledEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  installedAt: z.string(),
  method: z.union([z.literal('search'), z.literal('manual')]),
})

/** Wire schema for the add payload. */
const AddEntryInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  method: z.union([z.literal('search'), z.literal('manual')]),
})

/** The list returned by every mutating method (keeps the browser in sync). */
const EntriesResultSchema = z.array(InstalledEntrySchema)

/** A strict codec wrapping one zod schema. */
function strict(schema: z.ZodType<unknown>): { mode: 'strict'; typeSymbol: string; schema: z.ZodType<unknown> } {
  return { mode: 'strict', typeSymbol: `${PACKAGE}/types#value`, schema }
}

/** A direct-JSON parameter descriptor. */
function jsonParam(name: string, schema: z.ZodType<unknown>) {
  return { name, wire: name, source: 'json' as const, codec: strict(schema) }
}

function descriptor(method: string, parameters: ReturnType<typeof jsonParam>[]) {
  return {
    id: `${PACKAGE}#${SERVICE}/${method}`,
    service: SERVICE,
    namespace: SERVICE,
    method,
    invocation: { kind: 'direct' as const },
    parameters,
    result: strict(EntriesResultSchema),
    sourceLocation: { file: 'src/index.ts', line: 1, column: 1 },
  }
}

/** The Remote contribution the client mounts onto `ctx.remote`. */
export const TYPERT_REMOTE: TypertRemoteContribution = {
  package: PACKAGE,
  descriptors: [
    descriptor('list', []),
    descriptor('add', [jsonParam('input', AddEntryInputSchema)]),
    descriptor('delete', [jsonParam('id', z.string())]),
    descriptor('update', [jsonParam('id', z.string())]),
  ],
}

export default TYPERT_REMOTE

/** Typed namespace surface surfaced through `ctx.remote.pluginManager`. */
export interface PluginManagerNamespace {
  list: () => Promise<RemoteResult<InstalledEntry[]>>
  add: (input: AddEntryInput) => Promise<RemoteResult<InstalledEntry[]>>
  delete: (id: string) => Promise<RemoteResult<InstalledEntry[]>>
  update: (id: string) => Promise<RemoteResult<InstalledEntry[]>>
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface TypertRemoteNamespaceMap {
    pluginManager: PluginManagerNamespace
  }
}
