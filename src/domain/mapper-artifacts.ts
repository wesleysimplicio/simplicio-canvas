/** Stable, defensive boundary for simplicio-mapper flow artifacts.
 *
 * Mapper versions have emitted both Mermaid source and JSON envelopes.  The
 * Canvas deliberately keeps this parser dependency-free so a local snapshot
 * can be opened offline and untrusted artifacts never execute code.
 */
export interface MapperFlowNode { id: string; label: string; kind?: string; path?: string }
export interface MapperFlowEdge { from: string; to: string; type?: string; label?: string }
export interface MapperFlowArtifact { format: 'simplicio-mapper-flow'; version: 1; source?: string; nodes: MapperFlowNode[]; edges: MapperFlowEdge[]; provenance?: { source?: string; generatedAt?: string; scanner?: string } }

const clean = (value: string) => value.trim().replace(/^['"`]|['"`]$/g, '').replace(/\s+/g, ' ')
const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_.:/-]/g, '_').slice(0, 160)

/** Parse the common Mermaid flowchart/graph subset produced by mapper. */
export function parseMermaidFlow(source: string, provenance = 'mermaid'): MapperFlowArtifact {
  const nodes = new Map<string, MapperFlowNode>()
  const edges: MapperFlowEdge[] = []
  const addNode = (id: string, label = id) => { const key = safeId(clean(id)); if (!key) return ''; const prior = nodes.get(key); const normalized = clean(label); const display = prior?.label && (!normalized || normalized.toLowerCase() === key.toLowerCase()) ? prior.label : (normalized || prior?.label || key); nodes.set(key, { id: key, label: display, kind: prior?.kind }); return key }
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim(); if (!line || /^(flowchart|graph|sequenceDiagram|classDiagram|subgraph|end)\b/i.test(line)) continue
    // A -->|typed edge| B and A -- text --> B, as emitted by Mermaid.
    const labelled = line.match(/^(.+?)\s+--+>\|([^|]*)\|\s*(.+)$/)
    const plain = line.match(/^(.+?)\s+--+>\s*(.+)$/)
    const described = line.match(/^(.+?)\s+--\s*([^>-]*?)\s*-->\s*(.+)$/)
    const match = labelled ? [labelled[1], labelled[2], labelled[3]] : described ? [described[1], described[2], described[3]] : plain ? [plain[1], '', plain[2]] : null
    if (match) {
      const fromRaw = match[0].replace(/^[A-Za-z]+\s+/, '').trim(); const label = clean(match[1] ?? ''); const toRaw = match[2].trim()
      const parseNode = (rawNode: string) => {
        const node = rawNode.trim().match(/^([\w.:/-]+)\s*\(\((.+?)\)\)$/) ?? rawNode.trim().match(/^([\w.:/-]+)\s*\[\((.+?)\)\]$/) ?? rawNode.trim().match(/^([\w.:/-]+)\s*\[\[?(.+?)\]?\]?$|^([\w.:/-]+)\s*\[(.+?)\]$/)
        return node ? [node[1] ?? node[3] ?? node[5], node[2] ?? node[4] ?? node[6]] : [rawNode.replace(/[\[\](){}]/g, ''), rawNode]
      }
      const [fromId, fromLabel] = parseNode(fromRaw); const [toId, toLabel] = parseNode(toRaw); const from = addNode(fromId, fromLabel); const to = addNode(toId, toLabel)
      if (from && to && from !== to && !edges.some((edge) => edge.from === from && edge.to === to)) edges.push({ from, to, type: label || 'flow', label: label || undefined })
      continue
    }
    // Standalone Mermaid node definitions: api[API] / db((Database)).
    const nodeMatch = line.match(/^([\w.:/-]+)\s*(?:\[\[(.+?)\]\]|\((.+?)\)|\[(.+?)\])\s*;?$/)
    if (nodeMatch) addNode(nodeMatch[1], nodeMatch[2] ?? nodeMatch[3] ?? nodeMatch[4])
  }
  return { format: 'simplicio-mapper-flow', version: 1, source: provenance, nodes: [...nodes.values()], edges, provenance: { source: provenance, generatedAt: new Date().toISOString(), scanner: 'simplicio-mapper' } }
}

/** Accept mapper JSON envelopes, Mermaid strings and `{ mermaid }` payloads. */
export function parseMapperFlowArtifact(value: unknown): MapperFlowArtifact {
  if (typeof value === 'string') return parseMermaidFlow(value)
  if (!value || typeof value !== 'object') throw new Error('Mapper flow artifact must be an object or Mermaid source')
  const raw = value as Record<string, unknown>
  if (typeof raw.mermaid === 'string') return parseMermaidFlow(raw.mermaid, typeof raw.source === 'string' ? raw.source : 'mapper-mermaid')
  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : Array.isArray(raw.vertices) ? raw.vertices : []
  const nodes = rawNodes.flatMap((item) => { if (!item || typeof item !== 'object') return []; const node = item as Record<string, unknown>; const id = safeId(String(node.id ?? node.key ?? node.path ?? '')); return id ? [{ id, label: clean(String(node.label ?? node.name ?? node.path ?? id)), kind: typeof node.kind === 'string' ? node.kind : undefined, path: typeof node.path === 'string' ? node.path : undefined }] : [] })
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : Array.isArray(raw.links) ? raw.links : []
  const edges = rawEdges.flatMap((item) => { if (!item || typeof item !== 'object') return []; const edge = item as Record<string, unknown>; const from = safeId(String(edge.from ?? edge.source ?? '')); const to = safeId(String(edge.to ?? edge.target ?? '')); return from && to ? [{ from, to, type: typeof edge.type === 'string' ? edge.type : undefined, label: typeof edge.label === 'string' ? edge.label : undefined }] : [] })
  if (!nodes.length && !edges.length) throw new Error('Mapper flow artifact has no nodes or edges')
  return { format: 'simplicio-mapper-flow', version: 1, source: typeof raw.source === 'string' ? raw.source : 'simplicio-mapper', nodes, edges, provenance: typeof raw.provenance === 'object' ? raw.provenance as MapperFlowArtifact['provenance'] : undefined }
}
