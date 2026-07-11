import { validateTerminalRequest, type TerminalRequest, type TerminalReceipt } from './terminal-adapter'
import type { WorkspaceTrust } from './workspace-security'

export interface LaunchConfiguration { id: string; name: string; type: 'mapper' | 'test' | 'flow'; request: Omit<TerminalRequest, 'confirmation'>; autoStart?: boolean }
export type RunState = 'idle' | 'awaiting-confirmation' | 'running' | 'stopped' | 'failed'
export interface RunSession { configuration: LaunchConfiguration; state: RunState; receipt?: TerminalReceipt; errors: string[] }

export function validateLaunchConfiguration(config: LaunchConfiguration, trust: WorkspaceTrust): string[] {
  const errors: string[] = []
  if (!/^[a-z][a-z0-9._-]{1,63}$/.test(config.id)) errors.push('launch id must be a stable identifier')
  if (!config.name.trim()) errors.push('launch name is required')
  errors.push(...validateTerminalRequest({ ...config.request, confirmation: 'RUN' }, trust).filter((error) => !error.startsWith('explicit confirmation')))
  return errors
}

export function createRunSession(config: LaunchConfiguration, trust: WorkspaceTrust): RunSession { const errors = validateLaunchConfiguration(config, trust); return { configuration: config, state: errors.length ? 'failed' : 'awaiting-confirmation', errors } }
export function startRunSession(session: RunSession, confirmation: string): RunSession { if (session.errors.length || confirmation !== 'RUN') return { ...session, state: 'failed', errors: [...session.errors, 'explicit confirmation required: type RUN'] }; return { ...session, state: 'running' } }
export function finishRunSession(session: RunSession, receipt: TerminalReceipt): RunSession { return { ...session, state: receipt.exitCode === 0 ? 'stopped' : 'failed', receipt } }
