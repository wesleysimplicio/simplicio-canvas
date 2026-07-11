import { describe, expect, it } from 'vitest'
import { analyzeProject } from '../src/domain/analyzer'
import { inferTypedRelations, reverseRelations } from '../src/domain/relations'

describe('typed static relations', () => {
  it('keeps import, call, inheritance and verification arrows distinct', () => {
    const analysis = analyzeProject('demo', [
      { path: 'app/service.ts', content: `import { Repo } from '../infra/repo'\nexport class Service extends Repo { run() { repo() } }`, size: 100 },
      { path: 'infra/repo.ts', content: 'export class Repo {}', size: 40 },
      { path: 'tests/service.test.ts', content: 'import { Service } from ../app/service\nnew Service()', size: 80 },
    ])
    const relations = inferTypedRelations(analysis.files)
    expect(relations.map((item) => item.type)).toEqual(expect.arrayContaining(['import', 'inherits', 'verifies']))
    expect(reverseRelations(relations, 'infra/repo.ts').some((item) => item.sourcePath === 'app/service.ts')).toBe(true)
    expect(relations.every((item) => item.evidence?.[0].source === 'static')).toBe(true)
  })
})
