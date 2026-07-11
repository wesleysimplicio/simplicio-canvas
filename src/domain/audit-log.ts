export type AuditAction = 'proposal' | 'accept' | 'reject' | 'apply' | 'undo' | 'error'
export interface AuditEntry { id: string; action: AuditAction; actor: 'user' | 'ai' | 'system'; timestamp: string; requestId?: string; details: Record<string, string> }

export class AuditLog {
  private entries: AuditEntry[] = []
  append(entry: AuditEntry): void { this.entries.push(Object.freeze({ ...entry, details: { ...entry.details } })) }
  list(): readonly AuditEntry[] { return this.entries.map((entry) => ({ ...entry, details: { ...entry.details } })) }
  clear(): void { this.entries = [] }
}
