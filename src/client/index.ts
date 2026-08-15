/** DSH plugin directory: a browsable, searchable GitHub plugin catalog tab. */

import type {} from '@deepseek-ai/dsh-api-remotes'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { AddEntryInput, InstalledEntry, InventoryRow } from '../data/installed-types.ts'
import { DirectoryTab, type DirectoryTabInjected } from './DirectoryTab.tsx'
import { FALLBACK } from './data.ts'
import { en, zh, type DirectoryLocaleKey } from './locales.ts'
import { injectStyles } from './styles.ts'
import { TYPERT_REMOTE } from './remote.ts'

export type { DirectoryTabInjected, DirectoryTabProps } from './DirectoryTab.tsx'
export type { DirectoryLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** DSH plugin directory copy. */
    directory: DirectoryLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'directory'

/** Services required by the Settings registration and the mounted Remotes. */
export const inject = ['slots', 'locale', 'remote', 'remote.pluginInventory']

/** Async plugin-manager accessor handed to the tab (typed, unmount-aware). */
export interface PluginManagerFace {
  list: () => Promise<InstalledEntry[]>
  add: (input: AddEntryInput) => Promise<InstalledEntry[]>
  delete: (id: string) => Promise<InstalledEntry[]>
  update: (id: string) => Promise<InstalledEntry[]>
  /** Read the harness's real Loader inventory (null when unavailable). */
  inventory: () => Promise<InventoryRow[] | null>
}

/** Unwrap a Remote result, throwing the carrier's error on the failure branch. */
function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: { code: string; message: string } }): T {
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
  return result.value
}

/** Contribute the plugin directory tab and the plugin-manager Remote. */
export async function apply(ctx: ClientContext): Promise<void> {
  ctx.effect(() => {
    injectStyles()
    return ctx.locale.register(NS, { zh, en })
  }, 'dsh-plugin-directory: styles + dictionaries')

  // Mount the host plugin-manager Remote before the tab is rendered, so its
  // injected face can call `ctx.remote.pluginManager.*` synchronously.
  await ctx.remote.$mount(TYPERT_REMOTE)

  const t = ctx.locale.bind(NS)
  const manager = (): PluginManagerFace => ({
    list: async () => unwrap(await ctx.remote.pluginManager.list()),
    add: async (input: AddEntryInput) => unwrap(await ctx.remote.pluginManager.add(input)),
    delete: async (id: string) => unwrap(await ctx.remote.pluginManager.delete(id)),
    update: async (id: string) => unwrap(await ctx.remote.pluginManager.update(id)),
    inventory: async () => {
      const result = await ctx.remote.pluginInventory.list()
      if (!result.ok) return null
      return result.value.entries.map(entry => ({
        moduleName: entry.moduleName,
        enabled: entry.enabled,
        phase: entry.fiberPhase,
      }))
    },
  })

  // The bundled snapshot is the offline fallback; the tab refreshes it from
  // the CDN at runtime. The face is re-read on every render so the active
  // locale, latest data, and manager accessor all stay current.
  const injected = (): DirectoryTabInjected => ({
    lang: ctx.locale.getLocale().active,
    plugins: FALLBACK.plugins,
    meta: FALLBACK.meta,
    pluginManager: manager(),
  })

  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'directory',
    order: 20,
    label: () => t('tab'),
    locale: NS,
    inject: injected,
  }, DirectoryTab))
}
