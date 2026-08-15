import type { ReactNode } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { FunctionCategory, InstallForm } from '../data/types.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL } from '../data/constants.ts'
import type { DirectoryLocaleKey } from './locales.ts'
import type { FilterControls, GroupBy, SortKey } from './filter.ts'

/**
 * Search + user-selectable classification/sort controls. The search query is
 * a separate controlled value so the caller can debounce it, while the chip /
 * sort / group-by toggles report changes immediately.
 */
export interface FilterBarProps {
  /** Immediate search text (typed, not yet debounced). */
  query: string
  /** Active UI language; drives category / install-form label lookups. */
  lang: 'zh' | 'en'
  /** Bound directory-namespace translate. */
  t: TranslateNS<'directory'>
  /** Non-query controls (categories / forms / group-by / sort). */
  controls: FilterControls
  /** Reports the next search text on each keystroke. */
  onQueryChange: (query: string) => void
  /** Reports the next controls state on any chip / toggle change. */
  onControlsChange: (controls: FilterControls) => void
}

/** All function-category keys in canonical order (the label table is the source of truth). */
const CATEGORY_KEYS = Object.keys(CATEGORY_LABEL) as FunctionCategory[]

/** All install-form keys in canonical order. */
const FORM_KEYS = Object.keys(INSTALL_FORM_LABEL) as InstallForm[]

/** Grouping dimensions in the order they appear in the UI. */
const GROUP_BY_KEYS: GroupBy[] = ['none', 'category', 'installForm', 'language', 'starBucket']

/** Sort keys in the order they appear in the UI. */
const SORT_KEYS: SortKey[] = ['score', 'stars', 'recent']

/** Locale key of each grouping dimension's toggle label. */
const GROUP_BY_LABEL: Record<GroupBy, DirectoryLocaleKey> = {
  none: 'groupByNone',
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
export function FilterBar({ query, lang, t, controls, onQueryChange, onControlsChange }: FilterBarProps): ReactNode {
  const toggleCategory = (category: FunctionCategory): void => {
    const categories = new Set(controls.categories)
    if (categories.has(category)) categories.delete(category)
    else categories.add(category)
    onControlsChange({ ...controls, categories })
  }

  const toggleInstallForm = (form: InstallForm): void => {
    const installForms = new Set(controls.installForms)
    if (installForms.has(form)) installForms.delete(form)
    else installForms.add(form)
    onControlsChange({ ...controls, installForms })
  }

  return (
    <div className="dshpd-bar" data-filter-bar>
      <input
        className="dshpd-search"
        type="search"
        data-search
        value={query}
        placeholder={t('searchPlaceholder')}
        aria-label={t('searchPlaceholder')}
        onChange={event => onQueryChange(event.target.value)}
      />
      <div className="dshpd-row">
        <span className="dshpd-rowLabel">{t('filterCategory')}</span>
        <div className="dshpd-chips" role="group" aria-label={t('filterCategory')}>
          {CATEGORY_KEYS.map(category => (
            <button
              key={category}
              type="button"
              className="dshpd-chip"
              data-category-chip={category}
              aria-pressed={controls.categories.has(category)}
              onClick={() => toggleCategory(category)}
            >
              {CATEGORY_LABEL[category][lang]}
            </button>
          ))}
        </div>
      </div>
      <div className="dshpd-row">
        <span className="dshpd-rowLabel">{t('filterInstallForm')}</span>
        <div className="dshpd-chips" role="group" aria-label={t('filterInstallForm')}>
          {FORM_KEYS.map(form => (
            <button
              key={form}
              type="button"
              className="dshpd-chip"
              data-form-chip={form}
              aria-pressed={controls.installForms.has(form)}
              onClick={() => toggleInstallForm(form)}
            >
              {INSTALL_FORM_LABEL[form][lang]}
            </button>
          ))}
        </div>
      </div>
      <div className="dshpd-row">
        <span className="dshpd-rowLabel">{t('groupBy')}</span>
        <div className="dshpd-chips" role="group" aria-label={t('groupBy')}>
          {GROUP_BY_KEYS.map(groupBy => (
            <button
              key={groupBy}
              type="button"
              className="dshpd-chip"
              data-group-by={groupBy}
              aria-pressed={controls.groupBy === groupBy}
              onClick={() => onControlsChange({ ...controls, groupBy })}
            >
              {t(GROUP_BY_LABEL[groupBy])}
            </button>
          ))}
        </div>
      </div>
      <div className="dshpd-row">
        <span className="dshpd-rowLabel">{t('sort')}</span>
        <div className="dshpd-chips" role="group" aria-label={t('sort')}>
          {SORT_KEYS.map(sort => (
            <button
              key={sort}
              type="button"
              className="dshpd-chip"
              data-sort={sort}
              aria-pressed={controls.sort === sort}
              onClick={() => onControlsChange({ ...controls, sort })}
            >
              {t(SORT_LABEL[sort])}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
