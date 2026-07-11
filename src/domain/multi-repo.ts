export interface RepositoryRef { id: string; name: string; root: string; revision: string; branch?: string; dirty: boolean; access: 'available' | 'denied' | 'missing'; language?: string }
export type CrossRepositoryEdgeType = 'package' | 'api' | 'event' | 'schema' | 'deploys'
export interface CrossRepositoryEdge { id: string; fromRepo: string; toRepo: string; type: CrossRepositoryEdgeType; label?: string; evidence: string[] }
export interface WorkspaceManifest { version: 1; repositories: RepositoryRef[]; edges: CrossRepositoryEdge[] }
export interface WorkspaceLandscapeSummary { repositories: Array<RepositoryRef & { edgeCount: number }>; edges: CrossRepositoryEdge[]; available: number; unavailable: number }
export const SIMPLICIO_LANDSCAPE_FIXTURE: WorkspaceManifest = { version: 1, repositories: [
  { id: 'canvas', name: 'simplicio-canvas', root: '.', revision: 'demo', branch: 'main', dirty: false, access: 'available', language: 'TypeScript' },
  { id: 'loop', name: 'simplicio-loop', root: '../simplicio-loop', revision: 'demo', branch: 'main', dirty: false, access: 'available', language: 'Python' },
  { id: 'mapper', name: 'simplicio-mapper', root: '../simplicio-mapper', revision: 'unavailable', branch: 'main', dirty: false, access: 'missing', language: 'Python' },
  { id: 'runtime', name: 'simplicio-runtime', root: '../simplicio-runtime', revision: 'unavailable', branch: 'main', dirty: false, access: 'missing', language: 'Rust' },
], edges: [
  { id: 'canvas-loop', fromRepo: 'canvas', toRepo: 'loop', type: 'package', label: 'project skill', evidence: ['README.md'] },
  { id: 'canvas-mapper', fromRepo: 'canvas', toRepo: 'mapper', type: 'api', label: 'analysis artifacts', evidence: ['src/domain/mapper-artifacts.ts'] },
  { id: 'loop-runtime', fromRepo: 'loop', toRepo: 'runtime', type: 'event', label: 'runtime traces', evidence: ['runtime contract'] },
] }
export function validateWorkspaceManifest(manifest: unknown): string[] {
  if (!manifest || typeof manifest !== 'object') return ['workspace manifest must be an object']
  const value = manifest as Partial<WorkspaceManifest>; const errors: string[] = []
  if (value.version !== 1) errors.push('unsupported workspace manifest version')
  if (!Array.isArray(value.repositories) || value.repositories.length === 0) errors.push('at least one repository is required')
  const ids = new Set<string>(); for (const [i, repo] of (value.repositories ?? []).entries()) { if (!repo.id || !repo.name || !repo.revision) errors.push(`repositories[${i}] requires id, name and revision`); if (ids.has(repo.id)) errors.push(`duplicate repository id: ${repo.id}`); ids.add(repo.id) }
  for (const edge of value.edges ?? []) if (!ids.has(edge.fromRepo) || !ids.has(edge.toRepo)) errors.push(`edge references unavailable repository: ${edge.id}`)
  return errors
}
export function summarizeWorkspaceLandscape(manifest: WorkspaceManifest): WorkspaceLandscapeSummary { const edgeCount = new Map(manifest.repositories.map((repo) => [repo.id, 0])); for (const edge of manifest.edges) { edgeCount.set(edge.fromRepo, (edgeCount.get(edge.fromRepo) ?? 0) + 1); edgeCount.set(edge.toRepo, (edgeCount.get(edge.toRepo) ?? 0) + 1) }; return { repositories: manifest.repositories.map((repo) => ({ ...repo, edgeCount: edgeCount.get(repo.id) ?? 0 })), edges: [...manifest.edges], available: manifest.repositories.filter((repo) => repo.access === 'available').length, unavailable: manifest.repositories.filter((repo) => repo.access !== 'available').length } }
