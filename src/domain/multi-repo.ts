export interface RepositoryRef { id: string; name: string; root: string; revision: string; branch?: string; dirty: boolean; access: 'available' | 'denied' | 'missing'; language?: string }
export type CrossRepositoryEdgeType = 'package' | 'api' | 'event' | 'schema' | 'deploys'
export interface CrossRepositoryEdge { id: string; fromRepo: string; toRepo: string; type: CrossRepositoryEdgeType; label?: string; evidence: string[] }
export interface WorkspaceManifest { version: 1; repositories: RepositoryRef[]; edges: CrossRepositoryEdge[] }
export function validateWorkspaceManifest(manifest: unknown): string[] {
  if (!manifest || typeof manifest !== 'object') return ['workspace manifest must be an object']
  const value = manifest as Partial<WorkspaceManifest>; const errors: string[] = []
  if (value.version !== 1) errors.push('unsupported workspace manifest version')
  if (!Array.isArray(value.repositories) || value.repositories.length === 0) errors.push('at least one repository is required')
  const ids = new Set<string>(); for (const [i, repo] of (value.repositories ?? []).entries()) { if (!repo.id || !repo.name || !repo.revision) errors.push(`repositories[${i}] requires id, name and revision`); if (ids.has(repo.id)) errors.push(`duplicate repository id: ${repo.id}`); ids.add(repo.id) }
  for (const edge of value.edges ?? []) if (!ids.has(edge.fromRepo) || !ids.has(edge.toRepo)) errors.push(`edge references unavailable repository: ${edge.id}`)
  return errors
}
