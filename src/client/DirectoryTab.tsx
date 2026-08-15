import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { MetaFile, PluginEntry } from '../data/types.ts'
import { FilterBar } from './FilterBar.tsx'
import { PluginCard } from './PluginCard.tsx'
import { CDN_BASE, fetchRemote, type Snapshot } from './data.ts'
import { filterAndSort, type FilterControls } from './filter.ts'
import { searchLive } from './liveSearch.ts'

/** Registration-side inject face: the bundled bilingual snapshot (the fallback). */
export interface DirectoryTabInjected {
  /** Active UI language; drives category / install-form label lookups. */
  lang: 'zh' | 'en'
  /** Bundled plugin entries (offline fallback). */
  plugins: PluginEntry[]
  /** Bundled directory statistics. */
  meta: MetaFile
}

/** Full component props assembled by the Settings slot renderer. */
export type DirectoryTabProps =
  PropsLocale<'directory'>
  & InjectFace<DirectoryTabInjected>

type ViewStatus = 'loading' | 'error' | 'ready'

type RefreshState = 'idle' | 'refreshing' | 'failed'

type LiveState = 'idle' | 'loading' | 'ready' | 'error'

/** Cards per page. */
const PAGE_SIZE = 10

/** Default curated scope: the top-N by the active sort when nothing filters. */
const TOP_N = 50

/** Debounce the search query by this many milliseconds (local filter + live). */
const QUERY_DEBOUNCE_MS = 250

/** Render the plugin directory tab with loading / empty / error seats. */
export function DirectoryTab({ t, lang, plugins, meta }: DirectoryTabProps): ReactNode {
  const [viewStatus, setViewStatus] = useState<ViewStatus>('loading')
  const [request, setRequest] = useState(0)

  // The bundled snapshot is the offline fallback; a CDN fetch may replace it.
  const [snapshot, setSnapshot] = useState<Snapshot>({ plugins, meta })
  const [refreshState, setRefreshState] = useState<RefreshState>('idle')

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

  // Live search results (latest matching repos beyond the snapshot).
  const [liveState, setLiveState] = useState<LiveState>('idle')
  const [liveEntries, setLiveEntries] = useState<PluginEntry[]>([])

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), QUERY_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

  // Validate the injected fallback payload; the snapshot itself is trusted
  // once the fallback is confirmed array-shaped.
  useEffect(() => {
    let current = true
    void Promise.resolve().then(() => {
      if (!current) return
      if (!Array.isArray(plugins) || meta === null || typeof meta !== 'object') {
        throw new TypeError('directory snapshot is malformed')
      }
      setViewStatus('ready')
    }).catch(() => {
      if (current) setViewStatus('error')
    })
    return () => { current = false }
  }, [plugins, meta, request])

  // Refresh the snapshot from the CDN once on mount, then on demand.
  const refresh = useCallback(() => {
    setRefreshState('refreshing')
    void fetchRemote(CDN_BASE).then((remote) => {
      if (remote !== null) {
        setSnapshot(remote)
        setRefreshState('idle')
      } else {
        setRefreshState('failed')
      }
    })
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Live search whenever the debounced query is non-empty.
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (q === '') {
      setLiveState('idle')
      setLiveEntries([])
      return
    }
    let cancelled = false
    setLiveState('loading')
    searchLive(q).then((entries) => {
      if (cancelled) return
      setLiveEntries(entries)
      setLiveState('ready')
    }).catch(() => {
      if (cancelled) return
      setLiveEntries([])
      setLiveState('error')
    })
    return () => { cancelled = true }
  }, [debouncedQuery])

  // Reset to the first page whenever the effective filter changes.
  useEffect(() => { setPage(0) }, [debouncedQuery, controls])

  const retry = (): void => {
    setViewStatus('loading')
    setRequest(value => value + 1)
  }

  // Guard a malformed injected snapshot (null/non-array) before filtering; the
  // error seat still renders once the validation effect lands.
  const list = Array.isArray(snapshot.plugins) ? snapshot.plugins : []

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

  // Live results deduped against the snapshot, then category/form filtered.
  const snapshotIds = useMemo(() => new Set(list.map(entry => entry.id)), [list])
  const isLiveActive = debouncedQuery.trim() !== ''
  const liveVisible = useMemo(() => {
    if (liveState !== 'ready') return []
    const fresh = liveEntries.filter(entry => !snapshotIds.has(entry.id))
    const liveGroups = filterAndSort(fresh, { ...controls, query: '' }, lang)
    return liveGroups.groups.flatMap(group => group.entries)
  }, [liveEntries, liveState, snapshotIds, controls, lang])

  const syncedAt = snapshot.meta.syncedAt.slice(0, 10)

  return (
    <div className="dshpd-root" data-directory lang={lang} aria-busy={viewStatus === 'loading'}>
      {viewStatus === 'loading' ? <p className="dshpd-status">{t('loading')}</p> : null}
      {viewStatus === 'error' ? (
        <div className="dshpd-failure">
          <p role="alert">{t('error')}</p>
          <button type="button" onClick={retry}>{t('retry')}</button>
        </div>
      ) : null}
      {viewStatus === 'ready' ? (
        list.length === 0
          ? <p className="dshpd-status">{t('empty')}</p>
          : (
            <>
              <div className="dshpd-headRow">
                <p className="dshpd-status">{t('repoCount', { count: String(list.length) })}</p>
                <button
                  type="button"
                  className="dshpd-refresh"
                  data-refresh
                  onClick={refresh}
                  disabled={refreshState === 'refreshing'}
                >
                  {refreshState === 'refreshing' ? t('refreshing') : t('refresh')}
                </button>
              </div>
              <p className="dshpd-status" data-synced>
                {t('syncedAt', { time: syncedAt })}
                {refreshState === 'failed' ? ` · ${t('refreshFailed')}` : ''}
              </p>
              <FilterBar
                query={query}
                lang={lang}
                t={t}
                controls={controls}
                onQueryChange={setQuery}
                onControlsChange={setControls}
              />
              <p className="dshpd-status">
                {t('visibleCount', { count: String(visible) })}
                {!isFiltering && !showAll ? ` · ${t('topBanner', { count: String(TOP_N) })}` : ''}
              </p>
              <div className="dshpd-results" data-results>
                <div className="dshpd-cardList">
                  {pageEntries.map(entry => (
                    <PluginCard key={entry.id} entry={entry} lang={lang} t={t} />
                  ))}
                </div>
                {pageEntries.length === 0 ? <p className="dshpd-status">{t('empty')}</p> : null}
                <nav className="dshpd-pager" aria-label={t('pageOf', { page: String(safePage + 1), total: String(totalPages) })}>
                  <button
                    type="button"
                    className="dshpd-pageButton"
                    disabled={safePage === 0}
                    onClick={() => setPage(value => Math.max(0, value - 1))}
                  >
                    {t('prev')}
                  </button>
                  <span className="dshpd-pageIndicator" data-page-indicator>
                    {t('pageOf', { page: String(safePage + 1), total: String(totalPages) })}
                  </span>
                  <button
                    type="button"
                    className="dshpd-pageButton"
                    disabled={safePage >= totalPages - 1}
                    onClick={() => setPage(value => Math.min(totalPages - 1, value + 1))}
                  >
                    {t('next')}
                  </button>
                </nav>
              </div>
              {!isFiltering && !showAll ? (
                <button type="button" className="dshpd-browseAll" onClick={() => setShowAll(true)}>
                  {t('browseAll', { count: String(flat.length) })}
                </button>
              ) : null}
              {isLiveActive && liveState === 'loading' ? <p className="dshpd-status">{t('liveLoading')}</p> : null}
              {isLiveActive && liveState === 'error' ? <p className="dshpd-status" role="status">{t('liveRateLimited')}</p> : null}
              {isLiveActive && liveState === 'ready' && liveVisible.length > 0 ? (
                <section className="dshpd-liveSection" data-live-section>
                  <h3 className="dshpd-liveTitle">{t('liveTitle')}</h3>
                  <p className="dshpd-liveHint">{t('liveHint')}</p>
                  <div className="dshpd-cardList">
                    {liveVisible.map(entry => (
                      <PluginCard key={entry.id} entry={entry} lang={lang} t={t} />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )
      ) : null}
    </div>
  )
}
