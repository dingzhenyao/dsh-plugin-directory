/**
 * Preload shim for the vitest runner under the DSH file sandbox (Windows).
 *
 * The sandbox denies child processes that capture piped stdio (named pipes),
 * which vite's Windows realpath probe trips on: on first module resolution it
 * runs `exec("net use")` and its spawn throws EPERM synchronously, failing
 * config bundling and every worker transform. This shim neutralizes that one
 * probe by answering exec-style calls with an error (vite treats a failing
 * probe as "no network drives mapped" and falls back to plain realpath), and
 * it never opens a pipe.
 *
 * Load with `node --require` (or NODE_OPTIONS) ahead of the vitest CLI so the
 * patch is installed before vite resolves anything. Only the exec family is
 * patched; spawn/fork with explicit stdio stay untouched.
 */
'use strict'

const cp = require('node:child_process')

/** Answer every exec-style call as a failed probe without spawning. */
function patch(callbackStyle, sync) {
  return function patchedExec(command, options, callback) {
    if (typeof options === 'function') {
      callback = options
    }
    const error = Object.assign(new Error(`sandbox: ${command} suppressed`), { code: 'EPERM' })
    if (sync) {
      if (callbackStyle) {
        // execFileSync / execSync report failure by throwing.
        throw error
      }
      // Unreachable for sync forms; kept for symmetry.
      return error
    }
    if (callback) {
      queueMicrotask(() => callback(error, '', ''))
      return { on: () => {}, once: () => {}, emit: () => {}, kill: () => {} }
    }
    // Promise-less caller that only wants the ChildProcess handle.
    return { on: () => {}, once: () => {}, emit: () => {}, kill: () => {}, stdout: null, stderr: null }
  }
}

cp.exec = patch(false, false)
cp.execFile = patch(false, false)
cp.execFileSync = patch(true, true)
cp.execSync = patch(true, true)
