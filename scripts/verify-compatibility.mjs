import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const path = resolve(new URL('.', import.meta.url).pathname, '../fixtures/compatibility-matrix.json')
const matrix = JSON.parse(await readFile(path, 'utf8'))
const stacks = new Set(['Python', 'TypeScript', '.NET', 'Java', 'polyglot'])
const statuses = new Set(['verified', 'partial', 'planned'])
if (matrix.schema !== 'simplicio-canvas-compatibility-matrix' || matrix.version !== 1 || !Array.isArray(matrix.repositories)) throw new Error('Invalid compatibility matrix envelope')
const ids = new Set()
for (const entry of matrix.repositories) {
  if (!entry.id || ids.has(entry.id)) throw new Error(`Duplicate or missing repository id: ${entry.id ?? '<missing>'}`)
  if (!/^\w[\w.-]+\/\w[\w.-]+$/.test(entry.repository)) throw new Error(`Invalid repository slug: ${entry.repository}`)
  if (!stacks.has(entry.stack) || !statuses.has(entry.status) || entry.sourcePolicy !== 'metadata-only') throw new Error(`Invalid metadata for ${entry.id}`)
  ids.add(entry.id)
}
const counts = Object.fromEntries([...statuses].map((status) => [status, matrix.repositories.filter((entry) => entry.status === status).length]))
console.log(JSON.stringify({ schema: matrix.schema, repositories: matrix.repositories.length, stacks: [...new Set(matrix.repositories.map((entry) => entry.stack))].sort(), counts, sourcePolicy: 'metadata-only' }, null, 2))
