import type { FunctionCategory, InstallForm, PluginEntry } from '../data/types.ts'
import { CATEGORY_LABEL, INSTALL_FORM_LABEL, STAR_BUCKETS, starBucket } from '../data/constants.ts'

/** Grouping dimension the user can pick: category, install form, language, or star bucket. */
export type GroupBy = 'category' | 'installForm' | 'language' | 'starBucket'

/** In-group ordering the user can pick: quality score, star count, or last push. */
export type SortKey = 'score' | 'stars' | 'recent'

/** User-selectable filter/sort/group state; empty sets mean "no restriction". */
export interface FilterState {
  /** Lowercase search performed against name, description, and owner. */
  query: string
  /** Selected function categories; empty set = any category. */
  categories: Set<FunctionCategory>
  /** Selected install forms; empty set = any form. */
  installForms: Set<InstallForm>
  /** Active grouping dimension. */
  groupBy: GroupBy
  /** Active in-group sort key. */
  sort: SortKey
}

/** One non-empty group of the filtered, sorted listing. */
export interface GroupResult {
  /** Group key: category id, install-form id, language name, or star-bucket label. */
  key: string
  /** Bilingual group label resolved for the active UI language. */
  label: string
  /** Group members, already in the active sort order. */
  entries: PluginEntry[]
}

/** Result of {@link filterAndSort}: ordered non-empty groups plus the filtered total. */
export interface FilterResult {
  groups: GroupResult[]
  visible: number
}

/** All function-category keys in canonical (label-table) order. */
const CATEGORY_KEYS = Object.keys(CATEGORY_LABEL) as FunctionCategory[]

/** All install-form keys in canonical order. */
const FORM_KEYS = Object.keys(INSTALL_FORM_LABEL) as InstallForm[]

/**
 * Display label of a language group key. The reserved `other` key carries no
 * real language name, so it gets the localized copy (mirroring the locale
 * dictionary); any other key is a real GitHub language name shown verbatim.
 */
function languageLabel(key: string, lang: 'zh' | 'en'): string {
  return key === 'other' ? (lang === 'zh' ? '其他语言' : 'Other languages') : key
}

/** Case-insensitive `includes` match against name, description (null-safe), and owner. */
function matchesQuery(entry: PluginEntry, query: string): boolean {
  if (query === '') return true
  const q = query.toLowerCase()
  return (
    entry.name.toLowerCase().includes(q)
    || (entry.description ?? '').toLowerCase().includes(q)
    || entry.owner.toLowerCase().includes(q)
  )
}

/** Returns a new array in the requested sort order (ISO strings compare lexicographically). */
function sortEntries(entries: PluginEntry[], sort: SortKey): PluginEntry[] {
  const sorted = [...entries]
  switch (sort) {
    case 'score':
      sorted.sort((a, b) => (
        b.score - a.score
        || b.stars - a.stars
        || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      ))
      break
    case 'stars':
      sorted.sort((a, b) => b.stars - a.stars)
      break
    case 'recent':
      sorted.sort((a, b) => (a.pushedAt < b.pushedAt ? 1 : a.pushedAt > b.pushedAt ? -1 : 0))
      break
  }
  return sorted
}

/** Partitions the (already sorted) entries into ordered non-empty groups. */
function groupEntries(entries: PluginEntry[], groupBy: GroupBy, lang: 'zh' | 'en'): GroupResult[] {
  switch (groupBy) {
    case 'category': {
      const byKey = new Map<FunctionCategory, PluginEntry[]>()
      for (const entry of entries) {
        const list = byKey.get(entry.category)
        if (list) list.push(entry)
        else byKey.set(entry.category, [entry])
      }
      const groups: GroupResult[] = []
      for (const category of CATEGORY_KEYS) {
        const list = byKey.get(category)
        if (list) groups.push({ key: category, label: CATEGORY_LABEL[category][lang], entries: list })
      }
      return groups
    }
    case 'installForm': {
      const byKey = new Map<InstallForm, PluginEntry[]>()
      for (const entry of entries) {
        const list = byKey.get(entry.install.form)
        if (list) list.push(entry)
        else byKey.set(entry.install.form, [entry])
      }
      const groups: GroupResult[] = []
      for (const form of FORM_KEYS) {
        const list = byKey.get(form)
        if (list) groups.push({ key: form, label: INSTALL_FORM_LABEL[form][lang], entries: list })
      }
      return groups
    }
    case 'language': {
      const byKey = new Map<string, PluginEntry[]>()
      for (const entry of entries) {
        const key = entry.language ?? 'other'
        const list = byKey.get(key)
        if (list) list.push(entry)
        else byKey.set(key, [entry])
      }
      // Largest groups first; deterministic key tie-break keeps the order stable.
      return [...byKey.entries()]
        .map(([key, list]) => ({ key, label: languageLabel(key, lang), entries: list }))
        .sort((a, b) => b.entries.length - a.entries.length || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    }
    case 'starBucket': {
      const byKey = new Map<string, PluginEntry[]>()
      for (const entry of entries) {
        const key = starBucket(entry.stars)
        const list = byKey.get(key)
        if (list) list.push(entry)
        else byKey.set(key, [entry])
      }
      const groups: GroupResult[] = []
      for (const [, bucket] of STAR_BUCKETS) {
        const list = byKey.get(bucket)
        if (list) groups.push({ key: bucket, label: bucket, entries: list })
      }
      return groups
    }
  }
}

/**
 * Filter, sort, and group the plugin directory for the active UI language.
 * Pure: no state, no side effects, deterministic output for identical inputs.
 */
export function filterAndSort(plugins: PluginEntry[], state: FilterState, lang: 'zh' | 'en'): FilterResult {
  const filtered = plugins.filter(entry => (
    matchesQuery(entry, state.query)
    && (state.categories.size === 0 || state.categories.has(entry.category))
    && (state.installForms.size === 0 || state.installForms.has(entry.install.form))
  ))
  const sorted = sortEntries(filtered, state.sort)
  return { groups: groupEntries(sorted, state.groupBy, lang), visible: sorted.length }
}
