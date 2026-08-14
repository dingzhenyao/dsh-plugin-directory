import type { ReactNode } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import css from './DirectoryTab.module.css'

/** Full component props assembled by the Settings slot renderer. */
export type DirectoryTabProps = PropsLocale<'directory'>

/** Render the plugin directory placeholder tab. */
export function DirectoryTab({ t }: DirectoryTabProps): ReactNode {
  return <div data-directory className={css.root}>{t('placeholder')}</div>
}
