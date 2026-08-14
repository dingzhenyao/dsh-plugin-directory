import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Worker threads (no fork IPC / named pipes) keep the runner working
    // under the DSH file sandbox; `scripts/vitest-sandbox.cjs` preloads the
    // exec probe neutralizer (see that file).
    pool: 'threads',
    include: ['tests/**/*.spec.{ts,tsx}'],
    // CSS Modules resolve to their authored class names (the client
    // component tests assert rendered output, not hashed class identities).
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
})
