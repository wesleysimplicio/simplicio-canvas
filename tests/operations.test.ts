import { describe, expect, it } from 'vitest'
import { applyOperation, createNode, deserializeOperation, serializeOperation, validateOperation } from '../src/domain/operations'
import type { ArchitectureGraph } from '../src/domain/architecture'

const graph: ArchitectureGraph = { nodes: [createNode('a', 'src/a.ts'), createNode('b', 'src/b.ts')], edges: [] }
describe('typed visual operations', () => {
  it('serializes and applies reversible move/rename/connect operations', () => {
    const move = deserializeOperation(serializeOperation({ type: 'move', nodeId: 'a', x: 4, z: 5 }))
    const moved = applyOperation(graph, move); expect(moved.graph.nodes[0].x).toBe(4)
    const renamed = applyOperation(moved.graph, { type: 'rename', nodeId: 'a', name: 'newA' }); expect(renamed.graph.nodes[0].name).toBe('newA')
    const connected = applyOperation(renamed.graph, { type: 'connect', edge: { from: 'a', to: 'b', type: 'depends' } }); expect(connected.graph.edges).toHaveLength(1)
    expect(applyOperation(connected.graph, connected.inverse).graph.edges).toHaveLength(0)
  })
  it('deleting a node and applying its inverse restores incident edges exactly', () => {
    const connected = applyOperation(graph, { type: 'connect', edge: { from: 'a', to: 'b', type: 'depends' } })
    const deleted = applyOperation(connected.graph, { type: 'delete', nodeId: 'a' }); expect(deleted.graph.nodes).toHaveLength(1)
    expect(applyOperation(deleted.graph, deleted.inverse).graph).toEqual(connected.graph)
  })
  it('rejects invalid operations', () => { expect(validateOperation({ type: 'move', nodeId: 'missing', x: 1, z: 1 }, graph)).toContain('node not found: missing') })
})
