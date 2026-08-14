import type { FunctionCategory } from './types.ts'

/**
 * Category → keyword table, in priority order (first keyword hit wins).
 * Matching is a lowercase substring search over `name + description + topics`.
 * Keywords are used verbatim from the task brief.
 */
const CATEGORY_KEYWORDS: ReadonlyArray<readonly [FunctionCategory, readonly string[]]> = [
  ['vision', ['vision', 'ocr', 'image', 'screenshot', '视觉', '看图', '截图']],
  ['memory', ['memory', 'knowledge', 'recall', '记忆', '知识库']],
  ['skill', ['skill', '技能']],
  ['ui-skin', ['skin', 'theme', 'whale', 'pet', '皮肤', '主题', '宠物', 'sidebar']],
  ['mcp', ['mcp', 'model context protocol']],
  ['cli-tui', ['tui', 'cli', 'terminal', '终端']],
  ['orchestration', ['agent team', 'orchestration', 'workflow', '编排', '多智能体', 'multi-agent']],
  ['web', ['browser', 'search', 'web', '浏览器', '搜索']],
  ['agent', ['agent']],
  ['tool', ['tool', '工具']],
]

/**
 * Classify a repo into a `FunctionCategory`. `overrides` is keyed by the
 * `owner/repo` id and wins over keyword hits; the fixed signature has no
 * separate id field, so callers pass the id as `input.name`. With no override
 * and no keyword hit the result is `'other'`.
 */
export function classifyRepo(
  input: { name: string; description: string | null; topics: string[] },
  overrides: Record<string, FunctionCategory>,
): FunctionCategory {
  const override = overrides[input.name]
  if (override) return override

  const text = [input.name, input.description ?? '', ...input.topics].join(' ').toLowerCase()
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) return category
    }
  }
  return 'other'
}
