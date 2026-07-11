import { canApply, isSafeWorkspacePath, type WorkspaceTrust } from './workspace-security'

export interface TerminalRequest { command: string; cwd: string; env?: Record<string, string>; confirmation?: string }
export interface TerminalReceipt { id: string; command: string; cwd: string; exitCode: number; output: string; startedAt: string; endedAt: string; mode: 'browser-simulated' | 'local-pty' }
export interface TerminalAdapter { readonly mode: TerminalReceipt['mode']; run(request: TerminalRequest): Promise<TerminalReceipt>; stop(receiptId: string): Promise<void> }
export const TERMINAL_CONFIRMATION = 'RUN'
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
    const now = new Date().toISOString(); return { id: `browser-${Date.now()}`, command: request.command, cwd: request.cwd, exitCode: 0, output: 'Browser mode is read-only; no local process was started.', startedAt: now, endedAt: now, mode: this.mode }
  }
  async stop(): Promise<void> { /* no process exists in browser mode */ }
}
