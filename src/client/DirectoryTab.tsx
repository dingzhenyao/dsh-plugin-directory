import { useEffect, useState, type ReactNode } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { MetaFile, PluginEntry } from '../data/types.ts'
import css from './DirectoryTab.module.css'
import { StatsDashboard } from './StatsDashboard.tsx'
import { FilterBar } from './FilterBar.tsx'
import { PluginCard } from './PluginCard.tsx'
import { filterAndSort, type FilterState } from './filter.ts'

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
  const [filter, setFilter] = useState<FilterState>(() => ({
    query: '',
    categories: new Set(),
    installForms: new Set(),
    groupBy: 'category',
    sort: 'score',
  }))

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

  // Filtered grouping of the injected snapshot for the current controls; the
  // Array.isArray guard keeps a malformed payload from crashing this seat
  // before the effect lands on the error state.
  const { groups, visible } = filterAndSort(Array.isArray(plugins) ? plugins : [], filter, lang)

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
              <FilterBar state={filter} lang={lang} t={t} onChange={setFilter} />
              <p className={css.status}>{t('visibleCount', { count: String(visible) })}</p>
              {groups.map(group => (
                <section key={group.key} className={css.group} data-group={group.key}>
                  <h3 className={css.groupTitle}>
                    <span data-group-label>{group.label}</span>
                    <span className={css.groupCount} data-group-count>{group.entries.length}</span>
                  </h3>
                  <div className={css.cardList}>
                    {group.entries.map(entry => (
                      <PluginCard key={entry.id} entry={entry} lang={lang} t={t} />
                    ))}
                  </div>
                </section>
              ))}
              <StatsDashboard meta={meta} lang={lang} t={t} />
            </>
          )
      ) : null}
    </div>
  )
}
