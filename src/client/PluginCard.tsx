import { useEffect, useState, type ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { PluginEntry } from '../data/types.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL } from '../data/constants.ts'
import css from './PluginCard.module.css'

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
export function PluginCard({ entry, lang, t }: PluginCardProps): ReactNode {
  const [copied, setCopied] = useState(false)
  const command = entry.install.command

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
    <article className={css.card} data-plugin-card>
      <header className={css.header}>
        <h4 className={css.title}>
          <a href={entry.htmlUrl} target="_blank" rel="noopener noreferrer" data-owner-link>
            {entry.name}
          </a>
        </h4>
        <span className={css.owner} data-owner>{entry.owner}</span>
      </header>
      <p className={css.description}>{entry.description ?? t('noDescription')}</p>
      <ul className={css.meta}>
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
      <div className={css.badges}>
        <span className={css.badge} data-badge="category">{CATEGORY_LABEL[entry.category][lang]}</span>
        <span className={css.badge} data-badge="installForm">{INSTALL_FORM_LABEL[entry.install.form][lang]}</span>
      </div>
      {command !== null ? (
        <div className={css.install}>
          <code className={css.command} data-install-command>{command}</code>
          <button type="button" className={css.copyButton} data-install-button onClick={copy}>
            {copied ? t('copied') : t('install')}
          </button>
        </div>
      ) : null}
    </article>
  )
}
