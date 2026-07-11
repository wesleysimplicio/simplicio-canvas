import type { ProjectAnalysis } from './analyzer'
import { createCanonicalGraph, createGraphId, type CanonicalGraph, type GraphEdgeType } from './graph-schema'
import { classify } from './classification'

/** Converts the bounded analyzer output into the canonical renderer contract. */
export function analysisToGraph(analysis: ProjectAnalysis, source = 'simplicio-mapper'): CanonicalGraph {
  const projectId = createGraphId('project', analysis.name, '')
  const nodes = analysis.files.map((file) => { const classification = classify(file.path); return { id: createGraphId('file', analysis.name, file.path), kind: 'file' as const, name: file.path.split('/').pop() ?? file.path, path: file.path, parentId: projectId, layer: classification.layer, evidence: [{ source: 'static' as const, confidence: classification.confidence, reason: classification.reason, location: { path: file.path } }] } })
  const ids = new Map(nodes.map((node) => [node.path!, node.id]))
  const edges = analysis.connections.filter((connection) => !connection.external && ids.has(connection.source) && ids.has(connection.target)).map((connection) => ({ id: createGraphId('symbol', analysis.name, connection.source, `${connection.type}:${connection.target}`), from: ids.get(connection.source)!, to: ids.get(connection.target)!, type: 'import' as GraphEdgeType, label: connection.specifier, evidence: [{ source: 'static' as const, confidence: 1, reason: 'resolved analyzer import', location: { path: connection.source } }] }))
  return createCanonicalGraph({ project: { id: projectId, name: analysis.name }, nodes, edges, provenance: { source, generatedAt: new Date().toISOString(), scanner: source }, evidence: [] })
}
