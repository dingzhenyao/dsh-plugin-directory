import { useState, type FormEvent, type ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import {
  deriveFromSource,
  type AddEntryInput,
  type InstalledEntry,
  type RealInstallStatus,
} from '../data/installed-types.ts'

/** The managed-plugins panel: list, update/remove, a manual-add form, and real install status. */
export interface MyPluginsProps {
  /** Bound directory-namespace translate. */
  t: TranslateNS<'directory'>
  /** Current managed plugins (owned by the tab; this panel only reports intent). */
  installed: InstalledEntry[]
  /** Host-load/mutation status, used to show an error seat. */
  status: 'loading' | 'ready' | 'error'
  /** Real install status per ledger id (from the harness Loader inventory). */
  statuses: Map<string, RealInstallStatus>
  /** Real inventory load status, drives the sync button. */
  inventoryStatus: 'loading' | 'ready' | 'error'
  /** Re-read the harness Loader inventory. */
  onSync: () => void
  /** Reports a validated manual add (the source repo is already resolved to id/name). */
  onAdd: (input: AddEntryInput) => void
  /** Reports a remove request by id. */
  onRemove: (id: string) => void
  /** Reports an update/reinstall request by id. */
  onUpdate: (id: string) => void
}

/** Render the "My plugins" section with a manual-add form and per-entry actions. */
export function MyPlugins({
  t,
  installed,
  status,
  statuses,
  inventoryStatus,
  onSync,
  onAdd,
  onRemove,
  onUpdate,
}: MyPluginsProps): ReactNode {
  const [source, setSource] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const derived = deriveFromSource(source)
    if (derived === null) {
      setError(t('sourceInvalid'))
      return
    }
    onAdd({ id: derived.id, name: derived.name, source, method: 'manual' })
    setSource('')
    setError(null)
  }

  return (
    <section className="dshpd-mine" data-my-plugins>
      <div className="dshpd-headRow">
        <h3 className="dshpd-mineTitle">{t('myPluginsTitle')}</h3>
        <button
          type="button"
          className="dshpd-refresh"
          data-sync-inventory
          onClick={onSync}
          disabled={inventoryStatus === 'loading'}
        >
          {inventoryStatus === 'loading' ? t('syncingStatus') : t('syncStatus')}
        </button>
      </div>
      <p className="dshpd-mineHint">{t('myPluginsHint')}</p>
      {status === 'error' ? <p className="dshpd-status" role="alert">{t('myPluginsError')}</p> : null}
      <form className="dshpd-mineForm" onSubmit={submit}>
        <input
          className="dshpd-search"
          type="text"
          data-manual-source
          value={source}
          placeholder={t('sourcePlaceholder')}
          aria-label={t('sourceLabel')}
          onChange={event => setSource(event.target.value)}
        />
        <button type="submit" className="dshpd-copyButton" data-manual-add>
          {t('addManual')}
        </button>
      </form>
      {error !== null ? <p className="dshpd-status" role="alert">{error}</p> : null}
      {status === 'loading' ? <p className="dshpd-status">{t('myPluginsLoading')}</p> : null}
      {status !== 'loading' && installed.length === 0 ? (
        <p className="dshpd-status">{t('myPluginsEmpty')}</p>
      ) : null}
      {installed.length > 0 ? (
        <ul className="dshpd-mineList" data-installed-list>
          {installed.map(entry => (
            <li key={entry.id} className="dshpd-mineItem" data-installed-item={entry.id}>
              <div className="dshpd-mineInfo">
                <div className="dshpd-mineNameRow">
                  <span className="dshpd-mineName">{entry.name}</span>
                  <RealStatusBadge t={t} status={statuses.get(entry.id) ?? { kind: 'unknown' }} />
                </div>
                <span className="dshpd-mineSource">{entry.source}</span>
                <span className="dshpd-mineMeta">
                  {entry.method === 'search' ? t('methodSearch') : t('methodManual')}
                  {' · '}{t('installedAt', { time: entry.installedAt.slice(0, 10) })}
                </span>
              </div>
              <div className="dshpd-mineActions">
                <button
                  type="button"
                  className="dshpd-pageButton"
                  data-installed-update
                  onClick={() => onUpdate(entry.id)}
                >
                  {t('update')}
                </button>
                <button
                  type="button"
                  className="dshpd-pageButton"
                  data-installed-remove
                  onClick={() => onRemove(entry.id)}
                >
                  {t('remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}

/** One real install-status badge (installed/not-installed/unknown + phase/enabled). */
function RealStatusBadge({ t, status }: { t: MyPluginsProps['t']; status: RealInstallStatus }): ReactNode {
  if (status.kind === 'unknown') {
    return <span className="dshpd-statusBadge" data-install-status="unknown">{t('statusUnknown')}</span>
  }
  if (status.kind === 'not-installed') {
    return <span className="dshpd-statusBadge" data-install-status="not-installed">{t('statusNotInstalled')}</span>
  }
  if (!status.enabled) {
    return <span className="dshpd-statusBadge" data-install-status="disabled">{t('statusDisabled')}</span>
  }
  if (status.phase === 'failed') {
    return <span className="dshpd-statusBadge" data-install-status="failed">{t('statusFailed')}</span>
  }
  if (status.phase === 'loading' || status.phase === 'pending') {
    return <span className="dshpd-statusBadge" data-install-status="loading">{t('statusLoading')}</span>
  }
  return <span className="dshpd-statusBadge" data-install-status="installed">{t('statusInstalled')}</span>
}
