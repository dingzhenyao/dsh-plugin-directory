import type { FunctionCategory, InstallForm } from './types.ts'

/** Bilingual display labels for every function category (zh/en symmetric). */
export const CATEGORY_LABEL: Record<FunctionCategory, { zh: string; en: string }> = {
  tool: { zh: '工具', en: 'Tool' },
  skill: { zh: '技能', en: 'Skill' },
  memory: { zh: '记忆', en: 'Memory' },
  vision: { zh: '视觉', en: 'Vision' },
  'ui-skin': { zh: '界面皮肤', en: 'UI Skin' },
  mcp: { zh: 'MCP', en: 'MCP' },
  orchestration: { zh: '编排', en: 'Orchestration' },
  'cli-tui': { zh: '命令行/终端', en: 'CLI/TUI' },
  web: { zh: '网页', en: 'Web' },
  agent: { zh: '智能体', en: 'Agent' },
  other: { zh: '其他', en: 'Other' },
}

/** Bilingual display labels for every install form (zh/en symmetric). */
export const INSTALL_FORM_LABEL: Record<InstallForm, { zh: string; en: string }> = {
  bundle: { zh: '插件包', en: 'Bundle' },
  repo: { zh: '仓库', en: 'Repository' },
  client: { zh: '客户端', en: 'Client' },
  unknown: { zh: '未知', en: 'Unknown' },
}

/** Star-count buckets as [lower inclusive bound, bucket label], ascending. */
export const STAR_BUCKETS: [number, string][] = [
  [0, '0-9'],
  [10, '10-49'],
  [50, '50-199'],
  [200, '200-999'],
  [1000, '1000+'],
]

/** Returns the bucket label containing the given star count. */
export function starBucket(n: number): string {
  let label = STAR_BUCKETS[0]?.[1] ?? '0-9'
  for (const [threshold, bucketLabel] of STAR_BUCKETS) {
    if (n >= threshold) label = bucketLabel
  }
  return label
}
