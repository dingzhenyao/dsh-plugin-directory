import { memo, useEffect, useState, type ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginEntry } from '../data/types.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL } from '../data/constants.ts'

/** How long the install button stays in its "copied" confirmation state. */
const COPIED_MS = 1600

/** One repository card: identity, meta, badges, and a one-click install row. */
export interface PluginCardProps {
  /** The repository entry this card renders. */
  entry: PluginEntry
  /** Active UI language; drives category / install-form label lookups. */
  lang: 'zh' | 'en'
  /** Bound directory-namespace translate. */
  t: TranslateNS<'directory'>
}

/** Render a semantic, bilingual repository card with one-click install. */
function PluginCardImpl({ entry, lang, t }: PluginCardProps): ReactNode {
  const [copied, setCopied] = useState(false)
  const command = entry.install.command
  // Every entry carries at least the git-install fallback
  // (`dsh plugin add github:owner/repo`), so the install button is always the
  // direct install channel: README-extracted when available, otherwise the
  // canonical derived command.
  const showInstall = command !== null

  // Flip the button back to its idle label shortly after a successful copy;
  // the timer is torn down on unmount or when the confirmation clears.
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS)
    return () => window.clearTimeout(timer)
  }, [copied])

  const copy = (): void => {
    if (command === null) return
    const clipboard = navigator.clipboard
    if (!clipboard) return // non-secure context: copy from the <code> block
    void clipboard.writeText(command)
      .then(() => setCopied(true))
      .catch(() => { /* denied or unavailable: manual copy stays available */ })
  }

  return (
    <article className="dshpd-card" data-plugin-card>
      <header className="dshpd-header">
        <h4 className="dshpd-title">
          <a href={entry.htmlUrl} target="_blank" rel="noopener noreferrer" data-owner-link>
            {entry.name}
          </a>
        </h4>
        <span className="dshpd-owner" data-owner>{entry.owner}</span>
      </header>
      <p className="dshpd-description">{entry.description ?? t('noDescription')}</p>
      <ul className="dshpd-meta">
        <li data-meta="stars">
          <span>{t('stars')}</span>
          <strong>{entry.stars}</strong>
        </li>
        <li data-meta="language">{entry.language ?? '—'}</li>
        <li data-meta="license">{entry.license ?? t('noLicense')}</li>
        <li data-meta="updated">
          <span>{t('updated')}</span>
          <span>{entry.pushedAt.slice(0, 10)}</span>
        </li>
      </ul>
      <div className="dshpd-badges">
        <span className="dshpd-badge" data-badge="category">{CATEGORY_LABEL[entry.category][lang]}</span>
        <span className="dshpd-badge" data-badge="installForm" data-form={entry.install.form}>{INSTALL_FORM_LABEL[entry.install.form][lang]}</span>
      </div>
      {showInstall ? (
        <div className="dshpd-install">
          <code className="dshpd-command" data-install-command>{command}</code>
          <button type="button" className="dshpd-copyButton" data-install-button onClick={copy}>
            {copied ? t('copied') : t('install')}
          </button>
        </div>
      ) : null}
    </article>
  )
}

/** Memoized card: re-renders only when its entry, language, or translate changes. */
export const PluginCard = memo(PluginCardImpl)
