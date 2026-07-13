import { describe, expect, it } from 'vitest'
import { isEcosystemGraph, isRepositoryOpenable, parseEcosystemGraph, toWorkspaceManifest } from '../src/domain/ecosystem-graph'

const GENERIC_FIXTURE = {
  format: 'simplicio.ecosystem-graph', version: 1,
  boundaries: ['no runtime authority granted by import'],
  repositories: [
    { id: 'canvas', name: 'simplicio-canvas', url: 'https://github.com/wesleysimplicio/simplicio-canvas', revision: 'abc123', branch: 'main', dirty: false, access: 'available', role: 'renderer', language: 'TypeScript' },
    { id: 'mapper', name: 'simplicio-mapper', url: 'https://github.com/wesleysimplicio/simplicio-mapper', revision: 'def456', access: 'private', role: 'producer', language: 'Python', status: 'draft' },
  ],
  edges: [
    { id: 'canvas-mapper', from: 'canvas', to: 'mapper', type: 'feeds', label: 'ecosystem graph import', evidence: [{ kind: 'CI', url: 'https://github.com/wesleysimplicio/simplicio-mapper/actions', revision: 'def456', status: 'pass' }] },
  ],
}

const ASOLARIA_FIXTURE = {
  format: 'simplicio.ecosystem-graph', version: 1,
  boundaries: ['metadata-only fixture', 'no repository source redistributed', 'no operator or device authority'],
  repositories: [
    { id: 'canvas', name: 'simplicio-canvas', url: 'https://github.com/wesleysimplicio/simplicio-canvas', revision: 'canvas-rev', branch: 'main', dirty: false, access: 'available', role: 'renderer', language: 'TypeScript', status: 'active' },
    { id: 'mapper', name: 'simplicio-mapper', url: 'https://github.com/wesleysimplicio/simplicio-mapper', revision: 'mapper-rev', access: 'private', role: 'producer', language: 'Python', status: 'draft' },
    { id: 'loop', name: 'simplicio-loop', url: 'https://github.com/wesleysimplicio/simplicio-loop', revision: 'loop-rev', access: 'available', role: 'orchestrator', language: 'Python' },
    { id: 'runtime', name: 'simplicio-runtime', url: 'https://github.com/wesleysimplicio/simplicio-runtime', revision: 'unavailable', access: 'missing', role: 'runtime', language: 'Rust' },
    { id: 'asolaria', name: 'asolaria', url: 'https://example.org/asolaria-public', revision: 'asolaria-rev', access: 'denied', role: 'research-fixture', status: 'metadata-only' },
  ],
  edges: [
    { id: 'canvas-mapper', from: 'canvas', to: 'mapper', type: 'imports-byte-identical', evidence: [{ kind: 'CI', status: 'pass', revision: 'mapper-rev' }] },
    { id: 'mapper-asolaria', from: 'mapper', to: 'asolaria', type: 'curates-in', evidence: [{ kind: 'documentation', url: 'https://example.org/asolaria-public/docs' }] },
    { id: 'loop-runtime', from: 'loop', to: 'runtime', type: 'routes-to', evidence: [{ kind: 'receipt', status: 'unverifiable', revision: 'unavailable' }] },
    { id: 'asolaria-canvas', from: 'asolaria', to: 'canvas', type: 'motivates', evidence: [{ kind: 'paper', url: 'https://example.org/paper' }] },
  ],
}

describe('simplicio.ecosystem-graph/v1', () => {
  it('detects the format without parsing', () => {
    expect(isEcosystemGraph(GENERIC_FIXTURE)).toBe(true)
    expect(isEcosystemGraph({ format: 'simplicio-mapper-flow' })).toBe(false)
    expect(isEcosystemGraph(null)).toBe(false)
  })

  it('parses a generic fixture, preserving repository and edge fields', () => {
    const graph = parseEcosystemGraph(GENERIC_FIXTURE)
    expect(graph.repositories).toHaveLength(2)
    expect(graph.repositories[0]).toMatchObject({ id: 'canvas', url: GENERIC_FIXTURE.repositories[0].url, revision: 'abc123', access: 'available' })
    expect(graph.edges[0]).toMatchObject({ type: 'feeds', from: 'canvas', to: 'mapper' })
    expect(graph.edges[0].evidence?.[0]).toMatchObject({ kind: 'CI', status: 'pass' })
    expect(graph.boundaries).toEqual(GENERIC_FIXTURE.boundaries)
  })

  it('parses the larger Asolaria-style fixture and preserves typed edges plus evidence classes', () => {
    const graph = parseEcosystemGraph(ASOLARIA_FIXTURE)
    expect(graph.repositories).toHaveLength(5)
    expect(graph.edges.map((edge) => edge.type)).toEqual(expect.arrayContaining(['imports-byte-identical', 'curates-in', 'routes-to', 'motivates']))
    const evidenceKinds = graph.edges.flatMap((edge) => edge.evidence?.map((item) => item.kind) ?? [])
    expect(evidenceKinds).toEqual(expect.arrayContaining(['CI', 'documentation', 'receipt', 'paper']))
  })

  it('keeps private, denied and missing repositories visible but non-openable', () => {
    const graph = parseEcosystemGraph(ASOLARIA_FIXTURE)
    const runtime = graph.repositories.find((repo) => repo.id === 'runtime')!
    const mapper = graph.repositories.find((repo) => repo.id === 'mapper')!
    expect(isRepositoryOpenable(runtime)).toBe(false)
    expect(isRepositoryOpenable(mapper)).toBe(false)
    expect(isRepositoryOpenable(graph.repositories.find((repo) => repo.id === 'canvas')!)).toBe(true)
  })

  it('rejects duplicate repository ids', () => {
    const broken = { ...GENERIC_FIXTURE, repositories: [...GENERIC_FIXTURE.repositories, GENERIC_FIXTURE.repositories[0]] }
    expect(() => parseEcosystemGraph(broken)).toThrow(/duplicate repository id/)
  })

  it('rejects duplicate edge ids', () => {
    const broken = { ...GENERIC_FIXTURE, edges: [...GENERIC_FIXTURE.edges, GENERIC_FIXTURE.edges[0]] }
    expect(() => parseEcosystemGraph(broken)).toThrow(/duplicate edge id/)
  })

  it('rejects edges referencing unknown repository endpoints', () => {
    const broken = { ...GENERIC_FIXTURE, edges: [{ id: 'ghost', from: 'canvas', to: 'nonexistent', type: 'feeds' }] }
    expect(() => parseEcosystemGraph(broken)).toThrow(/unknown repository/)
  })

  it('rejects unsupported formats and versions', () => {
    expect(() => parseEcosystemGraph({ format: 'other', version: 1, repositories: [] })).toThrow(/Unsupported ecosystem graph format/)
    expect(() => parseEcosystemGraph({ format: 'simplicio.ecosystem-graph', version: 2, repositories: [] })).toThrow(/Unsupported ecosystem graph version/)
  })

  it('projects onto the workspace manifest used by the landscape HUD', () => {
    const manifest = toWorkspaceManifest(parseEcosystemGraph(ASOLARIA_FIXTURE))
    expect(manifest.repositories).toHaveLength(5)
    expect(manifest.repositories.find((repo) => repo.id === 'mapper')?.access).toBe('denied')
    expect(manifest.edges.find((edge) => edge.id === 'canvas-mapper')?.type).toBe('imports-byte-identical')
    expect(manifest.boundaries).toEqual(ASOLARIA_FIXTURE.boundaries)
  })
})
