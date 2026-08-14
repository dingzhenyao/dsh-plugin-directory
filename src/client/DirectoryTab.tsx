import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { MetaFile, PluginEntry } from '../data/types.ts'
import css from './DirectoryTab.module.css'
import { StatsDashboard } from './StatsDashboard.tsx'
import { FilterBar } from './FilterBar.tsx'
import { PluginCard } from './PluginCard.tsx'
import { filterAndSort, type FilterControls } from './filter.ts'

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

/** Cards per page. */
const PAGE_SIZE = 10

/** Default curated scope: the top-N by the active sort when nothing filters. */
const TOP_N = 50

/** Debounce the search query by this many milliseconds. */
const QUERY_DEBOUNCE_MS = 180

/** Render the plugin directory tab with loading / empty / error seats. */
export function DirectoryTab({ t, lang, plugins, meta }: DirectoryTabProps): ReactNode {
  const [state, setState] = useState<ViewState>({ status: 'loading' })
  const [request, setRequest] = useState(0)

  // Search text is a separate controlled value so it can be debounced; the
  // chip / sort / group-by controls report changes immediately.
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [controls, setControls] = useState<FilterControls>({
    categories: new Set(),
    installForms: new Set(),
    groupBy: 'none',
    sort: 'stars',
  })
  const [page, setPage] = useState(0)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), QUERY_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

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

  // Reset to the first page whenever the effective filter changes.
  useEffect(() => { setPage(0) }, [debouncedQuery, controls])

  const retry = (): void => {
    setState({ status: 'loading' })
    setRequest(value => value + 1)
  }

  const list = Array.isArray(plugins) ? plugins : []

  // Filter/sort/group once per effective filter change (not per keystroke).
  const { groups, visible } = useMemo(
    () => filterAndSort(list, { ...controls, query: debouncedQuery }, lang),
    [list, controls, debouncedQuery, lang],
  )

  const flat = useMemo(() => groups.flatMap(group => group.entries), [groups])
  const isFiltering = debouncedQuery.trim() !== '' || controls.categories.size > 0 || controls.installForms.size > 0

  // Curated default: top 50 by stars unless the user filters or expands.
  const scoped = useMemo(() => (isFiltering || showAll ? flat : flat.slice(0, TOP_N)), [flat, isFiltering, showAll])
  const totalPages = Math.max(1, Math.ceil(scoped.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageEntries = useMemo(
    () => scoped.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE),
    [scoped, safePage],
  )

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
              <FilterBar
                query={query}
                lang={lang}
                t={t}
                controls={controls}
                onQueryChange={setQuery}
                onControlsChange={setControls}
              />
              <p className={css.status}>
                {t('visibleCount', { count: String(visible) })}
                {!isFiltering && !showAll ? ` · ${t('topBanner', { count: String(TOP_N) })}` : ''}
              </p>
              <div className={css.cardList}>
                {pageEntries.map(entry => (
                  <PluginCard key={entry.id} entry={entry} lang={lang} t={t} />
                ))}
              </div>
              {pageEntries.length === 0 ? <p className={css.status}>{t('empty')}</p> : null}
              <nav className={css.pager} aria-label={t('pageOf', { page: String(safePage + 1), total: String(totalPages) })}>
                <button
                  type="button"
                  className={css.pageButton}
                  disabled={safePage === 0}
                  onClick={() => setPage(value => Math.max(0, value - 1))}
                >
                  {t('prev')}
                </button>
                <span className={css.pageIndicator} data-page-indicator>
                  {t('pageOf', { page: String(safePage + 1), total: String(totalPages) })}
                </span>
                <button
                  type="button"
                  className={css.pageButton}
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setPage(value => Math.min(totalPages - 1, value + 1))}
                >
                  {t('next')}
                </button>
              </nav>
              {!isFiltering && !showAll ? (
                <button type="button" className={css.browseAll} onClick={() => setShowAll(true)}>
                  {t('browseAll', { count: String(flat.length) })}
                </button>
              ) : null}
              <StatsDashboard meta={meta} lang={lang} t={t} />
            </>
          )
      ) : null}
    </div>
  )
}
