import { useEffect, useState, type ReactNode } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { MetaFile, PluginEntry } from '../data/types.ts'
import css from './DirectoryTab.module.css'
import { StatsDashboard } from './StatsDashboard.tsx'

/** Registration-side inject face: the bundled bilingual snapshot. */
export interface DirectoryTabInjected {
  /** Active UI language; drives category / install-form label lookups. */
  lang: 'zh' | 'en'
  /** Bundled plugin entries. */
  plugins: PluginEntry[]
  /** Bundled directory statistics. */
  meta: MetaFile
}

/** Full component props assembled by the Settings slot renderer. */
export type DirectoryTabProps =
  PropsLocale<'directory'>
  & InjectFace<DirectoryTabInjected>

type ViewState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly count: number }

/** Render the plugin directory tab with loading / empty / error seats. */
export function DirectoryTab({ t, lang, plugins, meta }: DirectoryTabProps): ReactNode {
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [request, setRequest] = useState(0)

  useEffect(() => {
    let current = true
    // The snapshot arrives synchronously through the inject face; the
    // microtask keeps the loading seat renderable and mirrors the async
    // remote-loading pattern. A malformed injected payload (corrupt bundle
    // data) rejects and lands on the error seat instead of crashing.
    void Promise.resolve().then(() => {
      if (!current) return
      if (!Array.isArray(plugins) || meta === null || typeof meta !== 'object') {
        throw new TypeError('directory snapshot is malformed')
      }
      setState({ status: 'ready', count: plugins.length })
    }).catch(() => {
      if (current) setState({ status: 'error' })
    })
    return () => { current = false }
  }, [plugins, meta, request])

  const retry = (): void => {
    setState({ status: 'loading' })
    setRequest(value => value + 1)
  }

  return (
    <div className={css.root} data-directory lang={lang} aria-busy={state.status === 'loading'}>
      {state.status === 'loading' ? <p className={css.status}>{t('loading')}</p> : null}
      {state.status === 'error' ? (
        <div className={css.failure}>
          <p role="alert">{t('error')}</p>
          <button type="button" onClick={retry}>{t('retry')}</button>
        </div>
      ) : null}
      {state.status === 'ready' ? (
        state.count === 0
          ? <p className={css.status}>{t('empty')}</p>
          : (
            <>
              <p className={css.status}>{t('repoCount', { count: String(state.count) })}</p>
              <StatsDashboard meta={meta} lang={lang} t={t} />
            </>
          )
      ) : null}
    </div>
  )
}
