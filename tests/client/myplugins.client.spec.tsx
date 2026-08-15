// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MyPlugins } from '../../src/client/MyPlugins.tsx'
import { en, zh, type DirectoryLocaleKey } from '../../src/client/locales.ts'
import type { InstalledEntry } from '../../src/data/installed-types.ts'

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

function entry(overrides: Partial<InstalledEntry> = {}): InstalledEntry {
  return {
    id: 'a/b',
    name: 'b',
    source: 'github:a/b',
    installedAt: '2026-08-15T00:00:00.000Z',
    method: 'search',
    ...overrides,
  }
}

describe('MyPlugins', () => {
  it('shows the empty seat when there are no entries', () => {
    render(<MyPlugins t={makeT(zh)} installed={[]} status="ready" onAdd={vi.fn()} onRemove={vi.fn()} onUpdate={vi.fn()} />)
    expect(screen.getByText(zh.myPluginsEmpty)).toBeTruthy()
  })

  it('lists entries with source, method, and per-entry update/remove buttons', () => {
    render(<MyPlugins t={makeT(zh)} installed={[entry()]} status="ready" onAdd={vi.fn()} onRemove={vi.fn()} onUpdate={vi.fn()} />)
    expect(screen.getByText('b')).toBeTruthy()
    expect(screen.getByText('github:a/b')).toBeTruthy()
    expect(screen.getByText(zh.methodSearch, { exact: false })).toBeTruthy()
    expect(screen.getByRole('button', { name: zh.update })).toBeTruthy()
    expect(screen.getByRole('button', { name: zh.remove })).toBeTruthy()
  })

  it('calls onAdd with a validated manual entry derived from owner/repo', () => {
    const onAdd = vi.fn()
    const view = render(<MyPlugins t={makeT(zh)} installed={[]} status="ready" onAdd={onAdd} onRemove={vi.fn()} onUpdate={vi.fn()} />)
    fireEvent.change(view.container.querySelector('input[data-manual-source]')!, { target: { value: 'acme/demo' } })
    fireEvent.click(screen.getByRole('button', { name: zh.addManual }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith({ id: 'acme/demo', name: 'demo', source: 'acme/demo', method: 'manual' })
  })

  it('rejects a malformed source with an inline error and does not call onAdd', () => {
    const onAdd = vi.fn()
    const view = render(<MyPlugins t={makeT(zh)} installed={[]} status="ready" onAdd={onAdd} onRemove={vi.fn()} onUpdate={vi.fn()} />)
    fireEvent.change(view.container.querySelector('input[data-manual-source]')!, { target: { value: 'not-a-repo' } })
    fireEvent.click(screen.getByRole('button', { name: zh.addManual }))
    expect(screen.getByRole('alert').textContent).toBe(zh.sourceInvalid)
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('forwards update and remove clicks to the tab callbacks', () => {
    const onUpdate = vi.fn()
    const onRemove = vi.fn()
    render(<MyPlugins t={makeT(en)} installed={[entry()]} status="ready" onAdd={vi.fn()} onRemove={onRemove} onUpdate={onUpdate} />)
    fireEvent.click(screen.getByRole('button', { name: en.update }))
    fireEvent.click(screen.getByRole('button', { name: en.remove }))
    expect(onUpdate).toHaveBeenCalledWith('a/b')
    expect(onRemove).toHaveBeenCalledWith('a/b')
  })
})
