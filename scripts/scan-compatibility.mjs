import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const args = new Set(process.argv.slice(2)); const offline = args.has('--offline'); const outputArg = process.argv.find((arg) => arg.startsWith('--output=')); const matrixPath = resolve(new URL('.', import.meta.url).pathname, '../fixtures/compatibility-matrix.json'); const matrix = JSON.parse(await readFile(matrixPath, 'utf8'))
const report = { schema: 'simplicio-canvas-compatibility-scan/v1', generatedAt: new Date().toISOString(), mode: offline ? 'offline' : 'github-metadata', sourcePolicy: 'metadata-only', repositories: [] }
for (const entry of matrix.repositories) {
  if (offline) { report.repositories.push({ id: entry.id, repository: entry.repository, status: 'not-scanned', reason: 'offline mode' }); continue }
  try {
    const response = await fetch(`https://api.github.com/repos/${entry.repository}`, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'simplicio-canvas-compatibility-scan' }, signal: AbortSignal.timeout(8000) })
    if (!response.ok) { report.repositories.push({ id: entry.id, repository: entry.repository, status: 'unavailable', httpStatus: response.status }); continue }
    const value = await response.json(); report.repositories.push({ id: entry.id, repository: entry.repository, status: 'scanned', defaultBranch: value.default_branch, license: value.license?.spdx_id ?? null, sizeKb: value.size, archived: Boolean(value.archived), fork: Boolean(value.fork) })
  } catch (error) { report.repositories.push({ id: entry.id, repository: entry.repository, status: 'unavailable', reason: error instanceof Error ? error.message : 'request failed' }) }
}
if (outputArg) await writeFile(resolve(outputArg.slice('--output='.length)), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
