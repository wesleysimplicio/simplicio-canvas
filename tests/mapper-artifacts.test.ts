import { describe, expect, it } from 'vitest'
import { parseMapperFlowArtifact, parseMermaidFlow } from '../src/domain/mapper-artifacts'

describe('simplicio-mapper flow artifacts', () => {
  it('parses Mermaid labels and typed edges without executing content', () => {
    const artifact = parseMermaidFlow('flowchart LR\n  api[API] -->|calls| service((Service))\n  service --> db[(Database)]')
    expect(artifact.format).toBe('simplicio-mapper-flow')
    expect(artifact.nodes.map((node) => node.label)).toEqual(expect.arrayContaining(['API', 'Service', 'Database']))
    expect(artifact.edges).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'calls' }), expect.objectContaining({ from: 'service', to: 'db' })]))
  })
  it('normalizes mapper JSON aliases and rejects empty payloads', () => {
    const artifact = parseMapperFlowArtifact({ vertices: [{ key: 'a', name: 'A' }, { path: 'b.py' }], links: [{ source: 'a', target: 'b.py', type: 'imports' }] })
    expect(artifact.nodes).toHaveLength(2); expect(artifact.edges[0]).toMatchObject({ from: 'a', to: 'b.py', type: 'imports' })
    expect(() => parseMapperFlowArtifact({})).toThrow(/no nodes/i)
  })
  it('accepts nested Mermaid payloads and produces deterministic edge deduplication', () => {
    const artifact = parseMapperFlowArtifact({ mermaid: 'graph TD\nA --> B\nA --> B' })
    expect(artifact.edges).toHaveLength(1); expect(artifact.provenance?.scanner).toBe('simplicio-mapper')
  })
})

