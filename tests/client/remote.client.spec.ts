import { describe, expect, it } from 'vitest'
import { TYPERT_REMOTE } from '../../src/client/remote.ts'

/** Narrow a codec to its strict (zod-backed) form. */
function strictSchema(codec: { mode: 'strict'; typeSymbol: string; schema: { parse: (value: unknown) => unknown } } | { mode: 'src-json' }) {
  if (codec.mode !== 'strict') throw new Error('expected a strict codec')
  return codec.schema
}

describe('TYPERT_REMOTE contribution', () => {
  it('declares four direct descriptors under the pluginManager namespace', () => {
    expect(TYPERT_REMOTE.package).toBe('dsh-plugin-directory')
    expect(TYPERT_REMOTE.descriptors.map(descriptor => descriptor.method).sort()).toEqual(
      ['add', 'delete', 'list', 'update'],
    )
    for (const descriptor of TYPERT_REMOTE.descriptors) {
      expect(descriptor.namespace).toBe('pluginManager')
      expect(descriptor.service).toBe('pluginManager')
      expect(descriptor.invocation).toEqual({ kind: 'direct' })
    }
  })

  it('uses strict codecs with zod schemas on every parameter and result', () => {
    for (const descriptor of TYPERT_REMOTE.descriptors) {
      expect(descriptor.result.mode).toBe('strict')
      for (const parameter of descriptor.parameters) {
        expect(parameter.codec.mode).toBe('strict')
        expect(typeof strictSchema(parameter.codec).parse).toBe('function')
      }
    }
  })

  it('parses a valid InstalledEntry list and rejects a malformed one', () => {
    const list = TYPERT_REMOTE.descriptors.find(descriptor => descriptor.method === 'list')!
    const schema = strictSchema(list.result)
    const ok = [{ id: 'a/b', name: 'b', source: 'github:a/b', installedAt: '2026-08-15T00:00:00.000Z', method: 'search' }]
    expect(() => schema.parse(ok)).not.toThrow()
    expect(() => schema.parse([{ id: 'a/b', name: 'b' }])).toThrow()
  })

  it('parses the add payload schema and rejects an invalid method', () => {
    const add = TYPERT_REMOTE.descriptors.find(descriptor => descriptor.method === 'add')!
    const input = add.parameters[0]!
    expect(input.wire).toBe('input')
    const schema = strictSchema(input.codec)
    expect(() => schema.parse({ id: 'a/b', name: 'b', source: 'github:a/b', method: 'manual' })).not.toThrow()
    expect(() => schema.parse({ id: 'a/b', name: 'b', source: 'github:a/b', method: 'nope' })).toThrow()
  })
})
