import { describe, expect, it } from 'vitest'
import type { ArchitectureGraph } from '../src/domain/architecture'
import { applyOperation, type VisualOperation } from '../src/domain/operations'
import { compileChangePlan } from '../src/domain/change-plan'
import { generateFiles } from '../src/domain/generators'
import { previewApply, createApplyReceipt, CONFIRM_APPLY } from '../src/domain/apply-gate'

// Integration test: exercises the real end-to-end visual-edit pipeline that ties
// operations -> change-plan -> generators -> apply-gate together, the same sequence
// the IDE performs for a user-driven edit. Each stage feeds the next stage's real
// output (no stubs), so a contract break in any module surfaces here.
describe('visual edit pipeline (operations -> change-plan -> generators -> apply-gate)', () => {
  it('carries a create+connect edit through planning, generation and gated apply', () => {
    const graph: ArchitectureGraph = {
      nodes: [{ id: 'service', path: 'domain/Service.ts', name: 'Service', layer: 'domain', kind: 'service', x: 0, z: 0 }],
      edges: [],
    }
    const createRepo: VisualOperation = { type: 'create', node: { id: 'repo', path: 'domain/Repo.ts', name: 'Repo', layer: 'domain', kind: 'repository', x: 1, z: 1 } }
    const connect: VisualOperation = { type: 'connect', edge: { from: 'service', to: 'repo', type: 'depends' } }
    const batch: VisualOperation = { type: 'batch', operations: [createRepo, connect] }

    const { graph: nextGraph, inverse } = applyOperation(graph, batch)
    expect(nextGraph.nodes.map((node) => node.id)).toEqual(['service', 'repo'])
    expect(nextGraph.edges).toEqual([{ from: 'service', to: 'repo', type: 'depends' }])

    const plan = compileChangePlan(nextGraph, [batch])
    expect(plan.files).toEqual(['domain/Repo.ts', 'domain/Service.ts'])
    expect(plan.imports).toEqual(['domain/Service.ts -> domain/Repo.ts'])

    const files = generateFiles(nextGraph, [batch], 'TypeScript')
    const repoFile = files.find((file) => file.path === 'domain/Repo.ts')!
    expect(repoFile.content).toContain('export class Repo {}')

    const diffs = plan.files.map((path) => ({ path, before: '', after: path === repoFile.path ? repoFile.content : '// updated\n' }))
    const preview = previewApply({ plan, diffs, confirmation: CONFIRM_APPLY })
    expect(preview.allowed).toBe(true)
    expect(preview.errors).toEqual([])

    const receipt = createApplyReceipt(plan, true)
    expect(receipt.accepted).toBe(true)
    expect(receipt.files).toEqual(plan.files)

    // The pipeline is fully reversible: applying the inverse restores the original graph.
    const { graph: restored } = applyOperation(nextGraph, inverse)
    expect(restored).toEqual(graph)
  })

  it('blocks apply when the confirmation phrase is missing, even with a valid diff set', () => {
    const graph: ArchitectureGraph = { nodes: [], edges: [] }
    const create: VisualOperation = { type: 'create', node: { id: 'a', path: 'domain/A.ts', name: 'A', layer: 'domain', kind: 'entity', x: 0, z: 0 } }
    const plan = compileChangePlan(graph, [create])
    const preview = previewApply({ plan, diffs: [{ path: 'domain/A.ts', before: '', after: 'export class A {}' }], confirmation: 'nope' })
    expect(preview.allowed).toBe(false)
    expect(preview.errors).toContain(`Explicit confirmation required: type ${CONFIRM_APPLY}`)
  })
})
