/**
 * tsdown build for dsh-plugin-directory. Emits two halves like the reference
 * `ui-settings-plugin-inventory` package: a Node library half (lib/index.js)
 * plus a browser client bundle (lib/client.js) that follows the harness
 * loader protocol — the bundle calls window.__ModuleLoader__.load({id,
 * factory}) and resolves externals through the injected require (loader
 * module table; no globals, no import map). CSS Modules are compiled inline
 * by the virtual-id plugin below: importing `x.module.css` yields the hashed
 * class map, and the css text auto-injects a <style data-plugin="..."> tag at
 * factory execution (the loader removes plugin-owned tags on unload).
 */
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import type { UserConfig } from 'tsdown'

/**
 * Browser platform modules the DSH shell shares into the frozen loader
 * module table (packages/client/web/src/platform.ts). Externals resolve from
 * that table at runtime; anything else is bundled inline.
 */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
] as const

/**
 * Externals resolved from the loader module table: the platform seed entries
 * plus the documented runtime client exemption (the bundle's type-only
 * runtime imports erase, but the table row must stay addressable).
 */
const CLIENT_EXTERNALS: readonly string[] = [...PLATFORM_MODULES, '@deepseek-ai/dsh-client-runtime/client']

const PLUGIN_ID = 'dsh-plugin-directory'

/**
 * Virtual-id wrapper keeping module CSS away from tsdown's own css pipeline
 * (which requires @tsdown/css). The suffix matters: tsdown's guard matches ids
 * ending in `.css`, so the virtual id must not.
 */
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

/** Stable per-file hash (djb2 → hex) used to scope CSS module class names. */
function hash(input: string): string {
  let h = 5381
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h + input.charCodeAt(i)) >>> 0
  }
  return h.toString(16)
}

/** Inline CSS Modules: hashed class map + one injected <style data-plugin> tag per module file. */
function cssModulesPlugin(): Record<string, unknown> {
  return {
    name: 'dsh-css-modules-inline',
    resolveId(source: string, importer: string | undefined) {
      if (!source.endsWith('.module.css')) return null
      const abs = importer !== undefined ? resolve(dirname(importer), source) : source
      return CSS_VIRTUAL_PREFIX + abs + CSS_VIRTUAL_SUFFIX
    },
    async load(this: { addWatchFile: (id: string) => void }, virtualId: string) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      // The virtual id otherwise hides the physical stylesheet from the watch graph.
      this.addWatchFile(fileId)
      const source = await readFile(fileId, 'utf8')
      const scope = hash(fileId)
      const classMap: Record<string, string> = {}
      // Scope every class selector (`.local` → `.<hash>_local`) and record the map.
      const css = source.replace(/\.([A-Za-z_][A-Za-z0-9_-]*)/g, (_match, name: string) => {
        classMap[name] = `${scope}_${name}`
        return `.${scope}_${name}`
      })
      const tagId = `${PLUGIN_ID}/${basename(fileId)}`
      // One <style data-plugin> per module file; idempotent under re-evaluation.
      return [
        `const css = ${JSON.stringify(css)};`,
        `const tagId = ${JSON.stringify(tagId)};`,
        `if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css="' + tagId + '"]') === null) {`,
        `  const tag = document.createElement('style');`,
        `  tag.dataset.plugin = ${JSON.stringify(PLUGIN_ID)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }
}

export default [
  // Node half: the host loader entry (empty host apply).
  {
    name: PLUGIN_ID,
    entry: 'src/index.ts',
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    // Keep the source's `.js` extension (package `type: module`); tsdown's
    // default would force `.mjs` and orphan the declared `main`/`exports`.
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  // Browser half: the client bundle consumed through exports["./client"].
  {
    name: `${PLUGIN_ID}/client`,
    entry: { client: 'src/client/index.ts' },
    // Browser bundle lands next to the node half (single lib/ artifact dir;
    // the entryFileNames pin keeps it exactly lib/client.js). clean must stay
    // off — a default clean would wipe the node-half output emitted above.
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    external: [...CLIENT_EXTERNALS],
    // Browser bundles inline node-idiom deps; the substitutions keep
    // process.env.NODE_ENV / import.meta.env probes from throwing at boot.
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
      'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
    },
    // Only loader-table entries stay external; everything else inlines.
    noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
    plugins: [cssModulesPlugin()],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
] satisfies UserConfig[]
