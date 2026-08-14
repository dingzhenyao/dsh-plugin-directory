import { describe, expect, it } from 'vitest'
import { classifyRepo } from '../../src/data/classify.ts'
import type { FunctionCategory } from '../../src/data/types.ts'

function input(partial: Partial<{ id: string; name: string; description: string | null; topics: string[] }> = {}) {
  return { id: 'owner/some-repo', name: 'some-repo', description: null, topics: [] as string[], ...partial }
}

describe('classifyRepo', () => {
  it('overrides take priority over keyword hits (id key wins)', () => {
    const overrides: Record<string, FunctionCategory> = { 'octocat/hello-world': 'memory' }
    expect(
      classifyRepo(
        input({ id: 'octocat/hello-world', name: 'hello-world', description: 'an ocr screenshot tool', topics: ['vision'] }),
        overrides,
      ),
    ).toBe('memory')
  })

  it('override is resolved against the id, not the name', () => {
    const overrides: Record<string, FunctionCategory> = { 'octocat/hello-world': 'memory' }
    expect(
      classifyRepo(
        input({ id: 'octocat/hello-world', name: 'completely-unrelated-name', description: null, topics: [] }),
        overrides,
      ),
    ).toBe('memory')
  })

  it('keyword matching uses the name, not the id', () => {
    expect(classifyRepo(input({ id: 'owner/search-tools', name: 'modlens' }), {})).toBe('other')
  })

  it('hits vision via "ocr" (case-insensitive)', () => {
    expect(classifyRepo(input({ description: 'OCR and image tools' }), {})).toBe('vision')
  })

  it('hits vision via a topic keyword', () => {
    expect(classifyRepo(input({ topics: ['screenshot'] }), {})).toBe('vision')
  })

  it('hits memory via "recall"', () => {
    expect(classifyRepo(input({ description: 'auto recall of chat notes' }), {})).toBe('memory')
  })

  it('hits mcp via "model context protocol"', () => {
    expect(classifyRepo(input({ description: 'A Model Context Protocol server' }), {})).toBe('mcp')
  })

  it('hits ui-skin via "皮肤"', () => {
    expect(classifyRepo(input({ description: '一款桌面皮肤插件' }), {})).toBe('ui-skin')
  })

  it('hits cli-tui via "tui"', () => {
    expect(classifyRepo(input({ name: 'awesome-tui' }), {})).toBe('cli-tui')
  })

  it('returns other when no keyword matches', () => {
    expect(classifyRepo(input({ description: 'random unrelated stuff' }), {})).toBe('other')
  })
})
