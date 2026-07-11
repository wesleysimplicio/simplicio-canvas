import { describe, expect, it } from 'vitest'
import { LAYERS, buildArchitectureGraph, classifyPath, classifyPiece } from '../src/domain/architecture'

describe('software puzzle grammar', () => {
  it.each([
    ['src/ui/dashboard.ts', 'presentation'],
    ['src/application/run_task.py', 'application'],
    ['src/domain/task.py', 'domain'],
    ['adapters/vscode/extension.ts', 'infrastructure'],
    ['tests/test_loop_e2e.py', 'tests'],
    ['docs/architecture.md', 'docs'],
    ['pyproject.toml', 'config'],
  ])('classifies %s as %s', (path, layer) => expect(classifyPath(path)).toBe(layer))

  it('uses a unique semantic color for every layer', () => {
    expect(new Set(Object.values(LAYERS).map((layer) => layer.color)).size).toBe(Object.keys(LAYERS).length)
  })

  it.each([
    ['dashboard.tsx', 'screen'], ['task_controller.py', 'controller'], ['run_use_case.py', 'use-case'],
    ['memory_service.py', 'service'], ['task.py', 'entity'], ['task_repository.py', 'repository'],
    ['vscode_adapter.ts', 'adapter'], ['test_loop.py', 'test'], ['vite.config.ts', 'config'],
  ])('maps %s to the %s puzzle piece', (path, kind) => expect(classifyPiece(path)).toBe(kind))

  it('creates nodes and directional flow between adjacent layers', () => {
    const graph = buildArchitectureGraph(['src/ui/board.ts', 'src/application/run_task.py', 'src/domain/task.py', 'adapters/vscode/extension.ts'])
    expect(graph.nodes).toHaveLength(4)
    expect(graph.edges).toEqual(expect.arrayContaining([expect.objectContaining({ from: graph.nodes[0].id, to: graph.nodes[1].id })]))
  })
})
