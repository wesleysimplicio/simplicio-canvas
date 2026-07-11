import type { WorkspaceSnapshot } from './workspace-recovery'
import { validateWorkspaceSnapshot } from './workspace-recovery'

export interface CacheKeyInput { repository: string; revision: string; configuration: string; schema?: string }
export interface WorkspaceCacheEnvelope { schema: 'simplicio-cache/v1'; key: string; repository: string; revision: string; configuration: string; snapshot: WorkspaceSnapshot; writtenAt: string }
export interface CacheAdapter { read(key: string): string | undefined; writeAtomic(key: string, value: string): void; remove(key: string): void }
export type CacheDiagnostic = 'missing' | 'corrupt' | 'stale-revision' | 'schema-mismatch' | 'valid'
export interface CacheInspection { status: CacheDiagnostic; key: string; reason?: string; envelope?: WorkspaceCacheEnvelope }

function hash(value: string): string { let result = 2166136261; for (const char of value) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619) } return (result >>> 0).toString(16).padStart(8, '0') }
export function createCacheKey(input: CacheKeyInput): string { return `simplicio:${input.schema ?? '1'}:${hash(`${input.repository}\0${input.revision}\0${input.configuration}`)}` }

export class MemoryCacheAdapter implements CacheAdapter {
  private values = new Map<string, string>()
  failNextWrite = false
  read(key: string): string | undefined { return this.values.get(key) }
  writeAtomic(key: string, value: string): void { if (this.failNextWrite) { this.failNextWrite = false; throw new Error('simulated interrupted cache write') } const temp = `${key}.tmp`; this.values.set(temp, value); this.values.set(key, this.values.get(temp)!); this.values.delete(temp) }
  remove(key: string): void { this.values.delete(key); this.values.delete(`${key}.tmp`) }
}

export class LocalStorageCacheAdapter implements CacheAdapter {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage) {}
  read(key: string): string | undefined { try { return this.storage.getItem(key) ?? undefined } catch { return undefined } }
  writeAtomic(key: string, value: string): void { const temp = `${key}.tmp`; this.storage.setItem(temp, value); this.storage.setItem(key, this.storage.getItem(temp) ?? value); this.storage.removeItem(temp) }
  remove(key: string): void { this.storage.removeItem(key); this.storage.removeItem(`${key}.tmp`) }
}

export function inspectWorkspaceCache(adapter: CacheAdapter, key: string, expectedRevision?: string): CacheInspection {
  const raw = adapter.read(key); if (!raw) return { status: 'missing', key, reason: 'cache entry does not exist' }
  let envelope: WorkspaceCacheEnvelope
  try { envelope = JSON.parse(raw) as WorkspaceCacheEnvelope } catch { return { status: 'corrupt', key, reason: 'cache entry is not valid JSON' } }
  if (envelope.schema !== 'simplicio-cache/v1') return { status: 'schema-mismatch', key, reason: 'unsupported cache schema' }
  const snapshotErrors = validateWorkspaceSnapshot(envelope.snapshot); if (snapshotErrors.length) return { status: 'corrupt', key, reason: snapshotErrors.join('; '), envelope }
  if (expectedRevision !== undefined && envelope.revision !== expectedRevision) return { status: 'stale-revision', key, reason: `cache revision ${envelope.revision} differs from ${expectedRevision}`, envelope }
  return { status: 'valid', key, envelope }
}

export function saveWorkspaceCache(adapter: CacheAdapter, input: CacheKeyInput, snapshot: WorkspaceSnapshot, writtenAt = new Date().toISOString()): string {
  const errors = validateWorkspaceSnapshot(snapshot); if (errors.length) throw new Error(`Cannot cache invalid snapshot: ${errors.join('; ')}`)
  const key = createCacheKey(input); const envelope: WorkspaceCacheEnvelope = { schema: 'simplicio-cache/v1', key, repository: input.repository, revision: input.revision, configuration: input.configuration, snapshot, writtenAt }; adapter.writeAtomic(key, JSON.stringify(envelope)); return key
}

export function repairWorkspaceCache(adapter: CacheAdapter, key: string, expectedRevision?: string): CacheInspection {
  const inspection = inspectWorkspaceCache(adapter, key, expectedRevision)
  if (inspection.status !== 'valid') adapter.remove(key)
  return inspection
}
