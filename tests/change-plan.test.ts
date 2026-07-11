import { describe, expect, it } from 'vitest'
import { compileChangePlan } from '../src/domain/change-plan'
import { createNode } from '../src/domain/operations'
describe('deterministic change plans', () => {
  it('lists impacted files/imports/tests without mutating graph', () => {
    const graph = { nodes: [createNode('a', 'src/a.ts'), createNode('b', 'src/b.ts'), { ...createNode('t', 'tests/a.test.ts'), layer: 'tests' as const }], edges: [] }
    const plan = compileChangePlan(graph, [{ type: 'connect', edge: { from: 'a', to: 'b', type: 'depends' } }]); expect(plan.readonly).toBe(true); expect(plan.files).toEqual(['src/a.ts', 'src/b.ts']); expect(plan.imports).toEqual(['src/a.ts -> src/b.ts']); expect(plan.tests).toEqual(['tests/a.test.ts']); expect(compileChangePlan(graph, plan.operations)).toEqual(plan)
  })
})
