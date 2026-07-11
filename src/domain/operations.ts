import type { ArchitectureEdge, ArchitectureGraph, ArchitectureNode, PieceKind } from './architecture'

/** The small, renderer-independent language used by the visual editor. */
export type VisualOperation =
  | { type: 'create'; node: ArchitectureNode; index?: number }
  | { type: 'delete'; nodeId: string }
  | { type: 'move'; nodeId: string; x: number; z: number }
  | { type: 'rename'; nodeId: string; name: string; path?: string }
  | { type: 'connect'; edge: ArchitectureEdge }
  | { type: 'disconnect'; edge: ArchitectureEdge }
  | { type: 'batch'; operations: VisualOperation[] }

export interface OperationEnvelope { version: 1; operation: VisualOperation }
export interface OperationResult { graph: ArchitectureGraph; inverse: VisualOperation }

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const edgeKey = (edge: ArchitectureEdge) => `${edge.from}\u0000${edge.to}\u0000${edge.type}`
const node = (graph: ArchitectureGraph, id: string) => graph.nodes.find((item) => item.id === id)

export function validateOperation(operation: VisualOperation, graph?: ArchitectureGraph): string[] {
  const errors: string[] = []
  if (!operation || typeof operation !== 'object' || !operation.type) return ['operation.type is required']
  if (operation.type === 'create') {
    if (!operation.node?.id || !operation.node.path) errors.push('create requires a node id and path')
    if (graph && node(graph, operation.node.id)) errors.push(`node already exists: ${operation.node.id}`)
  }
  if (operation.type === 'delete' || operation.type === 'move' || operation.type === 'rename') {
    const id = operation.nodeId
    if (!id) errors.push(`${operation.type} requires nodeId`)
    if (graph && !node(graph, id)) errors.push(`node not found: ${id}`)
  }
  if (operation.type === 'move' && (!Number.isFinite(operation.x) || !Number.isFinite(operation.z))) errors.push('move coordinates must be finite')
  if (operation.type === 'rename' && !operation.name?.trim()) errors.push('rename requires a non-empty name')
  if (operation.type === 'connect' || operation.type === 'disconnect') {
    if (!operation.edge?.from || !operation.edge.to || operation.edge.from === operation.edge.to) errors.push('edge endpoints must be distinct')
    if (graph && (operation.type === 'connect') && (!node(graph, operation.edge.from) || !node(graph, operation.edge.to))) errors.push('connect endpoints must exist')
  }
  if (operation.type === 'batch') operation.operations.forEach((item) => errors.push(...validateOperation(item, graph)))
  return errors
}

export function applyOperation(input: ArchitectureGraph, operation: VisualOperation): OperationResult {
  const graph = clone(input)
  // Batch operations are validated and applied in sequence so that a later
  // operation may reference a node created by an earlier one (undo of delete).
  if (operation.type === 'batch') {
    let current = graph; const inverses: VisualOperation[] = []
    for (const item of operation.operations) { const result = applyOperation(current, item); current = result.graph; inverses.unshift(result.inverse) }
    return { graph: current, inverse: { type: 'batch', operations: inverses } }
  }
  const errors = validateOperation(operation, graph)
  if (errors.length) throw new Error(`Invalid visual operation: ${errors.join('; ')}`)
  let inverse: VisualOperation
  switch (operation.type) {
    case 'create': { const index = operation.index === undefined ? graph.nodes.length : Math.max(0, Math.min(operation.index, graph.nodes.length)); graph.nodes.splice(index, 0, clone(operation.node)); inverse = { type: 'delete', nodeId: operation.node.id }; break }
    case 'delete': {
      const index = graph.nodes.findIndex((item) => item.id === operation.nodeId); const removed = graph.nodes[index]
      graph.nodes.splice(index, 1); const edges = graph.edges.filter((edge) => edge.from === operation.nodeId || edge.to === operation.nodeId)
      graph.edges = graph.edges.filter((edge) => !edges.some((item) => edgeKey(item) === edgeKey(edge)))
      inverse = { type: 'batch', operations: [{ type: 'create', node: clone(removed), index }, ...edges.map((edge) => ({ type: 'connect', edge: clone(edge) } as VisualOperation))] }
      break
    }
    case 'move': { const target = node(graph, operation.nodeId)!; inverse = { type: 'move', nodeId: target.id, x: target.x, z: target.z }; target.x = operation.x; target.z = operation.z; break }
    case 'rename': { const target = node(graph, operation.nodeId)!; inverse = { type: 'rename', nodeId: target.id, name: target.name, path: target.path }; target.name = operation.name; if (operation.path !== undefined) target.path = operation.path; break }
    case 'connect': graph.edges.push(clone(operation.edge)); inverse = { type: 'disconnect', edge: clone(operation.edge) }; break
    case 'disconnect': { const index = graph.edges.findIndex((edge) => edgeKey(edge) === edgeKey(operation.edge)); if (index < 0) throw new Error('Invalid visual operation: edge not found'); const removed = graph.edges.splice(index, 1)[0]; inverse = { type: 'connect', edge: clone(removed) }; break }
  }
  return { graph, inverse }
}

export function serializeOperation(operation: VisualOperation): string { return JSON.stringify({ version: 1, operation } satisfies OperationEnvelope) }
export function deserializeOperation(value: string): VisualOperation {
  const parsed = JSON.parse(value) as OperationEnvelope
  if (parsed?.version !== 1 || !parsed.operation) throw new Error('Unsupported visual operation version')
  if (validateOperation(parsed.operation).length) throw new Error('Invalid visual operation payload')
  return parsed.operation
}

export function createNode(id: string, path: string, kind: PieceKind = 'module', layer: ArchitectureNode['layer'] = 'infrastructure'): ArchitectureNode {
  return { id, path, name: path.split('/').pop() ?? path, kind, layer, x: 0, z: 0 }
}
