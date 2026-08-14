export type FunctionCategory =
  | 'tool' | 'skill' | 'memory' | 'vision' | 'ui-skin'
  | 'mcp' | 'orchestration' | 'cli-tui' | 'web' | 'agent' | 'other'

export type InstallForm = 'bundle' | 'repo' | 'client' | 'unknown'

export interface InstallInfo {
  form: InstallForm
  command: string | null
  packageName?: string
  source: 'readme' | 'package-json' | 'derived'
  snippet?: string
}

export interface PluginEntry {
  id: string
  name: string
  owner: string
  htmlUrl: string
  description: string | null
  homepage: string | null
  topics: string[]
  language: string | null
  license: string | null
  stars: number
  forks: number
  createdAt: string
  pushedAt: string
  archived: boolean
  fork: boolean
  category: FunctionCategory
  install: InstallInfo
  score: number
}

export interface MetaFile {
  syncedAt: string
  total: number
  byCategory: Record<FunctionCategory, number>
  byInstallForm: Record<InstallForm, number>
  byLanguage: Record<string, number>
  byStarBucket: Record<string, number>
}
