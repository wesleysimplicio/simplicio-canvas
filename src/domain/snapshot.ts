import { serializeGraph, type CanonicalGraph } from './graph-schema'
export interface SnapshotEnvelope { format: 'simplicio-canvas-snapshot'; version: 1; exportedAt: string; provenance: CanonicalGraph['provenance']; graph: CanonicalGraph }
export function exportSnapshot(graph: CanonicalGraph, now = new Date().toISOString()): string { const snapshot: SnapshotEnvelope = { format: 'simplicio-canvas-snapshot', version: 1, exportedAt: now, provenance: graph.provenance, graph }; return JSON.stringify(snapshot, null, 2) }
export function assertPrivateSnapshot(snapshot: SnapshotEnvelope): void {
  const serialized = serializeGraph(snapshot.graph)
  if (/password|api[_-]?key|secret|token|private[_-]?key/i.test(serialized)) throw new Error('Snapshot contains a secret-like field')
  if (snapshot.format !== 'simplicio-canvas-snapshot' || snapshot.version !== 1) throw new Error('Unsupported snapshot format')
}
