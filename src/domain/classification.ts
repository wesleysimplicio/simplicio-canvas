import type { LayerId, PieceKind } from './architecture'

export interface Classification { layer: LayerId; kind: PieceKind; confidence: number; reason: string; matchedRule?: string }
export interface ClassificationRule { id: string; pattern: RegExp; layer?: LayerId; kind?: PieceKind; confidence?: number; reason: string }
export interface ClassificationRules { layers?: ClassificationRule[]; pieces?: ClassificationRule[] }

const DEFAULT_LAYERS: ClassificationRule[] = [
  { id: 'tests', pattern: /(^|\/)(tests?|specs?|__tests__)(\/|$)|(^|\/)test_/, layer: 'tests', confidence: .98, reason: 'test directory or test filename' },
  { id: 'docs', pattern: /(^|\/)(docs?|readmes?)(\/|$)|\.md$/i, layer: 'docs', confidence: .98, reason: 'documentation path' },
  { id: 'presentation', pattern: /(^|\/)(ui|views?|pages?|screens?|presentation|components?)(\/|$)/, layer: 'presentation', confidence: .88, reason: 'presentation directory' },
  { id: 'application', pattern: /(^|\/)(application|use[_-]?cases?|commands?|handlers?)(\/|$)/, layer: 'application', confidence: .9, reason: 'application boundary' },
  { id: 'domain', pattern: /(^|\/)(domain|entities|models)(\/|$)/, layer: 'domain', confidence: .9, reason: 'domain boundary' },
  { id: 'infrastructure', pattern: /(^|\/)(adapters?|infrastructure|infra|plugins?|integrations?)(\/|$)/, layer: 'infrastructure', confidence: .9, reason: 'infrastructure boundary' },
  { id: 'config', pattern: /(^|\/)(pyproject\.toml|package\.json|vite\.config|tsconfig|dockerfile|\.github|config)/, layer: 'config', confidence: .94, reason: 'configuration file' },
]
const DEFAULT_PIECES: ClassificationRule[] = [
  { id: 'test', pattern: /(test_|\.test\.|\.spec\.|\/tests?\/)/, kind: 'test', confidence: .98, reason: 'test naming convention' },
  { id: 'config', pattern: /(vite\.config|tsconfig|pyproject|package\.json|dockerfile|config)/, kind: 'config', confidence: .95, reason: 'configuration naming convention' },
  { id: 'screen', pattern: /(screen|page|view|dashboard|component)/, kind: 'screen', confidence: .8, reason: 'UI naming convention' },
  { id: 'controller', pattern: /controller/, kind: 'controller', confidence: .86, reason: 'controller naming convention' },
  { id: 'use-case', pattern: /(use[_-]?case|command|handler)/, kind: 'use-case', confidence: .86, reason: 'use-case naming convention' },
  { id: 'service', pattern: /service/, kind: 'service', confidence: .82, reason: 'service naming convention' },
  { id: 'repository', pattern: /repository/, kind: 'repository', confidence: .88, reason: 'repository naming convention' },
  { id: 'adapter', pattern: /(adapter|plugin|integration|extension)/, kind: 'adapter', confidence: .8, reason: 'adapter naming convention' },
  { id: 'entity', pattern: /(entity|model|(^|\/)task\.[a-z]+$)/, kind: 'entity', confidence: .75, reason: 'entity naming convention' },
]

export function classify(rawPath: string, overrides: ClassificationRules = {}): Classification {
  const path = rawPath.toLowerCase()
  const layerRule = [...(overrides.layers ?? []), ...DEFAULT_LAYERS].find((rule) => rule.pattern.test(path))
  const pieceRule = [...(overrides.pieces ?? []), ...DEFAULT_PIECES].find((rule) => rule.pattern.test(path))
  return {
    layer: layerRule?.layer ?? 'infrastructure', kind: pieceRule?.kind ?? 'module',
    confidence: Math.min(layerRule?.confidence ?? .35, pieceRule?.confidence ?? .35),
    reason: [layerRule?.reason, pieceRule?.reason].filter(Boolean).join('; ') || 'no matching rule; kept visible as unknown module',
    matchedRule: [layerRule?.id, pieceRule?.id].filter(Boolean).join('+') || 'unknown',
  }
}
