import type { ArchitectureGraph } from './architecture'
import type { VisualOperation } from './operations'

export interface ChangePlan { version: 1; operations: VisualOperation[]; files: string[]; symbols: string[]; imports: string[]; tests: string[]; summary: string; readonly: true }
const sortUnique = (values: string[]) => [...new Set(values)].sort()
const flatten = (op: VisualOperation): VisualOperation[] => op.type === 'batch' ? op.operations.flatMap(flatten) : [op]

/** Produces an impact-only plan. It never reads or writes the file system. */
export function compileChangePlan(graph: ArchitectureGraph, operations: VisualOperation[]): ChangePlan {
  const flat = operations.flatMap(flatten); const files: string[] = []; const symbols: string[] = []; const imports: string[] = []; const tests: string[] = []
  const path = (id: string) => graph.nodes.find((node) => node.id === id)?.path
  for (const operation of flat) {
    if (operation.type === 'create') files.push(operation.node.path)
    if (operation.type === 'delete' || operation.type === 'move' || operation.type === 'rename') { const value = path(operation.nodeId); if (value) files.push(value); if (operation.type === 'rename' && operation.path) files.push(operation.path) }
    if (operation.type === 'connect' || operation.type === 'disconnect') { const source = path(operation.edge.from); const target = path(operation.edge.to); if (source) files.push(source); if (target) files.push(target); if (source && target) imports.push(`${source} -> ${target}`) }
    if (operation.type === 'rename') symbols.push(operation.name)
  }
  tests.push(...graph.nodes.filter((node) => node.layer === 'tests').map((node) => node.path))
  const uniqueFiles = sortUnique(files); const uniqueImports = sortUnique(imports); const uniqueTests = sortUnique(tests)
  return { version: 1, operations: flat, files: uniqueFiles, symbols: sortUnique(symbols), imports: uniqueImports, tests: uniqueTests, summary: `${flat.length} visual operation${flat.length === 1 ? '' : 's'} affecting ${uniqueFiles.length} file${uniqueFiles.length === 1 ? '' : 's'}`, readonly: true }
}

export const planChanges = compileChangePlan
