import { canApply, isSafeWorkspacePath, type WorkspaceTrust } from './workspace-security'

export interface TerminalRequest { command: string; cwd: string; env?: Record<string, string>; confirmation?: string }
export interface TerminalReceipt { id: string; command: string; cwd: string; exitCode: number; output: string; startedAt: string; endedAt: string; mode: 'browser-simulated' | 'local-pty' }
export interface TerminalAdapter { readonly mode: TerminalReceipt['mode']; run(request: TerminalRequest): Promise<TerminalReceipt>; stop(receiptId: string): Promise<void> }
export const TERMINAL_CONFIRMATION = 'RUN'
export const TERMINAL_OUTPUT_LIMIT = 100_000
export type ProcessRunner = (request: TerminalRequest, onChunk: (chunk: string) => void, signal: AbortSignal) => Promise<number>
const forbiddenEnv = /(?:TOKEN|PASSWORD|SECRET|KEY|APIKEY)/i

export function validateTerminalRequest(request: TerminalRequest, trust: WorkspaceTrust): string[] {
  const errors: string[] = []
  if (!request.command.trim()) errors.push('command is required')
  if (!canApply(trust, request.cwd) || !isSafeWorkspacePath(trust.root, request.cwd)) errors.push('cwd must stay inside a trusted workspace')
  if (request.confirmation !== TERMINAL_CONFIRMATION) errors.push(`explicit confirmation required: type ${TERMINAL_CONFIRMATION}`)
  for (const key of Object.keys(request.env ?? {})) if (forbiddenEnv.test(key)) errors.push(`environment key is not allowed: ${key}`)
  return errors
}

export class BrowserTerminalAdapter implements TerminalAdapter {
  readonly mode = 'browser-simulated' as const
  async run(request: TerminalRequest): Promise<TerminalReceipt> {
    const now = new Date().toISOString(); const confirmed = request.confirmation === TERMINAL_CONFIRMATION && request.command.trim().length > 0
    return { id: `browser-${Date.now()}`, command: request.command, cwd: request.cwd, exitCode: confirmed ? 0 : 1, output: confirmed ? 'Browser mode is read-only; no local process was started.' : 'Run blocked: explicit confirmation and a command are required.', startedAt: now, endedAt: now, mode: this.mode }
  }
  async stop(): Promise<void> { /* no process exists in browser mode */ }
}

/** Host adapter: the extension injects a PTY runner; this module never spawns processes itself. */
export class GuardedProcessAdapter implements TerminalAdapter {
  readonly mode = 'local-pty' as const
  private readonly active = new Map<string, AbortController>()
  constructor(private readonly trust: WorkspaceTrust, private readonly runner: ProcessRunner, private readonly outputLimit = TERMINAL_OUTPUT_LIMIT) {}
  async run(request: TerminalRequest): Promise<TerminalReceipt> {
    const errors = validateTerminalRequest(request, this.trust); if (errors.length) throw new Error(`Process blocked: ${errors.join('; ')}`)
    const id = `pty-${Date.now()}-${this.active.size}`; const controller = new AbortController(); this.active.set(id, controller); const chunks: string[] = []; let outputSize = 0
    const onChunk = (chunk: string) => { if (outputSize >= this.outputLimit) return; const remaining = this.outputLimit - outputSize; const next = chunk.slice(0, remaining); chunks.push(next); outputSize += next.length }
    const startedAt = new Date().toISOString(); let exitCode = 1
    try { exitCode = await this.runner(request, onChunk, controller.signal) } finally { this.active.delete(id) }
    return { id, command: request.command, cwd: request.cwd, exitCode, output: chunks.join(''), startedAt, endedAt: new Date().toISOString(), mode: this.mode }
  }
  async stop(receiptId: string): Promise<void> { this.active.get(receiptId)?.abort(); this.active.delete(receiptId) }
}
