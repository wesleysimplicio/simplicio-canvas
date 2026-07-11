import type { CanonicalGraph, GraphEdge, GraphNode } from './graph-schema'

export type GraphChangeKind = 'added' | 'removed' | 'changed'
export interface GraphChange { kind: GraphChangeKind; entity: 'node' | 'edge'; id: string; before?: GraphNode | GraphEdge; after?: GraphNode | GraphEdge }
export interface GraphRevisionDiff { schema: 'simplicio-graph-diff/v1'; from: string; to: string; changes: GraphChange[]; deterministic: true }

const stable = (value: unknown) => JSON.stringify(value, Object.keys(value as object).sort())
function diffEntities<T extends GraphNode | GraphEdge>(before: T[], after: T[], entity: GraphChange['entity']): GraphChange[] {
  const left = new Map(before.map((item) => [item.id, item])); const right = new Map(after.map((item) => [item.id, item])); const ids = [...new Set([...left.keys(), ...right.keys()])].sort(); const changes: GraphChange[] = []
  for (const id of ids) { const a = left.get(id); const b = right.get(id); if (!a && b) changes.push({ kind: 'added', entity, id, after: b as GraphNode | GraphEdge }); else if (a && !b) changes.push({ kind: 'removed', entity, id, before: a as GraphNode | GraphEdge }); else if (a && b && stable(a) !== stable(b)) changes.push({ kind: 'changed', entity, id, before: a as GraphNode | GraphEdge, after: b as GraphNode | GraphEdge }) }
  return changes
}
export function diffGraphs(before: CanonicalGraph, after: CanonicalGraph, from = before.provenance.snapshot ?? before.provenance.generatedAt, to = after.provenance.snapshot ?? after.provenance.generatedAt): GraphRevisionDiff {
  return { schema: 'simplicio-graph-diff/v1', from, to, changes: [...diffEntities(before.nodes, after.nodes, 'node'), ...diffEntities(before.edges, after.edges, 'edge')], deterministic: true }
}
export function serializeGraphDiff(diff: GraphRevisionDiff): string { return JSON.stringify(diff, null, 2) }
export function replayGraphDiff<T extends CanonicalGraph>(before: T, diff: GraphRevisionDiff, progress = 1): T {
  const ratio = Math.max(0, Math.min(1, progress)); const limit = Math.floor(diff.changes.length * ratio); const nodes = [...before.nodes]; const edges = [...before.edges]
  for (const change of diff.changes.slice(0, limit)) { const list = change.entity === 'node' ? nodes : edges; const index = list.findIndex((item) => item.id === change.id); if (change.kind === 'removed' && index >= 0) list.splice(index, 1); if (change.kind === 'added' && change.after) list.push(change.after as never); if (change.kind === 'changed' && change.after && index >= 0) list[index] = change.after as never }
  return { ...before, nodes, edges, provenance: { ...before.provenance, snapshot: ratio >= 1 ? diff.to : `replay:${ratio}` } }
}
