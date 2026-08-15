import { describe, expect, it } from 'vitest'
import {
  installFromPackageJson,
  installFromReadme,
  normalizeForm,
} from '../../src/data/inspect.ts'
import type { PackageManifest } from '../../src/data/inspect.ts'

describe('normalizeForm', () => {
  it('maps dsh.client to client form', () => {
    expect(normalizeForm({ dsh: { client: {} } }, false)).toBe('client')
  })

  it('maps dsh.bundle to bundle form', () => {
    expect(normalizeForm({ dsh: { bundle: {} } }, false)).toBe('bundle')
  })

  it('maps hasDsPlugin to repo form when no dsh keys are present', () => {
    expect(normalizeForm({}, true)).toBe('repo')
  })

  it('maps neither signal to unknown', () => {
    expect(normalizeForm({}, false)).toBe('unknown')
  })

  it('prefers client over bundle when both are declared', () => {
    expect(normalizeForm({ dsh: { bundle: {}, client: {} } }, true)).toBe('client')
  })
})

describe('installFromPackageJson', () => {
  it('derives `dsh plugin add <name>` from pkg.name for a bundle', () => {
    const pkg: PackageManifest = { name: 'dsh-plugin-x', dsh: { bundle: { patch: './cordis.patch.yml' } } }
    const info = installFromPackageJson(pkg, 'a/b')
    expect(info.form).toBe('bundle')
    expect(info.command).toBe('dsh plugin add dsh-plugin-x')
    expect(info.source).toBe('derived')
    expect(info.packageName).toBe('dsh-plugin-x')
    expect(info.command).not.toBeNull()
  })

  it('falls back to `dsh plugin add github:<id>` when a bundle/client has no name', () => {
    const info = installFromPackageJson({ dsh: { client: {} } }, 'a/b')
    expect(info.form).toBe('client')
    expect(info.command).toBe('dsh plugin add github:a/b')
    expect(info.source).toBe('derived')
  })

  it('uses `dsh plugin add github:<id>` for the unknown form', () => {
    const info = installFromPackageJson({}, 'a/b')
    expect(info.form).toBe('unknown')
    expect(info.command).toBe('dsh plugin add github:a/b')
    expect(info.source).toBe('derived')
  })
})

describe('installFromReadme', () => {
  const readme = [
    '# My plugin',
    '',
    'Install:',
    '- dsh plugin add github:a/b#main&path:/.dsh-plugin',
    '',
  ].join('\n')

  it('extracts the first `dsh plugin add` command with readme source and the line as snippet', () => {
    const info = installFromReadme(readme, 'a/b', 'repo')
    expect(info.command).toBe('dsh plugin add github:a/b#main&path:/.dsh-plugin')
    expect(info.source).toBe('readme')
    expect(info.snippet).toBe('- dsh plugin add github:a/b#main&path:/.dsh-plugin')
  })

  it('extracts only the first command when several exist', () => {
    const two = 'npm i x\n\ndsh plugin add github:c/d\n\nAlso see: dsh plugin add github:e/f'
    const info = installFromReadme(two, 'c/d', 'unknown')
    expect(info.command).toBe('dsh plugin add github:c/d')
    expect(info.snippet).toBe('dsh plugin add github:c/d')
  })

  it('falls back to the derived repo command with derived source when the README has none', () => {
    const info = installFromReadme('no install instructions here', 'a/b', 'repo')
    expect(info.form).toBe('repo')
    expect(info.command).toBe('dsh plugin add github:a/b&path:/.dsh-plugin')
    expect(info.source).toBe('derived')
  })

  it('falls back to `dsh plugin add github:<id>` for the unknown form', () => {
    const info = installFromReadme('nothing here', 'a/b', 'unknown')
    expect(info.form).toBe('unknown')
    expect(info.command).toBe('dsh plugin add github:a/b')
    expect(info.source).toBe('derived')
  })

  it('ignores prose that merely mentions `dsh plugin add` and falls back to derived', () => {
    const prose =
      'This list collects community plugins that are installable via `dsh plugin add` (each declares a `dsh.bundle` manifest).'
    const info = installFromReadme(prose, 'a/b', 'unknown')
    expect(info.source).toBe('derived')
    expect(info.command).toBe('dsh plugin add github:a/b')
  })

  it('trims quote/punctuation wrapping around a real command', () => {
    const info = installFromReadme('Install with `dsh plugin add @scope/pkg`.', 'a/b', 'client')
    expect(info.command).toBe('dsh plugin add @scope/pkg')
    expect(info.source).toBe('readme')
  })

  it('extracts a `--profile` invocation and preserves the profile', () => {
    const info = installFromReadme('dsh plugin --profile web add @scope/foo', 'a/b', 'bundle')
    expect(info.command).toBe('dsh plugin --profile web add @scope/foo')
    expect(info.source).toBe('readme')
  })

  it('extracts a `pnpm dsh plugin add` source invocation', () => {
    const info = installFromReadme('pnpm dsh plugin add github:a/b', 'a/b', 'unknown')
    expect(info.command).toBe('dsh plugin add github:a/b')
    expect(info.source).toBe('readme')
  })

  it('extracts a `pnpm dsh plugin --profile ... add` invocation and preserves the profile', () => {
    const info = installFromReadme('pnpm dsh plugin --profile web add @scope/foo', 'a/b', 'bundle')
    expect(info.command).toBe('dsh plugin --profile web add @scope/foo')
    expect(info.source).toBe('readme')
  })

  it('extracts an npx `@deepseek-ai/dsh plugin add` invocation without --profile', () => {
    const info = installFromReadme('npx -y @deepseek-ai/dsh plugin add @scope/foo', 'a/b', 'client')
    expect(info.command).toBe('dsh plugin add @scope/foo')
    expect(info.source).toBe('readme')
  })

  it('extracts a bare `.dsh-plugin` repository reference', () => {
    const info = installFromReadme('config.yaml: github:owner/repo#main&path:/.dsh-plugin', 'owner/repo', 'repo')
    expect(info.command).toBe('dsh plugin add github:owner/repo#main&path:/.dsh-plugin')
    expect(info.source).toBe('readme')
  })
})
