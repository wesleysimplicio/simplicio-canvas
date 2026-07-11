import type { ArchitectureGraph } from './architecture'

export interface EvidenceCitation { nodeId: string; path: string; relation?: string }
export interface ArchitectureAnswer { text: string; citations: EvidenceCitation[]; uncertain: boolean }
export interface ImpactReport { target: string; affectedNodes: string[]; affectedEdges: number; boundaries: string[] }

export function explainNode(graph: ArchitectureGraph, nodeId: string): ArchitectureAnswer {
  const node = graph.nodes.find((item) => item.id === nodeId)
  if (!node) return { text: 'No graph evidence was found for this selection.', citations: [], uncertain: true }
  const related = graph.edges.filter((edge) => edge.from === nodeId || edge.to === nodeId)
  return { text: `${node.name} is a ${node.kind} in the ${node.layer} layer with ${related.length} connected relation(s).`, citations: [{ nodeId: node.id, path: node.path }], uncertain: false }
}

export function analyzeImpact(graph: ArchitectureGraph, target: string): ImpactReport {
  const affectedNodes = new Set<string>([target]); const edges = graph.edges.filter((edge) => edge.from === target || edge.to === target)
  for (const edge of edges) { affectedNodes.add(edge.from); affectedNodes.add(edge.to) }
  const boundaries = new Set<string>()
  for (const id of affectedNodes) { const layer = graph.nodes.find((node) => node.id === id)?.layer; if (layer) boundaries.add(layer) }
  return { target, affectedNodes: Array.from(affectedNodes), affectedEdges: edges.length, boundaries: Array.from(boundaries) }
}
