import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { FunctionCategory, InstallForm } from '../data/types.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL } from '../data/constants.ts'
import type { DirectoryLocaleKey } from './locales.ts'
import type { FilterState, GroupBy, SortKey } from './filter.ts'
import css from './FilterBar.module.css'

/** Search + user-selectable classification/sort controls, driven by the caller's filter state. */
export interface FilterBarProps {
  /** Current filter/sort/group state (controlled). */
  state: FilterState
  /** Active UI language; drives category / install-form label lookups. */
  lang: 'zh' | 'en'
  /** Bound directory-namespace translate. */
  t: TranslateNS<'directory'>
  /** Reports the next filter state on any user change. */
  onChange: (next: FilterState) => void
}

/** All function-category keys in canonical order (the label table is the source of truth). */
const CATEGORY_KEYS = Object.keys(CATEGORY_LABEL) as FunctionCategory[]

/** All install-form keys in canonical order. */
const FORM_KEYS = Object.keys(INSTALL_FORM_LABEL) as InstallForm[]

/** Grouping dimensions in the order they appear in the UI. */
const GROUP_BY_KEYS: GroupBy[] = ['category', 'installForm', 'language', 'starBucket']

/** Sort keys in the order they appear in the UI. */
const SORT_KEYS: SortKey[] = ['score', 'stars', 'recent']

/** Locale key of each grouping dimension's toggle label. */
const GROUP_BY_LABEL: Record<GroupBy, DirectoryLocaleKey> = {
  category: 'groupByCategory',
  installForm: 'groupByInstallForm',
  language: 'groupByLanguage',
  starBucket: 'groupByStarBucket',
}

/** Locale key of each sort option's toggle label. */
const SORT_LABEL: Record<SortKey, DirectoryLocaleKey> = {
  score: 'sortScore',
  stars: 'sortStars',
  recent: 'sortRecent',
}

/** Render the bilingual search box, multi-select chips, and grouping/sort toggles. */
export function FilterBar({ state, lang, t, onChange }: FilterBarProps): ReactNode {
  const toggleCategory = (category: FunctionCategory): void => {
    const categories = new Set(state.categories)
    if (categories.has(category)) categories.delete(category)
    else categories.add(category)
    onChange({ ...state, categories })
  }

  const toggleInstallForm = (form: InstallForm): void => {
    const installForms = new Set(state.installForms)
    if (installForms.has(form)) installForms.delete(form)
    else installForms.add(form)
    onChange({ ...state, installForms })
  }

  return (
    <div className={css.bar} data-filter-bar>
      <input
        className={css.search}
        type="search"
        data-search
        value={state.query}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        onChange={event => onChange({ ...state, query: event.target.value })}
      />
      <div className={css.row}>
        <span className={css.rowLabel}>{t('filterCategory')}</span>
        <div className={css.chips} role="group" aria-label={t('filterCategory')}>
          {CATEGORY_KEYS.map(category => (
            <button
              key={category}
              type="button"
              className={css.chip}
              data-category-chip={category}
              aria-pressed={state.categories.has(category)}
              onClick={() => toggleCategory(category)}
            >
              {CATEGORY_LABEL[category][lang]}
            </button>
          ))}
        </div>
      </div>
      <div className={css.row}>
        <span className={css.rowLabel}>{t('filterInstallForm')}</span>
        <div className={css.chips} role="group" aria-label={t('filterInstallForm')}>
          {FORM_KEYS.map(form => (
            <button
              key={form}
              type="button"
              className={css.chip}
              data-form-chip={form}
              aria-pressed={state.installForms.has(form)}
              onClick={() => toggleInstallForm(form)}
            >
              {INSTALL_FORM_LABEL[form][lang]}
            </button>
          ))}
        </div>
      </div>
      <div className={css.row}>
        <span className={css.rowLabel}>{t('groupBy')}</span>
        <div className={css.chips} role="group" aria-label={t('groupBy')}>
          {GROUP_BY_KEYS.map(groupBy => (
            <button
              key={groupBy}
              type="button"
              className={css.chip}
              data-group-by={groupBy}
              aria-pressed={state.groupBy === groupBy}
              onClick={() => onChange({ ...state, groupBy })}
            >
              {t(GROUP_BY_LABEL[groupBy])}
            </button>
          ))}
        </div>
      </div>
      <div className={css.row}>
        <span className={css.rowLabel}>{t('sort')}</span>
        <div className={css.chips} role="group" aria-label={t('sort')}>
          {SORT_KEYS.map(sort => (
            <button
              key={sort}
              type="button"
              className={css.chip}
              data-sort={sort}
              aria-pressed={state.sort === sort}
              onClick={() => onChange({ ...state, sort })}
            >
              {t(SORT_LABEL[sort])}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
