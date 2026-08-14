import type { InstallForm, InstallInfo } from './types.ts'

export interface PackageManifest {
  name?: string
  dsh?: { bundle?: unknown; client?: unknown }
}

/**
 * Derived install command for a repo id and form. `bundle`/`client` use the
 * npm package name when known; `repo` is `github:<id>&path:/.dsh-plugin` (the
 * `#<ref>` fragment is only known from the README, so derivation omits it);
 * `unknown` falls back to `github:<id>`.
 */
function derivedCommand(form: InstallForm, id: string, packageName?: string): string {
  switch (form) {
    case 'bundle':
    case 'client':
      return packageName ? `dsh plugin add ${packageName}` : `dsh plugin add github:${id}`
    case 'repo':
      return `dsh plugin add github:${id}&path:/.dsh-plugin`
    case 'unknown':
      return `dsh plugin add github:${id}`
  }
}

/** Install-form detection: `dsh.client` > `dsh.bundle` > `.dsh-plugin` dir > unknown. */
export function normalizeForm(pkg: PackageManifest, hasDsPlugin: boolean): InstallForm {
  if (pkg.dsh?.client !== undefined) return 'client'
  if (pkg.dsh?.bundle !== undefined) return 'bundle'
  if (hasDsPlugin) return 'repo'
  return 'unknown'
}

/**
 * Install info derived from `package.json` alone (no `.dsh-plugin` signal
 * exists in the manifest, so the reachable forms are bundle/client/unknown).
 */
export function installFromPackageJson(pkg: PackageManifest, id: string): InstallInfo {
  const form = normalizeForm(pkg, false)
  const info: InstallInfo = { form, command: derivedCommand(form, id, pkg.name), source: 'derived' }
  if ((form === 'bundle' || form === 'client') && pkg.name) {
    info.packageName = pkg.name
  }
  return info
}

/**
 * Matches a `dsh plugin add <target>` invocation, optionally prefixed by
 * `pnpm ` and/or a `--profile <name>` flag. Capture group 1 is the single
 * whitespace-free install target (npm package name, `github:owner/repo`, or a
 * `.dsh-plugin` repo reference).
 */
const DSH_ADD_RE = /(?:pnpm\s+)?dsh\s+plugin(?:\s+--profile\s+\S+)?\s+add\s+(\S+)/

/**
 * Matches a bare `.dsh-plugin` repository install reference (the config.yaml
 * style some repo plugins document, e.g.
 * `github:owner/repo#ref&path:/.dsh-plugin`).
 */
const DSH_PLUGIN_REF_RE = /(github:[^\s`"'()]+&path:\/\.dsh-plugin)/

/** Trailing quote/punctuation that may wrap a command in prose (e.g. "my-plugin`."). */
const COMMAND_TRAIL_RE = /[`.,;:)\]}>]+$/

/**
 * Extracts a real `dsh` install command from one README line, or `null` when
 * the line only mentions the command in prose. Accepts:
 *   - `dsh plugin add <target>`
 *   - `dsh plugin --profile <name> add <target>`
 *   - `pnpm dsh plugin [--profile <name>] add <target>`
 *   - a bare `github:...&path:/.dsh-plugin` reference
 * A real invocation has exactly one whitespace-free target token; prose like
 * "via `dsh plugin add` (each declares ...)" has no target and is rejected.
 */
function readmeCommand(line: string): string | null {
  const add = line.match(DSH_ADD_RE)
  if (add?.[1]) {
    const target = add[1].replace(COMMAND_TRAIL_RE, '')
    if (target !== '') return `dsh plugin add ${target}`
  }
  const ref = line.match(DSH_PLUGIN_REF_RE)
  if (ref?.[1]) return `dsh plugin add ${ref[1]}`
  return null
}

/**
 * Install info extracted from a plugin's own README: the first real `dsh
 * plugin add <target>` line becomes `command` with the whole line as `snippet`
 * and source `'readme'`. When the README has no such command, fall back to the
 * derived command for `form` with source `'derived'`.
 */
export function installFromReadme(readme: string, id: string, form: InstallForm): InstallInfo {
  for (const line of readme.split(/\r?\n/)) {
    const command = readmeCommand(line)
    if (command !== null) {
      return { form, command, source: 'readme', snippet: line }
    }
  }
  return { form, command: derivedCommand(form, id), source: 'derived' }
}
