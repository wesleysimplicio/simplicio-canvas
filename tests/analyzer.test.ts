import { describe, expect, it } from 'vitest'
import { analyzeProject, detectLanguage, extractDocumentedFlows, extractImports, sourceLines } from '../src/domain/analyzer'

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

  it('resolves absolute Python modules into internal file connections', () => {
    const analysis = analyzeProject('loop', [
      { path: 'simplicio_loop/application/run_use_case.py', content: 'from simplicio_loop.domain.task import Task\nfrom simplicio_loop.runtime.task_service import TaskService', size: 120 },
      { path: 'simplicio_loop/domain/task.py', content: 'class Task: pass', size: 16 },
      { path: 'simplicio_loop/runtime/task_service.py', content: 'class TaskService: pass', size: 24 },
    ])
    expect(analysis.connections.filter((connection) => !connection.external)).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'simplicio_loop/application/run_use_case.py', target: 'simplicio_loop/domain/task.py', external: false }),
      expect.objectContaining({ source: 'simplicio_loop/application/run_use_case.py', target: 'simplicio_loop/runtime/task_service.py', external: false }),
    ]))
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

  it('formats escaped, numbered source for the terminal panel', () => {
    expect(sourceLines('<main>\nconst x = 1', 2)).toEqual([
      { number: 1, text: '&lt;main&gt;' }, { number: 2, text: 'const x = 1' },
    ])
  })

  it('extracts documented flows from prose and Mermaid arrows', () => {
    const flows = extractDocumentedFlows('README.md', `
      Browser → Analyzer → Canvas
      flowchart LR
      API --> Service --> Repository
    `)
    expect(flows).toEqual(expect.arrayContaining([
      { source: 'Browser', target: 'Analyzer', document: 'README.md' },
      { source: 'Analyzer', target: 'Canvas', document: 'README.md' },
      { source: 'API', target: 'Service', document: 'README.md' },
      { source: 'Service', target: 'Repository', document: 'README.md' },
    ]))
  })
})
