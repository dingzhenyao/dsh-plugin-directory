import { useState, type FormEvent, type ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { deriveFromSource, type AddEntryInput, type InstalledEntry } from '../data/installed-types.ts'

/** The managed-plugins panel: list, update/remove, and a manual-add form. */
export interface MyPluginsProps {
  /** Bound directory-namespace translate. */
  t: TranslateNS<'directory'>
  /** Current managed plugins (owned by the tab; this panel only reports intent). */
  installed: InstalledEntry[]
  /** Host-load/mutation status, used to show an error seat. */
  status: 'loading' | 'ready' | 'error'
  /** Reports a validated manual add (the source repo is already resolved to id/name). */
  onAdd: (input: AddEntryInput) => void
  /** Reports a remove request by id. */
  onRemove: (id: string) => void
  /** Reports an update/reinstall request by id. */
  onUpdate: (id: string) => void
}

/** Render the "My plugins" section with a manual-add form and per-entry actions. */
export function MyPlugins({ t, installed, status, onAdd, onRemove, onUpdate }: MyPluginsProps): ReactNode {
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
      <h3 className="dshpd-mineTitle">{t('myPluginsTitle')}</h3>
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
                <span className="dshpd-mineName">{entry.name}</span>
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
