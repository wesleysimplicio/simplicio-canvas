import type { ArchitectureGraph, PieceKind } from './architecture'

export type PortDirection = 'input' | 'output'
export interface VisualPort { id: string; nodeId: string; direction: PortDirection; socket: string; tab?: string; label?: string }
export interface CompatibilityResult { compatible: boolean; reason: string; from: VisualPort; to: VisualPort }

const allowed: Record<string, string[]> = {
  event: ['request', 'command', 'event'], request: ['command', 'domain-call'], command: ['domain-call', 'rule', 'query'],
  'domain-call': ['result', 'rule', 'query'], rule: ['state', 'result'], query: ['entity', 'result'], port: ['external', 'result'],
  contract: ['result', 'evidence'], option: ['policy', 'result'], import: ['export', 'result'],
}

export function portFor(kind: PieceKind, nodeId: string, direction: PortDirection): VisualPort {
  // Importing PIECES here would be harmless, but this fallback keeps the contract usable with custom kinds.
  const sockets: Record<string, [string, string]> = { screen: ['event', 'command'], controller: ['request', 'use-case'], 'use-case': ['command', 'domain-call'], service: ['domain-call', 'result'], entity: ['rule', 'state'], repository: ['query', 'entity'], adapter: ['port', 'external'], test: ['contract', 'evidence'], config: ['option', 'policy'], module: ['import', 'export'] }
  const pair = sockets[kind] ?? ['import', 'export']; const socket = direction === 'output' ? pair[0] : pair[1]
  return { id: `${nodeId}:${direction}`, nodeId, direction, socket, tab: socket, label: `${kind} ${direction}` }
}

export function checkCompatibility(from: VisualPort, to: VisualPort): CompatibilityResult {
  if (from.direction !== 'output' || to.direction !== 'input') return { compatible: false, reason: 'Connect an output port to an input port.', from, to }
  if (from.nodeId === to.nodeId) return { compatible: false, reason: 'A piece cannot connect to itself.', from, to }
  const targets = allowed[from.socket] ?? []
  if (!targets.includes(to.socket)) return { compatible: false, reason: `The ${from.socket} output is not compatible with the ${to.socket} input.`, from, to }
  return { compatible: true, reason: 'Ports are compatible and can snap together.', from, to }
}

export function snapPoint(from: { x: number; z: number }, to: { x: number; z: number }, threshold = 0.8): { snapped: boolean; x: number; z: number } {
  const distance = Math.hypot(from.x - to.x, from.z - to.z)
  return distance <= threshold ? { snapped: true, x: to.x, z: to.z } : { snapped: false, x: from.x, z: from.z }
}

export function compatibleEdges(graph: ArchitectureGraph, from: VisualPort, to: VisualPort): CompatibilityResult {
  const result = checkCompatibility(from, to)
  if (!result.compatible) return result
  if (graph.edges.some((edge) => edge.from === from.nodeId && edge.to === to.nodeId)) return { ...result, compatible: false, reason: 'These pieces are already connected.' }
  return result
}
