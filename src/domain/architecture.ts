export type LayerId = 'presentation' | 'application' | 'domain' | 'infrastructure' | 'tests' | 'docs' | 'config'
import { stableGraphId } from './graph-schema'
export type PieceKind = 'screen' | 'controller' | 'use-case' | 'service' | 'entity' | 'repository' | 'adapter' | 'test' | 'config' | 'module'

export const LAYERS: Record<LayerId, { label: string; color: string; order: number; role: string }> = {
  presentation: { label: 'Presentation', color: '#ff5d73', order: 0, role: 'Entrada humana e interfaces' },
  application: { label: 'Application', color: '#ffb547', order: 1, role: 'Orquestra casos de uso' },
  domain: { label: 'Domain', color: '#67e8a5', order: 2, role: 'Regras e entidades centrais' },
  infrastructure: { label: 'Infrastructure', color: '#58a6ff', order: 3, role: 'Mundo externo e adaptadores' },
  tests: { label: 'Tests', color: '#c084fc', order: 4, role: 'Provas e contratos' },
  docs: { label: 'Docs', color: '#f4e8c1', order: 5, role: 'Conhecimento do sistema' },
  config: { label: 'Config', color: '#8b9aab', order: 6, role: 'Políticas e montagem' },
}

export const PIECES: Record<PieceKind, { label: string; socket: string; tab: string }> = {
  screen: { label: 'Screen', socket: 'event', tab: 'command' }, controller: { label: 'Controller', socket: 'request', tab: 'use-case' },
  'use-case': { label: 'Use case', socket: 'command', tab: 'domain-call' }, service: { label: 'Service', socket: 'domain-call', tab: 'result' },
  entity: { label: 'Entity', socket: 'rule', tab: 'state' }, repository: { label: 'Repository', socket: 'query', tab: 'entity' },
  adapter: { label: 'Adapter', socket: 'port', tab: 'external' }, test: { label: 'Test', socket: 'contract', tab: 'evidence' },
  config: { label: 'Config', socket: 'option', tab: 'policy' }, module: { label: 'Module', socket: 'import', tab: 'export' },
}

export interface ArchitectureNode { id: string; path: string; name: string; layer: LayerId; kind: PieceKind; x: number; z: number }
export interface ArchitectureEdge { from: string; to: string; type: 'calls' | 'depends' | 'verifies' }
export interface ArchitectureGraph { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] }

export function classifyPath(rawPath: string): LayerId {
  const path = rawPath.toLowerCase()
  if (/(^|\/)(tests?|specs?|__tests__)(\/|$)|(^|\/)test_/.test(path)) return 'tests'
  if (/(^|\/)(docs?|readmes?)(\/|$)|\.md$/.test(path)) return 'docs'
  if (/(^|\/)(ui|views?|pages?|screens?|presentation|components?)(\/|$)/.test(path)) return 'presentation'
  if (/(^|\/)(application|use[_-]?cases?|commands?|handlers?)(\/|$)/.test(path)) return 'application'
  if (/(^|\/)(domain|entities|models)(\/|$)/.test(path)) return 'domain'
  if (/(^|\/)(adapters?|infrastructure|infra|plugins?|integrations?)(\/|$)/.test(path)) return 'infrastructure'
  if (/(^|\/)(pyproject\.toml|package\.json|vite\.config|tsconfig|dockerfile|\.github|config)/.test(path)) return 'config'
  if (/(service|task|workflow|memory|loop)/.test(path)) return 'application'
  return 'infrastructure'
}

export function classifyPiece(rawPath: string): PieceKind {
  const path = rawPath.toLowerCase()
  if (/(test_|\.test\.|\.spec\.|\/tests?\/)/.test(path)) return 'test'
  if (/(vite\.config|tsconfig|pyproject|package\.json|dockerfile|config)/.test(path)) return 'config'
  if (/(screen|page|view|dashboard|component)/.test(path)) return 'screen'
  if (/controller/.test(path)) return 'controller'
  if (/(use[_-]?case|command|handler)/.test(path)) return 'use-case'
  if (/service/.test(path)) return 'service'
  if (/repository/.test(path)) return 'repository'
  if (/(adapter|plugin|integration|extension)/.test(path)) return 'adapter'
  if (/(entity|model|(^|\/)task\.[a-z]+$)/.test(path)) return 'entity'
  return 'module'
}

export function buildArchitectureGraph(paths: string[]): ArchitectureGraph {
  const visible = paths.filter((p) => !/(node_modules|\.git|dist|build|\.venv|__pycache__)/.test(p))
  const counters = new Map<LayerId, number>()
  const nodes = visible.map((path, index) => {
    const layer = classifyPath(path); const count = counters.get(layer) ?? 0; counters.set(layer, count + 1)
    return { id: stableGraphId('file', path), path, name: path.split('/').pop() ?? path, layer, kind: classifyPiece(path), x: LAYERS[layer].order * 5.2, z: count * 2.4 - 6 }
  })
  const edges: ArchitectureEdge[] = []
  for (let i = 0; i < nodes.length - 1; i++) {
    const from = nodes[i]; const next = nodes.slice(i + 1).find((node) => LAYERS[node.layer].order > LAYERS[from.layer].order)
    if (next && edges.length < 32) edges.push({ from: from.id, to: next.id, type: from.layer === 'tests' ? 'verifies' : 'depends' })
  }
  return { nodes, edges }
}
