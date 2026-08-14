/** DSH plugin directory: a browsable, searchable GitHub plugin catalog tab. */

import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { DirectoryTab } from './DirectoryTab.tsx'
import { en, zh, type DirectoryLocaleKey } from './locales.ts'

export type { DirectoryTabProps } from './DirectoryTab.tsx'
export type { DirectoryLocaleKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** DSH plugin directory copy. */
    directory: DirectoryLocaleKey
  }
}

/** Dictionary namespace owned by this plugin. */
export const NS = 'directory'

/** Services required by the Settings registration. */
export const inject = ['slots', 'locale']

/** Contribute the plugin directory tab to the Plugins settings section. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-plugin-directory: dictionaries')

  const t = ctx.locale.bind(NS)
  ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
    name: 'settings.plugins.tab',
    id: 'directory',
    order: 20,
    label: () => t('tab'),
    locale: NS,
  }, DirectoryTab))
}
