// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MyPlugins } from '../../src/client/MyPlugins.tsx'
import { en, zh, type DirectoryLocaleKey } from '../../src/client/locales.ts'
import type { InstalledEntry } from '../../src/data/installed-types.ts'
import {
  addInstalled,
  deriveFromSource,
  readInstalled,
  removeInstalled,
  updateInstalled,
} from '../../src/client/installedStore.ts'

beforeEach(() => {
  localStorage.clear()
})

afterEach(cleanup)

/** Minimal Translate stub mirroring the harness `{name}` interpolation. */
function makeT(dict: Record<DirectoryLocaleKey, string>): MyPluginsProps['t'] {
  return ((key: DirectoryLocaleKey, params?: Record<string, unknown>): string => {
    let text = dict[key] ?? key
    if (params !== undefined) {
      text = text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match))
    }
    return text
  }) as MyPluginsProps['t']
}

type MyPluginsProps = Parameters<typeof MyPlugins>[0]

describe('installedStore', () => {
  it('starts empty and round-trips an added record', () => {
    expect(readInstalled()).toEqual([])
    const next = addInstalled({ id: 'a/b', name: 'b', source: 'github:a/b', method: 'search' })
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'a/b', name: 'b', source: 'github:a/b', method: 'search' })
    expect(next[0]!.installedAt).toBeTruthy()
    expect(readInstalled()).toEqual(next)
  })

  it('normalizes a bare owner/repo source and re-add replaces by id', () => {
    addInstalled({ id: 'a/b', name: 'b', source: 'a/b', method: 'manual' })
    const next = addInstalled({ id: 'a/b', name: 'renamed', source: 'github:a/b', method: 'manual' })
    expect(next).toHaveLength(1)
    expect(next[0]!.name).toBe('renamed')
    expect(next[0]!.source).toBe('github:a/b')
  })

  it('throws on a source without an owner/repo', () => {
    expect(() => addInstalled({ id: 'x', name: 'x', source: 'justaname', method: 'manual' })).toThrow()
  })

  it('removes by id and updates a timestamp by id', () => {
    const [a] = addInstalled({ id: 'a/b', name: 'b', source: 'github:a/b', method: 'search' })
    addInstalled({ id: 'c/d', name: 'd', source: 'github:c/d', method: 'manual' })
    const removed = removeInstalled('a/b')
    expect(removed).toHaveLength(1)
    expect(removed[0]!.id).toBe('c/d')
    const before = removed[0]!.installedAt
    const updated = updateInstalled('c/d')
    expect(updated[0]!.id).toBe('c/d')
    expect(updated[0]!.installedAt >= before).toBe(true)
    expect(a!.id).toBe('a/b')
  })

  it('deriveFromSource accepts owner/repo and github:owner/repo, rejects malformed', () => {
    expect(deriveFromSource('acme/plugin')).toEqual({ id: 'acme/plugin', name: 'plugin' })
    expect(deriveFromSource('github:acme/plugin')).toEqual({ id: 'acme/plugin', name: 'plugin' })
    expect(deriveFromSource('  github:acme/plugin  ')).toEqual({ id: 'acme/plugin', name: 'plugin' })
    expect(deriveFromSource('justaname')).toBeNull()
    expect(deriveFromSource('a/b/c')).toBeNull()
    expect(deriveFromSource('')).toBeNull()
  })
})

describe('MyPlugins', () => {
  function seed(): InstalledEntry[] {
    return addInstalled({ id: 'a/b', name: 'b', source: 'github:a/b', method: 'search' })
  }

  it('shows the empty seat and stores an empty list', () => {
    const onChange = vi.fn()
    render(<MyPlugins t={makeT(zh)} installed={[]} onChange={onChange} />)
    expect(screen.getByText(zh.myPluginsEmpty)).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('lists entries with source, method, and per-entry update/remove buttons', () => {
    const installed = seed()
    render(<MyPlugins t={makeT(zh)} installed={installed} onChange={vi.fn()} />)
    expect(screen.getByText('b')).toBeTruthy()
    expect(screen.getByText('github:a/b')).toBeTruthy()
    expect(screen.getByText(zh.methodSearch, { exact: false })).toBeTruthy()
    expect(screen.getByRole('button', { name: zh.update })).toBeTruthy()
    expect(screen.getByRole('button', { name: zh.remove })).toBeTruthy()
  })

  it('adds a manual plugin from a valid owner/repo via the form', () => {
    const onChange = vi.fn(next => { render(<MyPlugins t={makeT(zh)} installed={next} onChange={onChange} />) })
    const view = render(<MyPlugins t={makeT(zh)} installed={[]} onChange={onChange} />)
    fireEvent.change(view.container.querySelector('input[data-manual-source]')!, { target: { value: 'acme/demo' } })
    fireEvent.click(screen.getByRole('button', { name: zh.addManual }))
    expect(onChange).toHaveBeenCalledTimes(1)
    const next = onChange.mock.calls[0]![0] as InstalledEntry[]
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'acme/demo', name: 'demo', source: 'github:acme/demo', method: 'manual' })
  })

  it('rejects a malformed source with an inline error', () => {
    const onChange = vi.fn()
    const view = render(<MyPlugins t={makeT(zh)} installed={[]} onChange={onChange} />)
    fireEvent.change(view.container.querySelector('input[data-manual-source]')!, { target: { value: 'not-a-repo' } })
    fireEvent.click(screen.getByRole('button', { name: zh.addManual }))
    expect(screen.getByRole('alert').textContent).toBe(zh.sourceInvalid)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('remove and update report the next list through onChange', () => {
    const installed = seed()
    const onChange = vi.fn()
    render(<MyPlugins t={makeT(en)} installed={installed} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: en.remove }))
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0]![0] as InstalledEntry[]).toEqual([])
  })
})
