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

/** Matches a `dsh plugin add ...` command up to the end of its line. */
const README_COMMAND_RE = /dsh plugin add[^\r\n]*/

/**
 * Install info extracted from a plugin's own README: the first `dsh plugin
 * add ...` line becomes `command` (matched to end of line) with the whole line
 * as `snippet` and source `'readme'`. When the README has no such command,
 * fall back to the derived command for `form` with source `'derived'`.
 */
export function installFromReadme(readme: string, id: string, form: InstallForm): InstallInfo {
  for (const line of readme.split(/\r?\n/)) {
    const match = line.match(README_COMMAND_RE)
    if (match?.[0]) {
      return { form, command: match[0], source: 'readme', snippet: line }
    }
  }
  return { form, command: derivedCommand(form, id), source: 'derived' }
}
