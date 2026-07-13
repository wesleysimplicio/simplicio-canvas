/** Native, dependency-free adapter for the `simplicio.ecosystem-graph/v1` contract.
 *
 * Mirrors the defensive posture of mapper-artifacts.ts: pure JSON parsing, no code
 * execution, no cloning, no implicit network calls. Producer contract: simplicio-mapper PR #203.
 */
import type { RepositoryRef, CrossRepositoryEdge, CrossRepositoryEdgeType, WorkspaceManifest } from './multi-repo'

export type EcosystemEvidenceKind = 'source' | 'test' | 'runtime' | 'receipt' | 'CI' | 'operator' | 'third-seat' | 'paper' | 'documentation'
export interface EcosystemEvidence { kind: EcosystemEvidenceKind; url?: string; revision?: string; scope?: string; status?: string }
export interface EcosystemRepository { id: string; name: string; url: string; revision: string; branch?: string; dirty?: boolean; access: 'available' | 'private' | 'denied' | 'missing'; role?: string; language?: string; status?: string }
export interface EcosystemEdge { id: string; from: string; to: string; type: CrossRepositoryEdgeType; label?: string; evidence?: EcosystemEvidence[] }
export interface EcosystemGraph { format: 'simplicio.ecosystem-graph'; version: 1; boundaries?: string[]; repositories: EcosystemRepository[]; edges: EcosystemEdge[] }

const ACCESS_VALUES = new Set(['available', 'private', 'denied', 'missing'])

/** Cheap format sniff so import call sites can dispatch before parsing either contract. */
export function isEcosystemGraph(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && (value as Record<string, unknown>).format === 'simplicio.ecosystem-graph'
}

function parseEvidence(raw: unknown): EcosystemEvidence[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const value = item as Record<string, unknown>
    if (typeof value.kind !== 'string') return []
    return [{
      kind: value.kind as EcosystemEvidenceKind,
      url: typeof value.url === 'string' ? value.url : undefined,
      revision: typeof value.revision === 'string' ? value.revision : undefined,
      scope: typeof value.scope === 'string' ? value.scope : undefined,
      status: typeof value.status === 'string' ? value.status : undefined,
    }]
  })
}

/** Parse and validate a `simplicio.ecosystem-graph/v1` payload. Throws on structural violations. */
export function parseEcosystemGraph(value: unknown): EcosystemGraph {
  if (!value || typeof value !== 'object') throw new Error('Ecosystem graph must be an object')
  const raw = value as Record<string, unknown>
  if (raw.format !== 'simplicio.ecosystem-graph') throw new Error(`Unsupported ecosystem graph format: ${String(raw.format)}`)
  if (raw.version !== 1) throw new Error(`Unsupported ecosystem graph version: ${String(raw.version)}`)
  const rawRepositories = Array.isArray(raw.repositories) ? raw.repositories : []
  if (!rawRepositories.length) throw new Error('Ecosystem graph requires at least one repository')

  const repositoryIds = new Set<string>()
  const repositories: EcosystemRepository[] = rawRepositories.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`repositories[${index}] must be an object`)
    const repo = item as Record<string, unknown>
    const id = String(repo.id ?? '')
    if (!id) throw new Error(`repositories[${index}] requires an id`)
    if (repositoryIds.has(id)) throw new Error(`duplicate repository id: ${id}`)
    repositoryIds.add(id)
    const access = typeof repo.access === 'string' && ACCESS_VALUES.has(repo.access) ? repo.access as EcosystemRepository['access'] : 'missing'
    return {
      id,
      name: String(repo.name ?? id),
      url: String(repo.url ?? ''),
      revision: String(repo.revision ?? 'unknown'),
      branch: typeof repo.branch === 'string' ? repo.branch : undefined,
      dirty: typeof repo.dirty === 'boolean' ? repo.dirty : undefined,
      access,
      role: typeof repo.role === 'string' ? repo.role : undefined,
      language: typeof repo.language === 'string' ? repo.language : undefined,
      status: typeof repo.status === 'string' ? repo.status : undefined,
    }
  })

  const rawEdges = Array.isArray(raw.edges) ? raw.edges : []
  const edgeIds = new Set<string>()
  const edges: EcosystemEdge[] = rawEdges.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`edges[${index}] must be an object`)
    const edge = item as Record<string, unknown>
    const id = String(edge.id ?? `${edge.from ?? ''}->${edge.to ?? ''}`)
    if (edgeIds.has(id)) throw new Error(`duplicate edge id: ${id}`)
    edgeIds.add(id)
    const from = String(edge.from ?? ''); const to = String(edge.to ?? '')
    if (!repositoryIds.has(from)) throw new Error(`edge ${id} references unknown repository: ${from}`)
    if (!repositoryIds.has(to)) throw new Error(`edge ${id} references unknown repository: ${to}`)
    return {
      id, from, to,
      type: String(edge.type ?? 'feeds') as CrossRepositoryEdgeType,
      label: typeof edge.label === 'string' ? edge.label : undefined,
      evidence: parseEvidence(edge.evidence),
    }
  })

  const boundaries = Array.isArray(raw.boundaries) ? raw.boundaries.filter((item): item is string => typeof item === 'string') : undefined
  return { format: 'simplicio.ecosystem-graph', version: 1, boundaries, repositories, edges }
}

/** Repositories with `private`/`denied`/`missing` access stay visible but are never openable. */
export function isRepositoryOpenable(repository: EcosystemRepository): boolean { return repository.access === 'available' }

/** Project an ecosystem graph onto the existing multi-repo workspace shape so it can drive the landscape HUD. */
export function toWorkspaceManifest(graph: EcosystemGraph): WorkspaceManifest {
  const repositories: RepositoryRef[] = graph.repositories.map((repo) => ({
    id: repo.id,
    name: repo.name,
    root: repo.url,
    revision: repo.revision,
    branch: repo.branch,
    dirty: repo.dirty ?? false,
    access: repo.access === 'private' ? 'denied' : repo.access,
    language: repo.language,
  }))
  const edges: CrossRepositoryEdge[] = graph.edges.map((edge) => ({
    id: edge.id,
    fromRepo: edge.from,
    toRepo: edge.to,
    type: edge.type,
    label: edge.label,
    evidence: (edge.evidence ?? []).map((item) => item.url ?? `${item.kind}${item.scope ? `:${item.scope}` : ''}`),
  }))
  return { version: 1, repositories, edges, boundaries: graph.boundaries }
}
