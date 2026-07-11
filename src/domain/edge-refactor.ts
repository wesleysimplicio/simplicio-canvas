import type { ArchitectureEdge, ArchitectureGraph } from './architecture'
import type { VisualOperation } from './operations'
import { reverseEdge } from './operations'

export type EdgeProposalKind = 'connect' | 'disconnect' | 'reverse' | 'reconnect'
export interface EdgeRefactorProposal { kind: EdgeProposalKind; edge: ArchitectureEdge; operations: VisualOperation[]; errors: string[]; readonly: true }

const key = (edge: ArchitectureEdge) => `${edge.from}\0${edge.to}\0${edge.type}`
function reaches(graph: ArchitectureGraph, from: string, target: string, ignored?: string): boolean {
  const seen = new Set<string>(); const queue = [from]
  while (queue.length) { const current = queue.shift()!; if (current === target) return true; if (seen.has(current)) continue; seen.add(current); for (const edge of graph.edges) if (key(edge) !== ignored && edge.from === current) queue.push(edge.to) }
  return false
}

export function proposeEdgeConnection(graph: ArchitectureGraph, edge: ArchitectureEdge): EdgeRefactorProposal {
  const errors: string[] = []
  if (!graph.nodes.some((node) => node.id === edge.from) || !graph.nodes.some((node) => node.id === edge.to)) errors.push('edge endpoints must exist')
  if (edge.from === edge.to) errors.push('self connections are not allowed')
  if (graph.edges.some((item) => key(item) === key(edge))) errors.push('edge already exists')
  if (reaches(graph, edge.to, edge.from)) errors.push('connection would create a dependency cycle')
  return { kind: 'connect', edge: { ...edge }, operations: errors.length ? [] : [{ type: 'connect', edge: { ...edge } }], errors, readonly: true }
}

export function proposeEdgeReversal(graph: ArchitectureGraph, edge: ArchitectureEdge): EdgeRefactorProposal {
  const existing = graph.edges.find((item) => key(item) === key(edge)); const next = reverseEdge(edge); const errors: string[] = []
  if (!existing) errors.push('edge does not exist')
  if (graph.edges.some((item) => key(item) === key(next))) errors.push('reverse edge already exists')
  if (reaches(graph, next.to, next.from, key(edge))) errors.push('reversal would create a dependency cycle')
  return { kind: 'reverse', edge: next, operations: errors.length ? [] : [{ type: 'disconnect', edge: { ...edge } }, { type: 'connect', edge: next }], errors, readonly: true }
}

export function proposeEdgeReconnection(graph: ArchitectureGraph, existing: ArchitectureEdge, replacement: ArchitectureEdge): EdgeRefactorProposal {
  const errors: string[] = []
  if (!graph.edges.some((item) => key(item) === key(existing))) errors.push('edge to reconnect does not exist')
  if (!graph.nodes.some((node) => node.id === replacement.from) || !graph.nodes.some((node) => node.id === replacement.to)) errors.push('replacement endpoints must exist')
  if (replacement.from === replacement.to) errors.push('self connections are not allowed')
  if (graph.edges.some((item) => key(item) === key(replacement) && key(item) !== key(existing))) errors.push('replacement edge already exists')
  if (reaches(graph, replacement.to, replacement.from, key(existing))) errors.push('reconnection would create a dependency cycle')
  return { kind: 'reconnect', edge: { ...replacement }, operations: errors.length ? [] : [{ type: 'disconnect', edge: { ...existing } }, { type: 'connect', edge: { ...replacement } }], errors, readonly: true }
}
