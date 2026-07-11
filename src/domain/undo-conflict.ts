export interface FileSnapshot { path: string; content: string; hash: string }
export interface Checkpoint { id: string; createdAt: string; files: FileSnapshot[] }
export interface Conflict { path: string; expected: string; actual: string }
export function contentHash(content: string): string {
  // Deterministic, synchronous FNV-1a hash is sufficient for change detection; this is not cryptography.
  let hash = 2166136261; for (let index = 0; index < content.length; index++) { hash ^= content.charCodeAt(index); hash = Math.imul(hash, 16777619) }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
export function snapshotFiles(files: Array<{ path: string; content: string }>, id = `checkpoint-${Date.now()}`): Checkpoint {
  return { id, createdAt: new Date().toISOString(), files: files.map(({ path, content }) => ({ path, content, hash: contentHash(content) })).sort((a, b) => a.path.localeCompare(b.path)) }
}
export function detectConflicts(checkpoint: Checkpoint, current: Array<{ path: string; content: string }>): Conflict[] {
  const byPath = new Map(current.map((file) => [file.path, file.content])); return checkpoint.files.flatMap((file) => { const actual = byPath.get(file.path); return actual !== undefined && contentHash(actual) !== file.hash ? [{ path: file.path, expected: file.hash, actual: contentHash(actual) }] : [] })
}
export function restoreSnapshot(checkpoint: Checkpoint, current: Array<{ path: string; content: string }>): Array<{ path: string; content: string }> {
  const restored = new Map(current.map((file) => [file.path, file.content])); for (const file of checkpoint.files) restored.set(file.path, file.content); return [...restored.entries()].map(([path, content]) => ({ path, content })).sort((a, b) => a.path.localeCompare(b.path))
}
export function canUndo(checkpoint: Checkpoint, current: Array<{ path: string; content: string }>): { allowed: boolean; conflicts: Conflict[] } { const conflicts = detectConflicts(checkpoint, current); return { allowed: conflicts.length === 0, conflicts } }
