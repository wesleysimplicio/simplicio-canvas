import { describe, expect, it } from 'vitest'
import { adapterFor, adapters, generateFiles } from '../src/domain/generators'
import type { ArchitectureGraph, ArchitectureNode } from '../src/domain/architecture'
import type { VisualOperation } from '../src/domain/operations'

function node(overrides: Partial<ArchitectureNode> = {}): ArchitectureNode {
  return { id: 'n1', path: 'domain/Widget.ts', name: 'Widget', layer: 'domain', kind: 'entity', x: 0, z: 0, ...overrides }
}

describe('code generators', () => {
  it('exposes a Python and TypeScript adapter by language name', () => {
    expect(adapters.Python.language).toBe('Python')
    expect(adapters.TypeScript.language).toBe('TypeScript')
    expect(adapterFor('Python').language).toBe('Python')
    expect(adapterFor('TypeScript').language).toBe('TypeScript')
    expect(adapterFor('Unknown').language).toBe('TypeScript')
  })

  it('generates a TypeScript class file for a create operation', () => {
    const graph: ArchitectureGraph = { nodes: [], edges: [] }
    const operations: VisualOperation[] = [{ type: 'create', node: node() }]
    const files = generateFiles(graph, operations, 'TypeScript')
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('domain/Widget.ts')
    expect(files[0].content).toContain('export class Widget {}')
  })

  it('generates a Python class file for a create operation', () => {
    const graph: ArchitectureGraph = { nodes: [], edges: [] }
    const operations: VisualOperation[] = [{ type: 'create', node: node({ path: 'domain/widget.py' }) }]
    const files = generateFiles(graph, operations, 'Python')
    expect(files[0].content).toContain('class Widget:')
  })

  it('sanitizes non-identifier characters out of generated class names', () => {
    const graph: ArchitectureGraph = { nodes: [], edges: [] }
    const operations: VisualOperation[] = [{ type: 'create', node: node({ name: 'My-Widget!' }) }]
    const files = generateFiles(graph, operations, 'TypeScript')
    expect(files[0].content).toContain('export class MyWidget {}')
  })

  it('falls back to GeneratedPiece when the sanitized name is empty', () => {
    const graph: ArchitectureGraph = { nodes: [], edges: [] }
    const operations: VisualOperation[] = [{ type: 'create', node: node({ name: '***' }) }]
    const files = generateFiles(graph, operations, 'TypeScript')
    expect(files[0].content).toContain('export class GeneratedPiece {}')
  })

  it('applies a rename operation on top of an existing generated file', () => {
    const graph: ArchitectureGraph = { nodes: [node()], edges: [] }
    const operations: VisualOperation[] = [
      { type: 'create', node: node() },
      { type: 'rename', nodeId: 'n1', name: 'Gadget' },
    ]
    const files = generateFiles(graph, operations, 'TypeScript')
    expect(files[0].content).toContain('export class Gadget {}')
  })

  it('wires a connect operation into an import statement for both languages', () => {
    const target = node({ id: 'target', path: 'domain/Target.ts', name: 'Target' })
    const source = node({ id: 'source', path: 'domain/Source.ts', name: 'Source' })
    const graph: ArchitectureGraph = { nodes: [target, source], edges: [] }
    const operations: VisualOperation[] = [
      { type: 'create', node: target },
      { type: 'connect', edge: { from: 'source', to: 'target', type: 'depends' } },
    ]
    const files = generateFiles(graph, operations, 'TypeScript')
    const targetFile = files.find((file) => file.path === 'domain/Target.ts')!
    expect(targetFile.content).toContain("import Source from './domain/Source'")
  })

  it('flattens batch operations before generating files', () => {
    const graph: ArchitectureGraph = { nodes: [node()], edges: [] }
    const operations: VisualOperation[] = [
      { type: 'batch', operations: [{ type: 'create', node: node() }, { type: 'rename', nodeId: 'n1', name: 'Renamed' }] },
    ]
    const files = generateFiles(graph, operations, 'TypeScript')
    expect(files).toHaveLength(1)
    expect(files[0].content).toContain('export class Renamed {}')
  })

  it('returns generated files sorted by path', () => {
    const graph: ArchitectureGraph = { nodes: [], edges: [] }
    const operations: VisualOperation[] = [
      { type: 'create', node: node({ path: 'domain/Z.ts', name: 'Z' }) },
      { type: 'create', node: node({ path: 'domain/A.ts', name: 'A' }) },
    ]
    const files = generateFiles(graph, operations, 'TypeScript')
    expect(files.map((file) => file.path)).toEqual(['domain/A.ts', 'domain/Z.ts'])
  })
})
