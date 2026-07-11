import type { AnalyzedFile } from './analyzer'
import { createGraphId, type GraphEdge, type GraphEdgeType, type GraphEvidence } from './graph-schema'

export interface TypedRelation extends GraphEdge { sourcePath: string; targetPath: string; sourceLine?: number }
const evidence = (path: string, line: number, reason: string): GraphEvidence => ({ source: 'static', confidence: .8, reason, location: { path, line } })
const lineOf = (content: string, index: number) => content.slice(0, index).split('\n').length
const fileId = (path: string) => createGraphId('file', 'analysis', path)

/** Derives directional relation types from already bounded, local source files. */
export function inferTypedRelations(files: AnalyzedFile[]): TypedRelation[] {
  const known = new Set(files.map((file) => file.path)); const relations: TypedRelation[] = []
  const add = (sourcePath: string, targetPath: string, type: GraphEdgeType, line: number, reason: string, label?: string) => {
    if (!known.has(targetPath) || sourcePath === targetPath) return
    const key = `${sourcePath}:${targetPath}:${type}`; if (relations.some((item) => `${item.sourcePath}:${item.targetPath}:${item.type}` === key)) return
    relations.push({ id: createGraphId('symbol', 'analysis', sourcePath, `${type}:${targetPath}`), from: fileId(sourcePath), to: fileId(targetPath), type, label, sourcePath, targetPath, sourceLine: line, evidence: [evidence(sourcePath, line, reason)] })
  }
  for (const file of files) {
    for (const item of file.imports) if (item.resolvedPath) add(file.path, item.resolvedPath, 'import', 1, 'resolved import', item.specifier)
    const names = files.filter((candidate) => candidate.path !== file.path).map((candidate) => ({ candidate, stem: candidate.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '' })).filter((item) => item.stem.length > 2)
    for (const item of names) {
      const call = new RegExp(`\\b${item.stem}\\s*\\(`).exec(file.content); if (call) add(file.path, item.candidate.path, 'call', lineOf(file.content, call.index), 'symbol call inferred from source', item.stem)
      const inheritance = new RegExp(`\\b(?:extends|implements|inherits)\\s+${item.stem}\\b`, 'i').exec(file.content); if (inheritance) add(file.path, item.candidate.path, inheritance[0].toLowerCase().includes('implements') ? 'implements' : 'inherits', lineOf(file.content, inheritance.index), 'type relationship inferred from declaration', item.stem)
    }
    if (/(test_|\.test\.|\.spec\.|\/tests?\/)/i.test(file.path)) for (const item of names) { const reference = new RegExp(`\\b${item.stem}\\b`).exec(file.content); if (reference) add(file.path, item.candidate.path, 'verifies', lineOf(file.content, reference.index), 'test references production file', item.stem) }
  }
  return relations
}

export function reverseRelations(relations: TypedRelation[], targetPath: string): TypedRelation[] { return relations.filter((relation) => relation.targetPath === targetPath) }
