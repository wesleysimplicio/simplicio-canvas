import { isSafeWorkspacePath, type WorkspaceTrust } from './workspace-security'

export interface SourceControlFile { path: string; state: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked'; staged: boolean; diff?: string }
export interface SourceControlSnapshot { branch: string; ahead: number; behind: number; files: SourceControlFile[]; mainProtected?: boolean; provider: 'local' | 'unavailable' }
export interface SourceControlAdapter { status(): Promise<SourceControlSnapshot>; diff(path: string): Promise<string>; stage(paths: string[]): Promise<void>; commit(message: string): Promise<{ id: string }>; push(): Promise<{ receipt: string }> }
export interface SourceControlReceipt { id: string; action: 'stage' | 'commit' | 'push'; branch: string; paths: string[]; createdAt: string; accepted: boolean; detail: string }
export interface SourceControlController { refresh(): Promise<SourceControlSnapshot>; stage(paths: string[]): Promise<SourceControlReceipt>; commit(paths: string[], message: string): Promise<SourceControlReceipt>; push(): Promise<SourceControlReceipt> }

export function validateSourceControlAction(trust: WorkspaceTrust, root: string, paths: string[], message?: string): string[] {
  const errors = paths.filter((path) => !isSafeWorkspacePath(root, path)).map((path) => `path outside workspace: ${path}`)
  if (!paths.length) errors.push('at least one workspace path is required')
  if (message !== undefined && !message.trim()) errors.push('commit message is required')
  if (!trust.trusted) errors.push('workspace trust is required')
  return errors
}

export function shouldRequirePullRequest(snapshot: SourceControlSnapshot): boolean { return snapshot.mainProtected === true && snapshot.branch === 'main' }

/** Host-side source-control gate. The browser only receives snapshots/receipts. */
export function createSourceControlController(adapter: SourceControlAdapter, trust: WorkspaceTrust, root: string): SourceControlController {
  let current: SourceControlSnapshot | undefined
  const receipt = (action: SourceControlReceipt['action'], paths: string[], accepted: boolean, detail: string): SourceControlReceipt => ({ id: `sc-${action}-${Date.now()}`, action, branch: current?.branch ?? 'unknown', paths: [...paths], createdAt: new Date().toISOString(), accepted, detail })
  const refresh = async () => { current = await adapter.status(); return { ...current, files: current.files.map((file) => ({ ...file })) } }
  const stage = async (paths: string[]) => { const errors = validateSourceControlAction(trust, root, paths); if (errors.length) return receipt('stage', paths, false, errors.join('; ')); await adapter.stage(paths); return receipt('stage', paths, true, `${paths.length} arquivo(s) staged`) }
  const commit = async (paths: string[], message: string) => { const errors = validateSourceControlAction(trust, root, paths, message); if (current && shouldRequirePullRequest(current)) errors.push('main protegida: commit deve ser enviado por Pull Request'); if (errors.length) return receipt('commit', paths, false, errors.join('; ')); const result = await adapter.commit(message); return receipt('commit', paths, true, `commit ${result.id}`) }
  const push = async () => { if (!current) await refresh(); if (current && shouldRequirePullRequest(current)) return receipt('push', [], false, 'main protegida: push direto bloqueado; abra um Pull Request'); const result = await adapter.push(); return receipt('push', [], true, result.receipt) }
  return { refresh, stage, commit, push }
}

export function createReadOnlySourceControlAdapter(snapshot: SourceControlSnapshot): SourceControlAdapter {
  const copy = () => ({ ...snapshot, files: snapshot.files.map((file) => ({ ...file })) })
  return { status: async () => copy(), diff: async (path) => snapshot.files.find((file) => file.path === path)?.diff ?? '', stage: async () => undefined, commit: async () => ({ id: 'read-only' }), push: async () => ({ receipt: 'read-only adapter: no remote mutation performed' }) }
}
