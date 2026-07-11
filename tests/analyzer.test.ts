import { describe, expect, it } from 'vitest'
import { analyzeProject, detectLanguage, extractImports } from '../src/domain/analyzer'

describe('local project analyzer', () => {
  it.each([
    ['src/main.ts', '', 'TypeScript'], ['app.py', '', 'Python'], ['Cargo.toml', '', 'TOML'],
    ['main.go', '', 'Go'], ['Program.cs', '', 'C#'], ['script', '#!/usr/bin/env python3', 'Python'],
    ['README.md', '', 'Markdown'], ['image.png', '', 'Binary/Asset'],
  ])('detects %s as %s', (path, content, language) => expect(detectLanguage(path, content)).toBe(language))

  it('extracts TypeScript imports, exports and dynamic imports', () => {
    expect(extractImports('TypeScript', `import x from './x'; export { y } from "./y"; const z = import('../z')`))
      .toEqual(['./x', './y', '../z'])
  })

  it('extracts Python imports', () => {
    expect(extractImports('Python', 'import os\nfrom app.services.user import UserService\nimport json as js'))
      .toEqual(['os', 'app.services.user', 'json'])
  })

  it('builds resolved internal connections and keeps external imports', () => {
    const analysis = analyzeProject('demo', [
      { path: 'src/main.ts', content: `import { run } from './run'`, size: 40 },
      { path: 'src/run.ts', content: `import * as THREE from 'three'`, size: 38 },
      { path: 'README.md', content: '# Demo', size: 6 },
    ])
    expect(analysis.languages).toEqual(expect.objectContaining({ TypeScript: 2, Markdown: 1 }))
    expect(analysis.connections).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'src/main.ts', target: 'src/run.ts', specifier: './run', external: false }),
      expect.objectContaining({ source: 'src/run.ts', target: 'three', specifier: 'three', external: true }),
    ]))
    expect(analysis.files.find((file) => file.path === 'src/main.ts')?.imports).toHaveLength(1)
  })

  it('ignores vendor folders and files that are too large', () => {
    const analysis = analyzeProject('demo', [
      { path: 'node_modules/pkg/index.js', content: '', size: 0 },
      { path: 'src/huge.ts', content: 'x', size: 2_000_000 },
      { path: 'src/good.ts', content: '', size: 0 },
    ])
    expect(analysis.files.map((file) => file.path)).toEqual(['src/good.ts'])
    expect(analysis.skipped).toBe(2)
  })
})
