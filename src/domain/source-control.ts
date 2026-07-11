import { isSafeWorkspacePath, type WorkspaceTrust } from './workspace-security'

export interface SourceControlFile { path: string; state: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'; staged: boolean; diff?: string }
export interface SourceControlSnapshot { branch: string; ahead: number; behind: number; files: SourceControlFile[]; mainProtected?: boolean; provider: 'local' | 'unavailable' }
export interface SourceControlAdapter { status(): Promise<SourceControlSnapshot>; diff(path: string): Promise<string>; stage(paths: string[]): Promise<void>; commit(message: string): Promise<{ id: string }>; push(): Promise<{ receipt: string }> }

export function validateSourceControlAction(trust: WorkspaceTrust, root: string, paths: string[], message?: string): string[] {
  const errors = paths.filter((path) => !isSafeWorkspacePath(root, path)).map((path) => `path outside workspace: ${path}`)
  if (!paths.length) errors.push('at least one workspace path is required')
  if (message !== undefined && !message.trim()) errors.push('commit message is required')
  if (!trust.trusted) errors.push('workspace trust is required')
  return errors
}

export function shouldRequirePullRequest(snapshot: SourceControlSnapshot): boolean { return snapshot.mainProtected === true && snapshot.branch === 'main' }
