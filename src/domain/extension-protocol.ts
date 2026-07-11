import type { CanvasSelection } from './canvas-sdk'

export type CanvasMessage =
  | { type: 'canvas/ready'; protocol: 1 }
  | { type: 'canvas/select'; selection: CanvasSelection }
  | { type: 'editor/reveal'; path: string; line?: number; column?: number }
  | { type: 'workspace/changed'; paths: string[]; reason: 'create' | 'change' | 'delete' | 'rename' }
  | { type: 'error'; code: string; message: string }

export const EXTENSION_PROTOCOL_VERSION = 1

export function isCanvasMessage(value: unknown): value is CanvasMessage {
  if (!value || typeof value !== 'object' || !('type' in value) || typeof value.type !== 'string') return false
  const message = value as Record<string, unknown>
  if (message.type === 'canvas/ready') return message.protocol === EXTENSION_PROTOCOL_VERSION
  if (message.type === 'canvas/select') return !!message.selection && typeof message.selection === 'object'
  if (message.type === 'editor/reveal') return typeof message.path === 'string' && !message.path.startsWith('..')
  if (message.type === 'workspace/changed') return Array.isArray(message.paths) && ['create', 'change', 'delete', 'rename'].includes(String(message.reason))
  return message.type === 'error' && typeof message.code === 'string' && typeof message.message === 'string'
}

export function parseCanvasMessage(raw: string): CanvasMessage | undefined {
  try { const value: unknown = JSON.parse(raw); return isCanvasMessage(value) ? value : undefined } catch { return undefined }
}

export function strictCsp(sourceNonce: string): string {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(sourceNonce)) throw new Error('Invalid CSP nonce')
  return `default-src 'none'; img-src data:; style-src 'nonce-${sourceNonce}'; script-src 'nonce-${sourceNonce}'; connect-src 'none'; font-src data:;`
}
