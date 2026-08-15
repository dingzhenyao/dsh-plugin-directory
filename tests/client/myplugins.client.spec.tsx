// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MyPlugins } from '../../src/client/MyPlugins.tsx'
import { en, zh, type DirectoryLocaleKey } from '../../src/client/locales.ts'
import type { InstalledEntry, RealInstallStatus } from '../../src/data/installed-types.ts'

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

/** Minimal required prop bundle for a presentational render. */
function props(overrides: Partial<MyPluginsProps> = {}): MyPluginsProps {
  return {
    t: makeT(zh),
    installed: [],
    status: 'ready',
    statuses: new Map(),
    inventoryStatus: 'ready',
    onSync: vi.fn(),
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    onUpdate: vi.fn(),
    ...overrides,
  }
}

describe('MyPlugins', () => {
  it('shows the empty seat when there are no entries', () => {
    render(<MyPlugins {...props()} />)
    expect(screen.getByText(zh.myPluginsEmpty)).toBeTruthy()
  })

  it('lists entries with source, method, and per-entry update/remove buttons', () => {
    render(<MyPlugins {...props({ installed: [entry()] })} />)
    expect(screen.getByText('b')).toBeTruthy()
    expect(screen.getByText('github:a/b')).toBeTruthy()
    expect(screen.getByText(zh.methodSearch, { exact: false })).toBeTruthy()
    expect(screen.getByRole('button', { name: zh.update })).toBeTruthy()
    expect(screen.getByRole('button', { name: zh.remove })).toBeTruthy()
  })

  it('calls onAdd with a validated manual entry derived from owner/repo', () => {
    const onAdd = vi.fn()
    const view = render(<MyPlugins {...props({ onAdd })} />)
    fireEvent.change(view.container.querySelector('input[data-manual-source]')!, { target: { value: 'acme/demo' } })
    fireEvent.click(screen.getByRole('button', { name: zh.addManual }))
    expect(onAdd).toHaveBeenCalledTimes(1)
    expect(onAdd).toHaveBeenCalledWith({ id: 'acme/demo', name: 'demo', source: 'acme/demo', method: 'manual' })
  })

  it('rejects a malformed source with an inline error and does not call onAdd', () => {
    const onAdd = vi.fn()
    const view = render(<MyPlugins {...props({ onAdd })} />)
    fireEvent.change(view.container.querySelector('input[data-manual-source]')!, { target: { value: 'not-a-repo' } })
    fireEvent.click(screen.getByRole('button', { name: zh.addManual }))
    expect(screen.getByRole('alert').textContent).toBe(zh.sourceInvalid)
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('forwards update and remove clicks to the tab callbacks', () => {
    const onUpdate = vi.fn()
    const onRemove = vi.fn()
    render(<MyPlugins {...props({ installed: [entry()], t: makeT(en), onRemove, onUpdate })} />)
    fireEvent.click(screen.getByRole('button', { name: en.update }))
    fireEvent.click(screen.getByRole('button', { name: en.remove }))
    expect(onUpdate).toHaveBeenCalledWith('a/b')
    expect(onRemove).toHaveBeenCalledWith('a/b')
  })

  it('renders a status badge per entry from the statuses map', () => {
    const installed: RealInstallStatus = { kind: 'installed', enabled: true, phase: 'active' }
    const view = render(<MyPlugins {...props({ installed: [entry()], statuses: new Map([['a/b', installed]]) })} />)
    const badge = view.container.querySelector('[data-install-status]')
    expect(badge?.getAttribute('data-install-status')).toBe('installed')
    expect(badge?.textContent).toBe(zh.statusInstalled)
  })

  it('renders not-installed / unknown / disabled badges correctly', () => {
    const statuses = new Map<string, RealInstallStatus>([
      ['a/b', { kind: 'installed', enabled: false, phase: null }],
      ['c/d', { kind: 'not-installed' }],
      ['e/f', { kind: 'unknown' }],
    ])
    const view = render(<MyPlugins {...props({
      installed: [entry(), entry({ id: 'c/d', name: 'd', source: 'github:c/d' }), entry({ id: 'e/f', name: 'f', source: 'github:e/f' })],
      statuses,
    })} />)
    const badges = [...view.container.querySelectorAll('[data-install-status]')]
      .map(el => [el.getAttribute('data-install-status'), el.textContent] as const)
    expect(badges).toEqual([
      ['disabled', zh.statusDisabled],
      ['not-installed', zh.statusNotInstalled],
      ['unknown', zh.statusUnknown],
    ])
  })

  it('calls onSync when the sync button is clicked', () => {
    const onSync = vi.fn()
    render(<MyPlugins {...props({ onSync })} />)
    fireEvent.click(screen.getByRole('button', { name: zh.syncStatus }))
    expect(onSync).toHaveBeenCalledTimes(1)
  })
})
