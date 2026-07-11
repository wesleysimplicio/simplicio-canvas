import { describe, expect, it } from 'vitest'
import { assertPrivateSnapshot, exportSnapshot } from '../src/domain/snapshot'
import { createCanonicalGraph } from '../src/domain/graph-schema'

describe('privacy command gate', () => {
  it('keeps source bodies out of exported graph envelopes', () => {
    const graph = createCanonicalGraph({ project: { id: 'p', name: 'demo' }, nodes: [{ id: 'f', kind: 'file', name: 'main.ts', path: 'src/main.ts' }], edges: [], provenance: { source: 'local', generatedAt: '2026-01-01' }, evidence: [] })
    const raw = exportSnapshot(graph)
    expect(raw).not.toContain('password'); expect(raw).not.toContain('apiKey'); expect(() => assertPrivateSnapshot(JSON.parse(raw))).not.toThrow()
  })
  it('rejects credentials and private machine paths before export leaves the browser', () => {
    const base = createCanonicalGraph({ project: { id: 'p', name: 'demo' }, nodes: [], edges: [], provenance: { source: 'local', generatedAt: '2026-01-01' }, evidence: [] })
    expect(() => assertPrivateSnapshot({ format: 'simplicio-canvas-snapshot', version: 1, exportedAt: '2026-01-01', provenance: base.provenance, graph: { ...base, project: { id: 'p', name: 'apiKey' } } })).toThrow(/secret/i)
  })
})
