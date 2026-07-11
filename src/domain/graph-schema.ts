/** Versioned, renderer-agnostic graph contract shared by web, VS Code and Mapper. */
export const GRAPH_SCHEMA_VERSION = '1.0'

export type GraphNodeKind = 'project' | 'layer' | 'flow' | 'file' | 'class' | 'function' | 'method' | 'symbol'
export type GraphEdgeType = 'import' | 'call' | 'implements' | 'inherits' | 'event' | 'data' | 'read' | 'write' | 'verifies'
export type EvidenceSource = 'static' | 'runtime' | 'ai'

export interface GraphProvenance { source: string; generatedAt: string; scanner?: string; snapshot?: string }
export interface GraphEvidence { source: EvidenceSource; confidence: number; reason: string; location?: { path: string; line?: number; column?: number } }
export interface GraphPort { id: string; direction: 'in' | 'out'; contract: string }
export interface GraphNode { id: string; kind: GraphNodeKind; name: string; path?: string; parentId?: string; layer?: string; ports?: GraphPort[]; evidence?: GraphEvidence[]; position?: { x: number; y: number; z?: number } }
export interface GraphEdge { id: string; from: string; to: string; type: GraphEdgeType; evidence?: GraphEvidence[]; label?: string }
export interface CanonicalGraph { schema: string; project: { id: string; name: string; root?: string }; nodes: GraphNode[]; edges: GraphEdge[]; provenance: GraphProvenance; evidence: GraphEvidence[] }

function stableHash(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619) }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function stableGraphId(kind: string, identity: string): string { return `${kind}:${stableHash(`${kind}\0${identity}`)}` }
export function createGraphId(kind: GraphNodeKind, project: string, path: string, symbol = ''): string { return stableGraphId(kind, `${project}:${path}:${symbol}`) }

export function createCanonicalGraph(input: Omit<CanonicalGraph, 'schema'>): CanonicalGraph {
  return { schema: GRAPH_SCHEMA_VERSION, project: input.project, nodes: input.nodes.map((node) => ({ ...node })), edges: input.edges.map((edge) => ({ ...edge })), provenance: { ...input.provenance }, evidence: [...input.evidence] }
}

export function serializeGraph(graph: CanonicalGraph): string { return JSON.stringify(createCanonicalGraph(graph), null, 2) }

export function migrateGraph(value: unknown): CanonicalGraph {
  if (!value || typeof value !== 'object') throw new Error('Graph snapshot must be an object')
  const raw = value as Partial<CanonicalGraph> & { version?: string; files?: Array<{ path: string; name?: string }> }
  if (raw.schema === GRAPH_SCHEMA_VERSION) return createCanonicalGraph(raw as Omit<CanonicalGraph, 'schema'>)
  if (raw.schema && raw.schema !== GRAPH_SCHEMA_VERSION) throw new Error(`Unsupported graph schema: ${String(raw.schema)}`)
  // v0 snapshots were flat file lists. Keep them readable while preserving provenance.
  const files = raw.files ?? []
  const projectName = raw.project?.name ?? 'Imported snapshot'
  const nodes = files.map((file) => ({ id: createGraphId('file', projectName, file.path), kind: 'file' as const, name: file.name ?? file.path.split('/').pop() ?? file.path, path: file.path }))
  return createCanonicalGraph({ project: { id: stableGraphId('project', projectName), name: projectName }, nodes, edges: [], provenance: { source: 'legacy-v0', generatedAt: new Date(0).toISOString() }, evidence: [] })
}

export function parseGraphSnapshot(serialized: string): CanonicalGraph { return migrateGraph(JSON.parse(serialized) as unknown) }
