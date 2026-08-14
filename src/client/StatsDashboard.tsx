import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { FunctionCategory, InstallForm, MetaFile } from '../data/types.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL, STAR_BUCKETS } from '../data/constants.ts'
import css from './StatsDashboard.module.css'

/** Bilingual stats dashboard props, rendered in the DirectoryTab ready seat. */
export interface StatsDashboardProps {
  /** Bundled directory statistics. */
  meta: MetaFile
  /** Active UI language; drives category / install-form label lookups. */
  lang: 'zh' | 'en'
  /** Bound directory-namespace translate. */
  t: TranslateNS<'directory'>
}

/** All function-category keys in canonical order (the label table is the source of truth). */
const CATEGORY_KEYS = Object.keys(CATEGORY_LABEL) as FunctionCategory[]

/** All install-form keys in canonical order. */
const FORM_KEYS = Object.keys(INSTALL_FORM_LABEL) as InstallForm[]

/** Display label of a language bucket; the reserved `other` key gets localized copy. */
function languageLabel(key: string, t: StatsDashboardProps['t']): string {
  return key === 'other' ? t('languageOther') : key
}

/** Render the statistics dashboard over the bundled directory snapshot. */
export function StatsDashboard({ meta, lang, t }: StatsDashboardProps): ReactNode {
  // Language buckets come from the snapshot; largest first for readability.
  const languageEntries = Object.entries(meta.byLanguage).sort((a, b) => b[1] - a[1])

  return (
    <section className={css.dashboard} data-stats aria-label={t('statsTitle')}>
      <h2 className={css.title}>{t('statsTitle')}</h2>
      <p className={css.total} data-stat="total">
        <span className={css.totalLabel}>{t('totalLabel')}</span>
        <span className={css.totalValue} data-stat-value>{meta.total}</span>
      </p>
      <div className={css.grid}>
        <section className={css.block} data-stat-block="category">
          <h3 className={css.blockTitle}>{t('byCategory')}</h3>
          <ul className={css.list}>
            {CATEGORY_KEYS.map(cat => (
              <li key={cat} className={css.item} data-stat={`category-${cat}`}>
                <span className={css.itemLabel} data-stat-label>{CATEGORY_LABEL[cat][lang]}</span>
                <span className={css.itemValue} data-stat-value>{meta.byCategory[cat]}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={css.block} data-stat-block="installForm">
          <h3 className={css.blockTitle}>{t('byInstallForm')}</h3>
          <ul className={css.list}>
            {FORM_KEYS.map(form => (
              <li key={form} className={css.item} data-stat={`installForm-${form}`}>
                <span className={css.itemLabel} data-stat-label>{INSTALL_FORM_LABEL[form][lang]}</span>
                <span className={css.itemValue} data-stat-value>{meta.byInstallForm[form]}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={css.block} data-stat-block="language">
          <h3 className={css.blockTitle}>{t('byLanguage')}</h3>
          <ul className={css.list}>
            {languageEntries.map(([key, count]) => (
              <li key={key} className={css.item} data-stat={`language-${key}`}>
                <span className={css.itemLabel} data-stat-label>{languageLabel(key, t)}</span>
                <span className={css.itemValue} data-stat-value>{count}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className={css.block} data-stat-block="starBucket">
          <h3 className={css.blockTitle}>{t('byStarBucket')}</h3>
          <ul className={css.list}>
            {STAR_BUCKETS.map(([, bucket]) => (
              <li key={bucket} className={css.item} data-stat={`star-${bucket}`}>
                <span className={css.itemLabel} data-stat-label>{bucket}</span>
                <span className={css.itemValue} data-stat-value>{meta.byStarBucket[bucket] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}
